import type { Language, Machine, Workshop } from '../data/types'

export function localizedMachineName(machine: Machine, language: Language): string {
  if (language === 'fr') return machine.nameFr || machine.name
  if (language === 'en') return machine.nameEn || machine.name
  return machine.name
}
export function localizedWorkshopName(workshop: Workshop, language: Language): string {
  if (language === 'fr') return workshop.nameFr || workshop.name
  if (language === 'en') return workshop.nameEn || workshop.name
  return workshop.name
}
export function formatNumber(value: number, language: Language): string {
  return new Intl.NumberFormat(language === 'ar' ? 'ar-DZ' : language === 'fr' ? 'fr-DZ' : 'en-US', { maximumFractionDigits: 1 }).format(value)
}
export function formatDate(value: string, language: Language): string {
  if (!value) return '—'
  const date = new Date(`${value}T12:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat(language === 'ar' ? 'ar-DZ' : language === 'fr' ? 'fr-DZ' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(date)
}
export function downloadText(filename: string, content: string, mime = 'text/plain;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([content], { type: mime }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
