import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "SolTrader", description: "Solana arbitrage control center" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
