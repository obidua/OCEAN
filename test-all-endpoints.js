/**
 * Test All Ocean DeFi Indexer API Endpoints
 * Tests each endpoint and logs response status and data
 */

const API_BASE = 'https://testapi.oceandefi.uk';

// Test address (you can replace with a real address)
const TEST_ADDRESS = '0x1234567890123456789012345678901234567890';
const TEST_DAY_ID = 0;
const TEST_FROM_DAY = 0;
const TEST_TO_DAY = 10;
const SLAB_LEVEL = 1;
const DIRECT_ADDRESS = '0x0987654321098765432109876543210987654321';

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  success: (msg) => console.log(`${colors.green}✓ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}✗ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ ${msg}${colors.reset}`),
  section: (msg) => console.log(`\n${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n${colors.yellow}${msg}${colors.reset}\n${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`),
};

// Test function
async function testEndpoint(method, path, description, params = {}) {
  const url = new URL(`${API_BASE}${path}`);
  
  // Add query parameters if provided
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, value);
    }
  });

  try {
    const response = await fetch(url.toString(), {
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    const isSuccess = response.ok;
    const status = response.status;

    if (isSuccess) {
      log.success(`${method} ${path.padEnd(50)} [${status}] - ${description}`);
      if (data && typeof data === 'object') {
        const dataStr = JSON.stringify(data).substring(0, 100);
        console.log(`  └─ Data: ${dataStr}${JSON.stringify(data).length > 100 ? '...' : ''}`);
      }
    } else {
      log.error(`${method} ${path.padEnd(50)} [${status}] - ${description}`);
      if (data && typeof data === 'object') {
        const errorMsg = data.detail || data.message || JSON.stringify(data).substring(0, 100);
        console.log(`  └─ Error: ${errorMsg}`);
      }
    }
    
    return { success: isSuccess, status, data };
  } catch (error) {
    log.error(`${method} ${path.padEnd(50)} [ERROR] - ${description}`);
    console.log(`  └─ ${error.message}`);
    return { success: false, status: 0, data: null, error: error.message };
  }
}

// Main test function
async function runAllTests() {
  console.log('\n');
  log.section('OCEAN DEFI INDEXER API - ENDPOINT TEST SUITE');

  // Sync Routes
  log.section('1. SYNC ROUTES');
  await testEndpoint('POST', '/sync/users', 'Sync Users');
  await testEndpoint('POST', '/sync/portfolios', 'Sync Portfolios');
  await testEndpoint('POST', '/sync/slabs', 'Sync Slabs');
  await testEndpoint('POST', '/sync/all', 'Sync All');
  await testEndpoint('POST', '/sync/apply-team-procedures', 'Apply Team Procedures');

  // Data Routes
  log.section('2. DATA ROUTES');
  await testEndpoint('GET', '/data/users', 'List Users', { skip: 0, limit: 10 });
  await testEndpoint('GET', `/data/users/${TEST_ADDRESS}/portfolios`, 'User Portfolios');
  await testEndpoint('GET', '/data/slab-achievers', 'List Slab Achievers');

  // Health Checks
  log.section('3. HEALTH CHECKS');
  await testEndpoint('GET', '/api/health', 'Slab Income Health Check');
  await testEndpoint('GET', '/api/slab-merkle/health', 'Slab Merkle Health Check');
  await testEndpoint('GET', '/api/slab-claim/health', 'Slab Claim Health Check');

  // Slab Income Routes
  log.section('4. SLAB INCOME ROUTES');
  await testEndpoint('GET', `/api/slab/${TEST_ADDRESS}/${TEST_DAY_ID}`, 'Get Slab');
  await testEndpoint('GET', `/api/considerable-roi/${TEST_ADDRESS}/${TEST_DAY_ID}`, 'Get Considerable ROI');
  await testEndpoint('GET', `/api/slab-income/${TEST_ADDRESS}/${TEST_DAY_ID}`, 'Get Slab Income');
  await testEndpoint('GET', `/api/override-income/${TEST_ADDRESS}/${TEST_DAY_ID}`, 'Get Override Income');
  await testEndpoint('GET', `/api/combined/${TEST_ADDRESS}/${TEST_DAY_ID}`, 'Get Combined Income', { price_micro_usd: 50000000 });
  await testEndpoint('GET', `/api/period/${TEST_ADDRESS}`, 'Get Period Income', { from_day: TEST_FROM_DAY, to_day: TEST_TO_DAY });
  await testEndpoint('GET', `/api/claimable/${TEST_ADDRESS}`, 'Get Claimable');

  // Team Routes
  log.section('5. TEAM ROUTES');
  await testEndpoint('GET', `/api/team/${TEST_ADDRESS}`, 'Get Team');
  await testEndpoint('GET', `/api/team/${TEST_ADDRESS}/summary`, 'Get Team Summary');
  await testEndpoint('GET', `/api/team/${TEST_ADDRESS}/legs`, 'Get Legs Breakdown');
  await testEndpoint('GET', `/api/team/${TEST_ADDRESS}/flat`, 'Get Team Flat');
  await testEndpoint('GET', `/api/team/${TEST_ADDRESS}/directs`, 'Get Directs');
  await testEndpoint('GET', `/api/team/${TEST_ADDRESS}/stats`, 'Get Team Stats');
  await testEndpoint('GET', `/api/team/${TEST_ADDRESS}/portfolio-volume`, 'Get Portfolio Volume');
  await testEndpoint('GET', `/api/team/${TEST_ADDRESS}/portfolio-volume/total`, 'Get Total Portfolio Volume');
  await testEndpoint('GET', `/api/team/${TEST_ADDRESS}/roi/user`, 'Calculate User ROI');
  await testEndpoint('GET', `/api/team/${TEST_ADDRESS}/roi/team`, 'Calculate Team ROI');
  await testEndpoint('GET', `/api/team/${TEST_ADDRESS}/roi/legs`, 'Calculate Legs ROI');
  await testEndpoint('GET', `/api/team/${TEST_ADDRESS}/roi/leg/${DIRECT_ADDRESS}`, 'Get Leg ROI Details');

  // Slab Achievers Routes
  log.section('6. SLAB ACHIEVERS ROUTES');
  await testEndpoint('POST', '/api/slab-achievers/sync', 'Sync Achievers');
  await testEndpoint('GET', `/api/slab-achievers/user/${TEST_ADDRESS}`, 'Get User Achievement');
  await testEndpoint('GET', `/api/slab-achievers/level/${SLAB_LEVEL}`, 'Get Level Achievers');
  await testEndpoint('DELETE', `/api/slab-achievers/day/${TEST_DAY_ID}`, 'Clear Day Data');

  // Slab Merkle Routes
  log.section('7. SLAB MERKLE ROUTES');
  await testEndpoint('GET', `/api/slab-merkle/proof/${TEST_ADDRESS}/${TEST_DAY_ID}`, 'Get Proof');
  await testEndpoint('GET', `/api/slab-merkle/proof-slab/${TEST_ADDRESS}/${TEST_DAY_ID}`, 'Get Slab Proof');
  await testEndpoint('GET', `/api/slab-merkle/proof-override/${TEST_ADDRESS}/${TEST_DAY_ID}`, 'Get Override Proof');
  await testEndpoint('GET', `/api/slab-merkle/proof-both/${TEST_ADDRESS}/${TEST_DAY_ID}`, 'Get Both Proofs');
  await testEndpoint('GET', `/api/slab-merkle/proof-batch/${TEST_ADDRESS}`, 'Get Proof Batch');
  await testEndpoint('GET', `/api/slab-merkle/verify-proof/${TEST_ADDRESS}/${TEST_DAY_ID}`, 'Verify Proof');
  await testEndpoint('GET', `/api/slab-merkle/merkle-root/${TEST_DAY_ID}`, 'Get Merkle Root');
  await testEndpoint('GET', `/api/slab-merkle/claimable/${TEST_ADDRESS}`, 'Get Claimable (Merkle)');

  // Slab Claim Routes
  log.section('8. SLAB CLAIM ROUTES');
  await testEndpoint('GET', `/api/slab-claim/calculate/${TEST_ADDRESS}/${TEST_FROM_DAY}/${TEST_TO_DAY}`, 'Calculate and Sign');
  await testEndpoint('GET', `/api/slab-claim/claimable/${TEST_ADDRESS}`, 'Get Claimable Signed');
  await testEndpoint('POST', '/api/slab-claim/verify-signature', 'Verify Signature');
  await testEndpoint('GET', `/api/slab-claim/nonce/${TEST_ADDRESS}`, 'Get Nonce');
  await testEndpoint('GET', `/api/slab-claim/claim-history/${TEST_ADDRESS}`, 'Get Claim History');
  await testEndpoint('GET', '/api/slab-claim/signer-info', 'Get Signer Info');

  log.section('TEST SUITE COMPLETED');
}

// Run tests
runAllTests().catch((error) => {
  log.error(`Test suite failed: ${error.message}`);
  process.exit(1);
});
