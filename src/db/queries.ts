import { db } from './index'
import { eq, asc, count, and, desc, inArray, or } from 'drizzle-orm'
import { equipos, categorias, entrenadores, jugadores, torneos, equiposTorneo, encuentros, canchas, canchasCategorias, equiposDescansan, goles } from './schema'
import type { NewEquipo, NewCategoria, NewEntrenador, NewJugador, NewTorneo, NewEquipoTorneo, NewEncuentro, NewCancha } from './types'

// ===== EQUIPOS =====
export const equipoQueries = {
  // Obtener todos los equipos
  getAll: async () => {
    return await db.select().from(equipos).orderBy(asc(equipos.nombre));
  },

  // Obtener equipos con relaciones (categoría y entrenador)
  getAllWithRelations: async () => {
    return await db.query.equipos.findMany({
      with: {
        categoria: true,
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
        categoria: true,
        entrenador: true,
      },
    });
  },

  // Obtener equipos por categoría con relaciones
  getByCategoriaWithRelations: async (categoriaId: number) => {
    return await db.query.equipos.findMany({
      where: eq(equipos.categoria_id, categoriaId),
      with: {
        categoria: true,
        entrenador: true,
      },
      orderBy: [asc(equipos.nombre)],
    });
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

  // Eliminar equipo
  delete: async (id: number) => {
    return await db.delete(equipos).where(eq(equipos.id, id));
  },
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
  getAllWithRelations: async () => {
    return await db.query.jugadores.findMany({
      with: {
        categoria: true,
        equipo: true,
      },
      orderBy: [asc(jugadores.apellido_nombre)],
    });
  },

  // Obtener jugador por ID
  getById: async (id: number) => {
    const result = await db.select().from(jugadores).where(eq(jugadores.id, id));
    return result[0];
  },

  // Obtener jugador por ID con relaciones
  getByIdWithRelations: async (id: number) => {
    return await db.query.jugadores.findFirst({
      where: eq(jugadores.id, id),
      with: {
        categoria: true,
        equipo: true,
      },
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
        categoria: true,
        equipo: true,
      },
    });
  },

  // Crear jugador
  create: async (jugadorData: NewJugador) => {
    const result = await db.insert(jugadores).values(jugadorData).returning();
    return result[0];
  },

  // Actualizar jugador
  update: async (id: number, jugadorData: Partial<NewJugador>) => {
    const result = await db
      .update(jugadores)
      .set({ ...jugadorData, updatedAt: new Date() })
      .where(eq(jugadores.id, id))
      .returning();
    return result[0];
  },

  // Eliminar jugador
  delete: async (id: number) => {
    return await db.delete(jugadores).where(eq(jugadores.id, id));
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
        equiposTorneo: {
          with: {
            equipo: {
              with: {
                categoria: true,
                entrenador: true,
              },
            },
          },
        },
        encuentros: {
          with: {
            equipoLocal: {
              with: {
                categoria: true,
                entrenador: true,
              },
            },
            equipoVisitante: {
              with: {
                categoria: true,
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
        equiposTorneo: {
          with: {
            equipo: {
              with: {
                categoria: true,
                entrenador: true,
              },
            },
          },
        },
        encuentros: {
          with: {
            equipoLocal: {
              with: {
                categoria: true,
                entrenador: true,
              },
            },
            equipoVisitante: {
              with: {
                categoria: true,
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
            categoria: true,
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
    return await db.query.encuentros.findMany({
      where: eq(encuentros.torneo_id, torneoId),
      with: {
        equipoLocal: {
          with: {
            categoria: true,
            entrenador: true,
          },
        },
        equipoVisitante: {
          with: {
            categoria: true,
            entrenador: true,
          },
        },
        horario: true,
      },
      orderBy: [asc(encuentros.jornada), asc(encuentros.fecha_programada)],
    });
  },

  // Obtener encuentros por jornada
  getByJornada: async (torneoId: number, jornada: number) => {
    return await db.query.encuentros.findMany({
      where: and(eq(encuentros.torneo_id, torneoId), eq(encuentros.jornada, jornada)),
      with: {
        equipoLocal: {
          with: {
            categoria: true,
            entrenador: true,
          },
        },
        equipoVisitante: {
          with: {
            categoria: true,
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
            permite_revancha: categorias.permite_revancha,
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
        permite_revancha: categorias.permite_revancha,
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
    
    // Eliminar categorías existentes
    await db.delete(canchasCategorias).where(eq(canchasCategorias.cancha_id, id));
    
    // Insertar nuevas categorías
    if (categoriaIds.length > 0) {
      const categoriasData = categoriaIds.map(categoriaId => ({
        cancha_id: id,
        categoria_id: categoriaId,
      }));
      
      await db.insert(canchasCategorias).values(categoriasData);
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
        permite_revancha: categorias.permite_revancha,
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
            categoria: true,
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
        const golesLocal = golesData.filter(g => 
          g.encuentro_id === encuentro.id && 
          g.equipo_id === encuentro.equipo_local_id && 
          (g.tipo === 'gol' || g.tipo === 'penal')
        ).length;
        
        const golesVisitante = golesData.filter(g => 
          g.encuentro_id === encuentro.id && 
          g.equipo_id === encuentro.equipo_visitante_id && 
          (g.tipo === 'gol' || g.tipo === 'penal')
        ).length;

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
        equipo: {
          with: {
            categoria: true,
            entrenador: true,
          },
        },
      },
    });

    // Agrupar goles por jugador
    const golesPorJugador: Record<number, {
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
      .map((item, index) => ({
        posicion: index + 1,
        jugador: item.jugador,
        goles: item.goles,
        penales: item.penales,
        totalGoles: item.totalGoles,
      }));
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

  // Obtener todos los torneos públicos (activos, finalizados o planificados)
  getTorneosPublicos: async () => {
    const torneosData = await db.query.torneos.findMany({
      where: (torneos, { or, eq }) => or(
        eq(torneos.estado, 'en_curso'),
        eq(torneos.estado, 'finalizado'),
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
            categoria: true,
            entrenador: true,
          },
        },
      },
    });
  },
};