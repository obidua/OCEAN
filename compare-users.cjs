const Web3 = require('web3');
const web3 = new Web3('https://blockchain.ramestta.com');

// Contract addresses from .env
const ROIDISTRIBUTORVIEW = '0xb54a558C77b3fe95ADaCD6855A10B094EF2562bb';
const COMPREHENSIVEVIEW = '0x86CefeDFccAc9e4886f88E9096ab0b9f4e1e6679';
const USERREGISTRY = '0x2f843784D9FcC25a58BBfCcD0d61c73fF80C7913';

// User addresses
const USER_78 = '0x85991C88B5a49E37b1037D06D845DC1d9029b2dE';
const USER_152 = '0xa6EBDdFa8e3c669b5e5a9d3a2294B1052686025f';

// ABI for previewUnclaimedForPortfolio_UsingCapMgr
const previewABI = [{
  'inputs': [
    {'internalType': 'uint256', 'name': 'pid', 'type': 'uint256'},
    {'internalType': 'uint256', 'name': 'offset', 'type': 'uint256'},
    {'internalType': 'uint256', 'name': 'value', 'type': 'uint256'}
  ],
  'name': 'previewUnclaimedForPortfolio_UsingCapMgr',
  'outputs': [
    {'internalType': 'uint32', 'name': 'fromPeriod', 'type': 'uint32'},
    {'internalType': 'uint32', 'name': 'toPeriod', 'type': 'uint32'},
    {'internalType': 'uint32', 'name': 'pageStartPeriod', 'type': 'uint32'},
    {'internalType': 'uint32', 'name': 'pageEndPeriod', 'type': 'uint32'},
    {'internalType': 'uint256', 'name': 'totalEpochs', 'type': 'uint256'},
    {'internalType': 'uint32[]', 'name': 'periodIds', 'type': 'uint32[]'},
    {'internalType': 'uint256[]', 'name': 'usdPerPeriod', 'type': 'uint256[]'},
    {'internalType': 'uint256[]', 'name': 'ramaPerPeriod', 'type': 'uint256[]'},
    {'internalType': 'uint32', 'name': 'epochsCount', 'type': 'uint32'},
    {'internalType': 'uint256', 'name': 'usdTotal', 'type': 'uint256'},
    {'internalType': 'uint256', 'name': 'ramaTotal', 'type': 'uint256'},
    {'internalType': 'uint256', 'name': 'principalUsd6', 'type': 'uint256'},
    {'internalType': 'uint32', 'name': 'capPct', 'type': 'uint32'},
    {'internalType': 'uint256', 'name': 'remPidCapBeforeUSD6', 'type': 'uint256'},
    {'internalType': 'uint256', 'name': 'remPidCapAfterUSD6', 'type': 'uint256'},
    {'internalType': 'uint256', 'name': 'remUser4xBeforeUSD6', 'type': 'uint256'},
    {'internalType': 'uint256', 'name': 'remUser4xAfterUSD6', 'type': 'uint256'}
  ],
  'stateMutability': 'view',
  'type': 'function'
}];

// ABI for getUnclaimedRoi from ComprehensiveView
const comprehensiveABI = [{
  'inputs': [{'internalType': 'address', 'name': 'user', 'type': 'address'}],
  'name': 'getUnclaimedRoi',
  'outputs': [
    {'components': [
      {'internalType': 'uint256', 'name': 'pid', 'type': 'uint256'},
      {'internalType': 'uint256', 'name': 'usdTotalMicro', 'type': 'uint256'},
      {'internalType': 'uint256', 'name': 'ramaTotalWei', 'type': 'uint256'}
    ], 'internalType': 'struct ComprehensiveView.RoiPortfolioClaim[]', 'name': 'claims', 'type': 'tuple[]'},
    {'internalType': 'uint32', 'name': 'fromPeriod', 'type': 'uint32'},
    {'internalType': 'uint32', 'name': 'toPeriod', 'type': 'uint32'}
  ],
  'stateMutability': 'view',
  'type': 'function'
}];

// ABI for getPortfolioIds
const portfolioIdsABI = [{
  'inputs': [{'internalType': 'address', 'name': 'user', 'type': 'address'}],
  'name': 'getPortfolioIds',
  'outputs': [{'internalType': 'uint256[]', 'name': '', 'type': 'uint256[]'}],
  'stateMutability': 'view',
  'type': 'function'
}];

const roiView = new web3.eth.Contract(previewABI, ROIDISTRIBUTORVIEW);
const compView = new web3.eth.Contract(comprehensiveABI, COMPREHENSIVEVIEW);
const compViewPortfolio = new web3.eth.Contract(portfolioIdsABI, COMPREHENSIVEVIEW);

async function compareUsers() {
  console.log('=== Comparing User 78 vs User 152 ===\n');
  
  // Get portfolio IDs for both users
  console.log('--- Getting Portfolio IDs ---');
  
  try {
    const pids78 = await compViewPortfolio.methods.getPortfolioIds(USER_78).call();
    console.log('User 78 Portfolio IDs:', pids78.map(p => Number(p)));
    
    const pids152 = await compViewPortfolio.methods.getPortfolioIds(USER_152).call();
    console.log('User 152 Portfolio IDs:', pids152.map(p => Number(p)));
    
    // Get ComprehensiveView data for both
    console.log('\n--- ComprehensiveView.getUnclaimedRoi ---');
    
    const unclaimed78 = await compView.methods.getUnclaimedRoi(USER_78).call();
    console.log('\nUser 78 Unclaimed (ComprehensiveView):');
    console.log('  fromPeriod:', unclaimed78.fromPeriod);
    console.log('  toPeriod:', unclaimed78.toPeriod);
    unclaimed78.claims.forEach(c => {
      console.log('  PID', Number(c.pid), '- USD:', Number(c.usdTotalMicro)/1e6, '- RAMA:', Number(c.ramaTotalWei)/1e18);
    });
    
    const unclaimed152 = await compView.methods.getUnclaimedRoi(USER_152).call();
    console.log('\nUser 152 Unclaimed (ComprehensiveView):');
    console.log('  fromPeriod:', unclaimed152.fromPeriod);
    console.log('  toPeriod:', unclaimed152.toPeriod);
    unclaimed152.claims.forEach(c => {
      console.log('  PID', Number(c.pid), '- USD:', Number(c.usdTotalMicro)/1e6, '- RAMA:', Number(c.ramaTotalWei)/1e18);
    });
    
    // Get ROIDistributorView preview for first portfolio of each user
    console.log('\n--- ROIDistributorView.previewUnclaimedForPortfolio_UsingCapMgr ---');
    
    if (pids78.length > 0) {
      const firstPid78 = Number(pids78[0]);
      console.log('\nUser 78 - Portfolio', firstPid78, 'Preview:');
      try {
        const preview78 = await roiView.methods.previewUnclaimedForPortfolio_UsingCapMgr(String(firstPid78), '0', '10').call();
        console.log('  fromPeriod:', preview78.fromPeriod);
        console.log('  toPeriod:', preview78.toPeriod);
        console.log('  totalEpochs:', preview78.totalEpochs);
        console.log('  epochsCount:', preview78.epochsCount);
        console.log('  usdTotal (raw):', preview78.usdTotal, '-> USD:', Number(preview78.usdTotal)/1e6);
        console.log('  ramaTotal (raw):', preview78.ramaTotal, '-> RAMA:', Number(preview78.ramaTotal)/1e18);
        console.log('  principalUsd6:', Number(preview78.principalUsd6)/1e6);
        console.log('  capPct:', preview78.capPct);
        console.log('  First 3 periods USD:', preview78.usdPerPeriod.slice(0, 3).map(u => Number(u)/1e6));
      } catch (err) {
        console.log('  ERROR:', err.message);
      }
    }
    
    if (pids152.length > 0) {
      const firstPid152 = Number(pids152[0]);
      console.log('\nUser 152 - Portfolio', firstPid152, 'Preview:');
      try {
        const preview152 = await roiView.methods.previewUnclaimedForPortfolio_UsingCapMgr(String(firstPid152), '0', '10').call();
        console.log('  fromPeriod:', preview152.fromPeriod);
        console.log('  toPeriod:', preview152.toPeriod);
        console.log('  totalEpochs:', preview152.totalEpochs);
        console.log('  epochsCount:', preview152.epochsCount);
        console.log('  usdTotal (raw):', preview152.usdTotal, '-> USD:', Number(preview152.usdTotal)/1e6);
        console.log('  ramaTotal (raw):', preview152.ramaTotal, '-> RAMA:', Number(preview152.ramaTotal)/1e18);
        console.log('  principalUsd6:', Number(preview152.principalUsd6)/1e6);
        console.log('  capPct:', preview152.capPct);
        console.log('  First 3 periods USD:', preview152.usdPerPeriod.slice(0, 3).map(u => Number(u)/1e6));
      } catch (err) {
        console.log('  ERROR:', err.message);
      }
    }
    
  } catch (err) {
    console.error('Error:', err.message);
  }
}

compareUsers();
