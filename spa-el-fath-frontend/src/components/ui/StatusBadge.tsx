import { CheckCircle2, CircleAlert, Clock3 } from 'lucide-react'
import type { MachineStatus } from '../../data/types'
import { useTranslation } from '../../hooks/useTranslation'
export function StatusBadge({ status }: { status: MachineStatus }) {
  const { t } = useTranslation()
  const Icon = status === 'working' ? CheckCircle2 : status === 'broken' ? CircleAlert : Clock3
  const label = status === 'working' ? t('working') : status === 'broken' ? t('broken') : t('inMaintenance')
  return <span className={`status-badge status-${status}`}><Icon size={13} />{label}</span>
}
