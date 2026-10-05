import { parseBlocks } from "@/parser/blockParser";
import { createDocumentEvaluator } from "@/evaluator/evaluate";
import useEditorStore from "@/store/editor"
import { marked } from "marked";
import DOMPurify from "dompurify";
import { memo, useMemo, useState } from "react";
import MathBlock from "./MathBlock";

marked.setOptions({ breaks: true });

// memoised: markdown is re-parsed only for the stretch of prose that was edited.
// The HTML is sanitised because a share link can carry a document written by someone else.
const Prose = memo(function Prose({ text }: { text: string }) {
    return (
        <div
            className="prose prose-invert prose-sm max-w-none font-light"
            dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(marked.parse(text, { async: false }))}}
        />
    );
});

export default function Preview() {

    const content = useEditorStore(state => state.content);
    const [evaluate] = useState(createDocumentEvaluator);

    const blocks = useMemo(() => parseBlocks(content), [content]);
    const results = useMemo(() => evaluate(blocks.map(block => block.inner)), [evaluate, blocks]);

    const parts: React.ReactNode[] = [];
    let cursor = 0;

    blocks.forEach((block, i) => {
        if(block.start > cursor)
            parts.push(<Prose key={`prose-${i}`} text={content.slice(cursor, block.start)} />);

        parts.push(<MathBlock key={`block-${i}`} results={results[i]} />)
        cursor = block.end;
    });

    if(cursor < content.length)
        parts.push(<Prose key="prose-end" text={content.slice(cursor)} />);

    return (
      <div className="preview-scroll flex flex-col flex-1 overflow-hidden">
          <div className="print:hidden px-4 py-1.5 text-[9px] tracking-widest text-muted uppercase border-b border-border bg-surface">
            Preview
          </div>
          <div className="preview-content prose prose-invert prose-sm max-w-none flex-1 overflow-y-auto p-8 bg-panel text-neutral-100">
            {parts}
          </div>

      </div>
    )
}
