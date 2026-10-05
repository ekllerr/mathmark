import * as math from 'mathjs'
import { parseStatements } from '@/parser/dslParser'
import type { Statement, AssignmentStatement, FunctionStatement, DerivativeStatement, IntegralStatement, LimitStatement, ExpressionStatement, SumStatement } from '@/parser/dslParser'
import { integrate, limit, toReal, type RealFunction } from './numeric'
import { formatNum, nodeToLatex, numToLatex, toLatex } from './latex'


export type EvalResultType = 'value' | 'plot' | 'error';

export interface ValueResult{
    type: 'value',
    exprLatex: string,
    resultLatex: string,
    raw: number | string
}

export interface PlotResult{
    type: 'plot',
    fns: string[]
    scope: Record<string, unknown>
}

export interface ErrorResult{
    type: 'error',
    message: string
}

export type EvalResult = ValueResult | PlotResult | ErrorResult;

type Scope = Record<string, unknown>;

interface FunctionDef{
    params: string[],
    body: math.MathNode,
    compiled: math.EvalFunction
}

// everything a statement can see: variables, and user-defined functions kept as syntax trees
// so that derivatives can see through them
export interface Context{
    scope: Scope,
    fnDefs: Record<string, FunctionDef>
}

export function createContext(): Context {
    return {
        scope: {
            inf: Infinity,
            infinity: Infinity,
            ln: (x: number) => Math.log(x),
            lg: (x: number) => Math.log10(x),
            C: math.combinations,
            P: math.permutations,
        },
        fnDefs: {},
    }
}

// an independent copy: later statements cannot change what the copy sees
export function cloneContext(ctx: Context): Context {
    const scope = { ...ctx.scope };
    const fnDefs = { ...ctx.fnDefs };

    for(const [name, def] of Object.entries(fnDefs)) scope[name] = bindFunction(name, def, scope);

    return { scope, fnDefs };
}

// a user-defined function reads other variables from `scope` at the moment it is called
function bindFunction(name: string, def: FunctionDef, scope: Scope) {
    return (...args: unknown[]) => {
        if(args.length !== def.params.length)
            throw new Error(`${name} expects ${def.params.length} argument(s)`);

        const local = { ...scope };
        def.params.forEach((param, i) => { local[param] = args[i] });
        return def.compiled.evaluate(local);
    }
}

// evaluates a whole document, block by block, with variables and functions carried from one block to the next.
// Blocks before the first edited one keep their previous result objects, so nothing downstream of them re-renders.
export function createDocumentEvaluator() {
    let cache: { source: string, results: EvalResult[], after: Context }[] = [];

    return (sources: string[]): EvalResult[][] => {
        let reused = 0;
        while(reused < sources.length && reused < cache.length && cache[reused].source === sources[reused]) reused++;

        const next = cache.slice(0, reused);
        let ctx = reused > 0 ? cloneContext(next[reused - 1].after) : createContext();

        for(const source of sources.slice(reused)){
            const results = evaluateBlock(parseStatements(source), ctx);
            next.push({ source, results, after: ctx });
            ctx = cloneContext(ctx);
        }

        cache = next;
        return next.map(entry => entry.results);
    }
}

export function evaluateBlock(statements: Statement[], ctx: Context = createContext()) : EvalResult[] {
    const results: EvalResult[] = [];

    for(const stmt of statements){
        try{
            switch(stmt.type){
                case 'assignment': {
                    results.push(evalAssignment(stmt, ctx));
                    break;
                }

                case 'function': {
                    results.push(evalFunction(stmt, ctx));
                    break;
                }

                case 'derivative': {
                    results.push(evalDerivative(stmt, ctx));
                    break;
                }

                case 'plot': {
                    results.push({type: 'plot', fns: stmt.fns, scope: cloneContext(ctx).scope});
                    break;
                }

                case 'integral': {
                    results.push(evalIntegral(stmt, ctx.scope));
                    break;
                }

                case 'limit': {
                    results.push(evalLimit(stmt, ctx.scope));
                    break;
                }

                case 'expression': {
                    results.push(evalExpression(stmt, ctx.scope));
                    break;
                }

                case 'sum':{
                    results.push(evalSum(stmt, ctx.scope));
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

function evalAssignment(stmt: AssignmentStatement, ctx: Context): ValueResult {
  const node = math.parse(stmt.value)
  const val = node.evaluate(ctx.scope)
  ctx.scope[stmt.name] = val
  delete ctx.fnDefs[stmt.name]

  return {
    type: 'value',
    exprLatex: `${toLatex(stmt.name)} = ${nodeToLatex(node)}`,
    // a plain number is already its own result: avoid "a = 2 = 2"
    resultLatex: isLiteral(node) ? '' : `= ${formatNum(val)}`,
    raw: val,
  }
}

function isLiteral(node: math.MathNode): boolean {
  if(math.isConstantNode(node)) return true
  return math.isOperatorNode(node) && node.fn === 'unaryMinus' && math.isConstantNode(node.args[0])
}

function evalFunction(stmt: FunctionStatement, ctx: Context): ValueResult {
    const definition = `${stmt.name}(${stmt.params.join(', ')}) = ${stmt.body}`;
    const body = math.parse(stmt.body);
    const def = { params: stmt.params, body, compiled: body.compile() };

    ctx.fnDefs[stmt.name] = def;
    ctx.scope[stmt.name] = bindFunction(stmt.name, def, ctx.scope);

    return {
        type: 'value',
        exprLatex: toLatex(definition),
        resultLatex: '',
        raw: definition,
    }
}

function evalDerivative(stmt: DerivativeStatement, ctx: Context): ValueResult {
    const v = stmt.variable;
    const derivative = math.derivative(inlineFunctions(math.parse(stmt.expr), ctx.fnDefs), v);
    const operatorLatex = `\\frac{d}{d${v}}\\left(${toLatex(stmt.expr)}\\right)`;

    if(stmt.at === null)
        return {
            type: 'value',
            exprLatex: operatorLatex,
            resultLatex: `= ${nodeToLatex(derivative)}`,
            raw: derivative.toString(),
        }

    const at = parseBound(stmt.at, ctx.scope);
    const value = toReal(derivative.evaluate({ ...ctx.scope, [v]: at }));

    return {
        type: 'value',
        exprLatex: `\\left.${operatorLatex}\\right|_{${v}=${boundLatex(stmt.at, at)}}`,
        resultLatex: `= ${formatNum(value)}`,
        raw: value,
    }
}

// rewrites DSL-only and user-defined functions into plain mathjs so math.derivative can handle them
function inlineFunctions(node: math.MathNode, fnDefs: Context['fnDefs'], depth = 0): math.MathNode {
    if(depth > 20) throw new Error('function definitions are too deeply nested');

    return node.transform(n => {
        if(n.type !== 'FunctionNode') return n;

        const { fn, args } = n as math.FunctionNode;
        const inlinedArgs = args.map(arg => inlineFunctions(arg, fnDefs, depth));

        if(fn.name === 'ln') return new math.FunctionNode('log', inlinedArgs);
        if(fn.name === 'lg') return new math.FunctionNode('log10', inlinedArgs);

        const def = fnDefs[fn.name];
        if(!def) return new math.FunctionNode(fn.name, inlinedArgs);
        if(def.params.length !== inlinedArgs.length)
            throw new Error(`${fn.name} expects ${def.params.length} argument(s)`);

        return new math.ParenthesisNode(
            inlineFunctions(def.body, fnDefs, depth + 1).transform(m => {
                const index = m.type === 'SymbolNode' ? def.params.indexOf((m as math.SymbolNode).name) : -1;
                return index === -1 ? m : new math.ParenthesisNode(inlinedArgs[index]);
            })
        );
    });
}

function evalExpression(stmt: ExpressionStatement, scope: Scope): ValueResult {
    const node = math.parse(stmt.expr);
    const exprLatex = nodeToLatex(node);

    try{
        const val = node.evaluate(scope);

        return {
            type: 'value',
            exprLatex,
            resultLatex: `= ${formatNum(val)}`,
            raw: val,
        }
    } catch(e) {
        // free variables are fine: the expression is shown as a formula with no value
        if(!(e instanceof Error) || !e.message.startsWith('Undefined symbol')) throw e;

        return {
            type: 'value',
            exprLatex,
            resultLatex: '',
            raw: stmt.expr,
        }
    }
}

// compiles expr once into a real function of one variable
export function realFunction(expr: string, scope: Scope, variable: string): RealFunction {
    const compiled = math.compile(expr);
    return x => toReal(compiled.evaluate({ ...scope, [variable]: x }));
}

function evalIntegral(stmt: IntegralStatement, scope: Scope): ValueResult {
    const a = parseBound(stmt.from, scope)
    const b = parseBound(stmt.to, scope);
    const value = integrate(realFunction(stmt.expr, scope, stmt.variable), a, b);

    return {
        type: 'value',
        exprLatex: `\\int_{${boundLatex(stmt.from, a)}}^{${boundLatex(stmt.to, b)}}${toLatex(stmt.expr)} \\, d${stmt.variable}`,
        resultLatex: `= ${formatNum(value)}`,
        raw: value
    }
}

function evalLimit(stmt: LimitStatement, scope: Scope): ValueResult {
    const c = parseBound(stmt.approach, scope);
    const value = limit(realFunction(stmt.expr, scope, stmt.variable), c);

    return {
        type: 'value',
        exprLatex: `\\lim_{${stmt.variable} \\to ${boundLatex(stmt.approach, c)}}${toLatex(stmt.expr)}`,
        resultLatex: `= ${formatNum(value)}`,
        raw: value
    }
}

const MAX_SUM_TERMS = 100000;

function evalSum(stmt: SumStatement, scope: Scope): ValueResult{

    const from = Math.round(parseBound(stmt.from, scope));
    const to = Math.round(parseBound(stmt.to, scope));

    if(!isFinite(from) || !isFinite(to))
        throw new Error('sum needs finite bounds: infinite series are not supported');
    if(to - from >= MAX_SUM_TERMS)
        throw new Error(`sum is limited to ${MAX_SUM_TERMS} terms`);

    const term = realFunction(stmt.expr, scope, stmt.variable);
    let value = 0;

    for(let i = from; i <= to; i++){
        value += term(i);
    }

    return {
        type: 'value',
        exprLatex:  `\\sum_{${stmt.variable}=${from}}^{${to}} ${toLatex(stmt.expr)}`,
        resultLatex: `= ${formatNum(value)}`,
        raw: value
    }
}

// a bound is drawn the way it was written, e.g. sqrt(2) rather than 1.4142...
function boundLatex(source: string, value: number): string {
    return isFinite(value) ? toLatex(source) : numToLatex(value);
}

// a bound of an integral, limit or sum: a real number or ±infinity
function parseBound(val: string, scope: Scope): number {
  const trimmed = val.trim().toLowerCase()
  if (trimmed === 'inf' || trimmed === 'infinity' || trimmed === '∞') return Infinity
  if (trimmed === '-inf' || trimmed === '-infinity' || trimmed === '-∞') return -Infinity

  const bound = toReal(math.evaluate(val, scope))
  if (isNaN(bound)) throw new Error(`"${val.trim()}" is not a real number`)
  return bound
}
