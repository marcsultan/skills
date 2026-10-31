# PNP Markets — Program Addresses & PDA Derivations

Complete reference for all program IDs, token mints, and Program Derived Addresses (PDAs) used by the PNP Protocol on Solana.

---

## Program IDs

| Network | Program ID | Usage |
|---------|-----------|-------|
| **Mainnet** | `8PyE2dizL52ga7ytqLtqRyjwWp4yXEx8M5Z4BAHgHuTb` | Production prediction market program |
| **Devnet** | `pnpkv2qnh4bfpGvTugGDSEhvZC7DP4pVxTuDykV3BGz` | Testing & development |

The SDK auto-detects the network from the RPC URL:
- URLs containing `devnet`, `dev.`, or `:8899` → Devnet program ID
- All other URLs → Mainnet program ID

---

## Collateral Token Mints

| Token | Mint Address | Decimals | Notes |
|-------|-------------|----------|-------|
| **USDC** | `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` | 6 | Common stablecoin collateral |
| **USDT** | `Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB` | 6 | Alternative stablecoin |
| **WSOL** | `So11111111111111111111111111111111111111112` | 9 | Wrapped SOL |

Any SPL token (including Token-2022) can be used as collateral. Decision tokens (YES/NO) are always standard SPL Token.

---

## PDA Derivation Functions

All PDA functions are exported from `pnp-sdk` under the `pdas` namespace:

```typescript
import { pdas } from 'pnp-sdk';
import { PublicKey } from '@solana/web3.js';

const PROGRAM_ID = new PublicKey('8PyE2dizL52ga7ytqLtqRyjwWp4yXEx8M5Z4BAHgHuTb');
```

### Global Config PDA

Singleton account storing protocol-wide settings (fees, admin, metadata URIs).

```typescript
const [globalConfigPda, bump] = pdas.deriveGlobalConfigPda(PROGRAM_ID);
// Seeds: ["global_config"]
```

### Market PDA (from mints)

Derives the market account address from its YES and NO token mints.

```typescript
const [marketPda, bump] = pdas.deriveMarketPdaFromMints(
  yesMint,   // PublicKey — YES token mint
  noMint,    // PublicKey — NO token mint
  PROGRAM_ID
);
// Seeds: ["market", yesMint, noMint]
```

### Market PDA (from base/quote mints)

Alternative derivation using base and quote mint addresses.

```typescript
const [marketPda, bump] = pdas.deriveMarketPda(
  baseMint,   // PublicKey — Base token mint
  quoteMint,  // PublicKey — Quote token mint
  PROGRAM_ID
);
// Seeds: ["market", baseMint, quoteMint]
```

### Position PDA

Derives a user's position account for a specific market.

```typescript
const [positionPda, bump] = pdas.derivePositionPda(
  marketPubkey,  // PublicKey — Market address
  ownerPubkey,   // PublicKey — User's wallet
  PROGRAM_ID
);
// Seeds: ["position", market, owner]
```

### YES Token Mint PDA

Derives the YES decision token mint from the global market ID.

```typescript
const [yesTokenMint, bump] = pdas.deriveYesTokenMint(
  globalId,   // bigint — Global incrementing market ID (from GlobalConfig.global_id)
  PROGRAM_ID
);
// Seeds: ["yes_token", globalId (u64 LE)]
```

### NO Token Mint PDA

Derives the NO decision token mint from the global market ID.

```typescript
const [noTokenMint, bump] = pdas.deriveNoTokenMint(
  globalId,   // bigint — Global incrementing market ID
  PROGRAM_ID
);
// Seeds: ["no_token", globalId (u64 LE)]
```

### Creator Fee Treasury PDA

Derives the creator's fee treasury for collecting market creator fees.

```typescript
// Current format (multi-collateral — use for all new markets)
const [treasuryPda, bump] = pdas.deriveCreatorFeeTreasuryPda(
  creatorPubkey,     // PublicKey — Market creator's wallet
  PROGRAM_ID,
  collateralMint     // PublicKey — Collateral token mint
);
// Seeds: ["creator_fee_treasury", creator, collateralMint]

// Legacy format (pre-multi-collateral — USDC-only markets created before update)
const [legacyTreasuryPda, bump] = pdas.deriveCreatorFeeTreasuryPdaLegacy(
  creatorPubkey,     // PublicKey — Market creator's wallet
  PROGRAM_ID
);
// Seeds: ["creator_fee_treasury", creator]
```

### Token Metadata PDA (Metaplex)

Derives the Metaplex token metadata account for a mint.

```typescript
const METAPLEX_METADATA_PROGRAM = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');

const [metadataPda, bump] = pdas.deriveTokenMetadataPda(
  mintPubkey,                  // PublicKey — Token mint
  METAPLEX_METADATA_PROGRAM
);
// Seeds: ["metadata", metadataProgramId, mint]
```

### Associated Token Account (ATA)

Derives the ATA for a given owner and mint. Used for all token balance lookups and transfers.

```typescript
const ata = pdas.deriveAta(
  ownerPubkey,      // PublicKey — Wallet address
  mintPubkey,       // PublicKey — Token mint
  allowOwnerOffCurve,  // boolean (default: false) — True for PDAs
  tokenProgramId,      // PublicKey (default: TOKEN_PROGRAM_ID)
  ataProgramId         // PublicKey (default: ASSOCIATED_TOKEN_PROGRAM_ID)
);
// Standard ATA derivation using @solana/spl-token
```

---

## PDA Seed Summary

| PDA | Seeds | Notes |
|-----|-------|-------|
| Global Config | `["global_config"]` | Singleton — one per program |
| Market (from mints) | `["market", yesMint, noMint]` | Primary market lookup |
| Market (alt) | `["market", baseMint, quoteMint]` | Alternative derivation |
| Position | `["position", market, owner]` | Per-user, per-market |
| YES Token Mint | `["yes_token", globalId(u64 LE)]` | One per market |
| NO Token Mint | `["no_token", globalId(u64 LE)]` | One per market |
| Creator Fee Treasury | `["creator_fee_treasury", creator, collateralMint]` | Current format (multi-collateral) |
| Creator Fee Treasury (Legacy) | `["creator_fee_treasury", creator]` | Legacy format (USDC-only, pre-update) |
| Token Metadata | `["metadata", metadataProgramId, mint]` | Metaplex standard |

---

## External Programs

| Program | Address | Usage |
|---------|---------|-------|
| SPL Token | `TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA` | Standard token operations |
| SPL Associated Token Account | `ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL` | ATA derivation |
| Token-2022 | `TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb` | Extended token standard (collateral support) |
| Metaplex Token Metadata | `metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s` | Token metadata |
| System Program | `11111111111111111111111111111111` | Account creation |

---

## Deriving Addresses in Practice

### Full Example: Find a Market's Token Accounts

```typescript
import { PNPClient, pdas } from 'pnp-sdk';
import { PublicKey } from '@solana/web3.js';

const client = new PNPClient('https://api.mainnet-beta.solana.com');
const PROGRAM_ID = new PublicKey('8PyE2dizL52ga7ytqLtqRyjwWp4yXEx8M5Z4BAHgHuTb');

// Fetch a market
const marketAddress = new PublicKey('HxnpHygK1v7TqodWqAv6RvcEiK9zxAgw5jPZ6rskgj2E');
const { account } = await client.fetchMarket(marketAddress);

// Derive the user's token accounts
const userWallet = new PublicKey('YourWalletAddress');
const yesAta = pdas.deriveAta(userWallet, new PublicKey(account.yes_token_mint));
const noAta = pdas.deriveAta(userWallet, new PublicKey(account.no_token_mint));
const collateralAta = pdas.deriveAta(userWallet, new PublicKey(account.collateral_token));

console.log('YES token ATA:', yesAta.toBase58());
console.log('NO token ATA:', noAta.toBase58());
console.log('Collateral ATA:', collateralAta.toBase58());
```

### Verify Market from Global ID

```typescript
// If you know the global market ID, derive the mints
const globalId = 42n;
const [yesMint] = pdas.deriveYesTokenMint(globalId, PROGRAM_ID);
const [noMint] = pdas.deriveNoTokenMint(globalId, PROGRAM_ID);
const [marketPda] = pdas.deriveMarketPdaFromMints(yesMint, noMint, PROGRAM_ID);

console.log('Market #42:', marketPda.toBase58());
```
