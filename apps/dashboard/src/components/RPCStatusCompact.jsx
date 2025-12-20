import { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, RefreshCw, Wallet } from 'lucide-react';
import { rpcManager } from '../utils/rpcManager';

export default function RPCStatusCompact() {
  const [rpcStatuses, setRpcStatuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addingRpc, setAddingRpc] = useState(null);
  const [message, setMessage] = useState('');

  // Ramestta network configuration
  const ramesttaNetwork = {
    chainId: '0x55A', // 1370 in hex
    chainName: 'Ramestta Mainnet',
    nativeCurrency: {
      name: 'RAMA',
      symbol: 'RAMA',
      decimals: 18,
    },
    blockExplorerUrls: ['https://ramascan.com/'],
  };

  // Add network to MetaMask with specific RPC
  const addNetworkToMetaMask = async (rpcUrl, rpcName) => {
    if (!window.ethereum) {
      setMessage('❌ MetaMask not detected');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    setAddingRpc(rpcName);
    try {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: ramesttaNetwork.chainId,
          chainName: ramesttaNetwork.chainName,
          nativeCurrency: ramesttaNetwork.nativeCurrency,
          rpcUrls: [rpcUrl],
          blockExplorerUrls: ramesttaNetwork.blockExplorerUrls,
        }],
      });
      setMessage(`✅ Added with ${rpcName}!`);
    } catch (error) {
      if (error.code === 4001) {
        setMessage('❌ Rejected');
      } else {
        setMessage('❌ Failed');
      }
    } finally {
      setAddingRpc(null);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const checkRPCs = async () => {
    setLoading(true);
    try {
      await rpcManager.refreshHealthStatus();
      const statuses = await rpcManager.getAllRpcStatus();
      setRpcStatuses(statuses.map(s => ({
        name: s.name,
        url: s.url,
        isOnline: s.isHealthy,
        responseTime: s.responseTime,
        blockNumber: s.blockNumber,
      })));
    } catch (error) {
      console.error('Failed to check RPC status:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkRPCs();
  }, []);

  const allRpcsOnline = rpcStatuses.length > 0 && rpcStatuses.every(rpc => rpc.isOnline);
  const onlineCount = rpcStatuses.filter(rpc => rpc.isOnline).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-3">
        <RefreshCw className="animate-spin text-cyan-400" size={18} />
        <span className="ml-2 text-sm text-cyan-300/70">Checking...</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Status Summary */}
      {allRpcsOnline ? (
        <div className="flex items-center gap-2 px-3 py-2 bg-neon-green/10 border border-neon-green/30 rounded-lg">
          <CheckCircle2 className="text-neon-green" size={16} />
          <span className="text-xs text-neon-green font-medium">All {onlineCount} RPCs Online</span>
        </div>
      ) : onlineCount > 0 ? (
        <div className="flex items-center gap-2 px-3 py-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <AlertCircle className="text-yellow-400" size={16} />
          <span className="text-xs text-yellow-400 font-medium">{onlineCount}/{rpcStatuses.length} RPCs Online</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg">
          <AlertCircle className="text-red-400" size={16} />
          <span className="text-xs text-red-400 font-medium">Network Unavailable</span>
        </div>
      )}

      {/* Message */}
      {message && (
        <p className={`text-xs text-center ${message.startsWith('✅') ? 'text-neon-green' : 'text-red-400'}`}>
          {message}
        </p>
      )}

      {/* Compact RPC List */}
      <div className="space-y-1.5">
        {rpcStatuses.map((rpc, index) => (
          <div
            key={index}
            className={`flex items-center justify-between px-3 py-2 rounded-lg border ${
              rpc.isOnline 
                ? 'border-neon-green/20 bg-neon-green/5' 
                : 'border-red-500/20 bg-red-500/5'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {rpc.isOnline ? (
                <CheckCircle2 className="text-neon-green flex-shrink-0" size={14} />
              ) : (
                <AlertCircle className="text-red-400 flex-shrink-0" size={14} />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-cyan-200">{rpc.name}</span>
                  {rpc.isOnline && (
                    <span className="text-[10px] text-cyan-400/60">{rpc.responseTime}ms</span>
                  )}
                </div>
              </div>
            </div>
            
            {rpc.isOnline && (
              <button
                onClick={() => addNetworkToMetaMask(rpc.url, rpc.name)}
                disabled={addingRpc === rpc.name}
                className="px-2 py-1 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/30 text-orange-300 rounded text-[10px] font-medium flex items-center gap-1 transition-all disabled:opacity-50 flex-shrink-0"
                title="Add Ramestta network to MetaMask"
              >
                {addingRpc === rpc.name ? (
                  <RefreshCw className="animate-spin" size={10} />
                ) : (
                  <>
                    <Wallet size={10} />
                    <span className="hidden sm:inline">Add to MM</span>
                    <span className="sm:hidden">+</span>
                  </>
                )}
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Refresh button */}
      <button
        onClick={checkRPCs}
        className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs text-cyan-400/70 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-all"
      >
        <RefreshCw size={12} />
        Refresh Status
      </button>
    </div>
  );
}
