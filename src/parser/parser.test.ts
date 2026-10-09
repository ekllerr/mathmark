import { describe, expect, it } from 'vitest'
import { parseBlocks } from './blockParser'
import { splitTopLevel, splitTopLevelParts } from './brackets'
import { parseStatements } from './dslParser'

const inner = (text: string) => parseBlocks(text).map(block => block.inner)

describe('parseBlocks', () => {
  it('finds blocks and their positions', () => {
    const text = 'a ${ x = 1 } b'
    const [block] = parseBlocks(text)

    expect(block.inner).toBe('x = 1')
    expect(text.slice(block.start, block.end)).toBe('${ x = 1 }')
  })

  it('finds several blocks, including ones that span lines', () => {
    expect(inner('${ a = 1,\n b = 2 }${a}')).toEqual(['a = 1,\n b = 2', 'a'])
  })

  it('ignores a block that is never closed', () => {
    expect(inner('unclosed ${ a = 1')).toEqual([])
  })

  it('allows braces inside a block', () => {
    expect(inner('obj ${ {a: 1}.a } after')).toEqual(['{a: 1}.a'])
  })

  it('ends a block at its brace even when a parenthesis is left open', () => {
    expect(inner('bad ${ sin(x } next ${ b }')).toEqual(['sin(x', 'b'])
  })

  it('leaves markdown code alone', () => {
    expect(inner('inline `${ a = 1 }` then ${ b = 2 }')).toEqual(['b = 2'])
    expect(inner('fence\n```\n${ a = 1 }\n```\nthen ${ b = 2 }')).toEqual(['b = 2'])
    expect(inner('unclosed fence\n```\n${ a = 1 }')).toEqual([])
  })

  it('treats a stray backtick as ordinary text', () => {
    expect(inner('stray ` backtick ${ a = 1 }')).toEqual(['a = 1'])
  })
})

describe('splitTopLevel', () => {
  it('splits on commas outside brackets only', () => {
    expect(splitTopLevel('a = 1, f(1, 2), [3, 4], {x: 1, y: 2}')).toEqual(['a = 1', 'f(1, 2)', '[3, 4]', '{x: 1, y: 2}'])
  })

  it('keeps empty parts between commas but drops a trailing one', () => {
    expect(splitTopLevel('  x ,, y , ')).toEqual(['x', '', 'y'])
    expect(splitTopLevel('')).toEqual([])
  })

  it('reports where each part sits in the original text', () => {
    const text = '  a = 1 ,  f(1, 2)'
    for (const part of splitTopLevelParts(text)) expect(text.slice(part.start, part.end)).toBe(part.text)
  })
})

describe('parseStatements', () => {
  const one = (text: string) => parseStatements(text)[0]

  it('reads assignments, but not comparisons', () => {
    expect(one('a = 2')).toMatchObject({ type: 'assignment', name: 'a', value: '2' })
    expect(one('a == 2')).toMatchObject({ type: 'expression' })
  })

  it('reads function definitions', () => {
    expect(one('f(x, y) = x * y')).toMatchObject({ type: 'function', name: 'f', params: ['x', 'y'], body: 'x * y' })
    expect(one('f(2) == 4')).toMatchObject({ type: 'expression' })
  })

  it('reads plots with nested commas', () => {
    expect(one('plot(max(x, 0), sin(x))')).toMatchObject({ type: 'plot', fns: ['max(x, 0)', 'sin(x)'] })
  })

  it('reads integrals, including bounds with brackets', () => {
    expect(one('int(0, sqrt(2)) x^2 dx')).toMatchObject({ type: 'integral', from: '0', to: 'sqrt(2)', expr: 'x^2', variable: 'x' })
  })

  it('reads limits and their side', () => {
    expect(one('lim(x->0) sin(x)/x')).toMatchObject({ type: 'limit', variable: 'x', approach: '0', side: null })
    expect(one('lim(x->0+) 1/x')).toMatchObject({ approach: '0', side: 'right' })
    expect(one('lim(x -> 3 -) x')).toMatchObject({ approach: '3', side: 'left' })
    expect(one('lim(x->-inf) x')).toMatchObject({ approach: '-inf', side: null })
  })

  it('reads sums and products, and leaves the mathjs functions of the same name alone', () => {
    expect(one('sum(i, 1, 10) i^2')).toMatchObject({ type: 'sum', variable: 'i', from: '1', to: '10', expr: 'i^2' })
    expect(one('prod(i, 1, 5) i')).toMatchObject({ type: 'product' })
    expect(one('sum(1, 2, 3)')).toMatchObject({ type: 'expression' })
  })

  it('reads derivatives of any order and nesting', () => {
    expect(one('diff(x) x^3')).toMatchObject({ type: 'derivative', variables: ['x'], at: null, expr: 'x^3' })
    expect(one('diff(x^2) x^4')).toMatchObject({ variables: ['x', 'x'] })
    expect(one('diff(x, 2) x^3')).toMatchObject({ variables: ['x'], at: '2' })
    expect(one('diff(x) diff(y) x^2 * y^3')).toMatchObject({ variables: ['x', 'y'], expr: 'x^2 * y^3' })
  })

  it('reads the forms of solve', () => {
    expect(one('solve(x^2 = 4)')).toMatchObject({ type: 'solve', left: 'x^2', right: '4', variable: null, range: null })
    expect(one('solve(x^2 - 4)')).toMatchObject({ left: 'x^2 - 4', right: '0' })
    expect(one('solve(x == 2)')).toMatchObject({ left: 'x', right: '2' })
    expect(one('solve(a*t = 8, t)')).toMatchObject({ variable: 't' })
    expect(one('solve(sin(x) = 1/2, 0, 2*pi)')).toMatchObject({ variable: null, range: ['0', '2*pi'] })
    expect(one('solve(x^2 = 4, x, 0, 10)')).toMatchObject({ variable: 'x', range: ['0', '10'] })
  })
})
