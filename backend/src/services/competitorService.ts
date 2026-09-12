import YahooFinance from 'yahoo-finance2';
import { yahooFinanceClient, ADR_REDIRECT_MAP, CompanyOverview, FinancialMetrics } from '../clients/yahooFinance.js';
import { logger } from '../middleware/logger.js';
import { llmClient } from '../clients/llm.js';

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey', 'ripHistorical'] });

export interface PeerMetricRow {
  ticker: string;
  name: string;
  marketCap: number;
  peRatio: number | null;
  revenueGrowth: number | null;
  roe: number | null;
  profitMargin: number | null;
  debtToEquity: number | null;
  isTarget?: boolean;
}

export interface CompetitorComparisonResult {
  targetTicker: string;
  peers: PeerMetricRow[];
  rankings: {
    marketCapRank: string; // e.g. "1 of 4"
    growthRank: string;
    profitabilityRank: string;
    valuationRank: string;
  };
  summary: string;
  currencySymbol?: string;
}

// Well-curated benchmark peer sets by company / industry
const PEER_MAP: Record<string, string[]> = {
  // Mega-cap Tech & Software
  AAPL: ['MSFT', 'GOOGL', 'META'],
  MSFT: ['AAPL', 'GOOGL', 'AMZN'],
  GOOGL: ['MSFT', 'META', 'AMZN'],
  META: ['GOOGL', 'SNAP', 'PINS'],
  AMZN: ['MSFT', 'WMT', 'BABA'],
  
  // Semiconductors
  NVDA: ['AMD', 'INTC', 'TSM', 'QCOM'],
  AMD: ['NVDA', 'INTC', 'QCOM'],
  INTC: ['AMD', 'NVDA', 'TSM'],
  TSM: ['NVDA', 'INTC', 'ASML'],
  AVGO: ['QCOM', 'NVDA', 'TXN'],
  
  // Electric Vehicles & Auto
  TSLA: ['RIVN', 'F', 'GM', 'LCID'],
  F: ['GM', 'TSLA', 'STLA'],
  GM: ['F', 'TSLA', 'STLA'],
  RIVN: ['TSLA', 'LCID', 'F'],

  // Banking & Financials
  JPM: ['BAC', 'C', 'WFC', 'GS'],
  BAC: ['JPM', 'WFC', 'C'],
  GS: ['MS', 'JPM', 'BAC'],
  V: ['MA', 'PYPL', 'AXP'],
  MA: ['V', 'PYPL', 'AXP'],

  // Pharma & Healthcare
  MRNA: ['BNTX', 'PFE', 'AZN'],
  PFE: ['JNJ', 'MRK', 'ABBV'],
  LLY: ['NVO', 'ABBV', 'MRK'],

  // Indian Equities (pure NSE peers in INR)
  INFY: ['TCS.NS', 'WIPRO.NS', 'HCLTECH.NS'],
  'INFY.NS': ['TCS.NS', 'WIPRO.NS', 'HCLTECH.NS'],
  WIT: ['INFY.NS', 'TCS.NS', 'HCLTECH.NS'],
  'WIPRO.NS': ['TCS.NS', 'INFY.NS', 'HCLTECH.NS'],
  HDB: ['ICICIBANK.NS', 'SBIN.NS'],
  IBN: ['HDFCBANK.NS', 'SBIN.NS'],
  'HDFCBANK.NS': ['ICICIBANK.NS', 'SBIN.NS', 'KOTAKBANK.NS', 'AXISBANK.NS'],
  'HDFCBANK': ['ICICIBANK.NS', 'SBIN.NS', 'KOTAKBANK.NS', 'AXISBANK.NS'],
  'ICICIBANK.NS': ['HDFCBANK.NS', 'SBIN.NS', 'KOTAKBANK.NS', 'AXISBANK.NS'],
  'ICICIBANK': ['HDFCBANK.NS', 'SBIN.NS', 'KOTAKBANK.NS', 'AXISBANK.NS'],
  TCS: ['INFY.NS', 'WIPRO.NS', 'HCLTECH.NS'],
  'TCS.NS': ['INFY.NS', 'WIPRO.NS', 'HCLTECH.NS'],
  'SBIN.NS': ['HDFCBANK.NS', 'ICICIBANK.NS', 'KOTAKBANK.NS', 'AXISBANK.NS'],
  'SBIN': ['HDFCBANK.NS', 'ICICIBANK.NS', 'KOTAKBANK.NS', 'AXISBANK.NS'],
  'TATAMOTORS.NS': ['M&M.NS', 'MARUTI.NS', 'BAJAJ-AUTO.NS'],
  'TATAMOTORS': ['M&M.NS', 'MARUTI.NS', 'BAJAJ-AUTO.NS'],
  'TATASTEEL.NS': ['JSWSTEEL.NS', 'HINDALCO.NS', 'JINDALSTEL.NS', 'SAIL.NS'],
  'TATASTEEL': ['JSWSTEEL.NS', 'HINDALCO.NS', 'JINDALSTEL.NS', 'SAIL.NS'],
  'RELIANCE.NS': ['TCS.NS', 'HDFCBANK.NS', 'BHARTIARTL.NS', 'ITC.NS'],
  'RELIANCE': ['TCS.NS', 'HDFCBANK.NS', 'BHARTIARTL.NS', 'ITC.NS'],
};

// Generic sector fallbacks if ticker not explicitly mapped
const SECTOR_FALLBACKS: Record<string, string[]> = {
  Technology: ['MSFT', 'AAPL', 'GOOGL', 'NVDA'],
  'Financial Services': ['JPM', 'BAC', 'V', 'MA'],
  'Healthcare': ['JNJ', 'PFE', 'MRK', 'ABBV'],
  'Consumer Cyclical': ['AMZN', 'TSLA', 'HD', 'NKE'],
  'Communication Services': ['GOOGL', 'META', 'DIS', 'NFLX'],
  'Industrials': ['CAT', 'GE', 'HON', 'BA'],
};

export class CompetitorService {
  /**
   * Identifies 2-4 peer tickers for a given target ticker and sector.
   */
  getPeerTickers(ticker: string, sector?: string): string[] {
    const upper = ticker.toUpperCase();
    if (PEER_MAP[upper]) {
      return PEER_MAP[upper];
    }

    if (sector && SECTOR_FALLBACKS[sector]) {
      return SECTOR_FALLBACKS[sector].filter(t => t !== upper).slice(0, 3);
    }

    return ['MSFT', 'AAPL', 'GOOGL'].filter(t => t !== upper);
  }

  /**
   * Fetches key metrics for a ticker.
   */
  private async fetchPeerData(ticker: string): Promise<PeerMetricRow | null> {
    try {
      const effectiveTicker = ADR_REDIRECT_MAP[ticker.toUpperCase()]?.symbol || ticker;
      const summary = await yahooFinance.quoteSummary(effectiveTicker, {
        modules: ['summaryProfile', 'price', 'defaultKeyStatistics', 'financialData', 'summaryDetail'],
      }) as any;

      const price = summary.price || {};
      const stats = summary.defaultKeyStatistics || {};
      const fin = summary.financialData || {};
      const detail = summary.summaryDetail || {};

      const isUsd = price.currency === 'USD';
      const fxRate = isUsd ? 87.5 : 1;

      return {
        ticker: effectiveTicker,
        name: price.shortName || price.longName || effectiveTicker,
        marketCap: (price.marketCap || 0) * fxRate,
        peRatio: detail.trailingPE || stats.trailingPE || null,
        revenueGrowth: fin.revenueGrowth !== undefined ? fin.revenueGrowth : null,
        roe: fin.returnOnEquity !== undefined ? fin.returnOnEquity : null,
        profitMargin: fin.profitMargins !== undefined ? fin.profitMargins : null,
        debtToEquity: fin.debtToEquity !== undefined ? fin.debtToEquity : null,
      };
    } catch (err: any) {
      logger.warn(`Failed to fetch peer data for ${ticker}: ${err.message}`);
      return null;
    }
  }

  /**
   * Performs competitor comparison and deterministic ranking for target against peers.
   */
  async compareCompetitors(
    targetTicker: string,
    targetOverview: CompanyOverview,
    targetMetrics: FinancialMetrics,
    geminiApiKey?: string
  ): Promise<CompetitorComparisonResult> {
    const peerTickers = this.getPeerTickers(targetTicker, targetOverview.sector);
    logger.info(`Comparing ${targetTicker} with peers: ${peerTickers.join(', ')}`);

    const peerDataPromises = peerTickers.map(t => this.fetchPeerData(t));
    const peerResults = await Promise.all(peerDataPromises);

    const validPeers = peerResults.filter((p): p is PeerMetricRow => p !== null);

    // Target row
    const targetRow: PeerMetricRow = {
      ticker: targetTicker,
      name: targetOverview.name || targetTicker,
      marketCap: targetOverview.marketCap || 0,
      peRatio: targetMetrics.peRatio || null,
      revenueGrowth: targetMetrics.revenueGrowth !== undefined ? targetMetrics.revenueGrowth : null,
      roe: targetMetrics.returnOnEquity !== undefined ? targetMetrics.returnOnEquity : null,
      profitMargin: targetMetrics.profitMargin !== undefined ? targetMetrics.profitMargin : null,
      debtToEquity: targetMetrics.debtToEquity !== undefined ? targetMetrics.debtToEquity : null,
      isTarget: true,
    };

    const allCompanies = [targetRow, ...validPeers];
    const totalCount = allCompanies.length;

    // Deterministic ranking helper
    const getRank = (sorter: (a: PeerMetricRow, b: PeerMetricRow) => number): string => {
      const sorted = [...allCompanies].sort(sorter);
      const rankIdx = sorted.findIndex(c => c.ticker.toUpperCase() === targetTicker.toUpperCase());
      return `${rankIdx + 1} of ${totalCount}`;
    };

    // Rankings:
    // 1. Market Cap (higher is #1)
    const marketCapRank = getRank((a, b) => b.marketCap - a.marketCap);

    // 2. Growth (higher revenueGrowth is #1, nulls last)
    const growthRank = getRank((a, b) => {
      const gA = a.revenueGrowth ?? -999;
      const gB = b.revenueGrowth ?? -999;
      return gB - gA;
    });

    // 3. Profitability (higher ROE is #1)
    const profitabilityRank = getRank((a, b) => {
      const rA = a.roe ?? -999;
      const rB = b.roe ?? -999;
      return rB - rA;
    });

    // 4. Valuation (lower positive P/E is more attractive / #1)
    const valuationRank = getRank((a, b) => {
      const pA = (a.peRatio && a.peRatio > 0) ? a.peRatio : 9999;
      const pB = (b.peRatio && b.peRatio > 0) ? b.peRatio : 9999;
      return pA - pB;
    });

    // Generate grounded explanatory narrative
    let summary = `${targetTicker} ranks ${marketCapRank} in Market Cap and ${profitabilityRank} in ROE compared to peers (${validPeers.map(p => p.ticker).join(', ')}).`;

    if (geminiApiKey || process.env.GEMINI_API_KEY) {
      try {
        const model = llmClient.getModel(geminiApiKey);
        const prompt = `You are an equity research analyst. Summarize in 2-3 concise sentences the relative competitive standing of ${targetTicker} compared to its peers based on this deterministic comparison table:
${JSON.stringify(allCompanies, null, 2)}
Rankings: Market Cap: ${marketCapRank}, Revenue Growth: ${growthRank}, Profitability (ROE): ${profitabilityRank}, Valuation (P/E): ${valuationRank}.
Explain specifically where ${targetTicker} is stronger or weaker than peers. Ground strictly in these metrics.`;

        const res = await model.invoke(prompt);
        summary = typeof res.content === 'string' ? res.content.trim() : JSON.stringify(res.content);
      } catch (err: any) {
        logger.warn(`Peer comparison LLM explanation fallback: ${err.message}`);
      }
    } else {
      // Deterministic simulation summary
      summary = `${targetTicker} stands as ${marketCapRank} by market capitalization amongst immediate industry rivals. Its Return on Equity ranks ${profitabilityRank}, indicating ${profitabilityRank.startsWith('1') ? 'superior' : 'competitive'} capital efficiency, while top-line revenue expansion places it ${growthRank} in its cohort.`;
    }

    return {
      targetTicker,
      peers: allCompanies,
      rankings: {
        marketCapRank,
        growthRank,
        profitabilityRank,
        valuationRank,
      },
      summary,
      currencySymbol: '₹',
    };
  }
}

export const competitorService = new CompetitorService();
