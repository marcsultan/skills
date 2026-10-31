#!/usr/bin/env npx ts-node
/**
 * Redeem winning tokens for collateral after settlement on Solana
 * Run with --help for usage
 */

import { PNPClient } from "pnp-sdk";
import { PublicKey } from "@solana/web3.js";

interface Args {
  market: string;
  help?: boolean;
}

function printHelp(): void {
  console.log(`
PNP Markets (Solana) - Redeem Winnings

USAGE:
  npx ts-node redeem.ts --market <address>

REQUIRED:
  --market <address>        Market address (base58)

OPTIONAL:
  --help                    Show this help message

ENVIRONMENT:
  PRIVATE_KEY               Solana wallet private key (required)
  RPC_URL                   Solana RPC endpoint (optional)

NOTE:
  Can only redeem after market is settled.
  Must hold winning outcome tokens to redeem.

EXAMPLES:
  npx ts-node redeem.ts --market <address>
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
      case "--market":
        parsed.market = args[++i];
        break;
    }
  }

  return {
    market: parsed.market || "",
    help: parsed.help,
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

  if (!process.env.PRIVATE_KEY) {
    console.error("Error: PRIVATE_KEY environment variable is required");
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
  const client = new PNPClient(rpcUrl, process.env.PRIVATE_KEY);

  // Check settlement status using trading module's getMarketInfo
  console.log("\n📊 Checking Market\n");

  try {
    const marketInfo = await client.trading!.getMarketInfo(marketPubkey);

    console.log(`Market:     ${args.market}`);

    if (!marketInfo.resolved) {
      console.error("\n❌ Market is not yet settled. Cannot redeem.");
      process.exit(1);
    }

    // winningTokenId: 0 = none, 1 = yes, 2 = no
    const winner = marketInfo.winningTokenId === 1 ? "YES" : (marketInfo.winningTokenId === 2 ? "NO" : "NONE");
    console.log(`Winner:     ${winner}`);
    console.log(`Collateral: ${marketInfo.collateralToken.toBase58()}`);

    // Execute redemption
    console.log(`\n💰 Redeeming Position\n`);

    await client.redeemPosition(marketPubkey);

    console.log("✅ Redemption Successful!\n");
    console.log(`\nSolscan:   Check wallet for transaction`);

    console.log("\n--- JSON OUTPUT ---");
    console.log(JSON.stringify({ redeemed: true }, null, 2));

  } catch (error: any) {
    console.error("\n❌ Redemption failed:", error.message);
    process.exit(1);
  }
}

main();
