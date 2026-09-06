# soltrader

A Solana low-margin arbitrage research and trading engine.

> **Current status:** paper-trading foundation. Live transaction submission is intentionally disabled.

## Strategy

Soltrader looks for short-lived price discrepancies between Solana liquidity venues and only considers an opportunity executable when the expected edge remains positive after:

- swap fees
- price impact
- estimated network fees
- priority fees
- configurable slippage allowance
- safety margin

The initial milestone is to collect and evaluate opportunities without risking funds.

## Architecture

```text
Market data / quotes
        |
        v
Opportunity engine
        |
        v
Net-profit calculation
        |
        v
Risk engine
        |
        v
Paper execution
        |
        v
Persistence / metrics
```

## Tech stack

- Node.js + TypeScript
- Solana Kit (`@solana/kit`)
- Jupiter for routing/quotes
- PostgreSQL for durable trading data
- Redis for low-latency ephemeral state
- Vitest for tests
- Docker for local infrastructure

## Safety

The repository must never contain wallet private keys or seed phrases. Secrets belong in environment variables or a dedicated key-management system.

Live trading will remain disabled until paper/simulation results demonstrate that the expected edge survives real execution costs.

## Development

```bash
npm install
cp .env.example .env
npm run dev
```

Run tests:

```bash
npm test
```

Type-check:

```bash
npm run typecheck
```

## Roadmap

1. Project foundation and configuration
2. Solana RPC connectivity
3. Quote/market-data adapters
4. Opportunity detection
5. Fee/slippage-aware net-profit engine
6. Paper trader and persistence
7. Transaction simulation
8. Risk controls and kill switch
9. Small-size live trading
10. Latency and execution optimization
