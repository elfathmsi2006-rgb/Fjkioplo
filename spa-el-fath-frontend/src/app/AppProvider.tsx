
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react'

import type {
  ActivityItem,
  Language,
  Machine,
  MaintenanceLog,
  Role,
  UserProfile,
  Workshop,
} from '../data/types'

import {
  demoMachines,
  demoMaintenanceLogs,
  demoWorkshops,
} from '../data/demoData'

type Theme = 'light' | 'dark' | 'system'
type Accent = 'blue' | 'teal' | 'violet' | 'amber'
type Density = 'comfortable' | 'compact'

type Preferences = {
  theme: Theme
  accent: Accent
  density: Density
  sidebarCollapsed: boolean
}

type AuthUser = {
  id: string
  email: string
  user_metadata?: {
    full_name?: string
  }
  app_metadata?: {
    role?: Role
  }
}

type AppContextValue = {
  language: Language
  setLanguage: (value: Language) => void

  machines: Machine[]
  setMachines: Dispatch<SetStateAction<Machine[]>>

  workshops: Workshop[]
  setWorkshops: Dispatch<SetStateAction<Workshop[]>>

  maintenanceLogs: MaintenanceLog[]
  setMaintenanceLogs: Dispatch<SetStateAction<MaintenanceLog[]>>

  activities: ActivityItem[]
  addActivity: (action: string, target: string) => void

  preferences: Preferences
  setPreferences: Dispatch<SetStateAction<Preferences>>

  role: Role | null
  profile: UserProfile | null
  user: AuthUser | null

  authLoading: boolean
  dataLoading: boolean
  dataError: string | null
  reloadData: () => Promise<void>
  isConfigured: boolean

  signIn: (email: string, password: string) => Promise<string | null>
  signOut: () => Promise<void>
  signOutAll: () => Promise<string | null>
  requestPasswordReset: (email: string) => Promise<string | null>
  changePassword: (currentPassword: string, newPassword: string) => Promise<string | null>
  resetPassword: (token: string, newPassword: string) => Promise<string | null>
  refreshProfiles: () => Promise<UserProfile[]>

  toast: string
  showToast: (message: string) => void

  undoAction: (() => void) | null
  setUndoAction: (action: (() => void) | null) => void
}

type LoginResponse = {
  success: boolean
  message?: string
  token?: string
  user?: {
    id: string
    email: string
    full_name: string
    role: Role
  }
}

type MachineApiRow = {
  id: number | string
  code: string | null
  name: string | null
  workshop_name: string | null
  workshop_id: number | string | null
  manufacturer: string | null
  model: string | null
  serial_number: string | null
  install_date?: string | null
  next_maintenance_date?: string | null
  last_maintenance_date?: string | null
  production_line_position: number | null
  m_type: string | null
  start_year: string | null
  listed_state: string | null
  state: string | null
  intervention_nbr: number | null
  quantity: number | null
  notes: string | null
  production_line_id?: number | string | null
  name_fr?: string | null
  name_en?: string | null
}

type MachinesResponse = {
  success: boolean
  message?: string
  data?: MachineApiRow[]
}

type WorkshopApiRow = {
  id: number | string
  name: string | null
  name_fr?: string | null
  name_en?: string | null
  manager?: string | null
  manager_phone?: string | null
  location?: string | null
}

type WorkshopsResponse = {
  success: boolean
  message?: string
  data?: WorkshopApiRow[]
}

type MaintenanceLogsResponse = {
  success: boolean
  message?: string
  data?: MaintenanceLog[]
}

function mapMachine(row: MachineApiRow): Machine {
  const rawState = (row.state || '').trim().toLowerCase()

  let status: Machine['status'] = 'working'

  if (
    ['broken', 'out of service', 'hors service', 'en panne', 'panne', 'معطلة'].includes(
      rawState,
    )
  ) {
    status = 'broken'
  } else if (
    [
      'maintenance',
      'under maintenance',
      'en maintenance',
      'en atn',
      'صيانة',
    ].includes(rawState)
  ) {
    status = 'maintenance'
  }

  return {
    id: String(row.id),
    code: row.code || '',
    name: row.name || '',
    nameFr: row.name_fr || row.name || '',
    nameEn: row.name_en || row.name || '',
    workshopId:
      row.workshop_id == null ? '' : String(row.workshop_id),
    status,
    category: row.m_type || '',
    serialNumber: row.serial_number || undefined,
    manufacturer: row.manufacturer || undefined,
    model: row.model || undefined,
    installDate: row.install_date ? String(row.install_date).slice(0, 10) : undefined,
    nextMaintenance: row.next_maintenance_date ? String(row.next_maintenance_date).slice(0, 10) : undefined,
    lastMaintenance: row.last_maintenance_date ? String(row.last_maintenance_date).slice(0, 10) : '',
    notes: row.notes || undefined,
    productionLine: row.production_line_id ?? undefined,
    productionLinePosition: row.production_line_position ?? undefined,
  }
}

function mapWorkshop(row: WorkshopApiRow): Workshop {
  const name = row.name || ''

  return {
    id: String(row.id),
    name,
    nameFr: row.name_fr || name,
    nameEn: row.name_en || name,
    manager: row.manager || '',
    managerPhone: row.manager_phone || '',
    location: row.location || '',
  }
}


const API_BASE_URL =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(
    /\/+$/,
    '',
  ) || 'http://localhost:3000';

const LOCAL_PREVIEW_MODE = import.meta.env.VITE_DEMO_MODE === 'true';
const TOKEN_KEY = 'elfath-auth-token';
const PROFILE_KEY = 'elfath-auth-profile';


const Context = createContext<AppContextValue | null>(null)

const defaultPreferences: Preferences = {
  theme: 'system',
  accent: 'blue',
  density: 'comfortable',
  sidebarCollapsed: false,
}

function isRole(value: unknown): value is Role {
  return (
    value === 'admin' ||
    value === 'production_chief' ||
    value === 'maintenance_worker' ||
    value === 'workshop_head'
  )
}

function makeProfile(
  value: LoginResponse['user'],
): UserProfile | null {
  if (!value || !value.id || !value.email || !isRole(value.role)) {
    return null
  }

  return {
    id: String(value.id),
    email: value.email,
    full_name: value.full_name,
    role: value.role,
    active: true,
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('ar')

  const [machinesState, setMachinesState] = useState<Machine[]>(() =>
    LOCAL_PREVIEW_MODE ? demoMachines : [],
  )

  const [workshopsState, setWorkshopsState] = useState<Workshop[]>(
    () =>
      LOCAL_PREVIEW_MODE ? demoWorkshops : [],
  )

  const [maintenanceLogsState, setMaintenanceLogsState] = useState<
    MaintenanceLog[]
  >(() => LOCAL_PREVIEW_MODE ? demoMaintenanceLogs : [])

  const [activities, setActivities] = useState<ActivityItem[]>([])

  const [preferences, setPreferences] = useState<Preferences>(defaultPreferences)

  const [user, setUser] = useState<AuthUser | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [dataLoading, setDataLoading] = useState(false)
  const [dataError, setDataError] = useState<string | null>(null)
  const [toast, setToast] = useState('')
  const [undoAction, setUndoAction] = useState<(() => void) | null>(
    null,
  )

  const profileRef = useRef<UserProfile | null>(null)
  const role = profile?.role ?? null

  const showToast = useCallback((message: string) => {
    setToast(message)
  }, [])

  const clearLocalSession = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(PROFILE_KEY)

    setUser(null)
    setProfile(null)
    profileRef.current = null
    // Never carry one user's operational records into another session.
    setMachinesState([])
    setWorkshopsState([])
    setMaintenanceLogsState([])
  }, [])

  useEffect(() => {
    if (LOCAL_PREVIEW_MODE) {
      const localProfile: UserProfile = {
        id: 'local-admin',
        email: 'local-admin@spa-elfath.local',
        full_name: 'Local administrator',
        role: 'admin',
        active: true,
      }

      setProfile(localProfile)
      profileRef.current = localProfile

      setUser({
        id: localProfile.id,
        email: localProfile.email,
        user_metadata: {
          full_name: localProfile.full_name,
        },
        app_metadata: {
          role: 'admin',
        },
      })

      setAuthLoading(false)
      return
    }

    void (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/me`, { credentials: 'include' })
        const result = await response.json()
        if (!response.ok || !result.success || !result.user) clearLocalSession()
        else {
          const restoredProfile = makeProfile(result.user)
          if (!restoredProfile) throw new Error('Invalid session profile.')
          setProfile(restoredProfile)
          profileRef.current = restoredProfile
          setUser({ id: restoredProfile.id, email: restoredProfile.email, user_metadata: { full_name: restoredProfile.full_name }, app_metadata: { role: restoredProfile.role } })
        }
      } catch { clearLocalSession() }
      finally { setAuthLoading(false) }
    })()
  }, [clearLocalSession])

  useEffect(() => {
    if (authLoading || !profile || LOCAL_PREVIEW_MODE) return
    let cancelled = false
    fetch(`${API_BASE_URL}/api/settings/preferences`, { credentials: 'include' })
      .then(async response => { const result = await response.json(); if (!response.ok || !result.success) throw new Error(result.message || 'Could not load account preferences.'); return result.data })
      .then(data => {
        if (cancelled || !data) return
        if (data.language === 'ar' || data.language === 'fr' || data.language === 'en') setLanguageState(data.language)
        if (['light','dark','system'].includes(data.theme) && ['blue','teal','violet','amber'].includes(data.accent) && ['comfortable','compact'].includes(data.density)) {
          setPreferences(current => ({ ...current, theme: data.theme, accent: data.accent, density: data.density }))
        }
      })
      .catch(error => { if (!cancelled) console.warn('Could not load saved account preferences:', error.message) })
    return () => { cancelled = true }
  }, [authLoading, profile])

  const reloadData = useCallback(async () => {
    if (LOCAL_PREVIEW_MODE) {
      setDataError(null)
      setDataLoading(false)
      return
    }

    setDataLoading(true)
    setDataError(null)

    try {
      const requestOptions: RequestInit = { credentials: 'include' }

      const [machinesResponse, workshopsResponse] =
        await Promise.all([
          fetch(`${API_BASE_URL}/api/machines`, requestOptions),
          fetch(`${API_BASE_URL}/api/workshops`, requestOptions),
        ])

      const machinesResult =
        (await machinesResponse.json()) as MachinesResponse

      const workshopsResult =
        (await workshopsResponse.json()) as WorkshopsResponse

      if (
        !machinesResponse.ok ||
        !machinesResult.success ||
        !Array.isArray(machinesResult.data)
      ) {
        throw new Error(
          machinesResult.message || 'Could not load machines.',
        )
      }

      if (
        !workshopsResponse.ok ||
        !workshopsResult.success ||
        !Array.isArray(workshopsResult.data)
      ) {
        throw new Error(
          workshopsResult.message || 'Could not load workshops.',
        )
      }

      setMachinesState(machinesResult.data.map(mapMachine))
      setWorkshopsState(workshopsResult.data.map(mapWorkshop))

      // Maintenance records feed the dashboard and analytics. Keep this request
      // independent so an unapplied optional maintenance migration does not
      // prevent the core machine/workshop workspace from opening.
      try {
        const logsResponse = await fetch(`${API_BASE_URL}/api/maintenance-logs`, requestOptions)
        const logsResult = (await logsResponse.json()) as MaintenanceLogsResponse
        if (logsResponse.ok && logsResult.success && Array.isArray(logsResult.data)) {
          setMaintenanceLogsState(logsResult.data)
        } else {
          setMaintenanceLogsState([])
        }
      } catch {
        setMaintenanceLogsState([])
      }
      try {
        const activityResponse = await fetch(`${API_BASE_URL}/api/operations/recent-activity`, requestOptions)
        const activityResult = await activityResponse.json()
        if (activityResponse.ok && activityResult.success && Array.isArray(activityResult.data)) setActivities(activityResult.data)
        else setActivities([])
      } catch { setActivities([]) }
    } catch (error) {
      setMachinesState([])
      setWorkshopsState([])
      setMaintenanceLogsState([])

      setDataError(
        error instanceof Error
          ? error.message
          : 'Could not connect to the backend.',
      )
    } finally {
      setDataLoading(false)
    }
  }, [])

  const setMachines = useCallback<
    Dispatch<SetStateAction<Machine[]>>
  >((action) => {
    setMachinesState(action)
  }, [])

  const setWorkshops = useCallback<
    Dispatch<SetStateAction<Workshop[]>>
  >((action) => {
    setWorkshopsState(action)
  }, [])

  const setMaintenanceLogs = useCallback<
    Dispatch<SetStateAction<MaintenanceLog[]>>
  >((action) => {
    setMaintenanceLogsState(action)
  }, [])

  const setLanguage = useCallback((value: Language) => {
    setLanguageState(value)
  }, [])

  const addActivity = useCallback((_action: string, _target: string) => {
    // The backend audit trail is the source of truth; refresh it instead of creating browser-local activity entries.
    void fetch(`${API_BASE_URL}/api/operations/recent-activity`, { credentials: 'include' })
      .then(async response => { const result = await response.json(); if (response.ok && result.success && Array.isArray(result.data)) setActivities(result.data) })
      .catch(() => { /* keep the last server-confirmed activity list */ })
  }, [])

  useEffect(() => {
    if (authLoading || !profile) return
    void reloadData()
  }, [authLoading, profile, reloadData])

  const signIn = useCallback(
    async (
      email: string,
      password: string,
    ): Promise<string | null> => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/auth/login`,
          {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: email.trim(),
              password,
            }),
          },
        )

        let result: LoginResponse

        try {
          result = (await response.json()) as LoginResponse
        } catch {
          return 'The server returned an invalid response. Please try again.'
        }

        if (!response.ok || !result.success) {
          return result.message || 'Login failed. Please try again.'
        }

        if (!result.user) {
          return 'The server did not return a valid login session.'
        }

        const nextProfile = makeProfile(result.user)

        if (!nextProfile) {
          return 'The server returned an invalid user profile.'
        }

        profileRef.current = nextProfile
        setProfile(nextProfile)

        setUser({
          id: nextProfile.id,
          email: nextProfile.email,
          user_metadata: {
            full_name: nextProfile.full_name,
          },
          app_metadata: {
            role: nextProfile.role,
          },
        })

        setDataError(null)
        return null
      } catch {
        return `Cannot reach the backend at ${API_BASE_URL}. Make sure the Node.js server is running.`
      }
    },
    [],
  )

  const signOut = useCallback(async () => {
    if (LOCAL_PREVIEW_MODE) {
      showToast(
        'وضع التشغيل المحلي: لا يوجد حساب خارجي لتسجيل الخروج منه.',
      )
      return
    }

    try { await fetch(`${API_BASE_URL}/api/auth/logout`, { method: 'POST', credentials: 'include' }) } catch { /* local state is still cleared */ }
    clearLocalSession()
    setDataError(null)
  }, [clearLocalSession, showToast])

  const signOutAll = useCallback(async (): Promise<string | null> => {
    if (LOCAL_PREVIEW_MODE) return null
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/logout-all`, { method: 'POST', credentials: 'include' })
      const result = await response.json().catch(() => null)
      if (!response.ok || !result?.success) return result?.message || 'Could not sign out all sessions.'
      clearLocalSession()
      setDataError(null)
      return null
    } catch {
      return `Cannot reach the backend at ${API_BASE_URL}.`
    }
  }, [clearLocalSession])

  // Sliding session: refresh the one-hour cookie while the user is active.
  // A 401 means the session was revoked elsewhere, so local state is cleared.
  useEffect(() => {
    if (LOCAL_PREVIEW_MODE || authLoading || !profile) return
    let cancelled = false
    const refreshSession = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, { method: 'POST', credentials: 'include' })
        if (!cancelled && (response.status === 401 || response.status === 403)) clearLocalSession()
      } catch {
        // Offline: keep the current session until the cookie expires naturally.
      }
    }
    const timer = window.setInterval(() => void refreshSession(), 20 * 60 * 1000)
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') void refreshSession()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      cancelled = true
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [authLoading, profile, clearLocalSession])

  const requestPasswordReset = useCallback(
    async (email: string): Promise<string | null> => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim() }),
        })
        const result = await response.json().catch(() => null)
        if (!response.ok || !result?.success) {
          return result?.message || 'Could not request a password reset. Please try again later.'
        }
        return null
      } catch {
        return `Cannot reach the backend at ${API_BASE_URL}.`
      }
    },
    [],
  )

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string): Promise<string | null> => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/change-password`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currentPassword, newPassword }),
        })
        const result = await response.json().catch(() => null)
        if (!response.ok || !result?.success) {
          return result?.message || 'Could not change the password.'
        }
        return null
      } catch {
        return `Cannot reach the backend at ${API_BASE_URL}.`
      }
    },
    [],
  )

  const resetPassword = useCallback(
    async (token: string, newPassword: string): Promise<string | null> => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, newPassword }),
        })
        const result = await response.json().catch(() => null)
        if (!response.ok || !result?.success) {
          return result?.message || 'This reset link is invalid or has expired.'
        }
        return null
      } catch {
        return `Cannot reach the backend at ${API_BASE_URL}.`
      }
    },
    [],
  )

const refreshProfiles = useCallback(async (): Promise<
  UserProfile[]
> => {
  const response = await fetch(`${API_BASE_URL}/api/users`, { credentials: 'include' })

  let result: {
    success: boolean
    message?: string
    data?: UserProfile[]
  }

  try {
    result = await response.json()
  } catch {
    throw new Error('The server returned an invalid response.')
  }

  if (!response.ok || !result.success || !Array.isArray(result.data)) {
    throw new Error(result.message || 'Could not load user accounts.')
  }

  return result.data
}, [])



  const value = useMemo<AppContextValue>(
    () => ({
      language,
      setLanguage,
      machines: machinesState,
      setMachines,
      workshops: workshopsState,
      setWorkshops,
      maintenanceLogs: maintenanceLogsState,
      setMaintenanceLogs,
      activities,
      addActivity,
      preferences,
      setPreferences,
      role,
      profile,
      user,
      authLoading,
      dataLoading,
      dataError,
      reloadData,
      isConfigured: true,
      signIn,
      signOut,
      signOutAll,
      requestPasswordReset,
      changePassword,
      resetPassword,
      refreshProfiles,
      toast,
      showToast,
      undoAction,
      setUndoAction,
    }),
    [
      language,
      setLanguage,
      machinesState,
      setMachines,
      workshopsState,
      setWorkshops,
      maintenanceLogsState,
      setMaintenanceLogs,
      activities,
      addActivity,
      preferences,
      role,
      profile,
      user,
      authLoading,
      dataLoading,
      dataError,
      reloadData,
      signIn,
      signOut,
      signOutAll,
      requestPasswordReset,
      changePassword,
      resetPassword,
      refreshProfiles,
      toast,
      showToast,
      undoAction,
    ],
  )

  return (
    <Context.Provider value={value}>
      {children}
    </Context.Provider>
  )
}

export function useApp() {
  const value = useContext(Context)

  if (!value) {
    throw new Error('useApp must be used within AppProvider')
  }

  return value
}



