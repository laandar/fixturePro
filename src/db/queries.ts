import { db } from './index'
import { eq, asc, count, and, desc, inArray, or } from 'drizzle-orm'
import { equipos, categorias, entrenadores, jugadores, torneos, equiposTorneo, encuentros, canchas, canchasCategorias, equiposDescansan, goles, equipoCategoria, jugadorEquipoCategoria, temporadas } from './schema'
import type { NewEquipo, NewCategoria, NewEntrenador, NewJugador, NewTorneo, NewEquipoTorneo, NewEncuentro, NewCancha, NewTemporada } from './types'

// ===== EQUIPOS =====
export const equipoQueries = {
  // Obtener todos los equipos
  getAll: async () => {
    return await db.select().from(equipos).orderBy(asc(equipos.nombre));
  },

  // Obtener equipos con relaciones (categorías y entrenador)
  getAllWithRelations: async () => {
    return await db.query.equipos.findMany({
      with: {
        equiposCategoria: {
          with: {
            categoria: true,
          },
        },
        entrenador: true,
      },
      orderBy: [asc(equipos.nombre)],
    });
  },

  // Obtener equipo por ID
  getById: async (id: number) => {
    const result = await db.select().from(equipos).where(eq(equipos.id, id));
    return result[0];
  },

  // Obtener equipo por ID con relaciones
  getByIdWithRelations: async (id: number) => {
    return await db.query.equipos.findFirst({
      where: eq(equipos.id, id),
      with: {
        equiposCategoria: {
          with: {
            categoria: true,
          },
        },
        entrenador: true,
      },
    });
  },

  // Obtener equipos por categoría con relaciones (solo activos)
  getByCategoriaWithRelations: async (categoriaId: number) => {
    return await db.query.equipos.findMany({
      where: (equipos, { exists, and: andWhere, eq: eqWhere }) => andWhere(
        eqWhere(equipos.estado, true),
        exists(
          db.select().from(equipoCategoria).where(
            and(
              eq(equipoCategoria.equipo_id, equipos.id),
              eq(equipoCategoria.categoria_id, categoriaId)
            )
          )
        )
      ),
      with: {
        equiposCategoria: {
          with: {
            categoria: true,
          },
        },
        entrenador: true,
      },
      orderBy: [asc(equipos.nombre)],
    });
  },

  // Obtener contador de equipos (optimizado)
  getCount: async () => {
    const result = await db.select({ count: count() }).from(equipos);
    return result[0]?.count || 0;
  },

  // Crear equipo
  create: async (equipoData: NewEquipo) => {
    const result = await db.insert(equipos).values(equipoData).returning();
    return result[0];
  },

  // Actualizar equipo
  update: async (id: number, equipoData: Partial<NewEquipo>) => {
    const result = await db
      .update(equipos)
      .set({ ...equipoData, updatedAt: new Date() })
      .where(eq(equipos.id, id))
      .returning();
    return result[0];
  },

  // Actualizar equipo con categorías
  updateWithCategorias: async (id: number, equipoData: Partial<NewEquipo>, categoriaIds?: number[]) => {
    // Actualizar datos del equipo
    const result = await db
      .update(equipos)
      .set({ ...equipoData, updatedAt: new Date() })
      .where(eq(equipos.id, id))
      .returning();

    // Si se proporcionan categorías, actualizar las relaciones
    if (categoriaIds !== undefined) {
      await equipoCategoriaQueries.actualizarCategoriasDeEquipo(id, categoriaIds);
    }

    return result[0];
  },

  // Verificar dependencias de un equipo antes de eliminar
  checkDependencies: async (id: number) => {
    const dependencias: string[] = [];
    
    // Verificar si el equipo está en algún torneo
    const equiposTorneoResult = await db
      .select({ count: count() })
      .from(equiposTorneo)
      .where(eq(equiposTorneo.equipo_id, id));
    // Convertir a número explícitamente (count puede devolver bigint o string)
    const countTorneos = Number(equiposTorneoResult[0]?.count || 0);
    
    console.log(`[checkDependencies] Equipo ${id} - Torneos: ${countTorneos} (tipo: ${typeof countTorneos})`);
    
    if (countTorneos > 0) {
      dependencias.push('torneos');
    }
    
    // Verificar si el equipo tiene encuentros como local o visitante
    const encuentrosLocal = await db
      .select({ count: count() })
      .from(encuentros)
      .where(eq(encuentros.equipo_local_id, id));
    const encuentrosVisitante = await db
      .select({ count: count() })
      .from(encuentros)
      .where(eq(encuentros.equipo_visitante_id, id));
    
    const countLocal = Number(encuentrosLocal[0]?.count || 0);
    const countVisitante = Number(encuentrosVisitante[0]?.count || 0);
    
    console.log(`[checkDependencies] Equipo ${id} - Encuentros local: ${countLocal}, visitante: ${countVisitante}`);
    
    if (countLocal > 0 || countVisitante > 0) {
      dependencias.push('encuentros');
    }
    
    // Verificar si el equipo tiene registros en equiposDescansan
    const equiposDescansanCount = await db
      .select({ count: count() })
      .from(equiposDescansan)
      .where(eq(equiposDescansan.equipo_id, id));
    const countDescansos = Number(equiposDescansanCount[0]?.count || 0);
    
    console.log(`[checkDependencies] Equipo ${id} - Descansos: ${countDescansos}`);
    
    if (countDescansos > 0) {
      dependencias.push('descansos');
    }
    
    console.log(`[checkDependencies] Equipo ${id} - Dependencias encontradas:`, dependencias);
    
    return {
      tieneDependencias: dependencias.length > 0,
      dependencias
    };
  },

  // Eliminar equipo
  delete: async (id: number) => {
    // Primero eliminar las relaciones con categorías
    await db.delete(equipoCategoria).where(eq(equipoCategoria.equipo_id, id));
    
    // Luego eliminar el equipo
    return await db.delete(equipos).where(eq(equipos.id, id));
  },
};

// ===== EQUIPO_CATEGORIA =====
export const equipoCategoriaQueries = {
  // Asignar equipo a categoría
  asignarEquipoACategoria: async (equipoId: number, categoriaId: number) => {
    return await db.insert(equipoCategoria).values({
      equipo_id: equipoId,
      categoria_id: categoriaId
    }).returning();
  },

  // Remover equipo de categoría
  removerEquipoDeCategoria: async (equipoId: number, categoriaId: number) => {
    return await db.delete(equipoCategoria)
      .where(and(
        eq(equipoCategoria.equipo_id, equipoId),
        eq(equipoCategoria.categoria_id, categoriaId)
      ));
  },

  // Obtener categorías de un equipo
  getCategoriasDeEquipo: async (equipoId: number) => {
    return await db.query.equipoCategoria.findMany({
      where: eq(equipoCategoria.equipo_id, equipoId),
      with: {
        categoria: true
      }
    });
  },

  // Obtener equipos de una categoría
  getEquiposDeCategoria: async (categoriaId: number) => {
    return await db.query.equipoCategoria.findMany({
      where: eq(equipoCategoria.categoria_id, categoriaId),
      with: {
        equipo: {
          with: {
            entrenador: true
          }
        }
      }
    });
  },

  // Crear equipo con categorías
  crearEquipoConCategorias: async (equipoData: NewEquipo, categoriaIds: number[]) => {
    // Crear el equipo
    const nuevoEquipo = await db.insert(equipos).values(equipoData).returning();
    
    // Asignar categorías si se proporcionan
    if (categoriaIds.length > 0) {
      const relacionesData = categoriaIds.map(categoriaId => ({
        equipo_id: nuevoEquipo[0].id,
        categoria_id: categoriaId
      }));
      
      await db.insert(equipoCategoria).values(relacionesData);
    }
    
    return nuevoEquipo[0];
  },

  // Obtener jugadores afectados por eliminación de categorías
  getJugadoresAfectadosPorEliminacionCategoria: async (equipoId: number, categoriaIdsAEliminar: number[]) => {
    if (categoriaIdsAEliminar.length === 0) {
      return [];
    }

    // Obtener los equipo_categoria_id que se van a eliminar
    const equipoCategoriasAEliminar = await db
      .select({ 
        id: equipoCategoria.id,
        categoria_id: equipoCategoria.categoria_id 
      })
      .from(equipoCategoria)
      .where(
        and(
          eq(equipoCategoria.equipo_id, equipoId),
          inArray(equipoCategoria.categoria_id, categoriaIdsAEliminar)
        )
      );

    if (equipoCategoriasAEliminar.length === 0) {
      return [];
    }

    const equipoCategoriaIds = equipoCategoriasAEliminar.map(ec => ec.id);

    // Obtener todas las relaciones de jugador_equipo_categoria que se verán afectadas
    const relacionesAfectadas = await db
      .select({
        id: jugadorEquipoCategoria.id,
        jugador_id: jugadorEquipoCategoria.jugador_id,
        equipo_categoria_id: jugadorEquipoCategoria.equipo_categoria_id,
        numero_jugador: jugadorEquipoCategoria.numero_jugador,
        categoria_id: equipoCategoria.categoria_id,
      })
      .from(jugadorEquipoCategoria)
      .innerJoin(
        equipoCategoria,
        eq(jugadorEquipoCategoria.equipo_categoria_id, equipoCategoria.id)
      )
      .where(inArray(jugadorEquipoCategoria.equipo_categoria_id, equipoCategoriaIds));

    // Obtener información de los jugadores
    const jugadoresInfo = [];
    for (const relacion of relacionesAfectadas) {
      // Buscar jugador por ID o cédula (puede estar guardado de ambas formas)
      const jugadorPorId = await db
        .select()
        .from(jugadores)
        .where(eq(jugadores.id, relacion.jugador_id))
        .limit(1);

      let jugador = jugadorPorId[0];
      
      // Si no se encuentra por ID, buscar por cédula
      if (!jugador) {
        const jugadorPorCedula = await db
          .select()
          .from(jugadores)
          .where(eq(jugadores.cedula, relacion.jugador_id))
          .limit(1);
        jugador = jugadorPorCedula[0];
      }

      if (jugador) {
        jugadoresInfo.push({
          relacionId: relacion.id,
          jugadorId: jugador.id,
          jugadorCedula: jugador.cedula,
          jugadorNombre: jugador.apellido_nombre,
          equipoCategoriaId: relacion.equipo_categoria_id,
          categoriaId: relacion.categoria_id,
          numeroJugador: relacion.numero_jugador,
        });
      }
    }

    return jugadoresInfo;
  },

  // Migrar jugadores manualmente a nuevas categorías
  migrarJugadoresACategoria: async (
    equipoId: number,
    migraciones: Array<{ relacionId: number; nuevaCategoriaId: number }>
  ) => {
    for (const migracion of migraciones) {
      // Obtener la relación actual
      const relacionActual = await db
        .select()
        .from(jugadorEquipoCategoria)
        .where(eq(jugadorEquipoCategoria.id, migracion.relacionId))
        .limit(1);

      if (relacionActual.length === 0) {
        continue; // La relación ya no existe, saltar
      }

      const relacion = relacionActual[0];

      // Buscar o crear el nuevo equipo_categoria
      let nuevoEquipoCategoriaId: number;
      const equipoCategoriaExistente = await db
        .select({ id: equipoCategoria.id })
        .from(equipoCategoria)
        .where(
          and(
            eq(equipoCategoria.equipo_id, equipoId),
            eq(equipoCategoria.categoria_id, migracion.nuevaCategoriaId)
          )
        )
        .limit(1);

      if (equipoCategoriaExistente.length > 0) {
        nuevoEquipoCategoriaId = equipoCategoriaExistente[0].id;
      } else {
        // Crear el nuevo equipo_categoria
        const [nuevoEquipoCategoria] = await db
          .insert(equipoCategoria)
          .values({
            equipo_id: equipoId,
            categoria_id: migracion.nuevaCategoriaId
          })
          .returning();
        nuevoEquipoCategoriaId = nuevoEquipoCategoria.id;
      }

      // Verificar si ya existe una relación con el mismo jugador_id y nuevo equipo_categoria_id
      const relacionExistente = await db
        .select()
        .from(jugadorEquipoCategoria)
        .where(
          and(
            eq(jugadorEquipoCategoria.jugador_id, relacion.jugador_id),
            eq(jugadorEquipoCategoria.equipo_categoria_id, nuevoEquipoCategoriaId)
          )
        )
        .limit(1);

      if (relacionExistente.length === 0) {
        // No existe, crear nueva relación
        await db.insert(jugadorEquipoCategoria).values({
          jugador_id: relacion.jugador_id,
          equipo_categoria_id: nuevoEquipoCategoriaId,
          numero_jugador: relacion.numero_jugador
        });
      } else {
        // Ya existe, actualizar el numero_jugador
        await db
          .update(jugadorEquipoCategoria)
          .set({ numero_jugador: relacion.numero_jugador })
          .where(
            and(
              eq(jugadorEquipoCategoria.jugador_id, relacion.jugador_id),
              eq(jugadorEquipoCategoria.equipo_categoria_id, nuevoEquipoCategoriaId)
            )
          );
      }

      // Eliminar la relación antigua
      await db
        .delete(jugadorEquipoCategoria)
        .where(eq(jugadorEquipoCategoria.id, migracion.relacionId));
    }
  },

  // Actualizar categorías de un equipo
  actualizarCategoriasDeEquipo: async (equipoId: number, categoriaIds: number[]) => {
    // 1️⃣ Obtener las categorías actuales con sus IDs de equipo_categoria
    const categoriasActuales = await db
      .select({ 
        id: equipoCategoria.id,
        categoria_id: equipoCategoria.categoria_id 
      })
      .from(equipoCategoria)
      .where(eq(equipoCategoria.equipo_id, equipoId));

    const actualesIds = categoriasActuales.map(c => c.categoria_id);

    // 2️⃣ Calcular diferencias
    const categoriasAInsertar = categoriaIds.filter(
      id => !actualesIds.includes(id)
    );

    const categoriasAEliminar = actualesIds.filter(
      id => !categoriaIds.includes(id)
    );

    // 3️⃣ Verificar si hay jugadores afectados antes de eliminar categorías
    if (categoriasAEliminar.length > 0) {
      // Primero obtener los equipo_categoria_id que se van a eliminar
      const equipoCategoriasAEliminar = await db
        .select({ id: equipoCategoria.id })
        .from(equipoCategoria)
        .where(
          and(
            eq(equipoCategoria.equipo_id, equipoId),
            inArray(equipoCategoria.categoria_id, categoriasAEliminar)
          )
        );

      const equipoCategoriaIdsAEliminar = equipoCategoriasAEliminar.map(ec => ec.id);

      // Verificar directamente si hay relaciones de jugador_equipo_categoria para estos equipo_categoria_id
      // Esta es la verificación más importante: si no hay relaciones, no hay jugadores afectados
      const relacionesExistentes = equipoCategoriaIdsAEliminar.length > 0
        ? await db
            .select({ id: jugadorEquipoCategoria.id })
            .from(jugadorEquipoCategoria)
            .where(inArray(jugadorEquipoCategoria.equipo_categoria_id, equipoCategoriaIdsAEliminar))
        : [];

      // Si no hay relaciones existentes, significa que ya fueron migradas o nunca existieron
      if (relacionesExistentes.length === 0) {
        // Los jugadores ya fueron migrados o no hay jugadores afectados, continuar sin error
      } else {
        // Hay relaciones existentes, obtener información detallada de los jugadores afectados
        const jugadoresAfectados = await equipoCategoriaQueries.getJugadoresAfectadosPorEliminacionCategoria(
          equipoId,
          categoriasAEliminar
        );

        // Obtener información del equipo
        const equipo = await db
          .select()
          .from(equipos)
          .where(eq(equipos.id, equipoId))
          .limit(1);

        // Obtener información de las categorías que se están eliminando
        const categoriasInfo = await db
          .select({
            id: categorias.id,
            nombre: categorias.nombre
          })
          .from(categorias)
          .where(inArray(categorias.id, categoriasAEliminar));

        // Solo lanzar error si realmente hay jugadores afectados
        if (jugadoresAfectados.length > 0) {
          // Crear objeto de error con información detallada
          const errorData = {
            equipoId,
            equipoNombre: equipo[0]?.nombre || 'Equipo desconocido',
            categoriasAEliminar: categoriasInfo.map(c => ({
              id: c.id,
              nombre: c.nombre
            })),
            totalJugadoresAfectados: jugadoresAfectados.length,
            relacionesExistentes: relacionesExistentes.length,
            jugadoresAfectados,
            timestamp: new Date().toISOString(),
            contexto: 'actualizarCategoriasDeEquipo'
          };

          // Lanzar error especial que el frontend puede capturar
          throw new Error(`JUGADORES_AFECTADOS:${JSON.stringify(errorData)}`);
        }
      }
    }

    // 4️⃣ Eliminar los equipo_categoria que ya no existen (solo si no hay jugadores afectados)
    if (categoriasAEliminar.length > 0) {
      await db
        .delete(equipoCategoria)
        .where(
          and(
            eq(equipoCategoria.equipo_id, equipoId),
            inArray(equipoCategoria.categoria_id, categoriasAEliminar)
          )
        );
    }

    // 5️⃣ Insertar solo las nuevas categorías
    if (categoriasAInsertar.length > 0) {
      // Verificar cuáles no existen ya (por si se crearon durante la migración)
      const equipoCategoriasExistentes = await db
        .select({ categoria_id: equipoCategoria.categoria_id })
        .from(equipoCategoria)
        .where(eq(equipoCategoria.equipo_id, equipoId));

      const categoriasExistentesIds = equipoCategoriasExistentes.map(ec => ec.categoria_id);
      const categoriasAInsertarFinales = categoriasAInsertar.filter(
        id => !categoriasExistentesIds.includes(id)
      );

      if (categoriasAInsertarFinales.length > 0) {
        const data = categoriasAInsertarFinales.map(categoriaId => ({
          equipo_id: equipoId,
          categoria_id: categoriaId
        }));

        await db.insert(equipoCategoria).values(data);
      }
    }
  }
};

// ===== CATEGORÍAS =====
export const categoriaQueries = {
  // Obtener todas las categorías
  getAll: async () => {
    return await db.select().from(categorias).orderBy(asc(categorias.nombre));
  },

  // Obtener categoría por ID
  getById: async (id: number) => {
    const result = await db.select().from(categorias).where(eq(categorias.id, id));
    return result[0];
  },

  // Crear categoría
  create: async (categoriaData: NewCategoria) => {
    const result = await db.insert(categorias).values(categoriaData).returning();
    return result[0];
  },

  // Actualizar categoría
  update: async (id: number, categoriaData: Partial<NewCategoria>) => {
    const result = await db
      .update(categorias)
      .set({ ...categoriaData, updatedAt: new Date() })
      .where(eq(categorias.id, id))
      .returning();
    return result[0];
  },

  // Eliminar categoría
  delete: async (id: number) => {
    return await db.delete(categorias).where(eq(categorias.id, id));
  },
};

// ===== ENTRENADORES =====
export const entrenadorQueries = {
  // Obtener todos los entrenadores
  getAll: async () => {
    return await db.select().from(entrenadores).orderBy(asc(entrenadores.nombre));
  },

  // Obtener entrenador por ID
  getById: async (id: number) => {
    const result = await db.select().from(entrenadores).where(eq(entrenadores.id, id));
    return result[0];
  },

  // Crear entrenador
  create: async (entrenadorData: NewEntrenador) => {
    const result = await db.insert(entrenadores).values(entrenadorData).returning();
    return result[0];
  },

  // Actualizar entrenador
  update: async (id: number, entrenadorData: Partial<NewEntrenador>) => {
    const result = await db
      .update(entrenadores)
      .set({ ...entrenadorData, updatedAt: new Date() })
      .where(eq(entrenadores.id, id))
      .returning();
    return result[0];
  },

  // Eliminar entrenador
  delete: async (id: number) => {
    return await db.delete(entrenadores).where(eq(entrenadores.id, id));
  },
};

// ===== JUGADORES =====
export const jugadorQueries = {
  // Obtener todos los jugadores
  getAll: async () => {
    return await db.select().from(jugadores).orderBy(asc(jugadores.apellido_nombre));
  },

  // Obtener jugadores con relaciones
  // Retorna un registro por cada relación en jugador_equipo_categoria
  // Si un jugador tiene 2 relaciones, aparecerá 2 veces en la lista
  // Si un jugador no tiene relaciones, aparecerá una vez con jugadoresEquipoCategoria vacío
  getAllWithRelations: async () => {
    // Obtener todos los jugadores
    const todosLosJugadores = await db.select().from(jugadores).orderBy(asc(jugadores.apellido_nombre));
    
    // Obtener todas las relaciones jugador_equipo_categoria con sus relaciones anidadas
    const todasLasRelaciones = await db
      .select({
        jugadorEquipoCategoria: jugadorEquipoCategoria,
        equipoCategoria: equipoCategoria,
        equipo: equipos,
        categoria: categorias,
      })
      .from(jugadorEquipoCategoria)
      .leftJoin(
        equipoCategoria,
        eq(jugadorEquipoCategoria.equipo_categoria_id, equipoCategoria.id)
      )
      .leftJoin(
        equipos,
        eq(equipoCategoria.equipo_id, equipos.id)
      )
      .leftJoin(
        categorias,
        eq(equipoCategoria.categoria_id, categorias.id)
      );

    // Crear un mapa de cédulas a relaciones para acceso rápido
    const relacionesPorCedula = new Map<string, any[]>();
    for (const rel of todasLasRelaciones) {
      const cedula = rel.jugadorEquipoCategoria.jugador_id;
      if (!relacionesPorCedula.has(cedula)) {
        relacionesPorCedula.set(cedula, []);
      }
      relacionesPorCedula.get(cedula)!.push({
        id: rel.jugadorEquipoCategoria.id,
        jugador_id: rel.jugadorEquipoCategoria.jugador_id,
        equipo_categoria_id: rel.jugadorEquipoCategoria.equipo_categoria_id,
        numero_jugador: rel.jugadorEquipoCategoria.numero_jugador,
        situacion_jugador: rel.jugadorEquipoCategoria.situacion_jugador,
        createdAt: rel.jugadorEquipoCategoria.createdAt,
        updatedAt: rel.jugadorEquipoCategoria.updatedAt,
        equipoCategoria: rel.equipoCategoria ? {
          id: rel.equipoCategoria.id,
          equipo_id: rel.equipoCategoria.equipo_id,
          categoria_id: rel.equipoCategoria.categoria_id,
          createdAt: rel.equipoCategoria.createdAt,
          updatedAt: rel.equipoCategoria.updatedAt,
          equipo: rel.equipo,
          categoria: rel.categoria,
        } : null,
      });
    }

    // Construir el resultado: un registro por cada relación, o uno con array vacío si no tiene relaciones
    const resultados: any[] = [];
    
    for (const jugador of todosLosJugadores) {
      const relacionesDelJugador = relacionesPorCedula.get(jugador.cedula) || [];
      
      if (relacionesDelJugador.length > 0) {
        // Si tiene relaciones, crear un registro por cada relación
        for (const relacion of relacionesDelJugador) {
          resultados.push({
            ...jugador,
            jugadoresEquipoCategoria: [relacion],
          });
        }
      } else {
        // Si no tiene relaciones, crear un registro con array vacío
        resultados.push({
          ...jugador,
          jugadoresEquipoCategoria: [],
        });
      }
    }

    return resultados;
  },

  // Obtener solo jugadores activos con relaciones (para gestión de encuentros)
  getActiveWithRelations: async () => {
    return await db.query.jugadores.findMany({
      where: eq(jugadores.estado, true),
      with: {
        jugadoresEquipoCategoria: {
          with: {
            equipoCategoria: {
              with: {
                equipo: true,
                categoria: true,
              },
            },
          },
        },
      },
      orderBy: [asc(jugadores.apellido_nombre)],
    });
  },

  // Obtener jugadores activos por IDs de equipos (optimizado para gestión de encuentros)
  getActiveByEquiposIds: async (equipoIds: number[], categoriaId?: number) => {
    // Primero obtener los equipoCategoria que corresponden a estos equipos
    const whereConditions = categoriaId
      ? and(
          inArray(equipoCategoria.equipo_id, equipoIds),
          eq(equipoCategoria.categoria_id, categoriaId)
        )
      : inArray(equipoCategoria.equipo_id, equipoIds);

    const equipoCategorias = await db.query.equipoCategoria.findMany({
      where: whereConditions,
    });

    if (equipoCategorias.length === 0) {
      return [];
    }

    const equipoCategoriaIds = equipoCategorias.map(ec => ec.id);

    // Obtener relaciones jugador-equipoCategoria para estos equipos
    const jugadoresRelaciones = await db.query.jugadorEquipoCategoria.findMany({
      where: inArray(jugadorEquipoCategoria.equipo_categoria_id, equipoCategoriaIds),
      with: {
        jugador: true,
        equipoCategoria: {
          with: {
            equipo: true,
            categoria: true,
          },
        },
      },
    });

    // Filtrar jugadores activos y obtener IDs únicos
    const jugadorIdsSet = new Set<string>();
    for (const rel of jugadoresRelaciones) {
      if (rel.jugador && rel.jugador.estado === true) {
        jugadorIdsSet.add(rel.jugador.id);
      }
    }

    if (jugadorIdsSet.size === 0) {
      return [];
    }

    const jugadorIdsArray = Array.from(jugadorIdsSet);

    // Obtener jugadores completos con todas sus relaciones
    const jugadoresResult = await db.query.jugadores.findMany({
      where: and(
        inArray(jugadores.id, jugadorIdsArray),
        eq(jugadores.estado, true)
      ),
      with: {
        jugadoresEquipoCategoria: {
          with: {
            equipoCategoria: {
              with: {
                equipo: true,
                categoria: true,
              },
            },
          },
        },
      },
      orderBy: [asc(jugadores.apellido_nombre)],
    });

    return jugadoresResult;
  },

  // Obtener jugador por ID
  getById: async (id: number | string) => {
    const result = await db.select().from(jugadores).where(eq(jugadores.id, id.toString()));
    return result[0];
  },

  // Obtener jugador por ID con relaciones
  getByIdWithRelations: async (id: number) => {
    return await db.query.jugadores.findFirst({
      where: eq(jugadores.id, id.toString()),
      with: {
        jugadoresEquipoCategoria: {
          with: {
            equipoCategoria: {
              with: {
                equipo: true,
                categoria: true,
              },
            },
          },
        },
      },
    });
  },

  // Obtener jugadores por IDs específicos (optimizado para estadísticas)
  getByIdsWithRelations: async (ids: string[]) => {
    if (ids.length === 0) {
      return [];
    }
    return await db.query.jugadores.findMany({
      where: inArray(jugadores.id, ids),
      with: {
        jugadoresEquipoCategoria: {
          with: {
            equipoCategoria: {
              with: {
                equipo: true,
                categoria: true,
              },
            },
          },
        },
      },
      orderBy: [asc(jugadores.apellido_nombre)],
    });
  },

  // Obtener jugador por cédula
  getByCedula: async (cedula: string) => {
    const result = await db.select().from(jugadores).where(eq(jugadores.cedula, cedula));
    return result[0];
  },

  // Obtener jugador por cédula con relaciones
  getByCedulaWithRelations: async (cedula: string) => {
    return await db.query.jugadores.findFirst({
      where: eq(jugadores.cedula, cedula),
      with: {
        jugadoresEquipoCategoria: {
          with: {
            equipoCategoria: {
              with: {
                equipo: true,
                categoria: true,
              },
            },
          },
        },
      },
    });
  },

  // Crear jugador
  create: async (jugadorData: NewJugador) => {
    // Limpiar datos antes de insertar
    const cleanedData = { ...jugadorData };
    
    // Limpiar strings vacíos y convertir a null
    Object.keys(cleanedData).forEach(key => {
      const value = (cleanedData as any)[key];
      if (typeof value === 'string' && (value.trim() === '' || value === 'NULL')) {
        (cleanedData as any)[key] = null;
      }
    });

    // Convertir fecha a string ISO si es un objeto Date
    if ((cleanedData as any).fecha_nacimiento instanceof Date) {
      (cleanedData as any).fecha_nacimiento = (cleanedData as any).fecha_nacimiento.toISOString().split('T')[0];
    }

    const result = await db.insert(jugadores).values(cleanedData).returning();
    return result[0];
  },

  // Actualizar jugador
  update: async (id: number, jugadorData: Partial<NewJugador>) => {
    // Limpiar datos antes de actualizar
    const cleanedData = { ...jugadorData };
    
    // Limpiar strings vacíos y convertir a null
    Object.keys(cleanedData).forEach(key => {
      const value = (cleanedData as any)[key];
      if (typeof value === 'string' && (value.trim() === '' || value === 'NULL')) {
        (cleanedData as any)[key] = null;
      }
    });

    // Convertir fecha a string ISO si es un objeto Date
    if ((cleanedData as any).fecha_nacimiento instanceof Date) {
      (cleanedData as any).fecha_nacimiento = (cleanedData as any).fecha_nacimiento.toISOString().split('T')[0];
    }

    const result = await db
      .update(jugadores)
      .set({ ...cleanedData, updatedAt: new Date() })
      .where(eq(jugadores.id, id.toString()))
      .returning();
    return result[0];
  },

  // Actualizar jugador con equipos-categorías
  updateWithEquiposCategorias: async (id: number, jugadorData: Partial<NewJugador>, equipoCategoriaIds?: number[]) => {
    // Limpiar datos antes de actualizar
    const cleanedData = { ...jugadorData };
    
    // Limpiar strings vacíos y convertir a null
    Object.keys(cleanedData).forEach(key => {
      const value = (cleanedData as any)[key];
      if (typeof value === 'string' && (value.trim() === '' || value === 'NULL')) {
        (cleanedData as any)[key] = null;
      }
    });

    // Convertir fecha a string ISO si es un objeto Date
    if ((cleanedData as any).fecha_nacimiento instanceof Date) {
      (cleanedData as any).fecha_nacimiento = (cleanedData as any).fecha_nacimiento.toISOString().split('T')[0];
    }

    // Actualizar datos del jugador
    const result = await db
      .update(jugadores)
      .set({ ...cleanedData, updatedAt: new Date() })
      .where(eq(jugadores.id, id.toString()))
      .returning();

    // Si se proporcionan equipos-categorías, actualizar las relaciones
    if (equipoCategoriaIds !== undefined) {
      await jugadorEquipoCategoriaQueries.actualizarEquiposCategoriasDeJugador(id, equipoCategoriaIds);
    }

    return result[0];
  },

  // Eliminar jugador
  delete: async (id: number) => {
    return await db.delete(jugadores).where(eq(jugadores.id, id.toString()));
  },

  // Obtener contador de jugadores (optimizado)
  getCount: async () => {
    const result = await db.select({ count: count() }).from(jugadores);
    return result[0]?.count || 0;
  },
};

// ===== JUGADOR_EQUIPO_CATEGORIA =====
export const jugadorEquipoCategoriaQueries = {
  // Asignar jugador a equipo-categoría
  asignarJugadorAEquipoCategoria: async (jugadorId: number, equipoCategoriaId: number, numeroJugador?: number) => {
    // Obtener el jugador para obtener su cédula
    const jugador = await db.select({ cedula: jugadores.cedula })
      .from(jugadores)
      .where(eq(jugadores.id, jugadorId.toString()))
      .limit(1);
    
    if (!jugador || jugador.length === 0) {
      throw new Error('Jugador no encontrado');
    }
    
    return await db.insert(jugadorEquipoCategoria).values({
      jugador_id: jugador[0].cedula, // Guardar la cédula, no el ID
      equipo_categoria_id: equipoCategoriaId,
      numero_jugador: numeroJugador
    }).returning();
  },

  // Remover jugador de equipo-categoría
  removerJugadorDeEquipoCategoria: async (jugadorId: number, equipoCategoriaId: number) => {
    return await db.delete(jugadorEquipoCategoria)
      .where(and(
        eq(jugadorEquipoCategoria.jugador_id, jugadorId.toString()),
        eq(jugadorEquipoCategoria.equipo_categoria_id, equipoCategoriaId)
      ));
  },

  // Obtener equipos-categorías de un jugador
  getEquiposCategoriasDeJugador: async (jugadorId: number) => {
    return await db.query.jugadorEquipoCategoria.findMany({
      where: eq(jugadorEquipoCategoria.jugador_id, jugadorId.toString()),
      with: {
        equipoCategoria: {
          with: {
            equipo: true,
            categoria: true
          }
        }
      }
    });
  },

  // Obtener jugadores de un equipo-categoría
  getJugadoresDeEquipoCategoria: async (equipoCategoriaId: number) => {
    return await db.query.jugadorEquipoCategoria.findMany({
      where: eq(jugadorEquipoCategoria.equipo_categoria_id, equipoCategoriaId),
      with: {
        jugador: true
      }
    });
  },

  // Crear jugador con equipos-categorías
  crearJugadorConEquiposCategorias: async (jugadorData: NewJugador, equipoCategoriaIds: number[] | Array<{ equipoCategoriaId: number; numeroJugador?: number; situacionJugador?: 'PASE' | 'PRÉSTAMO' | null }>) => {
    // Crear el jugador
    const nuevoJugador = await db.insert(jugadores).values(jugadorData).returning();
    
    // Asignar equipos-categorías si se proporcionan
    if (equipoCategoriaIds.length > 0) {
      const relacionesData = equipoCategoriaIds.map(item => {
        const equipoCategoriaId = typeof item === 'number' ? item : item.equipoCategoriaId;
        const numeroJugador = typeof item === 'number' ? undefined : item.numeroJugador;
        const situacionJugador = typeof item === 'number' ? undefined : item.situacionJugador;
        return {
          jugador_id: nuevoJugador[0].cedula, // Guardar la cédula, no el ID
          equipo_categoria_id: equipoCategoriaId,
          numero_jugador: numeroJugador,
          situacion_jugador: situacionJugador
        };
      });
      
      await db.insert(jugadorEquipoCategoria).values(relacionesData);
    }
    
    return nuevoJugador[0];
  },

  // Actualizar equipos-categorías de un jugador
  actualizarEquiposCategoriasDeJugador: async (jugadorId: number, equipoCategoriaIds: number[] | Array<{ equipoCategoriaId: number; numeroJugador?: number }>) => {
    // Obtener el jugador para obtener su cédula
    const jugador = await db.select({ cedula: jugadores.cedula })
      .from(jugadores)
      .where(eq(jugadores.id, jugadorId.toString()))
      .limit(1);
    
    if (!jugador || jugador.length === 0) {
      throw new Error('Jugador no encontrado');
    }
    
    const cedulaJugador = jugador[0].cedula;
    
    // Normalizar el array a formato de objetos
    const relacionesNormalizadas = equipoCategoriaIds.map(item => {
      if (typeof item === 'number') {
        return { equipoCategoriaId: item, numeroJugador: undefined };
      }
      return item;
    });

    // 1️⃣ Obtener las relaciones actuales de la BD (ANTES) - buscar por cédula o por ID
    const relacionesActuales = await db
      .select({ 
        equipo_categoria_id: jugadorEquipoCategoria.equipo_categoria_id,
        numero_jugador: jugadorEquipoCategoria.numero_jugador
      })
      .from(jugadorEquipoCategoria)
      .where(
        or(
          eq(jugadorEquipoCategoria.jugador_id, cedulaJugador),
          eq(jugadorEquipoCategoria.jugador_id, jugadorId.toString())
        )
      );

    const actualesIds = relacionesActuales.map(r => r.equipo_categoria_id);
    const nuevosIds = relacionesNormalizadas.map(r => r.equipoCategoriaId);

    // 2️⃣ Calcular diferencias
    const relacionesAInsertar = relacionesNormalizadas.filter(
      r => !actualesIds.includes(r.equipoCategoriaId)
    );

    const relacionesAEliminar = actualesIds.filter(
      id => !nuevosIds.includes(id)
    );

    // 3️⃣ Actualizar relaciones existentes con nuevo numero_jugador si cambió
    const relacionesAActualizar = relacionesNormalizadas.filter(r => {
      const relacionActual = relacionesActuales.find(ra => ra.equipo_categoria_id === r.equipoCategoriaId);
      return relacionActual && relacionActual.numero_jugador !== r.numeroJugador;
    });

    for (const relacion of relacionesAActualizar) {
      await db
        .update(jugadorEquipoCategoria)
        .set({ numero_jugador: relacion.numeroJugador })
        .where(
          and(
            or(
              eq(jugadorEquipoCategoria.jugador_id, cedulaJugador),
              eq(jugadorEquipoCategoria.jugador_id, jugadorId.toString())
            ),
            eq(jugadorEquipoCategoria.equipo_categoria_id, relacion.equipoCategoriaId)
          )
        );
    }

    // 4️⃣ Eliminar solo las que ya no existen
    if (relacionesAEliminar.length > 0) {
      await db
        .delete(jugadorEquipoCategoria)
        .where(
          and(
            or(
              eq(jugadorEquipoCategoria.jugador_id, cedulaJugador),
              eq(jugadorEquipoCategoria.jugador_id, jugadorId.toString())
            ),
            inArray(jugadorEquipoCategoria.equipo_categoria_id, relacionesAEliminar)
          )
        );
    }

    // 5️⃣ Insertar solo las nuevas
    if (relacionesAInsertar.length > 0) {
      const data = relacionesAInsertar.map(r => ({
        jugador_id: cedulaJugador, // Guardar la cédula, no el ID
        equipo_categoria_id: r.equipoCategoriaId,
        numero_jugador: r.numeroJugador
      }));

      await db.insert(jugadorEquipoCategoria).values(data);
    }
  }
};

// ===== TEMPORADAS =====
export const temporadaQueries = {
  // Obtener todas las temporadas
  getAll: async () => {
    return await db.select().from(temporadas).orderBy(desc(temporadas.nombre));
  },

  // Obtener temporadas con relaciones
  getAllWithRelations: async () => {
    return await db.query.temporadas.findMany({
      with: {
        torneos: {
          with: {
            categoria: true,
          },
        },
      },
      orderBy: [desc(temporadas.nombre)],
    });
  },

  // Obtener temporada por ID
  getById: async (id: number) => {
    const result = await db.select().from(temporadas).where(eq(temporadas.id, id));
    return result[0];
  },

  // Obtener temporada por ID con relaciones
  getByIdWithRelations: async (id: number) => {
    return await db.query.temporadas.findFirst({
      where: eq(temporadas.id, id),
      with: {
        torneos: {
          with: {
            categoria: true,
          },
        },
      },
    });
  },

  // Crear temporada
  create: async (temporadaData: NewTemporada) => {
    const result = await db.insert(temporadas).values(temporadaData).returning();
    return result[0];
  },

  // Actualizar temporada
  update: async (id: number, temporadaData: Partial<NewTemporada>) => {
    const result = await db
      .update(temporadas)
      .set({ ...temporadaData, updatedAt: new Date() })
      .where(eq(temporadas.id, id))
      .returning();
    return result[0];
  },

  // Eliminar temporada
  delete: async (id: number) => {
    return await db.delete(temporadas).where(eq(temporadas.id, id));
  },
};

// ===== TORNEOS =====
export const torneoQueries = {
  // Obtener todos los torneos
  getAll: async () => {
    return await db.select().from(torneos).orderBy(asc(torneos.nombre));
  },

  // Obtener torneos con relaciones
  getAllWithRelations: async () => {
    return await db.query.torneos.findMany({
      with: {
        categoria: true,
        temporada: true,
        equiposTorneo: {
          with: {
            equipo: {
              with: {
                equiposCategoria: {
                  with: {
                    categoria: true,
                  },
                },
                entrenador: true,
              },
            },
          },
        },
        encuentros: {
          with: {
            equipoLocal: {
              with: {
                equiposCategoria: {
                  with: {
                    categoria: true,
                  },
                },
                entrenador: true,
              },
            },
            equipoVisitante: {
              with: {
                equiposCategoria: {
                  with: {
                    categoria: true,
                  },
                },
                entrenador: true,
              },
            },
          },
        },
      },
      orderBy: [asc(torneos.nombre)],
    });
  },

  // Obtener torneo por ID
  getById: async (id: number) => {
    const result = await db.select().from(torneos).where(eq(torneos.id, id));
    return result[0];
  },

  // Obtener torneo por ID con relaciones
  getByIdWithRelations: async (id: number) => {
    return await db.query.torneos.findFirst({
      where: eq(torneos.id, id),
      with: {
        categoria: true,
        temporada: true,
        equiposTorneo: {
          with: {
            equipo: {
              with: {
                equiposCategoria: {
                  with: {
                    categoria: true,
                  },
                },
                entrenador: true,
              },
            },
          },
        },
        encuentros: {
          with: {
            equipoLocal: {
              with: {
                equiposCategoria: {
                  with: {
                    categoria: true,
                  },
                },
                entrenador: true,
              },
            },
            equipoVisitante: {
              with: {
                equiposCategoria: {
                  with: {
                    categoria: true,
                  },
                },
                entrenador: true,
              },
            },
          },
        },
      },
    });
  },

  // Crear torneo
  create: async (torneoData: NewTorneo) => {
    const result = await db.insert(torneos).values(torneoData).returning();
    return result[0];
  },

  // Actualizar torneo
  update: async (id: number, torneoData: Partial<NewTorneo>) => {
    const result = await db
      .update(torneos)
      .set({ ...torneoData, updatedAt: new Date() })
      .where(eq(torneos.id, id))
      .returning();
    return result[0];
  },

  // Eliminar torneo
  delete: async (id: number) => {
    return await db.delete(torneos).where(eq(torneos.id, id));
  },
};

// ===== EQUIPOS TORNEO =====
export const equipoTorneoQueries = {
  // Obtener equipos de un torneo
  getByTorneoId: async (torneoId: number) => {
    return await db.query.equiposTorneo.findMany({
      where: eq(equiposTorneo.torneo_id, torneoId),
      with: {
        equipo: {
          with: {
            equiposCategoria: {
              with: {
                categoria: true,
              },
            },
            entrenador: true,
          },
        },
      },
      orderBy: [asc(equiposTorneo.puntos), desc(equiposTorneo.diferencia_goles)],
    });
  },

  // Agregar equipo a torneo
  addEquipoToTorneo: async (equipoTorneoData: NewEquipoTorneo) => {
    const result = await db.insert(equiposTorneo).values(equipoTorneoData).returning();
    return result[0];
  },

  // Remover equipo de torneo
  removeEquipoFromTorneo: async (torneoId: number, equipoId: number) => {
    return await db
      .delete(equiposTorneo)
      .where(and(eq(equiposTorneo.torneo_id, torneoId), eq(equiposTorneo.equipo_id, equipoId)));
  },

  // Actualizar estadísticas del equipo
  updateEstadisticas: async (id: number, estadisticas: Partial<NewEquipoTorneo>) => {
    const result = await db
      .update(equiposTorneo)
      .set({ ...estadisticas, updatedAt: new Date() })
      .where(eq(equiposTorneo.id, id))
      .returning();
    return result[0];
  },
};

// ===== ENCUENTROS =====
export const encuentroQueries = {
  // Obtener encuentros de un torneo
  getByTorneoId: async (torneoId: number) => {
    const encuentrosData = await db.query.encuentros.findMany({
      where: eq(encuentros.torneo_id, torneoId),
      with: {
        equipoLocal: {
          with: {
            equiposCategoria: {
              with: {
                categoria: true,
              },
            },
            entrenador: true,
          },
        },
        equipoVisitante: {
          with: {
            equiposCategoria: {
              with: {
                categoria: true,
              },
            },
            entrenador: true,
          },
        },
        horario: true,
        goles: true,
      },
      orderBy: [asc(encuentros.jornada), asc(encuentros.fecha_programada)],
    });

    // Asegurar que siempre tengamos los goles en el objeto de encuentro,
    // incluso si no se guardaron en los campos goles_local/goles_visitante
    return encuentrosData.map((e) => {
      // Si ya hay goles_local / goles_visitante, respetarlos
      if (
        (e.goles_local !== null && e.goles_local !== undefined) &&
        (e.goles_visitante !== null && e.goles_visitante !== undefined)
      ) {
        return e;
      }

      // Si no hay goles cargados en el encuentro pero sí en la tabla goles,
      // los calculamos a partir de los registros de goles
      const listaGoles = (e as any).goles as { equipo_id: number }[] | undefined;
      if (!listaGoles || listaGoles.length === 0) {
        return e;
      }

      const golesLocal = listaGoles.filter((g) => g.equipo_id === e.equipo_local_id).length;
      const golesVisitante = listaGoles.filter((g) => g.equipo_id === e.equipo_visitante_id).length;

      return {
        ...e,
        goles_local: golesLocal,
        goles_visitante: golesVisitante,
      };
    });
  },

  // Obtener encuentros por jornada
  getByJornada: async (torneoId: number, jornada: number) => {
    return await db.query.encuentros.findMany({
      where: and(eq(encuentros.torneo_id, torneoId), eq(encuentros.jornada, jornada)),
      with: {
        equipoLocal: {
          with: {
            equiposCategoria: {
              with: {
                categoria: true,
              },
            },
            entrenador: true,
          },
        },
        equipoVisitante: {
          with: {
            equiposCategoria: {
              with: {
                categoria: true,
              },
            },
            entrenador: true,
          },
        },
        horario: true,
      },
      orderBy: [asc(encuentros.fecha_programada)],
    });
  },

  // Crear encuentro
  create: async (encuentroData: NewEncuentro) => {
    const result = await db.insert(encuentros).values(encuentroData).returning();
    return result[0];
  },

  // Actualizar encuentro
  update: async (id: number, encuentroData: Partial<NewEncuentro>) => {
    const result = await db
      .update(encuentros)
      .set({ ...encuentroData, updatedAt: new Date() })
      .where(eq(encuentros.id, id))
      .returning();
    return result[0];
  },

  // Eliminar encuentro
  delete: async (id: number) => {
    return await db.delete(encuentros).where(eq(encuentros.id, id));
  },

  // Eliminar todos los encuentros de un torneo
  deleteByTorneoId: async (torneoId: number) => {
    return await db.delete(encuentros).where(eq(encuentros.torneo_id, torneoId));
  },

  // Obtener encuentro por ID
  getById: async (id: number) => {
    const result = await db.select().from(encuentros).where(eq(encuentros.id, id));
    return result[0];
  },

  // Actualizar fecha de todos los encuentros de una jornada
  updateFechaByJornada: async (torneoId: number, jornada: number, fecha: Date) => {
    const result = await db
      .update(encuentros)
      .set({ 
        fecha_programada: fecha,
        updatedAt: new Date()
      })
      .where(and(
        eq(encuentros.torneo_id, torneoId),
        eq(encuentros.jornada, jornada)
      ))
      .returning();
    return result;
  },

  // Obtener encuentro por ID con relaciones
  getByIdWithRelations: async (id: number) => {
    return await db.query.encuentros.findFirst({
      where: eq(encuentros.id, id),
      with: {
        equipoLocal: {
          with: {
            equiposCategoria: {
              with: {
                categoria: true,
              },
            },
            entrenador: true,
          },
        },
        equipoVisitante: {
          with: {
            equiposCategoria: {
              with: {
                categoria: true,
              },
            },
            entrenador: true,
          },
        },
        torneo: {
          with: {
            categoria: true,
          },
        },
        horario: true,
      },
    });
  },
};

// ===== ESTADÍSTICAS =====
export const statsQueries = {
  // Contar equipos
  getEquipoCount: async () => {
    const result = await db.select({ count: count() }).from(equipos);
    return result[0].count;
  },

  // Contar equipos activos
  getEquipoActivoCount: async () => {
    const result = await db.select({ count: count() }).from(equipos).where(eq(equipos.estado, true));
    return result[0].count;
  },

  // Contar categorías
  getCategoriaCount: async () => {
    const result = await db.select({ count: count() }).from(categorias);
    return result[0].count;
  },

  // Contar entrenadores
  getEntrenadorCount: async () => {
    const result = await db.select({ count: count() }).from(entrenadores);
    return result[0].count;
  },

  // Contar jugadores
  getJugadorCount: async () => {
    const result = await db.select({ count: count() }).from(jugadores);
    return result[0].count;
  },

  // Contar jugadores activos
  getJugadorActivoCount: async () => {
    const result = await db.select({ count: count() }).from(jugadores).where(eq(jugadores.estado, true));
    return result[0].count;
  },
};

// ===== CANCHAS =====
export const canchaQueries = {
  // Obtener todas las canchas
  getAll: async () => {
    return await db.select().from(canchas).orderBy(asc(canchas.nombre));
  },

  // Obtener todas las canchas con sus categorías
  getAllWithCategorias: async () => {
    const canchasData = await db.select().from(canchas).orderBy(asc(canchas.nombre));
    
    const canchasConCategorias = await Promise.all(
      canchasData.map(async (cancha) => {
        const categoriasData = await db
          .select({
            id: categorias.id,
            nombre: categorias.nombre,
            estado: categorias.estado,
            usuario_id: categorias.usuario_id,
            createdAt: categorias.createdAt,
            updatedAt: categorias.updatedAt,
          })
          .from(categorias)
          .innerJoin(canchasCategorias, eq(categorias.id, canchasCategorias.categoria_id))
          .where(eq(canchasCategorias.cancha_id, cancha.id));
        
        return {
          ...cancha,
          categorias: categoriasData,
        };
      })
    );
    
    return canchasConCategorias;
  },

  // Obtener cancha por ID
  getById: async (id: number) => {
    const result = await db.select().from(canchas).where(eq(canchas.id, id));
    return result[0];
  },

  // Obtener cancha por ID con sus categorías
  getByIdWithCategorias: async (id: number) => {
    const cancha = await db.select().from(canchas).where(eq(canchas.id, id));
    if (!cancha[0]) return null;
    
    const categoriasData = await db
      .select({
        id: categorias.id,
        nombre: categorias.nombre,
        estado: categorias.estado,
        usuario_id: categorias.usuario_id,
        createdAt: categorias.createdAt,
        updatedAt: categorias.updatedAt,
      })
      .from(categorias)
      .innerJoin(canchasCategorias, eq(categorias.id, canchasCategorias.categoria_id))
      .where(eq(canchasCategorias.cancha_id, id));
    
    return {
      ...cancha[0],
      categorias: categoriasData,
    };
  },

  // Crear cancha
  create: async (canchaData: NewCancha) => {
    const result = await db.insert(canchas).values(canchaData).returning();
    return result[0];
  },

  // Crear cancha con categorías
  createWithCategorias: async (canchaData: NewCancha, categoriaIds: number[]) => {
    const result = await db.insert(canchas).values(canchaData).returning();
    const cancha = result[0];
    
    if (categoriaIds.length > 0) {
      const categoriasData = categoriaIds.map(categoriaId => ({
        cancha_id: cancha.id,
        categoria_id: categoriaId,
      }));
      
      try {
        await db.insert(canchasCategorias).values(categoriasData);
      } catch (error) {
        // Si hay duplicados, ignorar el error debido al índice único
        console.log('Algunas categorías ya estaban asignadas a esta cancha');
      }
    }
    
    return cancha;
  },

  // Actualizar cancha
  update: async (id: number, canchaData: Partial<NewCancha>) => {
    const result = await db
      .update(canchas)
      .set({ ...canchaData, updatedAt: new Date() })
      .where(eq(canchas.id, id))
      .returning();
    return result[0];
  },
  
  // Actualizar cancha con categorías
  updateWithCategorias: async (id: number, canchaData: Partial<NewCancha>, categoriaIds: number[]) => {
    // Actualizar datos de la cancha
    const result = await db
      .update(canchas)
      .set({ ...canchaData, updatedAt: new Date() })
      .where(eq(canchas.id, id))
      .returning();
    
    // 1️⃣ Obtener las categorías actuales de la BD (ANTES)
    const categoriasActuales = await db
      .select({ categoria_id: canchasCategorias.categoria_id })
      .from(canchasCategorias)
      .where(eq(canchasCategorias.cancha_id, id));

    const actualesIds = categoriasActuales.map(c => c.categoria_id);

    // 2️⃣ Calcular diferencias
    const categoriasAInsertar = categoriaIds.filter(
      id => !actualesIds.includes(id)
    );

    const categoriasAEliminar = actualesIds.filter(
      id => !categoriaIds.includes(id)
    );

    // 3️⃣ Eliminar solo las que ya no existen
    if (categoriasAEliminar.length > 0) {
      await db
        .delete(canchasCategorias)
        .where(
          and(
            eq(canchasCategorias.cancha_id, id),
            inArray(canchasCategorias.categoria_id, categoriasAEliminar)
          )
        );
    }

    // 4️⃣ Insertar solo las nuevas
    if (categoriasAInsertar.length > 0) {
      const data = categoriasAInsertar.map(categoriaId => ({
        cancha_id: id,
        categoria_id: categoriaId,
      }));

      await db.insert(canchasCategorias).values(data);
    }
    
    return result[0];
  },

  // Eliminar cancha
  delete: async (id: number) => {
    // Eliminar relaciones con categorías primero
    await db.delete(canchasCategorias).where(eq(canchasCategorias.cancha_id, id));
    return await db.delete(canchas).where(eq(canchas.id, id));
  },

  // Asignar categorías a una cancha
  assignCategorias: async (canchaId: number, categoriaIds: number[]) => {
    const categoriasData = categoriaIds.map(categoriaId => ({
      cancha_id: canchaId,
      categoria_id: categoriaId,
    }));
    
    try {
      return await db.insert(canchasCategorias).values(categoriasData);
    } catch (error) {
      // Si hay duplicados, ignorar el error debido al índice único
      console.log('Algunas categorías ya estaban asignadas a esta cancha');
      return [];
    }
  },

  // Desasignar categorías de una cancha
  unassignCategorias: async (canchaId: number, categoriaIds: number[]) => {
    return await db
      .delete(canchasCategorias)
      .where(
        and(
          eq(canchasCategorias.cancha_id, canchaId),
          inArray(canchasCategorias.categoria_id, categoriaIds)
        )
      );
  },

  // Obtener categorías de una cancha
  getCategoriasByCanchaId: async (canchaId: number) => {
    return await db
      .select({
        id: categorias.id,
        nombre: categorias.nombre,
        estado: categorias.estado,
        usuario_id: categorias.usuario_id,
        createdAt: categorias.createdAt,
        updatedAt: categorias.updatedAt,
      })
      .from(categorias)
      .innerJoin(canchasCategorias, eq(categorias.id, canchasCategorias.categoria_id))
      .where(eq(canchasCategorias.cancha_id, canchaId));
  },

  // Obtener canchas por categoría
  getCanchasByCategoriaId: async (categoriaId: number) => {
    return await db
      .select()
      .from(canchas)
      .innerJoin(canchasCategorias, eq(canchas.id, canchasCategorias.cancha_id))
      .where(eq(canchasCategorias.categoria_id, categoriaId))
      .orderBy(asc(canchas.nombre));
  },
};

// ===== EQUIPOS QUE DESCANSAN =====
export const equiposDescansanQueries = {
  // Obtener todos los descansos de un torneo
  getByTorneoId: async (torneoId: number) => {
    return await db
      .select()
      .from(equiposDescansan)
      .where(eq(equiposDescansan.torneo_id, torneoId))
      .orderBy(asc(equiposDescansan.jornada));
  },

  // Obtener descanso por jornada específica
  getByJornada: async (torneoId: number, jornada: number) => {
    const result = await db
      .select()
      .from(equiposDescansan)
      .where(
        and(
          eq(equiposDescansan.torneo_id, torneoId),
          eq(equiposDescansan.jornada, jornada)
        )
      );
    return result[0];
  },

  // Crear registro de descanso
  create: async (data: { torneo_id: number; equipo_id: number; jornada: number }) => {
    const result = await db.insert(equiposDescansan).values(data).returning();
    return result[0];
  },

  // Eliminar descanso por jornada
  deleteByJornada: async (torneoId: number, jornada: number) => {
    return await db
      .delete(equiposDescansan)
      .where(
        and(
          eq(equiposDescansan.torneo_id, torneoId),
          eq(equiposDescansan.jornada, jornada)
        )
      );
  },

  // Eliminar todos los descansos de un torneo
  deleteByTorneoId: async (torneoId: number) => {
    return await db.delete(equiposDescansan).where(eq(equiposDescansan.torneo_id, torneoId));
  },
};

// ===== ESTADÍSTICAS PÚBLICAS =====
export const estadisticasQueries = {
  // Obtener tabla de posiciones de un torneo (calculada desde goles reales)
  getTablaPosiciones: async (torneoId: number) => {
    // Obtener equipos del torneo
    const equiposTorneoData = await db.query.equiposTorneo.findMany({
      where: eq(equiposTorneo.torneo_id, torneoId),
      with: {
        equipo: {
          with: {
            equiposCategoria: {
              with: {
                categoria: true,
              },
            },
            entrenador: true,
          },
        },
      },
    });

    // Obtener encuentros finalizados del torneo
    const encuentrosFinalizados = await db.query.encuentros.findMany({
      where: (encuentros, { and, eq }) => and(
        eq(encuentros.torneo_id, torneoId),
        eq(encuentros.estado, 'finalizado')
      ),
    });

    // Obtener goles del torneo
    const encuentrosIds = encuentrosFinalizados.map(e => e.id);
    const golesData = encuentrosIds.length > 0 
      ? await db.select().from(goles).where(inArray(goles.encuentro_id, encuentrosIds))
      : [];

    // Calcular estadísticas para cada equipo
    const estadisticasEquipos = equiposTorneoData.map(equipoTorneo => {
      const equipoId = equipoTorneo.equipo_id;
      
      // Encuentros donde participó el equipo
      const encuentrosEquipo = encuentrosFinalizados.filter(e => 
        e.equipo_local_id === equipoId || e.equipo_visitante_id === equipoId
      );

      let partidosJugados = 0;
      let partidosGanados = 0;
      let partidosEmpatados = 0;
      let partidosPerdidos = 0;
      let golesFavor = 0;
      let golesContra = 0;
      let puntos = 0;

      encuentrosEquipo.forEach(encuentro => {
        partidosJugados++;
        
        // Calcular goles reales desde la tabla goles
        const golesIndividualesLocal = golesData.filter(g => 
          g.encuentro_id === encuentro.id && 
          g.equipo_id === encuentro.equipo_local_id && 
          (g.tipo === 'gol' || g.tipo === 'penal')
        ).length;
        
        const golesIndividualesVisitante = golesData.filter(g => 
          g.encuentro_id === encuentro.id && 
          g.equipo_id === encuentro.equipo_visitante_id && 
          (g.tipo === 'gol' || g.tipo === 'penal')
        ).length;

        // Si no hay goles individuales, usar los goles del encuentro (caso WO)
        const golesLocal = golesIndividualesLocal > 0 ? golesIndividualesLocal : (encuentro.goles_local || 0);
        const golesVisitante = golesIndividualesVisitante > 0 ? golesIndividualesVisitante : (encuentro.goles_visitante || 0);

        // Determinar resultado según el equipo
        if (equipoId === encuentro.equipo_local_id) {
          // El equipo jugó de local
          golesFavor += golesLocal;
          golesContra += golesVisitante;
          
          if (golesLocal > golesVisitante) {
            partidosGanados++;
            puntos += 3;
          } else if (golesVisitante > golesLocal) {
            partidosPerdidos++;
          } else {
            partidosEmpatados++;
            puntos += 1;
          }
        } else {
          // El equipo jugó de visitante
          golesFavor += golesVisitante;
          golesContra += golesLocal;
          
          if (golesVisitante > golesLocal) {
            partidosGanados++;
            puntos += 3;
          } else if (golesLocal > golesVisitante) {
            partidosPerdidos++;
          } else {
            partidosEmpatados++;
            puntos += 1;
          }
        }
      });

      return {
        posicion: 0, // Se calculará después
        equipo: equipoTorneo.equipo,
        puntos,
        partidosJugados,
        partidosGanados,
        partidosEmpatados,
        partidosPerdidos,
        golesFavor,
        golesContra,
        diferenciaGoles: golesFavor - golesContra,
      };
    });

    // Ordenar por puntos y diferencia de goles
    estadisticasEquipos.sort((a, b) => {
      if (b.puntos !== a.puntos) return b.puntos - a.puntos;
      return b.diferenciaGoles - a.diferenciaGoles;
    });

    // Asignar posiciones
    estadisticasEquipos.forEach((estadistica, index) => {
      estadistica.posicion = index + 1;
    });

    return estadisticasEquipos;
  },

  // Obtener tabla de goleadores de un torneo
  getTablaGoleadores: async (torneoId: number) => {
    // Primero obtener todos los encuentros del torneo
    const encuentrosTorneo = await db.query.encuentros.findMany({
      where: eq(encuentros.torneo_id, torneoId),
      columns: { id: true }
    });

    const encuentrosIds = encuentrosTorneo.map(e => e.id);

    if (encuentrosIds.length === 0) {
      return [];
    }

    // Luego obtener todos los goles de esos encuentros usando select directo
    const golesData = await db.select().from(goles).where(inArray(goles.encuentro_id, encuentrosIds));
    
    // Obtener información de jugadores por separado
    const jugadoresIds = [...new Set(golesData.map(g => g.jugador_id))];
    const jugadoresData = await db.query.jugadores.findMany({
      where: inArray(jugadores.id, jugadoresIds),
      with: {
        jugadoresEquipoCategoria: {
          with: {
            equipoCategoria: {
              with: {
                equipo: {
                  with: {
                    entrenador: true,
                  },
                },
                categoria: true,
              },
            },
          },
        },
      },
    });

    // Agrupar goles por jugador
    const golesPorJugador: Record<string, {
      jugador: any,
      goles: number,
      penales: number,
      totalGoles: number
    }> = {};

    golesData.forEach(gol => {
      if (!golesPorJugador[gol.jugador_id]) {
        const jugador = jugadoresData.find(j => j.id === gol.jugador_id);
        golesPorJugador[gol.jugador_id] = {
          jugador: jugador,
          goles: 0,
          penales: 0,
          totalGoles: 0
        };
      }

      if (gol.tipo === 'gol') {
        golesPorJugador[gol.jugador_id].goles++;
      } else if (gol.tipo === 'penal') {
        golesPorJugador[gol.jugador_id].penales++;
      }
      
      if (gol.tipo === 'gol' || gol.tipo === 'penal') {
        golesPorJugador[gol.jugador_id].totalGoles++;
      }
    });

    // Convertir a array y ordenar por total de goles
    return Object.values(golesPorJugador)
      .filter(item => item.jugador && item.totalGoles > 0)
      .sort((a, b) => b.totalGoles - a.totalGoles)
      .map((item, index) => {
        // Obtener el primer equipo del jugador (asumiendo que un jugador puede estar en múltiples equipos-categorías)
        const equipoCategoria = item.jugador?.jugadoresEquipoCategoria?.[0]?.equipoCategoria;
        const equipo = equipoCategoria?.equipo;
        
        return {
          posicion: index + 1,
          jugador: {
            id: item.jugador.id,
            apellido_nombre: item.jugador.apellido_nombre,
            foto: item.jugador.foto,
            equipo: equipo ? {
              id: equipo.id,
              nombre: equipo.nombre,
              imagen_equipo: equipo.imagen_equipo
            } : null
          },
          goles: item.goles,
          penales: item.penales,
          totalGoles: item.totalGoles,
        };
      });
  },

  // Obtener información básica del torneo para la página pública
  getTorneoPublico: async (torneoId: number) => {
    return await db.query.torneos.findFirst({
      where: eq(torneos.id, torneoId),
      with: {
        categoria: true,
      },
    });
  },

  // Obtener todos los torneos públicos (activos o planificados, excluyendo finalizados)
  getTorneosPublicos: async () => {
    const torneosData = await db.query.torneos.findMany({
      where: (torneos, { or, eq, ne }) => or(
        eq(torneos.estado, 'en_curso'),
        eq(torneos.estado, 'planificado')
      ),
      with: {
        categoria: true,
        equiposTorneo: true,
      },
      orderBy: [asc(torneos.fecha_inicio)],
    });

    return torneosData.map(torneo => ({
      ...torneo,
      equiposCount: torneo.equiposTorneo?.length || 0
    }));
  },

  // Obtener TODOS los torneos (para debug)
  getAllTorneos: async () => {
    return await db.query.torneos.findMany({
      with: {
        categoria: true,
        equiposTorneo: true,
      },
      orderBy: [asc(torneos.fecha_inicio)],
    });
  },

  // Obtener equipos del torneo (para debug)
  getEquiposTorneo: async (torneoId: number) => {
    return await db.query.equiposTorneo.findMany({
      where: eq(equiposTorneo.torneo_id, torneoId),
      with: {
        equipo: {
          with: {
            equiposCategoria: {
              with: {
                categoria: true,
              },
            },
            entrenador: true,
          },
        },
      },
    });
  },
};