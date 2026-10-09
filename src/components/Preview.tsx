import { parseBlocks, type MathBlock as Block } from "@/parser/blockParser";
import { createDocumentEvaluator, type EvalResult } from "@/evaluator/evaluate";
import { resultToLatex } from "@/evaluator/latex";
import useEditorStore from "@/store/editor"
import useUIStore from "@/store/uiStore";
import { marked } from "marked";
import DOMPurify from "dompurify";
import katex from "katex";
import { memo, useMemo, useState } from "react";
import MathBlock from "./MathBlock";
import { EXAMPLE } from "@/example";

marked.setOptions({ breaks: true });

type Segment =
    | { kind: 'prose', key: string, text: string, inline: EvalResult[][] }
    | { kind: 'block', key: string, results: EvalResult[] }

// inline math travels through markdown as an empty span and is filled in afterwards
const placeholder = (index: number) => `<span data-math="${index}"></span>`;
const PLACEHOLDER = /<span data-math="(\d+)"><\/span>/g;

// a block on a line of its own is set as a display block; one inside a line of text stays in the sentence
function isDisplay(content: string, block: Block, results: EvalResult[]): boolean {
    if(results.some(result => result.type === 'plot')) return true;

    const lineStart = content.lastIndexOf('\n', block.start - 1) + 1;
    const nextBreak = content.indexOf('\n', block.end);
    const lineEnd = nextBreak === -1 ? content.length : nextBreak;

    return content.slice(lineStart, block.start).trim() === '' && content.slice(block.end, lineEnd).trim() === '';
}

function buildSegments(content: string, blocks: Block[], results: EvalResult[][]): Segment[] {
    const segments: Segment[] = [];
    let text = '';
    let inline: EvalResult[][] = [];
    let cursor = 0;

    const flushProse = (key: string) => {
        if(text.trim() !== '') segments.push({ kind: 'prose', key, text, inline });
        text = '';
        inline = [];
    }

    blocks.forEach((block, i) => {
        text += content.slice(cursor, block.start);
        cursor = block.end;

        if(isDisplay(content, block, results[i])){
            flushProse(`prose-${i}`);
            segments.push({ kind: 'block', key: `block-${i}`, results: results[i] });
        }
        else {
            text += placeholder(inline.length);
            inline.push(results[i]);
        }
    });

    text += content.slice(cursor);
    flushProse('prose-end');

    return segments;
}

function escapeHtml(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderInline(index: number, results: EvalResult[] | undefined, open: boolean, exact: boolean, steps: boolean): string {
    if(!results) return '';

    const parts = results.map(result => {
        if(result.type === 'error') return `<span class="text-red-400">error: ${escapeHtml(result.message)}</span>`;
        if(result.type === 'plot') return '';
        return katex.renderToString(resultToLatex(result, open, exact, steps), { throwOnError: false, displayMode: false, output: 'html' });
    });

    const title = open ? 'Click to hide the result' : 'Click to show the result';
    return `<span class="math-inline" data-math="${index}" role="button" tabindex="0" aria-pressed="${open}" title="${title}">${parts.join(', ')}</span>`;
}

interface ProseProps{
    text: string,
    inline: EvalResult[][]
}

// memoised: markdown is re-parsed only for the stretch of prose that was edited.
// The HTML is sanitised because a share link can carry a document written by someone else.
const Prose = memo(function Prose({ text, inline }: ProseProps) {
    const exact = useUIStore(state => state.exact);
    const steps = useUIStore(state => state.steps);
    const [open, setOpen] = useState<ReadonlySet<number>>(new Set());

    const html = useMemo(() => DOMPurify.sanitize(marked.parse(text, { async: false })), [text]);
    const filled = useMemo(
        () => html.replace(PLACEHOLDER, (_, index) => renderInline(Number(index), inline[Number(index)], open.has(Number(index)), exact, steps)),
        [html, inline, open, exact, steps]
    );

    // inline math shows its result when clicked, like the "= on" switch of a block
    const toggle = (target: EventTarget) => {
        const math = target instanceof Element ? target.closest('[data-math]') : null;
        if(!math) return false;

        const index = Number(math.getAttribute('data-math'));
        setOpen(previous => {
            const next = new Set(previous);
            if(!next.delete(index)) next.add(index);
            return next;
        });
        return true;
    }

    return (
        <div
            className="prose prose-sm max-w-none font-light"
            onClick={e => toggle(e.target)}
            onKeyDown={e => {
                if((e.key === 'Enter' || e.key === ' ') && toggle(e.target)) e.preventDefault();
            }}
            dangerouslySetInnerHTML={{__html: filled}}
        />
    );
}, (previous, next) =>
    previous.text === next.text
    && previous.inline.length === next.inline.length
    && previous.inline.every((results, i) => results === next.inline[i])
);

export default function Preview() {

    const content = useEditorStore(state => state.content);
    const setContent = useEditorStore(state => state.setContent);
    const [evaluate] = useState(createDocumentEvaluator);

    const blocks = useMemo(() => parseBlocks(content), [content]);
    const results = useMemo(() => evaluate(blocks.map(block => block.inner)), [evaluate, blocks]);
    const segments = useMemo(() => buildSegments(content, blocks, results), [content, blocks, results]);

    return (
      <div className="preview-scroll flex flex-col flex-1 overflow-hidden">
          <div className="print:hidden px-4 py-1.5 text-[9px] tracking-widest text-muted uppercase border-b border-border bg-surface">
            Preview
          </div>
          <div className="preview-content prose prose-sm max-w-none flex-1 overflow-y-auto p-8 bg-panel text-text">
            {segments.map(segment => segment.kind === 'prose'
              ? <Prose key={segment.key} text={segment.text} inline={segment.inline} />
              : <MathBlock key={segment.key} results={segment.results} />
            )}

            {content.trim() === '' && (
              <div className="not-prose mx-auto mt-16 max-w-sm text-center font-mono print:hidden">
                <div className="font-serif text-5xl text-accent">∑</div>
                <h2 className="mt-4 text-sm text-heading">Nothing here yet</h2>
                <p className="mt-2 text-xs leading-6 text-muted">
                  Write notes in markdown. Anything inside <code className="text-text">{'${ }'}</code> is calculated, drawn and plotted.
                </p>
                <button
                  onClick={() => setContent(EXAMPLE)}
                  className="mt-5 rounded-md border border-accent px-4 py-2 text-[11px] tracking-widest uppercase text-accent cursor-pointer transition-colors hover:bg-border"
                >
                  Load an example
                </button>
              </div>
            )}
          </div>

      </div>
    )
}
