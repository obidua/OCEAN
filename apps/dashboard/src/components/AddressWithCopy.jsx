import CopyButton from './CopyButton';

export default function AddressWithCopy({
  address,
  className = '',
  textClassName = 'font-mono text-cyan-200',
  copyLabel = '',
  truncate = true,
}) {
  if (!address) {
    return <span className={className}>—</span>;
  }

  const isCopyable = /^0x[a-fA-F0-9]{40}$/.test(address);
  const truncated =
    truncate && address.length > 10 && isCopyable
      ? `${address.slice(0, 6)}…${address.slice(-4)}`
      : address;

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span className={textClassName}>{truncated}</span>
      {isCopyable && (
        <CopyButton
          text={address}
          label={copyLabel}
          className="px-1 py-0.5"
          iconClassName="text-cyan-300"
          ariaLabel="Copy address"
        />
      )}
    </span>
  );
}
