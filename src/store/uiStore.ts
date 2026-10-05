import { create } from "zustand";

export type Tab = 'editor' | 'split' | 'preview';
export const tabs = ['editor', 'split', 'preview'];

export type Theme = 'dark' | 'light';

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
    theme: Theme;
    toggleTheme: () => void;
}

// preferences are remembered between visits; a browser that refuses storage just forgets them
function load(key: string, fallback: string): string {
    try { return localStorage.getItem(`mathmark:${key}`) ?? fallback }
    catch { return fallback }
}

function save(key: string, value: string) {
    try { localStorage.setItem(`mathmark:${key}`, value) }
    catch { /* not remembered */ }
}

export function applyTheme(theme: Theme) {
    document.documentElement.dataset.theme = theme;
}

const initialTheme: Theme = load('theme', 'dark') === 'light' ? 'light' : 'dark';
applyTheme(initialTheme);

const useUIStore = create<UIStore>(set => ({
    tab: 'split',
    setTab: (tab) => set({tab: tab}),
    docsOpen: false,
    toggleDocs: () => set(state => ({docsOpen: !state.docsOpen})),
    sidebarOpen: false,
    toggleSidebar: () => set(state => ({sidebarOpen: !state.sidebarOpen})),
    exact: load('exact', 'true') !== 'false',
    toggleExact: () => set(state => {
        save('exact', String(!state.exact));
        return {exact: !state.exact};
    }),
    steps: load('steps', 'true') !== 'false',
    toggleSteps: () => set(state => {
        save('steps', String(!state.steps));
        return {steps: !state.steps};
    }),
    theme: initialTheme,
    toggleTheme: () => set(state => {
        const theme: Theme = state.theme === 'dark' ? 'light' : 'dark';
        save('theme', theme);
        applyTheme(theme);
        return {theme};
    })
}));

export default useUIStore;
