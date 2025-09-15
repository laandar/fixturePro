import type { EquipoWithRelations, EncuentroWithRelations } from '@/db/types'

// ===== TIPOS Y INTERFACES =====

export interface DynamicFixtureOptions {
  permiteRevancha?: boolean
  diasEntreJornadas?: number
  fechaInicio?: Date
  canchas?: string[]
  arbitros?: string[]
  jornadaInicial?: number
  jornadaFinal?: number
  encuentrosExistentes?: EncuentroWithRelations[]
  equiposDescansanExistentes?: Record<number, number[]>
  forzarDescanso?: number[] // IDs de los equipos que deben descansar en esta jornada
  permitirDescansosConsecutivos?: boolean
}

export interface DynamicFixtureResult {
  jornada: JornadaPropuesta
  estadisticas: EstadisticasJornada
  validaciones: ValidacionesJornada
  alternativas?: JornadaPropuesta[] // Alternativas si la propuesta no es óptima
}

export interface JornadaPropuesta {
  numero: number
  encuentros: EncuentroPropuesto[]
  equiposQueDescansan?: number[]
  fecha: Date
  canchas: string[]
  arbitros: string[]
}

export interface EncuentroPropuesto {
  equipoLocal: number
  equipoVisitante: number
  cancha: string
  arbitro: string
  fecha: Date
  esNuevoEmparejamiento: boolean
  prioridad: 'alta' | 'media' | 'baja' // Basado en cuánto tiempo hace que se enfrentaron
}

export interface EstadisticasJornada {
  totalEncuentros: number
  nuevosEmparejamientos: number
  emparejamientosRepetidos: number
  equiposConDescanso: number
  balanceDescansos: Record<number, number> // equipo_id -> número de descansos
  proximasOpciones: number // Cuántas opciones quedan para próximas jornadas
}

export interface ValidacionesJornada {
  esValida: boolean
  errores: string[]
  advertencias: string[]
  descansosConsecutivos: number[]
  equiposDesbalanceados: number[] // Equipos con muchos/few descansos
}

export interface EstadoTorneo {
  equipos: EquipoWithRelations[]
  encuentrosJugados: EncuentroWithRelations[]
  descansosPorEquipo: Record<number, number>
  jornadasGeneradas: number[]
  emparejamientosExistentes: Set<string>
  ultimaJornada: number
}

// ===== GENERADOR DINÁMICO DE FIXTURE =====

export class DynamicFixtureGenerator {
  private estado: EstadoTorneo
  private options: DynamicFixtureOptions

  constructor(
    equipos: EquipoWithRelations[],
    encuentrosExistentes: EncuentroWithRelations[] = [],
    descansosExistentes: Record<number, number[]> = {},
    options: DynamicFixtureOptions = {}
  ) {
    this.options = {
      permiteRevancha: false,
      diasEntreJornadas: 7,
      fechaInicio: new Date(),
      canchas: ['Cancha Principal', 'Cancha Secundaria'],
      arbitros: ['Árbitro 1', 'Árbitro 2', 'Árbitro 3'],
      permitirDescansosConsecutivos: false,
      ...options
    }

    this.estado = this.inicializarEstado(equipos, encuentrosExistentes, descansosExistentes)
  }

  private inicializarEstado(
    equipos: EquipoWithRelations[],
    encuentrosExistentes: EncuentroWithRelations[],
    descansosExistentes: Record<number, number[]>
  ): EstadoTorneo {
    const emparejamientosExistentes = new Set<string>()
    
    // Registrar emparejamientos existentes
    encuentrosExistentes.forEach(encuentro => {
      const emparejamiento = `${encuentro.equipo_local_id}-${encuentro.equipo_visitante_id}`
      const emparejamientoInverso = `${encuentro.equipo_visitante_id}-${encuentro.equipo_local_id}`
      emparejamientosExistentes.add(emparejamiento)
      emparejamientosExistentes.add(emparejamientoInverso)
    })

    // Calcular descansos por equipo
    const descansosPorEquipo: Record<number, number> = {}
    equipos.forEach(equipo => {
      descansosPorEquipo[equipo.id] = 0
    })
    
    Object.values(descansosExistentes).forEach(equiposIds => {
      equiposIds.forEach(equipoId => {
        if (descansosPorEquipo[equipoId] !== undefined) {
          descansosPorEquipo[equipoId]++
        }
      })
    })

    // Obtener jornadas ya generadas
    const jornadasGeneradas = [...new Set(encuentrosExistentes.map(e => e.jornada).filter(j => j !== null))] as number[]
    const ultimaJornada = jornadasGeneradas.length > 0 ? Math.max(...jornadasGeneradas) : 0

    return {
      equipos,
      encuentrosJugados: encuentrosExistentes,
      descansosPorEquipo,
      jornadasGeneradas,
      emparejamientosExistentes,
      ultimaJornada
    }
  }

  /**
   * Genera una propuesta de jornada con restricciones dinámicas
   */
  public generarPropuestaJornada(jornada: number): DynamicFixtureResult {
    const validaciones = this.validarJornada(jornada)
    
    if (!validaciones.esValida) {
      return {
        jornada: this.crearJornadaVacia(jornada),
        estadisticas: this.calcularEstadisticasVacia(),
        validaciones
      }
    }

    const equiposQueDescansan = this.seleccionarEquiposDescanso(jornada)
    const equiposDisponibles = this.estado.equipos.filter(e => !equiposQueDescansan.includes(e.id))
    
    const encuentros = this.generarEncuentros(equiposDisponibles, jornada)
    const jornadaPropuesta = this.crearJornadaPropuesta(jornada, encuentros, equiposQueDescansan)
    
    const estadisticas = this.calcularEstadisticas(jornadaPropuesta)
    const alternativas = this.generarAlternativas(jornada, equiposQueDescansan)

    return {
      jornada: jornadaPropuesta,
      estadisticas,
      validaciones: this.validarJornadaPropuesta(jornadaPropuesta),
      alternativas
    }
  }

  private validarJornada(jornada: number): ValidacionesJornada {
    const errores: string[] = []
    const advertencias: string[] = []
    const descansosConsecutivos: number[] = []
    const equiposDesbalanceados: number[] = []

    // Validar que la jornada no existe
    if (this.estado.jornadasGeneradas.includes(jornada)) {
      errores.push(`La jornada ${jornada} ya existe`)
    }

    // Validar número mínimo de equipos
    if (this.estado.equipos.length < 2) {
      errores.push('Se necesitan al menos 2 equipos para generar una jornada')
    }

    // Validar descansos consecutivos
    if (!this.options.permitirDescansosConsecutivos && jornada > 1) {
      const descansosAnteriores = this.obtenerDescansosJornadaAnterior(jornada)
      if (this.options.forzarDescanso && this.options.forzarDescanso.length > 0) {
        this.options.forzarDescanso.forEach(equipoId => {
          if (descansosAnteriores.includes(equipoId)) {
            descansosConsecutivos.push(equipoId)
            advertencias.push(`El equipo ${equipoId} descansaría dos jornadas consecutivas`)
          }
        })
      }
    }

    // Validar balance de descansos
    const maxDescansos = Math.max(...Object.values(this.estado.descansosPorEquipo))
    const minDescansos = Math.min(...Object.values(this.estado.descansosPorEquipo))
    
    if (maxDescansos - minDescansos > 1) {
      Object.entries(this.estado.descansosPorEquipo).forEach(([equipoId, descansos]) => {
        if (descansos === maxDescansos) {
          equiposDesbalanceados.push(parseInt(equipoId))
        }
      })
      advertencias.push('Hay desbalance en los descansos entre equipos')
    }

    return {
      esValida: errores.length === 0,
      errores,
      advertencias,
      descansosConsecutivos,
      equiposDesbalanceados
    }
  }

  private seleccionarEquiposDescanso(jornada: number): number[] {
    // Si se fuerzan descansos específicos, usarlos
    if (this.options.forzarDescanso && this.options.forzarDescanso.length > 0) {
      return this.options.forzarDescanso
    }

    // Calcular cuántos equipos deben descansar
    const totalEquipos = this.estado.equipos.length
    const equiposQueDebenDescansar = totalEquipos % 2 === 0 ? 0 : 1

    if (equiposQueDebenDescansar === 0) {
      return []
    }

    // Seleccionar el equipo con menos descansos
    let equipoConMenosDescansos = this.estado.equipos[0]
    let minDescansos = this.estado.descansosPorEquipo[equipoConMenosDescansos.id]

    for (const equipo of this.estado.equipos) {
      const descansos = this.estado.descansosPorEquipo[equipo.id]
      if (descansos < minDescansos) {
        minDescansos = descansos
        equipoConMenosDescansos = equipo
      }
    }

    return [equipoConMenosDescansos.id]
  }

  private generarEncuentros(equipos: EquipoWithRelations[], jornada: number): EncuentroPropuesto[] {
    const encuentros: EncuentroPropuesto[] = []
    const equiposUsados = new Set<number>()
    const fechaJornada = this.calcularFechaJornada(jornada)

    // Crear todas las combinaciones posibles
    const combinaciones = this.generarCombinaciones(equipos)
    
    // Filtrar combinaciones ya jugadas
    const combinacionesDisponibles = combinaciones.filter(combo => 
      !this.emparejamientoYaExiste(combo.equipo1.id, combo.equipo2.id)
    )

    // Ordenar por prioridad (nuevos emparejamientos primero)
    combinacionesDisponibles.sort((a, b) => {
      const prioridadA = this.calcularPrioridadEmparejamiento(a.equipo1.id, a.equipo2.id)
      const prioridadB = this.calcularPrioridadEmparejamiento(b.equipo1.id, b.equipo2.id)
      return prioridadB - prioridadA
    })

    // Seleccionar encuentros que maximicen las opciones futuras
    for (const combo of combinacionesDisponibles) {
      if (!equiposUsados.has(combo.equipo1.id) && !equiposUsados.has(combo.equipo2.id)) {
        const encuentro = this.crearEncuentroPropuesto(
          combo.equipo1.id,
          combo.equipo2.id,
          jornada,
          fechaJornada
        )
        encuentros.push(encuentro)
        equiposUsados.add(combo.equipo1.id)
        equiposUsados.add(combo.equipo2.id)
      }
    }

    return encuentros
  }

  private generarCombinaciones(equipos: EquipoWithRelations[]): Array<{equipo1: EquipoWithRelations, equipo2: EquipoWithRelations}> {
    const combinaciones: Array<{equipo1: EquipoWithRelations, equipo2: EquipoWithRelations}> = []
    
    for (let i = 0; i < equipos.length; i++) {
      for (let j = i + 1; j < equipos.length; j++) {
        combinaciones.push({
          equipo1: equipos[i],
          equipo2: equipos[j]
        })
      }
    }
    
    return combinaciones
  }

  private emparejamientoYaExiste(equipo1: number, equipo2: number): boolean {
    const emparejamiento = `${equipo1}-${equipo2}`
    const emparejamientoInverso = `${equipo2}-${equipo1}`
    
    return this.estado.emparejamientosExistentes.has(emparejamiento) ||
           this.estado.emparejamientosExistentes.has(emparejamientoInverso)
  }

  private calcularPrioridadEmparejamiento(equipo1: number, equipo2: number): number {
    // Buscar cuándo fue la última vez que se enfrentaron
    const ultimoEncuentro = this.estado.encuentrosJugados.find(encuentro => 
      (encuentro.equipo_local_id === equipo1 && encuentro.equipo_visitante_id === equipo2) ||
      (encuentro.equipo_local_id === equipo2 && encuentro.equipo_visitante_id === equipo1)
    )

    if (!ultimoEncuentro) {
      return 100 // Máxima prioridad para nuevos emparejamientos
    }

    // Calcular prioridad basada en cuánto tiempo hace que se enfrentaron
    const jornadasDesdeUltimoEncuentro = this.estado.ultimaJornada - (ultimoEncuentro.jornada || 0)
    return Math.max(0, 50 - jornadasDesdeUltimoEncuentro)
  }

  private crearEncuentroPropuesto(
    equipoLocal: number,
    equipoVisitante: number,
    jornada: number,
    fecha: Date
  ): EncuentroPropuesto {
    const cancha = this.seleccionarCancha()
    const arbitro = this.seleccionarArbitro()
    const esNuevoEmparejamiento = !this.emparejamientoYaExiste(equipoLocal, equipoVisitante)
    const prioridad = this.calcularPrioridadEmparejamiento(equipoLocal, equipoVisitante)

    return {
      equipoLocal,
      equipoVisitante,
      cancha,
      arbitro,
      fecha,
      esNuevoEmparejamiento,
      prioridad: prioridad > 80 ? 'alta' : prioridad > 40 ? 'media' : 'baja'
    }
  }

  private seleccionarCancha(): string {
    const canchas = this.options.canchas || ['Cancha Principal']
    return canchas[Math.floor(Math.random() * canchas.length)]
  }

  private seleccionarArbitro(): string {
    const arbitros = this.options.arbitros || ['Árbitro Principal']
    return arbitros[Math.floor(Math.random() * arbitros.length)]
  }

  private calcularFechaJornada(jornada: number): Date {
    const fechaBase = this.options.fechaInicio || new Date()
    const fechaJornada = new Date(fechaBase)
    fechaJornada.setDate(fechaBase.getDate() + (jornada - 1) * (this.options.diasEntreJornadas || 7))
    return fechaJornada
  }

  private crearJornadaPropuesta(
    numero: number,
    encuentros: EncuentroPropuesto[],
    equiposQueDescansan: number[]
  ): JornadaPropuesta {
    return {
      numero,
      encuentros,
      equiposQueDescansan,
      fecha: this.calcularFechaJornada(numero),
      canchas: this.options.canchas || ['Cancha Principal'],
      arbitros: this.options.arbitros || ['Árbitro Principal']
    }
  }

  private crearJornadaVacia(jornada: number): JornadaPropuesta {
    return {
      numero: jornada,
      encuentros: [],
      equiposQueDescansan: [],
      fecha: this.calcularFechaJornada(jornada),
      canchas: this.options.canchas || ['Cancha Principal'],
      arbitros: this.options.arbitros || ['Árbitro Principal']
    }
  }

  private calcularEstadisticas(jornada: JornadaPropuesta): EstadisticasJornada {
    const nuevosEmparejamientos = jornada.encuentros.filter(e => e.esNuevoEmparejamiento).length
    const emparejamientosRepetidos = jornada.encuentros.length - nuevosEmparejamientos
    
    const balanceDescansos = { ...this.estado.descansosPorEquipo }
    if (jornada.equipoQueDescansa) {
      balanceDescansos[jornada.equipoQueDescansa]++
    }

    // Calcular cuántas opciones quedan para próximas jornadas
    const proximasOpciones = this.calcularOpcionesFuturas()

    return {
      totalEncuentros: jornada.encuentros.length,
      nuevosEmparejamientos,
      emparejamientosRepetidos,
      equiposConDescanso: jornada.equipoQueDescansa ? 1 : 0,
      balanceDescansos,
      proximasOpciones
    }
  }

  private calcularEstadisticasVacia(): EstadisticasJornada {
    return {
      totalEncuentros: 0,
      nuevosEmparejamientos: 0,
      emparejamientosRepetidos: 0,
      equiposConDescanso: 0,
      balanceDescansos: this.estado.descansosPorEquipo,
      proximasOpciones: 0
    }
  }

  private calcularOpcionesFuturas(): number {
    // Calcular cuántas combinaciones de equipos quedan por jugar
    const totalCombinaciones = (this.estado.equipos.length * (this.estado.equipos.length - 1)) / 2
    const combinacionesJugadas = this.estado.emparejamientosExistentes.size / 2
    return totalCombinaciones - combinacionesJugadas
  }

  private validarJornadaPropuesta(jornada: JornadaPropuesta): ValidacionesJornada {
    const errores: string[] = []
    const advertencias: string[] = []
    const descansosConsecutivos: number[] = []
    const equiposDesbalanceados: number[] = []

    // Validar que todos los equipos estén en la jornada o descansando
    const equiposEnJornada = new Set<number>()
    jornada.encuentros.forEach(encuentro => {
      equiposEnJornada.add(encuentro.equipoLocal)
      equiposEnJornada.add(encuentro.equipoVisitante)
    })

    if (jornada.equipoQueDescansa) {
      equiposEnJornada.add(jornada.equipoQueDescansa)
    }

    const equiposFaltantes = this.estado.equipos.filter(e => !equiposEnJornada.has(e.id))
    if (equiposFaltantes.length > 0) {
      errores.push(`Equipos no incluidos en la jornada: ${equiposFaltantes.map(e => e.nombre).join(', ')}`)
    }

    // Validar que no hay equipos duplicados
    const equiposDuplicados = this.detectarEquiposDuplicados(jornada.encuentros)
    if (equiposDuplicados.length > 0) {
      errores.push(`Equipos duplicados en la jornada: ${equiposDuplicados.join(', ')}`)
    }

    return {
      esValida: errores.length === 0,
      errores,
      advertencias,
      descansosConsecutivos,
      equiposDesbalanceados
    }
  }

  private detectarEquiposDuplicados(encuentros: EncuentroPropuesto[]): number[] {
    const equiposUsados = new Set<number>()
    const duplicados: number[] = []

    encuentros.forEach(encuentro => {
      if (equiposUsados.has(encuentro.equipoLocal)) {
        duplicados.push(encuentro.equipoLocal)
      } else {
        equiposUsados.add(encuentro.equipoLocal)
      }

      if (equiposUsados.has(encuentro.equipoVisitante)) {
        duplicados.push(encuentro.equipoVisitante)
      } else {
        equiposUsados.add(encuentro.equipoVisitante)
      }
    })

    return duplicados
  }

  private generarAlternativas(jornada: number, equiposDescansoOriginal: number[]): JornadaPropuesta[] {
    const alternativas: JornadaPropuesta[] = []

    // Si hay número impar de equipos, probar con otros equipos descansando
    if (this.estado.equipos.length % 2 === 1) {
      const otrosEquipos = this.estado.equipos.filter(e => !equiposDescansoOriginal.includes(e.id))
      
      for (const equipo of otrosEquipos.slice(0, 2)) { // Máximo 2 alternativas
        const opcionesAlternativas = { ...this.options, forzarDescanso: [equipo.id] }
        const generadorAlternativo = new DynamicFixtureGenerator(
          this.estado.equipos,
          this.estado.encuentrosJugados,
          this.estado.descansosPorEquipo,
          opcionesAlternativas
        )
        
        const resultado = generadorAlternativo.generarPropuestaJornada(jornada)
        if (resultado.validaciones.esValida) {
          alternativas.push(resultado.jornada)
        }
      }
    }

    return alternativas
  }

  private obtenerDescansosJornadaAnterior(jornada: number): number[] {
    // Buscar en los descansos existentes
    const descansosExistentes = this.options.equiposDescansanExistentes || {}
    return descansosExistentes[jornada - 1] || []
  }

  /**
   * Confirma y guarda una jornada propuesta
   */
  public confirmarJornada(jornada: JornadaPropuesta): void {
    // Actualizar estado
    this.estado.jornadasGeneradas.push(jornada.numero)
    this.estado.ultimaJornada = Math.max(this.estado.ultimaJornada, jornada.numero)

    // Registrar nuevos emparejamientos
    jornada.encuentros.forEach(encuentro => {
      const emparejamiento = `${encuentro.equipoLocal}-${encuentro.equipoVisitante}`
      const emparejamientoInverso = `${encuentro.equipoVisitante}-${encuentro.equipoLocal}`
      this.estado.emparejamientosExistentes.add(emparejamiento)
      this.estado.emparejamientosExistentes.add(emparejamientoInverso)
    })

    // Actualizar descansos
    if (jornada.equipoQueDescansa) {
      this.estado.descansosPorEquipo[jornada.equipoQueDescansa]++
    }
  }

  /**
   * Obtiene el estado actual del torneo
   */
  public obtenerEstado(): EstadoTorneo {
    return { ...this.estado }
  }

  /**
   * Obtiene estadísticas del torneo
   */
  public obtenerEstadisticasTorneo() {
    const totalEncuentros = this.estado.encuentrosJugados.length
    const totalJornadas = this.estado.jornadasGeneradas.length
    const emparejamientosDisponibles = this.calcularOpcionesFuturas()
    const totalEmparejamientos = (this.estado.equipos.length * (this.estado.equipos.length - 1)) / 2
    const progreso = totalEmparejamientos > 0 ? ((totalEmparejamientos - emparejamientosDisponibles) / totalEmparejamientos) * 100 : 0

    return {
      totalEncuentros,
      totalJornadas,
      emparejamientosDisponibles,
      totalEmparejamientos,
      progreso: Math.round(progreso),
      balanceDescansos: this.estado.descansosPorEquipo
    }
  }
}

// ===== FUNCIONES DE UTILIDAD =====

/**
 * Crea un generador dinámico con el estado actual del torneo
 */
export function crearGeneradorDinamico(
  equipos: EquipoWithRelations[],
  encuentrosExistentes: EncuentroWithRelations[] = [],
  descansosExistentes: Record<number, number[]> = {},
  options: DynamicFixtureOptions = {}
): DynamicFixtureGenerator {
  return new DynamicFixtureGenerator(equipos, encuentrosExistentes, descansosExistentes, options)
}

/**
 * Valida si un conjunto de equipos puede generar un fixture válido
 */
export function validarEquiposParaFixtureDinamico(equipos: EquipoWithRelations[]): boolean {
  if (equipos.length < 2) return false
  if (equipos.length > 20) return false
  
  return equipos.every(equipo => equipo.id && equipo.id > 0)
}

/**
 * Calcula el número óptimo de jornadas para un torneo
 */
export function calcularJornadasOptimas(numEquipos: number, permiteRevancha: boolean = false): number {
  const jornadasIda = numEquipos - 1
  return permiteRevancha ? jornadasIda * 2 : jornadasIda
}
