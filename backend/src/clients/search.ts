import { config } from '../config/index.js';
import { logger } from '../middleware/logger.js';
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();

export interface NewsArticle {
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  snippet: string;
}

export class SearchClient {
  /**
   * Fetches latest financial news and opinions for a company ticker.
   * Leverages Tavily Search if API key is present; falls back to Yahoo Finance News API.
   */
  async fetchNews(ticker: string, companyName: string, customTavilyKey?: string): Promise<NewsArticle[]> {
    const query = `${companyName} (${ticker}) stock investment outlook news analysis 2026`;
    const tavilyKey = customTavilyKey || config.tavilyApiKey;

    if (tavilyKey) {
      try {
        logger.info(`Tavily API key present. Performing Tavily search for: "${query}"`);
        const response = await fetch('https://api.tavily.com/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            api_key: tavilyKey,
            query: query,
            search_depth: 'basic',
            topic: 'news',
            include_answer: false,
            max_results: 6,
          }),
          signal: AbortSignal.timeout(10000),
        });

        if (response.ok) {
          const data = await response.json() as any;
          if (data && Array.isArray(data.results)) {
            logger.info(`Tavily search returned ${data.results.length} articles`);
            return data.results.map((res: any) => ({
              title: res.title || 'No Title',
              source: this.extractDomain(res.url) || 'News Source',
              url: res.url || '',
              publishedAt: new Date().toISOString(), // Tavily doesn't always provide publish date, default to current
              snippet: res.content || '',
            }));
          }
        } else {
          logger.warn(`Tavily search API returned status: ${response.status}`);
        }
      } catch (error: any) {
        logger.warn(`Tavily search failed: ${error.message}. Falling back to Yahoo Finance News.`);
      }
    } else {
      logger.info('Tavily API key not found. Using Yahoo Finance built-in News Search.');
    }

    // Fallback: Use Yahoo Finance search news
    try {
      logger.info(`Fetching Yahoo Finance search news for ticker: ${ticker}`);
      const searchResults = await yahooFinance.search(ticker, { newsCount: 8 }) as any;
      const newsQuotes = searchResults.news || [];

      if (newsQuotes.length > 0) {
        logger.info(`Yahoo Finance search news returned ${newsQuotes.length} articles`);
        return newsQuotes.map((article: any) => ({
          title: article.title || 'No Title',
          source: article.publisher || 'Yahoo Finance',
          url: article.link || '',
          publishedAt: article.providerPublishTime
            ? new Date(article.providerPublishTime * 1000).toISOString()
            : new Date().toISOString(),
          snippet: `Publish Time: ${article.providerPublishTime ? new Date(article.providerPublishTime * 1000).toLocaleDateString() : 'N/A'}. Read full story at link.`,
        }));
      }
    } catch (error: any) {
      logger.error(`Yahoo Finance news fallback failed: ${error.message}`);
    }

    // Secondary Fallback: Empty array
    logger.warn('All news retrieval options failed. Returning empty list.');
    return [];
  }

  private extractDomain(urlStr: string): string {
    try {
      const url = new URL(urlStr);
      return url.hostname.replace('www.', '');
    } catch (e) {
      return '';
    }
  }
}

export const searchClient = new SearchClient();
