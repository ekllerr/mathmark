const HASH_PREFIX = '#doc=';
const MAX_BYTES = 2_000_000; // a share link never legitimately expands past this

// runs bytes through a (de)compression stream, refusing output that grows unreasonably large
async function transform(bytes: Uint8Array<ArrayBuffer>, stream: CompressionStream | DecompressionStream): Promise<Uint8Array<ArrayBuffer>> {
  const reader = new Blob([bytes]).stream().pipeThrough(stream).getReader()
  const chunks: Uint8Array[] = []
  let total = 0

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    total += value.length
    if (total > MAX_BYTES) {
      await reader.cancel()
      throw new Error('document is too large')
    }
    chunks.push(value)
  }

  const result = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.length
  }
  return result
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(encoded: string): Uint8Array<ArrayBuffer> {
  const binary = atob(encoded.replace(/-/g, '+').replace(/_/g, '/'))
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

export async function encodeDocument(text: string): Promise<string> {
  return toBase64Url(await transform(new TextEncoder().encode(text), new CompressionStream('deflate-raw')))
}

export async function decodeDocument(encoded: string): Promise<string> {
  const bytes = await transform(fromBase64Url(encoded), new DecompressionStream('deflate-raw'))
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
}

// the document travels after the #, which browsers never send to the server
export async function createShareUrl(text: string): Promise<string> {
  return `${location.origin}${location.pathname}${HASH_PREFIX}${await encodeDocument(text)}`
}

// the encoded document carried by the current URL, if any
export function readSharedHash(): string | null {
  return location.hash.startsWith(HASH_PREFIX) ? location.hash.slice(HASH_PREFIX.length) : null
}

export function clearSharedHash() {
  history.replaceState(null, '', location.pathname + location.search)
}
