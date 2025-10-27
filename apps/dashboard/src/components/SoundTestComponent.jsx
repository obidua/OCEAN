// Sound System Test Component for Mobile/PWA
import { useState, useEffect } from 'react';
import { Volume2, VolumeX, Play, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { toast } from '../utils/toast';

const SoundTestComponent = () => {
  const [audioContext, setAudioContext] = useState(null);
  const [audioSupported, setAudioSupported] = useState(false);
  const [userInteracted, setUserInteracted] = useState(false);
  const [testResults, setTestResults] = useState({});

  useEffect(() => {
    checkAudioSupport();
  }, []);

  const checkAudioSupport = () => {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      setAudioSupported(true);
    } else {
      setAudioSupported(false);
    }
  };

  const initializeAudioContext = async () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const context = new AudioContext();
      
      // Resume context if suspended (required for mobile browsers)
      if (context.state === 'suspended') {
        await context.resume();
      }
      
      setAudioContext(context);
      setUserInteracted(true);
      
      return context;
    } catch (error) {
      console.error('Failed to initialize audio context:', error);
      return null;
    }
  };

  const playTestSound = async (type) => {
    let context = audioContext;
    
    if (!context) {
      context = await initializeAudioContext();
      if (!context) {
        setTestResults(prev => ({
          ...prev,
          [type]: 'Failed - Audio context unavailable'
        }));
        return;
      }
    }

    try {
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(context.destination);
      
      // Different frequencies for different types
      const frequencies = {
        success: 523.25, // C note
        error: 392.00,   // G note
        warning: 440.00, // A note
        info: 659.25     // E note
      };
      
      oscillator.frequency.setValueAtTime(
        frequencies[type] || 440, 
        context.currentTime
      );
      oscillator.type = 'sine';
      
      // Volume envelope
      gainNode.gain.setValueAtTime(0, context.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.1, context.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.5);
      
      oscillator.start(context.currentTime);
      oscillator.stop(context.currentTime + 0.5);
      
      setTestResults(prev => ({
        ...prev,
        [type]: 'Success ✅'
      }));
      
    } catch (error) {
      console.error(`Failed to play ${type} sound:`, error);
      setTestResults(prev => ({
        ...prev,
        [type]: `Failed - ${error.message}`
      }));
    }
  };

  const testToastSound = (type) => {
    try {
      toast[type](`Testing ${type} notification sound`, {
        title: `${type.charAt(0).toUpperCase() + type.slice(1)} Test`,
        playSound: true
      });
      
      setTestResults(prev => ({
        ...prev,
        [`toast_${type}`]: 'Toast triggered ✅'
      }));
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        [`toast_${type}`]: `Failed - ${error.message}`
      }));
    }
  };

  const getDeviceInfo = () => {
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      audioContext: audioSupported ? 'Supported' : 'Not supported',
      serviceWorker: 'serviceWorker' in navigator ? 'Supported' : 'Not supported',
      notifications: 'Notification' in window ? 'Supported' : 'Not supported',
      standalone: window.matchMedia('(display-mode: standalone)').matches,
      mobile: /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    };
  };

  const deviceInfo = getDeviceInfo();

  return (
    <div className="cyber-glass border border-cyan-500/30 rounded-2xl p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Volume2 className="text-cyan-400" size={24} />
        <h2 className="text-xl font-bold text-cyan-300">Sound System Test</h2>
      </div>

      {/* Device Information */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-cyan-400">Device Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="cyber-glass border border-cyan-500/20 p-3 rounded-lg">
            <p className="text-cyan-300/70">Mobile Device</p>
            <p className={`font-mono ${deviceInfo.mobile ? 'text-neon-green' : 'text-yellow-400'}`}>
              {deviceInfo.mobile ? 'Yes' : 'No'}
            </p>
          </div>
          <div className="cyber-glass border border-cyan-500/20 p-3 rounded-lg">
            <p className="text-cyan-300/70">PWA Mode</p>
            <p className={`font-mono ${deviceInfo.standalone ? 'text-neon-green' : 'text-yellow-400'}`}>
              {deviceInfo.standalone ? 'Yes' : 'No'}
            </p>
          </div>
          <div className="cyber-glass border border-cyan-500/20 p-3 rounded-lg">
            <p className="text-cyan-300/70">Audio Context</p>
            <p className={`font-mono ${audioSupported ? 'text-neon-green' : 'text-red-400'}`}>
              {deviceInfo.audioContext}
            </p>
          </div>
          <div className="cyber-glass border border-cyan-500/20 p-3 rounded-lg">
            <p className="text-cyan-300/70">Service Worker</p>
            <p className={`font-mono ${deviceInfo.serviceWorker === 'Supported' ? 'text-neon-green' : 'text-red-400'}`}>
              {deviceInfo.serviceWorker}
            </p>
          </div>
        </div>
      </div>

      {/* Audio Context Status */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-cyan-400">Audio Status</h3>
        <div className="space-y-2">
          <p className="text-sm text-cyan-300/90">
            Audio Context State: 
            <span className={`ml-2 font-mono ${audioContext?.state === 'running' ? 'text-neon-green' : 'text-yellow-400'}`}>
              {audioContext?.state || 'Not initialized'}
            </span>
          </p>
          <p className="text-sm text-cyan-300/90">
            User Interaction: 
            <span className={`ml-2 font-mono ${userInteracted ? 'text-neon-green' : 'text-yellow-400'}`}>
              {userInteracted ? 'Yes' : 'Required for mobile'}
            </span>
          </p>
        </div>
      </div>

      {/* Initialize Audio Button */}
      {!userInteracted && (
        <button
          onClick={initializeAudioContext}
          className="w-full cyber-glass border border-neon-green/50 hover:border-neon-green rounded-xl p-4 text-neon-green hover:bg-neon-green/10 transition-all"
        >
          <div className="flex items-center justify-center gap-2">
            <Play size={20} />
            <span>Initialize Audio System (Required for Mobile)</span>
          </div>
        </button>
      )}

      {/* Direct Audio Tests */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-cyan-400">Direct Audio Tests</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {['success', 'error', 'warning', 'info'].map(type => (
            <button
              key={type}
              onClick={() => playTestSound(type)}
              disabled={!audioSupported}
              className="cyber-glass border border-cyan-500/30 hover:border-cyan-500/60 rounded-xl p-3 text-cyan-300 hover:bg-cyan-500/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex flex-col items-center gap-1">
                <div className="text-xs uppercase tracking-wide">{type}</div>
                <div className="text-xs text-cyan-300/70">
                  {testResults[type] || 'Not tested'}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Toast System Tests */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-cyan-400">Toast Notification Tests</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {['success', 'error', 'warning', 'info'].map(type => (
            <button
              key={`toast_${type}`}
              onClick={() => testToastSound(type)}
              className="cyber-glass border border-cyan-500/30 hover:border-cyan-500/60 rounded-xl p-3 text-cyan-300 hover:bg-cyan-500/10 transition-all"
            >
              <div className="flex flex-col items-center gap-1">
                <div className="text-xs uppercase tracking-wide">Toast {type}</div>
                <div className="text-xs text-cyan-300/70">
                  {testResults[`toast_${type}`] || 'Not tested'}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Mobile Specific Notes */}
      {deviceInfo.mobile && (
        <div className="cyber-glass border border-yellow-500/30 bg-yellow-500/5 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Info className="text-yellow-400 flex-shrink-0 mt-0.5" size={20} />
            <div className="space-y-2">
              <h4 className="font-semibold text-yellow-400">Mobile Audio Notes</h4>
              <ul className="text-sm text-yellow-300/90 space-y-1">
                <li>• Mobile browsers require user interaction before playing audio</li>
                <li>• Safari iOS may need additional permissions</li>
                <li>• PWA mode may have different audio behavior</li>
                <li>• Some mobile browsers limit concurrent audio contexts</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SoundTestComponent;