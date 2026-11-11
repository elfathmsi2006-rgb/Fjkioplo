import { useEffect, useState } from 'react'
import { Download, FileText } from 'lucide-react'

const ENABLED = import.meta.env.VITE_MACHINE_MANUALS_ENABLED === 'true'
const API_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, '') || 'http://localhost:3000'
type Manual = { id: number | string; title: string; original_filename: string; mime_type?: string; size_bytes?: number | null; downloadUrl: string }
type Props = { machineId: string; language: 'ar' | 'fr' | 'en' }
const text = (language: Props['language'], en: string, fr: string, ar: string) => language === 'ar' ? ar : language === 'fr' ? fr : en

export function TechnicalManuals({ machineId, language }: Props) {
  const [manuals, setManuals] = useState<Manual[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [downloading, setDownloading] = useState<string | null>(null)

  useEffect(() => {
    if (!ENABLED) return
    const controller = new AbortController()
    async function load() {
      setLoading(true)
      setError('')
      try {
        const response = await fetch(`${API_BASE_URL}/api/machines/${encodeURIComponent(machineId)}/manuals`, { credentials: 'include', signal: controller.signal })
        const result = await response.json()
        if (!response.ok || !result.success) throw new Error(result.message || 'Could not load technical manuals.')
        setManuals(Array.isArray(result.data) ? result.data : [])
      } catch (cause) {
        if (cause instanceof Error && cause.name === 'AbortError') return
        setError(cause instanceof Error ? cause.message : 'Could not load technical manuals.')
      } finally { if (!controller.signal.aborted) setLoading(false) }
    }
    void load()
    return () => controller.abort()
  }, [machineId])

  async function download(manual: Manual) {
    setDownloading(String(manual.id))
    setError('')
    try {
      const response = await fetch(`${API_BASE_URL}${manual.downloadUrl}`, { credentials: 'include' })
      if (!response.ok) {
        const result = await response.json().catch(() => ({})) as { message?: string }
        throw new Error(result.message || 'Could not download this manual.')
      }
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = manual.original_filename || `${manual.title}.pdf`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not download this manual.')
    } finally { setDownloading(null) }
  }

  if (!ENABLED) return null
  return <section className="panel machine-manuals-panel">
    <div className="panel-heading"><div><h2>{text(language, 'Technical manuals', 'Manuels techniques', 'الأدلة التقنية')}</h2><p>{text(language, 'Documents linked to this machine.', 'Documents associés à cette machine.', 'الوثائق المرتبطة بهذه الآلة.')}</p></div><FileText size={20} /></div>
    {loading && <p className="muted">{text(language, 'Loading manuals…', 'Chargement des manuels…', 'جارٍ تحميل الأدلة…')}</p>}
    {error && <p className="form-errors" role="alert">{error}</p>}
    {!loading && !error && manuals.length === 0 && <p className="muted">{text(language, 'No technical manual is available for this machine.', 'Aucun manuel technique disponible pour cette machine.', 'لا يوجد دليل تقني متاح لهذه الآلة.')}</p>}
    {manuals.map(manual => <div className="manual-row" key={manual.id}><div><strong>{manual.title}</strong><small>{manual.original_filename}</small></div><button type="button" className="button button-secondary" disabled={downloading === String(manual.id)} onClick={() => void download(manual)}><Download size={15} />{downloading === String(manual.id) ? text(language, 'Downloading…', 'Téléchargement…', 'جارٍ التنزيل…') : text(language, 'Download', 'Télécharger', 'تنزيل')}</button></div>)}
  </section>
}
