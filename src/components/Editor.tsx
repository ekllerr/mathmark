import useEditorStore from "@/store/editor";
import { mathEditor } from "@/editor/mathExtensions";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { useEffect, useRef } from "react";

export default function Editor() {
  const content = useEditorStore(state => state.content);
  const saved = useEditorStore(state => state.saved);

  const container = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  useEffect(() => {
    const { content, setContent } = useEditorStore.getState();

    const view = new EditorView({
      parent: container.current!,
      state: EditorState.create({ doc: content, extensions: mathEditor(setContent) }),
    });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    }
  }, []);

  // content that changed from outside the editor: another document was selected, or a shared one opened
  useEffect(() => {
    const view = viewRef.current;
    if (view && view.state.doc.toString() !== content)
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: content } });
  }, [content]);

  return (
    <div className="flex flex-col flex-1 min-w-0 overflow-hidden border-r border-border print:hidden">
        <div className="flex justify-between px-4 py-1.5 text-[9px] tracking-widest text-muted uppercase border-b border-border bg-surface">
          <span>Editor</span>
          {saved
            ? <span>Saved in this browser</span>
            : <span className="text-red-400">Not saved: browser storage is unavailable</span>}
        </div>
        <div ref={container} className="flex-1 min-h-0 overflow-hidden bg-panel" />
    </div>
  )
}
