import useEditorStore, { documentTitle } from "@/store/editor";
import { useState } from "react";

export default function Sidebar() {
    const documents = useEditorStore(state => state.documents);
    const currentId = useEditorStore(state => state.currentId);
    const createDocument = useEditorStore(state => state.createDocument);
    const selectDocument = useEditorStore(state => state.selectDocument);
    const deleteDocument = useEditorStore(state => state.deleteDocument);

    // deleting cannot be undone, so it takes a second click on the same document
    const [confirming, setConfirming] = useState<string | null>(null);

    return (
      <aside className="flex flex-col w-56 shrink-0 border-r border-border bg-surface overflow-hidden print:hidden max-md:absolute max-md:inset-y-0 max-md:left-0 max-md:z-40">
        <div className="flex items-center justify-between px-4 py-1.5 text-[9px] tracking-widest text-muted uppercase border-b border-border">
          <span>Notes</span>
          <button
            onClick={() => createDocument()}
            className="tracking-widest uppercase text-muted hover:text-accent cursor-pointer transition-colors"
          >
            + New
          </button>
        </div>
        <ul className="flex-1 overflow-y-auto">
          {documents.map(doc => (
            <li
              key={doc.id}
              className={`group flex items-center border-b border-border ${doc.id === currentId ? 'bg-border' : 'hover:bg-panel'}`}
            >
              <button
                onClick={() => { selectDocument(doc.id); setConfirming(null); }}
                aria-current={doc.id === currentId}
                className={`flex-1 min-w-0 text-left px-4 py-2.5 font-mono text-xs truncate cursor-pointer ${doc.id === currentId ? 'text-accent' : 'text-text'}`}
              >
                {documentTitle(doc.content)}
              </button>
              {confirming === doc.id ? (
                <button
                  onClick={() => { deleteDocument(doc.id); setConfirming(null); }}
                  onBlur={() => setConfirming(null)}
                  autoFocus
                  className="px-3 py-2.5 font-mono text-[9px] tracking-widest uppercase text-red-400 cursor-pointer"
                >
                  Delete?
                </button>
              ) : (
                <button
                  onClick={() => setConfirming(doc.id)}
                  aria-label={`Delete ${documentTitle(doc.content)}`}
                  title="Delete"
                  className="px-3 py-2.5 font-mono text-xs text-muted hover:text-red-400 cursor-pointer opacity-0 group-hover:opacity-100 focus:opacity-100 max-md:opacity-100 transition-opacity"
                >
                  ×
                </button>
              )}
            </li>
          ))}
        </ul>
      </aside>
    )
}
