import { Settings as SettingsIcon, AlertCircle, Clock, Lock, Copy, ExternalLink, Settings as SettingIcon } from 'lucide-react';
import { formatUSD } from '../utils/contractData';
import { useStore } from '../../store/useUserInfoStore';
import { useEffect, useMemo, useState } from 'react';
import { useAppKitAccount } from '@reown/appkit/react';
import { useTransaction } from '../../config/register';
import { useWaitForTransactionReceipt } from 'wagmi';
import toast from '../utils/toast';
import SoundControls from '../components/SoundControls';
import { enableAudio } from '../utils/toast';

const formatAddressPreview = (address, lead = 10, tail = 8) => {
  if (!address) return '—';
  if (address.length <= lead + tail) return address;
  return `${address.slice(0, lead)}...${address.slice(-tail)}`;
};

const normalizePrincipalUsd = (detail) => {
  if (!detail) return null;

  const floatCandidates = [
    detail.principalUsd,
    detail.principalUsdFloat,
  ];
  for (const candidate of floatCandidates) {
    const value = Number(candidate);
    if (Number.isFinite(value)) return value;
  }

  const displayCandidates = [detail.principalUsdDisplay];
  for (const candidate of displayCandidates) {
    const value = Number(candidate);
    if (Number.isFinite(value)) return value;
  }

  const microCandidates = [
    detail.principalUsdMicro,
    detail.principalUSD,
    detail.principalUsdRaw,
  ];
  for (const candidate of microCandidates) {
    const value = Number(candidate);
    if (Number.isFinite(value)) return value / 1e6;
  }

  return null;
};

export default function Settings() {
  const userAddress = localStorage.getItem("userAddress") || null;
  const referralLink = userAddress
    ? `https://oceandefi.uk/signup?ref=${userAddress}`
    : null;

  // Sound system state
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [audioInitialized, setAudioInitialized] = useState(false);

  // Load sound settings on component mount
  useEffect(() => {
    const savedSoundEnabled = localStorage.getItem('soundEnabled');
    if (savedSoundEnabled !== null) {
      setSoundEnabled(savedSoundEnabled === 'true');
    }
  }, []);

  // Initialize audio for mobile/PWA
  const initializeAudio = async () => {
    try {
      const success = await enableAudio();
      setAudioInitialized(success);
      if (success) {
        // console.log('Audio system initialized for mobile/PWA');
        // Play a welcome sound if available
        if (window.financialSounds && soundEnabled) {
          window.financialSounds.playCoinDrop(1);
        }
      }
    } catch (error) {
      console.warn('Failed to initialize audio:', error);
    }
  };

  const copyToClipboard = (text, label) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    alert(`${label} copied to clipboard!`);
  };


  // =====================================================================
  // Get the Total PortFolio Detail
  // =====================================================================
  const [portfolioIds, setPortFolioIds] = useState([]);
  const [portFolioDetails, setFortFolioDetails] = useState();
  const [selectedPid, setSelectedPid] = useState();

  const portFolioManagerAddress = useStore((s) => s.PortFolioManagerAddress);
  const getTOtalPortFolio = useStore((s) => s.getTOtalPortFolio);
  const getPortFoliById = useStore((s) => s.getPortFoliById);
  const withdrawPortFolio = useStore((s) => s.withdrawPortFolio);
  const cancelExitPortFolio = useStore((s) => s.cancelExitPortFolio);

  const oceanContractAddress = portFolioManagerAddress ?? '';

  const {
    sponsorAddress,
    freezeEndsAt,
    isFrozen,
    principalUsdDisplay,
  } = useMemo(() => {
    const freezeRaw = Number(
      portFolioDetails?.frozenUntil ?? portFolioDetails?.freezeEndsAt ?? 0
    );

    const sponsor =
      portFolioDetails?.sponsor ??
      portFolioDetails?.upline ??
      portFolioDetails?.referrer ??
      '';

    const principalUsdValue = normalizePrincipalUsd(portFolioDetails);

    return {
      sponsorAddress: sponsor,
      freezeEndsAt: freezeRaw,
      isFrozen: freezeRaw > Date.now() / 1000,
      principalUsdDisplay:
        principalUsdValue != null && Number.isFinite(principalUsdValue)
          ? formatUSD(principalUsdValue)
          : null,
    };
  }, [portFolioDetails]);

  const contractDisplay = formatAddressPreview(oceanContractAddress);
  const sponsorDisplay = formatAddressPreview(sponsorAddress);
  const referralDisplay =
    referralLink && referralLink.length > 38
      ? `${referralLink.slice(0, 35)}...`
      : referralLink ?? '—';
  const explorerHref = oceanContractAddress
    ? `https://ramascan.com/address/${oceanContractAddress}`
    : null;




  const getAllPortFolio = async () => {
    try {
      if (!userAddress) return;

      const res = await getTOtalPortFolio(userAddress);

      // console.log(res?.ProtFolioDetail)
      // normalize to strings (handles numbers, BigInt, BN, etc.)
      const idList = (res?.ArrPortfolio ?? []).map((pid) => String(pid));

      setPortFolioIds(idList);
      setFortFolioDetails(res?.ProtFolioDetail);

      // set default selection if available
      if (idList.length > 0) setSelectedPid(idList[0]); // <-- ids[0] bug fixed
    } catch (error) {
      console.log(error);
    }
  };


  useEffect(() => {
    getAllPortFolio();
  }, [])

  const GetPortFolioById = async () => {
    try {
      if (!selectedPid) return;         // <-- robust check
      const res = await getPortFoliById(selectedPid); // pass string id
      setFortFolioDetails(res);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    if (selectedPid) {
      GetPortFolioById();
    }
  }, [selectedPid]);



  // =====================================================================
  // Withdraw PortFolio
  // =====================================================================
  const { address, isConnected } = useAppKitAccount();
  const [trxData, setTrxData] = useState();
  const [trxHash, setTrxHash] = useState();
  const [isSubmitting, setIsSubmitting] = useState(false);



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
      const txUrl = `https://ramascan.com/tx/${receipt?.transactionHash}`;
      const addrUrl = `https://ramascan.com/address/${address}`;


      getAllPortFolio()

      toast.success('Your transaction has been confirmed', 'Transaction Successful');

     
    }
    else if (isError || receipt?.status === "reverted") {
      toast.error('Your transaction failed or was reverted.', 'Transaction Failed');
    }
  }, [isSuccess, isError, receipt, address]);


  const handleWIdthdraw = async () => {
    setIsSubmitting(true)

    try {

      // cancelExitPortFolio
      const response = await withdrawPortFolio(address, selectedPid);

      if (response) {
        setTrxData(response); // ✅ this triggers the useEffect
      } else {
        toast.error('Unable to build registration transaction: ' + trxHash, 'Transaction Error');
      }

    } catch (error) {
      console.error('Registration failed:', error);
      setIsSubmitting(false);
    } finally {
      setIsSubmitting(false);
    }
  };


  const CancelWithDrawal = async () => {
    setIsSubmitting(true)

    try {

      // cancelExitPortFolio
      const response = await cancelExitPortFolio(address, selectedPid);

      if (response) {
        setTrxData(response); // ✅ this triggers the useEffect
      } else {
        toast.error('Unable to build registration transaction: ' + trxHash, 'Transaction Error');
      }

    } catch (error) {
      console.error('Registration failed:', error);
      setIsSubmitting(false);
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <div className="space-y-6">
      <div>

        <div className='flex items-center space-x-3'>
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-neon-green relative inline-block">
          Settings & Information
          <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 to-neon-green/20 blur-xl -z-10" />
        </h1>

          <SettingIcon
            size={20}
            className="text-white"
          />
          </div>
        <p className="text-cyan-300/90 mt-1">Platform rules and withdrawal management</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="cyber-glass rounded-2xl p-6 border border-cyan-500/30 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
            <h2 className="text-lg font-semibold text-cyan-300 mb-4 uppercase tracking-wide">Principal Withdrawal</h2>

            {!isFrozen ? (
              <>
                <div className="cyber-glass border border-cyan-500/30 rounded-lg p-4 mb-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="text-cyan-400 flex-shrink-0 mt-0.5" size={20} />
                    <div>
                      <p className="text-sm font-medium text-cyan-300 mb-2 uppercase tracking-wide">0% Trust Policy - Withdrawal Anytime</p>
                      <ul className="text-xs text-cyan-400/80 space-y-1">
                        <li>✓ Request withdrawal anytime (complete freedom)</li>
                        <li>⏱ 72-hour freeze period (no income during freeze)</li>
                        <li>✓ Cancel within 72 hours to resume earning</li>
                        <li>⚠ Only lose income during freeze period if cancelled</li>
                        <li>💰 After 72 hours: 80% refund (20% exit fee)</li>
                        <li>📉 Closed portfolio removes business from uplines</li>
                      </ul>
                      <p className="text-xs text-neon-green italic mt-3 font-medium">"Withdraw anytime with 20% fee after 72h freeze — or cancel to keep earning."</p>
                    </div>
                  </div>
                </div>


                {/* ================================================================================================================= */}
                <div className="relative my-4">
                  <select
                    value={selectedPid ?? ''}
                    onChange={(e) => setSelectedPid(e.target.value)}
                    className="
                      peer w-full sm:w-56 appearance-none pr-10 pl-3 py-2 rounded-lg
                      bg-dark-900/60 text-cyan-200 border border-cyan-500/30
                      focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-400
                      transition-all cyber-glass
                    "
                  >
                    {portfolioIds.length === 0 && <option value="">No portfolios</option>}
                    {portfolioIds?.map((pid) => (
                      <option key={pid} value={pid}>
                        {pid}
                      </option>
                    ))}
                  </select>

                  {/* Chevron */}
                  <svg
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 opacity-70"
                    width="18" height="18" viewBox="0 0 24 24" fill="none"
                  >
                    <path d="M7 10l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>

                {/* ============================================================================================================== */}

                {/* Portfolio Summary */}
                {portFolioDetails && (
                  <div className="my-4 rounded-2xl bg-slate-900/60 border border-cyan-500/30 p-5 shadow-lg backdrop-blur">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-cyan-200 font-semibold">Portfolio Summary</h3>

                      {/* optional: a compact PID badge */}
                      <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs">
                        PID
                        <span className="font-mono font-bold text-cyan-200">
                          {portFolioDetails?.pid != null ? String(portFolioDetails.pid) : '—'}
                        </span>
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Principal (USD) */}
                      <div className="rounded-xl bg-slate-900/70 border border-cyan-500/20 p-4">
                        <p className="text-[11px] uppercase tracking-wide text-cyan-300/70 mb-1">
                          Principal (USD)
                        </p>

                        {principalUsdDisplay ? (
                          <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-emerald-300">
                              {principalUsdDisplay}
                            </span>
                          </div>
                        ) : (
                          <div className="h-7 w-36 rounded bg-cyan-500/20 animate-pulse" />
                        )}
                      </div>
                    </div>

                    {/* Optional footnote */}
                    <p className="mt-3 text-xs text-cyan-300/70">
                      Note: Amount will be freeze for 72 hours . withi 72 hours your can cancel the transaction after that you cannot do anythings
                    </p>
                  </div>
                )}




                <button disabled={isSubmitting || !isConnected} onClick={() => portFolioDetails?.active ? handleWIdthdraw() : CancelWithDrawal()} className={`w-full py-4 ${!isConnected ? 'bg-gradient-to-r from-red-300 to-red-400' : 'bg-gradient-to-r from-red-500 to-red-600 cursor-pointer'}  text-white rounded-lg font-bold hover:shadow-lg transition-all hover:scale-[1.02] uppercase tracking-wide border border-red-500/30  `}>
                  {isSubmitting ? (
                    <p>Processing...</p>
                  ) :
                    !isConnected ? "Connect Your Wallet" : (portFolioDetails?.active ? "Request Principal Withdrawal" : "Cancel Exit PortFolio")
                  }
                </button>
              </>
            ) : (
              <>
                <div className="bg-rose-50 border border-rose-200 rounded-lg p-6 mb-4">
                  <div className="flex items-center gap-3 mb-4">
                    <Clock className="text-rose-600" size={24} />
                    <div>
                      <p className="font-semibold text-rose-900">Withdrawal Freeze Active</p>
                      <p className="text-sm text-rose-700">
                        Ends: {freezeEndsAt > 0 ? new Date(freezeEndsAt * 1000).toLocaleString() : '—'}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm text-rose-800 mb-4">
                    <p>⏱ Time remaining: {Math.max(0, Math.floor((freezeEndsAt - Date.now() / 1000) / 3600))} hours</p>
                    <p>⚠ No income accruing during freeze</p>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-4">
                    <p className="text-xs text-emerald-800 font-medium mb-1">💡 Cancel Benefit:</p>
                    <p className="text-xs text-emerald-700">If you cancel now, your portfolio will resume earning from the cancellation time. You'll only lose the income that would have been earned during this freeze period.</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button className="py-3 bg-gradient-to-r from-blue-600 to-emerald-600 text-white rounded-lg font-medium hover:shadow-lg transition-all">
                    Cancel & Resume
                  </button>
                  <button
                    disabled={Date.now() / 1000 < freezeEndsAt}
                    className="py-3 bg-rose-600 text-white rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Complete (80% Refund)
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="cyber-glass rounded-2xl p-6 border border-cyan-500/30 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
            <h2 className="text-lg font-semibold text-cyan-300 mb-4 uppercase tracking-wide">Contract Rules Reference</h2>
            <div className="space-y-4">
              {[
                { title: 'Rule 1: Minimum Stake', desc: '$10 minimum for ID activation' },
                { title: 'Rule 2: Slab Claim Requirement', desc: 'Requires 1 new $50 direct before slab claim' },
                { title: 'Rule 3: Qualified Volume', desc: 'Adaptive caps — strongest leg max 40%, each additional leg max 30% (same as 40:30:30 when you have 3 directs)' },
                { title: 'Rule 4: Withdrawal Fee', desc: '5% fee on external wallet claims' },
                { title: 'Rule 5: Safe Wallet', desc: 'Fee-free internal balance for passive income' },
                { title: 'Rule 6: Royalty Renewal', desc: '10% growth required every 2 months, LifeTime' },
                { title: 'Rule 7: Principal Exit', desc: '72-hour freeze with 20% exit fee' },
                { title: 'Rule 8: Global Cap', desc: '4x lifetime earnings limit based on total staked' },
                { title: 'Rule 9: Cooldown', desc: '24-hour cooldown for slab claims' },
                { title: 'Rule 10: Minimum Claim', desc: '$10 minimum for growth claims' },
                { title: 'Rule 11: Top-up', desc: 'Re-stake must be equal or higher than last stake' },
              ].map((rule, idx) => (
                <div key={idx} className="p-4 cyber-glass rounded-lg hover:bg-cyan-500/5 transition-all border border-cyan-500/20 hover:border-cyan-500/30 hover:shadow-neon-cyan">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500/20 to-neon-green/20 border border-cyan-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-cyan-300">{idx + 1}</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-cyan-300">{rule.title}</p>
                      <p className="text-xs text-cyan-300/90 mt-1">{rule.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Sound Controls */}
          <SoundControls
            soundEnabled={soundEnabled}
            setSoundEnabled={setSoundEnabled}
            audioInitialized={audioInitialized}
            setAudioInitialized={setAudioInitialized}
            initializeAudio={initializeAudio}
          />

          <div className="cyber-glass rounded-xl p-6 border border-cyan-500/30 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
            <div className="flex items-center gap-3 mb-4">
              <SettingsIcon className="text-cyan-400" size={20} />
              <h3 className="font-semibold text-cyan-300 uppercase tracking-wide">Platform Info</h3>
            </div>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-cyan-300/90 mb-1 uppercase tracking-wide text-xs">Ocean Smart Contract</p>
                <div className="flex items-center gap-2">
                  <p className="font-mono text-xs text-cyan-300 break-all flex-1">{contractDisplay}</p>
                  <button
                    onClick={() => copyToClipboard(oceanContractAddress, 'Contract address')}
                    className="p-1.5 hover:bg-cyan-500/10 rounded transition-colors"
                    title="Copy contract address"
                  >
                    <Copy size={14} className="text-cyan-400" />
                  </button>
                  <a
                    href={explorerHref || '#'}
                    target={explorerHref ? '_blank' : undefined}
                    rel={explorerHref ? 'noopener noreferrer' : undefined}
                    className="p-1.5 hover:bg-cyan-500/10 rounded transition-colors"
                    title="View on explorer"
                  >
                    <ExternalLink size={14} className="text-cyan-400" />
                  </a>
                </div>
              </div>
              <div>
                <p className="text-cyan-300/90 mb-1 uppercase tracking-wide text-xs">Sponsor Address</p>
                <div className="flex items-center gap-2">
                  <p className="font-mono text-xs text-cyan-300 break-all flex-1">{sponsorDisplay}</p>
                  <button
                    onClick={() => copyToClipboard(sponsorAddress, 'Sponsor address')}
                    className="p-1.5 hover:bg-cyan-500/10 rounded transition-colors"
                    title="Copy sponsor address"
                  >
                    <Copy size={14} className="text-cyan-400" />
                  </button>
                </div>
              </div>
              <div>
                <p className="text-cyan-300/90 mb-1 uppercase tracking-wide text-xs">Your Referral Link</p>
                <div className="flex items-center gap-2">
                  <p className="font-mono text-xs text-cyan-300 break-all flex-1">{referralDisplay}</p>
                  <button
                    onClick={() => copyToClipboard(referralLink, 'Referral link')}
                    className="p-1.5 hover:bg-cyan-500/10 rounded transition-colors"
                    title="Copy referral link"
                  >
                    <Copy size={14} className="text-cyan-400" />
                  </button>
                </div>
              </div>
              <div>
                <p className="text-cyan-300/90 mb-1 uppercase tracking-wide text-xs">Chain ID</p>
                <p className="font-medium text-cyan-300">1370</p>
              </div>
              <div>
                <p className="text-cyan-300/90 mb-1 uppercase tracking-wide text-xs">Blockchain Name</p>
                <p className="font-medium text-cyan-300">Ramestta Mainnet</p>
              </div>
              <div>
                <p className="text-cyan-300/90 mb-1 uppercase tracking-wide text-xs">Currency Symbol</p>
                <p className="font-medium text-cyan-300">RAMA</p>
              </div>
              <div>
                <p className="text-cyan-300/90 mb-1 uppercase tracking-wide text-xs">RPC Endpoint 1</p>
                <a href="https://blockchain.ramestta.com" target="_blank" rel="noopener noreferrer" className="font-mono text-xs text-cyan-400 hover:text-neon-green transition-colors">https://blockchain.ramestta.com</a>
              </div>
              <div>
                <p className="text-cyan-300/90 mb-1 uppercase tracking-wide text-xs">RPC Endpoint 2</p>
                <a href="https://blockchain2.ramestta.com" target="_blank" rel="noopener noreferrer" className="font-mono text-xs text-cyan-400 hover:text-neon-green transition-colors">https://blockchain2.ramestta.com</a>
              </div>
              <div>
                <p className="text-cyan-300/90 mb-1 uppercase tracking-wide text-xs">Block Explorer</p>
                <a href="https://ramascan.com" target="_blank" rel="noopener noreferrer" className="font-mono text-xs text-cyan-400 hover:text-neon-green transition-colors">https://ramascan.com</a>
              </div>
              <div>
                <p className="text-cyan-300/90 mb-1 uppercase tracking-wide text-xs">Bridge</p>
                <a href="https://ramabridge.com" target="_blank" rel="noopener noreferrer" className="font-mono text-xs text-cyan-400 hover:text-neon-green transition-colors">https://ramabridge.com</a>
              </div>
              <div>
                <p className="text-cyan-300/90 mb-1 uppercase tracking-wide text-xs">Swap DApp</p>
                <a href="https://ramaswap.com" target="_blank" rel="noopener noreferrer" className="font-mono text-xs text-cyan-400 hover:text-neon-green transition-colors">https://ramaswap.com</a>
              </div>
              <div>
                <p className="text-cyan-300/90 mb-1 uppercase tracking-wide text-xs">Price Feed</p>
                <p className="font-medium text-neon-green flex items-center gap-2">
                  <span className="w-2 h-2 bg-neon-green rounded-full animate-pulse shadow-neon-green"></span>
                  Active
                </p>
              </div>
            </div>
          </div>

          <div className="cyber-glass border border-cyan-500/30 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Lock className="text-cyan-400 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <p className="text-sm font-medium text-cyan-300 mb-1 uppercase tracking-wide">Security</p>
                <p className="text-xs text-cyan-300/90">
                  All contracts are audited and verified. Your funds are secured by blockchain technology.
                </p>
              </div>
            </div>
          </div>

          <div className="cyber-glass border border-neon-green/30 rounded-xl p-4">
            <p className="text-sm font-medium text-neon-green mb-2 uppercase tracking-wide">Investment Tiers</p>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-cyan-300/90">Tier 1 ($10+)</span>
                <span className="font-bold text-cyan-300">0.33%</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-cyan-300/90">Tier 2 ($5,010+)</span>
                <span className="font-bold text-cyan-300">0.40%</span>
              </div>
              <div className="flex justify-between text-xs pt-2 border-t border-cyan-500/30">
                <span className="text-neon-green/70">Booster T1</span>
                <span className="font-bold text-neon-green">0.66%</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-neon-green/70">Booster T2</span>
                <span className="font-bold text-neon-green">0.80%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
