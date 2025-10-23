import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const scrollToTop = () => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      if (typeof document !== 'undefined') {
        document.body?.scrollTo?.({ top: 0, left: 0, behavior: 'auto' });
        if (document.documentElement) {
          document.documentElement.scrollTop = 0;
          document.documentElement.scrollLeft = 0;
        }
      }
    };

    scrollToTop();
    const rafId = window.requestAnimationFrame(scrollToTop);

    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [pathname]);

  return null;
}
