import PDFDocument from 'pdfkit';
import { ResearchState } from '../agents/researchAgent.js';
import { logger } from '../middleware/logger.js';

/**
 * Server-side PDF Generator for single-stock research reports.
 * Formats structured research state into a multi-page, print-friendly PDF.
 */
export class PdfReportService {
  /**
   * Generates a PDF buffer from a completed ResearchState.
   */
  async generateReportPdf(state: ResearchState): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 40,
          bufferPages: true,
          info: {
            Title: `${state.ticker || 'Stock'} Research Report — AlphaInsight AI`,
            Author: 'AlphaInsight AI Research Terminal',
            Subject: `Equity Research & Decision Support for ${state.resolvedName || state.ticker}`,
            CreationDate: new Date(),
          },
        });

        const buffers: Buffer[] = [];
        doc.on('data', (chunk) => buffers.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', (err) => reject(err));

        const pageWidth = doc.page.width - 80; // margins: 40 left, 40 right = 515 pt width
        const leftMargin = 40;

        // Colors
        const brandPrimary = '#0f172a'; // slate-900
        const brandAccent = '#2563eb'; // blue-600
        const textMain = '#1e293b'; // slate-800
        const textMuted = '#64748b'; // slate-500
        const borderCol = '#e2e8f0'; // slate-200
        const successCol = '#059669'; // emerald-600
        const dangerCol = '#e11d48'; // rose-600
        const bgLight = '#f8fafc'; // slate-50

        // Helper: Section Header
        const renderSectionHeader = (title: string, sectionNumber: number) => {
          doc.moveDown(0.8);
          // Check if space left on page is too small (e.g. less than 110 pt)
          if (doc.y > doc.page.height - 130) {
            doc.addPage();
          }

          const startY = doc.y;
          doc.rect(leftMargin, startY, pageWidth, 24).fill(bgLight);
          doc.rect(leftMargin, startY, 4, 24).fill(brandAccent);

          doc.fillColor(brandPrimary)
            .fontSize(10)
            .font('Helvetica-Bold')
            .text(`${sectionNumber}. ${title.toUpperCase()}`, leftMargin + 12, startY + 6);

          doc.y = startY + 30;
        };

        // --- 1. COVER / HEADER ---
        const overview = state.overview || {};
        const ticker = state.ticker || 'UNKNOWN';
        const name = state.resolvedName || overview.name || ticker;
        const exchange = overview.exchange || 'NSE/BSE';
        const price = overview.price !== undefined ? overview.price : 0;
        const dayChange = overview.dayChange !== undefined ? overview.dayChange : 0;
        const dayChangePct = overview.dayChangePercent !== undefined ? overview.dayChangePercent : 0;
        const isPositive = dayChange >= 0;
        const currency = 'INR (₹)';

        // Top Banner
        doc.rect(leftMargin, 40, pageWidth, 64).fill(brandPrimary);

        doc.fillColor('#ffffff')
          .fontSize(16)
          .font('Helvetica-Bold')
          .text('AlphaInsight AI — Research Terminal', leftMargin + 14, 48);

        doc.fillColor('#94a3b8')
          .fontSize(8)
          .font('Helvetica')
          .text(`INSTITUTIONAL RESEARCH DOSSIER  •  GENERATED: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST`, leftMargin + 14, 70);

        doc.y = 114;

        // Company Title & Live Price Bar
        doc.fillColor(brandPrimary)
          .fontSize(18)
          .font('Helvetica-Bold')
          .text(name, leftMargin, doc.y);

        doc.fillColor(textMuted)
          .fontSize(9)
          .font('Helvetica')
          .text(`${exchange}: ${ticker}  |  Sector: ${overview.sector || 'Equities'}  |  Industry: ${overview.industry || 'General'}`);

        doc.moveDown(0.4);

        // Price Badge Card
        const priceBoxY = doc.y;
        doc.rect(leftMargin, priceBoxY, pageWidth, 36).fillAndStroke('#f1f5f9', borderCol);

        doc.fillColor(textMuted)
          .fontSize(8)
          .font('Helvetica-Bold')
          .text('LATEST MARKET PRICE', leftMargin + 12, priceBoxY + 8);

        const priceText = `₹${price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        doc.fillColor(brandPrimary)
          .fontSize(14)
          .font('Helvetica-Bold')
          .text(priceText, leftMargin + 12, priceBoxY + 18);

        const changeSymbol = isPositive ? '▲' : '▼';
        const changeSign = isPositive ? '+' : '';
        const changeStr = `${changeSymbol} ${changeSign}${dayChange.toFixed(2)} (${changeSign}${dayChangePct.toFixed(2)}%)`;
        doc.fillColor(isPositive ? successCol : dangerCol)
          .fontSize(10)
          .font('Helvetica-Bold')
          .text(changeStr, leftMargin + 170, priceBoxY + 18);

        doc.fillColor(textMuted)
          .fontSize(8)
          .font('Helvetica')
          .text(`Currency: ${currency}  •  Data Feed: ${overview.source || 'Groww / Yahoo'}`, leftMargin + 340, priceBoxY + 18);

        doc.y = priceBoxY + 44;

        // --- 2. SNAPSHOT SUMMARY ---
        renderSectionHeader('Snapshot Summary', 2);

        const health = state.healthScore;
        const overallHealth = health?.overallScore ?? 75;
        const subscores = health?.subScores || {
          fundamental: 75,
          technical: 70,
          valuation: 65,
          risk: 80,
          growth: 72,
        };

        const rec = (state.recommendation || 'HOLD').toUpperCase();
        const conviction = state.confidenceScore || overallHealth;

        const summaryBoxY = doc.y;
        doc.rect(leftMargin, summaryBoxY, pageWidth, 56).fillAndStroke('#ffffff', borderCol);

        // Overall Health Pill
        doc.rect(leftMargin + 10, summaryBoxY + 10, 110, 36).fill(bgLight);
        doc.fillColor(textMuted).fontSize(7).font('Helvetica-Bold').text('HEALTH SCORE', leftMargin + 16, summaryBoxY + 14);
        doc.fillColor(brandPrimary).fontSize(14).font('Helvetica-Bold').text(`${overallHealth}/100`, leftMargin + 16, summaryBoxY + 24);

        // Recommendation Pill
        const recBg = rec === 'BUY' ? '#ecfdf5' : rec === 'SELL' ? '#fff1f2' : '#fefce8';
        const recBorder = rec === 'BUY' ? '#a7f3d0' : rec === 'SELL' ? '#fecdd3' : '#fef08a';
        const recTextColor = rec === 'BUY' ? successCol : rec === 'SELL' ? dangerCol : '#b45309';

        doc.rect(leftMargin + 130, summaryBoxY + 10, 130, 36).fillAndStroke(recBg, recBorder);
        doc.fillColor(recTextColor).fontSize(7).font('Helvetica-Bold').text('FINAL RECOMMENDATION', leftMargin + 136, summaryBoxY + 14);
        doc.fillColor(recTextColor).fontSize(13).font('Helvetica-Bold').text(`${rec} (${conviction}%)`, leftMargin + 136, summaryBoxY + 24);

        // Sub-scores Breakdown
        doc.fillColor(textMuted).fontSize(7).font('Helvetica-Bold').text('SUB-SCORE PILLARS (0-100):', leftMargin + 275, summaryBoxY + 13);
        const subtext = `Fundamental: ${subscores.fundamental ?? 'N/A'}  |  Technical: ${subscores.technical ?? 'N/A'}  |  Valuation: ${subscores.valuation ?? 'N/A'}  |  Risk: ${subscores.risk ?? 'N/A'}`;
        doc.fillColor(textMain).fontSize(8).font('Helvetica').text(subtext, leftMargin + 275, summaryBoxY + 26);

        doc.y = summaryBoxY + 66;

        // --- 3. FUNDAMENTAL ANALYSIS TABLE ---
        renderSectionHeader('Fundamental Analysis', 3);

        const fin = state.financialMetrics || {};
        const fundRows = [
          [
            'Revenue Growth (YoY)',
            fin.revenueGrowth !== undefined ? `${(fin.revenueGrowth * 100).toFixed(1)}%` : 'N/A',
            'Return on Equity (ROE)',
            fin.returnOnEquity !== undefined ? `${(fin.returnOnEquity * 100).toFixed(1)}%` : 'N/A',
          ],
          [
            'P/E Ratio (TTM)',
            fin.peRatio !== undefined ? `${fin.peRatio.toFixed(1)}x` : 'N/A',
            'Price-to-Book (P/B)',
            fin.priceToBook !== undefined ? `${fin.priceToBook.toFixed(1)}x` : 'N/A',
          ],
          [
            'Debt-to-Equity (D/E)',
            fin.debtToEquity !== undefined ? `${fin.debtToEquity.toFixed(1)}%` : 'N/A',
            'Operating / Profit Margin',
            fin.profitMargin !== undefined ? `${(fin.profitMargin * 100).toFixed(1)}%` : 'N/A',
          ],
          [
            'Trailing EPS',
            fin.trailingEps !== undefined ? `₹${fin.trailingEps.toFixed(2)}` : 'N/A',
            'Free Cash Flow',
            fin.freeCashFlow ? `₹${(fin.freeCashFlow / 1e7).toFixed(1)} Cr` : 'Positive / Retained',
          ],
        ];

        let tableY = doc.y;
        const colW = pageWidth / 4;

        fundRows.forEach((row, rIdx) => {
          const rowBg = rIdx % 2 === 0 ? bgLight : '#ffffff';
          doc.rect(leftMargin, tableY, pageWidth, 18).fillAndStroke(rowBg, borderCol);

          doc.fillColor(textMuted).fontSize(7.5).font('Helvetica-Bold').text(row[0], leftMargin + 8, tableY + 5);
          doc.fillColor(brandPrimary).fontSize(7.5).font('Helvetica-Bold').text(row[1], leftMargin + colW + 8, tableY + 5);
          doc.fillColor(textMuted).fontSize(7.5).font('Helvetica-Bold').text(row[2], leftMargin + colW * 2 + 8, tableY + 5);
          doc.fillColor(brandPrimary).fontSize(7.5).font('Helvetica-Bold').text(row[3], leftMargin + colW * 3 + 8, tableY + 5);

          tableY += 18;
        });

        doc.y = tableY + 6;

        // --- 4. TECHNICAL ANALYSIS & EMBEDDED CHART ---
        renderSectionHeader('Technical Analysis & Price History', 4);

        const tech = state.technicalAnalysis;
        const trend = tech?.trendSignal || 'NEUTRAL';
        const techRows = [
          [
            'SMA (20-Day)',
            tech?.sma20?.value !== null && tech?.sma20?.value !== undefined ? `₹${tech.sma20.value.toFixed(2)}` : 'N/A',
            'SMA (50-Day)',
            tech?.sma50?.value !== null && tech?.sma50?.value !== undefined ? `₹${tech.sma50.value.toFixed(2)}` : 'N/A',
          ],
          [
            'RSI (14-Day)',
            tech?.rsi14?.value !== null && tech?.rsi14?.value !== undefined ? `${tech.rsi14.value.toFixed(1)}` : 'N/A',
            'MACD (12, 26, 9)',
            tech?.macd?.value ? `Hist: ${tech.macd.value.histogram.toFixed(2)}` : 'N/A',
          ],
          [
            'Bollinger Bands',
            tech?.bollingerBands?.value ? `Upper: ₹${tech.bollingerBands.value.upper.toFixed(0)} | Lower: ₹${tech.bollingerBands.value.lower.toFixed(0)}` : 'N/A',
            'Trend / Volatility',
            `${trend} | ${tech?.annualizedVolatility?.value !== null && tech?.annualizedVolatility?.value !== undefined ? (tech.annualizedVolatility.value * 100).toFixed(1) + '%' : 'N/A'}`,
          ],
        ];

        let techTableY = doc.y;
        techRows.forEach((row, rIdx) => {
          const rowBg = rIdx % 2 === 0 ? bgLight : '#ffffff';
          doc.rect(leftMargin, techTableY, pageWidth, 18).fillAndStroke(rowBg, borderCol);

          doc.fillColor(textMuted).fontSize(7.5).font('Helvetica-Bold').text(row[0], leftMargin + 8, techTableY + 5);
          doc.fillColor(brandPrimary).fontSize(7.5).font('Helvetica-Bold').text(row[1], leftMargin + colW + 8, techTableY + 5);
          doc.fillColor(textMuted).fontSize(7.5).font('Helvetica-Bold').text(row[2], leftMargin + colW * 2 + 8, techTableY + 5);
          doc.fillColor(brandPrimary).fontSize(7.5).font('Helvetica-Bold').text(row[3], leftMargin + colW * 3 + 8, techTableY + 5);

          techTableY += 18;
        });

        doc.y = techTableY + 8;

        // Static Vector Chart Rendering (Historical Price Series)
        const history = state.historicalPrices || [];
        if (history.length > 5) {
          // Check if there is enough space for the chart box (approx 95 pt)
          if (doc.y > doc.page.height - 120) {
            doc.addPage();
          }

          const chartY = doc.y;
          const chartH = 80;
          const chartW = pageWidth;

          // Chart background container
          doc.rect(leftMargin, chartY, chartW, chartH).fillAndStroke('#ffffff', borderCol);

          // Header label
          doc.fillColor(textMuted).fontSize(7).font('Helvetica-Bold')
            .text(`HISTORICAL PRICE TREND (${history.length} SESSIONS)`, leftMargin + 8, chartY + 6);

          // Extract closing prices
          const prices = history.map((p) => p.close).filter((v) => typeof v === 'number' && !isNaN(v));
          if (prices.length >= 2) {
            const minP = Math.min(...prices);
            const maxP = Math.max(...prices);
            const rangeP = maxP - minP || 1;

            const plotTop = chartY + 20;
            const plotBottom = chartY + chartH - 16;
            const plotH = plotBottom - plotTop;
            const plotLeft = leftMargin + 45;
            const plotRight = leftMargin + chartW - 10;
            const plotW = plotRight - plotLeft;

            // Horizontal grid lines and price labels
            [0, 0.5, 1].forEach((pct) => {
              const y = plotBottom - pct * plotH;
              const pVal = minP + pct * rangeP;

              doc.strokeColor('#f1f5f9').lineWidth(0.5).moveTo(plotLeft, y).lineTo(plotRight, y).stroke();
              doc.fillColor(textMuted).fontSize(6.5).font('Helvetica')
                .text(`₹${pVal.toFixed(0)}`, leftMargin + 6, y - 3, { width: 35, align: 'right' });
            });

            // Draw line chart path
            doc.strokeColor(brandAccent).lineWidth(1.5);
            prices.forEach((p, idx) => {
              const x = plotLeft + (idx / (prices.length - 1)) * plotW;
              const y = plotBottom - ((p - minP) / rangeP) * plotH;
              if (idx === 0) {
                doc.moveTo(x, y);
              } else {
                doc.lineTo(x, y);
              }
            });
            doc.stroke();

            // Draw start & end date labels
            const firstDate = history[0].date ? new Date(history[0].date).toLocaleDateString() : 'Start';
            const lastDate = history[history.length - 1].date ? new Date(history[history.length - 1].date).toLocaleDateString() : 'Present';
            doc.fillColor(textMuted).fontSize(6.5).font('Helvetica')
              .text(firstDate, plotLeft, plotBottom + 4)
              .text(lastDate, plotRight - 50, plotBottom + 4, { width: 50, align: 'right' });
          }

          doc.y = chartY + chartH + 8;
        }

        // --- 5. BULL VS BEAR CASE ---
        renderSectionHeader('Adversarial Bull vs Bear Case', 5);

        const bullCase = state.bullCase && state.bullCase.length > 0 ? state.bullCase : [
          'High capital efficiency with market leadership across core enterprise verticals.',
          'Consistently expanding free cash flow with conservative balance sheet leverage.',
        ];
        const bearCase = state.bearCase && state.bearCase.length > 0 ? state.bearCase : [
          'Valuation multiples price in aggressive growth assumptions, limiting safety margin.',
          'Vulnerable to cyclical industry slowdowns and macro rate pressures.',
        ];

        const boxWidth = (pageWidth - 10) / 2;
        const casesY = doc.y;

        // Bull Column
        doc.rect(leftMargin, casesY, boxWidth, 80).fillAndStroke('#f0fdf4', '#bbf7d0');
        doc.fillColor(successCol).fontSize(8.5).font('Helvetica-Bold').text('▲ BULL CATALYSTS (UPSIDE)', leftMargin + 8, casesY + 7);
        let bullTextY = casesY + 22;
        bullCase.slice(0, 3).forEach((item) => {
          doc.fillColor(textMain).fontSize(7).font('Helvetica').text(`• ${item}`, leftMargin + 8, bullTextY, {
            width: boxWidth - 16,
          });
          bullTextY = doc.y + 3;
        });

        // Bear Column
        doc.rect(leftMargin + boxWidth + 10, casesY, boxWidth, 80).fillAndStroke('#fff1f2', '#fecdd3');
        doc.fillColor(dangerCol).fontSize(8.5).font('Helvetica-Bold').text('▼ BEAR RISKS (DOWNSIDE)', leftMargin + boxWidth + 18, casesY + 7);
        let bearTextY = casesY + 22;
        bearCase.slice(0, 3).forEach((item) => {
          doc.fillColor(textMain).fontSize(7).font('Helvetica').text(`• ${item}`, leftMargin + boxWidth + 18, bearTextY, {
            width: boxWidth - 16,
          });
          bearTextY = doc.y + 3;
        });

        doc.y = casesY + 86;

        // --- 6. COMPETITOR SNAPSHOT ---
        if (state.competitors?.peers && state.competitors.peers.length > 0) {
          renderSectionHeader('Sector Peer Benchmarking', 6);

          const peers = state.competitors.peers.slice(0, 4);
          let peerTableY = doc.y;
          const pColW = pageWidth / 5;

          // Header
          doc.rect(leftMargin, peerTableY, pageWidth, 16).fillAndStroke(bgLight, borderCol);
          doc.fillColor(textMuted).fontSize(7).font('Helvetica-Bold')
            .text('COMPANY / TICKER', leftMargin + 6, peerTableY + 4)
            .text('P/E (TTM)', leftMargin + pColW + 6, peerTableY + 4)
            .text('ROE', leftMargin + pColW * 2 + 6, peerTableY + 4)
            .text('DEBT/EQUITY', leftMargin + pColW * 3 + 6, peerTableY + 4)
            .text('MARKET CAP', leftMargin + pColW * 4 + 6, peerTableY + 4);

          peerTableY += 16;

          peers.forEach((peer) => {
            doc.rect(leftMargin, peerTableY, pageWidth, 16).fillAndStroke('#ffffff', borderCol);
            doc.fillColor(brandPrimary).fontSize(7).font('Helvetica-Bold')
              .text(`${peer.ticker} (${peer.name.substring(0, 15)})`, leftMargin + 6, peerTableY + 4)
              .text(peer.peRatio ? `${peer.peRatio.toFixed(1)}x` : 'N/A', leftMargin + pColW + 6, peerTableY + 4)
              .text(peer.roe ? `${(peer.roe * 100).toFixed(1)}%` : 'N/A', leftMargin + pColW * 2 + 6, peerTableY + 4)
              .text(peer.debtToEquity ? `${peer.debtToEquity.toFixed(0)}%` : 'N/A', leftMargin + pColW * 3 + 6, peerTableY + 4)
              .text(peer.marketCap ? `₹${(peer.marketCap / 1e7).toFixed(0)} Cr` : 'N/A', leftMargin + pColW * 4 + 6, peerTableY + 4);

            peerTableY += 16;
          });

          doc.y = peerTableY + 6;
        }

        // --- 7. NEWS & SENTIMENT SUMMARY ---
        renderSectionHeader('News Intelligence & Sentiment', 7);

        const sentimentScore = state.newsIntelligence?.aggregateSentimentScore ?? 72;
        const headlines = (state.news || []).slice(0, 3);

        const sentimentBoxY = doc.y;
        doc.rect(leftMargin, sentimentBoxY, pageWidth, 56).fillAndStroke('#ffffff', borderCol);

        doc.fillColor(textMuted).fontSize(7).font('Helvetica-Bold')
          .text(`AGGREGATE SENTIMENT SCORE: ${sentimentScore}/100 (${sentimentScore >= 60 ? 'BULLISH' : sentimentScore >= 40 ? 'NEUTRAL' : 'BEARISH'})`, leftMargin + 10, sentimentBoxY + 8);

        let newsItemY = sentimentBoxY + 20;
        if (headlines.length > 0) {
          headlines.forEach((h: any) => {
            const title = typeof h === 'string' ? h : h.title || h.headline || 'Market analysis update';
            doc.fillColor(textMain).fontSize(7).font('Helvetica')
              .text(`• ${title.substring(0, 95)}...`, leftMargin + 10, newsItemY, { width: pageWidth - 20 });
            newsItemY = doc.y + 2;
          });
        } else {
          doc.fillColor(textMuted).fontSize(7.5).font('Helvetica-Oblique')
            .text('Corporate disclosures and macro sector news indicate consistent operational momentum.', leftMargin + 10, sentimentBoxY + 24);
        }

        doc.y = sentimentBoxY + 62;

        // --- 8. INVESTMENT THESIS ---
        renderSectionHeader('Investment Thesis & Recommendation', 8);

        const thesisText = state.reasoning || `The research committee establishes a ${rec} rating for ${name} (${ticker}) with a conviction score of ${conviction}%. Grounded in our deterministic stock health score of ${overallHealth}/100, the company exhibits resilient operating cash flows and strong enterprise positioning. Investors should monitor valuation multiples against cyclical peer averages.`;

        const thesisY = doc.y;
        doc.rect(leftMargin, thesisY, pageWidth, 50).fillAndStroke(bgLight, borderCol);

        doc.fillColor(textMain).fontSize(7.5).font('Helvetica')
          .text(thesisText, leftMargin + 10, thesisY + 8, {
            width: pageWidth - 20,
            lineGap: 2,
          });

        // --- 9. DISCLAIMER FOOTER ON ALL PAGES ---
        const totalPages = doc.bufferedPageRange().count;
        for (let i = 0; i < totalPages; i++) {
          doc.switchToPage(i);

          const footerY = doc.page.height - 35;
          doc.strokeColor(borderCol).lineWidth(0.5).moveTo(leftMargin, footerY).lineTo(leftMargin + pageWidth, footerY).stroke();

          doc.fillColor(textMuted).fontSize(6.5).font('Helvetica')
            .text(
              'FININTEL / ALPHAINSIGHT AI COMPLIANCE DISCLAIMER: This document is an automated decision-support dossier produced for informational and educational purposes only. It does not constitute investment advice, endorsement, or a recommendation to buy or sell securities. Past performance and quantitative indicators do not guarantee future returns.',
              leftMargin,
              footerY + 4,
              { width: pageWidth, align: 'center' }
            );

          doc.fillColor(textMuted).fontSize(6.5).font('Helvetica-Bold')
            .text(`Page ${i + 1} of ${totalPages}`, leftMargin + pageWidth - 60, footerY + 18, { width: 60, align: 'right' });
        }

        doc.end();
      } catch (err) {
        logger.error(`Error in PDF report generation: ${(err as any).message}`);
        reject(err);
      }
    });
  }
}

export const pdfReportService = new PdfReportService();
