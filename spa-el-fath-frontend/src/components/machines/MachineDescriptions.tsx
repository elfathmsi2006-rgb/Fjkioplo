import { useEffect, useState, type FormEvent } from 'react'
import { Pencil, Save, X } from 'lucide-react'
import type { Role } from '../../data/types'

const API_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, '') || 'http://localhost:3000'
type DescriptionData = {
  technician_description?: string | null
  technician_description_updated_at?: string | null
  workshop_chief_description?: string | null
  workshop_chief_description_updated_at?: string | null
}

type Props = { machineId: string; role: Role | null; language: 'ar' | 'fr' | 'en' }
const text = (language: Props['language'], en: string, fr: string, ar: string) => language === 'ar' ? ar : language === 'fr' ? fr : en

function formatUpdated(value: string | null | undefined, language: Props['language']) {
  if (!value) return text(language, 'Not updated yet', 'Pas encore modifiée', 'لم يتم التحديث بعد')
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat(language === 'ar' ? 'ar-DZ' : language === 'fr' ? 'fr-DZ' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

export function MachineDescriptions({ machineId, role, language }: Props) {
  const [data, setData] = useState<DescriptionData>({})
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [editing, setEditing] = useState<'technician' | 'workshop' | null>(null)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      setLoading(true)
      setLoadError('')
      try {
        const response = await fetch(`${API_BASE_URL}/api/machines/${encodeURIComponent(machineId)}/descriptions`, { credentials: 'include', signal: controller.signal })
        const result = await response.json()
        if (!response.ok || !result.success) throw new Error(result.message || 'Could not load machine descriptions.')
        setData(result.data || {})
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return
        setLoadError(error instanceof Error ? error.message : 'Could not load machine descriptions.')
      } finally { if (!controller.signal.aborted) setLoading(false) }
    }
    void load()
    return () => controller.abort()
  }, [machineId])

  const panels = [
    { key: 'technician' as const, title: text(language, 'Technician description', 'Description du technicien', 'وصف التقني'), field: 'technician_description' as const, updated: 'technician_description_updated_at' as const, allowed: role === 'admin' || role === 'maintenance_worker', endpoint: 'technician' },
    { key: 'workshop' as const, title: text(language, 'Workshop chief description', 'Description du chef d’atelier', 'وصف رئيس الورشة'), field: 'workshop_chief_description' as const, updated: 'workshop_chief_description_updated_at' as const, allowed: role === 'admin' || role === 'workshop_head', endpoint: 'workshop-chief' },
  ]

  function startEdit(panel: typeof panels[number]) {
    setEditing(panel.key)
    setDraft(data[panel.field] || '')
    setSaveError('')
  }

  async function save(event: FormEvent<HTMLFormElement>, panel: typeof panels[number]) {
    event.preventDefault()
    setSaving(true)
    setSaveError('')
    try {
      const response = await fetch(`${API_BASE_URL}/api/machines/${encodeURIComponent(machineId)}/descriptions/${panel.endpoint}`, {
        credentials: 'include',
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: draft }),
      })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.message || 'Could not save the description.')
      setData(current => ({ ...current, [panel.field]: result.data?.description ?? null, [panel.updated]: result.data?.updated_at ?? null }))
      setEditing(null)
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Could not save the description.')
    } finally { setSaving(false) }
  }

  return <section className="panel machine-descriptions-panel">
    <div className="panel-heading"><div><h2>{text(language, 'Operational descriptions', 'Descriptions opérationnelles', 'الأوصاف التشغيلية')}</h2><p>{text(language, 'Separate notes with role-specific edit permissions.', 'Notes distinctes avec droits de modification par rôle.', 'ملاحظات منفصلة بصلاحيات تعديل حسب الدور.')}</p></div></div>
    {loading && <p className="muted">{text(language, 'Loading descriptions…', 'Chargement des descriptions…', 'جارٍ تحميل الأوصاف…')}</p>}
    {loadError && <p className="form-errors" role="alert">{loadError}</p>}
    {!loading && panels.map(panel => <article className="machine-description-card" key={panel.key}>
      <div className="machine-description-header"><h3>{panel.title}</h3>{panel.allowed && editing !== panel.key && <button className="button button-secondary" type="button" onClick={() => startEdit(panel)}><Pencil size={15} />{text(language, 'Edit', 'Modifier', 'تعديل')}</button>}</div>
      {editing === panel.key ? <form onSubmit={event => void save(event, panel)}>
        <textarea rows={5} maxLength={10000} value={draft} onChange={event => setDraft(event.target.value)} aria-label={panel.title} />
        {saveError && <p className="form-errors" role="alert">{saveError}</p>}
        <div className="form-actions"><button className="button button-secondary" type="button" disabled={saving} onClick={() => { setEditing(null); setSaveError('') }}><X size={15} />{text(language, 'Cancel', 'Annuler', 'إلغاء')}</button><button className="button button-primary" type="submit" disabled={saving}><Save size={15} />{saving ? text(language, 'Saving…', 'Enregistrement…', 'جارٍ الحفظ…') : text(language, 'Save', 'Enregistrer', 'حفظ')}</button></div>
      </form> : <p className="machine-description-text">{data[panel.field]?.trim() || text(language, 'No description has been added.', 'Aucune description pour le moment.', 'لم تتم إضافة وصف بعد.')}</p>}
      <small className="muted">{text(language, 'Last successful update:', 'Dernière mise à jour réussie :', 'آخر تحديث ناجح:')} {formatUpdated(data[panel.updated], language)}</small>
      {!panel.allowed && <small className="muted">{text(language, 'Read-only for your role.', 'Lecture seule pour votre rôle.', 'عرض فقط حسب صلاحيات دورك.')}</small>}
    </article>)}
  </section>
}
