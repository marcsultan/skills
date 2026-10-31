import { PNPClient } from 'pnp-sdk';
import { PublicKey } from '@solana/web3.js';

// Configuration
const RPC_URL = 'https://api.mainnet-beta.solana.com';
const MARKET_ADDRESS = 'F1g31z3KhACaJDLUFEBQwLiSxm6BdcSHCXDYK2jVNAPU';

async function getComprehensiveMarketInfo(marketId: string) {
    // Initialize a read-only client (no private key needed)
    const client = new PNPClient(RPC_URL);
    const results: any = { marketInfo: null, settlementCriteria: null, settlementData: null };

    try {
        console.log(`Fetching comprehensive information for market: ${marketId}`);

        // 1. Get on-chain market data
        try {
            const marketPK = new PublicKey(marketId);
            const marketStatus = await client.fetchMarket(marketPK);

            results.marketInfo = {
                market: marketStatus.publicKey.toString(),
                question: marketStatus.account.question,
                creator: new PublicKey(marketStatus.account.creator).toString(),
                resolvable: marketStatus.account.resolvable,
                resolved: marketStatus.account.resolved,
                endTime: new Date(Number(marketStatus.account.end_time) * 1000),
                creationTime: marketStatus.account.creation_time
                    ? new Date(Number(marketStatus.account.creation_time) * 1000)
                    : undefined,
                winningToken: marketStatus.account.winning_token_id || null,
            };

            console.log('\nMarket Information:');
            console.log(results.marketInfo);
        } catch (err) {
            console.error(`Error fetching market data: ${err.message}`);
        }

        // 2. Get settlement criteria from proxy
        try {
            results.settlementCriteria = await client.fetchSettlementCriteria(marketId);
            console.log('\nSettlement Criteria:');
            console.log(results.settlementCriteria);
        } catch (err) {
            console.error(`Error fetching settlement criteria: ${err.message}`);
        }

        // 3. Get settlement data from proxy
        try {
            results.settlementData = await client.fetchSettlementData(marketId);
            console.log('\nSettlement Data:');
            console.log({
                answer: results.settlementData.answer || 'Not provided',
                reasoning: results.settlementData.reasoning || 'Not provided'
            });
        } catch (err) {
            console.error(`Error fetching settlement data: ${err.message}`);
        }

        // 4. Determine market state
        let marketState = 'Unknown';
        if (results.marketInfo) {
            if (results.marketInfo.resolved) {
                marketState = 'RESOLVED';
            } else if (!results.marketInfo.resolvable) {
                marketState = 'NOT RESOLVABLE';
            } else {
                const endTime = results.marketInfo.endTime.getTime();
                if (Date.now() > endTime) {
                    marketState = 'ENDED (pending resolution)';
                } else {
                    marketState = 'ACTIVE';
                }
            }
        }

        console.log('\nMarket State Summary:');
        console.log(`State: ${marketState}`);
        if (results.settlementData?.answer) {
            console.log(`Resolution: ${results.settlementData.answer}`);
        }

        return results;
    } catch (err) {
        console.error(`Error getting market info: ${err.message}`);
        throw err;
    }
}

getComprehensiveMarketInfo(MARKET_ADDRESS).catch(console.error);