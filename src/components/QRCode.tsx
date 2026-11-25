import { memo, useEffect, useState } from 'react'
import QR from 'qrcode'

/** QR code generated in the browser (no external service). */
function QRCodeImpl({ text, className = '' }: { text: string; className?: string }) {
  const [svg, setSvg] = useState('')
  useEffect(() => {
    let alive = true
    QR.toString(text, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#1b1030', light: '#ffffff' } })
      .then((s) => alive && setSvg(s))
      .catch(() => alive && setSvg(''))
    return () => {
      alive = false
    }
  }, [text])
  return <div className={`qr ${className}`} role="img" aria-label={`QR code: ${text}`} dangerouslySetInnerHTML={{ __html: svg }} />
}

export default memo(QRCodeImpl)
