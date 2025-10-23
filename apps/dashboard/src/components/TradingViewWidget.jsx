// TradingViewWidget.jsx
import React, { useEffect, useMemo, useRef, useState, memo } from 'react';

const TRADING_VIEW_SCRIPT_ID = 'tv-widget-script';

function TradingViewWidget() {
  const containerRef = useRef(null);
  const instanceRef = useRef(null);
  const [loadError, setLoadError] = useState(null);

  const containerId = useMemo(() => `tv_chart_${Math.random().toString(36).slice(2)}`, []);

  useEffect(() => {
    let isMounted = true;

    const initializeWidget = () => {
      if (!isMounted || !window.TradingView || !containerRef.current) return;

      try {
        window.TradingView.onready(() => {
          if (!isMounted || !containerRef.current) return;

          instanceRef.current = new window.TradingView.widget({
            container_id: containerId,
            autosize: true,
            symbol: 'CRYPTO:RAMAUSD',
            timezone: 'Etc/UTC',
            interval: 'D',
            theme: 'dark',
            style: '1',
            locale: 'en',
            backgroundColor: '#0F0F0F',
            gridColor: 'rgba(242, 242, 242, 0.06)',
            hide_side_toolbar: true,
            allow_symbol_change: true,
            withdateranges: false,
            hide_volume: false,
          });
        });
      } catch (err) {
        console.warn('TradingView widget initialization failed:', err);
        if (isMounted) setLoadError('Chart unavailable right now. Please try again later.');
      }
    };

    if (window.TradingView?.widget) {
      initializeWidget();
      return () => {
        isMounted = false;
      };
    }

    if (!document.getElementById(TRADING_VIEW_SCRIPT_ID)) {
      const script = document.createElement('script');
      script.id = TRADING_VIEW_SCRIPT_ID;
      script.src = 'https://s3.tradingview.com/tv.js';
      script.async = true;
      script.onload = () => {
        script.setAttribute('data-loaded', 'true');
        initializeWidget();
      };
      script.onerror = () => {
        console.warn('Unable to load TradingView library.');
        if (isMounted) setLoadError('Unable to reach TradingView servers.');
      };
      document.body.appendChild(script);
    } else {
      initializeWidget();
    }

    return () => {
      isMounted = false;
      if (instanceRef.current?.remove) {
        try {
          instanceRef.current.remove();
        } catch {
          // noop
        }
      }
    };
  }, [containerId]);

  return (
    <div
      ref={containerRef}
      className="tradingview-widget-container relative h-full w-full"
    >
      <div id={containerId} className="h-full w-full" />
      {loadError && (
        <div className="absolute inset-0 flex items-center justify-center rounded-lg border border-cyan-500/30 bg-dark-900/80 text-sm text-cyan-300/80 backdrop-blur">
          {loadError}
        </div>
      )}
    </div>
  );
}

export default memo(TradingViewWidget);
