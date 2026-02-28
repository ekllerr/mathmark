import { parseBlocks } from "@/parser/blockParser";
import useEditorStore from "@/store/editor"
import { marked } from "marked";
import MathBlock from "./MathBlock";

marked.setOptions({ breaks: true });

export default function Preview() {

    const content = useEditorStore(state => state.content);
    const blocks = parseBlocks(content);

    const parts: React.ReactNode[] = [];
    let cursor = 0;

    blocks.forEach((block, i) => {
        if(block.start > cursor){
            const prose = content.slice(cursor, block.start);
            parts.push(
                <div 
                key={`prose-${i}`}
                className="prose prose-invert prose-sm max-w-none font-light"
                dangerouslySetInnerHTML={{__html: marked.parse(prose)}}
                />
            );
        }

        parts.push(<MathBlock key={`block-${i}`} inner={block.inner} />)
        cursor = block.end;
    });

    if(cursor < content.length){
        const remaining = content.slice(cursor);
        parts.push(
            <div 
                key="prose-end"
                className="prose prose-invert prose-sm max-w-none font-light"
                dangerouslySetInnerHTML={{__html: marked.parse(remaining)}}
            />
        );
    }

    return (
      <div className="flex flex-col flex-1 overflow-hidden">
          <div className="px-4 py-1.5 text-[9px] tracking-widest text-muted uppercase border-b border-border bg-surface">
            Preview
          </div>
          <div className="prose prose-invert prose-sm max-w-none flex-1 overflow-y-auto p-8 bg-panel text-neutral-100">
            {parts}
          </div>

      </div>
    )
}
