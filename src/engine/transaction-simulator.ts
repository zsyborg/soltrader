import { SolanaRpcService } from "../solana/rpc-service.js";

export interface TransactionSimulationResult {
  ok: boolean;
  unitsConsumed?: number;
  logs?: string[];
  err?: unknown;
  raw: unknown;
  latencyMs: number;
}

export class TransactionSimulator {
  private readonly rpc: SolanaRpcService;
  constructor(rpcUrl: string) { this.rpc = new SolanaRpcService(rpcUrl); }

  async simulate(base64Transaction: string): Promise<TransactionSimulationResult> {
    const started = Date.now();
    const raw = await this.rpc.simulateTransaction(base64Transaction, false) as { value?: { err?: unknown; logs?: string[]; unitsConsumed?: number } };
    const value = raw.value ?? {};
    return { ok: !value.err, unitsConsumed: value.unitsConsumed, logs: value.logs, err: value.err, raw, latencyMs: Date.now() - started };
  }
}
