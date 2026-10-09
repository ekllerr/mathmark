import type { EvalResult } from "@/evaluator/evaluate";
import { resultToLatex } from "@/evaluator/latex";
import useUIStore from "@/store/uiStore";
import katex from "katex";
import MathPlot from "@/components/Plot";
import { memo, useState } from "react";
import 'katex/dist/katex.min.css'

interface Props {
  results: EvalResult[]
}

const renderLatex = (latex: string) =>
  katex.renderToString(latex, { throwOnError: false, displayMode: true, output: 'html' })

// memoised: a block re-renders only when its own results change, not on every keystroke
export default memo(function MathBlock({results}: Props) {

    const [calculated, setCalculated] = useState<boolean>(false);
    const exact = useUIStore(state => state.exact);
    const steps = useUIStore(state => state.steps);

  return (
    <div className="math-block relative bg-surface border border-border border-l-4 border-l-accent rounded-lg px-5 pt-9 pb-4 my-5 overflow-x-auto">

      <button
        onClick={() => setCalculated(c => !c)}
        aria-pressed={calculated}
        className={`absolute top-3 right-3 font-mono text-[9px] tracking-widest uppercase px-2 py-1 rounded border transition-colors cursor-pointer
          ${calculated ? 'border-accent text-accent' : 'border-border text-muted hover:text-text hover:border-muted'}`}
      >
        {calculated ? 'Hide results' : 'Show results'}
      </button>


      {results.map((result, i) => {
        if (result.type === 'error') {
          return (
            <div key={i} className="text-red-400 text-xs py-1">
              error: {result.message}
            </div>
          )
        }

        if (result.type === 'plot') {
          return <MathPlot key={i} fns={result.fns} scope={result.scope} range={result.range} />
        }

        return (
          <div
            key={i}
            className="py-1.5 border-b border-border last:border-none print:border-none"
            dangerouslySetInnerHTML={{ __html: renderLatex(resultToLatex(result, calculated, exact, steps)) }}
          />
        )
      })}
    </div>
  )
})
