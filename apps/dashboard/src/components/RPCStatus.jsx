import { useState, useEffect } from 'react';
import { Activity, AlertCircle, CheckCircle2, RefreshCw, Network, Plus, Wallet } from 'lucide-react';
import { rpcManager } from '../utils/rpcManager';
import { switchToWorkingRPC } from '../utils/networkSwitcher';

export default function RPCStatus() {
  const [rpcStatuses, setRpcStatuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState(null);
  const [switching, setSwitching] = useState(false);
  const [switchMessage, setSwitchMessage] = useState('');
  const [addingRpc, setAddingRpc] = useState(null);

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
      setSwitchMessage('❌ MetaMask not detected. Please install MetaMask.');
      setTimeout(() => setSwitchMessage(''), 5000);
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
      setSwitchMessage(`✅ Ramestta network added with ${rpcName}!`);
    } catch (error) {
      if (error.code === 4001) {
        setSwitchMessage('❌ User rejected the request.');
      } else {
        setSwitchMessage(`❌ Failed to add network: ${error.message}`);
      }
    } finally {
      setAddingRpc(null);
      setTimeout(() => setSwitchMessage(''), 5000);
    }
  };

  const checkRPCs = async () => {
    setLoading(true);
    try {
      // Use RPC Manager for consistent status tracking
      await rpcManager.refreshHealthStatus();
      const statuses = await rpcManager.getAllRpcStatus();
      // Map to the format expected by the UI
      setRpcStatuses(statuses.map(s => ({
        name: s.name,
        url: s.url,
        priority: s.priority,
        isOnline: s.isHealthy,
        responseTime: s.responseTime,
        blockNumber: s.blockNumber,
        error: s.error,
      })));
      setLastChecked(new Date());
    } catch (error) {
      console.error('Failed to check RPC status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchNetwork = async () => {
    setSwitching(true);
    setSwitchMessage('');
    try {
      // Use forceAdd: true to trigger MetaMask popup for adding/updating RPC
      const result = await switchToWorkingRPC(true);
      if (result.success) {
        setSwitchMessage(`✅ ${result.message}`);
        // Refresh RPC status after switch
        await checkRPCs();
      } else {
        setSwitchMessage(`❌ ${result.error}`);
      }
    } catch (error) {
      setSwitchMessage(`❌ Failed to switch: ${error.message}`);
    } finally {
      setSwitching(false);
      // Clear message after 5 seconds
      setTimeout(() => setSwitchMessage(''), 5000);
    }
  };

  useEffect(() => {
    checkRPCs();
    // Refresh RPC status every 30 seconds
    const interval = setInterval(checkRPCs, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (isOnline) => {
    return isOnline ? 'text-neon-green' : 'text-red-400';
  };

  const getStatusBadge = (isOnline) => {
    return isOnline
      ? 'bg-neon-green/20 text-neon-green border-neon-green/50'
      : 'bg-red-500/20 text-red-400 border-red-500/50';
  };

  // Check if all RPCs are online
  const allRpcsOnline = rpcStatuses.length > 0 && rpcStatuses.every(rpc => rpc.isOnline);
  const onlineCount = rpcStatuses.filter(rpc => rpc.isOnline).length;

  return (
    <div className="cyber-glass border border-cyan-500/30 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="text-cyan-400" size={24} />
          <h3 className="text-xl font-bold text-cyan-300">Network Status</h3>
        </div>
        <button
          onClick={checkRPCs}
          disabled={loading}
          className="p-2 hover:bg-cyan-500/10 rounded-lg transition-all group"
          aria-label="Refresh RPC status"
        >
          <RefreshCw
            className={`text-cyan-400 ${loading ? 'animate-spin' : 'group-hover:rotate-180'} transition-transform duration-500`}
            size={20}
          />
        </button>
      </div>

      {/* Success message when all RPCs are online */}
      {!loading && allRpcsOnline && (
        <div className="mb-4 p-3 bg-neon-green/10 border border-neon-green/30 rounded-lg flex items-center gap-2">
          <CheckCircle2 className="text-neon-green flex-shrink-0" size={20} />
          <div>
            <p className="text-neon-green font-semibold text-sm">All Systems Operational! 🚀</p>
            <p className="text-neon-green/70 text-xs">All {onlineCount} RPC endpoints are healthy and responding normally.</p>
          </div>
        </div>
      )}

      {/* Warning when some RPCs are offline */}
      {!loading && rpcStatuses.length > 0 && !allRpcsOnline && onlineCount > 0 && (
        <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-center gap-2">
          <AlertCircle className="text-yellow-400 flex-shrink-0" size={20} />
          <div>
            <p className="text-yellow-400 font-semibold text-sm">Partial Connectivity</p>
            <p className="text-yellow-400/70 text-xs">{onlineCount} of {rpcStatuses.length} RPC endpoints online. System will use available endpoints.</p>
          </div>
        </div>
      )}

      {/* Error when all RPCs are offline */}
      {!loading && rpcStatuses.length > 0 && onlineCount === 0 && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2">
          <AlertCircle className="text-red-400 flex-shrink-0" size={20} />
          <div>
            <p className="text-red-400 font-semibold text-sm">Network Unavailable</p>
            <p className="text-red-400/70 text-xs">All RPC endpoints are offline. Please check your internet connection.</p>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {loading && rpcStatuses.length === 0 ? (
          <div className="text-center py-4">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
            <p className="text-cyan-300/70 text-sm mt-2">Checking network status...</p>
          </div>
        ) : (
          <>
            {rpcStatuses.map((rpc, index) => (
              <div
                key={index}
                className={`cyber-glass border rounded-lg p-4 transition-all ${
                  rpc.isOnline ? 'border-neon-green/30 hover:border-neon-green/50' : 'border-red-500/30'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-start gap-2 min-w-0 flex-1">
                    {rpc.isOnline ? (
                      <CheckCircle2 className="text-neon-green flex-shrink-0 mt-0.5" size={18} />
                    ) : (
                      <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5" size={18} />
                    )}
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-cyan-200 text-sm">{rpc.name}</h4>
                      <p className="text-xs text-cyan-300/60 font-mono truncate">
                        {rpc.url}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-semibold border flex-shrink-0 whitespace-nowrap ${getStatusBadge(
                      rpc.isOnline
                    )}`}
                  >
                    {rpc.isOnline ? 'Online' : 'Offline'}
                  </span>
                </div>

                {rpc.isOnline && (
                  <div className="flex flex-wrap gap-4 text-xs text-cyan-300/80 mt-2">
                    <div>
                      <span className="text-cyan-400/60">Response: </span>
                      <span className="font-semibold">{rpc.responseTime}ms</span>
                    </div>
                    {rpc.blockNumber && (
                      <div>
                        <span className="text-cyan-400/60">Block: </span>
                        <span className="font-semibold">#{rpc.blockNumber.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Add to MetaMask button */}
                {rpc.isOnline && (
                  <button
                    onClick={() => addNetworkToMetaMask(rpc.url, rpc.name)}
                    disabled={addingRpc === rpc.name}
                    className="mt-3 w-full px-3 py-1.5 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/40 text-orange-300 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {addingRpc === rpc.name ? (
                      <>
                        <RefreshCw className="animate-spin" size={14} />
                        Adding...
                      </>
                    ) : (
                      <>
                        <Wallet size={14} />
                        Add Ramestta to MetaMask
                      </>
                    )}
                  </button>
                )}

                {!rpc.isOnline && rpc.error && (
                  <div className="text-xs text-red-400/70 mt-2">
                    <span className="text-red-400/60">Error: </span>
                    {rpc.error}
                  </div>
                )}
              </div>
            ))}

            {lastChecked && (
              <p className="text-xs text-cyan-300/50 text-center mt-2">
                Last checked: {lastChecked.toLocaleTimeString()}
              </p>
            )}
          </>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-cyan-500/20 space-y-3">
        <button
          onClick={handleSwitchNetwork}
          disabled={switching}
          className="w-full px-4 py-2 bg-gradient-to-r from-cyan-500 to-neon-green text-dark-950 rounded-lg font-semibold hover:shadow-neon-cyan transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          {switching ? (
            <>
              <RefreshCw className="animate-spin" size={16} />
              Switching Network...
            </>
          ) : (
            <>
              <Network size={16} />
              Switch to Working RPC
            </>
          )}
        </button>

        {switchMessage && (
          <p className={`text-xs text-center ${switchMessage.startsWith('✅') ? 'text-neon-green' : 'text-red-400'}`}>
            {switchMessage}
          </p>
        )}

        <p className="text-xs text-cyan-300/70">
          <span className="font-semibold text-cyan-400">Auto-connect:</span> The system automatically uses the fastest available RPC. Use the button above if you need to manually switch networks.
        </p>
      </div>
    </div>
  );
}
