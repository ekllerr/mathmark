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

// splits on commas that are not inside any (), [] or {}
export function splitTopLevel(text: string): string[] {
    const parts: string[] = [];
    let depth = 0;
    let current = '';

    for(const char of text){
        if(OPEN.includes(char)) depth++;
        else if(CLOSE.includes(char)) depth--;
        else if(char === ',' && depth === 0){
            parts.push(current.trim());
            current = '';
            continue;
        }

        current += char;
    }

    if(current.trim()) parts.push(current.trim());
    return parts;
}
