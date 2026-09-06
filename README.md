# SolTrader

Solana low-margin arbitrage research, paper-trading engine and local trading control center.

> **Safety:** the project starts in paper mode. Live transaction submission remains disabled. The new execution path includes real RPC market telemetry, quote adapters, risk gates, transaction simulation and performance telemetry, but a profitable direct multi-venue atomic swap path must be validated before real-money trading.

## Current four-phase implementation

### Phase 1 — Real market/RPC data
- Solana RPC network snapshots: slot, block height and latest blockhash.
- Optional read-only wallet balance telemetry.
- Configurable `simulator` or `jupiter` quote provider.
- Market snapshots persisted with provider and latency.
- Devnet remains the default cluster.

### Phase 2 — Simulation and execution safety
- Base64 transaction simulation endpoint: `POST /api/transaction/simulate`.
- Simulation captures errors, logs, compute units and latency.
- Redis duplicate-opportunity locking.
- Daily-loss and max-trade risk gates.
- Risk decisions are persisted for auditability.
- Live trading requires both `TRADING_MODE=live` and `LIVE_TRADING_ENABLED=true`.

### Phase 3 — Execution telemetry
- Detection → decision latency.
- Decision → simulation latency.
- Simulation/submit/confirmation slots are ready in the schema for the live executor.
- Execution attempts are stored independently from paper trades.

### Phase 4 — P&L and dashboard analytics
- Realized/expected P&L summary.
- Win rate and average trade.
- Hourly P&L series through `/api/analytics/pnl`.
- Latency summary through `/api/analytics/latency`.
- Dashboard network, wallet, risk and latency panels.

## Local setup

### 1. Start PostgreSQL + Redis

```bash
docker compose up -d
```

Use these local values:

```env
DATABASE_URL=postgresql://soltrader:soltrader_password@localhost:5432/soltrader
REDIS_URL=redis://localhost:6379
```

### 2. Configure the trader

Copy `.env.example` to `.env` and keep the safe defaults:

```env
SOLANA_CLUSTER=devnet
SOLANA_RPC_URL=https://api.devnet.solana.com
TRADING_MODE=paper
QUOTE_PROVIDER=simulator
LIVE_TRADING_ENABLED=false
```

Never commit `.env`, seed phrases, private keys, wallet JSON files or RPC credentials.

### 3. Start trader

```bash
npm install
npm run typecheck
npm test
npm run dev
```

API: `http://127.0.0.1:8787`

### 4. Start dashboard

```bash
cd apps/web
npm install
npm run build
npm run dev
```

Dashboard: `http://localhost:3000`

## Real quote mode

Set `QUOTE_PROVIDER=jupiter` and configure `JUPITER_API_URL`/`JUPITER_API_KEY` for an endpoint that supports the selected cluster. The adapter is read-only and records quotes; the arbitrage scanner still requires multiple independently priced venues before it can approve a trade.

## Devnet testing

Use a dedicated Devnet wallet only. Fund it with Devnet SOL through the Solana faucet or CLI. Do not reuse a mainnet private key for development.

The Solana public RPC is rate-limited, so production should use a dedicated/private RPC endpoint.

## Architecture

- `src/` — TypeScript trading engine, strategy, risk, Solana and persistence layers.
- `src/api/` — local control/telemetry API on `127.0.0.1:8787`.
- `apps/web/` — Next.js trading dashboard.
- PostgreSQL — durable opportunities, trades, market snapshots, risk events and execution telemetry.
- Redis — low-latency runtime state, settings and duplicate locks.

## Next execution milestone

The remaining production-critical milestone is the **direct multi-venue atomic transaction builder**: integrate supported DEX instruction builders, calculate exact token decimals/price impact/priority fees, compose the full buy→sell transaction, simulate it on the target cluster, and only then add a separately guarded live submitter.
