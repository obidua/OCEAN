import { useCallback } from 'react';
import { useSendTransaction } from 'wagmi';

export const useTransaction = () => {
  const { sendTransaction, data: hash } = useSendTransaction();

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
  };
};
