import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Wallet, Zap, TrendingUp, AlertCircle, CheckCircle, HelpCircle, ChevronDown, ChevronUp, DollarSign, User, Users, Info, Clipboard, Loader2, Copy } from 'lucide-react';
import { formatUSD } from '../utils/contractData';
import Tooltip from '../components/Tooltip';
import CopyButton from '../components/CopyButton';
import { useStore } from '../../store/useUserInfoStore';
import toast from '../utils/toast';
import { useAppKitAccount } from '@reown/appkit/react';
import { useBalance, useWaitForTransactionReceipt } from 'wagmi';
import { useTransaction } from "../../config/register";

export default function StakeInvest() {
  // Constants
  const MIN_USD = 10;
  const MAX_USD = 100_000_000;

  const [stakeType, setStakeType] = useState('self');
  const [useWallet, setUseWallet] = useState('external');
  const [beneficiaryAddress, setBeneficiaryAddress] = useState('');
  const [validationPending, setValidationPending] = useState(false);
  const [sponsorValidated, setSponsorValidated] = useState(false);
  const [sponsorInfo, setSponsorInfo] = useState(null);
  const [sponsorError, setSponsorError] = useState('');
  const latestSponsorRef = useRef('');
  const lastValidatedRef = useRef('');
  const sponsorValidatedRef = useRef(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [isStaking, setIsStaking] = useState(false);
  const [loadingLastSelf, setLoadingLastSelf] = useState(false);
  const [loadingLastOther, setLoadingLastOther] = useState(false);
  const [lastSelfInfo, setLastSelfInfo] = useState({ pid: null, amountUsd: 0, hasPortfolio: false });
  const [lastOtherInfo, setLastOtherInfo] = useState({ pid: null, amountUsd: 0, hasPortfolio: false });
  const [lastOtherPreview, setLastOtherPreview] = useState({ pid: null, amountUsd: 0, hasPortfolio: false });
  const [loadingLastOtherPreview, setLoadingLastOtherPreview] = useState(false);

  // Registration flow for unregistered beneficiary
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [unregisteredBeneficiary, setUnregisteredBeneficiary] = useState('');
  const [registrationSponsor, setRegistrationSponsor] = useState('');
  const [registrationSponsorValidated, setRegistrationSponsorValidated] = useState(false);
  const [registrationSponsorInfo, setRegistrationSponsorInfo] = useState(null);
  const [registrationSponsorError, setRegistrationSponsorError] = useState('');
  const [validatingRegistrationSponsor, setValidatingRegistrationSponsor] = useState(false);
  const latestRegSponsorRef = useRef('');
  const lastValidatedRegSponsorRef = useRef('');
  const registrationSponsorValidatedRef = useRef(false);

  const [stakeAmount, setStakeAmount] = useState('10');
  const [ramaStake, SetramaStake] = useState('');
  const [walletBalanceNum, setWalletBalanceNum] = useState(0);
  const [walletBalanceDisplay, setWalletBalanceDisplay] = useState('—');
  const [safeWalletBalance, setSafeWalletBalance] = useState(0); // RAMA
  const [ramaPrice, setRamaPrice] = useState(0);

  const [safeWalletUsd, setSafeWalletUsd] = useState(0);
  const [connectedWalletUsd, setConnectedWalletUsd] = useState(0);

  // Current user info
  const [currentUserId, setCurrentUserId] = useState(null);

  // Success countdown timer
  const [successCountdown, setSuccessCountdown] = useState(10);



  const tier = parseFloat(stakeAmount) >= 5001 ? 2 : 1;
  const dailyRate = tier === 2 ? 0.40 : 0.33;
  const projectedDaily = parseFloat(stakeAmount) * (dailyRate / 100);
  const projectedMonthly = projectedDaily * 30;

  const boosterDailyRate = tier === 2 ? 0.80 : 0.66;
  const boosterProjectedDaily = parseFloat(stakeAmount) * (boosterDailyRate / 100);

  const stakeAmountNum = useMemo(() => {
    const n = Number(stakeAmount);
    if (!Number.isFinite(n)) return 0;
    return Math.min(Math.max(n, 0), MAX_USD);
  }, [stakeAmount]);

  const selectedWalletBalanceRama = useWallet === 'external' ? walletBalanceNum : safeWalletBalance; // in RAMA
  const selectedWalletBalanceUSD = selectedWalletBalanceRama * ramaPrice;
  const isSufficientBalance = stakeAmountNum > 0 && selectedWalletBalanceUSD >= stakeAmountNum;

  // Determine target user's last portfolio minimum (self or beneficiary)
  const targetLastMinUsd = useMemo(() => {
    if (stakeType === 'other') {
      if (sponsorValidated && lastOtherInfo?.amountUsd > 0) return lastOtherInfo.amountUsd;
      if (lastOtherPreview?.amountUsd > 0) return lastOtherPreview.amountUsd; // optimistic preview while typing
      return 0;
    }
    return lastSelfInfo?.amountUsd > 0 ? lastSelfInfo.amountUsd : 0;
  }, [stakeType, sponsorValidated, lastSelfInfo, lastOtherInfo, lastOtherPreview]);

  const minStakeRequired = useMemo(() => {
    const baseline = MIN_USD;
    const lastMin = Number(targetLastMinUsd) || 0;
    return Math.max(baseline, lastMin);
  }, [targetLastMinUsd]);

  const isMinimumMet = stakeAmountNum >= minStakeRequired;

  const canStake = isMinimumMet && isSufficientBalance && (stakeType === 'self' || (sponsorValidated && !showRegisterModal));

  const quickAmounts = [10, 50, 100, 500, 1000, 5000];

  useEffect(() => {
    latestSponsorRef.current = beneficiaryAddress;
  }, [beneficiaryAddress]);

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
  const SafeRegisterAndActivate = useStore((s) => s.SafeRegisterAndActivate);



  const GetchStakeInvest = useStore((s) => s.GetchStakeInvest);
  const usdToRama = useStore((s) => s.usdToRama);
  const RamaTOUsd = useStore((s) => s.RamaTOUsd);
  const userIdByAdd = useStore((s) => s.userIdByAdd);
  const checkUserById = useStore((s) => s.checkUserById);
  const CreateportFolio = useStore((s) => s.CreateportFolio);
  const getLastPortfolioAmountUsd = useStore((s) => s.getLastPortfolioAmountUsd);
  const getDashboardDetails = useStore((s) => s.getDashboardDetails);
  const getIncomeTransaction = useStore((s) => s.getIncomeTransaction);

  useEffect(() => {
    latestRegSponsorRef.current = registrationSponsor;
  }, [registrationSponsor]);


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


  //getting safe wallet balance in usd
  useEffect(()=>{
    const fetchSafeWalletUsd = async () => {
      try {
        const usdValue = await RamaTOUsd(safeWalletBalance);
        setSafeWalletUsd(usdValue);
      } catch (error) {
        console.log(error);
      }
    }
    fetchSafeWalletUsd();
  }, [safeWalletBalance]);

   //getting safe wallet balance in usd
  useEffect(()=>{
    const fetchConnectedWalletUsd = async () => {
      try {
        const usdValue = await RamaTOUsd(walletBalanceNum);
        setConnectedWalletUsd(usdValue);
      } catch (error) {
        console.log(error);
      }
    }
    fetchConnectedWalletUsd();
  }, [walletBalanceNum]);


  useEffect(() => {
    if (stakeAmount !== '' && Number(stakeAmount) > 0) {
      GetUsdToRama(stakeAmount);
    } else {
      SetramaStake('');
    }
  }, [stakeAmount])

  // Load last portfolio for self
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        setLoadingLastSelf(true);
        const addr = userAddress;
        if (!addr || !getLastPortfolioAmountUsd) return;

        const passedAddr = stakeType === 'other' ?  beneficiaryAddress: addr;
        const info = await getLastPortfolioAmountUsd(passedAddr);
        if (!cancelled) setLastSelfInfo(info || { pid: null, amountUsd: 0, hasPortfolio: false });
      } catch (e) {
        if (!cancelled) setLastSelfInfo({ pid: null, amountUsd: 0, hasPortfolio: false });
      } finally {
        if (!cancelled) setLoadingLastSelf(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [userAddress, getLastPortfolioAmountUsd,beneficiaryAddress, stakeType]);

  // Load last portfolio for beneficiary (when valid)
  useEffect(() => {
    if (stakeType !== 'other' || !sponsorValidated || !sponsorInfo?.address) {
      setLastOtherInfo({ pid: null, amountUsd: 0, hasPortfolio: false });
      return;
    }
    let cancelled = false;
    const run = async () => {
      try {
        setLoadingLastOther(true);
        const passedAddr = stakeType === 'other' ?  beneficiaryAddress: addr;

        console.log("passedAddr",passedAddr);
        const got = await getLastPortfolioAmountUsd(passedAddr);
        console.log("got",got);
        if (!cancelled) setLastOtherInfo(got || { pid: null, amountUsd: 0, hasPortfolio: false });
      } catch (e) {
        if (!cancelled) setLastOtherInfo({ pid: null, amountUsd: 0, hasPortfolio: false });
      } finally {
        if (!cancelled) setLoadingLastOther(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [stakeType, sponsorValidated, sponsorInfo, getLastPortfolioAmountUsd,beneficiaryAddress]);

  // Optimistic preview for beneficiary while typing (address or numeric ID)
  useEffect(() => {
    if (stakeType !== 'other') {
      setLastOtherPreview({ pid: null, amountUsd: 0, hasPortfolio: false });
      return;
    }
    const raw = (beneficiaryAddress || '').trim();
    if (!raw) {
      setLastOtherPreview({ pid: null, amountUsd: 0, hasPortfolio: false });
      return;
    }
    let cancelled = false;
    const handle = setTimeout(async () => {
      try {
        setLoadingLastOtherPreview(true);
        let addr = '';
        if (raw.startsWith('0x') && raw.length === 42) {
          addr = raw;
        } else if (/^\d+$/.test(raw)) {
          // numeric user ID, resolve to address
          const resolved = await checkUserById(Number(raw)).catch(() => null);
          if (typeof resolved === 'string' && resolved.startsWith('0x') && resolved.length === 42) {
            addr = resolved;
          }
        }
        if (addr || beneficiaryAddress) {
          const passedAddr = stakeType === 'other' ?  beneficiaryAddress: addr;
          const info = await getLastPortfolioAmountUsd(passedAddr).catch(() => ({ pid: null, amountUsd: 0, hasPortfolio: false }));
          if (!cancelled) setLastOtherPreview(info || { pid: null, amountUsd: 0, hasPortfolio: false });
        } else {
          if (!cancelled) setLastOtherPreview({ pid: null, amountUsd: 0, hasPortfolio: false });
        }
      } finally {
        if (!cancelled) setLoadingLastOtherPreview(false);
      }
    }, 600);
    return () => { cancelled = true; clearTimeout(handle); };
  }, [stakeType, beneficiaryAddress, checkUserById, getLastPortfolioAmountUsd]);


  const { address, isConnected } = useAppKitAccount();

  const [error, setError] = useState('');
  const [trxData, setTrxData] = useState();
  const [trxHash, setTrxHash] = useState();
  const [txModalOpen, setTxModalOpen] = useState(false);
  const [txStage, setTxStage] = useState('idle');
  const [txError, setTxError] = useState('');



  const { handleSendTx, hash } = useTransaction(trxData !== null && trxData);
  useEffect(() => {
    if (trxData) {
      try {
        setTxStage('connecting');
        handleSendTx(trxData);
      } catch (error) {
        setTxError(error?.message || 'Transaction rejected or failed to send.');
        setTxStage('error');
        setIsStaking(false);
      }
    }
  }, [trxData]);

  useEffect(() => {
    if (hash) {
      setTrxHash(hash)
      setTxStage('activating');
    }
  }, [hash]);



  const { data: receipt, isLoading: progress, isSuccess, isError } =
    useWaitForTransactionReceipt({
      hash,
      confirmations: 1,
    });


  useEffect(() => {
    if (!hash) return;
    if (isSuccess && receipt?.status === 'success') {
      setTxStage('success');
      setIsStaking(false);
    } else if (isError || receipt?.status === 'reverted') {
      setTxStage('error');
      setTxError('Your transaction failed or was reverted.');
      setIsStaking(false);
    }
  }, [isSuccess, isError, receipt, address, hash]);

  const STAKE_STAGE_FLOW = ['initiated', 'connecting', 'activating'];
  const STAGE_CONTENT = {
    initiated: { title: 'Request initiated', subtitle: 'Preparing your staking transaction…' },
    connecting: { title: 'Connecting wallet', subtitle: 'Approve the request in your wallet to continue.' },
    activating: { title: 'Processing stake', subtitle: 'Finalizing on-chain. This may take a few moments.' },
    success: { title: 'Stake complete', subtitle: 'Transaction confirmed successfully.' },
  };

  // Sponsor validation (for staking on behalf of others)
  const validateSponsor = useCallback(
    async ({ silent = false, value } = {}) => {
      if (stakeType !== 'other') return true;
      const rawInput = typeof value === 'string' ? value.trim() : (latestSponsorRef.current || '').trim();
      if (!rawInput) {
        if (!silent) setSponsorError('Beneficiary address or ID is required.');
        setSponsorValidated(false);
        setSponsorInfo(null);
        return false;
      }

      if (silent && rawInput === lastValidatedRef.current) return sponsorValidatedRef.current;

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

        if (rawInput.startsWith('0x') && rawInput.length === 42) {
          const info = normalizeRegistration(await userIdByAdd(rawInput));
          if (!info.registered) {
            // Beneficiary is not registered; prompt for registration
            setUnregisteredBeneficiary(rawInput);
            setShowRegisterModal(true);
            setValidationPending(false);
            return false;
          }
          resolvedAddress = rawInput;
          resolvedId = info.id;
        } else {
          const n = Number(rawInput);
          if (!Number.isFinite(n) || n <= 0) throw new Error('Enter a valid numeric user ID.');
          const addr = await checkUserById(n);
          if (!addr || typeof addr !== 'string' || addr.length !== 42 || !addr.startsWith('0x') || /^0x0{40}$/i.test(addr)) {
            throw new Error('Beneficiary not found for that ID.');
          }
          const info = normalizeRegistration(await userIdByAdd(addr));
          if (!info.registered) throw new Error('Beneficiary wallet is not registered.');
          resolvedAddress = addr;
          resolvedId = info.id ?? n;
        }

        if (!resolvedAddress || /^0x0{40}$/i.test(resolvedAddress)) throw new Error('Invalid beneficiary address.');

        setSponsorInfo({ address: resolvedAddress, id: resolvedId != null ? Number(resolvedId) : null });
        setSponsorValidated(true);
        sponsorValidatedRef.current = true;
        setSponsorError('');
        if (!rawInput.startsWith('0x')) {
          setBeneficiaryAddress(resolvedAddress);
          latestSponsorRef.current = resolvedAddress;
        }
        lastValidatedRef.current = resolvedAddress;
        return true;
      } catch (err) {
        if (!silent) setSponsorError(err?.message || 'Unable to validate beneficiary.');
        setSponsorValidated(false);
        sponsorValidatedRef.current = false;
        setSponsorInfo(null);
        lastValidatedRef.current = '';
        return false;
      } finally {
        setValidationPending(false);
      }
    },
    [stakeType, userIdByAdd, checkUserById]
  );

  useEffect(() => {
    if (stakeType !== 'other') return;
    const trimmed = (beneficiaryAddress || '').trim();
    if (!trimmed) {
      lastValidatedRef.current = '';
      return;
    }
    if (trimmed === lastValidatedRef.current) return;
    const handle = setTimeout(() => validateSponsor({ silent: true, value: trimmed }), 700);
    return () => clearTimeout(handle);
  }, [beneficiaryAddress, stakeType, validateSponsor]);

  // Validate registration sponsor (for registering unregistered beneficiary)
  const validateRegistrationSponsor = useCallback(
    async ({ silent = false, value } = {}) => {
      const rawInput = typeof value === 'string' ? value.trim() : (latestRegSponsorRef.current || '').trim();
      if (!rawInput) {
        if (!silent) setRegistrationSponsorError('Sponsor address or ID is required.');
        setRegistrationSponsorValidated(false);
        setRegistrationSponsorInfo(null);
        return false;
      }

      if (silent && rawInput === lastValidatedRegSponsorRef.current) return registrationSponsorValidatedRef.current;

      setValidatingRegistrationSponsor(true);
      if (!silent) setRegistrationSponsorError('');

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

        if (rawInput.startsWith('0x') && rawInput.length === 42) {
          const info = normalizeRegistration(await userIdByAdd(rawInput));
          if (!info.registered) throw new Error('Sponsor wallet is not registered in Ocean ecosystem.');
          resolvedAddress = rawInput;
          resolvedId = info.id;
        } else {
          const n = Number(rawInput);
          if (!Number.isFinite(n) || n <= 0) throw new Error('Enter a valid numeric sponsor ID.');
          const addr = await checkUserById(n);
          if (!addr || typeof addr !== 'string' || addr.length !== 42 || !addr.startsWith('0x') || /^0x0{40}$/i.test(addr)) {
            throw new Error('Sponsor not found for that ID.');
          }
          const info = normalizeRegistration(await userIdByAdd(addr));
          if (!info.registered) throw new Error('Sponsor wallet is not registered in Ocean ecosystem.');
          resolvedAddress = addr;
          resolvedId = info.id ?? n;
        }

        if (!resolvedAddress || /^0x0{40}$/i.test(resolvedAddress)) throw new Error('Invalid sponsor address.');

        setRegistrationSponsorInfo({ address: resolvedAddress, id: resolvedId != null ? Number(resolvedId) : null });
        setRegistrationSponsorValidated(true);
        registrationSponsorValidatedRef.current = true;
        setRegistrationSponsorError('');
        if (!rawInput.startsWith('0x')) {
          setRegistrationSponsor(resolvedAddress);
          latestRegSponsorRef.current = resolvedAddress;
        }
        lastValidatedRegSponsorRef.current = resolvedAddress;
        return true;
      } catch (err) {
        if (!silent) setRegistrationSponsorError(err?.message || 'Unable to validate sponsor.');
        setRegistrationSponsorValidated(false);
        registrationSponsorValidatedRef.current = false;
        setRegistrationSponsorInfo(null);
        lastValidatedRegSponsorRef.current = '';
        return false;
      } finally {
        setValidatingRegistrationSponsor(false);
      }
    },
    [userIdByAdd, checkUserById]
  );

  useEffect(() => {
    if (!showRegisterModal) return;
    const trimmed = (registrationSponsor || '').trim();
    if (!trimmed) {
      lastValidatedRegSponsorRef.current = '';
      return;
    }
    if (trimmed === lastValidatedRegSponsorRef.current) return;
    const handle = setTimeout(() => validateRegistrationSponsor({ silent: true, value: trimmed }), 700);
    return () => clearTimeout(handle);
  }, [registrationSponsor, showRegisterModal, validateRegistrationSponsor]);

  const handleCancelRegistration = () => {
    setShowRegisterModal(false);
    setUnregisteredBeneficiary('');
    setRegistrationSponsor('');
    setRegistrationSponsorValidated(false);
    setRegistrationSponsorInfo(null);
    setRegistrationSponsorError('');
    setBeneficiaryAddress('');
    setSponsorValidated(false);
    setSponsorInfo(null);
    setSponsorError('');
  };

  // Live RAMA update every 4 seconds when registration modal is open
  useEffect(() => {
    if (!showRegisterModal || stakeAmountNum <= 0) return;
    
    const updateRama = async () => {
      try {
        await GetUsdToRama(stakeAmountNum);
      } catch (error) {
        console.log('Failed to update RAMA:', error);
      }
    };

    // Initial update
    updateRama();

    // Update every 4 seconds
    const interval = setInterval(updateRama, 4000);

    return () => clearInterval(interval);
  }, [showRegisterModal, stakeAmountNum]);

  const handleConfirmRegistration = async () => {
    if (!registrationSponsorValidated) {
      setRegistrationSponsorError('Please validate the sponsor address first.');
      return;
    }

    setIsStaking(true);
    setTxStage('initiated');
    setTxModalOpen(true);
    setShowRegisterModal(false);

    try {
      let response;
      
      if (stakeType === 'self' && useWallet === 'external') {
        response = await CreateSelfPort(address, stakeAmountNum);
      } else if (stakeType === 'other' && useWallet === 'external') {
        response = await CreateOtherfPort(address,beneficiaryAddress, stakeAmountNum,registrationSponsor);
      } else if (stakeType === 'self' && useWallet === 'safe') {
        response = await SafeSelfPort(address, stakeAmountNum);
      } else if (stakeType === 'other' && useWallet === 'safe') {
        response = await SafeOtherPort(registrationSponsor, beneficiaryAddress, stakeAmountNum);
      }

      if (response) {
        setTrxData(response);
        // After successful registration, mark beneficiary as validated
        setSponsorInfo({ address: unregisteredBeneficiary, id: null });
        setSponsorValidated(true);
        sponsorValidatedRef.current = true;
        lastValidatedRef.current = unregisteredBeneficiary;
      } else {
        setTxStage('error');
        setTxError('Unable to build registration transaction.');
        setIsStaking(false);
      }
    } catch (err) {
      console.error('Registration failed:', err);
      setTxStage('error');
      setTxError(err?.message || 'Unexpected error during registration.');
      setIsStaking(false);
    }
  };



  const CreateNewPortFolio = async () => {
    if (isStaking) return;
    setError('');

    // Basic validations
    if (!isConnected || !address) {
      setError('Connect your wallet to continue.');
      return;
    }
    if (!Number.isFinite(stakeAmountNum) || stakeAmountNum < MIN_USD || stakeAmountNum > MAX_USD) {
      setError(`Amount must be between $${MIN_USD.toLocaleString()} and $${MAX_USD.toLocaleString()}.`);
      return;
    }
    if (!isSufficientBalance) {
      setError('Insufficient balance in selected wallet.');
      return;
    }
    if (stakeType === 'other') {
      const ok = await validateSponsor({ silent: false, value: beneficiaryAddress });
      if (!ok) {
        setError('Please enter a valid registered beneficiary.');
        return;
      }
    }

    setIsStaking(true);
    setTxStage('initiated');
    setTxModalOpen(true);

    try {
      let response;
      if (stakeType === 'self' && useWallet === 'external') {
        response = await CreateSelfPort(address, stakeAmountNum);
      } else if (stakeType === 'other' && useWallet === 'external') {
        // For already registered users, use the connected user as referrer
        response = await CreateOtherfPort(address, beneficiaryAddress, stakeAmountNum, address);
      } else if (stakeType === 'self' && useWallet === 'safe') {
        response = await SafeSelfPort(address, stakeAmountNum);
      } else if (stakeType === 'other' && useWallet === 'safe') {
        response = await SafeOtherPort(address, beneficiaryAddress, stakeAmountNum);
      }

      if (response) {
        setTrxData(response);
      } else {
        setTxStage('error');
        setTxError('Unable to build staking transaction.');
        setIsStaking(false);
      }
    } catch (err) {
      console.error('CreateNewPortFolio failed:', err);
      setTxStage('error');
      setTxError(err?.message || 'Unexpected error. Please try again.');
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
    address: userAddress || undefined
  });

  useEffect(() => {
    const fetchedBalance = async () => {
      try {
        const balance = await refetch();
        const raw = Number(balance?.data?.value);
        const symbol = balance?.data?.symbol?.toString() || 'RAMA';
        const rama = Number.isFinite(raw) ? raw / 1e18 : 0;
        setWalletBalanceNum(rama);
        setWalletBalanceDisplay(`${rama.toFixed(4)} ${symbol}`);

      } catch (error) {
        console.log(error)
      }
    }

    fetchedBalance();

  }, [address, isSuccess, isError, receipt])


  useEffect(() => {
    fetchStakeInvest()
  }, [])

  // Fetch current user ID
  useEffect(() => {
    const fetchCurrentUserId = async () => {
      if (!address) return;
      try {
        const info = await userIdByAdd(address);
        if (info && (info.id || info[1])) {
          const id = info.id ?? info[1];
          setCurrentUserId(Number(id));
        }
      } catch (error) {
        console.log('Failed to fetch user ID:', error);
      }
    };
    fetchCurrentUserId();
  }, [address, userIdByAdd]);

  // Countdown timer and auto-redirect on success
  useEffect(() => {
    if (txStage === 'success') {
      setSuccessCountdown(10);
      
      const timer = setInterval(() => {
        setSuccessCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            // Reset form and refresh
            setStakeAmount('10');
            setBeneficiaryAddress('');
            setSponsorValidated(false);
            setSponsorInfo(null);
            setSponsorError('');
            setTxModalOpen(false);
            setTxStage('idle');
            setTxError('');
            setTrxData(undefined);
            setTrxHash(undefined);
            setIsStaking(false);
            
            // Refresh the page
            window.location.reload();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [txStage]);



  return (
    <div className="space-y-4 sm:space-y-6 pb-20 lg:pb-6">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-neon-green relative inline-block">
          Stake & Invest
          <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 to-neon-green/20 blur-xl -z-10" />
        </h1>
        <p className="text-cyan-300/90 mt-1 text-sm sm:text-base">Activate or top-up your portfolio</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          <div className="cyber-glass rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-cyan-500/30 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
            <h2 className="text-base sm:text-lg font-semibold text-cyan-300 mb-4 uppercase tracking-wide">New Stake</h2>

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
                    min={MIN_USD}
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

                {/* Last portfolio rule hint */}
                <div className="mt-2 text-xs text-cyan-300/80">
                  {stakeType === 'self' ? (
                    loadingLastSelf ? (
                      <p>Checking your last portfolio…</p>
                    ) : lastSelfInfo?.hasPortfolio ? (
                      <p>Rule: New stake must be ≥ your last portfolio (${lastSelfInfo.amountUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}).</p>
                    ) : (
                      <p>Rule: Minimum stake ${MIN_USD} (no previous portfolio found).</p>
                    )
                  ) : (
                    // Other flow
                    <>
                      {sponsorValidated ? (
                        loadingLastOther ? (
                          <p>Checking beneficiary's last portfolio…</p>
                        ) : lastOtherInfo?.hasPortfolio ? (
                          <p>Rule: New stake for beneficiary must be ≥ their last portfolio (${lastOtherInfo.amountUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}).</p>
                        ) : (
                          <p>Rule: Minimum stake ${MIN_USD} (beneficiary has no previous portfolio).</p>
                        )
                      ) : (
                        // Show preview while typing
                        loadingLastOtherPreview ? (
                          <p>Checking beneficiary's last portfolio…</p>
                        ) : lastOtherPreview?.hasPortfolio ? (
                          <p>Rule: New stake for beneficiary must be ≥ their last portfolio (${lastOtherPreview.amountUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}).</p>
                        ) : (
                          <p>Enter address or ID to preview beneficiary's last portfolio minimum.</p>
                        )
                      )}
                    </>
                  )}
                  {minStakeRequired > MIN_USD && (
                    <p className="mt-1 text-neon-orange">Required minimum now: ${minStakeRequired.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  )}
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

                {stakeAmountNum > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-sm text-neon-green flex items-center gap-2">
                      <CheckCircle size={16} />
                      ≈ {ramaStake ? Number(ramaStake).toFixed(4) : '—'} RAMA
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

                {(() => {
                  const delta = minStakeRequired - stakeAmountNum;
                  return stakeAmountNum > 0 && !isMinimumMet && delta > 0.0001 ? (
                    <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2">
                      <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5" size={16} />
                      <p className="text-sm text-red-300">
                        Minimum stake is ${minStakeRequired.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}. You need ${delta.toFixed(2)} more.
                      </p>
                    </div>
                  ) : null;
                })()}
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
                      onChange={(e) => {
                        setBeneficiaryAddress(e.target.value);
                        sponsorValidatedRef.current = false;
                        setSponsorValidated(false);
                        setSponsorInfo(null);
                        setSponsorError('');
                      }}
                      placeholder="0x... or USER123456"
                      className={`w-full pl-4 pr-24 py-3 bg-dark-900/50 border rounded-lg focus:outline-none focus:ring-2 text-cyan-300 placeholder-cyan-400/30 font-mono transition-all ${sponsorValidated
                        ? 'border-neon-green/50 focus:ring-neon-green'
                        : sponsorError
                          ? 'border-red-500/50 focus:ring-red-500'
                          : 'border-cyan-500/30 focus:ring-cyan-500'
                        }`}
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                      {validationPending && (
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
                      <button
                        type="button"
                        onClick={() => validateSponsor({ silent: false })}
                        disabled={validationPending || !beneficiaryAddress.trim()}
                        className="p-2 hover:bg-cyan-500/10 rounded-lg transition-colors text-xs border border-cyan-500/30 text-cyan-100 disabled:opacity-50"
                        title="Validate beneficiary"
                      >
                        {validationPending ? <Loader2 size={16} className="animate-spin" /> : 'Validate'}
                      </button>
                    </div>
                  </div>
                  {sponsorValidated && sponsorInfo && (
                    <div className="mt-2 p-2 rounded-lg flex items-center gap-2 text-sm bg-neon-green/10 text-neon-green">
                      <CheckCircle size={16} />
                      <span>Beneficiary validated</span>
                      <span className="text-xs opacity-75">{sponsorInfo.id ? `USR-${String(sponsorInfo.id).padStart(4,'0')} • ` : ''}{`${sponsorInfo.address.slice(0,10)}...${sponsorInfo.address.slice(-6)}`}</span>
                    </div>
                  )}
                  {sponsorError && (
                    <div className="mt-2 p-2 rounded-lg flex items-center gap-2 text-sm bg-red-500/10 text-red-300">
                      <AlertCircle size={16} />
                      <span>{sponsorError}</span>
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
                      <p className="text-lg font-bold text-cyan-300">{walletBalanceDisplay}</p>
                      <p>{connectedWalletUsd.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</p>
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
                      <p className="text-lg font-bold text-neon-green">{safeWalletBalance.toFixed(4)} RAMA</p>
                      <p>{safeWalletUsd.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</p>
                    </div>
                  </button>
                </div>

                {!isSufficientBalance && stakeAmountNum > 0 && (
                  <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2">
                    <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5" size={16} />
                    <div className="flex-1">
                      <p className="text-sm text-red-300 font-medium">Insufficient Balance</p>
                      <p className="text-xs text-red-300/80 mt-1">
                        You need ${stakeAmountNum.toFixed(2)} but only have ${selectedWalletBalanceUSD.toFixed(2)} in selected wallet.
                        {useWallet === 'external' && safeWalletBalance * ramaPrice >= stakeAmountNum && (
                          <span className="block mt-1 text-neon-green">Try using Safe Wallet instead.</span>
                        )}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={CreateNewPortFolio}
                disabled={isStaking || !isConnected || !canStake}
                className={`w-full cursor-pointer py-4 rounded-lg bg-cyan-900 font-bold uppercase tracking-wide transition-all relative overflow-hidden group ${canStake && !isStaking
                  ? 'bg-gradient-to-r from-cyan-500 to-cyan-800 cursor-pointer'
                  : 'bg-gradient-to-r from-cyan-500 to-cyan-800'
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
                        Stake Now {stakeAmountNum > 0 && `$ ${stakeAmountNum}`}
                      </>
                    )}
                  </span>
                ):(
                  <div className="relative z-10 flex items-center justify-center gap-2">
                    Connect Wallet
                  </div>
                )}
              </button>

              {!canStake && (
                <div className="text-xs text-cyan-300/70 text-center space-y-1">
                  {/* Minimum stake line removed per request; dynamic rule is hinted above */}
                  {!isSufficientBalance && <p>• Insufficient balance in selected wallet</p>}
                  {stakeType === 'other' && !sponsorValidated && <p>• Valid registered beneficiary required</p>}
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

          {stakeAmountNum >= MIN_USD && (
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

          {stakeAmountNum > 0 && !isMinimumMet && (
            <div className="cyber-glass border border-red-500/50 rounded-xl p-4 flex gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <AlertCircle className="text-red-400 flex-shrink-0 animate-pulse" size={20} />
              <div>
                <p className="text-sm font-medium text-red-300 uppercase tracking-wide">Minimum Stake Required</p>
                <p className="text-xs text-red-400/70 mt-1">
                  The minimum activation amount is ${MIN_USD}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent Portfolio Creations */}
      <RecentCreationHistory
        userAddress={address}
        getDashboardDetails={getDashboardDetails}
        getIncomeTransaction={getIncomeTransaction}
      />

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
                Stake {stakeAmountNum > 0 && `$ ${stakeAmountNum.toFixed(2)}`}
              </>
            )}
          </span>
        </button>
      </div>

      {txModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-dark-950/80 backdrop-blur">
          <div className="w-full max-w-md cyber-glass border border-cyan-500/30 rounded-2xl p-6 sm:p-8 relative overflow-hidden">
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
                  onClick={() => { setTxModalOpen(false); setTxStage('idle'); setTxError(''); setTrxData(undefined); setTrxHash(undefined); }}
                  className="w-full py-3 bg-gradient-to-r from-cyan-500 to-neon-green text-dark-950 rounded-xl font-bold hover:shadow-neon-cyan transition-all"
                >
                  Close & retry
                </button>
              </div>
            ) : txStage === 'success' ? (
              <div className="space-y-5 text-center">
                <div className="mx-auto w-16 h-16 rounded-full border border-neon-green/50 bg-neon-green/10 flex items-center justify-center">
                  <CheckCircle size={32} className="text-neon-green" />
                </div>
                <h3 className="text-2xl font-semibold text-cyan-100">Stake complete</h3>
                <p className="text-sm text-cyan-300/80">Your staking transaction is confirmed on-chain.</p>
                
                {/* Countdown Timer */}
                <div className="cyber-glass border border-cyan-500/30 rounded-xl px-4 py-3 bg-cyan-500/5">
                  <p className="text-xs text-cyan-300/70 mb-2">Redirecting in</p>
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-12 h-12 rounded-full border-2 border-cyan-500 bg-cyan-500/10 flex items-center justify-center">
                      <span className="text-2xl font-bold text-cyan-100">{successCountdown}</span>
                    </div>
                    <span className="text-sm text-cyan-300/80">seconds</span>
                  </div>
                  <p className="text-xs text-cyan-300/60 mt-2">Page will refresh automatically</p>
                </div>

                {trxHash && (
                  <div className="cyber-glass border border-cyan-500/30 rounded-xl px-4 py-3 text-left text-xs text-cyan-200/90">
                    <p className="mb-2 uppercase tracking-wider text-[11px] text-cyan-300/70">Transaction Hash</p>
                    <p className="font-semibold text-cyan-100">{`${trxHash.slice(0, 10)}...${trxHash.slice(-8)}`}</p>
                    <p className="mt-2 break-all font-mono text-[11px] text-cyan-300/70">{trxHash}</p>
                  </div>
                )}
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
                      setStakeAmount('10');
                      setBeneficiaryAddress('');
                      setSponsorValidated(false);
                      setSponsorInfo(null);
                      setSponsorError('');
                      setTxModalOpen(false); 
                      setTxStage('idle'); 
                      setTxError(''); 
                      setTrxData(undefined); 
                      setTrxHash(undefined);
                      setIsStaking(false);
                      window.location.reload();
                    }}
                    className="w-full py-3 bg-gradient-to-r from-cyan-500 to-neon-green text-dark-950 rounded-xl font-bold hover:shadow-neon-cyan transition-all"
                  >
                    Close & Refresh Now
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center text-center space-y-5">
                <div className="w-16 h-16 rounded-full border border-cyan-500/50 bg-cyan-500/10 flex items-center justify-center">
                  <Loader2 size={32} className="text-cyan-200 animate-spin" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-cyan-200">{STAGE_CONTENT[txStage]?.title ?? 'Processing request'}</h3>
                  <p className="text-sm text-cyan-300/80">{STAGE_CONTENT[txStage]?.subtitle ?? 'Hang tight while we process your transaction.'}</p>
                </div>
                <div className="w-full space-y-3">
                  {STAKE_STAGE_FLOW.map((stageKey) => {
                    const stageIndex = STAKE_STAGE_FLOW.indexOf(stageKey);
                    const activeIndex = STAKE_STAGE_FLOW.indexOf(txStage);
                    const isComplete = activeIndex > stageIndex;
                    const isActive = activeIndex === stageIndex;
                    return (
                      <div
                        key={stageKey}
                        className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-3 ${
                          isComplete ? 'border-neon-green/60 bg-neon-green/10' : isActive ? 'border-cyan-500/60 bg-cyan-500/10' : 'border-cyan-500/20 bg-dark-900/60'
                        }`}
                      >
                        <div className="text-left">
                          <p className="text-sm font-medium text-cyan-100">{STAGE_CONTENT[stageKey]?.title ?? stageKey}</p>
                          <p className="text-[11px] text-cyan-300/70">{STAGE_CONTENT[stageKey]?.subtitle ?? ''}</p>
                        </div>
                        {isComplete ? <CheckCircle size={16} className="text-neon-green" /> : isActive ? <Loader2 size={16} className="text-cyan-300 animate-spin" /> : <span className="h-2 w-2 rounded-full bg-cyan-500/40" />}
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-cyan-300/70">Need to cancel? Reject the transaction in your wallet.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-dark-950/80 backdrop-blur p-4 overflow-y-auto">
          <div className="w-full max-w-2xl cyber-glass border border-cyan-500/30 rounded-2xl p-4 sm:p-6 lg:p-8 relative overflow-hidden my-4 sm:my-8 max-h-[calc(100vh-2rem)] sm:max-h-[90vh] overflow-y-auto">
            <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/70 to-transparent" />
            
            <div className="space-y-4 sm:space-y-5">
              <div className="text-center">
                <div className="mx-auto w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-full border border-neon-orange/50 bg-neon-orange/10 flex items-center justify-center mb-3 sm:mb-4">
                  <AlertCircle size={24} className="sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-neon-orange" />
                </div>
                <h3 className="text-lg sm:text-xl lg:text-2xl font-semibold text-cyan-100">Beneficiary Not Registered</h3>
                <p className="text-xs sm:text-sm text-cyan-300/80 mt-2 px-2">
                  This wallet address is not registered in the Ocean ecosystem yet.
                </p>
              </div>

              <div className="cyber-glass border border-cyan-500/20 rounded-xl px-3 py-2 sm:px-4 sm:py-3">
                <p className="text-[10px] sm:text-xs uppercase tracking-wider text-cyan-300/70 mb-1">Beneficiary Address</p>
                <p className="font-mono text-xs sm:text-sm text-cyan-100 break-all">{unregisteredBeneficiary}</p>
              </div>

              <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-3 sm:p-4">
                <p className="text-xs sm:text-sm font-semibold text-cyan-100 mb-2">Do you want to register this user?</p>
                <p className="text-[10px] sm:text-xs text-cyan-300/80 leading-relaxed">
                  You can register this beneficiary by providing a valid sponsor address from the Ocean ecosystem. 
                  After registration, your stake will be created for them.
                </p>
              </div>

              {!registrationSponsorValidated ? (
                <>
                  <div className="space-y-3">
                    <label className="block text-xs sm:text-sm font-medium text-cyan-400 uppercase tracking-wide">
                      Sponsor Address or ID
                    </label>
                    
                    {/* Connected Address Suggestion */}
                    {address && (
                      <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] sm:text-xs text-cyan-300/80 uppercase tracking-wider mb-1">
                              Your Connected Address
                            </p>
                            <p className="font-mono text-xs sm:text-sm text-cyan-200 truncate">
                              {address}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 ml-3">
                            <CopyButton 
                              text={address}
                              label=""
                              className="!p-1.5 bg-cyan-500/10 hover:bg-cyan-500/20"
                              iconClassName="text-cyan-400"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setRegistrationSponsor(address);
                                registrationSponsorValidatedRef.current = false;
                                setRegistrationSponsorValidated(false);
                                setRegistrationSponsorInfo(null);
                                setRegistrationSponsorError('');
                              }}
                              className="px-2 py-1 text-[10px] sm:text-xs bg-cyan-500/20 text-cyan-100 rounded-md hover:bg-cyan-500/30 transition-colors"
                            >
                              Use This
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="relative">
                      <input
                        type="text"
                        value={registrationSponsor}
                        onChange={(e) => {
                          setRegistrationSponsor(e.target.value);
                          registrationSponsorValidatedRef.current = false;
                          setRegistrationSponsorValidated(false);
                          setRegistrationSponsorInfo(null);
                          setRegistrationSponsorError('');
                        }}
                        placeholder="0x... or sponsor ID"
                        className={`w-full pl-3 pr-20 sm:pl-4 sm:pr-24 py-2 sm:py-3 bg-dark-900/50 border rounded-lg focus:outline-none focus:ring-2 text-cyan-300 placeholder-cyan-400/30 font-mono transition-all text-xs sm:text-sm ${
                          registrationSponsorValidated
                            ? 'border-neon-green/50 focus:ring-neon-green'
                            : registrationSponsorError
                            ? 'border-red-500/50 focus:ring-red-500'
                            : 'border-cyan-500/30 focus:ring-cyan-500'
                        }`}
                      />
                      <div className="absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        {validatingRegistrationSponsor && (
                          <Loader2 size={14} className="animate-spin text-cyan-400 sm:w-4 sm:h-4" />
                        )}
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const text = await navigator.clipboard.readText();
                              setRegistrationSponsor(text.trim());
                            } catch {}
                          }}
                          className="p-1.5 sm:p-2 hover:bg-cyan-500/10 rounded-lg transition-colors"
                          title="Paste from clipboard"
                        >
                          <Clipboard size={14} className="text-cyan-400/60 hover:text-cyan-400 sm:w-4 sm:h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => validateRegistrationSponsor({ silent: false })}
                          disabled={validatingRegistrationSponsor || !registrationSponsor.trim()}
                          className="px-2 py-1 sm:px-3 sm:py-1.5 text-[10px] sm:text-xs border border-cyan-500/30 text-cyan-100 rounded-lg hover:bg-cyan-500/10 transition-colors disabled:opacity-50"
                        >
                          Validate
                        </button>
                      </div>
                    </div>
                    {registrationSponsorError && (
                      <div className="flex items-center gap-2 text-[10px] sm:text-xs text-red-400">
                        <AlertCircle size={12} className="sm:w-3.5 sm:h-3.5" />
                        <span>{registrationSponsorError}</span>
                      </div>
                    )}
                    {registrationSponsorValidated && registrationSponsorInfo && (
                      <div className="flex items-center gap-2 text-xs sm:text-sm text-neon-green">
                        <CheckCircle size={14} className="sm:w-4 sm:h-4" />
                        <span>Sponsor validated</span>
                        <span className="text-[10px] sm:text-xs opacity-75">
                          {registrationSponsorInfo.id ? `USR-${String(registrationSponsorInfo.id).padStart(4, '0')} • ` : ''}
                          {`${registrationSponsorInfo.address.slice(0, 10)}...${registrationSponsorInfo.address.slice(-6)}`}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-3 pt-2 pb-4 sm:pb-0">
                    <button
                      type="button"
                      onClick={handleCancelRegistration}
                      className="w-full sm:flex-1 py-3 sm:py-2.5 lg:py-3 border border-cyan-500/40 text-cyan-300 rounded-xl hover:bg-cyan-500/10 transition-all font-semibold text-sm"
                    >
                      No, Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmRegistration}
                      disabled={!registrationSponsorValidated}
                      className={`w-full sm:flex-1 py-3 sm:py-2.5 lg:py-3 rounded-xl font-semibold transition-all text-sm ${
                        registrationSponsorValidated
                          ? 'bg-gradient-to-r from-cyan-500 to-neon-green text-dark-950 hover:shadow-neon-cyan cursor-pointer'
                          : 'bg-dark-700/50 text-cyan-400/40 cursor-not-allowed'
                      }`}
                    >
                      Yes, Register & Stake
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="cyber-glass border border-neon-green/30 rounded-xl p-3 sm:p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle size={16} className="text-neon-green sm:w-5 sm:h-5" />
                        <span className="text-xs sm:text-sm font-semibold text-neon-green">Sponsor Validated</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setRegistrationSponsorValidated(false);
                          setRegistrationSponsorInfo(null);
                          setRegistrationSponsor('');
                          setRegistrationSponsorError('');
                          registrationSponsorValidatedRef.current = false;
                          lastValidatedRegSponsorRef.current = '';
                        }}
                        className="px-2 py-1 sm:px-3 sm:py-1.5 text-[10px] sm:text-xs border border-cyan-500/40 text-cyan-300 rounded-lg hover:bg-cyan-500/10 transition-all"
                      >
                        Change Sponsor
                      </button>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] sm:text-xs uppercase tracking-wider text-cyan-300/70">Sponsor ID</span>
                        <span className="text-xs sm:text-sm font-bold text-neon-green">
                          {registrationSponsorInfo?.id ? `USR-${String(registrationSponsorInfo.id).padStart(4, '0')}` : 'N/A'}
                        </span>
                      </div>
                      <div>
                        <p className="text-[10px] sm:text-xs uppercase tracking-wider text-cyan-300/70 mb-1">Sponsor Address</p>
                        <p className="font-mono text-xs sm:text-sm text-cyan-100 break-all">
                          {registrationSponsorInfo?.address || '—'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Staking Summary */}
                  <div className="cyber-glass border border-cyan-500/30 rounded-xl p-3 sm:p-4 bg-dark-900/40">
                    <h4 className="text-sm sm:text-base font-semibold text-cyan-100 mb-3 uppercase tracking-wide flex items-center gap-2">
                      <Info size={16} className="text-cyan-400 sm:w-5 sm:h-5" />
                      Staking Summary
                    </h4>
                    
                    <div className="grid gap-3">
                      {/* Staking Amount */}
                      <div className="cyber-glass border border-cyan-500/20 rounded-lg p-2.5 sm:p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] sm:text-xs uppercase tracking-wider text-cyan-300/70">Staking Amount</span>
                          <span className="text-xs sm:text-sm font-bold text-cyan-100">${stakeAmountNum.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] sm:text-xs uppercase tracking-wider text-cyan-300/70">Required RAMA</span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs sm:text-sm font-bold text-neon-green">
                              {ramaStake ? Number(ramaStake).toFixed(4) : '—'} RAMA
                            </span>
                            <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-neon-green animate-pulse" title="Live update every 4s" />
                          </div>
                        </div>
                        <p className="text-[9px] sm:text-[10px] text-cyan-400/60 mt-1.5">
                          * Live price may fluctuate. Updates every 4 seconds.
                        </p>
                      </div>

                      {/* Beneficiary Info */}
                      <div className="cyber-glass border border-cyan-500/20 rounded-lg p-2.5 sm:p-3">
                        <p className="text-[10px] sm:text-xs uppercase tracking-wider text-cyan-300/70 mb-1.5">Beneficiary</p>
                        <p className="font-mono text-[10px] sm:text-xs text-cyan-100 break-all mb-2">{unregisteredBeneficiary}</p>
                        <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-neon-orange">
                          <AlertCircle size={12} className="sm:w-3.5 sm:h-3.5" />
                          <span>New registration required</span>
                        </div>
                      </div>

                      {/* Sponsor Info */}
                      <div className="cyber-glass border border-neon-green/20 rounded-lg p-2.5 sm:p-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] sm:text-xs uppercase tracking-wider text-cyan-300/70">Sponsor ID</span>
                          <span className="text-xs sm:text-sm font-bold text-neon-green">
                            {registrationSponsorInfo?.id ? `USR-${String(registrationSponsorInfo.id).padStart(4, '0')}` : 'N/A'}
                          </span>
                        </div>
                        <p className="text-[10px] sm:text-xs uppercase tracking-wider text-cyan-300/70 mb-1">Sponsor Address</p>
                        <p className="font-mono text-[10px] sm:text-xs text-neon-green/90 break-all">{registrationSponsorInfo?.address || '—'}</p>
                      </div>

                      {/* Your Info */}
                      <div className="cyber-glass border border-cyan-500/20 rounded-lg p-2.5 sm:p-3 bg-cyan-500/5">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] sm:text-xs uppercase tracking-wider text-cyan-300/70">Your ID</span>
                          <span className="text-xs sm:text-sm font-bold text-cyan-100">
                            {currentUserId ? `USR-${String(currentUserId).padStart(4, '0')}` : 'N/A'}
                          </span>
                        </div>
                        <p className="text-[10px] sm:text-xs uppercase tracking-wider text-cyan-300/70 mb-1">Your Address</p>
                        <p className="font-mono text-[10px] sm:text-xs text-cyan-100 break-all">{address || '—'}</p>
                      </div>

                      {/* Funding Source */}
                      <div className="cyber-glass border border-cyan-500/20 rounded-lg p-2.5 sm:p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] sm:text-xs uppercase tracking-wider text-cyan-300/70">Funding Source</span>
                          <span className="text-xs sm:text-sm font-semibold text-cyan-100">
                            {useWallet === 'external' ? 'Connected Wallet' : 'Safe Wallet'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-3 pt-2 pb-4 sm:pb-0">
                    <button
                      type="button"
                      onClick={handleCancelRegistration}
                      className="w-full sm:flex-1 py-3 sm:py-2.5 lg:py-3 border border-cyan-500/40 text-cyan-300 rounded-xl hover:bg-cyan-500/10 transition-all font-semibold text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmRegistration}
                      className="w-full sm:flex-1 py-3 sm:py-2.5 lg:py-3 bg-gradient-to-r from-cyan-500 to-neon-green text-dark-950 rounded-xl font-semibold hover:shadow-neon-cyan transition-all text-sm"
                    >
                      Register & Stake Now
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Lightweight component to show recent creations by self (from dashboards) and from Safe Wallet ledger
function RecentCreationHistory({ userAddress, getDashboardDetails, getIncomeTransaction }) {
  const [selfRows, setSelfRows] = useState([]);
  const [safeRows, setSafeRows] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        setLoading(true);
        const tasks = [];
        // Self portfolios (from dashboard portfolios)
        if (userAddress && typeof getDashboardDetails === 'function') {
          tasks.push(
            getDashboardDetails(userAddress)
              .then((d) => {
                const ports = Array.isArray(d?.portfolios) ? d.portfolios : [];
                const rows = ports
                  .map((p) => ({
                    pid: p?.pid,
                    amountUsd: Number(p?.principalUsd ?? 0),
                    createdAt: Number(p?.createdAt ?? 0),
                  }))
                  .filter((r) => Number.isFinite(r.amountUsd) && r.amountUsd > 0)
                  .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
                  .slice(0, 5);
                if (!cancelled) setSelfRows(rows);
              })
              .catch(() => { if (!cancelled) setSelfRows([]); })
          );
        }

        // Safe Wallet creations via income ledger kind=8
        if (userAddress && typeof getIncomeTransaction === 'function') {
          tasks.push(
            getIncomeTransaction(userAddress, 8, 10, 0)
              .then((res) => {
                const slices = (res && (res[0] || res.slice)) || [];
                const rows = slices.map((item) => {
                  const usdRaw = item?.usdAmount ?? item?.[2] ?? '0';
                  const ts = Number(item?.timestamp ?? item?.[5] ?? 0);
                  const pid = Number(item?.pid ?? item?.[7] ?? 0);
                  // usdAmount is micro USD in most views
                  const amt = Number(usdRaw) / 1e6;
                  return { pid, amountUsd: amt, createdAt: ts };
                });
                const normalized = rows
                  .filter((r) => Number.isFinite(r.amountUsd) && r.amountUsd > 0)
                  .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
                if (!cancelled) setSafeRows(normalized);
              })
              .catch(() => { if (!cancelled) setSafeRows([]); })
          );
        }

        await Promise.all(tasks);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [userAddress, getDashboardDetails, getIncomeTransaction]);

  if (!userAddress) return null;

  return (
    <div className="mt-6 grid lg:grid-cols-2 gap-6">
      <div className="cyber-glass rounded-2xl p-4 sm:p-6 border border-cyan-500/30 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
        <h3 className="text-lg font-semibold text-cyan-300 mb-4 uppercase tracking-wide">Your Recent Portfolios</h3>
        {loading && selfRows.length === 0 ? (
          <p className="text-sm text-cyan-300/80">Loading…</p>
        ) : selfRows.length === 0 ? (
          <p className="text-sm text-cyan-300/60">No portfolios found.</p>
        ) : (
          <div className="space-y-2">
            {selfRows.map((r) => (
              <div key={`self-${r.pid}-${r.createdAt}`} className="flex items-center justify-between p-2 border border-cyan-500/20 rounded-lg">
                <div className="text-cyan-200 text-sm">PID #{r.pid ?? '—'}</div>
                <div className="text-neon-green font-semibold">{(r.amountUsd || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="cyber-glass rounded-2xl p-4 sm:p-6 border border-neon-green/30 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-neon-green/50 to-transparent" />
        <h3 className="text-lg font-semibold text-neon-green mb-4 uppercase tracking-wide">Safe Wallet Creations</h3>
        {loading && safeRows.length === 0 ? (
          <p className="text-sm text-cyan-300/80">Loading…</p>
        ) : safeRows.length === 0 ? (
          <p className="text-sm text-cyan-300/60">No recent safe wallet creations.</p>
        ) : (
          <div className="space-y-2">
            {safeRows.slice(0, 5).map((r, idx) => (
              <div key={`safe-${r.pid}-${r.createdAt}-${idx}`} className="flex items-center justify-between p-2 border border-neon-green/20 rounded-lg">
                <div className="text-cyan-200 text-sm">PID #{r.pid || '—'}</div>
                <div className="text-neon-green font-semibold">{(r.amountUsd || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}