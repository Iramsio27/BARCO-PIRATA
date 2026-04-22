import { useState, useEffect } from 'react'
import { fetchPronosticoDia } from '../services/weatherService'

/**
 * Retorna el pronóstico de clima y marina para una fecha específica ('yyyy-MM-dd').
 * Se re-ejecuta automáticamente cada vez que cambia `fecha`.
 */
export function useMarinaForecast(fecha) {
  const [datos,    setDatos]    = useState(null)
  const [cargando, setCargando] = useState(false)
  const [error,    setError]    = useState(null)

  useEffect(() => {
    if (!fecha) {
      setDatos(null)
      return
    }

    let activo = true
    setCargando(true)
    setError(null)
    setDatos(null)

    fetchPronosticoDia(fecha)
      .then((resultado) => { if (activo) setDatos(resultado) })
      .catch((err)      => { if (activo) setError(err.message ?? 'Error al obtener pronóstico') })
      .finally(()       => { if (activo) setCargando(false) })

    return () => { activo = false }
  }, [fecha])

  return { datos, cargando, error }
}
