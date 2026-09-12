import {
  computeHealthScore,
  calculateFundamentalScore,
  calculateValuationScore,
  calculateGrowthScore,
  calculateTechnicalScore,
  calculateRiskScore,
} from '../services/healthScore.js';
import { logger } from '../middleware/logger.js';
import { FinancialMetrics } from '../clients/yahooFinance.js';
import { TechnicalAnalysisResult } from '../utils/technicalAnalysis.js';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

async function runHealthScoreTests() {
  logger.info('=== RUNNING STOCK HEALTH SCORE REPRODUCIBILITY & FORMULA TESTS ===');

  const sampleMetrics: FinancialMetrics = {
    peRatio: 25,
    returnOnEquity: 0.25, // 25% (Excellent)
    returnOnAssets: 0.08, // 8% (Good)
    profitMargin: 0.18,   // 18% (High)
    freeCashFlow: 5000000000,
    revenueGrowth: 0.15,  // 15% (Good)
    earningsGrowth: 0.18, // 18% (High)
    currentRatio: 1.6,    // Safe
    debtToEquity: 80,     // Safe
  };

  const sampleTech: any = {
    currentPrice: 150,
    sma20: { value: 145, insufficientData: false },
    sma50: { value: 140, insufficientData: false },
    sma200: { value: 130, insufficientData: false },
    rsi14: { value: 55, insufficientData: false },
    macd: { value: { macd: 2.5, signal: 1.8, histogram: 0.7 }, insufficientData: false },
    annualizedVolatility: { value: 22, insufficientData: false },
  };

  // Test 1: Fundamental Sub-score
  const fundScore = calculateFundamentalScore(sampleMetrics);
  assert(fundScore >= 75 && fundScore <= 100, `Expected high fundamental score, got ${fundScore}`);
  logger.info(`[PASS] Fundamental score verified: ${fundScore}`);

  // Test 2: Growth Sub-score
  const growthScore = calculateGrowthScore(sampleMetrics);
  assert(growthScore >= 70 && growthScore <= 100, `Expected strong growth score, got ${growthScore}`);
  logger.info(`[PASS] Growth score verified: ${growthScore}`);

  // Test 3: Technical Sub-score
  const techScore = calculateTechnicalScore(sampleTech);
  assert(techScore >= 70 && techScore <= 100, `Expected bullish technical score, got ${techScore}`);
  logger.info(`[PASS] Technical score verified: ${techScore}`);

  // Test 4: Risk Sub-score
  const riskScore = calculateRiskScore(sampleMetrics, sampleTech);
  assert(riskScore >= 70 && riskScore <= 100, `Expected safe risk score, got ${riskScore}`);
  logger.info(`[PASS] Risk score verified: ${riskScore}`);

  // Test 5: 100% Reproducibility Test
  const run1 = computeHealthScore(sampleMetrics, sampleTech);
  const run2 = computeHealthScore(sampleMetrics, sampleTech);
  const run3 = computeHealthScore(sampleMetrics, sampleTech);

  assert(run1.overallScore === run2.overallScore && run2.overallScore === run3.overallScore, 'Score must be 100% deterministic');
  assert(JSON.stringify(run1.subScores) === JSON.stringify(run2.subScores), 'Sub-scores must match identically');
  logger.info(`[PASS] Reproducibility verified: 3 identical runs produced Overall=${run1.overallScore}, SubScores=${JSON.stringify(run1.subScores)}`);

  // Test 6: Stressed / Distressed Company test
  const distressedMetrics: FinancialMetrics = {
    peRatio: 95,
    returnOnEquity: -0.15,
    returnOnAssets: -0.05,
    profitMargin: -0.10,
    freeCashFlow: -1000000000,
    revenueGrowth: -0.12,
    earningsGrowth: -0.25,
    currentRatio: 0.7,
    debtToEquity: 350,
  };
  const distressedTech: any = {
    currentPrice: 30,
    sma20: { value: 38, insufficientData: false },
    sma50: { value: 45, insufficientData: false },
    rsi14: { value: 25, insufficientData: false },
    macd: { value: { macd: -3.5, signal: -2.0, histogram: -1.5 }, insufficientData: false },
    annualizedVolatility: { value: 65, insufficientData: false },
  };

  const distressedResult = computeHealthScore(distressedMetrics, distressedTech);
  assert(distressedResult.overallScore < 40, `Distressed profile must yield low score, got ${distressedResult.overallScore}`);
  logger.info(`[PASS] Distressed profile correctly penalized: Overall=${distressedResult.overallScore} (Fund=${distressedResult.subScores.fundamental}, Risk=${distressedResult.subScores.risk})`);

  logger.info('=== ALL STOCK HEALTH SCORE TESTS PASSED ===');
  process.exit(0);
}

runHealthScoreTests().catch((err) => {
  logger.error(`Health score tests failed: ${err.message}`);
  process.exit(1);
});
