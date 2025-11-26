/**
 * Test API Endpoints with Real User
 */

const API_BASE = 'https://testapi.oceandefi.uk';
const USER_ADDRESS = '0xa6EBDdFa8e3c669b5e5a9d3a2294B1052686025f';
const USER_ID = 'USR-0152';
const TEST_DAY_ID = 0;
const TEST_FROM_DAY = 0;
const TEST_TO_DAY = 10;

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

async function testEndpoint(method, path, description, params = {}) {
  const url = new URL(`${API_BASE}${path}`);
  
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
      log.success(`${method} ${path.substring(0, 60).padEnd(60)} [${status}]`);
      console.log(`  └─ ${description}`);
      if (data && typeof data === 'object') {
        const dataStr = JSON.stringify(data);
        if (dataStr.length > 150) {
          console.log(`  └─ Response: ${dataStr.substring(0, 150)}...`);
        } else {
          console.log(`  └─ Response: ${dataStr}`);
        }
      }
    } else {
      log.error(`${method} ${path.substring(0, 60).padEnd(60)} [${status}]`);
      console.log(`  └─ ${description}`);
      if (data && typeof data === 'object') {
        const errorMsg = data.detail || data.message || JSON.stringify(data).substring(0, 100);
        console.log(`  └─ Error: ${errorMsg}`);
      }
    }
    
    return { success: isSuccess, status, data };
  } catch (error) {
    log.error(`${method} ${path.substring(0, 60).padEnd(60)} [ERROR]`);
    console.log(`  └─ ${description}`);
    console.log(`  └─ ${error.message}`);
    return { success: false, status: 0, data: null, error: error.message };
  }
}

async function runTests() {
  console.log('\n');
  log.section(`REAL USER TEST - Address: ${USER_ADDRESS}`);
  log.section(`User ID: ${USER_ID}`);

  // Data Routes
  log.section('1. DATA ROUTES');
  await testEndpoint('GET', '/data/users', 'List users with pagination', { skip: 0, limit: 1 });
  await testEndpoint('GET', `/data/users/${USER_ADDRESS}/portfolios`, 'Get user portfolios');
  
  // Team Routes
  log.section('2. TEAM ROUTES');
  await testEndpoint('GET', `/api/team/${USER_ADDRESS}`, 'Get team info');
  await testEndpoint('GET', `/api/team/${USER_ADDRESS}/summary`, 'Get team summary');
  await testEndpoint('GET', `/api/team/${USER_ADDRESS}/legs`, 'Get legs breakdown');
  await testEndpoint('GET', `/api/team/${USER_ADDRESS}/flat`, 'Get team flat list');
  await testEndpoint('GET', `/api/team/${USER_ADDRESS}/directs`, 'Get direct referrals');
  await testEndpoint('GET', `/api/team/${USER_ADDRESS}/stats`, 'Get team stats');
  await testEndpoint('GET', `/api/team/${USER_ADDRESS}/portfolio-volume`, 'Get portfolio volume');
  await testEndpoint('GET', `/api/team/${USER_ADDRESS}/portfolio-volume/total`, 'Get total portfolio volume');

  // Slab Income Routes
  log.section('3. SLAB INCOME ROUTES');
  await testEndpoint('GET', `/api/slab/${USER_ADDRESS}/${TEST_DAY_ID}`, 'Get slab level');
  await testEndpoint('GET', `/api/slab-income/${USER_ADDRESS}/${TEST_DAY_ID}`, 'Get slab income', { price_micro_usd: 50000000 });
  await testEndpoint('GET', `/api/override-income/${USER_ADDRESS}/${TEST_DAY_ID}`, 'Get override income', { price_micro_usd: 50000000 });
  await testEndpoint('GET', `/api/combined/${USER_ADDRESS}/${TEST_DAY_ID}`, 'Get combined income', { price_micro_usd: 50000000 });
  await testEndpoint('GET', `/api/period/${USER_ADDRESS}`, 'Get period income', { from_day: TEST_FROM_DAY, to_day: TEST_TO_DAY, price_micro_usd: 50000000 });
  await testEndpoint('GET', `/api/claimable/${USER_ADDRESS}`, 'Get claimable income', { price_micro_usd: 50000000 });
  await testEndpoint('GET', `/api/considerable-roi/${USER_ADDRESS}/${TEST_DAY_ID}`, 'Get considerable ROI');

  // Slab Achievers
  log.section('4. SLAB ACHIEVERS');
  await testEndpoint('GET', `/api/slab-achievers/user/${USER_ADDRESS}`, 'Get user achievement');

  // Merkle Routes
  log.section('5. MERKLE PROOFS');
  await testEndpoint('GET', `/api/slab-merkle/proof/${USER_ADDRESS}/${TEST_DAY_ID}`, 'Get merkle proof');
  await testEndpoint('GET', `/api/slab-merkle/proof-slab/${USER_ADDRESS}/${TEST_DAY_ID}`, 'Get slab proof');
  await testEndpoint('GET', `/api/slab-merkle/proof-override/${USER_ADDRESS}/${TEST_DAY_ID}`, 'Get override proof');
  await testEndpoint('GET', `/api/slab-merkle/proof-both/${USER_ADDRESS}/${TEST_DAY_ID}`, 'Get both proofs');
  await testEndpoint('GET', `/api/slab-merkle/verify-proof/${USER_ADDRESS}/${TEST_DAY_ID}`, 'Verify proof');
  await testEndpoint('GET', `/api/slab-merkle/claimable/${USER_ADDRESS}`, 'Get merkle claimable');

  // Slab Claim
  log.section('6. SLAB CLAIMS');
  await testEndpoint('GET', `/api/slab-claim/calculate/${USER_ADDRESS}/${TEST_FROM_DAY}/${TEST_TO_DAY}`, 'Calculate and sign claim');
  await testEndpoint('GET', `/api/slab-claim/claimable/${USER_ADDRESS}`, 'Get claimable signed');
  await testEndpoint('GET', `/api/slab-claim/nonce/${USER_ADDRESS}`, 'Get nonce');
  await testEndpoint('GET', `/api/slab-claim/claim-history/${USER_ADDRESS}`, 'Get claim history');

  // ROI Routes
  log.section('7. ROI CALCULATIONS');
  await testEndpoint('GET', `/api/team/${USER_ADDRESS}/roi/user`, 'Get user ROI');
  await testEndpoint('GET', `/api/team/${USER_ADDRESS}/roi/team`, 'Get team ROI');
  await testEndpoint('GET', `/api/team/${USER_ADDRESS}/roi/legs`, 'Get legs ROI');

  log.section('TEST COMPLETED');
}

runTests().catch((error) => {
  log.error(`Test failed: ${error.message}`);
  process.exit(1);
});
