// Environment configuration checker for debugging
export const checkEnvironmentConfig = () => {
  const env = import.meta.env ?? {};
  const processEnv = typeof process !== 'undefined' ? process.env : {};
  
  // console.log('🔍 Environment Configuration Check:');
  // console.log('====================================');
  
  // List all environment variables that start with VITE_
  const viteVars = Object.keys(env).filter(key => key.startsWith('VITE_'));
  // console.log('📝 VITE Environment Variables:');
  viteVars.forEach(key => {
    // console.log(`  ${key}: ${env[key]}`);
  });
  
  // Check important contract addresses
  const contractKeys = [
    'VITE_SLABMANAGER',
    'VITE_USERREGISTRY', 
    'VITE_RPC_URL',
    'VITE_PORTFOLIOMANAGER',
    'VITE_OCEANICVIEW',
    'VITE_COMPREHENSIVEVIEW'
  ];
  
  // console.log('\n🏗️ Contract Address Check:');
  contractKeys.forEach(key => {
    const value = env[key] || processEnv[key] || processEnv[key.replace('VITE_', '')];
    const status = value ? '✅' : '❌';
    // console.log(`  ${status} ${key}: ${value || 'NOT FOUND'}`);
  });
  
  // Environment detection
  // console.log('\n🌍 Environment Detection:');
  // console.log(`  Mode: ${env.MODE || 'unknown'}`);
  // console.log(`  Dev: ${env.DEV || false}`);
  // console.log(`  Prod: ${env.PROD || false}`);
  // console.log(`  Base URL: ${env.BASE_URL || '/'}`);
  // console.log(`  Build Environment: ${typeof window !== 'undefined' ? 'browser' : 'node'}`);
  
  // Network configuration
  const rpcEnvKeys = [
    'VITE_RPC_URL',
    'VITE_RPC_URL_2',
    'VITE_RPC_URL_3',
    'RPC_URL',
    'RPC_URL_2',
    'RPC_URL_3'
  ];

  const rpcUrlSet = new Set();
  rpcEnvKeys.forEach((key) => {
    const value = env[key] || processEnv[key];
    if (value) {
      rpcUrlSet.add(value);
    }
  });

  const rpcUrls = Array.from(rpcUrlSet);
  const primaryRpcUrl = rpcUrls[0] || null;
  const fallbackRpcUrls = rpcUrls.slice(1);

  // console.log('\n🌐 Network Configuration:');
  // console.log(`  Primary RPC URL: ${primaryRpcUrl || 'NOT CONFIGURED'}`);
  if (fallbackRpcUrls.length) {
    // console.log('  Fallback RPC URLs:');
    fallbackRpcUrls.forEach((url) => {
      // console.log(`    • ${url}`);
    });
  }
  // console.log(`  Network Status: ${rpcUrls.length ? 'Configured' : 'Missing'}`);
  
  return {
    hasRequiredVars: contractKeys.every(key => 
      env[key] || processEnv[key] || processEnv[key.replace('VITE_', '')]
    ),
    rpcUrl: primaryRpcUrl,
    mode: env.MODE,
    isDev: env.DEV,
    isProd: env.PROD
  };
};

// Contract address resolver with fallbacks
export const resolveContractAddress = (contractName) => {
  const env = import.meta.env ?? {};
  const processEnv = typeof process !== 'undefined' ? process.env : {};
  
  // Try multiple variations of the environment variable name
  const variations = [
    `VITE_${contractName}`,
    `VITE_${contractName.toUpperCase()}`,
    contractName,
    contractName.toUpperCase()
  ];
  
  for (const variation of variations) {
    const value = env[variation] || processEnv[variation];
    if (value && typeof value === 'string' && value.startsWith('0x') && value.length === 42) {
      // console.log(`✅ ${contractName} resolved from ${variation}: ${value}`);
      return value;
    }
  }
  
  console.warn(`⚠️ ${contractName} not found in environment variables`);
  return null;
};

// Runtime configuration validator
export const validateRuntimeConfig = () => {
  const check = checkEnvironmentConfig();
  
  if (!check.hasRequiredVars) {
    console.error('❌ Missing required environment variables!');
    console.log('💡 Make sure these are set in your .env file:');
    console.log('   VITE_SLABMANAGER=0x...');
    console.log('   VITE_USERREGISTRY=0x...');
    console.log('   VITE_RPC_URL=https://...');
    console.log('   (Optional) VITE_RPC_URL_2=https://...');
    console.log('   (Optional) VITE_RPC_URL_3=https://...');
    return false;
  }
  
  if (!check.rpcUrl) {
    console.error('❌ RPC URL not configured!');
    return false;
  }
  
  // console.log('✅ Runtime configuration valid');
  return true;
};

// Auto-run check in development
if (import.meta.env?.DEV) {
  checkEnvironmentConfig();
}
