import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, CalendarClock, Gauge, Printer, Wrench } from 'lucide-react'
import { useApp } from '../app/AppProvider'
import { useTranslation } from '../hooks/useTranslation'
import { localizedMachineName, localizedWorkshopName, formatDate } from '../utils/format'
import { PageHeader } from '../components/ui/PageHeader'
import { StatusBadge } from '../components/ui/StatusBadge'
import type { MachineStatus } from '../data/types'
import { MachineDescriptions } from '../components/machines/MachineDescriptions'
import { TechnicalManuals } from '../components/machines/TechnicalManuals'
import { saveMachineRecord } from '../services/machines'

export default function MachineDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { machines, workshops, maintenanceLogs, language, role, setMachines, addActivity, showToast, reloadData } = useApp()
  const { t, isRtl } = useTranslation()
  const machine = machines.find(item => item.id === id)
  if (!machine) return <section className="page-section"><h1>{t('pageNotFound')}</h1><Link to="/machines" className="button button-primary">{t('backHome')}</Link></section>
  const workshop = workshops.find(item => item.id === machine.workshopId)
  const logs = maintenanceLogs.filter(log => log.machineId === machine.id).sort((a, b) => b.date.localeCompare(a.date))
  const canEdit = role === 'admin' || role === 'production_chief' || role === 'workshop_head'
  const setStatus = async (status: MachineStatus) => {
    if (status === machine.status) return
    try {
      if (!workshop) throw new Error('The machine workshop could not be found.')
      const saved = await saveMachineRecord({ ...machine, status }, workshop.name, machine.id)
      setMachines(current => current.map(item => item.id === machine.id ? saved : item))
      addActivity(t('changeStatus'), machine.code)
      showToast(language === 'ar' ? 'تم حفظ حالة الآلة في قاعدة البيانات' : language === 'fr' ? 'État enregistré dans la base de données' : 'Machine status saved to the database')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not update machine status.'
      showToast(language === 'ar' ? `فشل حفظ الحالة: ${message}` : language === 'fr' ? `Échec de mise à jour : ${message}` : `Could not save status: ${message}`)
      await reloadData()
    }
  }
  return <section className="page-section">
    <PageHeader eyebrow={machine.code} title={localizedMachineName(machine, language)} description={t('machineDetails')} action={<><button className="button button-secondary" onClick={() => window.print()}><Printer size={16} />{t('printLabel')}</button><button className="button button-secondary" onClick={() => navigate('/machines')}>{isRtl ? <ArrowRight size={16} /> : <ArrowLeft size={16} />}{t('machines')}</button></>} />
    <div className="detail-hero"><div className="detail-machine-icon"><Gauge size={32} /></div><div className="detail-hero-copy"><span>{machine.code}</span><h2>{localizedMachineName(machine, language)}</h2><p>{workshop ? localizedWorkshopName(workshop, language) : '—'}</p></div><StatusBadge status={machine.status} />{canEdit && <select className="detail-status-select" aria-label={t('changeStatus')} value={machine.status} onChange={event => setStatus(event.target.value as MachineStatus)}><option value="working">{t('working')}</option><option value="broken">{t('broken')}</option><option value="maintenance">{t('inMaintenance')}</option></select>}</div>
    <div className="detail-grid">{[[t('serialNumber'), machine.serialNumber], [t('manufacturer'), machine.manufacturer], [t('category'), machine.category], [t('installDate'), formatDate(machine.installDate ?? '', language)], [t('lastMaintenance'), formatDate(machine.lastMaintenance, language)], [t('nextMaintenance'), formatDate(machine.nextMaintenance ?? '', language)], [language === 'ar' ? 'خط الإنتاج' : language === 'fr' ? 'Ligne de production' : 'Production line', machine.productionLine], [language === 'ar' ? 'ترتيب الآلة على الخط' : language === 'fr' ? 'Position sur la ligne' : 'Production line position', machine.productionLinePosition], [t('location'), workshop?.location]].map(([label, value]) => <div className="detail-stat" key={label}><span>{label}</span><strong>{value || '—'}</strong></div>)}</div>
    {machine.notes && <article className="panel detail-notes"><h2>{t('notes')}</h2><p>{machine.notes}</p></article>}
    <MachineDescriptions machineId={machine.id} role={role} language={language} />
    <TechnicalManuals machineId={machine.id} language={language} />
    <article className="panel"><div className="panel-heading"><div><h2>{t('maintenance')}</h2><p>{t('maintenanceDesc')}</p></div><span className="panel-icon"><CalendarClock size={18} /></span></div>{logs.length ? <div className="maintenance-list">{logs.map(log => <div className="maintenance-row" key={log.id}><span className="maintenance-symbol"><Wrench size={16} /></span><div><strong>{log.type === 'preventive' ? t('preventive') : t('corrective')}</strong><small>{log.technician || '—'} · {log.durationHours} {t('hour')}</small></div><time>{formatDate(log.date, language)}</time><span className={`status-pill status-${log.status}`}>{log.status === 'completed' ? t('completed') : log.status === 'in-progress' ? t('inProgress') : t('scheduled')}</span></div>)}</div> : <p className="muted panel-empty">{t('noMaintenance')}</p>}</article>
    <div className="qr-label"><div className="qr-placeholder" aria-label={t('machineDetails')}><svg viewBox="0 0 21 21" role="img" aria-label={machine.code}>{Array.from({ length: 21 * 21 }, (_, index) => { const x = index % 21; const y = Math.floor(index / 21); const on = ((x * 7 + y * 13 + machine.code.charCodeAt(0)) % 5 < 2) || ((x < 7 && y < 7) || (x > 13 && y < 7) || (x < 7 && y > 13)) && (x % 3 !== 1 && y % 3 !== 1); return on ? <rect key={index} x={x} y={y} width="1" height="1" /> : null })}</svg></div><div><strong>IndusFlow</strong><p>{machine.code}</p><small>{localizedMachineName(machine, language)}</small></div></div>
  </section>
}
