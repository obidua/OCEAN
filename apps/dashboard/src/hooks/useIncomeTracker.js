// React Hook for Income Tracking
// Easy integration into any component for automatic income detection

import { useEffect, useRef, useCallback } from 'react';
import incomeTracker from '../utils/incomeTracker';

export const useIncomeTracker = (userAddress) => {
  const trackingDataRef = useRef(new Map());

  // Track a specific value for income changes
  const trackIncome = useCallback((key, value, type = 'portfolio', metadata = {}) => {
    if (!userAddress || !key) return;
    
    const fullKey = `${key}-${userAddress}`;
    incomeTracker.trackValue(fullKey, value, type, {
      ...metadata,
      userAddress,
      timestamp: Date.now()
    });
  }, [userAddress]);

  // Track multiple values at once
  const trackMultipleIncomes = useCallback((values) => {
    if (!userAddress || !values) return;
    
    Object.entries(values).forEach(([key, data]) => {
      const { value, type = 'portfolio', metadata = {} } = data;
      trackIncome(key, value, type, metadata);
    });
  }, [userAddress, trackIncome]);

  // Track Safe Wallet balance
  const trackSafeWalletBalance = useCallback((balance, metadata = {}) => {
    trackIncome('safeWallet', balance, 'safeWallet', {
      ...metadata,
      source: 'Safe Wallet Balance'
    });
  }, [trackIncome]);

  // Track different income types
  const trackROI = useCallback((amount, metadata = {}) => {
    trackIncome('roi', amount, 'roi', metadata);
  }, [trackIncome]);

  const trackDirectIncome = useCallback((amount, metadata = {}) => {
    trackIncome('direct', amount, 'direct', metadata);
  }, [trackIncome]);

  const trackSlabReward = useCallback((amount, metadata = {}) => {
    trackIncome('slab', amount, 'slab', metadata);
  }, [trackIncome]);

  const trackRoyaltyIncome = useCallback((amount, metadata = {}) => {
    trackIncome('royalty', amount, 'royalty', metadata);
  }, [trackIncome]);

  const trackSameSlabBonus = useCallback((amount, metadata = {}) => {
    trackIncome('sameSlab', amount, 'sameSlab', metadata);
  }, [trackIncome]);

  const trackReferralBonus = useCallback((amount, metadata = {}) => {
    trackIncome('referral', amount, 'referral', metadata);
  }, [trackIncome]);

  const trackTeamBusiness = useCallback((amount, metadata = {}) => {
    trackIncome('team', amount, 'team', metadata);
  }, [trackIncome]);

  // Reset tracking for this user
  const resetTracking = useCallback(() => {
    trackingDataRef.current.clear();
  }, []);

  // Auto-cleanup when component unmounts
  useEffect(() => {
    return () => {
      // Optional: Clear tracking data on unmount
      // trackingDataRef.current.clear();
    };
  }, []);

  return {
    // Core tracking functions
    trackIncome,
    trackMultipleIncomes,
    
    // Specific income type trackers
    trackSafeWalletBalance,
    trackROI,
    trackDirectIncome,
    trackSlabReward,
    trackRoyaltyIncome,
    trackSameSlabBonus,
    trackReferralBonus,
    trackTeamBusiness,
    
    // Utility functions
    resetTracking,
    
    // Direct access to income tracker
    incomeTracker
  };
};

// Higher Order Component for automatic income tracking
export const withIncomeTracking = (WrappedComponent) => {
  return function IncomeTrackingWrapper(props) {
    const incomeHook = useIncomeTracker(props.userAddress || props.address);
    
    return WrappedComponent({
      ...props,
      incomeTracker: incomeHook
    });
  };
};

export default useIncomeTracker;