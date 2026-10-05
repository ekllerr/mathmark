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
    expr: string,
    raw: string
}

export interface ExpressionStatement{
    type: 'expression',
    expr: string,
    raw: string
}

export interface SumStatement{
    type: 'sum',
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
    variable: string,
    at: string | null, //point to evaluate at, null for the symbolic derivative
    expr: string,
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

    if(name === 'plot' && rest === '' && args.length > 0)
        return {type: 'plot', fns: args, raw}

    if(name === 'diff' && rest && (args.length === 1 || args.length === 2) && VARIABLE.test(args[0]))
        return {type: 'derivative', variable: args[0], at: args[1] ?? null, expr: rest, raw}

    if(name === 'int' && args.length === 2){
        const body = rest.match(/^([\s\S]+?)\s+d([a-z])$/);
        if(body)
            return {type: 'integral', from: args[0], to: args[1], expr: body[1].trim(), variable: body[2], raw}
    }

    if(name === 'lim' && rest && args.length === 1){
        const approach = args[0].match(/^([a-z])\s*->\s*([\s\S]+)$/);
        if(approach)
            return {type: 'limit', variable: approach[1], approach: approach[2].trim(), expr: rest, raw}
    }

    if(name === 'sum' && rest && args.length === 3 && VARIABLE.test(args[0]))
        return {type: 'sum', variable: args[0], from: args[1], to: args[2], expr: rest, raw}

    return null;
}
