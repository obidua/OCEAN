// Sound Controls Component - Reusable audio settings
import { useState, useEffect } from 'react';
import { Volume2, VolumeX, Play, CheckCircle, Info } from 'lucide-react';
import { enableAudio } from '../utils/toast';

const SoundControls = ({ 
  soundEnabled, 
  setSoundEnabled, 
  audioInitialized, 
  setAudioInitialized, 
  initializeAudio,
  className = "" 
}) => {
  const [testingSounds, setTestingSounds] = useState(false);

  // Mobile detection
  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  // Initialize audio for mobile
  const handleInitializeAudio = async () => {
    try {
      // Use both the toast system and financialSounds system
      const toastSuccess = await enableAudio();
      let financialSuccess = false;
      
      if (window.financialSounds) {
        financialSuccess = await window.financialSounds.initializeMobile();
      }
      
      const success = toastSuccess || financialSuccess;
      setAudioInitialized(success);
      
      if (success) {
        // console.log('Audio system initialized for mobile/PWA');
        // Play a welcome sound if sound is enabled
        if (soundEnabled && window.financialSounds) {
          // Small delay to ensure audio context is ready
          setTimeout(() => {
            window.financialSounds.playCoinDrop(1);
          }, 100);
        }
      }
    } catch (error) {
      console.warn('Failed to initialize audio:', error);
    }
  };

  // Sound toggle function
  const toggleSounds = () => {
    const newEnabled = !soundEnabled;
    setSoundEnabled(newEnabled);
    
    if (window.financialSounds) {
      window.financialSounds.setEnabled(newEnabled);
      
      // Play a test sound when enabling
      if (newEnabled && audioInitialized) {
        window.financialSounds.playCoinDrop(1);
      }
    }
    
    // Store preference
    localStorage.setItem('soundEnabled', newEnabled.toString());
  };

  // Test sound function
  const testSound = async () => {
    if (!audioInitialized) {
      await handleInitializeAudio();
    }
    
    if (soundEnabled && window.financialSounds) {
      setTestingSounds(true);
      
      // Play a sequence of test sounds
      setTimeout(() => window.financialSounds.playCoinDrop(1), 0);
      setTimeout(() => window.financialSounds.playIncome(), 300);
      setTimeout(() => window.financialSounds.playCashRegister(), 600);
      setTimeout(() => setTestingSounds(false), 1000);
    }
  };

  return (
    <div className={`cyber-glass rounded-xl p-6 border border-cyan-500/30 relative overflow-hidden ${className}`}>
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
      
      <div className="flex items-center gap-3 mb-4">
        <Volume2 className="text-cyan-400" size={20} />
        <h3 className="font-semibold text-cyan-300 uppercase tracking-wide">Sound Settings</h3>
      </div>

      <div className="space-y-4">
        {/* Mobile Audio Initialization */}
        {isMobile && !audioInitialized && (
          <div className="cyber-glass border border-yellow-500/30 bg-yellow-500/5 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Info className="text-yellow-400 flex-shrink-0 mt-0.5" size={18} />
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-400 mb-2">Audio Setup Required</p>
                <p className="text-xs text-yellow-300/90 mb-3">
                  Mobile browsers require user interaction to enable audio. Tap the button below to activate sound notifications.
                </p>
                <button
                  onClick={handleInitializeAudio}
                  className="w-full cyber-glass border border-neon-green/50 hover:border-neon-green rounded-lg px-4 py-3 text-neon-green hover:bg-neon-green/10 transition-all flex items-center justify-center gap-2 text-sm font-medium"
                >
                  <Play size={16} />
                  Enable Audio for Mobile
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Audio Status */}
        {isMobile && (
          <div className="grid grid-cols-2 gap-3">
            <div className="cyber-glass border border-cyan-500/20 p-3 rounded-lg">
              <p className="text-xs text-cyan-300/70 uppercase tracking-wide mb-1">Mobile Audio</p>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  (audioInitialized && window.financialSounds?.isAudioReady()) 
                    ? 'bg-neon-green animate-pulse' 
                    : 'bg-red-400'
                }`} />
                <span className={`text-xs font-medium ${
                  (audioInitialized && window.financialSounds?.isAudioReady()) 
                    ? 'text-neon-green' 
                    : 'text-red-400'
                }`}>
                  {(audioInitialized && window.financialSounds?.isAudioReady()) ? 'Ready' : 'Needs Setup'}
                </span>
              </div>
            </div>
            <div className="cyber-glass border border-cyan-500/20 p-3 rounded-lg">
              <p className="text-xs text-cyan-300/70 uppercase tracking-wide mb-1">PWA Mode</p>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${window.matchMedia('(display-mode: standalone)').matches ? 'bg-neon-green animate-pulse' : 'bg-yellow-400'}`} />
                <span className={`text-xs font-medium ${window.matchMedia('(display-mode: standalone)').matches ? 'text-neon-green' : 'text-yellow-400'}`}>
                  {window.matchMedia('(display-mode: standalone)').matches ? 'Active' : 'Browser'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Sound Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-cyan-300">Notification Sounds</p>
            <p className="text-xs text-cyan-300/70">Enable audio feedback for transactions and notifications</p>
          </div>
          <button
            onClick={toggleSounds}
            className={`
              relative w-12 h-6 rounded-full transition-all duration-300 border-2
              ${soundEnabled 
                ? 'bg-neon-green/20 border-neon-green' 
                : 'bg-gray-600/20 border-gray-500'
              }
            `}
          >
            <div className={`
              absolute top-0.5 w-4 h-4 rounded-full transition-all duration-300 flex items-center justify-center
              ${soundEnabled 
                ? 'left-6 bg-neon-green' 
                : 'left-0.5 bg-gray-400'
              }
            `}>
              {soundEnabled ? (
                <Volume2 size={10} className="text-dark-950" />
              ) : (
                <VolumeX size={10} className="text-white" />
              )}
            </div>
          </button>
        </div>

        {/* Test Sound Button */}
        {soundEnabled && (audioInitialized || !isMobile) && (
          <button
            onClick={testSound}
            disabled={testingSounds}
            className="w-full cyber-glass border border-cyan-500/30 hover:border-cyan-500/60 rounded-lg px-4 py-3 text-cyan-300 hover:bg-cyan-500/10 transition-all flex items-center justify-center gap-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {testingSounds ? (
              <>
                <div className="w-4 h-4 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
                Testing Sounds...
              </>
            ) : (
              <>
                <Play size={16} />
                Test Sound System
              </>
            )}
          </button>
        )}

        {/* Sound Types Info */}
        {soundEnabled && (
          <div className="cyber-glass border border-cyan-500/20 rounded-lg p-4">
            <p className="text-xs font-medium text-cyan-300 mb-2 uppercase tracking-wide">Sound Types</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-neon-green rounded-full" />
                  <span className="text-cyan-300/90">Income Alerts</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                  <span className="text-cyan-300/90">Transaction Stages</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full" />
                  <span className="text-cyan-300/90">Portfolio Updates</span>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-purple-400 rounded-full" />
                  <span className="text-cyan-300/90">ROI Notifications</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
                  <span className="text-cyan-300/90">Success Chimes</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-red-400 rounded-full" />
                  <span className="text-cyan-300/90">Error Alerts</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sound disabled info */}
        {!soundEnabled && (
          <div className="cyber-glass border border-gray-500/20 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <VolumeX className="text-gray-400 flex-shrink-0" size={18} />
              <div>
                <p className="text-sm font-medium text-gray-400">Sounds Disabled</p>
                <p className="text-xs text-gray-500">
                  Enable sounds to get audio feedback for transactions, income notifications, and portfolio updates.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SoundControls;