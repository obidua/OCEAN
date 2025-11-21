import { useWalletBalance, useWithdraw } from '../hooks/useFieldPortfolio'
import { useState } from 'react'
import { useAppKitAccount } from '@reown/appkit/react'

export default function WithdrawPanel() {
  const { address } = useAppKitAccount()
  const balance = useWalletBalance()
  const withdraw = useWithdraw()
  const [amount, setAmount] = useState('')
  const [withdrawAll, setWithdrawAll] = useState(true)

  if (!address) {
    return (
      <div className="border border-zinc-800 rounded-lg p-6 bg-zinc-900/50">
        <h2 className="text-xl font-semibold mb-4">Withdraw RAMA</h2>
        <p className="text-zinc-400">Connect your wallet to withdraw RAMA</p>
      </div>
    )
  }

  if (balance.isLoading) {
    return (
      <div className="border border-zinc-800 rounded-lg p-6 bg-zinc-900/50">
        <h2 className="text-xl font-semibold mb-4">Withdraw RAMA</h2>
        <p className="text-zinc-400">Loading balance...</p>
      </div>
    )
  }

  const balanceWei = balance.data || 0n
  const balanceRama = Number(balanceWei) / 1e18
  const hasBalance = balanceWei > 0n

  const handleWithdraw = async () => {
    try {
      let amountWei
      if (withdrawAll) {
        amountWei = balanceWei.toString()
      } else {
        const amountNum = parseFloat(amount)
        if (isNaN(amountNum) || amountNum <= 0) {
          alert('Enter a valid amount')
          return
        }
        amountWei = (BigInt(Math.floor(amountNum * 1e18))).toString()
        if (BigInt(amountWei) > balanceWei) {
          alert('Amount exceeds available balance')
          return
        }
      }

      await withdraw.mutateAsync({ amountWei })
      setAmount('')
      setWithdrawAll(true)
    } catch (err) {
      console.error('Withdraw failed:', err)
      alert(err.message || 'Withdrawal failed')
    }
  }

  return (
    <div className="border border-zinc-800 rounded-lg p-6 bg-zinc-900/50">
      <h2 className="text-xl font-semibold mb-4">Withdraw RAMA</h2>
      
      <div className="mb-6 p-4 bg-zinc-800/50 rounded-lg">
        <div className="text-sm text-zinc-400 mb-1">Available Balance</div>
        <div className="text-3xl font-bold text-green-400">
          {balanceRama.toFixed(4)} RAMA
        </div>
        <div className="text-xs text-zinc-500 mt-1">
          {balanceWei.toString()} wei
        </div>
      </div>

      {!hasBalance ? (
        <p className="text-zinc-400 text-sm">No RAMA available to withdraw. Claim your rewards first.</p>
      ) : (
        <>
          <div className="mb-4">
            <label className="flex items-center gap-2 mb-3">
              <input
                type="checkbox"
                checked={withdrawAll}
                onChange={(e) => setWithdrawAll(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm">Withdraw full balance</span>
            </label>

            {!withdrawAll && (
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Amount (RAMA)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  step="0.0001"
                  min="0"
                  max={balanceRama}
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:outline-none focus:border-blue-500"
                />
                <button
                  onClick={() => setAmount(balanceRama.toString())}
                  className="text-xs text-blue-400 hover:text-blue-300 mt-1"
                >
                  Max
                </button>
              </div>
            )}
          </div>

          <button
            onClick={handleWithdraw}
            disabled={withdraw.isPending || (!withdrawAll && !amount)}
            className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 disabled:text-zinc-500 rounded-lg font-semibold transition-colors"
          >
            {withdraw.isPending ? 'Withdrawing...' : 'Withdraw RAMA'}
          </button>

          {withdraw.txHash && (
            <div className="mt-4 p-3 bg-zinc-800/50 rounded-lg">
              <div className="text-xs text-zinc-400 mb-1">Transaction Hash</div>
              <div className="font-mono text-xs break-all">{withdraw.txHash}</div>
              {withdraw.receipt.isSuccess && (
                <div className="text-green-400 text-sm mt-2">✓ Withdrawal confirmed</div>
              )}
              {withdraw.receipt.isLoading && (
                <div className="text-yellow-400 text-sm mt-2">⏳ Confirming...</div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
