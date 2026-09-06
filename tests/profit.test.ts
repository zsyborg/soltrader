import { describe, expect, it } from "vitest";
import { calculateProfit, isProfitable } from "../src/strategy/profit.js";

const noCosts = {
  buyFeeAtomic: 0n,
  sellFeeAtomic: 0n,
  networkFeeAtomic: 0n,
  priorityFeeAtomic: 0n,
  slippageReserveAtomic: 0n,
};

describe("calculateProfit", () => {
  it("calculates gross and net profit in atomic units", () => {
    const result = calculateProfit(1_000_000n, 1_004_000n, {
      ...noCosts,
      buyFeeAtomic: 500n,
      sellFeeAtomic: 500n,
      networkFeeAtomic: 100n,
      priorityFeeAtomic: 100n,
      slippageReserveAtomic: 300n,
    });

    expect(result.grossProfitAtomic).toBe(4_000n);
    expect(result.totalCostsAtomic).toBe(1_500n);
    expect(result.netProfitAtomic).toBe(2_500n);
    expect(result.profitBps).toBe(25);
  });

  it("rejects an opportunity below the configured profit threshold", () => {
    const result = calculateProfit(1_000_000n, 1_004_000n, noCosts);
    expect(isProfitable(result, 50)).toBe(false);
    expect(isProfitable(result, 40)).toBe(true);
  });
});
