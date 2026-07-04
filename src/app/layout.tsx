import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import WalletProviders from "@/components/WalletProviders";
import Nav from "@/components/Nav";
import { CLUSTER } from "@/lib/constants";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SolTip | Get paid in seconds",
  description:
    "Create your personal Solana pay link. Share it, get tipped in SOL or USDC, settled in about a second, fees near zero.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-screen flex-col">
        <WalletProviders>
          <Nav />
          <main className="flex flex-1 flex-col">{children}</main>
          {CLUSTER === "devnet" && (
            <div className="no-print fixed bottom-4 left-4 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-400">
              Devnet (test money only)
            </div>
          )}
        </WalletProviders>
      </body>
    </html>
  );
}
