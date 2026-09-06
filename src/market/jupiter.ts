import type { QuoteProvider, VenueQuote } from "./types.js";

export interface JupiterQuoteProviderOptions {
  baseUrl: string;
  apiKey?: string;
  venueName?: string;
  fetchImpl?: typeof fetch;
}

interface JupiterQuoteResponse {
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  priceImpactPct?: string;
  routePlan?: Array<{ swapInfo?: { feeAmount?: string } }>;
}

/**
 * Jupiter quote adapter. It is intentionally disabled by default on Devnet;
 * callers should only enable it when the configured Jupiter endpoint supports
 * the selected cluster. This keeps the provider abstraction cluster-safe.
 */
export class JupiterQuoteProvider implements QuoteProvider {
  readonly name: string;
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly options: JupiterQuoteProviderOptions) {
    this.name = options.venueName ?? "jupiter";
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async getQuotes(inputMint: string, outputMint: string, amountIn: bigint): Promise<VenueQuote[]> {
    const url = new URL("/quote", this.options.baseUrl.endsWith("/") ? this.options.baseUrl : `${this.options.baseUrl}/`);
    url.searchParams.set("inputMint", inputMint);
    url.searchParams.set("outputMint", outputMint);
    url.searchParams.set("amount", amountIn.toString());
    url.searchParams.set("slippageBps", "1");
    const headers: Record<string, string> = { accept: "application/json" };
    if (this.options.apiKey) headers["x-api-key"] = this.options.apiKey;

    const response = await this.fetchImpl(url, { headers });
    if (!response.ok) throw new Error(`Jupiter quote failed: HTTP ${response.status}`);
    const body = (await response.json()) as JupiterQuoteResponse;
    if (!body.outAmount || !body.inAmount) throw new Error("Jupiter returned an invalid quote");

    const feeAmount = (body.routePlan ?? []).reduce((sum, route) => sum + BigInt(route.swapInfo?.feeAmount ?? "0"), 0n);
    return [{
      venue: this.name,
      inputMint: body.inputMint,
      outputMint: body.outputMint,
      amountIn: BigInt(body.inAmount),
      amountOut: BigInt(body.outAmount),
      feeAmount,
      priceImpactBps: Number(body.priceImpactPct ?? 0) * 100,
      slot: 0n,
      observedAt: Date.now(),
    }];
  }
}
