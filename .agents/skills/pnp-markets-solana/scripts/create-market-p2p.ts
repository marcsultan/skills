/**
 * Mainnet Script: Create V3 P2P Market
 *
 * Creates a peer-to-peer prediction market on Solana mainnet.
 * The creator takes one side (YES or NO) and other users can take the opposite.
 *
 * Usage:
 *   tsx scripts/create-market-p2p.ts
 *
 * Environment:
 *   PRIVATE_KEY - Your wallet private key (base58)
 *   RPC_URL - (Optional) Solana RPC endpoint
 */

import 'dotenv/config';
import { PublicKey, Connection } from '@solana/web3.js';
import { PNPClient } from 'pnp-sdk';

// =====================================================
// ========== MAINNET CONFIGURATION ====================
// =====================================================

const RPC_URL = process.env.RPC_URL || 'https://api.mainnet-beta.solana.com';

const PRIVATE_KEY = process.env.PRIVATE_KEY;
if (!PRIVATE_KEY) {
    console.error('❌ PRIVATE_KEY environment variable is required.');
    process.exit(1);
}

// Collateral can be any SPL token or Token-2022 token.
// Set COLLATERAL_MINT env var to use a different token, or defaults to USDC as an example.
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const COLLATERAL_MINT = new PublicKey(process.env.COLLATERAL_MINT || USDC_MINT);

// Market parameters
const QUESTION = process.env.QUESTION || 'Will this event happen by the deadline?';
const SIDE: 'yes' | 'no' = (process.env.SIDE || 'yes').toLowerCase() === 'no' ? 'no' : 'yes';
const INITIAL_AMOUNT = BigInt(process.env.AMOUNT || '1000000'); // 1 USDC (6 decimals)
const CREATOR_SIDE_CAP = INITIAL_AMOUNT * 5n; // 5x multiplier
const DAYS_UNTIL_END = Number(process.env.DAYS_UNTIL_END || '7');
const END_TIME = BigInt(Math.floor(Date.now() / 1000) + DAYS_UNTIL_END * 24 * 60 * 60);

async function main() {
    console.log('\n🎯 PNP SDK - Mainnet P2P Market Creation\n');

    // Initialize client
    const secretKey = PNPClient.parseSecretKey(PRIVATE_KEY!);
    const client = new PNPClient(RPC_URL, secretKey);
    const walletAddress = client.signer!.publicKey;

    console.log('📝 Configuration:');
    console.log(`  • Wallet: ${walletAddress.toBase58()}`);
    console.log(`  • Question: ${QUESTION}`);
    console.log(`  • Side: ${SIDE.toUpperCase()}`);
    console.log(`  • Amount: ${INITIAL_AMOUNT.toString()} (raw units)`);
    console.log(`  • Collateral: ${COLLATERAL_MINT.toBase58()}`);
    console.log(`  • End Time: ${new Date(Number(END_TIME) * 1000).toISOString()}`);
    console.log('');

    // Check balance
    const connection = new Connection(RPC_URL);
    const balance = await connection.getBalance(walletAddress);
    console.log(`💰 SOL Balance: ${balance / 1e9} SOL`);

    if (balance < 10_000_000) { // 0.01 SOL minimum
        console.error('❌ Insufficient SOL for transaction fees.');
        process.exit(1);
    }

    try {
        console.log('\n⏳ Creating P2P market...\n');

        const result = await client.createP2PMarketGeneral({
            question: QUESTION,
            initialAmount: INITIAL_AMOUNT,
            side: SIDE,
            creatorSideCap: CREATOR_SIDE_CAP,
            endTime: END_TIME,
            collateralTokenMint: COLLATERAL_MINT,
        });

        console.log('✅ P2P Market Created Successfully!\n');
        console.log('📊 Market Details:');
        console.log(`  • Market: ${result.market}`);
        console.log(`  • Signature: ${result.signature}`);
        console.log(`  • Your Side: ${SIDE.toUpperCase()}`);
        console.log(`  • Explorer: https://solscan.io/tx/${result.signature}`);

        console.log('\n📋 JSON Output:');
        console.log(JSON.stringify({
            market: result.market,
            signature: result.signature,
            side: SIDE,
            network: 'mainnet',
        }, null, 2));

    } catch (error: any) {
        console.error('❌ Market creation failed:', error.message);
        if (error.logs) {
            console.error('\nTransaction logs:');
            error.logs.forEach((log: string) => console.error(`  ${log}`));
        }
        process.exit(1);
    }
}

main().catch(console.error);