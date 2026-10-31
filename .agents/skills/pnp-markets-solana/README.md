# PNP Markets — Solana Prediction Markets Skill

AI agent skill for creating, trading, and settling permissionless prediction markets on Solana using the [PNP SDK](https://www.npmjs.com/package/pnp-sdk).

## Quick Start

```bash
cd scripts && npm install

export PRIVATE_KEY=<your_solana_private_key>
export RPC_URL=https://api.mainnet-beta.solana.com

# Create a market
tsx scripts/create-market.ts

# Trade on a market
tsx scripts/trade.ts --buy --market <address> --outcome YES --amount 10

# Check prices
tsx scripts/market-data.ts --market <address>
```

## Features

- **V2 AMM Markets** — Automated market making with virtual liquidity
- **P2P Markets (V3)** — Direct peer-to-peer betting with custom sides and caps
- **Custom Oracles** — AI agents as settlement oracles with 15-min activation buffer
- **Social Media Markets** — Twitter, YouTube, DeFiLlama-linked predictions
- **Any SPL Token** — USDC, USDT, SOL, or any custom token (including Token-2022) as collateral
- **High Performance** — Sub-second finality, ultra-low fees on Solana

## Skill Structure

```
solana-skill/
├── SKILL.md                        # Main AI agent entry point
├── README.md                       # Human-facing overview (this file)
├── references/
│   ├── api-reference.md            # Complete method signatures & params
│   ├── types-and-precision.md      # TypeScript types, decimal constants, AMM formulas
│   ├── program-addresses.md        # Program IDs, PDA derivations, token mints
│   ├── examples.md                 # Advanced code patterns
│   └── use-cases.md                # Real-world prediction market use cases
├── scripts/                        # CLI utilities
│   ├── create-market.ts
│   ├── create-market-custom.ts
│   ├── create-market-x.ts
│   ├── create-market-yt.ts
│   ├── create-market-p2p.ts
│   ├── market-data.ts
│   ├── trade.ts
│   ├── settle.ts
│   └── redeem.ts
└── package.json
```

## Documentation

| File | Purpose |
|------|---------|
| [SKILL.md](SKILL.md) | **Main entry point** — covers 80% of use cases (triggers, lifecycle, operations, error handling, production hardening) |
| [references/api-reference.md](references/api-reference.md) | Complete SDK method signatures verified against source |
| [references/types-and-precision.md](references/types-and-precision.md) | TypeScript interfaces, decimal constants, AMM price formulas |
| [references/program-addresses.md](references/program-addresses.md) | Program IDs, PDA derivation functions, external programs |
| [references/examples.md](references/examples.md) | Full lifecycle, batch creation, trading bot patterns |
| [references/use-cases.md](references/use-cases.md) | Info finance, token utility, P2P betting, event-driven markets |

## Program IDs

| Network | Address |
|---------|---------|
| **Mainnet** | `8PyE2dizL52ga7ytqLtqRyjwWp4yXEx8M5Z4BAHgHuTb` |
| **Devnet** | `pnpkv2qnh4bfpGvTugGDSEhvZC7DP4pVxTuDykV3BGz` |

## Requirements

- **Node.js** 18+ and **npm**
- **Solana wallet** with SOL for transaction fees (~0.05 SOL minimum)
- **USDC** or other SPL token for market collateral
- **RPC endpoint** (public or dedicated like Helius/QuickNode)

## Live Verification (Mainnet)

- **Test Market**: `HxnpHygK1v7TqodWqAv6RvcEiK9zxAgw5jPZ6rskgj2E`
- **Verification Tx**: [View on Solscan](https://solscan.io/tx/3Uo6Z6NN3hfgK9o2j6kLUjLpx7UUVhxyMTPPdGMw9dhrMZb17pXAwio1omcwdVJH7ijEr692FnqevMAMH3K8EMY1)

---

Built by [PNP Protocol](https://pnp.exchange).
