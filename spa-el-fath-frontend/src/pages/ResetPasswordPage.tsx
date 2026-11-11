import { useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useApp } from '../app/AppProvider'
import { useTranslation } from '../hooks/useTranslation'

export default function ResetPasswordPage() {
  const { language } = useTranslation()
  const { resetPassword, showToast } = useApp()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const token = params.get('token')?.trim() || ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const ar = language === 'ar'
  const fr = language === 'fr'
  const title = ar ? 'إنشاء كلمة مرور جديدة' : fr ? 'Créer un nouveau mot de passe' : 'Set a new password'
  const missingToken = ar
    ? 'رابط إعادة التعيين غير صالح. اطلب رابطاً جديداً من مسؤول النظام، أو غيّر كلمة المرور من صفحة حسابي إذا كنت مسجلاً.'
    : fr
      ? 'Lien de réinitialisation invalide. Demandez un nouveau lien à votre administrateur, ou changez le mot de passe depuis « Mon compte » si vous êtes connecté.'
      : 'This reset link is invalid. Request a new one from your administrator, or change your password from My account if you are signed in.'

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError('')
    if (!token) { setError(missingToken); return }
    if (password.length < 12) { setError(ar ? 'يجب أن تتكون كلمة المرور من 12 حرفاً على الأقل.' : fr ? 'Le mot de passe doit contenir au moins 12 caractères.' : 'Use at least 12 characters for the password.'); return }
    if (new TextEncoder().encode(password).length > 72) { setError(ar ? 'كلمة المرور طويلة جداً.' : fr ? 'Mot de passe trop long.' : 'The password is too long (max 72 bytes).'); return }
    if (password !== confirm) { setError(ar ? 'كلمتا المرور غير متطابقتين.' : fr ? 'Les mots de passe ne correspondent pas.' : 'Passwords do not match.'); return }
    setBusy(true)
    const result = await resetPassword(token, password)
    setBusy(false)
    if (result) setError(result)
    else {
      showToast(ar ? 'تم تحديث كلمة المرور.' : fr ? 'Mot de passe mis à jour.' : 'Password updated.')
      navigate('/', { replace: true })
    }
  }

  return (
    <main className="login-page">
      <section className="login-form-wrap">
        <form className="login-card" onSubmit={submit}>
          <h1>{title}</h1>
          {!token && <p className="auth-message auth-error" role="alert">{missingToken}</p>}
          {token && <>
            <label className="field-label">
              {ar ? 'كلمة المرور الجديدة' : fr ? 'Nouveau mot de passe' : 'New password'}
              <input type="password" required minLength={12} maxLength={72} autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} />
            </label>
            <label className="field-label">
              {ar ? 'تأكيد كلمة المرور' : fr ? 'Confirmer le mot de passe' : 'Confirm password'}
              <input type="password" required minLength={12} maxLength={72} autoComplete="new-password" value={confirm} onChange={event => setConfirm(event.target.value)} />
            </label>
            <p className="muted">{ar ? 'استخدم 12 حرفاً على الأقل. يُستخدم الرابط مرة واحدة وينتهي خلال 30 دقيقة.' : fr ? 'Utilisez au moins 12 caractères. Le lien est à usage unique et expire après 30 minutes.' : 'Use at least 12 characters. The link is single-use and expires after 30 minutes.'}</p>
          </>}
          {error && <p className="auth-message auth-error" role="alert">{error}</p>}
          <button className="button button-primary button-full" disabled={busy || !token} type="submit">{busy ? '…' : ar ? 'حفظ كلمة المرور' : fr ? 'Enregistrer le mot de passe' : 'Save password'}</button>
        </form>
      </section>
    </main>
  )
}
