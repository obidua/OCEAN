import { useEffect, useState, useRef } from 'react';
import { X, Loader2, CheckCircle, AlertCircle, Wallet, FileCheck, Rocket, Award, ExternalLink, Copy } from 'lucide-react';
import { useWaitForTransactionReceipt } from 'wagmi';

// Import improved sound system
const playTransactionSound = async (stage) => {
  // Use global audio context for better mobile performance
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  
  if (!AudioContext) return;

  try {
    // Try to get existing audio context or create new one
    let audioContext;
    if (window.globalAudioContext && window.globalAudioContext.state !== 'closed') {
      audioContext = window.globalAudioContext;
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
    } else {
      audioContext = new AudioContext();
      window.globalAudioContext = audioContext;
    }
    
    const soundConfig = {
      prepare: { frequency: 500, type: 'sine', duration: 0.3 },
      sign: { frequency: 600, type: 'triangle', duration: 0.4 },
      processing: { frequency: 700, type: 'sine', duration: 0.5, pulse: true },
      success: [523.25, 659.25, 783.99, 1046.50], // Success chord
      error: { frequency: 300, type: 'sawtooth', duration: 0.6 }
    };

    const config = soundConfig[stage];
    
    if (Array.isArray(config)) {
      // Play chord for success
      config.forEach((freq, index) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + index * 0.1 + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + index * 0.1 + 0.4);
        
        oscillator.start(audioContext.currentTime + index * 0.1);
        oscillator.stop(audioContext.currentTime + index * 0.1 + 0.4);
      });
    } else if (config) {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(config.frequency, audioContext.currentTime);
      oscillator.type = config.type;
      
      if (config.pulse && stage === 'processing') {
        // Pulsing sound for processing
        const lfo = audioContext.createOscillator();
        const lfoGain = audioContext.createGain();
        
        lfo.frequency.setValueAtTime(2, audioContext.currentTime); // 2Hz pulse
        lfo.connect(lfoGain);
        lfoGain.connect(gainNode.gain);
        lfoGain.gain.setValueAtTime(0.05, audioContext.currentTime);
        
        lfo.start(audioContext.currentTime);
        lfo.stop(audioContext.currentTime + config.duration);
      }
      
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + config.duration);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + config.duration);
    }
    
  } catch (error) {
    console.warn('Could not play transaction sound:', error);
  }
};

const STAGES = {
  PREPARE: 'prepare',
  SIGN: 'sign',
  PROCESSING: 'processing',
  SUCCESS: 'success',
  ERROR: 'error',
};

const AUTO_CLOSE_DELAY = 30; // seconds - Extended to give users more time to see transaction details

const ProgressiveTransactionModal = ({
  isOpen,
  onClose,
  txHash,
  title = 'Transaction',
  description = 'Processing your transaction',
  successMessage = 'Transaction completed successfully!',
  onSuccess,
  amount,
  amountLabel,
}) => {
  const [stage, setStage] = useState(STAGES.PREPARE);
  const [progress, setProgress] = useState(0);
  const [countdown, setCountdown] = useState(AUTO_CLOSE_DELAY);
  const countdownTimerRef = useRef(null);
  const progressIntervalRef = useRef(null);
  const [copied, setCopied] = useState(false);

  const { isLoading, isSuccess, isError, error } = useWaitForTransactionReceipt({
    hash: txHash,
    enabled: !!txHash,
  });

  // Handle stage transitions based on transaction status
  useEffect(() => {
    if (!isOpen) {
      setStage(STAGES.PREPARE);
      setProgress(0);
      setCountdown(AUTO_CLOSE_DELAY);
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      return;
    }

    // Stage 1: Transaction prepared, waiting for hash
    if (!txHash) {
      if (stage !== STAGES.PREPARE) {
        playTransactionSound('prepare');
      }
      setStage(STAGES.PREPARE);
      setProgress(10);
    }
    // Stage 2: Hash received, waiting for user to sign
    else if (txHash && !isLoading && !isSuccess && !isError) {
      if (stage !== STAGES.SIGN) {
        playTransactionSound('sign');
      }
      setStage(STAGES.SIGN);
      setProgress(25);
    }
    // Stage 3: Transaction is being processed on blockchain
    else if (isLoading) {
      if (stage !== STAGES.PROCESSING) {
        playTransactionSound('processing');
      }
      setStage(STAGES.PROCESSING);
      setProgress(50);
      
      // Animate progress bar during processing
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      progressIntervalRef.current = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) return prev;
          return prev + 2;
        });
      }, 200);
    }
    // Stage 4: Transaction succeeded
    else if (isSuccess) {
      if (stage !== STAGES.SUCCESS) {
        playTransactionSound('success');
      }
      setStage(STAGES.SUCCESS);
      setProgress(100);
      
      // Clear progress animation
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }

      // Call success callback and start countdown
      if (onSuccess) {
        setTimeout(() => onSuccess(), 500);
      }
      
      // Start countdown timer for auto-close
      setCountdown(AUTO_CLOSE_DELAY);
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
      countdownTimerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (countdownTimerRef.current) {
              clearInterval(countdownTimerRef.current);
              countdownTimerRef.current = null;
            }
            // Auto-close and refresh page
            setTimeout(() => {
              onClose();
              window.location.reload();
            }, 100);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    // Stage 5: Transaction failed
    else if (isError) {
      if (stage !== STAGES.ERROR) {
        playTransactionSound('error');
      }
      setStage(STAGES.ERROR);
      setProgress(0);
      
      // Clear progress animation
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    }

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [isOpen, txHash, isLoading, isSuccess, isError, onSuccess, onClose]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  if (!isOpen) return null;

  const explorerTxBase = (import.meta?.env?.VITE_EXPLORER_TX || import.meta?.env?.VITE_BLOCK_EXPLORER_TX || 'https://ramascan.com/tx/').replace(/\/$/, '/')

  const stageConfig = {
    [STAGES.PREPARE]: {
      icon: Wallet,
      iconColor: 'text-cyan-400',
      bgColor: 'from-cyan-500/20 to-blue-500/20',
      title: 'Preparing Transaction',
      subtitle: 'Please wait while we prepare your transaction...',
    },
    [STAGES.SIGN]: {
      icon: FileCheck,
      iconColor: 'text-yellow-400',
      bgColor: 'from-yellow-500/20 to-orange-500/20',
      title: 'Sign Transaction',
      subtitle: 'Please sign the transaction in your wallet',
      pulse: true,
    },
    [STAGES.PROCESSING]: {
      icon: Rocket,
      iconColor: 'text-purple-400',
      bgColor: 'from-purple-500/20 to-pink-500/20',
      title: 'Processing',
      subtitle: 'Transaction is being confirmed on the blockchain...',
      pulse: true,
    },
    [STAGES.SUCCESS]: {
      icon: CheckCircle,
      iconColor: 'text-neon-green',
      bgColor: 'from-neon-green/20 to-cyan-500/20',
      title: 'Success!',
      subtitle: successMessage,
    },
    [STAGES.ERROR]: {
      icon: AlertCircle,
      iconColor: 'text-red-400',
      bgColor: 'from-red-500/20 to-orange-500/20',
      title: 'Transaction Failed',
      subtitle: error?.message || 'Something went wrong. Please try again.',
    },
  };

  const currentConfig = stageConfig[stage];
  const Icon = currentConfig.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-dark-950/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div
        className="relative w-full max-w-sm sm:max-w-md cyber-glass rounded-2xl p-4 sm:p-6 md:p-8 border border-cyan-500/30 shadow-2xl shadow-cyan-500/20 animate-in zoom-in-95 duration-300 mx-2"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        {(stage === STAGES.SUCCESS || stage === STAGES.ERROR) && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-lg hover:bg-cyan-500/10 transition-colors"
          >
            <X size={20} className="text-cyan-400" />
          </button>
        )}

        {/* Header gradient line */}
        <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${currentConfig.bgColor}`} />

        {/* Main content */}
        <div className="text-center space-y-6">
          {/* Icon */}
          <div className="flex justify-center">
            <div
              className={`relative p-4 sm:p-6 rounded-full bg-gradient-to-br ${currentConfig.bgColor} ${
                currentConfig.pulse ? 'animate-pulse' : ''
              }`}
            >
              <Icon size={32} className={`sm:w-12 sm:h-12 ${currentConfig.iconColor}`} />
              {stage === STAGES.PROCESSING && (
                <div className="absolute inset-0 rounded-full border-2 sm:border-4 border-transparent border-t-cyan-400 animate-spin" />
              )}
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-neon-green">
              {title}
            </h3>
            <p className="text-sm sm:text-base md:text-lg font-semibold text-cyan-300">{currentConfig.title}</p>
            <p className="text-xs sm:text-sm text-cyan-300/80">{currentConfig.subtitle}</p>
          </div>

          {/* Amount display */}
          {amount && amountLabel && stage !== STAGES.ERROR && (
            <div className="cyber-glass rounded-xl p-3 sm:p-4 border border-cyan-500/20">
              <p className="text-xs text-cyan-400 uppercase tracking-wide mb-1">{amountLabel}</p>
              <p className="text-xl sm:text-2xl md:text-3xl font-bold text-neon-green">{amount}</p>
            </div>
          )}

          {/* Progress bar */}
          {stage !== STAGES.ERROR && stage !== STAGES.SUCCESS && (
            <div className="space-y-2">
              <div className="h-2 w-full rounded-full bg-cyan-500/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-neon-green transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-cyan-300/60">{progress}% complete</p>
            </div>
          )}

          {/* Stage indicators */}
          <div className="flex justify-center items-center gap-2 md:gap-3">
            {[
              { key: STAGES.PREPARE, label: 'Prepare' },
              { key: STAGES.SIGN, label: 'Sign' },
              { key: STAGES.PROCESSING, label: 'Process' },
              { key: STAGES.SUCCESS, label: 'Done' },
            ].map((s, idx) => {
              const isCurrent = stage === s.key;
              const isPast =
                (stage === STAGES.SIGN && idx < 1) ||
                (stage === STAGES.PROCESSING && idx < 2) ||
                (stage === STAGES.SUCCESS && idx < 3);
              const isActive = isCurrent || isPast || stage === STAGES.SUCCESS;

              return (
                <div key={s.key} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                        isActive
                          ? 'border-cyan-400 bg-cyan-500/20'
                          : 'border-cyan-500/20 bg-dark-950/50'
                      }`}
                    >
                      {stage === STAGES.SUCCESS && idx < 3 ? (
                        <CheckCircle size={16} className="text-neon-green" />
                      ) : isCurrent ? (
                        <Loader2 size={16} className="text-cyan-400 animate-spin" />
                      ) : isPast ? (
                        <CheckCircle size={16} className="text-cyan-400" />
                      ) : (
                        <span className={`text-xs ${isActive ? 'text-cyan-400' : 'text-cyan-500/40'}`}>
                          {idx + 1}
                        </span>
                      )}
                    </div>
                    <span
                      className={`text-[10px] mt-1 ${
                        isActive ? 'text-cyan-400' : 'text-cyan-500/40'
                      } hidden md:block`}
                    >
                      {s.label}
                    </span>
                  </div>
                  {idx < 3 && (
                    <div
                      className={`w-8 md:w-12 h-0.5 mx-1 transition-all duration-300 ${
                        isPast || (stage === STAGES.SUCCESS && idx < 2)
                          ? 'bg-cyan-400'
                          : 'bg-cyan-500/20'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Transaction hash */}
          {txHash && stage !== STAGES.ERROR && (
            <div className="pt-4 border-t border-cyan-500/10 space-y-3">
              <p className="text-xs text-cyan-400/80 uppercase tracking-wider font-semibold">
                Transaction Details
              </p>
              
              {/* Transaction hash display */}
              <div className="cyber-glass rounded-lg p-3 border border-cyan-500/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-cyan-400 font-medium">Transaction Hash</span>
                  <span className={`text-xs px-2 py-1 rounded-full border ${
                    stage === STAGES.SUCCESS 
                      ? 'border-neon-green/40 text-neon-green bg-neon-green/10'
                      : stage === STAGES.PROCESSING
                      ? 'border-yellow-400/40 text-yellow-400 bg-yellow-400/10'
                      : 'border-cyan-500/40 text-cyan-400 bg-cyan-500/10'
                  }`}>
                    {stage === STAGES.SUCCESS ? 'Confirmed' : stage === STAGES.PROCESSING ? 'Pending' : 'Submitted'}
                  </span>
                </div>
                <div className="text-xs text-cyan-300/90 break-all font-mono bg-dark-950/50 rounded px-2 py-1.5 border border-cyan-500/10">
                  {txHash}
                </div>
              </div>
              
              {/* Action buttons */}
              {stage === STAGES.SUCCESS && (
                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={`${explorerTxBase}${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-cyan-500/30 text-cyan-200 hover:bg-cyan-500/10 transition-colors text-sm"
                  >
                    <ExternalLink size={14} />
                    View on Explorer
                  </a>
                  <button
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(txHash);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      } catch {}
                    }}
                    className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-cyan-500/30 text-cyan-200 hover:bg-cyan-500/10 transition-colors text-sm"
                  >
                    <Copy size={14} />
                    {copied ? 'Copied!' : 'Copy Hash'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Action buttons for success */}
          {stage === STAGES.SUCCESS && (
            <div className="space-y-4">
              {/* Primary action buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <a
                  href={`${explorerTxBase}${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-cyan-500/50 transition-all"
                >
                  <ExternalLink size={16} />
                  View on Ramascan
                </a>
                <a
                  href="/"
                  className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-neon-green to-cyan-500 text-dark-950 rounded-xl font-semibold hover:shadow-lg hover:shadow-neon-green/50 transition-all"
                >
                  <Award size={16} />
                  Ocean DeFi Dashboard
                </a>
              </div>
              
              {/* Secondary action */}
              <button
                onClick={() => {
                  if (countdownTimerRef.current) {
                    clearInterval(countdownTimerRef.current);
                  }
                  onClose();
                  window.location.reload();
                }}
                className="w-full px-6 py-2.5 cyber-glass border border-cyan-500/30 text-cyan-200 rounded-lg font-medium hover:border-cyan-500/50 hover:bg-cyan-500/10 transition-all text-sm"
              >
                Close & Refresh Data
              </button>
              
              {/* Auto-close info */}
              <div className="text-center space-y-1">
                <p className="text-xs text-cyan-300/70">
                  Auto-closing in <span className="font-semibold text-neon-green">{countdown}</span> second{countdown !== 1 ? 's' : ''}...
                </p>
                <button
                  onClick={() => {
                    if (countdownTimerRef.current) {
                      clearInterval(countdownTimerRef.current);
                      countdownTimerRef.current = null;
                    }
                    setCountdown(0); // Stop countdown
                  }}
                  className="text-xs text-cyan-400 hover:text-cyan-200 underline"
                >
                  Cancel auto-close
                </button>
              </div>
            </div>
          )}

          {stage === STAGES.ERROR && (
            <div className="space-y-2">
              <button
                onClick={onClose}
                className="w-full mt-4 px-6 py-3 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-xl font-bold hover:shadow-lg hover:shadow-red-500/50 transition-all"
              >
                Close & Retry
              </button>
              <p className="text-xs text-red-300/70">
                Please check your wallet and try again
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProgressiveTransactionModal;
