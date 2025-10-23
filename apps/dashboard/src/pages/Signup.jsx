import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Wallet,
  ArrowRight,
  Check,
  AlertCircle,
  Wallet2,
  RefreshCcw,
  Loader2,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import { Clipboard } from 'lucide-react';
import Swal from 'sweetalert2';
import { useBalance } from 'wagmi';
import { useAppKitAccount } from '@reown/appkit/react';
import { useStore } from '../../store/useUserInfoStore';
import { useTransaction } from '../../config/register';
import { useDisconnect, useWaitForTransactionReceipt } from 'wagmi';

const MIN_USD = 10;
const MAX_USD = 100_000_000;

const STAGE_FLOW = ['initiated', 'connecting', 'activating'];
const STAGE_CONTENT = {
  initiated: {
    title: 'Request initiated',
    subtitle: 'Preparing your activation transaction…',
  },
  connecting: {
    title: 'Connecting wallet',
    subtitle: 'Approve the request in your wallet to continue.',
  },
  activating: {
    title: 'Activating account',
    subtitle: 'Finalizing your registration on-chain. This may take a few moments.',
  },
  success: {
    title: 'Registration complete',
    subtitle: 'Transaction confirmed successfully.',
  },
};

const formatAddressPreview = (address) => {
  if (!address || typeof address !== 'string') return '';
  if (address.length <= 14) return address;
  const leading = address.slice(0, 11);
  const trailing = address.slice(-6);
  return `${leading}...........${trailing}`;
};

export default function Signup() {
  const navigate = useNavigate();
  const location = useLocation();

  const { disconnect, disconnectAsync } = useDisconnect();

  const [refreshing, setRefreshing] = useState(false);
  const [justUpdated, setJustUpdated] = useState(false);

  const [portFolioAmt, setPortFolioAmt] = useState(null);
  const [amtInUSD, setAmtInUsd] = useState(String(MIN_USD));

  const [userValue, setUserValue] = useState('');
  const [sponsorValidated, setSponsorValidated] = useState(false);
  const [sponsorInfo, setSponsorInfo] = useState(null);
  const [sponsorError, setSponsorError] = useState('');
  const [validationPending, setValidationPending] = useState(false);

  const latestUserValueRef = useRef('');
  const lastValidatedInputRef = useRef('');
  const sponsorValidatedRef = useRef(false);
  const sponsorInputRef = useRef(null);

  const { address, isConnected } = useAppKitAccount();
  const { data: balanceData } = useBalance({ address: address });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [trxData, setTrxData] = useState(null);
  const [trxHash, setTrxHash] = useState();
  const [txModalOpen, setTxModalOpen] = useState(false);
  const [txStage, setTxStage] = useState('idle');
  const [txError, setTxError] = useState('');
  const [txReceipt, setTxReceipt] = useState(null);
  const [redirectCountdown, setRedirectCountdown] = useState(15);
  const redirectTimerRef = useRef(null);

  const usdToRama = useStore((s) => s.usdToRama);
  const CreateportFolio = useStore((s) => s.CreateportFolio);
  const isUserRegisterd = useStore((s) => s.isUserRegisterd);
  const userIdByAdd = useStore((s) => s.userIdByAdd);
  const checkUserById = useStore((s) => s.checkUserById);

  const { handleSendTx, hash } = useTransaction();

  const sponsorLabel = useMemo(() => {
    if (!sponsorInfo) return '';
    const idPart =
      sponsorInfo.id != null && Number.isFinite(Number(sponsorInfo.id))
        ? `USR-${String(Number(sponsorInfo.id)).padStart(4, '0')}`
        : null;
    const addressPart =
      sponsorInfo.address && sponsorInfo.address.length === 42
        ? formatAddressPreview(sponsorInfo.address)
        : sponsorInfo.address || null;
    if (idPart && addressPart) return `${idPart} • ${addressPart}`;
    return idPart || addressPart || '';
  }, [sponsorInfo]);

  const amountNumber = useMemo(() => {
    const parsed = Number(amtInUSD);
    if (!Number.isFinite(parsed)) return 0;
    return Math.min(Math.max(parsed, MIN_USD), MAX_USD);
  }, [amtInUSD]);

  const payableRama = useMemo(() => {
    if (!portFolioAmt) return null;
    const rate = Number(portFolioAmt);
    if (!Number.isFinite(rate)) return null;
    return rate * amountNumber;
  }, [portFolioAmt, amountNumber]);

  useEffect(() => {
    latestUserValueRef.current = userValue;
  }, [userValue]);

  useEffect(() => {
    sponsorValidatedRef.current = sponsorValidated;
  }, [sponsorValidated]);

  const validateSponsor = useCallback(
    async ({ silent = false, value } = {}) => {
      const rawInput =
        typeof value === 'string' ? value.trim() : (latestUserValueRef.current || '').trim();
      const raw = rawInput;
      if (!raw) {
        if (!silent) setSponsorError('Sponsor address or ID is required.');
        setSponsorValidated(false);
        setSponsorInfo(null);
        return false;
      }

      if (silent && raw === lastValidatedInputRef.current) {
        return sponsorValidatedRef.current;
      }

      setValidationPending(true);
      if (!silent) setSponsorError('');

      try {
        let resolvedAddress = '';
        let resolvedId = null;

        const normalizeRegistration = (info) => {
          if (!info) return { registered: false, id: null };
          if (typeof info === 'object') {
            const registered = info.registered ?? info[0] ?? false;
            const idVal = info.id ?? info[1] ?? null;
            return { registered, id: idVal };
          }
          return { registered: Boolean(info), id: null };
        };

        if (raw.startsWith('0x') && raw.length === 42) {
          const info = normalizeRegistration(await userIdByAdd(raw));
          if (!info.registered) {
            throw new Error('Sponsor wallet is not registered yet.');
          }
          resolvedAddress = raw;
          resolvedId = info.id;
        } else {
          const numeric = Number(raw);
          if (!Number.isFinite(numeric) || numeric <= 0) {
            throw new Error('Enter a valid numeric sponsor ID.');
          }
          const addressFromId = await checkUserById(numeric);
          if (
            !addressFromId ||
            typeof addressFromId !== 'string' ||
            addressFromId.length !== 42 ||
            !addressFromId.startsWith('0x') ||
            /^0x0{40}$/i.test(addressFromId)
          ) {
            throw new Error('Sponsor not found for that ID.');
          }
          const info = normalizeRegistration(await userIdByAdd(addressFromId));
          if (!info.registered) {
            throw new Error('Sponsor wallet is not registered yet.');
          }
          resolvedAddress = addressFromId;
          resolvedId = info.id ?? numeric;
        }

        if (!resolvedAddress || /^0x0{40}$/i.test(resolvedAddress)) {
          throw new Error('Sponsor address is invalid.');
        }

        setSponsorInfo({
          address: resolvedAddress,
          id:
            resolvedId != null && Number.isFinite(Number(resolvedId)) && Number(resolvedId) > 0
              ? Number(resolvedId)
              : null,
        });
        setSponsorValidated(true);
        sponsorValidatedRef.current = true;
        setSponsorError('');

        if (!raw.startsWith('0x')) {
          setUserValue(resolvedAddress);
          latestUserValueRef.current = resolvedAddress;
        }

        lastValidatedInputRef.current = resolvedAddress;
        return true;
      } catch (err) {
        const message = err?.message || 'Unable to validate sponsor.';
        if (!silent) {
          setSponsorError(message);
        }
        setSponsorValidated(false);
        sponsorValidatedRef.current = false;
        setSponsorInfo(null);
        lastValidatedInputRef.current = '';
        return false;
      } finally {
        setValidationPending(false);
      }
    },
    [userIdByAdd, checkUserById]
  );

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const ref = params.get('ref');
    if (ref) {
      setUserValue(ref);
      setSponsorValidated(false);
      setSponsorInfo(null);
      setSponsorError('');
    }
  }, [location.search]);

  useEffect(() => {
    if (trxData) {
      try {
        setTxStage('connecting');
        handleSendTx(trxData);
      } catch (error) {
        console.error('Wallet submission failed:', error);
        setTxError(error?.shortMessage || error?.message || 'Transaction was rejected or failed to send.');
        setTxStage('error');
        setIsSubmitting(false);
      }
    }
  }, [trxData, handleSendTx]);

  useEffect(() => {
    if (hash) {
      setTrxHash(hash);
      setTxStage('activating');
    }
  }, [hash]);

  const { data: receipt, isSuccess, isError } = useWaitForTransactionReceipt({
    hash,
    confirmations: 1,
  });

  useEffect(() => {
    if (!hash) return;
    if (isSuccess && receipt?.status === 'success') {
      setTxStage('success');
      setTxReceipt(receipt);
      setIsSubmitting(false);
      try {
        if (address) localStorage.setItem('userAddress', address);
      } catch {}
    } else if (isError || receipt?.status === 'reverted') {
      setTxStage('error');
      setTxError('Your transaction failed or was reverted.');
      setIsSubmitting(false);
    }
  }, [isSuccess, isError, receipt, hash, address]);

  useEffect(() => {
    if (txStage !== 'success') {
      if (redirectTimerRef.current) {
        clearInterval(redirectTimerRef.current);
        redirectTimerRef.current = null;
      }
      return;
    }

    setRedirectCountdown(15);
    redirectTimerRef.current = setInterval(() => {
      setRedirectCountdown((prev) => {
        if (prev <= 1) {
          if (redirectTimerRef.current) {
            clearInterval(redirectTimerRef.current);
            redirectTimerRef.current = null;
          }
          setTxModalOpen(false);
          setTxStage('idle');
          setTxError('');
          setTxReceipt(null);
          setRedirectCountdown(15);
          navigate('/dashboard');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (redirectTimerRef.current) {
        clearInterval(redirectTimerRef.current);
        redirectTimerRef.current = null;
      }
    };
  }, [txStage, navigate]);

 // 1) Make the fetcher accept the current amount
const fetchPayableAmt = useCallback(
  async (usd) => {
    if (usd === '' || !Number.isFinite(Number(usd))) {
      setPortFolioAmt(null);
      return;
    }
    try {
      const res = await usdToRama(usd);
      setPortFolioAmt(res);
    } catch (error) {
      console.log(error);
      setPortFolioAmt(null);
    }
  },
  [usdToRama]
);

// 2) Call it with the up-to-date value
useEffect(() => {
  let cancelled = false;
  (async () => {
    if (cancelled) return;
    await fetchPayableAmt(amtInUSD);
  })();
  return () => {
    cancelled = true;
  };
}, [amtInUSD, fetchPayableAmt]);


  useEffect(() => {
    const trimmed = (userValue || '').trim();
    if (!trimmed) {
      lastValidatedInputRef.current = '';
      return;
    }
    if (trimmed === lastValidatedInputRef.current) return;

    const handle = setTimeout(() => {
      validateSponsor({ silent: true, value: trimmed });
    }, 800);

    return () => clearTimeout(handle);
  }, [userValue, validateSponsor]);

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    setJustUpdated(false);
    try {
      await fetchPayableAmt();
      setJustUpdated(true);
      setTimeout(() => setJustUpdated(false), 1200);
    } catch (e) {
      // optional toast
    } finally {
      setRefreshing(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      if (disconnectAsync) await disconnectAsync();
      else if (disconnect) await Promise.resolve(disconnect());

      try {
        const provider = await window?.ethereum;
        if (provider?.disconnect) await provider.disconnect();
      } catch {}

      try { localStorage.removeItem('userAddress'); } catch {}
    } finally {
      window.location.replace('/login');
    }
  };

  const handleSponsorChange = (value) => {
    setUserValue(value);
    latestUserValueRef.current = value;
    sponsorValidatedRef.current = false;
    setSponsorValidated(false);
    setSponsorInfo(null);
    setSponsorError('');
  };

  const handleSponsorEdit = () => {
    setUserValue('');
    latestUserValueRef.current = '';
    lastValidatedInputRef.current = '';
    setSponsorValidated(false);
    sponsorValidatedRef.current = false;
    setSponsorInfo(null);
    setSponsorError('');
    setTimeout(() => {
      if (sponsorInputRef.current) {
        sponsorInputRef.current.focus();
      }
    }, 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setError('');
    setTxError('');
    setTxReceipt(null);
    setTrxData(null);
    setTrxHash(undefined);

    const usdNumber = Number(amtInUSD);
    if (!Number.isFinite(usdNumber) || usdNumber < MIN_USD || usdNumber > MAX_USD) {
      setError(`Activation amount must be between $${MIN_USD.toLocaleString()} and $${MAX_USD.toLocaleString()}.`);
      return;
    }
    if (!sponsorValidated) {
      setError('Please validate your sponsor before continuing.');
      return;
    }

    if (!address || typeof address !== 'string' || address.length !== 42 || !address.startsWith('0x')) {
      setError('Connect a valid wallet address before creating an account.');
      return;
    }

    setIsSubmitting(true);
    setTxStage('initiated');
    setTxModalOpen(true);

    try {
      const already = await isUserRegisterd(address);
      if (already) {
        setTxModalOpen(false);
        navigate('/dashboard');
        return;
      }

      const response = await CreateportFolio(address, userValue, usdNumber);

      if (response) {
        setTrxData(response);
      } else {
        setTxStage('error');
        setTxError('Unable to build registration transaction.');
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error('Registration failed:', error);
      setTxStage('error');
      setTxError(error?.message || 'An unexpected error occurred. Please try again.');
      setIsSubmitting(false);
    }
  };

  const closeModal = () => {
    setTxModalOpen(false);
    setTxStage('idle');
    setTxError('');
    setTxReceipt(null);
    setRedirectCountdown(15);
    if (redirectTimerRef.current) {
      clearInterval(redirectTimerRef.current);
      redirectTimerRef.current = null;
    }
  };

  const formattedUsdAmount = amountNumber.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const highlightMetrics = [
    {
      label: 'Funding Amount',
      value: `$${formattedUsdAmount}`,
      helper: `Min $${MIN_USD.toLocaleString()} • Max $${MAX_USD.toLocaleString()}`,
    },
    {
      label: 'Payable Token',
      value: portFolioAmt ? `${portFolioAmt} RAMA` : 'Calculating…',
      helper: 'Live Ramestta conversion',
    },
    {
      label: 'Network',
      value: 'Ramestta Mainnet',
      helper: 'Chain ID • 1370',
    },
  ];
  const trimmedSponsor = (userValue || '').trim();
  const sponsorStatus = sponsorValidated
    ? {
        tone: 'success',
        label: 'Sponsor validated',
        description: sponsorLabel || 'Registered sponsor confirmed successfully.',
      }
    : validationPending
    ? {
        tone: 'info',
        label: 'Validating sponsor…',
        description: 'We are checking the registry to confirm your sponsor details.',
      }
    : trimmedSponsor.length > 0
    ? {
        tone: 'warning',
        label: 'Awaiting validation',
        description: 'Click validate or wait for the automatic check to finish.',
      }
    : {
        tone: 'muted',
        label: 'Sponsor required',
        description: 'Enter a registered sponsor wallet or numeric ID to continue.',
      };
  const timelineSteps = [
    {
      key: 'init',
      title: 'Request initiated',
      description: 'Lock in pricing and prepare the activation payload.',
    },
    {
      key: 'wallet',
      title: 'Connect wallet',
      description: 'Approve the transaction securely through Reown AppKit.',
    },
    {
      key: 'activate',
      title: 'Activate account',
      description: 'Confirm registration on Ramestta and unlock your dashboard.',
    },
  ];

  const isSponsorReadOnly = sponsorValidated && !validationPending;
  const sponsorDisplayValue =
    isSponsorReadOnly && userValue ? formatAddressPreview(userValue) : null;

  return (
    <>
      <div className="min-h-screen bg-dark-950 cyber-grid-bg relative overflow-hidden">
        <div className="fixed inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-neon-green/10 pointer-events-none" />
        <div className="fixed inset-0 scan-lines pointer-events-none opacity-30" />
        <div className="absolute -top-40 -left-56 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 right-0 h-80 w-80 rounded-full bg-neon-green/10 blur-[120px] pointer-events-none" />

        <div className="relative z-10 mx-auto w-full max-w-6xl px-4 py-10 sm:py-12 lg:py-16">
          <div className="mb-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
            <a
              href="/"
              className="inline-flex items-center gap-2 rounded-xl border border-cyan-500/40 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-cyan-100 transition-colors hover:bg-cyan-500/10"
            >
              Back to Website
            </a>
          </div>
          <div className="grid items-start gap-8 lg:grid-cols-[1.05fr_0.95fr]">
            <section className="hidden lg:block">
              <div className="cyber-glass relative overflow-hidden rounded-3xl border border-cyan-500/30 p-8 lg:p-10">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 via-transparent to-neon-green/10 opacity-70" />
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/70 to-transparent" />
                <div className="relative z-10 space-y-8">
                  <div className="flex flex-col gap-6">
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-neon-green shadow-neon-cyan">
                        <Wallet className="text-dark-950" size={30} />
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.4em] text-cyan-300/70">Ocean DeFi Onboarding</p>
                        <h1 className="text-3xl sm:text-4xl font-bold leading-tight text-cyan-100">
                          Launch your validator-backed account
                        </h1>
                      </div>
                    </div>
                    <p className="max-w-2xl text-sm sm:text-base text-cyan-200/80">
                      Secure your access to the Ocean DeFi ecosystem with a guided workflow that validates your sponsor,
                      prepares the activation transaction, and confirms registration on Ramestta Mainnet.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    {highlightMetrics.map((metric) => (
                      <div
                        key={metric.label}
                        className="rounded-2xl border border-cyan-500/20 bg-dark-900/60 p-4 shadow-[0_15px_40px_-30px_rgba(34,211,238,0.6)]"
                      >
                        <p className="mb-1 text-[11px] uppercase tracking-wide text-cyan-300/60">{metric.label}</p>
                        <p className="text-lg font-semibold text-cyan-100">{metric.value}</p>
                        <p className="mt-1 text-xs text-cyan-300/70">{metric.helper}</p>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-5">
                    <p className="text-xs uppercase tracking-[0.3em] text-cyan-400/60">Three-stage onboarding</p>
                    <div className="space-y-4">
                      {timelineSteps.map((step, index) => (
                        <div
                          key={step.key}
                          className="flex items-start gap-4 rounded-2xl border border-cyan-500/15 bg-dark-900/50 p-4"
                        >
                          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-cyan-500/40 text-cyan-200 font-semibold">
                            {index + 1}
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-cyan-100">{step.title}</p>
                            <p className="text-xs leading-relaxed text-cyan-300/70">{step.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-cyan-500/20 bg-dark-900/60 p-5">
                    <p className="mb-2 text-[11px] uppercase tracking-wide text-cyan-300/60">Sponsor validation</p>
                    <p
                      className={`text-sm font-semibold ${
                        sponsorStatus.tone === 'success'
                          ? 'text-neon-green'
                          : sponsorStatus.tone === 'warning'
                          ? 'text-amber-300'
                          : sponsorStatus.tone === 'info'
                          ? 'text-cyan-200'
                          : 'text-cyan-300/70'
                      }`}
                    >
                      {sponsorStatus.label}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-cyan-300/70">{sponsorStatus.description}</p>
                    {sponsorValidated && sponsorLabel && (
                      <div className="mt-3 flex items-center gap-2 font-mono text-xs text-neon-green/90">
                        <CheckCircle size={14} className="text-neon-green" />
                        <span>{sponsorLabel}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>

            <section className="cyber-glass relative overflow-hidden rounded-3xl border border-cyan-500/40 p-6 sm:p-8 lg:p-10">
              <div className="absolute inset-0 bg-gradient-to-br from-dark-900 via-transparent to-cyan-500/10 opacity-80" />
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-500/70 to-transparent" />
              <div className="relative z-10 space-y-6">
                <header className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.35em] text-cyan-300/70">Step 1</p>
                  <h2 className="text-2xl sm:text-3xl font-semibold text-cyan-100">Create your Ocean account</h2>
                  <p className="text-sm text-cyan-300/80">
                    Validate your sponsor, choose your activation amount, and confirm the transaction in your wallet.
                  </p>
                </header>

                {error && (
                  <div className="flex items-start gap-3 rounded-2xl border border-red-500/60 bg-red-500/10 p-4">
                    <AlertCircle className="mt-0.5 text-red-400" size={20} />
                    <p className="text-sm text-red-200">{error}</p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="rounded-2xl border border-neon-green/40 bg-gradient-to-r from-neon-green/10 via-cyan-500/5 to-transparent p-5 shadow-[0_12px_45px_-25px_rgba(34,197,94,0.6)]">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-neon-green/50 bg-neon-green/20">
                          <Check className="text-neon-green" size={18} />
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wide text-neon-green/80">
                            {isConnected ? 'Wallet connected' : 'Connect wallet'}
                          </p>
                          <p className="text-sm font-mono text-cyan-100">
                            {address ? formatAddressPreview(address) : 'Awaiting connection'}
                            {balanceData && (
                              <span className="ml-2 text-xs font-normal text-cyan-300/70">
                                • {balanceData.formatted} {balanceData.symbol ?? 'RAMA'}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={handleRefresh}
                          disabled={refreshing}
                          aria-busy={refreshing}
                          className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-colors ${
                            refreshing
                              ? 'border-cyan-500/60 bg-cyan-500/10 text-cyan-200 cursor-wait'
                              : 'border-cyan-500/40 text-cyan-200 hover:bg-cyan-500/10'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            {refreshing ? (
                              <RefreshCcw className="h-4 w-4 animate-spin" />
                            ) : justUpdated ? (
                              <Check className="h-4 w-4 text-emerald-400" />
                            ) : (
                              <RefreshCcw className="h-4 w-4" />
                            )}
                            <span>{refreshing ? 'Refreshing' : justUpdated ? 'Updated' : 'Refresh'}</span>
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={handleDisconnect}
                          className="px-3 py-2 text-xs font-semibold rounded-lg border border-red-500/60 text-red-200 transition-colors hover:bg-red-500/10"
                        >
                          Disconnect
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-cyan-500/30 bg-dark-900/60 p-5 space-y-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-cyan-300/70">Activation amount</p>
                        <h3 className="text-lg font-semibold text-cyan-100">Portfolio configuration</h3>
                      </div>
                      <p className="text-xs text-cyan-400/60">Live oracle pricing · refresh for latest rate</p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="rounded-xl border border-cyan-500/20 bg-dark-950/60 p-4 space-y-3">
                        <p className="text-xs uppercase tracking-wide text-cyan-300/60">Amount (USD)</p>
                        <div className="relative">
                          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-cyan-400/50">
                            $
                          </span>
                          <input
                            type="number"
                            value={amtInUSD}
                            inputMode="decimal"
                            min={0}
                            max={MAX_USD}
                            step="any"
                            onChange={(e) => {
                              const raw = e.target.value;
                              // allow clearing the field so user can fully edit on mobile/webview
                              if (raw === '') {
                                setAmtInUsd('');
                                return;
                              }
                              // accept the raw numeric entry (do not force-min clamping here)
                              const numeric = Number(raw);
                              if (!Number.isFinite(numeric)) return;
                              // enforce max only
                              const capped = Math.min(numeric, MAX_USD);
                              setAmtInUsd(String(capped));
                            }}
                            onBlur={(e) => {
                              const raw = e.target.value;
                              if (raw === '') return;
                              const numeric = Number(raw);
                              if (Number.isFinite(numeric) && numeric < MIN_USD) {
                                // friendly alert about minimum requirement
                                Swal.fire({
                                  icon: 'warning',
                                  title: 'Minimum amount',
                                  text: `Activation minimum is $${MIN_USD}. Please enter at least $${MIN_USD}.`,
                                });
                              }
                            }}
                            onKeyDown={(e) => {
                              if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault();
                            }}
                            placeholder="0.00"
                            className="w-full rounded-xl border border-cyan-500/30 bg-transparent px-10 py-3 text-lg text-cyan-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                          />
                        </div>
                        <p className="text-[11px] text-cyan-400/60">
                          Suggestion: start with ${MIN_USD.toLocaleString()} for quickest activation.
                        </p>
                      </div>

                      <div className="rounded-xl border border-cyan-500/20 bg-dark-950/60 p-4 space-y-2">
                        <p className="text-xs uppercase tracking-wide text-cyan-300/60">Payable (RAMA)</p>
                        <p className="text-2xl font-semibold text-cyan-100">
                          {portFolioAmt ? (
                            <>
                              {portFolioAmt.toFixed(4)}
                              <span className="ml-1 text-base font-medium text-cyan-300/70">RAMA</span>
                            </>
                          ) : (
                            <span className="text-sm text-cyan-300/60">Fetching rate…</span>
                          )}
                        </p>
                        <p className="text-[11px] text-cyan-400/60">
                          Based on the latest on-chain conversion from Portfolio Manager.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="block text-sm font-medium uppercase tracking-wide text-cyan-300">
                      Sponsor address or ID
                    </label>
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <div className="relative flex-1">
                        <Wallet2 className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-cyan-400/50" size={20} />
                        <input
                          ref={sponsorInputRef}
                          type="text"
                          name="userId"
                          value={userValue}
                          onChange={(e) => handleSponsorChange(e.target.value)}
                          placeholder="Enter the sponsor ID or address"
                          onBlur={(e) => {
                            if (isSponsorReadOnly) return;
                            const value = e.target.value.trim();
                            if (value) validateSponsor({ silent: true, value });
                          }}
                          required
                          readOnly={isSponsorReadOnly}
                          className={`w-full rounded-xl border bg-dark-900/50 px-11 py-3 font-mono text-sm text-cyan-100 transition-all focus:outline-none focus:ring-2 ${
                            isSponsorReadOnly
                              ? 'border-neon-green/60 cursor-default caret-transparent text-transparent selection:text-cyan-100'
                              : sponsorValidated
                              ? 'border-neon-green/60 focus:ring-neon-green/50'
                              : 'border-cyan-500/30 focus:ring-cyan-500'
                          }`}
                        />
                        {sponsorDisplayValue && (
                          <div className="pointer-events-none absolute inset-y-0 left-11 right-3 flex items-center font-mono text-sm text-cyan-100">
                            <span className="truncate block w-full">{sponsorDisplayValue}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex w-full flex-col items-center justify-center gap-2 sm:w-auto sm:flex-row sm:justify-center">
                        <button
                          type="button"
                          onClick={() => validateSponsor({ silent: false })}
                          disabled={validationPending || !(userValue || '').trim()}
                          className="flex items-center justify-center gap-2 rounded-xl border border-cyan-500/40 px-5 py-3 text-xs font-semibold text-cyan-100 transition-colors hover:bg-cyan-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {validationPending ? (
                            <>
                              <Loader2 size={16} className="animate-spin" />
                              Validating…
                            </>
                          ) : sponsorValidated ? (
                            <>
                              <CheckCircle size={16} className="text-neon-green" />
                              Validated
                            </>
                          ) : (
                            <>
                              <CheckCircle size={16} className="text-cyan-200" />
                              Validate
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const text = await navigator.clipboard.readText();
                              if (text && text.trim()) {
                                handleSponsorChange(text.trim());
                                // auto-validate after paste
                                await validateSponsor({ silent: false, value: text.trim() });
                              }
                            } catch (err) {
                              console.error('Paste failed:', err);
                            }
                          }}
                          title="Paste from clipboard"
                          className="rounded-xl border border-cyan-500/30 px-3 py-2 text-xs font-semibold text-cyan-100 transition-colors hover:bg-cyan-500/10"
                        >
                          <Clipboard size={16} />
                        </button>
                        {sponsorValidated && (
                          <button
                            type="button"
                            onClick={handleSponsorEdit}
                            className="rounded-xl border border-cyan-500/30 px-5 py-3 text-xs font-semibold text-cyan-100 transition-colors hover:bg-cyan-500/10"
                          >
                            Edit
                          </button>
                        )}
                      </div>
                    </div>

                    {sponsorError && (
                      <div className="flex items-center gap-2 text-xs text-red-400">
                        <AlertTriangle size={14} />
                        <span>{sponsorError}</span>
                      </div>
                    )}

                    {!sponsorError && !sponsorValidated && trimmedSponsor.length === 0 && (
                      <p className="text-xs text-cyan-400/60">
                        Hint: paste a registered wallet or numeric sponsor ID to auto-validate.
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting || !sponsorValidated}
                    className="relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-cyan-500 to-neon-green py-4 text-sm font-semibold uppercase tracking-wide text-dark-950 transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span className="relative z-10 flex items-center justify-center gap-3">
                      <span>{isSubmitting ? 'Creating Account…' : 'Create Account'}</span>
                      <ArrowRight size={20} />
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-neon-green opacity-0 transition-opacity duration-200 hover:opacity-100" />
                  </button>

                  <p className="text-center text-xs text-cyan-300/70">
                    Already registered?{' '}
                    <button
                      type="button"
                      onClick={() => navigate('/login')}
                      className="font-semibold text-neon-green transition-colors hover:text-cyan-400"
                    >
                      Sign in here
                    </button>
                  </p>
                </form>
              </div>
            </section>
          </div>
        </div>
      </div>

      {txModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-dark-950/80 backdrop-blur">
          <div className="w-full max-w-md cyber-glass border border-cyan-500/30 rounded-2xl p-6 sm:p-8 shadow-neon-cyan relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/70 to-transparent" />
            {txStage === 'error' ? (
              <div className="space-y-5 text-center">
                <div className="mx-auto w-16 h-16 rounded-full border border-red-500/50 bg-red-500/10 flex items-center justify-center">
                  <AlertCircle size={32} className="text-red-400" />
                </div>
                <h3 className="text-2xl font-semibold text-red-200">Transaction failed</h3>
                <p className="text-sm text-red-200/80">{txError || 'Your transaction failed or was reverted. Please try again.'}</p>
                <button
                  type="button"
                  onClick={closeModal}
                  className="w-full py-3 bg-gradient-to-r from-cyan-500 to-neon-green text-dark-950 rounded-xl font-bold hover:shadow-neon-cyan transition-all"
                >
                  Close &amp; retry
                </button>
              </div>
            ) : txStage === 'success' ? (
              <div className="space-y-5 text-center">
                <div className="mx-auto w-16 h-16 rounded-full border border-neon-green/50 bg-neon-green/10 flex items-center justify-center">
                  <CheckCircle size={32} className="text-neon-green" />
                </div>
                <h3 className="text-2xl font-semibold text-cyan-100">Registration complete</h3>
                <p className="text-sm text-cyan-300/80">
                  Your account is activated and the transaction is confirmed on-chain.
                </p>
                {trxHash && (
                  <div className="cyber-glass border border-cyan-500/30 rounded-xl px-4 py-3 text-left text-xs text-cyan-200/90">
                    <p className="mb-2 uppercase tracking-wider text-[11px] text-cyan-300/70">Transaction Hash</p>
                    <p className="font-semibold text-cyan-100">{`${trxHash.slice(0, 10)}...${trxHash.slice(-8)}`}</p>
                    <p className="mt-2 break-all font-mono text-[11px] text-cyan-300/70">{trxHash}</p>
                  </div>
                )}
                <div className="rounded-2xl border border-cyan-500/20 bg-dark-900/60 p-4 text-left space-y-3">
                  {STAGE_FLOW.map((stageKey) => (
                    <div key={stageKey} className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-cyan-100">
                          {STAGE_CONTENT[stageKey]?.title ?? stageKey}
                        </p>
                        <p className="text-[11px] text-cyan-300/70">
                          {STAGE_CONTENT[stageKey]?.subtitle ?? ''}
                        </p>
                      </div>
                      <CheckCircle size={18} className="text-neon-green flex-shrink-0" />
                    </div>
                  ))}
                </div>
                <div className="space-y-3">
                  <a
                    href={trxHash ? `https://ramascan.com/tx/${trxHash}` : 'https://ramascan.com/'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full py-3 border border-cyan-500/40 text-cyan-300 rounded-xl hover:bg-cyan-500/10 transition-all text-sm"
                  >
                    View on Ramascan
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      closeModal();
                      navigate('/dashboard');
                    }}
                    className="w-full py-3 bg-gradient-to-r from-cyan-500 to-neon-green text-dark-950 rounded-xl font-bold hover:shadow-neon-cyan transition-all"
                  >
                    Go to dashboard
                  </button>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="w-full py-2 text-xs border border-cyan-500/30 text-cyan-200 rounded-xl hover:bg-cyan-500/10 transition-all"
                  >
                    Stay on this page
                  </button>
                </div>
                <p className="text-xs text-cyan-300/70">Redirecting in {Math.max(redirectCountdown, 0)}s…</p>
              </div>
            ) : (
              <div className="flex flex-col items-center text-center space-y-5">
                <div className="w-16 h-16 rounded-full border border-cyan-500/50 bg-cyan-500/10 flex items-center justify-center">
                  <Loader2 size={32} className="text-cyan-200 animate-spin" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-cyan-200">
                    {STAGE_CONTENT[txStage]?.title ?? 'Processing request'}
                  </h3>
                  <p className="text-sm text-cyan-300/80">
                    {STAGE_CONTENT[txStage]?.subtitle ?? 'Hang tight while we process your transaction.'}
                  </p>
                </div>
                <div className="w-full space-y-3">
                  {STAGE_FLOW.map((stageKey) => {
                    const stageIndex = STAGE_FLOW.indexOf(stageKey);
                    const activeIndex = STAGE_FLOW.indexOf(txStage);
                    const isComplete = activeIndex > stageIndex;
                    const isActive = activeIndex === stageIndex;
                    return (
                      <div
                        key={stageKey}
                        className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-3 ${
                          isComplete
                            ? 'border-neon-green/60 bg-neon-green/10'
                            : isActive
                            ? 'border-cyan-500/60 bg-cyan-500/10'
                            : 'border-cyan-500/20 bg-dark-900/60'
                        }`}
                      >
                        <div className="text-left">
                          <p className="text-sm font-medium text-cyan-100">
                            {STAGE_CONTENT[stageKey]?.title ?? stageKey}
                          </p>
                          <p className="text-[11px] text-cyan-300/70">
                            {STAGE_CONTENT[stageKey]?.subtitle ?? ''}
                          </p>
                        </div>
                        {isComplete ? (
                          <CheckCircle size={16} className="text-neon-green" />
                        ) : isActive ? (
                          <Loader2 size={16} className="text-cyan-300 animate-spin" />
                        ) : (
                          <span className="h-2 w-2 rounded-full bg-cyan-500/40" />
                        )}
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-cyan-300/70">
                  Need to cancel? Reject the transaction in your wallet or close this window once complete.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
