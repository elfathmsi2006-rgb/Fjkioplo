import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Activity, AlertTriangle, ArrowUpRight, CalendarClock, CheckCircle2, Factory, Gauge, Wrench, Lightbulb, LockKeyhole } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Area, AreaChart } from 'recharts'
import { useApp } from '../app/AppProvider'
import { useTranslation } from '../hooks/useTranslation'
import { localizedMachineName, localizedWorkshopName, formatNumber } from '../utils/format'
import { PageHeader } from '../components/ui/PageHeader'
import { MetricCard } from '../components/ui/MetricCard'
import { EmptyState } from '../components/ui/EmptyState'
import { canAccessPath } from '../utils/permissions'

const COLORS = ['#20a779', '#e5a43b', '#e45c67', '#6c7de8']

type InterventionChartRow = { label: string; count: number }
type InterventionDashboardData = {
  summary: { total: number; durationRecords: number; totalDurationMinutes: number; averageDurationMinutes: number | null }
  causes: InterventionChartRow[]
  machines: InterventionChartRow[]
  workshops: InterventionChartRow[]
  technicians: InterventionChartRow[]
  monthly: Array<{ month: string; count: number }>
}

export default function DashboardPage() {
  const { machines, workshops, maintenanceLogs, activities, language, role } = useApp()
  const { t } = useTranslation()
  const [tourDismissed, setTourDismissed] = useState(false)
  const [now, setNow] = useState(() => new Date())
  const [interventionData, setInterventionData] = useState<InterventionDashboardData | null>(null)
  const [interventionError, setInterventionError] = useState('')
  const [interventionLoading, setInterventionLoading] = useState(false)
  useEffect(() => { const timer = window.setInterval(() => setNow(new Date()), 60000); return () => window.clearInterval(timer) }, [])
  useEffect(() => {
    if (role !== 'admin') { setInterventionData(null); setInterventionError(''); return }
    const controller = new AbortController()
    const apiBase = ((import.meta.env.VITE_API_URL as string | undefined) || 'http://localhost:3000').replace(/\/+$/, '')
    setInterventionLoading(true)
    setInterventionError('')
    fetch(`${apiBase}/api/interventions/dashboard`, { credentials: 'include', signal: controller.signal })
      .then(async response => {
        const body = await response.json().catch(() => ({}))
        if (!response.ok || body.success !== true) throw new Error(body.message || `Historical interventions request failed (${response.status}).`)
        return body.data as InterventionDashboardData
      })
      .then(data => setInterventionData(data))
      .catch(error => { if (error?.name !== 'AbortError') { setInterventionData(null); setInterventionError(error instanceof Error ? error.message : 'Could not load historical interventions.') } })
      .finally(() => { if (!controller.signal.aborted) setInterventionLoading(false) })
    return () => controller.abort()
  }, [role])
  const counts = useMemo(() => ({
    working: machines.filter(m => m.status === 'working').length,
    broken: machines.filter(m => m.status === 'broken').length,
    maintenance: machines.filter(m => m.status === 'maintenance').length,
  }), [machines])
  const operationalShare = machines.length ? Math.round(counts.working / machines.length * 100) : 0
  const statusData = [{ name: t('working'), value: counts.working }, { name: t('inMaintenance'), value: counts.maintenance }, { name: t('broken'), value: counts.broken }]
  const monthData = Array.from({ length: 6 }, (_, index) => {
    const date = new Date()
    date.setMonth(date.getMonth() - (5 - index))
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    return { month: new Intl.DateTimeFormat(language === 'ar' ? 'ar-DZ' : language === 'fr' ? 'fr-DZ' : 'en-US', { month: 'short' }).format(date), count: maintenanceLogs.filter(log => log.date.startsWith(key)).length, historicalCount: interventionData?.monthly.find(item => item.month === key)?.count ?? 0 }
  })
  const monthlyKeys = Array.from({ length: 6 }, (_, index) => {
    const date = new Date()
    date.setMonth(date.getMonth() - (5 - index))
    return { key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`, month: new Intl.DateTimeFormat(language === 'ar' ? 'ar-DZ' : language === 'fr' ? 'fr-DZ' : 'en-US', { month: 'short' }).format(date) }
  })
  const costData = monthlyKeys.map(({ key, month }) => ({ month, cost: maintenanceLogs.filter(log => log.date.startsWith(key)).reduce((sum, log) => sum + (Number(log.cost) || 0), 0) }))
  const maintenanceTypeData = monthlyKeys.map(({ key, month }) => ({ month, preventive: maintenanceLogs.filter(log => log.date.startsWith(key) && log.type === 'preventive').length, corrective: maintenanceLogs.filter(log => log.date.startsWith(key) && log.type === 'corrective').length }))
  const workshopDowntimeData = workshops.map(workshop => ({ name: localizedWorkshopName(workshop, language), hours: maintenanceLogs.filter(log => machines.find(machine => machine.id === log.machineId)?.workshopId === workshop.id).reduce((sum, log) => sum + (Number(log.durationHours) || 0), 0) })).filter(item => item.hours > 0).sort((a, b) => b.hours - a.hours).slice(0, 8)
  const todayKey = new Date().toISOString().slice(0, 10)
  const complianceData = [{ name: language === 'ar' ? 'متأخرة' : language === 'fr' ? 'En retard' : 'Overdue', value: machines.filter(machine => machine.nextMaintenance && machine.nextMaintenance < todayKey).length }, { name: language === 'ar' ? 'خلال 7 أيام' : language === 'fr' ? 'Sous 7 jours' : 'Due in 7 days', value: machines.filter(machine => machine.nextMaintenance && machine.nextMaintenance >= todayKey && machine.nextMaintenance <= new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)).length }, { name: language === 'ar' ? 'ضمن الجدول' : language === 'fr' ? 'À jour' : 'On schedule', value: machines.filter(machine => !machine.nextMaintenance || machine.nextMaintenance > new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)).length }]
  const correctiveLogs = maintenanceLogs.filter(log => log.type === 'corrective' && Number(log.durationHours) > 0)
  const mttrValue = correctiveLogs.length ? correctiveLogs.reduce((sum, log) => sum + Number(log.durationHours), 0) / correctiveLogs.length : 0
  const mttrData = monthlyKeys.map(({ key, month }) => { const logs = correctiveLogs.filter(log => log.date.startsWith(key)); return { month, hours: logs.length ? Number((logs.reduce((sum, log) => sum + Number(log.durationHours), 0) / logs.length).toFixed(1)) : 0 } })
  const attentionMachines = machines.filter(machine => machine.status === 'broken' || (machine.nextMaintenance && machine.nextMaintenance < new Date().toISOString().slice(0, 10))).slice(0, 5)
  const dateLabel = new Intl.DateTimeFormat(language === 'ar' ? 'ar-DZ' : language === 'fr' ? 'fr-DZ' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(now)
  const greeting = now.getHours() < 12 ? (language === 'ar' ? 'صباح الخير' : language === 'fr' ? 'Bonjour' : 'Good morning') : (language === 'ar' ? 'مساء الخير' : language === 'fr' ? 'Bonsoir' : 'Good afternoon')

  const quotes = {
    ar: [
      'اللهم صلِّ وسلم وبارك على نبينا محمد وعلى آله وصحبه أجمعين.',
      'اللهم صلِّ وسلم على سيدنا محمد عدد ما ذكره الذاكرون وغفل عن ذكره الغافلون.',
      'اللهم صلِّ على محمد وعلى آل محمد كما صليت على إبراهيم وعلى آل إبراهيم.',
      'اللهم بارك وسلم على نبينا محمد، واجزه عنا خير ما جزيت نبيًا عن أمته.',
      'اللهم صلِّ وسلم على نبينا محمد صلاةً تشرح بها صدورنا وتيسر بها أمورنا.',
      'الإتقان ليس خيارًا، بل هو أسلوب عملنا.',
      'كل إنجاز عظيم يبدأ بخطوة صغيرة متقنة.',
      'السلامة أولًا، والجودة دائمًا.',
      'فريق واحد، هدف واحد، نجاح واحد.',
      'لا تبحث عن الأعذار، بل اصنع الحلول.',
      'النجاح نتيجة الانضباط والاستمرار.',
      'كل عطل فرصة لنتعلم ونصبح أفضل.',
      'وقاية اليوم توفر أعطال الغد.',
      'الدقة في التفاصيل تصنع الفرق الكبير.',
      'الوقت أمانة، واستثماره بداية النجاح.',
      'تعاوننا هو قوتنا، واحترامنا أساس نجاحنا.',
      'لا يوجد عمل صغير عندما يكون أثره كبيرًا.',
      'كل مشكلة لها حل، وكل تحدٍّ يحمل فرصة.',
      'حافظ على معداتك، فهي شريك نجاحك.',
      'التميز عادة نصنعها كل يوم.',
      'ابدأ يومك بعزيمة، وأنهِه بإنجاز.',
      'معًا نبني بيئة عمل أكثر أمانًا وكفاءة.'
    ],
    fr: [
      'Que la paix, les bénédictions et le salut soient sur notre Prophète Mohammed, sa famille et ses compagnons.',
      'Ô Allah, accorde Ta paix et Tes bénédictions à notre Prophète Mohammed autant que les croyants se souviennent de lui.',
      'Ô Allah, prie sur Mohammed et sur la famille de Mohammed comme Tu as prié sur Ibrahim et sa famille.',
      'Ô Allah, bénis et salue notre Prophète Mohammed et récompense-le pour sa communauté.',
      'Ô Allah, accorde Ta paix et Tes bénédictions à notre Prophète Mohammed et facilite nos affaires.',
      'L’excellence n’est pas une option, c’est notre méthode de travail.',
      'Chaque grande réussite commence par un petit pas bien fait.',
      'La sécurité d’abord, la qualité toujours.',
      'Une équipe, un objectif, une réussite.',
      'Ne cherchez pas d’excuses, créez des solutions.',
      'La réussite naît de la discipline et de la persévérance.',
      'Chaque panne est une occasion d’apprendre et de progresser.',
      'La prévention d’aujourd’hui évite les pannes de demain.',
      'Le souci du détail fait toute la différence.',
      'Le temps est une responsabilité : bien l’utiliser ouvre la voie à la réussite.',
      'Notre coopération est notre force, le respect est la base de notre réussite.',
      'Aucun travail n’est petit lorsque son impact est grand.',
      'Chaque problème a une solution et chaque défi une opportunité.',
      'Prenez soin de vos équipements, ils contribuent à votre réussite.',
      'L’excellence est une habitude que nous construisons chaque jour.',
      'Commencez la journée avec détermination et terminez-la avec un résultat.',
      'Ensemble, construisons un environnement de travail plus sûr et plus efficace.'
    ],
    en: [
      'May peace, blessings, and salutations be upon our Prophet Muhammad, his family, and his companions.',
      'O Allah, send peace and blessings upon our Prophet Muhammad whenever those who remember You mention him.',
      'O Allah, bless Muhammad and the family of Muhammad as You blessed Ibrahim and the family of Ibrahim.',
      'O Allah, bless and grant peace to our Prophet Muhammad, and reward him on behalf of his community.',
      'O Allah, send peace and blessings upon our Prophet Muhammad and make our work easier.',
      'Excellence is not an option; it is how we work.',
      'Every great achievement begins with one well-executed small step.',
      'Safety first, quality always.',
      'One team, one goal, one success.',
      'Do not look for excuses; create solutions.',
      'Success is built on discipline and consistency.',
      'Every breakdown is a chance to learn and improve.',
      'Preventive action today avoids tomorrow’s failures.',
      'Attention to detail makes a big difference.',
      'Time is a responsibility; using it well is the start of success.',
      'Cooperation is our strength, and respect is the foundation of success.',
      'No task is small when its impact is meaningful.',
      'Every problem has a solution, and every challenge holds an opportunity.',
      'Take care of your equipment; it is a partner in your success.',
      'Excellence is a habit we build every day.',
      'Start your day with determination and finish it with achievement.',
      'Together, we build a safer and more efficient workplace.'
    ]
  }
  const dayNumber = Math.floor((new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000)
  const dailyQuote = quotes[language][dayNumber % quotes[language].length]
  const briefingItems = [
    {
      key: 'broken',
      count: counts.broken,
      label: language === 'ar' ? 'آلة مسجلة كمعطلة' : language === 'fr' ? 'machine(s) déclarée(s) en panne' : 'machine(s) recorded as broken',
      detail: language === 'ar' ? 'راجع بلاغات الأعطال وحدد أولوية التدخل.' : language === 'fr' ? 'Vérifiez les signalements et priorisez les interventions.' : 'Review breakdown reports and prioritize interventions.',
    },
    {
      key: 'overdue',
      count: machines.filter(machine => Boolean(machine.nextMaintenance) && machine.nextMaintenance! < now.toISOString().slice(0, 10)).length,
      label: language === 'ar' ? 'صيانة وقائية متأخرة حسب التاريخ المسجل' : language === 'fr' ? 'maintenance(s) préventive(s) en retard selon la date enregistrée' : 'preventive maintenance item(s) overdue by recorded date',
      detail: language === 'ar' ? 'تحقق من الخطة والتاريخ قبل اتخاذ الإجراء.' : language === 'fr' ? 'Vérifiez le plan et la date avant d’agir.' : 'Verify the plan and date before taking action.',
    },
    {
      key: 'logs',
      count: maintenanceLogs.filter(log => log.status !== 'completed').length,
      label: language === 'ar' ? 'سجل صيانة غير مكتمل' : language === 'fr' ? 'enregistrement(s) de maintenance non terminé(s)' : 'maintenance record(s) not marked completed',
      detail: language === 'ar' ? 'راجع الحالة وسجّل الإكمال عند التأكد فقط.' : language === 'fr' ? 'Vérifiez le statut et ne confirmez la clôture qu’après contrôle.' : 'Review status and mark complete only after verification.',
    },
  ]
  const restrictedDashboard = role === 'workshop_head' || role === 'maintenance_worker'
  if (restrictedDashboard) {
    return <section className="page-section">
      <PageHeader eyebrow={dateLabel} title={greeting} description={language === 'ar' ? 'مرحبًا بك في مساحة العمل.' : language === 'fr' ? 'Bienvenue dans votre espace de travail.' : 'Welcome to your workspace.'} />
      <article className="daily-inspiration-panel">
        <div className="daily-inspiration-icon"><Lightbulb size={24} /></div>
        <div><span className="daily-inspiration-label">{language === 'ar' ? 'إلهام اليوم' : language === 'fr' ? 'Inspiration du jour' : 'Daily inspiration'}</span><h2>{dailyQuote}</h2><p>{language === 'ar' ? 'تتجدد العبارة يوميًا لترافق فريقنا في عمله.' : language === 'fr' ? 'Une nouvelle phrase chaque jour pour accompagner notre équipe.' : 'A new quote each day to inspire our team.'}</p></div>
      </article>
      <div className="panel permitted-pages-panel"><div className="panel-heading"><div><h2>{language === 'ar' ? 'الوصول السريع' : language === 'fr' ? 'Accès rapide' : 'Quick access'}</h2><p>{language === 'ar' ? 'الأقسام المتاحة حسب صلاحية حسابك' : language === 'fr' ? 'Sections disponibles selon votre rôle' : 'Sections available for your role'}</p></div><LockKeyhole size={19} /></div><div className="permitted-page-links"><Link to="/machines">{t('machines')}</Link><Link to="/workshops">{t('workshops')}</Link><Link to="/maintenance">{t('maintenance')}</Link><Link to="/warehouse">{t('warehouse')}</Link>{role === 'maintenance_worker' && <Link to="/operations">{language === 'ar' ? 'مركز العمليات' : language === 'fr' ? 'Opérations' : 'Operations hub'}</Link>}</div></div>
    </section>
  }

  return <section className="page-section">
    <PageHeader eyebrow={dateLabel} title={greeting} description={t('dashboardDesc')} />
    <article className="daily-inspiration-panel"><div className="daily-inspiration-icon"><Lightbulb size={24} /></div><div><span className="daily-inspiration-label">{language === 'ar' ? 'إلهام اليوم' : language === 'fr' ? 'Inspiration du jour' : 'Daily inspiration'}</span><h2>{dailyQuote}</h2><p>{language === 'ar' ? 'تتجدد العبارة يوميًا لترافق فريقنا في عمله.' : language === 'fr' ? 'Une nouvelle phrase chaque jour pour accompagner notre équipe.' : 'A new quote each day to inspire our team.'}</p></div></article>
    {!tourDismissed && <div className="onboarding-card"><div className="onboarding-mark"><Factory size={23} /></div><div><strong>{t('onboardingTitle')}</strong><p>{t('onboardingText')}</p></div><button className="button button-secondary" onClick={() => { setTourDismissed(true) }}>{t('startTour')}</button><button className="icon-button" onClick={() => { setTourDismissed(true) }} aria-label={t('skip')}>×</button></div>}
    <div className="hero-banner"><div className="hero-copy"><span className="hero-kicker"><i className="live-dot" />{t('live')} · IndusFlow</span><h2>{t('welcome')}</h2><p>{t('overview')}</p><div className="hero-actions"><Link className="button button-light" to="/machines"><Gauge size={16} />{t('machines')}</Link><Link className="button button-glass" to="/maintenance"><Wrench size={16} />{t('maintenance')}</Link></div></div><div className="hero-orbit"><div className="orbit-ring ring-a" /><div className="orbit-ring ring-b" /><div className="hero-core"><Factory size={42} /></div><span className="hero-float float-a"><Activity size={15} />{operationalShare}%</span><span className="hero-float float-b"><Gauge size={15} />{machines.length}</span></div><div className="hero-grid" /></div>
    {role === 'admin' && <section className="manager-briefing panel" aria-labelledby="manager-briefing-title">
      <div className="panel-heading">
        <div>
          <span className="daily-inspiration-label">{language === 'ar' ? 'ملخص تشغيلي مبني على البيانات المسجلة' : language === 'fr' ? 'Synthèse opérationnelle basée sur les données enregistrées' : 'Operational briefing from recorded data'}</span>
          <h2 id="manager-briefing-title">{language === 'ar' ? 'إحاطة الصيانة اليومية' : language === 'fr' ? 'Briefing maintenance quotidien' : 'Daily maintenance briefing'}</h2>
        </div>
        <CalendarClock size={20} />
      </div>
      <div className="manager-briefing-grid">
        {briefingItems.map(item => <article className="manager-briefing-item" key={item.key}>
          <strong className="manager-briefing-count">{item.count}</strong>
          <div><h3>{item.label}</h3><p>{item.detail}</p></div>
        </article>)}
      </div>
      <p className="muted manager-briefing-note">{language === 'ar' ? 'هذه المؤشرات تعتمد على السجلات المتاحة فقط ولا تمثل قياسًا مباشرًا أو بيانات حساسات حية.' : language === 'fr' ? 'Ces indicateurs reposent uniquement sur les enregistrements disponibles et ne représentent pas des mesures en direct ni des données de capteurs.' : 'These indicators use available records only; they are not live measurements or sensor readings.'}</p>
    </section>}
    <div className="metrics-grid">
      <MetricCard icon={<Gauge size={20} />} label={t('totalMachines')} value={formatNumber(machines.length, language)} note={t('overview')} />
      <MetricCard icon={<CheckCircle2 size={20} />} label={t('working')} value={formatNumber(counts.working, language)} note={`${operationalShare}% ${language === 'ar' ? 'من الآلات تعمل حاليًا' : language === 'fr' ? 'des machines opérationnelles maintenant' : 'operational right now'}`} tone="green" />
      <MetricCard icon={<AlertTriangle size={20} />} label={t('broken')} value={formatNumber(counts.broken, language)} note={counts.broken ? t('attention') : t('noOverdue')} tone="red" />
      <MetricCard icon={<Wrench size={20} />} label={t('inMaintenance')} value={formatNumber(counts.maintenance, language)} note={role === 'admin' ? `${maintenanceLogs.length} ${t('maintenance')}` : t('maintenance')} tone="amber" />
    </div>
    {role === 'admin' && <div className="dashboard-charts">
      <article className="panel chart-panel"><div className="panel-heading"><div><h2>{t('status')}</h2><p>{t('overview')}</p></div><span className="panel-icon"><Activity size={18} /></span></div><div className="chart-body chart-donut"><ResponsiveContainer width="100%" height={220}><PieChart><Pie data={statusData} dataKey="value" nameKey="name" innerRadius={62} outerRadius={85} paddingAngle={4} stroke="none">{statusData.map((item, index) => <Cell key={item.name} fill={COLORS[index]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer><div className="donut-center"><strong>{operationalShare}%</strong><span>{language === 'ar' ? 'نسبة الآلات العاملة حاليًا' : language === 'fr' ? 'Machines opérationnelles actuellement' : 'Machines operational now'}</span></div></div><div className="chart-legend">{statusData.map((item, index) => <div key={item.name}><i style={{ background: COLORS[index] }} /><span>{item.name}</span><strong>{item.value}</strong></div>)}</div></article>
      <article className="panel chart-panel"><div className="panel-heading"><div><h2>{language === 'ar' ? 'ساعات التوقف حسب الورشة' : language === 'fr' ? 'Heures d’arrêt par atelier' : 'Downtime hours by workshop'}</h2><p>{language === 'ar' ? 'مجموع مدة سجلات الصيانة المرتبطة بآلات كل ورشة' : language === 'fr' ? 'Durée cumulée des interventions enregistrées par atelier' : 'Total recorded maintenance duration for each workshop'}</p></div><span className="panel-icon"><Factory size={18} /></span></div><div className="chart-body"><ResponsiveContainer width="100%" height={270}><BarChart data={workshopDowntimeData} margin={{ top: 10, right: 6, left: -18, bottom: 8 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" /><XAxis dataKey="name" tick={{ fill: 'var(--muted)', fontSize: 10 }} axisLine={false} tickLine={false} /><YAxis allowDecimals tick={{ fill: 'var(--muted)', fontSize: 10 }} axisLine={false} tickLine={false} /><Tooltip /><Bar dataKey="hours" name={language === 'ar' ? 'ساعات' : language === 'fr' ? 'Heures' : 'Hours'} fill="#e45c67" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer>{!workshopDowntimeData.length && <p className="muted chart-empty">{language === 'ar' ? 'لا توجد سجلات مدة صيانة مرتبطة بالورشات بعد.' : language === 'fr' ? 'Aucune durée d’intervention liée aux ateliers pour le moment.' : 'No workshop-linked maintenance durations recorded yet.'}</p>}</div></article>
      <article className="panel chart-panel"><div className="panel-heading"><div><h2>{language === 'ar' ? 'تكاليف الصيانة الشهرية' : language === 'fr' ? 'Coûts mensuels de maintenance' : 'Monthly maintenance costs'}</h2><p>{language === 'ar' ? 'مجموع التكاليف المسجلة خلال آخر ستة أشهر (دج)' : language === 'fr' ? 'Coûts enregistrés sur les six derniers mois (DZD)' : 'Recorded costs over the last six months (DZD)'}</p></div><span className="panel-icon"><Activity size={18} /></span></div><div className="chart-body"><ResponsiveContainer width="100%" height={240}><AreaChart data={costData}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)"/><XAxis dataKey="month" tick={{fill:'var(--muted)',fontSize:10}} axisLine={false} tickLine={false}/><YAxis tick={{fill:'var(--muted)',fontSize:10}} axisLine={false} tickLine={false}/><Tooltip formatter={(value) => [`${Number(value).toLocaleString()} DZD`, language === 'ar' ? 'التكلفة' : language === 'fr' ? 'Coût' : 'Cost']}/><Area type="monotone" dataKey="cost" stroke="#6c7de8" fill="#6c7de833" strokeWidth={2.5}/></AreaChart></ResponsiveContainer></div></article>
      <article className="panel chart-panel"><div className="panel-heading"><div><h2>{language === 'ar' ? 'الوقائية مقابل التصحيحية' : language === 'fr' ? 'Préventive vs corrective' : 'Preventive vs corrective maintenance'}</h2><p>{language === 'ar' ? 'مقارنة عدد التدخلات المسجلة شهريًا' : language === 'fr' ? 'Comparaison mensuelle des interventions enregistrées' : 'Monthly comparison of recorded maintenance jobs'}</p></div><span className="panel-icon"><Wrench size={18}/></span></div><div className="chart-body"><ResponsiveContainer width="100%" height={240}><BarChart data={maintenanceTypeData}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)"/><XAxis dataKey="month" tick={{fill:'var(--muted)',fontSize:10}} axisLine={false} tickLine={false}/><YAxis allowDecimals={false} tick={{fill:'var(--muted)',fontSize:10}} axisLine={false} tickLine={false}/><Tooltip/><Bar dataKey="preventive" name={language === 'ar' ? 'وقائية' : language === 'fr' ? 'Préventive' : 'Preventive'} fill="#20a779" radius={[4,4,0,0]}/><Bar dataKey="corrective" name={language === 'ar' ? 'تصحيحية' : language === 'fr' ? 'Corrective' : 'Corrective'} fill="#e5a43b" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer></div></article>
      <article className="panel chart-panel"><div className="panel-heading"><div><h2>{language === 'ar' ? 'الالتزام بمواعيد الصيانة' : language === 'fr' ? 'Respect des échéances' : 'Maintenance schedule compliance'}</h2><p>{language === 'ar' ? 'تصنيف الآلات حسب موعد الصيانة القادم' : language === 'fr' ? 'État des machines selon la prochaine échéance' : 'Machines grouped by their next maintenance due date'}</p></div><span className="panel-icon"><CalendarClock size={18}/></span></div><div className="chart-body"><ResponsiveContainer width="100%" height={240}><BarChart data={complianceData} margin={{bottom:8}}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)"/><XAxis dataKey="name" tick={{fill:'var(--muted)',fontSize:10}} axisLine={false} tickLine={false}/><YAxis allowDecimals={false} tick={{fill:'var(--muted)',fontSize:10}} axisLine={false} tickLine={false}/><Tooltip/><Bar dataKey="value" name={t('machines')} fill="#e5a43b" radius={[6,6,0,0]}/></BarChart></ResponsiveContainer></div></article>
      <article className="panel chart-panel"><div className="panel-heading"><div><h2>{language === 'ar' ? 'متوسط زمن إصلاح العطل (MTTR)' : language === 'fr' ? 'Temps moyen de réparation (MTTR)' : 'Mean time to repair (MTTR)'}</h2><p>{language === 'ar' ? 'متوسط مدة سجلات الصيانة التصحيحية حسب الشهر' : language === 'fr' ? 'Durée moyenne des interventions correctives par mois' : 'Average recorded corrective maintenance duration per month'}</p></div><span className="panel-icon"><Gauge size={18}/></span></div><div className="chart-body"><div className="mttr-summary"><strong>{mttrValue.toFixed(1)} h</strong><span>{language === 'ar' ? 'المتوسط المسجل' : language === 'fr' ? 'Moyenne enregistrée' : 'Recorded average'}</span></div><ResponsiveContainer width="100%" height={190}><AreaChart data={mttrData}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)"/><XAxis dataKey="month" tick={{fill:'var(--muted)',fontSize:10}} axisLine={false} tickLine={false}/><YAxis allowDecimals tick={{fill:'var(--muted)',fontSize:10}} axisLine={false} tickLine={false}/><Tooltip/><Area type="monotone" dataKey="hours" name="MTTR (h)" stroke="#20a779" fill="#20a77933" strokeWidth={2.5}/></AreaChart></ResponsiveContainer></div></article>
      <article className="panel chart-panel"><div className="panel-heading"><div><h2>{language === 'ar' ? 'أكثر أسباب الأعطال تكرارًا' : language === 'fr' ? 'Causes de panne les plus fréquentes' : 'Most frequent failure causes'}</h2><p>{language === 'ar' ? 'حسب سجلات التدخلات التاريخية' : language === 'fr' ? 'D’après les interventions historiques' : 'Based on historical intervention records'}</p></div><span className="panel-icon"><AlertTriangle size={18}/></span></div><div className="chart-body">{interventionLoading ? <p className="muted chart-empty">{language === 'ar' ? 'جارٍ تحميل البيانات التاريخية…' : language === 'fr' ? 'Chargement des données historiques…' : 'Loading historical data…'}</p> : interventionError ? <p className="muted chart-empty">{language === 'ar' ? 'تعذر تحميل بيانات التدخلات التاريخية.' : language === 'fr' ? 'Impossible de charger les interventions historiques.' : 'Historical intervention data is unavailable.'}</p> : interventionData?.causes.length ? <ResponsiveContainer width="100%" height={260}><BarChart data={interventionData.causes} layout="vertical" margin={{left:8,right:12}}><CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)"/><XAxis type="number" allowDecimals={false} tick={{fill:'var(--muted)',fontSize:10}} axisLine={false} tickLine={false}/><YAxis type="category" dataKey="label" width={132} tick={{fill:'var(--muted)',fontSize:10}} axisLine={false} tickLine={false}/><Tooltip/><Bar dataKey="count" name={language === 'ar' ? 'عدد التدخلات' : language === 'fr' ? 'Interventions' : 'Interventions'} fill="#e45c67" radius={[0,5,5,0]}/></BarChart></ResponsiveContainer> : <p className="muted chart-empty">{language === 'ar' ? 'لا توجد أسباب أعطال مسجلة.' : language === 'fr' ? 'Aucune cause de panne enregistrée.' : 'No failure causes recorded yet.'}</p>}</div></article>
      <article className="panel chart-panel"><div className="panel-heading"><div><h2>{language === 'ar' ? 'الآلات الأكثر تعرضًا للتدخل' : language === 'fr' ? 'Machines avec le plus d’interventions' : 'Machines with the most interventions'}</h2><p>{language === 'ar' ? 'ترتيب الآلات حسب عدد التدخلات التاريخية' : language === 'fr' ? 'Classement selon le nombre d’interventions historiques' : 'Ranked by historical intervention count'}</p></div><span className="panel-icon"><Wrench size={18}/></span></div><div className="chart-body">{interventionData?.machines.length ? <ResponsiveContainer width="100%" height={260}><BarChart data={interventionData.machines} layout="vertical" margin={{left:8,right:12}}><CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)"/><XAxis type="number" allowDecimals={false} tick={{fill:'var(--muted)',fontSize:10}} axisLine={false} tickLine={false}/><YAxis type="category" dataKey="label" width={132} tick={{fill:'var(--muted)',fontSize:10}} axisLine={false} tickLine={false}/><Tooltip/><Bar dataKey="count" name={language === 'ar' ? 'عدد التدخلات' : language === 'fr' ? 'Interventions' : 'Interventions'} fill="#6c7de8" radius={[0,5,5,0]}/></BarChart></ResponsiveContainer> : <p className="muted chart-empty">{interventionError ? (language === 'ar' ? 'البيانات التاريخية غير متاحة.' : language === 'fr' ? 'Données historiques indisponibles.' : 'Historical data unavailable.') : (language === 'ar' ? 'لا توجد بيانات آلات تاريخية.' : language === 'fr' ? 'Aucune donnée machine historique.' : 'No historical machine data yet.')}</p>}</div></article>
      <article className="panel chart-panel"><div className="panel-heading"><div><h2>{language === 'ar' ? 'عدد التدخلات حسب الورشة' : language === 'fr' ? 'Interventions par atelier' : 'Interventions by workshop'}</h2><p>{language === 'ar' ? 'تكرار التدخلات التاريخية، وليس ساعات التوقف' : language === 'fr' ? 'Fréquence historique, et non heures d’arrêt' : 'Historical intervention frequency, not downtime hours'}</p></div><span className="panel-icon"><Factory size={18}/></span></div><div className="chart-body">{interventionData?.workshops.length ? <ResponsiveContainer width="100%" height={260}><BarChart data={interventionData.workshops} layout="vertical" margin={{left:8,right:12}}><CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)"/><XAxis type="number" allowDecimals={false} tick={{fill:'var(--muted)',fontSize:10}} axisLine={false} tickLine={false}/><YAxis type="category" dataKey="label" width={132} tick={{fill:'var(--muted)',fontSize:10}} axisLine={false} tickLine={false}/><Tooltip/><Bar dataKey="count" name={language === 'ar' ? 'عدد التدخلات' : language === 'fr' ? 'Interventions' : 'Interventions'} fill="#20a779" radius={[0,5,5,0]}/></BarChart></ResponsiveContainer> : <p className="muted chart-empty">{interventionError ? (language === 'ar' ? 'البيانات التاريخية غير متاحة.' : language === 'fr' ? 'Données historiques indisponibles.' : 'Historical data unavailable.') : (language === 'ar' ? 'لا توجد بيانات ورشات تاريخية.' : language === 'fr' ? 'Aucune donnée atelier historique.' : 'No historical workshop data yet.')}</p>}</div></article>
      <article className="panel chart-panel"><div className="panel-heading"><div><h2>{language === 'ar' ? 'أكثر 5 تقنيين حسب عدد التدخلات' : language === 'fr' ? 'Top 5 techniciens par interventions' : 'Top 5 technicians by interventions'}</h2><p>{language === 'ar' ? 'أكثر خمسة تقنيين لديهم تدخلات تاريخية مسجلة؛ تُستثنى السجلات دون اسم تقني' : language === 'fr' ? 'Cinq techniciens avec le plus d’interventions historiques; les noms manquants sont exclus' : 'Five technicians with the most historical interventions; records without a technician name are excluded'}</p></div><span className="panel-icon"><Wrench size={18}/></span></div><div className="chart-body">{interventionData?.technicians.length ? <ResponsiveContainer width="100%" height={260}><BarChart data={interventionData.technicians} layout="vertical" margin={{left:8,right:12}}><CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)"/><XAxis type="number" allowDecimals={false} tick={{fill:'var(--muted)',fontSize:10}} axisLine={false} tickLine={false}/><YAxis type="category" dataKey="label" width={132} tick={{fill:'var(--muted)',fontSize:10}} axisLine={false} tickLine={false}/><Tooltip/><Bar dataKey="count" name={language === 'ar' ? 'عدد التدخلات' : language === 'fr' ? 'Interventions' : 'Interventions'} fill="#e5a43b" radius={[0,5,5,0]}/></BarChart></ResponsiveContainer> : <p className="muted chart-empty">{interventionError ? (language === 'ar' ? 'البيانات التاريخية غير متاحة.' : language === 'fr' ? 'Données historiques indisponibles.' : 'Historical data unavailable.') : (language === 'ar' ? 'لا توجد بيانات تقنيين تاريخية.' : language === 'fr' ? 'Aucune donnée technicien historique.' : 'No historical technician data yet.')}</p>}</div></article>
    </div>}
    {canAccessPath(role, '/copilot') && (
      <article className="panel">
        <div className="panel-heading">
          <div>
            <h2>{language === 'ar' ? 'مساعد مدير الصيانة' : language === 'fr' ? 'Copilote de maintenance' : 'Maintenance manager copilot'}</h2>
            <p>{language === 'ar' ? 'موجز يومي، مركز انتباه، عبء الفنيين وتقارير آلية.' : language === 'fr' ? 'Briefing quotidien, centre d’attention, charge des techniciens et rapports.' : 'Daily briefing, attention center, technician workload and automated reports.'}</p>
          </div>
          <div className="copilot-dashboard-actions">
            <Link className="button button-secondary" to="/copilot">{language === 'ar' ? 'فتح المساعد' : language === 'fr' ? 'Ouvrir le copilote' : 'Open copilot'}</Link>
            <Link className="button button-secondary" to="/hidden-failures">{language === 'ar' ? 'كاشف الأعطال الخفية' : language === 'fr' ? 'Défaillances cachées' : 'Hidden failures'}</Link>
          </div>
        </div>
      </article>
    )}
    <div className="dashboard-lower">
      <article className="panel"><div className="panel-heading"><div><h2>{t('attention')}</h2><p>{t('overdue')} · {t('broken')}</p></div><span className="panel-icon warning"><AlertTriangle size={18} /></span></div>{attentionMachines.length ? <div className="attention-list">{attentionMachines.map(machine => <Link to={`/machines/${machine.id}`} key={machine.id} className="attention-item"><span className={`attention-icon ${machine.status === 'broken' ? 'danger' : 'warning'}`}><Wrench size={16} /></span><span className="attention-copy"><strong>{localizedMachineName(machine, language)}</strong><small>{machine.code}</small></span><span className="attention-state">{machine.status === 'broken' ? t('broken') : t('overdue')}</span></Link>)}</div> : <EmptyState title={t('noOverdue')} />}</article>
      {role === 'admin' && <article className="panel"><div className="panel-heading"><div><h2>{t('monthlyMaintenance')}</h2><p>{language === 'ar' ? 'مقارنة سجلات الصيانة الحالية بالتدخلات التاريخية' : language === 'fr' ? 'Comparaison des maintenances actuelles et des interventions historiques' : 'Current maintenance logs compared with historical interventions'}</p></div><span className="panel-icon"><CalendarClock size={18} /></span></div><div className="chart-body"><ResponsiveContainer width="100%" height={240}><AreaChart data={monthData} margin={{ top: 12, right: 8, left: -18, bottom: 0 }}><defs><linearGradient id="maintenanceFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--accent)" stopOpacity={0.35} /><stop offset="95%" stopColor="var(--accent)" stopOpacity={0.02} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" /><XAxis dataKey="month" tick={{ fill: 'var(--muted)', fontSize: 10 }} axisLine={false} tickLine={false} /><YAxis allowDecimals={false} tick={{ fill: 'var(--muted)', fontSize: 10 }} axisLine={false} tickLine={false} /><Tooltip /><Area type="monotone" dataKey="count" name={language === 'ar' ? 'سجلات الصيانة الحالية' : language === 'fr' ? 'Maintenance actuelle' : 'Current maintenance logs'} stroke="var(--accent)" fill="url(#maintenanceFill)" strokeWidth={2.5} /><Area type="monotone" dataKey="historicalCount" name={language === 'ar' ? 'التدخلات التاريخية' : language === 'fr' ? 'Interventions historiques' : 'Historical interventions'} stroke="#e5a43b" fill="#e5a43b22" strokeWidth={2.5} /></AreaChart></ResponsiveContainer></div></article>}
    </div>
    <div className="dashboard-lower">
      <article className="panel"><div className="panel-heading"><div><h2>{t('health')}</h2><p>{t('workshopsDesc')}</p></div><span className="panel-icon"><Factory size={18} /></span></div><div className="health-grid">{workshops.map(workshop => { const list = machines.filter(machine => machine.workshopId === workshop.id); const pct = list.length ? Math.round(list.filter(machine => machine.status === 'working').length / list.length * 100) : 0; return <div key={workshop.id} className="health-cell"><span className={`health-score ${pct < 50 ? 'danger' : pct < 80 ? 'warning' : 'good'}`}>{pct}%</span><strong>{localizedWorkshopName(workshop, language)}</strong><small>{list.length} · {t('machines')}</small></div> })}</div></article>
      <article className="panel"><div className="panel-heading"><div><h2>{t('recentActivity')}</h2><p>{t('dashboardDesc')}</p></div><span className="panel-icon"><ArrowUpRight size={18} /></span></div><div className="activity-list">{activities.slice(0, 6).map(item => <div className="activity-item" key={item.id}><i /><span><strong>{item.action}</strong><small>{item.target}</small></span><time>{new Intl.DateTimeFormat(language === 'ar' ? 'ar-DZ' : language === 'fr' ? 'fr-DZ' : 'en-US', { hour: '2-digit', minute: '2-digit' }).format(new Date(item.date))}</time></div>)}{activities.length === 0 && <EmptyState title={t('noActivity')} />}</div></article>
    </div>
    <p className="data-note"><Activity size={14} />{language === 'ar' ? 'تعتمد البيانات التشغيلية على اتصال الخادم وقاعدة البيانات؛ لا توجد قراءة مباشرة من الحساسات في هذه الصفحة.' : language === 'fr' ? 'Les données opérationnelles dépendent du serveur et de la base ; cette page ne reçoit pas de mesures directes des capteurs.' : 'Operational data depends on the backend and database; this page does not receive live sensor measurements.'}</p>
  </section>
}
