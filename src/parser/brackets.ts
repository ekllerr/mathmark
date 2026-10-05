const OPEN = '([{';
const CLOSE = ')]}';

// index of the bracket that closes the one at `open`, or -1 if it is never closed
export function findClosing(text: string, open: number): number {
    let depth = 0;

    for(let i = open; i < text.length; i++){
        if(OPEN.includes(text[i])) depth++;
        else if(CLOSE.includes(text[i]) && --depth === 0) return i;
    }

    return -1;
}

export interface Part{
    text: string, // trimmed
    start: number, // where the trimmed text begins in the original
    end: number
}

// splits on commas that are not inside any (), [] or {}, keeping track of where each part sits
export function splitTopLevelParts(text: string): Part[] {
    const parts: Part[] = [];
    let depth = 0;
    let from = 0;

    const push = (to: number) => {
        const raw = text.slice(from, to);
        const start = from + (raw.length - raw.trimStart().length);
        parts.push({ text: raw.trim(), start, end: start + raw.trim().length });
    }

    for(let i = 0; i < text.length; i++){
        if(OPEN.includes(text[i])) depth++;
        else if(CLOSE.includes(text[i])) depth--;
        else if(text[i] === ',' && depth === 0){
            push(i);
            from = i + 1;
        }
    }

    if(text.slice(from).trim()) push(text.length);
    return parts;
}

export function splitTopLevel(text: string): string[] {
    return splitTopLevelParts(text).map(part => part.text);
}
