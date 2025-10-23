export default function ProgressBar({
  progress,
  current,
  max,
  label,
  color = 'cyan',
  showMilestones = false,
  milestones = [25, 50, 75]
}) {
  const colorClasses = {
    cyan: {
      bar: 'from-cyan-500 to-neon-green',
      border: 'border-cyan-500/30',
      text: 'text-neon-green',
      shadow: 'shadow-neon-cyan'
    },
    green: {
      bar: 'from-neon-green to-cyan-500',
      border: 'border-neon-green/30',
      text: 'text-neon-green',
      shadow: 'shadow-neon-green'
    },
    orange: {
      bar: 'from-neon-orange to-neon-pink',
      border: 'border-neon-orange/30',
      text: 'text-neon-orange',
      shadow: 'shadow-neon-orange'
    }
  };

  const colors = colorClasses[color] || colorClasses.cyan;
  const cappedProgress = Math.min(progress, 100);

  return (
    <div>
      <div className="flex justify-between items-center mb-2 gap-2">
        <span className="text-xs sm:text-sm font-medium text-cyan-400 truncate uppercase tracking-wider">
          {label}
        </span>
        <span className={`text-xs sm:text-sm font-bold ${colors.text} flex-shrink-0`}>
          {cappedProgress.toFixed(1)}%
        </span>
      </div>

      <div className={`relative h-3 sm:h-4 bg-dark-900 rounded-full overflow-visible border ${colors.border}`}>
        <div
          className={`h-full bg-gradient-to-r ${colors.bar} rounded-full transition-all duration-500 ${colors.shadow} relative`}
          style={{ width: `${cappedProgress}%` }}
        >
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-white/50 rounded-full shadow-lg" />
        </div>

        {showMilestones && milestones.map((milestone) => (
          <div
            key={milestone}
            className="absolute top-0 bottom-0 w-[2px] bg-cyan-400/30"
            style={{ left: `${milestone}%` }}
          >
            <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] text-cyan-400/70 font-medium whitespace-nowrap">
              {milestone}%
            </div>
          </div>
        ))}
      </div>

      {current && max && (
        <div className="flex justify-between items-center mt-2 gap-2">
          <p className="text-xs text-cyan-300/90 truncate">
            <span className="inline-block">{current}</span> / <span className="inline-block">{max}</span>
          </p>
          <p className="text-xs text-cyan-400/80 flex-shrink-0">
            {max && current ? `${((parseFloat(current.replace(/[^0-9.-]/g, '')) / parseFloat(max.replace(/[^0-9.-]/g, '')) * 100) - cappedProgress).toFixed(1)}% to cap` : ''}
          </p>
        </div>
      )}
    </div>
  );
}
