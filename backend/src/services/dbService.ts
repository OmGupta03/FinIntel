import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { logger } from '../middleware/logger.js';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbDir = path.join(__dirname, '../../data');

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'research.db');

export interface HistoryRecord {
  id?: number;
  ticker: string;
  resolvedName: string;
  recommendation: string;
  confidenceScore: number;
  sector: string;
  timestamp: string;
  stateJson?: string;
}

export class DbService {
  private db: any = null;

  constructor() {
    this.initDatabase();
  }

  private initDatabase() {
    try {
      const { DatabaseSync } = require('node:sqlite');
      this.db = new DatabaseSync(dbPath);

      this.db.exec(`
        CREATE TABLE IF NOT EXISTS research_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          ticker TEXT NOT NULL,
          resolved_name TEXT NOT NULL,
          recommendation TEXT NOT NULL,
          confidence_score REAL NOT NULL,
          sector TEXT,
          timestamp TEXT NOT NULL,
          state_json TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_history_ticker ON research_history(ticker);
        CREATE INDEX IF NOT EXISTS idx_history_timestamp ON research_history(timestamp DESC);
      `);

      this.seedInitialHistory();
      logger.info(`SQLite persistence initialized at ${dbPath}`);
    } catch (err: any) {
      logger.warn(`Failed to initialize SQLite with node:sqlite (${err.message}). Falling back to JSON file storage.`);
      this.initJsonFallback();
    }
  }

  // Graceful JSON file fallback if node:sqlite has permission/platform limitations
  private jsonFilePath = path.join(dbDir, 'history.json');
  private fallbackStore: HistoryRecord[] = [];

  private initJsonFallback() {
    try {
      if (fs.existsSync(this.jsonFilePath)) {
        const raw = fs.readFileSync(this.jsonFilePath, 'utf-8');
        this.fallbackStore = JSON.parse(raw);
      } else {
        this.seedFallback();
      }
    } catch (err) {
      this.fallbackStore = [];
      this.seedFallback();
    }
  }

  private seedFallback() {
    const seed: HistoryRecord[] = [
      {
        ticker: 'NVDA',
        resolvedName: 'NVIDIA Corp. (NVDA)',
        recommendation: 'BUY',
        confidenceScore: 94.2,
        timestamp: '2026-09-10T14:30:00.000Z',
        sector: 'Semiconductors • Tech',
      },
      {
        ticker: 'TSLA',
        resolvedName: 'Tesla, Inc. (TSLA)',
        recommendation: 'BUY',
        confidenceScore: 82.1,
        timestamp: '2026-09-09T11:45:00.000Z',
        sector: 'Automotive • Energy',
      },
      {
        ticker: 'AAPL',
        resolvedName: 'Apple Inc. (AAPL)',
        recommendation: 'BUY',
        confidenceScore: 88.5,
        timestamp: '2026-09-08T10:15:00.000Z',
        sector: 'Consumer Electronics • Tech',
      },
      {
        ticker: 'AMZN',
        resolvedName: 'Amazon.com (AMZN)',
        recommendation: 'BUY',
        confidenceScore: 89.7,
        timestamp: '2026-09-07T13:10:00.000Z',
        sector: 'Consumer • Cloud',
      },
      {
        ticker: 'MRNA',
        resolvedName: 'Moderna (MRNA)',
        recommendation: 'SELL',
        confidenceScore: 61.4,
        timestamp: '2026-09-05T16:20:00.000Z',
        sector: 'Healthcare • Biotech',
      },
    ];
    this.fallbackStore = seed;
    this.persistJsonFallback();
  }

  private persistJsonFallback() {
    try {
      fs.writeFileSync(this.jsonFilePath, JSON.stringify(this.fallbackStore, null, 2), 'utf-8');
    } catch (err: any) {
      logger.error(`Error persisting json history: ${err.message}`);
    }
  }

  private seedInitialHistory() {
    if (!this.db) return;
    try {
      const countStmt = this.db.prepare('SELECT COUNT(*) as count FROM research_history');
      const result = countStmt.get();
      if (result && result.count === 0) {
        const insertStmt = this.db.prepare(`
          INSERT INTO research_history (ticker, resolved_name, recommendation, confidence_score, sector, timestamp)
          VALUES (?, ?, ?, ?, ?, ?)
        `);

        const seeds = [
          ['NVDA', 'NVIDIA Corp. (NVDA)', 'BUY', 94.2, 'Semiconductors • Tech', '2026-09-10T14:30:00.000Z'],
          ['TSLA', 'Tesla, Inc. (TSLA)', 'BUY', 82.1, 'Automotive • Energy', '2026-09-09T11:45:00.000Z'],
          ['AAPL', 'Apple Inc. (AAPL)', 'BUY', 88.5, 'Consumer Electronics • Tech', '2026-09-08T10:15:00.000Z'],
          ['AMZN', 'Amazon.com (AMZN)', 'BUY', 89.7, 'Consumer • Cloud', '2026-09-07T13:10:00.000Z'],
          ['MRNA', 'Moderna (MRNA)', 'SELL', 61.4, 'Healthcare • Biotech', '2026-09-05T16:20:00.000Z'],
        ];

        for (const s of seeds) {
          insertStmt.run(s[0], s[1], s[2], s[3], s[4], s[5]);
        }
        logger.info('Seeded durable research history with initial benchmark records.');
      }
    } catch (err: any) {
      logger.error(`Error seeding SQLite: ${err.message}`);
    }
  }

  async saveResearch(state: any): Promise<void> {
    if (!state || !state.ticker) return;

    const ticker = state.ticker;
    const resolvedName = state.resolvedName ? `${state.resolvedName} (${ticker})` : ticker;
    const recommendation = state.recommendation || 'HOLD';
    const confidenceScore = typeof state.confidenceScore === 'number' ? state.confidenceScore : 50;
    const sector = state.overview?.sector || 'Equities';
    const timestamp = state.timestamp || new Date().toISOString();
    const stateJson = JSON.stringify(state);

    if (this.db) {
      try {
        // Delete previous entry for same ticker to keep history fresh and deduplicated
        const delStmt = this.db.prepare('DELETE FROM research_history WHERE ticker = ?');
        delStmt.run(ticker);

        const insertStmt = this.db.prepare(`
          INSERT INTO research_history (ticker, resolved_name, recommendation, confidence_score, sector, timestamp, state_json)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        insertStmt.run(ticker, resolvedName, recommendation, confidenceScore, sector, timestamp, stateJson);
        logger.info(`Persisted research run for ${ticker} in SQLite database.`);
        return;
      } catch (err: any) {
        logger.error(`Failed to save research in SQLite: ${err.message}`);
      }
    }

    // Fallback path
    this.fallbackStore = this.fallbackStore.filter(item => item.ticker !== ticker);
    this.fallbackStore.unshift({
      ticker,
      resolvedName,
      recommendation,
      confidenceScore,
      sector,
      timestamp,
      stateJson,
    });
    this.persistJsonFallback();
  }

  async getHistory(limit = 20): Promise<HistoryRecord[]> {
    if (this.db) {
      try {
        const stmt = this.db.prepare(`
          SELECT ticker, resolved_name as resolvedName, recommendation, confidence_score as confidenceScore, sector, timestamp
          FROM research_history
          ORDER BY timestamp DESC
          LIMIT ?
        `);
        const rows = stmt.all(limit) as any[];
        if (rows && rows.length > 0) {
          return rows.map(r => ({
            ticker: r.ticker,
            resolvedName: r.resolvedName,
            recommendation: r.recommendation,
            confidenceScore: Number(r.confidenceScore),
            sector: r.sector || 'Equities',
            timestamp: r.timestamp,
          }));
        }
      } catch (err: any) {
        logger.error(`Error querying SQLite history: ${err.message}`);
      }
    }

    return this.fallbackStore.slice(0, limit);
  }

  async getSavedReport(ticker: string): Promise<any | null> {
    if (this.db) {
      try {
        const stmt = this.db.prepare('SELECT state_json FROM research_history WHERE ticker = ? ORDER BY timestamp DESC LIMIT 1');
        const row = stmt.get(ticker) as any;
        if (row && row.state_json) {
          return JSON.parse(row.state_json);
        }
      } catch (err: any) {
        logger.error(`Error reading saved report for ${ticker}: ${err.message}`);
      }
    }

    const found = this.fallbackStore.find(i => i.ticker.toUpperCase() === ticker.toUpperCase());
    if (found && found.stateJson) {
      try {
        return JSON.parse(found.stateJson);
      } catch {
        return null;
      }
    }
    return null;
  }
}

export const dbService = new DbService();
