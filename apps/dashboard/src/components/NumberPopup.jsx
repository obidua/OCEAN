
import { Loader2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export default function NumberPopup({
  value,
  label,
  className = '',
  truncateClass = 'truncate',
  isLoading = false,
  disabled = false,
}) {
  const [showPopup, setShowPopup] = useState(false);
  const modalRoot = typeof document !== 'undefined' ? document.body : null;
  const isDisabled = disabled || isLoading;

  useEffect(() => {
    if (isDisabled && showPopup) {
      setShowPopup(false);
    }
  }, [isDisabled, showPopup]);

  const loadingContent = (
    <span className="inline-flex items-center gap-2 text-cyan-200 text-sm">
      <Loader2 className="animate-spin" size={16} />
      <span>Loading…</span>
    </span>
  );

  const displayValue = isLoading ? loadingContent : value;

  const popupContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 sm:px-6 py-6 bg-black/80 backdrop-blur-md animate-fadeIn"
      onClick={() => setShowPopup(false)}
    >
      <div
        className="relative w-full max-w-3xl sm:max-w-4xl md:max-w-5xl lg:max-w-6xl max-h-[90vh] overflow-hidden bg-cyan-900/10 border border-cyan-500/30 rounded-2xl shadow-neon-cyan flex flex-col p-6 sm:p-8 animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h3 className="text-lg sm:text-xl md:text-2xl font-semibold text-cyan-300 uppercase tracking-wide">
            {label}
          </h3>
          <button
            onClick={() => setShowPopup(false)}
            className="p-2 hover:bg-cyan-500/20 rounded-lg border border-cyan-500/30 flex-shrink-0 transition-all group"
          >
            <X size={24} className="text-cyan-400 group-hover:text-neon-green transition-colors" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto min-h-0 mb-4 sm:mb-6">
          <div className="flex items-center justify-center w-full h-full p-6 sm:p-12 bg-cyan-900/20 border border-cyan-500/30 rounded-xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-neon-green/5 opacity-50 group-hover:opacity-70 transition-opacity" />
            <p className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-neon-green text-center break-all leading-tight relative z-10 text-neon-glow">
              {displayValue}
            </p>
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={() => setShowPopup(false)}
          className="w-full py-3 sm:py-4 bg-gradient-to-r from-cyan-500 to-neon-green text-dark-950 rounded-xl text-lg sm:text-xl font-bold hover:shadow-neon-cyan transition-all hover:scale-[1.02] uppercase tracking-wide relative overflow-hidden group"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-neon-green opacity-0 group-hover:opacity-100 transition-opacity" />
          <span className="relative z-10">Close</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (!isDisabled) {
            setShowPopup(true);
          }
        }}
        disabled={isDisabled}
        className={`${className} ${truncateClass} text-left w-full transition-opacity ${isDisabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer hover:opacity-80'}`}
        title={isDisabled ? undefined : 'Click to view full value'}
      >
        {displayValue}
      </button>

      {showPopup && !isDisabled && modalRoot && createPortal(popupContent, modalRoot)}
    </>
  );
}
