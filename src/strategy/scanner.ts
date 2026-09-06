import { randomUUID } from "node:crypto";
import type { Config } from "../config/env.js";
import type { ArbitrageOpportunity, QuoteProvider, VenueQuote } from "../market/types.js";

export interface ScannerInput {
  inputMint: string;
  outputMint: string;
  amountIn: bigint;
}

export class OpportunityScanner {
  constructor(private readonly config: Config, private readonly provider: QuoteProvider) {}

  async scan(input: ScannerInput): Promise<ArbitrageOpportunity[]> {
    const quotes = await this.provider.getQuotes(input.inputMint, input.outputMint, input.amountIn);
    const opportunities: ArbitrageOpportunity[] = [];
    for (const buy of quotes) {
      for (const sell of quotes) {
        if (buy.venue === sell.venue || sell.amountOut <= buy.amountOut) continue;
        const grossProfit = sell.amountOut - buy.amountOut;
        const swapFees = buy.feeAmount + sell.feeAmount;
        const networkFees = 5_000n;
        const priorityFees = 0n;
        const impactBps = Math.max(buy.priceImpactBps, sell.priceImpactBps);
        const estimatedSlippage = (sell.amountOut * BigInt(this.config.maxSlippageBps)) / 10_000n;
        const expectedNetProfit = grossProfit - swapFees - networkFees - priorityFees - estimatedSlippage;
        const profitBps = Number((expectedNetProfit * 10_000n) / (buy.amountOut || 1n));
        if (expectedNetProfit <= 0n || profitBps < this.config.minProfitBps) continue;
        const detectedAt = Date.now();
        opportunities.push({
          id: randomUUID(), inputMint: input.inputMint, outputMint: input.outputMint,
          buyVenue: buy.venue, sellVenue: sell.venue, amountIn: input.amountIn,
          buyAmountOut: buy.amountOut, sellAmountOut: sell.amountOut, grossProfit,
          swapFees, networkFees, priorityFees, estimatedSlippage,
          expectedNetProfit, profitBps, slot: sell.slot,
          detectedAt, expiresAt: detectedAt + this.config.opportunityTtlMs,
        });
      }
    }
    return opportunities;
  }
}
