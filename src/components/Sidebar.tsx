import useEditorStore, { documentTitle } from "@/store/editor";
import { createBackup, download, parseBackup, pickTextFile } from "@/utils/files";
import { useState } from "react";

const action = "w-full text-left px-4 py-1.5 font-mono text-[11px] text-muted hover:text-text cursor-pointer transition-colors";

export default function Sidebar() {
    const documents = useEditorStore(state => state.documents);
    const trash = useEditorStore(state => state.trash);
    const currentId = useEditorStore(state => state.currentId);
    const createDocument = useEditorStore(state => state.createDocument);
    const selectDocument = useEditorStore(state => state.selectDocument);
    const deleteDocument = useEditorStore(state => state.deleteDocument);
    const restoreDocument = useEditorStore(state => state.restoreDocument);
    const purgeDocument = useEditorStore(state => state.purgeDocument);
    const importDocuments = useEditorStore(state => state.importDocuments);

    const [query, setQuery] = useState('');
    const [trashOpen, setTrashOpen] = useState(false);
    // removing a note from the trash cannot be undone, so it takes a second click
    const [confirming, setConfirming] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);

    const needle = query.trim().toLowerCase();
    const shown = needle ? documents.filter(doc => doc.content.toLowerCase().includes(needle)) : documents;

    const say = (message: string) => {
      setNotice(message);
      setTimeout(() => setNotice(null), 4000);
    }

    const openFile = async () => {
      const file = await pickTextFile('.md,.markdown,.txt,text/markdown,text/plain');
      if (!file) return;

      const added = importDocuments([{ id: '', content: file.text, updated: Date.now() }]);
      say(added ? `Opened ${file.name}` : `${file.name} is empty or already in your notes`);
    }

    const backup = () => {
      download(`mathmark-backup-${new Date().toISOString().slice(0, 10)}.json`, createBackup(documents), 'application/json');
      say(`Saved ${documents.length} ${documents.length === 1 ? 'note' : 'notes'} to a backup file`);
    }

    const restore = async () => {
      const file = await pickTextFile('.json,application/json');
      if (!file) return;

      try {
        const added = importDocuments(parseBackup(file.text));
        say(added ? `Added ${added} ${added === 1 ? 'note' : 'notes'} from the backup` : 'Every note in the backup is already here');
      }
      catch (e) { say((e as Error).message) }
    }

    return (
      <aside className="flex flex-col w-60 shrink-0 border-r border-border bg-surface overflow-hidden print:hidden max-md:absolute max-md:inset-y-0 max-md:left-0 max-md:z-40">
        <div className="flex items-center justify-between px-4 py-1.5 text-[9px] tracking-widest text-muted uppercase border-b border-border">
          <span>Notes</span>
          <button
            onClick={() => { createDocument(); setQuery(''); }}
            className="tracking-widest uppercase text-muted hover:text-accent cursor-pointer transition-colors"
          >
            + New
          </button>
        </div>

        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search notes"
          aria-label="Search notes"
          className="mx-3 my-2 rounded-md border border-border bg-bg px-2.5 py-1.5 font-mono text-xs text-text placeholder:text-muted outline-none focus:border-accent"
        />

        <ul className="flex-1 overflow-y-auto border-t border-border">
          {shown.map(doc => (
            <li
              key={doc.id}
              className={`group flex items-center border-b border-border ${doc.id === currentId ? 'bg-border' : 'hover:bg-panel'}`}
            >
              <button
                onClick={() => selectDocument(doc.id)}
                aria-current={doc.id === currentId}
                className={`flex-1 min-w-0 text-left px-4 py-2.5 font-mono text-xs truncate cursor-pointer ${doc.id === currentId ? 'text-accent' : 'text-text'}`}
              >
                {documentTitle(doc.content)}
              </button>
              <button
                onClick={() => deleteDocument(doc.id)}
                aria-label={`Move ${documentTitle(doc.content)} to the trash`}
                title="Move to trash"
                className="px-3 py-2.5 font-mono text-xs text-muted hover:text-red-400 cursor-pointer opacity-0 group-hover:opacity-100 focus:opacity-100 max-md:opacity-100 transition-opacity"
              >
                ×
              </button>
            </li>
          ))}
          {shown.length === 0 && (
            <li className="px-4 py-3 font-mono text-xs text-muted">No notes contain “{query.trim()}”.</li>
          )}
        </ul>

        {trash.length > 0 && (
          <div className="border-t border-border">
            <button onClick={() => setTrashOpen(open => !open)} aria-expanded={trashOpen} className={action}>
              {trashOpen ? '▾' : '▸'} Trash ({trash.length})
            </button>
            {trashOpen && (
              <ul className="max-h-40 overflow-y-auto">
                {trash.map(doc => (
                  <li key={doc.id} className="flex items-center gap-1 pl-6 pr-2 py-1">
                    <span className="flex-1 min-w-0 truncate font-mono text-[11px] text-muted">{documentTitle(doc.content)}</span>
                    <button onClick={() => restoreDocument(doc.id)} className="px-1.5 font-mono text-[9px] tracking-widest uppercase text-accent cursor-pointer">
                      Restore
                    </button>
                    {confirming === doc.id ? (
                      <button
                        onClick={() => { purgeDocument(doc.id); setConfirming(null); }}
                        onBlur={() => setConfirming(null)}
                        autoFocus
                        className="px-1.5 font-mono text-[9px] tracking-widest uppercase text-red-400 cursor-pointer"
                      >
                        Sure?
                      </button>
                    ) : (
                      <button
                        onClick={() => setConfirming(doc.id)}
                        aria-label={`Delete ${documentTitle(doc.content)} for good`}
                        title="Delete for good"
                        className="px-1.5 font-mono text-xs text-muted hover:text-red-400 cursor-pointer"
                      >
                        ×
                      </button>
                    )}
                  </li>
                ))}
                <li className="pl-6 pr-2 py-1 font-mono text-[10px] leading-4 text-muted">Emptied after 30 days.</li>
              </ul>
            )}
          </div>
        )}

        <div className="border-t border-border py-1.5">
          <button onClick={openFile} className={action}>Open a .md file…</button>
          <button onClick={backup} className={action}>Back up all notes</button>
          <button onClick={restore} className={action}>Restore a backup…</button>
          <p role="status" className="min-h-5 px-4 font-mono text-[10px] leading-5 text-accent">{notice}</p>
        </div>
      </aside>
    )
}
