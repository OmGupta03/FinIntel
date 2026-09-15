import { screenerService, matchesFilter, SCREENER_UNIVERSE } from '../services/screenerService.js';
import { logger } from '../middleware/logger.js';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

async function runScreenerTests() {
  logger.info('=== RUNNING AI STOCK SCREENER UNIT & FILTER TESTS ===');

  // Test 1: Exact PRD Example Query Parsing
  const exampleQuery = 'Find Indian IT companies with ROE above 15%, revenue growth above 10%, P/E below 30 and low debt.';
  logger.info(`Parsing query: "${exampleQuery}"`);

  const filter = await screenerService.parseQueryToFilter(exampleQuery);
  logger.info(`Parsed filter object: ${JSON.stringify(filter)}`);

  assert(filter.country?.toLowerCase() === 'india', `Country should be India, got ${filter.country}`);
  assert(filter.sector?.toUpperCase() === 'IT', `Sector should be IT, got ${filter.sector}`);
  assert(filter.roeMin === 15, `ROE min should be 15, got ${filter.roeMin}`);
  assert(filter.revenueGrowthMin === 10, `Revenue growth min should be 10, got ${filter.revenueGrowthMin}`);
  assert(filter.peMax === 30, `PE max should be 30, got ${filter.peMax}`);
  assert(filter.debtLevel === 'low', `Debt level should be low, got ${filter.debtLevel}`);
  logger.info('[PASS] Natural language parser extracted all constraints accurately.');

  // Test 2: Deterministic Filter Execution against universe
  const runResult = screenerService.runScreener(filter, SCREENER_UNIVERSE);
  logger.info(`Found ${runResult.matches.length} matching companies out of ${runResult.totalEvaluated} candidates:`);
  for (const m of runResult.matches) {
    logger.info(`- ${m.ticker} (${m.name}): ROE=${(m.roe! * 100).toFixed(1)}%, RevGrowth=${(m.revenueGrowth! * 100).toFixed(1)}%, P/E=${m.peRatio}, D/E=${m.debtToEquity}%`);
  }

  assert(runResult.matches.length >= 2, 'Should find at least 2 Indian IT matching companies (TCS, INFY, HCLTECH)');
  // Verify matching criteria
  for (const match of runResult.matches) {
    assert(match.country.toLowerCase() === 'india', 'Match must be India');
    assert(match.sector.toUpperCase() === 'IT', 'Match must be IT');
    assert((match.roe ?? 0) * 100 >= 15, 'Match ROE >= 15%');
    assert((match.revenueGrowth ?? 0) * 100 >= 10, 'Match Revenue Growth >= 10%');
    assert((match.peRatio ?? 999) <= 30, 'Match P/E <= 30');
    assert((match.debtToEquity ?? 999) <= 50, 'Match Debt <= 50%');
  }
  logger.info('[PASS] All matches strictly satisfy deterministic mathematical criteria.');

  // Test 3: Ranking order test (TCS should be #1 due to highest ROE 48%)
  assert(runResult.matches[0].ticker === 'TCS.NS', `Expected top ranked to be TCS.NS (highest ROE), got ${runResult.matches[0].ticker}`);
  logger.info(`[PASS] Deterministic ranking verified: Top match is ${runResult.matches[0].ticker}`);

  // Test 4: Unsupported filter surfacing
  const queryWithUnsupported = 'Find US Tech companies with insider trading signals and P/E below 40';
  const filterWithUnsupported = await screenerService.parseQueryToFilter(queryWithUnsupported);
  const unsupportedList = filterWithUnsupported.unsupportedFilters || [];
  assert(
    unsupportedList.length > 0,
    'Unsupported filter should be surfaced'
  );
  logger.info(`[PASS] Unsupported constraint correctly surfaced: "${unsupportedList[0]}"`);

  // Test 5: Casual/Beginner Prompt Handling (Spec Section 3.2 & 3.5)
  const beginnerQuery = 'Find me stocks which are currently growing and give good returns in 1 month.';
  logger.info(`Testing beginner query: "${beginnerQuery}"`);
  const beginnerFilter = await screenerService.parseQueryToFilter(beginnerQuery);
  assert(beginnerFilter.isBeginnerQuery === true, 'Filter must be recognized as beginner query');
  assert(beginnerFilter.revenueGrowthMin !== undefined, 'Beginner query must have revenue growth constraint');
  assert(beginnerFilter.roeMin !== undefined, 'Beginner query must have ROE constraint');

  const beginnerRun = screenerService.runScreener(beginnerFilter, SCREENER_UNIVERSE);
  assert(beginnerRun.matches.length > 0, 'Beginner prompt must return a non-empty ranked list of stocks');
  assert(beginnerRun.matches[0].beginnerExplanation !== undefined, 'Matches must include plain-language beginner explanation');
  logger.info(`[PASS] Beginner prompt successfully translated and returned ${beginnerRun.matches.length} candidates with plain-language explanations.`);
  logger.info(`Sample beginner explanation: "${beginnerRun.matches[0].beginnerExplanation}"`);

  // Test 6: Ambiguous Query Handling (Spec Section 3.5)
  const ambiguousQuery = 'hello what is this';
  const ambiguousFilter = await screenerService.parseQueryToFilter(ambiguousQuery);
  assert(ambiguousFilter.isAmbiguous === true, 'Ambiguous query must be flagged as ambiguous');
  assert(Array.isArray(ambiguousFilter.suggestedPrompts) && ambiguousFilter.suggestedPrompts.length > 0, 'Ambiguous query must provide suggested prompts');
  logger.info(`[PASS] Ambiguous query correctly intercepted with ${ambiguousFilter.suggestedPrompts?.length} suggested prompt chips.`);

  // Test 7: Safe stocks for a beginner query test
  const safeQuery = 'Show me safe, low-risk stocks with steady profits for a beginner.';
  const safeFilter = await screenerService.parseQueryToFilter(safeQuery);
  assert(safeFilter.isBeginnerQuery === true, 'Safe stocks query must be beginner query');
  assert(safeFilter.debtLevel === 'low', 'Safe stocks query must have low debt constraint');
  const safeRun = screenerService.runScreener(safeFilter, SCREENER_UNIVERSE);
  assert(safeRun.matches.length > 0, 'Safe stocks prompt must return matching candidates');
  logger.info(`[PASS] Safe stocks beginner query matched ${safeRun.matches.length} low-debt candidates.`);

  // Test 8: Which Indian IT companies have steady growth query test
  const itSteadyQuery = 'Which Indian IT companies have steady growth and low debt?';
  const itSteadyFilter = await screenerService.parseQueryToFilter(itSteadyQuery);
  assert(itSteadyFilter.country?.toLowerCase() === 'india', 'Must filter to India');
  assert(itSteadyFilter.sector?.toUpperCase() === 'IT', 'Must filter to IT');
  assert(itSteadyFilter.debtLevel === 'low', 'Must filter to low debt');
  const itSteadyRun = screenerService.runScreener(itSteadyFilter, SCREENER_UNIVERSE);
  assert(itSteadyRun.matches.length >= 2, 'Must match at least 2 Indian IT companies with low debt');
  logger.info(`[PASS] Indian IT steady growth query matched ${itSteadyRun.matches.length} candidates.`);

  logger.info('=== ALL STOCK SCREENER TESTS PASSED ===');
  process.exit(0);
}

runScreenerTests().catch((err) => {
  logger.error(`Screener test failed: ${err.message}`);
  process.exit(1);
});
