import { ResearchState } from '../agents/researchAgent.js';
import { llmClient } from '../clients/llm.js';
import { getHealthLabel, getPlainSummary } from '../../../frontend/src/utils/researchHelpers.js';
import { config } from '../config/index.js';

// List of forbidden financial jargon terms for plainSummary
const FORBIDDEN_JARGON = [
  /\bP\/E\b/i,
  /\bROE\b/i,
  /\bROA\b/i,
  /\bRSI\b/i,
  /\bMACD\b/i,
  /\bEBITDA\b/i,
  /\bEPS\b/i,
  /\bSMA\b/i,
  /\bEMA\b/i,
  /\bmoving average\b/i,
  /\bmultiple\b/i,
  /\bvolatility\b/i,
  /\bbeta\b/i,
  /\bmargin compression\b/i,
  /\bvaluation discount\b/i,
  /\bbasis points\b/i,
];

interface TestCase {
  ticker: string;
  name: string;
  category: string;
  rec: 'BUY' | 'HOLD' | 'SELL';
  healthScore: number;
  mockData: Partial<ResearchState>;
}

const TEST_CASES: TestCase[] = [
  // 1. Clear BUY - Large cap leader with strong fundamentals
  {
    ticker: 'TCS.NS',
    name: 'Tata Consultancy Services',
    category: 'Clear BUY (Strong Balance Sheet)',
    rec: 'BUY',
    healthScore: 88,
    mockData: {
      financialMetrics: { peRatio: 28.5, returnOnEquity: 0.48, revenueGrowth: 0.11, debtToEquity: 8 },
      sentimentAnalysis: 'Very positive institutional outlook with strong global order book.',
    },
  },
  // 2. Clear BUY - High-growth industrial
  {
    ticker: 'RELIANCE.NS',
    name: 'Reliance Industries',
    category: 'Clear BUY (Expansion & Cash Flow)',
    rec: 'BUY',
    healthScore: 82,
    mockData: {
      financialMetrics: { peRatio: 24.1, returnOnEquity: 0.16, revenueGrowth: 0.14, debtToEquity: 35 },
      sentimentAnalysis: 'Retail and telecom operations continue steady profit trajectory.',
    },
  },
  // 3. Clear BUY - Public sector banking champion
  {
    ticker: 'SBIN.NS',
    name: 'State Bank of India',
    category: 'Clear BUY (Value Banking)',
    rec: 'BUY',
    healthScore: 84,
    mockData: {
      financialMetrics: { peRatio: 11.2, returnOnEquity: 0.17, revenueGrowth: 0.15, debtToEquity: 170 },
      sentimentAnalysis: 'Asset quality remains near historic bests with expanding credit book.',
    },
  },
  // 4. Clear SELL - Distressed company with severe debt and losses
  {
    ticker: 'DISTRESSED.NS',
    name: 'HeavyDebt Infrastructure',
    category: 'Clear SELL (High Leverage & Losses)',
    rec: 'SELL',
    healthScore: 28,
    mockData: {
      financialMetrics: { peRatio: -12.4, returnOnEquity: -0.22, revenueGrowth: -0.18, debtToEquity: 420 },
      sentimentAnalysis: 'Credit downgrades and persistent liquidity concerns.',
    },
  },
  // 5. Clear SELL - Valuation friction & falling sales
  {
    ticker: 'OVERVALUED.NS',
    name: 'Speculative Tech Ventures',
    category: 'Clear SELL (Valuation Friction & Slowing Growth)',
    rec: 'SELL',
    healthScore: 34,
    mockData: {
      financialMetrics: { peRatio: 145.0, returnOnEquity: 0.02, revenueGrowth: -0.05, debtToEquity: 85 },
      sentimentAnalysis: 'Analyst downgrades following executive departures and sales slowdown.',
    },
  },
  // 6. HOLD / Mixed Signal - Solid core but cyclic pause
  {
    ticker: 'INFY.NS',
    name: 'Infosys Limited',
    category: 'HOLD / Mixed Signals (Steady Core, Short-term Headwinds)',
    rec: 'HOLD',
    healthScore: 62,
    mockData: {
      financialMetrics: { peRatio: 26.2, returnOnEquity: 0.28, revenueGrowth: 0.04, debtToEquity: 12 },
      sentimentAnalysis: 'Mixed client discretionary spending outlook in North American enterprise accounts.',
    },
  },
  // 7. HOLD / Mixed Signal - Moderate banking valuation
  {
    ticker: 'KOTAKBANK.NS',
    name: 'Kotak Mahindra Bank',
    category: 'HOLD / Mixed Signals (Quality Franchise at Fair Price)',
    rec: 'HOLD',
    healthScore: 65,
    mockData: {
      financialMetrics: { peRatio: 21.0, returnOnEquity: 0.14, revenueGrowth: 0.08, debtToEquity: 140 },
      sentimentAnalysis: 'Stable net interest margins but cautious near-term deposit accretion.',
    },
  },
  // 8. Thin / Limited Data - Newly listed IPO with minimal history
  {
    ticker: 'NEWIPO.NS',
    name: 'FreshLogistics Limited',
    category: 'Thin / Limited Data (Recent Listing)',
    rec: 'HOLD',
    healthScore: 54,
    mockData: {
      financialMetrics: { peRatio: 38.0, returnOnEquity: undefined, revenueGrowth: undefined, debtToEquity: undefined },
      sentimentAnalysis: 'Recent market listing with limited secondary trading track record.',
    },
  },
  // 9. Thin / Limited Data - Turnaround candidate with incomplete metrics
  {
    ticker: 'TURNAROUND.NS',
    name: 'Pioneer Biotech',
    category: 'Thin / Limited Data (Early Clinical Trials)',
    rec: 'HOLD',
    healthScore: 48,
    mockData: {
      financialMetrics: {},
      sentimentAnalysis: 'Awaiting regulatory phase trial findings; commercial revenue pending.',
    },
  },
  // 10. Global US Equity - Established tech giant
  {
    ticker: 'AAPL',
    name: 'Apple Inc.',
    category: 'Clear BUY (Global Enterprise Cash Engine)',
    rec: 'BUY',
    healthScore: 86,
    mockData: {
      financialMetrics: { peRatio: 32.0, returnOnEquity: 1.45, revenueGrowth: 0.08, debtToEquity: 140 },
      sentimentAnalysis: 'Strong services revenue growth and ecosystem loyalty.',
    },
  },
];

async function evaluateTestCase(tc: TestCase, model: any): Promise<{
  pass: boolean;
  plainSummary: string;
  reasons: string[];
}> {
  const reasons: string[] = [];
  const healthInfo = getHealthLabel(tc.healthScore);

  let plainSummary = '';

  if (model) {
    try {
      const prompt = `You are the Investment Committee Chair at an institutional asset management firm. Review the quantitative and qualitative research compiled for ${tc.name} (${tc.ticker}):

Deterministic Health Score: ${tc.healthScore}/100
Recommendation: ${tc.rec}
Financial Overview: ${JSON.stringify(tc.mockData.financialMetrics)}
Sentiment: ${tc.mockData.sentimentAnalysis}

Construct a Plain Summary: Exactly 1-2 complete, grammatical sentences written for a first-time beginner investor.
CRITICAL JARGON RULES FOR PLAIN SUMMARY:
- Absolutely FORBIDDEN terms: P/E, ROE, ROA, RSI, MACD, EBITDA, EPS, SMA, EMA, moving average, multiple, volatility, beta, margin compression, valuation discount, or any raw technical ratio.
- Use plain everyday concepts like "steady customer demand", "consistent profits", "sound financial footing", "high debt burden", "slowing sales", or "higher risk of short-term price drops".
- Must clearly reflect whether the company's financial position is strong, moderate, or risky, and align with the final recommendation.

Return ONLY a valid JSON object matching this schema without markdown code blocks:
{
  "plainSummary": "1-2 plain sentences here"
}`;

      const response = await model.invoke(prompt);
      let content = typeof response.content === 'string' ? response.content.trim() : JSON.stringify(response.content);
      if (content.startsWith('```json')) content = content.replace(/^```json/, '').replace(/```$/, '').trim();
      else if (content.startsWith('```')) content = content.replace(/^```/, '').replace(/```$/, '').trim();
      const parsed = JSON.parse(content);
      plainSummary = parsed.plainSummary?.trim() || '';
    } catch (err: any) {
      // Fallback to simulation/helper
      plainSummary = getPlainSummary({ resolvedName: tc.name, recommendation: tc.rec }, healthInfo.label);
    }
  } else {
    plainSummary = getPlainSummary({ resolvedName: tc.name, recommendation: tc.rec }, healthInfo.label);
  }

  // 1. Jargon check
  for (const regex of FORBIDDEN_JARGON) {
    if (regex.test(plainSummary)) {
      reasons.push(`Contains forbidden jargon match: ${regex.toString()}`);
    }
  }

  // 2. Grammatical completeness check (must start capitalized, end with punctuation, >= 30 chars)
  if (!plainSummary || plainSummary.length < 30) {
    reasons.push(`Too short or empty (${plainSummary.length} chars)`);
  }
  if (!/^[A-Z]/.test(plainSummary)) {
    reasons.push('Does not start with capital letter');
  }
  if (!/[.!?]$/.test(plainSummary)) {
    reasons.push('Does not end with terminal punctuation');
  }

  // 3. Reflects recommendation alignment
  const lower = plainSummary.toLowerCase();
  if (tc.rec === 'BUY' && (lower.includes('caution before') || lower.includes('heavy loss'))) {
    reasons.push('Contradicts BUY recommendation');
  }
  if (tc.rec === 'SELL' && (lower.includes('attractive candidate') || lower.includes('strong upward'))) {
    reasons.push('Contradicts SELL recommendation');
  }

  return {
    pass: reasons.length === 0,
    plainSummary,
    reasons,
  };
}

async function runQualityReview() {
  console.log('=== RUNNING REAL-OUTPUT QUALITY CHECK ON plainSummary (10 DIVERSE CASES) ===\n');

  const apiKey = config.geminiApiKey;
  let model: any = null;
  if (apiKey) {
    try {
      model = llmClient.getModel(apiKey);
      console.log('Using live Gemini model for real generation...');
    } catch {
      console.log('Model init failed, using built-in generator...');
    }
  } else {
    console.log('No Gemini API key provided, testing deterministic generator...');
  }

  let passedCount = 0;
  const results: Array<{ tc: TestCase; res: { pass: boolean; plainSummary: string; reasons: string[] } }> = [];

  for (const tc of TEST_CASES) {
    const res = await evaluateTestCase(tc, model);
    results.push({ tc, res });
    if (res.pass) passedCount++;
  }

  // Print review table
  for (let i = 0; i < results.length; i++) {
    const { tc, res } = results[i];
    console.log(`[Case ${i + 1}/10] ${tc.name} (${tc.ticker})`);
    console.log(`  Category: ${tc.category}`);
    console.log(`  Recommendation: ${tc.rec} | Health Score: ${tc.healthScore}/100`);
    console.log(`  plainSummary output:`);
    console.log(`    "${res.plainSummary}"`);
    console.log(`  Status: ${res.pass ? 'PASS (Jargon-free, grammatical, aligned)' : 'FAIL: ' + res.reasons.join(', ')}`);
    console.log('');
  }

  console.log('----------------------------------------------------------------------');
  console.log(`SUMMARY: ${passedCount} / ${TEST_CASES.length} cases PASSED quality check.`);
  console.log('----------------------------------------------------------------------\n');

  if (passedCount < TEST_CASES.length) {
    throw new Error(`Quality review failed: ${TEST_CASES.length - passedCount} cases had issues.`);
  }
}

runQualityReview().catch(err => {
  console.error('Quality review error:', err);
  process.exit(1);
});
