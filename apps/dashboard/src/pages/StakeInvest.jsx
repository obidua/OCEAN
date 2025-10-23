import { useState, useEffect } from 'react';
import { Wallet, Zap, TrendingUp, AlertCircle, CheckCircle, HelpCircle, ChevronDown, ChevronUp, DollarSign, User, Users, Info, Clipboard } from 'lucide-react';
import { formatUSD } from '../utils/contractData';
import Tooltip from '../components/Tooltip';
import { useStore } from '../../store/useUserInfoStore';
import Swal from 'sweetalert2';
import { useAppKitAccount } from '@reown/appkit/react';
import { useBalance, useWaitForTransactionReceipt } from 'wagmi';
import { useTransaction } from "../../config/register";

export default function StakeInvest() {
  const [stakeType, setStakeType] = useState('self');
  const [useWallet, setUseWallet] = useState('external');
  const [beneficiaryAddress, setBeneficiaryAddress] = useState('');
  const [isValidatingAddress, setIsValidatingAddress] = useState(false);
  const [addressValidation, setAddressValidation] = useState(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [isStaking, setIsStaking] = useState(false);

  const [stakeAmount, setStakeAmount] = useState(10);
  const [ramaStake, SetramaStake] = useState('')
  const [walletBalance, setWalletBalance] = useState();
  const [safeWalletBalance, setSafeWalletBalance] = useState(0);
  const [ramaPrice, setRamaPrice] = useState(0)




  const tier = parseFloat(stakeAmount) >= 5001 ? 2 : 1;
  const dailyRate = tier === 2 ? 0.40 : 0.33;
  const projectedDaily = parseFloat(stakeAmount) * (dailyRate / 100);
  const projectedMonthly = projectedDaily * 30;

  const boosterDailyRate = tier === 2 ? 0.80 : 0.66;
  const boosterProjectedDaily = parseFloat(stakeAmount) * (boosterDailyRate / 100);

  const selectedWalletBalance = useWallet === 'external' ? walletBalance : safeWalletBalance;
  const selectedWalletBalanceUSD = selectedWalletBalance * ramaPrice;
  const isSufficientBalance = parseFloat(stakeAmount) > 0 && selectedWalletBalanceUSD >= parseFloat(stakeAmount);
  const isMinimumMet = parseFloat(stakeAmount) >= 10;

  const canStake = stakeAmount < 10 && isSufficientBalance;

  const quickAmounts = [10, 50, 100, 500, 1000, 5000];

  useEffect(() => {
    if (stakeType === 'other' && beneficiaryAddress.trim().length > 10) {
      setIsValidatingAddress(true);

      const timer = setTimeout(() => {
        const isValidFormat = /^(0x[a-fA-F0-9]{40}|[A-Z0-9]{8,12})$/i.test(beneficiaryAddress.trim());

        if (isValidFormat) {
          setAddressValidation({
            isValid: true,
            message: 'Valid address',
            userId: beneficiaryAddress.startsWith('0x') ? null : beneficiaryAddress
          });
        } else {
          setAddressValidation({
            isValid: false,
            message: 'Invalid address or user ID format'
          });
        }
        setIsValidatingAddress(false);
      }, 800);

      return () => clearTimeout(timer);
    } else if (stakeType === 'other' && beneficiaryAddress.trim().length > 0) {
      setAddressValidation(null);
    }
  }, [beneficiaryAddress, stakeType]);

  const handleQuickAmount = (amount) => {
    setStakeAmount(amount.toString());
  };

  const handlePasteAddress = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setBeneficiaryAddress(text.trim());
    } catch (err) {
      console.error('Failed to read clipboard:', err);
    }
  };



  //  =================================================================
  //  Invest In PortFolio
  // ==================================================================
  const userAddress = localStorage.getItem("userAddress") || null;



  const CreateSelfPort = useStore((s) => s.CreateSelfPort);
  const CreateOtherfPort = useStore((s) => s.CreateOtherfPort);
  const SafeSelfPort = useStore((s) => s.SafeSelfPort);
  const SafeOtherPort = useStore((s) => s.SafeOtherPort);



  const GetchStakeInvest = useStore((s) => s.GetchStakeInvest);
  const usdToRama = useStore((s) => s.usdToRama);
  const RamaTOUsd = useStore((s) => s.RamaTOUsd);


  const GetUsdToRama = async (amt) => {
    try {
      const res = await usdToRama(amt);
      console.log(res)
      SetramaStake(res);
    } catch (error) {
      console.log(error)
    }
  }

  const GetRamaToUsd = async () => {
    try {
      const res = await RamaTOUsd(1);
      console.log(res)
      setRamaPrice(res)
    } catch (error) {
      console.log(error)
    }
  }

  useEffect(() => {
    GetRamaToUsd()
  }, [])


  useEffect(() => {
    if (stakeAmount !== '0') {
      GetUsdToRama(stakeAmount);
    }
  }, [stakeAmount])


  const { address, isConnected } = useAppKitAccount();

  const [error, setError] = useState('');
  const [trxData, setTrxData] = useState();
  const [trxHash, setTrxHash] = useState();




  const { handleSendTx, hash } = useTransaction(trxData !== null && trxData);
  useEffect(() => {
    if (trxData) {
      try {
        handleSendTx(trxData);
      } catch (error) {
        alert("somthing went Wrong");
      }
    }
  }, [trxData]);

  useEffect(() => {
    if (hash) {
      setTrxHash(hash)
    }
  }, [hash]);



  const { data: receipt, isLoading: progress, isSuccess, isError } =
    useWaitForTransactionReceipt({
      hash,
      confirmations: 1,
    });


  useEffect(() => {
    if (isSuccess && receipt?.status === "success") {

      Swal.fire({
        icon: "success",
        title: "Stack Successful",
        html: `
          <div style="text-align:left">
            <p style="margin:0 0 8px 0">Your Stack has been confirmed</p>
          </div>
        `,
      });
    }
    else if (isError || receipt?.status === "reverted") {
      Swal.fire({
        icon: "error",
        title: "Transaction Failed",
        text: "Your transaction failed or was reverted."
      });
    }
  }, [isSuccess, isError, receipt, address]);



  const CreateNewPortFolio = async () => {
    setIsStaking(true)
    setError('');

    try {

      let response;

      console.log(stakeType, useWallet)

      if (stakeType === 'self' && useWallet === 'external') {
        response = await CreateSelfPort(address, stakeAmount);
      }
      if (stakeType === 'other' && useWallet === 'external') {
        response = await CreateOtherfPort(address, beneficiaryAddress, stakeAmount);
      }
      if (stakeType === 'self' && useWallet === 'safe') {
        response = await SafeSelfPort(address, stakeAmount);
      }
      if (stakeType === 'other' && useWallet === 'safe') {
        response = await SafeOtherPort(address, beneficiaryAddress, stakeAmount);
      }

      if (response) {
        setTrxData(response); // ✅ this triggers the useEffect
      } else {
        Swal.fire({
          icon: "error",
          title: "Transaction Error",
          text: "Unable to build registration transaction." + trxHash,
          confirmButtonText: "OK",
        });
      }

      setIsStaking(false)
    } catch (error) {
      setIsStaking(false)
      console.error('setIStaking failed:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsStaking(false);
    }
  };


  const fetchStakeInvest = async () => {
    try {
      if (!userAddress) {
        return
      }
      const res = await GetchStakeInvest(userAddress);
      console.log(res);
      setSafeWalletBalance(res)
    } catch (error) {
      console.log(error)
    }
  }


  const { refetch } = useBalance({
    address: userAddress
  });

  useEffect(() => {
    const fetchedBalance = async () => {
      try {
        const balance = await refetch()
        setWalletBalance((Number(balance?.data?.value) / 1e18).toFixed(5) + " " + balance?.data?.symbol.toString())

      } catch (error) {
        console.log(error)
      }
    }

    fetchedBalance();

  }, [address, isSuccess, isError, receipt])


  useEffect(() => {
    fetchStakeInvest()
  }, [])



  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      <div>
        <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-neon-green relative inline-block">
          Stake & Invest
          <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 to-neon-green/20 blur-xl -z-10" />
        </h1>
        <p className="text-cyan-300/90 mt-1">Activate or top-up your portfolio</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="cyber-glass rounded-2xl p-4 sm:p-6 border border-cyan-500/30 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
            <h2 className="text-lg font-semibold text-cyan-300 mb-4 uppercase tracking-wide">New Stake</h2>

            <div className="space-y-5">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-cyan-400 uppercase tracking-wide">
                    Stake Amount
                  </label>
                  <Tooltip content="Minimum $10 to activate. Tier 2 benefits start at $5,010">
                    <HelpCircle size={16} className="text-cyan-400/60 cursor-help" />
                  </Tooltip>
                </div>

                <div className="relative">
                  <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-400/60" size={20} />
                  <input
                    type="number"
                    inputMode="decimal"
                    min="10"
                    step="any"
                    value={stakeAmount}
                    onChange={(e) => {
                      // keep as string to avoid cursor jumps
                      const v = e.target.value;

                      // empty is allowed so users can type
                      if (v === "") return setStakeAmount("");

                      // clamp to >= 0
                      const n = Number(v);
                      setStakeAmount(Number.isFinite(n) && n >= 0 ? v : "0");
                    }}
                    onKeyDown={(e) => {
                      // block scientific notation & signs
                      if (["e", "E", "+", "-"].includes(e.key)) e.preventDefault();
                    }}
                    placeholder="0.00"
                    className="w-full pl-12 pr-4 py-3 sm:py-4 bg-dark-900/50 border border-cyan-500/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-cyan-300 placeholder-cyan-400/30 transition-all text-lg"
                  />
                </div>

                <div className="flex flex-wrap gap-2 mt-3">
                  {quickAmounts.map((amount) => (
                    <button
                      key={amount}
                      onClick={() => handleQuickAmount(amount)}
                      className="px-3 py-1.5 text-xs sm:text-sm cyber-glass border border-cyan-500/20 hover:border-cyan-500/50 rounded-lg text-cyan-300 transition-all hover:bg-cyan-500/10"
                    >
                      ${amount.toLocaleString()}
                    </button>
                  ))}
                </div>

                {stakeAmount > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-sm text-neon-green flex items-center gap-2">
                      <CheckCircle size={16} />
                      ≈ {ramaStake} RAMA
                    </p>
                    <div className="flex items-center gap-2">
                      <div className={`px-3 py-1 rounded-full text-xs font-bold ${tier === 2
                        ? 'bg-gradient-to-r from-neon-green to-cyan-500 text-dark-950'
                        : 'bg-gradient-to-r from-cyan-500 to-cyan-600 text-dark-950'
                        }`}>
                        TIER {tier}
                      </div>
                      <span className="text-xs text-cyan-300/90">
                        {dailyRate}% Daily Rate
                      </span>
                    </div>
                  </div>
                )}

                {stakeAmount > 0 && !isMinimumMet && (
                  <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2">
                    <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5" size={16} />
                    <p className="text-sm text-red-300">
                      Minimum stake is $10. You need ${(10 - stakeAmount).toFixed(2)} more.
                    </p>
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <label className="block text-sm font-medium text-cyan-400 uppercase tracking-wide">
                    Stake For
                  </label>
                  <Tooltip content="Choose whether to stake for yourself or another user">
                    <HelpCircle size={16} className="text-cyan-400/60 cursor-help" />
                  </Tooltip>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setStakeType('self')}
                    className={`p-3 sm:p-4 rounded-lg border-2 transition-all ${stakeType === 'self'
                      ? 'border-cyan-500 bg-cyan-500/10'
                      : 'border-cyan-500/20 hover:border-cyan-500/40 bg-dark-900/30'
                      }`}
                  >
                    <User className={`mx-auto mb-2 ${stakeType === 'self' ? 'text-cyan-400' : 'text-cyan-400/50'}`} size={24} />
                    <p className="text-sm font-medium text-cyan-300">Self</p>
                  </button>
                  <button
                    onClick={() => setStakeType('other')}
                    className={`p-3 sm:p-4 rounded-lg border-2 transition-all ${stakeType === 'other'
                      ? 'border-neon-green bg-neon-green/10'
                      : 'border-neon-green/20 hover:border-neon-green/40 bg-dark-900/30'
                      }`}
                  >
                    <Users className={`mx-auto mb-2 ${stakeType === 'other' ? 'text-neon-green' : 'text-neon-green/50'}`} size={24} />
                    <p className="text-sm font-medium text-neon-green">Other User</p>
                  </button>
                </div>
              </div>

              {stakeType === 'other' && (
                <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                  <label className="block text-sm font-medium text-cyan-400 mb-2 uppercase tracking-wide">
                    Beneficiary Address or User ID
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={beneficiaryAddress}
                      onChange={(e) => setBeneficiaryAddress(e.target.value)}
                      placeholder="0x... or USER123456"
                      className={`w-full pl-4 pr-24 py-3 bg-dark-900/50 border rounded-lg focus:outline-none focus:ring-2 text-cyan-300 placeholder-cyan-400/30 font-mono transition-all ${addressValidation?.isValid
                        ? 'border-neon-green/50 focus:ring-neon-green'
                        : addressValidation?.isValid === false
                          ? 'border-red-500/50 focus:ring-red-500'
                          : 'border-cyan-500/30 focus:ring-cyan-500'
                        }`}
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                      {isValidatingAddress && (
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-cyan-500 border-t-transparent"></div>
                      )}
                      <button
                        type="button"
                        onClick={handlePasteAddress}
                        className="p-2 hover:bg-cyan-500/10 rounded-lg transition-colors group"
                        title="Paste from clipboard"
                      >
                        <Clipboard size={16} className="text-cyan-400/60 group-hover:text-cyan-400 transition-colors" />
                      </button>
                    </div>
                  </div>

                  {addressValidation && (
                    <div className={`mt-2 p-2 rounded-lg flex items-center gap-2 text-sm ${addressValidation.isValid
                      ? 'bg-neon-green/10 text-neon-green'
                      : 'bg-red-500/10 text-red-300'
                      }`}>
                      {addressValidation.isValid ? (
                        <CheckCircle size={16} />
                      ) : (
                        <AlertCircle size={16} />
                      )}
                      <span>{addressValidation.message}</span>
                      {addressValidation.userId && (
                        <span className="text-xs opacity-75">(User ID: {addressValidation.userId})</span>
                      )}
                    </div>
                  )}

                  <p className="text-xs text-cyan-300/70 mt-2">
                    Enter wallet address (0x...) or user ID to stake on behalf of another user
                  </p>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-cyan-400 uppercase tracking-wide">
                    Funding Source
                  </label>
                  <Tooltip content="Choose which wallet to use for funding your stake">
                    <HelpCircle size={16} className="text-cyan-400/60 cursor-help" />
                  </Tooltip>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <button
                    onClick={() => setUseWallet('external')}
                    className={`p-4 rounded-lg border-2 transition-all ${useWallet === 'external'
                      ? 'border-cyan-500 bg-cyan-500/10'
                      : 'border-cyan-500/20 hover:border-cyan-500/40 bg-dark-900/30'
                      }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <Wallet className={useWallet === 'external' ? 'text-cyan-400' : 'text-cyan-400/50'} size={24} />
                      <p className="text-sm font-medium text-cyan-300">Connected Wallet</p>
                    </div>
                    <div className="text-left space-y-1">
                      <p className="text-lg font-bold text-cyan-300">{walletBalance}</p>
                    </div>
                  </button>

                  <button
                    onClick={() => setUseWallet('safe')}
                    className={`p-4 rounded-lg border-2 transition-all ${useWallet === 'safe'
                      ? 'border-neon-green bg-neon-green/10'
                      : 'border-neon-green/20 hover:border-neon-green/40 bg-dark-900/30'
                      }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <Wallet className={useWallet === 'safe' ? 'text-neon-green' : 'text-neon-green/50'} size={24} />
                      <p className="text-sm font-medium text-neon-green">Safe Wallet</p>
                    </div>
                    <div className="text-left space-y-1">
                      <p className="text-lg font-bold text-neon-green">{safeWalletBalance.toFixed(2)} RAMA</p>
                    </div>
                  </button>
                </div>

                {stakeAmount < 0 && !isSufficientBalance && (
                  <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2">
                    <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5" size={16} />
                    <div className="flex-1">
                      <p className="text-sm text-red-300 font-medium">Insufficient Balance</p>
                      <p className="text-xs text-red-300/80 mt-1">
                        You need ${stakeAmount.toFixed(2)} but only have ${selectedWalletBalanceUSD.toFixed(2)} in selected wallet.
                        {useWallet === 'external' && safeWalletBalance * ramaPrice >= stakeAmount && (
                          <span className="block mt-1 text-neon-green">Try using Safe Wallet instead.</span>
                        )}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={CreateNewPortFolio}
                disabled={isStaking || !isConnected}
                className={`w-full cursor-pointer py-4 rounded-lg bg-cyan-900 font-bold uppercase tracking-wide transition-all relative overflow-hidden group ${canStake && !isStaking
                  ? 'bg-gradient-to-r from-cyan-500 to-cyan-800 text-dark-950 hover:shadow-neon-cyan hover:scale-[1.02] cursor-pointer'
                  : 's bg-gradient-to-r from-cyan-500 to-cyan-800 text-cyan-400/40'
                  }`}
              >
                {!canStake && !isStaking && (
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-cyan-800 opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
                {isConnected ? (
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {isStaking ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-dark-950 border-t-transparent"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        Stake Now {stakeAmount > 0 && `$ ${stakeAmount}`}
                      </>
                    )}
                  </span>
                ):(
                  <>
                    Connect Wallet
                  </>
                )}
              </button>

              {!canStake && stakeAmount < 0 && (
                <div className="text-xs text-cyan-300/70 text-center space-y-1">
                  {!isMinimumMet && <p>• Minimum stake: $10</p>}
                  {!isSufficientBalance && <p>• Insufficient balance in selected wallet</p>}
                  {stakeType === 'other' && !addressValidation?.isValid && <p>• Valid beneficiary address required</p>}
                </div>
              )}
            </div>
          </div>

          <div className="cyber-glass rounded-2xl border border-cyan-500/30 relative overflow-hidden">
            <button
              onClick={() => setShowInstructions(!showInstructions)}
              className="w-full p-4 sm:p-6 flex items-center justify-between hover:bg-cyan-500/5 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Info size={20} className="text-cyan-400" />
                <h2 className="text-lg font-semibold text-cyan-300 uppercase tracking-wide">How to Stake</h2>
              </div>
              {showInstructions ? (
                <ChevronUp size={20} className="text-cyan-400" />
              ) : (
                <ChevronDown size={20} className="text-cyan-400" />
              )}
            </button>

            {showInstructions && (
              <div className="px-4 sm:px-6 pb-6 space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="p-4 cyber-glass border border-cyan-500/20 rounded-lg">
                    <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-neon-green rounded-lg flex items-center justify-center mb-3">
                      <span className="text-dark-950 font-bold">1</span>
                    </div>
                    <h4 className="font-semibold text-cyan-300 mb-2">Enter Amount</h4>
                    <p className="text-sm text-cyan-300/80">
                      Enter your desired stake amount in USD (minimum $10). Use quick buttons for common amounts.
                    </p>
                  </div>

                  <div className="p-4 cyber-glass border border-cyan-500/20 rounded-lg">
                    <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-neon-green rounded-lg flex items-center justify-center mb-3">
                      <span className="text-dark-950 font-bold">2</span>
                    </div>
                    <h4 className="font-semibold text-cyan-300 mb-2">Choose Recipient</h4>
                    <p className="text-sm text-cyan-300/80">
                      Select whether to stake for yourself or enter another user's wallet address or ID.
                    </p>
                  </div>

                  <div className="p-4 cyber-glass border border-cyan-500/20 rounded-lg">
                    <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-neon-green rounded-lg flex items-center justify-center mb-3">
                      <span className="text-dark-950 font-bold">3</span>
                    </div>
                    <h4 className="font-semibold text-cyan-300 mb-2">Select Funding Source</h4>
                    <p className="text-sm text-cyan-300/80">
                      Choose between Connected Wallet or Safe Wallet. Ensure sufficient balance is available.
                    </p>
                  </div>

                  <div className="p-4 cyber-glass border border-cyan-500/20 rounded-lg">
                    <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-neon-green rounded-lg flex items-center justify-center mb-3">
                      <span className="text-dark-950 font-bold">4</span>
                    </div>
                    <h4 className="font-semibold text-cyan-300 mb-2">Confirm Stake</h4>
                    <p className="text-sm text-cyan-300/80">
                      Review all details and click "Stake Now" to confirm your transaction.
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
                  <h4 className="font-semibold text-cyan-300 mb-2 flex items-center gap-2">
                    <AlertCircle size={16} />
                    Important Notes
                  </h4>
                  <ul className="space-y-1 text-sm text-cyan-300/90">
                    <li>• Minimum stake amount is $10 for portfolio activation</li>
                    <li>• Tier 2 benefits (0.40% daily) unlock at $5,010+</li>
                    <li>• Staking for others requires valid wallet address or user ID</li>
                    <li>• Safe Wallet has no withdrawal fees or commission charges</li>
                    <li>• Connected Wallet requires sufficient blockchain network fees</li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          <div className="cyber-glass rounded-2xl p-4 sm:p-6 border border-cyan-500/30 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
            <h2 className="text-lg font-semibold text-cyan-300 mb-4 uppercase tracking-wide">Investment Tiers</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="p-4 cyber-glass rounded-xl border-2 border-cyan-500/50 hover:shadow-neon-cyan transition-all group">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-bold text-cyan-300 uppercase tracking-wide">Tier 1</span>
                  <span className="px-2 py-1 bg-gradient-to-r from-cyan-500 to-cyan-600 text-dark-950 text-xs rounded-full font-bold">0.33%</span>
                </div>
                <p className="text-xs text-cyan-300/90 mb-2">$10 - $5,000</p>
                <p className="text-sm text-cyan-300 font-medium">0.33% Daily Growth</p>
                <p className="text-xs text-cyan-300/90 mt-1">~10% Monthly | 200% Cap</p>
                <p className="text-xs text-neon-orange mt-2">Booster: 0.66% | 250% Cap</p>
              </div>

              <div className="p-4 cyber-glass rounded-xl border-2 border-neon-green/50 hover:shadow-neon-green transition-all group">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-bold text-neon-green uppercase tracking-wide">Tier 2</span>
                  <span className="px-2 py-1 bg-gradient-to-r from-neon-green to-cyan-500 text-dark-950 text-xs rounded-full font-bold">0.40%</span>
                </div>
                <p className="text-xs text-neon-green/70 mb-2">$5,010 and above</p>
                <p className="text-sm text-neon-green font-medium">0.40% Daily Growth</p>
                <p className="text-xs text-neon-green/70 mt-1">~12% Monthly | 200% Cap</p>
                <p className="text-xs text-neon-orange mt-2">Booster: 0.80% | 250% Cap</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="cyber-glass border border-neon-orange/50 rounded-2xl p-4 sm:p-6 text-white relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-neon-orange/10 to-neon-pink/10 opacity-50 group-hover:opacity-70 transition-opacity" />
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-neon-orange/70 to-transparent" />
            <div className="flex items-center gap-2 mb-4 relative z-10">
              <Zap size={24} className="text-neon-orange animate-pulse" />
              <h3 className="font-bold text-lg uppercase tracking-wide text-neon-orange">Booster Mode</h3>
            </div>
            <p className="text-sm text-cyan-300 mb-4 relative z-10">
              Unlock higher rates with 5+ directs within 10 days of activation
            </p>
            <div className="space-y-2 mb-4 relative z-10">
              <div className="flex items-center gap-2">
                <CheckCircle size={16} className="text-neon-green flex-shrink-0" />
                <span className="text-sm text-cyan-300">5+ Direct Activations</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle size={16} className="text-neon-green flex-shrink-0" />
                <span className="text-sm text-cyan-300">Total Direct Business ≥ Your Portfolio</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle size={16} className="text-neon-green flex-shrink-0" />
                <span className="text-sm text-cyan-300">Each Direct ≥ Your Portfolio Value</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertCircle size={16} className="text-neon-orange flex-shrink-0" />
                <span className="text-sm text-neon-orange">All within 10 days</span>
              </div>
            </div>
            <div className="cyber-glass border border-neon-orange/30 rounded-lg p-3 relative z-10">
              <p className="text-xs text-neon-orange mb-1 uppercase tracking-wide">Booster Rates</p>
              <p className="font-bold text-cyan-300">Tier 1: 0.66% | Tier 2: 0.80%</p>
              <p className="text-xs mt-1 text-neon-green">250% Cap (Booster)</p>
            </div>
          </div>

          {stakeAmount >= 10 && (
            <div className="cyber-glass rounded-2xl p-4 sm:p-6 border border-cyan-500/30 relative overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
              <h3 className="font-semibold text-cyan-300 mb-4 uppercase tracking-wide">Projected Earnings</h3>
              <div className="space-y-3">
                <div className="p-3 cyber-glass border border-cyan-500/20 rounded-lg">
                  <p className="text-xs text-cyan-300/90 mb-1 uppercase tracking-wide">Normal Mode (Daily)</p>
                  <p className="text-xl font-bold text-cyan-300">{formatUSD(projectedDaily)}</p>
                </div>
                <div className="p-3 cyber-glass border border-neon-green/20 rounded-lg">
                  <p className="text-xs text-cyan-300/90 mb-1 uppercase tracking-wide">Normal Mode (Monthly)</p>
                  <p className="text-xl font-bold text-neon-green">{formatUSD(projectedMonthly)}</p>
                </div>
                <div className="p-3 cyber-glass border border-neon-orange/20 rounded-lg">
                  <p className="text-xs text-cyan-300/90 mb-1 uppercase tracking-wide">Booster Mode (Daily)</p>
                  <p className="text-xl font-bold text-neon-orange">{formatUSD(boosterProjectedDaily)}</p>
                </div>
              </div>
            </div>
          )}

          {stakeAmount < 0 && (
            <div className="cyber-glass border border-red-500/50 rounded-xl p-4 flex gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <AlertCircle className="text-red-400 flex-shrink-0 animate-pulse" size={20} />
              <div>
                <p className="text-sm font-medium text-red-300 uppercase tracking-wide">Minimum Stake Required</p>
                <p className="text-xs text-red-400/70 mt-1">
                  The minimum activation amount is $10
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Sticky Bottom Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 cyber-glass border-t border-cyan-500/30 backdrop-blur-xl z-50">
        <button
          onClick={CreateNewPortFolio}
          disabled={!canStake || isStaking}
          className={`w-full py-4 rounded-lg font-bold uppercase tracking-wide transition-all relative overflow-hidden ${canStake && !isStaking
            ? 'bg-gradient-to-r from-cyan-500 to-neon-green text-dark-950'
            : 'bg-dark-700/50 text-cyan-400/40 cursor-not-allowed'
            }`}
        >
          <span className="relative z-10 flex items-center justify-center gap-2">
            {isStaking ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-dark-950 border-t-transparent"></div>
                Processing...
              </>
            ) : (
              <>
                Stake {stakeAmount > 0 && `${formatUSD(stakeAmount * 1e8)}`}
              </>
            )}
          </span>
        </button>
      </div>
    </div>
  );
}