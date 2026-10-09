import { describe, expect, it } from 'vitest'
import { decodeDocument, encodeDocument } from './share'

describe('share links', () => {
  it('round-trips a document, including non-ASCII text', async () => {
    const text = '# Notes\n\nünïcödé ∑ 🎉\n\n${ a = 2, f(x) = a * x^2 }\n'
    expect(await decodeDocument(await encodeDocument(text))).toBe(text)
  })

  it('produces only URL-safe characters', async () => {
    expect(await encodeDocument('a'.repeat(500) + '+/=?&#')).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it('compresses repetitive text', async () => {
    const text = 'The integral ${ int(0, 1) x^2 dx } again. '.repeat(50)
    expect((await encodeDocument(text)).length).toBeLessThan(text.length / 5)
  })

  it('rejects damaged or truncated data', async () => {
    const encoded = await encodeDocument('hello world, a longer text')

    await expect(decodeDocument('!!!notbase64')).rejects.toThrow()
    await expect(decodeDocument(encoded.slice(0, 12))).rejects.toThrow()
  })

  it('refuses a document that expands beyond the size limit', async () => {
    // three megabytes of one letter compress to a short link, which must not be allowed to unpack
    const encoded = await encodeDocument('a'.repeat(3_000_000))
    await expect(decodeDocument(encoded)).rejects.toThrow(/too large/)
  })
})
