import { Router } from 'express';
import { researchController } from '../controllers/researchController.js';

const router = Router();

// Streaming research endpoint (SSE - supports GET with headers and POST with body)
router.get('/stream', (req, res, next) => {
  researchController.streamResearch(req, res, next);
});
router.post('/stream', (req, res, next) => {
  researchController.streamResearch(req, res, next);
});

// Cache invalidation endpoint
router.post('/cache/invalidate', (req, res, next) => {
  researchController.invalidateCache(req, res, next);
});

// History endpoint
router.get('/history', (req, res, next) => {
  researchController.getHistory(req, res, next);
});

// Watchlist endpoint
router.get('/watchlist', (req, res, next) => {
  researchController.getWatchlist(req, res, next);
});

// AI Screener endpoints
router.post('/screener/parse', (req, res, next) => {
  researchController.parseScreener(req, res, next);
});
router.post('/screener/run', (req, res, next) => {
  researchController.runScreener(req, res, next);
});

// Downloadable PDF Stock Report endpoints (Feature Spec Addendum Section 4.5)
router.get('/:ticker/report/pdf', (req, res, next) => {
  researchController.downloadReportPdf(req, res, next);
});
router.get('/report/pdf', (req, res, next) => {
  researchController.downloadReportPdf(req, res, next);
});
router.get('/pdf', (req, res, next) => {
  researchController.downloadReportPdf(req, res, next);
});

export default router;
