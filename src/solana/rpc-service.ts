export interface SolanaNetworkSnapshot {
  slot: bigint;
  blockHeight?: bigint;
  epoch?: bigint;
  blockhash?: string;
  fetchedAt: number;
}

interface JsonRpcResponse<T> { result?: T; error?: { code: number; message: string }; }

export class SolanaRpcService {
  constructor(private readonly rpcUrl: string) {}

  async request<T>(method: string, params: unknown[] = []): Promise<T> {
    const response = await fetch(this.rpcUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method, params }),
    });
    if (!response.ok) throw new Error(`Solana RPC HTTP ${response.status}`);
    const body = (await response.json()) as JsonRpcResponse<T>;
    if (body.error) throw new Error(`Solana RPC ${body.error.code}: ${body.error.message}`);
    if (body.result === undefined) throw new Error(`Solana RPC ${method}: missing result`);
    return body.result;
  }

  async getSnapshot(): Promise<SolanaNetworkSnapshot> {
    const [slot, blockHeight, blockhash] = await Promise.all([
      this.request<number>("getSlot", [{ commitment: "processed" }]),
      this.request<number>("getBlockHeight", [{ commitment: "processed" }]),
      this.request<{ value: { blockhash: string } }>("getLatestBlockhash", [{ commitment: "processed" }]),
    ]);
    return { slot: BigInt(slot), blockHeight: BigInt(blockHeight), blockhash: blockhash.value.blockhash, fetchedAt: Date.now() };
  }

  async getBalance(address: string): Promise<bigint> {
    const result = await this.request<{ value: number }>("getBalance", [address, { commitment: "confirmed" }]);
    return BigInt(result.value);
  }

  async simulateTransaction(base64Transaction: string, sigVerify = false): Promise<unknown> {
    return this.request("simulateTransaction", [base64Transaction, { encoding: "base64", sigVerify, replaceRecentBlockhash: true }]);
  }
}
