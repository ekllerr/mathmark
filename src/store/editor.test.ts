import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createBackup, fileName, parseBackup } from '@/utils/files'

// a small stand-in for the browser's storage, so the store can be loaded with chosen contents
function stubStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial))

  vi.stubGlobal('localStorage', {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value) },
    removeItem: (key: string) => { data.delete(key) },
  })

  return data
}

async function loadStore(initial: Record<string, string> = {}) {
  const data = stubStorage(initial)
  vi.resetModules()
  const { default: store } = await import('./editor')
  return { store, data }
}

beforeEach(() => vi.unstubAllGlobals())

describe('documents', () => {
  it('starts with one empty note', async () => {
    const { store } = await loadStore()

    expect(store.getState().documents).toHaveLength(1)
    expect(store.getState().content).toBe('')
  })

  it('migrates the single note of earlier versions', async () => {
    const { store, data } = await loadStore({ 'mathmark:document': '# Old note' })

    expect(store.getState().content).toBe('# Old note')
    expect(JSON.parse(data.get('mathmark:documents')!)).toHaveLength(1)
  })

  it('saves every change and restores it on the next load', async () => {
    const first = await loadStore()
    first.store.getState().setContent('# Physics')
    first.store.getState().createDocument('# Algebra')

    const second = await loadStore(Object.fromEntries(first.data))
    expect(second.store.getState().documents.map(doc => doc.content)).toEqual(['# Algebra', '# Physics'])
    expect(second.store.getState().content).toBe('# Algebra')
  })

  it('switches between notes', async () => {
    const { store } = await loadStore()
    store.getState().setContent('one')
    const first = store.getState().currentId
    store.getState().createDocument('two')

    store.getState().selectDocument(first)
    expect(store.getState().content).toBe('one')
  })
})

describe('trash', () => {
  it('moves a deleted note to the trash and can bring it back', async () => {
    const { store } = await loadStore()
    store.getState().setContent('keep me')
    const id = store.getState().currentId
    store.getState().createDocument('other')

    store.getState().deleteDocument(id)
    expect(store.getState().documents.map(doc => doc.content)).toEqual(['other'])
    expect(store.getState().trash.map(doc => doc.content)).toEqual(['keep me'])

    store.getState().restoreDocument(id)
    expect(store.getState().trash).toEqual([])
    expect(store.getState().content).toBe('keep me')
  })

  it('always leaves a note to write in', async () => {
    const { store } = await loadStore()
    store.getState().setContent('only note')
    store.getState().deleteDocument(store.getState().currentId)

    expect(store.getState().documents).toHaveLength(1)
    expect(store.getState().content).toBe('')
    expect(store.getState().trash).toHaveLength(1)
  })

  it('does not keep empty notes in the trash', async () => {
    const { store } = await loadStore()
    store.getState().createDocument()
    store.getState().deleteDocument(store.getState().currentId)

    expect(store.getState().trash).toEqual([])
  })

  it('removes a note for good only from the trash', async () => {
    const { store } = await loadStore()
    store.getState().setContent('note')
    const id = store.getState().currentId

    store.getState().purgeDocument(id)
    expect(store.getState().content).toBe('note')

    store.getState().deleteDocument(id)
    store.getState().purgeDocument(id)
    expect(store.getState().trash).toEqual([])
  })

  it('empties notes that have been in the trash for over 30 days', async () => {
    const day = 24 * 60 * 60 * 1000
    const stored = [
      { id: 'a', content: 'current', updated: 1 },
      { id: 'b', content: 'recently deleted', updated: 1, deleted: Date.now() - 2 * day },
      { id: 'c', content: 'long gone', updated: 1, deleted: Date.now() - 31 * day },
    ]
    const { store } = await loadStore({ 'mathmark:documents': JSON.stringify(stored) })

    expect(store.getState().trash.map(doc => doc.content)).toEqual(['recently deleted'])
  })
})

describe('import and backup', () => {
  it('adds new notes and skips ones already present', async () => {
    const { store } = await loadStore()
    store.getState().setContent('already here')

    const added = store.getState().importDocuments([
      { id: 'x', content: 'already here', updated: 1 },
      { id: 'y', content: 'brand new', updated: 2 },
      { id: 'z', content: '   ', updated: 3 },
    ])

    expect(added).toBe(1)
    expect(store.getState().documents.map(doc => doc.content)).toEqual(['brand new', 'already here'])
    expect(store.getState().content).toBe('brand new')
  })

  it('round-trips a backup file', () => {
    const documents = [{ id: 'a', content: '# One', updated: 1 }, { id: 'b', content: '# Two', updated: 2 }]
    expect(parseBackup(createBackup(documents))).toEqual(documents)
  })

  it('rejects files that are not backups', () => {
    expect(() => parseBackup('not json')).toThrow(/not a Mathmark backup/)
    expect(() => parseBackup('{"documents": []}')).toThrow(/not a Mathmark backup/)
    expect(() => parseBackup('{"app": "mathmark", "version": 2, "documents": []}')).toThrow(/newer version/)
  })

  it('names files after the note', () => {
    expect(fileName('# Projectile motion\n\ntext', 'md')).toBe('projectile-motion.md')
    expect(fileName('', 'md')).toBe('untitled.md')
    expect(fileName('# Übung 3: ∑ & more!', 'md')).toBe('ubung-3-more.md')
  })
})
