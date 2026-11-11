import type { Machine, MaintenanceLog, Workshop } from './types'

// Preview-only workshop labels; operational records are never seeded or persisted here.
export const demoWorkshops: Workshop[] = [
  { id: 'WS-ROLLY', name: 'الرولي', nameFr: 'Rolly', nameEn: 'Rolly', manager: '', location: '' },
  { id: 'WS-SPONGE', name: 'قطع الإسفنج', nameFr: 'Découpe de mousse', nameEn: 'Sponge Cutting', manager: '', location: '' },
  { id: 'WS-WAT', name: 'الوات / الزاورة', nameFr: 'Wat / Zawra', nameEn: 'Wat / Zawra', manager: '', location: '' },
  { id: 'WS-BRODERIE', name: 'الطرز', nameFr: 'Broderie', nameEn: 'Broderie', manager: '', location: '' },
]
export const demoMachines: Machine[] = []
export const demoMaintenanceLogs: MaintenanceLog[] = []
