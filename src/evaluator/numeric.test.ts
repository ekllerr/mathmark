import { describe, expect, it } from 'vitest'
import { recognise, toFraction } from './exact'
import { integrate, limit, toReal } from './numeric'
import { findRoots, solvePolynomial } from './solve'
import * as math from 'mathjs'

describe('toReal', () => {
  it('passes numbers through and rejects non-real values', () => {
    expect(toReal(2.5)).toBe(2.5)
    expect(toReal(math.complex(3, 0))).toBe(3)
    expect(toReal(math.complex(1, 2))).toBeNaN()
    expect(toReal('2')).toBeNaN()
  })
})

describe('integrate', () => {
  it('handles finite and infinite ranges', () => {
    expect(integrate(x => x * x, 0, 3)).toBeCloseTo(9, 9)
    expect(integrate(x => 1 / (1 + x * x), -Infinity, Infinity)).toBeCloseTo(Math.PI, 9)
    expect(integrate(x => Math.exp(-x) / Math.sqrt(x), 0, Infinity)).toBeCloseTo(Math.sqrt(Math.PI), 8)
  })

  it('throws for a divergent or oscillating tail', () => {
    expect(() => integrate(() => 1, 0, Infinity)).toThrow(/does not converge/)
    expect(() => integrate(x => Math.sin(x) / x, 0, Infinity)).toThrow(/does not converge/)
  })
})

describe('limit', () => {
  it('extrapolates through cancellation', () => {
    expect(limit(x => (Math.exp(x) - 1) / x, 0)).toBeCloseTo(1, 10)
    expect(limit(x => (x * x - 1e6) / (x - 1000), 1000)).toBeCloseTo(2000, 6)
  })

  it('respects the requested side', () => {
    expect(limit(x => Math.abs(x) / x, 0, 'right')).toBeCloseTo(1)
    expect(limit(x => Math.abs(x) / x, 0, 'left')).toBeCloseTo(-1)
    expect(() => limit(x => Math.abs(x) / x, 0)).toThrow(/from the left/)
  })
})

describe('findRoots and solvePolynomial', () => {
  it('finds crossings and rejects poles', () => {
    const roots = findRoots(x => Math.tan(x) - 1, 0, 4)
    expect(roots).toHaveLength(2)
    expect(roots[0]).toBeCloseTo(Math.PI / 4, 9)
  })

  it('solves polynomials by degree', () => {
    expect(solvePolynomial([0, 0, 0]).roots).toBe('all')
    expect(solvePolynomial([3]).roots).toEqual([])
    expect(solvePolynomial([-4, 2]).roots).toEqual([2])
    expect(solvePolynomial([-4, 0, 1]).roots).toEqual([-2, 2])
    expect(solvePolynomial([-3, -4, 2]).exact).toBe('\\frac{2 \\pm \\sqrt{10}}{2}')
  })
})

describe('recognise', () => {
  it('finds fractions by continued fractions', () => {
    expect(toFraction(0.75, 100, 1e-12)).toEqual([3, 4])
    expect(toFraction(-1 / 3, 100, 1e-12)).toEqual([-1, 3])
    expect(toFraction(Math.PI, 100, 1e-12)).toBeNull()
  })

  it('names roots and constants', () => {
    expect(recognise(Math.sqrt(50))).toBe('5\\sqrt{2}')
    expect(recognise(-Math.PI / 2)).toBe('-\\frac{\\pi}{2}')
    expect(recognise(2 * Math.E)).toBe('2e')
  })

  it('returns nothing for whole numbers and unknown values', () => {
    expect(recognise(4)).toBeNull()
    expect(recognise(0.123456789)).toBeNull()
  })

  it('is stricter with values from numerical methods', () => {
    expect(recognise(20 / 91)).toBe('\\frac{20}{91}')
    expect(recognise(123 / 457, true)).toBeNull()
  })
})
