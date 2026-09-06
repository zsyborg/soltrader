import { getPostgresPool } from "./postgres.js";

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS opportunities (
  id TEXT PRIMARY KEY,
  input_token TEXT NOT NULL,
  buy_venue TEXT NOT NULL,
  sell_venue TEXT NOT NULL,
  amount_in NUMERIC(78, 0) NOT NULL,
  expected_amount_out NUMERIC(78, 0) NOT NULL,
  gross_profit NUMERIC(78, 0) NOT NULL,
  swap_fees NUMERIC(78, 0) NOT NULL DEFAULT 0,
  network_fees NUMERIC(78, 0) NOT NULL DEFAULT 0,
  priority_fees NUMERIC(78, 0) NOT NULL DEFAULT 0,
  estimated_slippage NUMERIC(78, 0) NOT NULL DEFAULT 0,
  expected_net_profit NUMERIC(78, 0) NOT NULL,
  profit_bps NUMERIC(20, 4) NOT NULL,
  slot BIGINT NOT NULL,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'detected',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_opportunities_detected_at ON opportunities (detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_opportunities_status ON opportunities (status);
CREATE INDEX IF NOT EXISTS idx_opportunities_pair ON opportunities (input_token, detected_at DESC);
CREATE TABLE IF NOT EXISTS paper_trades (
  id BIGSERIAL PRIMARY KEY,
  opportunity_id TEXT NOT NULL REFERENCES opportunities(id),
  status TEXT NOT NULL DEFAULT 'simulated',
  input_amount NUMERIC(78, 0) NOT NULL,
  expected_profit NUMERIC(78, 0) NOT NULL,
  realized_profit NUMERIC(78, 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_paper_trades_created_at ON paper_trades (created_at DESC);
CREATE TABLE IF NOT EXISTS bot_events (
  id BIGSERIAL PRIMARY KEY,
  level TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bot_events_created_at ON bot_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bot_events_type ON bot_events (event_type, created_at DESC);
`;

export async function initializeDatabase(): Promise<void> {
  await getPostgresPool().query(SCHEMA_SQL);
}
