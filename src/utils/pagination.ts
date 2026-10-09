// Cuts a tall document into pages. `breaks` are the positions where a cut is welcome (the ends of paragraphs
// and blocks); each page ends at the last such position that still fits, so nothing is sliced through
// unless a single block is taller than a page. Returns [start, end) for every page.
export function paginate(breaks: number[], total: number, pageHeight: number): [number, number][] {
  const candidates = [...new Set(breaks)].filter(position => position > 0 && position < total).sort((a, b) => a - b)
  const pages: [number, number][] = []
  let start = 0

  while (total - start > pageHeight) {
    const limit = start + pageHeight
    const fitting = candidates.filter(position => position > start && position <= limit)
    const end = fitting.length > 0 ? fitting[fitting.length - 1] : limit

    pages.push([start, end])
    start = end
  }

  pages.push([start, total])
  return pages
}
