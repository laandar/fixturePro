import { db } from './index';
import { categorias, entrenadores, equipos } from './schema';

export async function seedDatabase() {
  try {
    console.log('🌱 Iniciando inserción de datos de prueba...');

    // Insertar categorías
    console.log('📊 Insertando categorías...');
    const categoriasData = await db.insert(categorias).values([
      {
        nombre: 'Primera División',
        permite_revancha: true,
      },
      {
        nombre: 'Segunda División',
        permite_revancha: true,
      },
      {
        nombre: 'Tercera División',
        permite_revancha: false,
      },
      {
        nombre: 'Cuarta División',
        permite_revancha: false,
      },
    ]).returning();

    console.log(`✅ ${categoriasData.length} categorías insertadas`);

    // Insertar entrenadores
    console.log('👨‍💼 Insertando entrenadores...');
    const entrenadoresData = await db.insert(entrenadores).values([
      {
        nombre: 'Carlos Bianchi',
      },
      {
        nombre: 'Marcelo Bielsa',
      },
      {
        nombre: 'José Pekerman',
      },
      {
        nombre: 'Diego Simeone',
      },
      {
        nombre: 'Jorge Sampaoli',
      },
      {
        nombre: 'Gerardo Martino',
      },
    ]).returning();

    console.log(`✅ ${entrenadoresData.length} entrenadores insertados`);

    // Insertar equipos
    console.log('⚽ Insertando equipos...');
    const equiposData = await db.insert(equipos).values([
      {
        nombre: 'Boca Juniors',
        categoria_id: categoriasData[0].id,
        entrenador_id: entrenadoresData[0].id,
        imagen_equipo: 'https://via.placeholder.com/150/0000FF/FFFFFF?text=Boca',
        estado: true,
      },
      {
        nombre: 'River Plate',
        categoria_id: categoriasData[0].id,
        entrenador_id: entrenadoresData[1].id,
        imagen_equipo: 'https://via.placeholder.com/150/FF0000/FFFFFF?text=River',
        estado: true,
      },
      {
        nombre: 'Racing Club',
        categoria_id: categoriasData[1].id,
        entrenador_id: entrenadoresData[2].id,
        imagen_equipo: 'https://via.placeholder.com/150/0000FF/FFFFFF?text=Racing',
        estado: true,
      },
      {
        nombre: 'Independiente',
        categoria_id: categoriasData[1].id,
        entrenador_id: entrenadoresData[3].id,
        imagen_equipo: 'https://via.placeholder.com/150/FF0000/FFFFFF?text=Independiente',
        estado: true,
      },
      {
        nombre: 'San Lorenzo',
        categoria_id: categoriasData[2].id,
        entrenador_id: entrenadoresData[4].id,
        imagen_equipo: 'https://via.placeholder.com/150/0000FF/FFFFFF?text=San+Lorenzo',
        estado: true,
      },
      {
        nombre: 'Huracán',
        categoria_id: categoriasData[2].id,
        entrenador_id: entrenadoresData[5].id,
        imagen_equipo: 'https://via.placeholder.com/150/FF0000/FFFFFF?text=Huracan',
        estado: false,
      },
      {
        nombre: 'Newell\'s Old Boys',
        categoria_id: categoriasData[3].id,
        entrenador_id: entrenadoresData[0].id,
        imagen_equipo: 'https://via.placeholder.com/150/0000FF/FFFFFF?text=Newells',
        estado: true,
      },
      {
        nombre: 'Rosario Central',
        categoria_id: categoriasData[3].id,
        entrenador_id: entrenadoresData[1].id,
        imagen_equipo: 'https://via.placeholder.com/150/FF0000/FFFFFF?text=Central',
        estado: true,
      },
    ]).returning();

    console.log(`✅ ${equiposData.length} equipos insertados`);
    console.log('🎉 ¡Datos de prueba insertados exitosamente!');

    return {
      categorias: categoriasData,
      entrenadores: entrenadoresData,
      equipos: equiposData,
    };
  } catch (error) {
    console.error('❌ Error al insertar datos de prueba:', error);
    throw error;
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('✅ Script de seed completado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error en script de seed:', error);
      process.exit(1);
    });
} 