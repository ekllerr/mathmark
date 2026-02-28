import { useEffect, useRef } from 'react';
import * as math from 'mathjs';
import Plotly from 'plotly.js-dist-min';

interface Props{
    fns: string[];
}

export default function MathPlot({fns }: Props) {

    const ref = useRef<HTMLDivElement>(null);
    const colors = ['#7DF9AA', '#60CFFF', '#FF6B9D', '#FFD166', '#C77DFF'];

    useEffect(() => {
  if (!ref.current) return

  const container = ref.current

  const xs = Array.from({ length: 400 }, (_, i) => -10 + i * 0.05)

  const traces = fns.map((fn, i) => ({
        x: xs,
        y: xs.map(x => {
          try { return parseFloat(String(math.evaluate(fn, { x }))) }
          catch { return null }
        }),
        type: 'scatter' as const,
        mode: 'lines' as const,
        name: fn,
        line: { color: colors[i % colors.length], width: 2.5 },
    }))

    Plotly.newPlot(container, traces, {
        paper_bgcolor: 'transparent',
        plot_bgcolor: 'transparent',
        font: { color: '#c8c8d0', family: 'IBM Plex Mono, monospace', size: 11 },
        margin: { t: 20, b: 36, l: 44, r: 12 },
        xaxis: { gridcolor: '#2a2a3a', zerolinecolor: '#4a4a5a' },
        yaxis: { gridcolor: '#2a2a3a', zerolinecolor: '#4a4a5a' },
        showlegend: fns.length > 1,
        legend: { bgcolor: 'transparent' },
    }, { displayModeBar: true, responsive: true })

    return () => { Plotly.purge(container) }
    }, [fns]);

    return (
        <div ref={ref} style={{width: '100%', height: 260}}/>  
    )
}
