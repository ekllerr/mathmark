import { create } from "zustand";

const STORAGE_KEY = 'mathmark:document';

interface EditorStore{
    content: string,
    saved: boolean, // false when the browser refuses storage, e.g. some private modes
    setContent: (content: string) => void;
}

function load(): string {
    try { return localStorage.getItem(STORAGE_KEY) ?? '' }
    catch { return '' }
}

function save(content: string): boolean {
    try {
        localStorage.setItem(STORAGE_KEY, content);
        return true;
    }
    catch { return false }
}

// the document is written to localStorage on every change, so closing the tab loses nothing
const useEditorStore = create<EditorStore>(set => ({
    content: load(),
    saved: true,
    setContent: (content) => set({content: content, saved: save(content)})
}));

export default useEditorStore;
