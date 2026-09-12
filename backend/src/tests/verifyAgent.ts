import { researchAgent } from '../agents/researchAgent.js';
import { logger } from '../middleware/logger.js';

async function verifyAgentSimulation() {
  logger.info('--- SPARKING AGENT GRAPH SIMULATION TEST (ENHANCED PIPELINE) ---');
  const startTime = Date.now();

  try {
    // Run the agent graph with a mock query
    const stream = await researchAgent.stream({
      companyName: 'Apple Inc',
      ticker: '',
      resolvedName: '',
      overview: null,
      financialMetrics: null,
      historicalPrices: [],
      news: [],
      technicalAnalysis: undefined,
      financialAnalysis: '',
      sentimentAnalysis: '',
      newsIntelligence: undefined,
      healthScore: undefined,
      competitors: undefined,
      swotAnalysis: { strengths: [], weaknesses: [], opportunities: [], threats: [] },
      bullCase: [],
      bearCase: [],
      recommendation: '',
      confidenceScore: 0,
      reasoning: '',
      logs: [],
      currentStep: 'Start',
      error: undefined,
    }, {
      streamMode: 'values',
    });

    let lastStep = 'Start';
    let finalState: any = null;

    for await (const state of stream) {
      finalState = state;
      if (state.currentStep !== lastStep) {
        logger.info(`[TEST PIPELINE] Transitioned to step: "${state.currentStep}"`);
        lastStep = state.currentStep;
      }
    }

    if (!finalState) {
      throw new Error('Graph execution returned no state.');
    }

    logger.info('--- GRAPH RESULTS ---');
    logger.info(`Resolved Name: ${finalState.resolvedName}`);
    logger.info(`Resolved Ticker: ${finalState.ticker}`);
    logger.info(`Recommendation: ${finalState.recommendation}`);
    logger.info(`Confidence Score: ${finalState.confidenceScore}%`);
    logger.info(`SWOT Strengths count: ${finalState.swotAnalysis.strengths.length}`);
    logger.info(`Bull Case points count: ${finalState.bullCase?.length ?? 0}`);
    logger.info(`Bear Case points count: ${finalState.bearCase?.length ?? 0}`);
    logger.info(`Health Score: ${finalState.healthScore?.overallScore ?? 'N/A'}/100`);
    logger.info(`Technical RSI: ${finalState.technicalAnalysis?.rsi14?.value ?? 'N/A'}`);
    logger.info(`Competitor peers count: ${finalState.competitors?.peers?.length ?? 0}`);
    logger.info(`Total logs generated: ${finalState.logs.length}`);

    // Validate key outputs
    if (finalState.ticker !== 'AAPL') {
      throw new Error(`Expected resolved ticker AAPL, got: ${finalState.ticker}`);
    }
    if (!['BUY', 'HOLD', 'SELL'].includes(finalState.recommendation)) {
      throw new Error(`Invalid recommendation decision: ${finalState.recommendation}`);
    }
    if (finalState.confidenceScore < 0 || finalState.confidenceScore > 100) {
      throw new Error(`Confidence score out of bounds: ${finalState.confidenceScore}`);
    }

    // Feature 1 validation: Technical indicators
    if (!finalState.technicalAnalysis) {
      throw new Error('Technical analysis was not computed');
    }
    if (finalState.technicalAnalysis.currentPrice <= 0) {
      throw new Error(`Invalid technical current price: ${finalState.technicalAnalysis.currentPrice}`);
    }

    // Feature 2 validation: Stock Health Score
    if (!finalState.healthScore || typeof finalState.healthScore.overallScore !== 'number') {
      throw new Error('Stock Health Score was not computed');
    }
    if (finalState.healthScore.overallScore < 0 || finalState.healthScore.overallScore > 100) {
      throw new Error(`Health Score out of bounds: ${finalState.healthScore.overallScore}`);
    }

    // Feature 3 validation: Bull vs Bear cases
    if (!finalState.bullCase || finalState.bullCase.length < 2) {
      throw new Error(`Expected at least 2 Bull Case points, got: ${finalState.bullCase?.length}`);
    }
    if (!finalState.bearCase || finalState.bearCase.length < 2) {
      throw new Error(`Expected at least 2 Bear Case points, got: ${finalState.bearCase?.length}`);
    }

    // Feature 4 validation: Competitors
    if (!finalState.competitors || finalState.competitors.peers.length < 2) {
      throw new Error(`Expected at least 2 peer comparison entries, got: ${finalState.competitors?.peers?.length}`);
    }

    // Feature 5 validation: News intelligence
    if (!finalState.newsIntelligence || typeof finalState.newsIntelligence.aggregateSentimentScore !== 'number') {
      throw new Error('News intelligence aggregate sentiment was not computed');
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    logger.info(`[SUCCESS] Enhanced agent verification script passed all acceptance criteria in ${duration}s.`);
    process.exit(0);
  } catch (error: any) {
    logger.error(`[FAILURE] Agent verification failed: ${error.message}`);
    process.exit(1);
  }
}

// Run verification
verifyAgentSimulation();
