import { useId } from "react";

interface Props{
    label: string,
    on: boolean,
    onToggle: () => void,
    description: string, // what the switch does
    example: string // what it looks like when on
}

// an on/off switch in the header that explains itself in a card as soon as it is hovered or focused
export default function HeaderToggle({ label, on, onToggle, description, example }: Props) {
    const id = useId();

    return (
      <span className="group relative">
        <button
          onClick={onToggle}
          aria-pressed={on}
          aria-describedby={id}
          className={`flex items-center gap-1.5 font-mono text-[11px] tracking-widest uppercase px-2.5 py-1.5 rounded-md cursor-pointer transition-colors
          ${on ? 'text-accent hover:bg-panel' : 'text-muted hover:text-text hover:bg-panel'}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full transition-colors ${on ? 'bg-accent' : 'bg-border'}`} />
          {label}
        </button>
        <span
          id={id}
          role="tooltip"
          className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 w-64 -translate-x-1/2 rounded-lg border border-border bg-surface p-3 font-mono text-[11px] normal-case tracking-normal leading-5 text-text shadow-xl shadow-black/30
          invisible opacity-0 transition-opacity group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100"
        >
          <span className="block">{description}</span>
          <span className="block mt-2 text-muted">Example: <span className="text-text">{example}</span></span>
          <span className="block mt-2 text-muted">
            Now <span className="text-accent">{on ? 'on' : 'off'}</span>. Click to turn it {on ? 'off' : 'on'}.
          </span>
        </span>
      </span>
    )
}
