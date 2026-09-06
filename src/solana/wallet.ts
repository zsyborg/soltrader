import { signerFromFile, type SolanaSigner } from "@solana/kit-plugin-signer";
import type { Config } from "../config/env.js";

export interface WalletSnapshot {
  configured: boolean;
  address: string | null;
  cluster: string;
  keypairPath: string | null;
}

export class SolanaWallet {
  private signer: SolanaSigner | null = null;

  constructor(private readonly config: Config) {}

  isConfigured(): boolean {
    return Boolean(this.config.walletKeypairPath);
  }

  async getSigner(): Promise<SolanaSigner> {
    if (this.signer) return this.signer;
    if (!this.config.walletKeypairPath) {
      throw new Error("SOLANA_KEYPAIR_PATH is not configured");
    }
    this.signer = await signerFromFile(this.config.walletKeypairPath);
    return this.signer;
  }

  async getSnapshot(): Promise<WalletSnapshot> {
    if (!this.isConfigured()) {
      return { configured: false, address: null, cluster: this.config.cluster, keypairPath: null };
    }
    const signer = await this.getSigner();
    return {
      configured: true,
      address: signer.address,
      cluster: this.config.cluster,
      keypairPath: this.config.walletKeypairPath ?? null,
    };
  }
}
