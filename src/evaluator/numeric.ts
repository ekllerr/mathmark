import * as math from 'mathjs'

export type RealFunction = (x: number) => number;

// reads a mathjs value as a real number; anything that is not real comes back as NaN
export function toReal(val: unknown): number {
    if(typeof val === 'number') return val;
    if(math.isComplex(val)) return Math.abs(val.im) < 1e-12 ? val.re : NaN;
    if(math.isBigNumber(val) || math.isFraction(val)) return math.number(val);
    return NaN;
}

export function integrate(f: RealFunction, a: number, b: number): number {
    return isFinite(a) && isFinite(b) ? integrateSimpson(f, a, b) : integrateImproper(f, a, b);
}

function integrateSimpson(f: RealFunction, a: number, b: number): number {
    const n = 1000;
    const h = (b - a) / n;
    let sum = 0;

    for(let i = 0; i <= n; i++){
        const v = f(a + i * h);
        sum += ( i === 0 || i === n) ? v : (i % 2 === 0 ? 2 * v : 4 * v);
    }

    return (h / 3) * sum;
}

// integrals with an infinite bound: double-exponential substitution, then the trapezoid rule in s
function integrateImproper(f: RealFunction, a: number, b: number): number {
    if(a === b) return 0;
    if(a > b) return -integrateImproper(f, b, a);

    const term = (s: number): number => {
        const u = (Math.PI / 2) * Math.sinh(s);
        const du = (Math.PI / 2) * Math.cosh(s);
        let x: number, weight: number;

        if(isFinite(a)) { x = a + Math.exp(u); weight = Math.exp(u) * du; }       // [a, inf)
        else if(isFinite(b)) { x = b - Math.exp(u); weight = Math.exp(u) * du; }  // (-inf, b]
        else { x = Math.sinh(u); weight = Math.cosh(u) * du; }                    // (-inf, inf)

        const v = f(x);
        if(isNaN(v)) return 0;                        // inf * 0 far out in the tail
        if(!isFinite(v) && weight < 1e-100) return 0; // singularity sitting on the finite bound
        return v * weight;
    }

    const notConvergent = new Error('integral does not converge, or converges too slowly to evaluate numerically');
    const range = 6.5; // exp(pi/2 * sinh(6.5)) is about 1e226, close to the largest usable double
    let steps = 52;
    let h = (2 * range) / steps;
    let sum = 0;
    let sumAbs = 0;

    for(let i = 0; i <= steps; i++){
        const t = term(-range + i * h);
        sum += t;
        sumAbs += Math.abs(t);
    }

    // a convergent integrand has died out by the ends of the range
    const edges = Math.abs(term(-range)) + Math.abs(term(range));
    if(!isFinite(sum) || edges > 1e-10 * sumAbs) throw notConvergent;

    let estimate = sum * h;

    for(let level = 0; level < 6; level++){
        // halve the step: only the new midpoints need evaluating
        for(let i = 0; i < steps; i++) sum += term(-range + (i + 0.5) * h);
        steps *= 2;
        h /= 2;

        const refined = sum * h;
        if(!isFinite(refined)) throw notConvergent;
        if(Math.abs(refined - estimate) <= 1e-10 * Math.max(1, Math.abs(refined))) return refined;
        estimate = refined;
    }

    throw notConvergent;
}

type SideLimit =
    | { kind: 'value', value: number }
    | { kind: 'none' }       // oscillates or cannot be determined
    | { kind: 'undefined' }  // the function has no real values on this side

// limit of g(h) as h -> 0+, by Richardson extrapolation over a halving sequence of h
function limitAtZero(g: RealFunction, h0: number): SideLimit {
    const levels = 40;
    const maxOrder = 8;
    const raw: number[] = [];
    let row: number[] = [];
    let best = NaN;
    let bestErr = Infinity;

    for(let k = 0; k < levels; k++){
        const v = g(h0 / 2 ** k);

        if(isNaN(v)){
            if(raw.length === 0) continue; // not in the domain yet, move closer
            break;
        }
        if(!isFinite(v)) return { kind: 'value', value: v };

        raw.push(v);

        const next = [v];
        for(let j = 1; j <= Math.min(row.length, maxOrder); j++)
            next.push(next[j - 1] + (next[j - 1] - row[j - 1]) / (2 ** j - 1));

        if(row.length > 0){
            const estimate = next[next.length - 1];
            const err = Math.abs(estimate - row[row.length - 1]);

            if(err < bestErr){ best = estimate; bestErr = err; }
            if(raw.length > 3 && err <= 1e-11 * Math.max(1, Math.abs(estimate)))
                return { kind: 'value', value: estimate };
        }

        row = next;
    }

    if(raw.length < 3) return { kind: 'undefined' };

    // unbounded: values keep growing in size and the steps between them are not shrinking
    const n = raw.length;
    const growing = raw.slice(-5).every((v, i, tail) => i === 0 || (Math.abs(v) > Math.abs(tail[i - 1]) && Math.sign(v) === Math.sign(tail[0])));
    const lastStep = Math.abs(raw[n - 1] - raw[n - 2]);
    const prevStep = Math.abs(raw[n - 2] - raw[n - 3]);
    if(n >= 5 && growing && lastStep >= 0.9 * prevStep)
        return { kind: 'value', value: raw[n - 1] > 0 ? Infinity : -Infinity };

    if(bestErr > 1e-3 * Math.max(1, Math.abs(best))) return { kind: 'none' };

    // slow convergence: keep only the digits the estimate can vouch for
    const digits = Math.max(0, Math.floor(-Math.log10(bestErr)) - 1);
    return { kind: 'value', value: bestErr === 0 ? best : Math.round(best * 10 ** digits) / 10 ** digits };
}

// limit of f(x) as x -> c, where c may be infinite; throws when there is no limit.
// `side` restricts a finite limit to x approaching from the left or from the right.
export function limit(f: RealFunction, c: number, side: 'left' | 'right' | null = null): number {
    const describe = (v: number) => isFinite(v) ? String(Math.round(v * 1e10) / 1e10) : (v > 0 ? '∞' : '-∞');
    const noLimit = new Error('limit does not exist, or could not be determined numerically');

    if (!isFinite(c)) {
        const side = limitAtZero(h => f((c > 0 ? 1 : -1) / h), 0.125);
        if(side.kind !== 'value') throw noLimit;
        return side.value;
    }

    const h0 = 0.125 * Math.max(1, Math.abs(c));

    if(side){
        const oneSided = limitAtZero(h => f(side === 'left' ? c - h : c + h), h0);
        if(oneSided.kind !== 'value') throw noLimit;
        return oneSided.value;
    }

    const left = limitAtZero(h => f(c - h), h0);
    const right = limitAtZero(h => f(c + h), h0);

    if(left.kind === 'none' || right.kind === 'none') throw noLimit;

    if(left.kind === 'value' && right.kind === 'value'){
        const l = left.value;
        const r = right.value;
        const agree = l === r || (isFinite(l) && isFinite(r) && Math.abs(l - r) <= 1e-6 * Math.max(1, Math.abs(l), Math.abs(r)));

        if(!agree)
            throw new Error(`limit does not exist: it is ${describe(l)} from the left and ${describe(r)} from the right`);

        return l === r ? l : (l + r) / 2;
    }

    // defined on one side only, e.g. sqrt(x) at 0
    if(left.kind === 'value') return left.value;
    if(right.kind === 'value') return right.value;
    throw noLimit;
}
