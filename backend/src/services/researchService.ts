import NodeCache from 'node-cache';
import { researchAgent, ResearchState } from '../agents/researchAgent.js';
import { dbService } from './dbService.js';
import { logger } from '../middleware/logger.js';
import { CustomError } from '../middleware/errorHandler.js';
import { config } from '../config/index.js';
import { growwClient } from '../clients/growwClient.js';

// Initialize cache with 1-hour default TTL and automatic check for expired items every 2 minutes
const localCache = new NodeCache({
  stdTTL: config.cacheTtl,
  checkperiod: 120,
});

export class ResearchService {
  constructor() {
    localCache.flushAll();
    logger.info('Research service initialized: flushed stale cache keys.');
  }

  /**
   * Generates a unique cache key based on the company query string.
   */
  private getCacheKey(query: string): string {
    return `research:${query.trim().toLowerCase()}`;
  }

  /**
   * Runs the research graph for a company query.
   * Streams intermediate state updates via the onStep callback.
   * Caches the final completed research state.
   */
  async executeResearchAgent(
    companyName: string,
    geminiApiKey: string | undefined,
    tavilyApiKey: string | undefined,
    growwApiKey: string | undefined,
    onStep: (stateUpdate: Partial<ResearchState>) => void,
    forceRefresh = false
  ): Promise<ResearchState> {
    const cacheKey = this.getCacheKey(companyName);
    
    // Check cache only when not explicitly requesting fresh live API data
    if (!forceRefresh) {
      const cachedResult = localCache.get<ResearchState>(cacheKey);
      if (cachedResult) {
        logger.info(`Cache hit for "${companyName}". Refreshing live real-time market data from Groww...`);

        // Real-time market feed guarantee: Always fetch live broker quote when request is sent
        try {
          const liveQuote = await growwClient.getLiveQuote(cachedResult.ticker || companyName);
          if (liveQuote && liveQuote.ltp > 0) {
            cachedResult.overview = {
              ...(cachedResult.overview || {}),
              price: liveQuote.ltp,
              dayChange: liveQuote.dayChange,
              dayChangePercent: liveQuote.dayChangePercent,
              dayHigh: liveQuote.high,
              dayLow: liveQuote.low,
              open: liveQuote.open,
              prevClose: liveQuote.close,
              volume: liveQuote.volume,
              source: 'GROWW_API',
            };
            if (cachedResult.historicalPrices && cachedResult.historicalPrices.length > 0) {
              const last = cachedResult.historicalPrices[cachedResult.historicalPrices.length - 1];
              last.close = liveQuote.ltp;
              last.high = Math.max(last.high || 0, liveQuote.high);
              last.low = Math.min(last.low || Infinity, liveQuote.low);
            }
            if (cachedResult.intradayPrices && cachedResult.intradayPrices.length > 0) {
              const last = cachedResult.intradayPrices[cachedResult.intradayPrices.length - 1];
              last.close = liveQuote.ltp;
            }
          }
        } catch (err: any) {
          logger.warn(`Failed to refresh real-time quote on cache hit: ${err.message}`);
        }

        // Simulate brief streaming steps for the cached results to enhance client UX
        onStep({
          currentStep: 'Resolve Ticker',
          logs: [`[SYSTEM] Cache hit for "${companyName}". Real-time quote refreshed from Groww: ₹${cachedResult.overview?.price || 'N/A'}.`],
        });
      await new Promise(resolve => setTimeout(resolve, 300));
      
      onStep({
        currentStep: 'Fetch Data',
        ticker: cachedResult.ticker,
        resolvedName: cachedResult.resolvedName,
        overview: cachedResult.overview,
        historicalPrices: cachedResult.historicalPrices,
        intradayPrices: cachedResult.intradayPrices,
        news: cachedResult.news,
        financialMetrics: cachedResult.financialMetrics,
      });
      await new Promise(resolve => setTimeout(resolve, 300));

      onStep({
        currentStep: 'Financial Analysis',
        financialAnalysis: cachedResult.financialAnalysis,
      });
      await new Promise(resolve => setTimeout(resolve, 300));

      onStep({
        currentStep: 'Sentiment Analysis',
        sentimentAnalysis: cachedResult.sentimentAnalysis,
      });
      await new Promise(resolve => setTimeout(resolve, 300));

      onStep({
        currentStep: 'SWOT Analysis',
        swotAnalysis: cachedResult.swotAnalysis,
      });
      await new Promise(resolve => setTimeout(resolve, 300));

      onStep(cachedResult); // Send final state
      return cachedResult;
      }
    }

    logger.info(`Cache miss for "${companyName}". Launching research state graph...`);
    
    const initialState = {
      companyName,
      geminiApiKey,
      tavilyApiKey,
      growwApiKey,
      ticker: '',
      resolvedName: '',
      overview: null,
      financialMetrics: null,
      historicalPrices: [],
      intradayPrices: [],
      news: [],
      technicalAnalysis: undefined,
      financialAnalysis: '',
      sentimentAnalysis: '',
      newsIntelligence: undefined,
      healthScore: undefined,
      competitors: undefined,
      swotAnalysis: { strengths: [], weaknesses: [], opportunities: [], threats: [] },
      bullCase: [],
      bearCase: [],
      recommendation: '',
      confidenceScore: 0,
      reasoning: '',
      logs: [],
      currentStep: 'Start',
      error: undefined,
      timestamp: undefined,
    };

    let latestState = { ...initialState } as ResearchState;

    try {
      const stream = await researchAgent.stream(latestState, {
        streamMode: 'values',
      });

      for await (const value of stream) {
        // value contains the full State object at the current node's completion
        latestState = value as ResearchState;
        
        // Notify controller / SSE stream
        onStep(latestState);
      }

      // Check if research failed inside graph nodes
      if (latestState.error) {
        throw new CustomError(latestState.error, 500);
      }

      latestState.timestamp = new Date().toISOString();
      // Cache the completed state on success (cache under both company query and ticker if resolved)
      localCache.set(cacheKey, latestState);
      if (latestState.ticker) {
        localCache.set(this.getCacheKey(latestState.ticker), latestState);
      }

      // Persist to durable SQLite database store
      try {
        await dbService.saveResearch(latestState);
      } catch (dbErr: any) {
        logger.warn(`Failed to persist research in database: ${dbErr.message}`);
      }

      logger.info(`Successfully completed research for "${companyName}" and cached result.`);
      return latestState;
    } catch (error: any) {
      logger.error(`Error executing research agent graph: ${error.message}`);
      throw error instanceof CustomError ? error : new CustomError(`Research process aborted: ${error.message}`, 500);
    }
  }

  /**
   * Retrieves past research runs from SQLite persistent store with fallback.
   */
  async getHistory(): Promise<any[]> {
    try {
      const records = await dbService.getHistory(30);
      return records;
    } catch (err: any) {
      logger.error(`Error getting history from db: ${err.message}`);
      return [];
    }
  }

  /**
   * Invalidates research cache for a company query.
   */
  clearCache(companyName: string): void {
    const key = this.getCacheKey(companyName);
    localCache.del(key);
    logger.info(`Invalidated cache for key: ${key}`);
  }
}

export const researchService = new ResearchService();
