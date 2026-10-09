import { create } from "zustand";

const DOCUMENTS_KEY = 'mathmark:documents';
const CURRENT_KEY = 'mathmark:current';
const LEGACY_KEY = 'mathmark:document'; // the single document saved by earlier versions

// a deleted document waits this long in the trash before it is removed for good
const TRASH_DAYS = 30;

export interface NoteDocument{
    id: string,
    content: string,
    updated: number,
    deleted?: number // when it was moved to the trash
}

interface EditorStore{
    documents: NoteDocument[], // the notes in use, newest first
    trash: NoteDocument[],
    currentId: string,
    content: string, // the content of the current document
    saved: boolean, // false when the browser refuses storage, e.g. some private modes
    setContent: (content: string) => void;
    createDocument: (content?: string) => void;
    selectDocument: (id: string) => void;
    deleteDocument: (id: string) => void; // moves it to the trash
    restoreDocument: (id: string) => void;
    purgeDocument: (id: string) => void; // removes it from the trash for good
    importDocuments: (incoming: NoteDocument[]) => number; // returns how many were new
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

export function isDocument(value: unknown): value is NoteDocument {
    const doc = value as NoteDocument;
    return typeof doc === 'object' && doc !== null
        && typeof doc.id === 'string' && typeof doc.content === 'string' && typeof doc.updated === 'number'
        && (doc.deleted === undefined || typeof doc.deleted === 'number');
}

function load(): { all: NoteDocument[], currentId: string } {
    let all: NoteDocument[] = [];
    let currentId = '';

    try {
        const stored: unknown = JSON.parse(localStorage.getItem(DOCUMENTS_KEY) ?? 'null');

        if(Array.isArray(stored)) all = stored.filter(isDocument);
        else {
            const legacy = localStorage.getItem(LEGACY_KEY);
            if(legacy) all = [newDocument(legacy)];
        }

        currentId = localStorage.getItem(CURRENT_KEY) ?? '';
    }
    catch { /* unreadable storage: start empty */ }

    const expiry = Date.now() - TRASH_DAYS * 24 * 60 * 60 * 1000;
    return { all: all.filter(doc => doc.deleted === undefined || doc.deleted > expiry), currentId };
}

function save(all: NoteDocument[], currentId: string): boolean {
    try {
        localStorage.setItem(DOCUMENTS_KEY, JSON.stringify(all));
        localStorage.setItem(CURRENT_KEY, currentId);
        return true;
    }
    catch { return false }
}

// splits everything stored into notes and trash, making sure there is a note to write in and a valid current one
function arrange(all: NoteDocument[], currentId: string) {
    const trash = all.filter(doc => doc.deleted !== undefined).sort((a, b) => b.deleted! - a.deleted!);
    const documents = all.filter(doc => doc.deleted === undefined);

    if(documents.length === 0) documents.push(newDocument());
    const current = documents.find(doc => doc.id === currentId) ?? documents[0];

    return { documents, trash, currentId: current.id, content: current.content };
}

// every change is written to localStorage, so closing the tab loses nothing
const useEditorStore = create<EditorStore>((set, get) => {
    const commit = (all: NoteDocument[], currentId: string) => {
        const arranged = arrange(all, currentId);
        set({ ...arranged, saved: save([...arranged.documents, ...arranged.trash], arranged.currentId) });
    };

    const everything = () => [...get().documents, ...get().trash];

    const loaded = load();
    const initial = arrange(loaded.all, loaded.currentId);
    // settles a first visit, a note migrated from the old single-document format, or an emptied trash
    const saved = save([...initial.documents, ...initial.trash], initial.currentId);

    return {
        ...initial,
        saved,

        setContent: (content) => {
            const { currentId } = get();
            commit(everything().map(doc => doc.id === currentId ? { ...doc, content, updated: Date.now() } : doc), currentId);
        },

        createDocument: (content = '') => {
            const doc = newDocument(content);
            commit([doc, ...everything()], doc.id);
        },

        selectDocument: (id) => {
            if(get().documents.some(doc => doc.id === id)) commit(everything(), id);
        },

        deleteDocument: (id) => {
            const doc = get().documents.find(candidate => candidate.id === id);
            if(!doc) return;

            // a note nothing was written in is not worth keeping in the trash
            const rest = everything().filter(candidate => candidate.id !== id);
            commit(doc.content.trim() === '' ? rest : [...rest, { ...doc, deleted: Date.now() }], get().currentId);
        },

        restoreDocument: (id) => {
            const restored = everything().map(doc => {
                if(doc.id !== id) return doc;
                return { id: doc.id, content: doc.content, updated: doc.updated };
            });
            commit(restored, id);
        },

        purgeDocument: (id) => {
            commit(everything().filter(doc => !(doc.id === id && doc.deleted !== undefined)), get().currentId);
        },

        importDocuments: (incoming) => {
            const existing = everything();
            const known = new Set(existing.map(doc => doc.content));
            const fresh: NoteDocument[] = [];

            for(const doc of incoming){
                if(doc.content.trim() === '' || known.has(doc.content)) continue;
                known.add(doc.content);
                // a new id: the backup may come from this same browser, where the old id is still in use
                fresh.push({ id: crypto.randomUUID(), content: doc.content, updated: doc.updated });
            }

            if(fresh.length > 0) commit([...fresh, ...existing], fresh[0].id);
            return fresh.length;
        },
    }
});

export default useEditorStore;
