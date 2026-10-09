import { TEMPLATES, type Template } from "@/editor/templates";

interface Props{
    onInsert: (template: Template) => void
}

// One-tap inserts for the things that are slow to type or hard to remember, on a phone especially.
// Math buttons add a ${ } around what they insert unless the cursor is already in one.
export default function Toolbar({ onInsert }: Props) {
    return (
      <div role="toolbar" aria-label="Insert" className="flex items-center gap-0.5 overflow-x-auto border-b border-border bg-surface px-2 py-1">
        {TEMPLATES.map((template, i) => (
          <span key={template.title} className="flex items-center">
            {/* a divider before the first text-formatting button */}
            {i > 0 && !template.math && TEMPLATES[i - 1].math && <span className="mx-1.5 h-4 w-px shrink-0 bg-border" aria-hidden="true" />}
            <button
              // keeps the selection in the editor, so the insert lands where the writer was
              onMouseDown={e => e.preventDefault()}
              onClick={() => onInsert(template)}
              title={template.title}
              aria-label={template.title}
              className="shrink-0 whitespace-nowrap rounded px-2 py-1 font-mono text-xs text-muted cursor-pointer transition-colors hover:bg-panel hover:text-accent"
            >
              {template.label}
            </button>
          </span>
        ))}
      </div>
    )
}
