import type { Config } from "../config/env.js";
import { SimulatedQuoteProvider } from "../market/simulator.js";
import { OpportunityScanner } from "../strategy/scanner.js";
import { PaperExecutionEngine } from "./paper-engine.js";
import { getPostgresPool } from "../storage/postgres.js";

export class TraderLoop {
  private timer: NodeJS.Timeout | undefined;
  private running = false;

  constructor(private readonly config: Config) {}

  start(): void {
    if (this.timer) return;
    this.running = true;
    void this.tick();
    this.timer = setInterval(() => void this.tick(), 2_000);
  }

  pause(): void { this.running = false; }
  resume(): void { this.running = true; void this.tick(); }
  stop(): void { if (this.timer) clearInterval(this.timer); this.timer = undefined; this.running = false; }

  private async tick(): Promise<void> {
    if (!this.running) return;
    try {
      const scanner = new OpportunityScanner(this.config, new SimulatedQuoteProvider());
      const amount = BigInt(Math.max(1, Math.floor(this.config.maxTradeUsd * 1_000_000)));
      const opportunities = await scanner.scan({
        inputMint: "So11111111111111111111111111111111111111112",
        outputMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        amountIn: amount,
      });
      const engine = new PaperExecutionEngine();
      for (const opportunity of opportunities.slice(0, 1)) await engine.execute(opportunity);
      await getPostgresPool().query("INSERT INTO bot_events (level,event_type,payload) VALUES ($1,$2,$3)", ["info", "scanner_tick", JSON.stringify({ opportunities: opportunities.length })]);
    } catch (error) {
      await getPostgresPool().query("INSERT INTO bot_events (level,event_type,payload) VALUES ($1,$2,$3)", ["error", "scanner_error", JSON.stringify({ message: error instanceof Error ? error.message : String(error) })]);
    }
  }
}
