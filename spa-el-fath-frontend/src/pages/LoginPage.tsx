import { useEffect, useState, type FormEvent } from 'react'
import { Activity, Factory, LockKeyhole, Mail, ShieldCheck, Wrench } from 'lucide-react'
import { useApp } from '../app/AppProvider'
import { useTranslation } from '../hooks/useTranslation'
import { translate } from '../i18n'

export function LoginPage() {
  const { t, language, isRtl } = useTranslation()
  const { signIn, requestPasswordReset, setLanguage, isConfigured } = useApp()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [forgot, setForgot] = useState(false)
  useEffect(() => { document.documentElement.lang = language; document.documentElement.dir = isRtl ? 'rtl' : 'ltr'; document.title = `${translate(language, 'brand')} — ${translate(language, 'subtitle')}` }, [language, isRtl])
  const words = language === 'ar'
    ? { email: 'البريد الإلكتروني الوظيفي', password: 'كلمة المرور', forgot: 'نسيت كلمة المرور؟', send: 'إرسال رابط الاستعادة', signIn: 'تسجيل الدخول الآمن', noConfig: 'يلزم إعداد الخادم قبل تسجيل الدخول.', resetSent: 'إذا كان البريد مسجلاً، فسيصلك رابط استعادة كلمة المرور. وإذا لم يصلك، تواصل مع مسؤول النظام.', back: 'العودة إلى تسجيل الدخول', secure: 'حسابات الموظفين المعتمدة فقط', hint: 'يتم تعيين الدور والصلاحيات من قبل مسؤول النظام.' }
    : language === 'fr'
      ? { email: 'Adresse e-mail professionnelle', password: 'Mot de passe', forgot: 'Mot de passe oublié ?', send: 'Envoyer le lien de réinitialisation', signIn: 'Connexion sécurisée', noConfig: 'Le serveur doit être configuré avant la connexion.', resetSent: 'Si cette adresse existe, un lien de réinitialisation sera envoyé. Sans réception, contactez votre administrateur.', back: 'Retour à la connexion', secure: 'Comptes employés autorisés uniquement', hint: 'Le rôle et les permissions sont attribués par un administrateur.' }
      : { email: 'Work email', password: 'Password', forgot: 'Forgot password?', send: 'Send reset link', signIn: 'Secure sign in', noConfig: 'The backend must be configured before login.', resetSent: 'If the email is registered, a reset link will be sent. If it does not arrive, contact your administrator.', back: 'Back to sign in', secure: 'Approved employee accounts only', hint: 'Roles and permissions are assigned by an administrator.' }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setNotice(''); setBusy(true)
    try {
      if (forgot) {
        const result = await requestPasswordReset(email)
        if (result) setError(result); else setNotice(words.resetSent)
      } else {
        const result = await signIn(email, password)
        if (result) setError(language === 'ar' && result.toLowerCase().includes('invalid') ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة.' : result)
      }
    } finally { setBusy(false) }
  }
  return <main className="login-page"><section className="login-visual"><div className="login-brand"><div className="brand-mark"><Factory size={26} /></div><div><strong>IndusFlow</strong><span>{t('subtitle')}</span></div></div><div className="login-art"><div className="login-orbit orbit-one" /><div className="login-orbit orbit-two" /><div className="login-factory"><Factory size={72} /></div><span className="floating-stat stat-one"><Activity size={16} /> 94% {t('availability')}</span><span className="floating-stat stat-two"><Wrench size={16} /> {t('maintenance')}</span></div><p className="login-tagline">{t('welcome')}</p><p className="login-muted">{t('dashboardDesc')}</p></section><section className="login-form-wrap"><form className="login-card" onSubmit={submit}><span className="eyebrow"><span className="eyebrow-line" /><ShieldCheck size={15} />{words.secure}</span><h1>{forgot ? words.forgot : t('loginTitle')}</h1><p className="muted">{words.hint}</p>{!isConfigured && <div className="role-note"><LockKeyhole size={17} /><span>{words.noConfig}</span></div>}<label className="field-label">{words.email}<span className="login-input-wrap"><Mail size={16} /><input type="email" autoComplete="username" required value={email} onChange={event => setEmail(event.target.value)} placeholder="name@company.dz" /></span></label>{!forgot && <label className="field-label">{words.password}<span className="login-input-wrap"><LockKeyhole size={16} /><input type="password" autoComplete="current-password" required minLength={8} value={password} onChange={event => setPassword(event.target.value)} /></span></label>}{error && <p className="auth-message auth-error" role="alert">{error}</p>}{notice && <p className="auth-message auth-success" role="status">{notice}</p>}{!forgot && <button className="login-forgot" type="button" onClick={() => { setForgot(true); setError(''); setNotice('') }}>{words.forgot}</button>}<button className="button button-primary button-full" disabled={busy || !isConfigured} type="submit">{busy ? t('loading') : forgot ? words.send : words.signIn}<span>{isRtl ? '←' : '→'}</span></button>{forgot && <button className="login-forgot" type="button" onClick={() => { setForgot(false); setError(''); setNotice('') }}>{words.back}</button>}<div className="login-language">{(['ar','fr','en'] as const).map(code => <button type="button" className={language === code ? 'selected' : ''} key={code} onClick={() => setLanguage(code)}>{code.toUpperCase()}</button>)}</div></form></section></main>
}
