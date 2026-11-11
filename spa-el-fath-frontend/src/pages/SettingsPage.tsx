import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { Database, Download, Languages, Moon, Palette, Sun, Upload, BellRing, ShieldCheck, Clock3, Mail, FileClock } from 'lucide-react'
import { useApp } from '../app/AppProvider'
import { useTranslation } from '../hooks/useTranslation'
import type { Language } from '../data/types'
import { downloadText } from '../utils/format'
import { PageHeader } from '../components/ui/PageHeader'

export default function SettingsPage() {
  const { t, language } = useTranslation()
  const { machines, setMachines, workshops, setWorkshops, maintenanceLogs, setMaintenanceLogs, preferences, setPreferences, setLanguage, role, showToast, changePassword } = useApp()
  const inputRef = useRef<HTMLInputElement>(null)
  const canManage = role === 'admin'
  const localPreviewMode = import.meta.env.VITE_DEMO_MODE === 'true'
  const API_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, '') || 'http://localhost:3000'
  const [gmailConnected, setGmailConnected] = useState(false)
  const [gmailAccount, setGmailAccount] = useState('')
  const [gmailBusy, setGmailBusy] = useState(false)
  const [gmailMessage, setGmailMessage] = useState('')
  const [notificationSettings, setNotificationSettings] = useState<Record<string, boolean>>({
    MACHINE_BREAKDOWN: true, TASK_ASSIGNED: true, TASK_REASSIGNED: true,
    TASK_DUE_SOON: true, TASK_DUE_TODAY: true, TASK_OVERDUE: true,
  })
  const [notificationRows, setNotificationRows] = useState<Array<{ id: number; notification_type: string; recipient_email: string | null; status: string; attempts: number; error_message: string | null; created_at: string; sent_at: string | null; technician_name: string | null }>>([])
  const refreshEmailSettings = async () => {
    if (!canManage || localPreviewMode) return
    const headers = { }
    try {
      const [statusResponse, historyResponse, settingsResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/api/communications/gmail/status`, { headers, credentials: 'include' }),
        fetch(`${API_BASE_URL}/api/communications/notifications?limit=30`, { headers, credentials: 'include' }),
        fetch(`${API_BASE_URL}/api/communications/notifications/settings`, { headers, credentials: 'include' }),
      ])
      const statusData = await statusResponse.json()
      if (statusResponse.ok && statusData.success) {
        setGmailConnected(Boolean(statusData.connected))
        setGmailAccount(statusData.account?.google_email || '')
      }
      const historyData = await historyResponse.json()
      if (historyResponse.ok && historyData.success) setNotificationRows(historyData.notifications || [])
      const settingsData = await settingsResponse.json()
      if (settingsResponse.ok && settingsData.success) {
        setNotificationSettings(Object.fromEntries((settingsData.settings || []).map((item: { notification_type: string; enabled: number | boolean }) => [item.notification_type, Boolean(item.enabled)])))
      }
    } catch {
      setGmailMessage(language === 'ar' ? 'تعذر الاتصال بالخادم.' : 'Could not reach the backend.')
    }
  }
  useEffect(() => { void refreshEmailSettings() }, [canManage, localPreviewMode])
  const saveNotificationSetting = async (type: string, enabled: boolean) => {
    const previous = notificationSettings[type]
    setNotificationSettings(current => ({ ...current, [type]: enabled }))
    try {
      const response = await fetch(`${API_BASE_URL}/api/communications/notifications/settings/${type}`, {
        method: 'PUT',
        credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.message || 'Could not save notification setting.')
      setGmailMessage(language === 'ar' ? 'تم حفظ إعداد الإشعار.' : 'Notification setting saved.')
    } catch (error) {
      setNotificationSettings(current => ({ ...current, [type]: previous }))
      setGmailMessage(error instanceof Error ? error.message : 'Could not save notification setting.')
    }
  }
  const connectGmail = async () => {
    setGmailBusy(true); setGmailMessage('')
    try {
      const response = await fetch(`${API_BASE_URL}/api/communications/gmail/connect-url`, {
        method: 'POST', credentials: 'include',
      })
      const data = await response.json()
      if (!response.ok || !data.success || !data.url) throw new Error(data.message || 'Could not start Gmail connection.')
      window.location.href = data.url
    } catch (error) {
      setGmailMessage(error instanceof Error ? error.message : 'Could not connect Gmail.')
      setGmailBusy(false)
    }
  }
  const testGmail = async () => {
    setGmailBusy(true); setGmailMessage('')
    try {
      const response = await fetch(`${API_BASE_URL}/api/communications/gmail/test`, {
        method: 'POST', credentials: 'include',
      })
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.message || 'Email test failed.')
      setGmailMessage(data.message || 'Test email sent.')
      await refreshEmailSettings()
    } catch (error) {
      setGmailMessage(error instanceof Error ? error.message : 'Email test failed.')
    } finally { setGmailBusy(false) }
  }
  const [alertPrefs, setAlertPrefs] = useState<Record<string, boolean>>({ inApp: true, email: false, maintenanceDue: true, urgentWork: true, lowStock: true, safetyFailure: true })
  const [alertPrefsLoaded, setAlertPrefsLoaded] = useState(false)
  useEffect(() => {
    if (localPreviewMode) return
    let cancelled = false
    fetch(`${API_BASE_URL}/api/settings/preferences`, { credentials: 'include' })
      .then(async response => { const body = await response.json(); if (!response.ok || !body.success) throw new Error(body.message || 'Could not load preferences.'); return body.data })
      .then(data => { if (cancelled) return; if (data.alert_preferences && typeof data.alert_preferences === 'object') setAlertPrefs(data.alert_preferences as Record<string, boolean>); if (data.language === 'ar' || data.language === 'fr' || data.language === 'en') setLanguage(data.language); if (data.theme && data.accent && data.density) setPreferences(current => ({ ...current, theme: data.theme, accent: data.accent, density: data.density })); setAlertPrefsLoaded(true) })
      .catch(error => { if (!cancelled) { setAlertPrefsLoaded(true); setGmailMessage(error instanceof Error ? error.message : 'Could not load saved preferences.') } })
    return () => { cancelled = true }
  }, [localPreviewMode])
  useEffect(() => {
    if (!alertPrefsLoaded || localPreviewMode) return
    const timer = window.setTimeout(() => {
      void fetch(`${API_BASE_URL}/api/settings/preferences`, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ language, theme: preferences.theme, accent: preferences.accent, density: preferences.density, alertPreferences: alertPrefs }) })
        .then(async response => { const body = await response.json(); if (!response.ok || !body.success) throw new Error(body.message || 'Could not save preferences.') })
        .catch(error => setGmailMessage(error instanceof Error ? error.message : 'Could not save preferences.'))
    }, 250)
    return () => window.clearTimeout(timer)
  }, [alertPrefsLoaded, alertPrefs, language, preferences.theme, preferences.accent, preferences.density, localPreviewMode])
  const updateAlert = async (key: string, value: boolean) => {
    const previous = alertPrefs
    const next = { ...alertPrefs, [key]: value }
    setAlertPrefs(next)
    try {
      const response = await fetch(`${API_BASE_URL}/api/settings/preferences`, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ language, theme: preferences.theme, accent: preferences.accent, density: preferences.density, alertPreferences: next }) })
      const body = await response.json()
      if (!response.ok || !body.success) throw new Error(body.message || 'Could not save alert preferences.')
      showToast(language === 'ar' ? 'تم حفظ التفضيلات في قاعدة البيانات' : language === 'fr' ? 'Préférences enregistrées dans la base' : 'Preferences saved to the database')
    } catch (error) { setAlertPrefs(previous); showToast(error instanceof Error ? error.message : 'Could not save preferences.') }
  }
  const exportAll = () => {    const payload = { type: 'spa-el-fath-user-preferences', version: 1, exportedAt: new Date().toISOString(), preferences, language, alertPreferences: alertPrefs }
    downloadText('spa-el-fath-user-preferences.json', JSON.stringify(payload, null, 2), 'application/json;charset=utf-8')
    showToast(t('exportJson'))
  }
  const importAll = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!localPreviewMode) {
      showToast(language === 'ar' ? 'استيراد النسخة الاحتياطية إلى قاعدة البيانات غير مدعوم من هذه الواجهة. استخدم إجراء استعادة قاعدة البيانات بعد أخذ نسخة احتياطية.' : language === 'fr' ? 'La restauration de sauvegarde dans MySQL doit être effectuée via une procédure de base de données contrôlée.' : 'Importing a backup into MySQL is not supported by this UI. Use a controlled database restore procedure after taking a backup.')
      event.target.value = ''
      return
    }
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const raw: unknown = JSON.parse(await file.text())
      if (typeof raw !== 'object' || raw === null || !('machines' in raw) || !('workshops' in raw)) throw new Error('Invalid backup')
      const data = raw as { machines: unknown; workshops: unknown; maintenanceLogs?: unknown; activities?: unknown; preferences?: unknown; language?: unknown }
      if (!Array.isArray(data.machines) || !Array.isArray(data.workshops)) throw new Error('Invalid backup data')
      setMachines(data.machines as typeof machines)
      setWorkshops(data.workshops as typeof workshops)
      if (Array.isArray(data.maintenanceLogs)) setMaintenanceLogs(data.maintenanceLogs as typeof maintenanceLogs)
      if (Array.isArray(data.activities)) showToast(t('importSuccess'))
      if (data.preferences && typeof data.preferences === 'object') setPreferences(current => ({ ...current, ...(data.preferences as Partial<typeof current>) }))
      if (data.language === 'ar' || data.language === 'fr' || data.language === 'en') setLanguage(data.language)
      showToast(t('importSuccess'))
    } catch {
      showToast(t('importError'))
    } finally {
      event.target.value = ''
    }
  }
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordBusy, setPasswordBusy] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const submitPasswordChange = async () => {
    setPasswordError('')
    if (!currentPassword) { setPasswordError(language === 'ar' ? 'أدخل كلمة المرور الحالية.' : language === 'fr' ? 'Saisissez le mot de passe actuel.' : 'Enter your current password.'); return }
    if (newPassword.length < 12) { setPasswordError(language === 'ar' ? 'استخدم 12 حرفاً على الأقل.' : language === 'fr' ? 'Utilisez au moins 12 caractères.' : 'Use at least 12 characters.'); return }
    if (new TextEncoder().encode(newPassword).length > 72) { setPasswordError(language === 'ar' ? 'كلمة المرور طويلة جداً.' : 'The password is too long (max 72 bytes).'); return }
    if (newPassword !== confirmPassword) { setPasswordError(language === 'ar' ? 'كلمتا المرور غير متطابقتين.' : language === 'fr' ? 'Les mots de passe ne correspondent pas.' : 'Passwords do not match.'); return }
    setPasswordBusy(true)
    const result = await changePassword(currentPassword, newPassword)
    setPasswordBusy(false)
    if (result) { setPasswordError(result); return }
    setCurrentPassword(''); setNewPassword(''); setConfirmPassword('')
    showToast(language === 'ar' ? 'تم تحديث كلمة المرور وإنهاء الجلسات الأخرى.' : language === 'fr' ? 'Mot de passe mis à jour. Les autres sessions ont été fermées.' : 'Password updated. Other sessions were signed out.')
  }
  return <section className="page-section">
    <PageHeader eyebrow={t('settings')} title={t('settings')} description={t('settingsDesc')} />
    <div className="settings-grid">
      <article className="panel settings-panel"><div className="settings-heading"><span className="settings-icon"><Languages size={19} /></span><div><h2>{t('language')}</h2><p>{t('settingsDesc')}</p></div></div><label className="field-label">{t('language')}<select value={language} onChange={event => setLanguage(event.target.value as Language)}><option value="ar">العربية</option><option value="fr">Français</option><option value="en">English</option></select></label></article>
      <article className="panel settings-panel"><div className="settings-heading"><span className="settings-icon"><Moon size={19} /></span><div><h2>{t('theme')}</h2><p>{t('settingsDesc')}</p></div></div><div className="option-row">{(['light', 'dark', 'system'] as const).map(theme => <button key={theme} className={`option-card ${preferences.theme === theme ? 'selected' : ''}`} onClick={() => setPreferences(current => ({ ...current, theme }))}>{theme === 'light' ? <Sun size={18} /> : theme === 'dark' ? <Moon size={18} /> : <Database size={18} />}<span>{theme === 'light' ? t('light') : theme === 'dark' ? t('dark') : t('system')}</span></button>)}</div></article>
      <article className="panel settings-panel"><div className="settings-heading"><span className="settings-icon"><Palette size={19} /></span><div><h2>{t('accent')}</h2><p>{t('themeAccent')}</p></div></div><div className="accent-options">{(['blue', 'teal', 'violet', 'amber'] as const).map(accent => <button key={accent} className={`accent-choice accent-${accent} ${preferences.accent === accent ? 'selected' : ''}`} onClick={() => setPreferences(current => ({ ...current, accent }))} aria-label={accent} title={accent}><span />{accent}</button>)}</div></article>
      <article className="panel settings-panel"><div className="settings-heading"><span className="settings-icon"><Database size={19} /></span><div><h2>{t('density')}</h2><p>{t('settingsDesc')}</p></div></div><div className="option-row">{(['comfortable', 'compact'] as const).map(density => <button key={density} className={`option-card ${preferences.density === density ? 'selected' : ''}`} onClick={() => setPreferences(current => ({ ...current, density }))}><span>{density === 'comfortable' ? t('comfortable') : t('compact')}</span></button>)}</div></article>
    </div>
    <div className="settings-grid">
      <article className="panel settings-panel"><div className="settings-heading"><span className="settings-icon"><BellRing size={19}/></span><div><h2>{language === 'ar' ? 'قواعد التنبيهات' : language === 'fr' ? 'Règles d’alerte' : 'Alert rules'}</h2><p>{language === 'ar' ? 'اختر الأحداث التي تريد متابعتها. هذه تفضيلات محلية وليست إرسالًا خارجيًا مفعّلًا.' : 'Choose alert events. These preferences are saved to your account in the central database.'}</p></div></div>{[['maintenanceDue',language === 'ar'?'اقتراب أو تأخر موعد الصيانة':'Maintenance due or overdue'],['urgentWork',language === 'ar'?'أمر عمل عاجل غير مسند':'Unassigned urgent work'],['lowStock',language === 'ar'?'انخفاض قطع الغيار عن الحد الأدنى':'Spare parts below minimum'],['safetyFailure',language === 'ar'?'فشل فحص السلامة':'Failed safety inspection']].map(([key,label])=><label key={key} className="option-row" style={{justifyContent:'space-between',padding:'10px 0'}}><span>{label}</span><input type="checkbox" checked={Boolean(alertPrefs[key])} onChange={e=>updateAlert(String(key),e.target.checked)}/></label>)}</article>
      <article className="panel settings-panel">
        <div className="settings-heading"><span className="settings-icon"><Mail size={19}/></span><div>
          <h2>{language === 'ar' ? 'إشعارات البريد الإلكتروني' : language === 'fr' ? 'Notifications par e-mail' : 'Email notifications'}</h2>
          <p>{language === 'ar' ? 'اربط حساب Gmail المؤسسي لإرسال تنبيهات الصيانة تلقائياً إلى التقنيين.' : 'Connect the institutional Gmail account to deliver maintenance alerts to technicians.'}</p>
        </div></div>
        {!canManage ? <p className="muted">{t('roleAdminOnly')}</p> : localPreviewMode ? <p className="muted">Email delivery is unavailable in demo mode.</p> : <>
          <div className="data-note"><Mail size={16}/>{gmailConnected
            ? `${language === 'ar' ? 'حساب الإرسال متصل:' : 'Connected sender:'} ${gmailAccount}`
            : (language === 'ar' ? 'لم يتم ربط حساب Gmail الإداري بعد.' : 'No administrator Gmail sender is connected yet.')}</div>
          <h3>{language === 'ar' ? 'أنواع الإشعارات المفعّلة' : 'Enabled notification events'}</h3>
          {([
            ['MACHINE_BREAKDOWN', language === 'ar' ? 'تعطل آلة' : 'Machine breakdown'],
            ['TASK_ASSIGNED', language === 'ar' ? 'إسناد مهمة جديدة' : 'Task assigned'],
            ['TASK_REASSIGNED', language === 'ar' ? 'إعادة إسناد مهمة' : 'Task reassigned'],
            ['TASK_DUE_SOON', language === 'ar' ? 'اقتراب موعد الصيانة' : 'Task due soon'],
            ['TASK_DUE_TODAY', language === 'ar' ? 'موعد الصيانة اليوم' : 'Task due today'],
            ['TASK_OVERDUE', language === 'ar' ? 'مهمة متأخرة' : 'Overdue task'],
          ] as const).map(([type, label]) => <label key={type} className="option-row" style={{justifyContent:'space-between',padding:'8px 0'}}>
            <span>{label}</span>
            <input type="checkbox" checked={Boolean(notificationSettings[type])} onChange={event => void saveNotificationSetting(type, event.target.checked)} />
          </label>)}
          <div className="data-tool-actions">
            <button className="button button-secondary" onClick={connectGmail} disabled={gmailBusy || gmailConnected}>{gmailBusy ? '...' : (language === 'ar' ? 'ربط Gmail' : 'Connect Gmail')}</button>
            <button className="button button-primary" onClick={testGmail} disabled={gmailBusy || !gmailConnected}>{language === 'ar' ? 'إرسال رسالة اختبار' : 'Send test email'}</button>
            <button className="button button-secondary" onClick={() => void refreshEmailSettings()} disabled={gmailBusy}>{language === 'ar' ? 'تحديث الحالة' : 'Refresh status'}</button>
          </div>
          {gmailMessage && <p className="muted" role="status">{gmailMessage}</p>}
          <p className="muted">{language === 'ar'
            ? 'يُستخدم Gmail المتصل بحساب المدير لإرسال الإشعارات. يجب أن يكون لكل تقني عنوان بريد صحيح في حساب المستخدم أو سجل التقني.'
            : 'The administrator Gmail account sends system alerts. Each technician must have a valid email in their user profile or technician record.'}</p>
          <h3>{language === 'ar' ? 'آخر الإشعارات' : 'Recent notifications'}</h3>
          <div style={{overflowX:'auto'}}>
            <table className="data-table"><thead><tr>
              <th>{language === 'ar' ? 'النوع' : 'Type'}</th><th>{language === 'ar' ? 'المستلم' : 'Recipient'}</th><th>{language === 'ar' ? 'الحالة' : 'Status'}</th><th>{language === 'ar' ? 'المحاولات' : 'Attempts'}</th>
            </tr></thead><tbody>
              {notificationRows.length ? notificationRows.map(row => <tr key={row.id}>
                <td>{row.notification_type}</td><td>{row.recipient_email || '—'}</td><td>{row.status}</td><td>{row.attempts}</td>
              </tr>) : <tr><td colSpan={4}>{language === 'ar' ? 'لا توجد إشعارات بعد.' : 'No notifications yet.'}</td></tr>}
            </tbody></table>
          </div>
        </>}
      </article>
      <article className="panel settings-panel">
        <div className="settings-heading"><span className="settings-icon"><ShieldCheck size={19}/></span><div>
          <h2>{language === 'ar' ? 'كلمة المرور والأمان' : language === 'fr' ? 'Mot de passe et sécurité' : 'Password & security'}</h2>
          <p>{language === 'ar' ? 'تغيير كلمة المرور يتطلب كلمة المرور الحالية وينهي الجلسات الأخرى.' : language === 'fr' ? 'Le changement de mot de passe exige le mot de passe actuel et ferme les autres sessions.' : 'Changing your password requires the current one and signs out other sessions.'}</p>
        </div></div>
        <label className="field-label">{language === 'ar' ? 'كلمة المرور الحالية' : language === 'fr' ? 'Mot de passe actuel' : 'Current password'}
          <input type="password" autoComplete="current-password" value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} />
        </label>
        <label className="field-label">{language === 'ar' ? 'كلمة المرور الجديدة' : language === 'fr' ? 'Nouveau mot de passe' : 'New password'}
          <input type="password" minLength={12} maxLength={72} autoComplete="new-password" value={newPassword} onChange={event => setNewPassword(event.target.value)} />
        </label>
        <label className="field-label">{language === 'ar' ? 'تأكيد كلمة المرور' : language === 'fr' ? 'Confirmer le mot de passe' : 'Confirm new password'}
          <input type="password" minLength={12} maxLength={72} autoComplete="new-password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} />
        </label>
        {passwordError && <p className="auth-message auth-error" role="alert">{passwordError}</p>}
        <div className="data-tool-actions">
          <button className="button button-primary" type="button" disabled={passwordBusy} onClick={() => void submitPasswordChange()}>{passwordBusy ? '…' : (language === 'ar' ? 'تحديث كلمة المرور' : language === 'fr' ? 'Mettre à jour' : 'Update password')}</button>
        </div>
      </article>
      <article className="panel settings-panel"><div className="settings-heading"><span className="settings-icon"><ShieldCheck size={19}/></span><div><h2>{language === 'ar' ? 'حوكمة وسلامة البيانات' : 'Data governance & safety'}</h2><p>{language === 'ar' ? 'معلومات مهمة حول السجلات والصلاحيات.' : 'Important information about audit records and permissions.'}</p></div></div><div className="data-note"><FileClock size={16}/>{language === 'ar' ? 'سجل التدقيق في قاعدة البيانات للقراءة فقط ويعتمد على الترحيلات والمحفزات المفعّلة.' : 'Database audit history is read-only and depends on installed migrations and triggers.'}</div><div className="data-note"><Clock3 size={16}/>{language === 'ar' ? 'التواريخ التشغيلية يجب تسجيلها بتوقيت المصنع؛ التنبيهات الزمنية تحتاج خدمة مجدولة في الخادم.' : 'Operational timestamps should use factory local time; scheduled alerts require a server-side job.'}</div></article>
    </div>
    <article className="panel data-tools-panel"><div className="panel-heading"><div><h2>{t('dataTools')}</h2><p>{language === 'ar' ? 'تصدير تفضيلات الحساب فقط؛ النسخة الاحتياطية التشغيلية تؤخذ من MySQL.' : language === 'fr' ? 'Export des préférences uniquement ; sauvegardez les données opérationnelles depuis MySQL.' : 'Exports account preferences only; back up operational data directly from MySQL.'}</p></div><span className="panel-icon"><Database size={18} /></span></div><div className="data-tool-actions"><button className="button button-secondary" onClick={exportAll}><Download size={16} />{t('exportJson')}</button>{localPreviewMode && <button className="button button-secondary" disabled={!canManage} onClick={() => inputRef.current?.click()}><Upload size={16} />{t('importJson')}</button>}<input ref={inputRef} className="visually-hidden" type="file" accept="application/json,.json" onChange={importAll} /></div>{!canManage && <p className="muted">{t('roleAdminOnly')}</p>}</article>
    <p className="data-note"><Database size={14} />{language === 'ar' ? 'تُحفظ بيانات المعدات والصيانة في قاعدة البيانات مع تطبيق الصلاحيات.' : language === 'fr' ? 'Les données sont stockées en base avec des règles d’accès par rôle.' : 'Equipment and maintenance data are stored in the database and protected by role policies.'}</p>
  </section>
}
