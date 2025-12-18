/**
 * RPC Testing Utility
 * Run this to verify your RPCs are working and measure response times
 * Now integrated with RPC Manager for comprehensive testing
 */

import { getRPCUrls } from './rpcConfig.js';
import { rpcManager } from './rpcManager.js';
import Web3 from 'web3';

export async function testAllRPCs() {
  const rpcUrls = getRPCUrls();
  console.log(`\n🔍 Testing ${rpcUrls.length} RPC endpoints...\n`);

  const results = [];

  for (let i = 0; i < rpcUrls.length; i++) {
    const rpc = rpcUrls[i];
    const startTime = Date.now();

    try {
      const web3 = new Web3(rpc);
      const blockNumber = await web3.eth.getBlockNumber();
      const responseTime = Date.now() - startTime;

      results.push({
        index: i + 1,
        url: rpc,
        status: '✅ Working',
        blockNumber: blockNumber.toString(),
        responseTime: `${responseTime}ms`,
        speed: responseTime < 500 ? '🚀 Fast' : responseTime < 1000 ? '⚡ Good' : '🐌 Slow'
      });

      console.log(`RPC ${i + 1}: ${rpc}`);
      console.log(`   Status: ✅ Working`);
      console.log(`   Block: ${blockNumber}`);
      console.log(`   Response: ${responseTime}ms ${responseTime < 500 ? '🚀' : responseTime < 1000 ? '⚡' : '🐌'}`);
      console.log('');
    } catch (error) {
      results.push({
        index: i + 1,
        url: rpc,
        status: '❌ Failed',
        error: error.message,
        responseTime: 'N/A'
      });

      console.log(`RPC ${i + 1}: ${rpc}`);
      console.log(`   Status: ❌ Failed`);
      console.log(`   Error: ${error.message}`);
      console.log('');
    }
  }

  // Summary
  const working = results.filter(r => r.status.includes('✅')).length;
  const failed = results.filter(r => r.status.includes('❌')).length;

  console.log('\n📊 Summary:');
  console.log(`   Total RPCs: ${results.length}`);
  console.log(`   Working: ${working} ✅`);
  console.log(`   Failed: ${failed} ❌`);

  if (working < 2) {
    console.warn('\n⚠️  WARNING: You need at least 2 working RPCs for optimal performance!');
  } else if (working < 3) {
    console.log('\n💡 TIP: Add more RPCs (3-5 recommended) for better load balancing');
  } else {
    console.log('\n✅ Good! You have multiple working RPCs for load balancing');
  }

  return results;
}

/**
 * Test RPC Manager's failover capabilities
 */
export async function testRpcManager() {
  console.log('\n🔧 Testing RPC Manager...\n');

  try {
    // Initialize
    await rpcManager.initialize();
    console.log('✅ RPC Manager initialized');

    // Get all status
    const statuses = await rpcManager.getAllRpcStatus();
    console.log('\n📊 RPC Status:');
    statuses.forEach(s => {
      console.log(`   ${s.name}: ${s.isHealthy ? '✅ Healthy' : '❌ Unhealthy'} (${s.responseTime}ms)`);
    });

    // Get best RPC
    const bestRpc = await rpcManager.getBestRpc();
    console.log(`\n🏆 Best RPC: ${bestRpc.name} (${bestRpc.url})`);

    // Test failover with a simple call
    console.log('\n🧪 Testing failover call...');
    const blockNumber = await rpcManager.getBlockNumber();
    console.log(`✅ Block number: ${blockNumber}`);

    console.log('\n✅ RPC Manager test complete!');
  } catch (error) {
    console.error('❌ RPC Manager test failed:', error.message);
  }
}

// Auto-run if imported directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testAllRPCs().then(() => testRpcManager());
}
export default testAllRPCs;
