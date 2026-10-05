import useEditorStore from "@/store/editor";

export default function Editor() {
  const content = useEditorStore(state => state.content);
  const setContent = useEditorStore(state => state.setContent);
  const saved = useEditorStore(state => state.saved);

  return (
    <div className="flex flex-col flex-1 overflow-hidden border-r border-border">
        <div className="flex justify-between px-4 py-1.5 text-[9px] tracking-widest text-muted uppercase border-b border-border bg-surface">
          <span>Editor</span>
          {saved
            ? <span>Saved in this browser</span>
            : <span className="text-red-400">Not saved: browser storage is unavailable</span>}
        </div>
        <textarea
          className="flex-1 w-full bg-panel text-text font-mono text-sm leading-7 p-6 resize-none outline-none text-neutral-100"
          spellCheck={false}
          placeholder="Start writing..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
    </div>
  )
}
