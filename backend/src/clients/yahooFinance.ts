import YahooFinance from 'yahoo-finance2';
import { logger } from '../middleware/logger.js';
import { CustomError } from '../middleware/errorHandler.js';
import { growwClient } from './growwClient.js';

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey', 'ripHistorical'] });

export interface CompanyOverview {
  symbol: string;
  name: string;
  exchange: string;
  price: number;
  marketCap: number;
  sector: string;
  industry: string;
  summary: string;
  website: string;
  currency?: string;
  currencySymbol?: string;
  source?: string;
  dayChange?: number;
  dayChangePercent?: number;
  dayHigh?: number;
  dayLow?: number;
  open?: number;
  prevClose?: number;
  volume?: number;
  lastTradeTime?: number | string;
}

export interface FinancialMetrics {
  peRatio?: number;
  forwardPe?: number;
  priceToBook?: number;
  pegRatio?: number;
  currentRatio?: number;
  quickRatio?: number;
  debtToEquity?: number;
  returnOnEquity?: number;
  returnOnAssets?: number;
  revenueGrowth?: number;
  earningsGrowth?: number;
  trailingEps?: number;
  forwardEps?: number;
  profitMargin?: number;
  ebitda?: number;
  freeCashFlow?: number;
  operatingCashFlow?: number;
  totalCash?: number;
  totalDebt?: number;
}

export interface HistoricalBar {
  date: string;
  close: number;
  open?: number;
  high?: number;
  low?: number;
  volume: number;
}

export const ADR_REDIRECT_MAP: Record<string, { symbol: string; name: string }> = {
  IBN: { symbol: 'ICICIBANK.NS', name: 'ICICI Bank Limited' },
  HDB: { symbol: 'HDFCBANK.NS', name: 'HDFC Bank Limited' },
  INFY: { symbol: 'INFY.NS', name: 'Infosys Limited' },
  WIT: { symbol: 'WIPRO.NS', name: 'Wipro Limited' },
  TTM: { symbol: 'TATAMOTORS.NS', name: 'Tata Motors Limited' },
};

const POPULAR_TICKER_MAP: Record<string, { symbol: string; name: string }> = {
  // Direct ADR redirects to Indian NSE listings (guarantees INR)
  ibn: { symbol: 'ICICIBANK.NS', name: 'ICICI Bank Limited' },
  hdb: { symbol: 'HDFCBANK.NS', name: 'HDFC Bank Limited' },
  wit: { symbol: 'WIPRO.NS', name: 'Wipro Limited' },
  ttm: { symbol: 'TATAMOTORS.NS', name: 'Tata Motors Limited' },
  
  // Indian Equities
  sbi: { symbol: 'SBIN.NS', name: 'State Bank of India' },
  sbin: { symbol: 'SBIN.NS', name: 'State Bank of India' },
  'state bank of india': { symbol: 'SBIN.NS', name: 'State Bank of India' },
  'tata motors': { symbol: 'TATAMOTORS.NS', name: 'Tata Motors Limited' },
  tatamotors: { symbol: 'TATAMOTORS.NS', name: 'Tata Motors Limited' },
  'tata steel': { symbol: 'TATASTEEL.NS', name: 'Tata Steel Limited' },
  tatasteel: { symbol: 'TATASTEEL.NS', name: 'Tata Steel Limited' },
  tcs: { symbol: 'TCS.NS', name: 'Tata Consultancy Services' },
  reliance: { symbol: 'RELIANCE.NS', name: 'Reliance Industries Limited' },
  ril: { symbol: 'RELIANCE.NS', name: 'Reliance Industries Limited' },
  hdfc: { symbol: 'HDFCBANK.NS', name: 'HDFC Bank Limited' },
  'hdfc bank': { symbol: 'HDFCBANK.NS', name: 'HDFC Bank Limited' },
  icici: { symbol: 'ICICIBANK.NS', name: 'ICICI Bank Limited' },
  'icici bank': { symbol: 'ICICIBANK.NS', name: 'ICICI Bank Limited' },
  itc: { symbol: 'ITC.NS', name: 'ITC Limited' },
  infy: { symbol: 'INFY.NS', name: 'Infosys Limited' },
  infosys: { symbol: 'INFY.NS', name: 'Infosys Limited' },
  wipro: { symbol: 'WIPRO.NS', name: 'Wipro Limited' },
  airtel: { symbol: 'BHARTIARTL.NS', name: 'Bharti Airtel Limited' },
  'bharti airtel': { symbol: 'BHARTIARTL.NS', name: 'Bharti Airtel Limited' },
  'l&t': { symbol: 'LT.NS', name: 'Larsen & Toubro Limited' },
  larsen: { symbol: 'LT.NS', name: 'Larsen & Toubro Limited' },
  maruti: { symbol: 'MARUTI.NS', name: 'Maruti Suzuki India Limited' },
  'maruti suzuki': { symbol: 'MARUTI.NS', name: 'Maruti Suzuki India Limited' },
  'bajaj finance': { symbol: 'BAJFINANCE.NS', name: 'Bajaj Finance Limited' },
  zomato: { symbol: 'ZOMATO.NS', name: 'Zomato Limited' },
  kotak: { symbol: 'KOTAKBANK.NS', name: 'Kotak Mahindra Bank Limited' },
  'kotak bank': { symbol: 'KOTAKBANK.NS', name: 'Kotak Mahindra Bank Limited' },
  axis: { symbol: 'AXISBANK.NS', name: 'Axis Bank Limited' },
  'axis bank': { symbol: 'AXISBANK.NS', name: 'Axis Bank Limited' },
};

export class YahooFinanceClient {
  /**
   * Disambiguates a company name to its primary stock ticker.
   * Returns the ticker symbol (e.g. "AAPL" or "SBIN.NS").
   */
  async resolveTicker(query: string): Promise<{ symbol: string; name: string }> {
    try {
      const cleanQuery = query.trim().toLowerCase();
      const upperQuery = query.trim().toUpperCase();
      logger.info(`Resolving stock ticker for query: "${query}"`);

      // 1. Direct ADR redirect to Indian NSE listing in INR (e.g. IBN -> ICICIBANK.NS)
      if (ADR_REDIRECT_MAP[upperQuery]) {
        const adrResolved = ADR_REDIRECT_MAP[upperQuery];
        logger.info(`Redirected US ADR "${query}" to primary NSE listing: ${adrResolved.symbol} (${adrResolved.name})`);
        return adrResolved;
      }

      // 2. Direct match from curated high-frequency alias map (e.g. SBI -> SBIN.NS)
      if (POPULAR_TICKER_MAP[cleanQuery]) {
        const resolved = POPULAR_TICKER_MAP[cleanQuery];
        logger.info(`Resolved "${query}" via alias map to: ${resolved.symbol} (${resolved.name})`);
        return resolved;
      }

      // 3. Query Yahoo Finance Search API
      const searchResults = await yahooFinance.search(query, { newsCount: 0 }) as any;
      const quotes = (searchResults.quotes || []).filter((q: any) => q.symbol && q.quoteType === 'EQUITY');

      if (quotes.length === 0) {
        // Fallback to any quote type if no equities found
        const anyQuote = (searchResults.quotes || [])[0];
        if (!anyQuote || !anyQuote.symbol) {
          throw new CustomError(`Could not find any ticker symbol for "${query}"`, 404);
        }
        const symUpper = anyQuote.symbol.toUpperCase();
        if (ADR_REDIRECT_MAP[symUpper]) {
          return ADR_REDIRECT_MAP[symUpper];
        }
        return {
          symbol: anyQuote.symbol,
          name: anyQuote.shortname || anyQuote.longname || anyQuote.symbol,
        };
      }

      // Prioritize:
      // A. Indian NSE (.NS) and BSE (.BO) listings
      // B. Exact symbol match (case-insensitive)
      // C. Long/short name starting with or containing query words
      const nsMatch = quotes.find((q: any) => q.symbol.toUpperCase().endsWith('.NS'));
      const boMatch = quotes.find((q: any) => q.symbol.toUpperCase().endsWith('.BO'));
      const exactMatch = quotes.find((q: any) => q.symbol.toLowerCase() === cleanQuery);
      const nameMatch = quotes.find((q: any) => {
        const name = (q.shortname || q.longname || '').toLowerCase();
        return name.includes(cleanQuery);
      });

      const bestQuote = nsMatch || boMatch || exactMatch || nameMatch || quotes[0];
      const bestSymbol = bestQuote.symbol.toUpperCase();

      if (ADR_REDIRECT_MAP[bestSymbol]) {
        return ADR_REDIRECT_MAP[bestSymbol];
      }

      logger.info(`Resolved "${query}" to ticker: ${bestQuote.symbol} (${bestQuote.shortname || bestQuote.longname || bestQuote.symbol})`);
      return {
        symbol: bestQuote.symbol,
        name: bestQuote.shortname || bestQuote.longname || bestQuote.symbol,
      };
    } catch (error: any) {
      if (error instanceof CustomError) throw error;
      logger.error(`Error resolving ticker for "${query}": ${error.message}`);
      throw new CustomError(`Failed to resolve ticker symbol: ${error.message}`, 500);
    }
  }

  /**
   * Retrieves profile data, current market price, and sector details.
   * Enforces INR currency and converts foreign currencies if needed.
   */
  async getCompanyOverview(ticker: string): Promise<CompanyOverview> {
    try {
      const effectiveTicker = ADR_REDIRECT_MAP[ticker.toUpperCase()]?.symbol || ticker;
      logger.info(`Fetching company overview for ticker: ${effectiveTicker} (query: ${ticker})`);
      const summary = await yahooFinance.quoteSummary(effectiveTicker, {
        modules: ['summaryProfile', 'price'],
      }) as any;

      const profile = summary.summaryProfile || {};
      const priceData = summary.price || {};

      if (!priceData.symbol) {
        throw new CustomError(`Ticker "${effectiveTicker}" not found on Yahoo Finance`, 404);
      }

      const sym = (priceData.symbol || effectiveTicker).toUpperCase();
      const exch = (priceData.exchangeName || '').toUpperCase();
      const isIndian = 
        sym.endsWith('.NS') || 
        sym.endsWith('.BO') || 
        ['NSE', 'BSE', 'NSI'].some(e => exch.includes(e)) ||
        priceData.currency === 'INR';

      // Always enforce INR and ₹
      const currency = 'INR';
      const currencySymbol = '₹';

      // If price is in USD or foreign currency, convert to INR at standard rate
      const isUsd = priceData.currency === 'USD';
      const fxRate = isUsd ? 87.5 : 1;

      return {
        symbol: priceData.symbol,
        name: priceData.longName || priceData.shortName || priceData.symbol,
        exchange: priceData.exchangeName || (isIndian ? 'NSE' : 'EQUITY'),
        price: (priceData.regularMarketPrice || 0) * fxRate,
        marketCap: (priceData.marketCap || 0) * fxRate,
        sector: profile.sector || 'Unknown Sector',
        industry: profile.industry || 'Unknown Industry',
        summary: profile.longBusinessSummary || 'No summary available.',
        website: profile.website || 'No website available.',
        currency,
        currencySymbol,
        dayChange: (priceData.regularMarketChange ?? 0) * fxRate,
        dayChangePercent: priceData.regularMarketChangePercent ?? 0,
        dayHigh: (priceData.regularMarketDayHigh ?? priceData.regularMarketPrice ?? 0) * fxRate,
        dayLow: (priceData.regularMarketDayLow ?? priceData.regularMarketPrice ?? 0) * fxRate,
        open: (priceData.regularMarketOpen ?? priceData.regularMarketPrice ?? 0) * fxRate,
        prevClose: (priceData.regularMarketPreviousClose ?? priceData.regularMarketPrice ?? 0) * fxRate,
        volume: priceData.regularMarketVolume ?? 0,
      };
    } catch (error: any) {
      if (error instanceof CustomError) throw error;
      logger.error(`Error fetching company overview for ${ticker}: ${error.message}`);
      throw new CustomError(`Failed to fetch company profile for "${ticker}": ${error.message}`, 500);
    }
  }

  /**
   * Retrieves detailed financial metrics and balance sheet metrics.
   */
  /**
   * Retrieves detailed financial metrics and balance sheet metrics.
   */
  async getFinancialMetrics(ticker: string): Promise<FinancialMetrics> {
    try {
      const effectiveTicker = ADR_REDIRECT_MAP[ticker.toUpperCase()]?.symbol || ticker;
      logger.info(`Fetching financial metrics for ticker: ${effectiveTicker}`);
      const summary = await yahooFinance.quoteSummary(effectiveTicker, {
        modules: ['defaultKeyStatistics', 'financialData', 'summaryDetail'],
      }) as any;

      const stats = summary.defaultKeyStatistics || {};
      const finData = summary.financialData || {};
      const detail = summary.summaryDetail || {};

      // If in USD, convert balance sheet figures to INR
      const isUsd = summary.price?.currency === 'USD';
      const fxRate = isUsd ? 87.5 : 1;

      return {
        peRatio: detail.trailingPE || stats.trailingPE || undefined,
        forwardPe: detail.forwardPE || stats.forwardPE || undefined,
        priceToBook: stats.priceToBook || undefined,
        pegRatio: stats.pegRatio || undefined,
        currentRatio: finData.currentRatio || undefined,
        quickRatio: finData.quickRatio || undefined,
        debtToEquity: finData.debtToEquity || undefined,
        returnOnEquity: finData.returnOnEquity || undefined,
        returnOnAssets: finData.returnOnAssets || undefined,
        revenueGrowth: finData.revenueGrowth || undefined,
        earningsGrowth: finData.earningsGrowth || undefined,
        trailingEps: stats.trailingEps ? stats.trailingEps * fxRate : undefined,
        forwardEps: stats.forwardEps ? stats.forwardEps * fxRate : undefined,
        profitMargin: finData.profitMargins || undefined,
        ebitda: finData.ebitda ? finData.ebitda * fxRate : undefined,
        freeCashFlow: finData.freeCashflow ? finData.freeCashflow * fxRate : undefined,
        operatingCashFlow: finData.operatingCashflow ? finData.operatingCashflow * fxRate : undefined,
        totalCash: finData.totalCash ? finData.totalCash * fxRate : undefined,
        totalDebt: finData.totalDebt ? finData.totalDebt * fxRate : undefined,
      };
    } catch (error: any) {
      logger.error(`Error fetching financial metrics for ${ticker}: ${error.message}`);
      // Return empty financial metrics rather than crashing so agent can continue
      return {};
    }
  }

  /**
   * Retrieves historical pricing data for the past 5 years for flexible timeline display (1W, 1M, 3M, 6M, 1Y, 3Y, 5Y, All).
   * All prices are guaranteed in INR (₹).
   */
  async getHistoricalData(ticker: string): Promise<HistoricalBar[]> {
    try {
      const effectiveTicker = ADR_REDIRECT_MAP[ticker.toUpperCase()]?.symbol || ticker;
      logger.info(`Fetching historical chart data for ticker: ${effectiveTicker}`);
      const fiveYearsAgo = new Date();
      fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);

      const chartResult = await yahooFinance.chart(effectiveTicker, {
        period1: fiveYearsAgo.toISOString().split('T')[0],
        interval: '1d',
      }) as any;

      const quotes = chartResult?.quotes || [];
      const meta = chartResult?.meta || {};
      const isUsd = meta.currency === 'USD';
      const fxRate = isUsd ? 87.5 : 1;
      const livePrice = Number(meta.regularMarketPrice) * fxRate;

      // Filter out invalid items and map to interface
      // If the latest bar has close === null (market session still active or settling), use live price
      return quotes
        .filter((bar: any, idx: number) => {
          if (!bar.date) return false;
          if (bar.close !== undefined && bar.close !== null) return true;
          return idx === quotes.length - 1 && !isNaN(livePrice) && livePrice > 0;
        })
        .map((bar: any) => {
          const rawClose = (bar.close !== undefined && bar.close !== null) ? Number(bar.close) : (livePrice / fxRate);
          const closePrice = rawClose * fxRate;
          return {
            date: new Date(bar.date).toISOString().split('T')[0],
            close: closePrice,
            open: (bar.open !== undefined && bar.open !== null ? Number(bar.open) : rawClose) * fxRate,
            high: (bar.high !== undefined && bar.high !== null ? Number(bar.high) : rawClose) * fxRate,
            low: (bar.low !== undefined && bar.low !== null ? Number(bar.low) : rawClose) * fxRate,
            volume: bar.volume || 0,
          };
        });
    } catch (error: any) {
      logger.error(`Error fetching historical price history for ${ticker}: ${error.message}`);
      return [];
    }
  }

  /**
   * Retrieves 5-minute intraday bars for 1D timeline display in INR (₹).
   */
  async getIntradayData(ticker: string): Promise<HistoricalBar[]> {
    try {
      const effectiveTicker = ADR_REDIRECT_MAP[ticker.toUpperCase()]?.symbol || ticker;
      logger.info(`Fetching intraday 5m chart data for ticker: ${effectiveTicker}`);
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      const chartResult = await yahooFinance.chart(effectiveTicker, {
        period1: threeDaysAgo.toISOString().split('T')[0],
        interval: '5m',
      }) as any;

      const quotes = chartResult?.quotes || [];
      const meta = chartResult?.meta || {};
      const isUsd = meta.currency === 'USD';
      const fxRate = isUsd ? 87.5 : 1;
      const livePrice = Number(meta.regularMarketPrice) * fxRate;

      return quotes
        .filter((bar: any) => bar.date && (bar.close !== undefined && bar.close !== null || !isNaN(livePrice)))
        .map((bar: any) => {
          const rawClose = (bar.close !== undefined && bar.close !== null) ? Number(bar.close) : (livePrice / fxRate);
          const closePrice = rawClose * fxRate;
          return {
            date: new Date(bar.date).toISOString(),
            close: closePrice,
            open: (bar.open !== undefined && bar.open !== null ? Number(bar.open) : rawClose) * fxRate,
            high: (bar.high !== undefined && bar.high !== null ? Number(bar.high) : rawClose) * fxRate,
            low: (bar.low !== undefined && bar.low !== null ? Number(bar.low) : rawClose) * fxRate,
            volume: bar.volume || 0,
          };
        });
    } catch (error: any) {
      logger.error(`Error fetching intraday data for ${ticker}: ${error.message}`);
      return [];
    }
  }

  /**
   * Retrieves quotes for multiple tickers in parallel.
   */
  async getWatchlistData(tickers: string[]): Promise<any[]> {
    try {
      logger.info(`Fetching watchlist data for: ${tickers.join(', ')}`);
      const quotes = await Promise.all(
        tickers.map(async (ticker) => {
          try {
            // Priority: Real-time live broker quote from Groww on NSE
            const growwQuote = await growwClient.getLiveQuote(ticker);
            if (growwQuote && growwQuote.ltp > 0) {
              return {
                symbol: ticker,
                name: ticker.replace(/\.NS$/, '').replace(/\.BO$/, ''),
                price: growwQuote.ltp,
                changePercent: growwQuote.dayChangePercent,
                currency: 'INR',
                currencySymbol: '₹',
                exchange: 'NSE',
                source: 'GROWW_API',
              };
            }

            const quote = await yahooFinance.quote(ticker) as any;
            const isUsd = quote.currency === 'USD';
            const fxRate = isUsd ? 87.5 : 1;
            return {
              symbol: ticker,
              name: quote.longName || quote.shortName || ticker,
              price: (quote.regularMarketPrice || 0) * fxRate,
              changePercent: quote.regularMarketChangePercent || 0,
              currency: 'INR',
              currencySymbol: '₹',
              exchange: quote.exchange || (ticker.endsWith('.NS') ? 'NSE' : 'EQUITY'),
            };
          } catch (err: any) {
            logger.error(`Error fetching quote for watchlist item ${ticker}: ${err.message}`);
            return { symbol: ticker, name: ticker, price: 0, changePercent: 0, currency: 'INR', currencySymbol: '₹', exchange: 'NSE' };
          }
        })
      );
      return quotes;
    } catch (error: any) {
      logger.error(`Error in getWatchlistData: ${error.message}`);
      return [];
    }
  }
}

export const yahooFinanceClient = new YahooFinanceClient();
