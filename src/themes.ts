// The colours of each theme live in index.css under [data-theme="<id>"]; this is only the list to choose from.
// `scheme` tells the browser and the plots whether the theme is dark or light.
export const THEMES = [
    { id: 'midnight', name: 'Midnight', scheme: 'dark' },
    { id: 'graphite', name: 'Graphite', scheme: 'dark' },
    { id: 'nord', name: 'Nord', scheme: 'dark' },
    { id: 'dusk', name: 'Dusk', scheme: 'dark' },
    { id: 'paper', name: 'Paper', scheme: 'light' },
    { id: 'sepia', name: 'Sepia', scheme: 'light' },
] as const;

export type ThemeId = typeof THEMES[number]['id'];

export const DEFAULT_THEME: ThemeId = 'midnight';

// printing and PDF export always use this one: paper is white
export const PRINT_THEME: ThemeId = 'paper';

// reads a saved preference, including the 'dark' / 'light' values of earlier versions
export function toThemeId(saved: string | null): ThemeId {
    if(saved === 'dark') return 'midnight';
    if(saved === 'light') return 'paper';
    return THEMES.find(theme => theme.id === saved)?.id ?? DEFAULT_THEME;
}

// themes can be applied to any element, not just the page: the theme picker previews each one this way
export function applyTheme(id: ThemeId, element: HTMLElement = document.documentElement) {
    element.dataset.theme = id;
    element.dataset.scheme = THEMES.find(theme => theme.id === id)!.scheme;
}
