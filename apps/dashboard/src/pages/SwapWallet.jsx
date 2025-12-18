import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  RefreshCw,
  ArrowRightLeft,
  History,
  AlertCircle,
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  X,
  Loader2,
  Filter,
  SortAsc,
  SortDesc,
  Coins,
  DollarSign,
  TrendingUp,
  CheckCircle,
  Clock,
  Info,
  Settings,
  Zap,
  Award,
  Trophy,
  Gift,
  Layers,
} from 'lucide-react';
import { formatRAMA, formatUSD } from '../utils/contractData';
import AddressWithCopy from '../components/AddressWithCopy';
import { useStore } from '../../store/useUserInfoStore';
import { useNavigate } from 'react-router-dom';
import ProgressiveTransactionModal from '../components/ProgressiveTransactionModal';
import { useAppKitAccount } from '@reown/appkit/react';
import { useTransaction } from '../../config/register';
import { useWaitForTransactionReceipt } from 'wagmi';

const HISTORY_PAGE_SIZE = 20;

const formatRamaPrecise = (value) => {
  const num = Number(value) || 0;
  if (num === 0) return '0.00000';
  if (Math.abs(num) < 0.00001) {
    return num.toPrecision(5);
  }
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 5,
    maximumFractionDigits: 5,
  }).format(num);
};

// Transaction types for Swap Wallet
const SWAP_TX_TYPES = {
  TRANSFER_IN: 'transfer_in',      // Income transferred from Safe Wallet
  SWAP_TO_RUSD: 'swap_to_rusd',    // RAMA swapped to RUSD
  SWAP_TO_USDT: 'swap_to_usdt',    // RUSD swapped to USDT
  WITHDRAW: 'withdraw',             // USDT withdrawn to external wallet
};

const TX_TYPE_LABELS = {
  [SWAP_TX_TYPES.TRANSFER_IN]: 'Transfer from Safe Wallet',
  [SWAP_TX_TYPES.SWAP_TO_RUSD]: 'Swap to RUSD',
  [SWAP_TX_TYPES.SWAP_TO_USDT]: 'Swap RUSD to USDT',
  [SWAP_TX_TYPES.WITHDRAW]: 'Withdraw USDT',
};

// Mock data for UI development - will be replaced with contract calls
const MOCK_SWAP_BALANCE = {
  rama: 279.71567,
  rusd: 15.50,
  usdt: 42.75,
  usdValue: 5.59,
};

const MOCK_HISTORY = [
  {
    id: '1',
    type: SWAP_TX_TYPES.TRANSFER_IN,
    status: 'completed',
    ramaAmount: 100.5,
    usdValue: 2.01,
    rusdAmount: 0,
    usdtAmount: 0,
    timestamp: Date.now() - 86400000 * 2,
    txHash: '0x1234...abcd',
    incomeType: 'Spot Income',
  },
  {
    id: '2',
    type: SWAP_TX_TYPES.SWAP_TO_RUSD,
    status: 'completed',
    ramaAmount: 50.25,
    usdValue: 1.00,
    rusdAmount: 1.00,
    usdtAmount: 0,
    timestamp: Date.now() - 86400000,
    txHash: '0x5678...efgh',
    incomeType: null,
  },
];

// Income routing options
const INCOME_ROUTING_OPTIONS = [
  { 
    id: 'daily_reward', 
    label: 'Daily Reward (ROI)', 
    icon: TrendingUp, 
    color: 'text-emerald-400',
    description: 'Portfolio accrued rewards'
  },
  { 
    id: 'spot_income', 
    label: 'Spot (Direct Income)', 
    icon: Zap, 
    color: 'text-cyan-400',
    description: 'Direct referral commissions'
  },
  { 
    id: 'slab_income', 
    label: 'Slab Income', 
    icon: Layers, 
    color: 'text-violet-400',
    description: 'Team level matching bonus'
  },
  { 
    id: 'slab_override', 
    label: 'Slab Override', 
    icon: Award, 
    color: 'text-amber-400',
    description: 'Leadership override income'
  },
  { 
    id: 'royalty_income', 
    label: 'Royalty Income', 
    icon: Trophy, 
    color: 'text-pink-400',
    description: 'Royalty pool rewards'
  },
  { 
    id: 'one_time_reward', 
    label: 'One-Time Reward', 
    icon: Gift, 
    color: 'text-orange-400',
    description: 'Achievement bonuses'
  },
];

// Mock income routing settings (will be stored in contract)
const MOCK_INCOME_ROUTING = {
  daily_reward: 'safe', // 'safe' or 'swap'
  spot_income: 'safe',
  slab_income: 'safe',
  slab_override: 'safe',
  royalty_income: 'safe',
  one_time_reward: 'safe',
};

export default function SwapWallet() {
  const navigate = useNavigate();
  const getSafeWalletSummary = useStore((s) => s.getSafeWalletSummary);
  const userAddressFromStore = useStore((s) => s.userAddress);

  // AppKit hooks
  const { address, isConnected } = useAppKitAccount();
  const userAddress = userAddressFromStore || address || localStorage.getItem('userAddress');

  // Swap Wallet State
  const [swapBalance, setSwapBalance] = useState({
    rama: 0,
    rusd: 0,
    usdt: 0,
    usdValue: 0,
  });
  const [safeWalletBalance, setSafeWalletBalance] = useState({
    rama: 0,
    usd: 0,
  });
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [balanceError, setBalanceError] = useState('');

  // Transfer Modal State
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferAmount, setTransferAmount] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);

  // Swap Modal State
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [swapAmount, setSwapAmount] = useState('');
  const [swapType, setSwapType] = useState('rama_to_rusd'); // 'rama_to_rusd' or 'rusd_to_usdt'
  const [swapLoading, setSwapLoading] = useState(false);

  // Income Routing State
  const [incomeRouting, setIncomeRouting] = useState(MOCK_INCOME_ROUTING);
  const [routingLoading, setRoutingLoading] = useState({});
  const [showRoutingModal, setShowRoutingModal] = useState(false);
  const [routingModalData, setRoutingModalData] = useState(null);
  const [routingTxStep, setRoutingTxStep] = useState(0); // 0: waiting, 1: signing, 2: confirming, 3: success, 4: error

  // Transaction History State
  const [historyEntries, setHistoryEntries] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('desc');

  // Progressive Transaction Modal
  const [showTxModal, setShowTxModal] = useState(false);
  const [txData, setTxData] = useState(null);
  const [txType, setTxType] = useState('');

  // Transaction hooks (placeholder - will be connected to contract later)
  const { handleSendTx, hash } = useTransaction(txData !== null && txData);
  const { 
    isLoading: isConfirming, 
    isSuccess: isConfirmed,
    isError: isTxError,
  } = useWaitForTransactionReceipt({ hash });

  // Load balances
  useEffect(() => {
    let cancelled = false;

    const loadBalances = async () => {
      if (!userAddress) {
        setSwapBalance({ rama: 0, rusd: 0, usdt: 0, usdValue: 0 });
        setSafeWalletBalance({ rama: 0, usd: 0 });
        return;
      }

      setBalanceLoading(true);
      setBalanceError('');

      try {
        // Load Safe Wallet balance for transfer reference
        if (getSafeWalletSummary) {
          const summary = await getSafeWalletSummary(userAddress);
          if (!cancelled && summary) {
            setSafeWalletBalance({
              rama: summary.balance?.rama || 0,
              usd: summary.balance?.usd || 0,
            });
          }
        }

        // TODO: Load Swap Wallet balance from contract
        // For now, using mock data
        if (!cancelled) {
          setSwapBalance(MOCK_SWAP_BALANCE);
          setHistoryEntries(MOCK_HISTORY);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load swap wallet data:', error);
          setBalanceError(error?.message || 'Failed to load balances');
        }
      } finally {
        if (!cancelled) {
          setBalanceLoading(false);
        }
      }
    };

    loadBalances();

    return () => {
      cancelled = true;
    };
  }, [userAddress, getSafeWalletSummary]);

  // Filter and sort history
  const filteredHistory = useMemo(() => {
    let filtered = [...historyEntries];

    if (selectedFilter !== 'all') {
      filtered = filtered.filter((tx) => tx.type === selectedFilter);
    }

    filtered.sort((a, b) => {
      const diff = (b.timestamp || 0) - (a.timestamp || 0);
      return sortOrder === 'desc' ? diff : -diff;
    });

    return filtered;
  }, [historyEntries, selectedFilter, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(filteredHistory.length / HISTORY_PAGE_SIZE);
  const paginatedHistory = filteredHistory.slice(
    (currentPage - 1) * HISTORY_PAGE_SIZE,
    currentPage * HISTORY_PAGE_SIZE
  );

  // Handle transfer from Safe Wallet
  const handleTransfer = useCallback(async () => {
    if (!transferAmount || Number(transferAmount) <= 0) return;

    setTransferLoading(true);
    try {
      // TODO: Call transfer contract function
      // The contract will:
      // 1. Deduct RAMA from Safe Wallet
      // 2. Credit RAMA to Swap Wallet at locked USD value
      console.log('Transferring', transferAmount, 'RAMA from Safe Wallet to Swap Wallet');
      
      // Mock success for UI development
      setTimeout(() => {
        setShowTransferModal(false);
        setTransferAmount('');
        setTransferLoading(false);
        // Refresh balances
      }, 1500);
    } catch (error) {
      console.error('Transfer failed:', error);
      setTransferLoading(false);
    }
  }, [transferAmount]);

  // Handle swap
  const handleSwap = useCallback(async () => {
    if (!swapAmount || Number(swapAmount) <= 0) return;

    setSwapLoading(true);
    try {
      if (swapType === 'rama_to_rusd') {
        // TODO: Call swap contract function
        // The contract will:
        // 1. Deduct RAMA from Swap Wallet
        // 2. Mint RUSD to user at locked USD value
        // 3. RAMA deposited to contract
        console.log('Swapping', swapAmount, 'RAMA to RUSD');
      } else {
        // RUSD to USDT swap
        console.log('Swapping', swapAmount, 'RUSD to USDT');
      }
      
      // Mock success for UI development
      setTimeout(() => {
        setShowSwapModal(false);
        setSwapAmount('');
        setSwapLoading(false);
        // Refresh balances
      }, 1500);
    } catch (error) {
      console.error('Swap failed:', error);
      setSwapLoading(false);
    }
  }, [swapAmount, swapType]);

  // Handle income routing toggle
  const handleRoutingToggle = useCallback(async (incomeId) => {
    if (!isConnected) {
      alert('Please connect your wallet to change income routing.');
      return;
    }

    const currentSetting = incomeRouting[incomeId];
    const newSetting = currentSetting === 'safe' ? 'swap' : 'safe';
    const optionData = INCOME_ROUTING_OPTIONS.find(o => o.id === incomeId);

    // Show progressive modal
    setRoutingModalData({
      incomeId,
      label: optionData?.label || incomeId,
      from: currentSetting,
      to: newSetting,
    });
    setRoutingTxStep(1); // Signing
    setShowRoutingModal(true);

    try {
      // TODO: Call contract to update routing preference
      // This will trigger MetaMask signature
      console.log(`Updating ${incomeId} routing from ${currentSetting} to ${newSetting}`);

      // Simulate wallet signing
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      setRoutingTxStep(2); // Confirming
      
      // Simulate blockchain confirmation
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Success
      setRoutingTxStep(3);
      setIncomeRouting((prev) => ({
        ...prev,
        [incomeId]: newSetting,
      }));
    } catch (error) {
      console.error('Failed to update routing:', error);
      setRoutingTxStep(4); // Error
    }
  }, [incomeRouting, isConnected]);

  // Format date
  const formatDate = (timestamp) => {
    if (!timestamp) return '—';
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get status badge
  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/40 rounded-full text-emerald-300 text-xs">
            <CheckCircle size={10} />
            Completed
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-500/20 border border-amber-500/40 rounded-full text-amber-300 text-xs">
            <Clock size={10} />
            Pending
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-500/20 border border-red-500/40 rounded-full text-red-300 text-xs">
            <AlertCircle size={10} />
            Failed
          </span>
        );
      default:
        return null;
    }
  };

  // Get type badge
  const getTypeBadge = (type) => {
    const colors = {
      [SWAP_TX_TYPES.TRANSFER_IN]: 'text-cyan-300 border-cyan-500/40 bg-cyan-500/10',
      [SWAP_TX_TYPES.SWAP_TO_RUSD]: 'text-violet-300 border-violet-500/40 bg-violet-500/10',
      [SWAP_TX_TYPES.SWAP_TO_USDT]: 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10',
      [SWAP_TX_TYPES.WITHDRAW]: 'text-amber-300 border-amber-500/40 bg-amber-500/10',
    };

    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-xs ${colors[type] || 'text-gray-300'}`}>
        {TX_TYPE_LABELS[type] || type}
      </span>
    );
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-cyan-300 flex items-center gap-3">
            <ArrowRightLeft className="text-violet-400" size={28} />
            Swap Wallet
          </h1>
          <p className="text-sm text-cyan-300/70 mt-1">
            Convert your income to RUSD and USDT with no price impact
          </p>
        </div>
        <button
          onClick={() => navigate('/dashboard/safe-wallet')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg text-cyan-300 hover:bg-cyan-500/20 transition-colors text-sm"
        >
          <Wallet size={16} />
          Back to Safe Wallet
        </button>
      </div>

      {/* Info Banner */}
      <div className="cyber-glass rounded-xl border border-violet-500/30 p-4 bg-violet-500/5">
        <div className="flex items-start gap-3">
          <Info size={20} className="text-violet-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-violet-300 mb-1">How Swap Wallet Works</h3>
            <ul className="text-xs text-violet-200/80 space-y-1">
              <li>• Configure income routing below → Income goes directly to Swap Wallet</li>
              <li>• USD value is <strong>locked at the time income is received</strong> (no price impact)</li>
              <li>• Swap RAMA to RUSD → Swap RUSD to USDT → Withdraw USDT anytime</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Main Balance Card - USDT (Big Card like Safe Wallet) */}
      <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2 cyber-glass border border-emerald-500/50 rounded-2xl p-4 sm:p-6 lg:p-8 text-white relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 opacity-50 group-hover:opacity-70 transition-opacity" />
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/70 to-transparent" />
          
          <div className="flex items-center gap-3 mb-4 sm:mb-6 relative z-10">
            <div className="p-2 sm:p-3 cyber-glass border border-emerald-500/30 rounded-xl backdrop-blur-sm">
              <DollarSign size={24} className="text-emerald-400 sm:w-8 sm:h-8" />
            </div>
            <div>
              <p className="text-sm opacity-90">USDT Balance</p>
              <p className="text-xs opacity-75 hidden sm:block">Ready to withdraw</p>
            </div>
          </div>

          <div className="mb-4 sm:mb-6 relative z-10">
            <p className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-2 text-emerald-100">
              {balanceLoading ? (
                <span className="text-xl sm:text-2xl text-cyan-300 animate-pulse">Loading...</span>
              ) : (
                `${formatUSD(swapBalance.usdt)} USDT`
              )}
            </p>
            <p className="text-sm text-emerald-300/80 mt-2">
              Stablecoin • 1 USDT = 1 USD
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 relative z-10">
            <button
              onClick={() => {
                setSwapType('rama_to_rusd');
                setShowSwapModal(true);
              }}
              disabled={swapBalance.rama <= 0}
              className="py-3 px-4 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium transition-all flex items-center justify-center gap-2 text-sm sm:text-base"
            >
              <ArrowRightLeft size={16} />
              Swap Now to RUSD
            </button>
            <button
              onClick={() => {
                setSwapType('rusd_to_usdt');
                setShowSwapModal(true);
              }}
              disabled={swapBalance.rusd <= 0}
              className="py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium transition-all flex items-center justify-center gap-2 text-sm sm:text-base"
            >
              <ArrowRightLeft size={16} />
              Swap RUSD to USDT
            </button>
          </div>
        </div>

        {/* Side Cards - RAMA & RUSD */}
        <div className="space-y-3 sm:space-y-4">
          {/* RAMA Balance Card */}
          <div className="cyber-glass rounded-xl p-4 sm:p-5 border border-cyan-500/30 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 cyber-glass border border-cyan-500/30 rounded-lg">
                <Coins className="text-cyan-400" size={18} />
              </div>
              <p className="text-sm font-medium text-cyan-300">RAMA Balance</p>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-cyan-100">
              {balanceLoading ? (
                <span className="text-sm text-cyan-200 animate-pulse">Loading...</span>
              ) : (
                formatRamaPrecise(swapBalance.rama)
              )}
            </div>
            <p className="text-xs text-cyan-300/60 mt-1">≈ {formatUSD(swapBalance.usdValue)}</p>
          </div>

          {/* RUSD Balance Card */}
          <div className="cyber-glass rounded-xl p-4 sm:p-5 border border-violet-500/30 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 cyber-glass border border-violet-500/30 rounded-lg">
                <DollarSign className="text-violet-400" size={18} />
              </div>
              <p className="text-sm font-medium text-violet-300">RUSD Balance</p>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-violet-100">
              {balanceLoading ? (
                <span className="text-sm text-violet-200 animate-pulse">Loading...</span>
              ) : (
                `${formatUSD(swapBalance.rusd)} RUSD`
              )}
            </div>
            <p className="text-xs text-violet-300/60 mt-1">Stablecoin pegged to USD</p>
          </div>
        </div>
      </div>

      {/* Income Routing Configuration */}
      <div className="cyber-glass rounded-xl border border-cyan-500/30 p-5 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
        
        <div className="flex items-center gap-3 mb-4">
          <Settings size={20} className="text-cyan-400" />
          <div>
            <h2 className="text-lg font-semibold text-cyan-300">Income Routing</h2>
            <p className="text-xs text-cyan-300/60">Choose where each income type should be deposited</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {INCOME_ROUTING_OPTIONS.map((option) => {
            const Icon = option.icon;
            const isSwapWallet = incomeRouting[option.id] === 'swap';
            const isLoading = routingLoading[option.id];

            return (
              <div
                key={option.id}
                className={`cyber-glass rounded-lg border p-4 transition-all ${
                  isSwapWallet 
                    ? 'border-violet-500/50 bg-violet-500/10' 
                    : 'border-cyan-500/30 bg-cyan-500/5'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Icon size={16} className={option.color} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-cyan-100 truncate">{option.label}</p>
                      <p className="text-[10px] text-cyan-300/60 truncate">{option.description}</p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleRoutingToggle(option.id)}
                    disabled={isLoading || !isConnected}
                    className={`flex-shrink-0 relative w-14 h-7 rounded-full transition-all ${
                      isLoading ? 'opacity-50 cursor-wait' : ''
                    } ${!isConnected ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <div className={`absolute inset-0 rounded-full transition-colors ${
                      isSwapWallet ? 'bg-violet-600' : 'bg-gray-600'
                    }`} />
                    <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-lg transition-transform flex items-center justify-center ${
                      isSwapWallet ? 'translate-x-7' : 'translate-x-0.5'
                    }`}>
                      {isLoading ? (
                        <Loader2 size={12} className="animate-spin text-gray-600" />
                      ) : isSwapWallet ? (
                        <ArrowRightLeft size={10} className="text-violet-600" />
                      ) : (
                        <Wallet size={10} className="text-gray-600" />
                      )}
                    </div>
                  </button>
                </div>
                
                {/* Current Status Display */}
                <div className="mt-3 pt-3 border-t border-cyan-500/10">
                  <p className="text-[10px] text-cyan-300/50 mb-1">Current Deposit Destination:</p>
                  <div className={`flex items-center gap-2 p-2 rounded-lg ${
                    isSwapWallet 
                      ? 'bg-violet-500/20 border border-violet-500/30' 
                      : 'bg-cyan-500/10 border border-cyan-500/20'
                  }`}>
                    {isSwapWallet ? (
                      <ArrowRightLeft size={14} className="text-violet-400" />
                    ) : (
                      <Wallet size={14} className="text-cyan-400" />
                    )}
                    <div>
                      <p className={`text-xs font-semibold ${
                        isSwapWallet ? 'text-violet-300' : 'text-cyan-300'
                      }`}>
                        {isSwapWallet ? 'Swap Wallet' : 'Safe Wallet'}
                      </p>
                      <p className="text-[9px] text-cyan-300/50">
                        {isSwapWallet 
                          ? 'Income auto-converts to RUSD' 
                          : 'Income stored as RAMA'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {!isConnected && (
          <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <div className="flex items-center gap-2 text-amber-300 text-xs">
              <AlertCircle size={14} />
              <span>Connect your wallet to change income routing preferences</span>
            </div>
          </div>
        )}
      </div>

      {/* Transaction History */}
      <div className="cyber-glass rounded-xl border border-cyan-500/30 p-5 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <History size={18} className="text-cyan-400" />
            <h2 className="text-lg font-semibold text-cyan-300">Transaction History</h2>
          </div>
          
          {/* Filters */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-xs text-cyan-300/70">
              <Filter size={14} />
            </div>
            <select
              value={selectedFilter}
              onChange={(e) => setSelectedFilter(e.target.value)}
              className="text-xs bg-dark-900/60 border border-cyan-500/30 rounded-lg px-2 py-1 text-cyan-200 focus:border-cyan-500/60 focus:outline-none"
            >
              <option value="all">All Types</option>
              <option value={SWAP_TX_TYPES.TRANSFER_IN}>Transfers In</option>
              <option value={SWAP_TX_TYPES.SWAP_TO_RUSD}>RAMA → RUSD</option>
              <option value={SWAP_TX_TYPES.SWAP_TO_USDT}>RUSD → USDT</option>
              <option value={SWAP_TX_TYPES.WITHDRAW}>Withdrawals</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
              className="p-1.5 bg-dark-900/60 border border-cyan-500/30 rounded-lg text-cyan-300 hover:bg-cyan-500/10"
            >
              {sortOrder === 'desc' ? <SortDesc size={14} /> : <SortAsc size={14} />}
            </button>
          </div>
        </div>

        {historyLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin text-cyan-400" />
            <span className="ml-2 text-cyan-300/70">Loading history...</span>
          </div>
        ) : paginatedHistory.length === 0 ? (
          <div className="text-center py-12 text-cyan-300/60">
            <ArrowRightLeft size={32} className="mx-auto mb-3 opacity-50" />
            <p>No swap transactions yet</p>
            <p className="text-xs mt-1">Enable income routing to Swap Wallet to get started</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-xs uppercase border-b border-cyan-500/20 text-cyan-300/70">
                  <tr>
                    <th className="py-3 px-3">Type</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">RAMA</th>
                    <th className="py-3 px-3 text-right">USD Value</th>
                    <th className="py-3 px-3 text-right">RUSD</th>
                    <th className="py-3 px-3 text-right">USDT</th>
                    <th className="py-3 px-3 text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cyan-500/10">
                  {paginatedHistory.map((tx) => (
                    <tr key={tx.id} className="hover:bg-cyan-500/5 transition-colors">
                      <td className="py-3 px-3">{getTypeBadge(tx.type)}</td>
                      <td className="py-3 px-3">{getStatusBadge(tx.status)}</td>
                      <td className="py-3 px-3 text-right text-cyan-100 font-mono">
                        {tx.ramaAmount > 0 ? formatRamaPrecise(tx.ramaAmount) : '—'}
                      </td>
                      <td className="py-3 px-3 text-right text-emerald-300 font-medium">
                        {formatUSD(tx.usdValue)}
                      </td>
                      <td className="py-3 px-3 text-right text-violet-300 font-mono">
                        {tx.rusdAmount > 0 ? formatUSD(tx.rusdAmount) : '—'}
                      </td>
                      <td className="py-3 px-3 text-right text-emerald-300 font-mono">
                        {tx.usdtAmount > 0 ? formatUSD(tx.usdtAmount) : '—'}
                      </td>
                      <td className="py-3 px-3 text-right text-cyan-300/70 text-xs">
                        {formatDate(tx.timestamp)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {paginatedHistory.map((tx) => (
                <div
                  key={tx.id}
                  className="cyber-glass border border-cyan-500/20 rounded-lg p-3 hover:border-cyan-500/40 transition-all"
                >
                  <div className="flex items-center justify-between mb-2">
                    {getTypeBadge(tx.type)}
                    {getStatusBadge(tx.status)}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-cyan-300/60">RAMA:</span>
                      <span className="ml-1 text-cyan-100 font-mono">
                        {tx.ramaAmount > 0 ? formatRamaPrecise(tx.ramaAmount) : '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-cyan-300/60">USD:</span>
                      <span className="ml-1 text-emerald-300 font-medium">{formatUSD(tx.usdValue)}</span>
                    </div>
                    <div>
                      <span className="text-cyan-300/60">RUSD:</span>
                      <span className="ml-1 text-violet-300">
                        {tx.rusdAmount > 0 ? formatUSD(tx.rusdAmount) : '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-cyan-300/60">Date:</span>
                      <span className="ml-1 text-cyan-300/70">{formatDate(tx.timestamp)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-cyan-500/20">
                <span className="text-xs text-cyan-300/60">
                  Page {currentPage} of {totalPages}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 bg-dark-900/60 border border-cyan-500/30 rounded-lg text-cyan-300 hover:bg-cyan-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 bg-dark-900/60 border border-cyan-500/30 rounded-lg text-cyan-300 hover:bg-cyan-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="cyber-glass rounded-xl border border-cyan-500/30 w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-cyan-500/20 bg-dark-900/90">
              <h3 className="text-lg font-bold text-cyan-300">Transfer to Swap Wallet</h3>
              <button
                onClick={() => setShowTransferModal(false)}
                className="p-2 rounded-full hover:bg-cyan-500/10"
              >
                <X size={18} className="text-cyan-300" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="cyber-glass rounded-lg border border-cyan-500/20 p-4 bg-cyan-500/5">
                <p className="text-xs text-cyan-300/70 mb-1">Available in Safe Wallet</p>
                <p className="text-lg font-bold text-cyan-100">
                  {formatRamaPrecise(safeWalletBalance.rama)} RAMA
                </p>
                <p className="text-xs text-cyan-300/60">≈ {formatUSD(safeWalletBalance.usd)}</p>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-200">
                    The USD value will be <strong>locked at the current price</strong> when you transfer. 
                    Future price changes won't affect your locked value.
                  </p>
                </div>
              </div>

              <div>
                <label className="text-xs text-cyan-300/70 mb-2 block">Amount to Transfer (RAMA)</label>
                <div className="relative">
                  <input
                    type="number"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-dark-900/60 border border-cyan-500/30 rounded-lg px-4 py-3 text-cyan-100 placeholder-cyan-300/30 focus:border-cyan-500/60 focus:outline-none"
                  />
                  <button
                    onClick={() => setTransferAmount(String(safeWalletBalance.rama))}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-cyan-500/20 border border-cyan-500/30 rounded text-xs text-cyan-300 hover:bg-cyan-500/30"
                  >
                    MAX
                  </button>
                </div>
              </div>

              <button
                onClick={handleTransfer}
                disabled={!transferAmount || Number(transferAmount) <= 0 || transferLoading}
                className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-all flex items-center justify-center gap-2"
              >
                {transferLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Transferring...
                  </>
                ) : (
                  <>
                    <ArrowDownRight size={16} />
                    Transfer
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Swap Modal */}
      {showSwapModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="cyber-glass rounded-xl border border-violet-500/30 w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-violet-500/20 bg-dark-900/90">
              <h3 className="text-lg font-bold text-violet-300">
                {swapType === 'rama_to_rusd' ? 'Swap RAMA to RUSD' : 'Swap RUSD to USDT'}
              </h3>
              <button
                onClick={() => {
                  setShowSwapModal(false);
                  setSwapType('rama_to_rusd');
                }}
                className="p-2 rounded-full hover:bg-violet-500/10"
              >
                <X size={18} className="text-violet-300" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {swapType === 'rama_to_rusd' ? (
                <>
                  <div className="cyber-glass rounded-lg border border-cyan-500/20 p-4 bg-cyan-500/5">
                    <p className="text-xs text-cyan-300/70 mb-1">Available RAMA</p>
                    <p className="text-lg font-bold text-cyan-100">
                      {formatRamaPrecise(swapBalance.rama)} RAMA
                    </p>
                    <p className="text-xs text-cyan-300/60">≈ {formatUSD(swapBalance.usdValue)}</p>
                  </div>

                  <div className="flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-violet-500/20 border border-violet-500/40 flex items-center justify-center">
                      <ArrowRightLeft size={18} className="text-violet-400" />
                    </div>
                  </div>

                  <div className="cyber-glass rounded-lg border border-violet-500/20 p-4 bg-violet-500/5">
                    <p className="text-xs text-violet-300/70 mb-1">You will receive (RUSD)</p>
                    <p className="text-lg font-bold text-violet-100">
                      {swapAmount ? formatUSD(Number(swapAmount) * (swapBalance.usdValue / swapBalance.rama)) : '0.00'} RUSD
                    </p>
                    <p className="text-xs text-violet-300/60">1 RUSD = 1 USD (no price impact)</p>
                  </div>

                  <div>
                    <label className="text-xs text-violet-300/70 mb-2 block">Amount to Swap (RAMA)</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={swapAmount}
                        onChange={(e) => setSwapAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-dark-900/60 border border-violet-500/30 rounded-lg px-4 py-3 text-violet-100 placeholder-violet-300/30 focus:border-violet-500/60 focus:outline-none"
                      />
                      <button
                        onClick={() => setSwapAmount(String(swapBalance.rama))}
                        className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-violet-500/20 border border-violet-500/30 rounded text-xs text-violet-300 hover:bg-violet-500/30"
                      >
                        MAX
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="cyber-glass rounded-lg border border-violet-500/20 p-4 bg-violet-500/5">
                    <p className="text-xs text-violet-300/70 mb-1">Available RUSD</p>
                    <p className="text-lg font-bold text-violet-100">
                      {formatUSD(swapBalance.rusd)} RUSD
                    </p>
                  </div>

                  <div className="flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                      <ArrowRightLeft size={18} className="text-emerald-400" />
                    </div>
                  </div>

                  <div className="cyber-glass rounded-lg border border-emerald-500/20 p-4 bg-emerald-500/5">
                    <p className="text-xs text-emerald-300/70 mb-1">You will receive (USDT)</p>
                    <p className="text-lg font-bold text-emerald-100">
                      {swapAmount ? formatUSD(Number(swapAmount)) : '0.00'} USDT
                    </p>
                    <p className="text-xs text-emerald-300/60">1:1 conversion rate</p>
                  </div>

                  <div>
                    <label className="text-xs text-emerald-300/70 mb-2 block">Amount to Swap (RUSD)</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={swapAmount}
                        onChange={(e) => setSwapAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-dark-900/60 border border-emerald-500/30 rounded-lg px-4 py-3 text-emerald-100 placeholder-emerald-300/30 focus:border-emerald-500/60 focus:outline-none"
                      />
                      <button
                        onClick={() => setSwapAmount(String(swapBalance.rusd))}
                        className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded text-xs text-emerald-300 hover:bg-emerald-500/30"
                      >
                        MAX
                      </button>
                    </div>
                  </div>
                </>
              )}

              <button
                onClick={handleSwap}
                disabled={!swapAmount || Number(swapAmount) <= 0 || swapLoading}
                className={`w-full py-3 ${
                  swapType === 'rama_to_rusd'
                    ? 'bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500'
                    : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500'
                } disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-all flex items-center justify-center gap-2`}
              >
                {swapLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Swapping...
                  </>
                ) : (
                  <>
                    <ArrowRightLeft size={16} />
                    Swap Now
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Progressive Transaction Modal */}
      <ProgressiveTransactionModal
        isOpen={showTxModal}
        onClose={() => setShowTxModal(false)}
        hash={hash}
        isConfirming={isConfirming}
        isConfirmed={isConfirmed}
        isError={isTxError}
        txType={txType}
      />

      {/* Income Routing Progressive Modal */}
      {showRoutingModal && routingModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="cyber-glass rounded-xl border border-violet-500/30 w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-violet-500/20 bg-dark-900/90">
              <h3 className="text-lg font-bold text-violet-300">Update Income Routing</h3>
              {(routingTxStep === 3 || routingTxStep === 4) && (
                <button
                  onClick={() => {
                    setShowRoutingModal(false);
                    setRoutingModalData(null);
                    setRoutingTxStep(0);
                  }}
                  className="p-2 rounded-full hover:bg-violet-500/10"
                >
                  <X size={18} className="text-violet-300" />
                </button>
              )}
            </div>
            
            <div className="p-5 space-y-4">
              {/* Routing Change Info */}
              <div className="cyber-glass rounded-lg border border-violet-500/20 p-4 bg-violet-500/5">
                <p className="text-xs text-violet-300/70 mb-2">Changing routing for:</p>
                <p className="text-lg font-bold text-violet-100">{routingModalData.label}</p>
                <div className="flex items-center gap-2 mt-3">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    routingModalData.from === 'safe' 
                      ? 'bg-cyan-500/20 text-cyan-300' 
                      : 'bg-violet-500/20 text-violet-300'
                  }`}>
                    {routingModalData.from === 'safe' ? 'Safe Wallet' : 'Swap Wallet'}
                  </span>
                  <ArrowRightLeft size={14} className="text-violet-400" />
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    routingModalData.to === 'safe' 
                      ? 'bg-cyan-500/20 text-cyan-300' 
                      : 'bg-violet-500/20 text-violet-300'
                  }`}>
                    {routingModalData.to === 'safe' ? 'Safe Wallet' : 'Swap Wallet'}
                  </span>
                </div>
              </div>

              {/* Progress Steps */}
              <div className="space-y-3">
                {/* Step 1: Signing */}
                <div className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                  routingTxStep === 1 
                    ? 'bg-violet-500/20 border border-violet-500/30' 
                    : routingTxStep > 1 
                      ? 'bg-emerald-500/10 border border-emerald-500/20' 
                      : 'bg-dark-900/30 border border-gray-700/30'
                }`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    routingTxStep === 1 
                      ? 'bg-violet-500' 
                      : routingTxStep > 1 
                        ? 'bg-emerald-500' 
                        : 'bg-gray-700'
                  }`}>
                    {routingTxStep === 1 ? (
                      <Loader2 size={16} className="animate-spin text-white" />
                    ) : routingTxStep > 1 ? (
                      <CheckCircle size={16} className="text-white" />
                    ) : (
                      <span className="text-xs text-gray-400">1</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${
                      routingTxStep >= 1 ? 'text-cyan-100' : 'text-gray-500'
                    }`}>
                      Confirm in Wallet
                    </p>
                    <p className="text-[10px] text-cyan-300/50">
                      {routingTxStep === 1 
                        ? 'Please sign the transaction in MetaMask...' 
                        : routingTxStep > 1 
                          ? 'Signature confirmed' 
                          : 'Waiting...'}
                    </p>
                  </div>
                </div>

                {/* Step 2: Confirming */}
                <div className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                  routingTxStep === 2 
                    ? 'bg-violet-500/20 border border-violet-500/30' 
                    : routingTxStep > 2 
                      ? 'bg-emerald-500/10 border border-emerald-500/20' 
                      : 'bg-dark-900/30 border border-gray-700/30'
                }`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    routingTxStep === 2 
                      ? 'bg-violet-500' 
                      : routingTxStep > 2 
                        ? 'bg-emerald-500' 
                        : 'bg-gray-700'
                  }`}>
                    {routingTxStep === 2 ? (
                      <Loader2 size={16} className="animate-spin text-white" />
                    ) : routingTxStep > 2 ? (
                      <CheckCircle size={16} className="text-white" />
                    ) : (
                      <span className="text-xs text-gray-400">2</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${
                      routingTxStep >= 2 ? 'text-cyan-100' : 'text-gray-500'
                    }`}>
                      Confirming on Blockchain
                    </p>
                    <p className="text-[10px] text-cyan-300/50">
                      {routingTxStep === 2 
                        ? 'Waiting for confirmation...' 
                        : routingTxStep > 2 
                          ? 'Transaction confirmed' 
                          : 'Pending...'}
                    </p>
                  </div>
                </div>

                {/* Step 3: Success or Error */}
                {routingTxStep === 3 && (
                  <div className="flex items-center gap-3 p-4 rounded-lg bg-emerald-500/20 border border-emerald-500/30">
                    <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center">
                      <CheckCircle size={20} className="text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-emerald-300">Routing Updated Successfully!</p>
                      <p className="text-xs text-emerald-200/70">
                        {routingModalData.label} will now go to {routingModalData.to === 'swap' ? 'Swap Wallet' : 'Safe Wallet'}
                      </p>
                    </div>
                  </div>
                )}

                {routingTxStep === 4 && (
                  <div className="flex items-center gap-3 p-4 rounded-lg bg-red-500/20 border border-red-500/30">
                    <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center">
                      <AlertCircle size={20} className="text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-red-300">Transaction Failed</p>
                      <p className="text-xs text-red-200/70">Please try again</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Close Button (only after completion) */}
              {(routingTxStep === 3 || routingTxStep === 4) && (
                <button
                  onClick={() => {
                    setShowRoutingModal(false);
                    setRoutingModalData(null);
                    setRoutingTxStep(0);
                  }}
                  className={`w-full py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                    routingTxStep === 3
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white'
                      : 'bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white'
                  }`}
                >
                  {routingTxStep === 3 ? 'Done' : 'Close'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
