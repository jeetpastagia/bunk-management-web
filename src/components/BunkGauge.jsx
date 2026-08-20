import { useId } from 'react';

/**
 * The signature visual of Bunk Manager: a semicircular fuel-gauge dial.
 * Reads as "how much bunk fuel do you have left" — the zones are drawn as
 * arcs (danger/risky/safe) and a needle points at the current percentage.
 *
 * size: overall square size (viewBox is size x size*0.62)
 */
export default function BunkGauge({ percentage = 0, requiredPercentage = 75, size = 220, label, sub }) {
  const uid = useId();
  const clamped = Math.max(0, Math.min(100, percentage));
  const cx = size / 2;
  const cy = size * 0.58;
  const r = size * 0.42;

  // Angle mapping: 0% -> 180deg (left), 100% -> 0deg (right), semicircle on top
  const angleFor = (pct) => 180 - (pct / 100) * 180;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const point = (pct, radius = r) => {
    const a = toRad(angleFor(pct));
    return [cx + radius * Math.cos(a), cy - radius * Math.sin(a)];
  };

  // This gauge only ever spans a half-circle (0% -> 180°, 100% -> 0°), so
  // the angular span between any two points on it is at most 180° — the
  // SVG large-arc-flag must therefore always be 0 (the "minor" arc IS the
  // correct path here). The previous `> 50` check compared a PERCENTAGE
  // span against a threshold meant for a full 360° circle, so any segment
  // over 50% (e.g. the danger zone up to a 75% requirement, or the
  // progress fill past 50%) incorrectly looped the long way around a full
  // circle instead of staying on the semicircle — that's the doubled/
  // misplaced arc artifact.
  const arcPath = (fromPct, toPct, radius = r) => {
    const [x1, y1] = point(fromPct, radius);
    const [x2, y2] = point(toPct, radius);
    return `M ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2}`;
  };

  const strokeW = size * 0.065;

  // Zone boundaries derive from the actual required percentage, not fixed numbers —
  // this gauge is generated from the user's real target, e.g. 75% or 80%.
  const dangerEnd = requiredPercentage;
  const riskyEnd = Math.min(100, requiredPercentage + 8);

  const zoneColor =
    clamped < dangerEnd ? 'var(--color-danger)' : clamped < riskyEnd ? 'var(--color-risky)' : 'var(--color-safe)';

  const needleAngle = angleFor(clamped);
  const needleLen = r * 0.86;
  const needleX = cx + needleLen * Math.cos(toRad(needleAngle));
  const needleY = cy - needleLen * Math.sin(toRad(needleAngle));

  return (
    <div className="flex flex-col items-center select-none">
      <svg width={size} height={size * 0.64} viewBox={`0 0 ${size} ${size * 0.64}`}>
        <defs>
          <filter id={`glow-${uid}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Track */}
        <path d={arcPath(0, 100)} fill="none" stroke="var(--chart-track)" strokeWidth={strokeW} strokeLinecap="round" />

        {/* Zones */}
        <path d={arcPath(0, dangerEnd)} fill="none" stroke="var(--color-danger)" strokeOpacity="0.35" strokeWidth={strokeW} strokeLinecap="round" />
        <path d={arcPath(dangerEnd, riskyEnd)} fill="none" stroke="var(--color-risky)" strokeOpacity="0.35" strokeWidth={strokeW} strokeLinecap="round" />
        <path d={arcPath(riskyEnd, 100)} fill="none" stroke="var(--color-safe)" strokeOpacity="0.35" strokeWidth={strokeW} strokeLinecap="round" />

        {/* Progress fill up to current % */}
        <path
          d={arcPath(0, clamped)}
          fill="none"
          stroke={zoneColor}
          strokeWidth={strokeW}
          strokeLinecap="round"
          filter={`url(#glow-${uid})`}
          style={{ transition: 'stroke-dasharray 0.6s ease, stroke 0.4s ease' }}
        />

        {/* Required-% tick mark */}
        {(() => {
          const [tx1, ty1] = point(requiredPercentage, r - strokeW * 0.9);
          const [tx2, ty2] = point(requiredPercentage, r + strokeW * 0.9);
          return <line x1={tx1} y1={ty1} x2={tx2} y2={ty2} stroke="var(--color-text-muted)" strokeWidth="2" strokeDasharray="2 3" />;
        })()}

        {/* Needle */}
        <line x1={cx} y1={cy} x2={needleX} y2={needleY} stroke="var(--color-text)" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r={size * 0.03} fill="var(--color-text)" />

        <text x={cx} y={cy - size * 0.14} textAnchor="middle" className="mono-num" fontSize={size * 0.16} fontWeight="700" fill="var(--color-text)">
          {clamped.toFixed(1)}%
        </text>
        {sub && (
          <text x={cx} y={cy - size * 0.14 + size * 0.075} textAnchor="middle" fontSize={size * 0.045} fill="var(--color-text-muted)">
            {sub}
          </text>
        )}
      </svg>
      {label && <div className="text-sm text-[var(--color-text-muted)] mt-1 font-medium">{label}</div>}
    </div>
  );
}
