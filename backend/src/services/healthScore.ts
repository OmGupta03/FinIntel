import { FinancialMetrics } from '../clients/yahooFinance.js';
import { TechnicalAnalysisResult } from '../utils/technicalAnalysis.js';
import { HEALTH_SCORE_WEIGHTS, HEALTH_SCORE_THRESHOLDS } from '../config/healthScoreConfig.js';
import { llmClient } from '../clients/llm.js';

export interface HealthScoreBreakdown {
  overallScore: number; // 0 - 100
  subScores: {
    fundamental: number;
    valuation: number;
    growth: number;
    technical: number;
    risk: number;
  };
  explanations: {
    overall: string;
    fundamental: string;
    valuation: string;
    growth: string;
    technical: string;
    risk: string;
  };
}

/**
 * Bounds a score strictly between 0 and 100.
 */
function clamp(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * 1. Fundamental Sub-Score (0-100)
 * Evaluates return on equity, return on assets, profit margin, and positive free cash flow.
 */
export function calculateFundamentalScore(metrics: FinancialMetrics | null): number {
  if (!metrics) return 50;

  let score = 50; // Base score

  // ROE impact (+/- 15 pts)
  if (metrics.returnOnEquity !== undefined) {
    if (metrics.returnOnEquity >= HEALTH_SCORE_THRESHOLDS.roeExcellent) score += 15;
    else if (metrics.returnOnEquity >= HEALTH_SCORE_THRESHOLDS.roeGood) score += 8;
    else if (metrics.returnOnEquity < 0) score -= 15;
  }

  // ROA impact (+/- 10 pts)
  if (metrics.returnOnAssets !== undefined) {
    if (metrics.returnOnAssets >= HEALTH_SCORE_THRESHOLDS.roaGood) score += 10;
    else if (metrics.returnOnAssets < 0) score -= 10;
  }

  // Profit Margin impact (+/- 15 pts)
  if (metrics.profitMargin !== undefined) {
    if (metrics.profitMargin >= HEALTH_SCORE_THRESHOLDS.profitMarginHigh) score += 15;
    else if (metrics.profitMargin > 0.05) score += 8;
    else if (metrics.profitMargin <= 0) score -= 15;
  }

  // Free Cash Flow Health (+/- 10 pts)
  if (metrics.freeCashFlow !== undefined) {
    if (metrics.freeCashFlow > 0) score += 10;
    else score -= 10;
  }

  return clamp(score);
}

/**
 * 2. Valuation Sub-Score (0-100)
 * Higher score = more attractive / reasonable valuation. Lower score = expensive multiple.
 */
export function calculateValuationScore(metrics: FinancialMetrics | null): number {
  if (!metrics) return 50;

  let score = 50;

  // P/E Ratio
  if (metrics.peRatio !== undefined && metrics.peRatio > 0) {
    if (metrics.peRatio <= HEALTH_SCORE_THRESHOLDS.peUndervalued) score += 20;
    else if (metrics.peRatio <= HEALTH_SCORE_THRESHOLDS.peFair) score += 10;
    else if (metrics.peRatio > HEALTH_SCORE_THRESHOLDS.peStretched) score -= 20;
    else score -= 5;
  }

  // PEG Ratio
  if (metrics.pegRatio !== undefined && metrics.pegRatio > 0) {
    if (metrics.pegRatio <= 1.0) score += 15;
    else if (metrics.pegRatio <= HEALTH_SCORE_THRESHOLDS.pegFair) score += 5;
    else if (metrics.pegRatio > 2.5) score -= 15;
  }

  // Price-to-Book
  if (metrics.priceToBook !== undefined && metrics.priceToBook > 0) {
    if (metrics.priceToBook <= 2.0) score += 15;
    else if (metrics.priceToBook <= HEALTH_SCORE_THRESHOLDS.priceToBookFair) score += 5;
    else if (metrics.priceToBook > 12) score -= 10;
  }

  return clamp(score);
}

/**
 * 3. Growth Sub-Score (0-100)
 * Evaluates YoY revenue growth and quarterly profit growth.
 */
export function calculateGrowthScore(metrics: FinancialMetrics | null): number {
  if (!metrics) return 50;

  let score = 50;

  // Revenue Growth
  if (metrics.revenueGrowth !== undefined) {
    if (metrics.revenueGrowth >= HEALTH_SCORE_THRESHOLDS.revenueGrowthHigh) score += 25;
    else if (metrics.revenueGrowth >= HEALTH_SCORE_THRESHOLDS.revenueGrowthGood) score += 15;
    else if (metrics.revenueGrowth > 0) score += 5;
    else score -= 20;
  }

  // Earnings/Profit Growth
  if (metrics.earningsGrowth !== undefined) {
    if (metrics.earningsGrowth >= HEALTH_SCORE_THRESHOLDS.earningsGrowthHigh) score += 25;
    else if (metrics.earningsGrowth > 0) score += 10;
    else score -= 15;
  }

  return clamp(score);
}

/**
 * 4. Technical Sub-Score (0-100)
 * Evaluates moving average alignment, RSI momentum, and MACD trend.
 */
export function calculateTechnicalScore(technical: TechnicalAnalysisResult | null): number {
  if (!technical) return 50;

  let score = 50;

  // Moving Average alignment
  if (technical.sma20.value && technical.currentPrice > technical.sma20.value) score += 10;
  else if (technical.sma20.value) score -= 10;

  if (technical.sma50.value && technical.currentPrice > technical.sma50.value) score += 15;
  else if (technical.sma50.value) score -= 10;

  // RSI Momentum
  if (technical.rsi14.value !== null) {
    const rsi = technical.rsi14.value;
    if (rsi >= HEALTH_SCORE_THRESHOLDS.rsiOptimalMin && rsi <= HEALTH_SCORE_THRESHOLDS.rsiOptimalMax) {
      score += 15; // Healthy momentum
    } else if (rsi > HEALTH_SCORE_THRESHOLDS.rsiOverbought) {
      score -= 5; // Risk of near-term consolidation
    } else if (rsi < HEALTH_SCORE_THRESHOLDS.rsiOversold) {
      score += 5; // Potential mean-reversion bounce
    }
  }

  // MACD Histogram
  if (technical.macd.value !== null) {
    if (technical.macd.value.histogram > 0) score += 10;
    else score -= 10;
  }

  return clamp(score);
}

/**
 * 5. Risk Sub-Score (0-100)
 * Higher score = LOWER risk / safer financial posture.
 */
export function calculateRiskScore(metrics: FinancialMetrics | null, technical: TechnicalAnalysisResult | null): number {
  let score = 60; // Baseline moderate risk profile

  if (metrics) {
    // Current Ratio (Liquidity)
    if (metrics.currentRatio !== undefined) {
      if (metrics.currentRatio >= HEALTH_SCORE_THRESHOLDS.currentRatioSafe) score += 15;
      else if (metrics.currentRatio < HEALTH_SCORE_THRESHOLDS.currentRatioMin) score -= 20;
    }

    // Debt-to-Equity (Solvency)
    if (metrics.debtToEquity !== undefined) {
      if (metrics.debtToEquity <= HEALTH_SCORE_THRESHOLDS.debtToEquitySafe) score += 15;
      else if (metrics.debtToEquity >= HEALTH_SCORE_THRESHOLDS.debtToEquityHigh) score -= 20;
      else score -= 5;
    }
  }

  if (technical && technical.annualizedVolatility.value !== null) {
    const vol = technical.annualizedVolatility.value;
    if (vol <= HEALTH_SCORE_THRESHOLDS.volatilityLow) score += 10;
    else if (vol >= HEALTH_SCORE_THRESHOLDS.volatilityHigh) score -= 15;
  }

  return clamp(score);
}

/**
 * Calculates complete Stock Health Score deterministically.
 */
export function computeHealthScore(
  metrics: FinancialMetrics | null,
  technical: TechnicalAnalysisResult | null
): {
  overallScore: number;
  subScores: {
    fundamental: number;
    valuation: number;
    growth: number;
    technical: number;
    risk: number;
  };
} {
  const fundamental = calculateFundamentalScore(metrics);
  const valuation = calculateValuationScore(metrics);
  const growth = calculateGrowthScore(metrics);
  const tech = calculateTechnicalScore(technical);
  const risk = calculateRiskScore(metrics, technical);

  const weightedSum =
    HEALTH_SCORE_WEIGHTS.fundamental * fundamental +
    HEALTH_SCORE_WEIGHTS.valuation * valuation +
    HEALTH_SCORE_WEIGHTS.growth * growth +
    HEALTH_SCORE_WEIGHTS.technical * tech +
    HEALTH_SCORE_WEIGHTS.risk * risk;

  return {
    overallScore: clamp(weightedSum),
    subScores: {
      fundamental,
      valuation,
      growth,
      technical: tech,
      risk,
    },
  };
}

/**
 * Builds AI-generated or deterministic rule-based one-line explanations for each sub-score.
 */
export async function buildHealthScoreExplanations(
  ticker: string,
  scores: { overallScore: number; subScores: { fundamental: number; valuation: number; growth: number; technical: number; risk: number } },
  metrics: FinancialMetrics | null,
  geminiApiKey?: string
): Promise<HealthScoreBreakdown['explanations']> {
  const { overallScore, subScores } = scores;

  // Rule-based fallback explanations grounded strictly in deterministic numbers
  const fallbackExplanations = {
    overall: `Overall Health Score of ${overallScore}/100 indicates a ${overallScore >= 70 ? 'resilient' : overallScore >= 50 ? 'balanced' : 'vulnerable'} investment profile.`,
    fundamental: subScores.fundamental >= 70
      ? `Strong operational efficiency backed by healthy returns on capital (ROE: ${metrics?.returnOnEquity ? (metrics.returnOnEquity * 100).toFixed(1) + '%' : 'solid'}).`
      : `Moderate fundamentals with room for margin or capital efficiency expansion.`,
    valuation: subScores.valuation >= 65
      ? `Valuation multiples trade at reasonable levels relative to projected sector growth.`
      : `Commands an elevated valuation multiple (P/E: ${metrics?.peRatio ? metrics.peRatio.toFixed(1) + 'x' : 'N/A'}), requiring sustained earnings outperformance.`,
    growth: subScores.growth >= 70
      ? `Top-line revenue expansion demonstrates robust market demand (+${metrics?.revenueGrowth ? (metrics.revenueGrowth * 100).toFixed(1) + '%' : 'healthy'}).`
      : `Growth trajectory has stabilized near broader macroeconomic industry averages.`,
    technical: subScores.technical >= 70
      ? `Moving average indicators and momentum oscillators reflect bullish technical structure.`
      : `Technicals show consolidation or corrective price action relative to key moving averages.`,
    risk: subScores.risk >= 70
      ? `Conservative balance sheet leverage and adequate liquidity cushion against downturns.`
      : `Leverage or market volatility warrants prudent position sizing.`,
  };

  // If Gemini key is available, generate contextually tailored one-liners without touching the scores
  if (geminiApiKey || process.env.GEMINI_API_KEY) {
    try {
      const model = llmClient.getModel(geminiApiKey);
      const prompt = `You are a quantitative financial analyst. For ticker ${ticker}, deterministic scoring calculated the following 0-100 scores:
- Overall: ${overallScore}/100
- Fundamental: ${subScores.fundamental}/100
- Valuation: ${subScores.valuation}/100
- Growth: ${subScores.growth}/100
- Technical: ${subScores.technical}/100
- Risk (safety): ${subScores.risk}/100

Provide a concise, 1-sentence analytical explanation for each dimension grounded in these exact scores.
Return ONLY a valid JSON object matching this schema without markdown fences:
{
  "overall": "1-sentence summary",
  "fundamental": "1-sentence explanation",
  "valuation": "1-sentence explanation",
  "growth": "1-sentence explanation",
  "technical": "1-sentence explanation",
  "risk": "1-sentence explanation"
}`;

      const res = await model.invoke(prompt);
      let content = typeof res.content === 'string' ? res.content.trim() : JSON.stringify(res.content);
      if (content.startsWith('```json')) content = content.replace(/^```json/, '').replace(/```$/, '').trim();
      else if (content.startsWith('```')) content = content.replace(/^```/, '').replace(/```$/, '').trim();

      const parsed = JSON.parse(content);
      return {
        overall: parsed.overall || fallbackExplanations.overall,
        fundamental: parsed.fundamental || fallbackExplanations.fundamental,
        valuation: parsed.valuation || fallbackExplanations.valuation,
        growth: parsed.growth || fallbackExplanations.growth,
        technical: parsed.technical || fallbackExplanations.technical,
        risk: parsed.risk || fallbackExplanations.risk,
      };
    } catch {
      return fallbackExplanations;
    }
  }

  return fallbackExplanations;
}
