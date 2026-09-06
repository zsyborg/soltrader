import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import { URL } from "node:url";
import { getPostgresPool } from "../storage/postgres.js";
import { getRedisClient } from "../storage/redis.js";
import { getRuntimeSettings, setRuntimeSettings, type RuntimeSettings } from "../config/runtime-settings.js";
import type { TraderLoop } from "../engine/trader-loop.js";
import { getCurrentSlot } from "../solana/client.js";

export interface BotRuntimeState { status: "running" | "paused" | "stopped"; mode: "paper" | "simulation" | "live"; startedAt: string; lastSlot?: string; }
let state: BotRuntimeState = { status: "stopped", mode: (process.env.TRADING_MODE as BotRuntimeState["mode"]) || "paper", startedAt: new Date().toISOString() };
const json = (res: ServerResponse, status: number, body: unknown): void => { res.writeHead(status, { "content-type": "application/json; charset=utf-8", "access-control-allow-origin": "*", "access-control-allow-headers": "content-type" }); res.end(JSON.stringify(body)); };
async function readBody(req: IncomingMessage): Promise<string> { let body=""; for await (const chunk of req) body += chunk; return body; }
async function dashboard(): Promise<Record<string, unknown>> {
 const pool=getPostgresPool();
 const [opps,trades,events,pnl,latest]=await Promise.all([
  pool.query("SELECT COUNT(*)::int AS count, COUNT(*) FILTER (WHERE status IN ('detected','approved'))::int AS active FROM opportunities WHERE detected_at > NOW() - INTERVAL '24 hours'"),
  pool.query("SELECT COUNT(*)::int AS count, COUNT(*) FILTER (WHERE status IN ('simulated','executed'))::int AS successful FROM paper_trades WHERE created_at > NOW() - INTERVAL '24 hours'"),
  pool.query("SELECT id, level, event_type, payload, created_at FROM bot_events ORDER BY created_at DESC LIMIT 50"),
  pool.query("SELECT COALESCE(SUM(realized_profit),0)::text AS realized, COALESCE(SUM(expected_profit),0)::text AS expected FROM paper_trades WHERE created_at > NOW() - INTERVAL '24 hours'"),
  pool.query("SELECT id,input_token,buy_venue,sell_venue,profit_bps,expected_net_profit,status,detected_at,expires_at FROM opportunities ORDER BY detected_at DESC LIMIT 50"),
 ]);
 return {state,opportunities:opps.rows[0],trades:trades.rows[0],pnl:pnl.rows[0],events:events.rows,latestOpportunities:latest.rows,settings:await getRuntimeSettings()};
}
export function startApiServer(port:number, loop:TraderLoop, rpcUrl:string): ReturnType<typeof createServer> {
 const server=createServer(async(req,res)=>{try{
  const url=new URL(req.url??"/",`http://${req.headers.host??"localhost"}`);
  if(req.method==="OPTIONS") return json(res,204,{});
  if(url.pathname==="/health") return json(res,200,{ok:true,state});
  if(url.pathname==="/api/solana"&&req.method==="GET") return json(res,200,{cluster:process.env.SOLANA_CLUSTER??"devnet",rpcUrl,slot:(await getCurrentSlot(rpcUrl)).toString(),liveTradingEnabled:process.env.LIVE_TRADING_ENABLED==="true"});
  if(url.pathname==="/api/dashboard"&&req.method==="GET") return json(res,200,await dashboard());
  if(url.pathname==="/api/bot"&&req.method==="GET") return json(res,200,state);
  if(url.pathname==="/api/bot/control"&&req.method==="POST"){
   const body=JSON.parse(await readBody(req)||"{}"); if(!["running","paused","stopped"].includes(body.status))return json(res,400,{error:"Invalid status"});
   state={...state,status:body.status}; if(body.status==="running")loop.resume();else if(body.status==="paused")loop.pause();else loop.stop();
   await getPostgresPool().query("INSERT INTO bot_events (level,event_type,payload) VALUES ($1,$2,$3)",["info","bot_control",JSON.stringify({status:state.status,id:randomUUID()})]); return json(res,200,state);
  }
  if(url.pathname==="/api/settings"&&req.method==="GET")return json(res,200,await getRuntimeSettings());
  if(url.pathname==="/api/settings"&&req.method==="POST"){
   const patch=JSON.parse(await readBody(req)||"{}") as Partial<RuntimeSettings>; const allowed=Object.keys(patch).every(k=>["minProfitBps","maxSlippageBps","maxTradeUsd","maxDailyLossUsd","minLiquidityUsd","opportunityTtlMs"].includes(k));
   if(!allowed)return json(res,400,{error:"Unsupported setting"}); const settings=await setRuntimeSettings(patch);
   await getPostgresPool().query("INSERT INTO bot_events (level,event_type,payload) VALUES ($1,$2,$3)",["info","settings_updated",JSON.stringify(settings)]); const redis=await getRedisClient(); await redis.publish("soltrader:settings",JSON.stringify(settings)); return json(res,200,settings);
  }
  return json(res,404,{error:"Not found"});
 }catch(error){return json(res,500,{error:error instanceof Error?error.message:"Internal server error"});}});
 server.listen(port,"127.0.0.1",()=>console.log(`SolTrader API listening on http://127.0.0.1:${port}`)); return server;
}
