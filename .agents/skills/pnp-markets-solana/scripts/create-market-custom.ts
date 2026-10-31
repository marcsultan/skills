import 'dotenv/config';
import { PublicKey } from '@solana/web3.js';
import { PNPClient } from 'pnp-sdk';

const RPC_URL = process.env.RPC_URL || 'https://api.mainnet-beta.solana.com';
const PRIVATE_KEY = process.env.PRIVATE_KEY || '';

async function main() {
    if (!PRIVATE_KEY) {
        console.error('Error: PRIVATE_KEY environment variable is missing.');
        process.exit(1);
    }

    // Parse key from string or Uint8Array
    const secretKey = PNPClient.parseSecretKey(PRIVATE_KEY);
    const client = new PNPClient(RPC_URL, secretKey);

    // Your oracle address (can be your wallet or a dedicated oracle service)
    const ORACLE_ADDRESS = client.signer!.publicKey;

    // Collateral can be any SPL token or Token-2022 token — just pass the mint address.
    // Adjust initialLiquidity decimals to match your chosen collateral token.
    const result = await client.createMarketWithCustomOracle({
        question: 'Will our product launch by Q2 2026?',
        initialLiquidity: 10_000_000n, // 10 USDC (6 decimals)
        endTime: BigInt(Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60),
        collateralMint: new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'), // USDC (example)
        settlerAddress: ORACLE_ADDRESS,  // 👈 Your custom oracle!
        yesOddsBps: 5000,  // Optional: 50/50 odds (range: 100-9900)
    });

    console.log('Market created:', result.market.toBase58());
    console.log('TX:', result.signature);
}

main().catch(console.error);