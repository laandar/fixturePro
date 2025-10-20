/**
 * Funciones auxiliares para el manejo de edades y rangos de edad
 */

export interface RangoEdad {
  edadMinimaAnos: number;
  edadMinimaMeses: number;
  edadMaximaAnos: number;
  edadMaximaMeses: number;
}

export interface EdadCalculada {
  anos: number;
  meses: number;
  dias: number;
}

/**
 * Calcula la edad de una persona basada en su fecha de nacimiento
 */
export function calcularEdad(fechaNacimiento: Date): EdadCalculada {
  const ahora = new Date();
  const nacimiento = new Date(fechaNacimiento);
  
  let anos = ahora.getFullYear() - nacimiento.getFullYear();
  let meses = ahora.getMonth() - nacimiento.getMonth();
  let dias = ahora.getDate() - nacimiento.getDate();
  
  // Ajustar si el día actual es menor al día de nacimiento
  if (dias < 0) {
    meses--;
    const ultimoMes = new Date(ahora.getFullYear(), ahora.getMonth(), 0);
    dias += ultimoMes.getDate();
  }
  
  // Ajustar si el mes actual es menor al mes de nacimiento
  if (meses < 0) {
    anos--;
    meses += 12;
  }
  
  return { anos, meses, dias };
}

/**
 * Convierte edad en años y meses a meses totales
 */
export function edadAMeses(anos: number, meses: number = 0): number {
  return anos * 12 + meses;
}

/**
 * Convierte meses totales a años y meses
 */
export function mesesAEdad(meses: number): { anos: number; meses: number } {
  const anos = Math.floor(meses / 12);
  const mesesRestantes = meses % 12;
  return { anos, meses: mesesRestantes };
}

/**
 * Verifica si una edad (en años y meses) está dentro de un rango
 */
export function estaEnRangoEdad(
  edadAnos: number,
  edadMeses: number,
  rango: RangoEdad
): boolean {
  const edadTotalMeses = edadAMeses(edadAnos, edadMeses);
  const edadMinimaMeses = edadAMeses(rango.edadMinimaAnos, rango.edadMinimaMeses);
  const edadMaximaMeses = edadAMeses(rango.edadMaximaAnos, rango.edadMaximaMeses);
  
  return edadTotalMeses >= edadMinimaMeses && edadTotalMeses <= edadMaximaMeses;
}

/**
 * Verifica si una fecha de nacimiento está dentro de un rango de edad
 */
export function verificarRangoEdad(
  fechaNacimiento: Date,
  rango: RangoEdad
): boolean {
  const edad = calcularEdad(fechaNacimiento);
  return estaEnRangoEdad(edad.anos, edad.meses, rango);
}

/**
 * Formatea un rango de edad para mostrar al usuario
 */
export function formatearRangoEdad(rango: RangoEdad): string {
  const edadMinima = formatearEdad(rango.edadMinimaAnos, rango.edadMinimaMeses);
  const edadMaxima = formatearEdad(rango.edadMaximaAnos, rango.edadMaximaMeses);
  
  return `${edadMinima} - ${edadMaxima}`;
}

/**
 * Formatea una edad para mostrar al usuario
 */
export function formatearEdad(anos: number, meses: number = 0): string {
  if (meses === 0) {
    return `${anos} años`;
  }
  return `${anos} años y ${meses} meses`;
}

/**
 * Obtiene el mensaje de error cuando un jugador no cumple con el rango de edad
 */
export function obtenerMensajeErrorEdad(
  fechaNacimiento: Date,
  rango: RangoEdad,
  nombreJugador: string
): string {
  const edad = calcularEdad(fechaNacimiento);
  const edadFormateada = formatearEdad(edad.anos, edad.meses);
  const rangoFormateado = formatearRangoEdad(rango);
  
  return `${nombreJugador} tiene ${edadFormateada}, pero la categoría requiere ${rangoFormateado}`;
}

/**
 * Valida que un rango de edad sea coherente (mínimo <= máximo)
 */
export function validarRangoEdad(rango: RangoEdad): { valido: boolean; error?: string } {
  const edadMinimaMeses = edadAMeses(rango.edadMinimaAnos, rango.edadMinimaMeses);
  const edadMaximaMeses = edadAMeses(rango.edadMaximaAnos, rango.edadMaximaMeses);
  
  if (edadMinimaMeses > edadMaximaMeses) {
    return {
      valido: false,
      error: 'La edad mínima no puede ser mayor que la edad máxima'
    };
  }
  
  return { valido: true };
}

/**
 * Crea un rango de edad para categorías comunes
 */
export function crearRangoCategoriaComun(nombreCategoria: string): RangoEdad | null {
  const categoriasComunes: Record<string, RangoEdad> = {
    'Sub 6': { edadMinimaAnos: 4, edadMinimaMeses: 0, edadMaximaAnos: 6, edadMaximaMeses: 0 },
    'Sub 8': { edadMinimaAnos: 6, edadMinimaMeses: 0, edadMaximaAnos: 8, edadMaximaMeses: 0 },
    'Sub 10': { edadMinimaAnos: 8, edadMinimaMeses: 0, edadMaximaAnos: 10, edadMaximaMeses: 0 },
    'Sub 12': { edadMinimaAnos: 10, edadMinimaMeses: 0, edadMaximaAnos: 12, edadMaximaMeses: 4 },
    'Sub 14': { edadMinimaAnos: 12, edadMinimaMeses: 0, edadMaximaAnos: 14, edadMaximaMeses: 0 },
    'Sub 16': { edadMinimaAnos: 14, edadMinimaMeses: 0, edadMaximaAnos: 16, edadMaximaMeses: 0 },
    'Sub 18': { edadMinimaAnos: 16, edadMinimaMeses: 0, edadMaximaAnos: 18, edadMaximaMeses: 0 },
    'Sub 20': { edadMinimaAnos: 18, edadMinimaMeses: 0, edadMaximaAnos: 20, edadMaximaMeses: 0 },
  };
  
  return categoriasComunes[nombreCategoria] || null;
}
