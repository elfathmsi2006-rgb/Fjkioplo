import { useEffect, useMemo, useState } from 'react'
import { Activity, Download, RefreshCw, Search, ShieldCheck, ChevronDown, ChevronUp } from 'lucide-react'
import { useApp } from '../app/AppProvider'
import { useTranslation } from '../hooks/useTranslation'
import { PageHeader } from '../components/ui/PageHeader'
import { downloadText, csvRow } from '../utils/format'

type AuditEvent = { id: number; table_name: string; record_id: string; action: string; actor_id: string | null; created_at: string; old_data: unknown; new_data: unknown }
const pretty = (value: unknown) => value == null ? '—' : JSON.stringify(value, null, 2)
export default function AuditTrailPage() {
  const { language, role } = useApp()
  const { t } = useTranslation()
  const [events, setEvents] = useState<AuditEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [actionFilter, setActionFilter] = useState('all')
  const [tableFilter, setTableFilter] = useState('all')
  const [expanded, setExpanded] = useState<number | null>(null)
  const [limit, setLimit] = useState(250)
  const isAr = language === 'ar'
  const words = isAr ? { refresh:'تحديث', search:'ابحث في السجل أو المعرّف أو المستخدم', all:'كل الأحداث', insert:'إنشاء', update:'تعديل', delete:'حذف', allTables:'كل أنواع السجلات', export:'تصدير CSV', details:'تفاصيل التغيير', before:'قبل التغيير', after:'بعد التغيير', actor:'معرّف المستخدم', noResults:'لا توجد أحداث مطابقة للفلاتر', loadMore:'تحميل المزيد', audit:'سجل التدقيق غير متاح' } : language === 'fr' ? { refresh:'Actualiser', search:'Rechercher dans le journal', all:'Toutes les actions', insert:'Création', update:'Modification', delete:'Suppression', allTables:'Toutes les tables', export:'Exporter CSV', details:'Détails du changement', before:'Avant', after:'Après', actor:'ID utilisateur', noResults:'Aucun événement correspondant', loadMore:'Charger plus', audit:'Journal indisponible' } : { refresh:'Refresh', search:'Search events, record IDs or users', all:'All actions', insert:'Create', update:'Update', delete:'Delete', allTables:'All record types', export:'Export CSV', details:'Change details', before:'Before change', after:'After change', actor:'User ID', noResults:'No events match these filters', loadMore:'Load more', audit:'Audit trail unavailable' }
  const load = async () => {
    setLoading(true); setError('')
    try {
      const apiBase = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, '') || 'http://localhost:3000'
      const response = await fetch(`${apiBase}/api/operations/audit-events?limit=${limit}`, { credentials: 'include' })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.message || words.audit)
      setEvents((result.data ?? []).map((row: Record<string, unknown>) => {
        const details = row.details ?? null
        return { id: Number(row.id), table_name: String(row.entity_type ?? 'system'), record_id: String(row.entity_id ?? '—'), action: String(row.action ?? 'EVENT'), actor_id: row.actor_user_id == null ? null : String(row.actor_user_id), created_at: String(row.created_at), old_data: row.old_data ?? null, new_data: details }
      }))
    } catch (queryError) { setError(queryError instanceof Error ? queryError.message : words.audit); setEvents([]) }
    finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [limit])
  const filtered = useMemo(() => events.filter(e => {
    const search = query.trim().toLowerCase()
    const searchable = [e.table_name, e.record_id, e.actor_id ?? '', e.action, pretty(e.old_data), pretty(e.new_data)].join(' ').toLowerCase()
    return (!search || searchable.includes(search)) && (actionFilter === 'all' || e.action === actionFilter) && (tableFilter === 'all' || e.table_name === tableFilter)
  }), [events, query, actionFilter, tableFilter])
  const tables = Array.from(new Set(events.map(e => e.table_name))).sort()
  const dateLabel = (value: string) => new Intl.DateTimeFormat(language === 'ar' ? 'ar-DZ' : language === 'fr' ? 'fr-DZ' : 'en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Algiers' }).format(new Date(value))
  const tableLabel = (value: string) => ({ maintenance_logs: t('maintenance'), machines: t('machines'), workshops: t('workshops'), work_orders: isAr ? 'أوامر العمل' : 'Work orders', spare_parts: isAr ? 'قطع الغيار' : 'Spare parts' }[value] ?? value)
  const exportCsv = () => {
    const rows = [['id','created_at','action','table','record_id','actor_id','old_data','new_data'], ...filtered.map(e => [e.id,e.created_at,e.action,e.table_name,e.record_id,e.actor_id ?? '',pretty(e.old_data),pretty(e.new_data)])]
    downloadText('spa-el-fath-audit-trail.csv', rows.map(row => csvRow(row, ';')).join('\r\n'), 'text/csv;charset=utf-8')
  }
  return <section className="page-section">
    <PageHeader eyebrow={t('auditTrail')} title={isAr ? 'سجل التدقيق الشامل' : language === 'fr' ? 'Journal d’audit complet' : 'Complete audit trail'} description={isAr ? 'تتبّع من أنشأ أو عدّل أو حذف السجلات، مع مقارنة القيم قبل التغيير وبعده.' : 'Trace who created, changed or deleted records, including before/after snapshots.'} action={<><button className="button button-secondary" onClick={exportCsv} disabled={!filtered.length}><Download size={16}/>{words.export}</button><button className="button button-primary" onClick={() => void load()}><RefreshCw size={16}/>{words.refresh}</button></>} />
    <div className="metrics-grid compact-metrics"><article className="metric-card"><div className="metric-icon tone-blue"><ShieldCheck size={19}/></div><div className="metric-copy"><span>{t('auditTrail')}</span><strong>{events.length}</strong><small>{isAr ? 'الأحداث المحمّلة' : 'Loaded events'}</small></div></article><article className="metric-card"><div className="metric-icon tone-green"><Activity size={19}/></div><div className="metric-copy"><span>{isAr ? 'أنواع السجلات' : 'Record types'}</span><strong>{tables.length}</strong><small>{isAr ? 'جداول مختلفة' : 'Distinct tables'}</small></div></article><article className="metric-card"><div className="metric-icon tone-amber"><Activity size={19}/></div><div className="metric-copy"><span>{isAr ? 'نتائج الفلترة' : 'Filtered results'}</span><strong>{filtered.length}</strong><small>{isAr ? 'وفق البحث الحالي' : 'Current filters'}</small></div></article></div>
    <div className="panel" style={{padding:16,marginBottom:16}}><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',gap:12}}><label className="field-label"><span>{isAr ? 'بحث' : 'Search'}</span><div style={{display:'flex',alignItems:'center',gap:8}}><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={words.search}/></div></label><label className="field-label">{isAr ? 'نوع الحدث' : 'Action'}<select value={actionFilter} onChange={e=>setActionFilter(e.target.value)}><option value="all">{words.all}</option><option value="INSERT">{words.insert}</option><option value="UPDATE">{words.update}</option><option value="DELETE">{words.delete}</option></select></label><label className="field-label">{isAr ? 'نوع السجل' : 'Record type'}<select value={tableFilter} onChange={e=>setTableFilter(e.target.value)}><option value="all">{words.allTables}</option>{tables.map(table=><option key={table} value={table}>{tableLabel(table)}</option>)}</select></label></div></div>
    <div className="panel audit-panel"><div className="panel-heading"><div><h2>{t('recentActivity') ?? t('auditTrail')}</h2><p>{isAr ? 'اضغط على أي حدث لمراجعة تفاصيله' : 'Expand any event to inspect its change details'}</p></div></div>
      {loading ? <div className="audit-loading">{t('loading')}</div> : error ? <div className="audit-empty"><ShieldCheck size={32}/><p>{error}</p><small>{isAr ? 'تحقق من اتصال MySQL وتطبيق ترحيل وحدات CMMS الجديد.' : 'Verify the MySQL connection and apply the CMMS module migration.'}</small></div> : !filtered.length ? <div className="audit-empty"><ShieldCheck size={32}/><p>{words.noResults}</p></div> : <div className="table-wrap"><table className="data-table"><thead><tr><th>{t('time')}</th><th>{t('event')}</th><th>{t('record')}</th><th>{words.actor}</th><th>{isAr ? 'تفاصيل' : 'Details'}</th></tr></thead><tbody>{filtered.map(event=><><tr key={event.id}><td>{dateLabel(event.created_at)}</td><td><span className={`audit-action audit-${event.action}`}>{event.action}</span></td><td><strong>{tableLabel(event.table_name)}</strong><small className="table-subline"><code>{event.record_id}</code></small></td><td>{event.actor_id ? <code>{event.actor_id}</code> : '—'}</td><td><button className="icon-button" aria-label={words.details} onClick={()=>setExpanded(expanded===event.id?null:event.id)}>{expanded===event.id?<ChevronUp size={17}/>:<ChevronDown size={17}/>}</button></td></tr>{expanded===event.id && <tr key={`${event.id}-details`}><td colSpan={5}><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',gap:12,padding:10}}><div><strong>{words.before}</strong><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',maxHeight:320,overflow:'auto',fontSize:12,background:'var(--surface-muted, var(--surface))',padding:12,borderRadius:8}}>{pretty(event.old_data)}</pre></div><div><strong>{words.after}</strong><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',maxHeight:320,overflow:'auto',fontSize:12,background:'var(--surface-muted, var(--surface))',padding:12,borderRadius:8}}>{pretty(event.new_data)}</pre></div></div></td></tr>}</>)}</tbody></table></div>}
      {!loading && !error && events.length >= limit && <div style={{padding:16,textAlign:'center'}}><button className="button button-secondary" onClick={()=>setLimit(n=>n+250)}>{words.loadMore}</button></div>}
    </div>
    {role !== 'admin' && <p className="muted audit-permission-note">{isAr ? 'يعرض النظام سجل التدقيق حسب صلاحيات حسابك. السجل للقراءة فقط ولا يمكن تعديله من هذه الصفحة.' : 'Audit visibility depends on your role. This page is read-only; events cannot be edited here.'}</p>}
  </section>
}
