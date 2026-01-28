/**
 * Formatea una fecha desde un string en formato YYYY-MM-DD
 * Evita problemas de zona horaria parseando manualmente la fecha
 * @param dateString - String de fecha en formato YYYY-MM-DD
 * @param locale - Locale para formatear la fecha (default: 'es-ES')
 * @returns String formateado de la fecha o null si el string es inválido
 */
export function formatDateFromString(dateString: string | null | undefined, locale: string = 'es-ES'): string | null {
  if (!dateString) return null
  
  try {
    // Parsear la fecha manualmente para evitar problemas de zona horaria
    const [year, month, day] = dateString.split('-')
    
    if (!year || !month || !day) return null
    
    const fecha = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
    
    // Validar que la fecha es válida
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
    // Parsear la fecha manualmente para evitar problemas de zona horaria
    const [year, month, day] = dateString.split('-')
    
    if (!year || !month || !day) return null
    
    const fecha = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
    
    // Validar que la fecha es válida
    if (isNaN(fecha.getTime())) return null
    
    return fecha.toLocaleDateString('es-ES', options)
  } catch (error) {
    console.error('Error al formatear fecha:', error)
    return null
  }
}
