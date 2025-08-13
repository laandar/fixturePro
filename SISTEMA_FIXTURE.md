# Sistema de Fixture Deportivo

## Descripción

Este sistema permite crear y gestionar torneos deportivos con generación automática de fixture usando el algoritmo Round Robin. El sistema incluye gestión completa de equipos, torneos, encuentros y estadísticas.

## Características Principales

### 🏆 Gestión de Torneos
- Crear torneos con diferentes tipos (Liga, Eliminación, Grupos)
- Configurar fechas de inicio y fin
- Opción de revancha (ida y vuelta)
- Estados del torneo (Planificado, En Curso, Finalizado, Cancelado)

### ⚽ Algoritmo Round Robin
- Generación automática de fixture
- Distribución equilibrada de encuentros
- Soporte para número impar de equipos (equipo BYE)
- Rotación automática de local/visitante

### 📊 Gestión de Encuentros
- Programación automática de fechas
- Asignación de canchas y árbitros
- Registro de resultados
- Estados de encuentros (Programado, En Curso, Finalizado, etc.)

### 📈 Estadísticas y Tablas
- Tabla de posiciones automática
- Cálculo de puntos, goles, diferencia
- Estadísticas por equipo y torneo

## Estructura de la Base de Datos

### Tablas Principales

#### `torneos`
- Información básica del torneo
- Configuración de tipo y revancha
- Fechas de inicio y fin

#### `equipos_torneo`
- Relación entre equipos y torneos
- Estadísticas acumuladas por equipo
- Posición en la tabla

#### `encuentros`
- Todos los partidos del torneo
- Resultados y estados
- Información de cancha y árbitro

## Cómo Usar el Sistema

### 1. Crear un Torneo

1. Ve a la sección "Torneos"
2. Haz clic en "Crear Nuevo Torneo"
3. Completa la información:
   - **Nombre**: Nombre del torneo
   - **Descripción**: Descripción opcional
   - **Categoría**: Categoría deportiva
   - **Fecha Inicio**: Fecha de inicio del torneo
   - **Fecha Fin**: Fecha de finalización
   - **Tipo**: Liga, Eliminación o Grupos
   - **Permite Revancha**: Si incluye partidos de ida y vuelta

### 2. Agregar Equipos al Torneo

1. Accede al detalle del torneo
2. Ve a la pestaña "Equipos Participantes"
3. Haz clic en "Agregar Equipos"
4. Selecciona los equipos que participarán
5. Confirma la selección

### 3. Generar el Fixture

1. Con al menos 2 equipos agregados
2. Haz clic en "Generar Fixture"
3. El sistema creará automáticamente:
   - Todas las jornadas necesarias
   - Distribución equilibrada de partidos
   - Fechas programadas
   - Asignación de canchas y árbitros

### 4. Gestionar Encuentros

1. Ve a la pestaña "Fixture"
2. Visualiza todos los encuentros por jornada
3. Haz clic en el botón de editar para:
   - Registrar resultados
   - Cambiar estado del encuentro
   - Agregar observaciones

### 5. Ver Estadísticas

1. Ve a la pestaña "Tabla de Posiciones"
2. Visualiza la clasificación automática
3. Los puntos se calculan automáticamente:
   - Victoria: 3 puntos
   - Empate: 1 punto
   - Derrota: 0 puntos

## Algoritmo Round Robin

### Cómo Funciona

1. **Distribución Inicial**: Los equipos se distribuyen en pares
2. **Rotación**: En cada jornada, los equipos rotan posiciones
3. **Equilibrio**: Cada equipo juega contra todos los demás
4. **Local/Visitante**: Se alterna automáticamente

### Ejemplo con 4 Equipos

**Jornada 1:**
- Equipo A vs Equipo D
- Equipo B vs Equipo C

**Jornada 2:**
- Equipo A vs Equipo C
- Equipo D vs Equipo B

**Jornada 3:**
- Equipo A vs Equipo B
- Equipo C vs Equipo D

### Con Revancha

Si se habilita la revancha, se generan el doble de jornadas con los partidos invertidos.

## Configuración Avanzada

### Personalización de Fixture

El sistema permite configurar:
- **Días entre jornadas**: Espaciado de partidos
- **Canchas disponibles**: Lista de canchas para asignar
- **Árbitros**: Lista de árbitros disponibles
- **Fechas específicas**: Programación personalizada

### Estados de Encuentros

- **Programado**: Encuentro planificado
- **En Curso**: Partido en desarrollo
- **Finalizado**: Partido completado con resultado
- **Cancelado**: Encuentro cancelado
- **Aplazado**: Postergado para otra fecha

## API y Funciones Principales

### Generación de Fixture

```typescript
import { generateFixture } from '@/lib/fixture-generator'

const encuentros = generateFixture(equipos, torneoId, {
  permiteRevancha: true,
  fechaInicio: new Date(),
  diasEntreJornadas: 7,
  canchas: ['Cancha Principal', 'Cancha Secundaria'],
  arbitros: ['Árbitro 1', 'Árbitro 2', 'Árbitro 3']
})
```

### Validación de Fixture

```typescript
const generator = new FixtureGenerator(equipos)
const validation = generator.validateFixture(encuentros)

if (!validation.isValid) {
  console.log('Errores:', validation.errors)
}
```

## Componentes Reutilizables

### FixtureDisplay

Componente para mostrar el fixture de manera visual:

```typescript
import FixtureDisplay from '@/components/FixtureDisplay'

<FixtureDisplay 
  encuentros={encuentros}
  onUpdateEncuentro={handleUpdateEncuentro}
  showActions={true}
/>
```

## Consideraciones Técnicas

### Rendimiento

- El algoritmo Round Robin es eficiente O(n)
- Los encuentros se generan en lotes
- Las estadísticas se calculan en tiempo real

### Escalabilidad

- Soporta cualquier número de equipos
- Manejo automático de equipos impares
- Optimización para torneos grandes

### Validaciones

- Verificación de emparejamientos únicos
- Validación de fechas coherentes
- Control de estados de encuentros

## Próximas Mejoras

- [ ] Torneos por eliminación directa
- [ ] Sistema de grupos y playoffs
- [ ] Estadísticas avanzadas
- [ ] Exportación de fixture a PDF
- [ ] Notificaciones de encuentros
- [ ] API REST completa
- [ ] Aplicación móvil

## Soporte

Para dudas o problemas con el sistema de fixture, consulta la documentación técnica o contacta al equipo de desarrollo.
