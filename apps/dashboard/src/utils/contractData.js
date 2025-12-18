const USD_PRECISION = 1000000;

import { PortfolioStatus } from '../types/contract';

export const SLAB_LEVELS = [
  { requiredVolumeUSD: (500 * USD_PRECISION).toString(), percentageBPS: '500', minDirects: '1' },
  { requiredVolumeUSD: (2500 * USD_PRECISION).toString(), percentageBPS: '1000', minDirects: '2' },
  { requiredVolumeUSD: (10000 * USD_PRECISION).toString(), percentageBPS: '1500', minDirects: '3' },
  { requiredVolumeUSD: (25000 * USD_PRECISION).toString(), percentageBPS: '2000', minDirects: '4' },
  { requiredVolumeUSD: (50000 * USD_PRECISION).toString(), percentageBPS: '2500', minDirects: '5' },
  { requiredVolumeUSD: (100000 * USD_PRECISION).toString(), percentageBPS: '3000', minDirects: '6' },
  { requiredVolumeUSD: (500000 * USD_PRECISION).toString(), percentageBPS: '3500', minDirects: '7' },
  { requiredVolumeUSD: (1000000 * USD_PRECISION).toString(), percentageBPS: '4500', minDirects: '8' },
  { requiredVolumeUSD: (2500000 * USD_PRECISION).toString(), percentageBPS: '5000', minDirects: '9' },
  { requiredVolumeUSD: (5000000 * USD_PRECISION).toString(), percentageBPS: '5500', minDirects: '10' },
  { requiredVolumeUSD: (20000000 * USD_PRECISION).toString(), percentageBPS: '6000', minDirects: '11' },
];

export const ROYALTY_LEVELS = [
  { requiredVolumeUSD: (5000 * USD_PRECISION).toString(), monthlyRoyaltyUSD: (30 * USD_PRECISION).toString() },
  { requiredVolumeUSD: (10000 * USD_PRECISION).toString(), monthlyRoyaltyUSD: (80 * USD_PRECISION).toString() },
  { requiredVolumeUSD: (20000 * USD_PRECISION).toString(), monthlyRoyaltyUSD: (200 * USD_PRECISION).toString() },
  { requiredVolumeUSD: (60000 * USD_PRECISION).toString(), monthlyRoyaltyUSD: (500 * USD_PRECISION).toString() },
  { requiredVolumeUSD: (120000 * USD_PRECISION).toString(), monthlyRoyaltyUSD: (1000 * USD_PRECISION).toString() },
  { requiredVolumeUSD: (300000 * USD_PRECISION).toString(), monthlyRoyaltyUSD: (1500 * USD_PRECISION).toString() },
  { requiredVolumeUSD: (600000 * USD_PRECISION).toString(), monthlyRoyaltyUSD: (2500 * USD_PRECISION).toString() },
  { requiredVolumeUSD: (1500000 * USD_PRECISION).toString(), monthlyRoyaltyUSD: (5000 * USD_PRECISION).toString() },
  { requiredVolumeUSD: (3000000 * USD_PRECISION).toString(), monthlyRoyaltyUSD: (8000 * USD_PRECISION).toString() },
  { requiredVolumeUSD: (5000000 * USD_PRECISION).toString(), monthlyRoyaltyUSD: (12000 * USD_PRECISION).toString() },
  { requiredVolumeUSD: (10000000 * USD_PRECISION).toString(), monthlyRoyaltyUSD: (20000 * USD_PRECISION).toString() },
  { requiredVolumeUSD: (30000000 * USD_PRECISION).toString(), monthlyRoyaltyUSD: (40000 * USD_PRECISION).toString() },
  { requiredVolumeUSD: (50000000 * USD_PRECISION).toString(), monthlyRoyaltyUSD: (50000 * USD_PRECISION).toString() },
  { requiredVolumeUSD: (100000000 * USD_PRECISION).toString(), monthlyRoyaltyUSD: (100000 * USD_PRECISION).toString() },
];

export const ONE_TIME_REWARDS = [
  { requiredVolumeUSD: (6000 * USD_PRECISION).toString(), rewardUSD: (100 * USD_PRECISION).toString() },
  { requiredVolumeUSD: (15000 * USD_PRECISION).toString(), rewardUSD: (250 * USD_PRECISION).toString() },
  { requiredVolumeUSD: (40000 * USD_PRECISION).toString(), rewardUSD: (500 * USD_PRECISION).toString() },
  { requiredVolumeUSD: (120000 * USD_PRECISION).toString(), rewardUSD: (1000 * USD_PRECISION).toString() },
  { requiredVolumeUSD: (300000 * USD_PRECISION).toString(), rewardUSD: (2500 * USD_PRECISION).toString() },
  { requiredVolumeUSD: (600000 * USD_PRECISION).toString(), rewardUSD: (5000 * USD_PRECISION).toString() },
  { requiredVolumeUSD: (1500000 * USD_PRECISION).toString(), rewardUSD: (8000 * USD_PRECISION).toString() },
  { requiredVolumeUSD: (3000000 * USD_PRECISION).toString(), rewardUSD: (12000 * USD_PRECISION).toString() },
  { requiredVolumeUSD: (6000000 * USD_PRECISION).toString(), rewardUSD: (30000 * USD_PRECISION).toString() },
  { requiredVolumeUSD: (15000000 * USD_PRECISION).toString(), rewardUSD: (50000 * USD_PRECISION).toString() },
  { requiredVolumeUSD: (30000000 * USD_PRECISION).toString(), rewardUSD: (85000 * USD_PRECISION).toString() },
  { requiredVolumeUSD: (60000000 * USD_PRECISION).toString(), rewardUSD: (150000 * USD_PRECISION).toString() },
  { requiredVolumeUSD: (200000000 * USD_PRECISION).toString(), rewardUSD: (500000 * USD_PRECISION).toString() },
  { requiredVolumeUSD: (500000000 * USD_PRECISION).toString(), rewardUSD: (1500000 * USD_PRECISION).toString() },
];

export function formatUSD(value) {
  const num = typeof value === 'string' ? parseFloat(value) / USD_PRECISION : value;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatRAMA(value) {
  const num = typeof value === 'string' ? parseFloat(value) / 1e18 : value;
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
}

export function formatPercentage(bps) {
  const num = typeof bps === 'string' ? parseFloat(bps) / 100 : bps / 100;
  return `${num}%`;
}

export function getMockPortfolioDetails() {
  return {
    stakedUSD: (7500 * USD_PRECISION).toString(),
    totalEarnedUSD: (2250 * USD_PRECISION).toString(),
    maxCapUSD: (15000 * USD_PRECISION).toString(),
    isBooster: false,
    upline: '0x1234567890123456789012345678901234567890',
    status: PortfolioStatus.Running,
    freezeEndsAt: '0',
    accruedGrowthUSD: (125 * USD_PRECISION).toString(),
    totalLifetimeStakedUSD: (7500 * USD_PRECISION).toString(),
    totalLifetimeEarnedUSD: (2250 * USD_PRECISION).toString(),
    maxLifetimeEarnableUSD: (30000 * USD_PRECISION).toString(),
    safeWalletRAMA: (850 * 1e18).toString(),
  };
}

export function getMockUserStatus() {
  return {
    currentSlabIndex: '3',
    qualifiedVolumeUSD: (12500 * USD_PRECISION).toString(),
    directChildrenCount: '4',
    nextSlabClaimRequiresDirects: '0',
    currentRoyaltyLevelIndex: '2',
    royaltyPayoutsReceived: '3',
    royaltyRenewalVolumeRequiredUSD: (13750 * USD_PRECISION).toString(),
    canClaimRoyalty: true,
  };
}

export function getMockIncomeStreams() {
  return {
    portfolioGrowth: {
      availableUSD: (45.50 * USD_PRECISION).toString(),
      lastClaimDate: '2025-10-10',
      status: 'active',
    },
    slabIncome: {
      availableUSD: (32.75 * USD_PRECISION).toString(),
      lastClaimDate: '2025-10-09',
      status: 'cooldown',
      cooldownEndsAt: '2025-10-18',
    },
    royaltyIncome: {
      availableUSD: (28.50 * USD_PRECISION).toString(),
      lastClaimDate: '2025-09-15',
      status: 'active',
      nextEligibleDate: '2025-11-15',
    },
    sameSlabOverride: {
      availableUSD: (12.25 * USD_PRECISION).toString(),
      lastClaimDate: '2025-10-08',
      status: 'active',
    },
    oneTimeReward: {
      availableUSD: (6.00 * USD_PRECISION).toString(),
      lastClaimDate: null,
      status: 'unclaimed',
      rewardLevel: 1,
    },
  };
}
