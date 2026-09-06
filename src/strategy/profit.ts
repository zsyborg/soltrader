import type { CostBreakdown } from "./types.js";

export interface ProfitCalculation {
  grossProfitAtomic: bigint;
  totalCostsAtomic: bigint;
  netProfitAtomic: bigint;
  profitBps: number;
}

/**
 * Calculates expected profit using integer atomic units.
 * Keeping the calculation in bigint avoids floating-point rounding in trade decisions.
 */
export function calculateProfit(
  inputAmountAtomic: bigint,
  finalOutputAtomic: bigint,
  costs: CostBreakdown,
): ProfitCalculation {
  if (inputAmountAtomic <= 0n) throw new Error("inputAmountAtomic must be positive");

  const grossProfitAtomic = finalOutputAtomic - inputAmountAtomic;
  const totalCostsAtomic =
    costs.buyFeeAtomic +
    costs.sellFeeAtomic +
    costs.networkFeeAtomic +
    costs.priorityFeeAtomic +
    costs.slippageReserveAtomic;

  const netProfitAtomic = grossProfitAtomic - totalCostsAtomic;
  const profitBps = Number((netProfitAtomic * 10_000n) / inputAmountAtomic);

  return {
    grossProfitAtomic,
    totalCostsAtomic,
    netProfitAtomic,
    profitBps,
  };
}

export function isProfitable(calculation: ProfitCalculation, minimumProfitBps: number): boolean {
  return calculation.netProfitAtomic > 0n && calculation.profitBps >= minimumProfitBps;
}
