export type Language = 'ar' | 'fr' | 'en'
export type MachineStatus = 'working' | 'broken' | 'maintenance'
export type MaintenanceType = 'preventive' | 'corrective'
export type MaintenanceStatus = 'scheduled' | 'in-progress' | 'completed'
export type Role = 'admin' | 'production_chief' | 'maintenance_worker' | 'workshop_head'
export type UserProfile = { id: string; email: string; full_name: string; role: Role; active: boolean }
export type Machine = {
  id: string
  code: string
  name: string
  nameFr: string
  nameEn: string
  workshopId: string
  status: MachineStatus
  category: string
  lastMaintenance: string
  serialNumber?: string
  manufacturer?: string
  model?: string
  installDate?: string
  nextMaintenance?: string
  notes?: string
  technicianDescription?: string
  technicianDescriptionUpdatedAt?: string
  workshopChiefDescription?: string
  workshopChiefDescriptionUpdatedAt?: string
  productionLine?: string | number
  productionLinePosition?: string | number
}
export type Workshop = {
  id: string
  name: string
  nameFr: string
  nameEn: string
  manager: string
  managerPhone?: string
  location: string
}
export type MaintenanceLog = {
  id: string
  machineId: string
  type: MaintenanceType
  date: string
  durationHours: number
  technician: string
  cost: number
  notes: string
  status: MaintenanceStatus
  outageStart?: string
  outageEnd?: string
  failureCause?: string
  noteImage?: string
  noteImageName?: string
  taskId?: string
  attachments?: Array<{ id: string; type: 'image' | 'audio'; name: string; mimeType: string; size: number; url: string }>
}
export type ActivityItem = { id: string; action: string; target: string; date: string }
