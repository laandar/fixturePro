import { eq, and, or, like, desc, asc, count } from 'drizzle-orm';
import { db } from './index';
import { equipos, categorias, entrenadores } from './schema';
import type { NewEquipo, NewCategoria, NewEntrenador, EquipoWithRelations } from './types';

// ===== EQUIPOS =====
export const equipoQueries = {
  // Obtener todos los equipos con relaciones
  getAll: async (): Promise<EquipoWithRelations[]> => {
    return await db.query.equipos.findMany({
      with: {
        categoria: true,
        entrenador: true,
      },
      orderBy: [desc(equipos.createdAt)],
    });
  },

  // Obtener equipos activos
  getActive: async (): Promise<EquipoWithRelations[]> => {
    return await db.query.equipos.findMany({
      where: eq(equipos.estado, true),
      with: {
        categoria: true,
        entrenador: true,
      },
      orderBy: [desc(equipos.createdAt)],
    });
  },

  // Obtener equipo por ID
  getById: async (id: number): Promise<EquipoWithRelations | undefined> => {
    const result = await db.query.equipos.findFirst({
      where: eq(equipos.id, id),
      with: {
        categoria: true,
        entrenador: true,
      },
    });
    return result;
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

  // Buscar equipos
  search: async (query: string): Promise<EquipoWithRelations[]> => {
    return await db.query.equipos.findMany({
      where: or(
        like(equipos.nombre, `%${query}%`)
      ),
      with: {
        categoria: true,
        entrenador: true,
      },
      orderBy: [desc(equipos.createdAt)],
    });
  },

  // Obtener equipos por categoría
  getByCategoria: async (categoriaId: number): Promise<EquipoWithRelations[]> => {
    return await db.query.equipos.findMany({
      where: eq(equipos.categoria_id, categoriaId),
      with: {
        categoria: true,
        entrenador: true,
      },
      orderBy: [desc(equipos.createdAt)],
    });
  },

  // Obtener equipos por entrenador
  getByEntrenador: async (entrenadorId: number): Promise<EquipoWithRelations[]> => {
    return await db.query.equipos.findMany({
      where: eq(equipos.entrenador_id, entrenadorId),
      with: {
        categoria: true,
        entrenador: true,
      },
      orderBy: [desc(equipos.createdAt)],
    });
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
}; 