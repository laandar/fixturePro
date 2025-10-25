import type { EquipoWithRelations, NewEncuentro } from '@/db/types';

export interface FixtureOptions {
  permiteRevancha?: boolean;
  fechaInicio?: Date;
  diasEntreJornadas?: number;
  canchas?: string[];
  arbitros?: string[];
  unavailableByJornada?: Record<number, number[]>;
  jornadaInicial?: number;
  jornadaFinal?: number; // Nueva opción para generar hasta una jornada específica
  intercambiosInteligentes?: boolean;
  encuentrosExistentes?: NewEncuentro[]; // Nuevo: encuentros ya jugados para evitar repeticiones
}

export interface FixtureResult {
  encuentros: NewEncuentro[];
  equiposDescansan?: Record<number, number>;
}

export class FixtureGenerator {
  private equipos: EquipoWithRelations[];
  private options: FixtureOptions;
  private torneoId: number;
  private emparejamientosExistentes: Set<string>; // Nuevo: para rastrear emparejamientos ya jugados

  constructor(equipos: EquipoWithRelations[], options: FixtureOptions = {}, torneoId: number) {
    this.equipos = equipos;
    this.torneoId = torneoId;
    this.options = {
      permiteRevancha: false,
      fechaInicio: new Date(),
      diasEntreJornadas: 7,
      canchas: ['Cancha Principal', 'Cancha Secundaria'],
      arbitros: ['Árbitro 1', 'Árbitro 2', 'Árbitro 3'],
      ...options,
    };
    
    console.log(`FixtureGenerator constructor - Opciones recibidas:`, options);
    console.log(`FixtureGenerator constructor - Restricciones:`, options.unavailableByJornada);
    
    // Inicializar set de emparejamientos existentes
    this.emparejamientosExistentes = new Set();
    if (this.options.encuentrosExistentes) {
      this.options.encuentrosExistentes.forEach(encuentro => {
        const emparejamiento = `${encuentro.equipo_local_id}-${encuentro.equipo_visitante_id}`;
        const emparejamientoInverso = `${encuentro.equipo_visitante_id}-${encuentro.equipo_local_id}`;
        this.emparejamientosExistentes.add(emparejamiento);
        this.emparejamientosExistentes.add(emparejamientoInverso);
      });
    }
  }

  /**
   * Verifica si un emparejamiento ya existe
   */
  private emparejamientoYaExiste(equipo1: EquipoWithRelations, equipo2: EquipoWithRelations): boolean {
    const emparejamiento = `${equipo1.id}-${equipo2.id}`;
    const emparejamientoInverso = `${equipo2.id}-${equipo1.id}`;
    return this.emparejamientosExistentes.has(emparejamiento) || this.emparejamientosExistentes.has(emparejamientoInverso);
  }

  /**
   * Registra un nuevo emparejamiento como existente
   */
  private registrarEmparejamiento(equipo1: EquipoWithRelations, equipo2: EquipoWithRelations): void {
    const emparejamiento = `${equipo1.id}-${equipo2.id}`;
    const emparejamientoInverso = `${equipo2.id}-${equipo1.id}`;
    this.emparejamientosExistentes.add(emparejamiento);
    this.emparejamientosExistentes.add(emparejamientoInverso);
  }

  /**
   * Genera el fixture completo usando algoritmo Round Robin básico
   */
  async generateFixture(): Promise<FixtureResult> {
    if (this.equipos.length < 2) {
      throw new Error('Se necesitan al menos 2 equipos para generar un fixture');
    }

    const encuentros: NewEncuentro[] = [];
    const equiposCopy = [...this.equipos];
    const equiposDescansan: Record<number, number> = {};
    
    // Guardar el número original de equipos (sin BYE)
    const numEquiposOriginal = equiposCopy.length;
    const hayDescanso = numEquiposOriginal % 2 !== 0;
    
    console.log(`Número original de equipos: ${numEquiposOriginal}, hay descanso: ${hayDescanso}`);
    
    // Si el número de equipos es impar, agregar un equipo "BYE"
    if (hayDescanso) {
      equiposCopy.push({
        id: -1, // ID temporal para equipo BYE
        nombre: 'BYE',
        entrenador_id: null,
        imagen_equipo: null,
        estado: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        entrenador: null,
      });
    }

    const numEquipos = equiposCopy.length;
    const totalJornadasIda = numEquipos - 1;
    const partidosPorJornada = Math.floor(numEquipos / 2);
    const jornadaInicial = this.options.jornadaInicial || 1;
    const jornadaFinal = this.options.jornadaFinal || totalJornadasIda;

    // Generar ida
    for (let jornada = jornadaInicial; jornada <= jornadaFinal; jornada++) {
      const encuentrosJornada = this.generateJornada(equiposCopy, jornada, false);
      encuentros.push(...encuentrosJornada);
      
      // Registrar equipo que descansa (si hay número impar de equipos originales)
      if (hayDescanso) {
        // Pasar los equipos originales (sin BYE) al método getEquipoQueDescansa
        const equipoDescansa = this.getEquipoQueDescansa(this.equipos, jornada);
        console.log(`Jornada ${jornada}: Equipo que descansa:`, equipoDescansa?.nombre || 'ninguno');
        if (equipoDescansa && equipoDescansa.id !== -1) {
          equiposDescansan[jornada] = equipoDescansa.id;
          console.log(`Registrando descanso: jornada ${jornada} = equipo ${equipoDescansa.id} (${equipoDescansa.nombre})`);
        }
      }
    }

    // Generar vuelta (si aplica)
    if (this.options.permiteRevancha) {
      for (let j = 1; j <= totalJornadasIda; j++) {
        const jornadaNumero = totalJornadasIda + j;
        if (jornadaNumero >= jornadaInicial && jornadaNumero <= jornadaFinal) {
          const encuentrosJornada = this.generateJornada(equiposCopy, jornadaNumero, true);
          encuentros.push(...encuentrosJornada);
          
          // Registrar equipo que descansa en vuelta
          if (hayDescanso) {
            // Pasar los equipos originales (sin BYE) al método getEquipoQueDescansa
            const equipoDescansa = this.getEquipoQueDescansa(this.equipos, jornadaNumero);
            console.log(`Jornada ${jornadaNumero} (vuelta): Equipo que descansa:`, equipoDescansa?.nombre || 'ninguno');
            if (equipoDescansa && equipoDescansa.id !== -1) {
              equiposDescansan[jornadaNumero] = equipoDescansa.id;
              console.log(`Registrando descanso vuelta: jornada ${jornadaNumero} = equipo ${equipoDescansa.id} (${equipoDescansa.nombre})`);
            }
          }
        }
      }
    }

    // Debug: mostrar emparejamientos generados
    console.log('Fixture generado:', {
      totalEncuentros: encuentros.length,
      equiposDescansan,
      jornadas: [...new Set(encuentros.map(e => e.jornada))].sort((a, b) => (a || 0) - (b || 0)),
      emparejamientosExistentes: this.emparejamientosExistentes.size,
      emparejamientosExistentesList: Array.from(this.emparejamientosExistentes)
    });

    // Validar el fixture generado
    const validation = this.validateFixture(encuentros);
    if (!validation.isValid) {
      console.warn('Advertencias en el fixture:', validation.errors);
    }

    return {
      encuentros,
      equiposDescansan
    };
  }

  /**
   * Genera una jornada específica usando Round Robin mejorado
   */
  private generateJornada(
    equipos: EquipoWithRelations[], 
    jornada: number, 
    esVuelta: boolean = false
  ): NewEncuentro[] {
    const encuentros: NewEncuentro[] = [];
    const numEquipos = equipos.length;

    // Obtener equipos restringidos para esta jornada
    const equiposRestringidos = this.options.unavailableByJornada?.[jornada] || [];
    
    console.log(`Jornada ${jornada}: Generando jornada con ${numEquipos} equipos`);
    console.log(`Jornada ${jornada}: Equipos restringidos: [${equiposRestringidos.join(', ')}]`);
    
    // PASO 1: Generar emparejamientos normalmente (sin considerar restricciones)
    const emparejamientos = this.generatePairings(equipos, jornada);
    
    console.log(`Jornada ${jornada}: Generando emparejamientos con ${emparejamientos.length} pares`);
    
    // PASO 2: Si hay restricciones, intercambiar el equipo que descansa con el restringido
    if (equiposRestringidos.length > 0) {
      this.intercambiarDescansoConRestriccion(emparejamientos, equiposRestringidos, jornada);
    }
    
    for (let i = 0; i < emparejamientos.length; i++) {
      const [equipo1, equipo2] = emparejamientos[i];

      // Si uno de los equipos es BYE, saltar (este es el único que debe descansar)
      if (equipo1.id === -1 || equipo2.id === -1) {
        console.log(`Equipo descansa: ${equipo1.id === -1 ? equipo2.nombre : equipo1.nombre}`);
        continue;
      }

      // Determinar local y visitante según si es vuelta
      let equipoLocal: EquipoWithRelations;
      let equipoVisitante: EquipoWithRelations;
      
      if (esVuelta) {
        // En la vuelta, invertir local/visitante
        equipoLocal = equipo2;
        equipoVisitante = equipo1;
      } else {
        equipoLocal = equipo1;
        equipoVisitante = equipo2;
      }

      // Calcular fecha del encuentro
      const fechaEncuentro = new Date(this.options.fechaInicio!);
      fechaEncuentro.setDate(fechaEncuentro.getDate() + (jornada - 1) * this.options.diasEntreJornadas!);

      // Seleccionar cancha y árbitro de forma rotativa
      const canchaIndex = (jornada + i) % this.options.canchas!.length;
      const arbitroIndex = (jornada + i) % this.options.arbitros!.length;

      const encuentro: NewEncuentro = {
        torneo_id: this.torneoId,
        equipo_local_id: equipoLocal.id,
        equipo_visitante_id: equipoVisitante.id,
        fecha_programada: fechaEncuentro,
        cancha: this.options.canchas![canchaIndex],
        arbitro: this.options.arbitros![arbitroIndex],
        estado: 'programado',
        jornada: jornada,
        fase: 'regular',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      encuentros.push(encuentro);
      this.registrarEmparejamiento(equipoLocal, equipoVisitante);
    }

    console.log(`Jornada ${jornada}: Generados ${encuentros.length} encuentros de ${emparejamientos.length} emparejamientos posibles`);
    
    // Validar que solo haya 4 encuentros para 9 equipos (8 juegan, 1 descansa)
    const equiposReales = equipos.filter(e => e.id !== -1).length;
    const encuentrosEsperados = Math.floor(equiposReales / 2);
    
    if (encuentros.length !== encuentrosEsperados) {
      console.warn(`⚠️  Advertencia: Se esperaban ${encuentrosEsperados} encuentros, pero se generaron ${encuentros.length}`);
    }
    
    return encuentros;
  }

  /**
   * Intercambia el equipo que descansa con el equipo restringido
   */
  private intercambiarDescansoConRestriccion(
    emparejamientos: [EquipoWithRelations, EquipoWithRelations][], 
    equiposRestringidos: number[], 
    jornada: number
  ): void {
    console.log(`Intercambiando descanso con restricción para jornada ${jornada}`);
    
    // Encontrar el emparejamiento que contiene BYE (el equipo que descansa)
    let emparejamientoConBye: [EquipoWithRelations, EquipoWithRelations] | null = null;
    let indiceEmparejamientoConBye = -1;
    
    for (let i = 0; i < emparejamientos.length; i++) {
      const [equipo1, equipo2] = emparejamientos[i];
      if (equipo1.id === -1 || equipo2.id === -1) {
        emparejamientoConBye = emparejamientos[i];
        indiceEmparejamientoConBye = i;
        break;
      }
    }
    
    if (!emparejamientoConBye) {
      console.log(`No se encontró emparejamiento con BYE en jornada ${jornada}`);
      return;
    }
    
    // Obtener el equipo que debería descansar (el que no es BYE)
    const equipoQueDescansa = emparejamientoConBye[0].id === -1 ? emparejamientoConBye[1] : emparejamientoConBye[0];
    const equipoRestringido = this.equipos.find(e => equiposRestringidos.includes(e.id));
    
    if (!equipoRestringido) {
      console.log(`No se encontró equipo restringido en jornada ${jornada}`);
      return;
    }
    
    console.log(`Intercambiando: ${equipoQueDescansa.nombre} (que descansaba) ↔ ${equipoRestringido.nombre} (restringido)`);
    
    // Crear nuevo emparejamiento con el equipo restringido y BYE
    emparejamientos[indiceEmparejamientoConBye] = [equipoRestringido, {
      id: -1, // BYE
      nombre: 'BYE',
      entrenador_id: null,
      imagen_equipo: null,
      estado: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      entrenador: null,
    }];
    
    // Buscar un emparejamiento donde podamos insertar el equipo que antes descansaba
    // Reemplazar uno de los equipos en un emparejamiento existente
    for (let i = 0; i < emparejamientos.length; i++) {
      if (i === indiceEmparejamientoConBye) continue; // Saltar el emparejamiento con BYE
      
      const [equipo1, equipo2] = emparejamientos[i];
      
      // Si uno de los equipos en este emparejamiento es el equipo restringido, reemplazarlo
      if (equipo1.id === equipoRestringido.id) {
        emparejamientos[i] = [equipoQueDescansa, equipo2];
        console.log(`Reemplazado ${equipo1.nombre} con ${equipoQueDescansa.nombre} en emparejamiento ${i}`);
        break;
      } else if (equipo2.id === equipoRestringido.id) {
        emparejamientos[i] = [equipo1, equipoQueDescansa];
        console.log(`Reemplazado ${equipo2.nombre} con ${equipoQueDescansa.nombre} en emparejamiento ${i}`);
        break;
      }
    }
    
    console.log(`Emparejamientos después del intercambio:`, emparejamientos.map(([e1, e2]) => `${e1.nombre} vs ${e2.nombre}`));
  }

  /**
   * Genera emparejamientos para una jornada específica usando algoritmo Round Robin mejorado
   */
  private generatePairings(equipos: EquipoWithRelations[], jornada: number): [EquipoWithRelations, EquipoWithRelations][] {
    const numEquipos = equipos.length;
    const emparejamientos: [EquipoWithRelations, EquipoWithRelations][] = [];
    
    // Obtener equipos restringidos para esta jornada
    const equiposRestringidos = this.options.unavailableByJornada?.[jornada] || [];
    
    if (numEquipos % 2 === 0) {
      // Número par de equipos
      const mitad = numEquipos / 2;
      const equiposRotados = this.rotateTeams(equipos, jornada);
      
      for (let i = 0; i < mitad; i++) {
        emparejamientos.push([equiposRotados[i], equiposRotados[numEquipos - 1 - i]]);
      }
    } else {
      // Número impar de equipos - usar algoritmo específico
      const equiposConBye = [...equipos];
      if (equiposConBye.length % 2 !== 0) {
        equiposConBye.push({
          id: -1, // BYE
          nombre: 'BYE',
          entrenador_id: null,
          imagen_equipo: null,
          estado: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          entrenador: null,
        });
      }
      
      const numEquiposConBye = equiposConBye.length;
      const mitad = numEquiposConBye / 2;
      const equiposRotados = this.rotateTeams(equiposConBye, jornada);
      
      for (let i = 0; i < mitad; i++) {
        emparejamientos.push([equiposRotados[i], equiposRotados[numEquiposConBye - 1 - i]]);
      }
    }
    
    console.log(`generatePairings - Jornada ${jornada}: Generados ${emparejamientos.length} emparejamientos`);
    console.log(`generatePairings - Jornada ${jornada}: Equipos restringidos: [${equiposRestringidos.join(', ')}]`);
    
    return emparejamientos;
  }

  /**
   * Aplica restricciones sin afectar el algoritmo Round Robin original
   * NOTA: NO excluimos equipos restringidos aquí, solo los marcamos para descanso
   */
  private aplicarRestricciones(equipos: EquipoWithRelations[], jornada: number): EquipoWithRelations[] {
    // Obtener equipos no disponibles para esta jornada específica
    const equiposNoDisponibles = this.options.unavailableByJornada?.[jornada] || [];
    
    // Si no hay restricciones, devolver todos los equipos
    if (equiposNoDisponibles.length === 0) {
      return equipos;
    }
    
    console.log(`Aplicando restricciones para jornada ${jornada}:`, equiposNoDisponibles);
    console.log(`NO excluyendo equipos restringidos del Round Robin - se manejarán en getEquipoQueDescansa`);
    
    // IMPORTANTE: NO excluimos equipos restringidos aquí
    // Los equipos restringidos deben estar disponibles para el algoritmo Round Robin
    // pero se les asignará el descanso en getEquipoQueDescansa
    return equipos.filter(e => e.id !== -1); // Solo excluir BYE
  }

  /**
   * Rota los equipos usando algoritmo Round Robin mejorado
   */
  private rotateTeams(equipos: EquipoWithRelations[], jornada: number): EquipoWithRelations[] {
    const numEquipos = equipos.length;
    const rotated = [...equipos];
    
    // Algoritmo Round Robin mejorado
    if (jornada === 1) {
      return rotated; // Primera jornada: orden original
    }
    
    // Para jornadas posteriores, usar rotación específica
    const rotation = (jornada - 1) % (numEquipos - 1);
    
    // Mantener el primer equipo fijo y rotar el resto
    const primerEquipo = rotated[0];
    const restoEquipos = rotated.slice(1);
    
    // Rotar el resto de equipos de manera específica
    for (let i = 0; i < rotation; i++) {
      // Mover el segundo equipo al final
      const segundo = restoEquipos.shift()!;
      restoEquipos.push(segundo);
    }
    
    return [primerEquipo, ...restoEquipos];
  }

  /**
   * Valida que el fixture sea válido
   */
  validateFixture(encuentros: NewEncuentro[]): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const equiposIds = this.equipos.map(e => e.id);

    // Verificar que todos los equipos participen
    const equiposParticipantes = new Set<number>();
    encuentros.forEach(encuentro => {
      equiposParticipantes.add(encuentro.equipo_local_id);
      equiposParticipantes.add(encuentro.equipo_visitante_id);
    });

    equiposIds.forEach(equipoId => {
      if (equipoId !== -1 && !equiposParticipantes.has(equipoId)) {
        errors.push(`El equipo con ID ${equipoId} no participa en ningún encuentro`);
      }
    });

    // Verificar que no haya equipos jugando contra sí mismos
    encuentros.forEach(encuentro => {
      if (encuentro.equipo_local_id === encuentro.equipo_visitante_id) {
        errors.push(`El equipo ${encuentro.equipo_local_id} no puede jugar contra sí mismo`);
      }
    });

    // Verificar que no haya repeticiones de emparejamientos en la misma fase
    const emparejamientos = new Set<string>();
    encuentros.forEach(encuentro => {
      const emparejamiento = `${encuentro.equipo_local_id}-${encuentro.equipo_visitante_id}`;
      const emparejamientoInverso = `${encuentro.equipo_visitante_id}-${encuentro.equipo_local_id}`;
      
      if (emparejamientos.has(emparejamiento) || emparejamientos.has(emparejamientoInverso)) {
        errors.push(`Emparejamiento duplicado: ${encuentro.equipo_local_id} vs ${encuentro.equipo_visitante_id}`);
      }
      
      emparejamientos.add(emparejamiento);
    });

    // Verificar que no haya repeticiones con encuentros existentes
    if (this.emparejamientosExistentes.size > 0) {
      encuentros.forEach(encuentro => {
        const emparejamiento = `${encuentro.equipo_local_id}-${encuentro.equipo_visitante_id}`;
        const emparejamientoInverso = `${encuentro.equipo_visitante_id}-${encuentro.equipo_local_id}`;
        
        if (this.emparejamientosExistentes.has(emparejamiento) || this.emparejamientosExistentes.has(emparejamientoInverso)) {
          errors.push(`Emparejamiento duplicado con encuentro existente: ${encuentro.equipo_local_id} vs ${encuentro.equipo_visitante_id}`);
        }
      });
    }

    // Verificar distribución equilibrada de partidos
    const partidosPorEquipo = new Map<number, number>();
    equiposIds.forEach(id => {
      if (id !== -1) partidosPorEquipo.set(id, 0);
    });

    encuentros.forEach(encuentro => {
      partidosPorEquipo.set(encuentro.equipo_local_id, (partidosPorEquipo.get(encuentro.equipo_local_id) || 0) + 1);
      partidosPorEquipo.set(encuentro.equipo_visitante_id, (partidosPorEquipo.get(encuentro.equipo_visitante_id) || 0) + 1);
    });

    const valores = Array.from(partidosPorEquipo.values());
    const min = Math.min(...valores);
    const max = Math.max(...valores);
    
    if (max - min > 1) {
      errors.push(`Distribución desigual de partidos: algunos equipos juegan ${max} partidos mientras otros juegan ${min}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Obtiene el equipo que descansa en una jornada específica
   */
  private getEquipoQueDescansa(equipos: EquipoWithRelations[], jornada: number): EquipoWithRelations | null {
    console.log(`=== getEquipoQueDescansa llamado para jornada ${jornada} ===`);
    const numEquipos = equipos.length;
    const equiposReales = equipos.filter(e => e.id !== -1); // Excluir BYE
    const numEquiposReales = equiposReales.length;
    
    console.log(`getEquipoQueDescansa - Total equipos: ${numEquipos}, Equipos reales: ${numEquiposReales}`);
    
    if (numEquiposReales % 2 === 0) {
      console.log(`No hay descanso - número par de equipos reales (${numEquiposReales})`);
      return null; // No hay descanso si hay número par de equipos reales
    }
    
    // Obtener equipos restringidos para esta jornada
    const equiposRestringidos = this.options.unavailableByJornada?.[jornada] || [];
    console.log(`getEquipoQueDescansa - Opciones completas:`, this.options.unavailableByJornada)
    console.log(`getEquipoQueDescansa - Restricciones para jornada ${jornada}:`, equiposRestringidos)
    
    // Crear una copia de equipos con BYE incluido para el algoritmo Round Robin
    const equiposConBye = [...equipos];
    if (equiposConBye.length % 2 !== 0) {
      equiposConBye.push({
        id: -1, // BYE
        nombre: 'BYE',
        entrenador_id: null,
        imagen_equipo: null,
        estado: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        entrenador: null,
      });
    }
    // En el algoritmo Round Robin, el equipo que descansa es el que está en la posición central
    const posicionDescanso = Math.floor(equiposConBye.length / 2);
    const equiposRotados = this.rotateTeams(equiposConBye, jornada);
    
    console.log(`Jornada ${jornada}: Posición descanso: ${posicionDescanso}`);
    console.log(`Jornada ${jornada}: Equipos rotados:`, equiposRotados.map(e => `${e.nombre}(${e.id})`));
    
    const equipoQueDeberiaDescansar = equiposRotados[posicionDescanso];
    
    console.log(`Jornada ${jornada}: Equipo que debería descansar según Round Robin: ${equipoQueDeberiaDescansar.nombre}`);
    console.log(`Jornada ${jornada}: Equipos restringidos: [${equiposRestringidos.join(', ')}]`);
    
    // PRIORIDAD 1: Si hay equipos restringidos, UNO DE ELLOS DEBE DESCANSAR
    if (equiposRestringidos.length > 0) {
      const equiposRestringidosDisponibles = equipos.filter(e => equiposRestringidos.includes(e.id));
      if (equiposRestringidosDisponibles.length > 0) {
        // Usar rotación para distribuir equitativamente los descansos entre equipos restringidos
        const indiceEquipoRestringido = (jornada - 1) % equiposRestringidosDisponibles.length;
        const equipoRestringido = equiposRestringidosDisponibles[indiceEquipoRestringido];
        console.log(`Jornada ${jornada}: ${equipoRestringido.nombre} descansa (FORZADO por restricción, índice ${indiceEquipoRestringido}), ${equipoQueDeberiaDescansar.nombre} juega`);
        return equipoRestringido;
      }
    }
    
    // PRIORIDAD 2: Si no hay restricciones, usar el equipo normal del algoritmo Round Robin
    console.log(`Jornada ${jornada}: ${equipoQueDeberiaDescansar.nombre} descansa (normal - sin restricciones)`);
    return equipoQueDeberiaDescansar;
  }

  /**
   * Genera estadísticas del fixture
   */
  getFixtureStats(encuentros: NewEncuentro[]): {
    totalEncuentros: number;
    totalJornadas: number;
    equiposParticipantes: number;
    fechaInicio: Date;
    fechaFin: Date;
  } {
    const jornadas = new Set(encuentros.map(e => e.jornada));
    const fechas = encuentros.map(e => e.fecha_programada).filter(f => f !== null) as Date[];
    
    return {
      totalEncuentros: encuentros.length,
      totalJornadas: jornadas.size,
      equiposParticipantes: this.equipos.length,
      fechaInicio: fechas.length > 0 ? new Date(Math.min(...fechas.map(f => f.getTime()))) : new Date(),
      fechaFin: fechas.length > 0 ? new Date(Math.max(...fechas.map(f => f.getTime()))) : new Date(),
    };
  }
}

/**
 * Función de utilidad para generar fixture con opciones por defecto
 */
export async function generateFixture(
  equipos: EquipoWithRelations[], 
  torneoId: number,
  options: FixtureOptions = {}
): Promise<FixtureResult> {
  const generator = new FixtureGenerator(equipos, options, torneoId);
  return await generator.generateFixture();
}