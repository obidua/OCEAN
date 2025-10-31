import React, { useEffect, useRef } from 'react';
import { Routes, Route, BrowserRouter, useLocation, useNavigate } from 'react-router-dom';
import Layout from './components/Layout';
import ScrollToTop from './components/ScrollToTop';
import Dashboard from './pages/Dashboard';
import PortfolioOverview from './pages/PortfolioOverview';
import StakeInvest from './pages/StakeInvest';
import TeamNetwork from './pages/TeamNetwork';
import TeamMemberDetails from './pages/TeamMemberDetails';
import SlabIncome from './pages/SlabIncome';
import RoyaltyProgram from './pages/RoyaltyProgram';
import OneTimeRewards from './pages/OneTimeRewards';
import MissedIncome from './pages/MissedIncome';
import MissedIncomeHistory from './pages/MissedIncomeHistory';
import SafeWallet from './pages/SafeWallet';
import TransactionHistory from './pages/TransactionHistory';
import Analytics from './pages/Analytics';
import About from './pages/About';
import Settings from './pages/Settings';
import Login from './pages/Login';
import Signup from './pages/Signup';
import AccruedRewards from './pages/AccruedRewards';
import Home from './pages/Home';
import HowItWorks from './pages/HowItWorks';
import Features from './pages/Features';
import MoneyRevolution from './pages/MoneyRevolution';
import BlockchainBasics from './pages/BlockchainBasics';
import SmartContracts from './pages/SmartContracts';
import WhatIsDefi from './pages/WhatIsDefi';
import RamesttaBlockchain from './pages/RamesttaBlockchain';
import RamaTokenomics from './pages/RamaTokenomics';
import ValidatorSecurity from './pages/ValidatorSecurity';
import AboutPublic from './pages/AboutPublic';
import Presentation from './pages/Presentation';
import OceanDefiGuide from './pages/OceanDefiGuide';
import SpotIncome from './pages/SpotIncome';
import ReferralLanding from './pages/ReferralLanding';
import SlabManagerDebugger from './components/SlabManagerDebugger';
import { useAppKitAccount } from '@reown/appkit/react';
import { useStore } from '../store/useUserInfoStore';

function WalletSessionManager() {
  const { address, isConnected } = useAppKitAccount();
  const navigate = useNavigate();
  const location = useLocation();
  const isUserRegistered = useStore((s) => s.isUserRegisterd);
  const setUserAddress = useStore((s) => s.setUserAddress);
  const clearUserAddress = useStore((s) => s.clearUserAddress);

  const checkingRef = useRef(false);

  useEffect(() => {
    const getStoredAddress = () => {
      if (typeof window === 'undefined') return null;
      const stored = window.localStorage.getItem('userAddress');
      return typeof stored === 'string' && stored.startsWith('0x') && stored.length === 42
        ? stored
        : null;
    };

    let cancelled = false;

    const handleDisconnect = () => {
      const storedViewAddress = getStoredAddress();
      if (storedViewAddress) {
        setUserAddress(storedViewAddress);
        return;
      }

      clearUserAddress();
      const path = location.pathname;
      if (path.startsWith('/dashboard')) {
        navigate('/login', { replace: true });
      }
    };

    if (!isConnected || !address) {
      handleDisconnect();
      return undefined;
    }

    if (checkingRef.current) return undefined;

    checkingRef.current = true;

    (async () => {
      try {
        const registered = await isUserRegistered(address);
        if (cancelled) return;
        if (registered) {
          setUserAddress(address);
          if (
            location.pathname === '/login' ||
            location.pathname.startsWith('/signup') ||
            location.pathname.startsWith('/invite')
          ) {
            navigate('/dashboard', { replace: true });
          }
        } else {
          clearUserAddress();
          // Only redirect unregistered connected wallets to signup when
          // they're trying to access the dashboard or the login page.
          // This avoids forcing users off public pages (home, features, etc.)
          // when they click Back or Login links.
          const shouldRedirectToSignup =
            location.pathname.startsWith('/dashboard') || location.pathname === '/login' || location.pathname.startsWith('/invite');
          if (shouldRedirectToSignup) {
            navigate('/signup', { replace: true });
          }
        }
      } catch (err) {
        console.warn('Wallet session sync failed:', err);
      } finally {
        if (!cancelled) {
          checkingRef.current = false;
        }
      }
    })();

    return () => {
      cancelled = true;
      checkingRef.current = false;
    };
  }, [address, isConnected, isUserRegistered, clearUserAddress, setUserAddress, navigate, location.pathname]);

  return null;
}

const Approute = () => {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <WalletSessionManager />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/features" element={<Features />} />
        <Route path="/how-it-works" element={<HowItWorks />} />
        <Route path="/about" element={<AboutPublic />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/invite/:ref" element={<ReferralLanding />} />

        {/* Education Pages - Organized Learning Path */}
        <Route path="/money-revolution" element={<MoneyRevolution />} />
        <Route path="/blockchain-basics" element={<BlockchainBasics />} />
        <Route path="/smart-contracts" element={<SmartContracts />} />
        <Route path="/what-is-defi" element={<WhatIsDefi />} />
        <Route path="/ramestta-blockchain" element={<RamesttaBlockchain />} />
        <Route path="/rama-tokenomics" element={<RamaTokenomics />} />
        <Route path="/validator-security" element={<ValidatorSecurity />} />

        <Route path="/dashboard" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="stake" element={<StakeInvest />} />
          <Route path="team" element={<TeamNetwork />} />
          <Route path="team/:address" element={<TeamMemberDetails />} />
          <Route path="slab" element={<SlabIncome />} />
          <Route path="spot-income" element={<SpotIncome />} />
          <Route path="royalty" element={<RoyaltyProgram />} />
          <Route path="rewards" element={<OneTimeRewards />} />
          <Route path="missed-income" element={<MissedIncome />} />
          <Route path="missed-income/history" element={<MissedIncomeHistory />} />
          <Route path="safe-wallet" element={<SafeWallet />} />
          <Route path="transaction-history" element={<TransactionHistory />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="about" element={<About />} />
          <Route path="presentation" element={<Presentation />} />
          <Route path="ocean-defi-guide" element={<OceanDefiGuide />} />
          <Route path="accrued-rewards" element={<AccruedRewards />} />
          <Route path="settings" element={<Settings />} />
          <Route path="debug" element={<SlabManagerDebugger />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default Approute
