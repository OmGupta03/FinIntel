/**
 * Stock Health Score Configuration & Weighting Model
 *
 * Overall Score = w_fundamental * Fundamental +
 *                 w_valuation   * Valuation +
 *                 w_growth      * Growth +
 *                 w_technical   * Technical +
 *                 w_risk        * Risk
 *
 * Sum of weights = 1.0 (100%)
 */

export interface DimensionWeight {
  fundamental: number;
  valuation: number;
  growth: number;
  technical: number;
  risk: number;
}

export const HEALTH_SCORE_WEIGHTS: DimensionWeight = {
  fundamental: 0.25, // Profitability, ROE, ROA, Cash conversion
  valuation: 0.20,   // P/E relative to industry, P/B, PEG
  growth: 0.20,      // Revenue growth, Earnings growth
  technical: 0.20,   // Trend alignment (SMA 20/50), RSI momentum, MACD
  risk: 0.15,        // Leverage (D/E), Liquidity (Current Ratio), Volatility
};

export const HEALTH_SCORE_THRESHOLDS = {
  // Fundamental Benchmarks
  roeExcellent: 0.20,   // >= 20%
  roeGood: 0.12,        // >= 12%
  roaGood: 0.06,        // >= 6%
  profitMarginHigh: 0.15, // >= 15%

  // Valuation Benchmarks
  peUndervalued: 15,
  peFair: 28,
  peStretched: 45,
  pegFair: 1.5,
  priceToBookFair: 4.0,

  // Growth Benchmarks
  revenueGrowthHigh: 0.20, // >= 20% YoY
  revenueGrowthGood: 0.08, // >= 8% YoY
  earningsGrowthHigh: 0.15,

  // Technical Benchmarks
  rsiOptimalMin: 45,
  rsiOptimalMax: 65,
  rsiOverbought: 75,
  rsiOversold: 30,

  // Risk Benchmarks
  currentRatioSafe: 1.5,
  currentRatioMin: 1.0,
  debtToEquitySafe: 100, // <= 100%
  debtToEquityHigh: 200,
  volatilityLow: 25,     // <= 25% annualized
  volatilityHigh: 50,
};
