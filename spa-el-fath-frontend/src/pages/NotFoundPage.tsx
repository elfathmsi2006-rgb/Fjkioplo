import { Link } from 'react-router-dom'
import { Factory } from 'lucide-react'
import { useTranslation } from '../hooks/useTranslation'

export function NotFoundPage() {
  const { t } = useTranslation()
  return <section className="not-found"><div className="not-found-mark"><Factory size={36} /></div><strong>404</strong><h1>{t('pageNotFound')}</h1><p>{t('settingsDesc')}</p><Link className="button button-primary" to="/">{t('backHome')}</Link></section>
}
