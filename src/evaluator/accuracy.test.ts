import { describe, expect, it } from 'vitest'
import { evaluateBlock, type EvalResult } from './evaluate'
import { integrate } from './numeric'
import { parseStatements } from '@/parser/dslParser'
import { tameAsymptotes } from '@/utils/asymptotes'

const last = (source: string): EvalResult => evaluateBlock(parseStatements(source)).at(-1)!

describe('finite integrals', () => {
  it('is accurate at a singular endpoint', () => {
    expect(integrate(Math.sqrt, 0, 1)).toBeCloseTo(2 / 3, 10)
    expect(integrate(x => 1 / Math.sqrt(x), 0, 1)).toBeCloseTo(2, 9)
    expect(integrate(Math.log, 0, 1)).toBeCloseTo(-1, 10)
    expect(integrate(x => Math.sqrt(1 - x * x), -1, 1)).toBeCloseTo(Math.PI / 2, 10)
  })

  it('is accurate for smooth integrands and for corners', () => {
    expect(integrate(Math.sin, 0, Math.PI)).toBeCloseTo(2, 11)
    expect(integrate(Math.exp, 0, 1)).toBeCloseTo(Math.E - 1, 11)
    expect(integrate(Math.abs, -1, 2)).toBeCloseTo(2.5, 9)
    expect(integrate(x => Math.abs(x - 0.3), 0, 1)).toBeCloseTo(0.29, 9)
    expect(integrate(x => Math.sin(20 * x), 0, Math.PI)).toBeCloseTo(0, 9)
  })

  it('handles reversed and empty ranges', () => {
    expect(integrate(x => x * x, 1, 0)).toBeCloseTo(-1 / 3, 10)
    expect(integrate(x => x * x, 2, 2)).toBe(0)
  })

  it('is undefined where the integrand has no real value', () => {
    expect(integrate(Math.sqrt, -1, 1)).toBeNaN()
  })

  it('refuses a divergent integral', () => {
    expect(() => integrate(x => 1 / x, 0, 1)).toThrow(/does not converge/)
    expect(() => integrate(x => 1 / x, -1, 1)).toThrow(/does not converge/)
  })

  it('now recognises the exact value', () => {
    expect(last('int(0, 1) sqrt(x) dx')).toMatchObject({ exactLatex: expect.stringContaining('\\frac{2}{3}') })
  })
})

describe('plots', () => {
  it('reads an x-range written a..b', () => {
    expect(parseStatements('plot(sin(x), cos(x), -pi..pi)')[0]).toMatchObject({ type: 'plot', fns: ['sin(x)', 'cos(x)'], range: ['-pi', 'pi'] })
    expect(parseStatements('plot(x^2)')[0]).toMatchObject({ range: null })
    expect(parseStatements('plot(x, 0.5..1.5)')[0]).toMatchObject({ range: ['0.5', '1.5'] })
  })

  it('evaluates the range and rejects a bad one', () => {
    expect(last('a = 2, plot(x^2, 0..a)')).toMatchObject({ type: 'plot', range: [0, 2] })
    expect(last('plot(x^2)')).toMatchObject({ type: 'plot', range: null })
    expect(last('plot(x^2, 3..1)')).toMatchObject({ type: 'error' })
  })

  it('leaves ordinary curves to autoscale', () => {
    const xs = Array.from({ length: 800 }, (_, i) => -10 + i / 40)
    expect(tameAsymptotes([xs.map(Math.sin)])).toBeNull()
    expect(tameAsymptotes([xs.map(x => x * x)])).toBeNull()
  })

  it('clips and splits a curve with asymptotes', () => {
    const xs = Array.from({ length: 800 }, (_, i) => -10 + i / 40 + 0.001)
    const ys: (number | null)[] = xs.map(Math.tan)
    const range = tameAsymptotes([ys])!

    expect(range[0]).toBeGreaterThan(-100)
    expect(range[1]).toBeLessThan(100)
    // every branch is cut from the next: there are as many gaps as asymptotes in view
    expect(ys.filter(y => y === null).length).toBeGreaterThanOrEqual(6)
  })
})

describe('letters are variables, not units', () => {
  it('keeps a formula with undefined letters as a formula', () => {
    expect(last('m * g')).toMatchObject({ type: 'value', resultLatex: '' })
    expect(last('a = 2, a + b')).toMatchObject({ type: 'value', resultLatex: '' })
  })

  it('reports an undefined letter in an assignment', () => {
    expect(last('F = m * a')).toMatchObject({ type: 'error', message: 'Undefined symbol m' })
  })

  it('still evaluates once the letters have values', () => {
    expect(last('m = 2, g = 9.81, m * g')).toMatchObject({ raw: 19.62 })
  })

  it('still understands longer unit names', () => {
    const sine = last('sin(30 deg)')
    expect(sine.type === 'value' && sine.raw).toBeCloseTo(0.5, 12)
  })
})
