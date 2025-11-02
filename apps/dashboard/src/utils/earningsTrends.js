// utils/earningsTrends.js
// Build a 7-day earnings trend entirely from client-side Safe Wallet transaction history.
// This computes daily totals by aggregating all credit (income) transactions by day,
// bypassing contract methods for full transparency and control.

/**
 * Format a Unix timestamp (seconds) to a short weekday label, e.g., 'Mon'.
 */
export function dayShortFromUnix(tsSec) {
  try {
    const d = new Date(Number(tsSec) * 1000);
    return d.toLocaleDateString(undefined, { weekday: 'short' });
  } catch {
    return '—';
  }
}

/**
 * Returns an array of the last N day starts (midnight) in seconds, oldest -> newest.
 */
export function lastNDaysDayIds(n = 7) {
  const dayMs = 86400000;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = [];
  for (let i = n - 1; i >= 0; i--) {
    const ts = new Date(today.getTime() - i * dayMs);
    days.push(Math.floor(ts.getTime() / 1000));
  }
  return days; // unix seconds at local midnight
}

/**
 * Build earnings trend from Safe Wallet transaction history for the last N days.
 * This aggregates ALL credit transactions (income entries) by day.
 * Expects getTransactionHistory(userAddress, { offset, limit }) to be provided.
 */
export async function buildTrendFromHistory(userAddress, getTransactionHistory, days = 7) {
  if (!userAddress || typeof getTransactionHistory !== 'function') return [];
  try {
    // Pull a larger slice to ensure we capture all transactions in the 7-day window
    // We'll fetch up to 1000 recent transactions to be thorough
    const { entries = [] } = await getTransactionHistory(userAddress, { offset: 0, limit: 1000 });
    const dayStarts = lastNDaysDayIds(days);

    const sumsByDay = new Map(dayStarts.map((sec) => [sec, 0]));

    for (const e of entries) {
      if (!e || !e.isCredit) continue; // we only care about earnings (credits)
      const ts = Number(e.timestamp || e.rawTimestamp || 0);
      if (!Number.isFinite(ts) || ts <= 0) continue;

      // Normalize to local midnight for grouping
      const d = new Date(ts * 1000);
      d.setHours(0, 0, 0, 0);
      const dayStartSec = Math.floor(d.getTime() / 1000);
      if (!sumsByDay.has(dayStartSec)) continue; // outside our 7-day window

      const usd = Number(e.usd ?? 0);
      if (Number.isFinite(usd) && usd > 0) {
        sumsByDay.set(dayStartSec, (sumsByDay.get(dayStartSec) || 0) + usd);
      }
    }

    // Return as array with labels in chronological order (oldest to newest)
    return Array.from(sumsByDay.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([sec, amount]) => ({ day: dayShortFromUnix(sec), amount }));
  } catch (e) {
    console.warn('[earningsTrends] buildTrendFromHistory failed:', e);
    return [];
  }
}

/**
 * Compute a 7-day earnings trend purely from client-side Safe Wallet transaction history.
 * This bypasses contract methods entirely and aggregates all credit transactions by day.
 * Returns data in chronological order (oldest to newest: Sun, Mon, Tue...).
 */
export async function computeSevenDayTrend({ userAddress, get7DayEarningTrend, getTransactionHistory }) {
  // Build trend entirely from Safe Wallet transaction history (client-side computation)
  const trend = await buildTrendFromHistory(userAddress, getTransactionHistory, 7);
  
  // Trend is already sorted chronologically (oldest to newest) by buildTrendFromHistory
  return trend;
}
