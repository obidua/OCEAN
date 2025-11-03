// TradingViewWidget.jsx
import React, { useEffect, useRef, memo, useState } from 'react';
import { TrendingUp, AlertCircle } from 'lucide-react';

function TradingViewWidget() {
  const container = useRef();
  const [loadError, setLoadError] = useState(false);

  useEffect(
    () => {
      // Ensure container is mounted in the DOM
      if (!container.current || !container.current.isConnected) return;

      // Clear any existing content
      container.current.innerHTML = '';

      // Ensure expected inner widget container exists before loading script
      const widgetHost = document.createElement('div');
      widgetHost.className = 'tradingview-widget-container__widget';
      widgetHost.style.height = 'calc(100% - 32px)';
      widgetHost.style.width = '100%';
      container.current.appendChild(widgetHost);

      const script = document.createElement("script");
      script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
      script.type = "text/javascript";
      script.async = true;
      
      // Add error handling
      script.onerror = () => {
        console.warn('TradingView widget failed to load');
        setLoadError(true);
      };

      script.innerHTML = JSON.stringify({
        "autosize": true,
        "symbol": "CRYPTO:RAMAUSD",
        "interval": "D",
        "timezone": "Etc/UTC",
        "theme": "dark",
        "style": "1",
        "locale": "en",
        "backgroundColor": "rgba(8, 11, 18, 0.95)",
        "gridColor": "rgba(8, 145, 178, 0.06)",
        "allow_symbol_change": true,
        "details": false,
        "hotlist": false,
        "calendar": false,
        "hide_top_toolbar": false,
        "hide_side_toolbar": true,
        "hide_legend": false,
        "hide_volume": false,
        "save_image": true,
        "withdateranges": false,
        "enable_publishing": false,
        "support_host": "https://www.tradingview.com",
        "studies": [],
        "watchlist": [],
        "compareSymbols": [],
        "overrides": {
          "mainSeriesProperties.candleStyle.upColor": "#39ff14",
          "mainSeriesProperties.candleStyle.downColor": "#ff6600",
          "mainSeriesProperties.candleStyle.borderUpColor": "#39ff14",
          "mainSeriesProperties.candleStyle.borderDownColor": "#ff6600",
          "mainSeriesProperties.candleStyle.wickUpColor": "#39ff14",
          "mainSeriesProperties.candleStyle.wickDownColor": "#ff6600",
          "paneProperties.background": "rgba(8, 11, 18, 0.95)",
          "paneProperties.backgroundType": "solid",
          "paneProperties.vertGridProperties.color": "rgba(8, 145, 178, 0.06)",
          "paneProperties.horzGridProperties.color": "rgba(8, 145, 178, 0.06)"
        }
      });

      try {
        // Append after a frame to avoid race conditions with DOM
        requestAnimationFrame(() => {
          if (!container.current || !container.current.isConnected) return;
          try {
            container.current.appendChild(script);
          } catch (error) {
            console.warn('Error appending TradingView script:', error);
            setLoadError(true);
          }
        });
      } catch (error) {
        console.warn('Error appending TradingView script:', error);
        setLoadError(true);
      }

      // Cleanup
      return () => {
        if (container.current && script.parentNode === container.current) {
          try {
            container.current.removeChild(script);
          } catch (e) {
            // Ignore cleanup errors
          }
        }
      };
    },
    []
  );

  return (
    <div className="tradingview-widget-container" ref={container} style={{ height: "100%", width: "100%", position: "relative" }}>
      {loadError ? (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '100%',
          color: 'rgba(8, 145, 178, 0.8)',
          padding: '20px',
          textAlign: 'center'
        }}>
          <AlertCircle size={48} style={{ marginBottom: '16px', opacity: 0.6 }} />
          <p style={{ fontSize: '14px', marginBottom: '8px' }}>Chart temporarily unavailable</p>
          <p style={{ fontSize: '12px', opacity: 0.7 }}>Please check your connection or try again later</p>
        </div>
      ) : (
        <>
          <div className="tradingview-widget-copyright" style={{ fontSize: "11px", color: "rgba(8, 145, 178, 0.6)", textAlign: "center", padding: "4px 0" }}>
            <a href="https://www.tradingview.com/" rel="noopener nofollow" target="_blank" style={{ color: "rgba(8, 145, 178, 0.8)", textDecoration: "none" }}>
              <span>Track all markets on TradingView</span>
            </a>
          </div>
        </>
      )}
    </div>
  );
}

export default memo(TradingViewWidget);