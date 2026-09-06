export interface VenueQuote {
  venue: string;
  inputMint: string;
  outputMint: string;
  inputAmountAtomic: bigint;
  outputAmountAtomic: bigint;
  feeAtomic: bigint;
  priceImpactBps: number;
  timestampMs: number;
  slot?: bigint;
}

export interface CostBreakdown {
  buyFeeAtomic: bigint;
  sellFeeAtomic: bigint;
  networkFeeAtomic: bigint;
  priorityFeeAtomic: bigint;
  slippageReserveAtomic: bigint;
}

export interface ArbitrageOpportunity {
  id: string;
  inputMint: string;
  intermediateMint: string;
  buyVenue: string;
  sellVenue: string;
  inputAmountAtomic: bigint;
  grossProfitAtomic: bigint;
  costs: CostBreakdown;
  netProfitAtomic: bigint;
  profitBps: number;
  detectedAtMs: number;
  expiresAtMs: number;
  slot?: bigint;
}
