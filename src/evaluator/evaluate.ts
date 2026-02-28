import * as math from 'mathjs'
import type { Statement, AssignmentStatement, IntegralStatement, LimitStatement, ExpressionStatement } from '@/parser/dslParser'


export type EvalResultType = 'value' | 'plot' | 'error';

export interface ValueResult{
    type: 'value',
    latex: string,
    raw: number | string
}

export interface PlotResult{
    type: 'plot',
    fns: string[]
}

export interface ErrorResult{
    type: 'error',
    message: string
}

export type EvalResult = ValueResult | PlotResult | ErrorResult;

export function evaluateBlock(statements: Statement[]) : EvalResult[] {
    const scope: Record<string, unknown> = {
        inf: Infinity,
        infinity: Infinity,
    };
    const results: EvalResult[] = [];

    for(const stmt of statements){
        try{
            switch(stmt.type){
                case 'assignment': {
                    results.push(evalAssignment(stmt, scope));
                    break;
                }

                case 'plot': {
                    results.push({type: 'plot', fns: stmt.fns});
                    break;
                }

                case 'integral': {
                    results.push(evalIntegral(stmt, scope));
                    break;
                }

                case 'limit': {
                    results.push(evalLimit(stmt, scope));
                    break;
                }

                case 'expression': {
                    results.push(evalExpression(stmt, scope));
                    break;
                }
            } 
        }
        catch(e){
            results.push({type: 'error', message: (e as Error).message})
        }
    }

    return results;
}

function evalAssignment(stmt: AssignmentStatement, scope: Record<string, unknown>): ValueResult {
  const val = math.evaluate(stmt.value, scope)
  scope[stmt.name] = val

  return {
    type: 'value',
    latex: `${toLatex(stmt.name)} = ${formatNum(val)}`,
    raw: val,
  }
}

function evalExpression(stmt: ExpressionStatement, scope: Record<string, unknown>): ValueResult {
    try{
        const val = math.evaluate(stmt.expr, scope)
        
        return {
            type: 'value',
            latex: `${toLatex(stmt.expr)} = ${formatNum(val)}`,
            raw: val,
        }
    } catch {
        return {
            type: 'value',
            latex: toLatex(stmt.expr),
            raw: stmt.expr,
        }
    }
}

function evalIntegral(stmt: IntegralStatement, scope: Record<string, unknown>): ValueResult {
    const a = parseLimit(stmt.from, scope)
    const b = parseLimit(stmt.to, scope);
    const effectiveA = !isFinite(a) ? (a > 0 ? 1e6 : -1e6) : a;
    const effectiveB = !isFinite(b) ? (b > 0 ? 1e6 : -1e6) : b;
    const n = 1000;
    const h = (effectiveB - effectiveA) / n;
    let sum = 0;

    for(let i = 0; i <= n; i++){
        const x = effectiveA + i * h;
        const v = parseFloat(String(math.evaluate(stmt.expr, {...scope, [stmt.variable]: x})));
        sum += ( i === 0 || i === n) ? v : (i % 2 === 0 ? 2 * v : 4 * v);
    }

    const value = (h / 3) * sum;
    return {
        type: 'value',
        latex: `\\int_{${numToLatex(a)}}^{${numToLatex(b)}} ${toLatex(stmt.expr)} \\, d${stmt.variable} = ${formatNum(value)}`,
        raw: value
    }
}

function evalLimit(stmt: LimitStatement, scope: Record<string, unknown>): ValueResult {
    const c = parseLimit(stmt.approach, scope);
    const eps = 1e-8;

    let value: number;

    if (!isFinite(c)) {
        const large = c > 0 ? 1e10 : -1e10
        value = parseFloat(String(math.evaluate(stmt.expr, { ...scope, [stmt.variable]: large })))
    } else {
        const v1 = parseFloat(String(math.evaluate(stmt.expr, { ...scope, [stmt.variable]: c + eps })))
        const v2 = parseFloat(String(math.evaluate(stmt.expr, { ...scope, [stmt.variable]: c - eps })))
        value = (v1 + v2) / 2
    }

    const approachLatex = stmt.approach.toLowerCase() === 'inf' ||
                          stmt.approach.toLowerCase() === 'infinity' ||
                          c === Infinity ? '\\infty' :
                          c === -Infinity ? '-\\infty' : stmt.approach;
    return {
        type: 'value',
        latex: `\\lim_{${stmt.variable} \\to ${approachLatex}} ${toLatex(stmt.expr)} = ${formatNum(value)}`,
        raw: value
    }
}

function formatNum(val: unknown): string {
    if(typeof val === 'number'){
        if(!isFinite(val)) return val > 0 ? '\\infty' : '-\\infty';
        return String(Math.round(val * 1e10) / 1e10);
    }

    return String(val);
}

function toLatex(expr: string): string {
  return expr
    .replace(/(\w+)\s*\*\s*(\w+)/g, '$1 \\cdot $2')
    .replace(/\bpi\b/g, '\\pi')
    .replace(/\bsin\b/g, '\\sin')
    .replace(/\bcos\b/g, '\\cos')
    .replace(/\btan\b/g, '\\tan')
    .replace(/\bsqrt\(([^)]+)\)/g, '\\sqrt{$1}')
}

function parseLimit(val: string, scope: Record<string, unknown>): number {
  const trimmed = val.trim().toLowerCase()
  if (trimmed === 'inf' || trimmed === 'infinity' || trimmed === '∞') return Infinity
  if (trimmed === '-inf' || trimmed === '-infinity' || trimmed === '-∞') return -Infinity
  return parseFloat(String(math.evaluate(val, scope)))
}

function numToLatex(n: number): string {
  if (n === Infinity) return '\\infty'
  if (n === -Infinity) return '-\\infty'
  return String(n)
}