import { useEffect, useRef } from 'react'
import { updateFaviconLink } from '../lib/favicon-renderer'
import { renderPaletteBufferToCanvas } from '../lib/palette'
import { codeToPixelBuffer } from '../lib/pixel-code'
import { TITLE_LOGO_CODE } from '../lib/title-logo'
import { FaviconPreview } from './FaviconPreview'

const TITLE_BUFFER = codeToPixelBuffer(TITLE_LOGO_CODE)

export function TitleFavicon() {
  const previewCanvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const faviconCanvas = document.createElement('canvas')
    renderPaletteBufferToCanvas(TITLE_BUFFER, faviconCanvas)
    updateFaviconLink(faviconCanvas)

    if (previewCanvasRef.current) {
      renderPaletteBufferToCanvas(TITLE_BUFFER, previewCanvasRef.current)
    }
  }, [])

  return <FaviconPreview ref={previewCanvasRef} />
}
