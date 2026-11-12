import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Download, Eye, LayoutGrid, List, Pencil, Plus, Search, Trash2, X, CheckCircle2, Printer, Wrench, Gauge, ChevronLeft, ChevronRight } from 'lucide-react'
import { useApp } from '../app/AppProvider'
import { useTranslation } from '../hooks/useTranslation'
import type { Machine, MachineStatus } from '../data/types'
import { localizedMachineName, localizedWorkshopName, downloadText, csvRow, formatDate } from '../utils/format'
import { PageHeader } from '../components/ui/PageHeader'
import { MetricCard } from '../components/ui/MetricCard'
import { StatusBadge } from '../components/ui/StatusBadge'
import { Modal } from '../components/ui/Modal'
import { EmptyState } from '../components/ui/EmptyState'
import { saveMachineRecord } from '../services/machines'
import { deleteMachineRecord } from '../services/machines'

type MachineForm = Omit<Machine, 'id'>
type SavedView = { name: string; query: string; workshopFilter: string; statusFilter: string }
const blankForm = (workshopId: string): MachineForm => ({ code: '', name: '', nameFr: '', nameEn: '', workshopId, status: 'working', category: '', lastMaintenance: new Date().toISOString().slice(0, 10), serialNumber: '', manufacturer: '', installDate: '', nextMaintenance: '', notes: '' })

export default function MachinesPage() {
  const { machines, setMachines, workshops, language, role, addActivity, showToast, reloadData } = useApp()
  const { t, isRtl } = useTranslation()
  const [params, setParams] = useSearchParams()
  const [query, setQuery] = useState(params.get('q') ?? '')
  const [workshopFilter, setWorkshopFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [view, setView] = useState<'table' | 'cards'>('table')
  const [sortKey, setSortKey] = useState<'code' | 'name' | 'status' | 'lastMaintenance'>('code')
  const [sortDesc, setSortDesc] = useState(false)
  const [pageNumber, setPageNumber] = useState(1)
  const [selected, setSelected] = useState<string[]>([])
  const [bulkStatusValue, setBulkStatusValue] = useState<MachineStatus>('maintenance')
  const [bulkWorkshopId, setBulkWorkshopId] = useState(workshops[0]?.id ?? '')
  const [savedViews, setSavedViews] = useState<SavedView[]>([])
  const [form, setForm] = useState<MachineForm>(blankForm(workshops[0]?.id ?? ''))
  const [editing, setEditing] = useState<Machine | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Machine | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  const canEdit = role === 'admin' || role === 'production_chief' || role === 'workshop_head'
  const canDelete = role === 'admin' || role === 'production_chief'
  const canMoveAcrossWorkshops = role === 'admin' || role === 'production_chief'
  const filtered = useMemo(() => machines.filter(machine => {
    const q = query.trim().toLowerCase()
    const name = localizedMachineName(machine, language).toLowerCase()
    const matches = !q || [machine.code, machine.name, machine.nameFr, machine.nameEn, machine.category, machine.serialNumber ?? '', machine.manufacturer ?? '', name].some(value => value.toLowerCase().includes(q))
    return matches && (workshopFilter === 'all' || machine.workshopId === workshopFilter) && (statusFilter === 'all' || machine.status === statusFilter)
  }).sort((a, b) => {
    const av = sortKey === 'name' ? localizedMachineName(a, language) : a[sortKey]
    const bv = sortKey === 'name' ? localizedMachineName(b, language) : b[sortKey]
    return String(av).localeCompare(String(bv)) * (sortDesc ? -1 : 1)
  }), [machines, query, workshopFilter, statusFilter, language, sortKey, sortDesc])
  useEffect(() => { if (params.get('new') === '1' && canEdit) { openNew(); setParams({}, { replace: true }) } }, [params, canEdit, setParams])
  useEffect(() => { setPageNumber(1) }, [query, workshopFilter, statusFilter, sortKey, sortDesc])
  const saveCurrentView = () => {
    const saved: SavedView = { name: `${t('savedView')} ${savedViews.length + 1}`, query, workshopFilter, statusFilter }
    setSavedViews(current => [saved, ...current].slice(0, 5))
    showToast(t('saveView'))
  }
  function openNew() { setEditing(null); setForm(blankForm(workshops[0]?.id ?? '')); setErrors([]); setModalOpen(true) }
  function openEdit(machine: Machine) {
    setEditing(machine)
    setForm({ code: machine.code, name: machine.name, nameFr: machine.nameFr, nameEn: machine.nameEn, workshopId: machine.workshopId, status: machine.status, category: machine.category, lastMaintenance: machine.lastMaintenance, serialNumber: machine.serialNumber ?? '', manufacturer: machine.manufacturer ?? '', installDate: machine.installDate ?? '', nextMaintenance: machine.nextMaintenance ?? '', notes: machine.notes ?? '' })
    setErrors([])
    setModalOpen(true)
  }

async function saveMachine(event: FormEvent<HTMLFormElement>) {
  event.preventDefault()

  const validation: string[] = []

  if (!form.name.trim()) validation.push(t('arabicName'))
  if (!form.nameFr.trim()) validation.push(t('frenchName'))
  if (!form.nameEn.trim()) validation.push(t('englishName'))
  if (!form.code.trim()) validation.push(t('code'))
  if (!form.workshopId) validation.push(t('chooseWorkshop'))

  if (
    machines.some(
      machine =>
        machine.code.toLowerCase() === form.code.trim().toLowerCase() &&
        machine.id !== editing?.id
    )
  ) {
    validation.push(
      t('code') + ' — ' +
      (language === 'ar'
        ? 'موجود مسبقًا'
        : language === 'fr'
          ? 'déjà utilisé'
          : 'already exists')
    )
  }

  if (validation.length) {
    setErrors(validation)
    return
  }

  setErrors([])

  try {
    const workshop = workshops.find(
      item => item.id === form.workshopId
    )

    if (!workshop) {
      throw new Error('الورشة المختارة غير موجودة في القائمة.')
    }

    // تجهيز بيانات الآلة دون حفظ محلي مسبق
    const machineToSave: Machine = {
      ...(editing ?? {
        id: crypto.randomUUID(),
      } as Machine),
      ...form,
      code: form.code.trim(),
      name: form.name.trim(),
      nameFr: form.nameFr.trim(),
      nameEn: form.nameEn.trim(),
    }

    // إرسال البيانات إلى Backend وحفظها في قاعدة البيانات
    const savedMachine = await saveMachineRecord(
      machineToSave,
      workshop.name,
      editing?.id
    )

    // تحديث الواجهة فقط بعد نجاح الحفظ في الخادم
    setMachines(current => {
      if (editing) {
        return current.map(machine =>
          machine.id === editing.id ? savedMachine : machine
        )
      }

      return [
        savedMachine,
        ...current.filter(machine => machine.id !== savedMachine.id),
      ]
    })

    addActivity(
      editing
        ? language === 'ar' ? 'تعديل آلة' : language === 'fr' ? 'Machine modifiée' : 'Machine updated'
        : language === 'ar' ? 'إضافة آلة' : language === 'fr' ? 'Machine ajoutée' : 'Machine added',
      savedMachine.code
    )

    showToast(
      language === 'ar'
        ? editing ? 'تم تحديث الآلة في قاعدة البيانات' : 'تم حفظ الآلة في قاعدة البيانات'
        : language === 'fr'
          ? editing ? 'Machine mise à jour' : 'Machine enregistrée'
          : editing ? 'Machine updated successfully' : 'Machine saved successfully'
    )

    setModalOpen(false)
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'تعذر حفظ الآلة.'

    setErrors([message])
    showToast(
      language === 'ar'
        ? `فشل حفظ الآلة: ${message}`
        : language === 'fr'
          ? `Échec de l'enregistrement : ${message}`
          : `Failed to save machine: ${message}`
    )
  }
}


async function removeMachine() {
  if (!deleteTarget) return

  const target = deleteTarget

  try {
    // احذف الآلة من قاعدة البيانات أولًا
    await deleteMachineRecord(target.id)

    // حدّث الواجهة فقط بعد نجاح الحذف
    setMachines(current =>
      current.filter(machine => machine.id !== target.id)
    )

    addActivity(
      language === 'ar'
        ? 'حذف آلة'
        : language === 'fr'
          ? 'Machine supprimée'
          : 'Machine deleted',
      target.code
    )

    showToast(
      language === 'ar'
        ? `تم حذف الآلة ${target.code} من قاعدة البيانات`
        : language === 'fr'
          ? `Machine ${target.code} supprimée`
          : `Machine ${target.code} deleted`
    )

    setDeleteTarget(null)
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'تعذر حذف الآلة.'

    showToast(
      language === 'ar'
        ? `فشل حذف الآلة: ${message}`
        : language === 'fr'
          ? `Échec de la suppression : ${message}`
          : `Failed to delete machine: ${message}`
    )
  }
}

  function exportCsv(items = filtered) {
    const rows = [[t('code'), t('arabicName'), t('frenchName'), t('englishName'), t('workshop'), t('status'), t('category'), t('lastMaintenance'), t('nextMaintenance')], ...items.map(machine => [machine.code, machine.name, machine.nameFr, machine.nameEn, workshops.find(workshop => workshop.id === machine.workshopId)?.name ?? '', machine.status, machine.category, machine.lastMaintenance, machine.nextMaintenance ?? ''])]
    const csv = '\ufeff' + rows.map(row => csvRow(row)).join('\r\n')
    downloadText('spa-el-fath-machines.csv', csv, 'text/csv;charset=utf-8')
  }
  function toggleSort(key: typeof sortKey) { if (sortKey === key) setSortDesc(value => !value); else { setSortKey(key); setSortDesc(false) } }
  const pageSize = 10
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const pageItems = filtered.slice((pageNumber - 1) * pageSize, pageNumber * pageSize)
  const counts = { total: machines.length, working: machines.filter(machine => machine.status === 'working').length, broken: machines.filter(machine => machine.status === 'broken').length, maintenance: machines.filter(machine => machine.status === 'maintenance').length }
  const updateStatus = async (machine: Machine, status: MachineStatus) => {
    if (machine.status === status) return
    try {
      const workshop = workshops.find(item => item.id === machine.workshopId)
      if (!workshop) throw new Error('The machine workshop could not be found.')
      const saved = await saveMachineRecord({ ...machine, status }, workshop.name, machine.id)
      setMachines(current => current.map(item => item.id === machine.id ? saved : item))
      addActivity(language === 'ar' ? 'تغيير حالة آلة' : language === 'fr' ? 'État modifié' : 'Status changed', machine.code)
      showToast(language === 'ar' ? 'تم حفظ حالة الآلة في قاعدة البيانات' : language === 'fr' ? 'État enregistré dans la base de données' : 'Machine status saved to the database')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not update machine status.'
      showToast(language === 'ar' ? `فشل حفظ حالة الآلة: ${message}` : language === 'fr' ? `Échec de mise à jour : ${message}` : `Could not save machine status: ${message}`)
      await reloadData()
    }
  }

  const updateSelectedStatus = async () => {
    const targets = machines.filter(machine => selected.includes(machine.id))
    if (!targets.length) return
    try {
      const requests = targets.map(machine => {
        const workshop = workshops.find(item => item.id === machine.workshopId)
        if (!workshop) throw new Error(`Workshop not found for ${machine.code}.`)
        return saveMachineRecord({ ...machine, status: bulkStatusValue }, workshop.name, machine.id)
      })
      const results = await Promise.allSettled(requests)
      const failed = results.find((result): result is PromiseRejectedResult => result.status === 'rejected')
      if (failed) throw failed.reason
      const saved = results.map(result => (result as PromiseFulfilledResult<Machine>).value)
      setMachines(current => current.map(machine => saved.find(item => item.id === machine.id) ?? machine))
      addActivity(t('bulkStatus'), `${saved.length}`)
      showToast(language === 'ar' ? `تم تحديث ${saved.length} آلة في قاعدة البيانات` : language === 'fr' ? `${saved.length} machines mises à jour` : `${saved.length} machines updated in the database`)
      setSelected([])
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Bulk status update failed.'
      showToast(language === 'ar' ? `فشل التحديث الجماعي: ${message}` : language === 'fr' ? `Échec de la mise à jour groupée : ${message}` : `Bulk update failed: ${message}`)
      await reloadData()
    }
  }

  const moveSelectedMachines = async () => {
    const destination = workshops.find(item => item.id === bulkWorkshopId)
    const targets = machines.filter(machine => selected.includes(machine.id))
    if (!destination || !targets.length) return
    try {
      const results = await Promise.allSettled(targets.map(machine => saveMachineRecord({ ...machine, workshopId: destination.id }, destination.name, machine.id)))
      const failed = results.find((result): result is PromiseRejectedResult => result.status === 'rejected')
      if (failed) throw failed.reason
      const saved = results.map(result => (result as PromiseFulfilledResult<Machine>).value)
      setMachines(current => current.map(machine => saved.find(item => item.id === machine.id) ?? machine))
      addActivity(t('moveWorkshop'), `${saved.length}`)
      showToast(language === 'ar' ? 'تم نقل الآلات وحفظ التغييرات' : language === 'fr' ? 'Machines déplacées et enregistrées' : 'Machines moved and saved to the database')
      setSelected([])
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Bulk workshop move failed.'
      showToast(language === 'ar' ? `فشل نقل الآلات: ${message}` : language === 'fr' ? `Échec du déplacement : ${message}` : `Could not move machines: ${message}`)
      await reloadData()
    }
  }

  const deleteSelectedMachines = async () => {
    const targets = machines.filter(machine => selected.includes(machine.id))
    if (!targets.length) return
    try {
      const results = await Promise.allSettled(targets.map(machine => deleteMachineRecord(machine.id)))
      const failed = results.find((result): result is PromiseRejectedResult => result.status === 'rejected')
      if (failed) throw failed.reason
      setMachines(current => current.filter(machine => !selected.includes(machine.id)))
      addActivity(language === 'ar' ? 'حذف آلات جماعي' : language === 'fr' ? 'Suppression groupée' : 'Bulk machine deletion', `${targets.length}`)
      showToast(language === 'ar' ? `تم حذف ${targets.length} آلة من قاعدة البيانات` : language === 'fr' ? `${targets.length} machines supprimées` : `${targets.length} machines deleted from the database`)
      setSelected([])
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Bulk delete failed.'
      showToast(language === 'ar' ? `فشل الحذف الجماعي: ${message}` : language === 'fr' ? `Échec de la suppression : ${message}` : `Bulk delete failed: ${message}`)
      await reloadData()
    }
  }
  return <section className="page-section">
    <PageHeader eyebrow={t('machines')} title={t('machines')} description={t('machinesDesc')} action={<><button className="button button-secondary" onClick={() => exportCsv()}><Download size={16} />{t('exportCsv')}</button><button className="button button-secondary" onClick={() => window.print()}><Printer size={16} />{t('printReport')}</button>{canEdit && <button className="button button-primary" onClick={openNew}><Plus size={16} />{t('addMachine')}</button>}</>} />
    <div className="metrics-grid compact-metrics"><MetricCard icon={<Gauge size={18} />} label={t('totalMachines')} value={counts.total} /><MetricCard icon={<CheckCircle2 size={18} />} label={t('working')} value={counts.working} tone="green" /><MetricCard icon={<Trash2 size={18} />} label={t('broken')} value={counts.broken} tone="red" /><MetricCard icon={<WrenchIcon />} label={t('inMaintenance')} value={counts.maintenance} tone="amber" /></div>
    <div className="panel machine-panel">
      <div className="panel-heading machine-toolbar"><div><h2>{t('machine')}</h2><p>{filtered.length} {t('all')}</p></div><div className="table-tools"><label className="search-field"><Search size={16} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder={t('search')} /></label><select aria-label={t('savedView')} value="" onChange={event => { const saved = savedViews.find(item => item.name === event.target.value); if (saved) { setQuery(saved.query); setWorkshopFilter(saved.workshopFilter); setStatusFilter(saved.statusFilter) } }}><option value="">{t('savedView')}</option>{savedViews.map(item => <option key={item.name} value={item.name}>{item.name}</option>)}</select><button className="button button-secondary save-view-button" onClick={saveCurrentView}>{t('saveView')}</button><select aria-label={t('workshop')} value={workshopFilter} onChange={event => setWorkshopFilter(event.target.value)}><option value="all">{t('allWorkshops')}</option>{workshops.map(workshop => <option key={workshop.id} value={workshop.id}>{localizedWorkshopName(workshop, language)}</option>)}</select><select aria-label={t('status')} value={statusFilter} onChange={event => setStatusFilter(event.target.value)}><option value="all">{t('allStatuses')}</option><option value="working">{t('working')}</option><option value="broken">{t('broken')}</option><option value="maintenance">{t('inMaintenance')}</option></select><div className="view-switch"><button className={view === 'table' ? 'active' : ''} onClick={() => setView('table')} aria-label={t('table')}><List size={16} /></button><button className={view === 'cards' ? 'active' : ''} onClick={() => setView('cards')} aria-label={t('cards')}><LayoutGrid size={16} /></button></div></div></div>
      {selected.length > 0 && <div className="bulk-bar"><span>{selected.length} {t('selected')}</span>{canEdit && <><select aria-label={t('status')} value={bulkStatusValue} onChange={event => setBulkStatusValue(event.target.value as MachineStatus)}><option value="working">{t('working')}</option><option value="broken">{t('broken')}</option><option value="maintenance">{t('inMaintenance')}</option></select><button className="button button-secondary" onClick={() => void updateSelectedStatus()}>{t('bulkStatus')}</button>{canMoveAcrossWorkshops && <><select aria-label={t('workshop')} value={bulkWorkshopId} onChange={event => setBulkWorkshopId(event.target.value)}>{workshops.map(workshop => <option key={workshop.id} value={workshop.id}>{localizedWorkshopName(workshop, language)}</option>)}</select><button className="button button-secondary" onClick={() => void moveSelectedMachines()}>{t('moveWorkshop')}</button></>}</>}<button className="button button-secondary" onClick={() => exportCsv(filtered.filter(machine => selected.includes(machine.id)))}><Download size={14} />{t('exportCsv')}</button>{canDelete && <button className="button button-danger" onClick={() => void deleteSelectedMachines()}><Trash2 size={14} />{t('deleteSelected')}</button>}</div>}
      {filtered.length === 0 ? <EmptyState title={t('noResults')} description={t('clearFilters')} /> : view === 'table' ? <div className="table-wrap"><table className="data-table"><thead><tr><th><input type="checkbox" aria-label={t('selectAll')} checked={selected.length === filtered.length && filtered.length > 0} onChange={event => setSelected(event.target.checked ? filtered.map(machine => machine.id) : [])} /></th><th><button className="sort-button" onClick={() => toggleSort('name')}>{t('machine')}</button></th><th><button className="sort-button" onClick={() => toggleSort('code')}>{t('code')}</button></th><th>{t('workshop')}</th><th><button className="sort-button" onClick={() => toggleSort('status')}>{t('status')}</button></th><th>{t('category')}</th><th><button className="sort-button" onClick={() => toggleSort('lastMaintenance')}>{t('lastMaintenance')}</button></th><th>{t('actions')}</th></tr></thead><tbody>{pageItems.map(machine => <tr key={machine.id}><td><input type="checkbox" aria-label={machine.code} checked={selected.includes(machine.id)} onChange={event => setSelected(current => event.target.checked ? [...current, machine.id] : current.filter(id => id !== machine.id))} /></td><td><div className="machine-cell"><span className="machine-avatar"><Gauge size={17} /></span><span><strong>{localizedMachineName(machine, language)}</strong><small>{machine.serialNumber || machine.manufacturer || '—'}</small></span></div></td><td><code>{machine.code}</code></td><td>{localizedWorkshopName(workshops.find(workshop => workshop.id === machine.workshopId) ?? { id: '', name: '—', nameFr: '—', nameEn: '—', manager: '', location: '' }, language)}</td><td>{canEdit ? <select className={`inline-status status-${machine.status}`} value={machine.status} aria-label={t('changeStatus')} onChange={event => updateStatus(machine, event.target.value as MachineStatus)}><option value="working">{t('working')}</option><option value="broken">{t('broken')}</option><option value="maintenance">{t('inMaintenance')}</option></select> : <StatusBadge status={machine.status} />}</td><td>{machine.category || '—'}</td><td>{formatDate(machine.lastMaintenance, language)}</td><td><div className="row-actions"><Link className="row-action" to={`/machines/${machine.id}`} aria-label={t('viewMachine')}><Eye size={15} /></Link>{canEdit && <button className="row-action" onClick={() => openEdit(machine)} aria-label={t('edit')}><Pencil size={15} /></button>}{canDelete && <button className="row-action danger" onClick={() => setDeleteTarget(machine)} aria-label={t('delete')}><Trash2 size={15} /></button>}</div></td></tr>)}</tbody></table></div> : <div className="machine-card-grid">{pageItems.map(machine => <article className="machine-card" key={machine.id}><div className="machine-card-head"><span className="machine-avatar"><Gauge size={19} /></span><StatusBadge status={machine.status} /></div><small>{machine.code}</small><h3>{localizedMachineName(machine, language)}</h3><p>{localizedWorkshopName(workshops.find(workshop => workshop.id === machine.workshopId) ?? { id: '', name: '—', nameFr: '—', nameEn: '—', manager: '', location: '' }, language)}</p><div className="machine-card-footer"><Link to={`/machines/${machine.id}`} className="text-link">{t('viewDetails')} →</Link>{canEdit && <div className="row-actions"><button className="row-action" onClick={() => openEdit(machine)} aria-label={t('edit')}><Pencil size={15} /></button>{canDelete && <button className="row-action danger" onClick={() => setDeleteTarget(machine)} aria-label={t('delete')}><Trash2 size={15} /></button>}</div>}</div></article>)}</div>}
      <div className="table-footer"><span>{t('all')} <strong>{filtered.length}</strong> / {machines.length}</span><div className="pagination"><button disabled={pageNumber <= 1} onClick={() => setPageNumber(value => Math.max(1, value - 1))}>{isRtl ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}{t('previous')}</button><span>{t('page')} {pageNumber} {t('of')} {totalPages}</span><button disabled={pageNumber >= totalPages} onClick={() => setPageNumber(value => Math.min(totalPages, value + 1))}>{t('next')}{isRtl ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}</button></div><button className="text-link" onClick={() => { setQuery(''); setWorkshopFilter('all'); setStatusFilter('all'); setSelected([]); setPageNumber(1) }}><X size={14} />{t('clearFilters')}</button></div>
    </div>
    {modalOpen && <Modal title={editing ? t('edit') : t('addMachine')} onClose={() => setModalOpen(false)} wide><form className="form-grid" onSubmit={saveMachine}>
      <label className="field-label">{t('code')}<input required value={form.code} onChange={event => setForm({ ...form, code: event.target.value })} /></label>
      <label className="field-label">{t('chooseWorkshop')}<select required value={form.workshopId} onChange={event => setForm({ ...form, workshopId: event.target.value })}><option value="">{t('chooseWorkshop')}</option>{workshops.map(workshop => <option key={workshop.id} value={workshop.id}>{localizedWorkshopName(workshop, language)}</option>)}</select></label>
      <label className="field-label">{t('arabicName')}<input required value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} /></label>
      <label className="field-label">{t('frenchName')}<input required value={form.nameFr} onChange={event => setForm({ ...form, nameFr: event.target.value })} /></label>
      <label className="field-label">{t('englishName')}<input required value={form.nameEn} onChange={event => setForm({ ...form, nameEn: event.target.value })} /></label>
      <label className="field-label">{t('status')}<select value={form.status} onChange={event => setForm({ ...form, status: event.target.value as MachineStatus })}><option value="working">{t('working')}</option><option value="broken">{t('broken')}</option><option value="maintenance">{t('inMaintenance')}</option></select></label>
      <label className="field-label">{t('category')}<input value={form.category} onChange={event => setForm({ ...form, category: event.target.value })} /></label>
      <label className="field-label">{t('serialNumber')}<input value={form.serialNumber} onChange={event => setForm({ ...form, serialNumber: event.target.value })} /></label>
      <label className="field-label">{t('manufacturer')}<input value={form.manufacturer} onChange={event => setForm({ ...form, manufacturer: event.target.value })} /></label>
      <label className="field-label">{t('installDate')}<input type="date" value={form.installDate} onChange={event => setForm({ ...form, installDate: event.target.value })} /></label>
      <label className="field-label">{t('lastMaintenance')}<input type="date" value={form.lastMaintenance} onChange={event => setForm({ ...form, lastMaintenance: event.target.value })} /></label>
      <label className="field-label">{t('nextMaintenance')}<input type="date" value={form.nextMaintenance} onChange={event => setForm({ ...form, nextMaintenance: event.target.value })} /></label>
      <label className="field-label form-full">{t('notes')}<textarea rows={3} value={form.notes} onChange={event => setForm({ ...form, notes: event.target.value })} /></label>
      {errors.length > 0 && <div className="form-errors" role="alert">{errors.map(error => <span key={error}>• {error}</span>)}</div>}
      <div className="form-actions form-full"><button type="button" className="button button-secondary" onClick={() => setModalOpen(false)}>{t('cancel')}</button><button type="submit" className="button button-primary">{t('save')}</button></div>
    </form></Modal>}
    {deleteTarget && <Modal title={t('delete')} onClose={() => setDeleteTarget(null)}><p>{t('confirmDelete')} <strong>{localizedMachineName(deleteTarget, language)}</strong></p><div className="form-actions"><button className="button button-secondary" onClick={() => setDeleteTarget(null)}>{t('cancel')}</button><button className="button button-danger" onClick={removeMachine}>{t('delete')}</button></div></Modal>}
  </section>
}
function WrenchIcon() { return <Wrench size={18} /> }
