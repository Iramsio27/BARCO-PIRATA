import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import esCommon from './locales/es/common.json'
import enCommon from './locales/en/common.json'

export const SUPPORTED_LANGUAGES = ['es', 'en'] as const
export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number]

/**
 * Configuración de i18next.
 * - Detecta automáticamente el idioma del dispositivo (navigator.language).
 * - Guarda la preferencia del usuario en localStorage para persistirla.
 * - Solo aplica al sitio público — el panel /admin queda en español fijo.
 *
 * Orden de detección:
 *   1. localStorage (si el usuario eligió manualmente con el botón)
 *   2. navigator (idioma del dispositivo)
 *   3. fallback: 'es'
 */
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      es: { common: esCommon },
      en: { common: enCommon },
    },
    fallbackLng: 'es',
    supportedLngs: SUPPORTED_LANGUAGES as unknown as string[],
    nonExplicitSupportedLngs: true, // 'es-MX' → 'es', 'en-US' → 'en'
    load: 'languageOnly',
    defaultNS: 'common',
    ns: ['common'],
    interpolation: {
      escapeValue: false, // React ya hace escape
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      lookupLocalStorage: 'barco-pirata-lang',
      caches: ['localStorage'],
    },
  })

export default i18n
