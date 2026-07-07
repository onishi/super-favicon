import { GRID_SIZE, type PixelBuffer } from './pixel-buffer'

export interface FaviconRendererOptions {
  onColor?: string
  offColor?: string | null
}

export function renderPixelBufferToCanvas(
  buffer: PixelBuffer,
  canvas: HTMLCanvasElement,
  { onColor = '#000000', offColor = null }: FaviconRendererOptions = {},
): void {
  canvas.width = GRID_SIZE
  canvas.height = GRID_SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.clearRect(0, 0, GRID_SIZE, GRID_SIZE)
  if (offColor) {
    ctx.fillStyle = offColor
    ctx.fillRect(0, 0, GRID_SIZE, GRID_SIZE)
  }
  ctx.fillStyle = onColor
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      if (buffer[y * GRID_SIZE + x]) {
        ctx.fillRect(x, y, 1, 1)
      }
    }
  }
}

const FAVICON_LINK_ID = 'favicon'

export function updateFaviconLink(canvas: HTMLCanvasElement): void {
  let link = document.getElementById(FAVICON_LINK_ID) as HTMLLinkElement | null
  if (!link) {
    link = document.createElement('link')
    link.id = FAVICON_LINK_ID
    link.rel = 'icon'
    document.head.appendChild(link)
  }
  link.type = 'image/png'
  link.href = canvas.toDataURL('image/png')
}
