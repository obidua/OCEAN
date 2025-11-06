/**
 * Console Filter Utility
 * Suppresses known non-critical warnings and errors in development
 */

const originalWarn = console.warn;
const originalError = console.error;

// List of warning messages to suppress (safe to ignore)
const SUPPRESSED_WARNINGS = [
  'Lit is in dev mode',
  'Element w3m-router-container scheduled an update',
  'Download the React DevTools',
  'change-in-update',
  'dev-mode'
];

// List of error messages to suppress (known library bugs)
const SUPPRESSED_ERRORS = [
  'attribute width: Unexpected end of attribute',
  'attribute height: Unexpected end of attribute',
  '<svg> attribute width',
  '<svg> attribute height'
];

// List of RPC errors that are expected (user actions)
const EXPECTED_RPC_ERRORS = [
  'User rejected the request',
  'User denied',
  'User cancelled'
];

/**
 * Filter console warnings
 */
console.warn = (...args) => {
  const message = args.join(' ');
  
  // Check if it's a suppressed warning
  const shouldSuppress = SUPPRESSED_WARNINGS.some(pattern => 
    message.includes(pattern)
  );
  
  if (!shouldSuppress) {
    originalWarn.apply(console, args);
  }
};

/**
 * Filter console errors
 */
console.error = (...args) => {
  const message = args.join(' ');
  
  // Check if it's a suppressed error
  const shouldSuppress = SUPPRESSED_ERRORS.some(pattern => 
    message.includes(pattern)
  );
  
  // Check if it's an expected RPC error (show as info instead)
  const isExpectedRpcError = EXPECTED_RPC_ERRORS.some(pattern =>
    message.includes(pattern)
  );
  
  if (isExpectedRpcError) {
    // Show user rejection as info, not error
    console.info('ℹ️ Wallet connection cancelled by user');
    return;
  }
  
  if (!shouldSuppress) {
    originalError.apply(console, args);
  }
};

// Export for manual control if needed
export const enableConsoleFiltering = () => {
  console.log('✅ Console filtering enabled - suppressing known non-critical warnings');
};

export const disableConsoleFiltering = () => {
  console.warn = originalWarn;
  console.error = originalError;
  console.log('ℹ️ Console filtering disabled - showing all messages');
};

// Auto-enable in development
if (import.meta.env.DEV) {
  enableConsoleFiltering();
}

export default {
  enableConsoleFiltering,
  disableConsoleFiltering
};
