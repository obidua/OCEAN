// Toast notification system matching the cyber-glass UI design
let toastContainer = null;
let toastId = 0;

const TOAST_DURATION = 5000; // 5 seconds default

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
const createToastElement = (type, title, message, duration) => {
  const id = ++toastId;
  const container = initToastContainer();

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
        <p class="text-sm text-cyan-300/90">${message}</p>
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
  success: (message, title = 'Success', duration = TOAST_DURATION) => {
    return createToastElement('success', title, message, duration);
  },
  error: (message, title = 'Error', duration = TOAST_DURATION) => {
    return createToastElement('error', title, message, duration);
  },
  warning: (message, title = 'Warning', duration = TOAST_DURATION) => {
    return createToastElement('warning', title, message, duration);
  },
  info: (message, title = 'Info', duration = TOAST_DURATION) => {
    return createToastElement('info', title, message, duration);
  },
  // Convenience method for simple messages without title
  show: (message, type = 'info', duration = TOAST_DURATION) => {
    return createToastElement(type, null, message, duration);
  },
};

export default toast;
