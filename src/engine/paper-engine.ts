import type { ArbitrageOpportunity } from "../market/types.js";
import { getPostgresPool } from "../storage/postgres.js";

export class PaperExecutionEngine {
  async execute(opportunity: ArbitrageOpportunity): Promise<void> {
    const pool = getPostgresPool();
    await pool.query(
      `INSERT INTO opportunities
       (id,input_token,buy_venue,sell_venue,amount_in,expected_amount_out,gross_profit,swap_fees,network_fees,priority_fees,estimated_slippage,expected_net_profit,profit_bps,slot,expires_at,status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,to_timestamp($15 / 1000.0),'approved')`,
      [opportunity.id, opportunity.inputMint, opportunity.buyVenue, opportunity.sellVenue, opportunity.amountIn.toString(), opportunity.sellAmountOut.toString(), opportunity.grossProfit.toString(), opportunity.swapFees.toString(), opportunity.networkFees.toString(), opportunity.priorityFees.toString(), opportunity.estimatedSlippage.toString(), opportunity.expectedNetProfit.toString(), opportunity.profitBps, opportunity.slot.toString(), opportunity.expiresAt],
    );

    if (Date.now() > opportunity.expiresAt) {
      await pool.query("UPDATE opportunities SET status='expired' WHERE id=$1", [opportunity.id]);
      return;
    }

    await pool.query(
      `INSERT INTO paper_trades (opportunity_id,status,input_amount,expected_profit,realized_profit,completed_at)
       VALUES ($1,'simulated',$2,$3,$3,NOW())`,
      [opportunity.id, opportunity.amountIn.toString(), opportunity.expectedNetProfit.toString()],
    );
    await pool.query("UPDATE opportunities SET status='executed' WHERE id=$1", [opportunity.id]);
    await pool.query("INSERT INTO bot_events (level,event_type,payload) VALUES ($1,$2,$3)", ["info", "paper_trade", JSON.stringify({ opportunityId: opportunity.id, profitBps: opportunity.profitBps })]);
  }
}
