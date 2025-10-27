// Financial Sound System for Ocean DeFi Dashboard
// Plays contextual sounds for financial events

class FinancialSoundSystem {
  constructor() {
    this.enabled = true;
    this.volume = 0.1;
    this.lastPlayTime = {};
    this.minInterval = 1000; // Minimum 1 second between same sound types
    this.audioContext = null;
    this.audioInitialized = false;
    this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    this.isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    this.userHasInteracted = false;
    
    // Bind methods for event listeners
    this.handleUserInteraction = this.handleUserInteraction.bind(this);
    
    // Set up mobile interaction listeners
    this.setupMobileListeners();
  }

  // Check if we should play a sound (avoid spam)
  shouldPlay(soundType) {
    const now = Date.now();
    const lastPlay = this.lastPlayTime[soundType] || 0;
    
    if (now - lastPlay < this.minInterval) {
      return false;
    }
    
    this.lastPlayTime[soundType] = now;
    return this.enabled;
  }

  // Enable/disable sounds
  setEnabled(enabled) {
    this.enabled = enabled;
    localStorage.setItem('financialSoundsEnabled', enabled.toString());
  }

  // Set volume level
  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
    localStorage.setItem('financialSoundsVolume', this.volume.toString());
  }

  // Load settings from localStorage
  loadSettings() {
    const enabled = localStorage.getItem('financialSoundsEnabled');
    const volume = localStorage.getItem('financialSoundsVolume');
    
    if (enabled !== null) {
      this.enabled = enabled === 'true';
    }
    
    if (volume !== null) {
      this.volume = parseFloat(volume);
    }
  }

  // Set up mobile interaction listeners for audio initialization
  setupMobileListeners() {
    if (this.isMobile) {
      const events = ['touchstart', 'touchend', 'click', 'keydown'];
      events.forEach(event => {
        document.addEventListener(event, this.handleUserInteraction, { once: true, passive: true });
      });
    }
  }

  // Handle user interaction for mobile audio initialization
  async handleUserInteraction() {
    if (!this.userHasInteracted) {
      this.userHasInteracted = true;
      await this.initializeAudioContext();
      console.log('🔊 Audio context initialized via user interaction');
    }
  }

  // Initialize audio context (shared across all sounds)
  async initializeAudioContext() {
    if (this.audioContext && this.audioContext.state !== 'closed') {
      if (this.audioContext.state === 'suspended') {
        try {
          await this.audioContext.resume();
          this.audioInitialized = true;
          return this.audioContext;
        } catch (error) {
          console.warn('Failed to resume audio context:', error);
        }
      }
      return this.audioContext;
    }

    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) {
        console.warn('Web Audio API not supported');
        return null;
      }

      this.audioContext = new AudioContext();
      
      // Resume context if suspended (common on mobile)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      
      this.audioInitialized = true;
      
      // For iOS, we need to play a silent sound to fully unlock audio
      if (this.isIOS) {
        this.playIolentSound();
      }
      
      return this.audioContext;
    } catch (error) {
      console.warn('Failed to initialize audio context:', error);
      return null;
    }
  }

  // Play silent sound to unlock iOS audio
  playIolentSound() {
    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      oscillator.frequency.setValueAtTime(440, this.audioContext.currentTime);
      
      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + 0.01);
      
      console.log('🔕 iOS silent sound played for audio unlock');
    } catch (error) {
      console.warn('Failed to play silent sound:', error);
    }
  }

  // Get or initialize audio context
  async getAudioContext() {
    if (!this.audioContext || this.audioContext.state === 'closed') {
      return await this.initializeAudioContext();
    }
    
    if (this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume();
        this.audioInitialized = true;
      } catch (error) {
        console.warn('Failed to resume audio context:', error);
      }
    }
    
    return this.audioContext;
  }

  // Play sound for ROI coming in
  playROIIncome(amount = 0) {
    if (!this.shouldPlay('roi')) return;
    
    console.log(`🔊 Playing ROI income sound for $${amount}`);
    this.playSound('roiAlert');
  }

  // Play sound for coin drop (general income)
  playCoinDrop(amount = 0) {
    if (!this.shouldPlay('coinDrop')) return;
    
    console.log(`🔊 Playing coin drop sound for $${amount}`);
    this.playSound('coinDrop');
  }

  // Play sound for money coming in
  playMoneyIn(amount = 0) {
    if (!this.shouldPlay('moneyIn')) return;
    
    console.log(`🔊 Playing money in sound for $${amount}`);
    this.playSound('moneyIn');
  }

  // Play sound for money going out
  playMoneyOut(amount = 0) {
    if (!this.shouldPlay('moneyOut')) return;
    
    console.log(`🔊 Playing money out sound for $${amount}`);
    this.playSound('moneyOut');
  }

  // Play sound for portfolio updates
  playPortfolioUpdate() {
    if (!this.shouldPlay('portfolio')) return;
    
    console.log(`🔊 Playing portfolio update sound`);
    this.playSound('portfolioUpdate');
  }

  // Play sound for successful transactions
  playTransactionSuccess() {
    if (!this.shouldPlay('transaction')) return;
    
    console.log(`🔊 Playing transaction success sound`);
    this.playSound('cashRegister');
  }

  // Core sound playing method
  async playSound(type) {
    if (!this.enabled) return;

    try {
      // Get the shared audio context
      const audioContext = await this.getAudioContext();
      
      if (!audioContext) {
        console.warn('Audio context not available');
        return;
      }

      // For mobile, ensure user has interacted first
      if (this.isMobile && !this.userHasInteracted) {
        console.log('📱 Mobile audio requires user interaction first');
        return;
      }

      // Play the audio pattern
      this.playAudioPattern(audioContext, type);
      
    } catch (error) {
      console.warn('Could not play financial sound:', error);
    }
  }

  // Public method to manually initialize audio (for settings page)
  async initializeMobile() {
    if (this.userHasInteracted && this.audioInitialized) {
      return true;
    }
    
    this.userHasInteracted = true;
    const context = await this.initializeAudioContext();
    return context !== null && this.audioInitialized;
  }

  // Check if audio is ready
  isAudioReady() {
    return this.audioInitialized && this.audioContext && this.audioContext.state === 'running';
  }

  // Get audio status for UI
  getAudioStatus() {
    return {
      enabled: this.enabled,
      initialized: this.audioInitialized,
      ready: this.isAudioReady(),
      userInteracted: this.userHasInteracted,
      isMobile: this.isMobile,
      isIOS: this.isIOS,
      contextState: this.audioContext ? this.audioContext.state : 'none'
    };
  }

  // Separate method for playing audio patterns
  playAudioPattern(audioContext, type) {
    const soundPatterns = {
      coinDrop: [800, 600, 400, 300],
      cashRegister: [523.25, 659.25, 783.99, 1046.50],
      income: [440, 554.37, 659.25, 783.99],
      debit: [440, 369.99, 329.63],
      portfolioUpdate: [523.25, 659.25],
      roiAlert: [659.25, 783.99, 987.77, 1174.66],
      moneyIn: [523.25, 659.25, 783.99, 1046.50, 1318.51],
      moneyOut: [523.25, 415.30, 329.63, 261.63],
    };
    
    const pattern = soundPatterns[type] || soundPatterns.portfolioUpdate;
    
    if (type === 'coinDrop') {
      this.playCoinDropPattern(audioContext, pattern);
    } else if (['cashRegister', 'income', 'roiAlert', 'moneyIn'].includes(type)) {
      this.playPositivePattern(audioContext, pattern);
    } else if (['debit', 'moneyOut'].includes(type)) {
      this.playNegativePattern(audioContext, pattern);
    } else {
      this.playDefaultPattern(audioContext, pattern);
    }
  }

  playCoinDropPattern(audioContext, pattern) {
    pattern.forEach((freq, index) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);
      oscillator.type = 'triangle';
      
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(this.volume * 0.15, audioContext.currentTime + index * 0.05 + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + index * 0.05 + 0.15);
      
      oscillator.start(audioContext.currentTime + index * 0.05);
      oscillator.stop(audioContext.currentTime + index * 0.05 + 0.15);
    });
  }

  playPositivePattern(audioContext, pattern) {
    pattern.forEach((freq, index) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(this.volume * 0.12, audioContext.currentTime + index * 0.08 + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + index * 0.08 + 0.25);
      
      oscillator.start(audioContext.currentTime + index * 0.08);
      oscillator.stop(audioContext.currentTime + index * 0.08 + 0.25);
    });
  }

  playNegativePattern(audioContext, pattern) {
    pattern.forEach((freq, index) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);
      oscillator.type = 'sawtooth';
      
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(this.volume * 0.08, audioContext.currentTime + index * 0.1 + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + index * 0.1 + 0.2);
      
      oscillator.start(audioContext.currentTime + index * 0.1);
      oscillator.stop(audioContext.currentTime + index * 0.1 + 0.2);
    });
  }

  playDefaultPattern(audioContext, pattern) {
    pattern.forEach((freq, index) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(this.volume * 0.1, audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
      
      oscillator.start(audioContext.currentTime + index * 0.1);
      oscillator.stop(audioContext.currentTime + 0.2 + index * 0.1);
    });
  }

  // Convenience methods for common sounds
  playIncome() {
    this.playSound('income');
  }

  playCashRegister() {
    this.playSound('cashRegister');
  }

  // Update the ROI and transaction methods to use the new system
  playROIIncome(amount = 0) {
    if (!this.shouldPlay('roi')) return;
    console.log(`🔊 Playing ROI income sound for $${amount}`);
    this.playSound('roiAlert');
  }

  playCoinDrop(amount = 0) {
    if (!this.shouldPlay('coinDrop')) return;
    console.log(`🔊 Playing coin drop sound for $${amount}`);
    this.playSound('coinDrop');
  }

  playTransactionSuccess() {
    if (!this.shouldPlay('transaction')) return;
    console.log(`🔊 Playing transaction success sound`);
    this.playSound('cashRegister');
  }
}

// Create and export singleton instance
const financialSounds = new FinancialSoundSystem();

// Load settings on initialization
financialSounds.loadSettings();

// Mobile audio setup is handled automatically in constructor via setupMobileListeners()

// Attach to window for global access (required by SoundControls and other components)
if (typeof window !== 'undefined') {
  window.financialSounds = financialSounds;
}

export default financialSounds;

// Named exports for convenience
export const {
  playROIIncome,
  playCoinDrop,
  playIncome,
  playCashRegister,
  playMoneyIn,
  playMoneyOut,
  playPortfolioUpdate,
  playTransactionSuccess,
  setEnabled,
  setVolume,
  initializeMobile,
  getAudioStatus,
  isAudioReady
} = financialSounds;