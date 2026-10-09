import { useEffect, useMemo, useRef } from 'react';
import type { Layout, PlotlyHTMLElement, PlotRelayoutEvent } from 'plotly.js';
import { realFunction } from '@/evaluator/evaluate';
import useUIStore from '@/store/uiStore';
import { tameAsymptotes } from '@/utils/asymptotes';

interface Props{
    fns: string[];
    scope: Record<string, unknown>
    range: [number, number] | null // the x-range to open on; null for -10..10
}

const DEFAULT_RANGE: [number, number] = [-10, 10];

type Plotly = typeof import('plotly.js-dist-min').default;

const SAMPLES = 800;

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

// The theme's plot colours, read from the --plot-* variables in index.css.
// They are set on the existing layout, which also carries the current pan position.
function applyPalette(layout: Partial<Layout>, element: HTMLElement): string[] {
  const style = getComputedStyle(element)
  const color = (name: string) => style.getPropertyValue(`--plot-${name}`).trim()

  layout.font = { ...layout.font, color: color('text') }
  for (const axis of [layout.xaxis, layout.yaxis]) {
    if (!axis) continue
    axis.gridcolor = color('grid')
    axis.zerolinecolor = color('zero')
  }

  return [1, 2, 3, 4, 5].map(n => color(String(n)))
}

export default function MathPlot({ fns, scope, range }: Props) {

    const ref = useRef<HTMLDivElement>(null)
    const plotlyRef = useRef<Plotly | null>(null)
    const layoutRef = useRef<Partial<Layout>>({})
    const rangeRef = useRef<[number, number]>(range ?? DEFAULT_RANGE)
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

        const lines = applyPalette(layoutRef.current, ref.current)

        const ys = curves.map(curve => xs.map(x => {
          try {
            const y = curve(x)
            return isNaN(y) ? null : y
          }
          catch { return null }
        }))

        const yRange = tameAsymptotes(ys)
        layoutRef.current.yaxis = yRange
          ? { ...layoutRef.current.yaxis, autorange: false, range: yRange }
          : { ...layoutRef.current.yaxis, autorange: true }

        const traces = curves.map((_, i) => ({
          x: xs,
          y: ys[i],
          type: 'scatter' as const,
          mode: 'lines' as const,
          name: fns[i],
          line: { color: lines[i % lines.length], width: 2.5 },
        }))

        layoutRef.current.showlegend = fns.length > 1

        return Plotly.react(ref.current, traces, layoutRef.current, {
          responsive: true,
          scrollZoom: false,
          displaylogo: false,
        })
      }

      drawRef.current()
    }, [curves, fns, theme]) // theme: the colours are read again when it changes

    // a new range written in the document replaces wherever the reader had panned to
    useEffect(() => {
      rangeRef.current = range ?? DEFAULT_RANGE
      if (layoutRef.current.xaxis) layoutRef.current.xaxis = { ...layoutRef.current.xaxis, autorange: true }
      drawRef.current()
    }, [range])

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
