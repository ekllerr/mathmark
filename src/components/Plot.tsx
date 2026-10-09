import { useEffect, useMemo, useRef } from 'react';
import type { Layout, PlotlyHTMLElement, PlotRelayoutEvent } from 'plotly.js';
import { realFunction } from '@/evaluator/evaluate';
import useUIStore, { type Theme } from '@/store/uiStore';

interface Props{
    fns: string[];
    scope: Record<string, unknown>
}

type Plotly = typeof import('plotly.js-dist-min').default;

const SAMPLES = 800;

const PALETTE = {
  dark: { text: '#c8c8d0', grid: '#2a2a3a', zero: '#4a4a5a', lines: ['#7DF9AA', '#60CFFF', '#FF6B9D', '#FFD166', '#C77DFF'] },
  light: { text: '#333333', grid: '#dddddd', zero: '#888888', lines: ['#0f9d58', '#1a73e8', '#d81b60', '#e37400', '#8e24aa'] },
};

function createLayout(): Partial<Layout> {
  return {
    dragmode: 'pan',
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'transparent',
    font: { family: 'IBM Plex Mono, monospace', size: 11 },
    margin: { t: 20, b: 36, l: 44, r: 12 },
    xaxis: {},
    yaxis: { autorange: true },
    legend: { bgcolor: 'transparent' },
  }
}

// colours are set on the existing layout, which also carries the current pan position
function applyPalette(layout: Partial<Layout>, theme: Theme) {
  const { text, grid, zero } = PALETTE[theme]

  layout.font = { ...layout.font, color: text }
  for (const axis of [layout.xaxis, layout.yaxis]) {
    if (!axis) continue
    axis.gridcolor = grid
    axis.zerolinecolor = zero
  }
}

export default function MathPlot({ fns, scope }: Props) {

    const ref = useRef<HTMLDivElement>(null)
    const plotlyRef = useRef<Plotly | null>(null)
    const layoutRef = useRef<Partial<Layout>>({})
    const rangeRef = useRef<[number, number]>([-10, 10])
    const drawRef = useRef<() => Promise<unknown> | undefined>(() => undefined)
    const theme = useUIStore(state => state.theme)

    // each function is compiled once, not once per sample
    const curves = useMemo(() => fns.map(fn => {
      try { return realFunction(fn, scope, 'x') }
      catch { return () => NaN }
    }), [fns, scope])

    // redraws over the visible x-range whenever the functions or the theme change, keeping the current pan position
    useEffect(() => {
      drawRef.current = () => {
        const Plotly = plotlyRef.current
        if (!Plotly || !ref.current) return

        const [xMin, xMax] = rangeRef.current
        const step = (xMax - xMin) / SAMPLES
        const xs = Array.from({ length: SAMPLES }, (_, i) => xMin + i * step)

        const traces = curves.map((curve, i) => ({
          x: xs,
          y: xs.map(x => {
            try {
              const y = curve(x)
              return isNaN(y) ? null : y
            }
            catch { return null }
          }),
          type: 'scatter' as const,
          mode: 'lines' as const,
          name: fns[i],
          line: { color: PALETTE[theme].lines[i % PALETTE[theme].lines.length], width: 2.5 },
        }))

        layoutRef.current.showlegend = fns.length > 1
        applyPalette(layoutRef.current, theme)

        return Plotly.react(ref.current, traces, layoutRef.current, {
          responsive: true,
          scrollZoom: false,
          displaylogo: false,
        })
      }

      drawRef.current()
    }, [curves, fns, theme])

    // Plotly is large, so it is loaded only once a plot is actually on screen
    useEffect(() => {
      const container = ref.current
      if (!container) return
      let cancelled = false

      import('plotly.js-dist-min').then(async ({ default: Plotly }) => {
        if (cancelled) return

        plotlyRef.current = Plotly
        layoutRef.current = createLayout()
        await drawRef.current()
        if (cancelled) return

        ;(container as unknown as PlotlyHTMLElement).on('plotly_relayout', (e: PlotRelayoutEvent) => {
          const xMin = e['xaxis.range[0]']
          const xMax = e['xaxis.range[1]']
          if (xMin === undefined || xMax === undefined) return

          rangeRef.current = [Number(xMin), Number(xMax)]
          drawRef.current()
        })
      })

      return () => {
        cancelled = true
        plotlyRef.current?.purge(container)
        plotlyRef.current = null
      }
    }, [])

    return (
        <div ref={ref} style={{width: '100%', height: 260}}/>
    )
}
