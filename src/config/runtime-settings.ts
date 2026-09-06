import { getRedisClient } from "../storage/redis.js";

export interface RuntimeSettings {
  minProfitBps: number;
  maxSlippageBps: number;
  maxTradeUsd: number;
  maxDailyLossUsd: number;
  minLiquidityUsd: number;
  opportunityTtlMs: number;
}

const defaults: RuntimeSettings = {
  minProfitBps: Number(process.env.MIN_PROFIT_BPS ?? 30),
  maxSlippageBps: Number(process.env.MAX_SLIPPAGE_BPS ?? 20),
  maxTradeUsd: Number(process.env.MAX_TRADE_USD ?? 100),
  maxDailyLossUsd: Number(process.env.MAX_DAILY_LOSS_USD ?? 25),
  minLiquidityUsd: Number(process.env.MIN_LIQUIDITY_USD ?? 10_000),
  opportunityTtlMs: Number(process.env.OPPORTUNITY_TTL_MS ?? 1000),
};

const KEY = "soltrader:runtime-settings";

export async function getRuntimeSettings(): Promise<RuntimeSettings> {
  const redis = await getRedisClient();
  const raw = await redis.get(KEY);
  if (!raw) return defaults;
  try { return { ...defaults, ...JSON.parse(raw) } as RuntimeSettings; } catch { return defaults; }
}

export async function setRuntimeSettings(patch: Partial<RuntimeSettings>): Promise<RuntimeSettings> {
  const current = await getRuntimeSettings();
  const next = { ...current, ...patch };
  for (const [key, value] of Object.entries(next)) {
    if (!Number.isFinite(value) || value < 0) throw new Error(`${key} must be a non-negative number`);
  }
  const redis = await getRedisClient();
  await redis.set(KEY, JSON.stringify(next));
  return next;
}
