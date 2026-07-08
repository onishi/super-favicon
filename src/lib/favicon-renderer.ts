import {
  ACCENT,
  BLUE,
  CYAN,
  FIELD_BG,
  GLOW_ACCENT,
  GLOW_BLUE,
  GLOW_CYAN,
  GLOW_ON,
  GLOW_ORANGE,
  GLOW_PURPLE,
  GLOW_RED,
  GLOW_YELLOW,
  GRID_SIZE,
  GROUND,
  GROUND_ALT,
  ON,
  ORANGE,
  PURPLE,
  RED,
  type PixelBuffer,
  YELLOW,
} from './pixel-buffer'

export interface FaviconRendererOptions {
  onColor?: string
  offColor?: string | null
  accentColor?: string
  orangeColor?: string
  glowOnColor?: string
  glowAccentColor?: string
  glowOrangeColor?: string
  groundColor?: string
  groundAltColor?: string
  cyanColor?: string
  yellowColor?: string
  purpleColor?: string
  redColor?: string
  blueColor?: string
  glowCyanColor?: string
  glowYellowColor?: string
  glowPurpleColor?: string
  glowRedColor?: string
  glowBlueColor?: string
  fieldBgColor?: string
}

export function renderPixelBufferToCanvas(
  buffer: PixelBuffer,
  canvas: HTMLCanvasElement,
  {
    onColor = '#ffffff',
    offColor = '#000000',
    accentColor = '#00ff00',
    orangeColor = '#ff8c00',
    glowOnColor = '#555555',
    glowAccentColor = '#005500',
    glowOrangeColor = '#552e00',
    groundColor = '#c8a878',
    groundAltColor = '#a8845a',
    cyanColor = '#00ffff',
    yellowColor = '#ffff00',
    purpleColor = '#a000f0',
    redColor = '#ff0000',
    blueColor = '#4d4dff',
    glowCyanColor = '#005555',
    glowYellowColor = '#555500',
    glowPurpleColor = '#380058',
    glowRedColor = '#550000',
    glowBlueColor = '#1a1a55',
    fieldBgColor = '#303030',
  }: FaviconRendererOptions = {},
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
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const value = buffer[y * GRID_SIZE + x]
      if (value === ACCENT) {
        ctx.fillStyle = accentColor
        ctx.fillRect(x, y, 1, 1)
      } else if (value === ON) {
        ctx.fillStyle = onColor
        ctx.fillRect(x, y, 1, 1)
      } else if (value === ORANGE) {
        ctx.fillStyle = orangeColor
        ctx.fillRect(x, y, 1, 1)
      } else if (value === GLOW_ACCENT) {
        ctx.fillStyle = glowAccentColor
        ctx.fillRect(x, y, 1, 1)
      } else if (value === GLOW_ON) {
        ctx.fillStyle = glowOnColor
        ctx.fillRect(x, y, 1, 1)
      } else if (value === GLOW_ORANGE) {
        ctx.fillStyle = glowOrangeColor
        ctx.fillRect(x, y, 1, 1)
      } else if (value === GROUND) {
        ctx.fillStyle = groundColor
        ctx.fillRect(x, y, 1, 1)
      } else if (value === GROUND_ALT) {
        ctx.fillStyle = groundAltColor
        ctx.fillRect(x, y, 1, 1)
      } else if (value === CYAN) {
        ctx.fillStyle = cyanColor
        ctx.fillRect(x, y, 1, 1)
      } else if (value === YELLOW) {
        ctx.fillStyle = yellowColor
        ctx.fillRect(x, y, 1, 1)
      } else if (value === PURPLE) {
        ctx.fillStyle = purpleColor
        ctx.fillRect(x, y, 1, 1)
      } else if (value === RED) {
        ctx.fillStyle = redColor
        ctx.fillRect(x, y, 1, 1)
      } else if (value === BLUE) {
        ctx.fillStyle = blueColor
        ctx.fillRect(x, y, 1, 1)
      } else if (value === GLOW_CYAN) {
        ctx.fillStyle = glowCyanColor
        ctx.fillRect(x, y, 1, 1)
      } else if (value === GLOW_YELLOW) {
        ctx.fillStyle = glowYellowColor
        ctx.fillRect(x, y, 1, 1)
      } else if (value === GLOW_PURPLE) {
        ctx.fillStyle = glowPurpleColor
        ctx.fillRect(x, y, 1, 1)
      } else if (value === GLOW_RED) {
        ctx.fillStyle = glowRedColor
        ctx.fillRect(x, y, 1, 1)
      } else if (value === GLOW_BLUE) {
        ctx.fillStyle = glowBlueColor
        ctx.fillRect(x, y, 1, 1)
      } else if (value === FIELD_BG) {
        ctx.fillStyle = fieldBgColor
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
