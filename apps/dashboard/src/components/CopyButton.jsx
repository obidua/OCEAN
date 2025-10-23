import { Copy, Check } from 'lucide-react';
import { useState } from 'react';

export default function CopyButton({
  text,
  label = 'Copy',
  className = '',
  iconClassName = '',
  ariaLabel,
}) {
  const [copied, setCopied] = useState(false);
  const showLabel = Boolean(label);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`inline-flex items-center ${showLabel ? 'gap-1.5 px-2 py-1' : 'gap-1 px-1.5 py-1'} text-xs font-medium text-cyan-400 hover:text-neon-green transition-colors hover:bg-cyan-500/10 rounded ${className}`}
      aria-label={ariaLabel || label || 'Copy value'}
    >
      {copied ? (
        <>
          <Check size={12} className="text-neon-green" />
          {showLabel ? <span className="text-neon-green">{label}</span> : null}
        </>
      ) : (
        <>
          <Copy size={12} className={iconClassName} />
          {showLabel ? <span>{label}</span> : null}
        </>
      )}
    </button>
  );
}
