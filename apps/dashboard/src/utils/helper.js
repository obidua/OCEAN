// Mon/Tue/Wed ... from a UNIX timestamp (seconds or milliseconds)
// Uses UTC to avoid timezone drift with on-chain dayIds.
export function dayShortFromUnix(unixTs) {
  const n = typeof unixTs === "bigint" ? Number(unixTs) : Number(unixTs);
  if (!Number.isFinite(n)) return "";

  // Heuristic: <1e12 ⇒ seconds; otherwise milliseconds
  const ms = n < 1e12 ? n * 1000 : n;

  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return DAYS[new Date(ms).getUTCDay()];
}
