import { useState, type FormEvent } from 'react'
import { Factory, Pencil, Users, Gauge, Phone, MessageCircle } from 'lucide-react'
import { useApp } from '../app/AppProvider'
import { useTranslation } from '../hooks/useTranslation'
import type { Workshop } from '../data/types'
import { localizedWorkshopName } from '../utils/format'
import { PageHeader } from '../components/ui/PageHeader'
import { Modal } from '../components/ui/Modal'
import { EmptyState } from '../components/ui/EmptyState'
import { saveWorkshopRecord } from '../services/workshops'

type WorkshopForm = Omit<Workshop, 'id'>
const emptyForm: WorkshopForm = { name: '', nameFr: '', nameEn: '', manager: '', managerPhone: '', location: '' }
const normalizePhone = (phone: string) => { const trimmed = phone.trim(); const digits = trimmed.replace(/\D/g, ''); const normalized = digits.startsWith('0') ? `213${digits.slice(1)}` : digits; return normalized.length >= 8 && normalized.length <= 15 ? normalized : '' }
const telHref = (phone: string) => { const normalized = normalizePhone(phone); return normalized ? `tel:+${normalized}` : undefined }

export default function WorkshopsPage() {
  const { workshops, setWorkshops, machines, language, role, addActivity, showToast } = useApp()
  const { t, isRtl } = useTranslation()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Workshop | null>(null)
  const [form, setForm] = useState<WorkshopForm>(emptyForm)
  const [detail, setDetail] = useState<Workshop | null>(null)
  const [error, setError] = useState('')
  const canEdit = role === 'admin' || role === 'production_chief' || role === 'workshop_head'
  const openEdit = (workshop: Workshop) => { setEditing(workshop); setForm({ name: workshop.name, nameFr: workshop.nameFr, nameEn: workshop.nameEn, manager: workshop.manager, managerPhone: workshop.managerPhone ?? '', location: workshop.location }); setError(''); setModalOpen(true) }
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (![form.name, form.nameFr, form.nameEn].every(value => value.trim())) { setError(t('name') + ' — ' + t('noResults')); return }
    if (!editing) return
    try {
      const saved = await saveWorkshopRecord({ ...editing, ...form })
      setWorkshops(current => current.map(workshop => workshop.id === saved.id ? saved : workshop))
      addActivity(language === 'ar' ? 'تعديل ورشة' : language === 'fr' ? 'Atelier modifié' : 'Workshop updated', saved.name)
      showToast(language === 'ar' ? 'تم حفظ تعديلات الورشة في قاعدة البيانات' : language === 'fr' ? 'Atelier enregistré dans la base de données' : 'Workshop changes saved to the database')
      setModalOpen(false)
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'Could not save the workshop.'
      setError(message)
      showToast(language === 'ar' ? `فشل حفظ الورشة: ${message}` : language === 'fr' ? `Échec de l’enregistrement : ${message}` : `Failed to save workshop: ${message}`)
    }
  }
  return <section className="page-section">
    <PageHeader eyebrow={t('workshops')} title={t('workshops')} description={t('workshopsDesc')} />
    <div className="workshop-grid">{workshops.map((workshop, index) => {
      const list = machines.filter(machine => machine.workshopId === workshop.id)
      const working = list.filter(machine => machine.status === 'working').length
      const broken = list.filter(machine => machine.status === 'broken').length
      const pct = list.length ? Math.round(working / list.length * 100) : 0
      return <article className="workshop-card" key={workshop.id}>
        <div className="workshop-card-art" style={{ background: `linear-gradient(120deg, hsl(${(index * 137.508) % 360} 48% 24%), hsl(${(index * 137.508) % 360} 58% 42%))` }}><span className="workshop-art-icon"><Factory size={25} /></span><span className="workshop-number">{String(index + 1).padStart(2, '0')}</span><div className="art-lines" /></div>
        <div className="workshop-card-content"><div className="workshop-card-top"><div><span className="card-overline">{workshop.location || t('location')}</span><h3>{localizedWorkshopName(workshop, language)}</h3></div><div className="row-actions">{canEdit && <button className="row-action" aria-label={t('edit')} onClick={() => openEdit(workshop)}><Pencil size={15} /></button>}</div></div>
          <div className="workshop-meta"><span><Users size={14} />{t('manager')}: {workshop.manager || '—'}</span><span><Phone size={14} />{workshop.managerPhone || '—'}</span><span><Gauge size={14} />{list.length} {t('machines')}</span></div>
          <div className="workshop-health-row"><div className="health-ring" style={{ background: `conic-gradient(var(--success) ${pct}%, var(--border) ${pct}% 100%)` }}><span>{pct}%</span></div><div className="workshop-health-copy"><strong>{t('health')}</strong><small>{working} {t('activeMachines')}</small><small className={broken ? 'text-danger' : ''}>{broken} {t('broken')}</small></div></div>
          <div className="workshop-status-bars"><span style={{ width: `${list.length ? working / list.length * 100 : 0}%` }} /><span style={{ width: `${list.length ? (list.length - working - broken) / list.length * 100 : 0}%` }} /><span style={{ width: `${list.length ? broken / list.length * 100 : 0}%` }} /></div>
          <button className="workshop-open" onClick={() => setDetail(workshop)}>{t('viewDetails')} <span>{isRtl ? '←' : '→'}</span></button>
        </div>
      </article>
    })}</div>
    {workshops.length === 0 && <EmptyState title={t('noWorkshops')} />}
    {modalOpen && <Modal title={editing ? t('edit') : t('addWorkshop')} onClose={() => setModalOpen(false)}><form className="form-grid" onSubmit={save}>
      <label className="field-label">{t('arabicName')}<input required value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} /></label>
      <label className="field-label">{t('frenchName')}<input required value={form.nameFr} onChange={event => setForm({ ...form, nameFr: event.target.value })} /></label>
      <label className="field-label">{t('englishName')}<input required value={form.nameEn} onChange={event => setForm({ ...form, nameEn: event.target.value })} /></label>
      <label className="field-label">{t('manager')}<input value={form.manager} onChange={event => setForm({ ...form, manager: event.target.value })} /></label>
      <label className="field-label">{language === 'ar' ? 'هاتف مسؤول الورشة' : language === 'fr' ? 'Téléphone du responsable' : 'Workshop manager phone'}<input type="tel" value={form.managerPhone ?? ''} onChange={event => setForm({ ...form, managerPhone: event.target.value })} placeholder="+213…" /></label>
      <label className="field-label">{t('location')}<input value={form.location} onChange={event => setForm({ ...form, location: event.target.value })} /></label>
      {error && <p className="form-errors">{error}</p>}<div className="form-actions form-full"><button type="button" className="button button-secondary" onClick={() => setModalOpen(false)}>{t('cancel')}</button><button type="submit" className="button button-primary">{t('save')}</button></div>
    </form></Modal>}
    {detail && <Modal title={localizedWorkshopName(detail, language)} onClose={() => setDetail(null)} wide><div className="detail-grid"><div className="detail-stat"><span>{t('machines')}</span><strong>{machines.filter(machine => machine.workshopId === detail.id).length}</strong></div><div className="detail-stat"><span>{t('manager')}</span><strong>{detail.manager || '—'}</strong></div><div className="detail-stat"><span>{language === 'ar' ? 'هاتف مسؤول الورشة' : language === 'fr' ? 'Téléphone du responsable' : 'Manager phone'}</span><strong>{detail.managerPhone || '—'}</strong><div className="workshop-contact-actions">{telHref(detail.managerPhone || '') ? <a className="button button-secondary" href={telHref(detail.managerPhone || '')}><Phone size={15}/>{language === 'ar' ? 'اتصال هاتفي' : language === 'fr' ? 'Appel téléphonique' : 'Phone call'}</a> : <button type="button" className="button button-secondary" disabled title={language === 'ar' ? 'لا يوجد رقم هاتف صالح محفوظ لهذا المسؤول.' : language === 'fr' ? 'Aucun numéro valide enregistré pour ce responsable.' : 'No valid phone number is stored for this manager.'}><Phone size={15}/>{language === 'ar' ? 'اتصال غير متاح' : language === 'fr' ? 'Appel indisponible' : 'Call unavailable'}</button>}{normalizePhone(detail.managerPhone || '') ? <a className="button button-secondary" href={`https://wa.me/${normalizePhone(detail.managerPhone || '')}`} target="_blank" rel="noreferrer"><MessageCircle size={15}/>{language === 'ar' ? 'إرسال رسالة واتساب' : language === 'fr' ? 'Message WhatsApp' : 'WhatsApp message'}</a> : <button type="button" className="button button-secondary" disabled title={language === 'ar' ? 'لا يمكن فتح واتساب دون رقم صالح محفوظ.' : language === 'fr' ? 'Impossible d’ouvrir WhatsApp sans numéro valide enregistré.' : 'WhatsApp cannot open without a valid stored number.'}><MessageCircle size={15}/>{language === 'ar' ? 'واتساب غير متاح' : language === 'fr' ? 'WhatsApp indisponible' : 'WhatsApp unavailable'}</button>}</div></div></div><h3>{t('machines')}</h3>{machines.filter(machine => machine.workshopId === detail.id).map(machine => <div className="detail-machine" key={machine.id}><span>{language === 'fr' ? machine.nameFr : language === 'en' ? machine.nameEn : machine.name}</span><code>{machine.code}</code><span className={`status-pill status-${machine.status}`}>{machine.status === 'working' ? t('working') : machine.status === 'broken' ? t('broken') : t('inMaintenance')}</span></div>)}</Modal>}
  </section>
}
