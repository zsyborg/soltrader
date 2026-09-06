import "dotenv/config";

export type TradingMode = "paper" | "simulation" | "live";

export interface Config {
  nodeEnv: string;
  tradingMode: TradingMode;
  logLevel: string;
  solanaRpcUrl: string;
  solanaWsUrl?: string;
  databaseUrl: string;
  redisUrl: string;
  minProfitBps: number;
  maxSlippageBps: number;
  minLiquidityUsd: number;
  maxTradeUsd: number;
  maxDailyLossUsd: number;
  opportunityTtlMs: number;
  liveTradingEnabled: boolean;
}

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function numberEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value)) throw new Error(`${name} must be a finite number`);
  return value;
}

function booleanEnv(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  if (raw === "true") return true;
  if (raw === "false") return false;
  throw new Error(`${name} must be true or false`);
}

function tradingModeEnv(): TradingMode {
  const value = process.env.TRADING_MODE ?? "paper";
  if (value !== "paper" && value !== "simulation" && value !== "live") {
    throw new Error("TRADING_MODE must be paper, simulation, or live");
  }
  return value;
}

export function loadConfig(): Config {
  const liveTradingEnabled = booleanEnv("LIVE_TRADING_ENABLED", false);
  const tradingMode = tradingModeEnv();

  if (tradingMode === "live" && !liveTradingEnabled) {
    throw new Error("Live trading requires LIVE_TRADING_ENABLED=true");
  }

  return {
    nodeEnv: required("NODE_ENV", "development"),
    tradingMode,
    logLevel: required("LOG_LEVEL", "info"),
    solanaRpcUrl: required("SOLANA_RPC_URL", "https://api.mainnet-beta.solana.com"),
    ...(process.env.SOLANA_WS_URL ? { solanaWsUrl: process.env.SOLANA_WS_URL } : {}),
    databaseUrl: required("DATABASE_URL"),
    redisUrl: required("REDIS_URL"),
    minProfitBps: numberEnv("MIN_PROFIT_BPS", 30),
    maxSlippageBps: numberEnv("MAX_SLIPPAGE_BPS", 20),
    minLiquidityUsd: numberEnv("MIN_LIQUIDITY_USD", 10_000),
    maxTradeUsd: numberEnv("MAX_TRADE_USD", 100),
    maxDailyLossUsd: numberEnv("MAX_DAILY_LOSS_USD", 25),
    opportunityTtlMs: numberEnv("OPPORTUNITY_TTL_MS", 1_000),
    liveTradingEnabled,
  };
}
