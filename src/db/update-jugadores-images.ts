import { db } from './index';
import { jugadores } from './schema';
import { eq } from 'drizzle-orm';

// URLs de imágenes temporales de jugadores famosos
const jugadoresConImagenes = [
  {
    cedula: '12345678',
    foto: 'https://img.a.transfermarkt.technology/portrait/header/28003-1671435885.jpg?lm=1'
  },
  {
    cedula: '87654321', 
    foto: 'https://img.a.transfermarkt.technology/portrait/header/8198-1671435885.jpg?lm=1'
  },
  {
    cedula: '11223344',
    foto: 'https://img.a.transfermarkt.technology/portrait/header/68290-1671435885.jpg?lm=1'
  },
  {
    cedula: '44332211',
    foto: 'https://img.a.transfermarkt.technology/portrait/header/342229-1671435885.jpg?lm=1'
  },
  {
    cedula: '55667788',
    foto: 'https://img.a.transfermarkt.technology/portrait/header/418560-1671435885.jpg?lm=1'
  },
  {
    cedula: '99887766',
    foto: 'https://img.a.transfermarkt.technology/portrait/header/88755-1671435885.jpg?lm=1'
  },
  {
    cedula: '33445566',
    foto: 'https://img.a.transfermarkt.technology/portrait/header/30972-1671435885.jpg?lm=1'
  },
  {
    cedula: '77889900',
    foto: 'https://img.a.transfermarkt.technology/portrait/header/134425-1671435885.jpg?lm=1'
  },
  {
    cedula: '11224455',
    foto: 'https://img.a.transfermarkt.technology/portrait/header/148455-1671435885.jpg?lm=1'
  },
  {
    cedula: '66778899',
    foto: 'https://img.a.transfermarkt.technology/portrait/header/38272-1671435885.jpg?lm=1'
  }
];

export async function updateJugadoresImages() {
  try {
    console.log('🔄 Actualizando imágenes de jugadores...');
    
    for (const jugador of jugadoresConImagenes) {
      await db.update(jugadores)
        .set({ foto: jugador.foto })
        .where(eq(jugadores.cedula, jugador.cedula));
      
      console.log(`✅ Imagen actualizada para cédula: ${jugador.cedula}`);
    }
    
    console.log('🎉 ¡Imágenes de jugadores actualizadas exitosamente!');
  } catch (error) {
    console.error('❌ Error al actualizar imágenes:', error);
    throw error;
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  updateJugadoresImages()
    .then(() => {
      console.log('✅ Script de actualización completado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error en script de actualización:', error);
      process.exit(1);
    });
}
