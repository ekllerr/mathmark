import { create } from "zustand";

export type Tab = 'editor' | 'split' | 'preview';
export const tabs = ['editor', 'split', 'preview'];

interface UIStore{
    tab: Tab,
    setTab: (tab: Tab) => void;
}


const useUIStore = create<UIStore>(set => ({
    tab: 'split',
    setTab: (tab) => set({tab: tab})
}));

export default useUIStore;