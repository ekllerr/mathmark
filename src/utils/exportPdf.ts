import jsPDF from 'jspdf'
import domtoimage from 'dom-to-image-more'
import { applyTheme, PRINT_THEME } from '@/themes'
import { paginate } from './pagination'

// an A4 sheet at 96 pixels per inch, with the margins a printed handout would have
const PAGE_WIDTH = 794
const PAGE_HEIGHT = 1123
const MARGIN_X = 64
const MARGIN_Y = 64
const SCALE = 2 // rendered at twice the size, so text stays sharp when zoomed or printed

// positions, measured from the top of the content, where a page may end: after each paragraph, list or block,
// but not straight after a heading, which belongs with what follows it
function breakPositions(content: HTMLElement): number[] {
  const top = content.getBoundingClientRect().top
  const positions: number[] = []

  const add = (element: Element) => {
    if (/^H[1-6]$/.test(element.tagName)) return
    positions.push(element.getBoundingClientRect().bottom - top)
  }

  for (const child of content.children) {
    if (child.classList.contains('math-block')) add(child)
    else for (const part of child.children) add(part)
  }

  return positions
}

const SIDES = ['Top', 'Right', 'Bottom', 'Left'] as const

// The image library redraws each element from its computed style, and gets two things wrong for this page.
// Both are settled here by writing the real values onto the elements themselves.
function prepareForCapture(frame: HTMLElement) {
  for (const element of [frame, ...frame.querySelectorAll<HTMLElement | SVGElement>('*')]) {
    const computed = getComputedStyle(element)

    // Tailwind gives every element a solid border of zero width. The library keeps "solid" but loses the zero,
    // which draws a thick box around everything; a side with no width gets no border at all.
    for (const side of SIDES)
      if (parseFloat(computed[`border${side}Width`]) === 0) element.style[`border${side}Style`] = 'none'

    // Plot colours for paper come from stylesheet rules, which the library does not carry over for SVG.
    if (element instanceof SVGElement) {
      element.style.setProperty('stroke', computed.stroke)
      element.style.setProperty('fill', computed.fill)
    }
  }
}

// Saves the preview as an A4 PDF, one page after another. `name` is the file name.
export async function exportToPdf(name = 'mathmark.pdf') {
  const preview = document.querySelector('.preview-content') as HTMLElement | null
  if (!preview) return

  // the page being photographed: a window one sheet wide, onto a copy of the preview that slides up behind it
  const frame = document.createElement('div')
  frame.style.cssText = `position: fixed; top: 0; left: -99999px; width: ${PAGE_WIDTH}px; overflow: hidden; background: white;`

  const content = document.createElement('div')
  content.className = 'pdf-export prose prose-sm max-w-none'
  applyTheme(PRINT_THEME, content)
  content.style.cssText = `
    width: ${PAGE_WIDTH}px;
    box-sizing: border-box;
    padding: 0 ${MARGIN_X}px;
    background: white;
    color: black;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 14px;
    line-height: 1.8;
  `

  content.innerHTML = preview.innerHTML
  content.querySelectorAll('button').forEach(b => b.remove())
  content.querySelectorAll('.not-prose').forEach(b => b.remove())

  content.querySelectorAll('.math-block').forEach(block => {
    const el = block as HTMLElement
    el.style.background = 'none'
    el.style.border = 'none'
    el.style.borderLeft = '2px solid #888'
    el.style.borderRadius = '0'
    el.style.padding = '8px 16px'
    el.style.margin = '12px 0'
  })

  content.querySelectorAll('.katex').forEach(el => {
    (el as HTMLElement).style.color = 'black'
  })

  frame.appendChild(content)
  document.body.appendChild(frame)
  prepareForCapture(frame)

  try {
    const pages = paginate(breakPositions(content), content.scrollHeight, PAGE_HEIGHT - 2 * MARGIN_Y)
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4', compress: true })
    const points = pdf.internal.pageSize.getWidth() / PAGE_WIDTH // PDF points per pixel

    for (const [index, [start, end]] of pages.entries()) {
      const height = Math.ceil(end - start)
      if (height <= 0) continue

      frame.style.height = `${height}px`
      content.style.marginTop = `${-start}px`

      // JPEG keeps a page to a few hundred kilobytes; as PNG a single page was over 8 MB
      const image = await domtoimage.toJpeg(frame, {
        quality: 0.92,
        width: PAGE_WIDTH * SCALE,
        height: height * SCALE,
        style: {
          transform: `scale(${SCALE})`,
          transformOrigin: 'top left',
          width: PAGE_WIDTH + 'px',
          height: height + 'px',
          // the copy is drawn where the frame would be on screen, not far off to the left
          position: 'static',
        },
        bgcolor: '#ffffff',
      })

      if (index > 0) pdf.addPage()
      pdf.addImage(image, 'JPEG', 0, MARGIN_Y * points, PAGE_WIDTH * points, height * points)
    }

    pdf.save(name)
  } finally {
    document.body.removeChild(frame)
  }
}
