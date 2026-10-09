// A curve with a vertical asymptote (tan x, 1/x) has a few enormous values that would flatten everything else
// and a false line joining its two branches. This picks a y-range from the bulk of the points
// and breaks each line where it jumps across that range. Returns null when autoscaling is fine.
export function tameAsymptotes(curves: (number | null)[][]): [number, number] | null {
  const values = curves.flat().filter((y): y is number => y !== null && isFinite(y)).sort((p, q) => p - q)
  if (values.length < 20) return null

  const low = values[Math.floor(values.length * 0.03)]
  const high = values[Math.floor(values.length * 0.97)]
  const span = high - low || 1
  if (values[values.length - 1] - values[0] <= 6 * span) return null

  for (const ys of curves)
    for (let i = 1; i < ys.length; i++) {
      const previous = ys[i - 1], current = ys[i]
      if (previous === null || current === null) continue
      // a jump taller than the whole view, between opposite sides of it: the two points are on different branches
      if (Math.abs(current - previous) > 2 * span && Math.sign(current - low - span / 2) !== Math.sign(previous - low - span / 2))
        ys[Math.abs(current) > Math.abs(previous) ? i : i - 1] = null
    }

  return [low - 0.15 * span, high + 0.15 * span]
}
