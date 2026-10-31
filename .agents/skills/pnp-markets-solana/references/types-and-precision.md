# PNP SDK Types & Precision Reference

Complete TypeScript type definitions and precision constants for the PNP prediction market SDK.

## Core Types

### MarketType (On-Chain Market Account)

```typescript
interface MarketType {
  id: U64Like;                          // Market ID (global incrementing)
  resolved: boolean;                    // Is market resolved?
  market_reserves: U64Like;             // Total collateral locked (raw units)
  collateral_token: PubkeyLike;         // Collateral token mint address
  winning_token_id: WinningTokenLike;   // 'yes' | 'no' | 'none' | null
  yes_token_mint: PubkeyLike;           // YES token mint address
  no_token_mint: PubkeyLike;            // NO token mint address
  yes_token_supply_minted: U64Like;     // YES tokens in circulation
  no_token_supply_minted: U64Like;      // NO tokens in circulation
  creator: PubkeyLike;                  // Market creator wallet
  creator_fee_treasury: PubkeyLike;     // Creator fee destination
  question: string;                     // The prediction question text
  initial_liquidity: U64Like;           // Initial liquidity deposited
  end_time: U64Like;                    // Unix timestamp when trading ends
  bump: number;                         // PDA bump seed
  creation_time: U64Like;               // Unix timestamp of creation
  resolvable: boolean;                  // Can this market be settled?
  force_resolve: boolean;               // Force resolution flag
  version: number;                      // Market version (2 for V2)
}
```

### GlobalConfigType

```typescript
interface GlobalConfigType {
  admin: PubkeyLike;                    // Protocol admin wallet
  oracle_program: PubkeyLike;           // Oracle program address
  fee: U64Like;                         // Protocol fee (basis points)
  creator_fee: U64Like;                 // Creator fee (basis points)
  bump: number;                         // PDA bump seed
  yes_global_metadata: string;          // YES token metadata URI
  no_global_metadata: string;           // NO token metadata URI
  collateral_token_mint: PubkeyLike;    // Default collateral mint
  global_id: U64Like;                   // Next market ID counter
  min_liquidity: U64Like;               // Minimum initial liquidity
  buffer_period: U64Like;               // Buffer period for custom oracle (seconds)
  burn_fee: U64Like;                    // Fee for burning tokens
  trading_paused: boolean;              // Global trading pause flag
}
```

### P2PMarketResponse

```typescript
interface P2PMarketResponse {
  signature: string;                    // Transaction signature
  market: PubkeyLike;                  // Market public key (base58)
  yesTokenMint: PubkeyLike;            // YES token mint (base58)
  noTokenMint: PubkeyLike;             // NO token mint (base58)
}
```

### SettlementCriteria

```typescript
interface SettlementCriteria {
  category: string;                     // Market category (e.g., 'coin-predictions')
  reasoning: string;                    // AI explanation for resolution
  resolvable: boolean;                  // Can the market be resolved now?
  resolution_sources: string[];         // API endpoints used for resolution
  settlement_criteria: string;          // Criteria description
  suggested_improvements: string;       // Suggestions for better markets
}
```

### SettlementData

```typescript
interface SettlementData {
  answer: string;                       // 'YES' | 'NO' | 'INVALID'
  reasoning: string;                    // Detailed explanation
  resolved?: boolean;                   // Resolution status
  winning_token_id?: string;            // 'yes' | 'no'
  resolution_time?: string;             // ISO timestamp
  settlement_description?: string;      // Alternative reasoning field
  resolution_source?: string;           // Source of resolution data
}
```

### MarketMeta (Proxy Server)

```typescript
interface MarketMeta {
  market: string;                       // Market address
  market_volume: number;                // Trading volume
  image: string | null;                 // Market image URL
  initial_liquidity: number;            // Initial liquidity (UI units)
}
```

### SdkConfig

```typescript
interface SdkConfig {
  rpcUrl: string;
  commitment?: 'processed' | 'confirmed' | 'finalized';
  httpHeaders?: Record<string, string>;
  priorityFeeMicroLamports?: number;
  computeUnitLimit?: number;
  computeUnitPriceMicroLamports?: number;
  addressLookupTables?: unknown[];
  logger?: Logger;
}
```

### Error Types

```typescript
// Base SDK error
class SdkError extends Error {
  code: string;
  details?: unknown;
}

// Input validation failed
class ValidationError extends SdkError {
  // code = 'VALIDATION_ERROR'
}

// Network/RPC failure
class TransportError extends SdkError {
  // code = 'TRANSPORT_ERROR'
}

// On-chain program error
class ProgramError extends SdkError {
  programErrorCode?: number;
  logs?: string[];
  // code = 'PROGRAM_ERROR'
}
```

## Utility Types

```typescript
// Web3-agnostic pubkey representation
type PubkeyLike = string;

// Numeric fields from IDL (may arrive as various types)
type U64Like = bigint | number | string;

// Winning token enum
type WinningTokenLike = 'none' | 'yes' | 'no' | number | Record<string, unknown> | null;
```

---

## Precision Constants

### Token Decimals

| Token | Decimals | 1 Unit in Raw | Example |
|-------|----------|---------------|---------|
| USDC | 6 | `1_000_000n` | 100 USDC = `100_000_000n` |
| USDT | 6 | `1_000_000n` | 100 USDT = `100_000_000n` |
| WSOL | 9 | `1_000_000_000n` | 1 SOL = `1_000_000_000n` |
| Decision tokens (YES/NO) | 6 | `1_000_000n` | Minted per-market |

### Conversion Helpers

```typescript
// Using PNPClient built-in helper (handles floating-point correctly)
const rawAmount = client.uiToRaw(100, 6);  // 100 USDC → 100_000_000n

// Manual conversion
const usdcToRaw = (amount: number) => BigInt(Math.floor(amount * 1_000_000));
const solToRaw = (amount: number) => BigInt(Math.floor(amount * 1_000_000_000));
const daysFromNow = (days: number) => BigInt(Math.floor(Date.now() / 1000) + days * 86400);

// Reverse conversion
const rawToUsdc = (raw: bigint) => Number(raw) / 1_000_000;
const rawToSol = (raw: bigint) => Number(raw) / 1_000_000_000;
```

### V2 AMM Price Formulas

```typescript
// Price calculation (from on-chain reserves)
const SCALE = 1_000_000; // 6 decimals
const marketReserves = Number(marketReservesRaw) / SCALE;
const yesTokenSupply = Number(yesTokenSupplyRaw) / SCALE;
const noTokenSupply = Number(noTokenSupplyRaw) / SCALE;

const denominator = Math.pow(yesTokenSupply, 2) + Math.pow(noTokenSupply, 2);
const yesPrice = (marketReserves * yesTokenSupply) / denominator;    // 0-1 range
const noPrice = (marketReserves * noTokenSupply) / denominator;      // 0-1 range

const yesMultiplier = 1 + Math.pow(noTokenSupply / yesTokenSupply, 2);  // Payout ratio
const noMultiplier = 1 + Math.pow(yesTokenSupply / noTokenSupply, 2);
```

### Key Numeric Rules

- **All `bigint` amounts** in SDK functions are **raw units** (decimals applied)
- **`amountUsdc` parameters** accept human-readable numbers (SDK converts internally)
- **`amountBaseUnits` parameters** expect pre-converted raw bigint values
- **`yesOddsBps` / `oddsBps`** range: 100-9900 (basis points, 100 = 1%, 5000 = 50%)
- **`slippageBps`** in basis points: 100 = 1%, 50 = 0.5%
- **Token-2022** collateral is auto-detected; decision tokens always use SPL Token
