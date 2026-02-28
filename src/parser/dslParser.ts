export interface AssignmentStatement{
    type: 'assigment',
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

export type Statement =
    | AssignmentStatement
    | PlotStatement
    | IntegralStatement
    | LimitStatement
    | ExpressionStatement;

export function parseStatements(inner: string): Statement[]{
   return splitStatements(inner)
    .map(s => s.trim())
    .filter(Boolean)
    .map(parseStatement);
}

function parseStatement(raw: string): Statement{
    const assingReg = /^([a-zA-Z_]\w*)\s*=\s*(.+)$/;
    const plotReg = /^plot\((.+)\)$/;
    const integralReg = /^int\(([^,]+),([^)]+)\)\s+(.+?)\s+d([a-z])$/;
    const limitReg = /^lim\(([a-z])->([^)]+)\)\s+(.+)$/;

    const assignMatch = raw.match(assingReg);
    if(assignMatch)
        return {type: 'assigment', name: assignMatch[1], value: assignMatch[2].trim(), raw}

    const plotMatch = raw.match(plotReg);
    if(plotMatch)
        return {type: 'plot', fns: plotMatch[1].split(',').map(s => s.trim()), raw}

    const intMatch = raw.match(integralReg);
    if(intMatch)
        return {
            type: 'integral',
            from: intMatch[1].trim(),
            to: intMatch[2].trim(),
            expr: intMatch[3].trim(),
            variable: intMatch[4],
            raw
        }

    const limMatch = raw.match(limitReg)
    if(limMatch)
        return {
            type: 'limit',
            variable: limMatch[1],
            approach: limMatch[2].trim(),
            expr: limMatch[3].trim(),
            raw
        }

    return {type: 'expression', expr: raw, raw}
}

function splitStatements(inner: string):  string[]{
    const statements: string[] = [];
    let depth = 0;
    let current = '';

    for(const char of inner){
        if(char === '(') depth++;
        else if(char === ')') depth--;
        else if(char === ',' && depth === 0){
            statements.push(current.trim())
            current = '';
            continue;
        }

        current += char;
    }

    if(current.trim()) statements.push(current.trim());
    return statements;
}