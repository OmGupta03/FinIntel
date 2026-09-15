import { Annotation, StateGraph, START, END } from '@langchain/langgraph';
import { yahooFinanceClient } from '../clients/yahooFinance.js';
import { searchClient } from '../clients/search.js';
import { llmClient } from '../clients/llm.js';
import { logger } from '../middleware/logger.js';
import { CustomError } from '../middleware/errorHandler.js';
import { config } from '../config/index.js';
import { computeTechnicalAnalysis, TechnicalAnalysisResult } from '../utils/technicalAnalysis.js';
import { computeHealthScore, buildHealthScoreExplanations, HealthScoreBreakdown } from '../services/healthScore.js';
import { competitorService, CompetitorComparisonResult } from '../services/competitorService.js';
import { newsSentimentService, NewsIntelligenceResult } from '../services/newsSentimentService.js';
import { growwClient } from '../clients/growwClient.js';

// Schema for the SWOT analysis
export interface SwotAnalysis {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
}

// Define the State Annotation for the Graph
export const ResearchStateAnnotation = Annotation.Root({
  companyName: Annotation<string>(),
  ticker: Annotation<string>(),
  resolvedName: Annotation<string>(),
  overview: Annotation<any>(),
  financialMetrics: Annotation<any>(),
  historicalPrices: Annotation<any[]>(),
  intradayPrices: Annotation<any[]>({
    reducer: (x, y) => (y && y.length > 0 ? y : x),
    default: () => [],
  }),
  news: Annotation<any[]>(),
  technicalAnalysis: Annotation<TechnicalAnalysisResult | undefined>(),
  financialAnalysis: Annotation<string>(),
  sentimentAnalysis: Annotation<string>(),
  newsIntelligence: Annotation<NewsIntelligenceResult | undefined>(),
  healthScore: Annotation<HealthScoreBreakdown | undefined>(),
  competitors: Annotation<CompetitorComparisonResult | undefined>(),
  swotAnalysis: Annotation<SwotAnalysis>(),
  bullCase: Annotation<string[]>({
    reducer: (x, y) => (y && y.length > 0 ? y : x),
    default: () => [],
  }),
  bearCase: Annotation<string[]>({
    reducer: (x, y) => (y && y.length > 0 ? y : x),
    default: () => [],
  }),
  recommendation: Annotation<string>(), // 'BUY' | 'HOLD' | 'SELL'
  confidenceScore: Annotation<number>(),
  reasoning: Annotation<string>(),
  plainSummary: Annotation<string | undefined>({
    reducer: (x, y) => y ?? x,
    default: () => undefined,
  }),
  logs: Annotation<string[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
  currentStep: Annotation<string>(),
  error: Annotation<string | undefined>(),
  timestamp: Annotation<string | undefined>(),
  geminiApiKey: Annotation<string | undefined>(),
  tavilyApiKey: Annotation<string | undefined>(),
  growwApiKey: Annotation<string | undefined>(),
});

export type ResearchState = typeof ResearchStateAnnotation.State;

const hasApiKey = (state: ResearchState) => {
  return !!(state.geminiApiKey || config.geminiApiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
};

const sanitizeCurrency = (str: string) => (str ? str.replace(/\$/g, '₹') : str);


// --- NODE 1: Resolve Ticker ---
const resolveTickerNode = async (state: ResearchState) => {
  const logs = [`[SYSTEM] Starting research for query: "${state.companyName}"`];
  try {
    const { symbol, name } = await yahooFinanceClient.resolveTicker(state.companyName);
    return {
      ticker: symbol,
      resolvedName: name,
      currentStep: 'Resolve Ticker',
      logs: [...logs, `[TICKER RESOLVER] Successfully resolved "${state.companyName}" to "${name}" (${symbol})`],
    };
  } catch (err: any) {
    logger.error(`Error resolving ticker: ${err.message}`);
    return {
      error: `Failed to resolve ticker: ${err.message}`,
      logs: [...logs, `[ERROR] Failed to resolve ticker for "${state.companyName}": ${err.message}`],
    };
  }
};

// --- NODE 2: Fetch Data ---
const fetchDataNode = async (state: ResearchState) => {
  const ticker = state.ticker;
  const logs = [`[DATA RETRIEVER] Initiating data collection for ${ticker}`];

  if (!ticker) {
    return {
      error: 'Ticker was not resolved.',
      logs: [...logs, '[ERROR] Cannot fetch data without a valid ticker symbol.'],
    };
  }

  try {
    logs.push(`[DATA RETRIEVER] Fetching company overview & market statistics...`);
    const overview = await yahooFinanceClient.getCompanyOverview(ticker);

    let growwQuote: any = null;
    try {
      const [quote, funds] = await Promise.all([
        growwClient.getLiveQuote(ticker, state.growwApiKey),
        growwClient.getCompanyFundamentals(ticker),
      ]);
      growwQuote = quote;

      if (growwQuote && growwQuote.ltp > 0) {
        overview.price = growwQuote.ltp;
        overview.dayChange = growwQuote.dayChange;
        overview.dayChangePercent = growwQuote.dayChangePercent;
        overview.dayHigh = growwQuote.high;
        overview.dayLow = growwQuote.low;
        overview.open = growwQuote.open;
        overview.prevClose = growwQuote.close;
        overview.volume = growwQuote.volume;
        overview.source = 'GROWW_API';
        overview.lastTradeTime = growwQuote.lastTradeTime;
        logs.push(`[GROWW LIVE FEED] Fetched real-time quote from Groww on NSE: ₹${growwQuote.ltp} (Day Change: ${growwQuote.dayChangePercent >= 0 ? '+' : ''}${growwQuote.dayChangePercent.toFixed(2)}%)`);
      }

      if (funds) {
        if (funds.marketCap) overview.marketCap = funds.marketCap;
        if (funds.businessSummary && (!overview.summary || overview.summary.length < 50)) {
          overview.summary = funds.businessSummary;
        }
      }
    } catch (err: any) {
      logger.warn(`Groww API feed fallback: ${err.message}`);
    }

    logs.push(`[DATA RETRIEVER] Fetching fundamental ratios & balance sheet metrics...`);
    const financialMetrics = await yahooFinanceClient.getFinancialMetrics(ticker);

    // Complement with Groww's real-time ratios if available
    try {
      const funds = await growwClient.getCompanyFundamentals(ticker);
      if (funds) {
        if (funds.peRatio) financialMetrics.peRatio = funds.peRatio;
        if (funds.roe) financialMetrics.returnOnEquity = funds.roe;
        if (funds.priceToBook) financialMetrics.priceToBook = funds.priceToBook;
        if (funds.trailingEps) financialMetrics.trailingEps = funds.trailingEps;
      }
    } catch {
      // ignore
    }

    logs.push(`[DATA RETRIEVER] Fetching multi-year price history and real-time intraday data...`);
    const [historicalPrices, intradayPrices] = await Promise.all([
      yahooFinanceClient.getHistoricalData(ticker),
      yahooFinanceClient.getIntradayData(ticker),
    ]);

    const todayStr = new Date().toISOString().split('T')[0];

    if (growwQuote && growwQuote.ltp > 0) {
      if (historicalPrices.length > 0) {
        const lastBar = historicalPrices[historicalPrices.length - 1];
        if (lastBar.date === todayStr) {
          lastBar.close = growwQuote.ltp;
          lastBar.high = Math.max(lastBar.high || 0, growwQuote.high);
          lastBar.low = Math.min(lastBar.low || Infinity, growwQuote.low);
          lastBar.open = growwQuote.open || lastBar.open;
          lastBar.volume = growwQuote.volume || lastBar.volume;
        } else {
          historicalPrices.push({
            date: todayStr,
            close: growwQuote.ltp,
            open: growwQuote.open,
            high: growwQuote.high,
            low: growwQuote.low,
            volume: growwQuote.volume,
          });
        }
      } else {
        historicalPrices.push({
          date: todayStr,
          close: growwQuote.ltp,
          open: growwQuote.open,
          high: growwQuote.high,
          low: growwQuote.low,
          volume: growwQuote.volume,
        });
      }

      // Synchronize live intraday bar with exact live trade time from Groww
      const nowIso = new Date().toISOString();
      const tradeTimeIso = growwQuote.lastTradeTime
        ? new Date(growwQuote.lastTradeTime * (growwQuote.lastTradeTime < 1e11 ? 1000 : 1)).toISOString()
        : nowIso;

      if (intradayPrices.length > 0) {
        const lastIntra = intradayPrices[intradayPrices.length - 1];
        const lastTime = new Date(lastIntra.date).getTime();
        const tradeTime = new Date(tradeTimeIso).getTime();

        if (Math.abs(tradeTime - lastTime) < 5 * 60 * 1000) {
          lastIntra.close = growwQuote.ltp;
          lastIntra.high = Math.max(lastIntra.high || 0, growwQuote.high, growwQuote.ltp);
          lastIntra.low = Math.min(lastIntra.low || Infinity, growwQuote.low, growwQuote.ltp);
          lastIntra.date = tradeTimeIso;
        } else {
          intradayPrices.push({
            date: tradeTimeIso,
            close: growwQuote.ltp,
            open: lastIntra.close || growwQuote.ltp,
            high: Math.max(growwQuote.ltp, growwQuote.high || growwQuote.ltp),
            low: Math.min(growwQuote.ltp, growwQuote.low || growwQuote.ltp),
            volume: growwQuote.volume,
          });
        }
      } else {
        intradayPrices.push({
          date: tradeTimeIso,
          close: growwQuote.ltp,
          open: growwQuote.open || growwQuote.ltp,
          high: growwQuote.high || growwQuote.ltp,
          low: growwQuote.low || growwQuote.ltp,
          volume: growwQuote.volume,
        });
      }
    }

    logs.push(`[DATA RETRIEVER] Gathering recent financial news & analyst coverage...`);
    const news = await searchClient.fetchNews(ticker, state.resolvedName, state.tavilyApiKey);

    return {
      overview,
      financialMetrics,
      historicalPrices,
      intradayPrices,
      news,
      currentStep: 'Fetch Data',
      logs: [
        ...logs,
        `[DATA RETRIEVER] Overview and financial statements retrieved successfully.`,
        `[DATA RETRIEVER] Loaded ${historicalPrices.length} historical bars and ${intradayPrices.length} intraday bars.`,
        `[DATA RETRIEVER] Collected ${news.length} news articles for sentiment analysis.`,
      ],
    };
  } catch (err: any) {
    logger.error(`Error in data fetching node for ${ticker}: ${err.message}`);
    return {
      error: `Data collection failed: ${err.message}`,
      logs: [...logs, `[ERROR] Data collection failed: ${err.message}`],
    };
  }
};

// --- NODE 3: Deterministic Technical Analysis ---
const analyzeTechnicalsNode = async (state: ResearchState) => {
  const ticker = state.ticker;
  const bars = state.historicalPrices || [];
  const currSym = state.overview?.currencySymbol || '₹';
  const logs = [`[QUANT ENGINE] Executing deterministic technical analysis for ${ticker} (${bars.length} bars)`];

  try {
    const technicalAnalysis = computeTechnicalAnalysis(bars, currSym);
    logs.push(
      `[QUANT ENGINE] Calculated SMA 20/50/200, EMA, RSI 14 (${technicalAnalysis.rsi14.value ?? 'N/A'}), MACD, Bollinger Bands, and Volatility (${technicalAnalysis.annualizedVolatility.value ?? 'N/A'}%).`
    );
    logs.push(`[QUANT ENGINE] Technical Trend Signal: ${technicalAnalysis.trendSignal}`);

    return {
      technicalAnalysis,
      currentStep: 'Technical Analysis',
      logs,
    };
  } catch (err: any) {
    logger.error(`Error in technical analysis node: ${err.message}`);
    return {
      error: `Technical analysis computation failed: ${err.message}`,
      logs: [...logs, `[ERROR] Technical analysis computation failed: ${err.message}`],
    };
  }
};

// --- NODE 4: Financial Analysis (LLM or Simulation) ---
const analyzeFinancialsNode = async (state: ResearchState) => {
  const ticker = state.ticker;
  const metrics = state.financialMetrics || {};
  const overview = state.overview;
  const technical = state.technicalAnalysis;
  const logs = [`[FINANCIAL ANALYST] Initiating quantitative and ratio analysis for ${ticker}`];

  if (!ticker || !overview) {
    return {
      error: 'Missing profile data for financial analysis.',
      logs: [...logs, '[ERROR] Missing profile data. Skipping financial analysis.'],
    };
  }

  try {
    const currSym = overview.currencySymbol || '₹';
    const currency = overview.currency || 'INR';

    if (!hasApiKey(state)) {
      logs.push('[SIMULATION] Generating simulated financial analysis based on raw metrics...');
      const fallbackAnalysis = `### Financial Health Analysis for ${state.resolvedName} (${ticker})
- **Market Valuation**: Commands a market capitalization of ${currSym}${(overview.marketCap / 1e9).toFixed(2)}B at a price of ${currSym}${overview.price}.
- **Valuation Ratios**: Trailing P/E ratio is ${metrics.peRatio ? metrics.peRatio.toFixed(1) + 'x' : 'N/A'} (Forward P/E: ${metrics.forwardPe ? metrics.forwardPe.toFixed(1) + 'x' : 'N/A'}). Price-to-Book stands at ${metrics.priceToBook ? metrics.priceToBook.toFixed(1) : 'N/A'}.
- **Profitability & Returns**: Return on Equity (ROE) is ${metrics.returnOnEquity ? (metrics.returnOnEquity * 100).toFixed(1) + '%' : 'N/A'}, with Return on Assets (ROA) of ${metrics.returnOnAssets ? (metrics.returnOnAssets * 100).toFixed(1) + '%' : 'N/A'}. Operating Profit Margin is ${metrics.profitMargin ? (metrics.profitMargin * 100).toFixed(1) + '%' : 'N/A'}%.
- **Growth & Cash Generation**: YoY Revenue Growth is ${metrics.revenueGrowth ? (metrics.revenueGrowth * 100).toFixed(1) + '%' : 'N/A'}. Free Cash Flow stands at ${currSym}${metrics.freeCashFlow ? (metrics.freeCashFlow / 1e9).toFixed(2) + 'B' : 'N/A'}.
- **Liquidity & Leverage**: Current ratio is ${metrics.currentRatio || 'N/A'} with Quick Ratio of ${metrics.quickRatio || 'N/A'}. Debt-to-Equity is ${metrics.debtToEquity ? metrics.debtToEquity.toFixed(1) + '%' : 'N/A'}.`;

      return {
        financialAnalysis: fallbackAnalysis,
        currentStep: 'Financial Analysis',
        logs: [...logs, '[FINANCIAL ANALYST] Quantitative analysis generated in simulation mode.'],
      };
    }

    logs.push('[FINANCIAL ANALYST] Calling LLM to parse financial profile & growth statements...');
    const model = llmClient.getModel(state.geminiApiKey);
    const prompt = `You are an expert equity research analyst. Analyze the following financial metrics for ${state.resolvedName} (${ticker}):

Company Overview:
- Name: ${state.resolvedName}
- Sector: ${overview.sector}
- Industry: ${overview.industry}
- Market Cap: ${currSym}${overview.marketCap}
- Regular Market Price: ${currSym}${overview.price}

Key Financial Metrics:
- Trailing P/E: ${metrics.peRatio || 'N/A'}
- Forward P/E: ${metrics.forwardPe || 'N/A'}
- Price-to-Book (P/B): ${metrics.priceToBook || 'N/A'}
- PEG Ratio: ${metrics.pegRatio || 'N/A'}
- ROE: ${metrics.returnOnEquity ? (metrics.returnOnEquity * 100).toFixed(2) : 'N/A'}%
- ROA: ${metrics.returnOnAssets ? (metrics.returnOnAssets * 100).toFixed(2) : 'N/A'}%
- Profit Margin: ${metrics.profitMargin ? (metrics.profitMargin * 100).toFixed(2) : 'N/A'}%
- Revenue Growth: ${metrics.revenueGrowth ? (metrics.revenueGrowth * 100).toFixed(2) : 'N/A'}%
- Earnings Growth: ${metrics.earningsGrowth ? (metrics.earningsGrowth * 100).toFixed(2) : 'N/A'}%
- Free Cash Flow: ${metrics.freeCashFlow ? `${currSym}${metrics.freeCashFlow}` : 'N/A'}
- Current Ratio: ${metrics.currentRatio || 'N/A'}
- Debt-to-Equity: ${metrics.debtToEquity || 'N/A'}%

Technical Context:
- Trend Signal: ${technical?.trendSignal || 'NEUTRAL'}
- RSI (14): ${technical?.rsi14.value || 'N/A'}

Provide a professional, markdown-formatted financial evaluation. Analyze:
1. Valuation (P/E, P/B relative to growth).
2. Solvency & Liquidity (Current/Quick ratios and Debt-to-Equity leverage risk).
3. Profitability (Profit margins and ROE/ROA efficiency).
4. Cash Flow strength (FCF conversion and cash runway).

Important: All monetary figures and valuation amounts are in ${currency} (${currSym}). Strictly format all prices and values with the "${currSym}" symbol, NEVER with "$".
Keep the summary concise, professional, and dense with facts. Do not write filler.`;

    const response = await model.invoke(prompt);
    const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);

    return {
      financialAnalysis: sanitizeCurrency(content),
      currentStep: 'Financial Analysis',
      logs: [...logs, '[FINANCIAL ANALYST] LLM financial report successfully completed.'],
    };
  } catch (err: any) {
    logger.error(`Error in financial analysis node: ${err.message}`);
    return {
      error: `Financial analysis failed: ${err.message}`,
      logs: [...logs, `[ERROR] Financial analysis failed: ${err.message}`],
    };
  }
};

// --- NODE 5: Structured AI News & Sentiment Intelligence ---
const analyzeNewsNode = async (state: ResearchState) => {
  const ticker = state.ticker;
  const news = state.news || [];
  const logs = [`[SENTIMENT INTELLIGENCE] Classifying ${news.length} news articles and detecting market catalysts for ${ticker}`];

  try {
    const newsIntel = await newsSentimentService.analyzeNewsIntelligence(
      ticker,
      state.resolvedName || ticker,
      news,
      state.geminiApiKey
    );

    logs.push(
      `[SENTIMENT INTELLIGENCE] Aggregated sentiment score: ${newsIntel.aggregateSentimentScore}/100 (${newsIntel.sentimentLabel}). Key catalysts: ${newsIntel.keyCatalysts.slice(0, 2).join(', ')}`
    );

    return {
      sentimentAnalysis: newsIntel.summary,
      newsIntelligence: newsIntel,
      currentStep: 'Sentiment Analysis',
      logs,
    };
  } catch (err: any) {
    logger.error(`Error in sentiment intelligence node: ${err.message}`);
    return {
      sentimentAnalysis: 'Market sentiment evaluation encountered an issue. Defaulting to Neutral.',
      currentStep: 'Sentiment Analysis',
      logs: [...logs, `[ERROR] Sentiment intelligence processing failed: ${err.message}`],
    };
  }
};

// --- NODE 6: Stock Health Score Engine ---
const computeHealthScoreNode = async (state: ResearchState) => {
  const ticker = state.ticker;
  const metrics = state.financialMetrics;
  const technical = state.technicalAnalysis || null;
  const logs = [`[HEALTH SCORING] Computing deterministic 0-100 Stock Health Score across 5 dimensions for ${ticker}`];

  try {
    const { overallScore, subScores } = computeHealthScore(metrics, technical);
    logs.push(
      `[HEALTH SCORING] Scores calculated: Overall ${overallScore}/100 | Fundamental: ${subScores.fundamental} | Valuation: ${subScores.valuation} | Growth: ${subScores.growth} | Technical: ${subScores.technical} | Risk: ${subScores.risk}`
    );

    logs.push('[HEALTH SCORING] Formulating explainability narrative layer for each score dimension...');
    const explanations = await buildHealthScoreExplanations(
      ticker,
      { overallScore, subScores },
      metrics,
      state.geminiApiKey
    );

    const healthScore: HealthScoreBreakdown = {
      overallScore,
      subScores,
      explanations,
    };

    return {
      healthScore,
      currentStep: 'Stock Health Score',
      logs: [...logs, `[HEALTH SCORING] Stock Health Score finalized at ${overallScore}/100.`],
    };
  } catch (err: any) {
    logger.error(`Error in health score node: ${err.message}`);
    return {
      error: `Health score calculation failed: ${err.message}`,
      logs: [...logs, `[ERROR] Health score calculation failed: ${err.message}`],
    };
  }
};

// --- NODE 7: Competitor Benchmarking ---
const compareCompetitorsNode = async (state: ResearchState) => {
  const ticker = state.ticker;
  const overview = state.overview;
  const metrics = state.financialMetrics || {};
  const logs = [`[PEER BENCHMARK] Identifying industry competitors and compiling comparison matrix for ${ticker}`];

  try {
    const competitors = await competitorService.compareCompetitors(
      ticker,
      overview,
      metrics,
      state.geminiApiKey
    );

    logs.push(
      `[PEER BENCHMARK] Benchmarked against ${competitors.peers.length - 1} peers. Market Cap Rank: ${competitors.rankings.marketCapRank}, ROE Rank: ${competitors.rankings.profitabilityRank}`
    );

    return {
      competitors,
      currentStep: 'Competitor Comparison',
      logs,
    };
  } catch (err: any) {
    logger.warn(`Error in competitor comparison node: ${err.message}`);
    return {
      currentStep: 'Competitor Comparison',
      logs: [...logs, `[WARNING] Competitor benchmarking deferred: ${err.message}`],
    };
  }
};

// --- NODE 8: SWOT Analysis ---
const analyzeSwotNode = async (state: ResearchState) => {
  const ticker = state.ticker;
  const logs = [`[RISK OFFICER] Commencing SWOT mapping for ${ticker}`];

  try {
    if (!hasApiKey(state)) {
      logs.push('[SIMULATION] Outlining SWOT points in simulation mode...');
      const fallbackSwot: SwotAnalysis = {
        strengths: [
          'Robust operating cash flow generation and liquid balance sheet reserves.',
          'High brand equity, customer ecosystem lock-in, and proprietary technology advantage.',
        ],
        weaknesses: [
          'Elevated valuation multiples demand uninterrupted quarter-over-quarter execution.',
          'Geographic and vendor concentration risk across specialized supply chains.',
        ],
        opportunities: [
          'Accelerating enterprise integration of proprietary AI models and recurring cloud services.',
          'Expansion into high-margin adjacent software subscriptions and global emerging markets.',
        ],
        threats: [
          'Heightened antitrust oversight and global regulatory compliance scrutiny.',
          'Intensifying competitive pressure from alternative low-cost market entrants.',
        ],
      };

      return {
        swotAnalysis: fallbackSwot,
        currentStep: 'SWOT Analysis',
        logs: [...logs, '[RISK OFFICER] SWOT mapping complete (simulated).'],
      };
    }

    logs.push('[RISK OFFICER] Prompting LLM to build verified SWOT matrix...');
    const model = llmClient.getModel(state.geminiApiKey);
    const prompt = `You are a corporate risk and strategy consultant. Analyze ${state.resolvedName} (${ticker}) based on:
Financial Analysis: ${state.financialAnalysis}
Sentiment & News: ${state.sentimentAnalysis}

Provide a SWOT (Strengths, Weaknesses, Opportunities, Threats) analysis.
Output ONLY a valid JSON object matching this schema without markdown code blocks:
{
  "strengths": ["list of 2-3 specific business strengths"],
  "weaknesses": ["list of 2-3 specific internal structural or financial weaknesses"],
  "opportunities": ["list of 2-3 specific forward growth drivers or market opportunities"],
  "threats": ["list of 2-3 specific macroeconomic, regulatory, or competitive risks"]
}`;

    const response = await model.invoke(prompt);
    let content = typeof response.content === 'string' ? response.content.trim() : JSON.stringify(response.content);

    if (content.startsWith('```json')) content = content.replace(/^```json/, '').replace(/```$/, '').trim();
    else if (content.startsWith('```')) content = content.replace(/^```/, '').replace(/```$/, '').trim();

    const swot: SwotAnalysis = JSON.parse(content);
    return {
      swotAnalysis: {
        strengths: (swot.strengths || []).map(sanitizeCurrency),
        weaknesses: (swot.weaknesses || []).map(sanitizeCurrency),
        opportunities: (swot.opportunities || []).map(sanitizeCurrency),
        threats: (swot.threats || []).map(sanitizeCurrency),
      },
      currentStep: 'SWOT Analysis',
      logs: [...logs, '[RISK OFFICER] SWOT JSON mapped and validated successfully.'],
    };
  } catch (err: any) {
    logger.error(`Error in SWOT analysis node: ${err.message}`);
    const defaultSwot: SwotAnalysis = {
      strengths: ['Established industry footprint and capital reserves'],
      weaknesses: ['Vulnerable to cyclical industry and supply chain slowdowns'],
      opportunities: ['Market expansion through technological modernization'],
      threats: ['Macroeconomic inflation and interest rate pressure'],
    };
    return {
      swotAnalysis: defaultSwot,
      logs: [...logs, `[WARNING] SWOT JSON parsing failed. Loaded fallback SWOT structure: ${err.message}`],
    };
  }
};

// --- NODE 9: Synthesize Bull vs Bear & Final Recommendation ---
const synthesizeRecommendationNode = async (state: ResearchState) => {
  const ticker = state.ticker;
  const healthScore = state.healthScore?.overallScore ?? 75;
  const tech = state.technicalAnalysis;
  const metrics = state.financialMetrics || {};
  const logs = [`[PORTFOLIO MANAGER] Compiling research layers to finalize Bull vs Bear analysis and investment thesis for ${ticker}`];

  try {
    if (!hasApiKey(state)) {
      logs.push('[SIMULATION] Synthesizing Bull vs Bear cases and recommendation in simulation mode...');

      const bullCase = [
        `Superior operational capital efficiency: Return on Equity is ${(metrics.returnOnEquity ? metrics.returnOnEquity * 100 : 25).toFixed(1)}% with steady Free Cash Flow conversion.`,
        `Favorable technical bias: Price commands support above key moving averages with positive momentum.`,
        `Strong enterprise positioning: Robust market share reinforced by secular AI and recurring revenue tailwinds.`,
      ];

      const bearCase = [
        `Valuation compression risk: Trailing P/E of ${metrics.peRatio ? metrics.peRatio.toFixed(1) + 'x' : 'elevated level'} leaves thin margin of safety for earnings misses.`,
        `Competitive and macro headwinds: Slower enterprise budget cycles and supply chain friction.`,
        `Debt and cost leverage: Elevated debt-to-equity or operating expenditures require rigorous capital allocation.`,
      ];

      const rec = healthScore >= 70 ? 'BUY' : healthScore >= 45 ? 'HOLD' : 'SELL';
      const strongerCase = rec === 'BUY' ? 'Bull' : rec === 'HOLD' ? 'balanced Bull/Bear' : 'Bear';

      const reasoning = `The investment committee establishes a ${rec} rating for ${state.resolvedName} (${ticker}). The ${strongerCase} case carries greater empirical weight grounded in a Stock Health Score of ${healthScore}/100. Key strengths in capital efficiency and market leadership outweigh valuation headwinds, though macro risks warrant prudent position sizing.`;

      const plainSummary =
        rec === 'BUY'
          ? `${state.resolvedName} demonstrates sound business fundamentals and consistent profitability, making it an attractive consideration for long-term investors.`
          : rec === 'HOLD'
          ? `${state.resolvedName} shows stable business operations, but mixed growth indicators suggest a patient wait-and-see approach.`
          : `${state.resolvedName} currently faces noticeable profitability or market valuation challenges, warranting caution before investing.`;

      return {
        bullCase,
        bearCase,
        recommendation: rec,
        confidenceScore: healthScore,
        reasoning,
        plainSummary,
        currentStep: 'Synthesize Recommendation',
        logs: [
          ...logs,
          `[PORTFOLIO MANAGER] Bull/Bear cases constructed (3 Bull / 3 Bear points).`,
          `[PORTFOLIO MANAGER] Final recommendation synthesized: ${rec} (${healthScore}% Conviction Score).`,
        ],
      };
    }

    logs.push('[PORTFOLIO MANAGER] Invoking LLM to construct adversarial Bull vs Bear cases and thesis...');
    const model = llmClient.getModel(state.geminiApiKey);

    const prompt = `You are the Investment Committee Chair at an institutional asset management firm. Review the quantitative and qualitative research compiled for ${state.resolvedName} (${ticker}):

Deterministic Health Score: ${healthScore}/100
Technical Bias: ${tech?.trendSignal || 'NEUTRAL'} (RSI: ${tech?.rsi14.value || 'N/A'}, SMA 50: ${tech?.sma50.value || 'N/A'})
Financial Ratios: P/E ${metrics.peRatio || 'N/A'}, ROE ${metrics.returnOnEquity ? (metrics.returnOnEquity * 100).toFixed(1) + '%' : 'N/A'}, Rev Growth ${metrics.revenueGrowth ? (metrics.revenueGrowth * 100).toFixed(1) + '%' : 'N/A'}, Debt/Equity ${metrics.debtToEquity || 'N/A'}%
Competitor Standing: ${state.competitors?.summary || 'N/A'}
News Sentiment: ${state.sentimentAnalysis}

Construct:
1. Bull Case: exactly 2-3 concrete, data-grounded points supporting upside catalysts and strengths.
2. Bear Case: exactly 2-3 concrete, data-grounded points supporting downside risks, valuation friction, and weaknesses.
3. Final Recommendation: exactly BUY, HOLD, or SELL with conviction score (0-100).
5. Plain Summary: Exactly 1-2 complete, grammatical sentences written for a first-time beginner investor.
   CRITICAL JARGON RULES FOR PLAIN SUMMARY:
   - Absolutely FORBIDDEN terms: P/E, ROE, ROA, RSI, MACD, EBITDA, EPS, SMA, EMA, moving average, multiple, volatility, beta, margin compression, valuation discount, or any raw technical ratio.
   - Use plain everyday concepts like "steady customer demand", "consistent profits", "sound financial footing", "high debt burden", "slowing sales", or "higher risk of short-term price drops".
   - Must clearly reflect whether the company's financial position is strong, moderate, or risky, and align with the final recommendation.

Important: All currency values, target prices, or monetary figures must use the "${state.overview?.currencySymbol || '₹'}" symbol (${state.overview?.currency || 'INR'}). NEVER use "$".

Return ONLY a valid JSON object matching this schema without markdown code blocks:
{
  "bullCase": ["point 1 with hard numbers", "point 2 with hard numbers", "point 3 with hard numbers"],
  "bearCase": ["point 1 with hard numbers", "point 2 with hard numbers", "point 3 with hard numbers"],
  "recommendation": "BUY", // BUY | HOLD | SELL
  "confidenceScore": 84, // 0-100
  "reasoning": "A paragraph explaining which case has stronger evidence and why, referencing the deterministic data.",
  "plainSummary": "A 1-2 sentence plain-English summary for a beginner explaining the takeaway without any jargon."
}`;

    const response = await model.invoke(prompt);
    let content = typeof response.content === 'string' ? response.content.trim() : JSON.stringify(response.content);

    if (content.startsWith('```json')) content = content.replace(/^```json/, '').replace(/```$/, '').trim();
    else if (content.startsWith('```')) content = content.replace(/^```/, '').replace(/```$/, '').trim();

    const decision = JSON.parse(content);
    const rawBull = Array.isArray(decision.bullCase) && decision.bullCase.length > 0 ? decision.bullCase : ['Solid fundamental foundation'];
    const rawBear = Array.isArray(decision.bearCase) && decision.bearCase.length > 0 ? decision.bearCase : ['Valuation multiple vulnerability'];
    const bullCase = rawBull.map(sanitizeCurrency);
    const bearCase = rawBear.map(sanitizeCurrency);
    const reasoning = sanitizeCurrency(decision.reasoning || `Investment thesis synthesized for ${ticker} based on ${healthScore}/100 health score.`);
    const plainSummary = decision.plainSummary
      ? sanitizeCurrency(decision.plainSummary)
      : decision.recommendation === 'BUY'
      ? `${state.resolvedName} shows healthy financial fundamentals and positive market momentum for long-term investors.`
      : `${state.resolvedName} presents balanced signals; waiting for stronger entry conditions may be prudent.`;

    return {
      bullCase,
      bearCase,
      recommendation: decision.recommendation || (healthScore >= 70 ? 'BUY' : 'HOLD'),
      confidenceScore: typeof decision.confidenceScore === 'number' ? decision.confidenceScore : healthScore,
      reasoning,
      plainSummary,
      currentStep: 'Synthesize Recommendation',
      logs: [
        ...logs,
        `[PORTFOLIO MANAGER] Bull/Bear cases constructed.`,
        `[PORTFOLIO MANAGER] Recommendation finalized: ${decision.recommendation} (${decision.confidenceScore || healthScore}% Confidence)`,
      ],
    };
  } catch (err: any) {
    logger.error(`Error in recommendation synthesis node: ${err.message}`);
    return {
      recommendation: 'HOLD',
      confidenceScore: 50,
      bullCase: ['Established operations and market footprint.'],
      bearCase: ['Near-term macroeconomic volatility and uncertainty.'],
      reasoning: `Recommendation synthesis defaulted to HOLD due to processing error: ${err.message}.`,
      logs: [...logs, `[ERROR] Recommendation synthesis failed: ${err.message}`],
    };
  }
};

// --- Construct the Augmented StateGraph ---
const workflow = new StateGraph(ResearchStateAnnotation)
  .addNode('resolveTicker', resolveTickerNode)
  .addNode('fetchData', fetchDataNode)
  .addNode('analyzeTechnicals', analyzeTechnicalsNode)
  .addNode('analyzeFinancials', analyzeFinancialsNode)
  .addNode('analyzeSentiment', analyzeNewsNode)
  .addNode('computeHealthScore', computeHealthScoreNode)
  .addNode('compareCompetitors', compareCompetitorsNode)
  .addNode('analyzeSwot', analyzeSwotNode)
  .addNode('synthesizeRecommendation', synthesizeRecommendationNode);

// Linear pipeline with stage-by-stage progressive SSE streaming
workflow.addEdge(START, 'resolveTicker');
workflow.addEdge('resolveTicker', 'fetchData');
workflow.addEdge('fetchData', 'analyzeTechnicals');
workflow.addEdge('analyzeTechnicals', 'analyzeFinancials');
workflow.addEdge('analyzeFinancials', 'analyzeSentiment');
workflow.addEdge('analyzeSentiment', 'computeHealthScore');
workflow.addEdge('computeHealthScore', 'compareCompetitors');
workflow.addEdge('compareCompetitors', 'analyzeSwot');
workflow.addEdge('analyzeSwot', 'synthesizeRecommendation');
workflow.addEdge('synthesizeRecommendation', END);

// Compile the Graph
export const researchAgent = workflow.compile();
