const address = '0xa6EBDdFa8e3c669b5e5a9d3a2294B1052686025f';
const API_BASE = 'https://testapi.oceandefi.uk/api';
const currentDayId = Math.floor(Date.now() / 1000 / 86400);

console.log('Testing API directly...\n');
console.log(`Current Day ID: ${currentDayId}`);
console.log(`Address: ${address}\n`);

// Test with day 20396 (where user has achievement)
const testDayId = 20396;

console.log(`\n=== Test 1: Combined Income (Day ${currentDayId} - Current) ===`);
fetch(`${API_BASE}/combined/${address}/${currentDayId}?price_micro_usd=50000000`)
  .then(r => r.json())
  .then(data => {
    console.log('Status: SUCCESS');
    console.log('User Slab Level:', data.user_slab_level);
    console.log('Slab Income USD:', data.slab_income_usd);
    console.log('Override Income USD:', data.override_income_usd);
    console.log('Total Income USD:', data.total_income_usd);
    console.log('Note: All zeros because user has no slab achievement on current day\n');
  })
  .catch(err => console.error('Error:', err))
  .finally(() => {
    console.log(`\n=== Test 2: Combined Income (Day ${testDayId} - Achievement Day) ===`);
    fetch(`${API_BASE}/combined/${address}/${testDayId}?price_micro_usd=50000000`)
      .then(r => r.json())
      .then(data => {
        console.log('Status: SUCCESS');
        console.log('User Slab Level:', data.user_slab_level);
        console.log('Slab Percentage:', data.user_slab_percentage);
        console.log('Slab Income USD:', data.slab_income_usd);
        console.log('Override Income USD:', data.override_income_usd);
        console.log('Total Income USD:', data.total_income_usd);
        console.log('\nSlab Details:', data.slab_details.length, 'entries');
        console.log('Override Details:', data.override_details.length, 'entries');
      })
      .catch(err => console.error('Error:', err))
      .finally(() => {
        console.log(`\n=== Test 3: Claim History ===`);
        fetch(`${API_BASE}/slab-claim/claim-history/${address}`)
          .then(r => r.json())
          .then(data => {
            console.log('Status: SUCCESS');
            console.log('Total Claims:', data.total_claims);
            console.log('Claims:', data.claims?.length || 0);
          })
          .catch(err => {
            console.error('Error:', err.message);
            console.log('Note: This endpoint has SQL error (backend bug)');
          });
      });
  });
