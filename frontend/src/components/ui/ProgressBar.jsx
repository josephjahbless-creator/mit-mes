export default function ProgressBar({ value, max = 100, label, showValue = true, size = 'md' }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  const color = pct >= 100 ? 'bg-green-500' : pct >= 75 ? 'bg-blue-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500';
  const heights = { sm: 'h-1.5', md: 'h-2.5', lg: 'h-4' };

  return (
    <div className="w-full">
      {(label || showValue) && (
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          {label && <span>{label}</span>}
          {showValue && <span className="font-medium">{pct}%</span>}
        </div>
      )}
      <div className={`w-full bg-gray-200 rounded-full ${heights[size]}`}>
        <div className={`${heights[size]} rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
