import pino from "pino";
import { loadConfig } from "./config/env.js";
import { getCurrentSlot } from "./solana/client.js";
import { initializeDatabase } from "./storage/init.js";
import { checkPostgres, closePostgres } from "./storage/postgres.js";
import { checkRedis, closeRedis } from "./storage/redis.js";
import { startApiServer } from "./api/server.js";

const config = loadConfig();
const logger = pino({ level: config.logLevel });

async function main(): Promise<void> {
  await checkPostgres(config.databaseUrl);
  await initializeDatabase();
  await checkRedis(config.redisUrl);

  const server = startApiServer(config.apiPort);
  logger.info({ mode: config.tradingMode, rpc: config.solanaRpcUrl, apiPort: config.apiPort }, "soltrader starting");
  const slot = await getCurrentSlot(config.solanaRpcUrl);
  logger.info({ slot: slot.toString() }, "connected to Solana RPC");
  logger.info("paper/simulation mode is enabled; live transaction submission remains disabled");

  const shutdown = async (signal: string) => {
    logger.info({ signal }, "shutting down");
    server.close();
    await closeRedis();
    await closePostgres();
  };
  process.once("SIGINT", () => void shutdown("SIGINT"));
  process.once("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((error: unknown) => {
  logger.fatal({ error }, "soltrader failed to start");
  process.exitCode = 1;
});
