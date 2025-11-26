/**
 * Test API Endpoints with Real Achiever Addresses
 */

const API_BASE = 'https://testapi.oceandefi.uk';

// Real achiever data from database
const achievers = [
  {
    address: '0xa6ebddfa8e3c669b5e5a9d3a2294b1052686025f',
    id: 1,
    day_id: 20396,
    slab_level: 2,
    percentage: 15.00
  },
  {
    address: '0x2eb8fce19f656f9fe0074c4b4b94e5dabe0048c1',
    id: 2,
    day_id: 20396,
    slab_level: 2,
    percentage: 15.00
  }
];

const TEST_DAY_ID = 20396;  // Day from achiever data
const ALT_TEST_DAY = 0;     // Alternative test day
const PRICE_MICRO_USD = 50000000;

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

const log = {
  success: (msg) => console.log(`${colors.green}✓ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}✗ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ ${msg}${colors.reset}`),
  section: (msg) => console.log(`\n${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n${colors.yellow}${msg}${colors.reset}\n${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`),
  user: (msg) => console.log(`\n${colors.magenta}👤 ${msg}${colors.reset}`),
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
      log.success(`${method} [${status}] - ${description}`);
      if (data && typeof data === 'object') {
        const dataStr = JSON.stringify(data);
        if (dataStr.length > 200) {
          console.log(`  └─ ${dataStr.substring(0, 200)}...`);
        } else {
          console.log(`  └─ ${dataStr}`);
        }
      }
    } else {
      log.error(`${method} [${status}] - ${description}`);
      if (data && typeof data === 'object') {
        const errorMsg = data.detail || data.message || JSON.stringify(data).substring(0, 150);
        console.log(`  └─ ${errorMsg}`);
      }
    }
    
    return { success: isSuccess, status, data };
  } catch (error) {
    log.error(`${method} [ERROR] - ${description}`);
    console.log(`  └─ ${error.message}`);
    return { success: false, status: 0, data: null, error: error.message };
  }
}

async function testAchieverEndpoints(address, dayId, slabLevel) {
  log.user(`Testing Achiever: ${address}`);
  log.user(`Slab Level: ${slabLevel}, Day ID: ${dayId}`);

  // Data endpoints
  log.section('DATA ENDPOINTS');
  await testEndpoint('GET', `/data/users/${address}/portfolios`, 'User portfolios');
  
  // Team routes
  log.section('TEAM ROUTES');
  await testEndpoint('GET', `/api/team/${address}`, 'Get team info');
  await testEndpoint('GET', `/api/team/${address}/summary`, 'Get team summary');
  await testEndpoint('GET', `/api/team/${address}/directs`, 'Get directs');
  await testEndpoint('GET', `/api/team/${address}/portfolio-volume`, 'Get portfolio volume');
  
  // Slab related (with different day IDs)
  log.section(`SLAB DATA FOR DAY ${dayId}`);
  await testEndpoint('GET', `/api/slab/${address}/${dayId}`, `Get slab for day ${dayId}`);
  await testEndpoint('GET', `/api/slab-income/${address}/${dayId}`, `Get slab income for day ${dayId}`, { price_micro_usd: PRICE_MICRO_USD });
  await testEndpoint('GET', `/api/override-income/${address}/${dayId}`, `Get override income for day ${dayId}`, { price_micro_usd: PRICE_MICRO_USD });
  await testEndpoint('GET', `/api/combined/${address}/${dayId}`, `Get combined income for day ${dayId}`, { price_micro_usd: PRICE_MICRO_USD });
  
  // Try with day 0 as well
  log.section('SLAB DATA FOR DAY 0 (Alternative)');
  await testEndpoint('GET', `/api/slab/${address}/0`, 'Get slab for day 0');
  await testEndpoint('GET', `/api/slab-income/${address}/0`, 'Get slab income for day 0', { price_micro_usd: PRICE_MICRO_USD });
  
  // Achiever specific
  log.section('ACHIEVER ENDPOINTS');
  await testEndpoint('GET', `/api/slab-achievers/user/${address}`, 'Get user achievement', { day_id: dayId });
  await testEndpoint('GET', `/api/slab-achievers/level/${slabLevel}`, `Get achievers for level ${slabLevel}`, { day_id: dayId });
  
  // Merkle proofs
  log.section(`MERKLE PROOFS FOR DAY ${dayId}`);
  await testEndpoint('GET', `/api/slab-merkle/proof/${address}/${dayId}`, `Get merkle proof for day ${dayId}`);
  await testEndpoint('GET', `/api/slab-merkle/proof-slab/${address}/${dayId}`, `Get slab proof for day ${dayId}`);
  await testEndpoint('GET', `/api/slab-merkle/proof-override/${address}/${dayId}`, `Get override proof for day ${dayId}`);
  
  // Claims
  log.section('CLAIM ENDPOINTS');
  await testEndpoint('GET', `/api/slab-claim/claim-history/${address}`, 'Get claim history');
  await testEndpoint('GET', `/api/slab-claim/nonce/${address}`, 'Get claim nonce');
  
  // ROI
  log.section('ROI ENDPOINTS');
  await testEndpoint('GET', `/api/team/${address}/roi/user`, 'Get user ROI', { from_day: 0, to_day: 10 });
  
  // Period income
  log.section('PERIOD INCOME');
  await testEndpoint('GET', `/api/period/${address}`, 'Get period income', { 
    from_day: 0, 
    to_day: 10, 
    price_micro_usd: PRICE_MICRO_USD 
  });
}

async function runAllTests() {
  console.log('\n');
  log.section('REAL ACHIEVER ENDPOINT TESTS');
  log.info(`Testing ${achievers.length} real achievers from day ${TEST_DAY_ID}`);

  for (const achiever of achievers) {
    await testAchieverEndpoints(achiever.address, achiever.day_id, achiever.slab_level);
  }

  log.section('TEST SUITE COMPLETED');
}

runAllTests().catch((error) => {
  log.error(`Test failed: ${error.message}`);
  process.exit(1);
});
