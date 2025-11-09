# Field Portfolio Portal

A focused portal for field executives to view and claim ROI from admin-created special portfolios.

## Features
- WalletConnect / Reown integration (limited to wallets with at least one portfolio)
- Portfolio overview (principal, paid, cap, remaining)
- Unclaimed ROI preview (USD + RAMA) auto-window logic via contract
- Claim ROI transaction (claimROI)
- Claim history list (first 50 records)
- Access guard: only registered users with portfolios can proceed

## Tech Stack
- React + Vite
- Wagmi + Viem + Reown AppKit
- TailwindCSS
- React Query for data fetching

## Environment Variables (`.env`)
Copy `.env.example` to `.env` and adjust as needed.

```
VITE_CHAIN_ID=1370
VITE_NETWORK_NAME=Ramestta
VITE_RPC_URL=https://blockchain.ramestta.com
VITE_WALLETCONNECT_PROJECT_ID=YOUR_PROJECT_ID
VITE_FIELD_PORTFOLIO_CONTRACT=0x971dBA324C7399a5Ff739e82177bE7001687f27D
```

## Development
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
```

## Adding More History
Adjust the slice in `useClaimHistory` if you need pagination.

## Security Notes
- Only read + claim operations included.
- Admin-only portfolio creation lives in the on-chain contract, not exposed from this UI.

## Future Enhancements
- Pagination for claim history
- Relaxed day-based preview (add ABI & view call if needed)
- Loading skeletons & error boundary
