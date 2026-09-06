export type Cluster = "devnet" | "mainnet-beta";

export interface VenueQuote {
  venue: string;
  inputMint: string;
  outputMint: string;
  amountIn: bigint;
  amountOut: bigint;
  feeAmount: bigint;
  priceImpactBps: number;
  slot: bigint;
  observedAt: number;
}

export interface ArbitrageOpportunity {
  id: string;
  inputMint: string;
  outputMint: string;
  buyVenue: string;
  sellVenue: string;
  amountIn: bigint;
  buyAmountOut: bigint;
  sellAmountOut: bigint;
  grossProfit: bigint;
  swapFees: bigint;
  networkFees: bigint;
  priorityFees: bigint;
  estimatedSlippage: bigint;
  expectedNetProfit: bigint;
  profitBps: number;
  slot: bigint;
  detectedAt: number;
  expiresAt: number;
}

export interface QuoteProvider {
  readonly name: string;
  getQuotes(inputMint: string, outputMint: string, amountIn: bigint): Promise<VenueQuote[]>;
}
