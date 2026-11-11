import { useEffect, useMemo, useState } from 'react'
import { Activity, AlertTriangle, Clock3, Download, Printer, Wrench, Gauge, CalendarClock, Info } from 'lucide-react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useApp } from '../app/AppProvider'
import { useTranslation } from '../hooks/useTranslation'
import { localizedMachineName, localizedWorkshopName, formatNumber } from '../utils/format'
import { PageHeader } from '../components/ui/PageHeader'
import { EmptyState } from '../components/ui/EmptyState'

type Period = '30' | '90' | 'all'
type ServerAnalytics = {
  periodDays: number
  tasks: { total: number; open: number; overdue: number; preventive: number; corrective: number; completed: number }
  maintenance: { submittedLogs: number; mttrHours: number | null; recordedDowntimeHours: number; correctiveLogs: number; preventiveLogs: number; cost: number }
  production: { records: number; target: number; produced: number; accepted: number; rejected: number }
  preventiveCompliance: { due: number; completed: number; overdue: number; percent: number | null }
  meters: { trackedSeries: number; operatingHourReadings: number; totalReadings: number }
  topFailures: Array<{ machine_id: number; machine_code: string; machine_name: string; breakdown_count: number; downtime_hours: number }>
  breakdownCauses: Array<{ cause: string; count: number }>
  monthly: Array<{ month: string; corrective: number; preventive: number; downtime_hours: number }>
  limitations: { mtbf: string; availability: string; predictiveMaintenance: string }
}
const fmtDuration = (value: number, language: string) => `${new Intl.NumberFormat(language === 'ar' ? 'ar-DZ' : language === 'fr' ? 'fr-DZ' : 'en-US', { maximumFractionDigits: 1 }).format(value)} h`
const getDowntimeHours = (start?: string, end?: string) => {
  if (!start || !end) return null
  const a = new Date(start).getTime(), b = new Date(end).getTime()
  if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) return null
  return (b - a) / 3_600_000
}

export default function AnalyticsPage() {
  const { machines, workshops, maintenanceLogs, language, profile } = useApp()
  const { t } = useTranslation()
  const [period, setPeriod] = useState<Period>('30')
  const [workshopId, setWorkshopId] = useState('all')
  const [machineId, setMachineId] = useState('all')
  const [maintenanceType, setMaintenanceType] = useState<'all' | 'preventive' | 'corrective'>('all')
  const [serverAnalytics, setServerAnalytics] = useState<ServerAnalytics | null>(null)
  const [serverAnalyticsError, setServerAnalyticsError] = useState('')
  const [serverAnalyticsLoading, setServerAnalyticsLoading] = useState(false)
  useEffect(() => {
    if (profile?.role !== 'admin') { setServerAnalytics(null); return }
    const controller = new AbortController()
    const apiBase = ((import.meta.env.VITE_API_URL as string | undefined) || 'http://localhost:3000').replace(/\/+$/, '')
    const days = period === 'all' ? 3650 : Number(period)
    setServerAnalyticsLoading(true)
    setServerAnalyticsError('')
    fetch(`${apiBase}/api/maintenance-suite/analytics?days=${days}`, { credentials: 'include', signal: controller.signal })
      .then(async response => {
        const body = await response.json().catch(() => ({}))
        if (!response.ok || body.success !== true) throw new Error(body.message || `Analytics request failed (${response.status}).`)
        return body.data as ServerAnalytics
      })
      .then(data => setServerAnalytics(data))
      .catch(error => { if (error?.name !== 'AbortError') { setServerAnalytics(null); setServerAnalyticsError(error instanceof Error ? error.message : 'Could not load server analytics.') } })
      .finally(() => { if (!controller.signal.aborted) setServerAnalyticsLoading(false) })
    return () => controller.abort()
  }, [period, profile?.role])
  const ar = language === 'ar', fr = language === 'fr'
  const label = (en: string, frText: string, arText: string) => ar ? arText : fr ? frText : en
  const since = useMemo(() => {
    if (period === 'all') return ''
    const date = new Date()
    date.setDate(date.getDate() - Number(period))
    return date.toISOString().slice(0, 10)
  }, [period])
  const filteredMachines = useMemo(() => machines.filter(m => (workshopId === 'all' || m.workshopId === workshopId) && (machineId === 'all' || m.id === machineId)), [machines, workshopId, machineId])
  const filteredLogs = useMemo(() => maintenanceLogs.filter(log => {
    const machine = machines.find(m => m.id === log.machineId)
    return (!since || log.date.slice(0, 10) >= since) && (workshopId === 'all' || machine?.workshopId === workshopId) && (machineId === 'all' || log.machineId === machineId) && (maintenanceType === 'all' || log.type === maintenanceType)
  }), [maintenanceLogs, machines, since, workshopId, machineId, maintenanceType])
  const completed = filteredLogs.filter(log => log.status === 'completed' && log.type === 'corrective' && Number.isFinite(log.durationHours) && log.durationHours > 0)
  const productionTarget = serverAnalytics?.production.target ?? 0
  const productionActual = serverAnalytics?.production.produced ?? 0
  const productionAccepted = serverAnalytics?.production.accepted ?? 0
  const productionRejected = serverAnalytics?.production.rejected ?? 0
  const productionRecordsCount = serverAnalytics?.production.records ?? 0
  const mttr = completed.length ? completed.reduce((sum, log) => sum + log.durationHours, 0) / completed.length : null
  const downtimeEntries = filteredLogs.map(log => ({ log, hours: getDowntimeHours(log.outageStart, log.outageEnd) })).filter((x): x is { log: typeof filteredLogs[number]; hours: number } => x.hours !== null)
  const totalDowntime = downtimeEntries.reduce((sum, item) => sum + item.hours, 0)
  const statusCounts = { working: filteredMachines.filter(m => m.status === 'working').length, broken: filteredMachines.filter(m => m.status === 'broken').length, maintenance: filteredMachines.filter(m => m.status === 'maintenance').length }
  const monthly = useMemo(() => {
    const now = new Date(); now.setDate(1); now.setHours(0, 0, 0, 0)
    let count = period === '30' ? 2 : period === '90' ? 4 : 6
    if (period === 'all' && filteredLogs.length) { const first = filteredLogs.reduce((min, log) => log.date < min ? log.date : min, filteredLogs[0].date); const start = new Date(`${first.slice(0, 7)}-01T00:00:00`); count = Math.max(1, Math.min(36, (now.getFullYear() - start.getFullYear()) * 12 + now.getMonth() - start.getMonth() + 1)) }
    return Array.from({ length: count }, (_, i) => { const date = new Date(now); date.setMonth(now.getMonth() - (count - 1 - i)); const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; return { key, month: new Intl.DateTimeFormat(ar ? 'ar-DZ' : fr ? 'fr-DZ' : 'en-US', { month: 'short', year: count > 12 ? '2-digit' : undefined }).format(date), total: filteredLogs.filter(log => log.date.startsWith(key)).length, completed: filteredLogs.filter(log => log.date.startsWith(key) && log.status === 'completed').length } })
  }, [filteredLogs, ar, fr, period])
  const workshopSummary = workshops.filter(w => workshopId === 'all' || w.id === workshopId).map(w => ({ workshop: w, machines: filteredMachines.filter(m => m.workshopId === w.id).length, logs: filteredLogs.filter(log => machines.find(m => m.id === log.machineId)?.workshopId === w.id).length }))
  function exportCsv() {
    const headers = [label('Date','Date','التاريخ'), label('Machine','Machine','الآلة'), label('Type','Type','النوع'), label('Status','Statut','الحالة'), label('Repair duration (h)','Durée réparation (h)','مدة الإصلاح (س)'), label('Recorded downtime (h)','Arrêt enregistré (h)','التوقف المسجل (س)')]
    const rows = filteredLogs.map(log => [log.date, machines.find(m => m.id === log.machineId)?.code ?? log.machineId, log.type, log.status, String(log.durationHours ?? ''), String(getDowntimeHours(log.outageStart, log.outageEnd) ?? '')])
    const csv = [headers, ...rows].map(row => row.map(v => `"${String(v).replaceAll('"', '""')}"`).join(',')).join('\r\n')
    const url = URL.createObjectURL(new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a'); a.href = url; a.download = 'indusflow-analytics.csv'; a.click(); URL.revokeObjectURL(url)
  }
  return <section className="page-section">
    <PageHeader eyebrow={label('Operational analytics','Analyses opérationnelles','التحليلات التشغيلية')} title={t('analytics')} description={label('Metrics use server-backed records. Missing data is shown as unavailable, never estimated.','Les indicateurs sont calculés uniquement à partir des données disponibles dans ce navigateur. Les données manquantes ne sont jamais estimées.','تُحسب المؤشرات من السجلات المتاحة في هذا المتصفح فقط. البيانات الناقصة تظهر كغير متاحة ولا يتم تخمينها.')} action={<><button className="button button-secondary" onClick={exportCsv}><Download size={16}/>{t('exportCsv')}</button><button className="button button-secondary" onClick={() => window.print()}><Printer size={16}/>{t('printReport')}</button></>} />
    <div className="analytics-filters panel">
      <label>{label('Period','Période','الفترة')}<select value={period} onChange={e => setPeriod(e.target.value as Period)}><option value="30">{label('Last 30 days','30 derniers jours','آخر 30 يومًا')}</option><option value="90">{label('Last 90 days','90 derniers jours','آخر 90 يومًا')}</option><option value="all">{label('All records','Toutes les données','كل السجلات')}</option></select></label>
      <label>{t('workshop')}<select value={workshopId} onChange={e => { setWorkshopId(e.target.value); setMachineId('all') }}><option value="all">{t('allWorkshops')}</option>{workshops.map(w => <option key={w.id} value={w.id}>{localizedWorkshopName(w, language)}</option>)}</select></label>
      <label>{t('machine')}<select value={machineId} onChange={e => setMachineId(e.target.value)}><option value="all">{label('All machines','Toutes les machines','كل الآلات')}</option>{machines.filter(m => workshopId === 'all' || m.workshopId === workshopId).map(m => <option key={m.id} value={m.id}>{m.code} — {localizedMachineName(m, language)}</option>)}</select></label>
      <label>{label('Maintenance type','Type de maintenance','نوع الصيانة')}<select value={maintenanceType} onChange={e => setMaintenanceType(e.target.value as typeof maintenanceType)}><option value="all">{t('all')}</option><option value="preventive">{t('preventive')}</option><option value="corrective">{t('corrective')}</option></select></label>
    </div>
    {profile?.role === 'admin' && <article className="panel analytics-production-summary">
      <div className="panel-heading"><div><h2>{label('Verified server maintenance indicators','Indicateurs maintenance du serveur','مؤشرات الصيانة من الخادم')}</h2><p>{label('Calculated from MySQL work orders, submitted maintenance logs, preventive occurrences and breakdown reports.','Calculés depuis MySQL : ordres de travail, journaux soumis, échéances préventives et rapports de panne.','محسوبة من MySQL: أوامر العمل وسجلات الصيانة المقدمة ومواعيد الصيانة الوقائية وبلاغات الأعطال.')}</p></div><span className="panel-icon"><Activity size={18}/></span></div>
      {serverAnalyticsLoading && <p className="data-note">{label('Loading server analytics…','Chargement des analyses serveur…','جارٍ تحميل تحليلات الخادم…')}</p>}
      {serverAnalyticsError && <p className="data-note"><AlertTriangle size={15}/>{label('Server analytics unavailable: ','Analyses serveur indisponibles : ','تحليلات الخادم غير متاحة: ')}{serverAnalyticsError}</p>}
      {serverAnalytics && <>
        <div className="metrics-grid">
          <article className="metric-card"><span className="metric-label">{label('Open work orders','Ordres ouverts','أوامر العمل المفتوحة')}</span><strong className="metric-value">{formatNumber(serverAnalytics.tasks.open,language)}</strong><small>{formatNumber(serverAnalytics.tasks.overdue,language)} {label('overdue','en retard','متأخرة')}</small></article>
          <article className="metric-card"><span className="metric-label">{label('Server MTTR','MTTR serveur','MTTR من الخادم')}</span><strong className="metric-value">{serverAnalytics.maintenance.mttrHours == null ? '—' : fmtDuration(serverAnalytics.maintenance.mttrHours,language)}</strong><small>{formatNumber(serverAnalytics.maintenance.correctiveLogs,language)} {label('corrective logs','journaux correctifs','سجلات تصحيحية')}</small></article>
          <article className="metric-card"><span className="metric-label">{label('Recorded downtime','Temps d’arrêt enregistré','التوقف المسجل')}</span><strong className="metric-value">{fmtDuration(serverAnalytics.maintenance.recordedDowntimeHours,language)}</strong><small>{formatNumber(serverAnalytics.maintenance.submittedLogs,language)} {label('submitted logs','journaux soumis','سجلات مقدمة')}</small></article>
          <article className="metric-card"><span className="metric-label">{label('Preventive compliance','Conformité préventive','الالتزام بالصيانة الوقائية')}</span><strong className="metric-value">{serverAnalytics.preventiveCompliance.percent == null ? '—' : `${formatNumber(serverAnalytics.preventiveCompliance.percent,language)}%`}</strong><small>{formatNumber(serverAnalytics.preventiveCompliance.completed,language)} / {formatNumber(serverAnalytics.preventiveCompliance.due,language)} {label('due occurrences completed','échéances terminées','مواعيد مستحقة منجزة')}</small></article>
        </div>
        <div className="table-scroll"><table className="data-table"><thead><tr><th>{label('Most affected machine','Machine la plus touchée','الآلة الأكثر تعرضًا')}</th><th>{label('Breakdowns','Pannes','الأعطال')}</th><th>{label('Downtime (h)','Arrêt (h)','التوقف (س)')}</th></tr></thead><tbody>{serverAnalytics.topFailures.length ? serverAnalytics.topFailures.map(row => <tr key={row.machine_id}><td>{row.machine_code} — {row.machine_name}</td><td>{formatNumber(Number(row.breakdown_count),language)}</td><td>{formatNumber(Number(row.downtime_hours),language)}</td></tr>) : <tr><td colSpan={3}>{label('No breakdown reports in this period.','Aucun rapport de panne sur cette période.','لا توجد بلاغات أعطال في هذه الفترة.')}</td></tr>}</tbody></table></div>
        <p className="data-note"><Info size={15}/>{label('MTBF and time-based availability remain unavailable until validated operating schedules and failure exposure are recorded. Condition thresholds are alerts, not predictive diagnoses.','Le MTBF et la disponibilité temporelle restent indisponibles tant que les horaires d’exploitation et l’exposition aux pannes ne sont pas validés. Les seuils sont des alertes, pas des diagnostics prédictifs.','يبقى MTBF والتوافر الزمني غير متاحين حتى تسجيل جداول تشغيل وساعات تعرض للأعطال موثوقة. تجاوز حدود الحالة تنبيه وليس تشخيصًا تنبؤيًا.')}</p>
      </>}
    </article>}
    <div className="metrics-grid analytics-metrics">
      <article className="metric-card"><span className="metric-icon"><Gauge size={18}/></span><span className="metric-label">{t('totalMachines')}</span><strong className="metric-value">{formatNumber(filteredMachines.length, language)}</strong><small>{label('Current records','Données actuelles','السجلات الحالية')}</small></article>
      <article className="metric-card"><span className="metric-icon"><Wrench size={18}/></span><span className="metric-label">{label('Maintenance records','Enregistrements maintenance','سجلات الصيانة')}</span><strong className="metric-value">{formatNumber(filteredLogs.length, language)}</strong><small>{formatNumber(completed.length, language)} {t('completed')}</small></article>
      <article className="metric-card"><span className="metric-icon"><Clock3 size={18}/></span><span className="metric-label">{t('mttr')}</span><strong className="metric-value">{mttr === null ? '—' : fmtDuration(mttr, language)}</strong><small>{label('Completed corrective repairs with a valid duration','Réparations correctives terminées avec une durée valide','إصلاحات تصحيحية مكتملة بمدة صحيحة')}</small></article>
      <article className="metric-card"><span className="metric-icon"><Activity size={18}/></span><span className="metric-label">{t('totalDowntime')}</span><strong className="metric-value">{downtimeEntries.length ? fmtDuration(totalDowntime, language) : '—'}</strong><small>{formatNumber(downtimeEntries.length, language)} {label('valid outage intervals','intervalles valides','فترات توقف صالحة')}</small></article>
    </div>
    <article className="panel analytics-production-summary"><div className="panel-heading"><div><h2>{label('Production summary','Résumé de production','ملخص الإنتاج')}</h2><p>{label('Aggregated from production_records in MySQL for the selected period.','Agrégé depuis production_records dans MySQL pour la période choisie.','مجمّع من جدول الإنتاج في MySQL للفترة المحددة.')}</p></div></div>{serverAnalyticsLoading ? <p className="data-note">{label('Loading server data…','Chargement…','جارٍ تحميل بيانات الخادم…')}</p> : productionRecordsCount ? <div className="metrics-grid"><article className="metric-card"><span className="metric-label">{label('Production target','Objectif de production','الإنتاج المستهدف')}</span><strong className="metric-value">{formatNumber(productionTarget, language)}</strong></article><article className="metric-card"><span className="metric-label">{label('Actual output','Production réelle','الإنتاج الفعلي')}</span><strong className="metric-value">{formatNumber(productionActual, language)}</strong><small>{productionTarget > 0 ? `${formatNumber(productionActual / productionTarget * 100, language)}% ${label('of target','de l’objectif','من المستهدف')}` : label('Target is zero','Objectif nul','المستهدف صفر')}</small></article><article className="metric-card"><span className="metric-label">{label('Accepted output','Production conforme','الإنتاج المقبول')}</span><strong className="metric-value">{formatNumber(productionAccepted, language)}</strong></article><article className="metric-card"><span className="metric-label">{label('Rejected output','Production rejetée','الإنتاج المرفوض')}</span><strong className="metric-value">{formatNumber(productionRejected, language)}</strong><small>{productionActual > 0 ? `${formatNumber(productionRejected / productionActual * 100, language)}% ${label('rejection rate','de rejet','معدل الرفض')}` : '—'}</small></article></div> : <p className="data-note"><Info size={15}/>{label('No production records in MySQL for this period.','Aucun enregistrement de production dans MySQL.','لا توجد سجلات إنتاج في MySQL لهذه الفترة.')}</p>}</article>
    <div className="dashboard-charts analytics-charts">
      <article className="panel chart-panel"><div className="panel-heading"><div><h2>{t('monthlyMaintenance')}</h2><p>{(period === 'all' ? label('Monthly activity for the available period, capped at the latest 36 months','Activité mensuelle sur la période disponible, limitée aux 36 derniers mois','النشاط الشهري للفترة المتاحة، بحد أقصى آخر 36 شهرًا') : period === '90' ? label('Monthly activity for the last 90 days','Activité mensuelle des 90 derniers jours','النشاط الشهري لآخر 90 يومًا') : label('Monthly activity for the last 30 days','Activité mensuelle des 30 derniers jours','النشاط الشهري لآخر 30 يومًا'))}</p></div><span className="panel-icon"><CalendarClock size={18}/></span></div>{filteredLogs.length ? <div className="chart-body"><ResponsiveContainer width="100%" height={260}><AreaChart data={monthly} margin={{ top: 12, right: 8, left: -18, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)"/><XAxis dataKey="month" tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false}/><YAxis allowDecimals={false} tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false}/><Tooltip/><Area type="monotone" dataKey="total" name={label('Recorded tasks','Interventions enregistrées','السجلات المسجلة')} stroke="var(--accent)" fill="var(--accent)" fillOpacity={0.12}/><Area type="monotone" dataKey="completed" name={t('completed')} stroke="#20a779" fill="#20a779" fillOpacity={0.08}/></AreaChart></ResponsiveContainer></div> : <EmptyState title={t('noMaintenance')}/>}</article>
      <article className="panel chart-panel"><div className="panel-heading"><div><h2>{label('Machine status snapshot','État actuel des machines','حالة الآلات الحالية')}</h2><p>{label('This is not time-based availability','Ce n’est pas la disponibilité sur une période','هذه ليست نسبة الإتاحة خلال فترة زمنية')}</p></div><span className="panel-icon"><Activity size={18}/></span></div><div className="analytics-status-list">{[{key:'working',label:t('working'),value:statusCounts.working,color:'#20a779'},{key:'maintenance',label:t('inMaintenance'),value:statusCounts.maintenance,color:'#e5a43b'},{key:'broken',label:t('broken'),value:statusCounts.broken,color:'#e45c67'}].map(item => <div className="analytics-status-row" key={item.key}><div><i style={{ background:item.color }}/><span>{item.label}</span><strong>{item.value}</strong></div><div className="analytics-status-track"><span style={{ width:`${filteredMachines.length ? item.value / filteredMachines.length * 100 : 0}%`, background:item.color }}/></div></div>)}</div></article>
    </div>
    <article className="panel analytics-workshops"><div className="panel-heading"><div><h2>{label('Workshop comparison','Comparaison des ateliers','مقارنة الورشات')}</h2><p>{label('Machine counts and recorded maintenance volume only; not a performance ranking.','Nombre de machines et volume de maintenance enregistré uniquement ; ce n’est pas un classement de performance.','عدد الآلات وحجم سجلات الصيانة فقط؛ ليس تصنيفًا للأداء.')}</p></div></div><div className="table-scroll"><table className="data-table"><thead><tr><th>{t('workshop')}</th><th>{t('totalMachines')}</th><th>{label('Maintenance records','Enregistrements','سجلات الصيانة')}</th><th>{t('working')}</th><th>{t('broken')}</th></tr></thead><tbody>{workshopSummary.map(({ workshop, machines: count, logs }) => <tr key={workshop.id}><td>{localizedWorkshopName(workshop, language)}</td><td>{count}</td><td>{logs}</td><td>{filteredMachines.filter(m => m.workshopId === workshop.id && m.status === 'working').length}</td><td>{filteredMachines.filter(m => m.workshopId === workshop.id && m.status === 'broken').length}</td></tr>)}</tbody></table></div></article>
    <div className="analytics-data-limit"><Info size={18}/><div><strong>{label('Metrics requiring additional data','Indicateurs nécessitant des données supplémentaires','مؤشرات تحتاج إلى بيانات إضافية')}</strong><p>{label('Availability over time and MTBF require defined scheduled operating hours and validated failure records. Preventive compliance requires due dates and completion timestamps. Backlog and technician workload require work-order data. These metrics are intentionally not calculated from the current schema.','La disponibilité dans le temps et le MTBF nécessitent des heures de fonctionnement planifiées et des pannes validées. La conformité préventive nécessite des échéances et des dates de réalisation. Le backlog et la charge des techniciens nécessitent les données des ordres de travail.','الإتاحة عبر الزمن وMTBF يحتاجان إلى ساعات تشغيل مجدولة وسجلات أعطال معتمدة. الالتزام بالصيانة الوقائية يحتاج إلى تواريخ استحقاق وإنجاز. التراكم وأعباء الفنيين تحتاج بيانات أوامر العمل. لذلك لا تُحسب هذه المؤشرات من المخطط الحالي.')}</p><div className="analytics-unavailable-grid"><span><b>Availability</b><small>{label('Unavailable: no operating schedule','Indisponible : pas d’horaire','غير متاح: لا يوجد جدول تشغيل')}</small></span><span><b>MTBF</b><small>{label('Unavailable: no validated operating hours','Indisponible : heures non validées','غير متاح: ساعات التشغيل غير معتمدة')}</small></span><span><b>PM compliance</b><small>{label('Unavailable: due-date data missing','Indisponible : échéances manquantes','غير متاح: تواريخ الاستحقاق ناقصة')}</small></span><span><b>{label('Maintenance backlog','Backlog maintenance','تراكم الصيانة')}</b><small>{label('Unavailable: work orders not connected','Indisponible : ordres non connectés','غير متاح: أوامر العمل غير مرتبطة')}</small></span></div></div></div>
    {!machines.length && !maintenanceLogs.length && <p className="data-note"><AlertTriangle size={15}/>{label('No machine or maintenance records are currently available. Add verified records first; the dashboard will update automatically.','Aucun équipement ni historique de maintenance disponible. Ajoutez des données vérifiées ; les indicateurs seront actualisés automatiquement.','لا توجد حاليًا سجلات آلات أو صيانة. أضف بيانات موثوقة أولًا وستتحدث المؤشرات تلقائيًا.')}</p>}
  </section>
}
