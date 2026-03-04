import { create } from "zustand";

export type Tab = 'editor' | 'split' | 'preview';
export const tabs = ['editor', 'split', 'preview'];

interface UIStore{
    tab: Tab,
    setTab: (tab: Tab) => void;
    docsOpen: boolean;
    toggleDocs: () => void;    
}


const useUIStore = create<UIStore>(set => ({
    tab: 'split',
    setTab: (tab) => set({tab: tab}),
    docsOpen: false,
    toggleDocs: () => set(state => ({docsOpen: !state.docsOpen}))
}));

export default useUIStore;