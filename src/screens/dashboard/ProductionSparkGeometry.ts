/**
 * SVG geometry for the Claude WeavingDashboard shed-card sparkline.
 * Works with verified daily checking metres only; no synthetic points or smoothing of data values.
 * The curved path is Fritsch-Carlson monotonic cubic interpolation, so it does not
 * overshoot extrema the way an unconstrained Catmull-Rom curve can.
 */
export type SparkDatum = { day: string; metres: number };
export type SparkPoint = { x: number; y: number };
export type SparkShape = { points: SparkPoint[]; line: string; area: string; baseline: number };

export function sparkGeometry(values: readonly number[], width: number, height = 96): SparkShape {
  const w = Math.max(1, width);
  const h = Math.max(1, height);
  const top = 8;
  const baseline = h - 16;
  const plotHeight = Math.max(1, baseline - top);
  const left = 4;
  const right = Math.max(left + 1, w - 4);
  const safe = values.map(v => Number.isFinite(v) ? Math.max(0, v) : 0);
  const hi = Math.max(1, ...safe);
  const lo = Math.min(0, ...safe);
  const span = hi - lo || 1;
  const points: SparkPoint[] = safe.map((v, i) => ({
    x: safe.length <= 1 ? w/2 : left + i * (right-left)/(safe.length-1),
    y: top + (hi-v)/span*plotHeight,
  }));
  if (points.length < 2) {
    // Recharts Area dot=false produces no stroked area for a single day.
    // Keep the single X-axis date label, but never fabricate neighbouring days.
    return {points, line:'', area:'', baseline};
  }
  const slope: number[] = [];
  for (let i=0; i<points.length-1; i++) {
    const a=points[i], b=points[i+1];
    slope.push((b.y-a.y)/(b.x-a.x));
  }
  const tangent = points.map((_,i) => {
    if (i===0) return slope[0];
    if (i===points.length-1) return slope[slope.length-1];
    const a=slope[i-1], b=slope[i];
    // No overshoot at turning points, including a zero-slope plateau.
    if (a===0 || b===0 || a*b<=0) return 0;
    return 2*a*b/(a+b);
  });
  const f = (v:number) => Number(v.toFixed(3));
  let line = `M ${f(points[0].x)} ${f(points[0].y)}`;
  for (let i=0; i<points.length-1; i++) {
    const a=points[i], b=points[i+1], dx=(b.x-a.x)/3;
    line += ` C ${f(a.x+dx)} ${f(a.y+dx*tangent[i])}`;
    line += `, ${f(b.x-dx)} ${f(b.y-dx*tangent[i+1])}`;
    line += `, ${f(b.x)} ${f(b.y)}`;
  }
  const area = `${line} L ${f(points[points.length-1].x)} ${f(baseline)} L ${f(points[0].x)} ${f(baseline)} Z`;
  return {points,line,area,baseline};
}

/** Show all short-period dates; throttle labels to avoid overlap on mobile. */
export function sparkTickIndices(length: number, width: number): number[] {
  if (length <= 0) return [];
  if (length === 1) return [0];
  const slots = Math.max(2, Math.floor(width/28));
  // Claude / Recharts uses interval=3 (one tick per four days) for wide graphs.
  const step = Math.max(4, Math.ceil(length/slots));
  return Array.from({length}, (_,i)=>i).filter(i => i===0 || i===length-1 || i%step===0);
}
