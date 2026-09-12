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

  logger.info('=== ALL STOCK SCREENER TESTS PASSED ===');
  process.exit(0);
}

runScreenerTests().catch((err) => {
  logger.error(`Screener test failed: ${err.message}`);
  process.exit(1);
});
