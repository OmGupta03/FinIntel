import {
  getHealthLabel,
  getPlainSummary,
  getBasicRiskNote,
  getOneLineDescription,
  getResearchViewMode,
  setResearchViewMode,
} from '../../../frontend/src/utils/researchHelpers.js';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[ASSERTION FAILED]: ${message}`);
  }
}

function runTests() {
  console.log('=== RUNNING RESEARCH HELPERS UNIT TESTS ===');

  // --------------------------------------------------------------------------
  // 1. getHealthLabel() Boundary Value Tests
  // --------------------------------------------------------------------------
  console.log('\nTesting getHealthLabel() boundary conditions...');

  // Boundary 70: Score >= 70 is "Good"
  const label70 = getHealthLabel(70);
  assert(label70.label === 'Good', `Expected score 70 to be "Good", got "${label70.label}"`);
  console.log('  [PASS] Boundary 70 returns "Good" (inclusive threshold)');

  const label69 = getHealthLabel(69);
  assert(label69.label === 'Average', `Expected score 69 to be "Average", got "${label69.label}"`);
  console.log('  [PASS] Score 69 returns "Average"');

  const label85 = getHealthLabel(85);
  assert(label85.label === 'Good', `Expected score 85 to be "Good", got "${label85.label}"`);
  console.log('  [PASS] Score 85 returns "Good"');

  // Boundary 50: Score >= 50 is "Average", < 50 is "Risky"
  const label50 = getHealthLabel(50);
  assert(label50.label === 'Average', `Expected score 50 to be "Average", got "${label50.label}"`);
  console.log('  [PASS] Boundary 50 returns "Average" (inclusive threshold)');

  const label49 = getHealthLabel(49);
  assert(label49.label === 'Risky', `Expected score 49 to be "Risky", got "${label49.label}"`);
  console.log('  [PASS] Score 49 returns "Risky"');

  const label20 = getHealthLabel(20);
  assert(label20.label === 'Risky', `Expected score 20 to be "Risky", got "${label20.label}"`);
  console.log('  [PASS] Score 20 returns "Risky"');

  // Undefined / Null / NaN handling -> "Not enough data yet"
  const labelUndefined = getHealthLabel(undefined);
  assert(
    labelUndefined.label === 'Not enough data yet',
    `Expected undefined to return "Not enough data yet", got "${labelUndefined.label}"`
  );
  console.log('  [PASS] Undefined score returns "Not enough data yet"');

  const labelNull = getHealthLabel(null as any);
  assert(
    labelNull.label === 'Not enough data yet',
    `Expected null to return "Not enough data yet", got "${labelNull.label}"`
  );
  console.log('  [PASS] Null score returns "Not enough data yet"');

  const labelNaN = getHealthLabel(NaN);
  assert(
    labelNaN.label === 'Not enough data yet',
    `Expected NaN to return "Not enough data yet", got "${labelNaN.label}"`
  );
  console.log('  [PASS] NaN score returns "Not enough data yet"');

  // --------------------------------------------------------------------------
  // 2. getPlainSummary() Primary vs Fallback Paths
  // --------------------------------------------------------------------------
  console.log('\nTesting getPlainSummary() primary and fallback paths...');

  // Primary path: report.plainSummary is present and valid
  const mockWithPlainSummary = {
    overview: { name: 'State Bank of India' },
    recommendation: 'BUY',
    plainSummary: 'State Bank of India demonstrates solid financial health and expanding loan growth for long-term investors.',
  };
  const primaryResult = getPlainSummary(mockWithPlainSummary, 'Good');
  assert(
    primaryResult === mockWithPlainSummary.plainSummary,
    'Expected primary path to return report.plainSummary directly'
  );
  console.log('  [PASS] Primary path returns report.plainSummary verbatim without string-munging');

  // Jargon guard test: plainSummary contains forbidden acronym (e.g. P/E, RSI)
  const mockWithJargonSummary = {
    overview: { name: 'Tata Motors' },
    recommendation: 'BUY',
    plainSummary: 'Tata Motors has an attractive P/E multiple and RSI oversold bounce potential.',
  };
  const jargonResult = getPlainSummary(mockWithJargonSummary, 'Good');
  assert(
    !jargonResult.includes('P/E') && !jargonResult.includes('RSI'),
    'Expected jargon guard to reject summary containing technical acronyms'
  );
  assert(
    jargonResult.includes('Tata Motors') && jargonResult.includes('attractive candidate'),
    'Expected jargon guard to fallback gracefully to clean beginner template'
  );
  console.log('  [PASS] Jargon drift guard rejects forbidden terms and invokes clean fallback');

  // Fallback path 1: plainSummary is missing (undefined) for BUY
  const mockFallbackBuy = {
    overview: { name: 'State Bank of India' },
    recommendation: 'BUY',
  };
  const fallbackBuyResult = getPlainSummary(mockFallbackBuy, 'Good');
  assert(
    fallbackBuyResult.includes('State Bank of India') &&
    fallbackBuyResult.includes('good financial stability') &&
    fallbackBuyResult.includes('attractive candidate'),
    `Unexpected fallback BUY output: "${fallbackBuyResult}"`
  );
  console.log('  [PASS] Fallback path for BUY generates complete grammatical sentence');

  // Fallback path: Not enough data yet
  const mockFallbackNoData = {
    overview: { name: 'New IPO Ltd' },
    recommendation: 'HOLD',
  };
  const fallbackNoDataResult = getPlainSummary(mockFallbackNoData, 'Not enough data yet');
  assert(
    fallbackNoDataResult.includes('limited financial trading history'),
    `Unexpected fallback No Data output: "${fallbackNoDataResult}"`
  );
  console.log('  [PASS] Fallback path for "Not enough data yet" generates data limitation note');

  // Fallback path 2: plainSummary is empty string for SELL
  const mockFallbackSell = {
    overview: { name: 'DebtHeavy Corp' },
    recommendation: 'SELL',
    plainSummary: '   ',
  };
  const fallbackSellResult = getPlainSummary(mockFallbackSell, 'Risky');
  assert(
    fallbackSellResult.includes('DebtHeavy Corp') &&
    fallbackSellResult.includes('profitability or valuation challenges') &&
    fallbackSellResult.includes('caution before committing'),
    `Unexpected fallback SELL output: "${fallbackSellResult}"`
  );
  console.log('  [PASS] Fallback path for SELL generates cautionary sentence');

  // Fallback path 3: plainSummary is missing for HOLD
  const mockFallbackHold = {
    overview: { name: 'Steady Utilities' },
    recommendation: 'HOLD',
  };
  const fallbackHoldResult = getPlainSummary(mockFallbackHold, 'Average');
  assert(
    fallbackHoldResult.includes('Steady Utilities') &&
    fallbackHoldResult.includes('stable core operations') &&
    fallbackHoldResult.includes('waiting for clearer entry points'),
    `Unexpected fallback HOLD output: "${fallbackHoldResult}"`
  );
  console.log('  [PASS] Fallback path for HOLD generates balanced sentence');

  // --------------------------------------------------------------------------
  // 3. getBasicRiskNote() All Three Fallback Branches
  // --------------------------------------------------------------------------
  console.log('\nTesting getBasicRiskNote() three fallback branches...');

  // Branch 1: Volatility metric is present
  const reportHighVol = {
    technicalAnalysis: { volatility30d: { value: 42.5 } },
  };
  const noteHighVol = getBasicRiskNote(reportHighVol);
  assert(
    noteHighVol.includes('higher-than-average price swings'),
    `Expected high volatility warning, got: "${noteHighVol}"`
  );
  console.log('  [PASS] Branch 1A: High volatility (>35%) correctly warned');

  const reportLowVol = {
    technicalAnalysis: { volatility30d: { value: 14.2 } },
  };
  const noteLowVol = getBasicRiskNote(reportLowVol);
  assert(
    noteLowVol.includes('relatively steady and low-volatility'),
    `Expected low volatility notice, got: "${noteLowVol}"`
  );
  console.log('  [PASS] Branch 1B: Low volatility (<18%) recognized as steady');

  const reportModVol = {
    technicalAnalysis: { volatility30d: { value: 24.0 } },
  };
  const noteModVol = getBasicRiskNote(reportModVol);
  assert(
    noteModVol.includes('within normal, moderate market ranges'),
    `Expected moderate volatility note, got: "${noteModVol}"`
  );
  console.log('  [PASS] Branch 1C: Moderate volatility categorized appropriately');

  // Branch 2: Volatility missing, but beta present
  const reportHighBeta = {
    technicalAnalysis: { volatility30d: undefined },
    financialMetrics: { beta: 1.55 },
  };
  const noteHighBeta = getBasicRiskNote(reportHighBeta);
  assert(
    noteHighBeta.includes('reacts more sharply than the broader market'),
    `Expected high beta note, got: "${noteHighBeta}"`
  );
  console.log('  [PASS] Branch 2: Volatility missing -> Beta fallback (>1.3) triggers');

  const reportLowBeta = {
    technicalAnalysis: null,
    financialMetrics: { beta: 0.65 },
  };
  const noteLowBeta = getBasicRiskNote(reportLowBeta);
  assert(
    noteLowBeta.includes('fluctuate less than the broader market'),
    `Expected low beta note, got: "${noteLowBeta}"`
  );
  console.log('  [PASS] Branch 2: Volatility missing -> Beta fallback (<0.8) triggers');

  // Branch 3: Both volatility and beta missing
  const reportBothMissing = {
    technicalAnalysis: undefined,
    financialMetrics: {},
  };
  const noteBothMissing = getBasicRiskNote(reportBothMissing);
  assert(
    noteBothMissing.includes('Standard market risk applies'),
    `Expected standard guidance fallback, got: "${noteBothMissing}"`
  );
  console.log('  [PASS] Branch 3: Both volatility and beta missing -> Standard guidance note returned');

  // --------------------------------------------------------------------------
  // 4. getOneLineDescription() Primary vs Fallback Paths
  // --------------------------------------------------------------------------
  console.log('\nTesting getOneLineDescription() primary and fallback paths...');

  // Primary path: overview.summary contains a full description
  const reportWithSummary = {
    overview: {
      name: 'Reliance Industries',
      summary: 'Reliance Industries Limited is an Indian multinational conglomerate headquartered in Mumbai. It has diverse businesses in energy and retail.',
    },
  };
  const descPrimary = getOneLineDescription(reportWithSummary);
  assert(
    descPrimary === 'Reliance Industries Limited is an Indian multinational conglomerate headquartered in Mumbai.',
    `Expected first sentence extraction, got: "${descPrimary}"`
  );
  console.log('  [PASS] Primary path extracts clean first sentence from corporate summary');

  // Fallback path: overview.summary is missing or empty
  const reportWithoutSummary = {
    overview: {
      name: 'FreshIPO Limited',
      exchange: 'NSE',
      sector: 'Renewable Energy',
      summary: '',
    },
  };
  const descFallback = getOneLineDescription(reportWithoutSummary);
  assert(
    descFallback.includes('FreshIPO Limited') &&
    descFallback.includes('listed on NSE') &&
    descFallback.includes('Renewable Energy sector'),
    `Unexpected fallback description: "${descFallback}"`
  );
  console.log('  [PASS] Fallback path generates informative exchange/sector sentence');

  console.log('\n=== ALL RESEARCH HELPERS TESTS PASSED (14/14 ASSERTIONS) ===\n');
}

runTests();
