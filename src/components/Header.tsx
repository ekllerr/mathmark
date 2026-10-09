import useUIStore, { tabs, type Tab } from "@/store/uiStore"
import useEditorStore from "@/store/editor";
import { createShareUrl } from "@/utils/share";
import { download, fileName } from "@/utils/files";
import { THEMES } from "@/themes";
import { useState } from "react";
import HeaderToggle from "./HeaderToggle";
import Popover from "./Popover";
import { CheckIcon, ExportIcon, GitHubIcon, HelpIcon, NotesIcon, ShareIcon, ThemeIcon } from "./icons";

// chat apps and email clients often cut links longer than this
const LONG_LINK = 2000;

const iconButton = "flex items-center gap-1.5 font-mono text-[11px] tracking-widest uppercase px-2.5 py-1.5 rounded-md cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed";
const menuItem = "flex w-full items-center gap-3 whitespace-nowrap rounded-md px-3 py-2 text-left font-mono text-xs text-text cursor-pointer transition-colors hover:bg-panel disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent";

export default function Header() {

    const tab = useUIStore(state => state.tab);
    const setTab = useUIStore(state => state.setTab);

    const docsOpen = useUIStore(state => state.docsOpen);
    const toggleDocs = useUIStore(state => state.toggleDocs);

    const exact = useUIStore(state => state.exact);
    const toggleExact = useUIStore(state => state.toggleExact);
    const steps = useUIStore(state => state.steps);
    const toggleSteps = useUIStore(state => state.toggleSteps);
    const sidebarOpen = useUIStore(state => state.sidebarOpen);
    const toggleSidebar = useUIStore(state => state.toggleSidebar);
    const theme = useUIStore(state => state.theme);
    const setTheme = useUIStore(state => state.setTheme);

    const hasContent = useEditorStore(state => state.content.trim() !== '');
    const [shareStatus, setShareStatus] = useState<string | null>(null);
    const [exporting, setExporting] = useState(false);

    // a long note takes a few seconds to turn into pages
    const savePdf = async () => {
      setExporting(true);
      try {
        const { exportToPdf } = await import('@/utils/exportPdf');
        await exportToPdf(fileName(useEditorStore.getState().content, 'pdf'));
      }
      finally { setExporting(false) }
    }

    // printing and exporting capture the preview, which the editor-only view does not show
    const noPreview = tab === 'editor';

    const share = async () => {
      let status: string;

      try {
        const url = await createShareUrl(useEditorStore.getState().content);

        try {
          await navigator.clipboard.writeText(url);
          status = url.length > LONG_LINK ? 'copied (long link)' : 'link copied';
        }
        catch {
          // no clipboard access: leave the link in the address bar to copy by hand
          history.replaceState(null, '', url);
          status = 'link in address bar';
        }
      }
      catch { status = 'share failed' }

      setShareStatus(status);
      setTimeout(() => setShareStatus(null), 2500);
    }

  return (
    <header className="flex flex-wrap items-center gap-x-2 gap-y-1 px-3 md:px-4 min-h-13 py-1.5 border-b border-border bg-surface shrink-0 print:hidden">
          {/* documents and name */}
          <div className="flex items-center gap-2 lg:flex-1">
            <button
              onClick={toggleSidebar}
              aria-pressed={sidebarOpen}
              aria-label="Your notes"
              title="Your notes"
              className={`${iconButton} ${sidebarOpen ? 'bg-border text-accent' : 'text-muted hover:text-text hover:bg-panel'}`}
            >
              <NotesIcon />
              <span className="hidden sm:inline">Notes</span>
            </button>
            <div className="flex items-baseline gap-2 pl-1 select-none">
              <span className="font-serif text-[22px] text-accent leading-none">∑</span>
              <span className="font-serif font-medium text-[18px] tracking-tight text-heading">Mathmark</span>
            </div>
          </div>

          {/* view */}
          <nav aria-label="View" className="flex gap-1 bg-bg border border-border rounded-lg p-0.75">
            {tabs.map(t => (
              <button key={t} onClick={() => setTab(t as Tab)} aria-pressed={tab === t} className={`font-mono text-[11px] tracking-widest uppercase px-3.5 py-1.25 rounded-md cursor-pointer transition-colors
                  ${t === 'split' ? 'hidden md:block' : ''}
                  ${tab === t ? 'bg-border text-accent' : 'text-muted hover:text-text'}`}>
                {t}
              </button>
            ))}
          </nav>

          {/* how results are shown, then actions */}
          <div className="flex flex-1 items-center justify-end gap-0.5">
            <HeaderToggle
              label="Exact"
              on={exact}
              onToggle={toggleExact}
              description="Shows answers as fractions, roots and multiples of π where one can be found, with the decimal after it. Off shows decimals only."
              example="1/3 + 1/6 = ½ = 0.5"
            />
            <HeaderToggle
              label="Steps"
              on={steps}
              onToggle={toggleSteps}
              description="Shows the working before the answer: variables are replaced by their values and your own functions are written out. Off shows the answer alone."
              example="a · b = 2 · 3 = 6"
            />

            <span className="mx-1.5 h-5 w-px bg-border" aria-hidden="true" />

            <button
              onClick={share}
              disabled={!hasContent}
              title="Copy a link that contains this document"
              className={`${iconButton} ${shareStatus ? 'text-accent' : 'text-muted hover:text-text hover:bg-panel'}`}
            >
              <ShareIcon />
              <span className={shareStatus ? '' : 'hidden lg:inline'}>{shareStatus ?? 'Share'}</span>
            </button>

            <Popover label="Export" button={<><ExportIcon /><span className={exporting ? '' : 'hidden lg:inline'}>{exporting ? 'Preparing PDF…' : 'Export'}</span></>}>
              {close => (
                <>
                  <button
                    onClick={() => {
                      close();
                      const { content } = useEditorStore.getState();
                      download(fileName(content, 'md'), content, 'text/markdown');
                    }}
                    disabled={!hasContent}
                    className={menuItem}
                  >
                    Save as Markdown (.md)
                  </button>
                  <button
                    onClick={() => { close(); savePdf(); }}
                    disabled={noPreview || exporting}
                    className={menuItem}
                  >
                    Save as PDF (A4 pages)
                  </button>
                  <button onClick={() => { close(); window.print(); }} disabled={noPreview} className={menuItem}>
                    Print…
                  </button>
                  {noPreview && (
                    <p className="max-w-48 px-3 py-2 font-mono text-[11px] leading-5 text-muted">
                      Switch to Split or Preview first: these capture the preview.
                    </p>
                  )}
                </>
              )}
            </Popover>

            <Popover label="Theme" button={<ThemeIcon />}>
              {() => (
                <div role="radiogroup" aria-label="Theme" className="grid w-56 grid-cols-2 gap-1">
                  {THEMES.map(option => (
                    <button
                      key={option.id}
                      role="radio"
                      aria-checked={theme === option.id}
                      onClick={() => setTheme(option.id)}
                      className={`flex flex-col gap-1.5 rounded-md p-1.5 text-left cursor-pointer transition-colors ${theme === option.id ? 'bg-border' : 'hover:bg-panel'}`}
                    >
                      {/* a miniature of the theme, drawn with the theme's own colours */}
                      <span data-theme={option.id} className="flex h-10 items-end gap-1 rounded border border-border bg-bg p-1.5">
                        <span className="h-full flex-1 rounded-sm bg-surface" />
                        <span className="h-2 w-2 rounded-full bg-accent" />
                        <span className="h-2 w-2 rounded-full bg-accent2" />
                        <span className="h-2 w-2 rounded-full bg-text" />
                      </span>
                      <span className={`flex items-center justify-between font-mono text-[11px] ${theme === option.id ? 'text-accent' : 'text-text'}`}>
                        {option.name}
                        {theme === option.id && <CheckIcon />}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </Popover>

            <button
              onClick={toggleDocs}
              aria-pressed={docsOpen}
              aria-label="Syntax reference"
              title="Syntax reference (Ctrl+/)"
              className={`${iconButton} ${docsOpen ? 'bg-border text-accent' : 'text-muted hover:text-text hover:bg-panel'}`}
            >
              <HelpIcon />
            </button>

            <a
              className={`${iconButton} text-muted hover:text-text hover:bg-panel`}
              href="https://github.com/ekllerr/mathmark"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Source code on GitHub"
              title="Source code on GitHub"
            >
              <GitHubIcon />
            </a>
          </div>
        </header>
  )
}
