import type { Workshop } from '../data/types'

const API_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, '') || 'http://localhost:3000'

type ApiResponse = { success: boolean; message?: string; data?: { id: number | string; name: string | null; name_fr?: string | null; name_en?: string | null; manager?: string | null; manager_phone?: string | null; location?: string | null } }

export async function saveWorkshopRecord(workshop: Workshop): Promise<Workshop> {
  const response = await fetch(`${API_BASE_URL}/api/workshops/${encodeURIComponent(workshop.id)}`, {
    method: 'PUT',
    credentials: 'include', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: workshop.name, nameFr: workshop.nameFr, nameEn: workshop.nameEn,
      manager: workshop.manager, managerPhone: workshop.managerPhone || '', location: workshop.location,
    }),
  })
  const result = await response.json() as ApiResponse
  if (!response.ok || !result.success || !result.data) throw new Error(result.message || 'Could not save the workshop.')
  const row = result.data
  const name = row.name || workshop.name
  return {
    id: String(row.id), name, nameFr: row.name_fr || workshop.nameFr || name,
    nameEn: row.name_en || workshop.nameEn || name, manager: row.manager || '',
    managerPhone: row.manager_phone || '', location: row.location || '',
  }
}
