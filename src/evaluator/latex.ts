import * as math from 'mathjs'
import type { ValueResult } from './evaluate'

// the LaTeX to draw for a statement: the expression, and optionally its working and its result
export function resultToLatex(result: ValueResult, showResult: boolean, exact: boolean, steps: boolean): string {
    if(!showResult) return result.exprLatex;

    const working = steps && result.stepLatex ? ` = ${result.stepLatex}` : '';
    return `${result.exprLatex}${working} ${exact && result.exactLatex ? result.exactLatex : result.resultLatex}`;
}

function roundNum(val: number): number {
    return Math.round(val * 1e10) / 1e10;
}

// LaTeX for a computed value
export function formatNum(val: unknown): string {
    if(typeof val === 'number'){
        if(isNaN(val)) return '\\text{undefined}';
        if(!isFinite(val)) return val > 0 ? '\\infty' : '-\\infty';
        return String(roundNum(val));
    }

    if(math.isComplex(val)) return math.complex(roundNum(val.re), roundNum(val.im)).toString();
    if(typeof val === 'boolean') return `\\text{${val}}`;
    if(math.isMatrix(val) || Array.isArray(val)) return math.parse(math.format(val, { precision: 10 })).toTex();

    return String(val);
}

// LaTeX for an integral, limit or derivative bound
export function numToLatex(n: number): string {
  if (n === Infinity) return '\\infty'
  if (n === -Infinity) return '-\\infty'
  return String(n)
}

// single-letter function names (f, g, P) are set in italics like a textbook would
function fnNameLatex(name: string): string {
    return name.length === 1 ? name : `\\mathrm{${name}}`;
}

// custom LaTeX for DSL functions; returning undefined falls back to the mathjs default
function texHandler(node: math.MathNode, options?: object): string | undefined {
    if(node.type === 'FunctionAssignmentNode'){
        const { name, params, expr } = node as math.FunctionAssignmentNode;
        return `${fnNameLatex(name)}\\left(${params.join(',')}\\right) = ${expr.toTex(options)}`;
    }

    // mathjs draws == as a plain =, which reads like an assignment
    if(math.isOperatorNode(node) && node.fn === 'equal')
        return `${node.args[0].toTex(options)} \\stackrel{?}{=} ${node.args[1].toTex(options)}`;

    if(node.type !== 'FunctionNode') return undefined;

    const { fn, args } = node as math.FunctionNode;
    const tex = args.map(arg => arg.toTex(options));

    if(fn.name === 'C' && tex.length === 2) return `\\binom{${tex[0]}}{${tex[1]}}`;
    if(fn.name.length === 1) return `${fn.name}\\left(${tex.join(',')}\\right)`;

    return undefined;
}

export function nodeToLatex(node: math.MathNode): string {
    return node.toTex({ handler: texHandler });
}

export function toLatex(expr: string): string {
    try{
        return nodeToLatex(math.parse(expr));
    }
    catch{
        return expr
          .replace(/(\w+)\s*\*\s*(\w+)/g, '$1 \\cdot $2')
          .replace(/\bpi\b/g, '\\pi')
          .replace(/\bsin\b/g, '\\sin')
          .replace(/\bcos\b/g, '\\cos')
          .replace(/\btan\b/g, '\\tan')
          .replace(/\bsqrt\(([^)]+)\)/g, '\\sqrt{$1}')
          .replace(/\blog\(([^,)]+),\s*([^)]+)\)/g, '\\log_{$2}($1)')
          .replace(/\blog\(([^)]+)\)/g, '\\ln($1)')
    }
}
