import { all, create, type Fraction, type MathJsInstance } from 'mathjs'

// a second mathjs that reads every number as an exact fraction, built only when first needed
let fractionMath: MathJsInstance | null = null;

function exactMath(): MathJsInstance {
    fractionMath ??= create(all, { number: 'Fraction' });
    return fractionMath;
}

// beyond this a fraction is harder to read than its decimal, e.g. 3.14159 as 314159/100000
const MAX_SHOWN_DENOMINATOR = 10_000;

function fractionToLatex(fraction: Fraction): string | null {
    const numerator = Number(fraction.s) * Number(fraction.n);
    const denominator = Number(fraction.d);

    if(denominator === 1 || denominator > MAX_SHOWN_DENOMINATOR || !Number.isSafeInteger(numerator)) return null;
    return ratioLatex(numerator, denominator, '');
}

// LaTeX for (p/q) * symbol, e.g. \frac{3\pi}{4}; an empty symbol gives a plain fraction
function ratioLatex(p: number, q: number, symbol: string): string {
    const sign = p < 0 ? '-' : '';
    const top = symbol === '' ? String(Math.abs(p)) : `${Math.abs(p) === 1 ? '' : Math.abs(p)}${symbol}`;

    return q === 1 ? `${sign}${top}` : `${sign}\\frac{${top}}{${q}}`;
}

function agrees(a: number, b: number): boolean {
    return Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(b));
}

// the value of expr as an exact fraction, when it can be computed with rational arithmetic alone
function evaluateFraction(expr: string, scope: Record<string, unknown>): Fraction | null {
    try {
        const math = exactMath();
        const result = math.evaluate(expr, { ...scope });
        return math.isFraction(result) ? result : null;
    }
    catch { return null }
}

// best fraction p/q for x with q <= maxDenominator, by continued fractions; null if none is close enough
export function toFraction(x: number, maxDenominator: number, tolerance: number): [number, number] | null {
    if(!isFinite(x) || Math.abs(x) > 1e9) return null;

    const sign = x < 0 ? -1 : 1;
    const target = Math.abs(x);
    let [p0, q0, p1, q1] = [0, 1, 1, 0];
    let rest = target;

    for(let i = 0; i < 40; i++){
        const whole = Math.floor(rest);
        const p2 = whole * p1 + p0;
        const q2 = whole * q1 + q0;
        if(q2 > maxDenominator) break;

        [p0, q0, p1, q1] = [p1, q1, p2, q2];
        if(Math.abs(target - p1 / q1) <= tolerance * Math.max(1, target)) return [sign * p1, q1];

        const fractional = rest - whole;
        if(fractional < 1e-15) break;
        rest = 1 / fractional;
    }

    return null;
}

function isSquareFree(n: number): boolean {
    for(let k = 2; k * k <= n; k++) if(n % (k * k) === 0) return false;
    return true;
}

const SQUARE_ROOTS = Array.from({ length: 99 }, (_, i) => i + 2).filter(isSquareFree);

const CONSTANTS = [
    { latex: '\\pi', value: Math.PI },
    { latex: 'e', value: Math.E },
    { latex: '\\sqrt{\\pi}', value: Math.sqrt(Math.PI) },
    { latex: '\\ln 2', value: Math.LN2 },
    { latex: '\\ln 3', value: Math.log(3) },
    { latex: '\\ln 10', value: Math.LN10 },
];

// Recognises a decimal as a fraction, or as a simple multiple of a square root or a familiar constant.
// `loose` is for values that came out of a numerical method: they are accurate to fewer digits,
// so fewer candidates are tried to keep a chance match negligible.
// Returns null when x is a whole number or nothing fits.
export function recognise(x: number, loose = false): string | null {
    if(!isFinite(x)) return null;

    const tolerance = loose ? 1e-9 : 1e-12;

    const plain = toFraction(x, loose ? 100 : 1000, tolerance);
    if(plain) return plain[1] === 1 ? null : ratioLatex(plain[0], plain[1], '');

    const bases = [
        ...SQUARE_ROOTS.filter(n => n <= (loose ? 30 : 100)).map(n => ({ latex: `\\sqrt{${n}}`, value: Math.sqrt(n) })),
        ...CONSTANTS,
    ];

    for(const base of bases){
        const multiple = toFraction(x / base.value, loose ? 12 : 60, tolerance);
        if(multiple && multiple[0] !== 0) return ratioLatex(multiple[0], multiple[1], base.latex);
    }

    return null;
}

// exact form of a directly computed expression: true rational arithmetic first, recognition second
export function exactExpression(expr: string, scope: Record<string, unknown>, value: number): string | null {
    const fraction = evaluateFraction(expr, scope);
    if(fraction && agrees(fraction.valueOf(), value)) return fractionToLatex(fraction);

    return recognise(value);
}

const MAX_EXACT_TERMS = 2000;

// exact value of a sum or product whose terms are all rational
export function exactSeries(expr: string, scope: Record<string, unknown>, variable: string, from: number, to: number, product: boolean, value: number): string | null {
    if(to - from >= MAX_EXACT_TERMS) return null;

    try {
        const math = exactMath();
        const compiled = math.compile(expr);
        let total = math.fraction(product ? 1 : 0);

        for(let i = from; i <= to; i++){
            const term = compiled.evaluate({ ...scope, [variable]: math.fraction(i) });
            if(!math.isFraction(term)) return null;

            total = product ? math.multiply(total, term) as Fraction : math.add(total, term);
            if(total.d > 10n ** 15n) return null;
        }

        return agrees(total.valueOf(), value) ? fractionToLatex(total) : null;
    }
    catch { return null }
}
