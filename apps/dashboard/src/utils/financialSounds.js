// Financial Sound System for Ocean DeFi Dashboard
// Plays contextual sounds for financial events

class FinancialSoundSystem {
  constructor() {
    this.enabled = true;
    this.volume = 0.1;
    this.lastPlayTime = {};
    this.minInterval = 1000; // Minimum 1 second between same sound types
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
  playSound(type) {
    if (!this.enabled) return;

    try {
      // Mobile compatibility check
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      // Some mobile browsers require user interaction before audio
      if (isMobile && !this.audioContextInitialized) {
        console.log('📱 Mobile audio context not initialized, attempting to initialize...');
        this.initMobileAudio();
      }

      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Check if audio context is suspended (common on mobile)
      if (audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
          this.playAudioPattern(audioContext, type);
        }).catch(err => {
          console.warn('Could not resume audio context:', err);
        });
      } else {
        this.playAudioPattern(audioContext, type);
      }
    } catch (error) {
      console.warn('Could not play financial sound:', error);
    }
  }

  // Initialize mobile audio (requires user interaction)
  initMobileAudio() {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Create a silent sound to initialize audio
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.01);
      
      this.audioContextInitialized = true;
      console.log('📱 Mobile audio context initialized');
    } catch (error) {
      console.warn('Could not initialize mobile audio:', error);
    }
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

  // Initialize mobile audio support
  initializeMobileAudio() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      const resumeAudio = () => {
        this.audioContext.resume();
        document.removeEventListener('touchstart', resumeAudio);
        document.removeEventListener('touchend', resumeAudio);
        document.removeEventListener('click', resumeAudio);
      };
      
      document.addEventListener('touchstart', resumeAudio);
      document.addEventListener('touchend', resumeAudio);
      document.addEventListener('click', resumeAudio);
    }
  }
}

// Create and export singleton instance
const financialSounds = new FinancialSoundSystem();

// Load settings on initialization
financialSounds.loadSettings();

// Initialize mobile audio support
financialSounds.initializeMobileAudio();

export default financialSounds;

// Named exports for convenience
export const {
  playROIIncome,
  playCoinDrop,
  playMoneyIn,
  playMoneyOut,
  playPortfolioUpdate,
  playTransactionSuccess,
  setEnabled,
  setVolume
} = financialSounds;