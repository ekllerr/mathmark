import { autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap, snippetCompletion, type Completion, type CompletionContext, type CompletionResult } from '@codemirror/autocomplete'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { linter, type Diagnostic } from '@codemirror/lint'
import type { Extension } from '@codemirror/state'
import { Decoration, EditorView, keymap, placeholder, ViewPlugin, type DecorationSet, type ViewUpdate } from '@codemirror/view'
import { createDocumentEvaluator } from '@/evaluator/evaluate'
import { parseBlocks } from '@/parser/blockParser'
import { splitTopLevelParts } from '@/parser/brackets'
import { parseStatements } from '@/parser/dslParser'
import { applyTemplate, insideMath, MATH_BLOCK, type Template } from './templates'

const KEYWORDS = new Set(['plot', 'int', 'lim', 'sum', 'prod', 'diff', 'solve']);
const CONSTANTS = new Set(['pi', 'e', 'i', 'inf', 'infinity']);

// ---------- highlighting ----------

const TOKEN = /([a-zA-Z_]\w*)(?=(\s*\()?)|(\d+\.?\d*(?:e[+-]?\d+)?)|(->|[-+*/^=<>!])/g;

const mark = (name: string) => Decoration.mark({ class: `cm-math-${name}` });
const MARKS = {
    block: mark('block'),
    brace: mark('brace'),
    keyword: mark('keyword'),
    function: mark('function'),
    constant: mark('constant'),
    variable: mark('variable'),
    number: mark('number'),
    operator: mark('operator'),
};

function highlight(text: string): DecorationSet {
    const ranges = [];

    for(const block of parseBlocks(text)){
        ranges.push(MARKS.block.range(block.start, block.end));
        ranges.push(MARKS.brace.range(block.start, block.start + 2));
        ranges.push(MARKS.brace.range(block.end - 1, block.end));

        const innerStart = block.start + 2;
        const inner = text.slice(innerStart, block.end - 1);

        for(const token of inner.matchAll(TOKEN)){
            const from = innerStart + token.index;
            const to = from + token[0].length;
            const [, name, call, number] = token;

            const kind = number !== undefined ? MARKS.number
                : name === undefined ? MARKS.operator
                : call !== undefined ? (KEYWORDS.has(name) ? MARKS.keyword : MARKS.function)
                : CONSTANTS.has(name) ? MARKS.constant
                : MARKS.variable;

            ranges.push(kind.range(from, to));
        }
    }

    return Decoration.set(ranges, true);
}

const highlighter = ViewPlugin.fromClass(class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
        this.decorations = highlight(view.state.doc.toString());
    }

    update(update: ViewUpdate) {
        if(update.docChanged) this.decorations = highlight(update.state.doc.toString());
    }
}, { decorations: plugin => plugin.decorations });

// ---------- autocomplete ----------

const FORMS: Completion[] = [
    snippetCompletion('int(${from}, ${to}) ${expr} dx', { label: 'int', detail: 'integral', type: 'keyword' }),
    snippetCompletion('diff(${x}) ${expr}', { label: 'diff', detail: 'derivative', type: 'keyword' }),
    snippetCompletion('lim(${x}->${0}) ${expr}', { label: 'lim', detail: 'limit', type: 'keyword' }),
    snippetCompletion('sum(${i}, ${1}, ${n}) ${expr}', { label: 'sum', detail: 'sum', type: 'keyword' }),
    snippetCompletion('prod(${i}, ${1}, ${n}) ${expr}', { label: 'prod', detail: 'product', type: 'keyword' }),
    snippetCompletion('solve(${equation})', { label: 'solve', detail: 'solve an equation', type: 'keyword' }),
    snippetCompletion('plot(${expr})', { label: 'plot', detail: 'graph', type: 'keyword' }),
];

const FUNCTIONS: [string, string][] = [
    ['sin', 'sine'], ['cos', 'cosine'], ['tan', 'tangent'], ['asin', 'inverse sine'], ['acos', 'inverse cosine'], ['atan', 'inverse tangent'],
    ['sinh', 'hyperbolic sine'], ['cosh', 'hyperbolic cosine'], ['tanh', 'hyperbolic tangent'],
    ['sqrt', 'square root'], ['cbrt', 'cube root'], ['abs', 'absolute value'], ['exp', 'e to the power'],
    ['ln', 'natural logarithm'], ['lg', 'base-10 logarithm'], ['log', 'logarithm, log(x, base)'],
    ['floor', 'round down'], ['ceil', 'round up'], ['round', 'round'], ['min', 'smallest'], ['max', 'largest'],
    ['mean', 'average'], ['median', 'median'], ['std', 'standard deviation'], ['variance', 'variance'],
    ['det', 'determinant'], ['inv', 'matrix inverse'], ['transpose', 'transpose'],
    ['C', 'combinations C(n, k)'], ['P', 'permutations P(n, k)'], ['factorial', 'factorial'], ['gcd', 'greatest common divisor'], ['lcm', 'least common multiple'],
    ['catalan', 'Catalan number'], ['bellNumbers', 'Bell number'], ['stirlingS2', 'Stirling number'],
];

const BUILT_IN: Completion[] = [
    ...FORMS,
    ...FUNCTIONS.map(([label, detail]) => snippetCompletion(`${label}(\${})`, { label, detail, type: 'function' })),
    { label: 'pi', detail: '3.14159…', type: 'constant' },
    { label: 'e', detail: '2.71828…', type: 'constant' },
    { label: 'inf', detail: 'infinity', type: 'constant' },
];

// the variables and functions the document itself defines
function definedNames(text: string): Completion[] {
    const names = new Map<string, Completion>();

    for(const block of parseBlocks(text))
        for(const statement of parseStatements(block.inner)){
            if(statement.type === 'assignment')
                names.set(statement.name, { label: statement.name, detail: 'your variable', type: 'variable' });
            if(statement.type === 'function')
                names.set(statement.name, snippetCompletion(`${statement.name}(\${})`, { label: statement.name, detail: `your function of ${statement.params.join(', ')}`, type: 'function' }));
        }

    return [...names.values()];
}

function completeMath(context: CompletionContext): CompletionResult | null {
    const text = context.state.doc.toString();
    if(!insideMath(text, context.pos)) return null;

    const word = context.matchBefore(/[a-zA-Z_]\w*/);
    if(!word && !context.explicit) return null;

    return {
        from: word ? word.from : context.pos,
        options: [...definedNames(text), ...BUILT_IN],
        validFor: /^\w*$/,
    }
}

// ---------- errors at their position ----------

function createLinter(): Extension {
    const evaluate = createDocumentEvaluator();

    return linter(view => {
        const text = view.state.doc.toString();
        const blocks = parseBlocks(text);
        const results = evaluate(blocks.map(block => block.inner));
        const diagnostics: Diagnostic[] = [];

        blocks.forEach((block, b) => {
            const innerStart = block.start + 2;
            const parts = splitTopLevelParts(text.slice(innerStart, block.end - 1));
            const statements = parseStatements(block.inner);

            results[b].forEach((result, s) => {
                const part = parts[s];
                if(result.type !== 'error' || !part) return;

                let from = innerStart + part.start;
                let to = innerStart + part.end;

                // mathjs reports where a syntax error is; it is only meaningful when the statement is the expression
                const column = result.message.match(/\(char (\d+)\)/);
                if(column && statements[s]?.type === 'expression'){
                    from = Math.min(from + Number(column[1]) - 1, Math.max(from, to - 1));
                    to = Math.min(from + 1, innerStart + part.end);
                }

                diagnostics.push({ from, to: Math.max(to, from), severity: 'error', message: result.message });
            });
        });

        return diagnostics;
    }, { delay: 400 });
}

// ---------- inserting templates ----------

// puts a template at the cursor (or around the selection) and selects the part to fill in
export function insertTemplate(view: EditorView, template: Template): boolean {
    const { from, to } = view.state.selection.main;
    const insertion = applyTemplate(view.state.doc.toString(), from, to, template);

    view.dispatch({
        changes: { from: insertion.from, to: insertion.to, insert: insertion.insert },
        selection: { anchor: insertion.selectFrom, head: insertion.selectTo },
        scrollIntoView: true,
        userEvent: 'input',
    });
    view.focus();
    return true;
}

// ---------- appearance ----------

// colours come from the page's CSS variables, so the editor follows the light and dark themes by itself
const theme = EditorView.theme({
    '&': { height: '100%', backgroundColor: 'var(--color-panel)', color: 'var(--color-text)' },
    '&.cm-focused': { outline: 'none' },
    '.cm-scroller': { fontFamily: 'var(--font-mono)', fontSize: '0.875rem', lineHeight: '1.75rem' },
    '.cm-content': { padding: '1.5rem', caretColor: 'var(--color-accent)' },
    '.cm-line': { padding: '0' },
    '.cm-cursor': { borderLeftColor: 'var(--color-accent)' },
    '.cm-placeholder': { color: 'var(--color-muted)' },

    '.cm-math-block': { backgroundColor: 'color-mix(in srgb, var(--color-accent) 8%, transparent)', borderRadius: '3px' },
    '.cm-math-brace': { color: 'var(--color-accent)', fontWeight: '600' },
    '.cm-math-keyword': { color: 'var(--color-accent)' },
    '.cm-math-function': { color: 'var(--color-accent2)' },
    '.cm-math-constant': { color: 'var(--color-accent2)', fontStyle: 'italic' },
    '.cm-math-number': { color: 'var(--color-number)' },
    '.cm-math-operator': { color: 'var(--color-muted)' },

    '.cm-tooltip': { backgroundColor: 'var(--color-surface)', color: 'var(--color-text)', border: '1px solid var(--color-border)', borderRadius: '6px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' },
    '.cm-tooltip-autocomplete ul li': { padding: '2px 8px' },
    '.cm-tooltip-autocomplete ul li[aria-selected]': { backgroundColor: 'var(--color-border)', color: 'var(--color-accent)' },
    '.cm-completionDetail': { color: 'var(--color-muted)', fontStyle: 'normal', marginLeft: '1em' },
    '.cm-completionIcon': { display: 'none' },
    '.cm-diagnostic': { padding: '4px 8px' },
    '.cm-diagnostic-error': { borderLeft: '3px solid #f87171' },
    '.cm-lintRange-error': { backgroundImage: 'none', borderBottom: '2px wavy #f87171' },
});

export function mathEditor(onChange: (content: string) => void): Extension {
    return [
        history(),
        EditorView.lineWrapping,
        placeholder('Start writing...'),
        closeBrackets(),
        autocompletion({ override: [completeMath] }),
        highlighter,
        createLinter(),
        theme,
        keymap.of([
            { key: 'Mod-m', run: view => insertTemplate(view, MATH_BLOCK) },
            ...closeBracketsKeymap, ...completionKeymap, ...historyKeymap, ...defaultKeymap, indentWithTab]),
        EditorView.updateListener.of(update => {
            if(update.docChanged) onChange(update.state.doc.toString());
        }),
    ];
}
