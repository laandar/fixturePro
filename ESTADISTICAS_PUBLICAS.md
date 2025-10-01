# Estadísticas Públicas de Torneos

## Descripción

Se ha implementado un sistema completo de estadísticas públicas que permite a cualquier usuario (no solo los del sistema) ver las tablas de posiciones y goleadores de los torneos.

## Características Implementadas

### 1. Página Principal de Estadísticas (`/estadisticas`)
- Lista todos los torneos activos y finalizados
- Diseño moderno con cards para cada torneo
- Información básica: nombre, categoría, fechas, estado
- Botón para acceder a las estadísticas detalladas

### 2. Estadísticas Detalladas del Torneo (`/estadisticas/[id]`)
- **Header del torneo**: Información completa con diseño atractivo
- **Estadísticas generales**: Resumen con métricas clave
- **Navegación por pestañas**: Tabla de posiciones y tabla de goleadores
- **Funcionalidades adicionales**:
  - Botón de compartir (usa Web Share API con fallback)
  - Botón de exportar (preparado para futuras implementaciones)

### 3. Tabla de Posiciones
- **Diseño profesional** con iconos para las primeras 3 posiciones
- **Información completa**:
  - Posición, equipo, puntos
  - Partidos jugados, ganados, empatados, perdidos
  - Goles a favor, en contra, diferencia de goles
- **Indicadores visuales**:
  - Colores diferentes para los primeros 3 lugares
  - Badges para puntos y diferencia de goles
  - Imágenes de equipos y entrenadores
- **Leyenda explicativa** al final

### 4. Tabla de Goleadores
- **Ranking de jugadores** ordenado por total de goles
- **Información detallada**:
  - Posición, jugador, equipo
  - Goles de campo y goles de penal por separado
  - Total de goles
- **Indicadores visuales**:
  - Iconos especiales para los primeros 3 goleadores
  - Badges de colores para diferentes tipos de goles
  - Imágenes de jugadores y equipos
- **Estadísticas adicionales**: Resumen de goles totales por tipo

## Estructura de Archivos

```
src/app/estadisticas/
├── page.tsx                          # Página principal con lista de torneos
├── [id]/
│   ├── page.tsx                      # Página de estadísticas del torneo
│   └── components/
│       ├── EstadisticasTorneo.tsx    # Componente principal
│       ├── TablaPosiciones.tsx       # Tabla de posiciones
│       └── TablaGoleadores.tsx       # Tabla de goleadores
```

## Consultas de Base de Datos

Se agregaron nuevas consultas en `src/db/queries.ts`:

### `estadisticasQueries`
- `getTablaPosiciones(torneoId)`: Obtiene la tabla de posiciones ordenada
- `getTablaGoleadores(torneoId)`: Obtiene la tabla de goleadores con estadísticas
- `getTorneoPublico(torneoId)`: Información básica del torneo
- `getTorneosPublicos()`: Lista de torneos activos/finalizados

## Diseño y UX

### Características del Diseño
- **Responsive**: Funciona perfectamente en móviles, tablets y desktop
- **Moderno**: Usa Bootstrap 5 con componentes personalizados
- **Accesible**: Colores contrastantes y navegación clara
- **Intuitivo**: Navegación por pestañas y iconos descriptivos

### Colores y Estados
- **Primer lugar**: Oro (warning)
- **Segundo lugar**: Plata (secondary)
- **Tercer lugar**: Bronce (warning)
- **Estados de torneo**: 
  - En curso: Verde (success)
  - Finalizado: Azul (primary)
  - Planificado: Gris (secondary)
  - Cancelado: Rojo (danger)

## Integración con Landing Page

Se agregó un botón "Estadísticas" en el header de la landing page (`/landing`) que permite acceso directo a las estadísticas públicas.

## Funcionalidades Futuras

### Preparado para implementar:
1. **Exportar a PDF/Excel**: Botón ya implementado, solo falta la lógica
2. **Compartir en redes sociales**: Web Share API implementado
3. **Estadísticas avanzadas**: 
   - Gráficos de progreso
   - Comparativas entre equipos
   - Historial de partidos
4. **Notificaciones**: Cuando cambien las posiciones
5. **Modo oscuro**: Compatible con el sistema de temas existente

## Uso

### Para Usuarios Públicos
1. Visitar `/estadisticas` para ver todos los torneos disponibles
2. Hacer clic en "Ver Estadísticas" en cualquier torneo
3. Navegar entre "Tabla de Posiciones" y "Tabla de Goleadores"
4. Compartir la página usando el botón de compartir

### Para Administradores
- Las estadísticas se actualizan automáticamente cuando se registran resultados
- No se requiere configuración adicional
- Los torneos aparecen automáticamente cuando están "en_curso" o "finalizado"

## Rendimiento

- **Consultas optimizadas**: Solo carga los datos necesarios
- **Lazy loading**: Componentes se cargan según se necesiten
- **Caché**: Next.js maneja el caché automáticamente
- **Responsive images**: Imágenes optimizadas para diferentes dispositivos

## Seguridad

- **Solo lectura**: No permite modificar datos
- **Datos públicos**: Solo muestra información de torneos activos/finalizados
- **Sin autenticación**: Acceso libre para todos los usuarios
- **Validación**: Verifica que los torneos existan antes de mostrar datos
