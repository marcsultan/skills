# PNP SDK API Reference (Solana)

Complete method signatures and parameter documentation for the PNP Protocol SDK on Solana. All signatures verified against `pnp-sdk` source.

## Installation

```bash
npm install pnp-sdk @solana/web3.js
```

---

## PNPClient — Initialization

```typescript
import { PNPClient } from 'pnp-sdk';

// Read-only client (no transactions, only data fetching)
const readOnlyClient = new PNPClient('https://api.mainnet-beta.solana.com');

// Full client with signing capabilities
const client = new PNPClient(
  'https://api.mainnet-beta.solana.com',
  process.env.PRIVATE_KEY  // Base58 encoded private key
);
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `rpcUrl` | `string` | Yes | Solana RPC endpoint URL |
| `privateKey` | `string` | No | Base58 private key (omit for read-only) |

### Static Utilities

```typescript
// Parse private key from Base58 string or JSON array format
const keypair = PNPClient.parseSecretKey(process.env.PRIVATE_KEY);

// Convert human-readable amount to raw bigint
const raw = client.uiToRaw(100, 6);  // 100 USDC → 100_000_000n

// Detect social media URLs in question text
PNPClient.detectTwitterUrl('Will this tweet go viral? https://x.com/user/status/123');
PNPClient.detectYoutubeUrl('Will this video hit 1M? https://youtu.be/abc123');
PNPClient.detectDefiLlamaUrl('Will Uniswap TVL exceed $5B?');
```

---

## Market Creation

### `market.createMarket(params)` — V2 AMM Market

Creates a standard V2 AMM market using PNP's global oracle for resolution.

```typescript
const { market, signature } = await client.market.createMarket({
  question: 'Will BTC hit $150K by end of 2026?',
  endTime: BigInt(Math.floor(Date.now() / 1000) + 86400 * 30),
  initialLiquidity: 100_000_000n,  // 100 USDC (6 decimals)
  baseMint: new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
});
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `question` | `string` | Yes | The prediction question |
| `initialLiquidity` | `bigint` | Yes | Collateral in raw units (decimals depend on chosen token) |
| `endTime` | `bigint` | Yes | Unix timestamp when trading ends |
| `baseMint` | `PublicKey` | No | Collateral token mint — any SPL or Token-2022 token |

**Returns**: `{ market: PublicKey, signature: string }`

### `createMarketWithCustomOracle(params)` — Custom Oracle Market

Creates a market where the specified wallet acts as the settlement oracle.

```typescript
const { market, signature } = await client.createMarketWithCustomOracle({
  question: 'Will ETH merge upgrade succeed?',
  initialLiquidity: 10_000_000n,
  endTime: BigInt(Math.floor(Date.now() / 1000) + 86400 * 7),
  collateralMint: new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
  settlerAddress: oracleWalletPubkey,
  yesOddsBps: 5000,  // Optional: 50/50 (range: 100-9900)
});
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `question` | `string` | Yes | The prediction question |
| `initialLiquidity` | `bigint` | Yes | Collateral in raw units |
| `endTime` | `bigint` | Yes | Unix timestamp when trading ends |
| `collateralMint` | `PublicKey` | Yes | Collateral token mint |
| `settlerAddress` | `PublicKey` | Yes | Oracle wallet (settles the market) |
| `yesOddsBps` | `number` | No | Initial YES odds in basis points (100-9900, default 5000) |

**Returns**: `{ market: PublicKey, signature: string }`

> **IMPORTANT**: Must call `setMarketResolvable(market, true)` within 15 minutes of creation or the market is permanently frozen.

### `createMarketV2WithCustomOdds(params)` — V2 with Custom Odds

```typescript
const result = await client.createMarketV2WithCustomOdds({
  question: 'Will Ethereum flip Bitcoin?',
  initialLiquidity: 50_000_000n,
  endTime: BigInt(Math.floor(Date.now() / 1000) + 90 * 86400),
  collateralTokenMint: USDC,
  yesOddsBps: 2000,  // 20% YES / 80% NO
  oracle: customOraclePubkey,  // Optional
});
```

**Returns**: `{ signature: string, market: string }`

---

## Social Media Market Creation

### `createMarketTwitter(params)`

```typescript
const result = await client.createMarketTwitter({
  question: 'Will this tweet cross 5000 replies?',
  tweetUrl: 'https://x.com/username/status/123456789',
  initialLiquidity: 1_000_000n,
  endTime: BigInt(Math.floor(Date.now() / 1000) + 7 * 86400),
  collateralTokenMint: USDC,
});
```

**Returns**: `{ signature: string, market: string, detectedTwitterUrl?: string, isTweetIdFormat?: boolean }`

Supported URL formats: `https://x.com/user/status/ID`, `https://twitter.com/user/status/ID`

### `createMarketYoutube(params)`

```typescript
const result = await client.createMarketYoutube({
  question: 'Will this video cross 1B views?',
  youtubeUrl: 'https://youtu.be/VIDEO_ID',
  initialLiquidity: 1_000_000n,
  endTime: BigInt(Math.floor(Date.now() / 1000) + 30 * 86400),
  collateralTokenMint: USDC,
});
```

**Returns**: `{ signature: string, market: string, detectedYoutubeUrl?: string }`

### `createMarketDefiLlama(params)`

```typescript
const result = await client.createMarketDefiLlama({
  question: 'Will Uniswap TVL exceed $5B?',
  protocolName: 'uniswap-v3',
  metric: 'tvl',
  initialLiquidity: 5_000_000n,
  endTime: BigInt(Math.floor(Date.now() / 1000) + 30 * 86400),
  collateralTokenMint: USDC,
});
```

**Returns**: `{ signature: string, market: string, detectedProtocol?: string, detectedMetric?: string }`

---

## P2P Market Creation

### `createP2PMarketGeneral(params)` — Raw Units

```typescript
const result = await client.createP2PMarketGeneral({
  question: 'Will our DAO pass Proposal #42?',
  initialAmount: 100_000_000n,
  side: 'yes',
  creatorSideCap: 500_000_000n,
  endTime: BigInt(Math.floor(Date.now() / 1000) + 14 * 86400),
  collateralTokenMint: USDC,
});
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `question` | `string` | Yes | The prediction question |
| `initialAmount` | `bigint` | Yes | Creator's initial stake (raw units) |
| `side` | `'yes' \| 'no'` | Yes | Side the creator takes |
| `creatorSideCap` | `bigint` | Yes | Maximum collateral on creator's side |
| `endTime` | `bigint` | Yes | Unix timestamp when trading ends |
| `collateralTokenMint` | `PublicKey` | Yes | Collateral token mint |

**Returns**: `{ signature: string, market: PubkeyLike, yesTokenMint: PubkeyLike, noTokenMint: PubkeyLike }`

### `createP2PMarketSimple(params)` — UI-Friendly

```typescript
const result = await client.createP2PMarketSimple({
  question: 'Will it rain tomorrow?',
  side: 'yes',
  amountUsdc: 50,
  daysUntilEnd: 1,
  creatorSideCapMultiplier: 5,
});
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `question` | `string` | Yes | The prediction question |
| `side` | `'yes' \| 'no'` | Yes | Side the creator takes |
| `amountUsdc` | `number` | Yes | Human-readable USDC amount (SDK converts) |
| `daysUntilEnd` | `number` | No | Days until end (default: 30) |
| `creatorSideCapMultiplier` | `number` | No | Cap multiplier (default: 5) |

### P2P Social Media Variants

All accept the same base P2P params plus media-specific fields:

| Method | Extra Params | Returns |
|--------|-------------|---------|
| `createP2PMarketTwitter(params)` | `tweetUrl` | `{ ..., detectedTwitterUrl? }` |
| `createP2PMarketYoutube(params)` | `youtubeUrl` | `{ ..., detectedYoutubeUrl? }` |
| `createP2PMarketDefiLlama(params)` | `protocolName`, `metric` | `{ ..., detectedProtocol? }` |
| `createP2PMarketTwitterSimple(params)` | `tweetUrl` | P2P Simple + Twitter |
| `createP2PMarketYoutubeSimple(params)` | `youtubeUrl` | P2P Simple + YouTube |
| `createP2PMarketDefiLlamaSimple(params)` | `protocolName`, `metric` | P2P Simple + DeFiLlama |
| `createMarketP2PWithCustomOdds(params)` | `yesOddsBps` | P2P with custom starting odds |

### `tradeP2PMarket(params)` — Trade on P2P Markets

```typescript
const { signature } = await client.tradeP2PMarket({
  market: marketPubkey,
  side: 'no',
  amount: 50_000_000n,  // 50 USDC (raw units)
});
```

---

## Market Data (Read-Only)

### `fetchMarketAddresses()` — List All V2 Markets

```typescript
const addresses: string[] = await client.fetchMarketAddresses();
// Returns array of base58 market addresses
```

### `fetchMarket(pubkey)` — On-Chain Market Account

```typescript
const { account } = await client.fetchMarket(new PublicKey(marketAddress));
// account: MarketType (see types-and-precision.md)
```

### `fetchMarkets()` — All V2 Markets with Full Data

```typescript
const markets = await client.fetchMarkets();
// Returns array of { pubkey, account: MarketType }
```

### `getMarketPriceV2(market)` — Current Prices

```typescript
const prices = await client.getMarketPriceV2(marketPubkey);
// Returns:
// {
//   yesPrice: number,        // 0-1 range (e.g., 0.65 = 65%)
//   noPrice: number,         // 0-1 range (e.g., 0.35 = 35%)
//   yesMultiplier: number,   // Payout if YES wins (e.g., 1.54x)
//   noMultiplier: number,    // Payout if NO wins (e.g., 2.85x)
//   marketReserves: number,  // Total collateral (UI units)
//   yesTokenSupply: number,  // YES tokens minted (UI units)
//   noTokenSupply: number,   // NO tokens minted (UI units)
// }
```

### `fetchSettlementCriteria(market)` — AI Resolution Info

```typescript
const criteria = await client.fetchSettlementCriteria(marketAddress);
// Returns: SettlementCriteria (see types-and-precision.md)
```

### `fetchSettlementData(market)` — Settlement Decision

```typescript
const data = await client.fetchSettlementData(marketAddress);
// Returns: SettlementData { answer: 'YES'|'NO'|'INVALID', reasoning: string }
```

### `waitForSettlementCriteria(market)` — Retry Until Available

Polls every 2 seconds for up to 15 minutes until settlement criteria are ready.

```typescript
const { resolvable, answer, criteria } = await client.waitForSettlementCriteria(marketAddress);
```

### `trading.getMarketInfo(pubkey)` — Extended Market Info

```typescript
const info = await client.trading.getMarketInfo(new PublicKey(marketAddress));
// Returns: { address, question, id, creator, initialLiquidity, marketReserves,
//   endTime, resolvable, resolved, winningTokenId,
//   yesTokenMint, noTokenMint, collateralToken,
//   yesTokenSupplyMinted, noTokenSupplyMinted }
```

### `trading.getBalances(market)` — User Token Balances

```typescript
const balances = await client.trading.getBalances(new PublicKey(marketAddress));
// Returns user's YES/NO token balances for the market
```

### `trading.getPrices(market)` — Supply-Based Price Shares

```typescript
const prices = await client.trading.getPrices(new PublicKey(marketAddress));
// Returns token supply-based price information
```

---

## Trading

### `trading.buyTokensUsdc(params)` — Buy V2 Tokens

```typescript
const result = await client.trading.buyTokensUsdc({
  market: marketPubkey,
  buyYesToken: true,
  amountUsdc: 10,       // Human-readable USDC
  minimumOut: 0n,       // Optional: slippage protection
});
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `market` | `PublicKey` | Yes | Market address |
| `buyYesToken` | `boolean` | Yes | `true` = buy YES, `false` = buy NO |
| `amountUsdc` | `number` | Yes | USDC amount (human-readable, SDK converts) |
| `minimumOut` | `bigint` | No | Minimum tokens to receive (slippage protection) |

**Returns**: `{ signature: string, usdcSpent: number, tokensReceived: number, before: BalanceSnapshot, after: BalanceSnapshot }`

### `trading.sellTokensBase(params)` — Sell V2 Tokens

```typescript
const result = await client.trading.sellTokensBase({
  market: marketPubkey,
  burnYesToken: true,
  amountBaseUnits: 5_000_000n,  // Raw token units (6 decimals)
});
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `market` | `PublicKey` | Yes | Market address |
| `burnYesToken` | `boolean` | Yes | `true` = sell YES, `false` = sell NO |
| `amountBaseUnits` | `bigint` | Yes | Token amount in raw units |

**Returns**: `{ signature: string, tokensSold: number, usdcReceived: number }`

### `buyV3TokensUsdc(params)` — Buy P2P/V3 Tokens

```typescript
const result = await client.buyV3TokensUsdc({
  market: marketPubkey,
  buyYesToken: true,
  amountUsdc: 10,
});
```

**Returns**: `{ signature: string }`

### `trading.mintDecisionTokensDerived(params)` — Mint Decision Tokens

```typescript
await client.trading.mintDecisionTokensDerived({
  market: marketPubkey,
  amount: 10_000_000n,
});
```

### `trading.burnDecisionTokensDerived(params)` — Burn Decision Tokens

```typescript
await client.trading.burnDecisionTokensDerived({
  market: marketPubkey,
  amount: 10_000_000n,
});
```

---

## Settlement

### `setMarketResolvable(market, resolvable, forceResolve?)` — Activate Market

**IMPORTANT**: Positional arguments, NOT an object parameter.

```typescript
// Activate a custom oracle market (must be within 15 min of creation)
await client.setMarketResolvable(marketAddress, true);

// Force-resolve flag (optional third parameter)
await client.setMarketResolvable(marketAddress, true, true);
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `market` | `PublicKey \| string` | Yes | Market address |
| `resolvable` | `boolean` | Yes | `true` to activate, `false` to deactivate |
| `forceResolve` | `boolean` | No | Force resolution flag |

**Returns**: `{ signature: string }`

### `setMarketResolvableP2p(market, resolvable)` — Activate P2P Market

```typescript
await client.setMarketResolvableP2p(marketAddress, true);
```

### `settleMarket(params)` — Resolve Market (via `anchorMarket`)

```typescript
const result = await client.anchorMarket.settleMarket({
  market: new PublicKey(marketAddress),
  yesWinner: true,
});
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `market` | `PublicKey` | Yes | Market address |
| `yesWinner` | `boolean` | Yes | `true` = YES wins, `false` = NO wins |

**Returns**: `{ signature: string }`

---

## Redemption

### `redeemPosition(market, options?)` — Redeem V2 Position

```typescript
const { signature } = await client.redeemPosition(marketPubkey);
```

### `redeemP2PPosition(market)` — Redeem P2P Position

```typescript
const { signature } = await client.redeemP2PPosition(marketPubkey);
```

---

## Token Addresses (Solana Mainnet)

| Token | Address | Decimals |
|-------|---------|----------|
| USDC | `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` | 6 |
| USDT | `Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB` | 6 |
| SOL (wrapped) | `So11111111111111111111111111111111111111112` | 9 |

---

## Error Types

The SDK exports typed error classes for structured error handling:

```typescript
import { SdkError, ValidationError, TransportError, ProgramError } from 'pnp-sdk';

try {
  await client.market.createMarket({ ... });
} catch (error) {
  if (error instanceof ValidationError) {
    // Input validation failed (code: 'VALIDATION_ERROR')
    console.error('Bad input:', error.message);
  } else if (error instanceof TransportError) {
    // Network/RPC failure (code: 'TRANSPORT_ERROR')
    console.error('Network error, retry:', error.message);
  } else if (error instanceof ProgramError) {
    // On-chain program error (code: 'PROGRAM_ERROR')
    console.error('Program error:', error.programErrorCode, error.logs);
  } else if (error instanceof SdkError) {
    // Generic SDK error
    console.error('SDK error:', error.code, error.message);
  }
}
```

---

## RPC Providers

For production, use dedicated RPC endpoints:

```bash
# Helius (recommended)
export RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY

# QuickNode
export RPC_URL=https://your-endpoint.solana-mainnet.quiknode.pro/YOUR_KEY

# Alchemy
export RPC_URL=https://solana-mainnet.g.alchemy.com/v2/YOUR_KEY
```
