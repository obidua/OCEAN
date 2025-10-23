// import { HelpCircle } from 'lucide-react';
// import { useState } from 'react';

// export default function Tooltip({ content, children, position = 'top' }) {
//   const [isVisible, setIsVisible] = useState(false);

//   const positionClasses = {
//     top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
//     bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
//     left: 'right-full top-1/2 -translate-y-1/2 mr-2',
//     right: 'left-full top-1/2 -translate-y-1/2 ml-2'
//   };

//   return (
//     <div className="relative inline-block">
//       <button
//         type="button"
//         onMouseEnter={() => setIsVisible(true)}
//         onMouseLeave={() => setIsVisible(false)}
//         onClick={() => setIsVisible(!isVisible)}
//         className="inline-flex items-center justify-center w-4 h-4 ml-1 text-cyan-400 hover:text-neon-green transition-colors"
//         aria-label="Help information"
//       >
//         {children || <HelpCircle size={14} />}
//       </button>

//       {isVisible && (
//         <div className={`absolute z-50 ${positionClasses[position]} w-64 pointer-events-none`}>
//           <div className="cyber-glass border border-cyan-500/50 rounded-lg p-3 shadow-neon-cyan">
//             <div className="text-xs text-cyan-300/90 leading-relaxed">
//               {content}
//             </div>
//             <div
//               className={`absolute w-2 h-2 bg-dark-900/60 border-cyan-500/50 transform rotate-45 ${
//                 position === 'top' ? 'bottom-[-4px] left-1/2 -translate-x-1/2 border-b border-r' :
//                 position === 'bottom' ? 'top-[-4px] left-1/2 -translate-x-1/2 border-t border-l' :
//                 position === 'left' ? 'right-[-4px] top-1/2 -translate-y-1/2 border-t border-r' :
//                 'left-[-4px] top-1/2 -translate-y-1/2 border-b border-l'
//               }`}
//             />
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }



import { HelpCircle, Info } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

export default function Tooltip({ content, children, position = 'top' }) {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const targetRef = useRef(null);

  useEffect(() => {
    if (isVisible && targetRef.current) {
      const rect = targetRef.current.getBoundingClientRect();
      const tooltipWidth = 256; // w-64
      const tooltipHeight = 64;
      let top = 0;
      let left = rect.left + rect.width / 2 - tooltipWidth / 2;

      switch (position) {
        case 'top':
          top = rect.top - tooltipHeight - 8;
          break;
        case 'bottom':
          top = rect.bottom + 8;
          break;
        case 'left':
          top = rect.top + rect.height / 2 - tooltipHeight / 2;
          left = rect.left - tooltipWidth - 8;
          break;
        case 'right':
          top = rect.top + rect.height / 2 - tooltipHeight / 2;
          left = rect.right + 8;
          break;
      }

      setCoords({ top: top + window.scrollY, left: left + window.scrollX });
    }
  }, [isVisible, position]);

  const arrowClasses = {
    top: 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 border-b border-r',
    bottom: 'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 border-t border-l',
    left: 'right-0 top-1/2 -translate-y-1/2 translate-x-1/2 border-t border-r',
    right: 'left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 border-b border-l',
  };

  return (
    <>
      <div
        ref={targetRef}
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        className="inline-flex items-center cursor-pointer"
      >
        {children || <HelpCircle size={14} />}
      </div>

      {isVisible &&
        createPortal(
          <div
            className="absolute z-[9999] w-64"
            style={{ top: coords.top, left: coords.left }}
          >
            <div className="cyber-glass border border-cyan-500/50 rounded-lg p-3 shadow-neon-cyan relative">
              <div className="text-xs text-cyan-300/90 leading-relaxed">{content}</div>
              <div
                className={`absolute w-3 h-3 bg-dark-900/60 border-cyan-500/50 rotate-45 ${arrowClasses[position]}`}
              />
            </div>
          </div>,
          document.body
        )}
    </>
  );
}


