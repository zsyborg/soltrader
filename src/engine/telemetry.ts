import { performance } from "node:perf_hooks";
import { getPostgresPool } from "../storage/postgres.js";

export interface ExecutionTelemetry { opportunityId: string; detectionToDecisionMs: number; decisionToSimulationMs: number; simulationToSubmitMs?: number; submitToConfirmationMs?: number; totalMs: number; status: string; error?: string; }

export function startTimer(): number { return performance.now(); }

export async function recordExecutionTelemetry(data: ExecutionTelemetry): Promise<void> {
  await getPostgresPool().query(
    `INSERT INTO execution_attempts (opportunity_id,status,detection_to_decision_ms,decision_to_simulation_ms,simulation_to_submit_ms,submit_to_confirmation_ms,total_ms,error)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [data.opportunityId, data.status, data.detectionToDecisionMs, data.decisionToSimulationMs, data.simulationToSubmitMs ?? null, data.submitToConfirmationMs ?? null, data.totalMs, data.error ?? null],
  );
}

export async function recordMarketSnapshot(slot: bigint, provider: string, inputMint: string, outputMint: string, amountIn: bigint, amountOut: bigint, latencyMs: number): Promise<void> {
  await getPostgresPool().query(
    `INSERT INTO market_snapshots (slot,provider,input_mint,output_mint,amount_in,amount_out,latency_ms) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [slot.toString(), provider, inputMint, outputMint, amountIn.toString(), amountOut.toString(), latencyMs],
  );
}
