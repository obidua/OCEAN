// Universal Income Notification Component
// Shows income notifications that work across all pages in the app

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { TrendingUp, Coins, Crown, Trophy, Users, Building2, Lock, Target } from 'lucide-react';
import incomeTracker from '../utils/incomeTracker';

const IncomeNotificationOverlay = () => {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    // Listen for income changes
    const unsubscribe = incomeTracker.addListener((incomeData) => {
      const notification = {
        id: Date.now() + Math.random(),
        ...incomeData,
        timestamp: Date.now()
      };

      setNotifications(prev => [...prev, notification]);

      // Auto-remove after 5 seconds
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== notification.id));
      }, 5000);
    });

    return unsubscribe;
  }, []);

  const getIncomeIcon = (type) => {
    const icons = {
      'roi': <TrendingUp size={20} />,
      'direct': <Target size={20} />,
      'slab': <Trophy size={20} />,
      'royalty': <Crown size={20} />,
      'sameSlab': <Users size={20} />,
      'portfolio': <Coins size={20} />,
      'safeWallet': <Lock size={20} />,
      'referral': <Users size={20} />,
      'team': <Building2 size={20} />
    };
    return icons[type] || <Coins size={20} />;
  };

  const getIncomeConfig = (type) => {
    return incomeTracker.incomeTypes[type] || incomeTracker.incomeTypes.portfolio;
  };

  const formatAmount = (amount) => {
    return `+$${amount.toFixed(2)}`;
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  if (notifications.length === 0) return null;

  return createPortal(
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm pointer-events-none">
      {notifications.map((notification) => {
        const config = getIncomeConfig(notification.type);
        const icon = getIncomeIcon(notification.type);
        
        return (
          <div
            key={notification.id}
            className={`
              cyber-glass border rounded-xl p-4 shadow-2xl 
              transform transition-all duration-500 ease-out
              animate-slide-in-right pointer-events-auto
              border-${config.color}-500/40 bg-gradient-to-br 
              from-${config.color}-500/10 to-${config.color}-600/5
              hover:from-${config.color}-500/20 hover:to-${config.color}-600/10
            `}
            style={{
              boxShadow: `0 0 20px ${incomeTracker.getColorValue(config.color)}40`
            }}
          >
            <div className="flex items-start gap-3">
              <div className={`flex-shrink-0 mt-0.5 text-${config.color}-400`}>
                {icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className={`text-sm font-semibold text-${config.color}-300`}>
                    {config.icon} {config.label}
                  </p>
                  <button 
                    onClick={() => removeNotification(notification.id)}
                    className={`text-${config.color}-300/60 hover:text-${config.color}-300 transition-colors`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                  </button>
                </div>
                <p className={`text-lg font-bold text-${config.color}-200`}>
                  {formatAmount(notification.increase)}
                </p>
                {notification.metadata?.source && (
                  <p className={`text-xs text-${config.color}-300/70 mt-1`}>
                    {notification.metadata.source}
                  </p>
                )}
              </div>
            </div>
            
            {/* Progress bar for auto-dismiss */}
            <div className="mt-3 h-1 bg-black/20 rounded-full overflow-hidden">
              <div 
                className={`h-full bg-${config.color}-500 rounded-full animate-shrink`}
                style={{ animationDuration: '5s' }}
              />
            </div>
          </div>
        );
      })}
    </div>,
    document.body
  );
};

export default IncomeNotificationOverlay;