import { toFraction } from './exact'
import type { RealFunction } from './numeric'

const SAMPLES = 20000;

function bisect(f: RealFunction, a: number, b: number): number {
    let fa = f(a);

    for(let i = 0; i < 80 && b - a > 1e-15 * Math.max(1, Math.abs(a)); i++){
        const mid = (a + b) / 2;
        const fm = f(mid);

        if(fm === 0) return mid;
        if(Math.sign(fm) === Math.sign(fa)) { a = mid; fa = fm; }
        else b = mid;
    }

    return (a + b) / 2;
}

// every real root of f in [a, b] that the sampling can see: sign changes, and places where the curve only touches zero
export function findRoots(f: RealFunction, a: number, b: number): number[] {
    const h = (b - a) / SAMPLES;
    const xs = Array.from({ length: SAMPLES + 1 }, (_, i) => a + i * h);
    const ys = xs.map(f);
    const roots: number[] = [];

    for(let i = 0; i <= SAMPLES; i++){
        if(ys[i] === 0) roots.push(xs[i]);
        if(i === 0 || !isFinite(ys[i]) || !isFinite(ys[i - 1])) continue;

        if(ys[i - 1] * ys[i] < 0){
            const root = bisect(f, xs[i - 1], xs[i]);
            // at a pole or a jump the sign changes too, but the function is not small there
            if(Math.abs(f(root)) < 1e-3 * Math.max(Math.abs(ys[i - 1]), Math.abs(ys[i]))) roots.push(root);
        }
        else if(i < SAMPLES && isFinite(ys[i + 1]) && ys[i] !== 0
            && Math.abs(ys[i]) < Math.abs(ys[i - 1]) && Math.abs(ys[i]) <= Math.abs(ys[i + 1])
            && ys[i - 1] * ys[i + 1] > 0){
            // a dip towards zero without crossing: find the turning point through the slope, which does change sign
            const d = h * 1e-3;
            const slope: RealFunction = x => f(x + d) - f(x - d);

            if(slope(xs[i - 1]) * slope(xs[i + 1]) < 0){
                const root = bisect(slope, xs[i - 1], xs[i + 1]);
                if(Math.abs(f(root)) <= 1e-12 * Math.max(1, Math.abs(ys[i - 1]), Math.abs(ys[i + 1]))) roots.push(root);
            }
        }
    }

    return distinct(roots);
}

function distinct(roots: number[]): number[] {
    const sorted = [...roots].sort((p, q) => p - q);
    return sorted.filter((root, i) => i === 0 || Math.abs(root - sorted[i - 1]) > 1e-9 * Math.max(1, Math.abs(root)));
}

function evaluatePolynomial(coefficients: number[], x: number): number {
    return coefficients.reduceRight((total, c) => total * x + c, 0);
}

export interface PolynomialRoots{
    roots: number[] | 'all',
    exact: string | null // closed form for the roots when there is a tidy one, e.g. \frac{1 \pm \sqrt{5}}{2}
}

// real roots of c[0] + c[1] x + c[2] x^2 + ...
export function solvePolynomial(coefficients: number[]): PolynomialRoots {
    const c = [...coefficients];
    while(c.length > 0 && c[c.length - 1] === 0) c.pop();

    if(c.length === 0) return { roots: 'all', exact: null };
    if(c.length === 1) return { roots: [], exact: null };
    if(c.length === 2) return { roots: [-c[0] / c[1]], exact: null };

    if(c.length === 3){
        const [c0, c1, c2] = c;
        const discriminant = c1 * c1 - 4 * c2 * c0;

        if(discriminant < 0) return { roots: [], exact: null };
        if(discriminant === 0) return { roots: [-c1 / (2 * c2)], exact: null };

        const root = Math.sqrt(discriminant);
        // the larger-magnitude root first, then the other from the product of roots: avoids cancellation
        const q = -(c1 + Math.sign(c1 || 1) * root) / 2;
        return { roots: distinct([q / c2, c0 / q]), exact: quadraticFormula(c0, c1, c2) };
    }

    // Cauchy's bound: every root lies within this distance of zero
    const lead = c[c.length - 1];
    const bound = 1 + Math.max(...c.slice(0, -1).map(k => Math.abs(k / lead)));
    return { roots: findRoots(x => evaluatePolynomial(c, x), -bound, bound), exact: null };
}

function gcd(a: number, b: number): number {
    return b === 0 ? Math.abs(a) : gcd(b, a % b);
}

// the quadratic formula in lowest terms, when the coefficients are rational and the roots are irrational
function quadraticFormula(c0: number, c1: number, c2: number): string | null {
    const fractions = [c0, c1, c2].map(k => toFraction(k, 1000, 1e-12));
    if(fractions.some(f => f === null)) return null;

    const scale = fractions.reduce((lcm, f) => lcm * f![1] / gcd(lcm, f![1]), 1);
    const [c, b, a] = fractions.map(f => Math.round(f![0] * scale / f![1]));
    if(Math.max(Math.abs(a), Math.abs(b), Math.abs(c)) > 1e4) return null;

    // sqrt(discriminant) = outside * sqrt(inside)
    let inside = b * b - 4 * a * c;
    let outside = 1;
    for(let k = 2; k * k <= inside; k++)
        while(inside % (k * k) === 0){ inside /= k * k; outside *= k; }

    if(inside === 1) return null; // rational roots: each is shown as its own fraction

    let denominator = 2 * a;
    let lead = -b;
    const common = gcd(gcd(lead, outside), denominator);
    lead /= common; outside /= common; denominator /= common;
    if(denominator < 0){ denominator = -denominator; lead = -lead; }

    const numerator = `${lead === 0 ? '' : lead} \\pm ${outside === 1 ? '' : outside}\\sqrt{${inside}}`;
    return denominator === 1 ? numerator : `\\frac{${numerator}}{${denominator}}`;
}
