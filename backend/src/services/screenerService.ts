import YahooFinance from 'yahoo-finance2';
import { llmClient } from '../clients/llm.js';
import { logger } from '../middleware/logger.js';

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey', 'ripHistorical'] });

export interface ScreenerFilter {
  sector?: string;
  country?: string;
  peMin?: number;
  peMax?: number;
  roeMin?: number;          // as percentage (e.g. 15 for 15%)
  revenueGrowthMin?: number; // as percentage (e.g. 10 for 10%)
  debtLevel?: 'low' | 'moderate' | 'high';
  marketCapMin?: number;
  unsupportedFilters?: string[];
}

export interface ScreenerStockCandidate {
  ticker: string;
  name: string;
  exchange: string;
  country: string;
  sector: string;
  industry: string;
  price: number;
  marketCap: number;
  peRatio: number | null;
  roe: number | null;            // as decimal (e.g. 0.28 for 28%)
  revenueGrowth: number | null;  // as decimal (e.g. 0.12 for 12%)
  debtToEquity: number | null;   // percentage
  profitMargin: number | null;
}

export interface ScreenerRunResult {
  parsedFilter: ScreenerFilter;
  matches: ScreenerStockCandidate[];
  totalEvaluated: number;
  unsupportedCriteriaMessage?: string;
  rankingBasis: string;
}

// Representative stock universe containing US and Indian companies
export const SCREENER_UNIVERSE: ScreenerStockCandidate[] = [
  // Indian IT Companies
  {
    ticker: 'INFY.NS',
    name: 'Infosys Limited',
    exchange: 'NSE',
    country: 'India',
    sector: 'IT',
    industry: 'Information Technology Services',
    price: 1845.0,
    marketCap: 7_680_000_000_000,
    peRatio: 24.2,
    roe: 0.31, // 31%
    revenueGrowth: 0.135, // 13.5%
    debtToEquity: 12, // 12% (Low debt)
    profitMargin: 0.178,
  },
  {
    ticker: 'TCS.NS',
    name: 'Tata Consultancy Services',
    exchange: 'NSE',
    country: 'India',
    sector: 'IT',
    industry: 'Information Technology Services',
    price: 3950.0,
    marketCap: 14_400_000_000_000,
    peRatio: 28.5,
    roe: 0.48, // 48%
    revenueGrowth: 0.11, // 11%
    debtToEquity: 8, // 8% (Low debt)
    profitMargin: 0.192,
  },
  {
    ticker: 'WIPRO.NS',
    name: 'Wipro Limited',
    exchange: 'NSE',
    country: 'India',
    sector: 'IT',
    industry: 'Information Technology Services',
    price: 545.0,
    marketCap: 2_850_000_000_000,
    peRatio: 22.1,
    roe: 0.16, // 16%
    revenueGrowth: 0.065, // 6.5%
    debtToEquity: 24, // 24% (Low debt)
    profitMargin: 0.145,
  },
  {
    ticker: 'HCLTECH.NS',
    name: 'HCL Technologies',
    exchange: 'NSE',
    country: 'India',
    sector: 'IT',
    industry: 'Information Technology Services',
    price: 1740.0,
    marketCap: 4_720_000_000_000,
    peRatio: 26.4,
    roe: 0.24, // 24%
    revenueGrowth: 0.12, // 12%
    debtToEquity: 15, // 15% (Low debt)
    profitMargin: 0.165,
  },

  // Indian Financials & Leaders
  {
    ticker: 'HDFCBANK.NS',
    name: 'HDFC Bank Limited',
    exchange: 'NSE',
    country: 'India',
    sector: 'Financials',
    industry: 'Banking',
    price: 1640.0,
    marketCap: 12_480_000_000_000,
    peRatio: 19.2,
    roe: 0.17, // 17%
    revenueGrowth: 0.18, // 18%
    debtToEquity: 180,
    profitMargin: 0.24,
  },
  {
    ticker: 'ICICIBANK.NS',
    name: 'ICICI Bank Limited',
    exchange: 'NSE',
    country: 'India',
    sector: 'Financials',
    industry: 'Banking',
    price: 1245.0,
    marketCap: 8_750_000_000_000,
    peRatio: 17.5,
    roe: 0.185, // 18.5%
    revenueGrowth: 0.22, // 22%
    debtToEquity: 160,
    profitMargin: 0.26,
  },
  {
    ticker: 'SBIN.NS',
    name: 'State Bank of India',
    exchange: 'NSE',
    country: 'India',
    sector: 'Financials',
    industry: 'Banking',
    price: 785.0,
    marketCap: 7_000_000_000_000,
    peRatio: 10.5,
    roe: 0.165,
    revenueGrowth: 0.14,
    debtToEquity: 170,
    profitMargin: 0.18,
  },
  {
    ticker: 'RELIANCE.NS',
    name: 'Reliance Industries Limited',
    exchange: 'NSE',
    country: 'India',
    sector: 'Energy',
    industry: 'Oil, Gas & Telecom',
    price: 2980.0,
    marketCap: 20_150_000_000_000,
    peRatio: 26.5,
    roe: 0.10,
    revenueGrowth: 0.11,
    debtToEquity: 45,
    profitMargin: 0.08,
  },
  {
    ticker: 'TATAMOTORS.NS',
    name: 'Tata Motors Limited',
    exchange: 'NSE',
    country: 'India',
    sector: 'Consumer Cyclical',
    industry: 'Automotive',
    price: 980.0,
    marketCap: 3_600_000_000_000,
    peRatio: 11.2,
    roe: 0.32,
    revenueGrowth: 0.26,
    debtToEquity: 120,
    profitMargin: 0.072,
  },

  // US Tech Giants (Converted to INR at 87.5 FX)
  {
    ticker: 'AAPL',
    name: 'Apple Inc.',
    exchange: 'NASDAQ',
    country: 'USA',
    sector: 'IT',
    industry: 'Consumer Electronics & Software',
    price: 20562.5,
    marketCap: 310_625_000_000_000,
    peRatio: 34.5,
    roe: 1.45,
    revenueGrowth: 0.08,
    debtToEquity: 140,
    profitMargin: 0.24,
  },
  {
    ticker: 'MSFT',
    name: 'Microsoft Corp.',
    exchange: 'NASDAQ',
    country: 'USA',
    sector: 'IT',
    industry: 'Software & Cloud',
    price: 38500.0,
    marketCap: 284_375_000_000_000,
    peRatio: 35.8,
    roe: 0.38,
    revenueGrowth: 0.16,
    debtToEquity: 45,
    profitMargin: 0.36,
  },
  {
    ticker: 'NVDA',
    name: 'NVIDIA Corp.',
    exchange: 'NASDAQ',
    country: 'USA',
    sector: 'IT',
    industry: 'Semiconductors',
    price: 10937.5,
    marketCap: 271_250_000_000_000,
    peRatio: 48.2,
    roe: 1.15,
    revenueGrowth: 1.22,
    debtToEquity: 25,
    profitMargin: 0.55,
  },
  {
    ticker: 'GOOGL',
    name: 'Alphabet Inc.',
    exchange: 'NASDAQ',
    country: 'USA',
    sector: 'Communication Services',
    industry: 'Internet & Search',
    price: 15750.0,
    marketCap: 192_500_000_000_000,
    peRatio: 24.5,
    roe: 0.32,
    revenueGrowth: 0.14,
    debtToEquity: 10,
    profitMargin: 0.27,
  },
  {
    ticker: 'META',
    name: 'Meta Platforms Inc.',
    exchange: 'NASDAQ',
    country: 'USA',
    sector: 'Communication Services',
    industry: 'Social Media & AI',
    price: 45500.0,
    marketCap: 115_500_000_000_000,
    peRatio: 26.8,
    roe: 0.35,
    revenueGrowth: 0.22,
    debtToEquity: 28,
    profitMargin: 0.34,
  },

  // Healthcare (Converted to INR)
  {
    ticker: 'JNJ',
    name: 'Johnson & Johnson',
    exchange: 'NYSE',
    country: 'USA',
    sector: 'Healthcare',
    industry: 'Pharmaceuticals',
    price: 14437.5,
    marketCap: 34_562_500_000_000,
    peRatio: 16.5,
    roe: 0.22,
    revenueGrowth: 0.045,
    debtToEquity: 45,
    profitMargin: 0.18,
  },
  {
    ticker: 'PFE',
    name: 'Pfizer Inc.',
    exchange: 'NYSE',
    country: 'USA',
    sector: 'Healthcare',
    industry: 'Biopharmaceuticals',
    price: 2493.75,
    marketCap: 14_175_000_000_000,
    peRatio: 14.8,
    roe: 0.11,
    revenueGrowth: -0.05,
    debtToEquity: 75,
    profitMargin: 0.12,
  },
];

/**
 * Deterministic Filter Matcher.
 */
export function matchesFilter(candidate: ScreenerStockCandidate, filter: ScreenerFilter): boolean {
  // Sector filter (case-insensitive substring or match)
  if (filter.sector) {
    const targetSector = filter.sector.toLowerCase();
    const candSector = candidate.sector.toLowerCase();
    const candInd = candidate.industry.toLowerCase();
    if (targetSector === 'it' || targetSector === 'tech' || targetSector === 'technology') {
      if (!candSector.includes('it') && !candSector.includes('tech') && !candInd.includes('technology')) {
        return false;
      }
    } else if (!candSector.includes(targetSector) && !candInd.includes(targetSector)) {
      return false;
    }
  }

  // Country filter
  if (filter.country) {
    const targetCountry = filter.country.toLowerCase();
    const candCountry = candidate.country.toLowerCase();
    if (!candCountry.includes(targetCountry) && !targetCountry.includes(candCountry)) {
      return false;
    }
  }

  // P/E Max
  if (filter.peMax !== undefined) {
    if (candidate.peRatio === null || candidate.peRatio > filter.peMax) {
      return false;
    }
  }

  // P/E Min
  if (filter.peMin !== undefined) {
    if (candidate.peRatio === null || candidate.peRatio < filter.peMin) {
      return false;
    }
  }

  // ROE Min (filter.roeMin is percentage, e.g. 15 for 15%)
  if (filter.roeMin !== undefined) {
    const candidateRoePercent = (candidate.roe ?? 0) * 100;
    if (candidate.roe === null || candidateRoePercent < filter.roeMin) {
      return false;
    }
  }

  // Revenue Growth Min (filter.revenueGrowthMin is percentage, e.g. 10 for 10%)
  if (filter.revenueGrowthMin !== undefined) {
    const candidateGrowthPercent = (candidate.revenueGrowth ?? -100) * 100;
    if (candidate.revenueGrowth === null || candidateGrowthPercent < filter.revenueGrowthMin) {
      return false;
    }
  }

  // Debt Level filter
  if (filter.debtLevel) {
    const de = candidate.debtToEquity;
    if (de === null) return false;
    if (filter.debtLevel === 'low' && de > 50) return false;
    if (filter.debtLevel === 'moderate' && de > 120) return false;
  }

  // Market Cap Min
  if (filter.marketCapMin !== undefined) {
    if (candidate.marketCap < filter.marketCapMin) return false;
  }

  return true;
}

export class ScreenerService {
  /**
   * Parses natural language queries into structured ScreenerFilter using LLM with deterministic regex fallback.
   */
  async parseQueryToFilter(query: string, geminiApiKey?: string): Promise<ScreenerFilter> {
    const queryLower = query.toLowerCase();
    const unsupported: string[] = [];

    // Detect unsupported requests in natural language
    if (queryLower.includes('insider trading') || queryLower.includes('congress buying')) {
      unsupported.push('Insider/Congressional trades tracking is not available in this dataset.');
    }
    if (queryLower.includes('sentiment score above') || queryLower.includes('news impact >')) {
      unsupported.push('Real-time sentiment score screener filtering is available in single-stock mode.');
    }

    if (geminiApiKey || process.env.GEMINI_API_KEY) {
      try {
        const model = llmClient.getModel(geminiApiKey);
        const prompt = `You are a financial screener query parser. Convert the user's natural-language stock search into a structured filter object.

User Query: "${query}"

Output ONLY a JSON object matching this schema without markdown code blocks:
{
  "sector": "IT", // string sector/industry if specified, e.g. "IT", "Financials", "Healthcare", or omit
  "country": "India", // string country if specified, e.g. "India", "USA", or omit
  "roeMin": 15, // number (percentage points, e.g. 15 for 15%) or omit
  "revenueGrowthMin": 10, // number (percentage points, e.g. 10 for 10%) or omit
  "peMax": 30, // number max P/E or omit
  "peMin": 5, // number min P/E or omit
  "debtLevel": "low" // "low" | "moderate" | "high" or omit
}`;

        const res = await model.invoke(prompt);
        let content = typeof res.content === 'string' ? res.content.trim() : JSON.stringify(res.content);
        if (content.startsWith('```json')) content = content.replace(/^```json/, '').replace(/```$/, '').trim();
        else if (content.startsWith('```')) content = content.replace(/^```/, '').replace(/```$/, '').trim();

        const parsed = JSON.parse(content);
        return {
          ...parsed,
          unsupportedFilters: unsupported.length > 0 ? unsupported : undefined,
        };
      } catch (err: any) {
        logger.warn(`LLM screener parser fallback: ${err.message}`);
      }
    }

    // Deterministic Rule-based Regex Parser (Guaranteed fallback and unit-testable)
    const filter: ScreenerFilter = {};

    // Sector detection
    if (queryLower.includes('it ') || queryLower.includes('tech') || queryLower.includes('software')) filter.sector = 'IT';
    else if (queryLower.includes('bank') || queryLower.includes('financial')) filter.sector = 'Financials';
    else if (queryLower.includes('pharma') || queryLower.includes('health')) filter.sector = 'Healthcare';

    // Country detection
    if (queryLower.includes('india') || queryLower.includes('indian')) filter.country = 'India';
    else if (queryLower.includes('us') || queryLower.includes('usa') || queryLower.includes('american')) filter.country = 'USA';

    // ROE detection
    const roeMatch = queryLower.match(/roe\s*(?:above|>|over|greater than|min|>=)?\s*(\d+(?:\.\d+)?)\s*%?/);
    if (roeMatch) filter.roeMin = parseFloat(roeMatch[1]);

    // Revenue growth detection
    const revMatch = queryLower.match(/(?:revenue|sales)\s*(?:growth)?\s*(?:above|>|over|greater than|min|>=)?\s*(\d+(?:\.\d+)?)\s*%?/);
    if (revMatch) filter.revenueGrowthMin = parseFloat(revMatch[1]);

    // P/E Max detection
    const peMatch = queryLower.match(/p\/e\s*(?:below|<|under|less than|max|<=)?\s*(\d+(?:\.\d+)?)/);
    if (peMatch) filter.peMax = parseFloat(peMatch[1]);

    // Debt level detection
    if (queryLower.includes('low debt') || queryLower.includes('zero debt') || queryLower.includes('debt free')) filter.debtLevel = 'low';
    else if (queryLower.includes('moderate debt')) filter.debtLevel = 'moderate';

    if (unsupported.length > 0) {
      filter.unsupportedFilters = unsupported;
    }

    return filter;
  }

  private liveUniverseCache: ScreenerStockCandidate[] | null = null;
  private lastLiveFetchTime = 0;

  /**
   * Refreshes the candidate universe dynamically using the Yahoo Finance API,
   * pulling real-time price, market cap, P/E, ROE, revenue growth, and debt ratios.
   */
  async getLiveUniverse(): Promise<ScreenerStockCandidate[]> {
    const now = Date.now();
    // Cache live quotes for 3 minutes to maintain high performance while keeping data fresh
    if (this.liveUniverseCache && (now - this.lastLiveFetchTime < 180000)) {
      return this.liveUniverseCache;
    }

    try {
      logger.info('Fetching live market quotes and fundamental metrics via Yahoo Finance API for candidate universe...');
      const liveCandidates = await Promise.all(
        SCREENER_UNIVERSE.map(async (candidate) => {
          try {
            const summary = await yahooFinance.quoteSummary(candidate.ticker, {
              modules: ['price', 'financialData', 'defaultKeyStatistics', 'summaryDetail'],
            }) as any;

            const price = summary?.price || {};
            const fin = summary?.financialData || {};
            const stats = summary?.defaultKeyStatistics || {};
            const detail = summary?.summaryDetail || {};

            return {
              ...candidate,
              name: price.shortName || price.longName || candidate.name,
              price: price.regularMarketPrice ?? candidate.price,
              marketCap: price.marketCap ?? candidate.marketCap,
              peRatio: detail.trailingPE ?? stats.trailingPE ?? candidate.peRatio,
              roe: fin.returnOnEquity ?? candidate.roe,
              revenueGrowth: fin.revenueGrowth ?? candidate.revenueGrowth,
              debtToEquity: fin.debtToEquity ?? candidate.debtToEquity,
              profitMargin: fin.profitMargins ?? candidate.profitMargin,
            };
          } catch (err: any) {
            logger.warn(`Could not refresh live API data for ${candidate.ticker}: ${err.message}. Using baseline.`);
            return candidate;
          }
        })
      );

      this.liveUniverseCache = liveCandidates;
      this.lastLiveFetchTime = now;
      logger.info(`Successfully loaded live API market data for ${liveCandidates.length} candidate equities.`);
      return liveCandidates;
    } catch (err: any) {
      logger.error(`Error fetching live universe data: ${err.message}`);
      return SCREENER_UNIVERSE;
    }
  }

  /**
   * Applies structured filters against the live, real-time market data fetched via Yahoo Finance API.
   */
  async runScreenerAsync(filter: ScreenerFilter): Promise<ScreenerRunResult> {
    const liveUniverse = await this.getLiveUniverse();
    return this.runScreener(filter, liveUniverse);
  }

  /**
   * Applies structured filters deterministically against the stock universe and ranks results.
   */
  runScreener(filter: ScreenerFilter, universe: ScreenerStockCandidate[] = SCREENER_UNIVERSE): ScreenerRunResult {
    const matches = universe.filter(candidate => matchesFilter(candidate, filter));

    // Deterministic ranking: Sort by composite quality: highest ROE, then highest Revenue Growth
    matches.sort((a, b) => {
      const roeA = a.roe ?? 0;
      const roeB = b.roe ?? 0;
      if (roeB !== roeA) return roeB - roeA;
      const revA = a.revenueGrowth ?? 0;
      const revB = b.revenueGrowth ?? 0;
      return revB - revA;
    });

    let message: string | undefined;
    if (filter.unsupportedFilters && filter.unsupportedFilters.length > 0) {
      message = `Notice: ${filter.unsupportedFilters.join(' ')}`;
    }

    return {
      parsedFilter: filter,
      matches,
      totalEvaluated: universe.length,
      unsupportedCriteriaMessage: message,
      rankingBasis: 'Ranked deterministically by Return on Equity (ROE) and Revenue Growth.',
    };
  }
}

export const screenerService = new ScreenerService();
