import { describe, expect, it } from 'vitest'
import { paginate } from './pagination'

describe('paginate', () => {
  it('keeps a short document on one page', () => {
    expect(paginate([100, 200], 300, 1000)).toEqual([[0, 300]])
  })

  it('ends each page at the last break that fits', () => {
    expect(paginate([400, 900, 1300, 1800], 2000, 1000)).toEqual([[0, 900], [900, 1800], [1800, 2000]])
  })

  it('cuts through a block only when it is taller than a page', () => {
    expect(paginate([100, 2500], 2600, 1000)).toEqual([[0, 100], [100, 1100], [1100, 2100], [2100, 2600]])
  })

  it('copes with no breaks, duplicates and unsorted input', () => {
    expect(paginate([], 2500, 1000)).toEqual([[0, 1000], [1000, 2000], [2000, 2500]])
    expect(paginate([900, 400, 900, 0, 5000], 1500, 1000)).toEqual([[0, 900], [900, 1500]])
  })

  it('covers the whole document with no gaps or overlaps', () => {
    const breaks = Array.from({ length: 60 }, (_, i) => 37 + i * 173)
    const pages = paginate(breaks, 10500, 1011)

    expect(pages[0][0]).toBe(0)
    expect(pages.at(-1)![1]).toBe(10500)
    pages.forEach(([start, end], i) => {
      expect(end - start).toBeLessThanOrEqual(1011)
      expect(end).toBeGreaterThan(start)
      if (i > 0) expect(start).toBe(pages[i - 1][1])
    })
  })
})
