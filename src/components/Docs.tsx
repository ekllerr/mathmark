import useUIStore from "@/store/uiStore"

const entries = [
  { category: 'Assignment', syntax: 'a = 2', example: '${ a = 2, b = 3, a * b }' },
  { category: 'Expression', syntax: 'sin(pi/6)', example: '${ sin(pi/6) }' },
  { category: 'Plot', syntax: 'plot(fn)', example: '${ plot(sin(x), cos(x)) }' },
  { category: 'Integral', syntax: 'int(a, b) expr dx', example: '${ int(0, 1) x^2 dx }' },
  { category: 'Limit', syntax: 'lim(x->c) expr', example: '${ lim(x->0) sin(x)/x }' },
  { category: 'Sum', syntax: 'sum(i, a, b) expr', example: '${ sum(i, 1, 10) i^2 }' },
  { category: 'Logarithm', syntax: 'ln(x), lg(x)', example: '${ ln(e), lg(100) }' },
  { category: 'Infinity', syntax: 'inf, -inf', example: '${ lim(x->inf) 1/x }' },
]

export default function Docs() {
    const docsOpen = useUIStore(state => state.docsOpen);

    return (
      <div
      className={`overflow-hidden transition-all duration-300 ease-in-out shrink-0 border-border bg-surface
        ${docsOpen ? 'max-h-64 border-b' : 'max-h-0'}`}
    >
      <div className="px-6 py-4 overflow-x-auto">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[9px] tracking-widest text-muted uppercase">Syntax Reference</span>
          <span className="text-[9px] text-muted">Ctrl+/</span>
        </div>
        <div className="flex gap-6 flex-wrap">
          {entries.map((e) => (
            <div key={e.category} className="flex flex-col gap-1 min-w-40">
              <span className="text-[9px] tracking-widest text-accent uppercase">{e.category}</span>
              <code className="text-xs text-text font-mono">{e.syntax}</code>
              <code className="text-[10px] text-muted font-mono">{e.example}</code>
            </div>
          ))}
        </div>
      </div>
    </div>
    )
}
