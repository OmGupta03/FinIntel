import { HistoricalBar } from '../clients/yahooFinance.js';

export interface IndicatorValue<T> {
  value: T | null;
  insufficientData: boolean;
  notes?: string;
}

export interface MacdResult {
  macd: number;
  signal: number;
  histogram: number;
}

export interface BollingerBandsResult {
  upper: number;
  middle: number;
  lower: number;
  bandwidth: number;
}

export interface TechnicalAnalysisResult {
  currentPrice: number;
  sma20: IndicatorValue<number>;
  sma50: IndicatorValue<number>;
  sma200: IndicatorValue<number>;
  ema20: IndicatorValue<number>;
  rsi14: IndicatorValue<number>;
  macd: IndicatorValue<MacdResult>;
  bollingerBands: IndicatorValue<BollingerBandsResult>;
  fiftyTwoWeekHigh: IndicatorValue<number>;
  fiftyTwoWeekLow: IndicatorValue<number>;
  currentVolume: IndicatorValue<number>;
  averageVolume30d: IndicatorValue<number>;
  volumeRatio: IndicatorValue<number>; // Current / 30d Avg
  annualizedVolatility: IndicatorValue<number>; // Percentage (e.g. 24.5%)
  trendSignal: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  summary: string;
}

/**
 * Calculates Simple Moving Average for a given period.
 */
export function calculateSMA(prices: number[], period: number): IndicatorValue<number> {
  if (prices.length < period || period <= 0) {
    return { value: null, insufficientData: true, notes: `Requires at least ${period} data points (got ${prices.length})` };
  }
  const slice = prices.slice(prices.length - period);
  const sum = slice.reduce((acc, p) => acc + p, 0);
  return {
    value: Number((sum / period).toFixed(2)),
    insufficientData: false,
  };
}

/**
 * Calculates Exponential Moving Average for a given period.
 */
export function calculateEMA(prices: number[], period: number): IndicatorValue<number> {
  if (prices.length < period || period <= 0) {
    return { value: null, insufficientData: true, notes: `Requires at least ${period} data points (got ${prices.length})` };
  }
  const multiplier = 2 / (period + 1);
  
  // Seed with SMA of first 'period' elements
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;

  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema;
  }

  return {
    value: Number(ema.toFixed(2)),
    insufficientData: false,
  };
}

/**
 * Calculates series of EMAs for all valid points (used for MACD).
 */
function calculateEMASeries(prices: number[], period: number): number[] {
  if (prices.length < period) return [];
  const multiplier = 2 / (period + 1);
  const series: number[] = [];

  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  series.push(ema);

  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema;
    series.push(ema);
  }

  return series;
}

/**
 * Calculates 14-period RSI using Wilder's smoothed average.
 */
export function calculateRSI(prices: number[], period = 14): IndicatorValue<number> {
  if (prices.length < period + 1) {
    return { value: null, insufficientData: true, notes: `Requires at least ${period + 1} data points` };
  }

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = period + 1; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff >= 0) {
      avgGain = (avgGain * (period - 1) + diff) / period;
      avgLoss = (avgLoss * (period - 1)) / period;
    } else {
      avgGain = (avgGain * (period - 1)) / period;
      avgLoss = (avgLoss * (period - 1) + Math.abs(diff)) / period;
    }
  }

  if (avgLoss === 0) {
    return { value: 100, insufficientData: false };
  }

  const rs = avgGain / avgLoss;
  const rsi = 100 - (100 / (1 + rs));

  return {
    value: Number(rsi.toFixed(2)),
    insufficientData: false,
  };
}

/**
 * Calculates MACD (12, 26, 9).
 */
export function calculateMACD(prices: number[]): IndicatorValue<MacdResult> {
  const fastPeriod = 12;
  const slowPeriod = 26;
  const signalPeriod = 9;

  if (prices.length < slowPeriod + signalPeriod) {
    return {
      value: null,
      insufficientData: true,
      notes: `Requires at least ${slowPeriod + signalPeriod} data points (got ${prices.length})`,
    };
  }

  const fastEma = calculateEMASeries(prices, fastPeriod);
  const slowEma = calculateEMASeries(prices, slowPeriod);

  // Align series: fastEma starts at index (fastPeriod - 1), slowEma starts at (slowPeriod - 1)
  const offset = slowPeriod - fastPeriod;
  const macdLine: number[] = [];

  for (let i = 0; i < slowEma.length; i++) {
    macdLine.push(fastEma[i + offset] - slowEma[i]);
  }

  if (macdLine.length < signalPeriod) {
    return { value: null, insufficientData: true };
  }

  const signalLine = calculateEMASeries(macdLine, signalPeriod);
  const latestMacd = macdLine[macdLine.length - 1];
  const latestSignal = signalLine[signalLine.length - 1];
  const histogram = latestMacd - latestSignal;

  return {
    value: {
      macd: Number(latestMacd.toFixed(2)),
      signal: Number(latestSignal.toFixed(2)),
      histogram: Number(histogram.toFixed(2)),
    },
    insufficientData: false,
  };
}

/**
 * Calculates Bollinger Bands (20 periods, 2 standard deviations).
 */
export function calculateBollingerBands(prices: number[], period = 20, stdDevMultiplier = 2): IndicatorValue<BollingerBandsResult> {
  if (prices.length < period) {
    return { value: null, insufficientData: true, notes: `Requires at least ${period} data points` };
  }

  const slice = prices.slice(prices.length - period);
  const mean = slice.reduce((acc, p) => acc + p, 0) / period;
  const variance = slice.reduce((acc, p) => acc + Math.pow(p - mean, 2), 0) / period;
  const stdDev = Math.sqrt(variance);

  const upper = mean + stdDevMultiplier * stdDev;
  const lower = mean - stdDevMultiplier * stdDev;
  const bandwidth = mean > 0 ? ((upper - lower) / mean) * 100 : 0;

  return {
    value: {
      upper: Number(upper.toFixed(2)),
      middle: Number(mean.toFixed(2)),
      lower: Number(lower.toFixed(2)),
      bandwidth: Number(bandwidth.toFixed(2)),
    },
    insufficientData: false,
  };
}

/**
 * Calculates annualized volatility based on daily log returns.
 */
export function calculateVolatility(prices: number[]): IndicatorValue<number> {
  if (prices.length < 10) {
    return { value: null, insufficientData: true, notes: 'Requires at least 10 data points for volatility' };
  }

  const logReturns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    if (prices[i - 1] > 0 && prices[i] > 0) {
      logReturns.push(Math.log(prices[i] / prices[i - 1]));
    }
  }

  if (logReturns.length === 0) {
    return { value: null, insufficientData: true };
  }

  const mean = logReturns.reduce((acc, r) => acc + r, 0) / logReturns.length;
  const variance = logReturns.reduce((acc, r) => acc + Math.pow(r - mean, 2), 0) / (logReturns.length - 1);
  const dailyStdDev = Math.sqrt(variance);
  const annualized = dailyStdDev * Math.sqrt(252) * 100;

  return {
    value: Number(annualized.toFixed(2)),
    insufficientData: false,
  };
}

/**
 * Computes all technical indicators deterministically for a price history series.
 */
export function computeTechnicalAnalysis(bars: HistoricalBar[], currencySymbol = '₹'): TechnicalAnalysisResult {
  if (!bars || bars.length === 0) {
    const emptyNum: IndicatorValue<number> = { value: null, insufficientData: true, notes: 'No historical bars provided' };
    return {
      currentPrice: 0,
      sma20: emptyNum,
      sma50: emptyNum,
      sma200: emptyNum,
      ema20: emptyNum,
      rsi14: emptyNum,
      macd: { value: null, insufficientData: true },
      bollingerBands: { value: null, insufficientData: true },
      fiftyTwoWeekHigh: emptyNum,
      fiftyTwoWeekLow: emptyNum,
      currentVolume: emptyNum,
      averageVolume30d: emptyNum,
      volumeRatio: emptyNum,
      annualizedVolatility: emptyNum,
      trendSignal: 'NEUTRAL',
      summary: 'Insufficient historical data for technical analysis.',
    };
  }

  const closes = bars.map(b => b.close);
  const highs = bars.map(b => b.high !== undefined ? b.high : b.close);
  const lows = bars.map(b => b.low !== undefined ? b.low : b.close);
  const volumes = bars.map(b => b.volume || 0);

  const currentPrice = closes[closes.length - 1];
  const sma20 = calculateSMA(closes, 20);
  const sma50 = calculateSMA(closes, 50);
  const sma200 = calculateSMA(closes, 200);
  const ema20 = calculateEMA(closes, 20);
  const rsi14 = calculateRSI(closes, 14);
  const macd = calculateMACD(closes);
  const bollingerBands = calculateBollingerBands(closes, 20, 2);
  const annualizedVolatility = calculateVolatility(closes);

  // 52-Week High and Low (past 252 trading days max)
  const windowBars = bars.slice(-252);
  const highestHigh = Math.max(...windowBars.map(b => b.high !== undefined ? b.high : b.close));
  const lowestLow = Math.min(...windowBars.map(b => b.low !== undefined ? b.low : b.close));

  const fiftyTwoWeekHigh: IndicatorValue<number> = {
    value: Number(highestHigh.toFixed(2)),
    insufficientData: false,
  };
  const fiftyTwoWeekLow: IndicatorValue<number> = {
    value: Number(lowestLow.toFixed(2)),
    insufficientData: false,
  };

  // Volume metrics
  const currentVolumeVal = volumes[volumes.length - 1];
  const currentVolume: IndicatorValue<number> = {
    value: currentVolumeVal,
    insufficientData: false,
  };

  const volumeSlice30 = volumes.slice(-30);
  const avgVol = volumeSlice30.reduce((a, b) => a + b, 0) / volumeSlice30.length;
  const averageVolume30d: IndicatorValue<number> = {
    value: Math.round(avgVol),
    insufficientData: volumeSlice30.length < 5,
  };

  const volumeRatioVal = avgVol > 0 ? Number((currentVolumeVal / avgVol).toFixed(2)) : 1;
  const volumeRatio: IndicatorValue<number> = {
    value: volumeRatioVal,
    insufficientData: averageVolume30d.insufficientData,
  };

  // Deterministic trend signal synthesis
  let bullishPoints = 0;
  let bearishPoints = 0;

  if (sma20.value && currentPrice > sma20.value) bullishPoints++;
  else if (sma20.value) bearishPoints++;

  if (sma50.value && currentPrice > sma50.value) bullishPoints++;
  else if (sma50.value) bearishPoints++;

  if (sma50.value && sma200.value) {
    if (sma50.value > sma200.value) bullishPoints += 2; // Golden Cross territory
    else bearishPoints += 2; // Death Cross territory
  }

  if (rsi14.value) {
    if (rsi14.value >= 45 && rsi14.value <= 65) bullishPoints++;
    else if (rsi14.value > 70) bearishPoints++; // Overbought
    else if (rsi14.value < 30) bullishPoints++; // Oversold bounce potential
  }

  if (macd.value) {
    if (macd.value.histogram > 0) bullishPoints++;
    else bearishPoints++;
  }

  let trendSignal: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
  if (bullishPoints >= bearishPoints + 2) trendSignal = 'BULLISH';
  else if (bearishPoints >= bullishPoints + 2) trendSignal = 'BEARISH';

  const summary = `Price is currently ${currencySymbol}${currentPrice.toFixed(2)}. ` +
    (sma50.value ? `SMA 50 is ${currencySymbol}${sma50.value}. ` : '') +
    (rsi14.value ? `RSI 14 is ${rsi14.value} (${rsi14.value > 70 ? 'Overbought' : rsi14.value < 30 ? 'Oversold' : 'Neutral range'}). ` : '') +
    (macd.value ? `MACD histogram is ${macd.value.histogram > 0 ? 'positive' : 'negative'} (${macd.value.histogram}). ` : '') +
    `Overall technical bias: ${trendSignal}.`;

  return {
    currentPrice,
    sma20,
    sma50,
    sma200,
    ema20,
    rsi14,
    macd,
    bollingerBands,
    fiftyTwoWeekHigh,
    fiftyTwoWeekLow,
    currentVolume,
    averageVolume30d,
    volumeRatio,
    annualizedVolatility,
    trendSignal,
    summary,
  };
}
