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
    const scope: Record<string, unknown> = {};
    const results: EvalResult[] = [];

    for(const stmt of statements){
        try{
            switch(stmt.type){
                case 'assigment': {
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
    const val = math.evaluate(stmt.value, scope);
    scope[stmt.name] = val;

    return {
        type: 'value',
        latex: `${stmt.name} = ${formatNum(val)}`,
        raw: val
    } 
}

function evalExpression(stmt: ExpressionStatement, scope: Record<string, unknown>): ValueResult {
    const val = math.evaluate(stmt.expr, scope);
    return {
        type: 'value',
        latex: `${stmt.expr} = ${formatNum(val)}`,
        raw: val
    }
}

function evalIntegral(stmt: IntegralStatement, scope: Record<string, unknown>): ValueResult {
    const a = parseFloat(String(math.evaluate(stmt.from, scope)));
    const b = parseFloat(String(math.evaluate(stmt.to, scope)));
    const n = 1000;
    const h = (b - a) / n;
    let sum = 0;

    for(let i = 0; i <= n; i++){
        const x = a + i * h;
        const v = parseFloat(String(math.evaluate(stmt.expr, {...scope, [stmt.variable]: x})));
        sum += ( i === 0 || i === n) ? v : (i % 2 === 0 ? 2 * v : 4 * v);
    }

    const value = (h / 3) * sum;
    return {
        type: 'value',
        latex: `\\int_{${a}}^{${b}} ${stmt.expr} \\, d${stmt.variable} = ${formatNum(value)}`,
        raw: value
    }
}

function evalLimit(stmt: LimitStatement, scope: Record<string, unknown>): ValueResult {
    const c = parseFloat(String(math.evaluate(stmt.approach, scope)));
    const eps = 1e-8;

    const v1 = parseFloat(String(math.evaluate(stmt.expr, {...scope, [stmt.variable]: c + eps})));
    const v2 = parseFloat(String(math.evaluate(stmt.expr, {...scope, [stmt.variable]: c - eps}))); 

    const value = (v1 + v2) / 2;
    const approachLatex = stmt.approach === 'Infinity' ? '\\infty' : stmt.approach;

    return {
        type: 'value',
        latex: `\\lim_{${stmt.variable} \\to ${approachLatex}} ${stmt.expr} = ${formatNum(value)}`,
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