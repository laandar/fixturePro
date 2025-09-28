import type { EquipoWithRelations, TorneoWithRelations, EncuentroWithRelations } from '@/db/types'

// ===== TIPOS Y INTERFACES =====

export interface FixtureOptions {
  permiteRevancha?: boolean
  diasEntreJornadas?: number
  fechaInicio?: Date
  canchas?: string[]
  arbitros?: string[]
  jornadaInicial?: number
  jornadaFinal?: number
  encuentrosExistentes?: any[]
  intercambiosInteligentes?: boolean
}

export interface FixtureResult {
  jornadas: JornadaFixture[]
  equiposDescansan: Record<number, number> // jornada -> equipo_id que descansa
  encuentrosCreados: number
  encuentrosEliminados?: number
  jornada?: number // Para jornadas individuales
  equipoQueDescansa?: number // Para jornadas individuales
}

export interface JornadaFixture {
  numero: number
  encuentros: EncuentroFixture[]
  equipoQueDescansa?: number
}

export interface EncuentroFixture {
  equipoLocal: number
  equipoVisitante: number
  jornada: number
}

// ===== ALGORITMO ROUND ROBIN =====

/**
 * Genera un fixture completo usando el algoritmo Round Robin
 * @param equipos Lista de equipos participantes
 * @param options Opciones de configuración del fixture
 * @returns Resultado del fixture generado
 */
export function generateRoundRobinFixture(
  equipos: EquipoWithRelations[], 
  options: FixtureOptions = {}
): FixtureResult {
  // Validaciones básicas
  if (equipos.length < 2) {
    throw new Error('Se necesitan al menos 2 equipos para generar un fixture')
  }

  if (equipos.length > 20) {
    throw new Error('El número máximo de equipos permitido es 20')
  }

  const { permiteRevancha = false } = options
  const equiposIds = equipos.map(e => e.id)
  
  // Generar jornadas de ida
  const jornadasIda = generateRoundRobinJornadas(equiposIds)
  
  let jornadasCompletas = [...jornadasIda]
  
  // Si permite revancha, generar jornadas de vuelta
  if (permiteRevancha) {
    const jornadasVuelta = generateRoundRobinJornadas(equiposIds, true)
    jornadasCompletas = [...jornadasIda, ...jornadasVuelta]
  }

  // Calcular equipos que descansan
  const equiposDescansan = calculateEquiposDescansan(jornadasCompletas, equiposIds)
  
  // Contar encuentros totales
  const encuentrosCreados = jornadasCompletas.reduce((total, jornada) => 
    total + jornada.encuentros.length, 0
  )

  return {
    jornadas: jornadasCompletas,
    equiposDescansan,
    encuentrosCreados
  }
}

/**
 * Genera las jornadas usando el algoritmo Round Robin
 * @param equiposIds Lista de IDs de equipos
 * @param esVuelta Si es true, genera jornadas de vuelta (intercambia local/visitante)
 * @returns Array de jornadas generadas
 */
function generateRoundRobinJornadas(
  equiposIds: number[], 
  esVuelta: boolean = false
): JornadaFixture[] {
  const numEquipos = equiposIds.length
  
  // Para número impar de equipos, cada equipo debe jugar contra todos los demás
  // lo que requiere numEquipos jornadas (una para cada equipo como descanso)
  // Para número par de equipos, son numEquipos - 1 jornadas
  const numJornadas = numEquipos % 2 === 1 ? numEquipos : numEquipos - 1
  const jornadas: JornadaFixture[] = []
  
  // Si hay número impar de equipos, agregar un equipo "fantasma" para el descanso
  const equiposParaAlgoritmo = numEquipos % 2 === 1 
    ? [...equiposIds, -1] // -1 representa el descanso
    : [...equiposIds]
  
  const numEquiposAlgoritmo = equiposParaAlgoritmo.length
  
  // Generar cada jornada
  for (let jornada = 1; jornada <= numJornadas; jornada++) {
    const encuentros: EncuentroFixture[] = []
    
    // Aplicar algoritmo Round Robin
    for (let i = 0; i < numEquiposAlgoritmo / 2; i++) {
      const equipo1 = equiposParaAlgoritmo[i]
      const equipo2 = equiposParaAlgoritmo[numEquiposAlgoritmo - 1 - i]
      
      // Saltar si alguno de los equipos es el "fantasma" (descanso)
      if (equipo1 === -1 || equipo2 === -1) {
        continue
      }
      
      // Determinar local y visitante
      let equipoLocal: number, equipoVisitante: number
      
      if (esVuelta) {
        // En la vuelta, intercambiar local/visitante
        equipoLocal = equipo2
        equipoVisitante = equipo1
      } else {
        // En la ida, mantener el orden original
        equipoLocal = equipo1
        equipoVisitante = equipo2
      }
      
      encuentros.push({
        equipoLocal,
        equipoVisitante,
        jornada: esVuelta ? jornada + numJornadas : jornada
      })
    }
    
    // Rotar equipos para la siguiente jornada (excepto el primero)
    if (jornada < numJornadas) {
      const primerEquipo = equiposParaAlgoritmo[0]
      const ultimoEquipo = equiposParaAlgoritmo[numEquiposAlgoritmo - 1]
      
      // Mover el último equipo a la segunda posición
      equiposParaAlgoritmo.splice(1, 0, ultimoEquipo)
      equiposParaAlgoritmo.pop()
    }
    
    // Determinar qué equipo descansa en esta jornada
    let equipoQueDescansa: number | undefined
    if (numEquipos % 2 === 1) {
      // Con número impar, el equipo que no tiene pareja descansa
      const equiposEnJornada = new Set<number>()
      encuentros.forEach(encuentro => {
        equiposEnJornada.add(encuentro.equipoLocal)
        equiposEnJornada.add(encuentro.equipoVisitante)
      })
      
      equipoQueDescansa = equiposIds.find(id => !equiposEnJornada.has(id))
    }
    
    jornadas.push({
      numero: esVuelta ? jornada + numJornadas : jornada,
      encuentros,
      equipoQueDescansa
    })
  }
  
  return jornadas
}

/**
 * Calcula qué equipos descansan en cada jornada
 * @param jornadas Array de jornadas generadas
 * @param equiposIds Lista de IDs de equipos
 * @returns Record con jornada -> equipo_id que descansa
 */
function calculateEquiposDescansan(
  jornadas: JornadaFixture[], 
  equiposIds: number[]
): Record<number, number> {
  const equiposDescansan: Record<number, number> = {}
  
  jornadas.forEach(jornada => {
    if (jornada.equipoQueDescansa) {
      equiposDescansan[jornada.numero] = jornada.equipoQueDescansa
    }
  })
  
  return equiposDescansan
}

// ===== FUNCIONES AUXILIARES =====

/**
 * Genera una jornada individual
 * @param equipos Lista de equipos participantes
 * @param numeroJornada Número de la jornada a generar
 * @param options Opciones de configuración
 * @returns Resultado de la jornada generada
 */
export function generateSingleJornada(
  equipos: EquipoWithRelations[],
  numeroJornada: number,
  options: FixtureOptions = {}
): FixtureResult {
  const equiposIds = equipos.map(e => e.id)
  
  // Generar solo la jornada específica
  const jornadas = generateRoundRobinJornadas(equiposIds)
  const jornada = jornadas.find(j => j.numero === numeroJornada)
  
  if (!jornada) {
    throw new Error(`No se pudo generar la jornada ${numeroJornada}`)
  }
  
  return {
    jornadas: [jornada],
    equiposDescansan: jornada.equipoQueDescansa ? { [numeroJornada]: jornada.equipoQueDescansa } : {},
    encuentrosCreados: jornada.encuentros.length,
    jornada: numeroJornada,
    equipoQueDescansa: jornada.equipoQueDescansa
  }
}

/**
 * Valida si un conjunto de equipos puede generar un fixture válido
 * @param equipos Lista de equipos
 * @returns true si es válido, false en caso contrario
 */
export function validateEquiposForFixture(equipos: EquipoWithRelations[]): boolean {
  if (equipos.length < 2) return false
  if (equipos.length > 20) return false
  
  // Verificar que todos los equipos tengan ID válido
  return equipos.every(equipo => equipo.id && equipo.id > 0)
}

/**
 * Obtiene estadísticas del fixture generado
 * @param fixtureResult Resultado del fixture
 * @returns Estadísticas del fixture
 */
export function getFixtureStats(fixtureResult: FixtureResult) {
  const totalJornadas = fixtureResult.jornadas.length
  const totalEncuentros = fixtureResult.encuentrosCreados
  const jornadasConDescanso = Object.keys(fixtureResult.equiposDescansan).length
  
  return {
    totalJornadas,
    totalEncuentros,
    jornadasConDescanso,
    promedioEncuentrosPorJornada: totalJornadas > 0 ? totalEncuentros / totalJornadas : 0
  }
}

// ===== FUNCIÓN WRAPPER PARA COMPATIBILIDAD =====

/**
 * Función wrapper para mantener compatibilidad con el código existente
 * @param equipos Lista de equipos participantes
 * @param torneoId ID del torneo (no usado en el nuevo algoritmo)
 * @param options Opciones de configuración del fixture
 * @returns Resultado del fixture generado con formato compatible
 */
export async function generateFixture(
  equipos: EquipoWithRelations[],
  torneoId: number,
  options: FixtureOptions = {}
) {
  // Convertir opciones al formato del nuevo algoritmo
  const fixtureOptions: FixtureOptions = {
    permiteRevancha: options.permiteRevancha,
    diasEntreJornadas: options.diasEntreJornadas,
    fechaInicio: options.fechaInicio,
    canchas: options.canchas,
    arbitros: options.arbitros,
    jornadaInicial: options.jornadaInicial,
    jornadaFinal: options.jornadaFinal,
    encuentrosExistentes: options.encuentrosExistentes,
    intercambiosInteligentes: options.intercambiosInteligentes
  }

  // Generar fixture usando el nuevo algoritmo
  const result = generateRoundRobinFixture(equipos, fixtureOptions)
  
  // Convertir resultado al formato esperado por el código existente
  const encuentros: any[] = []
  
  result.jornadas.forEach(jornada => {
    jornada.encuentros.forEach(encuentro => {
      // Calcular fecha del encuentro
      const fechaBase = options.fechaInicio || new Date()
      const fechaEncuentro = new Date(fechaBase)
      fechaEncuentro.setDate(fechaBase.getDate() + (encuentro.jornada - 1) * (options.diasEntreJornadas || 7))
      
      // Seleccionar cancha y árbitro aleatoriamente
      const cancha = options.canchas?.[Math.floor(Math.random() * (options.canchas?.length || 1))] || 'Cancha Principal'
      const arbitro = options.arbitros?.[Math.floor(Math.random() * (options.arbitros?.length || 1))] || 'Árbitro Principal'
      
      encuentros.push({
        torneo_id: torneoId,
        equipo_local_id: encuentro.equipoLocal,
        equipo_visitante_id: encuentro.equipoVisitante,
        jornada: encuentro.jornada,
        fecha_programada: fechaEncuentro,
        estado: 'programado',
        cancha: cancha,
        arbitro: arbitro,
        goles_local: null,
        goles_visitante: null,
        fecha_jugada: null,
        observaciones: null
      })
    })
  })

  return {
    encuentros,
    equiposDescansan: result.equiposDescansan,
    encuentrosCreados: encuentros.length
  }
}
