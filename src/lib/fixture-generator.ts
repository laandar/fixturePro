import type { EquipoWithRelations, NewEncuentro } from '@/db/types';

export interface FixtureOptions {
  permiteRevancha?: boolean;
  fechaInicio?: Date;
  diasEntreJornadas?: number;
  canchas?: string[];
  arbitros?: string[];
  // Restricciones: equipos que no pueden jugar en ciertas jornadas (por ID)
  unavailableByJornada?: Record<number, number[]>;
}

export interface FixtureResult {
  encuentros: NewEncuentro[];
  equiposDescansan?: Record<number, number>; // jornada -> equipo_id que descansa
}

export class FixtureGenerator {
  private equipos: EquipoWithRelations[];
  private options: FixtureOptions;
  private equiposDescansan: Record<number, number> = {}; // jornada -> equipo_id que descansa

  constructor(equipos: EquipoWithRelations[], options: FixtureOptions = {}) {
    this.equipos = equipos;
    this.options = {
      permiteRevancha: false,
      fechaInicio: new Date(),
      diasEntreJornadas: 7,
      canchas: ['Cancha Principal', 'Cancha Secundaria'],
      arbitros: ['Árbitro 1', 'Árbitro 2', 'Árbitro 3'],
      ...options,
    };
  }

  /**
   * Genera el fixture completo usando algoritmo Round Robin
   */
  generateFixture(): FixtureResult {
    if (this.equipos.length < 2) {
      throw new Error('Se necesitan al menos 2 equipos para generar un fixture');
    }

    const encuentros: NewEncuentro[] = [];
    const equiposCopy = [...this.equipos];
    
    // Si el número de equipos es impar, agregar un equipo "BYE"
    if (equiposCopy.length % 2 !== 0) {
      equiposCopy.push({
        id: -1, // ID temporal para equipo BYE
        nombre: 'BYE',
        categoria_id: null,
        entrenador_id: null,
        imagen_equipo: null,
        estado: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        categoria: null,
        entrenador: null,
      });
    }

    const numEquipos = equiposCopy.length;
    const totalJornadasIda = numEquipos - 1;
    const partidosPorJornada = Math.floor(numEquipos / 2);

    // Generar ida
    for (let jornada = 1; jornada <= totalJornadasIda; jornada++) {
      const { scheduled, deferred } = this.generateJornada(equiposCopy, jornada);
      encuentros.push(...scheduled);
      if (deferred.length) {
        deferred.forEach((p) => this.pendingPairs.push(p));
      }
    }

    // Generar vuelta (si aplica), invirtiendo local/visitante y continuando numeración
    if (this.options.permiteRevancha) {
      for (let j = 1; j <= totalJornadasIda; j++) {
        const jornadaNumero = totalJornadasIda + j;
        const { scheduled, deferred } = this.generateJornada(equiposCopy, jornadaNumero, true);
        encuentros.push(...scheduled);
        if (deferred.length) {
          deferred.forEach((p) => this.pendingPairs.push(p));
        }
      }
    }

    // Si hay partidos diferidos por restricciones, reprogramarlos en jornadas extra al final
    if (this.pendingPairs.length > 0) {
      const startJornada = encuentros.reduce((max, e) => Math.max(max, e.jornada ?? 0), 0) + 1;
      const reprogramados = this.scheduleDeferredPairs(this.pendingPairs, startJornada, partidosPorJornada);
      encuentros.push(...reprogramados);
      // Limpiar diferidos
      this.pendingPairs = [];
    }

    return {
      encuentros,
      equiposDescansan: Object.keys(this.equiposDescansan).length > 0 ? this.equiposDescansan : undefined
    };
  }

  /**
   * Genera una jornada específica
   */
  private pendingPairs: { equipo_local_id: number; equipo_visitante_id: number }[] = [];

  private generateJornada(
    equipos: EquipoWithRelations[], 
    jornada: number, 
    esVuelta: boolean = false
  ): { scheduled: NewEncuentro[]; deferred: { equipo_local_id: number; equipo_visitante_id: number }[] } {
    const encuentros: NewEncuentro[] = [];
    const deferred: { equipo_local_id: number; equipo_visitante_id: number }[] = [];
    const numEquipos = equipos.length;
    const partidosPorJornada = Math.floor(numEquipos / 2);

    // Algoritmo Round Robin con rotación modular para mantener ciclos correctos
    const rotationBase = (jornada - 1) % (numEquipos - 1);
    const equiposRotados = this.rotateTeams(equipos, rotationBase);

    for (let i = 0; i < partidosPorJornada; i++) {
      const equipo1 = equiposRotados[i];
      const equipo2 = equiposRotados[numEquipos - 1 - i];

      // Si uno de los equipos es BYE, el otro equipo descansa
      if (equipo1.id === -1 || equipo2.id === -1) {
        const equipoQueDescansa = equipo1.id === -1 ? equipo2 : equipo1;
        // Solo guardar equipos reales que descansan (no el BYE)
        if (equipoQueDescansa.id !== -1) {
          this.equiposDescansan[jornada] = equipoQueDescansa.id;
        }
        continue;
      }

      // Determinar local y visitante
      let equipoLocal: EquipoWithRelations;
      let equipoVisitante: EquipoWithRelations;

      if (esVuelta) {
        // En la vuelta, invertir local/visitante
        equipoLocal = equipo2;
        equipoVisitante = equipo1;
      } else {
        // En la ida, mantener orden original
        equipoLocal = equipo1;
        equipoVisitante = equipo2;
      }

      // Verificar restricción de jornada
      const unavailable = this.options.unavailableByJornada?.[jornada] ?? [];
      const restricted = unavailable.includes(equipoLocal.id) || unavailable.includes(equipoVisitante.id);

      if (restricted) {
        // diferir emparejamiento para reprogramar al final
        deferred.push({
          equipo_local_id: equipoLocal.id,
          equipo_visitante_id: equipoVisitante.id,
        });
      } else {
        // Calcular fecha del encuentro
        const fechaEncuentro = new Date(this.options.fechaInicio!);
        fechaEncuentro.setDate(fechaEncuentro.getDate() + (jornada - 1) * this.options.diasEntreJornadas!);

        // Seleccionar cancha y árbitro de forma rotativa
        const canchaIndex = (jornada + i) % this.options.canchas!.length;
        const arbitroIndex = (jornada + i) % this.options.arbitros!.length;

        const encuentro: NewEncuentro = {
          torneo_id: 0, // Se debe establecer al crear el torneo
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
      }
    }

    return { scheduled: encuentros, deferred };
  }

  private scheduleDeferredPairs(
    pairs: { equipo_local_id: number; equipo_visitante_id: number }[],
    startJornada: number,
    partidosPorJornada: number
  ): NewEncuentro[] {
    const result: NewEncuentro[] = [];
    let jornada = startJornada;
    let index = 0;
    while (index < pairs.length) {
      const usadosEnJornada = new Set<number>();
      let partidosAsignados = 0;
      // Intentar llenar una jornada con tantos partidos como sea posible sin repetir equipos
      for (let i = index; i < pairs.length && partidosAsignados < partidosPorJornada; i++) {
        const p = pairs[i];
        if (usadosEnJornada.has(p.equipo_local_id) || usadosEnJornada.has(p.equipo_visitante_id)) {
          continue;
        }
        // Asignar este partido a la jornada actual
        usadosEnJornada.add(p.equipo_local_id);
        usadosEnJornada.add(p.equipo_visitante_id);

        const fechaEncuentro = new Date(this.options.fechaInicio!);
        fechaEncuentro.setDate(fechaEncuentro.getDate() + (jornada - 1) * this.options.diasEntreJornadas!);

        const canchaIndex = (jornada + partidosAsignados) % this.options.canchas!.length;
        const arbitroIndex = (jornada + partidosAsignados) % this.options.arbitros!.length;

        result.push({
          torneo_id: 0,
          equipo_local_id: p.equipo_local_id,
          equipo_visitante_id: p.equipo_visitante_id,
          fecha_programada: fechaEncuentro,
          cancha: this.options.canchas![canchaIndex],
          arbitro: this.options.arbitros![arbitroIndex],
          estado: 'programado',
          jornada: jornada,
          fase: 'regular',
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        // Marcar pair como utilizado moviéndolo al final de la ventana
        const tmp = pairs[index];
        pairs[index] = pairs[i];
        pairs[i] = tmp;
        index++;
        partidosAsignados++;
      }

      // Si no se pudo asignar ningún partido en esta jornada (por conflicto), forzar avance para evitar bucle
      if (partidosAsignados === 0) {
        jornada++;
        continue;
      }

      jornada++;
    }

    return result;
  }

  /**
   * Rota los equipos para generar diferentes emparejamientos
   */
  private rotateTeams(equipos: EquipoWithRelations[], rotation: number): EquipoWithRelations[] {
    const rotated = [...equipos];
    const numEquipos = equipos.length;

    // Mantener el primer equipo fijo y rotar el resto
    for (let i = 0; i < rotation; i++) {
      // Mover el segundo equipo al final
      const segundo = rotated[1];
      for (let j = 1; j < numEquipos - 1; j++) {
        rotated[j] = rotated[j + 1];
      }
      rotated[numEquipos - 1] = segundo;
    }

    return rotated;
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
      if (!equiposParticipantes.has(equipoId)) {
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

    return {
      isValid: errors.length === 0,
      errors,
    };
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
export function generateFixture(
  equipos: EquipoWithRelations[], 
  torneoId: number,
  options: FixtureOptions = {}
): FixtureResult {
  const generator = new FixtureGenerator(equipos, options);
  const result = generator.generateFixture();
  
  // Asignar el ID del torneo a todos los encuentros
  const encuentrosConTorneo = result.encuentros.map(encuentro => ({
    ...encuentro,
    torneo_id: torneoId,
  }));

  return {
    encuentros: encuentrosConTorneo,
    equiposDescansan: result.equiposDescansan
  };
}
