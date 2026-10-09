import jsPDF from 'jspdf'
import domtoimage from 'dom-to-image-more'
import { applyTheme, PRINT_THEME } from '@/themes'

export async function exportToPdf() {
  const preview = document.querySelector('.preview-content') as HTMLElement | null
  if (!preview) return

  const container = document.createElement('div')
  container.className = 'pdf-export prose prose-sm max-w-none'
  applyTheme(PRINT_THEME, container)
  container.style.cssText = `
    position: fixed;
    top: -9999px;
    left: -9999px;
    width: 800px;
    background: white;
    color: black;
    padding: 48px;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 14px;
    line-height: 1.8;
  `

  // copy the preview content into it
  container.innerHTML = preview.innerHTML

  container.querySelectorAll('button').forEach(b => b.remove())

  container.querySelectorAll('.math-block').forEach(block => {
    const el = block as HTMLElement
    el.style.background = 'none'
    el.style.border = 'none'
    el.style.borderLeft = '2px solid #888'
    el.style.padding = '8px 16px'
    el.style.margin = '12px 0'
  })

  container.querySelectorAll('.katex').forEach(el => {
    (el as HTMLElement).style.color = 'black'
  })

  document.body.appendChild(container)

  try {
    // measure while attached: a detached element reports 0
    const width = container.scrollWidth
    const height = container.scrollHeight

    const scale = 2
    const dataUrl = await domtoimage.toPng(container, {
      width: width * scale,
      height: height * scale,
      style: {
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
        width: width + 'px',
        height: height + 'px',
      },
      bgcolor: '#ffffff',
    })

    const pdf = new jsPDF({
      // jsPDF swaps the dimensions if they don't match the orientation
      orientation: width > height ? 'landscape' : 'portrait',
      unit: 'px',
      format: [width, height],
    })

    pdf.addImage(dataUrl, 'PNG', 0, 0, width, height)
    pdf.save('mathmark.pdf')
  } finally {
    document.body.removeChild(container)
  }
}
