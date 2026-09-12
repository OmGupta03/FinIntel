# Autonomous AI Investment Research Agent

A production-grade, state-machine-driven AI Investment Research application designed to perform deep quantitative and qualitative audits on public assets. Built with a decoupled **React/Next.js** frontend and **Node.js/Express** backend, leveraging **LangGraph** for resilient state transitions, **Yahoo Finance** for fundamental statements, and **Gemini 1.5** for investment synthesis.

---

## 🚀 Key Engineering & Product Highlights

1. **State-Machine Orchestration (LangGraph):** The agent operates as an enhanced 9-stage **State Graph** using `@langchain/langgraph` covering: Ticker Resolution, Data Collection, Technical Analysis, Financial Analysis, Sentiment Intelligence, Stock Health Scoring, Competitor Comparison, SWOT Assessment, and Adversarial Synthesis.
2. **Deterministic Computation + AI Explanation:** Complete separation of concerns: mathematical indicators (SMA, EMA, RSI 14, MACD, Bollinger Bands, Volatility), ratios, filters, and 0–100 Stock Health Scores are 100% deterministic code calculations. The LLM is strictly used for contextual explanation, thesis synthesis, and natural language understanding.
3. **AI Stock Screener:** Converts natural language queries into structured financial filters, highlights unsupported constraints, and ranks candidates deterministically with 1-click transition to in-depth research.
4. **Adversarial Bull vs. Bear Analysis:** Balances upside catalysts against downside risks with data-grounded points and an explicit committee synthesis justifying the final recommendation.
5. **Competitor Benchmarking:** Identifies 2–4 peers across US and Indian equities with multi-metric ranking and narrative comparison.
6. **Defensive Fallback & Simulation Engine:** If external APIs or LLM keys are missing, the system runs in high-fidelity simulation mode using actual live metrics from Yahoo Finance.
7. **Secure Streaming & Persistent Storage:** Replaced URL parameter keys with secure headers/POST streaming and integrated native Node.js SQLite persistence (`node:sqlite`) for multi-session history deduplication.

---

## 🏗️ System Architecture

```
User Input (Stock Query or Natural Language Screener)
  │
  ├──► [POST /api/research/screener/run] ──► Parse NL Query ──► Filter & Rank Universe ──► Candidate Table
  │
  ▼
[Express Controller] ── (Secure Headers, Zod Validation & Rate Limiting)
  │
  ▼
[Research Service] ── (SQLite / NodeCache Check)
  │
  ├──► [Cache Hit] ──► SSE Playback (Fast UX)
  │
  ▼
[9-Stage LangGraph StateGraph]
  │
  ├──► [Stage 1: resolveTicker] ──► Yahoo Finance search API (maps query to exchange ticker)
  ├──► [Stage 2: fetchData] ──► Fetches profile, ratios, OHLCV chart history, and news concurrently
  ├──► [Stage 3: analyzeTechnicals] ──► SMA 20/50/200, EMA 20, RSI 14, MACD, Bollinger Bands, Volatility
  ├──► [Stage 4: analyzeFinancials] ──► Audits solvency, growth, cash flow, ROE, ROA, EPS
  ├──► [Stage 5: analyzeSentiment] ──► Classifies article tone, extracts catalysts, computes aggregate score
  ├──► [Stage 6: computeHealthScore] ──► Deterministic 0–100 score (5 sub-scores + 1-line AI explanations)
  ├──► [Stage 7: compareCompetitors] ──► Maps 2–4 peers, ranks metrics deterministically, generates narrative
  ├──► [Stage 8: analyzeSwot] ──► Validated SWOT matrix (Strengths, Weaknesses, Opportunities, Threats)
  └──► [Stage 9: synthesizeRecommendation] ──► Bull vs Bear case, committee thesis, BUY/HOLD/SELL conviction
```

---

## 📂 Project Structure

```
/investment-research-agent
├── /backend
│   ├── /data            # SQLite persistent database (research.db)
│   ├── /src
│   │   ├── /config          # Configuration settings, env, health score weights
│   │   ├── /controllers     # HTTP, screener & SSE controllers
│   │   ├── /services        # Business orchestrators, SQLite dbService, screener, health score
│   │   ├── /agents          # 9-stage LangGraph definitions, nodes, and states
│   │   ├── /clients         # API client adapters (Yahoo Finance chart/quotes, Tavily, Gemini)
│   │   ├── /utils           # Technical analysis math library, formatters
│   │   ├── /middleware      # Error handling, JSON loggers, rate limiters
│   │   ├── /tests           # Automated test harness (technicals, health score, screener, agent)
│   │   └── app.ts           # Server initialization
│   ├── tsconfig.json
│   └── package.json
├── /frontend
│   ├── /src
│   │   ├── /app            # Next.js App Router (page.tsx with fetch streaming)
│   │   ├── /components     # Dashboard, ScreenerTab, HealthScoreCard, BullBearCard,
│   │   │                   # CompetitorTable, HistoricalChart, FinancialsTab, NewsTab, SwotGrid
│   │   └── /styles         # Tailwind global themes
│   ├── tsconfig.json
│   └── package.json
```

---

## ⚡ Setup & Execution

### Prerequisites
* **Node.js** v20.x or higher
* **npm** v10.x or higher

### 1. Clone & Initialize Backend
1. Open a terminal and navigate to the `/backend` directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file from the example:
   ```bash
   copy .env.example .env
   ```
4. Insert your Gemini API Key in the `.env` file:
   ```env
   GEMINI_API_KEY=your_actual_gemini_api_key
   ```
   *(Note: If left empty, the backend runs in high-fidelity simulation mode using actual stock statistics, bypassing the LLM call).*
5. Start the backend developer server:
   ```bash
   npm run dev
   ```
   *(Backend will start on `http://localhost:5000`)*

### 2. Clone & Initialize Frontend
1. Open a separate terminal and navigate to the `/frontend` directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Next.js development server:
   ```bash
   npm run dev
   ```
   *(Frontend will start on `http://localhost:3000`)*

### 3. Automated Test Suite
Run the automated unit and integration test suite covering technical math, health score formulas, natural-language screening, and LangGraph pipeline execution:
```bash
cd backend
npm test
```
*(All 4 test suites pass in ~3s).*

---

## 🛠️ Architecture Trade-Offs

| Decision | Pros | Cons |
| :--- | :--- | :--- |
| **Yahoo Finance Wrapper (`yahoo-finance2`)** | Free, zero API key management, fast, comprehensive fundamental statements and search. | Unofficial scraper API. Subject to breaking changes if Yahoo changes endpoints (mitigated with custom error boundaries). |
| **Server-Sent Events (SSE)** | Unidirectional streaming fits agent log delivery perfectly. Lighter weight and simpler than WebSockets. | Doesn't allow two-way interaction (not needed since input is one-shot). |
| **In-Memory Cache & Limiter** | Zero dependencies or complex infrastructure setup (e.g. Redis). Works out-of-the-box. | Resets on server restarts and doesn't scale horizontally (mitigated by clean controller interfaces ready for Redis swaps). |
| **LangGraph Annotation State** | Centralized typing, automatic value reducers, standardized node boundaries. | Adds LangChain-specific package overhead. |

---

## 💬 Interview Preparation (Defend Your Code)

### Q1: Why did you choose Server-Sent Events (SSE) over WebSockets?
> **Answer:** "For this application, the communication pattern is strictly unidirectional (the server streams progress updates and LLM text segments to the client). WebSockets are designed for low-latency, bi-directional communication, which introduces unnecessary overhead, handshakes, and state management on the server. SSE works over standard HTTP, supports auto-reconnection out of the box, is easier to proxy behind Nginx, and perfectly matches our agent stream use case."

### Q2: What strategies did you implement to handle LLM rate limits and token costs?
> **Answer:** "I implemented three layers of protection. First, a **routing cache** using `node-cache` stores completed reports under both the search query and stock ticker for 1 hour, avoiding redundant LLM processing for frequent searches. Second, a **custom Express rate limiter** prevents spamming. Third, I used a structured **SWOT and Decision JSON template** to prompt the LLM, reducing boilerplate response tokens and keeping execution costs low."

### Q3: How did you ensure your Yahoo Finance integration doesn't crash the server if Yahoo changes its site layout?
> **Answer:** "I implemented a strict defensive wrapper. Each API call to the `yahoo-finance` client is wrapped in its own `try/catch` block. If any fundamental fetch fails (like news or history), the node logs a warning but allows the state graph to transition and degrade gracefully. Only a fatal loss (failure to resolve the ticker) halts the graph. I also created a central Express error handler that converts unexpected runtime errors into clean, typed JSON responses without crashing the Node.js event loop."
