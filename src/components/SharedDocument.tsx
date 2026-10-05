import useEditorStore from "@/store/editor";
import { clearSharedHash, decodeDocument, readSharedHash } from "@/utils/share";
import { useEffect, useState } from "react";

type Prompt =
  | { kind: 'conflict', shared: string }
  | { kind: 'damaged' }

// opens the document carried by a share link, asking first if it would replace different saved notes
export default function SharedDocument() {
    const setContent = useEditorStore(state => state.setContent);
    const [prompt, setPrompt] = useState<Prompt | null>(null);

    useEffect(() => {
      let cancelled = false;

      const open = async () => {
        const encoded = readSharedHash();
        if (encoded === null) return;

        let shared: string;
        try { shared = await decodeDocument(encoded) }
        catch {
          if (!cancelled) setPrompt({ kind: 'damaged' });
          return;
        }
        if (cancelled) return;

        const local = useEditorStore.getState().content;

        if (local.trim() === '' || local === shared) {
          setContent(shared);
          clearSharedHash();
        }
        else setPrompt({ kind: 'conflict', shared });
      }

      open();
      window.addEventListener('hashchange', open);
      return () => {
        cancelled = true;
        window.removeEventListener('hashchange', open);
      }
    }, [setContent]);

    if (!prompt) return null;

    // the link is dropped from the address bar either way, so a refresh returns to the saved notes
    const close = () => {
      clearSharedHash();
      setPrompt(null);
    }

    const button = "font-mono text-[11px] tracking-widest uppercase px-3.5 py-2 rounded-md border cursor-pointer transition-colors";

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 print:hidden">
        <div role="dialog" aria-modal="true" className="w-full max-w-md bg-surface border border-border rounded-lg p-6 font-mono">
          {prompt.kind === 'damaged' ? (
            <>
              <h2 className="text-sm text-white mb-2">This share link is damaged</h2>
              <p className="text-xs text-muted leading-6 mb-5">
                The document in the link could not be read. It may have been cut short when it was copied. Your saved notes are unchanged.
              </p>
              <div className="flex justify-end">
                <button onClick={close} className={`${button} border-border text-text hover:border-muted`}>
                  Close
                </button>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-sm text-white mb-2">Open the shared document?</h2>
              <p className="text-xs text-muted leading-6 mb-5">
                This link contains a document, and you already have different notes saved in this browser. Opening it replaces your notes, and they cannot be recovered.
              </p>
              <div className="flex flex-wrap justify-end gap-2">
                <button onClick={close} className={`${button} border-border text-text hover:border-muted`}>
                  Keep my notes
                </button>
                <button
                  onClick={() => { setContent(prompt.shared); close(); }}
                  className={`${button} border-accent text-accent hover:bg-border`}
                >
                  Replace with shared
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    )
}
