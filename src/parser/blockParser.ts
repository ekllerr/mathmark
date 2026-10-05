export interface MathBlock{
    raw: string; //the full ${ ... } match
    inner: string; //just the content inside
    start: number; //the position of $
    end: number; //index after the closing }
}


export function parseBlocks(text: string): MathBlock[]{
    const blocks: MathBlock[] = [];
    let i = 0;

    while(i < text.length){
        if(text[i] === '`'){
            i = skipCode(text, i);
            continue;
        }

        if(text.startsWith('${', i)){
            const close = findClosingBrace(text, i + 1);

            if(close !== -1){
                blocks.push({
                    raw: text.slice(i, close + 1),
                    inner: text.slice(i + 2, close).trim(),
                    start: i,
                    end: close + 1
                });
                i = close + 1;
                continue;
            }
        }

        i++;
    }

    return blocks;
}

// only braces are counted, so a block with a mistyped parenthesis still ends where the author closed it
function findClosingBrace(text: string, open: number): number {
    let depth = 0;

    for(let i = open; i < text.length; i++){
        if(text[i] === '{') depth++;
        else if(text[i] === '}' && --depth === 0) return i;
    }

    return -1;
}

// markdown code is shown literally: returns the index just past the code that starts at `start`
function skipCode(text: string, start: number): number {
    let ticks = 0;
    while(text[start + ticks] === '`') ticks++;

    const lineStart = text.lastIndexOf('\n', start - 1) + 1;
    const isFence = ticks >= 3 && text.slice(lineStart, start).trim() === '';
    const fence = '`'.repeat(ticks);

    if(isFence){
        // a fenced block runs to its closing fence, or to the end of the document
        const close = text.indexOf('\n' + fence, start + ticks);
        return close === -1 ? text.length : close + 1 + ticks;
    }

    // inline code closes on a run of the same number of backticks; otherwise they are plain text
    let search = start + ticks;
    while(search < text.length){
        const close = text.indexOf(fence, search);
        if(close === -1) break;

        let run = ticks;
        while(text[close + run] === '`') run++;
        if(run === ticks && text[close - 1] !== '`') return close + ticks;

        search = close + run;
    }

    return start + ticks;
}
