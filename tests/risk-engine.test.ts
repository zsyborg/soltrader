import { describe, expect, it } from "vitest";
import type { Config } from "../src/config/env.js";
import { RiskEngine } from "../src/risk/risk-engine.js";
import type { ArbitrageOpportunity } from "../src/strategy/types.js";

const config: Config = {
  nodeEnv: "test",
  tradingMode: "paper",
  logLevel: "silent",
  solanaRpcUrl: "http://localhost:8899",
  minProfitBps: 30,
  maxSlippageBps: 20,
  minLiquidityUsd: 10_000,
  maxTradeUsd: 100,
  maxDailyLossUsd: 25,
  opportunityTtlMs: 1_000,
  liveTradingEnabled: false,
};

function opportunity(overrides: Partial<ArbitrageOpportunity> = {}): ArbitrageOpportunity {
  return {
    id: "test-opportunity",
    inputMint: "USDC",
    intermediateMint: "SOL",
    buyVenue: "venue-a",
    sellVenue: "venue-b",
    inputAmountAtomic: 1_000_000n,
    grossProfitAtomic: 5_000n,
    costs: {
      buyFeeAtomic: 500n,
      sellFeeAtomic: 500n,
      networkFeeAtomic: 100n,
      priorityFeeAtomic: 100n,
      slippageReserveAtomic: 300n,
    },
    netProfitAtomic: 3_500n,
    profitBps: 35,
    detectedAtMs: 1_000,
    expiresAtMs: 2_000,
    ...overrides,
  };
}

describe("RiskEngine", () => {
  it("approves a fresh opportunity above the threshold", () => {
    const decision = new RiskEngine(config).evaluate(opportunity(), 1_500);
    expect(decision.approved).toBe(true);
    expect(decision.reasons).toEqual([]);
  });

  it("rejects expired opportunities", () => {
    const decision = new RiskEngine(config).evaluate(opportunity(), 2_000);
    expect(decision.approved).toBe(false);
    expect(decision.reasons).toContain("opportunity_expired");
  });
});
