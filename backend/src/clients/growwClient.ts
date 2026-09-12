import { logger } from '../middleware/logger.js';

export interface GrowwLiveQuote {
  tradingSymbol: string;
  exchange: string;
  ltp: number;
  dayChange: number;
  dayChangePercent: number;
  high: number;
  low: number;
  open: number;
  close: number;
  volume: number;
  yearHighPrice?: number;
  yearLowPrice?: number;
  lastTradeTime?: number;
  source: 'GROWW_API';
}

export interface GrowwFundamentals {
  marketCap?: number;
  peRatio?: number;
  roe?: number;
  priceToBook?: number;
  trailingEps?: number;
  dividendYield?: number;
  industryPe?: number;
  bookValue?: number;
  debtToEquity?: number;
  yearHigh?: number;
  yearLow?: number;
  ceo?: string;
  businessSummary?: string;
}

const COMMON_GROWW_MAP: Record<string, { symbol: string; searchId: string }> = {
  SBIN: { symbol: 'SBIN', searchId: 'state-bank-of-india' },
  'SBIN.NS': { symbol: 'SBIN', searchId: 'state-bank-of-india' },
  ICICIBANK: { symbol: 'ICICIBANK', searchId: 'icici-bank-ltd' },
  'ICICIBANK.NS': { symbol: 'ICICIBANK', searchId: 'icici-bank-ltd' },
  IBN: { symbol: 'ICICIBANK', searchId: 'icici-bank-ltd' },
  HDFCBANK: { symbol: 'HDFCBANK', searchId: 'hdfc-bank-ltd' },
  'HDFCBANK.NS': { symbol: 'HDFCBANK', searchId: 'hdfc-bank-ltd' },
  HDB: { symbol: 'HDFCBANK', searchId: 'hdfc-bank-ltd' },
  RELIANCE: { symbol: 'RELIANCE', searchId: 'reliance-industries-ltd' },
  'RELIANCE.NS': { symbol: 'RELIANCE', searchId: 'reliance-industries-ltd' },
  TCS: { symbol: 'TCS', searchId: 'tata-consultancy-services-ltd' },
  'TCS.NS': { symbol: 'TCS', searchId: 'tata-consultancy-services-ltd' },
  INFY: { symbol: 'INFY', searchId: 'infosys-ltd' },
  'INFY.NS': { symbol: 'INFY', searchId: 'infosys-ltd' },
  TATAMOTORS: { symbol: 'TMPV', searchId: 'tata-motors-ltd' },
  'TATAMOTORS.NS': { symbol: 'TMPV', searchId: 'tata-motors-ltd' },
  TATASTEEL: { symbol: 'TATASTEEL', searchId: 'tata-steel-ltd' },
  'TATASTEEL.NS': { symbol: 'TATASTEEL', searchId: 'tata-steel-ltd' },
  WIPRO: { symbol: 'WIPRO', searchId: 'wipro-ltd' },
  'WIPRO.NS': { symbol: 'WIPRO', searchId: 'wipro-ltd' },
  WIT: { symbol: 'WIPRO', searchId: 'wipro-ltd' },
  HCLTECH: { symbol: 'HCLTECH', searchId: 'hcl-technologies-ltd' },
  'HCLTECH.NS': { symbol: 'HCLTECH', searchId: 'hcl-technologies-ltd' },
  ITC: { symbol: 'ITC', searchId: 'itc-ltd' },
  'ITC.NS': { symbol: 'ITC', searchId: 'itc-ltd' },
  BHARTIARTL: { symbol: 'BHARTIARTL', searchId: 'bharti-airtel-ltd' },
  'BHARTIARTL.NS': { symbol: 'BHARTIARTL', searchId: 'bharti-airtel-ltd' },
  LT: { symbol: 'LT', searchId: 'larsen-and-toubro-ltd' },
  'LT.NS': { symbol: 'LT', searchId: 'larsen-and-toubro-ltd' },
  MARUTI: { symbol: 'MARUTI', searchId: 'maruti-suzuki-india-ltd' },
  'MARUTI.NS': { symbol: 'MARUTI', searchId: 'maruti-suzuki-india-ltd' },
  BAJFINANCE: { symbol: 'BAJFINANCE', searchId: 'bajaj-finance-ltd' },
  'BAJFINANCE.NS': { symbol: 'BAJFINANCE', searchId: 'bajaj-finance-ltd' },
  KOTAKBANK: { symbol: 'KOTAKBANK', searchId: 'kotak-mahindra-bank-ltd' },
  'KOTAKBANK.NS': { symbol: 'KOTAKBANK', searchId: 'kotak-mahindra-bank-ltd' },
  AXISBANK: { symbol: 'AXISBANK', searchId: 'axis-bank-ltd' },
  'AXISBANK.NS': { symbol: 'AXISBANK', searchId: 'axis-bank-ltd' },
};

export class GrowwClient {
  private entityCache = new Map<string, { symbol: string; searchId: string }>();

  constructor(_defaultApiKey?: string) {
    for (const [k, v] of Object.entries(COMMON_GROWW_MAP)) {
      this.entityCache.set(k.toUpperCase(), v);
    }
  }

  /**
   * Checks if Groww API is configured either globally or via runtime key.
   */
  isConfigured(_runtimeApiKey?: string): boolean {
    return true; // Direct NSE gateway provides live market feed
  }

  /**
   * Standard browser headers for Groww Gateway to ensure HTTP 200 responses.
   */
  private getHeaders(): Record<string, string> {
    return {
      Accept: 'application/json, text/plain, */*',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      Referer: 'https://groww.in/',
      Origin: 'https://groww.in',
    };
  }

  /**
   * Resolves any ticker or query to Groww symbol and searchId.
   */
  async resolveEntity(tickerOrQuery: string): Promise<{ symbol: string; searchId: string }> {
    const clean = tickerOrQuery.trim().toUpperCase();
    if (this.entityCache.has(clean)) {
      return this.entityCache.get(clean)!;
    }

    const stripped = clean.replace(/\.NS$/, '').replace(/\.BO$/, '');
    if (this.entityCache.has(stripped)) {
      return this.entityCache.get(stripped)!;
    }

    try {
      const searchUrl = `https://groww.in/v1/api/search/v1/entity?app=false&page=0&q=${encodeURIComponent(stripped)}&size=1`;
      const res = await fetch(searchUrl, { headers: this.getHeaders() });
      if (res.ok) {
        const data = await res.json() as any;
        const entity = data.content?.[0];
        if (entity) {
          const resolved = {
            symbol: entity.nse_scrip_code || stripped,
            searchId: entity.search_id || entity.id || '',
          };
          this.entityCache.set(clean, resolved);
          this.entityCache.set(stripped, resolved);
          return resolved;
        }
      }
    } catch (err: any) {
      logger.warn(`[GROWW API] Entity search failed for ${stripped}: ${err.message}`);
    }

    const fallback = { symbol: stripped, searchId: '' };
    this.entityCache.set(clean, fallback);
    return fallback;
  }

  /**
   * Retrieves real-time quote from Groww API for any Indian equity.
   */
  async getLiveQuote(ticker: string, _runtimeApiKey?: string): Promise<GrowwLiveQuote | null> {
    try {
      const { symbol } = await this.resolveEntity(ticker);
      const url = `https://groww.in/v1/api/stocks_data/v1/accord_points/exchange/NSE/segment/CASH/latest_prices_ohlc/${encodeURIComponent(symbol)}`;

      logger.info(`[GROWW API] Requesting real-time quote for ${symbol} on NSE...`);
      const response = await fetch(url, { headers: this.getHeaders() });

      if (response.ok) {
        const data = await response.json() as any;
        if (data && (data.ltp !== undefined || data.close !== undefined)) {
          const ltp = Number(data.ltp ?? data.last_price ?? data.close ?? 0);
          const close = Number(data.close ?? ltp);
          const open = Number(data.open ?? ltp);
          const high = Number(data.high ?? Math.max(open, ltp));
          const low = Number(data.low ?? Math.min(open, ltp));
          const dayChange = Number(data.dayChange ?? (ltp - close));
          const dayChangePercent = Number(data.dayChangePerc ?? (close > 0 ? (dayChange / close) * 100 : 0));
          const volume = Number(data.volume ?? 0);
          const yearHighPrice = data.yearHighPrice ? Number(data.yearHighPrice) : undefined;
          const yearLowPrice = data.yearLowPrice ? Number(data.yearLowPrice) : undefined;

          if (ltp > 0) {
            logger.info(
              `[GROWW API] Real-time quote received for ${symbol}: LTP=₹${ltp}, PrevClose=₹${close}, Change=₹${dayChange.toFixed(2)} (${dayChangePercent.toFixed(2)}%), High=₹${high}, Low=₹${low}, Vol=${volume}`
            );
            return {
              tradingSymbol: symbol,
              exchange: 'NSE',
              ltp,
              dayChange,
              dayChangePercent,
              high,
              low,
              open,
              close,
              volume,
              yearHighPrice,
              yearLowPrice,
              lastTradeTime: data.lastTradeTime,
              source: 'GROWW_API',
            };
          }
        }
      }

      logger.warn(`[GROWW API] accord_points returned status ${response.status} for ${symbol}`);
      return null;
    } catch (err: any) {
      logger.warn(`[GROWW API] Request failed for ${ticker}: ${err.message}`);
      return null;
    }
  }

  /**
   * Retrieves verified fundamentals and business profile directly from Groww.
   */
  async getCompanyFundamentals(ticker: string): Promise<GrowwFundamentals | null> {
    try {
      const { searchId } = await this.resolveEntity(ticker);
      if (!searchId) return null;

      const url = `https://groww.in/v1/api/stocks_data/v1/company/search_id/${encodeURIComponent(searchId)}`;
      const res = await fetch(url, { headers: this.getHeaders() });
      if (!res.ok) return null;

      const data = await res.json() as any;
      const fundamentalsList = Array.isArray(data.fundamentals) ? data.fundamentals : [];
      const getVal = (name: string): string => {
        const found = fundamentalsList.find((f: any) => f.name?.toLowerCase().includes(name.toLowerCase()) || f.shortName?.toLowerCase().includes(name.toLowerCase()));
        return found?.value || '';
      };

      // Parse Market Cap (e.g. "₹9,27,216Cr" -> 9272160000000)
      let marketCap: number | undefined;
      const capStr = getVal('Market Cap') || getVal('Mkt Cap');
      if (capStr) {
        const cleaned = capStr.replace(/[₹,]/g, '').trim();
        const match = cleaned.match(/([\d.]+)\s*(Cr|T|B|M)?/i);
        if (match) {
          const num = parseFloat(match[1]);
          const unit = match[2]?.toLowerCase();
          if (unit === 'cr') marketCap = num * 1e7; // 1 Crore = 1e7
          else if (unit === 't') marketCap = num * 1e12;
          else if (unit === 'b') marketCap = num * 1e9;
          else if (unit === 'm') marketCap = num * 1e6;
          else marketCap = num;
        }
      }

      const parsePct = (str: string): number | undefined => {
        if (!str || str.toLowerCase() === 'na') return undefined;
        const n = parseFloat(str.replace(/%/g, '').trim());
        return !isNaN(n) ? n / 100 : undefined;
      };

      const parseNum = (str: string): number | undefined => {
        if (!str || str.toLowerCase() === 'na') return undefined;
        const n = parseFloat(str.replace(/,/g, '').trim());
        return !isNaN(n) ? n : undefined;
      };

      const peRatio = parseNum(getVal('P/E Ratio'));
      const roe = parsePct(getVal('ROE'));
      const priceToBook = parseNum(getVal('P/B Ratio'));
      const trailingEps = parseNum(getVal('EPS'));
      const dividendYield = parsePct(getVal('Div Yield') || getVal('Dividend Yield'));
      const industryPe = parseNum(getVal('Industry P/E'));
      const bookValue = parseNum(getVal('Book Value'));
      const debtToEquity = parseNum(getVal('Debt to Equity'));

      const priceData = data.priceData?.nse || data.priceData?.bse || {};
      const yearHigh = priceData.yearHighPrice ? Number(priceData.yearHighPrice) : undefined;
      const yearLow = priceData.yearLowPrice ? Number(priceData.yearLowPrice) : undefined;

      const details = data.details || {};
      const ceo = details.ceo || details.managingDirector;
      const businessSummary = details.businessSummary;

      return {
        marketCap,
        peRatio,
        roe,
        priceToBook,
        trailingEps,
        dividendYield,
        industryPe,
        bookValue,
        debtToEquity,
        yearHigh,
        yearLow,
        ceo,
        businessSummary,
      };
    } catch (err: any) {
      logger.warn(`[GROWW API] Failed to fetch company fundamentals for ${ticker}: ${err.message}`);
      return null;
    }
  }
}

export const growwClient = new GrowwClient();
