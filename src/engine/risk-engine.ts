import type { Config } from "../config/env.js";
import type { ArbitrageOpportunity } from "../market/types.js";
import { getPostgresPool } from "../storage/postgres.js";
import { getRedisClient } from "../storage/redis.js";

export interface RiskDecision { approved: boolean; reason?: string; lockKey?: string; }

export class RiskEngine {
  constructor(private readonly config: Config) {}

  async approve(opportunity: ArbitrageOpportunity): Promise<RiskDecision> {
    const settings = this.config;
    if (opportunity.expiresAt <= Date.now()) return { approved: false, reason: "opportunity_expired" };
    const maxTradeBaseUnits = BigInt(Math.max(1, Math.floor(settings.maxTradeUsd * 1_000_000)));
    if (opportunity.amountIn > maxTradeBaseUnits) return { approved: false, reason: "max_trade_exceeded" };
    if (opportunity.profitBps < settings.minProfitBps) return { approved: false, reason: "min_profit_not_met" };

    const pool = getPostgresPool();
    const pnl = await pool.query<{ realized: string }>("SELECT COALESCE(SUM(realized_profit),0)::text AS realized FROM paper_trades WHERE created_at >= CURRENT_DATE");
    const realized = BigInt(pnl.rows[0]?.realized ?? "0");
    const dailyLossBaseUnits = BigInt(Math.max(1, Math.floor(settings.maxDailyLossUsd * 1_000_000)));
    if (realized <= -dailyLossBaseUnits) return { approved: false, reason: "daily_loss_limit" };

    const lockKey = `soltrader:opportunity:${opportunity.id}`;
    const redis = await getRedisClient();
    const locked = await redis.set(lockKey, String(Date.now()), { NX: true, PX: Math.max(250, settings.opportunityTtlMs) });
    if (locked !== "OK") return { approved: false, reason: "duplicate_opportunity" };
    return { approved: true, lockKey };
  }

  async release(lockKey?: string): Promise<void> {
    if (!lockKey) return;
    const redis = await getRedisClient();
    await redis.del(lockKey);
  }
}
