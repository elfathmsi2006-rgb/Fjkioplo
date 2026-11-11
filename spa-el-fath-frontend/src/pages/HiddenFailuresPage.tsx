import { useCallback, useEffect, useState } from 'react'
import { Activity, AlertTriangle, CheckCircle2, Eye, Gauge, RefreshCw, ShieldAlert, Wrench } from 'lucide-react'
import { PageHeader } from '../components/ui/PageHeader'
import { MetricCard } from '../components/ui/MetricCard'
import { EmptyState } from '../components/ui/EmptyState'
import { useApp } from '../app/AppProvider'

const API = ((import.meta.env.VITE_API_URL as string | undefined) || 'http://localhost:3000').replace(/\/+$/, '')

type Evidence = Record<string, unknown>
type Finding = {
  id: number
  machine: { id: number; code: string | null; name: string | null; state: string | null }
  category: string
  key: string
  riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  riskScore: number
  title: string
  explanation: string
  recommendationCode: string
  recommendation: string
  evidence: Evidence
  scoreFactors: Array<{ code: string; points: number; value: number }>
  windowDays: number
  firstEvidenceAt: string | null
  lastEvidenceAt: string | null
  status: 'OPEN' | 'ACKNOWLEDGED' | 'REVIEW' | 'RESOLVED'
  note: string | null
}
type MachineRisk = {
  machineId: number
  code: string | null
  name: string | null
  state: string | null
  riskScore: number
  riskLevel: string
  findingCount: number
  lastEvidenceAt: string | null
}
type Coverage = {
  machines: number
  withConditionReadings: number
  withMeterReadings: number
  withoutConditionReadings: number[]
  insufficientTrendMachines: number[]
  machinesWithoutActivity: number[]
}
type Payload = {
  windowDays: number
  generatedAt: string
  summary: { total: number; byLevel: Record<string, number>; byCategory: Record<string, number> }
  findings: Finding[]
  machineRisks: MachineRisk[]
  coverage: Coverage | null
  dataQuality: { missing: string[]; notes: string[] }
}

const WINDOWS = [30, 60, 90, 180, 365]

export default function HiddenFailuresPage() {
  const { language } = useApp()
  const ar = language === 'ar'
  const fr = language === 'fr'
  const t3 = (a: string, f: string, e: string) => (ar ? a : fr ? f : e)

  const [windowDays, setWindowDays] = useState(90)
  const [data, setData] = useState<Payload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState<number | null>(null)
  const [notes, setNotes] = useState<Record<number, string>>({})
  const [openEvidence, setOpenEvidence] = useState<number | null>(null)

  const load = useCallback(async (days: number) => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch(`${API}/api/hidden-failures?windowDays=${days}`, { credentials: 'include' })
      const body = await response.json().catch(() => null)
      if (!response.ok || !body?.success) {
        throw new Error(body?.message || (ar ? 'تعذّر تحميل كاشف الأعطال الخفية.' : fr ? 'Impossible de charger le détecteur.' : 'Could not load the hidden failure center.'))
      }
      setData(body.data as Payload)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load the hidden failure center.')
    } finally {
      setLoading(false)
    }
  }, [ar, fr])

  useEffect(() => { void load(windowDays) }, [windowDays, load])

  const updateStatus = async (finding: Finding, status: string) => {
    setBusyId(finding.id)
    setError('')
    try {
      const response = await fetch(`${API}/api/hidden-failures/${finding.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, note: notes[finding.id] || null }),
      })
      const body = await response.json().catch(() => null)
      if (!response.ok || !body?.success) {
        throw new Error(body?.message || (ar ? 'تعذّر تحديث الحالة.' : fr ? 'Impossible de mettre à jour le statut.' : 'Could not update the finding status.'))
      }
      await load(windowDays)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not update the finding status.')
    } finally {
      setBusyId(null)
    }
  }

  const categoryLabel = (category: string) => ({
    REPEATED_FAILURE: t3('أعطال متكررة', 'Pannes répétées', 'Repeated failures'),
    EARLY_RECURRENCE: t3('عطل بعد الإصلاح', 'Retour après réparation', 'Failure after repair'),
    RECURRING_ROOT_CAUSE: t3('سبب متكرر', 'Cause récurrente', 'Recurring cause'),
    REPAIR_DURATION_INCREASE: t3('تزايد مدة الإصلاح', 'Durée de réparation en hausse', 'Repair duration increase'),
    HIGH_INTERVENTION_FREQUENCY: t3('تدخلات مكثفة', 'Interventions fréquentes', 'High intervention frequency'),
    REPEATED_PART_REPLACEMENT: t3('قطع غيار متكررة', 'Pièces répétées', 'Repeated part replacement'),
    CONDITION_THRESHOLD: t3('تجاوز الحد', 'Seuil dépassé', 'Threshold exceeded'),
    CONDITION_TREND: t3('اتجاه غير طبيعي', 'Tendance anormale', 'Abnormal trend'),
    METER_USAGE_SPIKE: t3('ارتفاع الاستخدام', 'Hausse d’utilisation', 'Meter usage spike'),
    INSUFFICIENT_MONITORING: t3('مراقبة غير كافية', 'Suivi insuffisant', 'Insufficient monitoring'),
  }[category] || category)

  const recommendationLabel = (code: string) => ({
    REVIEW_FAILURE_HISTORY: t3('راجع تاريخ الأعطال وأكّد نمط العطل.', 'Revoyez l’historique et confirmez le mode de défaillance.', 'Review the failure history and confirm the failure mode.'),
    VERIFY_REPAIR_EFFECTIVENESS: t3('تحقق من فعالية الإصلاح السابق.', 'Vérifiez l’efficacité de la réparation précédente.', 'Verify the previous repair effectiveness.'),
    CONFIRM_ROOT_CAUSE: t3('افحص النظام المتأثر وأكّد السبب الجذري.', 'Inspectez le sous-système et confirmez la cause.', 'Inspect the subsystem and confirm the root cause.'),
    REVIEW_REPAIR_COMPLEXITY: t3('راجع تعقيد الإصلاحات الأخيرة.', 'Revoyez la complexité des réparations récentes.', 'Review recent repair complexity.'),
    COMPARE_UTILIZATION: t3('قارن معدل التدخل مع ساعات التشغيل.', 'Comparez avec les heures de fonctionnement.', 'Compare intervention rate with operating hours.'),
    VERIFY_PART_AND_CAUSE: t3('تحقق من ملاءمة القطعة وسبب الاستبدال.', 'Vérifiez la pièce et la cause du remplacement.', 'Verify part suitability and the replacement cause.'),
    INSPECT_CONDITION: t3('افحص حالة الآلة وتحقّق من القراءة.', 'Inspectez la machine et vérifiez la mesure.', 'Inspect the machine and verify the reading.'),
    TREND_INSPECTION: t3('راجع تاريخ القياسات وافحص المكوّن.', 'Revoyez les mesures et inspectez le composant.', 'Review measurements and inspect the component.'),
    VERIFY_METER_USAGE: t3('تحقق من الاستخدام مقابل الإنتاج.', 'Vérifiez l’utilisation par rapport à la production.', 'Verify usage against production records.'),
    START_CONDITION_MONITORING: t3('ابدأ تسجيل قراءات الحالة.', 'Commencez à enregistrer les mesures.', 'Start recording condition readings.'),
  }[code] || code)

  const statusLabel = (status: string) => ({
    OPEN: t3('مفتوح', 'Ouvert', 'Open'),
    ACKNOWLEDGED: t3('تم الاطلاع', 'Pris en compte', 'Acknowledged'),
    REVIEW: t3('قيد المراجعة', 'En revue', 'Under review'),
    RESOLVED: t3('محلول', 'Résolu', 'Resolved'),
  }[status] || status)

  const levelTone = (level: string) => level === 'CRITICAL' ? 'danger' : level === 'HIGH' ? 'warning' : level === 'MEDIUM' ? 'info' : 'success'
  const dateLabel = (value: string | null) => value ? new Date(value).toLocaleDateString() : t3('غير متاح', 'Non disponible', 'Not available')
  const machineLabel = (item: { code: string | null; name: string | null }) => [item.code, item.name].filter(Boolean).join(' — ') || t3('آلة غير معروفة', 'Machine inconnue', 'Unknown machine')

  const facts = data?.summary
  const coverage = data?.coverage
  const monitoredRate = coverage?.machines ? Math.round((coverage.withConditionReadings / coverage.machines) * 100) : null

  return (
    <section className="page-section">
      <PageHeader
        eyebrow={t3('كاشف الأعطال الخفية', 'Détecteur de défaillances cachées', 'Hidden failure detector')}
        title={t3('مركز الأعطال ذات الأدلة', 'Centre des défaillances documentées', 'Evidence-based failure center')}
        description={t3('تحليل حتمي من سجلات الأعطال والتدخلات والقطع والقياسات. الارتباطات ليست سبباً مؤكداً.', 'Analyse déterministe des pannes, interventions, pièces et mesures. Aucune corrélation n’est présentée comme cause confirmée.', 'Deterministic analysis of breakdown, repair, part and measurement records. Correlations are never presented as confirmed causes.')}
        action={
          <div className="copilot-toolbar">
            <label className="field-label copilot-date">
              {t3('الفترة', 'Fenêtre', 'Window')}
              <select value={windowDays} onChange={event => setWindowDays(Number(event.target.value))}>
                {WINDOWS.map(days => <option key={days} value={days}>{days} {t3('يوم', 'jours', 'days')}</option>)}
              </select>
            </label>
            <button className="button button-secondary" type="button" onClick={() => void load(windowDays)} disabled={loading}>
              <RefreshCw size={15} /> {loading ? '…' : t3('تحديث', 'Actualiser', 'Refresh')}
            </button>
          </div>
        }
      />

      {error && <p className="auth-message auth-error" role="alert">{error}</p>}
      {!error && loading && !data && <EmptyState title={t3('جاري تحليل الأدلة…', 'Analyse des preuves…', 'Analysing evidence…')} description="" />}

      {facts && (
        <div className="metrics-grid copilot-metrics">
          <MetricCard icon={<ShieldAlert size={18} />} tone="red" label={t3('حرجة', 'Critiques', 'Critical')} value={facts.byLevel.CRITICAL || 0} />
          <MetricCard icon={<AlertTriangle size={18} />} tone="amber" label={t3('عالية', 'Élevées', 'High')} value={facts.byLevel.HIGH || 0} />
          <MetricCard icon={<Gauge size={18} />} tone="blue" label={t3('آلات معرضة للخطر', 'Machines à risque', 'Machines at risk')} value={data?.machineRisks.length || 0} note={`${facts.total} ${t3('دليل', 'constats', 'findings')}`} />
          <MetricCard icon={<Activity size={18} />} tone={monitoredRate != null && monitoredRate >= 60 ? 'green' : 'amber'} label={t3('تغطية قراءات الحالة', 'Couverture des mesures', 'Condition coverage')} value={monitoredRate == null ? t3('لا بيانات', 'Aucune donnée', 'No data') : `${monitoredRate}%`} note={coverage ? `${coverage.withConditionReadings}/${coverage.machines}` : undefined} />
        </div>
      )}

      {data?.dataQuality.missing.length ? (
        <p className="data-note">{t3('بيانات ناقصة:', 'Données manquantes :', 'Missing data:')} {data.dataQuality.missing.join(', ')} — {t3('تم تخطي القواعد المتأثرة بدلاً من التقدير.', 'Les règles concernées ont été ignorées.', 'Affected rules were skipped instead of estimated.')}</p>
      ) : null}

      {coverage && (coverage.insufficientTrendMachines.length > 0 || coverage.withoutConditionReadings.length > 0) && (
        <p className="data-note">
          {t3('بيانات غير كافية للاتجاه:', 'Données insuffisantes pour la tendance :', 'Insufficient trend data:')} {coverage.insufficientTrendMachines.length} · {t3('آلات دون قراءات حالة:', 'Machines sans mesures :', 'Machines without condition readings:')} {coverage.withoutConditionReadings.length}
        </p>
      )}

      <article className="panel">
        <div className="panel-heading">
          <div><h2>{t3('ترتيب الآلات حسب الخطر', 'Classement des machines par risque', 'Machines ranked by risk')}</h2><p>{t3('درجة شفافة من الأدلة ضمن الفترة المحددة.', 'Score transparent basé sur les preuves de la période.', 'Transparent score from evidence in the selected window.')}</p></div>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr>
              <th>#</th>
              <th>{t3('الآلة', 'Machine', 'Machine')}</th>
              <th>{t3('الخطر', 'Risque', 'Risk')}</th>
              <th>{t3('الدرجة', 'Score', 'Score')}</th>
              <th>{t3('الأدلة', 'Constats', 'Findings')}</th>
              <th>{t3('آخر دليل', 'Dernière preuve', 'Last evidence')}</th>
            </tr></thead>
            <tbody>
              {!data?.machineRisks.length && <tr><td colSpan={6}><EmptyState title={t3('لا توجد أدلة كافية', 'Aucune preuve suffisante', 'No sufficient evidence')} description={t3('لم تُكتشف أنماط متكررة ضمن هذه الفترة.', 'Aucun schéma récurrent détecté sur cette période.', 'No recurring pattern detected in this window.')} /></td></tr>}
              {data?.machineRisks.map((machine, index) => (
                <tr key={machine.machineId}>
                  <td>{index + 1}</td>
                  <td><strong>{machineLabel(machine)}</strong><div className="table-subline">{machine.state || '—'} · #{machine.machineId}</div></td>
                  <td><span className={`status-badge status-${levelTone(machine.riskLevel)}`}>{machine.riskLevel}</span></td>
                  <td><strong>{machine.riskScore}</strong>/100</td>
                  <td>{machine.findingCount}</td>
                  <td>{dateLabel(machine.lastEvidenceAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      <article className="panel">
        <div className="panel-heading">
          <div><h2>{t3('الأدلة والتحقق', 'Preuves et vérification', 'Evidence and review')}</h2><p>{t3('كل نتيجة مرتبطة بسجلات المصدر وتتطلب قرار المدير.', 'Chaque constat renvoie aux enregistrements sources et requiert une décision.', 'Every finding points to source records and requires a manager decision.')}</p></div>
          <span className="status-badge status-info">{data?.findings.length || 0}</span>
        </div>
        <div className="copilot-list">
          {!loading && !data?.findings.length && <EmptyState title={t3('لا توجد نتائج نشطة', 'Aucun constat actif', 'No active findings')} description={t3('لا توجد أدلة كافية على أعطال خفية حالياً.', 'Aucune preuve suffisante pour le moment.', 'No sufficient hidden-failure evidence at this time.')} />}
          {data?.findings.map(finding => (
            <div className="copilot-item" key={finding.id}>
              <div className="copilot-item-head">
                <span className={`status-badge status-${levelTone(finding.riskLevel)}`}>{finding.riskLevel} · {finding.riskScore}</span>
                <strong>{categoryLabel(finding.category)}</strong>
                <span className={`status-badge status-${finding.status === 'RESOLVED' ? 'success' : finding.status === 'OPEN' ? 'danger' : 'warning'}`}>{statusLabel(finding.status)}</span>
              </div>
              <p className="copilot-subject">{finding.title}</p>
              <div className="copilot-meta">
                <span>{machineLabel(finding.machine)}</span>
                <span>{t3('الفترة', 'Fenêtre', 'Window')}: {finding.windowDays} {t3('يوم', 'j', 'd')}</span>
                <span>{t3('آخر دليل', 'Dernière preuve', 'Last evidence')}: {dateLabel(finding.lastEvidenceAt)}</span>
              </div>
              <p className="copilot-recommendation"><CheckCircle2 size={14} /> {finding.recommendation || recommendationLabel(finding.recommendationCode)}</p>
              <p className="copilot-source">{finding.explanation}</p>

              <div className="copilot-meta">
                {finding.scoreFactors.map(factor => (
                  <span key={factor.code}>{factor.code}: +{factor.points} ({String(factor.value)})</span>
                ))}
                <button className="button button-secondary copilot-evidence-toggle" type="button" onClick={() => setOpenEvidence(openEvidence === finding.id ? null : finding.id)}>
                  <Eye size={14} /> {openEvidence === finding.id ? t3('إخفاء الأدلة', 'Masquer les preuves', 'Hide evidence') : t3('عرض الأدلة', 'Voir les preuves', 'View evidence')}
                </button>
              </div>

              {openEvidence === finding.id && (
                <pre className="copilot-evidence-json">{JSON.stringify(finding.evidence, null, 2)}</pre>
              )}

              <div className="copilot-workflow">
                <input
                  type="text"
                  maxLength={1000}
                  placeholder={t3('ملاحظة القرار (اختياري)', 'Note de décision (facultatif)', 'Decision note (optional)')}
                  value={notes[finding.id] || ''}
                  onChange={event => setNotes(current => ({ ...current, [finding.id]: event.target.value }))}
                />
                {finding.status === 'OPEN' && <button className="button button-secondary" type="button" disabled={busyId === finding.id} onClick={() => void updateStatus(finding, 'ACKNOWLEDGED')}>{t3('اطلاع', 'Prendre en compte', 'Acknowledge')}</button>}
                {['OPEN', 'ACKNOWLEDGED'].includes(finding.status) && <button className="button button-secondary" type="button" disabled={busyId === finding.id} onClick={() => void updateStatus(finding, 'REVIEW')}><Wrench size={14} /> {t3('مراجعة', 'En revue', 'Review')}</button>}
                {finding.status !== 'RESOLVED' && <button className="button button-primary" type="button" disabled={busyId === finding.id} onClick={() => void updateStatus(finding, 'RESOLVED')}><CheckCircle2 size={14} /> {t3('حل', 'Résoudre', 'Resolve')}</button>}
                {finding.status === 'RESOLVED' && <button className="button button-secondary" type="button" disabled={busyId === finding.id} onClick={() => void updateStatus(finding, 'OPEN')}>{t3('إعادة فتح', 'Réouvrir', 'Reopen')}</button>}
              </div>
            </div>
          ))}
        </div>
      </article>
    </section>
  )
}
