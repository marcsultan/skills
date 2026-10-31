# PNP Markets Use Cases (Solana)

Prediction markets are versatile infrastructure. Here are key use cases for AI agents.

## 1. True Information Finance

Aggregate collective intelligence into probability estimates. Market prices reveal crowd beliefs about uncertain events.

```typescript
import { PNPClient } from "pnp-sdk";
import { PublicKey } from "@solana/web3.js";

const client = new PNPClient(rpcUrl, privateKey);
const USDC = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");

// Create market to discover sentiment probability
await client.market.createMarket({
  question: "Will positive sentiment about Project X exceed 70% this week?",
  endTime: BigInt(Math.floor(Date.now() / 1000) + 86400 * 7),
  initialLiquidity: 100_000_000n,
  baseMint: USDC,
});
```

**Applications:**
- Crowdsource probability estimates on uncertain events
- Discover collective beliefs about future outcomes
- Gather market-based forecasts for decision making

## 2. Token Utility & Engagement

Use your project's token as collateral to drive utility and engagement.

```typescript
const MY_TOKEN = new PublicKey("YourTokenMintAddress");

await client.market.createMarket({
  question: "Will we ship v2.0 by end of month?",
  endTime: BigInt(Math.floor(Date.now() / 1000) + 86400 * 30),
  initialLiquidity: 1000_000_000_000n, // 1000 tokens (9 decimals)
  baseMint: MY_TOKEN,
});
```

**Benefits:**
- Create immediate utility for token holders
- Drive engagement through prediction participation
- Align community incentives with project outcomes

## 3. Contests & Competitions

Run prediction contests where participants compete by trading on outcomes.

```typescript
await client.market.createMarket({
  question: "Which feature will get the most community votes: A, B, or C?",
  endTime: BigInt(Math.floor(Date.now() / 1000) + 86400 * 7),
  initialLiquidity: 50_000_000n,
  baseMint: USDC,
});
```

**Applications:**
- Community prediction competitions
- Gamified governance decisions
- Tournament-style events

## 4. P2P Betting

Create direct peer-to-peer bets with specific counterparties.

```typescript
// Creator bets YES
const { market } = await client.createP2PMarketGeneral({
  question: "Will I complete the marathon under 4 hours?",
  initialAmount: 50_000_000n,
  side: "yes",
  creatorSideCap: 100_000_000n,
  endTime: BigInt(Math.floor(Date.now() / 1000) + 86400 * 30),
  collateralTokenMint: USDC,
});

// Friend takes NO side
await client.tradeP2PMarket({
  market,
  side: "no",
  amount: 50_000_000n,
});
```

**Applications:**
- Personal bets with friends
- Business outcome agreements
- Performance milestone betting

## 5. Automated Market Making

Create markets programmatically based on data feeds or events.

```typescript
async function createTrendingMarket(topic: string) {
  const question = `Will "${topic}" remain trending for 24 hours?`;

  return await client.market.createMarket({
    question,
    endTime: BigInt(Math.floor(Date.now() / 1000) + 86400),
    initialLiquidity: 25_000_000n,
    baseMint: USDC,
  });
}

// Create markets based on trending topics
for (const topic of trendingTopics) {
  await createTrendingMarket(topic);
}
```

## 6. Event-Driven Markets

Create markets around specific events with known resolution dates.

```typescript
// Sports, elections, product launches, etc.
await client.market.createMarket({
  question: "Will Company X announce earnings above $5B on Q4 call?",
  endTime: BigInt(earningsCallTimestamp),
  initialLiquidity: 500_000_000n,
  baseMint: USDC,
});
```

## pAMM Virtual Liquidity Model

The PNP Protocol uses a **pAMM (Prediction AMM) virtual liquidity model** that ensures:

1. **Smooth Tradeability**: Even with minimal initial liquidity
2. **Self-Balancing**: Markets adjust through trading activity
3. **Capital Efficiency**: Virtual liquidity amplifies real deposits
4. **Fair Pricing**: Constant-product formula for price discovery

## Solana Advantages

- **Speed**: Sub-second finality for instant trades
- **Cost**: Transactions cost fractions of a cent
- **Throughput**: High TPS supports active trading
- **Composability**: Integrate with other Solana protocols
