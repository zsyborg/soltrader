import { createHash } from "node:crypto";
import type { QuoteProvider, VenueQuote } from "./types.js";

/**
 * Deterministic paper-market provider. It is deliberately not presented as
 * real liquidity; it gives the scanner a safe way to exercise the full
 * pipeline while real venue adapters are being integrated.
 */
export class SimulatedQuoteProvider implements QuoteProvider {
  readonly name = "simulator";

  async getQuotes(inputMint: string, outputMint: string, amountIn: bigint): Promise<VenueQuote[]> {
    const slot = BigInt(Math.floor(Date.now() / 400));
    const seed = createHash("sha256").update(`${inputMint}:${outputMint}:${slot}`).digest();
    const bps = 15 + (seed[0] % 31);
    const baseOut = amountIn * 1000n;
    const buyOut = (baseOut * BigInt(10_000 - bps)) / 10_000n;
    const sellOut = (baseOut * BigInt(10_000 + bps)) / 10_000n;
    const fee = amountIn / 5000n;
    const now = Date.now();

    return [
      { venue: "sim-raydium", inputMint, outputMint, amountIn, amountOut: buyOut, feeAmount: fee, priceImpactBps: 3, slot, observedAt: now },
      { venue: "sim-orca", inputMint, outputMint, amountIn, amountOut: sellOut, feeAmount: fee, priceImpactBps: 4, slot, observedAt: now },
    ];
  }
}
