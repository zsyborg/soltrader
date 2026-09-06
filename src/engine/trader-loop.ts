import type { Config } from "../config/env.js";
import { getRuntimeSettings } from "../config/runtime-settings.js";
import { SimulatedQuoteProvider } from "../market/simulator.js";
import { JupiterQuoteProvider } from "../market/jupiter.js";
import { OpportunityScanner } from "../strategy/scanner.js";
import { PaperExecutionEngine } from "./paper-engine.js";
import { RiskEngine } from "./risk-engine.js";
import { getPostgresPool } from "../storage/postgres.js";
import { recordExecutionTelemetry, recordMarketSnapshot } from "./telemetry.js";

const SOL_MINT="So11111111111111111111111111111111111111112";
const USDC_MINT="EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

export class TraderLoop {
 private timer:NodeJS.Timeout|undefined; private running=false;
 constructor(private readonly config:Config){}
 start():void{if(this.timer)return;this.running=true;void this.tick();this.timer=setInterval(()=>void this.tick(),2000);}
 pause():void{this.running=false;}
 resume():void{this.running=true;void this.tick();}
 stop():void{if(this.timer)clearInterval(this.timer);this.timer=undefined;this.running=false;}

 private async tick():Promise<void>{
  if(!this.running)return;
  try{
   const settings=await getRuntimeSettings();
   const scanConfig={...this.config,...settings};
   const amount=BigInt(Math.max(1,Math.floor(settings.maxTradeUsd*1_000_000)));
   const provider=this.config.quoteProvider==="jupiter"
    ?new JupiterQuoteProvider({baseUrl:this.config.jupiterApiUrl,apiKey:this.config.jupiterApiKey})
    :new SimulatedQuoteProvider();
   const quoteStarted=Date.now();
   const quotes=await provider.getQuotes(SOL_MINT,USDC_MINT,amount);
   for(const quote of quotes) await recordMarketSnapshot(quote.slot,provider.name,quote.inputMint,quote.outputMint,quote.amountIn,quote.amountOut,Date.now()-quoteStarted);

   if(this.config.quoteProvider==="jupiter"){
    await getPostgresPool().query("INSERT INTO bot_events (level,event_type,payload) VALUES ($1,$2,$3)",["info","market_quote",JSON.stringify({provider:provider.name,quotes:quotes.length,latencyMs:Date.now()-quoteStarted})]);
    return;
   }

   const scanner=new OpportunityScanner(scanConfig,provider);
   const opportunities=await scanner.scan({inputMint:SOL_MINT,outputMint:USDC_MINT,amountIn:amount});
   const risk=new RiskEngine(scanConfig);
   const engine=new PaperExecutionEngine();
   for(const opportunity of opportunities.slice(0,3)){
    const started=Date.now();
    const decision=await risk.approve(opportunity);
    await getPostgresPool().query("INSERT INTO risk_events (opportunity_id,decision,reason) VALUES ($1,$2,$3)",[opportunity.id,decision.approved?"approved":"rejected",decision.reason??null]);
    if(!decision.approved)continue;
    try{
      const decisionAt=Date.now();
      await engine.execute(opportunity);
      await recordExecutionTelemetry({opportunityId:opportunity.id,status:"paper_executed",detectionToDecisionMs:decisionAt-opportunity.detectedAt,decisionToSimulationMs:Date.now()-decisionAt,totalMs:Date.now()-started});
    } finally { await risk.release(decision.lockKey); }
   }
   await getPostgresPool().query("INSERT INTO bot_events (level,event_type,payload) VALUES ($1,$2,$3)",["info","scanner_tick",JSON.stringify({provider:provider.name,opportunities:opportunities.length,settings})]);
  }catch(error){
   await getPostgresPool().query("INSERT INTO bot_events (level,event_type,payload) VALUES ($1,$2,$3)",["error","scanner_error",JSON.stringify({message:error instanceof Error?error.message:String(error)})]);
  }
 }
}
