import useEditorStore from "@/store/editor"
import { marked } from "marked";

export default function Preview() {
    
    const content = useEditorStore(state => state.content);

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
        <div className="px-4 py-1.5 text-[9px] tracking-widest text-muted uppercase border-b border-border bg-surface">
          Preview
        </div>
        <div className="prose prose-invert prose-sm max-w-none flex-1 overflow-y-auto p-8 bg-panel text-neutral-100" dangerouslySetInnerHTML={{  __html: marked.parse(content)}}/>

    </div>
  )
}
