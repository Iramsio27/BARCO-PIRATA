import { useTranslation } from 'react-i18next'
import { Globe, ChevronDown } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { clsx } from 'clsx'
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '@lib/i18n'

interface LanguageSwitcherProps {
  /** Variante visual: 'header' (oscuro) o 'inline' (claro). */
  variant?: 'header' | 'inline'
  className?: string
}

const LANG_LABELS: Record<SupportedLanguage, { short: string; full: string; flag: string }> = {
  es: { short: 'ES', full: 'Español', flag: '🇲🇽' },
  en: { short: 'EN', full: 'English', flag: '🇺🇸' },
}

/**
 * Selector de idioma desplegable.
 * - Cambia el idioma de toda la UI pública.
 * - Persiste la preferencia en localStorage (clave 'barco-pirata-lang').
 */
export function LanguageSwitcher({ variant = 'header', className }: LanguageSwitcherProps) {
  const { i18n, t } = useTranslation()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const current = (i18n.resolvedLanguage ?? 'es') as SupportedLanguage
  const currentMeta = LANG_LABELS[current] ?? LANG_LABELS.es

  // Cierra al hacer clic fuera
  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const change = (lang: SupportedLanguage) => {
    i18n.changeLanguage(lang)
    setOpen(false)
  }

  return (
    <div ref={ref} className={clsx('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={t('header.language')}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={clsx(
          'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
          variant === 'header' &&
            'text-navy-100 hover:text-white hover:bg-white/10',
          variant === 'inline' &&
            'text-navy-700 hover:bg-navy-50 border border-navy-200',
        )}
      >
        <Globe className="w-4 h-4" />
        <span className="hidden sm:inline">{currentMeta.short}</span>
        <span className="sm:hidden text-base leading-none">{currentMeta.flag}</span>
        <ChevronDown className={clsx('w-3.5 h-3.5 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label={t('header.language')}
          className="absolute right-0 mt-1.5 min-w-36 bg-white border border-navy-200 rounded-lg shadow-card-lg overflow-hidden z-50"
        >
          {SUPPORTED_LANGUAGES.map((lang) => {
            const meta = LANG_LABELS[lang]
            const isActive = current === lang
            return (
              <li key={lang}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  onClick={() => change(lang)}
                  className={clsx(
                    'w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors',
                    isActive
                      ? 'bg-gold-50 text-navy-900 font-semibold'
                      : 'text-navy-700 hover:bg-navy-50',
                  )}
                >
                  <span className="text-base leading-none">{meta.flag}</span>
                  <span className="flex-1">{meta.full}</span>
                  {isActive && <span className="text-gold-600">✓</span>}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
