import pino from "pino";
import { loadConfig } from "./config/env.js";
import { getCurrentSlot } from "./solana/client.js";
import { initializeDatabase } from "./storage/init.js";
import { checkPostgres, closePostgres } from "./storage/postgres.js";
import { checkRedis, closeRedis } from "./storage/redis.js";

const config = loadConfig();
const logger = pino({ level: config.logLevel });

async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, "shutting down soltrader");
  await Promise.allSettled([closeRedis(), closePostgres()]);
}

async function main(): Promise<void> {
  logger.info(
    {
      mode: config.tradingMode,
      liveTradingEnabled: config.liveTradingEnabled,
      rpc: config.solanaRpcUrl,
    },
    "soltrader starting",
  );

  await checkPostgres(config.databaseUrl);
  await initializeDatabase();
  logger.info("PostgreSQL connected and schema initialized");

  await checkRedis(config.redisUrl);
  logger.info("Redis connected");

  const slot = await getCurrentSlot(config.solanaRpcUrl);
  logger.info({ slot: slot.toString() }, "connected to Solana RPC");

  if (config.tradingMode !== "live") {
    logger.info("live transaction submission is disabled; running in safe research mode");
  }
}

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));

main().catch(async (error: unknown) => {
  logger.fatal({ error }, "soltrader failed to start");
  await shutdown("startup failure");
  process.exitCode = 1;
});
