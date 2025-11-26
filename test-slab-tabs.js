const address = '0xa6EBDdFa8e3c669b5e5a9d3a2294B1052686025f';
const API_BASE = 'https://testapi.oceandefi.uk/api';

// Calculate current day_id
const calculateDayId = () => Math.floor(Date.now() / 1000 / 86400);
const currentDayId = calculateDayId();

console.log('\n=== TESTING SLAB INCOME SYSTEM TABS ===');
console.log(`Address: ${address}`);
console.log(`Current Day ID: ${currentDayId}\n`);

// TEST 1: Same Slab Override Tab - Uses /combined endpoint
console.log('📊 TAB 1: Same Slab Override (SameSlabScreen.jsx)');
console.log('━'.repeat(80));
console.log(`API Call: GET /api/combined/${address}/${currentDayId}?price_micro_usd=50000000\n`);

fetch(`${API_BASE}/combined/${address}/${currentDayId}?price_micro_usd=50000000`)
  .then(res => {
    console.log(`Status: ${res.status} ${res.statusText}`);
    if (!res.ok) {
      return res.json().then(err => {
        console.error('❌ FAILED:', err.detail || err.message || 'Unknown error');
        throw err;
      });
    }
    return res.json();
  })
  .then(data => {
    console.log('✅ SUCCESS');
    console.log('Response Data:');
    console.log(JSON.stringify(data, null, 2));
    console.log('\nParsed Values:');
    console.log(`  Slab Income USD: $${(data.slab_income_usd / 1_000_000).toFixed(2)}`);
    console.log(`  Slab Income RAMA: ${(data.slab_income_rama_wei / 1e18).toFixed(2)} RAMA`);
    console.log(`  Override Income USD: $${(data.override_income_usd / 1_000_000).toFixed(2)}`);
    console.log(`  Override Income RAMA: ${(data.override_income_rama_wei / 1e18).toFixed(2)} RAMA`);
    console.log(`  Total USD: $${(data.total_income_usd / 1_000_000).toFixed(2)}`);
    console.log(`  Total RAMA: ${(data.total_income_rama_wei / 1e18).toFixed(2)} RAMA`);
  })
  .catch(err => {
    console.error('Implementation Issue:', err.message || err);
  })
  .finally(() => {
    console.log('\n' + '='.repeat(80) + '\n');

    // TEST 2: Claim History Tab - Uses /slab-claim/claim-history endpoint
    console.log('📜 TAB 2: Claim History (SlabIncomeHistory.jsx)');
    console.log('━'.repeat(80));
    console.log(`API Call: GET /api/slab-claim/claim-history/${address}\n`);

    fetch(`${API_BASE}/slab-claim/claim-history/${address}`)
      .then(res => {
        console.log(`Status: ${res.status} ${res.statusText}`);
        if (!res.ok) {
          return res.json().then(err => {
            console.error('❌ FAILED:', err.detail || err.message || 'Unknown error');
            throw err;
          });
        }
        return res.json();
      })
      .then(data => {
        console.log('✅ SUCCESS');
        console.log('Response Data:');
        console.log(JSON.stringify(data, null, 2));
        console.log('\nParsed Values:');
        console.log(`  Total Claims: ${data.total_claims || 0}`);
        console.log(`  Claims Count: ${data.claims?.length || 0}`);
        if (data.claims && data.claims.length > 0) {
          console.log('\n  Recent Claims:');
          data.claims.slice(0, 3).forEach((claim, idx) => {
            console.log(`    ${idx + 1}. Days ${claim.from_day}-${claim.to_day}: $${claim.usd_amount} USD, ${claim.rama_amount} RAMA`);
            console.log(`       Claimed at: ${claim.claimed_at}`);
          });
        }
      })
      .catch(err => {
        console.error('Implementation Issue:', err.message || err);
      })
      .finally(() => {
        console.log('\n' + '='.repeat(80));
        console.log('\n✅ ANALYSIS COMPLETE\n');

        // Summary
        console.log('📋 IMPLEMENTATION SUMMARY:');
        console.log('━'.repeat(80));
        console.log('\nTab 1 (Same Slab Override):');
        console.log('  • Component: SameSlabScreen.jsx');
        console.log('  • API: GET /api/combined/{address}/{day_id}');
        console.log('  • Expected: Both slab and override income for current day');
        console.log('  • Shows: Slab differential + Same-slab override breakdown');
        
        console.log('\nTab 2 (Claim History):');
        console.log('  • Component: SlabIncomeHistory.jsx');
        console.log('  • API: GET /api/slab-claim/claim-history/{address}');
        console.log('  • Expected: Historical claims with amounts and dates');
        console.log('  • Shows: Past claim transactions');
        
        console.log('\n' + '='.repeat(80));
      });
  });
