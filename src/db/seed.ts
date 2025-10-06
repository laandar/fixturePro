import { db } from './index';
import { categorias, entrenadores, equipos, jugadores } from './schema';

export async function seedDatabase() {
  try {
    console.log('🌱 Iniciando inserción de datos de prueba...');

    // Insertar categorías
    console.log('📊 Insertando categorías...');
    const categoriasData = await db.insert(categorias).values([
      {
        nombre: 'Primera División',
        estado: true,
        usuario_id: 1,
      },
      {
        nombre: 'Segunda División',
        estado: true,
        usuario_id: 1,
      },
      {
        nombre: 'Tercera División',
        estado: true,
        usuario_id: 1,
      },
      {
        nombre: 'Cuarta División',
        estado: true,
        usuario_id: 1,
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

    // Insertar jugadores con imágenes temporales
    console.log('⚽ Insertando jugadores...');
    const jugadoresData = await db.insert(jugadores).values([
      {
        id: 1,
        cedula: '12345678',
        apellido_nombre: 'Lionel Messi',
        nacionalidad: 'Argentina',
        liga: 'Ligue 1',
        categoria_id: categoriasData[0].id,
        equipo_id: equiposData[0].id,
        foto: 'https://img.a.transfermarkt.technology/portrait/header/28003-1671435885.jpg?lm=1',
        estado: true,
      },
      {
        id: 2,
        cedula: '87654321',
        apellido_nombre: 'Cristiano Ronaldo',
        nacionalidad: 'Portugal',
        liga: 'Saudi Pro League',
        categoria_id: categoriasData[0].id,
        equipo_id: equiposData[1].id,
        foto: 'https://img.a.transfermarkt.technology/portrait/header/8198-1671435885.jpg?lm=1',
        estado: true,
      },
      {
        id: 3,
        cedula: '11223344',
        apellido_nombre: 'Neymar Jr',
        nacionalidad: 'Brasil',
        liga: 'Saudi Pro League',
        categoria_id: categoriasData[0].id,
        equipo_id: equiposData[2].id,
        foto: 'https://img.a.transfermarkt.technology/portrait/header/68290-1671435885.jpg?lm=1',
        estado: true,
      },
      {
        id: 4,
        cedula: '44332211',
        apellido_nombre: 'Kylian Mbappé',
        nacionalidad: 'Francia',
        liga: 'Ligue 1',
        categoria_id: categoriasData[1].id,
        equipo_id: equiposData[3].id,
        foto: 'https://img.a.transfermarkt.technology/portrait/header/342229-1671435885.jpg?lm=1',
        estado: true,
      },
      {
        id: 5,
        cedula: '55667788',
        apellido_nombre: 'Erling Haaland',
        nacionalidad: 'Noruega',
        liga: 'Premier League',
        categoria_id: categoriasData[1].id,
        equipo_id: equiposData[4].id,
        foto: 'https://img.a.transfermarkt.technology/portrait/header/418560-1671435885.jpg?lm=1',
        estado: true,
      },
      {
        id: 6,
        cedula: '99887766',
        apellido_nombre: 'Kevin De Bruyne',
        nacionalidad: 'Bélgica',
        liga: 'Premier League',
        categoria_id: categoriasData[2].id,
        equipo_id: equiposData[5].id,
        foto: 'https://img.a.transfermarkt.technology/portrait/header/88755-1671435885.jpg?lm=1',
        estado: true,
      },
      {
        id: 7,
        cedula: '33445566',
        apellido_nombre: 'Luka Modrić',
        nacionalidad: 'Croacia',
        liga: 'La Liga',
        categoria_id: categoriasData[2].id,
        equipo_id: equiposData[6].id,
        foto: 'https://img.a.transfermarkt.technology/portrait/header/30972-1671435885.jpg?lm=1',
        estado: true,
      },
      {
        id: 8,
        cedula: '77889900',
        apellido_nombre: 'Virgil van Dijk',
        nacionalidad: 'Países Bajos',
        liga: 'Premier League',
        categoria_id: categoriasData[3].id,
        equipo_id: equiposData[7].id,
        foto: 'https://img.a.transfermarkt.technology/portrait/header/134425-1671435885.jpg?lm=1',
        estado: true,
      },
      {
        id: 9,
        cedula: '11224455',
        apellido_nombre: 'Mohamed Salah',
        nacionalidad: 'Egipto',
        liga: 'Premier League',
        categoria_id: categoriasData[3].id,
        equipo_id: equiposData[0].id,
        foto: 'https://img.a.transfermarkt.technology/portrait/header/148455-1671435885.jpg?lm=1',
        estado: true,
      },
      {
        id: 10,
        cedula: '66778899',
        apellido_nombre: 'Robert Lewandowski',
        nacionalidad: 'Polonia',
        liga: 'La Liga',
        categoria_id: categoriasData[0].id,
        equipo_id: equiposData[1].id,
        foto: 'https://img.a.transfermarkt.technology/portrait/header/38272-1671435885.jpg?lm=1',
        estado: true,
      },
    ]).returning();

    console.log(`✅ ${jugadoresData.length} jugadores insertados`);
    console.log('🎉 ¡Datos de prueba insertados exitosamente!');

    return {
      categorias: categoriasData,
      entrenadores: entrenadoresData,
      equipos: equiposData,
      jugadores: jugadoresData,
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