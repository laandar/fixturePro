import { FixtureGenerator, generateFixture } from './fixture-generator';
import type { EquipoWithRelations, NewEncuentro } from '@/db/types';

// Mock de equipos para pruebas
const mockEquipos: EquipoWithRelations[] = [
  {
    id: 1,
    nombre: 'Atletico',
    categoria_id: null,
    entrenador_id: null,
    imagen_equipo: null,
    estado: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    categoria: null,
    entrenador: null,
  },
  {
    id: 2,
    nombre: 'Manchester',
    categoria_id: null,
    entrenador_id: null,
    imagen_equipo: null,
    estado: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    categoria: null,
    entrenador: null,
  },
  {
    id: 3,
    nombre: 'Amigos',
    categoria_id: null,
    entrenador_id: null,
    imagen_equipo: null,
    estado: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    categoria: null,
    entrenador: null,
  },
  {
    id: 4,
    nombre: 'Barcelona',
    categoria_id: null,
    entrenador_id: null,
    imagen_equipo: null,
    estado: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    categoria: null,
    entrenador: null,
  },
  {
    id: 5,
    nombre: 'Canarias',
    categoria_id: null,
    entrenador_id: null,
    imagen_equipo: null,
    estado: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    categoria: null,
    entrenador: null,
  },
  {
    id: 6,
    nombre: 'Red Bulls',
    categoria_id: null,
    entrenador_id: null,
    imagen_equipo: null,
    estado: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    categoria: null,
    entrenador: null,
  },
  {
    id: 7,
    nombre: 'Millonarios',
    categoria_id: null,
    entrenador_id: null,
    imagen_equipo: null,
    estado: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    categoria: null,
    entrenador: null,
  },
  {
    id: 8,
    nombre: 'Canarias B',
    categoria_id: null,
    entrenador_id: null,
    imagen_equipo: null,
    estado: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    categoria: null,
    entrenador: null,
  },
  {
    id: 9,
    nombre: 'UDEF',
    categoria_id: null,
    entrenador_id: null,
    imagen_equipo: null,
    estado: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    categoria: null,
    entrenador: null,
  },
];

// Mock de encuentros ya jugados (Jornada 1)
const mockEncuentrosJugados: NewEncuentro[] = [
  {
    torneo_id: 1,
    equipo_local_id: 2, // Manchester
    equipo_visitante_id: 6, // Red Bulls
    fecha_programada: new Date('2025-08-06'),
    cancha: 'Cancha Principal',
    arbitro: 'Árbitro 1',
    estado: 'finalizado',
    jornada: 1,
    fase: 'regular',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    torneo_id: 1,
    equipo_local_id: 3, // Amigos
    equipo_visitante_id: 7, // Millonarios
    fecha_programada: new Date('2025-08-06'),
    cancha: 'Cancha Principal',
    arbitro: 'Árbitro 2',
    estado: 'finalizado',
    jornada: 1,
    fase: 'regular',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    torneo_id: 1,
    equipo_local_id: 4, // Barcelona
    equipo_visitante_id: 8, // Canarias B
    fecha_programada: new Date('2025-08-06'),
    cancha: 'Cancha Principal',
    arbitro: 'Árbitro 3',
    estado: 'finalizado',
    jornada: 1,
    fase: 'regular',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    torneo_id: 1,
    equipo_local_id: 5, // Canarias
    equipo_visitante_id: 9, // UDEF
    fecha_programada: new Date('2025-08-06'),
    cancha: 'Cancha Principal',
    arbitro: 'Árbitro 1',
    estado: 'finalizado',
    jornada: 1,
    fase: 'regular',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export async function testFixtureGenerator() {
  console.log('🧪 Iniciando pruebas del generador de fixture...\n');

  // Prueba 1: Generar fixture desde jornada 2 con restricción UDEF
  console.log('📋 Prueba 1: Generar fixture desde jornada 2 con UDEF restringido');
  
  const fixtureResult = await generateFixture(mockEquipos, 1, {
    fechaInicio: new Date('2025-08-20'),
    diasEntreJornadas: 7,
    jornadaInicial: 2,
    unavailableByJornada: {
      2: [9] // UDEF no juega en jornada 2
    },
    encuentrosExistentes: mockEncuentrosJugados,
  });

  console.log(`✅ Fixture generado: ${fixtureResult.encuentros.length} encuentros`);
  console.log(`📊 Equipos que descansan:`, fixtureResult.equiposDescansan);

  // Verificar que no hay repeticiones
  const emparejamientos = new Set<string>();
  const repeticiones: string[] = [];

  fixtureResult.encuentros.forEach(encuentro => {
    const emparejamiento = `${encuentro.equipo_local_id}-${encuentro.equipo_visitante_id}`;
    const emparejamientoInverso = `${encuentro.equipo_visitante_id}-${encuentro.equipo_local_id}`;
    
    if (emparejamientos.has(emparejamiento) || emparejamientos.has(emparejamientoInverso)) {
      repeticiones.push(`${encuentro.equipo_local_id} vs ${encuentro.equipo_visitante_id}`);
    }
    
    emparejamientos.add(emparejamiento);
  });

  // Verificar repeticiones con encuentros existentes
  mockEncuentrosJugados.forEach(encuentroExistente => {
    fixtureResult.encuentros.forEach(encuentroNuevo => {
      if (
        (encuentroNuevo.equipo_local_id === encuentroExistente.equipo_local_id && 
         encuentroNuevo.equipo_visitante_id === encuentroExistente.equipo_visitante_id) ||
        (encuentroNuevo.equipo_local_id === encuentroExistente.equipo_visitante_id && 
         encuentroNuevo.equipo_visitante_id === encuentroExistente.equipo_local_id)
      ) {
        repeticiones.push(`Repetición con existente: ${encuentroNuevo.equipo_local_id} vs ${encuentroNuevo.equipo_visitante_id}`);
      }
    });
  });

  if (repeticiones.length === 0) {
    console.log('✅ No se encontraron repeticiones de emparejamientos');
  } else {
    console.log('❌ Se encontraron repeticiones:');
    repeticiones.forEach(rep => console.log(`   - ${rep}`));
  }

  // Mostrar encuentros generados por jornada
  const encuentrosPorJornada = fixtureResult.encuentros.reduce((acc, encuentro) => {
    const jornada = encuentro.jornada || 0;
    if (!acc[jornada]) acc[jornada] = [];
    acc[jornada].push(encuentro);
    return acc;
  }, {} as Record<number, NewEncuentro[]>);

  console.log('\n📅 Encuentros generados por jornada:');
  Object.keys(encuentrosPorJornada).sort().forEach(jornada => {
    console.log(`\n🏆 Jornada ${jornada}:`);
    encuentrosPorJornada[parseInt(jornada)].forEach(encuentro => {
      const equipoLocal = mockEquipos.find(e => e.id === encuentro.equipo_local_id);
      const equipoVisitante = mockEquipos.find(e => e.id === encuentro.equipo_visitante_id);
      console.log(`   ${equipoLocal?.nombre} vs ${equipoVisitante?.nombre}`);
    });
  });

  // Validar el fixture
  const generator = new FixtureGenerator(mockEquipos, {
    encuentrosExistentes: mockEncuentrosJugados
  }, 1);
  
  const validation = generator.validateFixture(fixtureResult.encuentros);
  console.log('\n🔍 Validación del fixture:');
  if (validation.isValid) {
    console.log('✅ Fixture válido');
  } else {
    console.log('❌ Fixture inválido:');
    validation.errors.forEach(error => console.log(`   - ${error}`));
  }

  return {
    success: repeticiones.length === 0 && validation.isValid,
    repeticiones,
    validationErrors: validation.errors,
    fixtureResult
  };
}

// Ejecutar prueba si se llama directamente
if (require.main === module) {
  testFixtureGenerator().then(result => {
    console.log('\n🎯 Resultado final:', result.success ? 'PASÓ' : 'FALLÓ');
    process.exit(result.success ? 0 : 1);
  }).catch(error => {
    console.error('❌ Error en la prueba:', error);
    process.exit(1);
  });
}
