import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { useTranslation } from '../../hooks/useTranslation'

export function Modal({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const { t } = useTranslation()
  useEffect(() => {
    const previous: HTMLElement | null = document.activeElement instanceof HTMLElement ? document.activeElement : null
    ref.current?.querySelector<HTMLElement>('input,select,textarea,button')?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current()
      if (event.key === 'Tab' && ref.current) {
        const focusable = Array.from(ref.current.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),a[href]')) as HTMLElement[]
        if (!focusable.length) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey); previous?.focus() }
  }, [])
  return <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
    <section className={`modal ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby="modal-title" ref={ref}>
      <header className="modal-header"><h2 id="modal-title">{title}</h2><button className="icon-button" onClick={onClose} aria-label={t('close')}><X size={18} /></button></header>
      <div className="modal-content">{children}</div>
    </section>
  </div>
}
