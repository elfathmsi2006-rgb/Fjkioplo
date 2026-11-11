import { Factory } from 'lucide-react'
import { useTranslation } from '../../hooks/useTranslation'

export function LoadingScreen() {
  const { t } = useTranslation()
  return <div className="loading-screen"><div className="loading-brand"><Factory size={25} /><strong>IndusFlow</strong></div><div className="loading-line" /><div className="loading-line short" /><p>{t('loading')}</p></div>
}
