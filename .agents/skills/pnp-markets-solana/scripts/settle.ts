#!/usr/bin/env npx ts-node
/**
 * Settle a prediction market with the winning outcome on Solana
 * Run with --help for usage
 */

import { PNPClient } from "pnp-sdk";
import { PublicKey } from "@solana/web3.js";

interface Args {
  market: string;
  outcome: "YES" | "NO";
  help?: boolean;
  status?: boolean;
}

function printHelp(): void {
  console.log(`
PNP Markets (Solana) - Settle Market

USAGE:
  npx ts-node settle.ts [OPTIONS]

REQUIRED:
  --market <address>        Market address (base58)
  --outcome <YES|NO>        Winning outcome

OPTIONAL:
  --status                  Check settlement status only
  --help                    Show this help message

ENVIRONMENT:
  PRIVATE_KEY               Solana wallet private key (required, must be oracle)
  RPC_URL                   Solana RPC endpoint (optional)

NOTE:
  Only the market oracle can settle the market.
  For custom oracle markets, the oracle must first call setMarketResolvable.
  Market can only be settled after the trading period ends.

EXAMPLES:
  # Settle market as YES
  npx ts-node settle.ts --market <address> --outcome YES

  # Check if market is settled
  npx ts-node settle.ts --status --market <address>
`);
}

function parseArgs(): Args {
  const args = process.argv.slice(2);
  const parsed: Partial<Args> = {};

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--help":
      case "-h":
        parsed.help = true;
        break;
      case "--status":
        parsed.status = true;
        break;
      case "--market":
        parsed.market = args[++i];
        break;
      case "--outcome":
        parsed.outcome = args[++i]?.toUpperCase() as "YES" | "NO";
        break;
    }
  }

  return {
    market: parsed.market || "",
    outcome: parsed.outcome || "YES",
    help: parsed.help,
    status: parsed.status,
  };
}

async function main(): Promise<void> {
  const args = parseArgs();

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  if (!args.market) {
    console.error("Error: --market is required");
    printHelp();
    process.exit(1);
  }

  // Validate market address
  let marketPubkey: PublicKey;
  try {
    marketPubkey = new PublicKey(args.market);
  } catch {
    console.error("Error: Invalid market address");
    process.exit(1);
  }

  const rpcUrl = process.env.RPC_URL || "https://api.mainnet-beta.solana.com";

  // For status check, we can use read-only client
  const client = args.status && !process.env.PRIVATE_KEY
    ? new PNPClient(rpcUrl)
    : new PNPClient(rpcUrl, process.env.PRIVATE_KEY);

  if (!args.status && !process.env.PRIVATE_KEY) {
    console.error("Error: PRIVATE_KEY environment variable is required for settlement");
    process.exit(1);
  }

  // Fetch market info using trading module's getMarketInfo
  console.log("\n📊 Market Status\n");

  try {
    const marketInfo = await client.trading!.getMarketInfo(marketPubkey);

    console.log(`Market:     ${args.market}`);
    console.log(`End Time:   ${new Date(Number(marketInfo.endTime) * 1000).toISOString()}`);
    console.log(`Settled:    ${marketInfo.resolved}`);

    if (marketInfo.resolved) {
      // winningTokenId: 0 = none, 1 = yes, 2 = no
      const winner = marketInfo.winningTokenId === 1 ? "YES" : (marketInfo.winningTokenId === 2 ? "NO" : "NONE");
      console.log(`Winner:     ${winner}`);

      if (args.status) {
        console.log("\n--- JSON OUTPUT ---");
        console.log(JSON.stringify({ settled: true, winner }, null, 2));
      }
      process.exit(0);
    }

    if (args.status) {
      const now = Math.floor(Date.now() / 1000);
      const endTime = Number(marketInfo.endTime);
      const canSettle = now >= endTime && marketInfo.resolvable;

      console.log(`Resolvable: ${marketInfo.resolvable}`);
      console.log(`\nCan Settle: ${canSettle}`);
      if (now < endTime) {
        const remaining = endTime - now;
        const hours = Math.floor(remaining / 3600);
        const mins = Math.floor((remaining % 3600) / 60);
        console.log(`Time Left:  ${hours}h ${mins}m`);
      }

      console.log("\n--- JSON OUTPUT ---");
      console.log(JSON.stringify({ settled: false, canSettle, resolvable: marketInfo.resolvable, endTime }, null, 2));
      process.exit(0);
    }

    // Validate settlement params
    if (args.outcome !== "YES" && args.outcome !== "NO") {
      console.error("\nError: --outcome must be YES or NO");
      process.exit(1);
    }

    const now = Math.floor(Date.now() / 1000);
    const endTime = Number(marketInfo.endTime);
    if (now < endTime) {
      const remaining = endTime - now;
      const hours = Math.floor(remaining / 3600);
      const mins = Math.floor((remaining % 3600) / 60);
      console.error(`\n❌ Cannot settle yet. Trading ends in ${hours}h ${mins}m`);
      process.exit(1);
    }

    // Execute settlement
    console.log(`\n⚖️ Settling Market\n`);
    console.log(`Outcome:    ${args.outcome}`);
    console.log("");

    const result = await client.settleMarket({
      market: marketPubkey,
      yesWinner: args.outcome === "YES",
    });

    console.log("✅ Market Settled!\n");
    console.log(`Winner:    ${args.outcome}`);
    console.log(`Signature: ${result.signature}`);
    console.log(`\nSolscan:   https://solscan.io/tx/${result.signature}`);

    console.log("\n--- JSON OUTPUT ---");
    console.log(JSON.stringify({ settled: true, winner: args.outcome, signature: result.signature }, null, 2));

  } catch (error: any) {
    console.error("\n❌ Settlement failed:", error.message);
    process.exit(1);
  }
}

main();
