import { useEffect, useRef, useState } from 'react';
import { X, Download, Smartphone, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installStatus, setInstallStatus] = useState('idle'); // idle | installing | installed | dismissed | failed | timeout
  const [showInstalledBanner, setShowInstalledBanner] = useState(false);
  const installTimeoutRef = useRef(null);

  useEffect(() => {
    // Check if running as PWA
    const isInStandaloneMode = () => {
      return (
        window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true
      );
    };

    // Check if iOS
    const checkIsIOS = () => {
      return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    };

    setIsStandalone(isInStandaloneMode());
    setIsIOS(checkIsIOS());

    // Don't show prompt if already installed
    if (isInStandaloneMode()) {
      return;
    }

    // Check if user has dismissed the prompt before
    const hasDismissed = localStorage.getItem('pwa-install-dismissed');
    const dismissedTime = hasDismissed ? parseInt(hasDismissed) : 0;
    const sevenDays = 7 * 24 * 60 * 60 * 1000;

    // Show prompt if not dismissed or if 7 days have passed
    if (!hasDismissed || Date.now() - dismissedTime > sevenDays) {
      // For iOS, show custom prompt after delay
      if (checkIsIOS()) {
        setTimeout(() => setShowInstallPrompt(true), 3000);
      }

      // Listen for beforeinstallprompt event (Chrome, Edge, etc.)
      const handleBeforeInstallPrompt = (e) => {
        e.preventDefault();
        setDeferredPrompt(e);
        setTimeout(() => setShowInstallPrompt(true), 3000);
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

      // Listen for successful install
      const handleAppInstalled = () => {
        setInstallStatus('installed');
        setIsInstalling(false);
        setShowInstallPrompt(false);
        setShowInstalledBanner(true);
        localStorage.setItem('pwa-installed', Date.now().toString());
        if (installTimeoutRef.current) {
          clearTimeout(installTimeoutRef.current);
          installTimeoutRef.current = null;
        }
      };

      window.addEventListener('appinstalled', handleAppInstalled);

      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.removeEventListener('appinstalled', handleAppInstalled);
      };
    }
  }, []);

  // Auto-hide the installed banner after a short delay
  useEffect(() => {
    if (!showInstalledBanner) return;
    const t = setTimeout(() => setShowInstalledBanner(false), 8000);
    return () => clearTimeout(t);
  }, [showInstalledBanner]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      return;
    }

    try {
      setIsInstalling(true);
      setInstallStatus('installing');
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        // Wait for appinstalled event; set a timeout fallback
        if (installTimeoutRef.current) clearTimeout(installTimeoutRef.current);
        installTimeoutRef.current = setTimeout(() => {
          // If we still haven't received appinstalled, provide guidance
          setInstallStatus('timeout');
          setIsInstalling(false);
          setShowInstalledBanner(false);
        }, 30000); // 30s fallback
      } else {
        setInstallStatus('dismissed');
        setIsInstalling(false);
      }
    } catch (e) {
      setInstallStatus('failed');
      setIsInstalling(false);
    } finally {
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
    setShowInstallPrompt(false);
  };

  // Don't render if already installed or prompt dismissed
  if (isStandalone || (!showInstallPrompt && !isInstalling)) {
    return null;
  }

  return (
    <>
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50 animate-slide-up">
        <div className="cyber-glass rounded-2xl p-4 border border-cyan-500/40 shadow-2xl shadow-cyan-500/20 backdrop-blur-xl">
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-1 text-cyan-300/70 hover:text-cyan-300 transition-colors rounded-lg hover:bg-cyan-500/10"
          aria-label="Close"
        >
          <X size={18} />
        </button>

          <div className="flex items-start gap-3 pr-6">
          <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500/20 to-neon-green/20 border border-cyan-500/30">
            {isInstalling ? (
              <Loader2 className="text-cyan-300 animate-spin" size={24} />
            ) : isIOS ? (
              <Smartphone className="text-cyan-300" size={24} />
            ) : (
              <Download className="text-cyan-300" size={24} />
            )}
          </div>

            <div className="flex-1">
            {isInstalling ? (
              <>
                <h3 className="text-sm font-semibold text-cyan-300 mb-1">Installing…</h3>
                <p className="text-xs text-cyan-300/80 mb-3">
                  Android handles installation. Keep this page open — we’ll finish in the background.
                </p>
                <div className="w-full h-2 bg-dark-800/60 rounded-full overflow-hidden border border-cyan-500/20">
                  <div className="h-full w-1/2 bg-gradient-to-r from-cyan-500 to-neon-green animate-pulse" />
                </div>
                {installStatus === 'timeout' && (
                  <div className="mt-3 flex items-start gap-2 text-xs text-yellow-300/80">
                    <AlertTriangle size={14} className="mt-0.5" />
                    <span>
                      Installation is continuing in the background. Check your home screen for the Ocean DeFi app. You can close this message.
                    </span>
                  </div>
                )}
              </>
            ) : (
              <>
                <h3 className="text-sm font-semibold text-cyan-300 mb-1">
                  Install Ocean DeFi App
                </h3>
                <p className="text-xs text-cyan-300/80 mb-3">
                  {isIOS
                    ? 'Tap the share button and select "Add to Home Screen" for quick access.'
                    : 'Install our app for faster access and offline features.'}
                </p>

                {!isIOS && deferredPrompt && (
                  <button
                    onClick={handleInstallClick}
                    className="w-full px-4 py-2 bg-gradient-to-r from-cyan-500 to-neon-green text-dark-950 text-sm font-semibold rounded-lg hover:shadow-lg hover:shadow-cyan-500/30 transition-all duration-200"
                  >
                    Install Now
                  </button>
                )}
              </>
            )}

              {isIOS && (
                <div className="flex items-center gap-2 text-xs text-cyan-300/70">
                <span>Tap</span>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3zm-4.4 15.55l-.1.1-.1-.1C7.14 14.24 4 11.39 4 8.5 4 6.5 5.5 5 7.5 5c1.54 0 3.04.99 3.57 2.36h1.87C13.46 5.99 14.96 5 16.5 5c2 0 3.5 1.5 3.5 3.5 0 2.89-3.14 5.74-7.9 10.05z"/>
                </svg>
                <span>then "Add to Home Screen"</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showInstalledBanner && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50 mt-3 cyber-glass rounded-xl p-3 border border-cyan-500/40 backdrop-blur-xl flex items-start gap-2">
          <CheckCircle2 className="text-neon-green" size={18} />
          <div className="text-xs text-cyan-200">
            <div className="font-semibold text-cyan-300">Installed</div>
            <div>Ocean DeFi was added to your home screen. Open it from there anytime.</div>
          </div>
          <button
            onClick={() => setShowInstalledBanner(false)}
            className="ml-auto text-cyan-300/70 hover:text-cyan-300"
            aria-label="Dismiss installed banner"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </>
  );
}
