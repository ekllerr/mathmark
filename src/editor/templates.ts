// A template is text to insert, with «guillemets» around the part the writer will most likely replace.
// That part ends up selected, so typing overwrites it; if text was already selected, it goes there instead.
export interface Template{
    label: string, // what the toolbar button shows
    title: string, // its tooltip
    text: string,
    math: boolean // true: belongs inside ${ }, and gets wrapped in one when inserted into prose
}

export const TEMPLATES: Template[] = [
    { label: '${ }', title: 'Math block (Ctrl+M)', text: '«»', math: true },
    { label: 'a/b', title: 'Fraction', text: '(«a»)/(b)', math: true },
    { label: 'xⁿ', title: 'Power', text: '«x»^2', math: true },
    { label: '√', title: 'Square root', text: 'sqrt(«x»)', math: true },
    { label: 'π', title: 'Pi', text: 'pi«»', math: true },
    { label: 'f(x)=', title: 'Define a function', text: 'f(x) = «x^2»', math: true },
    { label: '∫', title: 'Integral', text: 'int(0, 1) «x^2» dx', math: true },
    { label: 'd/dx', title: 'Derivative', text: 'diff(x) «x^2»', math: true },
    { label: 'lim', title: 'Limit', text: 'lim(x->0) «sin(x)/x»', math: true },
    { label: 'Σ', title: 'Sum', text: 'sum(i, 1, 10) «i^2»', math: true },
    { label: 'Π', title: 'Product', text: 'prod(i, 1, 5) «i»', math: true },
    { label: 'solve', title: 'Solve an equation', text: 'solve(«x^2 = 4»)', math: true },
    { label: 'plot', title: 'Plot a function', text: 'plot(«sin(x)», -pi..pi)', math: true },
    { label: 'H', title: 'Heading', text: '## «Heading»', math: false },
    { label: 'B', title: 'Bold', text: '**«bold»**', math: false },
    { label: '•', title: 'List item', text: '- «item»', math: false },
];

export const MATH_BLOCK = TEMPLATES[0];

// true when `position` is inside a ${ ... }, including one whose closing brace has not been typed yet
export function insideMath(text: string, position: number): boolean {
    const open = text.lastIndexOf('${', position - 1);
    if(open === -1 || open + 2 > position) return false;

    let depth = 1;
    for(let i = open + 2; i < position; i++){
        if(text[i] === '{') depth++;
        else if(text[i] === '}' && --depth === 0) return false;
    }

    return true;
}

export interface Insertion{
    from: number, // the range of the document to replace
    to: number,
    insert: string,
    selectFrom: number, // what to select afterwards, in the new document
    selectTo: number
}

// works out what inserting `template` does to a document whose selection runs from `from` to `to`
export function applyTemplate(doc: string, from: number, to: number, template: Template): Insertion {
    const selected = doc.slice(from, to);
    const [before, placeholder, after] = template.text.split(/[«»]/);
    const middle = selected || placeholder;

    // math typed into prose needs a block around it; a heading or list item needs a line of its own
    const wrap = template.math && !insideMath(doc, from);
    const ownLine = !template.math && /^(#|-)/.test(template.text) && from > 0 && doc[from - 1] !== '\n';
    const prefix = (ownLine ? '\n' : '') + (wrap ? '${ ' : '') + before;
    const suffix = after + (wrap ? ' }' : '');

    return {
        from,
        to,
        insert: prefix + middle + suffix,
        selectFrom: from + prefix.length,
        selectTo: from + prefix.length + middle.length,
    }
}
