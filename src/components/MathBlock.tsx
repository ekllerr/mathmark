import { evaluateBlock } from "@/evaluator/evaluate";
import { parseStatements } from "@/parser/dslParser"
import katex from "katex";
import MathPlot from "@/components/Plot";
import { useState } from "react";
import 'katex/dist/katex.min.css'

interface Props {
  inner: string
}

const renderLatex = (latex: string) =>
  katex.renderToString(latex, { throwOnError: false, displayMode: true, output: 'html' })

export default function MathBlock({inner}: Props) {

    const [calculated, setCalculated] = useState<boolean>(false);
    const statements = parseStatements(inner);
    const results = evaluateBlock(statements);

  return (
    <div className="relative bg-surface border border-border border-l-4 border-l-accent rounded-md px-5 py-4 my-4 overflow-x-auto">
      <button
        onClick={() => setCalculated(c => !c)}
        className={`absolute top-3 right-3 font-mono text-[9px] tracking-widest uppercase px-2 py-1 rounded border transition-colors cursor-pointer
          ${calculated ? 'border-accent text-accent' : 'border-border text-muted hover:text-text hover:border-muted'}`}
      >
        {calculated ? '= on' : '= off'}
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
          return <MathPlot key={i} fns={result.fns} scope={result.scope} />
        }

        const latex = calculated
          ? `${result.exprLatex} ${result.resultLatex}`
          : result.exprLatex

        return (
          <div
            key={i}
            className="py-1.5 border-b border-border last:border-none"
            dangerouslySetInnerHTML={{ __html: renderLatex(latex) }}
          />
        )
      })}
    </div>
  )
}
