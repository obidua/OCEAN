# Ocean Portfolio Creation Script

## Overview
The `ocean_portfolios.js` script automatically creates additional portfolios for registered users with an intelligent increment strategy.

## Features

### 1. **Smart Portfolio Creation**
- Creates 4 additional portfolios per user after initial activation
- Each portfolio is 20-40% larger than the previous one, plus a random amount (0-10%)
- Only creates portfolios with amounts **equal to or greater** than the last activated portfolio

### 2. **On-Chain Data Integration**
- Automatically fetches the last portfolio ID from `PortfolioManager.portfoliosOf()`
- Retrieves portfolio amount using `PortfolioManager.getPortfolio(pid)`
- Ensures new portfolios meet on-chain validation requirements

### 3. **Resume Functionality**
- Use `--resume` flag to continue from where the script left off
- Tracks progress in `data/ocean_portfolios.json`
- Safe to stop and restart at any time

### 4. **CSV Export**
- Automatically updates `data/ocean_portfolios.csv` with all portfolio data
- Format: `address,referrer,key_index,portfolio_index,usd_amount,rama_wei,tx_hash,timestamp`

## Usage

### Basic Usage
```bash
node scripts/ocean_portfolios.js
```

### Resume Mode
```bash
node scripts/ocean_portfolios.js --resume
```

### Stop Script
Press `Ctrl+C` to stop. Data is automatically saved before exit.

## Configuration

Edit `.env` file to configure parameters:

```properties
# Required
RPC_URL=https://blockchain.ramestta.com
PORTFOLIOMANAGER=0xC73f964eA7bC04a2c7455CAf6107238147c88365
PRICEORACLE=0xA51fDA6Cf548000b9C02A2248337583Dd7111592

# Optional (with defaults)
PORTFOLIO_MIN_USD=10        # Minimum portfolio amount
PORTFOLIO_MAX_USD=5000      # Maximum portfolio amount (increased from 1000)
```

## How It Works

### Portfolio Increment Strategy

1. **Get Last Portfolio**: 
   - Fetches user's portfolio IDs: `portfoliosOf(address)`
   - Gets last portfolio details: `getPortfolio(lastPid)`
   - Extracts `principalUsd` (in micro USD, 6 decimals)

2. **Calculate Next Amount**:
   ```
   Increase % = Random(20%, 40%)
   Random Bonus = Random(0%, 10% of last amount)
   
   New Amount = Last Amount × (1 + Increase%) + Random Bonus
   ```

3. **Validation**:
   - New amount must be ≥ Last amount + $1
   - New amount must be ≤ PORTFOLIO_MAX_USD
   - If exceeded, script throws error (adjust PORTFOLIO_MAX_USD)

4. **Create Portfolio**:
   - Convert USD to RAMA using `getPackageValueInRAMA()`
   - Call `createPortfolio()` with calculated RAMA amount
   - Wait for transaction confirmation

### Example Progression

```
Portfolio 1: $50 (activation)
Portfolio 2: $50 × 1.35 + random = $70.50  (+41%)
Portfolio 3: $70.50 × 1.28 + random = $95.30  (+35%)
Portfolio 4: $95.30 × 1.32 + random = $130.50 (+37%)
Portfolio 5: $130.50 × 1.25 + random = $170.15 (+30%)
```

## Data Files

### Input Files
- `config/privateKeys.json` - User private keys
- `data/ocean_registrations.json` - Registration data (from ocean_sim.js)

### Output Files
- `data/ocean_portfolios.json` - Portfolio creation records (JSON)
- `data/ocean_portfolios.csv` - Portfolio data (CSV format)

## Error Handling

### Common Errors

1. **"NEW_PORTFOLIO_MUST_BE_GREATER"**
   - Solution: Automatically retries with higher amount
   - If persists: Check on-chain data vs script calculation

2. **"Next portfolio amount exceeds PORT_MAX_USD"**
   - Solution: Increase `PORTFOLIO_MAX_USD` in `.env`
   - Example: `PORTFOLIO_MAX_USD=10000`

3. **"No portfolios found for address"**
   - Solution: User needs to activate first using ocean_sim.js

4. **Gas estimation failed**
   - Solution: Check RPC_URL connectivity
   - Solution: Ensure sufficient RAMA balance

## Tips

1. **Adjust Maximum**: If users reach the $5000 limit, increase `PORTFOLIO_MAX_USD`
2. **Monitor Progress**: Check `data/ocean_portfolios.csv` for real-time updates
3. **Stop Safely**: Always use Ctrl+C, data saves automatically
4. **Resume Anytime**: Use `--resume` flag to continue from last saved state

## Dependencies

```bash
npm install ethers dotenv
```

## Script Flow

```
Start
  ↓
Load Configuration (.env, keys, registrations)
  ↓
For each registered user (sequential):
  ↓
  Check portfolios created (max 4 per user)
  ↓
  Get last portfolio from on-chain
  ↓
  Calculate next amount (20-40% + random)
  ↓
  Convert USD to RAMA
  ↓
  Create portfolio transaction
  ↓
  Save to JSON and CSV
  ↓
  Continue to next user
  ↓
Sleep 6s if all users complete, then recheck
```

## Advanced Configuration

### Modify Increase Range
Edit the constants in `ocean_portfolios.js`:

```javascript
const INCREASE_MIN_PCT = 20; // minimum 20% increase
const INCREASE_MAX_PCT = 40; // maximum 40% increase
```

### Change Portfolios Per User
```javascript
const PORTFOLIOS_PER_USER = 4; // create 4 additional portfolios per user
```

## Support

For issues or questions:
1. Check error messages in console
2. Verify `.env` configuration
3. Ensure RPC_URL is accessible
4. Check on-chain data using block explorer
