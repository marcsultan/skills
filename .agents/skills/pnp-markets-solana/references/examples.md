# PNP Markets - Complete Examples (Solana)

## Full Market Lifecycle

```typescript
import { PNPClient } from "pnp-sdk";
import { PublicKey } from "@solana/web3.js";

async function fullLifecycle() {
  const client = new PNPClient(
    process.env.RPC_URL || "https://api.mainnet-beta.solana.com",
    process.env.PRIVATE_KEY!
  );

  const USDC = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");

  // 1. CREATE MARKET
  console.log("Creating market...");
  const { market, signature } = await client.market.createMarket({
    question: "Will our community reach 1000 members this month?",
    endTime: BigInt(Math.floor(Date.now() / 1000) + 86400 * 7),
    initialLiquidity: 50_000_000n, // 50 USDC
    baseMint: USDC,
  });
  console.log("Market created:", market.toBase58());

  // 2. CHECK PRICES
  const prices = await client.getMarketPriceV2(market);
  console.log("YES:", (prices.yesPrice * 100).toFixed(2) + "%");
  console.log("NO:", (prices.noPrice * 100).toFixed(2) + "%");

  // 3. BUY TOKENS
  await client.trading.buyTokensUsdc({
    market,
    buyYesToken: true,
    amountUsdc: 10,
  });
  console.log("Bought YES tokens");

  // 4. SELL TOKENS (partial)
  await client.trading.sellTokensUsdc({
    market,
    sellYesToken: true,
    amountTokens: 2_000_000_000_000_000_000n, // 2 tokens
  });
  console.log("Sold some YES tokens");

  // 5. SETTLE (after endTime, for custom oracle markets)
  await client.settleMarket({ market, yesWinner: true });
  console.log("Market settled as YES");

  // 6. REDEEM
  await client.redeemPosition(market);
  console.log("Winnings redeemed");
}
```

## P2P Market Example

```typescript
import { PNPClient } from "pnp-sdk";
import { PublicKey } from "@solana/web3.js";

async function p2pMarketExample() {
  const client = new PNPClient(
    process.env.RPC_URL || "https://api.mainnet-beta.solana.com",
    process.env.PRIVATE_KEY!
  );

  const USDC = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");

  // Create P2P market where creator bets YES
  const { market, signature } = await client.createP2PMarketGeneral({
    question: "Will our DAO pass Proposal #42?",
    initialAmount: 100_000_000n, // 100 USDC
    side: "yes",
    creatorSideCap: 500_000_000n, // Max 500 USDC on YES side
    endTime: BigInt(Math.floor(Date.now() / 1000) + 86400 * 14),
    collateralTokenMint: USDC,
  });

  console.log("P2P Market:", market.toBase58());

  // Counter-party takes NO side
  await client.tradeP2PMarket({
    market,
    side: "no",
    amount: 50_000_000n, // 50 USDC
  });
}
```

## Custom Token Collateral

```typescript
import { PNPClient } from "pnp-sdk";
import { PublicKey } from "@solana/web3.js";

async function customTokenMarket() {
  const client = new PNPClient(
    process.env.RPC_URL || "https://api.mainnet-beta.solana.com",
    process.env.PRIVATE_KEY!
  );

  const MY_TOKEN = new PublicKey("YourTokenMintAddress");
  const TOKEN_DECIMALS = 9;

  const { market } = await client.market.createMarket({
    question: "Will our DAO pass Proposal #42?",
    endTime: BigInt(Math.floor(Date.now() / 1000) + 86400 * 14),
    initialLiquidity: BigInt(10000 * Math.pow(10, TOKEN_DECIMALS)),
    baseMint: MY_TOKEN,
  });

  console.log("Market with custom token:", market.toBase58());
}
```

## Market Monitoring

```typescript
import { PNPClient } from "pnp-sdk";
import { PublicKey } from "@solana/web3.js";

async function monitorMarket(marketAddress: string) {
  // Read-only client (no private key needed)
  const client = new PNPClient(
    process.env.RPC_URL || "https://api.mainnet-beta.solana.com"
  );

  const market = new PublicKey(marketAddress);
  const info = await client.getMarketInfo(market);
  const prices = await client.getMarketPriceV2(market);

  return {
    market: marketAddress,
    endTime: new Date(Number(info.endTime) * 1000),
    yesPrice: (prices.yesPrice * 100).toFixed(2) + "%",
    noPrice: (prices.noPrice * 100).toFixed(2) + "%",
    isSettled: info.isSettled,
    winner: info.isSettled ? (info.yesWinner ? "YES" : "NO") : null,
  };
}
```

## Trading Bot Pattern

```typescript
import { PNPClient } from "pnp-sdk";
import { PublicKey } from "@solana/web3.js";

async function simpleTradingStrategy(marketAddress: string) {
  const client = new PNPClient(
    process.env.RPC_URL || "https://api.mainnet-beta.solana.com",
    process.env.PRIVATE_KEY!
  );

  const market = new PublicKey(marketAddress);
  const prices = await client.getMarketPriceV2(market);

  // Simple strategy: buy YES if price < 0.3, buy NO if YES price > 0.7
  const tradeAmount = 5; // 5 USDC

  if (prices.yesPrice < 0.3) {
    console.log("YES undervalued, buying...");
    await client.trading.buyTokensUsdc({
      market,
      buyYesToken: true,
      amountUsdc: tradeAmount,
    });
  } else if (prices.yesPrice > 0.7) {
    console.log("NO undervalued, buying...");
    await client.trading.buyTokensUsdc({
      market,
      buyYesToken: false,
      amountUsdc: tradeAmount,
    });
  } else {
    console.log("No trade signal");
  }
}
```

## Batch Market Creation

```typescript
import { PNPClient } from "pnp-sdk";
import { PublicKey } from "@solana/web3.js";

interface MarketConfig {
  question: string;
  durationHours: number;
  liquidity: number;
}

async function createBatchMarkets(configs: MarketConfig[]) {
  const client = new PNPClient(
    process.env.RPC_URL || "https://api.mainnet-beta.solana.com",
    process.env.PRIVATE_KEY!
  );

  const USDC = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
  const results = [];

  for (const config of configs) {
    const endTime = BigInt(Math.floor(Date.now() / 1000) + config.durationHours * 3600);
    const liquidity = BigInt(config.liquidity * 1_000_000);

    const { market, signature } = await client.market.createMarket({
      question: config.question,
      endTime,
      initialLiquidity: liquidity,
      baseMint: USDC,
    });

    results.push({
      question: config.question,
      market: market.toBase58(),
      signature,
    });

    // Brief pause between transactions
    await new Promise(r => setTimeout(r, 500));
  }

  return results;
}

// Usage
const markets = await createBatchMarkets([
  { question: "Will BTC hit $100k in 2025?", durationHours: 720, liquidity: 100 },
  { question: "Will ETH flip BTC by 2026?", durationHours: 8760, liquidity: 100 },
  { question: "Will Solana TPS exceed 100k?", durationHours: 2160, liquidity: 50 },
]);
```
