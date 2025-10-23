## Project Layout

```
ocean-test/
├─ apps/
│  └─ dashboard/        # drop the OCEAN-DeFi UI here
├─ scripts/             # automation + data pipelines
├─ config/              # manifests, address maps, private keys
├─ data/
│  ├─ reports/          # generated change logs (ABI diff, etc.)
│  └─ *.json/csv        # simulation state + user activity
├─ abis/                # synced contract ABIs
└─ package.json
```

## CoreConfig & ABI Sync

This repository ships `scripts/sync_coreconfig.js` to keep your local
configuration aligned with the on-chain `CoreConfig` contract.

### Setup
- Requires Node.js 18+ (or install `node-fetch` for a fetch polyfill).
- Ensure `.env` contains `RPC_URL`, `CORECONFIG`, and module keys such as
  `ADMINCONTROL`, `PORTFOLIOMANAGER`, etc.
- Add explorer credentials:
  ```ini
  EXPLORER_API_URL=https://<etherscan-compatible-host>/api?module=contract&action=getabi
  EXPLORER_API_KEY=<optional-key>
  ```
- (Optional) maintain `config/coreconfig_manifest.json` to override the default
  address manifest when CoreConfig uses custom keys.

### Usage
```bash
npm run sync:core
```

The script performs:
- queries `CoreConfig` for each configured module address
- resolves proxy contracts (EIP-1967, beacon, and minimal proxies) to their
  implementations
- downloads the latest ABI for the implementation into `./abis`
- writes `.env.bak` and updates `.env` only when addresses change
- records change reports in `data/reports/abi_changes.{json,md}`, generating
  stub ABI files when the explorer fetch fails

Subsequent runs reuse existing data and update only when on-chain changes are
detected.
