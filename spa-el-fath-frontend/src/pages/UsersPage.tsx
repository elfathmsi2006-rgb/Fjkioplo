import { useEffect, useState, type FormEvent } from 'react'
import { UserPlus, Users, ShieldCheck } from 'lucide-react'
import { useApp } from '../app/AppProvider'
import type { Role, UserProfile } from '../data/types'
import { PageHeader } from '../components/ui/PageHeader'

const API_BASE_URL =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(
    /\/+$/,
    '',
  ) || 'http://localhost:3000'



type CreateUserResponse = {
  success: boolean
  message?: string
  user?: UserProfile
}

export default function UsersPage() {
  const { language, refreshProfiles, showToast } = useApp()

  const ar = language === 'ar'
  const fr = language === 'fr'

  const [users, setUsers] = useState<UserProfile[]>([])
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [newRole, setNewRole] = useState<Role>('workshop_head')
  const [busy, setBusy] = useState(false)
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [error, setError] = useState('')
  const [listError, setListError] = useState('')

  const text = ar
    ? {
        title: 'إدارة المستخدمين',
        desc: 'إنشاء حسابات الموظفين وإدارة الحسابات المسجلة.',
        name: 'الاسم الكامل',
        email: 'البريد الإلكتروني',
        password: 'كلمة مرور أولية',
        role: 'نوع الحساب',
        workshop: 'الورشة',
        create: 'إنشاء الحساب',
        users: 'الحسابات المسجلة',
        active: 'نشط',
        inactive: 'معطّل',
        loading: 'جارٍ الحفظ…',
        loadingUsers: 'جارٍ تحميل الحسابات…',
        hint:
          'يجب أن تتكون كلمة المرور من 12 حرفًا على الأقل. سلّمها للموظف بطريقة آمنة واطلب منه تغييرها.',
        noUsers: 'لا توجد حسابات مسجلة.',
        roleNote:
          'اختر تقنياً (role_id = 3) أو رئيس ورشة (role_id = 4). سيتم إنشاء سجل الفني تلقائياً وحفظ كلمة المرور مشفّرة.',
        loadError: 'تعذّر تحميل الحسابات.',
        retry: 'إعادة المحاولة',
        accountCreated: 'تم إنشاء الحساب بنجاح.',
        count: 'حساب',
      }
    : fr
      ? {
          title: 'Gestion des utilisateurs',
          desc: 'Création des comptes employés et gestion des comptes enregistrés.',
          name: 'Nom complet',
          email: 'Adresse e-mail',
          password: 'Mot de passe initial',
          role: 'Type de compte',
          workshop: 'Atelier',
          create: 'Créer le compte',
          users: 'Comptes enregistrés',
          active: 'Actif',
          inactive: 'Désactivé',
          loading: 'Enregistrement…',
          loadingUsers: 'Chargement des comptes…',
          hint:
            'Le mot de passe doit contenir au moins 12 caractères. Transmettez-le en toute sécurité et demandez à l’employé de le modifier.',
          noUsers: 'Aucun compte enregistré.',
          roleNote:
            'Choisissez Technicien (role_id = 3) ou Chef d’atelier (role_id = 4). Le profil technicien est créé automatiquement et le mot de passe est stocké haché.',
          loadError: 'Impossible de charger les comptes.',
          retry: 'Réessayer',
          accountCreated: 'Compte créé avec succès.',
          count: 'comptes',
        }
      : {
          title: 'User management',
          desc: 'Create employee accounts and manage registered accounts.',
          name: 'Full name',
          email: 'Email address',
          password: 'Temporary password',
          role: 'Account type',
          workshop: 'Workshop',
          create: 'Create account',
          users: 'Registered accounts',
          active: 'Active',
          inactive: 'Disabled',
          loading: 'Saving…',
          loadingUsers: 'Loading accounts…',
          hint:
            'Use at least 12 characters. Share the temporary password securely and ask the employee to change it.',
          noUsers: 'No accounts registered yet.',
          roleNote:
            'Choose Technician (role_id = 3) or Workshop Chief (role_id = 4). The technician profile is created automatically and the password is stored hashed.',
          loadError: 'Could not load user accounts.',
          retry: 'Retry',
          accountCreated: 'Account created successfully.',
          count: 'accounts',
        }

  const label = (role: Role | null | undefined) => {
    const names: Record<Role, { ar: string; fr: string; en: string }> = {
      admin: {
        ar: 'مسؤول النظام',
        fr: 'Administrateur',
        en: 'Administrator',
      },
      production_chief: {
        ar: 'مدير عام الورشات',
        fr: 'Directeur général des ateliers',
        en: 'General Director of Workshops',
      },
      maintenance_worker: {
        ar: 'تقني',
        fr: 'Technicien',
        en: 'Technician',
      },
      workshop_head: {
        ar: 'رئيس الورشة',
        fr: 'Chef d’atelier',
        en: 'Workshop Chief',
      },
    }

    if (!role || !names[role]) return '—'
    return ar ? names[role].ar : fr ? names[role].fr : names[role].en
  }

  async function loadUsers() {
    setLoadingUsers(true)
    setListError('')

    try {
      const profiles = await refreshProfiles()
      setUsers(profiles)
    } catch (err) {
      setListError(
        err instanceof Error ? err.message : text.loadError,
      )
    } finally {
      setLoadingUsers(false)
    }
  }

  useEffect(() => {
    void loadUsers()
    // Load accounts when this page is mounted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    if (!fullName.trim() || fullName.trim().length > 150) {
      setError(ar ? 'أدخل الاسم الكامل (150 حرفاً كحد أقصى).' : fr ? 'Saisissez le nom complet (150 caractères maximum).' : 'Enter the full name (150 characters maximum).')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError(ar ? 'أدخل بريداً إلكترونياً صالحاً.' : fr ? 'Saisissez une adresse e-mail valide.' : 'Enter a valid email address.')
      return
    }
    if (password.length < 12) {
      setError(ar ? 'استخدم 12 حرفاً على الأقل لكلمة المرور.' : fr ? 'Utilisez au moins 12 caractères pour le mot de passe.' : 'Use at least 12 characters for the password.')
      return
    }
    if (new TextEncoder().encode(password).length > 72) {
      setError(ar ? 'كلمة المرور طويلة جداً.' : fr ? 'Mot de passe trop long.' : 'The password is too long (max 72 bytes).')
      return
    }
    if (password !== confirmPassword) {
      setError(ar ? 'كلمتا المرور غير متطابقتين.' : fr ? 'Les mots de passe ne correspondent pas.' : 'Passwords do not match.')
      return
    }

    setBusy(true)

    try {
      const response = await fetch(`${API_BASE_URL}/api/users`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim(),
          password,
          roleId: newRole === 'maintenance_worker' ? 3 : 4,
        }),
      })

      let result: CreateUserResponse

      try {
        result = await response.json()
      } catch {
        throw new Error('The server returned an invalid response.')
      }

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            (ar
              ? 'تعذّر إنشاء الحساب.'
              : fr
                ? 'Impossible de créer le compte.'
                : 'Could not create the account.'),
        )
      }

      setFullName('')
      setEmail('')
      setPassword('')
      setConfirmPassword('')
      setNewRole('workshop_head')

      showToast(text.accountCreated)

      await loadUsers()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : ar
            ? 'حدث خطأ غير متوقع.'
            : fr
              ? 'Une erreur inattendue est survenue.'
              : 'An unexpected error occurred.',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="page-section">
      <PageHeader
        eyebrow={text.title}
        title={text.title}
        description={text.desc}
      />

      <div className="users-layout">
        <article className="panel user-create-panel">
          <div className="panel-heading">
            <div>
              <h2>{text.create}</h2>
              <p>{text.roleNote}</p>
            </div>
            <span className="panel-icon">
              <UserPlus size={18} />
            </span>
          </div>

          <form className="form-grid" onSubmit={submit}>
            <label className="field-label">
              {text.name}
              <input
                required
                maxLength={150}
                autoComplete="name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
              />
            </label>

            <label className="field-label">
              {text.email}
              <input
                type="email"
                required
                maxLength={254}
                autoComplete="off"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>

            <label className="field-label">
              {text.role}
              <select value={newRole} onChange={(event) => setNewRole(event.target.value as Role)}>
                <option value="maintenance_worker">{label('maintenance_worker')}</option>
                <option value="workshop_head">{label('workshop_head')}</option>
              </select>
            </label>

            <label className="field-label form-full">
              {text.password}
              <input
                type="password"
                required
                minLength={12}
                maxLength={72}
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>

            <label className="field-label form-full">
              {ar ? 'تأكيد كلمة المرور' : fr ? 'Confirmer le mot de passe' : 'Confirm password'}
              <input
                type="password"
                required
                minLength={12}
                maxLength={72}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </label>

            <p className="muted form-full">{text.hint}</p>

            {error && (
              <p
                className="auth-message auth-error form-full"
                role="alert"
              >
                {error}
              </p>
            )}

            <div className="form-actions form-full">
              <button
                type="submit"
                className="button button-primary"
                disabled={busy}
              >
                <UserPlus size={16} />
                {busy ? text.loading : text.create}
              </button>
            </div>
          </form>
        </article>

        <article className="panel user-list-panel">
          <div className="panel-heading">
            <div>
              <h2>{text.users}</h2>
              <p>
                {users.length} {text.count}
              </p>
            </div>
            <span className="panel-icon">
              <Users size={18} />
            </span>
          </div>

          {loadingUsers ? (
            <p className="muted">{text.loadingUsers}</p>
          ) : listError ? (
            <div>
              <p className="auth-message auth-error" role="alert">
                {listError}
              </p>
              <button
                type="button"
                className="button"
                onClick={() => void loadUsers()}
              >
                {text.retry}
              </button>
            </div>
          ) : users.length === 0 ? (
            <p className="muted">{text.noUsers}</p>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{text.name}</th>
                    <th>{text.email}</th>
                    <th>{text.role}</th>
                    <th>{text.workshop}</th>
                    <th>
                      {ar ? 'الحالة' : fr ? 'État' : 'Status'}
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {users.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.full_name || '—'}</strong>
                      </td>
                      <td>{item.email}</td>
                      <td>
                        <span className="role-pill">
                          <ShieldCheck size={13} />
                          {label(item.role)}
                        </span>
                      </td>
                      <td>—</td>
                      <td>
                        <span
                          className={`status-pill ${
                            item.active
                              ? 'status-working'
                              : 'status-broken'
                          }`}
                        >
                          {item.active ? text.active : text.inactive}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>
      </div>
    </section>
  )
}