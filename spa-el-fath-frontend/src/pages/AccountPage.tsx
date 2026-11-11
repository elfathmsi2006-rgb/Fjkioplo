import { useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { useApp } from '../app/AppProvider'
import { useTranslation } from '../hooks/useTranslation'
import { PageHeader } from '../components/ui/PageHeader'

export default function AccountPage() {
  const { language } = useTranslation()
  const { profile, role, changePassword, signOutAll, showToast } = useApp()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const ar = language === 'ar'
  const fr = language === 'fr'

  const roleLabel: Record<string, string> = {
    admin: ar ? 'مسؤول النظام' : fr ? 'Administrateur' : 'Administrator',
    production_chief: ar ? 'مدير الإنتاج' : fr ? 'Responsable de production' : 'Production chief',
    maintenance_worker: ar ? 'تقني صيانة' : fr ? 'Technicien' : 'Maintenance technician',
    workshop_head: ar ? 'رئيس الورشة' : fr ? 'Chef d’atelier' : 'Workshop chief',
  }

  async function submit() {
    setError('')
    if (!currentPassword) { setError(ar ? 'أدخل كلمة المرور الحالية.' : fr ? 'Saisissez le mot de passe actuel.' : 'Enter your current password.'); return }
    if (newPassword.length < 12) { setError(ar ? 'استخدم 12 حرفاً على الأقل.' : fr ? 'Utilisez au moins 12 caractères.' : 'Use at least 12 characters.'); return }
    if (new TextEncoder().encode(newPassword).length > 72) { setError(ar ? 'كلمة المرور طويلة جداً.' : 'The password is too long (max 72 bytes).'); return }
    if (newPassword !== confirmPassword) { setError(ar ? 'كلمتا المرور غير متطابقتين.' : fr ? 'Les mots de passe ne correspondent pas.' : 'Passwords do not match.'); return }
    setBusy(true)
    const result = await changePassword(currentPassword, newPassword)
    setBusy(false)
    if (result) { setError(result); return }
    setCurrentPassword(''); setNewPassword(''); setConfirmPassword('')
    showToast(ar ? 'تم تحديث كلمة المرور وإنهاء الجلسات الأخرى.' : fr ? 'Mot de passe mis à jour. Les autres sessions ont été fermées.' : 'Password updated. Other sessions were signed out.')
  }

  return (
    <section className="page-section">
      <PageHeader
        eyebrow={ar ? 'الحساب' : fr ? 'Compte' : 'Account'}
        title={ar ? 'حسابي' : fr ? 'Mon compte' : 'My account'}
        description={ar ? 'بيانات الحساب وتغيير كلمة المرور.' : fr ? 'Informations du compte et changement de mot de passe.' : 'Account details and password change.'}
      />
      <div className="settings-grid">
        <article className="panel settings-panel">
          <div className="settings-heading">
            <span className="settings-icon"><ShieldCheck size={19} /></span>
            <div>
              <h2>{ar ? 'بيانات الحساب' : fr ? 'Informations du compte' : 'Account details'}</h2>
              <p>{profile?.email || '—'}</p>
            </div>
          </div>
          <div className="data-note"><strong>{profile?.full_name || '—'}</strong></div>
          <div className="data-note">{role ? (roleLabel[role] || role) : '—'}</div>
          <div className="data-tool-actions">
            <button className="button button-secondary" type="button" onClick={() => void signOutAll().then(message => { if (message) setError(message) })}>
              {ar ? 'تسجيل الخروج من جميع الأجهزة' : fr ? 'Se déconnecter de tous les appareils' : 'Sign out of all devices'}
            </button>
          </div>
        </article>

        <article className="panel settings-panel">
          <div className="settings-heading">
            <span className="settings-icon"><ShieldCheck size={19} /></span>
            <div>
              <h2>{ar ? 'تغيير كلمة المرور' : fr ? 'Changer le mot de passe' : 'Change password'}</h2>
              <p>{ar ? 'يتطلب كلمة المرور الحالية وينهي الجلسات الأخرى.' : fr ? 'Exige le mot de passe actuel et ferme les autres sessions.' : 'Requires the current password and signs out other sessions.'}</p>
            </div>
          </div>
          <label className="field-label">
            {ar ? 'كلمة المرور الحالية' : fr ? 'Mot de passe actuel' : 'Current password'}
            <input type="password" autoComplete="current-password" value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} />
          </label>
          <label className="field-label">
            {ar ? 'كلمة المرور الجديدة' : fr ? 'Nouveau mot de passe' : 'New password'}
            <input type="password" minLength={12} maxLength={72} autoComplete="new-password" value={newPassword} onChange={event => setNewPassword(event.target.value)} />
          </label>
          <label className="field-label">
            {ar ? 'تأكيد كلمة المرور' : fr ? 'Confirmer le mot de passe' : 'Confirm new password'}
            <input type="password" minLength={12} maxLength={72} autoComplete="new-password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} />
          </label>
          {error && <p className="auth-message auth-error" role="alert">{error}</p>}
          <div className="data-tool-actions">
            <button className="button button-primary" type="button" disabled={busy} onClick={() => void submit()}>
              {busy ? '…' : ar ? 'تحديث كلمة المرور' : fr ? 'Mettre à jour' : 'Update password'}
            </button>
          </div>
          <p className="muted">{ar ? 'استخدم 12 حرفاً على الأقل. لا تُحفظ كلمة المرور كنص صريح.' : fr ? 'Utilisez au moins 12 caractères. Le mot de passe n’est jamais stocké en clair.' : 'Use at least 12 characters. The password is never stored in plain text.'}</p>
        </article>
      </div>
    </section>
  )
}
