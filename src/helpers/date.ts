/**
 * Formatea una fecha desde un string en formato YYYY-MM-DD
 * Evita problemas de zona horaria parseando manualmente la fecha
 * @param dateString - String de fecha en formato YYYY-MM-DD
 * @param locale - Locale para formatear la fecha (default: 'es-ES')
 * @returns String formateado de la fecha o null si el string es inválido
 */
/**
 * Extrae YYYY-MM-DD de un string ISO o deja el string si ya es solo fecha.
 * Así evitamos que "2026-02-22T00:00:00.000Z" se interprete como UTC y reste un día en zonas negativas.
 */
function toDateOnlyString(dateString: string): string {
  const s = dateString.trim()
  if (s.includes('T')) return s.split('T')[0] ?? s
  return s
}

export function formatDateFromString(dateString: string | null | undefined, locale: string = 'es-ES'): string | null {
  if (!dateString) return null
  
  try {
    const dateOnly = toDateOnlyString(String(dateString))
    const [year, month, day] = dateOnly.split('-')
    
    if (!year || !month || !day) return null
    
    const fecha = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10))
    
    if (isNaN(fecha.getTime())) return null
    
    return fecha.toLocaleDateString(locale)
  } catch (error) {
    console.error('Error al formatear fecha:', error)
    return null
  }
}

/**
 * Formatea una fecha desde un string en formato YYYY-MM-DD con opciones personalizadas
 * @param dateString - String de fecha en formato YYYY-MM-DD
 * @param options - Opciones para formatear la fecha
 * @returns String formateado de la fecha o null si el string es inválido
 */
export function formatDateFromStringWithOptions(
  dateString: string | null | undefined,
  options: Intl.DateTimeFormatOptions = {}
): string | null {
  if (!dateString) return null
  
  try {
    const dateOnly = toDateOnlyString(String(dateString))
    const [year, month, day] = dateOnly.split('-')
    
    if (!year || !month || !day) return null
    
    const fecha = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10))
    
    if (isNaN(fecha.getTime())) return null
    
    return fecha.toLocaleDateString('es-ES', options)
  } catch (error) {
    console.error('Error al formatear fecha:', error)
    return null
  }
}

/**
 * Formatea fecha_programada (ISO o YYYY-MM-DD) como fecha local para mostrar en UI.
 * Evita el desfase de un día por zona horaria (ej. 22/2 en BD que se veía como 21/2).
 */
export function formatFechaProgramada(value: string | Date | null | undefined): string {
  if (value == null) return 'Sin fecha'
  try {
    if (typeof value === 'string') {
      const formatted = formatDateFromString(value)
      return formatted ?? 'Sin fecha'
    }
    if (value instanceof Date) {
      if (isNaN(value.getTime())) return 'Sin fecha'
      // Usar partes UTC: en BD está 2026-02-22 00:00:00 UTC; en zona negativa getDate() da 21
      const y = value.getUTCFullYear()
      const m = value.getUTCMonth()
      const d = value.getUTCDate()
      const local = new Date(y, m, d)
      return local.toLocaleDateString('es-ES')
    }
    return 'Sin fecha'
  } catch {
    return 'Sin fecha'
  }
}

/**
 * Extrae YYYY-MM-DD de fecha_programada (ISO o YYYY-MM-DD) sin usar zona horaria.
 */
export function getDateOnlyString(value: string | Date | null | undefined): string {
  if (value == null) return ''
  if (typeof value === 'string') return toDateOnlyString(value).slice(0, 10)
  if (value instanceof Date) {
    const y = value.getUTCFullYear()
    const m = String(value.getUTCMonth() + 1).padStart(2, '0')
    const d = String(value.getUTCDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  return ''
}

/**
 * Parsea fecha_programada (ISO o YYYY-MM-DD) como fecha local (medianoche local).
 * Útil para ordenar y comparar sin desfase de zona horaria.
 */
export function parseDateOnlyToLocal(value: string | Date | null | undefined): Date | null {
  const dateOnly = getDateOnlyString(value)
  if (!dateOnly) return null
  const [y, m, d] = dateOnly.split('-').map(Number)
  if (!y || !m || !d) return null
  const fecha = new Date(y, m - 1, d)
  return isNaN(fecha.getTime()) ? null : fecha
}

const DIA_SEMANA_TO_GETDAY: Record<string, number> = {
  viernes: 5,
  sabado: 6,
  domingo: 0
}

/**
 * Dada una fecha de referencia y un día de la semana (viernes/sabado/domingo),
 * devuelve la fecha YYYY-MM-DD de ese día en el mismo fin de semana (viernes a domingo).
 * Así todos los partidos de la misma jornada quedan en el mismo viernes/sábado/domingo.
 */
export function getDateForDiaSemanaInWeek(
  refDateStr: string | Date | null | undefined,
  diaSemana: string | null | undefined
): string {
  const ref = parseDateOnlyToLocal(refDateStr)
  if (!ref) return getDateOnlyString(refDateStr) || ''
  const dia = (diaSemana && typeof diaSemana === 'string' ? diaSemana.toLowerCase() : '') as keyof typeof DIA_SEMANA_TO_GETDAY
  const targetDayNum = DIA_SEMANA_TO_GETDAY[dia] ?? ref.getDay()
  const refDay = ref.getDay()
  const fridayOffset = (refDay - 5 + 7) % 7
  const fridayDateNum = ref.getDate() - fridayOffset
  const targetOffsetFromFriday = (targetDayNum - 5 + 7) % 7
  const targetDateNum = fridayDateNum + targetOffsetFromFriday
  const newDate = new Date(ref.getFullYear(), ref.getMonth(), targetDateNum)
  return getDateOnlyString(newDate) || getDateOnlyString(refDateStr) || ''
}
