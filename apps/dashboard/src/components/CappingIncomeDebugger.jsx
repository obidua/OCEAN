import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useUserInfoStore';

const CappingIncomeDebugger = ({ userAddress }) => {
  const [cappingData, setCappingData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const getCappingIncomeData = useStore((s) => s.getCappingIncomeData);

  const testCappingIncome = async () => {
    if (!userAddress) {
      setError('No user address provided');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      console.log('[CappingIncomeDebugger] Testing for address:', userAddress);
      const data = await getCappingIncomeData(userAddress);
      console.log('[CappingIncomeDebugger] Result:', data);
      setCappingData(data);
    } catch (err) {
      console.error('[CappingIncomeDebugger] Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userAddress && getCappingIncomeData) {
      testCappingIncome();
    }
  }, [userAddress, getCappingIncomeData]);

  return (
    <div className="p-4 bg-gray-900 rounded-lg border border-gray-700 text-white">
      <h3 className="text-lg font-bold mb-4 text-cyan-300">CappingIncomeManager Debug</h3>
      
      <div className="mb-4">
        <label className="block text-sm text-gray-300 mb-2">User Address:</label>
        <code className="text-xs text-green-400 bg-gray-800 p-2 rounded block">
          {userAddress || 'Not provided'}
        </code>
      </div>

      <button
        onClick={testCappingIncome}
        disabled={loading || !userAddress}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded text-sm mb-4"
      >
        {loading ? 'Loading...' : 'Test CappingIncomeManager'}
      </button>

      {error && (
        <div className="mb-4 p-3 bg-red-900/50 border border-red-600 rounded">
          <p className="text-red-300 text-sm font-bold">Error:</p>
          <p className="text-red-200 text-xs">{error}</p>
        </div>
      )}

      {cappingData && (
        <div className="space-y-4">
          <div className="bg-gray-800 p-3 rounded">
            <h4 className="text-sm font-bold text-green-400 mb-2">Total Earned USD</h4>
            <p className="text-xl font-bold text-green-300">
              ${cappingData.totalEarnedUSD?.toFixed(2) || '0.00'}
            </p>
          </div>

          <div className="bg-gray-800 p-3 rounded">
            <h4 className="text-sm font-bold text-yellow-400 mb-2">Breakdown</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-300">ROI:</span>
                <span className="text-green-300">${cappingData.breakdown?.roi?.toFixed(2) || '0.00'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Direct:</span>
                <span className="text-blue-300">${cappingData.breakdown?.direct?.toFixed(2) || '0.00'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Slab:</span>
                <span className="text-purple-300">${cappingData.breakdown?.slab?.toFixed(2) || '0.00'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Override:</span>
                <span className="text-orange-300">${cappingData.breakdown?.slabOverride?.toFixed(2) || '0.00'}</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 p-3 rounded">
            <h4 className="text-sm font-bold text-purple-400 mb-2">Raw Values (USD6)</h4>
            <div className="text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-300">ROI USD6:</span>
                <span className="text-green-300 font-mono">{cappingData.rawValues?.roiUSD6}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Direct USD6:</span>
                <span className="text-blue-300 font-mono">{cappingData.rawValues?.directUSD6}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Slab USD6:</span>
                <span className="text-purple-300 font-mono">{cappingData.rawValues?.slabUSD6}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Override USD6:</span>
                <span className="text-orange-300 font-mono">{cappingData.rawValues?.slabOverrideUSD6}</span>
              </div>
              <div className="flex justify-between font-bold border-t border-gray-600 pt-1">
                <span className="text-gray-300">Total USD6:</span>
                <span className="text-cyan-300 font-mono">{cappingData.rawValues?.totalEarnedUSD6}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CappingIncomeDebugger;