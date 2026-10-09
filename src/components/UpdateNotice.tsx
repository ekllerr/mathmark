import useUIStore from "@/store/uiStore";
import { useEffect } from "react";

// a small notice in the corner: the app is now stored for offline use, or a new version is waiting
export default function UpdateNotice() {
    const offline = useUIStore(state => state.offline);
    const setOffline = useUIStore(state => state.setOffline);

    // "ready" is only news for a moment; an update stays until it is acted on
    useEffect(() => {
      if (offline?.kind !== 'ready') return;
      const timer = setTimeout(() => setOffline(null), 6000);
      return () => clearTimeout(timer);
    }, [offline, setOffline]);

    if (!offline) return null;

    return (
      <div role="status" className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3 font-mono text-xs text-text shadow-xl shadow-black/30 print:hidden">
        {offline.kind === 'ready' ? (
          <span>Mathmark now works without a connection.</span>
        ) : (
          <>
            <span>A new version is ready.</span>
            <button
              onClick={offline.reload}
              className="rounded-md border border-accent px-2.5 py-1 text-[11px] tracking-widest uppercase text-accent cursor-pointer transition-colors hover:bg-border"
            >
              Reload
            </button>
          </>
        )}
        <button onClick={() => setOffline(null)} aria-label="Dismiss" className="text-muted hover:text-text cursor-pointer">
          ×
        </button>
      </div>
    )
}
