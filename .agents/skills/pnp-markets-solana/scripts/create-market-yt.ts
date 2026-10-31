import 'dotenv/config';
import { PublicKey } from '@solana/web3.js';
import { PNPClient } from 'pnp-sdk';

// Configuration
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

    // Market parameters
    const question = 'Will this video cross 1B views?';
    const youtubeUrl = 'https://youtu.be/rNv8K8AYGi8';
    const initialLiquidity = 1_000_000n; // 1 USDC (6 decimals)
    const endTime = BigInt(Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60); // 30 days
    // Collateral can be any SPL token or Token-2022 token — just pass the mint address.
    const collateralMint = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'); // USDC (example)

    // Create YouTube-linked V2 market
    const result = await client.createMarketYoutube({
        question,
        youtubeUrl,
        initialLiquidity,
        endTime,
        collateralTokenMint: collateralMint,
    });

    console.log('YouTube V2 market created successfully!');
    console.log('Signature:', result.signature);
    console.log('Market Address:', result.market);
}

main().catch(console.error);