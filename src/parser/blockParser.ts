export interface MathBlock{
    raw: string; //the full ${ ... } match
    inner: string; //just the content inside
    start: number; //the position of $
    end: number; //index after the closing } 
}


export function parseBlocks(text: string): MathBlock[]{
    const blocks: MathBlock[] = [];
    const re = /\$\{([\s\S]*?)\}/g;
    let match;

    while((match = re.exec(text)) !== null){
        blocks.push({
            raw: match[0],
            inner: match[1].trim(),
            start: match.index,
            end: re.lastIndex
        });
    }

    return blocks;
}

