import type { Machine, MachineStatus } from '../data/types'

const API_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, '') || 'http://localhost:3000'
type ApiMachine = {
  id: string | number; code?: string | null; name?: string | null; name_fr?: string | null; name_en?: string | null
  workshop_id?: string | number | null; workshop_name?: string | null; state?: string | null; m_type?: string | null
  manufacturer?: string | null; model?: string | null; serial_number?: string | null; notes?: string | null
  production_line_id?: string | number | null; production_line_position?: string | number | null
  install_date?: string | null; next_maintenance_date?: string | null; last_maintenance_date?: string | null
}
type ApiResponse = { success: boolean; message?: string; data?: ApiMachine }

function statusValue(status: MachineStatus) { return status }
function payload(machine: Machine, workshopName: string) {
  return {
    code: machine.code, name: machine.name, nameFr: machine.nameFr, nameEn: machine.nameEn,
    workshopId: machine.workshopId || null, workshopName, status: statusValue(machine.status),
    category: machine.category || null, manufacturer: machine.manufacturer || null, model: machine.model || null,
    serialNumber: machine.serialNumber || null, notes: machine.notes || null,
    productionLineId: machine.productionLine ?? null, productionLinePosition: machine.productionLinePosition ?? null,
    installDate: machine.installDate || null, nextMaintenanceDate: machine.nextMaintenance || null,
  }
}
function fromApi(row: ApiMachine, fallback: Machine): Machine {
  const raw = String(row.state || fallback.status).trim().toLowerCase()
  const status: MachineStatus = ['broken', 'en panne', 'panne', 'hors service', 'out of service'].includes(raw) ? 'broken' : ['maintenance', 'under maintenance', 'en maintenance', 'en atn'].includes(raw) ? 'maintenance' : 'working'
  return {
    ...fallback, id: String(row.id), code: row.code ?? fallback.code, name: row.name ?? fallback.name,
    nameFr: row.name_fr ?? fallback.nameFr, nameEn: row.name_en ?? fallback.nameEn,
    workshopId: row.workshop_id == null ? '' : String(row.workshop_id), status,
    category: row.m_type ?? fallback.category, manufacturer: row.manufacturer ?? undefined,
    model: row.model ?? fallback.model,
    serialNumber: row.serial_number ?? undefined, notes: row.notes ?? undefined,
    productionLine: row.production_line_id ?? undefined, productionLinePosition: row.production_line_position ?? undefined,
    installDate: row.install_date ? String(row.install_date).slice(0, 10) : undefined,
    nextMaintenance: row.next_maintenance_date ? String(row.next_maintenance_date).slice(0, 10) : undefined,
    lastMaintenance: row.last_maintenance_date ? String(row.last_maintenance_date).slice(0, 10) : fallback.lastMaintenance,
  }
}

export async function saveMachineRecord(machine: Machine, workshopName: string, id?: string): Promise<Machine> {
  const response = await fetch(`${API_BASE_URL}/api/machines${id ? `/${encodeURIComponent(id)}` : ''}`, {
    method: id ? 'PUT' : 'POST',
    credentials: 'include', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload(machine, workshopName)),
  })
  const result = await response.json() as ApiResponse
  if (!response.ok || !result.success || !result.data) throw new Error(result.message || 'Could not save the machine.')
  return fromApi(result.data, machine)
}

export async function deleteMachineRecord(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/machines/${encodeURIComponent(id)}`, { method: 'DELETE', credentials: 'include' })
  const result = await response.json() as { success: boolean; message?: string }
  if (!response.ok || !result.success) throw new Error(result.message || 'Could not delete the machine.')
}
