import pino from "pino";
import { loadConfig } from "./config/env.js";
import { getCurrentSlot } from "./solana/client.js";

const config = loadConfig();
const logger = pino({ level: config.logLevel });

async function main(): Promise<void> {
  logger.info(
    {
      mode: config.tradingMode,
      liveTradingEnabled: config.liveTradingEnabled,
      rpc: config.solanaRpcUrl,
    },
    "soltrader starting",
  );

  const slot = await getCurrentSlot(config.solanaRpcUrl);
  logger.info({ slot: slot.toString() }, "connected to Solana RPC");

  if (config.tradingMode !== "live") {
    logger.info("live transaction submission is disabled; running in safe research mode");
  }
}

main().catch((error: unknown) => {
  logger.fatal({ error }, "soltrader failed to start");
  process.exitCode = 1;
});
