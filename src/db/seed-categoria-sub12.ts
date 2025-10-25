import { db } from './index';
import { categorias } from './schema';
import { eq } from 'drizzle-orm';

/**
 * Script para crear una categoría Sub 12 con rango de edad específico
 * Rango: 6 años mínimo, 12 años y 4 meses máximo
 */
export async function seedCategoriaSub12() {
  try {
    console.log('🌱 Creando categoría Sub 12 con rango de edad...');

    // Verificar si ya existe una categoría Sub 12
    const categoriaExistente = await db.select().from(categorias).where(
      eq(categorias.nombre, 'Sub 12')
    );

    if (categoriaExistente.length > 0) {
      console.log('✅ La categoría Sub 12 ya existe');
      return categoriaExistente[0];
    }

    // Crear la categoría Sub 12 con rango de edad
    const nuevaCategoria = await db.insert(categorias).values({
      nombre: 'Sub 12',
      estado: true,
      usuario_id: 1,
      edad_minima_anos: 6,
      edad_minima_meses: 0,
      edad_maxima_anos: 12,
      edad_maxima_meses: 4,
    }).returning();

    console.log(`✅ Categoría Sub 12 creada con ID: ${nuevaCategoria[0].id}`);
    console.log('📊 Rango de edad configurado: 6 años - 12 años y 4 meses');
    
    return nuevaCategoria[0];
  } catch (error) {
    console.error('❌ Error al crear categoría Sub 12:', error);
    throw error;
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  seedCategoriaSub12()
    .then(() => {
      console.log('🎉 Script completado exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error en el script:', error);
      process.exit(1);
    });
}
