import { useCallback, useEffect, useState, useRef } from 'react';
import { useSendTransaction, useWaitForTransactionReceipt } from 'wagmi';

export const useTransaction = () => {
  const { 
    sendTransaction, 
    data: hash, 
    isPending: isSending,
    isError: sendError,
    error: sendErrorDetails,
    reset: resetSendTransaction
  } = useSendTransaction();

  // Local state for manual receipt polling fallback
  const [manualReceipt, setManualReceipt] = useState(null);
  const [manualError, setManualError] = useState(false);
  const pollingRef = useRef(null);
  const pollCountRef = useRef(0);

  // Wait for transaction receipt to detect success/error and reverts
  const { 
    data: receipt, 
    isLoading: isWaitingForReceipt, 
    isSuccess: receiptSuccess, 
    isError: receiptError, 
    error: receiptErrorDetails 
  } = useWaitForTransactionReceipt({
    hash,
    confirmations: 1,
    enabled: !!hash,
  });

  // Debug logging to track receipt status
  useEffect(() => {
    if (hash) {
      console.log('[useTransaction] Hash received:', hash);
    }
    if (receipt) {
      console.log('[useTransaction] Receipt received:', receipt);
      console.log('[useTransaction] Receipt status:', receipt.status);
    }
    if (receiptError) {
      console.log('[useTransaction] Receipt error:', receiptError, receiptErrorDetails);
    }
    if (sendError) {
      console.log('[useTransaction] Send error:', sendError, sendErrorDetails);
    }
  }, [hash, receipt, receiptError, sendError, receiptErrorDetails, sendErrorDetails]);

  // Manual receipt polling fallback for networks where wagmi doesn't detect properly
  useEffect(() => {
    if (!hash || receipt || receiptError) {
      // Clear polling if we have a receipt or error from wagmi
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      return;
    }

    // Start manual polling after 5 seconds if wagmi hasn't gotten receipt
    const startPolling = setTimeout(() => {
      pollCountRef.current = 0;
      pollingRef.current = setInterval(async () => {
        pollCountRef.current++;
        console.log('[useTransaction] Manual polling attempt:', pollCountRef.current);
        
        // Stop after 60 attempts (2 minutes at 2 second intervals)
        if (pollCountRef.current > 60) {
          console.log('[useTransaction] Manual polling timeout');
          setManualError(true);
          clearInterval(pollingRef.current);
          pollingRef.current = null;
          return;
        }

        try {
          // Use fetch to call eth_getTransactionReceipt directly
          const rpcUrl = import.meta.env.VITE_RPC_URL || 'https://blockchain.rfriestta.com';
          const response = await fetch(rpcUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              method: 'eth_getTransactionReceipt',
              params: [hash],
              id: 1
            })
          });
          
          const data = await response.json();
          if (data.result) {
            console.log('[useTransaction] Manual receipt found:', data.result);
            // status is hex: 0x1 = success, 0x0 = failed
            const status = data.result.status === '0x1' ? 'success' : 'reverted';
            setManualReceipt({ ...data.result, status });
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
        } catch (err) {
          console.warn('[useTransaction] Manual polling error:', err);
        }
      }, 2000);
    }, 5000);

    return () => {
      clearTimeout(startPolling);
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [hash, receipt, receiptError]);

  // Reset manual states when hash changes
  useEffect(() => {
    if (hash) {
      setManualReceipt(null);
      setManualError(false);
      pollCountRef.current = 0;
    }
  }, [hash]);

  // Combined loading state - also check if we're waiting for manual receipt
  const isLoading = isSending || (isWaitingForReceipt && !manualReceipt && !manualError);

  // Use wagmi receipt or fallback to manual receipt
  const effectiveReceipt = receipt || manualReceipt;
  const effectiveReceiptSuccess = receiptSuccess || !!manualReceipt;

  // Determine actual success/error based on receipt status
  // A transaction can be mined successfully but still be reverted on-chain
  // Note: viem/wagmi uses 'reverted' for failed transactions
  const isTransactionReverted = effectiveReceiptSuccess && effectiveReceipt && effectiveReceipt.status === 'reverted';
  const isSuccess = effectiveReceiptSuccess && effectiveReceipt && effectiveReceipt.status === 'success';
  
  // Error can come from: send failure, receipt fetch failure, on-chain revert, or manual timeout
  const isError = sendError || receiptError || isTransactionReverted || manualError;
  const error = sendErrorDetails || receiptErrorDetails || (manualError ? { message: 'Transaction may have failed. Please check the explorer.' } : null);

  const handleSendTx = useCallback(
    (tx) => {
      if (!tx) return;
      try {
        sendTransaction({ ...tx });
      } catch (err) {
        console.log('Error sending transaction:', err);
      }
    },
    [sendTransaction]
  );

  return {
    handleSendTx,
    hash,
    receipt: effectiveReceipt,
    isLoading,
    isSending,
    isWaitingForReceipt,
    isSuccess,
    isError,
    isTransactionReverted,
    error,
    resetSendTransaction,
  };
};
