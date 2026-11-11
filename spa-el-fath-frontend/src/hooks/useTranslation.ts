import { translate, type TranslationKey } from '../i18n'
import { useApp } from '../app/AppProvider'

export function useTranslation() {
  const { language } = useApp()
  return {
    language,
    t: (key: TranslationKey) => translate(language, key),
    isRtl: language === 'ar',
  }
}
