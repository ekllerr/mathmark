import useUIStore from "@/store/uiStore";

export default function Main() {

  const tab = useUIStore(state => state.tab);


  return (
    <main className="flex flex-1 overflow-hidden">

        {tab !== 'preview' && (
          <div className="flex flex-col flex-1 overflow-hidden border-r border-border">
            <div className="px-4 py-1.5 text-[9px] tracking-widest text-muted uppercase border-b border-border bg-surface">
              Editor
            </div>
            <textarea
              className="flex-1 w-full bg-panel text-text font-mono text-sm leading-7 p-6 resize-none outline-none text-neutral-100"
              spellCheck={false}
              placeholder="Start writing..."
            />
          </div>
        )}

        {tab !== 'editor' && (
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="px-4 py-1.5 text-[9px] tracking-widest text-muted uppercase border-b border-border bg-surface">
              Preview
            </div>
            <div className="flex-1 overflow-y-auto p-8 bg-panel text-neutral-100">
              {/* renderer output goes here later */}
            </div>
          </div>
        )}
      </main>
  )
}
