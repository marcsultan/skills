#!/usr/bin/env npx ts-node
/**
 * Trade on a prediction market (buy/sell YES or NO tokens) on Solana
 * Run with --help for usage
 */

import { PNPClient } from "pnp-sdk";
import { PublicKey } from "@solana/web3.js";

interface Args {
  market: string;
  action: "buy" | "sell";
  outcome: "YES" | "NO";
  amount: string;
  decimals: number;
  help?: boolean;
  info?: boolean;
}

function printHelp(): void {
  console.log(`
PNP Markets (Solana) - Trade on Market

USAGE:
  npx ts-node trade.ts [OPTIONS]

ACTIONS:
  --buy                     Buy outcome tokens with collateral
  --sell                    Sell outcome tokens for collateral

REQUIRED:
  --market <address>        Market address (base58)
  --outcome <YES|NO>        Outcome to trade
  --amount <number>         Amount to trade (in collateral token units)

OPTIONAL:
  --decimals <number>       Token decimals (default: 6 for USDC)
  --info                    Show market info only, don't trade
  --help                    Show this help message

ENVIRONMENT:
  PRIVATE_KEY               Solana wallet private key (base58)
  RPC_URL                   Solana RPC endpoint (optional)

EXAMPLES:
  # Buy YES tokens with 10 USDC
  npx ts-node trade.ts --buy --market <address> --outcome YES --amount 10

  # Sell 5 NO tokens
  npx ts-node trade.ts --sell --market <address> --outcome NO --amount 5

  # Check market prices
  npx ts-node trade.ts --info --market <address>
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
      case "--info":
        parsed.info = true;
        break;
      case "--buy":
        parsed.action = "buy";
        break;
      case "--sell":
        parsed.action = "sell";
        break;
      case "--market":
        parsed.market = args[++i];
        break;
      case "--outcome":
        parsed.outcome = args[++i]?.toUpperCase() as "YES" | "NO";
        break;
      case "--amount":
        parsed.amount = args[++i];
        break;
      case "--decimals":
        parsed.decimals = parseInt(args[++i], 10);
        break;
    }
  }

  return {
    market: parsed.market || "",
    action: parsed.action || "buy",
    outcome: parsed.outcome || "YES",
    amount: parsed.amount || "0",
    decimals: parsed.decimals ?? 6,
    help: parsed.help,
    info: parsed.info,
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

  // For info-only, we can use read-only client
  const client = args.info && !process.env.PRIVATE_KEY
    ? new PNPClient(rpcUrl)
    : new PNPClient(rpcUrl, process.env.PRIVATE_KEY);

  if (!args.info && !process.env.PRIVATE_KEY) {
    console.error("Error: PRIVATE_KEY environment variable is required for trading");
    process.exit(1);
  }

  // Fetch market info
  console.log("\n📊 Market Info\n");

  try {
    const prices = await client.getMarketPriceV2(marketPubkey);

    console.log(`Market:     ${args.market}`);
    console.log(`YES Price:  ${(Number(prices.yesPrice) * 100).toFixed(2)}%`);
    console.log(`NO Price:   ${(Number(prices.noPrice) * 100).toFixed(2)}%`);

    if (args.info) {
      console.log("\n--- JSON OUTPUT ---");
      console.log(JSON.stringify({
        market: args.market,
        yesPrice: prices.yesPrice,
        noPrice: prices.noPrice,
        yesPricePercent: `${(Number(prices.yesPrice) * 100).toFixed(2)}%`,
        noPricePercent: `${(Number(prices.noPrice) * 100).toFixed(2)}%`,
      }, null, 2));
      process.exit(0);
    }

    // Validate trade params
    if (!args.amount || parseFloat(args.amount) <= 0) {
      console.error("\nError: --amount must be a positive number");
      process.exit(1);
    }

    if (args.outcome !== "YES" && args.outcome !== "NO") {
      console.error("\nError: --outcome must be YES or NO");
      process.exit(1);
    }

    console.log(`\n💱 Executing ${args.action.toUpperCase()}\n`);
    console.log(`Action:     ${args.action.toUpperCase()} ${args.outcome}`);
    console.log(`Amount:     ${args.amount}`);
    console.log("");

    let signature: string | undefined;

    if (args.action === "buy") {
      const result = await client.trading!.buyTokensUsdc({
        market: marketPubkey,
        buyYesToken: args.outcome === "YES",
        amountUsdc: parseFloat(args.amount),
      });
      signature = result.signature;
    } else {
      // For selling, use burnDecisionTokensDerived
      const amountRaw = BigInt(Math.floor(parseFloat(args.amount) * Math.pow(10, 18))); // Tokens have 18 decimals
      const result = await client.trading!.burnDecisionTokensDerived({
        market: marketPubkey,
        amount: amountRaw,
        burnYesToken: args.outcome === "YES",
      });
      signature = result.signature;
    }

    console.log("✅ Trade Executed!\n");
    console.log(`Signature: ${signature}`);
    console.log(`\nSolscan:   https://solscan.io/tx/${signature}`);

    // Show updated prices
    const newPrices = await client.getMarketPriceV2(marketPubkey);
    console.log(`\nUpdated Prices:`);
    console.log(`  YES: ${(Number(newPrices.yesPrice) * 100).toFixed(2)}%`);
    console.log(`  NO:  ${(Number(newPrices.noPrice) * 100).toFixed(2)}%`);

  } catch (error: any) {
    console.error("\n❌ Failed:", error.message);
    process.exit(1);
  }
}

main();
