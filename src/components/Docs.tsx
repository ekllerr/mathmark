import useUIStore from "@/store/uiStore"

const entries = [
  { category: 'Assignment', syntax: 'a = 2', example: '${ a = 2, b = 3, a * b }' },
  { category: 'Expression', syntax: 'sin(pi/6)', example: '${ sin(pi/6) }' },
  { category: 'Function', syntax: 'f(x) = expr', example: '${ f(x) = x^2 + 1, f(3) }' },
  { category: 'Plot', syntax: 'plot(fn)', example: '${ plot(sin(x), cos(x)) }' },
  { category: 'Integral', syntax: 'int(a, b) expr dx', example: '${ int(0, 1) x^2 dx }' },
  { category: 'Derivative', syntax: 'diff(x) expr, diff(x, a) expr', example: '${ diff(x) x^2 * sin(x) }' },
  { category: 'Higher derivative', syntax: 'diff(x^2) expr', example: '${ diff(x^2) x^4 }' },
  { category: 'Partial derivative', syntax: 'diff(x) diff(y) expr', example: '${ diff(x) diff(y) x^2 * y^3 }' },
  { category: 'Limit', syntax: 'lim(x->c) expr', example: '${ lim(x->0) sin(x)/x }' },
  { category: 'One-sided limit', syntax: 'lim(x->c+) expr, lim(x->c-) expr', example: '${ lim(x->0+) 1/x }' },
  { category: 'Sum', syntax: 'sum(i, a, b) expr', example: '${ sum(i, 1, 10) i^2 }' },
  { category: 'Product', syntax: 'prod(i, a, b) expr', example: '${ prod(i, 1, 5) i }' },
  { category: 'Solve', syntax: 'solve(equation), solve(equation, from, to)', example: '${ solve(x^2 - x - 1 = 0) }' },
  { category: 'Inline math', syntax: 'text ${ ... } text', example: 'The area is ${ pi * 2^2 } here.' },
  { category: 'Logarithm', syntax: 'ln(x), lg(x)', example: '${ ln(e), lg(100) }' },
  { category: 'Infinity', syntax: 'inf, -inf', example: '${ lim(x->inf) 1/x }' },
  { category: 'Absolute value', syntax: 'abs(x)', example: '${ abs(-5) }' }, 
  { category: 'Factorial', syntax: 'n!', example: '${ 5! }' },
  { category: 'Combinations', syntax: 'C(n, k)', example: '${ C(5, 2) }' },
  { category: 'Permutations', syntax: 'P(n, k), P(n)', example: '${ P(5, 2) }' },
  { category: 'Counting numbers', syntax: 'catalan(n), bellNumbers(n), stirlingS2(n, k)', example: '${ catalan(5) }' },
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
