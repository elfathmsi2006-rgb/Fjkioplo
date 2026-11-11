import { useEffect, useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Activity, Bell, ChevronLeft, Command, Factory, Gauge, Globe2, LayoutDashboard, Menu, Moon, Settings2, Sun, Wrench, X, ChevronRight, Users, LogOut, Boxes, ShieldCheck, ClipboardList } from 'lucide-react'
import { useApp } from '../../app/AppProvider'
import { useTranslation } from '../../hooks/useTranslation'
import { translate } from '../../i18n'
import { localizedMachineName, formatDate } from '../../utils/format'
import { CommandPalette } from './CommandPalette'
import { Toast } from '../ui/Toast'
import { canAccessPath } from '../../utils/permissions'

export function AppLayout() {
  const { language, setLanguage, machines, maintenanceLogs, preferences, setPreferences, role, profile, signOut, showToast } = useApp()
  const { t, isRtl } = useTranslation()
  const [commandOpen, setCommandOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>([])
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const overdue = machines.filter(machine => machine.nextMaintenance && machine.nextMaintenance < new Date().toISOString().slice(0, 10) && machine.status !== 'broken')
  const notifications = useMemo(() => [
    ...machines.filter(machine => machine.status === 'broken').map(machine => ({ id: `broken-${machine.id}`, title: localizedMachineName(machine, language), detail: t('broken'), path: `/machines/${machine.id}` })),
    ...overdue.map(machine => ({ id: `overdue-${machine.id}`, title: localizedMachineName(machine, language), detail: `${t('overdue')}: ${formatDate(machine.nextMaintenance ?? '', language)}`, path: '/maintenance' })),
    ...maintenanceLogs.filter(log => log.status === 'scheduled').slice(0, 3).map(log => ({ id: `planned-${log.id}`, title: t('scheduled'), detail: log.date, path: '/maintenance' })),
  ], [machines, overdue, maintenanceLogs, language, t])
  const unreadNotifications = notifications.filter(item => !readNotificationIds.includes(item.id))
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setCommandOpen(true) }
      if (event.key === '?' && !(event.target instanceof HTMLInputElement) && !(event.target instanceof HTMLTextAreaElement)) { setCommandOpen(true) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  useEffect(() => {
    document.documentElement.lang = language
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr'
    document.title = `${translate(language, 'brand')} — ${translate(language, 'subtitle')}`
  }, [language, isRtl])
  useEffect(() => {
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    document.documentElement.dataset.theme = preferences.theme === 'system' ? (systemDark ? 'dark' : 'light') : preferences.theme
    document.documentElement.dataset.accent = preferences.accent
    document.documentElement.dataset.density = preferences.density
  }, [preferences])
  const roleLabel = role === 'admin' ? (language === 'ar' ? 'مسؤول النظام' : language === 'fr' ? 'Administrateur' : 'Administrator') : role === 'production_chief' ? (language === 'ar' ? 'رئيس الإنتاج' : language === 'fr' ? 'Responsable de production' : 'Production chief') : role === 'maintenance_worker' ? (language === 'ar' ? 'عامل الصيانة' : language === 'fr' ? 'Agent de maintenance' : 'Maintenance worker') : (language === 'ar' ? 'رئيس الورشة' : language === 'fr' ? 'Chef d’atelier' : 'Workshop head')
  const nav = [
    { to: '/', label: t('dashboard'), icon: LayoutDashboard, end: true },
    { to: '/machines', label: t('machines'), icon: Gauge },
    { to: '/workshops', label: t('workshops'), icon: Factory },
    { to: '/maintenance', label: t('maintenance'), icon: Wrench },
    { to: '/operations', label: language === 'ar' ? 'مركز العمليات' : language === 'fr' ? 'Opérations' : 'Operations hub', icon: ClipboardList },
    { to: '/copilot', label: language === 'ar' ? 'مساعد المدير' : language === 'fr' ? 'Copilote' : 'Manager copilot', icon: Activity },
    { to: '/hidden-failures', label: language === 'ar' ? 'الأعطال الخفية' : language === 'fr' ? 'Défaillances cachées' : 'Hidden failures', icon: ShieldCheck },
    { to: '/warehouse', label: t('warehouse'), icon: Boxes },
    { to: '/production', label: language === 'ar' ? 'الإنتاج والإنتاجية' : language === 'fr' ? 'Production et productivité' : 'Production & productivity', icon: Factory },
    { to: '/analytics', label: t('analytics'), icon: Activity },
    { to: '/audit-trail', label: t('auditTrail'), icon: ShieldCheck },
    { to: '/users', label: language === 'ar' ? 'إدارة المستخدمين' : language === 'fr' ? 'Utilisateurs' : 'User management', icon: Users },
    { to: '/account', label: language === 'ar' ? 'حسابي' : language === 'fr' ? 'Mon compte' : 'My account', icon: ShieldCheck },
    { to: '/settings', label: t('settings'), icon: Settings2 },
  ]
  const pageLabel = nav.find(item => item.to === location.pathname)?.label ?? (location.pathname.startsWith('/production') ? (language === 'ar' ? 'الإنتاج والإنتاجية' : language === 'fr' ? 'Production et productivité' : 'Production & productivity') : t('machineDetails'))
  return <div className={`app-shell ${isRtl ? 'is-rtl' : 'is-ltr'} ${preferences.sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
    {mobileOpen && <button className="mobile-scrim" aria-label={t('close')} onClick={() => setMobileOpen(false)} />}
    <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
      <div className="brand"><div className="brand-mark"><Factory size={23} /></div>{!preferences.sidebarCollapsed && <div className="brand-copy"><strong>IndusFlow</strong><span>{t('subtitle')}</span></div>}<button className="mobile-close icon-button" onClick={() => setMobileOpen(false)} aria-label={t('close')}><X size={18} /></button></div>
      <p className="nav-caption">{language === 'ar' ? 'القائمة الرئيسية' : language === 'fr' ? 'MENU PRINCIPAL' : 'MAIN MENU'}</p>
      <nav className="main-nav">{nav.map(item => { const Icon = item.icon; const permitted = canAccessPath(role, item.to); return permitted ? <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title={preferences.sidebarCollapsed ? item.label : undefined} onClick={() => setMobileOpen(false)}><Icon size={19} /><span>{item.label}</span></NavLink> : <div key={item.to} className="nav-item nav-item-disabled" aria-disabled="true" title={item.label}><Icon size={19} /><span>{item.label}</span><ShieldCheck className="nav-lock" size={13} aria-label={language === 'ar' ? 'غير متاح' : language === 'fr' ? 'Indisponible' : 'Unavailable'} /></div> })}</nav>
      <div className="sidebar-bottom">
        <div className="plant-card"><div className="plant-card-icon"><Activity size={17} /></div>{!preferences.sidebarCollapsed && <div><strong>{language === 'ar' ? 'حالة المصنع' : language === 'fr' ? 'État de l’usine' : 'Factory status'}</strong><span><i className="live-dot" />{t('live')}</span></div>}</div>
        <div className="sidebar-user"><div className="avatar">{(profile?.full_name || profile?.email || 'U').slice(0, 2).toUpperCase()}</div>{!preferences.sidebarCollapsed && <div className="user-copy"><strong>{roleLabel}</strong><span>{profile?.email ?? ''}</span></div>}</div>
      </div>
    </aside>
    {import.meta.env.VITE_DEMO_MODE === 'true' && <div className="demo-banner">Demo mode: authentication and server persistence are bypassed.</div>}
<main className="main-area">
      <header className="topbar">
        <div className="topbar-leading"><button className="icon-button menu-toggle" onClick={() => setMobileOpen(true)} aria-label={t('openCommand')}><Menu size={20} /></button><div className="breadcrumb"><span>IndusFlow</span>{isRtl ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}<strong>{pageLabel}</strong></div></div>
        <div className="topbar-actions">
          <button className="global-search-button" onClick={() => setCommandOpen(true)}><Command size={16} /><span>{t('searchPlaceholder')}</span><kbd>Ctrl K</kbd></button>
          <label className="language-select" title={t('language')}><Globe2 size={16} /><select value={language} onChange={event => setLanguage(event.target.value as 'ar' | 'fr' | 'en')} aria-label={t('language')}><option value="ar">العربية</option><option value="fr">Français</option><option value="en">English</option></select></label>
          <button className="icon-button" onClick={() => setPreferences(current => ({ ...current, theme: current.theme === 'dark' ? 'light' : 'dark' }))} aria-label={t('theme')}>{preferences.theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}</button>
          <div className="notification-wrap"><button className="icon-button notification-button" onClick={() => setNotificationsOpen(value => !value)} aria-label={t('notifications')}><Bell size={18} />{unreadNotifications.length > 0 && <span>{unreadNotifications.length > 9 ? '9+' : unreadNotifications.length}</span>}</button>{notificationsOpen && <div className="notification-popover"><div className="notification-title"><strong>{t('notifications')}</strong><button onClick={() => { setNotificationsOpen(false); setReadNotificationIds(current => Array.from(new Set([...current, ...notifications.map(item => item.id)]))); showToast(t('markRead')) }}>{t('markRead')}</button></div>{unreadNotifications.length ? unreadNotifications.slice(0, 8).map(item => <button key={item.id} className="notification-item" onClick={() => { navigate(item.path); setReadNotificationIds(current => [...current, item.id]); setNotificationsOpen(false) }}><i className="notification-dot" /><span><strong>{item.title}</strong><small>{item.detail}</small></span></button>) : <p className="muted empty-notifications">{t('noNotifications')}</p>}</div>}</div>
          <button className="icon-button" onClick={() => setPreferences(current => ({ ...current, sidebarCollapsed: !current.sidebarCollapsed }))} aria-label={t('settings')}><Settings2 size={18} /></button>
          <button className="role-button" onClick={() => void signOut()} title={profile?.email ?? ''}><LogOut size={15} />{t('signOut')}</button>
        </div>
      </header>
      <div className="page-content"><Outlet /></div>
      <footer className="app-footer"><span>© {new Date().getFullYear()} IndusFlow</span><span>{roleLabel}</span></footer>
    </main>
    <Toast />
    {commandOpen && <CommandPalette onClose={() => setCommandOpen(false)} />}
  </div>
}
