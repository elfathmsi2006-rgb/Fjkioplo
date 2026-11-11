import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, CalendarClock, CheckCircle2, ClipboardList, Clock3, Gauge, RefreshCw, Users, Wrench } from 'lucide-react'
import { PageHeader } from '../components/ui/PageHeader'
import { MetricCard } from '../components/ui/MetricCard'
import { EmptyState } from '../components/ui/EmptyState'
import { useApp } from '../app/AppProvider'

const API = ((import.meta.env.VITE_API_URL as string | undefined) || 'http://localhost:3000').replace(/\/+$/, '')

type Source = { table: string; id: number | string }
type AttentionItem = {
  id: string
  category: string
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | string
  reasonCodes: string[]
  recommendationCode: string
  subject?: string | null
  machine?: { id: number; code: string | null; name: string | null } | null
  technician?: { id: number; name: string | null } | null
  ageHours: number | null
  overdueHours: number | null
  source: Source
}
type ActionItem = AttentionItem & { rank: number }
type Workload = {
  id: number
  name: string
  skill: string | null
  shift: string | null
  availability: string | null
  attendance: string | null
  openTasks: number
  criticalTasks: number
  overdueTasks: number
  inProgressTasks: number
  level: string
  suggestions: Array<{ taskId: number; title: string; priority: string; dueDate: string | null; skillMatch: string; matchedSkills: string[]; reasonCode: string }>
}
type BriefingList = Array<Record<string, unknown>>
type Overview = {
  generatedAt: string
  referenceDate: string
  briefing: {
    facts: {
      openBreakdowns: number
      openWorkOrders: number
      overdueWorkOrders: number
      stoppedMachines: number
      pendingTasks: number
      criticalHighInterventions: number
      upcomingPreventive: number
      awaitingManagerAction: number
    }
    openBreakdowns: BriefingList
    overdueWorkOrders: BriefingList
    stoppedMachines: BriefingList
    pendingTasks: BriefingList
    criticalHighInterventions: BriefingList
    upcomingPreventive: BriefingList
  }
  attention: AttentionItem[]
  actions: ActionItem[]
  workload: Workload[]
  dataQuality: { missing: string[]; notes: string[] }
}
type Report = {
  period: string
  from: string
  to: string
  facts: {
    tasksCreated: number
    tasksCompleted: number
    tasksDue: number
    dueTasksCompleted: number
    openWorkOrders: number
    overdueWorkOrders: number
    breakdowns: number
    unresolvedBreakdowns: number
    downtimeMinutes: number
    interventionsLogged: number
    maintenanceCost: number
    preventiveDue: number
    preventiveCompleted: number
    preventiveCompletionRate: number | null
    overduePreventivePlans: number
  }
  technicianSummary: Array<{ id: number; name: string; completedTasks: number; loggedInterventions: number; openTasks: number }>
  dataQuality: { missing: string[]; notes: string[] }
}

const today = () => {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export default function CopilotPage() {
  const { language } = useApp()
  const ar = language === 'ar'
  const fr = language === 'fr'
  const t3 = (a: string, f: string, e: string) => (ar ? a : fr ? f : e)

  const [date, setDate] = useState(today)
  const [overview, setOverview] = useState<Overview | null>(null)
  const [report, setReport] = useState<Report | null>(null)
  const [period, setPeriod] = useState<'daily' | 'weekly'>('daily')
  const [loading, setLoading] = useState(true)
  const [reportLoading, setReportLoading] = useState(true)
  const [error, setError] = useState('')
  const [reportError, setReportError] = useState('')

  const loadOverview = useCallback(async (reference: string) => {
    const message = language === 'ar' ? 'تعذّر تحميل الموجز.' : language === 'fr' ? 'Impossible de charger le briefing.' : 'Could not load the briefing.'
    setLoading(true)
    setError('')
    try {
      const response = await fetch(`${API}/api/copilot/overview?date=${encodeURIComponent(reference)}`, { credentials: 'include' })
      const body = await response.json().catch(() => null)
      if (!response.ok || !body?.success) throw new Error(body?.message || message)
      setOverview(body.data as Overview)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : message)
    } finally {
      setLoading(false)
    }
  }, [language])

  const loadReport = useCallback(async (nextPeriod: 'daily' | 'weekly') => {
    const message = language === 'ar' ? 'تعذّر إنشاء التقرير.' : language === 'fr' ? 'Impossible de générer le rapport.' : 'Could not generate the report.'
    setReportLoading(true)
    setReportError('')
    try {
      const response = await fetch(`${API}/api/copilot/report?period=${nextPeriod}`, { credentials: 'include' })
      const body = await response.json().catch(() => null)
      if (!response.ok || !body?.success) throw new Error(body?.message || message)
      setReport(body.data as Report)
    } catch (caught) {
      setReportError(caught instanceof Error ? caught.message : message)
    } finally {
      setReportLoading(false)
    }
  }, [language])

  useEffect(() => { void loadOverview(date) }, [date, loadOverview])
  useEffect(() => { void loadReport(period) }, [period, loadReport])

  const categoryLabel = (category: string) => ({
    BLOCKED_OPERATION: t3('عملية متوقفة', 'Opération bloquée', 'Blocked operation'),
    DELAYED_WORK_ORDER: t3('أمر عمل متأخر', 'Ordre de travail en retard', 'Delayed work order'),
    UNASSIGNED_TASK: t3('مهمة غير مسندة', 'Tâche non assignée', 'Unassigned task'),
    REPEATED_BREAKDOWN: t3('أعطال متكررة', 'Pannes répétées', 'Repeated breakdowns'),
    CRITICAL_DOWNTIME: t3('توقف حرج', 'Arrêt critique', 'Critical downtime'),
    OVERDUE_PREVENTIVE: t3('صيانة وقائية متأخرة', 'Préventif en retard', 'Overdue preventive'),
  }[category] || category)

  const recommendationLabel = (code: string) => ({
    CLEAR_BLOCKER: t3('أزل سبب التوقف قبل الوردية القادمة.', 'Résolvez le blocage avant la prochaine équipe.', 'Clear the blocker before the next shift.'),
    ASSIGN_AND_ESCALATE: t3('أسند فنيًا مؤهلاً وارفع الأولوية.', 'Assignez un technicien qualifié et escaladez.', 'Assign a qualified technician and escalate.'),
    ASSIGN_TECHNICIAN: t3('أسند فنيًا متاحًا وحدّد موعد الإنجاز.', 'Assignez un technicien disponible et fixez l’échéance.', 'Assign an available technician and confirm the due date.'),
    REVIEW_WORK_ORDER: t3('راجع التقدم مع الفني.', 'Revoyez l’avancement avec le technicien.', 'Review progress with the technician.'),
    INVESTIGATE_ROOT_CAUSE: t3('راجع تاريخ الأعطال وحدّد السبب الجذري.', 'Analysez l’historique et la cause racine.', 'Review the failure history and confirm the root cause.'),
    INSPECT_MACHINE: t3('تحقق من حالة الآلة وأسند التدخل التصحيحي.', 'Vérifiez l’état de la machine et assignez l’intervention.', 'Confirm the machine condition and assign the intervention.'),
    SCHEDULE_PM: t3('جدول الصيانة الوقائية وحدّث الموعد القادم.', 'Planifiez le préventif et mettez à jour l’échéance.', 'Schedule the preventive work and update the next due date.'),
  }[code] || '')

  const severityTone = (severity: string) => severity === 'CRITICAL' ? 'danger' : severity === 'HIGH' ? 'warning' : 'info'
  const ageLabel = (hours: number | null) => hours == null ? t3('غير متاح', 'Inconnu', 'Unknown') : hours >= 24 ? `${Math.floor(hours / 24)} ${t3('يوم', 'j', 'd')}` : `${hours} ${t3('ساعة', 'h', 'h')}`
  const machineLabel = (item: AttentionItem) => item.machine ? [item.machine.code, item.machine.name].filter(Boolean).join(' — ') : t3('غير مرتبطة بآلة', 'Non liée à une machine', 'No machine linked')

  const facts = overview?.briefing.facts

  return (
    <section className="page-section copilot-page">
      <PageHeader
        eyebrow={t3('مساعد مدير الصيانة', 'Copilote de maintenance', 'Maintenance manager copilot')}
        title={t3('مركز القرار اليومي', 'Centre de décision quotidien', 'Daily decision center')}
        description={t3('ملخص تنفيذي وتحليل حتمي من سجلات قاعدة البيانات. التوصيات مقترحات ولا تُنفَّذ تلقائياً.', 'Synthèse déterministe basée sur les enregistrements. Les recommandations ne sont jamais appliquées automatiquement.', 'Deterministic summary from database records. Recommendations are never applied automatically.')}
        action={
          <div className="copilot-toolbar">
            <label className="field-label copilot-date">
              {t3('تاريخ المرجع', 'Date de référence', 'Reference date')}
              <input type="date" value={date} max={today()} onChange={event => setDate(event.target.value)} />
            </label>
            <button className="button button-secondary" type="button" onClick={() => void loadOverview(date)} disabled={loading}>
              <RefreshCw size={15} /> {loading ? '…' : t3('تحديث', 'Actualiser', 'Refresh')}
            </button>
          </div>
        }
      />

      {error && <p className="auth-message auth-error" role="alert">{error}</p>}
      {!error && !overview && loading && <EmptyState title={t3('جاري التحليل…', 'Analyse en cours…', 'Analysing…')} description="" />}

      {facts && (
        <div className="metrics-grid copilot-metrics">
          <MetricCard icon={<Wrench size={18} />} tone="red" label={t3('أعطال مفتوحة', 'Pannes ouvertes', 'Open breakdowns')} value={facts.openBreakdowns} />
          <MetricCard icon={<Clock3 size={18} />} tone="amber" label={t3('أوامر عمل متأخرة', 'OT en retard', 'Overdue work orders')} value={facts.overdueWorkOrders} note={`${facts.openWorkOrders} ${t3('مفتوحة', 'ouvertes', 'open')}`} />
          <MetricCard icon={<Gauge size={18} />} tone="red" label={t3('آلات متوقفة', 'Machines arrêtées', 'Stopped machines')} value={facts.stoppedMachines} />
          <MetricCard icon={<ClipboardList size={18} />} tone="blue" label={t3('مهام معلقة', 'Tâches en attente', 'Pending tasks')} value={facts.pendingTasks} />
          <MetricCard icon={<AlertTriangle size={18} />} tone="amber" label={t3('تدخلات حرجة/عالية', 'Interventions critiques/hautes', 'Critical/high interventions')} value={facts.criticalHighInterventions} />
          <MetricCard icon={<CalendarClock size={18} />} tone="green" label={t3('وقائية خلال 7 أيام', 'Préventif sous 7 jours', 'Preventive in 7 days')} value={facts.upcomingPreventive} />
          <MetricCard icon={<AlertTriangle size={18} />} tone="red" label={t3('بانتظار قرار المدير', 'En attente du responsable', 'Awaiting manager action')} value={facts.awaitingManagerAction} />
        </div>
      )}

      {overview && (
        <div className="settings-grid copilot-grid">
          <article className="panel">
            <div className="panel-heading">
              <div><h2>{t3('مركز الانتباه الذكي', 'Centre d’attention', 'Smart attention center')}</h2><p>{t3('مرتب حسب الأولوية مع مصدر كل ملاحظة.', 'Priorisé avec la source de chaque constat.', 'Prioritised with the source record for each item.')}</p></div>
              <span className="status-badge status-warning">{overview.attention.length}</span>
            </div>
            <div className="copilot-list">
              {!overview.attention.length && <EmptyState title={t3('لا توجد حالات تتطلب تدخلاً', 'Aucune situation critique', 'No urgent attention items')} description={t3('جميع أوامر العمل والوقائية ضمن الحدود.', 'Tous les ordres et préventifs sont dans les délais.', 'All work orders and preventive plans are within limits.')} />}
              {overview.attention.map(item => (
                <div className="copilot-item" key={item.id}>
                  <div className="copilot-item-head">
                    <span className={`status-badge status-${severityTone(item.severity)}`}>{item.severity}</span>
                    <strong>{categoryLabel(item.category)}</strong>
                    <span className="muted">#{item.source.id}</span>
                  </div>
                  <p className="copilot-subject">{item.subject || item.id}</p>
                  <div className="copilot-meta">
                    <span>{machineLabel(item)}</span>
                    <span>{t3('الفني:', 'Technicien :', 'Technician:')} {item.technician?.name || t3('غير مسند', 'Non assigné', 'Unassigned')}</span>
                    <span>{t3('منذ', 'Depuis', 'Pending')} {ageLabel(item.ageHours)}</span>
                  </div>
                  <p className="copilot-recommendation"><CheckCircle2 size={14} /> {recommendationLabel(item.recommendationCode)}</p>
                  <p className="copilot-source">{t3('المصدر', 'Source', 'Source')}: {item.source.table} #{item.source.id}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="panel">
            <div className="panel-heading"><div><h2>{t3('مركز الإجراءات', 'Centre d’actions', 'Manager action center')}</h2><p>{t3('مهام مرتبة، دون تنفيذ تلقائي.', 'Actions priorisées, sans exécution automatique.', 'Prioritised actions, never executed automatically.')}</p></div></div>
            <div className="copilot-list">
              {!overview.actions.length && <EmptyState title={t3('لا توجد إجراءات مطلوبة', 'Aucune action requise', 'No actions required')} description="" />}
              {overview.actions.map(action => (
                <div className="copilot-action" key={action.id}>
                  <span className="copilot-rank">{action.rank}</span>
                  <div>
                    <strong>{categoryLabel(action.category)} — {action.subject || `#${action.source.id}`}</strong>
                    <p>{recommendationLabel(action.recommendationCode)}</p>
                    <small>{action.machine ? [action.machine.code, action.machine.name].filter(Boolean).join(' — ') : t3('بدون آلة', 'Sans machine', 'No machine')} · {action.technician?.name || t3('غير مسند', 'Non assigné', 'Unassigned')} · {ageLabel(action.ageHours)}</small>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </div>
      )}

      {overview && (
        <article className="panel">
          <div className="panel-heading"><div><h2>{t3('عبء الفنيين والتوفر', 'Charge et disponibilité', 'Technician workload & availability')}</h2><p>{t3('الاقتراحات إرشادية فقط ولا تعيد إسناد المهام.', 'Suggestions indicatives, sans réaffectation automatique.', 'Suggestions only; tasks are never reassigned automatically.')}</p></div><Users size={18} /></div>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr>
                <th>{t3('الفني', 'Technicien', 'Technician')}</th>
                <th>{t3('المهارة', 'Compétence', 'Skill')}</th>
                <th>{t3('التوفر', 'Disponibilité', 'Availability')}</th>
                <th>{t3('مفتوحة', 'Ouvertes', 'Open')}</th>
                <th>{t3('حرجة', 'Critiques', 'Critical')}</th>
                <th>{t3('متأخرة', 'En retard', 'Overdue')}</th>
                <th>{t3('الحمل', 'Charge', 'Load')}</th>
                <th>{t3('اقتراحات', 'Suggestions', 'Suggestions')}</th>
              </tr></thead>
              <tbody>
                {!overview.workload.length && <tr><td colSpan={8}><EmptyState title={t3('لا يوجد فنيون', 'Aucun technicien', 'No technicians')} description={t3('أضف حسابات الفنيين لعرض الحمل.', 'Ajoutez des techniciens pour voir la charge.', 'Add technician accounts to see workload.')} /></td></tr>}
                {overview.workload.map(tech => (
                  <tr key={tech.id}>
                    <td><strong>{tech.name}</strong><div className="table-subline">{tech.shift || '—'}</div></td>
                    <td>{tech.skill || <span className="muted">{t3('غير محدد', 'Non renseigné', 'Not set')}</span>}</td>
                    <td>{tech.availability || '—'} / {tech.attendance || '—'}</td>
                    <td>{tech.openTasks}</td>
                    <td>{tech.criticalTasks}</td>
                    <td>{tech.overdueTasks}</td>
                    <td><span className={`status-badge status-${tech.level === 'OVERLOADED' ? 'danger' : tech.level === 'UNDERUTILIZED' ? 'info' : tech.level === 'UNAVAILABLE' ? 'warning' : 'success'}`}>{tech.level}</span></td>
                    <td>
                      {!tech.suggestions.length && <span className="muted">{t3('لا اقتراح', 'Aucune', 'None')}</span>}
                      {tech.suggestions.map(suggestion => (
                        <div key={suggestion.taskId} className="copilot-suggestion">
                          <span>#{suggestion.taskId} {suggestion.title}</span>
                          <small>{suggestion.skillMatch === 'MATCH' ? t3('مهارة متوافقة', 'Compétence compatible', 'Skill match') : t3('توفر فقط', 'Disponibilité seule', 'Availability only')}</small>
                        </div>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      )}

      <article className="panel">
        <div className="panel-heading">
          <div><h2>{t3('التقارير الآلية', 'Rapports automatiques', 'Automated reports')}</h2><p>{t3('تقرير يومي أو ملخص أسبوعي من السجلات الفعلية.', 'Rapport quotidien ou synthèse hebdomadaire.', 'Daily report or weekly summary from actual records.')}</p></div>
          <div className="copilot-tabs">
            <button type="button" className={`button ${period === 'daily' ? 'button-primary' : 'button-secondary'}`} onClick={() => setPeriod('daily')}>{t3('يومي', 'Quotidien', 'Daily')}</button>
            <button type="button" className={`button ${period === 'weekly' ? 'button-primary' : 'button-secondary'}`} onClick={() => setPeriod('weekly')}>{t3('أسبوعي', 'Hebdomadaire', 'Weekly')}</button>
          </div>
        </div>
        <div className="copilot-report">
          {reportError && <p className="auth-message auth-error" role="alert">{reportError}</p>}
          {!reportError && reportLoading && !report && <p className="muted">{t3('جاري إنشاء التقرير…', 'Génération…', 'Generating…')}</p>}
          {report && (
            <>
              <div className="copilot-report-grid">
                <div><span>{t3('أوامر منشأة', 'OT créés', 'Tasks created')}</span><strong>{report.facts.tasksCreated}</strong></div>
                <div><span>{t3('أوامر منجزة', 'OT terminés', 'Tasks completed')}</span><strong>{report.facts.tasksCompleted}</strong></div>
                <div><span>{t3('مفتوحة', 'Ouverts', 'Open')}</span><strong>{report.facts.openWorkOrders}</strong></div>
                <div><span>{t3('متأخرة', 'En retard', 'Overdue')}</span><strong>{report.facts.overdueWorkOrders}</strong></div>
                <div><span>{t3('أعطال', 'Pannes', 'Breakdowns')}</span><strong>{report.facts.breakdowns}</strong></div>
                <div><span>{t3('توقف (دقيقة)', 'Arrêt (min)', 'Downtime (min)')}</span><strong>{report.facts.downtimeMinutes}</strong></div>
                <div><span>{t3('تدخلات مسجلة', 'Interventions', 'Interventions logged')}</span><strong>{report.facts.interventionsLogged}</strong></div>
                <div><span>{t3('إتمام الوقائية', 'Préventif réalisé', 'PM completion')}</span><strong>{report.facts.preventiveCompletionRate == null ? t3('لا بيانات', 'Aucune donnée', 'No data') : `${report.facts.preventiveCompletionRate}%`}</strong></div>
              </div>
              <p className="muted copilot-range">{new Date(report.from).toLocaleDateString()} → {new Date(report.to).toLocaleDateString()}</p>
              <div className="table-wrap">
                <table className="data-table">
                  <thead><tr><th>{t3('الفني', 'Technicien', 'Technician')}</th><th>{t3('مهام منجزة', 'OT terminés', 'Tasks completed')}</th><th>{t3('تدخلات مسجلة', 'Interventions', 'Logged interventions')}</th><th>{t3('مفتوحة', 'Ouverts', 'Open')}</th></tr></thead>
                  <tbody>
                    {!report.technicianSummary.length && <tr><td colSpan={4} className="muted">{t3('لا توجد بيانات فنيين.', 'Aucune donnée technicien.', 'No technician data.')}</td></tr>}
                    {report.technicianSummary.map(tech => <tr key={tech.id}><td>{tech.name}</td><td>{tech.completedTasks}</td><td>{tech.loggedInterventions}</td><td>{tech.openTasks}</td></tr>)}
                  </tbody>
                </table>
              </div>
              {report.dataQuality.missing.length > 0 && <p className="data-note">{t3('بيانات ناقصة:', 'Données manquantes :', 'Missing data:')} {report.dataQuality.missing.join(', ')}</p>}
            </>
          )}
        </div>
      </article>

      {overview?.dataQuality.missing.length ? <p className="data-note">{t3('بيانات ناقصة:', 'Données manquantes :', 'Missing data:')} {overview.dataQuality.missing.join(', ')}</p> : null}
    </section>
  )
}
