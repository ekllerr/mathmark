import { useEffect, useRef } from 'react';
import * as math from 'mathjs';
import Plotly from 'plotly.js-dist-min';

interface Props{
    fns: string[];
    scope: Record<string, unknown>
}

function generateTraces(fns: string[], scope: Record<string, unknown>, xMin: number, xMax: number, colors: string[]) {
  const step = (xMax - xMin) / 800
  const xs = Array.from({ length: 800 }, (_, i) => xMin + i * step)
  return fns.map((fn, i) => ({
    x: xs,
    y: xs.map(x => {
      try { return parseFloat(String(math.evaluate(fn, { ...scope, x }))) }
      catch { return null }
    }),
    type: 'scatter' as const,
    mode: 'lines' as const,
    name: fn,
    line: { color: colors[i % colors.length], width: 2.5 },
  }))
}

export default function MathPlot({ fns, scope }: Props) {

    const ref = useRef<HTMLDivElement>(null)
    const colors = ['#7DF9AA', '#60CFFF', '#FF6B9D', '#FFD166', '#C77DFF']
    const fnsRef = useRef(fns)
    const scopeRef = useRef(scope)
    const layoutRef = useRef<any>(null)

    useEffect(() => { fnsRef.current = fns }, [fns])
    useEffect(() => { scopeRef.current = scope }, [scope])

    useEffect(() => {
      if (!ref.current) return
      const container = ref.current

      layoutRef.current = {
        dragmode: 'pan',
        paper_bgcolor: 'transparent',
        plot_bgcolor: 'transparent',
        font: { color: '#c8c8d0', family: 'IBM Plex Mono, monospace', size: 11 },
        margin: { t: 20, b: 36, l: 44, r: 12 },
        xaxis: { gridcolor: '#2a2a3a', zerolinecolor: '#4a4a5a' },
        yaxis: { gridcolor: '#2a2a3a', zerolinecolor: '#4a4a5a', autorange: true },
        showlegend: fns.length > 1,
        legend: { bgcolor: 'transparent' },
        }
      
        Plotly.newPlot(container, generateTraces(fns, scope, -10, 10, colors), layoutRef.current, {
          responsive: true,
          scrollZoom: false,
          displaylogo: false,
        }).then(() => {
          ;(container as any).on('plotly_relayout', (e: any) => {
            const xMin = e['xaxis.range[0]']
            const xMax = e['xaxis.range[1]']
            if (xMin === undefined || xMax === undefined) return
            
            Plotly.react(
              container,
              generateTraces(fnsRef.current, scopeRef.current, xMin, xMax, colors),
              layoutRef.current
            )
        })
    });

    return () => { Plotly.purge(container) }
  }, [fns, scope])

    return (
        <div ref={ref} style={{width: '100%', height: 260}}/>  
    )
}
