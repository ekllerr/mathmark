import { documentTitle, isDocument, type NoteDocument } from "@/store/editor";

// a safe file name from a document's title: "Projectile motion" -> "projectile-motion"
export function fileName(content: string, extension: string): string {
  const slug = documentTitle(content)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // the accents split off by NFKD: ü -> u
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)

  return `${slug || 'notes'}.${extension}`
}

export function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  URL.revokeObjectURL(url)
}

// asks the user for a file and reads it as text; null if they cancel
export function pickTextFile(accept: string): Promise<{ name: string, text: string } | null> {
  return new Promise(resolve => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept

    input.onchange = async () => {
      const file = input.files?.[0]
      resolve(file ? { name: file.name, text: await file.text() } : null)
    }
    input.oncancel = () => resolve(null)
    input.click()
  })
}

interface Backup{
  app: 'mathmark',
  version: 1,
  exported: string,
  documents: NoteDocument[]
}

// every note in one file, for moving to another browser or keeping a copy
export function createBackup(documents: NoteDocument[]): string {
  const backup: Backup = { app: 'mathmark', version: 1, exported: new Date().toISOString(), documents }
  return JSON.stringify(backup, null, 2)
}

// the documents in a backup file; throws with a readable message if it is not one
export function parseBackup(text: string): NoteDocument[] {
  let data: unknown
  try { data = JSON.parse(text) }
  catch { throw new Error('This file is not a Mathmark backup.') }

  const backup = data as Partial<Backup>
  if (typeof backup !== 'object' || backup === null || backup.app !== 'mathmark' || !Array.isArray(backup.documents))
    throw new Error('This file is not a Mathmark backup.')
  if (backup.version !== 1)
    throw new Error('This backup was made by a newer version of Mathmark.')

  return backup.documents.filter(isDocument).filter(doc => doc.deleted === undefined)
}
