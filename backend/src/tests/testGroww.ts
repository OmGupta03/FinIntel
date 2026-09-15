import { growwClient } from '../clients/growwClient.js';
import { logger } from '../middleware/logger.js';

async function testGroww() {
  console.log('Testing Groww Client Live Quote...');
  const ticker = 'SBIN.NS';
  const quote = await growwClient.getLiveQuote(ticker);
  console.log('Groww Live Quote for SBIN.NS:', quote);

  const reliance = await growwClient.getLiveQuote('RELIANCE.NS');
  console.log('Groww Live Quote for RELIANCE.NS:', reliance);
}

testGroww().catch(err => {
  console.error('Groww test failed:', err);
});
