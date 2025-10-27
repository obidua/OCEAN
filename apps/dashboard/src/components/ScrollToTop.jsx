// ScrollToTop.jsx
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const SCROLL_SELECTORS = [
  "#app-scroll",
  "[data-scroll-container]",
  "main",
  ".scroll-container",
  '[class*="overflow-y-auto"]', // Tailwind-style containers
];

function scrollElementToTop(el) {
  if (!el) return;
  try {
    if (el.scrollTo) el.scrollTo({ top: 0, left: 0, behavior: "auto" });
    else el.scrollTop = 0;
  } catch {}
}

export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Disable native restoration (especially on mobile Safari/Chrome)
    try { window.history.scrollRestoration = "manual"; } catch {}

    const doScroll = () => {
      // 1) Window/document (desktop routes that use body scrolling)
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      if (document?.documentElement) {
        document.documentElement.scrollTop = 0;
        document.documentElement.scrollLeft = 0;
      }
      if (document?.body) {
        document.body.scrollTop = 0;
        document.body.scrollLeft = 0;
      }

      // 2) Any app-level scroll containers (mobile routes with overflow on <main>/div)
      SCROLL_SELECTORS.forEach((sel) => {
        document.querySelectorAll(sel).forEach((el) => scrollElementToTop(el));
      });
    };

    // Run immediately…
    doScroll();
    // …then again on the next two frames and after layout settles (helps mobile Safari)
    const raf1 = requestAnimationFrame(doScroll);
    const raf2 = requestAnimationFrame(() => requestAnimationFrame(doScroll));
    const t1 = setTimeout(doScroll, 0);
    const t2 = setTimeout(doScroll, 120); // after async data/layout

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [pathname]);

  return null;
}
