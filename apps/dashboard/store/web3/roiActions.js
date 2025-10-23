import { Contract } from 'web3-eth-contract';
import { formatUnits } from 'web3-utils';

export const createRoiActions = (contracts) => ({
  async getPortfolioROI(pid) {
    try {
      const portfolio = await contracts.portfolioManager.methods.getPortfolio(pid).call();
      const usdPrincipal = await contracts.portfolioManager.methods.getUSDPrincipal(pid).call();
      
      return {
        principal: formatUnits(portfolio.principal, 18),
        principalUsd: formatUnits(usdPrincipal, 6),
        credited: formatUnits(portfolio.credited, 18),
        boosterActive: portfolio.booster,
        tier: parseInt(portfolio.tier),
        capPct: parseInt(portfolio.capPct),
        frozenUntil: parseInt(portfolio.frozenUntil),
        isCapped: portfolio.isCapped,
        isClosed: portfolio.isClosed,
        totalBoosterROI: formatUnits(portfolio.totalReceivedBoosterROI, 18),
        createdAt: parseInt(portfolio.createdAt),
        lastAccrual: parseInt(portfolio.lastAccrual)
      };
    } catch (err) {
      console.error('Failed to get portfolio ROI:', err);
      throw err;
    }
  },

  async getAccruedROI(pid) {
    try {
      const result = await contracts.portfolioManager.methods.accrue(pid).call();
      return formatUnits(result, 18);
    } catch (err) {
      console.error('Failed to get accrued ROI:', err);
      throw err;
    }
  },

  async claimAccruedROI(pid) {
    try {
      const tx = await contracts.portfolioManager.methods.accrue(pid).send();
      return tx;
    } catch (err) {
      console.error('Failed to claim ROI:', err);
      throw err;
    }
  },

  async getFreezeInfo(pid) {
    try {
      const count = await contracts.portfolioManager.methods.getFreezeIntervalsCount(pid).call();
      if (count === '0') return [];

      const intervals = await contracts.portfolioManager.methods
        .getFreezeIntervalsSlice(pid, 0, parseInt(count))
        .call();

      return intervals.map(interval => ({
        startDay: parseInt(interval.startDay),
        endDay: parseInt(interval.endDay)
      }));
    } catch (err) {
      console.error('Failed to get freeze intervals:', err);
      throw err;
    }
  }
});