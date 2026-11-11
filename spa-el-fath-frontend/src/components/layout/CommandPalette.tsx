import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Activity, Factory, Gauge, Languages, Moon, Search, Settings2, Wrench, Users } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { useTranslation } from '../../hooks/useTranslation'
import { useApp } from '../../app/AppProvider'
import { canAccessPath } from '../../utils/permissions'

export function CommandPalette({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('')
  const { t, language } = useTranslation()
  const { setLanguage, preferences, setPreferences, machines, workshops, role, language: appLanguage } = useApp()
  const navigate = useNavigate()
  const actions = useMemo(() => [
    { label: t('dashboard'), path: '/', icon: Activity, run: () => navigate('/') },
    { label: t('machines'), path: '/machines', icon: Gauge, run: () => navigate('/machines') },
    { label: t('workshops'), path: '/workshops', icon: Factory, run: () => navigate('/workshops') },
    { label: t('maintenance'), path: '/maintenance', icon: Wrench, run: () => navigate('/maintenance') },
    { label: language === 'ar' ? 'مركز العمليات' : language === 'fr' ? 'Opérations' : 'Operations hub', path: '/operations', icon: Activity, run: () => navigate('/operations') },
    { label: t('warehouse'), path: '/warehouse', icon: Settings2, run: () => navigate('/warehouse') },
    { label: t('analytics'), path: '/analytics', icon: Activity, run: () => navigate('/analytics') },
    { label: t('auditTrail'), path: '/audit-trail', icon: Activity, run: () => navigate('/audit-trail') },
    { label: language === 'ar' ? 'الإنتاج والإنتاجية' : language === 'fr' ? 'Production et productivité' : 'Production & productivity', path: '/production', icon: Factory, run: () => navigate('/production') },
    { label: appLanguage === 'ar' ? 'إدارة المستخدمين' : appLanguage === 'fr' ? 'Utilisateurs' : 'User management', path: '/users', icon: Users, run: () => navigate('/users') },
    { label: t('settings'), path: '/settings', icon: Settings2, run: () => navigate('/settings') },
    { label: 'العربية / Français / English', icon: Languages, run: () => setLanguage(language === 'ar' ? 'fr' : language === 'fr' ? 'en' : 'ar') },
    { label: `${t('theme')}: ${preferences.theme === 'dark' ? t('light') : t('dark')}`, icon: Moon, run: () => setPreferences(p => ({ ...p, theme: p.theme === 'dark' ? 'light' : 'dark' })) },
    ...(canAccessPath(role, '/machines') ? machines.map(machine => ({ label: `${machine.code} · ${language === 'fr' ? machine.nameFr : language === 'en' ? machine.nameEn : machine.name}`, path: `/machines/${machine.id}`, icon: Gauge, run: () => navigate(`/machines/${machine.id}`) })) : []),
    ...(canAccessPath(role, '/workshops') ? workshops.map(workshop => ({ label: language === 'fr' ? workshop.nameFr : language === 'en' ? workshop.nameEn : workshop.name, path: '/workshops', icon: Factory, run: () => navigate('/workshops') })) : []),
  ].filter(action => !action.path || canAccessPath(role, action.path)), [t, navigate, setLanguage, language, appLanguage, role, preferences.theme, setPreferences, machines, workshops])
  const filtered = actions.filter(action => action.label.toLowerCase().includes(query.toLowerCase())).slice(0, 10)
  return <Modal title={t('openCommand')} onClose={onClose} wide>
    <label className="command-search"><Search size={18} /><input autoFocus value={query} onChange={event => setQuery(event.target.value)} placeholder={t('commandHint')} /></label>
    <div className="command-results">{filtered.map((action, index) => { const Icon = action.icon; return <button key={`${action.label}-${index}`} onClick={() => { action.run(); onClose() }}><Icon size={17} /><span>{action.label}</span><kbd>↵</kbd></button> })}{filtered.length === 0 && <p className="muted">{t('noResults')}</p>}</div>
    <p className="command-footnote">↑ ↓ {t('filter')} · Esc {t('close')}</p>
  </Modal>
}
