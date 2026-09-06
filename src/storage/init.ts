import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { getPostgresPool } from "./postgres.js";

export async function initializeDatabase(): Promise<void> {
  const schemaPath = fileURLToPath(new URL("./schema.sql", import.meta.url));
  const schema = await readFile(schemaPath, "utf8");
  await getPostgresPool().query(schema);
}
