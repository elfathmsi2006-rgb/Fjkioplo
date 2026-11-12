import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Activity, AlertTriangle, Archive, ClipboardCheck, Download, FileText, Plus, RefreshCw, ShieldCheck, Trash2, Wrench, Users, Pencil, X } from 'lucide-react'
import { useApp } from '../app/AppProvider'
import { csvRow } from '../utils/format'
import { cacheTasks, loadCachedTasks, queueTaskUpdate, syncPendingTaskUpdates } from '../utils/offlineTasks'
import { PageHeader } from '../components/ui/PageHeader'

type ModuleKey = 'orders' | 'preventive' | 'parts' | 'technicians' | 'safety' | 'documents'
type RecordRow = Record<string, unknown> & { id: number | string; has_log?: number | boolean }
type Field = { key: string; label: string; type?: 'text' | 'number' | 'date' | 'textarea' | 'url' | 'select'; required?: boolean; options?: { value: string; label: string }[] }
const API = ((import.meta.env.VITE_API_URL as string | undefined) || 'http://localhost:3000').replace(/\/+$/, '')
const modules: { key: ModuleKey; label: string; icon: typeof Wrench; fields: Field[] }[] = [
  { key: 'orders', label: 'أوامر العمل', icon: Wrench, fields: [
    { key: 'title', label: 'عنوان العطل / العمل', required: true }, { key: 'description', label: 'الوصف / التشخيص', type: 'textarea' },
    { key: 'machineId', label: 'الآلة', type: 'select' }, { key: 'workshopId', label: 'الورشة', type: 'select' }, { key: 'technicianId', label: 'الفني المسؤول', type: 'select' },
    { key: 'maintenanceType', label: 'نوع الصيانة', type: 'select', options: [{ value: 'CORRECTIVE', label: 'تصحيحية' }, { value: 'PREVENTIVE', label: 'وقائية' }] },
    { key: 'priority', label: 'الأولوية', type: 'select', options: [{ value: 'LOW', label: 'عادي' }, { value: 'MEDIUM', label: 'مرتفع' }, { value: 'HIGH', label: 'عاجل' }, { value: 'CRITICAL', label: 'حرج' }] },
    { key: 'status', label: 'الحالة', type: 'select', options: [{ value: 'PENDING', label: 'مفتوح' }, { value: 'IN_PROGRESS', label: 'قيد التنفيذ' }, { value: 'COMPLETED', label: 'مكتمل' }, { value: 'CANCELLED', label: 'ملغى' }] },
    { key: 'dueDate', label: 'موعد الإنجاز', type: 'date' },
  ] },
  { key: 'preventive', label: 'الصيانة الوقائية', icon: RefreshCw, fields: [
    { key: 'title', label: 'اسم الخطة', required: true }, { key: 'machineId', label: 'الآلة', type: 'select', required: true }, { key: 'frequencyDays', label: 'التكرار بالأيام', type: 'number', required: true }, { key: 'nextDueAt', label: 'الموعد القادم', type: 'date', required: true }, { key: 'description', label: 'قائمة الفحص / الوصف', type: 'textarea' }, { key: 'active', label: 'الحالة', type: 'select', options: [{ value: '1', label: 'نشطة' }, { value: '0', label: 'موقوفة' }] },
  ] },
  { key: 'parts', label: 'قطع الغيار', icon: Archive, fields: [
    { key: 'name', label: 'اسم القطعة', required: true }, { key: 'sku', label: 'مرجع / SKU' }, { key: 'category', label: 'الفئة' }, { key: 'location', label: 'مكان التخزين' }, { key: 'stock', label: 'الكمية الافتتاحية', type: 'number' }, { key: 'minimumStock', label: 'حد إعادة الطلب', type: 'number' }, { key: 'unitCost', label: 'سعر الوحدة (دج)', type: 'number' },
  ] },
  { key: 'technicians', label: 'الفنيون', icon: Users, fields: [
    { key: 'name', label: 'الاسم' }, { key: 'skill', label: 'التخصص' }, { key: 'shift', label: 'الوردية' }, { key: 'phone', label: 'الهاتف المهني' }, { key: 'attendance', label: 'الحضور', type: 'select', options: [{ value: 'present', label: 'حاضر' }, { value: 'absent', label: 'غائب' }] }, { key: 'active', label: 'الحالة', type: 'select', options: [{ value: '1', label: 'نشط' }, { value: '0', label: 'غير نشط' }] },
  ] },
  { key: 'safety', label: 'السلامة والفحوصات', icon: ShieldCheck, fields: [
    { key: 'title', label: 'الفحص / الإجراء', required: true }, { key: 'machineId', label: 'الآلة', type: 'select' }, { key: 'inspectionDate', label: 'تاريخ الفحص', type: 'date', required: true }, { key: 'inspector', label: 'المفتش' }, { key: 'result', label: 'النتيجة', type: 'select', options: [{ value: 'COMPLIANT', label: 'مطابق' }, { value: 'OBSERVATION', label: 'ملاحظة' }, { value: 'HAZARD', label: 'خطر — يلزم الإيقاف' }] }, { key: 'notes', label: 'ملاحظات وإجراءات', type: 'textarea' },
  ] },
  { key: 'documents', label: 'وثائق الآلات', icon: FileText, fields: [
    { key: 'title', label: 'اسم الوثيقة', required: true }, { key: 'machineId', label: 'الآلة', type: 'select' }, { key: 'documentType', label: 'نوع الوثيقة', type: 'select', options: [{ value: 'OPERATING_MANUAL', label: 'دليل تشغيل' }, { value: 'ELECTRICAL_DIAGRAM', label: 'مخطط كهربائي' }, { value: 'MAINTENANCE_MANUAL', label: 'دليل صيانة' }, { value: 'CERTIFICATE', label: 'شهادة' }, { value: 'OTHER', label: 'أخرى' }] }, { key: 'referenceCode', label: 'رقم / مرجع الوثيقة' }, { key: 'fileLocation', label: 'رابط الملف أو مساره' }, { key: 'notes', label: 'ملاحظات', type: 'textarea' },
  ] },
]
const endpoint: Record<ModuleKey, string> = { orders: '/api/tasks', preventive: '/api/operations/preventive-plans', parts: '/api/operations/spare-parts', technicians: '/api/technicians', safety: '/api/operations/safety-inspections', documents: '/api/operations/machine-documents' }
const parseList = (body: Record<string, unknown>): RecordRow[] => Array.isArray(body.data) ? body.data as RecordRow[] : Array.isArray(body.technicians) ? body.technicians as RecordRow[] : []

export default function OperationsHubPage() {
  const { language, machines, workshops, profile, showToast } = useApp()
  const [searchParams] = useSearchParams()
  const [active, setActive] = useState<ModuleKey>('orders')
  const [data, setData] = useState<Record<ModuleKey, RecordRow[]>>({ orders: [], preventive: [], parts: [], technicians: [], safety: [], documents: [] })
  const [form, setForm] = useState<Record<string, string>>({})
  const [editing, setEditing] = useState<RecordRow | null>(null)
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list')
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [tabErrors, setTabErrors] = useState<Partial<Record<ModuleKey, string>>>({})
  const [executive, setExecutive] = useState<Record<string, unknown> | null>(null)
  const tx = (en: string, fr: string, ar: string) => language === 'ar' ? ar : language === 'fr' ? fr : en
  const canEditOrders = profile?.role === 'admin' || profile?.role === 'production_chief'
  const canManage = profile?.role === 'admin' || profile?.role === 'production_chief' || profile?.role === 'workshop_head'
  const current = modules.find(item => item.key === active) ?? modules[0]
  // Technician name comes from users.full_name via the GET join; backend PUT /api/technicians/:id never persists it, so keep it out of the form/payload (table + CSV still show it).
  const formFields = active === 'technicians' ? current.fields.filter(field => field.key !== 'name') : current.fields
  const request = useCallback(async (path: string, init: RequestInit = {}) => {
    const response = await fetch(`${API}${path}`, { ...init, credentials: 'include', headers: { ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...init.headers } })
    const body = await response.json().catch(() => ({})) as Record<string, unknown>
    if (!response.ok || body.success === false) throw Object.assign(new Error(String(body.message || `Request failed (${response.status}).`)), { status: response.status })
    return body
  }, [language])
  const refresh = useCallback(async () => {
    setLoading(true); setError(''); setTabErrors({})
    try {
      await syncPendingTaskUpdates(API)
      const keys = modules.map(m => m.key)
      // Each tab fetch settles independently: one failing endpoint must never blank the other tabs.
      const results = await Promise.all(keys.map(async key => {
        try {
          const body = await request(endpoint[key])
          return { key, list: parseList(body), error: null }
        } catch (e) {
          // Backend ALLOWED_ROLES is the permission authority for the technicians list: a 403 just means an empty tab, shown silently (no data leak — backend still rejects non-allowed roles).
          if (key === 'technicians' && (e as { status?: number }).status === 403) return { key, list: [] as RecordRow[], error: null }
          return { key, list: null, error: e instanceof Error ? e.message : 'Failed to load records.' }
        }
      }))
      const merged: Partial<Record<ModuleKey, RecordRow[]>> = {}
      const errors: Partial<Record<ModuleKey, string>> = {}
      for (const result of results) {
        if (result.list !== null) merged[result.key] = result.list
        // Orders failures use the global error banner + IndexedDB fallback below, so they are not duplicated as a per-tab message.
        if (result.error !== null && result.key !== 'orders') errors[result.key] = result.error
      }
      setData(old => ({ ...old, ...merged }))
      setTabErrors(errors)
      const orders = results.find(result => result.key === 'orders')
      if (orders?.list) void cacheTasks(orders.list as Record<string, unknown>[])
      if (orders?.error) {
        const cached = await loadCachedTasks().catch(() => [])
        if (cached.length) setData(old => ({ ...old, orders: cached as RecordRow[] }))
        setError(orders.error)
      }
    } catch (e) {
      const cached = await loadCachedTasks().catch(() => [])
      if (cached.length) setData(old => ({ ...old, orders: cached as RecordRow[] }))
      setError(e instanceof Error ? e.message : 'Failed to load Operations Hub data.')
    }
    finally { setLoading(false) }
  }, [request])
  useEffect(() => { const tab = searchParams.get('tab'); if (tab && modules.some(m => m.key === tab)) setActive(tab as ModuleKey) }, [searchParams])
  useEffect(() => { void refresh() }, [refresh])
  useEffect(() => { void fetch(`${API}/api/operations/executive-summary`, { credentials: 'include' }).then(r => r.json()).then(b => { if (b?.success) setExecutive(b.data) }).catch(() => undefined) }, [])
  useEffect(() => { setForm({}); setEditing(null); setShowForm(false) }, [active])

  const rows = useMemo(() => data[active].filter(row => Object.values(row).some(value => String(value ?? '').toLowerCase().includes(search.toLowerCase()))), [data, active, search])
  const openOrders = data.orders.filter(row => !['COMPLETED', 'CANCELLED'].includes(String(row.status))).length
  const overdueOrders = data.orders.filter(row => row.due_date && new Date(String(row.due_date)) < new Date() && !['COMPLETED', 'CANCELLED'].includes(String(row.status))).length
  const urgentOrders = data.orders.filter(row => ['HIGH', 'CRITICAL'].includes(String(row.priority)) && !['COMPLETED', 'CANCELLED'].includes(String(row.status))).length
  const lowStock = data.parts.filter(row => Number(row.stock ?? row.stock_quantity ?? 0) <= Number(row.minimum_stock ?? 0)).length
  const overdue = data.preventive.filter(row => Number(row.active) === 1 && String(row.next_due_at ?? '').slice(0, 10) < new Date().toISOString().slice(0, 10)).length
  const technicianWorkload = data.technicians.map(tech => ({ id: tech.id, name: String(tech.name || tech.id), open: data.orders.filter(row => String(row.technician_id) === String(tech.id) && !['COMPLETED', 'CANCELLED'].includes(String(row.status))).length })).sort((a, b) => b.open - a.open)
  const myTechnician = data.technicians.find(tech => String(tech.userId) === String(profile?.id))
  const myOrders = myTechnician ? data.orders.filter(row => String(row.technician_id) === String(myTechnician.id) && !['COMPLETED', 'CANCELLED'].includes(String(row.status))) : []
  const fieldOptions = (field: Field) => field.key === 'machineId' ? machines.map(m => ({ value: String(m.id), label: `${m.code} · ${m.name}` })) : field.key === 'workshopId' ? workshops.map(w => ({ value: String(w.id), label: w.name })) : field.key === 'technicianId' ? data.technicians.map(t => ({ value: String(t.id), label: String(t.name) })) : field.options ?? []
  const openCreate = () => { setEditing(null); setForm(active === 'orders' ? { maintenanceType: 'CORRECTIVE', priority: 'MEDIUM', status: 'PENDING' } : active === 'preventive' ? { active: '1' } : active === 'safety' ? { result: 'OBSERVATION', inspectionDate: new Date().toISOString().slice(0, 10) } : active === 'documents' ? { documentType: 'OTHER' } : {}); setShowForm(true) }
  const openEdit = (row: RecordRow) => { setEditing(row); const next: Record<string, string> = {}; formFields.forEach(field => { const raw = field.key === 'maintenanceType' ? row.maintenance_type : field.key === 'dueDate' ? row.due_date : field.key === 'nextDueAt' ? row.next_due_at : field.key === 'inspectionDate' ? row.inspection_date : field.key === 'machineId' ? row.machine_id : field.key === 'technicianId' ? row.technician_id : field.key === 'workshopId' ? row.workshop_id : field.key === 'minimumStock' ? row.minimum_stock : field.key === 'unitCost' ? row.unit_cost : field.key === 'attendance' ? row.attendance : field.key === 'active' ? row.active : field.key === 'shift' ? row.shift : field.key === 'fileLocation' ? row.file_location : field.key === 'documentType' ? row.document_type : field.key === 'referenceCode' ? row.reference_code : row[field.key]; next[field.key] = raw == null ? '' : String(raw).slice(0, field.type === 'date' ? 10 : undefined) }); setForm(next); setShowForm(true) }
  const save = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true)
    try {
      let payload: Record<string, unknown> = { ...form }
      if (active === 'orders') { payload = { ...payload, machineId: form.machineId ? Number(form.machineId) : null, technicianId: form.technicianId ? Number(form.technicianId) : null, workshopId: form.workshopId ? Number(form.workshopId) : null, dueDate: form.dueDate || null } }
      if (active === 'preventive') payload = { ...payload, machineId: Number(form.machineId), frequencyDays: Number(form.frequencyDays), active: form.active !== '0' }
      if (active === 'parts') payload = { ...payload, stock: Number(form.stock || 0), minimumStock: Number(form.minimumStock || 0), unitCost: Number(form.unitCost || 0) }
      if (active === 'safety') payload = { ...payload, machineId: form.machineId ? Number(form.machineId) : null }
      if (active === 'documents') payload = { ...payload, machineId: form.machineId ? Number(form.machineId) : null }
      if (active === 'technicians') payload = { ...payload, active: form.active !== '0', attendance: form.attendance || 'present' }
      const path = `${endpoint[active]}${editing ? `/${editing.id}` : ''}`
      const method = active === 'technicians' ? 'PUT' : editing ? 'PUT' : 'POST'
      if (!navigator.onLine && active === 'orders') {
        await queueTaskUpdate({ taskId: editing?.id ?? 'new', method: method as 'PUT' | 'POST', path, payload })
        showToast(tx('Saved offline. Will sync when online.', 'Enregistre hors ligne. Synchronisation a la reconnexion.', 'تم الحفظ دون اتصال؛ ستتم المزامنة عند الاتصال.'))
        setShowForm(false); setEditing(null); setForm({}); return
      }
      if (active === 'technicians' && !editing) throw new Error(tx('Technician accounts are created from User Management. You can update their operational profile here.', 'Les comptes techniciens sont créés dans Gestion des utilisateurs.', 'يتم إنشاء حسابات الفنيين من إدارة المستخدمين؛ يمكنك تعديل بياناتهم التشغيلية هنا.'))
      await request(path, { method, body: JSON.stringify(payload) })
      showToast(tx('Saved successfully to the database.', 'Enregistré dans la base de données.', 'تم الحفظ بنجاح في قاعدة البيانات.'))
      setShowForm(false); setEditing(null); setForm({}); await refresh()
    } catch (e) { showToast(e instanceof Error ? e.message : 'Save failed.') }
    finally { setSaving(false) }
  }
  const remove = async (row: RecordRow) => {
    if (!window.confirm(tx('Delete this record from the database?', 'Supprimer cet enregistrement de la base de données ?', 'هل تريد حذف هذا السجل من قاعدة البيانات؟'))) return
    try { await request(`${endpoint[active]}/${row.id}`, { method: 'DELETE' }); showToast(tx('Record deleted.', 'Enregistrement supprimé.', 'تم حذف السجل.')); await refresh() }
    catch (e) { showToast(e instanceof Error ? e.message : 'Delete failed.') }
  }
  const escalate = async (row: RecordRow) => {
    try { await request(`/api/tasks/${row.id}/escalate`, { method: 'POST' }); showToast(tx('Work order escalated.', 'Ordre escaladé.', 'تم تصعيد أمر العمل.')); await refresh() }
    catch (e) { showToast(e instanceof Error ? e.message : 'Escalation failed.') }
  }
  const exportCsv = () => {
    const fields = current.fields.map(field => field.key)
    const csv = [fields, ...rows.map(row => fields.map(key => String(row[key] ?? '')))].map(line => csvRow(line)).join('\r\n')
    const url = URL.createObjectURL(new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8' })); const a = document.createElement('a'); a.href = url; a.download = `spa-el-fath-${active}.csv`; a.click(); URL.revokeObjectURL(url)
  }
  const valueFor = (row: RecordRow, field: Field) => {
    const key = field.key === 'machineId' ? 'machine_code' : field.key === 'technicianId' ? 'technician_name' : field.key === 'workshopId' ? 'workshop_name' : field.key === 'nextDueAt' ? 'next_due_at' : field.key === 'inspectionDate' ? 'inspection_date' : field.key === 'fileLocation' ? 'file_location' : field.key === 'documentType' ? 'document_type' : field.key === 'referenceCode' ? 'reference_code' : field.key === 'minimumStock' ? 'minimum_stock' : field.key === 'unitCost' ? 'unit_cost' : field.key === 'dueDate' ? 'due_date' : field.key === 'attendance' ? 'attendance' : field.key === 'shift' ? 'shift' : field.key
    const value = row[key] ?? row[field.key]
    if (field.key === 'priority') return ({ LOW: 'عادي', MEDIUM: 'مرتفع', HIGH: 'عاجل', CRITICAL: 'حرج' } as Record<string, string>)[String(value)] ?? value
    if (field.key === 'status') return ({ PENDING: 'مفتوح', IN_PROGRESS: 'قيد التنفيذ', COMPLETED: 'مكتمل', CANCELLED: 'ملغى' } as Record<string, string>)[String(value)] ?? value
    if (field.key === 'result') return ({ COMPLIANT: 'مطابق', OBSERVATION: 'ملاحظة', HAZARD: 'خطر' } as Record<string, string>)[String(value)] ?? value
    return value
  }

  return <section className="page-section">
    <PageHeader eyebrow="SPA EL FATH · OPERATIONS" title={tx('Operations & maintenance hub', 'Centre des opérations et de maintenance', 'مركز العمليات والصيانة')} description={tx('All operational records in this hub are loaded from and saved to the central database.', 'Tous les enregistrements sont stockés dans la base centrale.', 'جميع سجلات هذا المركز تُحمّل وتُحفظ في قاعدة البيانات المركزية.')} action={<button className="button button-secondary" onClick={() => void refresh()}><RefreshCw size={16}/>{tx('Refresh', 'Actualiser', 'تحديث')}</button>} />
    {executive && <div className="metrics-grid compact-metrics">
      <div className="metric-card"><span className="metric-icon"><Wrench size={18}/></span><span className="metric-label">{tx('Available machines','Machines disponibles','آلات متاحة')}</span><strong className="metric-value">{String((executive.machines as Record<string,unknown>)?.available ?? 0)}</strong></div>
      <div className="metric-card"><span className="metric-icon"><Wrench size={18}/></span><span className="metric-label">{tx('Open work orders','Ordres ouverts','أوامر العمل المفتوحة')}</span><strong className="metric-value">{String((executive.maintenance as Record<string,unknown>)?.openWorkOrders ?? 0)}</strong></div>
      <div className="metric-card"><span className="metric-icon"><Archive size={18}/></span><span className="metric-label">{tx('Low stock parts','Pièces en rupture','قطع منخفضة المخزون')}</span><strong className="metric-value">{String((executive.inventory as Record<string,unknown>)?.lowStockParts ?? 0)}</strong></div>
      <div className="metric-card"><span className="metric-icon"><ShieldCheck size={18}/></span><span className="metric-label">{tx('Safety hazards','Risques sécurité','مخاطر سلامة')}</span><strong className="metric-value">{String((executive.safety as Record<string,unknown>)?.hazards ?? 0)}</strong></div>
    </div>}
    <div className="metrics-grid compact-metrics">
      <div className="metric-card"><span className="metric-icon"><Wrench size={18}/></span><span className="metric-label">{tx('Open work orders','Ordres ouverts','أوامر العمل المفتوحة')}</span><strong className="metric-value">{openOrders}</strong></div>
<div className="metric-card"><span className="metric-icon"><AlertTriangle size={18}/></span><span className="metric-label">{tx('Overdue work orders','Ordres en retard','أوامر عمل متأخرة')}</span><strong className="metric-value">{overdueOrders}</strong></div>
      <div className="metric-card"><span className="metric-icon"><AlertTriangle size={18}/></span><span className="metric-label">{tx('Urgent / critical','Urgent / critique','عاجل / حرج')}</span><strong className="metric-value">{urgentOrders}</strong></div>
      <div className="metric-card"><span className="metric-icon"><Archive size={18}/></span><span className="metric-label">{tx('Parts below minimum','Pièces sous minimum','قطع تحت الحد الأدنى')}</span><strong className="metric-value">{lowStock}</strong></div>
      <div className="metric-card"><span className="metric-icon"><ClipboardCheck size={18}/></span><span className="metric-label">{tx('Overdue preventive plans','Préventif en retard','خطط وقائية متأخرة')}</span><strong className="metric-value">{overdue}</strong></div>
    </div>
    <div className="panel operations-panel">
      <div className="operations-tabs">{modules.map(module => { const Icon = module.icon; return <button key={module.key} className={`operations-tab ${active === module.key ? 'active' : ''}`} onClick={() => { setActive(module.key); setSearch('') }}><Icon size={16}/><span>{module.label}</span><b>{data[module.key].length}</b></button> })}</div>
      <div className="panel-heading operations-toolbar"><div><h2>{current.label}</h2><p>{rows.length} {tx('database records','enregistrements','سجل في قاعدة البيانات')}</p></div><div className="table-tools">{active === 'orders' && <button className="button button-secondary" onClick={() => setViewMode(viewMode === 'list' ? 'kanban' : 'list')}>{viewMode === 'list' ? tx('Kanban','Kanban','لوحة Kanban') : tx('List','Liste','قائمة')}</button>}<input value={search} onChange={event => setSearch(event.target.value)} placeholder={tx('Search records…','Rechercher…','بحث في السجلات…')} aria-label="Search"/><button className="button button-secondary" onClick={exportCsv}><Download size={15}/> CSV</button>{(active === 'orders' ? canManage : active === 'technicians' ? false : canManage) && <button className="button button-primary" onClick={openCreate}><Plus size={16}/>{tx('Add','Ajouter','إضافة')}</button>}</div></div>
      {loading && <p className="operations-inline-message">{tx('Loading from database…','Chargement…','جارٍ التحميل من قاعدة البيانات…')}</p>}
      {error && <p role="alert" className="operations-inline-message">{error}</p>}
      {tabErrors[active] && <p role="alert" className="operations-inline-message">{tabErrors[active]}</p>}
      {showForm && <form className="form-grid operations-form" onSubmit={event => void save(event)}>{active === 'technicians' && editing && <p className="form-full">{String(editing.name)} · {String(editing.email ?? '')}</p>}{formFields.filter(field => !(active === 'parts' && editing && field.key === 'stock')).map(field => <label className={`field-label ${field.type === 'textarea' ? 'form-full' : ''}`} key={field.key}>{field.label}{field.type === 'select' ? <select required={field.required} value={form[field.key] ?? ''} onChange={event => setForm(old => ({ ...old, [field.key]: event.target.value }))}><option value="">—</option>{fieldOptions(field).map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select> : field.type === 'textarea' ? <textarea rows={3} required={field.required} value={form[field.key] ?? ''} onChange={event => setForm(old => ({ ...old, [field.key]: event.target.value }))}/> : <input type={field.type ?? 'text'} required={field.required} min={field.type === 'number' ? 0 : undefined} value={form[field.key] ?? ''} onChange={event => setForm(old => ({ ...old, [field.key]: event.target.value }))}/>}</label>)}<div className="form-actions form-full"><button type="button" className="button button-secondary" onClick={() => { setShowForm(false); setEditing(null) }}><X size={15}/>{tx('Cancel','Annuler','إلغاء')}</button><button type="submit" className="button button-primary" disabled={saving}>{saving ? tx('Saving…','Enregistrement…','جارٍ الحفظ…') : tx('Save to database','Enregistrer','حفظ في قاعدة البيانات')}</button></div></form>}
      {!loading && rows.length === 0 ? <div className="operations-empty"><FileText size={26}/><strong>{tx('No database records','Aucun enregistrement','لا توجد سجلات في قاعدة البيانات')}</strong><span>{tx('Add a record or check that the required database migration has been applied.','Ajoutez un enregistrement ou vérifiez les migrations.','أضف سجلاً أو تحقق من تطبيق تحديثات قاعدة البيانات المطلوبة.')}</span></div> : active === 'orders' && viewMode === 'kanban' ? <div className="kanban-board">{['PENDING','WAITING_PARTS','IN_PROGRESS','COMPLETED'].map(status => <div className="kanban-column" key={status}><h3>{({PENDING:'مفتوح',WAITING_PARTS:'بانتظار قطع',IN_PROGRESS:'قيد التنفيذ',COMPLETED:'مكتمل'} as Record<string,string>)[status]}</h3>{rows.filter(row => String(row.status) === status).map(row => <div className="kanban-card" key={row.id}><strong>{String(row.title)}</strong><span>{String(row.priority)}</span><small>{row.due_date ? String(row.due_date).slice(0,10) : '—'}</small>{row.has_log && <span className="kanban-log-badge" title={tx('Has maintenance log','A un rapport de maintenance','له تقرير صيانة')}>📋</span>}</div>)}</div>)}</div> : <div className="operations-table-wrap"><table className="operations-table"><thead><tr>{current.fields.map(field => <th key={field.key}>{field.label}</th>)}{active === 'orders' && <th>{tx('Log','تقرير','تقرير')}</th>}<th>{tx('Actions','Actions','الإجراءات')}</th></tr></thead><tbody>{rows.map(row => <tr key={row.id}>{current.fields.map(field => <td key={field.key}>{field.key === 'fileLocation' && /^https:\/\//i.test(String(valueFor(row, field) ?? '')) ? <a href={String(valueFor(row, field))} target="_blank" rel="noreferrer">{tx('Open file','Ouvrir','فتح الملف')}</a> : String(valueFor(row, field) ?? '—') || '—'}</td>)}{active === 'orders' && <td>{row.has_log ? <span className="log-badge" title={tx('Has submitted maintenance log','A un rapport de maintenance soumis','له تقرير صيانة مقدم')}>📋</span> : '—'}</td>}<td><div className="table-tools">{active === 'orders' && canEditOrders && row.due_date != null && new Date(String(row.due_date)) < new Date() && !['COMPLETED','CANCELLED'].includes(String(row.status)) && <button className="icon-button" title={tx('Escalate','Escalader','تصعيد')} onClick={() => void escalate(row)}><AlertTriangle size={15}/></button>}{(active === 'orders' || active === 'technicians' ? canEditOrders : canManage) && <button className="icon-button" title={tx('Edit','Modifier','تعديل')} onClick={() => openEdit(row)}><Pencil size={15}/></button>}{(active !== 'technicians' && (active === 'orders' ? canEditOrders : canManage)) && <button className="icon-button operations-delete" title={tx('Delete','Supprimer','حذف')} onClick={() => void remove(row)}><Trash2 size={15}/></button>}</div></td></tr>)}</tbody></table></div>}
    </div>
    <section className="technician-tracker panel"><div className="panel-heading"><div><h2>{tx('Technician availability','Disponibilité des techniciens','توفر الفنيين')}</h2><p>{tx('Status and assignments from database records','Statuts et affectations depuis la base','الحالة والتكليفات من قاعدة البيانات')}</p></div><span className="panel-icon"><Activity size={18}/></span></div><div className="technician-status-summary"><div className="technician-summary available"><span>{tx('Available','Disponible','متاح')}</span><strong>{data.technicians.filter(t => t.attendance !== 'absent' && Number(t.active) !== 0 && t.availabilityStatus !== 'busy').length}</strong></div><div className="technician-summary absent"><span>{tx('Absent','Absent','غائب')}</span><strong>{data.technicians.filter(t => t.attendance === 'absent' || Number(t.active) === 0).length}</strong></div><div className="technician-summary busy"><span>{tx('Busy','Occupé','مشغول')}</span><strong>{data.technicians.filter(t => t.availabilityStatus === 'busy').length}</strong></div></div></section>
    <section className="panel"><div className="panel-heading"><div><h2>{tx('Technician workload','Charge des techniciens','عبء العمل للفنيين')}</h2><p>{tx('Open work orders assigned to each technician','Ordres ouverts par technicien','أوامر العمل المفتوحة لكل فني')}</p></div></div><div className="operations-table-wrap"><table className="operations-table"><thead><tr><th>{tx('Technician','Technicien','الفني')}</th><th>{tx('Open work orders','Ordres ouverts','أوامر العمل المفتوحة')}</th></tr></thead><tbody>{technicianWorkload.map(item => <tr key={String(item.id)}><td>{item.name}</td><td>{item.open}</td></tr>)}</tbody></table></div></section>
    {myOrders.length > 0 && <section className="panel"><div className="panel-heading"><div><h2>{tx('My assigned work orders','Mes ordres assignés','أوامر العمل المخصصة لي')}</h2><p>{tx('Mobile-friendly task list for the signed-in technician','Liste mobile des tâches assignées','قائمة مهام مناسبة للهاتف للفني')}</p></div></div><div className="operations-table-wrap"><table className="operations-table"><thead><tr><th>{tx('Title','Titre','العنوان')}</th><th>{tx('Priority','Priorité','الأولوية')}</th><th>{tx('Due','Échéance','الموعد')}</th><th>{tx('Status','Statut','الحالة')}</th></tr></thead><tbody>{myOrders.map(row => <tr key={String(row.id)}><td>{String(row.title)}</td><td>{String(row.priority)}</td><td>{row.due_date ? String(row.due_date).slice(0,10) : '—'}</td><td>{String(row.status)}</td></tr>)}</tbody></table></div></section>}
    <div className="operations-notice"><ShieldCheck size={18}/><div><strong>{tx('Database persistence','Persistance de la base','الحفظ في قاعدة البيانات')}</strong><p>{tx('No Operations Hub business records are stored in browser storage. Work orders can be edited and deleted only by role ID 1 or 2. Completed work orders are protected as maintenance history. Technician accounts are managed in User Management; their operational profiles are edited here. Document records store a durable URL/server path; configure managed file storage separately for binary uploads.','Aucun enregistrement opérationnel n’est stocké localement.','لا تُحفظ سجلات العمل في تخزين المتصفح. تعديل وحذف أوامر العمل متاحان للدورين 1 و2 فقط. أوامر العمل المكتملة محمية كسجل صيانة. حسابات الفنيين تُدار من إدارة المستخدمين، وتُعدل بياناتهم التشغيلية هنا. الوثائق تحفظ رابطاً أو مساراً دائماً؛ رفع الملفات الفعلية يحتاج إعداد تخزين ملفات.')}</p></div></div>
  </section>
}
