import { findClosing, splitTopLevel } from "./brackets";

export interface AssignmentStatement{
    type: 'assignment',
    name: string,
    value: string,
    raw: string
}

export interface PlotStatement{
    type: 'plot',
    fns: string[],
    range: [string, string] | null, //the x-range to show first, written a..b
    raw: string
}

export interface IntegralStatement{
    type: 'integral',
    from: string,
    to: string,
    expr: string,
    variable: string,
    raw: string
}

export interface LimitStatement{
    type: 'limit',
    variable: string,
    approach: string,
    side: 'left' | 'right' | null, //x->c- and x->c+, null for the two-sided limit
    expr: string,
    raw: string
}

export interface ExpressionStatement{
    type: 'expression',
    expr: string,
    raw: string
}

export interface SumStatement{
    type: 'sum' | 'product',
    variable: string,
    from: string,
    to: string,
    expr: string,
    raw: string
}

export interface FunctionStatement{
    type: 'function',
    name: string,
    params: string[],
    body: string,
    raw: string
}

export interface DerivativeStatement{
    type: 'derivative',
    variables: string[], //one entry per differentiation, in the order they are written: [x, x, y] is d³/dx²dy
    at: string | null, //point to evaluate at, null for the symbolic derivative
    expr: string,
    raw: string
}

export interface SolveStatement{
    type: 'solve',
    left: string,
    right: string,
    variable: string | null, //null: work it out from the equation
    range: [string, string] | null, //where to search, null for the default
    raw: string
}

export type Statement =
    | AssignmentStatement
    | FunctionStatement
    | DerivativeStatement
    | PlotStatement
    | IntegralStatement
    | LimitStatement
    | ExpressionStatement
    | SumStatement
    | SolveStatement

export function parseStatements(inner: string): Statement[]{
   return splitTopLevel(inner).map(parseStatement);
}

const IDENTIFIER = /^[a-zA-Z_]\w*$/;
const VARIABLE = /^[a-z]$/;

interface Call{
    name: string,
    args: string[],
    rest: string //whatever follows the closing parenthesis
}

// reads a leading `name(arg, ...)`; the arguments may themselves contain brackets and commas
function readCall(raw: string): Call | null {
    const head = raw.match(/^([a-zA-Z_]\w*)\(/);
    if(!head) return null;

    const open = head[0].length - 1;
    const close = findClosing(raw, open);
    if(close === -1) return null;

    return {
        name: head[1],
        args: splitTopLevel(raw.slice(open + 1, close)),
        rest: raw.slice(close + 1).trim()
    }
}

function parseStatement(raw: string): Statement{
    const assignMatch = raw.match(/^([a-zA-Z_]\w*)\s*=(?!=)\s*([\s\S]+)$/);
    if(assignMatch)
        return {type: 'assignment', name: assignMatch[1], value: assignMatch[2].trim(), raw}

    const call = readCall(raw);
    if(call)
        return parseCall(call, raw) ?? {type: 'expression', expr: raw, raw}

    return {type: 'expression', expr: raw, raw}
}

// the DSL forms that start with `name(...)`; null means it is an ordinary expression
function parseCall({ name, args, rest }: Call, raw: string): Statement | null {
    const definition = rest.match(/^=(?!=)\s*([\s\S]+)$/);
    if(definition && args.length > 0 && args.every(arg => IDENTIFIER.test(arg)))
        return {type: 'function', name, params: args, body: definition[1].trim(), raw}

    if(name === 'plot' && rest === '' && args.length > 0){
        // plot(sin(x), cos(x), -pi..pi): an argument of the form a..b sets the x-range
        const range = args.map(arg => arg.match(/^(.+?)\.\.(.+)$/)).find(Boolean);
        const fns = args.filter(arg => !/^(.+?)\.\.(.+)$/.test(arg));

        if(fns.length > 0)
            return {type: 'plot', fns, range: range ? [range[1].trim(), range[2].trim()] : null, raw}
    }

    if(name === 'diff' && rest && (args.length === 1 || args.length === 2))
        return parseDerivative(args, rest, raw);

    if(name === 'solve' && rest === '' && args.length >= 1 && args.length <= 4)
        return parseSolve(args, raw);

    if(name === 'int' && args.length === 2){
        const body = rest.match(/^([\s\S]+?)\s+d([a-z])$/);
        if(body)
            return {type: 'integral', from: args[0], to: args[1], expr: body[1].trim(), variable: body[2], raw}
    }

    if(name === 'lim' && rest && args.length === 1){
        const approach = args[0].match(/^([a-z])\s*->\s*([\s\S]+)$/);
        if(approach){
            // a trailing + or - (optionally written ^+) asks for a one-sided limit
            const sided = approach[2].trim().match(/^([\s\S]*[^\s^])\s*\^?\s*([+-])$/);

            return {
                type: 'limit',
                variable: approach[1],
                approach: sided ? sided[1].trim() : approach[2].trim(),
                side: sided ? (sided[2] === '+' ? 'right' : 'left') : null,
                expr: rest,
                raw
            }
        }
    }

    if((name === 'sum' || name === 'prod') && rest && args.length === 3 && VARIABLE.test(args[0]))
        return {type: name === 'sum' ? 'sum' : 'product', variable: args[0], from: args[1], to: args[2], expr: rest, raw}

    return null;
}

// `x` or `x^2`: the variable repeated once per order of differentiation
function derivativeVariables(arg: string): string[] | null {
    const match = arg.match(/^([a-z])(?:\s*\^\s*([1-9]))?$/);
    return match ? Array<string>(Number(match[2] ?? 1)).fill(match[1]) : null;
}

// diff(x) expr, diff(x^2) expr, diff(x, a) expr, and nested forms such as diff(x) diff(y) expr
function parseDerivative(args: string[], rest: string, raw: string): Statement | null {
    const variables = derivativeVariables(args[0]);
    if(!variables) return null;

    let expr = rest;

    for(let inner = readCall(expr); inner && inner.name === 'diff' && inner.rest && inner.args.length === 1; inner = readCall(expr)){
        const more = derivativeVariables(inner.args[0]);
        if(!more) break;

        variables.push(...more);
        expr = inner.rest;
    }

    return {type: 'derivative', variables, at: args[1] ?? null, expr, raw}
}

// solve(equation), solve(equation, x), solve(equation, from, to), solve(equation, x, from, to)
function parseSolve(args: string[], raw: string): Statement | null {
    const named = args.length === 2 || args.length === 4;
    if(named && !IDENTIFIER.test(args[1])) return null;

    const equation = args[0];
    const equals = findEquals(equation);
    const width = equation[equals + 1] === '=' ? 2 : 1;

    return {
        type: 'solve',
        left: equals === -1 ? equation : equation.slice(0, equals).trim(),
        right: equals === -1 ? '0' : equation.slice(equals + width).trim(),
        variable: named ? args[1] : null,
        range: args.length >= 3 ? [args[args.length - 2], args[args.length - 1]] : null,
        raw
    }
}

// index of the = (or ==) that separates the two sides of an equation, ignoring <=, >= and !=
function findEquals(text: string): number {
    let depth = 0;

    for(let i = 0; i < text.length; i++){
        if('([{'.includes(text[i])) depth++;
        else if(')]}'.includes(text[i])) depth--;
        else if(text[i] === '=' && depth === 0 && !'<>!'.includes(text[i - 1] ?? ' ')) return i;
    }

    return -1;
}
