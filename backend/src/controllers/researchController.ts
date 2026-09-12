import { Request, Response, NextFunction } from 'express';
import { researchService } from '../services/researchService.js';
import { yahooFinanceClient } from '../clients/yahooFinance.js';
import { screenerService } from '../services/screenerService.js';
import { logger } from '../middleware/logger.js';
import { CustomError } from '../middleware/errorHandler.js';
import { z } from 'zod';

const researchQuerySchema = z.object({
  company: z.string().min(1, 'Company query parameter is required').max(100, 'Company query is too long'),
  geminiApiKey: z.string().optional(),
  tavilyApiKey: z.string().optional(),
});

export class ResearchController {
  /**
   * SSE Endpoint: Starts investment research and streams progress logs and state updates.
   */
  async streamResearch(req: Request, res: Response, next: NextFunction) {
    let companyParam: string;
    let geminiApiKey: string | undefined;
    let tavilyApiKey: string | undefined;
    let growwApiKey: string | undefined;
    
    try {
      const company = (req.query.company as string) || (req.body?.company as string);
      if (!company || typeof company !== 'string' || company.trim().length === 0) {
        throw new CustomError('Company query parameter is required', 400);
      }
      companyParam = company.trim();

      // Security: Extract API keys from custom request headers or body, deprecating query params
      const headerGemini = (req.headers['x-gemini-api-key'] || req.headers['authorization']) as string | undefined;
      const headerTavily = req.headers['x-tavily-api-key'] as string | undefined;
      const headerGroww = req.headers['x-groww-api-key'] as string | undefined;
      const bodyGemini = req.body?.geminiApiKey;
      const bodyTavily = req.body?.tavilyApiKey;
      const bodyGroww = req.body?.growwApiKey;

      geminiApiKey = headerGemini || bodyGemini || (req.query.geminiApiKey as string | undefined);
      tavilyApiKey = headerTavily || bodyTavily || (req.query.tavilyApiKey as string | undefined);
      growwApiKey = headerGroww || bodyGroww || (req.query.growwApiKey as string | undefined);

      if (req.query.geminiApiKey || req.query.tavilyApiKey || req.query.growwApiKey) {
        logger.warn('Security Notice: API keys passed via query parameters are deprecated. Use x-gemini-api-key, x-tavily-api-key, and x-groww-api-key headers instead.');
      }
    } catch (err) {
      return next(err);
    }

    logger.info(`SSE client connected. Spawning research agent stream for "${companyParam}"`);

    // Setup headers for Server-Sent Events
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable buffering on Nginx for live streaming
    res.flushHeaders();

    // Client connection disconnect handler
    let isClientConnected = true;
    req.on('close', () => {
      logger.info(`SSE client closed connection for "${companyParam}"`);
      isClientConnected = false;
    });

    const sendSseEvent = (event: string, data: any) => {
      if (!isClientConnected) return;
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    try {
      const forceRefresh = req.query.refresh === 'true' || req.body?.refresh === true || req.headers['x-refresh-cache'] === 'true';

      // Execute LangGraph Agent and send updates back via SSE
      await researchService.executeResearchAgent(
        companyParam,
        geminiApiKey,
        tavilyApiKey,
        growwApiKey,
        (stateUpdate) => {
          sendSseEvent('step', stateUpdate);
        },
        forceRefresh
      );

      sendSseEvent('complete', { message: 'Research complete' });
      res.end();
    } catch (err: any) {
      logger.error(`Error in research stream for "${companyParam}": ${err.message}`);
      sendSseEvent('error', {
        message: err.message || 'An unexpected error occurred during research execution',
        statusCode: err.statusCode || 500,
      });
      res.end();
    }
  }

  /**
   * Endpoint: Manually clear research cache for a company.
   */
  async invalidateCache(req: Request, res: Response, next: NextFunction) {
    try {
      const parsedBody = z.object({
        company: z.string().min(1, 'Company query is required'),
      }).safeParse(req.body);

      if (!parsedBody.success) {
        throw new CustomError('Company name is required', 400);
      }

      researchService.clearCache(parsedBody.data.company);
      res.status(200).json({
        success: true,
        message: `Cache successfully cleared for "${parsedBody.data.company}"`,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Endpoint: Get list of previous runs.
   */
  async getHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const history = await researchService.getHistory();
      res.status(200).json({ success: true, data: history });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Endpoint: Get watchlist real-time stocks data.
   */
  async getWatchlist(req: Request, res: Response, next: NextFunction) {
    try {
      const tickers = ['SBIN.NS', 'RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY', 'TATAMOTORS.NS', 'ICICIBANK.NS'];
      const watchlist = await yahooFinanceClient.getWatchlistData(tickers);
      res.status(200).json({ success: true, data: watchlist });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Endpoint: Parses natural language screener query into structured filters.
   */
  async parseScreener(req: Request, res: Response, next: NextFunction) {
    try {
      const { query } = req.body;
      if (!query || typeof query !== 'string') {
        throw new CustomError('Search query string is required', 400);
      }
      const geminiApiKey = (req.headers['x-gemini-api-key'] || req.headers['authorization']) as string | undefined;
      const filter = await screenerService.parseQueryToFilter(query, geminiApiKey);
      res.status(200).json({ success: true, data: filter });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Endpoint: Applies filters deterministically and ranks candidate stocks.
   */
  async runScreener(req: Request, res: Response, next: NextFunction) {
    try {
      let filter = req.body.filter || req.body;
      if (req.body.query && typeof req.body.query === 'string' && (!filter || Object.keys(filter).length <= 1)) {
        const geminiApiKey = (req.headers['x-gemini-api-key'] || req.headers['authorization']) as string | undefined;
        filter = await screenerService.parseQueryToFilter(req.body.query, geminiApiKey);
      }
      const results = await screenerService.runScreenerAsync(filter);
      res.status(200).json({ success: true, data: { ...results, parsedFilter: filter } });
    } catch (err) {
      next(err);
    }
  }
}

export const researchController = new ResearchController();
