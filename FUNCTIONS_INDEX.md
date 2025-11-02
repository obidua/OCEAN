# Ocean DeFi — Functions and Contracts Index

A concise, human-readable index of the main smart contracts and app functions used across the dashboard, with brief descriptions of what they do. This complements `abi-functions-index.json` and helps quickly orient devs.

## Contracts (Core)

- SafeWallet
  - Purpose: User-facing ledger for credits (incomes) and debits (withdrawals, portfolio spends). Provides history and aggregate helpers.
  - Key view methods:
    - getLedgerCount(address)
    - getLedgerSlice(address, offset, limit)
    - getTotalsByKind(address, kind, credits)
    - getTotals(address) — aggregate wallet totals (usd/rama, credits/debits)

- IncomeDistributor
  - Purpose: Direct/spot income distribution to users.
  - Key view methods:
    - getDirectIncomeSummary(address)
    - getDirectIncomeCount(address)
    - getDirectIncomeSlice(address, offset, limit)
    - getDirectIncomeByIndex(address, idx)
    - totalDirectUsd(address), totalDirectRama(address)

- RoiDistribution / RoiDistributionView
  - Purpose: ROI accrual and claiming; View provides non-state-changing helpers.
  - Key view methods:
    - RoiDistributionView.getUnclaimedROI(address)
    - RoiDistributionView.nextDistributionTs()
    - RoiDistribution.lastDistributionTs()
    - RoiDistribution.claimROI() (tx)
    - RoiDistributionView.previewClaimPerPortfolio(address)
    - RoiDistributionView.previewClaimPerPortfolioSlice(address, offset, limit)
    - RoiDistributionView.getClaimHistorySlice(address, offset, limit)
    - RoiDistributionView.getTotalsClaimed(address)
    - RoiDistribution.paidUsdByPid(pid)

- RewardVault
  - Purpose: One-time reward (milestones) accounting, pending and claimed.
  - Key view methods:
    - getUserTotals(address)
    - getPendingRewardTotalUSD(address)
    - releasePending(address) (tx)

- OceanViewUpgradeable / OceanViewV2
  - Purpose: Consolidated read helpers used by UI; includes earnings trend endpoints.
  - Key view methods:
    - getLast7DaysEarningsUSD(address, todayDayId)
    - getWeeklyEarnings(address, todayDayId)

- OceanQueryUpgradeable
  - Purpose: Rich query helpers (income streams, totals, safe wallet balance, etc.).
  - Key view methods:
    - getPortfolioDetails(pid)
    - getTotalEarnings(address)

- CappingIncomeManager
  - Purpose: Canonical aggregation of earnings contributing to the global 4x cap.
  - Key view methods:
    - remainingToCapUSD(pid)
    - getEarnedByKind(address)

- ComprehensiveView
  - Purpose: Cross-contract aggregation (totals, team analytics, etc.).
  - Key view methods:
    - getTotalRoi(address)
    - getTodayRoi(address)
    - getUnclaimedRoi(address)

- RoyaltyManager / ComprehensiveView (royalty)
  - Purpose: Royalty program overview and tier achievements.
  - Key view methods:
    - getRoyaltyOverview(address)

- PortfolioManager
  - Purpose: Portfolio creation and accounting; pricing helpers for USD↔RAMA conversion.
  - Key view methods:
    - portfoliosOf(address)
    - getPortfolio(pid)
    - getPortfolioIds(address)
    - getPackageValueInRAMA(usd6)
    - getPackageValueInUSD(ramaWei)

- OceanicView (aggregated view)
  - Purpose: High-level dashboards, ROI previews and history across modules.
  - Key view methods used:
    - getROIPreviewPerPortfolioPaged(address, offset, limit)
    - getROIDashboardPaged(address, ...)
    - getROIClaimHistoryPaged(address, offset, limit)
    - getPortfolios(address)
    - getRewards(address)

## App Store (useUserInfoStore) — Key functions

- get7DayEarningTrend(address)
  - Source: OceanViewV2.getWeeklyEarnings (fallback: OceanView.getLast7DaysEarningsUSD)
  - Returns an array of { day, amount } for last 7 days (USD), dynamic.

- getTransactionHistory(address, {offset, limit})
  - Source: SafeWallet.getLedgerSlice + getTotalsByKind
  - Returns Safe Wallet ledger entries (credits and debits) with {usd, rama, kind, timestamp}.

- getROITotals(address)
  - Source: ComprehensiveView.getTotalRoi/getTodayRoi/getUnclaimedRoi (fallback: RoiDistributionView)
  - Returns claimed/unclaimed ROI totals, today’s ROI, plus unclaimed window metadata.

- getROITotals(address) and getUnclaimedROIWindow(address)
  - Source: ComprehensiveView + RoiDistributionView
  - Returns claimed/unclaimed ROI totals and the unclaimed window summary.

- getAccruedRewardStats(address)
  - Source: OceanicView.getRewards + portfolios
  - Returns accrued one-time reward stats and timestamps for last activity.

- getSafeWalletSummary(address)
  - Source: OceanQueryUpgradeable.getSafeWalletBalance
  - Returns RAMA/USD balances and inferred price cues.

- getCappingIncomeData(address)
  - Source: CappingIncomeManager
  - Returns used cap breakdown (ROI claimed/unclaimed, direct, slab, override).

- getVolumeAnalytics(address), getDirectsPortfolioAndTeamVolumes(address)
  - Source: Slab/Comprehensive modules
  - Returns directs/team breakdowns and volume analytics.

- getRoyaltyOverview(address)
  - Source: Royalty program modules
  - Returns achieved stages and payout summaries.

- RegisterUser(fromAddress, sponsor)
  - Source: UserRegistry.registerUser (tx)
  - Also uses: idToAddress(userId), getUser(address), isRegistered(address)
  - Registers a user using sponsor address or numeric ID; includes gas estimation and standard tx object.

## UX utilities added in this pass

- utils/earningsTrends.js
  - computeSevenDayTrend({ userAddress, get7DayEarningTrend, getTransactionHistory })
    - Merges on-chain weekly earnings with a Safe Wallet credit-only fallback trend
    - Avoids double counting by preferring on-chain amounts when non-zero
  - buildTrendFromHistory(userAddress, getTransactionHistory, days)
    - Aggregates Safe Wallet credits per day for the last N days

## Notes

- When combining multiple sources for analytics, prefer contract-provided aggregates as authoritative. Use Safe Wallet history only as a fallback or for drill-downs to avoid double counting.
- This index is a living document; extend as you touch new modules/contracts.
