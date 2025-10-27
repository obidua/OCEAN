// Toast notification system matching the cyber-glass UI design
let toastContainer = null;
let toastId = 0;

const TOAST_DURATION = 5000; // 5 seconds default

// Play notification sound
const playNotificationSound = (type) => {
  try {
    // Create audio context for different notification sounds
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Different sound patterns for different events
    const soundPatterns = {
      success: [523.25, 659.25, 783.99], // C, E, G major chord
      error: [392.00, 329.63], // G, E minor
      warning: [440.00, 554.37], // A, C# 
      info: [523.25, 659.25], // C, E
      
      // Financial sounds
      coinDrop: [800, 600, 400, 300], // Descending coin drop sound
      cashRegister: [523.25, 659.25, 783.99, 1046.50], // Ascending cash register
      income: [440, 554.37, 659.25, 783.99], // Pleasant ascending for income
      debit: [440, 369.99, 329.63], // Descending for debit/expense
      portfolioUpdate: [523.25, 659.25], // Simple notification for portfolio changes
      roiAlert: [659.25, 783.99, 987.77, 1174.66], // Exciting ROI notification
      moneyIn: [523.25, 659.25, 783.99, 1046.50, 1318.51], // Rich money-in sound
      moneyOut: [523.25, 415.30, 329.63, 261.63], // Money going out sound
    };
    
    const pattern = soundPatterns[type] || soundPatterns.info;
    
    // Different playing styles for different sound types
    if (type === 'coinDrop') {
      // Rapid coin drop effect
      pattern.forEach((freq, index) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);
        oscillator.type = 'triangle'; // Metallic sound for coins
        
        // Quick envelope for coin drop
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.15, audioContext.currentTime + index * 0.05 + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + index * 0.05 + 0.15);
        
        oscillator.start(audioContext.currentTime + index * 0.05);
        oscillator.stop(audioContext.currentTime + index * 0.05 + 0.15);
      });
    } else if (type === 'cashRegister' || type === 'income' || type === 'roiAlert' || type === 'moneyIn') {
      // Pleasant ascending sounds for positive financial events
      pattern.forEach((freq, index) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);
        oscillator.type = 'sine';
        
        // Pleasant envelope
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.12, audioContext.currentTime + index * 0.08 + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + index * 0.08 + 0.25);
        
        oscillator.start(audioContext.currentTime + index * 0.08);
        oscillator.stop(audioContext.currentTime + index * 0.08 + 0.25);
      });
    } else if (type === 'debit' || type === 'moneyOut') {
      // Descending sounds for money going out
      pattern.forEach((freq, index) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);
        oscillator.type = 'sawtooth'; // Slightly sharper for negative events
        
        // Subtle envelope
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.08, audioContext.currentTime + index * 0.1 + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + index * 0.1 + 0.2);
        
        oscillator.start(audioContext.currentTime + index * 0.1);
        oscillator.stop(audioContext.currentTime + index * 0.1 + 0.2);
      });
    } else {
      // Default notification sounds
      pattern.forEach((freq, index) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);
        oscillator.type = 'sine';
        
        // Volume envelope
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        
        oscillator.start(audioContext.currentTime + index * 0.1);
        oscillator.stop(audioContext.currentTime + 0.2 + index * 0.1);
      });
    }
  } catch (error) {
    console.warn('Could not play notification sound:', error);
  }
};

// Initialize toast container
const initToastContainer = () => {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.className = 'fixed top-4 right-4 z-[9999] flex flex-col gap-3 max-w-md pointer-events-none';
    document.body.appendChild(toastContainer);
  }
  return toastContainer;
};

// Create toast element
const createToastElement = (type, title, message, duration, options = {}) => {
  const id = ++toastId;
  const container = initToastContainer();
  
  // Prevent duplicate messages (check if same message exists)
  const existingToasts = container.querySelectorAll('.toast-message');
  for (let existing of existingToasts) {
    if (existing.textContent === message) {
      console.log('Duplicate toast prevented:', message);
      return existing.closest('[id^="toast-"]');
    }
  }

  // Play notification sound
  if (options.playSound !== false) {
    playNotificationSound(type);
  }

  const toast = document.createElement('div');
  toast.id = `toast-${id}`;
  toast.className = `
    cyber-glass border rounded-xl p-4 shadow-2xl 
    transform transition-all duration-300 ease-out
    opacity-0 translate-x-8 pointer-events-auto
    animate-slide-in-right
  `.trim();

  // Set border and icon color based on type
  let borderColor, iconColor, icon, bgGradientClasses;
  switch (type) {
    case 'success':
      borderColor = 'border-neon-green/40';
      iconColor = 'text-neon-green';
      bgGradientClasses = ['bg-gradient-to-br', 'from-neon-green/5', 'to-cyan-500/5'];
      icon = `
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
        </svg>
      `;
      break;
    case 'error':
      borderColor = 'border-red-500/40';
      iconColor = 'text-red-400';
      bgGradientClasses = ['bg-gradient-to-br', 'from-red-500/5', 'to-orange-500/5'];
      icon = `
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      `;
      break;
    case 'warning':
      borderColor = 'border-neon-orange/40';
      iconColor = 'text-neon-orange';
      bgGradientClasses = ['bg-gradient-to-br', 'from-neon-orange/5', 'to-amber-500/5'];
      icon = `
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
        </svg>
      `;
      break;
    case 'info':
    default:
      borderColor = 'border-cyan-500/40';
      iconColor = 'text-cyan-400';
      bgGradientClasses = ['bg-gradient-to-br', 'from-cyan-500/5', 'to-blue-500/5'];
      icon = `
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
      `;
  }

  toast.classList.add(borderColor, ...bgGradientClasses);

  toast.innerHTML = `
    <div class="flex items-start gap-3">
      <div class="flex-shrink-0 mt-0.5 ${iconColor}">
        ${icon}
      </div>
      <div class="flex-1 min-w-0">
        ${title ? `<p class="text-sm font-semibold text-cyan-300 mb-1">${title}</p>` : ''}
        <p class="text-sm text-cyan-300/90 toast-message">${message}</p>
      </div>
      <button 
        onclick="document.getElementById('toast-${id}').remove()" 
        class="flex-shrink-0 text-cyan-300/60 hover:text-cyan-300 transition-colors"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>
    </div>
  `;

  container.appendChild(toast);

  // Trigger animation
  requestAnimationFrame(() => {
    toast.classList.remove('opacity-0', 'translate-x-8');
    toast.classList.add('opacity-100', 'translate-x-0');
  });

  // Auto-remove after duration
  if (duration > 0) {
    setTimeout(() => {
      removeToast(toast);
    }, duration);
  }

  return toast;
};

// Remove toast with animation
const removeToast = (toast) => {
  if (!toast || !toast.parentElement) return;
  
  toast.classList.remove('opacity-100', 'translate-x-0');
  toast.classList.add('opacity-0', 'translate-x-8');
  
  setTimeout(() => {
    if (toast && toast.parentElement) {
      toast.remove();
    }
  }, 300);
};

// Public API
export const toast = {
  success: (message, options = {}) => {
    const { title = 'Success', duration = TOAST_DURATION, ...rest } = options;
    return createToastElement('success', title, message, duration, rest);
  },
  error: (message, options = {}) => {
    const { title = 'Error', duration = TOAST_DURATION, ...rest } = options;
    return createToastElement('error', title, message, duration, rest);
  },
  warning: (message, options = {}) => {
    const { title = 'Warning', duration = TOAST_DURATION, ...rest } = options;
    return createToastElement('warning', title, message, duration, rest);
  },
  info: (message, options = {}) => {
    const { title = 'Info', duration = TOAST_DURATION, ...rest } = options;
    return createToastElement('info', title, message, duration, rest);
  },
  // Convenience method for simple messages without title
  show: (message, type = 'info', options = {}) => {
    const { duration = TOAST_DURATION, ...rest } = options;
    return createToastElement(type, null, message, duration, rest);
  },
};

export default toast;
