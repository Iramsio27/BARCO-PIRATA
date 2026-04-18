import { useState } from 'react'
import {
  Sun, Moon, Monitor, LayoutGrid, Palette, RotateCcw,
  Eye, Sparkles, Settings as SettingsIcon, Check,
} from 'lucide-react'
import { clsx } from 'clsx'
import {
  useAdminTheme,
  type ThemeMode, type Density, type AccentColor,
} from '@app/providers/AdminThemeProvider'
import { Button } from '@components/ui/Button'

// ════════════════════════════════════════════════════════════════════════
//   Tile reutilizable (botón grande con icono)
// ════════════════════════════════════════════════════════════════════════
function OptionTile({
  active, icon: Icon, label, hint, onClick,
}: {
  active: boolean
  icon: React.ComponentType<{ className?: string }>
  label: string
  hint?: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'relative flex flex-col items-center justify-center gap-2 p-4 rounded-xl border transition-all text-center',
        active
          ? 'admin-accent-bg admin-accent-border shadow-md'
          : 'admin-surface admin-border hover:border-gold-400 admin-text-body',
      )}
    >
      {active && (
        <span className="absolute top-2 right-2">
          <Check className="w-4 h-4" />
        </span>
      )}
      <Icon className={clsx('w-6 h-6', active ? '' : 'admin-accent-text')} />
      <span className="font-semibold text-sm">{label}</span>
      {hint && <span className={clsx('text-[11px]', active ? 'opacity-80' : 'admin-text-subtle')}>{hint}</span>}
    </button>
  )
}

// ════════════════════════════════════════════════════════════════════════
//   Switch
// ════════════════════════════════════════════════════════════════════════
function ToggleSwitch({
  checked, onChange, label, description,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  description?: string
}) {
  return (
    <label className="flex items-center justify-between gap-4 py-3 cursor-pointer">
      <div className="min-w-0">
        <p className="font-semibold text-sm admin-text-body">{label}</p>
        {description && <p className="text-xs admin-text-muted mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={clsx(
          'relative shrink-0 inline-flex items-center w-11 h-6 rounded-full transition-colors',
          checked ? 'bg-gold-400' : 'admin-surface-alt border admin-border',
        )}
      >
        <span
          className={clsx(
            'inline-block w-4 h-4 rounded-full bg-white shadow transition-transform',
            checked ? 'translate-x-6' : 'translate-x-1',
          )}
        />
      </button>
    </label>
  )
}

// ════════════════════════════════════════════════════════════════════════
//   Sección
// ════════════════════════════════════════════════════════════════════════
function Section({
  icon: Icon, title, description, children,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="admin-surface border admin-border rounded-xl p-6">
      <header className="flex items-start gap-3 mb-5">
        <div className="w-10 h-10 rounded-lg bg-gold-100 flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-gold-600" />
        </div>
        <div className="min-w-0">
          <h2 className="font-display font-bold admin-text-title">{title}</h2>
          {description && <p className="text-sm admin-text-muted mt-0.5">{description}</p>}
        </div>
      </header>
      {children}
    </section>
  )
}

// ════════════════════════════════════════════════════════════════════════
//   Página
// ════════════════════════════════════════════════════════════════════════
export default function AdminSettingsPage() {
  const { settings, resolvedTheme, update, reset } = useAdminTheme()
  const [justSaved, setJustSaved] = useState(false)

  const handleReset = () => {
    if (confirm('¿Restablecer todos los ajustes a sus valores predeterminados?')) {
      reset()
      setJustSaved(true)
      setTimeout(() => setJustSaved(false), 2000)
    }
  }

  const themeOptions: Array<{ value: ThemeMode; label: string; hint: string; icon: React.ComponentType<{ className?: string }> }> = [
    { value: 'light',  label: 'Claro',  hint: 'Fondo blanco con detalles navy',  icon: Sun },
    { value: 'dark',   label: 'Oscuro', hint: 'Ideal para uso nocturno',         icon: Moon },
    { value: 'system', label: 'Sistema', hint: 'Se adapta a tu dispositivo',     icon: Monitor },
  ]

  const densityOptions: Array<{ value: Density; label: string; hint: string }> = [
    { value: 'compact',     label: 'Compacto',    hint: 'Más información en pantalla' },
    { value: 'normal',      label: 'Normal',      hint: 'Balance recomendado' },
    { value: 'comfortable', label: 'Cómodo',      hint: 'Mayor respiración visual' },
  ]

  const accentOptions: Array<{ value: AccentColor; label: string; color: string }> = [
    { value: 'gold',   label: 'Oro pirata', color: '#F0B429' },
    { value: 'navy',   label: 'Navy',       color: '#0D2040' },
    { value: 'pirate', label: 'Rojo',       color: '#DC2626' },
  ]

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Encabezado */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold admin-text-title flex items-center gap-2">
            <SettingsIcon className="w-6 h-6 text-gold-500" />
            Ajustes
          </h1>
          <p className="text-sm admin-text-muted mt-0.5">
            Personaliza la apariencia y comportamiento del panel administrador.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {justSaved && (
            <span className="text-sm text-green-600 font-medium flex items-center gap-1.5">
              <Check className="w-4 h-4" /> Restablecido
            </span>
          )}
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="w-4 h-4" /> Restablecer
          </Button>
        </div>
      </div>

      {/* Tema */}
      <Section
        icon={Palette}
        title="Apariencia"
        description={`Tema resuelto actualmente: ${resolvedTheme === 'dark' ? 'Oscuro' : 'Claro'}.`}
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {themeOptions.map((opt) => (
            <OptionTile
              key={opt.value}
              active={settings.theme === opt.value}
              icon={opt.icon}
              label={opt.label}
              hint={opt.hint}
              onClick={() => update({ theme: opt.value })}
            />
          ))}
        </div>
      </Section>

      {/* Densidad */}
      <Section
        icon={LayoutGrid}
        title="Densidad"
        description="Controla el espaciado general de tablas, tarjetas y formularios."
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {densityOptions.map((opt) => (
            <OptionTile
              key={opt.value}
              active={settings.density === opt.value}
              icon={LayoutGrid}
              label={opt.label}
              hint={opt.hint}
              onClick={() => update({ density: opt.value })}
            />
          ))}
        </div>
      </Section>

      {/* Acento */}
      <Section
        icon={Sparkles}
        title="Color de acento"
        description="Color principal de botones, enlaces y elementos destacados."
      >
        <div className="grid grid-cols-3 gap-3">
          {accentOptions.map((opt) => {
            const active = settings.accent === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => update({ accent: opt.value })}
                className={clsx(
                  'relative flex flex-col items-center gap-2 p-4 rounded-xl border transition-all',
                  active
                    ? 'border-gold-500 ring-2 ring-gold-400 bg-gold-50'
                    : 'admin-surface admin-border hover:border-gold-400',
                )}
              >
                {active && (
                  <span className="absolute top-2 right-2 text-gold-700">
                    <Check className="w-4 h-4" />
                  </span>
                )}
                <span
                  className="w-10 h-10 rounded-full shadow-inner border border-black/10"
                  style={{ background: opt.color }}
                />
                <span className="font-semibold text-sm admin-text-body">{opt.label}</span>
              </button>
            )
          })}
        </div>
      </Section>

      {/* Otros */}
      <Section
        icon={Eye}
        title="Preferencias generales"
        description="Ajusta elementos del panel a tu flujo de trabajo."
      >
        <div className="divide-y admin-divide">
          <ToggleSwitch
            checked={settings.showWelcomeBanner}
            onChange={(v) => update({ showWelcomeBanner: v })}
            label="Mostrar banner de bienvenida en el Dashboard"
            description="Oculta el saludo y las métricas principales para una vista más directa."
          />
          <ToggleSwitch
            checked={settings.animations}
            onChange={(v) => update({ animations: v })}
            label="Animaciones suaves"
            description="Deshabilita transiciones para un rendimiento máximo o entornos con poca memoria."
          />
        </div>
      </Section>

      {/* Info */}
      <div className="admin-surface-alt border admin-border rounded-xl p-4 text-xs admin-text-muted">
        <p>
          Los ajustes se guardan localmente en tu navegador
          (<code className="admin-text-body font-mono">localStorage</code>). No afectan la sesión de otros usuarios administradores.
        </p>
      </div>
    </div>
  )
}
