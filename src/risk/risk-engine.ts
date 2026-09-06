import type { Config } from "../config/env.js";
import type { ArbitrageOpportunity } from "../strategy/types.js";

export interface RiskDecision {
  approved: boolean;
  reasons: string[];
}

export class RiskEngine {
  constructor(private readonly config: Config) {}

  evaluate(opportunity: ArbitrageOpportunity, nowMs = Date.now()): RiskDecision {
    const reasons: string[] = [];

    if (opportunity.expiresAtMs <= nowMs) reasons.push("opportunity_expired");
    if (opportunity.profitBps < this.config.minProfitBps) reasons.push("profit_below_threshold");
    if (opportunity.inputAmountAtomic <= 0n) reasons.push("invalid_trade_size");

    return { approved: reasons.length === 0, reasons };
  }
}
