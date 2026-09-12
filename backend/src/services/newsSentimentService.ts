import { NewsArticle } from '../clients/search.js';
import { llmClient } from '../clients/llm.js';
import { logger } from '../middleware/logger.js';

export interface StructuredArticleSentiment {
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  snippet: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  catalysts: string[];
  topics: ('earnings' | 'products' | 'regulation' | 'competition' | 'macro' | 'general')[];
  impact: 'low' | 'medium' | 'high';
  impactWeight: number; // low = 1, medium = 2, high = 3
}

export interface NewsIntelligenceResult {
  articles: StructuredArticleSentiment[];
  aggregateSentimentScore: number; // 0 - 100 (deterministic)
  sentimentLabel: 'Bullish' | 'Moderately Bullish' | 'Neutral' | 'Moderately Bearish' | 'Bearish';
  keyCatalysts: string[];
  topTopics: string[];
  summary: string;
}

/**
 * Deterministic aggregation of individual classified articles.
 */
export function calculateAggregateSentimentScore(articles: StructuredArticleSentiment[]): number {
  if (!articles || articles.length === 0) return 50;

  let weightedSum = 0;
  let totalWeight = 0;

  for (const article of articles) {
    const weight = article.impactWeight || (article.impact === 'high' ? 3 : article.impact === 'medium' ? 2 : 1);
    let val = 0;
    if (article.sentiment === 'positive') val = 1.0;
    else if (article.sentiment === 'negative') val = -1.0;
    else val = 0.0;

    weightedSum += val * weight;
    totalWeight += weight;
  }

  if (totalWeight === 0) return 50;

  // Normalized score between 0 and 100
  const normalized = 50 + (weightedSum / totalWeight) * 50;
  return Math.max(0, Math.min(100, Math.round(normalized)));
}

export function getSentimentLabel(score: number): NewsIntelligenceResult['sentimentLabel'] {
  if (score >= 75) return 'Bullish';
  if (score >= 60) return 'Moderately Bullish';
  if (score >= 42) return 'Neutral';
  if (score >= 25) return 'Moderately Bearish';
  return 'Bearish';
}

export class NewsSentimentService {
  /**
   * Upgrades news articles into structured intelligence with classified sentiment, catalysts, and topics.
   */
  async analyzeNewsIntelligence(
    ticker: string,
    companyName: string,
    rawArticles: NewsArticle[],
    geminiApiKey?: string
  ): Promise<NewsIntelligenceResult> {
    if (!rawArticles || rawArticles.length === 0) {
      return {
        articles: [],
        aggregateSentimentScore: 50,
        sentimentLabel: 'Neutral',
        keyCatalysts: ['No recent news catalysts reported.'],
        topTopics: ['general'],
        summary: `No recent news articles identified for ${companyName} (${ticker}). Baseline neutral sentiment assigned.`,
      };
    }

    let structuredArticles: StructuredArticleSentiment[] = [];

    // If Gemini key is available, run structured classification
    if (geminiApiKey || process.env.GEMINI_API_KEY) {
      try {
        const model = llmClient.getModel(geminiApiKey);
        const prompt = `You are a financial news intelligence analyst. For each of the following ${rawArticles.length} news articles about ${companyName} (${ticker}), classify sentiment, catalysts, topics, and potential market impact.

Articles:
${rawArticles.map((a, i) => `[${i + 1}] Title: ${a.title}\nSource: ${a.source}\nSnippet: ${a.snippet}\n`).join('\n')}

Output ONLY a JSON array with one object per article in the exact same order:
[
  {
    "sentiment": "positive", // exactly one of: "positive", "negative", "neutral"
    "catalysts": ["specific event or catalyst mentioned, e.g. earnings beat, product delay"],
    "topics": ["earnings"], // subset of: "earnings", "products", "regulation", "competition", "macro", "general"
    "impact": "medium" // exactly one of: "low", "medium", "high"
  }
]`;

        const res = await model.invoke(prompt);
        let content = typeof res.content === 'string' ? res.content.trim() : JSON.stringify(res.content);
        if (content.startsWith('```json')) content = content.replace(/^```json/, '').replace(/```$/, '').trim();
        else if (content.startsWith('```')) content = content.replace(/^```/, '').replace(/```$/, '').trim();

        const classifications = JSON.parse(content);
        if (Array.isArray(classifications) && classifications.length > 0) {
          structuredArticles = rawArticles.map((raw, idx) => {
            const cls = classifications[idx] || {};
            const sentiment = ['positive', 'negative', 'neutral'].includes(cls.sentiment) ? cls.sentiment : 'neutral';
            const impact = ['low', 'medium', 'high'].includes(cls.impact) ? cls.impact : 'medium';
            const impactWeight = impact === 'high' ? 3 : impact === 'medium' ? 2 : 1;
            return {
              ...raw,
              sentiment,
              catalysts: Array.isArray(cls.catalysts) && cls.catalysts.length > 0 ? cls.catalysts : ['General market coverage'],
              topics: Array.isArray(cls.topics) && cls.topics.length > 0 ? cls.topics : ['general'],
              impact,
              impactWeight,
            };
          });
        }
      } catch (err: any) {
        logger.warn(`LLM news intelligence classification fallback: ${err.message}`);
      }
    }

    // Heuristic deterministic fallback if LLM not configured or parse error
    if (structuredArticles.length === 0) {
      structuredArticles = rawArticles.map((raw) => {
        const text = (raw.title + ' ' + raw.snippet).toLowerCase();
        let sentiment: 'positive' | 'negative' | 'neutral' = 'neutral';
        const catalysts: string[] = [];
        const topics: ('earnings' | 'products' | 'regulation' | 'competition' | 'macro' | 'general')[] = [];

        // Simple financial lexicon
        if (text.includes('beat') || text.includes('surge') || text.includes('record') || text.includes('growth') || text.includes('upgrade') || text.includes('rally')) {
          sentiment = 'positive';
          catalysts.push('Positive earnings or operational momentum');
        } else if (text.includes('miss') || text.includes('drop') || text.includes('fall') || text.includes('probe') || text.includes('risk') || text.includes('lawsuit') || text.includes('downgrade')) {
          sentiment = 'negative';
          catalysts.push('Operational challenge or market headwind');
        } else {
          catalysts.push('Ongoing business operations');
        }

        if (text.includes('earnings') || text.includes('revenue') || text.includes('profit') || text.includes('quarter')) topics.push('earnings');
        if (text.includes('launch') || text.includes('product') || text.includes('chip') || text.includes('ai') || text.includes('device')) topics.push('products');
        if (text.includes('sec') || text.includes('regulation') || text.includes('court') || text.includes('antitrust')) topics.push('regulation');
        if (text.includes('rival') || text.includes('competitor') || text.includes('market share')) topics.push('competition');
        if (topics.length === 0) topics.push('general');

        const impact: 'low' | 'medium' | 'high' = text.includes('record') || text.includes('billion') || text.includes('antitrust') ? 'high' : 'medium';
        return {
          ...raw,
          sentiment,
          catalysts,
          topics,
          impact,
          impactWeight: impact === 'high' ? 3 : 2,
        };
      });
    }

    // Deterministic mathematical aggregation
    const aggregateSentimentScore = calculateAggregateSentimentScore(structuredArticles);
    const sentimentLabel = getSentimentLabel(aggregateSentimentScore);

    // Extract unique catalysts and top topics
    const catalystSet = new Set<string>();
    const topicSet = new Set<string>();
    structuredArticles.forEach(a => {
      a.catalysts.forEach(c => catalystSet.add(c));
      a.topics.forEach(t => topicSet.add(t));
    });

    const keyCatalysts = Array.from(catalystSet).slice(0, 5);
    const topTopics = Array.from(topicSet);

    const summary = `Evaluated ${structuredArticles.length} recent news events. Aggregated sentiment is **${sentimentLabel}** (${aggregateSentimentScore}/100). Primary catalysts center on ${keyCatalysts.slice(0, 2).join(' and ')}.`;

    return {
      articles: structuredArticles,
      aggregateSentimentScore,
      sentimentLabel,
      keyCatalysts,
      topTopics,
      summary,
    };
  }
}

export const newsSentimentService = new NewsSentimentService();
