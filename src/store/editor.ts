import { create } from "zustand";

interface EdiorStore{
    content: string,
    setContent: (content: string) => void;
}

const useEditorStore = create<EdiorStore>(set => ({
    content: '',
    setContent: (content) => set({content: content})
}));

export default useEditorStore;