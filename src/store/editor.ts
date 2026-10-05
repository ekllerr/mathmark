import { create } from "zustand";

const DOCUMENTS_KEY = 'mathmark:documents';
const CURRENT_KEY = 'mathmark:current';
const LEGACY_KEY = 'mathmark:document'; // the single document saved by earlier versions

export interface NoteDocument{
    id: string,
    content: string,
    updated: number
}

interface EditorStore{
    documents: NoteDocument[],
    currentId: string,
    content: string, // the content of the current document
    saved: boolean, // false when the browser refuses storage, e.g. some private modes
    setContent: (content: string) => void;
    createDocument: (content?: string) => void;
    selectDocument: (id: string) => void;
    deleteDocument: (id: string) => void;
}

function newDocument(content = ''): NoteDocument {
    return { id: crypto.randomUUID(), content, updated: Date.now() };
}

// a document is named after its first line of text, the way a notes app does it
export function documentTitle(content: string): string {
    const line = content.split('\n').map(l => l.replace(/^#+\s*/, '').trim()).find(l => l !== '');
    if(!line) return 'Untitled';
    return line.length > 40 ? `${line.slice(0, 40)}…` : line;
}

function isDocument(value: unknown): value is NoteDocument {
    const doc = value as NoteDocument;
    return typeof doc === 'object' && doc !== null
        && typeof doc.id === 'string' && typeof doc.content === 'string' && typeof doc.updated === 'number';
}

function load(): { documents: NoteDocument[], currentId: string } {
    let documents: NoteDocument[] = [];
    let currentId = '';

    try {
        const stored: unknown = JSON.parse(localStorage.getItem(DOCUMENTS_KEY) ?? 'null');

        if(Array.isArray(stored)) documents = stored.filter(isDocument);
        else {
            const legacy = localStorage.getItem(LEGACY_KEY);
            if(legacy) documents = [newDocument(legacy)];
        }

        currentId = localStorage.getItem(CURRENT_KEY) ?? '';
    }
    catch { /* unreadable storage: start empty */ }

    if(documents.length === 0) documents = [newDocument()];
    if(!documents.some(doc => doc.id === currentId)) currentId = documents[0].id;

    return { documents, currentId };
}

function save(documents: NoteDocument[], currentId: string): boolean {
    try {
        localStorage.setItem(DOCUMENTS_KEY, JSON.stringify(documents));
        localStorage.setItem(CURRENT_KEY, currentId);
        return true;
    }
    catch { return false }
}

const initial = load();
save(initial.documents, initial.currentId); // settles a first visit, or a note migrated from the old single-document format

// every change is written to localStorage, so closing the tab loses nothing
const useEditorStore = create<EditorStore>((set, get) => {
    const commit = (documents: NoteDocument[], currentId: string) => set({
        documents,
        currentId,
        content: documents.find(doc => doc.id === currentId)!.content,
        saved: save(documents, currentId),
    });

    return {
        documents: initial.documents,
        currentId: initial.currentId,
        content: initial.documents.find(doc => doc.id === initial.currentId)!.content,
        saved: true,

        setContent: (content) => {
            const { documents, currentId } = get();
            commit(documents.map(doc => doc.id === currentId ? { ...doc, content, updated: Date.now() } : doc), currentId);
        },

        createDocument: (content = '') => {
            const doc = newDocument(content);
            commit([doc, ...get().documents], doc.id);
        },

        selectDocument: (id) => {
            const { documents } = get();
            if(documents.some(doc => doc.id === id)) commit(documents, id);
        },

        deleteDocument: (id) => {
            const { documents, currentId } = get();
            const remaining = documents.filter(doc => doc.id !== id);

            // there is always one document to write in
            if(remaining.length === 0) remaining.push(newDocument());
            commit(remaining, remaining.some(doc => doc.id === currentId) ? currentId : remaining[0].id);
        },
    }
});

export default useEditorStore;
