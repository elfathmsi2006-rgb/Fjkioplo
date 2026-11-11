import ar from './ar'
import fr from './fr'
import en from './en'
import type { Language } from '../data/types'

export const dictionaries = { ar, fr, en }
export type TranslationKey = keyof typeof ar
export function translate(language: Language, key: TranslationKey): string {
  return dictionaries[language][key] ?? dictionaries.en[key]
}
