import type { Role } from '../data/types'

// Keep sensitive pages visible in navigation, but never navigable without permission.
const ADMIN_ONLY = new Set(['/users', '/settings', '/analytics', '/audit-trail'])
const TECHNICIAN_PATHS = new Set(['/', '/machines', '/workshops', '/maintenance', '/operations', '/warehouse', '/account'])
const WORKSHOP_HEAD_PATHS = new Set(['/', '/machines', '/workshops', '/maintenance', '/warehouse', '/account', '/copilot', '/hidden-failures'])

export function canAccessPath(role: Role | null | undefined, pathname: string): boolean {
  if (!role) return false
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : '/'

  // The administrator is the only role permitted to see analytics and audit history.
  if (role === 'admin') return true
  if (ADMIN_ONLY.has(path)) return false

  // Machine detail URLs follow the same permission as the machine list.
  if (path.startsWith('/machines/')) return true

  if (role === 'production_chief') return true
  if (role === 'maintenance_worker') return TECHNICIAN_PATHS.has(path)
  if (role === 'workshop_head') return WORKSHOP_HEAD_PATHS.has(path)
  return false
}
