import {
  calculateSMA,
  calculateEMA,
  calculateRSI,
  calculateMACD,
  calculateBollingerBands,
  calculateVolatility,
  computeTechnicalAnalysis,
} from '../utils/technicalAnalysis.js';
import { logger } from '../middleware/logger.js';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

async function runTechnicalTests() {
  logger.info('=== RUNNING TECHNICAL ANALYSIS MATHEMATICAL TESTS ===');

  // Test 1: SMA Calculation
  const testPrices = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
  const sma5 = calculateSMA(testPrices, 5);
  // Last 5: 16, 17, 18, 19, 20 -> Sum = 90 -> Mean = 18.00
  assert(!sma5.insufficientData, 'SMA5 should have sufficient data');
  assert(sma5.value === 18, `Expected SMA5 = 18, got ${sma5.value}`);
  logger.info(`[PASS] SMA calculation verified: ${sma5.value}`);

  // Test 2: SMA Insufficient Data
  const sma20 = calculateSMA(testPrices, 20);
  assert(sma20.insufficientData && sma20.value === null, 'SMA20 should flag insufficient data');
  logger.info('[PASS] SMA insufficient data flag verified');

  // Test 3: EMA Calculation
  const ema5 = calculateEMA(testPrices, 5);
  assert(!ema5.insufficientData && ema5.value !== null, 'EMA5 should calculate');
  const emaVal = ema5.value!;
  assert(emaVal > 17 && emaVal < 20, `EMA5 value in expected range: ${emaVal}`);
  logger.info(`[PASS] EMA calculation verified: ${emaVal}`);

  // Test 4: RSI Calculation with known data
  const rsiPrices: number[] = [];
  let current = 100;
  for (let i = 0; i < 30; i++) {
    current += (i % 2 === 0 ? 2 : -1); // Net positive
    rsiPrices.push(current);
  }
  const rsi = calculateRSI(rsiPrices, 14);
  assert(!rsi.insufficientData && rsi.value !== null, 'RSI should calculate');
  const rsiVal = rsi.value!;
  assert(rsiVal > 0 && rsiVal <= 100, `RSI should be between 0 and 100, got ${rsiVal}`);
  logger.info(`[PASS] RSI calculation verified: ${rsiVal}`);

  // Test 5: Bollinger Bands
  const bbPrices = Array.from({ length: 25 }, (_, i) => 100 + Math.sin(i) * 5);
  const bb = calculateBollingerBands(bbPrices, 20, 2);
  assert(!bb.insufficientData && bb.value !== null, 'Bollinger Bands should calculate');
  const bbVal = bb.value!;
  assert(bbVal.upper > bbVal.middle, 'Upper band must be greater than middle');
  assert(bbVal.middle > bbVal.lower, 'Middle band must be greater than lower');
  logger.info(`[PASS] Bollinger Bands verified: Upper=${bbVal.upper}, Mid=${bbVal.middle}, Lower=${bbVal.lower}`);

  // Test 6: Volatility Calculation
  const vol = calculateVolatility(bbPrices);
  assert(!vol.insufficientData && vol.value !== null, 'Volatility should calculate');
  const volVal = vol.value!;
  assert(volVal > 0, `Annualized volatility should be positive: ${volVal}%`);
  logger.info(`[PASS] Volatility calculation verified: ${volVal}%`);

  // Test 7: Full integration with Mock Bars
  const mockBars = Array.from({ length: 60 }, (_, i) => {
    const p = 150 + i * 0.5 + Math.sin(i) * 2;
    return {
      date: `2026-0${Math.floor(i / 28) + 1}-${(i % 28) + 1}`,
      close: p,
      high: p + 1.5,
      low: p - 1.5,
      volume: 1000000 + i * 10000,
    };
  });

  const fullTech = computeTechnicalAnalysis(mockBars);
  assert(!fullTech.sma20.insufficientData, 'SMA20 should succeed on 60 bars');
  assert(!fullTech.sma50.insufficientData, 'SMA50 should succeed on 60 bars');
  assert(fullTech.sma200.insufficientData, 'SMA200 should flag insufficient on 60 bars');
  assert(fullTech.trendSignal === 'BULLISH', `Upward series should be BULLISH, got ${fullTech.trendSignal}`);
  logger.info(`[PASS] Full technical analysis pipeline verified: ${fullTech.summary}`);

  logger.info('=== ALL TECHNICAL ANALYSIS UNIT TESTS PASSED ===');
  process.exit(0);
}

runTechnicalTests().catch((err) => {
  logger.error(`Technical tests failed: ${err.message}`);
  process.exit(1);
});
