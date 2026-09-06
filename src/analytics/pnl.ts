import { getPostgresPool } from "../storage/postgres.js";

export interface PnlSummary { realized: string; expected: string; trades: number; wins: number; losses: number; winRate: number; avgProfit: string; }

export async function getPnlSummary(hours = 24): Promise<PnlSummary> {
  const result = await getPostgresPool().query<{ realized: string; expected: string; trades: number; wins: number; losses: number; avg_profit: string }>(
    `SELECT COALESCE(SUM(realized_profit),0)::text realized,
            COALESCE(SUM(expected_profit),0)::text expected,
            COUNT(*)::int trades,
            COUNT(*) FILTER (WHERE realized_profit > 0)::int wins,
            COUNT(*) FILTER (WHERE realized_profit < 0)::int losses,
            COALESCE(AVG(realized_profit),0)::text avg_profit
       FROM paper_trades WHERE created_at >= NOW() - ($1::text || ' hours')::interval`, [hours],
  );
  const row = result.rows[0] ?? { realized: "0", expected: "0", trades: 0, wins: 0, losses: 0, avg_profit: "0" };
  return { realized: row.realized, expected: row.expected, trades: row.trades, wins: row.wins, losses: row.losses, winRate: row.trades ? row.wins / row.trades : 0, avgProfit: row.avg_profit };
}

export async function getPnlSeries(hours = 24): Promise<Array<{ bucket: string; realized: string; expected: string }>> {
  const result = await getPostgresPool().query(`
    SELECT date_trunc('hour', created_at) AS bucket,
           COALESCE(SUM(realized_profit),0)::text AS realized,
           COALESCE(SUM(expected_profit),0)::text AS expected
      FROM paper_trades
     WHERE created_at >= NOW() - ($1::text || ' hours')::interval
     GROUP BY 1 ORDER BY 1`, [hours]);
  return result.rows.map((row) => ({ bucket: new Date(row.bucket).toISOString(), realized: row.realized, expected: row.expected }));
}

export async function getLatencySummary(hours = 24): Promise<Record<string, number | null>> {
  const result = await getPostgresPool().query(`
    SELECT AVG(detection_to_decision_ms) detection,
           AVG(decision_to_simulation_ms) simulation,
           AVG(simulation_to_submit_ms) submit,
           AVG(submit_to_confirmation_ms) confirmation,
           AVG(total_ms) total
      FROM execution_attempts WHERE created_at >= NOW() - ($1::text || ' hours')::interval`, [hours]);
  const row = result.rows[0] ?? {};
  return { detectionToDecisionMs: row.detection === null ? null : Number(row.detection), decisionToSimulationMs: row.simulation === null ? null : Number(row.simulation), simulationToSubmitMs: row.submit === null ? null : Number(row.submit), submitToConfirmationMs: row.confirmation === null ? null : Number(row.confirmation), totalMs: row.total === null ? null : Number(row.total) };
}
