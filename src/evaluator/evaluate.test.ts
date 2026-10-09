import { describe, expect, it } from 'vitest'
import { createDocumentEvaluator, evaluateBlock, realFunction, type EvalResult } from './evaluate'
import { resultToLatex } from './latex'
import { parseStatements } from '@/parser/dslParser'

const run = (source: string): EvalResult[] => evaluateBlock(parseStatements(source))
const last = (source: string): EvalResult => run(source).at(-1)!

// the numeric value of the last statement
function value(source: string): unknown {
  const result = last(source)
  if (result.type !== 'value') throw new Error(`expected a value, got ${JSON.stringify(result)}`)
  return result.raw
}

function error(source: string): string {
  const result = last(source)
  if (result.type !== 'error') throw new Error(`expected an error, got ${JSON.stringify(result)}`)
  return result.message
}

// what the reader sees with results, exact form and steps switched on
function shown(source: string): string {
  const result = last(source)
  if (result.type !== 'value') throw new Error(`expected a value, got ${JSON.stringify(result)}`)
  return resultToLatex(result, true, true, true).replace(/\s+/g, ' ').trim()
}

describe('expressions and variables', () => {
  it('evaluates statements left to right with shared variables', () => {
    expect(value('a = 2, b = 3, a * b + 1')).toBe(7)
    expect(value('a = 2, a = a + 1, a')).toBe(3)
  })

  it('knows the DSL functions', () => {
    expect(value('ln(e)')).toBeCloseTo(1)
    expect(value('lg(100)')).toBeCloseTo(2)
    expect(value('C(5, 2)')).toBe(10)
    expect(value('P(5, 2)')).toBe(20)
    expect(value('5!')).toBe(120)
  })

  it('treats == as a comparison', () => {
    expect(value('a = 2, a == 2')).toBe(true)
    expect(value('a = 2, a == 3')).toBe(false)
  })

  it('shows a formula with undefined variables without a value', () => {
    const result = last('p^2 + q^2')
    expect(result).toMatchObject({ type: 'value', resultLatex: '' })
  })

  it('reports syntax errors, unknown functions and invalid arguments', () => {
    expect(error('1 + ')).toMatch(/Unexpected end of expression/)
    expect(error('sn(2)')).toMatch(/Undefined function sn/)
    expect(error('C(2, 5)')).toMatch(/k must be less than or equal to n/)
  })

  it('keeps complex results complex', () => {
    expect(shown('sqrt(-4)')).toContain('2i')
    expect(shown('e^(i*pi)')).toMatch(/= -1$/)
  })

  it('handles matrices now that brackets are not split', () => {
    expect(value('det([1, 2; 3, 4])')).toBeCloseTo(-2)
    expect(value('mean([1, 2, 3, 4])')).toBe(2.5)
  })
})

describe('functions', () => {
  it('defines and calls functions', () => {
    expect(value('f(x) = x^2 + 1, f(3)')).toBe(10)
    expect(value('g(x, y) = x * y, g(2, 5)')).toBe(10)
  })

  it('lets a function see variables and other functions', () => {
    expect(value('k = 2, f(x) = k * x^2, f(3)')).toBe(18)
    expect(value('f(x) = x^2, g(x) = f(x) + f(2*x), g(1)')).toBe(5)
  })

  it('checks the number of arguments', () => {
    expect(error('f(x) = x, f(1, 2)')).toMatch(/f expects 1 argument/)
  })

  it('lets a name be reused as a variable', () => {
    expect(value('f(x) = x, f = 5, f + 1')).toBe(6)
  })
})

describe('derivatives', () => {
  it('differentiates symbolically', () => {
    expect(value('diff(x) x^3')).toBe('3 * x ^ 2')
    expect(value('diff(x^2) x^4')).toBe('12 * x ^ 2')
    expect(value('diff(x) diff(y) x^2 * y^3')).toBe('6 * y ^ 2 * x')
  })

  it('sees through user functions, ln and lg', () => {
    expect(value('f(x) = ln(x) * x, diff(x) f(x)')).toBe('log(x) + 1')
  })

  it('evaluates at a point', () => {
    expect(value('diff(x, 2) x^3')).toBe(12)
    expect(value('diff(x^2, 1) x^4')).toBe(12)
  })

  it('writes partial derivatives with the partial sign', () => {
    expect(shown('diff(y) x^2 * y')).toContain('\\partial')
    expect(shown('a = 3, diff(x) a * x^2')).not.toContain('\\partial')
  })

  it('rejects what it cannot do', () => {
    expect(error('diff(x) C(x, 2)')).toMatch(/not supported/)
    expect(error('diff(x) diff(y, 2) x*y')).toMatch(/inner diff/)
    expect(error('f(x) = f(x) + 1, diff(x) f(x)')).toMatch(/too deeply nested/)
  })
})

describe('integrals', () => {
  it('integrates over a finite range', () => {
    expect(value('int(0, 1) x^2 dx')).toBeCloseTo(1 / 3, 9)
    expect(value('int(0, pi) sin(x) dx')).toBeCloseTo(2, 9)
    expect(value('f(x) = x^2, int(0, 3) f(x) dx')).toBeCloseTo(9, 9)
  })

  it('integrates over an infinite range', () => {
    expect(value('int(0, inf) e^(-x) dx')).toBeCloseTo(1, 9)
    expect(value('int(-inf, inf) e^(-x^2) dx')).toBeCloseTo(Math.sqrt(Math.PI), 9)
    expect(value('int(inf, 0) e^(-x) dx')).toBeCloseTo(-1, 9)
  })

  it('refuses a divergent integral', () => {
    expect(error('int(1, inf) 1/x dx')).toMatch(/does not converge/)
  })

  it('draws bounds as written', () => {
    expect(shown('int(0, sqrt(2)) x dx')).toContain('\\int_{0}^{\\sqrt{2}}')
  })
})

describe('limits', () => {
  it('finds ordinary and removable limits', () => {
    expect(value('lim(x->0) sin(x)/x')).toBeCloseTo(1, 9)
    expect(value('lim(x->0) (1-cos(x))/x^2')).toBeCloseTo(0.5, 9)
    expect(value('lim(x->2) (x^2-4)/(x-2)')).toBeCloseTo(4, 9)
  })

  it('finds limits at infinity', () => {
    expect(value('lim(x->inf) (1+1/x)^x')).toBeCloseTo(Math.E, 9)
    expect(value('lim(x->-inf) x^3')).toBe(-Infinity)
    expect(value('lim(x->inf) sqrt(x^2+x) - x')).toBeCloseTo(0.5, 6)
  })

  it('finds infinite and one-sided-domain limits', () => {
    expect(value('lim(x->0) 1/x^2')).toBe(Infinity)
    expect(value('lim(x->0) ln(x)')).toBe(-Infinity)
    expect(value('lim(x->0) sqrt(x)')).toBeCloseTo(0, 6)
  })

  it('says when the two sides disagree', () => {
    expect(error('lim(x->0) 1/x')).toMatch(/-∞ from the left and ∞ from the right/)
    expect(error('lim(x->0) abs(x)/x')).toMatch(/-1 from the left and 1 from the right/)
    expect(error('lim(x->0) sin(1/x)')).toMatch(/does not exist/)
  })

  it('takes one-sided limits', () => {
    expect(value('lim(x->0+) 1/x')).toBe(Infinity)
    expect(value('lim(x->0-) 1/x')).toBe(-Infinity)
    expect(value('lim(x->0-) abs(x)/x')).toBeCloseTo(-1)
  })
})

describe('sums and products', () => {
  it('adds and multiplies', () => {
    expect(value('sum(i, 1, 10) i^2')).toBe(385)
    expect(value('prod(i, 1, 5) i')).toBe(120)
    expect(value('sum(i, 5, 1) i')).toBe(0)
    expect(value('prod(k, 1, 0) k')).toBe(1)
  })

  it('refuses infinite and oversized ranges instead of hanging', () => {
    expect(error('sum(i, 1, inf) 1/i^2')).toMatch(/finite bounds/)
    expect(error('sum(i, 1, 1000000000) i')).toMatch(/limited to 100000 terms/)
  })
})

describe('solve', () => {
  const roots = (source: string) => String(value(source)).split(', ').filter(Boolean).map(Number)

  it('solves linear and quadratic equations', () => {
    expect(roots('solve(2x + 3 = 7)')).toEqual([2])
    expect(roots('solve(x^2 = 4)')).toEqual([-2, 2])
    expect(roots('solve(x^2 + 2x + 1 = 0)')).toEqual([-1])
    expect(roots('solve(x^2 + 1 = 0)')).toEqual([])
  })

  it('gives the quadratic formula in exact form', () => {
    expect(shown('solve(x^2 - x - 1 = 0)')).toContain('\\frac{1 \\pm \\sqrt{5}}{2}')
  })

  it('finds every real root of a higher polynomial', () => {
    const found = roots('solve(x^3 - 6x^2 + 11x - 6 = 0)')
    expect(found).toHaveLength(3)
    found.forEach((root, i) => expect(root).toBeCloseTo(i + 1, 9))
  })

  it('searches a range for other equations', () => {
    const found = roots('solve(sin(x) = 1/2, 0, 2*pi)')
    expect(found[0]).toBeCloseTo(Math.PI / 6, 9)
    expect(found[1]).toBeCloseTo(5 * Math.PI / 6, 9)
    expect(shown('solve(e^x = 10)')).toContain('\\ln 10')
  })

  it('finds roots where the curve only touches zero', () => {
    const found = roots('solve(cos(x) = 1, -7, 7)')
    expect(found).toHaveLength(3)
    expect(found[2]).toBeCloseTo(2 * Math.PI, 6)
  })

  it('does not report poles or cancelled factors as roots', () => {
    expect(roots('solve(1/x = 0)')).toEqual([])
    expect(roots('solve((x^2 - 1)/(x - 1) = 0)')).toEqual([-1])
  })

  it('works out the unknown, or asks for it', () => {
    expect(roots('a = 3, solve(a*x = 12)')).toEqual([4])
    expect(roots('x = 5, solve(x^2 = 9, x)')).toEqual([-3, 3])
    expect(error('solve(x + y = 2)')).toMatch(/several unknowns/)
    expect(error('solve(3 = 3)')).toMatch(/nothing to solve for/)
  })
})

describe('exact results', () => {
  it('does fraction arithmetic exactly', () => {
    expect(shown('1/3 + 1/6')).toContain('\\frac{1}{2}')
    expect(shown('0.1 + 0.2')).toContain('\\frac{3}{10}')
    expect(shown('sum(i, 1, 10) 1/i')).toContain('\\frac{7381}{2520}')
  })

  it('recognises roots and constants', () => {
    expect(shown('sqrt(8)')).toContain('2\\sqrt{2}')
    expect(shown('sin(pi/3)')).toContain('\\frac{\\sqrt{3}}{2}')
    expect(shown('atan(1)')).toContain('\\frac{\\pi}{4}')
    expect(shown('int(1, 2) 1/x dx')).toContain('\\ln 2')
  })

  it('leaves whole numbers and unrecognised values as decimals', () => {
    expect(last('2 + 3')).not.toHaveProperty('exactLatex')
    expect(last('sqrt(2) + 1')).not.toHaveProperty('exactLatex')
    expect(last('0.123456789')).not.toHaveProperty('exactLatex')
  })

  it('does not repeat an expression as its own exact form', () => {
    expect(shown('pi/4')).toBe('\\frac{\\pi}{4} \\approx 0.7853981634')
  })
})

describe('steps', () => {
  it('substitutes variables', () => {
    expect(shown('a = 2, b = 3, a * b')).toBe('a\\cdot b = 2\\cdot3 = 6')
  })

  it('brackets negative values', () => {
    expect(shown('x = -5, x^2')).toContain('{\\left(-5\\right)}^{2}')
  })

  it('writes out user functions', () => {
    expect(shown('f(x) = x^2 + 1, f(3)')).toBe('f\\left(3\\right) = {3}^{2}+1 = 10')
  })

  it('uses the old value when a variable is reassigned', () => {
    expect(shown('a = 2, a = a + 1')).toContain('2+1')
  })
})

describe('document evaluation', () => {
  it('carries variables and functions from one block to the next', () => {
    const evaluate = createDocumentEvaluator()
    const results = evaluate(['a = 2, f(x) = a * x', 'f(3)'])

    expect(results[1][0]).toMatchObject({ type: 'value', raw: 6 })
  })

  it('reuses the results of blocks before the first change', () => {
    const evaluate = createDocumentEvaluator()
    const first = evaluate(['a = 2', 'a + 1', 'a + 2'])
    const second = evaluate(['a = 2', 'a + 1', 'a + 3'])

    expect(second[0]).toBe(first[0])
    expect(second[1]).toBe(first[1])
    expect(second[2]).not.toBe(first[2])
    expect(second[2][0]).toMatchObject({ raw: 5 })
  })

  it('gives a plot the values at its place in the document', () => {
    const evaluate = createDocumentEvaluator()
    const results = evaluate(['a = 2, f(x) = a * x', 'plot(f(x))', 'a = 10'])
    const plot = results[1][0]

    if (plot.type !== 'plot') throw new Error('expected a plot')
    expect(realFunction(plot.fns[0], plot.scope, 'x')(3)).toBe(6)
  })
})
