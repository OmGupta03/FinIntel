/**
 * Plain-language helper utilities for the Beginner-Friendly (Simple View)
 * Research Terminal experience, in accordance with the Research Brief spec.
 */

export const STORAGE_KEY_VIEW_MODE = 'alphainsight_research_view_mode';
export const LEGACY_STORAGE_KEY_VIEW_MODE = 'finintel_research_view_mode';

export interface HealthLabelInfo {
  label: 'Good' | 'Average' | 'Risky' | 'Not enough data yet';
  badgeClass: string;
  dotClass: string;
  explanation: string;
}

export const FORBIDDEN_JARGON_PATTERNS = [
  /\bP\/E\b/i,
  /\bROE\b/i,
  /\bROA\b/i,
  /\bRSI\b/i,
  /\bMACD\b/i,
  /\bEBITDA\b/i,
  /\bEPS\b/i,
  /\bSMA\b/i,
  /\bEMA\b/i,
  /\bmoving average\b/i,
  /\bbasis points\b/i,
];

export function containsJargon(text: string): boolean {
  if (!text) return false;
  return FORBIDDEN_JARGON_PATTERNS.some((regex) => regex.test(text));
}

/**
 * Translates a 0-100 quantitative health score into a beginner-friendly
 * 3-tier categorical health assessment with plain explanation.
 *
 * Boundary Behavior:
 * - undefined / null / NaN returns "Not enough data yet".
 * - Exactly 70 returns "Good" (inclusive threshold: score >= 70 is Good, score 69 is Average).
 * - Exactly 50 returns "Average" (inclusive threshold: score >= 50 is Average, score 49 is Risky).
 * - Score < 50 returns "Risky".
 */
export function getHealthLabel(score?: number): HealthLabelInfo {
  if (score === undefined || score === null || (typeof score === 'number' && isNaN(score))) {
    return {
      label: 'Not enough data yet',
      badgeClass: 'text-slate-700 bg-slate-100 border-slate-200',
      dotClass: 'bg-slate-400',
      explanation: 'Insufficient historical financial data is currently available to compute a reliable health score.',
    };
  }

  // Boundary check: 70 is the inclusive lower bound for "Good"
  if (score >= 70) {
    return {
      label: 'Good',
      badgeClass: 'text-emerald-700 bg-emerald-50 border-emerald-200',
      dotClass: 'bg-emerald-500',
      explanation: 'The company demonstrates sound financial health, manageable debt, and consistent profitability.',
    };
  }

  // Boundary check: 50 is the inclusive lower bound for "Average"
  if (score >= 50) {
    return {
      label: 'Average',
      badgeClass: 'text-amber-700 bg-amber-50 border-amber-200',
      dotClass: 'bg-amber-500',
      explanation: 'The company maintains stable operations, but mixed financial signals or market headwinds suggest patience.',
    };
  }

  return {
    label: 'Risky',
    badgeClass: 'text-rose-700 bg-rose-50 border-rose-200',
    dotClass: 'bg-rose-500',
    explanation: 'The company shows elevated financial vulnerability or valuation friction; extra caution is advised.',
  };
}

/**
 * Returns a standalone, beginner-friendly 1-2 sentence investment takeaway.
 * Prefers the dedicated LLM-generated plainSummary field.
 * Falls back gracefully to structured templating without string-substitution hacks.
 */
export function getPlainSummary(report: any, healthLabel: 'Good' | 'Average' | 'Risky' | 'Not enough data yet'): string {
  if (
    report?.plainSummary &&
    typeof report.plainSummary === 'string' &&
    report.plainSummary.trim().length > 10 &&
    !containsJargon(report.plainSummary)
  ) {
    return report.plainSummary.trim();
  }

  const name = report?.overview?.name || report?.resolvedName || report?.ticker || 'This company';
  const rec = (report?.recommendation || 'HOLD').toUpperCase();

  if (healthLabel === 'Not enough data yet') {
    return `${name} has limited financial trading history available. Review business reports carefully before committing investment capital.`;
  }

  if (rec === 'BUY') {
    return `${name} shows ${healthLabel.toLowerCase()} financial stability and constructive business momentum, making it an attractive candidate for long-term investors.`;
  }

  if (rec === 'SELL') {
    return `${name} faces noticeable profitability or valuation challenges, suggesting caution before committing fresh investment capital.`;
  }

  return `${name} maintains stable core operations, but mixed market signals suggest waiting for clearer entry points before taking a position.`;
}

/**
 * Generates an intuitive, plain-language risk note without technical ratios or jargon.
 * Gracefully handles missing volatility or beta metrics.
 */
export function getBasicRiskNote(report: any): string {
  const vol = report?.technicalAnalysis?.volatility30d?.value;

  if (typeof vol === 'number' && !isNaN(vol) && vol > 0) {
    if (vol >= 35) {
      return 'This stock has experienced higher-than-average price swings recently. Expect wider day-to-day fluctuations.';
    }
    if (vol <= 18) {
      return 'Price movements have been relatively steady and low-volatility over the past month.';
    }
    return 'Price fluctuations have remained within normal, moderate market ranges over recent weeks.';
  }

  // Graceful fallback when technical volatility is not present
  const beta = report?.financialMetrics?.beta;
  if (typeof beta === 'number' && !isNaN(beta)) {
    if (beta > 1.3) {
      return 'This stock typically reacts more sharply than the broader market to economic news.';
    }
    if (beta < 0.8) {
      return 'This stock tends to fluctuate less than the broader market during typical trading sessions.';
    }
  }

  return 'Standard market risk applies. Share prices fluctuate based on broader economic cycles and company earnings.';
}

/**
 * Returns a concise, plain-English 1-line description of the company.
 */
export function getOneLineDescription(report: any): string {
  if (report?.overview?.summary && typeof report.overview.summary === 'string' && report.overview.summary.trim()) {
    const firstSentence = report.overview.summary.split(/\.\s+/)[0];
    if (firstSentence && firstSentence.length > 20 && firstSentence.length < 180) {
      return firstSentence.endsWith('.') ? firstSentence : `${firstSentence}.`;
    }
  }

  const name = report?.overview?.name || report?.resolvedName || report?.ticker || 'The company';
  const exchange = report?.overview?.exchange || 'equity';
  const sector = report?.overview?.sector ? ` within the ${report.overview.sector} sector` : '';

  return `${name} is an established publicly traded enterprise listed on ${exchange}${sector}.`;
}

/**
 * Retrieves the user's preferred research view mode ('simple' by default).
 * Inspects primary branded key, with fallback to legacy key.
 */
export function getResearchViewMode(): 'simple' | 'advanced' {
  if (typeof window === 'undefined') return 'simple';
  try {
    const saved = localStorage.getItem(STORAGE_KEY_VIEW_MODE) || localStorage.getItem(LEGACY_STORAGE_KEY_VIEW_MODE);
    if (saved === 'advanced') return 'advanced';
    return 'simple';
  } catch {
    return 'simple';
  }
}

/**
 * Persists the user's preferred research view mode.
 */
export function setResearchViewMode(mode: 'simple' | 'advanced'): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_VIEW_MODE, mode);
  } catch (err) {
    console.error('Failed to save research view mode:', err);
  }
}
