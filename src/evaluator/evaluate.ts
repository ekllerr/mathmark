import * as math from 'mathjs'
import { parseStatements } from '@/parser/dslParser'
import type { Statement, AssignmentStatement, FunctionStatement, DerivativeStatement, IntegralStatement, LimitStatement, ExpressionStatement, SumStatement, SolveStatement } from '@/parser/dslParser'
import { integrate, limit, toReal, type RealFunction } from './numeric'
import { formatNum, nodeToLatex, numToLatex, toLatex } from './latex'
import { exactExpression, exactSeries, recognise } from './exact'
import { findRoots, solvePolynomial } from './solve'


export type EvalResultType = 'value' | 'plot' | 'error';

export interface ValueResult{
    type: 'value',
    exprLatex: string,
    resultLatex: string, // what follows the expression, e.g. "= 0.5"
    stepLatex?: string, // the expression with its variables and functions written out, e.g. "2 \cdot 3"
    exactLatex?: string, // the same in exact form, e.g. "= \frac{1}{2} = 0.5", when one is known
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
                    results.push(evalExpression(stmt, ctx));
                    break;
                }

                case 'sum':
                case 'product': {
                    results.push(evalSeries(stmt, ctx.scope));
                    break;
                }

                case 'solve': {
                    results.push(evalSolve(stmt, ctx));
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
  const exact = typeof val === 'number' ? exactExpression(stmt.value, ctx.scope, val) : null
  const scopeBefore = { ...ctx.scope } // a = a + 1 substitutes the old value of a
  ctx.scope[stmt.name] = val
  delete ctx.fnDefs[stmt.name]

  return {
    type: 'value',
    exprLatex: `${toLatex(stmt.name)} = ${nodeToLatex(node)}`,
    // a plain number is already its own result: avoid "a = 2 = 2"
    ...(isLiteral(node) ? { resultLatex: '' } : resultLatex(val, exact, nodeToLatex(node))),
    stepLatex: typeof val === 'number' ? substitution(node, scopeBefore, ctx.fnDefs) : undefined,
    raw: val,
  }
}

// The working a student would write between an expression and its value: user-defined functions written out
// and variables replaced by their numbers, so a*b becomes 2 \cdot 3. Undefined when there is nothing to substitute.
function substitution(node: math.MathNode, scope: Scope, fnDefs: Context['fnDefs']): string | undefined {
  try {
    const written = writeOut(node, scope, fnDefs, 0)
    if(isLiteral(written)) return undefined

    const latex = nodeToLatex(written)
    return latex === nodeToLatex(node) ? undefined : latex
  }
  catch { return undefined }
}

function writeOut(node: math.MathNode, scope: Scope, fnDefs: Context['fnDefs'], depth: number): math.MathNode {
  if(depth > 20) throw new Error('function definitions are too deeply nested')

  return node.transform(n => {
    if(math.isFunctionNode(n)){
      const def = fnDefs[n.fn.name]
      if(!def || def.params.length !== n.args.length) return n

      // the body with each parameter replaced by its argument; a parameter hides a variable of the same name
      const args = n.args.map(arg => writeOut(arg, scope, fnDefs, depth))
      const local = { ...scope }
      for(const param of def.params) delete local[param]

      return writeOut(def.body, local, fnDefs, depth + 1).transform(m =>
        math.isSymbolNode(m) && def.params.includes(m.name) ? args[def.params.indexOf(m.name)] : m
      )
    }

    if(!math.isSymbolNode(n) || n.name in math) return n

    const value = scope[n.name]
    if(typeof value !== 'number' || !isFinite(value)) return n

    // mathjs adds the brackets an operator needs, but not the ones a negative number needs
    const constant = new math.ConstantNode(Math.round(value * 1e10) / 1e10)
    return value < 0 ? new math.ParenthesisNode(constant) : constant
  })
}

// "= 0.5" for decimal display, and "= \frac{1}{2} = 0.5" for exact display when an exact form is known
// (`written` is the expression as the author wrote it: repeating it as its own exact form says nothing)
function resultLatex(val: unknown, exact: string | null, written = ''): Pick<ValueResult, 'resultLatex' | 'exactLatex'> {
  const decimal = formatNum(val)
  if(exact === null || typeof val !== 'number') return { resultLatex: `= ${decimal}` }

  // the decimal is shown to 10 places: it equals the value only if nothing was rounded away
  const scaled = val * 1e10
  const isExactDecimal = Math.abs(val) < 1e5 && Math.abs(scaled - Math.round(scaled)) < 1e-4
  const sign = isExactDecimal ? '=' : '\\approx'
  const repeats = exact.replace(/\s/g, '') === written.replace(/\s/g, '')
  return { resultLatex: `= ${decimal}`, exactLatex: repeats ? `${sign} ${decimal}` : `= ${exact} ${sign} ${decimal}` }
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
    const variables = stmt.variables;
    if(/^diff\s*\(/.test(stmt.expr))
        throw new Error('could not read the inner diff: write nested derivatives as diff(x) diff(y) expr');

    const expr = inlineFunctions(math.parse(stmt.expr), ctx.fnDefs);

    // d becomes ∂ when the expression depends on anything besides the one variable being differentiated
    const partial = new Set(variables).size > 1 || freeSymbols(expr, ctx.scope).some(name => !variables.includes(name));
    const operatorLatex = `${derivativeOperator(variables, partial)}\\left(${toLatex(stmt.expr)}\\right)`;

    // diff(x) diff(y) f differentiates by y first: apply from the innermost outwards
    const derivative = [...variables].reverse().reduce((node, v) => math.derivative(node, v), expr);

    if(stmt.at === null)
        return {
            type: 'value',
            exprLatex: operatorLatex,
            resultLatex: `= ${nodeToLatex(derivative)}`,
            raw: derivative.toString(),
        }

    if(new Set(variables).size > 1)
        throw new Error('a point can only be given for a derivative in one variable');

    const v = variables[0];
    const at = parseBound(stmt.at, ctx.scope);
    const value = toReal(derivative.evaluate({ ...ctx.scope, [v]: at }));

    return {
        type: 'value',
        exprLatex: `\\left.${operatorLatex}\\right|_{${v}=${boundLatex(stmt.at, at)}}`,
        ...resultLatex(value, recognise(value)),
        raw: value,
    }
}

// d/dx, d²/dx², ∂³/∂x²∂y: consecutive repeats of a variable are written as a power
function derivativeOperator(variables: string[], partial: boolean): string {
    const d = partial ? '\\partial ' : 'd';
    const order = variables.length;
    const groups: [string, number][] = [];

    for(const v of variables){
        const last = groups[groups.length - 1];
        if(last && last[0] === v) last[1]++;
        else groups.push([v, 1]);
    }

    const below = groups.map(([v, n]) => `${d}${v}${n > 1 ? `^{${n}}` : ''}`).join(' ');
    return `\\frac{${d}${order > 1 ? `^{${order}}` : ''}}{${below}}`;
}

// the names in an expression that stand for unknowns: not functions, not constants such as pi, not defined variables
function freeSymbols(node: math.MathNode, scope: Scope): string[] {
    const names = new Set<string>();

    node.traverse((n, path, parent) => {
        if(!math.isSymbolNode(n)) return;
        if(parent && math.isFunctionNode(parent) && path === 'fn') return;
        if(n.name in math || n.name in scope) return;
        names.add(n.name);
    });

    return [...names];
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

function evalExpression(stmt: ExpressionStatement, { scope, fnDefs }: Context): ValueResult {
    const node = math.parse(stmt.expr);
    const exprLatex = nodeToLatex(node);

    try{
        const val = node.evaluate(scope);
        const exact = typeof val === 'number' ? exactExpression(stmt.expr, scope, val) : null;

        return {
            type: 'value',
            exprLatex,
            ...resultLatex(val, exact, exprLatex),
            stepLatex: typeof val === 'number' ? substitution(node, scope, fnDefs) : undefined,
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
        exprLatex: `\\int_{${boundLatex(stmt.from, a)}}^{${boundLatex(stmt.to, b)}} ${toLatex(stmt.expr)} \\, d${stmt.variable}`,
        ...resultLatex(value, recognise(value, true)),
        raw: value
    }
}

function evalLimit(stmt: LimitStatement, scope: Scope): ValueResult {
    const c = parseBound(stmt.approach, scope);
    if(stmt.side && !isFinite(c)) throw new Error('a one-sided limit needs a finite point');

    const value = limit(realFunction(stmt.expr, scope, stmt.variable), c, stmt.side);
    const sideLatex = stmt.side === 'left' ? '^{-}' : stmt.side === 'right' ? '^{+}' : '';

    return {
        type: 'value',
        exprLatex: `\\lim_{${stmt.variable} \\to ${boundLatex(stmt.approach, c)}${sideLatex}} ${toLatex(stmt.expr)}`,
        ...resultLatex(value, recognise(value, true)),
        raw: value
    }
}

const MAX_TERMS = 100000;

// sum(i, a, b) expr and prod(i, a, b) expr
function evalSeries(stmt: SumStatement, scope: Scope): ValueResult{
    const product = stmt.type === 'product';
    const name = product ? 'product' : 'sum';

    const from = Math.round(parseBound(stmt.from, scope));
    const to = Math.round(parseBound(stmt.to, scope));

    if(!isFinite(from) || !isFinite(to))
        throw new Error(`${name} needs finite bounds: infinite ${product ? 'products' : 'series'} are not supported`);
    if(to - from >= MAX_TERMS)
        throw new Error(`${name} is limited to ${MAX_TERMS} terms`);

    const term = realFunction(stmt.expr, scope, stmt.variable);
    let value = product ? 1 : 0;

    for(let i = from; i <= to; i++){
        value = product ? value * term(i) : value + term(i);
    }

    const exact = exactSeries(stmt.expr, scope, stmt.variable, from, to, product, value) ?? recognise(value, true);

    return {
        type: 'value',
        exprLatex:  `\\${product ? 'prod' : 'sum'}_{${stmt.variable}=${from}}^{${to}} ${toLatex(stmt.expr)}`,
        ...resultLatex(value, exact),
        raw: value
    }
}

const SEARCH_RANGE: [number, number] = [-100, 100];
const MAX_SHOWN_ROOTS = 10;

function evalSolve(stmt: SolveStatement, ctx: Context): ValueResult {
    const left = math.parse(stmt.left);
    const right = math.parse(stmt.right);
    const difference = inlineFunctions(new math.OperatorNode('-', 'subtract', [left, right]), ctx.fnDefs);
    const v = stmt.variable ?? unknownOf(difference, ctx.scope);

    const compiled = difference.compile();
    const f: RealFunction = x => toReal(compiled.evaluate({ ...ctx.scope, [v]: x }));

    let roots: number[] | 'all';
    let formula: string | null = null;
    let searched: [number, number] | null = null;

    const polynomial = stmt.range ? null : toPolynomial(difference, ctx.scope, v);

    if(polynomial){
        const solved = solvePolynomial(polynomial.coefficients);
        formula = solved.exact;
        // a root of the numerator does not count where the denominator vanishes too, as in (x^2 - 1)/(x - 1) = 0
        roots = solved.roots === 'all' ? 'all' : solved.roots.filter(root => polynomial.defined(root));
        if(roots !== 'all' && roots.length !== solved.roots.length) formula = null;
    }
    else {
        searched = stmt.range ? [parseBound(stmt.range[0], ctx.scope), parseBound(stmt.range[1], ctx.scope)] : SEARCH_RANGE;
        if(!isFinite(searched[0]) || !isFinite(searched[1]) || searched[0] >= searched[1])
            throw new Error('the search range must be two finite numbers, smaller first');

        roots = findRoots(f, searched[0], searched[1]);
    }

    const equationLatex = `${nodeToLatex(left)} = ${nodeToLatex(right)}`;
    const answer = (latex: string) => `\\;\\Rightarrow\\; ${latex}`;

    if(roots === 'all')
        return { type: 'value', exprLatex: equationLatex, resultLatex: answer(`\\text{true for every } ${v}`), raw: 'all' };

    if(roots.length === 0){
        const none = searched
            ? `\\text{no solutions for } ${formatNum(searched[0])} \\le ${v} \\le ${formatNum(searched[1])}`
            : '\\text{no real solutions}';
        return { type: 'value', exprLatex: equationLatex, resultLatex: answer(none), raw: '' };
    }

    // a periodic equation has many roots in the window: show the ones nearest zero
    const shown = [...roots].sort((p, q) => Math.abs(p) - Math.abs(q)).slice(0, MAX_SHOWN_ROOTS).sort((p, q) => p - q);
    const list = (items: string[]) => {
        if(items.length === 1) return `${v} = ${items[0]}`;
        return `${v} \\in \\left\\{${items.join(',\\; ')}${roots.length > shown.length ? ',\\; \\dots' : ''}\\right\\}`;
    };

    // roots from the search are numerical, so only the cautious recognition is applied to them
    const exactRoots = shown.map(root => recognise(root, searched !== null || polynomial!.coefficients.length > 3));
    const exactLatex = formula ? answer(`${v} = ${formula}`)
        : exactRoots.some(Boolean) ? answer(list(shown.map((root, i) => exactRoots[i] ?? formatNum(root))))
        : undefined;

    return {
        type: 'value',
        exprLatex: equationLatex,
        resultLatex: answer(list(shown.map(formatNum))),
        exactLatex,
        raw: roots.join(', '),
    }
}

// the variable to solve for when the equation does not say
function unknownOf(node: math.MathNode, scope: Scope): string {
    const unknowns = freeSymbols(node, scope);

    if(unknowns.length === 1) return unknowns[0];
    if(unknowns.length === 0) throw new Error('nothing to solve for: name the variable, e.g. solve(x^2 = 4, x)');
    throw new Error(`several unknowns (${unknowns.join(', ')}): give the others a value, or name the one to solve for`);
}

// what math.rationalize returns in detailed mode (its published type leaves out the fraction parts)
interface RationalForm{
    numerator: math.MathNode,
    denominator: math.MathNode | null,
    variables: string[],
    coefficients: math.MathType[]
}

interface Polynomial{
    coefficients: number[], // lowest power first
    defined: (x: number) => boolean // false where the original expression divides by zero
}

// the equation as a polynomial in v, or null if it is not one
function toPolynomial(node: math.MathNode, scope: Scope, v: string): Polynomial | null {
    const numbers: Record<string, number> = {};
    for(const [name, value] of Object.entries(scope))
        if(typeof value === 'number' && isFinite(value) && name !== v) numbers[name] = value;

    let rational: RationalForm;
    try { rational = math.rationalize(node, numbers, true) as unknown as RationalForm }
    catch { return null } // not a polynomial: a function call, a fractional power, ...

    const others = rational.variables.filter(name => name !== v);
    if(others.length > 0) throw new Error(`${others.join(', ')} ${others.length > 1 ? 'have' : 'has'} no value`);

    const denominator = rational.denominator ? rational.denominator.compile() : null;
    const defined = (x: number) => denominator === null || Math.abs(toReal(denominator.evaluate({ [v]: x }))) > 1e-9;

    // with the variable cancelled out, what is left is a constant: 0 = 0 or a contradiction
    if(rational.variables.length === 0) return { coefficients: [toReal(rational.numerator.evaluate())], defined };

    return { coefficients: rational.coefficients.map(Number), defined };
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
