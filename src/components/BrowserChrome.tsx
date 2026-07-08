import { useEffect, useState, type ReactNode } from 'react'
import './BrowserChrome.css'

const POLL_INTERVAL_MS = 200
const FAVICON_LINK_ID = 'favicon'

interface BrowserChromeProps {
  children: ReactNode
  isMaximized: boolean
  onMaximize: () => void
  onClose: () => void
}

// A fake browser window wrapped around the whole app: since the actual tab
// title/favicon only visibly update on desktop, this mirrors both in-page so
// the "favicon as game screen" concept reads clearly everywhere.
export function BrowserChrome({ children, isMaximized, onMaximize, onClose }: BrowserChromeProps) {
  const [title, setTitle] = useState(document.title)
  const [faviconHref, setFaviconHref] = useState('')

  useEffect(() => {
    const update = () => {
      setTitle(document.title)
      const link = document.getElementById(FAVICON_LINK_ID) as HTMLLinkElement | null
      if (link) setFaviconHref(link.href)
    }
    update()
    const interval = setInterval(update, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="browser-chrome">
      <div className="browser-chrome__tabbar">
        <div className="browser-chrome__dots">
          <button
            type="button"
            className="browser-chrome__dot browser-chrome__dot--red"
            aria-label="閉じる"
            onClick={onClose}
          />
          <button
            type="button"
            className="browser-chrome__dot browser-chrome__dot--yellow"
            aria-label="しまう"
            onClick={onClose}
          />
          <button
            type="button"
            className="browser-chrome__dot browser-chrome__dot--green"
            aria-label={isMaximized ? '元に戻す' : '最大化'}
            onClick={onMaximize}
          />
        </div>
        <div className="browser-chrome__tab">
          {faviconHref && <img className="browser-chrome__favicon" src={faviconHref} alt="" />}
          <span className="browser-chrome__tab-title">{title}</span>
        </div>
      </div>
      <div className="browser-chrome__toolbar">
        <span className="browser-chrome__url">🔒 super-favicon.pages.dev</span>
      </div>
      <div className="browser-chrome__page">{children}</div>
    </div>
  )
}
