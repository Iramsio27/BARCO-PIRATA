import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

// ════════════════════════════════════════════════════════════════════════
//   Tipos de preferencia
// ════════════════════════════════════════════════════════════════════════

export type ThemeMode    = 'light' | 'dark' | 'system'
export type Density      = 'compact' | 'normal' | 'comfortable'
export type AccentColor  = 'gold' | 'navy' | 'pirate'

export interface AdminSettings {
  theme: ThemeMode
  density: Density
  accent: AccentColor
  /** Mostrar el banner de bienvenida en el dashboard */
  showWelcomeBanner: boolean
  /** Animaciones suaves en gráficas y transiciones */
  animations: boolean
}

const DEFAULT_SETTINGS: AdminSettings = {
  theme: 'system',
  density: 'normal',
  accent: 'gold',
  showWelcomeBanner: true,
  animations: true,
}

const STORAGE_KEY = 'barco-pirata-admin-settings'

// ════════════════════════════════════════════════════════════════════════
//   Contexto
// ════════════════════════════════════════════════════════════════════════

interface AdminThemeContextValue {
  settings: AdminSettings
  /** Tema resuelto en vivo: 'light' o 'dark' (si theme === 'system' decide por `prefers-color-scheme`) */
  resolvedTheme: 'light' | 'dark'
  update: (patch: Partial<AdminSettings>) => void
  reset: () => void
}

const AdminThemeContext = createContext<AdminThemeContextValue | null>(null)

// ════════════════════════════════════════════════════════════════════════
//   Provider
// ════════════════════════════════════════════════════════════════════════

function loadSettings(): AdminSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_SETTINGS
    const parsed = JSON.parse(raw)
    return { ...DEFAULT_SETTINGS, ...parsed }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function AdminThemeProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AdminSettings>(loadSettings)
  const [systemDark, setSystemDark] = useState<boolean>(() =>
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-color-scheme: dark)').matches,
  )

  // Escucha cambios del tema del sistema
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // Persistir
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    } catch {
      // localStorage lleno / deshabilitado — no bloquear UI
    }
  }, [settings])

  const resolvedTheme: 'light' | 'dark' =
    settings.theme === 'system'
      ? (systemDark ? 'dark' : 'light')
      : settings.theme

  // Aplicar data-attrs en <html> para que los CSS variables hereden globalmente
  // dentro del panel admin (las rutas públicas no usan este provider).
  useEffect(() => {
    const root = document.documentElement
    root.dataset.adminTheme   = resolvedTheme
    root.dataset.adminDensity = settings.density
    root.dataset.adminAccent  = settings.accent
    return () => {
      delete root.dataset.adminTheme
      delete root.dataset.adminDensity
      delete root.dataset.adminAccent
    }
  }, [resolvedTheme, settings.density, settings.accent])

  const update = (patch: Partial<AdminSettings>) =>
    setSettings((prev) => ({ ...prev, ...patch }))

  const reset = () => setSettings(DEFAULT_SETTINGS)

  return (
    <AdminThemeContext.Provider value={{ settings, resolvedTheme, update, reset }}>
      {children}
    </AdminThemeContext.Provider>
  )
}

// ════════════════════════════════════════════════════════════════════════
//   Hook
// ════════════════════════════════════════════════════════════════════════

export function useAdminTheme(): AdminThemeContextValue {
  const ctx = useContext(AdminThemeContext)
  if (!ctx) throw new Error('useAdminTheme debe usarse dentro de <AdminThemeProvider>')
  return ctx
}
