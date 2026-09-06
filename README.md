# SolTrader

Solana low-margin arbitrage research, paper-trading engine and local trading control center.

> **Safety:** the project starts in paper mode. Live transaction submission is disabled until the execution layer, simulation, risk controls and profitability validation are complete.

## Architecture

- `src/` — TypeScript trading engine, strategy, risk, Solana and persistence layers.
- `src/api/` — local control/telemetry API on `127.0.0.1:8787`.
- `apps/web/` — Next.js trading dashboard.
- PostgreSQL — durable opportunities, trades and engine events.
- Redis — low-latency runtime state and settings broadcast.

## Windows 10 local setup

### 1. Trader

From the repository root:

```powershell
npm install
npm run typecheck
npm test
npm run dev
```

The trader expects:

```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/soltrader
REDIS_URL=redis://localhost:6379
```

The API will be available at `http://127.0.0.1:8787`.

### 2. Web dashboard

Open a second PowerShell window:

```powershell
cd apps/web
npm install
npm run dev
```

Open `http://localhost:3000`.

If needed, create `apps/web/.env.local`:

```env
TRADER_API_URL=http://127.0.0.1:8787
```

## Dashboard

The control center includes:

- bot status, pause/resume and emergency stop controls
- 24-hour P&L and expected P&L
- opportunity and paper-trade counters
- engine event stream
- execution health
- runtime strategy settings
- Redis-backed settings updates

## Development roadmap

1. Market-data and quote adapters.
2. Jupiter route/quote integration.
3. Multi-venue opportunity scanner.
4. Net-profit and price-impact model.
5. Paper execution engine.
6. Historical performance analytics.
7. Direct DEX integrations and atomic transaction builder.
8. Transaction simulation and hardened execution.
9. Live micro-trading only after paper/simulation validation.

Never commit `.env`, wallet seed phrases, private keys or RPC credentials.
