import { evaluateBlock } from "@/evaluator/evaluate";
import { parseStatements } from "@/parser/dslParser"
import katex from "katex";
import MathPlot from "./Plot";

interface Props {
  inner: string
}

export default function MathBlock({inner}: Props) {

    const statements = parseStatements(inner);
    const results = evaluateBlock(statements);
    

  return (
    <div className="bg-surface border border-border border-l-4 border-l-accent rounded-md px-5 py-4 my-4 overflow-x-auto">
        {
            results.map((result, i) => {
                if(result.type === 'error'){
                    return (
                        <div key={i} className="text-red-400 text-xs py-1">
                            error: {result.message}
                        </div>
                    );
                }

                if(result.type === 'plot'){
                    return (
                        <MathPlot key={i} fns={result.fns}/>
                    );
                }
                return (
                    <div
                    key={i} 
                    className="py-2.5 border-b border-border last:border-none"
                    dangerouslySetInnerHTML={{
                        __html: katex.renderToString(result.latex, {
                            throwOnError: false,
                            displayMode: true,
                            output: 'mathml',
                        })
                    }}
                    />

                );
            })
        }
    </div>
  )
}
