import { createClient } from "@solana/kit";
import { solanaRpc } from "@solana/kit-plugin-rpc";

export function createSolanaClient(rpcUrl: string) {
  return createClient().use(solanaRpc({ rpcUrl }));
}

export async function getCurrentSlot(rpcUrl: string): Promise<bigint> {
  const client = createSolanaClient(rpcUrl);
  return await client.rpc.getSlot().send();
}
