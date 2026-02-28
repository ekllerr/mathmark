import useUIStore, { tabs, type Tab } from "@/store/uiStore"

export default function Header() {

    const setTab = useUIStore(state => state.setTab);
    
    const tab = useUIStore(state => state.tab);
    
  return (
    <header className="flex items-center gap-4 px-6 h-13 border-b border-border bg-surface shrink-0">
          <div className="flex items-baseline gap-2">
            <span className="font-serif text-[22px] text-accent leading-none">∑</span>
            <span className="font-serif font-medium text-[18px] tracking-tight text-white">Mathmark</span>
            <span className="text-[10px] text-muted tracking-widest uppercase">Math Editor</span>
          </div>
          <nav className="flex flex-1 justify-center">
            <div className="flex gap-1 bg-bg border border-border rounded-lg p-0.75">
              {tabs.map(t => (
                <button key={t} onClick={() => setTab(t as Tab)} className={`font-mono text-[11px] tracking-widest uppercase px-3.5 py-1.25 rounded-md cursor-pointer transition-colors
      ${tab === t ? 'bg-border text-accent' : 'text-muted hover:text-text'}`}>
                  {t}
                </button>
              ))}
            </div>
          </nav>
          <a
            className="flex items-center gap-1.5 text-[11px] text-muted tracking-wide no-underline hover:text-accent transition-colors"
            href="https://github.com/ekllerr/mathmark"
            target="_blank"
            rel="noopener noreferrer"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            Open Source
          </a>
        </header>
  )
}
