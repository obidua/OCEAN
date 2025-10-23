export default function ClaimEarnings() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-neon-green relative inline-block">
          Claim Earnings
          <span className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 to-neon-green/20 blur-xl -z-10" />
        </h1>
        <p className="text-cyan-300/90 mt-1">
          Claiming is temporarily paused while we finish the contract wiring. Please check back soon.
        </p>
      </div>

      <div className="cyber-glass rounded-2xl p-6 border border-cyan-500/30">
        <p className="text-sm text-cyan-300/90">
          The Claim Earnings experience is under maintenance. None of your funds are at risk; this page will return as
          soon as we complete the integration of the on-chain claim flow.
        </p>
      </div>
    </div>
  );
}
