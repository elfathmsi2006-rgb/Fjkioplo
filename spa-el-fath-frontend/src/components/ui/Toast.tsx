import { CheckCircle2, RotateCcw, X } from 'lucide-react'
import { useEffect } from 'react'
import { useApp } from '../../app/AppProvider'
import { useTranslation } from '../../hooks/useTranslation'

export function Toast() {
  const { toast, showToast, undoAction, setUndoAction } = useApp()
  const { t } = useTranslation()
  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => { showToast(''); setUndoAction(null) }, undoAction ? 5000 : 3200)
    return () => window.clearTimeout(timer)
  }, [toast, undoAction, showToast, setUndoAction])
  if (!toast) return null
  return <div className="toast" role="status"><CheckCircle2 size={18} /><span>{toast}</span>{undoAction && <button className="toast-undo" onClick={() => { undoAction(); setUndoAction(null); showToast('') }}><RotateCcw size={14} />{t('undo')}</button>}<button className="toast-close" onClick={() => { showToast(''); setUndoAction(null) }} aria-label={t('close')}><X size={15} /></button></div>
}
