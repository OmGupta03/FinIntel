import { pdfReportService } from '../services/pdfReportService.js';
import { ResearchState } from '../agents/researchAgent.js';

async function testPdfReport() {
  console.log('Testing PDF Report Generation...');

  const mockState = {
    companyName: 'State Bank of India',
    ticker: 'SBIN.NS',
    resolvedName: 'State Bank of India',
    overview: {
      name: 'State Bank of India',
      exchange: 'NSE',
      price: 825.40,
      dayChange: 14.20,
      dayChangePercent: 1.75,
      sector: 'Financial Services',
      industry: 'Public Sector Banking',
      source: 'GROWW_API',
      currency: 'INR',
      currencySymbol: '₹',
    },
    financialMetrics: {
      peRatio: 11.2,
      priceToBook: 1.45,
      returnOnEquity: 0.168,
      returnOnAssets: 0.011,
      revenueGrowth: 0.142,
      profitMargin: 0.185,
      debtToEquity: 140,
      trailingEps: 73.5,
      freeCashFlow: 35000000000,
    },
    historicalPrices: Array.from({ length: 30 }, (_, i) => ({
      date: new Date(Date.now() - (30 - i) * 86400000).toISOString(),
      close: 780 + Math.sin(i / 3) * 30 + i * 1.5,
    })),
    news: [
      { title: 'SBI reports record quarterly profit driven by retail loan surge' },
      { title: 'RBI policy stance supports public sector bank credit growth' },
    ],
    technicalAnalysis: {
      currentPrice: 825.40,
      trendSignal: 'BULLISH',
      summary: 'Strong upward price momentum above key moving averages.',
      sma20: { value: 812.50, insufficientData: false },
      sma50: { value: 795.30, insufficientData: false },
      sma200: { value: 740.00, insufficientData: false },
      ema20: { value: 815.20, insufficientData: false },
      rsi14: { value: 62.4, insufficientData: false },
      macd: { value: { macd: 8.5, signal: 6.2, histogram: 2.3 }, insufficientData: false },
      bollingerBands: { value: { upper: 840, middle: 812, lower: 784, bandwidth: 0.068 }, insufficientData: false },
      fiftyTwoWeekHigh: { value: 890, insufficientData: false },
      fiftyTwoWeekLow: { value: 560, insufficientData: false },
      currentVolume: { value: 18500000, insufficientData: false },
      averageVolume30d: { value: 14200000, insufficientData: false },
      volumeRatio: { value: 1.30, insufficientData: false },
      annualizedVolatility: { value: 0.22, insufficientData: false },
    },
    financialAnalysis: 'Robust fundamental profile with low P/E multiple.',
    sentimentAnalysis: 'Bullish news sentiment following earnings release.',
    newsIntelligence: {
      articles: [],
      aggregateSentimentScore: 78,
      sentimentLabel: 'Bullish',
      keyCatalysts: ['Strong Net Interest Margin expansion', 'Asset quality improvement'],
      topTopics: ['earnings', 'banking'],
      summary: 'Institutional sentiment remains strongly positive.',
    },
    healthScore: {
      overallScore: 84,
      subScores: {
        fundamental: 88,
        valuation: 85,
        growth: 82,
        technical: 80,
        risk: 86,
      },
      explanations: {
        overall: 'Outstanding financial health and operating resilience.',
        fundamental: 'Consistent double-digit ROE with low non-performing assets.',
        valuation: 'Attractively priced relative to banking sector peers.',
        growth: 'Strong credit and loan book expansion.',
        technical: 'Positive momentum above 50-day SMA.',
        risk: 'Comfortable capital adequacy buffer.',
      },
    },
    competitors: {
      targetTicker: 'SBIN.NS',
      peers: [
        { ticker: 'HDFCBANK.NS', name: 'HDFC Bank', marketCap: 12480000000000, peRatio: 19.2, roe: 0.17, debtToEquity: 180, profitMargin: 0.22, revenueGrowth: 0.18 },
        { ticker: 'ICICIBANK.NS', name: 'ICICI Bank', marketCap: 8900000000000, peRatio: 17.5, roe: 0.185, debtToEquity: 160, profitMargin: 0.24, revenueGrowth: 0.19 },
      ],
      rankings: {
        marketCapRank: '2 of 3',
        growthRank: '2 of 3',
        profitabilityRank: '2 of 3',
        valuationRank: '1 of 3 (Most Attractive)',
      },
      summary: 'SBIN trades at a significant valuation discount to private banking rivals.',
    },
    swotAnalysis: {
      strengths: ['Unrivaled nationwide deposit franchise', 'Improving asset quality'],
      weaknesses: ['Public sector bureaucratic processes', 'Lower net interest margin than select private peers'],
      opportunities: ['Digital banking adoption (YONO)', 'SME credit expansion'],
      threats: ['Macroeconomic interest rate cycles', 'Fintech competition'],
    },
    bullCase: [
      'Valuation remains at a notable discount to historical price-to-book multiples.',
      'Sustained 16%+ ROE and record retail credit momentum.',
      'Technical bias confirms steady accumulation above 20 and 50-day moving averages.',
    ],
    bearCase: [
      'Treasury yield fluctuations could compress investment portfolio gains.',
      'Elevated cost-to-income ratio relative to leading private sector competitors.',
    ],
    recommendation: 'BUY',
    confidenceScore: 84,
    reasoning: 'The investment committee affirms a BUY conviction grounded in an 84/100 Health Score, superior valuation cushion, and expanding credit margins.',
    logs: [],
    currentStep: 'Synthesize Recommendation',
  };

  const pdfBuffer = await pdfReportService.generateReportPdf(mockState as any);
  console.log(`Successfully generated PDF! Buffer size: ${pdfBuffer.length} bytes.`);

  // Verify PDF header magic bytes "%PDF-"
  const header = pdfBuffer.subarray(0, 5).toString('ascii');
  if (header !== '%PDF-') {
    throw new Error(`Invalid PDF header: ${header}`);
  }

  console.log('PDF Header verified: %PDF-');
  console.log('All PDF report tests passed successfully!');
}

testPdfReport().catch((err) => {
  console.error('PDF Report Test Failed:', err);
  process.exit(1);
});
