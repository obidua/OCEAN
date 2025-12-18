// Universal Income Tracking System for Ocean DeFi Dashboard
// Detects income changes across all sources and triggers visual/audio notifications

import financialSounds from './financialSounds';
import toast from './toast';

class IncomeTracker {
  constructor() {
    this.previousValues = new Map();
    this.listeners = new Set();
    this.isActive = true;
    this.glowElements = new Set();
    
    // Income types mapping
    this.incomeTypes = {
      'roi': { label: 'ROI Reward', icon: '💎', color: 'emerald' },
      'direct': { label: 'Direct Income', icon: '🎯', color: 'blue' },
      'slab': { label: 'Slab Reward', icon: '🏆', color: 'purple' },
      'royalty': { label: 'Royalty Income', icon: '👑', color: 'yellow' },
      'sameSlab': { label: 'Same Slab Bonus', icon: '🤝', color: 'orange' },
      'portfolio': { label: 'Portfolio Growth', icon: '📈', color: 'green' },
      'safeWallet': { label: 'Safe Wallet Credit', icon: '🔒', color: 'cyan' },
      'referral': { label: 'Referral Bonus', icon: '👥', color: 'pink' },
      'team': { label: 'Team Business', icon: '🏢', color: 'indigo' }
    };
    
    this.loadSettings();
  }

  // Load settings from localStorage
  loadSettings() {
    const enabled = localStorage.getItem('incomeTrackingEnabled');
    this.isActive = enabled === null ? true : enabled === 'true';
  }

  // Save settings to localStorage
  saveSettings() {
    localStorage.setItem('incomeTrackingEnabled', this.isActive.toString());
  }

  // Enable/disable income tracking
  setActive(active) {
    this.isActive = active;
    this.saveSettings();
  }

  // Register a listener for income changes
  addListener(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  // Track value changes and detect income
  trackValue(key, newValue, type = 'portfolio', metadata = {}) {
    if (!this.isActive || !newValue || newValue <= 0) return;

    const previousValue = this.previousValues.get(key) || 0;
    const increase = newValue - previousValue;

    if (increase > 0) {
      // console.log(`💰 Income detected: ${type} +$${increase.toFixed(2)} (${key})`);
      
      // Store new value
      this.previousValues.set(key, newValue);
      
      // Trigger notifications and effects
      this.handleIncomeIncrease({
        key,
        type,
        previousValue,
        newValue,
        increase,
        metadata
      });
    } else {
      // Just update the stored value
      this.previousValues.set(key, newValue);
    }
  }

  // Handle income increase with visual and audio effects
  handleIncomeIncrease(incomeData) {
    const { type, increase, metadata } = incomeData;
    const config = this.incomeTypes[type] || this.incomeTypes.portfolio;

    // Play appropriate sound
    this.playIncomeSound(type, increase);

    // Show notification
    this.showIncomeNotification(config, increase, metadata);

    // Trigger glow effect on associated elements
    this.triggerGlowEffect(incomeData);

    // Notify listeners
    this.listeners.forEach(callback => {
      try {
        callback(incomeData);
      } catch (error) {
        console.error('Error in income listener:', error);
      }
    });
  }

  // Play sound based on income type and amount
  playIncomeSound(type, amount) {
    if (amount > 100) {
      financialSounds.playROIIncome(amount);
    } else if (amount > 10) {
      financialSounds.playMoneyIn(amount);
    } else {
      financialSounds.playCoinDrop(amount);
    }
  }

  // Show income notification
  showIncomeNotification(config, amount, metadata) {
    const message = `+$${amount.toFixed(2)} ${config.label}`;
    const title = `${config.icon} Income Credit`;

    toast.success(message, {
      title,
      duration: 5000,
      playSound: false // We handle sound separately
    });
  }

  // Trigger glow effect on DOM elements
  triggerGlowEffect(incomeData) {
    const { key, type, increase } = incomeData;
    
    // Find elements to glow by data attributes or classes
    const selectors = [
      `[data-income-key="${key}"]`,
      `[data-income-type="${type}"]`,
      `.income-${type}`,
      `.total-${type}`,
      '.total-balance',
      '.safe-wallet-balance'
    ];

    selectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => this.addGlowEffect(element, type, increase));
    });
  }

  // Add glow animation to element
  addGlowEffect(element, type, amount) {
    if (!element) return;

    const config = this.incomeTypes[type] || this.incomeTypes.portfolio;
    const glowClass = `glow-${config.color}`;
    const pulseClass = `pulse-${config.color}`;

    // Remove existing glow effects
    element.classList.remove(...Object.keys(this.incomeTypes).map(t => `glow-${this.incomeTypes[t].color}`));
    element.classList.remove(...Object.keys(this.incomeTypes).map(t => `pulse-${this.incomeTypes[t].color}`));

    // Add new glow effect
    element.classList.add(glowClass, pulseClass, 'income-highlight');

    // Create floating amount indicator
    this.createFloatingAmount(element, amount, config);

    // Remove effect after animation
    setTimeout(() => {
      element.classList.remove(glowClass, pulseClass, 'income-highlight');
    }, 3000);
  }

  // Create floating +$amount indicator
  createFloatingAmount(element, amount, config) {
    const floater = document.createElement('div');
    floater.className = `floating-amount floating-${config.color}`;
    floater.textContent = `+$${amount.toFixed(2)}`;
    
    const rect = element.getBoundingClientRect();
    floater.style.position = 'fixed';
    floater.style.left = `${rect.right - 20}px`;
    floater.style.top = `${rect.top}px`;
    floater.style.zIndex = '9999';
    floater.style.pointerEvents = 'none';
    floater.style.fontSize = '12px';
    floater.style.fontWeight = 'bold';
    floater.style.color = this.getColorValue(config.color);
    floater.style.textShadow = '0 0 10px currentColor';
    floater.style.animation = 'floatUp 2s ease-out forwards';

    document.body.appendChild(floater);

    setTimeout(() => {
      if (floater.parentNode) {
        floater.parentNode.removeChild(floater);
      }
    }, 2000);
  }

  // Get color value for different income types
  getColorValue(color) {
    const colors = {
      emerald: '#10b981',
      blue: '#3b82f6',
      purple: '#8b5cf6',
      yellow: '#f59e0b',
      orange: '#f97316',
      green: '#22c55e',
      cyan: '#06b6d4',
      pink: '#ec4899',
      indigo: '#6366f1'
    };
    return colors[color] || colors.emerald;
  }

  // Reset tracking (useful for testing)
  reset() {
    this.previousValues.clear();
  }

  // Get all tracked values
  getTrackedValues() {
    return Object.fromEntries(this.previousValues);
  }
}

// Create singleton instance
const incomeTracker = new IncomeTracker();

// Add CSS for glow effects
const style = document.createElement('style');
style.textContent = `
  /* Glow effects for different income types */
  .glow-emerald { box-shadow: 0 0 20px #10b981, 0 0 40px #10b981; }
  .glow-blue { box-shadow: 0 0 20px #3b82f6, 0 0 40px #3b82f6; }
  .glow-purple { box-shadow: 0 0 20px #8b5cf6, 0 0 40px #8b5cf6; }
  .glow-yellow { box-shadow: 0 0 20px #f59e0b, 0 0 40px #f59e0b; }
  .glow-orange { box-shadow: 0 0 20px #f97316, 0 0 40px #f97316; }
  .glow-green { box-shadow: 0 0 20px #22c55e, 0 0 40px #22c55e; }
  .glow-cyan { box-shadow: 0 0 20px #06b6d4, 0 0 40px #06b6d4; }
  .glow-pink { box-shadow: 0 0 20px #ec4899, 0 0 40px #ec4899; }
  .glow-indigo { box-shadow: 0 0 20px #6366f1, 0 0 40px #6366f1; }

  /* Pulse animations */
  .pulse-emerald { animation: pulse-emerald 1.5s ease-in-out infinite; }
  .pulse-blue { animation: pulse-blue 1.5s ease-in-out infinite; }
  .pulse-purple { animation: pulse-purple 1.5s ease-in-out infinite; }
  .pulse-yellow { animation: pulse-yellow 1.5s ease-in-out infinite; }
  .pulse-orange { animation: pulse-orange 1.5s ease-in-out infinite; }
  .pulse-green { animation: pulse-green 1.5s ease-in-out infinite; }
  .pulse-cyan { animation: pulse-cyan 1.5s ease-in-out infinite; }
  .pulse-pink { animation: pulse-pink 1.5s ease-in-out infinite; }
  .pulse-indigo { animation: pulse-indigo 1.5s ease-in-out infinite; }

  /* Income highlight base styles */
  .income-highlight {
    transition: all 0.3s ease;
    transform: scale(1.05);
  }

  /* Floating amount animation */
  @keyframes floatUp {
    0% { opacity: 1; transform: translateY(0); }
    100% { opacity: 0; transform: translateY(-30px); }
  }

  /* Slide in animation for notifications */
  @keyframes slide-in-right {
    0% { opacity: 0; transform: translateX(100%); }
    100% { opacity: 1; transform: translateX(0); }
  }

  /* Shrinking progress bar animation */
  @keyframes shrink {
    0% { width: 100%; }
    100% { width: 0%; }
  }

  .animate-slide-in-right { animation: slide-in-right 0.3s ease-out; }
  .animate-shrink { animation: shrink linear; }

  /* Pulse keyframes for each color */
  @keyframes pulse-emerald { 0%, 100% { box-shadow: 0 0 20px #10b981; } 50% { box-shadow: 0 0 30px #10b981, 0 0 50px #10b981; } }
  @keyframes pulse-blue { 0%, 100% { box-shadow: 0 0 20px #3b82f6; } 50% { box-shadow: 0 0 30px #3b82f6, 0 0 50px #3b82f6; } }
  @keyframes pulse-purple { 0%, 100% { box-shadow: 0 0 20px #8b5cf6; } 50% { box-shadow: 0 0 30px #8b5cf6, 0 0 50px #8b5cf6; } }
  @keyframes pulse-yellow { 0%, 100% { box-shadow: 0 0 20px #f59e0b; } 50% { box-shadow: 0 0 30px #f59e0b, 0 0 50px #f59e0b; } }
  @keyframes pulse-orange { 0%, 100% { box-shadow: 0 0 20px #f97316; } 50% { box-shadow: 0 0 30px #f97316, 0 0 50px #f97316; } }
  @keyframes pulse-green { 0%, 100% { box-shadow: 0 0 20px #22c55e; } 50% { box-shadow: 0 0 30px #22c55e, 0 0 50px #22c55e; } }
  @keyframes pulse-cyan { 0%, 100% { box-shadow: 0 0 20px #06b6d4; } 50% { box-shadow: 0 0 30px #06b6d4, 0 0 50px #06b6d4; } }
  @keyframes pulse-pink { 0%, 100% { box-shadow: 0 0 20px #ec4899; } 50% { box-shadow: 0 0 30px #ec4899, 0 0 50px #ec4899; } }
  @keyframes pulse-indigo { 0%, 100% { box-shadow: 0 0 20px #6366f1; } 50% { box-shadow: 0 0 30px #6366f1, 0 0 50px #6366f1; } }
`;

if (!document.head.querySelector('#income-tracker-styles')) {
  style.id = 'income-tracker-styles';
  document.head.appendChild(style);
}

export default incomeTracker;

// Named exports
export {
  incomeTracker,
  IncomeTracker
};