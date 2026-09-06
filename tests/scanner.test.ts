import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config/env.js";
import { SimulatedQuoteProvider } from "../src/market/simulator.js";
import { OpportunityScanner } from "../src/strategy/scanner.js";

describe("OpportunityScanner", () => {
  it("finds a profitable paper opportunity when the simulated spread clears costs", async () => {
    process.env.TRADING_MODE = "paper";
    process.env.SOLANA_CLUSTER = "devnet";
    process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
    process.env.REDIS_URL = "redis://localhost:6379";
    const config = { ...loadConfig(), minProfitBps: 1, maxSlippageBps: 1 };
    const scanner = new OpportunityScanner(config, new SimulatedQuoteProvider());
    const opportunities = await scanner.scan({ inputMint: "SOL", outputMint: "USDC", amountIn: 1_000_000n });
    expect(opportunities.length).toBeGreaterThan(0);
    expect(opportunities[0]?.expectedNetProfit).toBeGreaterThan(0n);
  });
});
