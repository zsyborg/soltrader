import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import { URL } from "node:url";
import { getPostgresPool } from "../storage/postgres.js";
import { getRedisClient } from "../storage/redis.js";

export interface BotRuntimeState {
  status: "running" | "paused" | "stopped";
  mode: "paper" | "simulation" | "live";
  startedAt: string;
  lastSlot?: string;
}

let state: BotRuntimeState = {
  status: "running",
  mode: (process.env.TRADING_MODE as BotRuntimeState["mode"]) || "paper",
  startedAt: new Date().toISOString(),
};

const json = (res: ServerResponse, status: number, body: unknown): void => {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "access-control-allow-origin": "*" });
  res.end(JSON.stringify(body));
};

async function readBody(req: IncomingMessage): Promise<string> {
  let body = "";
  for await (const chunk of req) body += chunk;
  return body;
}

async function dashboard(): Promise<Record<string, unknown>> {
  const pool = getPostgresPool();
  const [opps, trades, events, pnl] = await Promise.all([
    pool.query("SELECT COUNT(*)::int AS count, COUNT(*) FILTER (WHERE status IN ('detected','approved'))::int AS active FROM opportunities WHERE detected_at > NOW() - INTERVAL '24 hours'"),
    pool.query("SELECT COUNT(*)::int AS count, COUNT(*) FILTER (WHERE status IN ('simulated','executed'))::int AS successful FROM paper_trades WHERE created_at > NOW() - INTERVAL '24 hours'"),
    pool.query("SELECT id, level, event_type, payload, created_at FROM bot_events ORDER BY created_at DESC LIMIT 50"),
    pool.query("SELECT COALESCE(SUM(realized_profit),0)::text AS realized, COALESCE(SUM(expected_profit),0)::text AS expected FROM paper_trades WHERE created_at > NOW() - INTERVAL '24 hours'"),
  ]);
  return { state, opportunities: opps.rows[0], trades: trades.rows[0], pnl: pnl.rows[0], events: events.rows };
}

export function startApiServer(port = Number(process.env.API_PORT ?? 8787)): ReturnType<typeof createServer> {
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
      if (req.method === "OPTIONS") return json(res, 204, {});
      if (url.pathname === "/health") return json(res, 200, { ok: true, state });
      if (url.pathname === "/api/dashboard" && req.method === "GET") return json(res, 200, await dashboard());
      if (url.pathname === "/api/bot" && req.method === "GET") return json(res, 200, state);
      if (url.pathname === "/api/bot/control" && req.method === "POST") {
        const body = JSON.parse(await readBody(req) || "{}");
        if (!["running", "paused", "stopped"].includes(body.status)) return json(res, 400, { error: "Invalid status" });
        state = { ...state, status: body.status };
        await getPostgresPool().query("INSERT INTO bot_events (level,event_type,payload) VALUES ($1,$2,$3)", ["info", "bot_control", JSON.stringify({ status: state.status, id: randomUUID() })]);
        return json(res, 200, state);
      }
      if (url.pathname === "/api/settings" && req.method === "GET") return json(res, 200, {
        minProfitBps: Number(process.env.MIN_PROFIT_BPS ?? 30), maxSlippageBps: Number(process.env.MAX_SLIPPAGE_BPS ?? 20), maxTradeUsd: Number(process.env.MAX_TRADE_USD ?? 100), maxDailyLossUsd: Number(process.env.MAX_DAILY_LOSS_USD ?? 25), minLiquidityUsd: Number(process.env.MIN_LIQUIDITY_USD ?? 10000), opportunityTtlMs: Number(process.env.OPPORTUNITY_TTL_MS ?? 1000),
      });
      return json(res, 404, { error: "Not found" });
    } catch (error) {
      return json(res, 500, { error: error instanceof Error ? error.message : "Internal server error" });
    }
  });
  server.listen(port, "127.0.0.1", () => console.log(`SolTrader API listening on http://127.0.0.1:${port}`));
  return server;
}
