import { valueForColor } from './palette'
import { GRID_SIZE, createPixelBuffer, setPixel, type PixelBuffer } from './pixel-buffer'

// Loads an arbitrary image file, crops it to a centered square, downsamples
// it to the editor's 32x32 grid, and quantizes each pixel down to the
// editor's 64-color palette.
export async function pixelBufferFromImageFile(file: File): Promise<PixelBuffer> {
  const bitmap = await createImageBitmap(file)
  try {
    const size = Math.min(bitmap.width, bitmap.height)
    const sourceX = (bitmap.width - size) / 2
    const sourceY = (bitmap.height - size) / 2

    const canvas = document.createElement('canvas')
    canvas.width = GRID_SIZE
    canvas.height = GRID_SIZE
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D context is not available')

    ctx.drawImage(bitmap, sourceX, sourceY, size, size, 0, 0, GRID_SIZE, GRID_SIZE)
    const { data } = ctx.getImageData(0, 0, GRID_SIZE, GRID_SIZE)

    const buffer = createPixelBuffer()
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const i = (y * GRID_SIZE + x) * 4
        setPixel(buffer, x, y, valueForColor(data[i], data[i + 1], data[i + 2]))
      }
    }
    return buffer
  } finally {
    bitmap.close()
  }
}
