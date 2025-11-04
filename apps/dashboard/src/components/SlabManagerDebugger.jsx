import React, { useState, useEffect } from 'react';
import useStore from '../../store/useUserInfoStore';
import { checkEnvironmentConfig, resolveContractAddress } from '../utils/envCheck';

const SlabManagerDebugger = () => {
  const [debugData, setDebugData] = useState({
    environment: null,
    contractTests: {},
    loading: false,
    error: null
  });
  
  const { 
    getSlabIncomeOverview, 
    getSlabManagerDetails, 
    getNextAchievementProgress,
    getSlabUserOverview,
    getDetailedAchievementProgress,
    isWalletConnected,
    userAddress 
  } = useStore();

  useEffect(() => {
    runDebugChecks();
  }, [userAddress]);

  const runDebugChecks = async () => {
    setDebugData(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      // Environment check
      const envCheck = checkEnvironmentConfig();
      // console.log('Environment Check Result:', envCheck);
      
      // Contract address resolution
      const slabManagerAddress = resolveContractAddress('SLABMANAGER');
      // console.log('SlabManager Address:', slabManagerAddress);
      
      let contractTests = {};
      
      if (isWalletConnected && userAddress) {
        // console.log('🔍 Testing SlabManager functions for user:', userAddress);
        
        // Test each function individually
        try {
          // console.log('Testing getSlabIncomeOverview...');
          const overview = await getSlabIncomeOverview();
          contractTests.slabIncomeOverview = {
            success: true,
            data: overview,
            timestamp: new Date().toISOString()
          };
          // console.log('✅ getSlabIncomeOverview success:', overview);
        } catch (error) {
          contractTests.slabIncomeOverview = {
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
          };
          console.error('❌ getSlabIncomeOverview failed:', error);
        }
        
        try {
          // console.log('Testing getSlabManagerDetails...');
          const details = await getSlabManagerDetails();
          contractTests.slabManagerDetails = {
            success: true,
            data: details,
            timestamp: new Date().toISOString()
          };
          // console.log('✅ getSlabManagerDetails success:', details);
        } catch (error) {
          contractTests.slabManagerDetails = {
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
          };
          console.error('❌ getSlabManagerDetails failed:', error);
        }
        
        try {
          // console.log('Testing getNextAchievementProgress...');
          const progress = await getNextAchievementProgress();
          contractTests.nextAchievementProgress = {
            success: true,
            data: progress,
            timestamp: new Date().toISOString()
          };
          // console.log('✅ getNextAchievementProgress success:', progress);
        } catch (error) {
          contractTests.nextAchievementProgress = {
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
          };
          console.error('❌ getNextAchievementProgress failed:', error);
        }

        // Test new comprehensive functions
        try {
          // console.log('Testing getSlabUserOverview...');
          const userOverview = await getSlabUserOverview(userAddress);
          contractTests.slabUserOverview = {
            success: userOverview.success,
            data: userOverview.data,
            error: userOverview.error,
            timestamp: userOverview.timestamp
          };
          // console.log('✅ getSlabUserOverview result:', userOverview);
        } catch (error) {
          contractTests.slabUserOverview = {
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
          };
          console.error('❌ getSlabUserOverview failed:', error);
        }

        try {
          // console.log('Testing getDetailedAchievementProgress...');
          const detailedProgress = await getDetailedAchievementProgress(userAddress, 0); // Test slab progress
          contractTests.detailedAchievementProgress = {
            success: detailedProgress.success,
            data: detailedProgress.data,
            error: detailedProgress.error,
            timestamp: detailedProgress.timestamp
          };
          // console.log('✅ getDetailedAchievementProgress result:', detailedProgress);
        } catch (error) {
          contractTests.detailedAchievementProgress = {
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
          };
          console.error('❌ getDetailedAchievementProgress failed:', error);
        }
      } else {
        contractTests.wallet = {
          success: false,
          error: 'Wallet not connected or no user address'
        };
      }
      
      setDebugData({
        environment: envCheck,
        contractTests,
        loading: false,
        error: null,
        slabManagerAddress,
        userAddress,
        isWalletConnected
      });
      
    } catch (error) {
      console.error('Debug check failed:', error);
      setDebugData(prev => ({
        ...prev,
        loading: false,
        error: error.message
      }));
    }
  };

  const TestResultCard = ({ title, result }) => (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
      <h4 className="font-semibold mb-2 flex items-center">
        {result?.success ? '✅' : '❌'} {title}
      </h4>
      {result?.success ? (
        <div className="text-sm text-green-600 dark:text-green-400">
          <div className="font-mono bg-green-50 dark:bg-green-900 p-2 rounded text-xs overflow-auto max-h-32">
            {JSON.stringify(result.data, null, 2)}
          </div>
          <div className="text-xs mt-1 opacity-75">{result.timestamp}</div>
        </div>
      ) : (
        <div className="text-sm text-red-600 dark:text-red-400">
          <div className="font-mono bg-red-50 dark:bg-red-900 p-2 rounded text-xs">
            {result?.error || 'Unknown error'}
          </div>
          {result?.timestamp && (
            <div className="text-xs mt-1 opacity-75">{result.timestamp}</div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">SlabManager Debug Panel</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Comprehensive debugging tool for SlabManager contract integration
        </p>
        <button
          onClick={runDebugChecks}
          disabled={debugData.loading}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {debugData.loading ? 'Running Tests...' : 'Run Debug Tests'}
        </button>
      </div>

      {debugData.error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded">
          <h3 className="font-semibold text-red-800 dark:text-red-200">Error</h3>
          <p className="text-red-600 dark:text-red-400">{debugData.error}</p>
        </div>
      )}

      {/* Environment Info */}
      {debugData.environment && (
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded">
          <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">Environment Status</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Config Valid:</span> {debugData.environment.hasRequiredVars ? '✅' : '❌'}
            </div>
            <div>
              <span className="font-medium">RPC URL:</span> {debugData.environment.rpcUrl ? '✅' : '❌'}
            </div>
            <div>
              <span className="font-medium">Mode:</span> {debugData.environment.mode}
            </div>
            <div>
              <span className="font-medium">SlabManager Address:</span> {debugData.slabManagerAddress || '❌'}
            </div>
            <div>
              <span className="font-medium">Wallet Connected:</span> {debugData.isWalletConnected ? '✅' : '❌'}
            </div>
            <div>
              <span className="font-medium">User Address:</span> {debugData.userAddress || 'None'}
            </div>
          </div>
        </div>
      )}

      {/* Contract Function Tests */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(debugData.contractTests).map(([key, result]) => (
          <TestResultCard
            key={key}
            title={key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
            result={result}
          />
        ))}
      </div>

      {/* Console Output Viewer */}
      <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900 border rounded">
        <h3 className="font-semibold mb-2">Console Output</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Check the browser console for detailed logs. Open Developer Tools → Console to see:
        </p>
        <ul className="text-sm text-gray-600 dark:text-gray-400 mt-2 list-disc pl-5">
          <li>Environment variable detection</li>
          <li>Contract initialization logs</li>
          <li>Function call attempts and results</li>
          <li>Error stack traces</li>
          <li>Network request details</li>
        </ul>
      </div>
    </div>
  );
};

export default SlabManagerDebugger;