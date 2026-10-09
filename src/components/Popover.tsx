import { useEffect, useRef, useState, type ReactNode } from "react";

interface Props{
    label: string, // read by screen readers and shown as the tooltip
    button: ReactNode,
    children: (close: () => void) => ReactNode
}

// a header button that opens a small menu below it; a click elsewhere or Escape closes it
export default function Popover({ label, button, children }: Props) {
    const [open, setOpen] = useState(false);
    const root = useRef<HTMLSpanElement>(null);

    useEffect(() => {
      if (!open) return;

      const onPointer = (e: PointerEvent) => {
        if (!root.current?.contains(e.target as Node)) setOpen(false);
      }
      const onKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setOpen(false);
      }

      document.addEventListener('pointerdown', onPointer);
      document.addEventListener('keydown', onKey);
      return () => {
        document.removeEventListener('pointerdown', onPointer);
        document.removeEventListener('keydown', onKey);
      }
    }, [open]);

    return (
      <span ref={root} className="relative">
        <button
          onClick={() => setOpen(o => !o)}
          aria-haspopup="true"
          aria-expanded={open}
          aria-label={label}
          title={open ? undefined : label}
          className={`flex items-center gap-1.5 font-mono text-[11px] tracking-widest uppercase px-2.5 py-1.5 rounded-md cursor-pointer transition-colors
          ${open ? 'bg-border text-accent' : 'text-muted hover:text-text hover:bg-panel'}`}
        >
          {button}
        </button>
        {open && (
          <div className="absolute right-0 top-full z-50 mt-2 rounded-lg border border-border bg-surface p-1.5 shadow-xl shadow-black/30">
            {children(() => setOpen(false))}
          </div>
        )}
      </span>
    )
}
