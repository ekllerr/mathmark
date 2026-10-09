import useEditorStore from "@/store/editor";
import { clearSharedHash, decodeDocument, readSharedHash } from "@/utils/share";
import { useEffect, useState } from "react";

// opens the document carried by a share link as a document of its own, leaving the reader's notes untouched
export default function SharedDocument() {
    const [damaged, setDamaged] = useState(false);

    useEffect(() => {
      let cancelled = false;

      const open = async () => {
        const encoded = readSharedHash();
        if (encoded === null) return;

        let shared: string;
        try { shared = await decodeDocument(encoded) }
        catch {
          if (!cancelled) setDamaged(true);
          return;
        }
        if (cancelled) return;

        const { documents, content, setContent, selectDocument, createDocument } = useEditorStore.getState();
        const existing = documents.find(doc => doc.content === shared);

        if (existing) selectDocument(existing.id);       // opened before: go back to it
        else if (content.trim() === '') setContent(shared); // fill the blank document
        else createDocument(shared);

        // the link is dropped from the address bar, so a refresh does not open it again
        clearSharedHash();
      }

      open();
      window.addEventListener('hashchange', open);
      return () => {
        cancelled = true;
        window.removeEventListener('hashchange', open);
      }
    }, []);

    if (!damaged) return null;

    const close = () => {
      clearSharedHash();
      setDamaged(false);
    }

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 print:hidden">
        <div role="dialog" aria-modal="true" className="w-full max-w-md bg-surface border border-border rounded-lg p-6 font-mono">
          <h2 className="text-sm text-heading mb-2">This share link is damaged</h2>
          <p className="text-xs text-muted leading-6 mb-5">
            The document in the link could not be read. It may have been cut short when it was copied. Your notes are unchanged.
          </p>
          <div className="flex justify-end">
            <button
              onClick={close}
              className="font-mono text-[11px] tracking-widest uppercase px-3.5 py-2 rounded-md border border-border text-text hover:border-muted cursor-pointer transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    )
}
