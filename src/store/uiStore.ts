import { create } from "zustand";
import { applyTheme, toThemeId, type ThemeId } from "@/themes";

export type Tab = 'editor' | 'split' | 'preview';
export const tabs = ['editor', 'split', 'preview'];

interface UIStore{
    tab: Tab,
    setTab: (tab: Tab) => void;
    docsOpen: boolean;
    toggleDocs: () => void;
    sidebarOpen: boolean; // the list of documents
    toggleSidebar: () => void;
    exact: boolean; // show results as fractions and roots where possible, instead of decimals only
    toggleExact: () => void;
    steps: boolean; // show the values substituted into an expression before its result
    toggleSteps: () => void;
    theme: ThemeId;
    setTheme: (theme: ThemeId) => void;
}

// preferences are remembered between visits; a browser that refuses storage just forgets them
function load(key: string): string | null {
    try { return localStorage.getItem(`mathmark:${key}`) }
    catch { return null }
}

function save(key: string, value: string) {
    try { localStorage.setItem(`mathmark:${key}`, value) }
    catch { /* not remembered */ }
}

const initialTheme = toThemeId(load('theme'));
applyTheme(initialTheme);

const useUIStore = create<UIStore>(set => ({
    tab: 'split',
    setTab: (tab) => set({tab: tab}),
    docsOpen: false,
    toggleDocs: () => set(state => ({docsOpen: !state.docsOpen})),
    sidebarOpen: false,
    toggleSidebar: () => set(state => ({sidebarOpen: !state.sidebarOpen})),
    exact: load('exact') !== 'false',
    toggleExact: () => set(state => {
        save('exact', String(!state.exact));
        return {exact: !state.exact};
    }),
    steps: load('steps') !== 'false',
    toggleSteps: () => set(state => {
        save('steps', String(!state.steps));
        return {steps: !state.steps};
    }),
    theme: initialTheme,
    setTheme: (theme) => {
        save('theme', theme);
        applyTheme(theme);
        set({theme});
    }
}));

export default useUIStore;
