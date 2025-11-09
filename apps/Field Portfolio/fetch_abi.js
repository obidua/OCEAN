const https = require('https');

const contractAddress = '0xc67234DA25F073EFd7A42A358C068B637F0b2Cd4';
const rpcUrl = 'https://blockchain.ramestta.com';

// Fetch ABI using eth_getCode and then try to get from explorer
const options = {
  hostname: 'ramascan.com',
  path: `/api/v2/smart-contracts/${contractAddress}`,
  method: 'GET',
  headers: {
    'Accept': 'application/json'
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      if (json.abi) {
        console.log(JSON.stringify(json.abi, null, 2));
      } else {
        console.error('ABI not found in response');
        console.log(data);
      }
    } catch (e) {
      console.error('Failed to parse:', e.message);
      console.log(data.substring(0, 500));
    }
  });
});

req.on('error', (e) => {
  console.error('Request failed:', e.message);
});

req.end();
