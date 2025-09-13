# Sistema Dinámico de Fixture

## Descripción

El Sistema Dinámico de Fixture es una solución avanzada para la planificación de jornadas deportivas que permite control granular sobre los emparejamientos, descansos y restricciones del torneo.

## Características Principales

### 🎯 Restricciones Dinámicas
- **Descansos forzados**: Puedes indicar qué equipo debe descansar en cada jornada específica
- **Validación automática**: El sistema valida que no se repitan partidos ya jugados
- **Control de descansos consecutivos**: Evita que un equipo descanse dos jornadas seguidas (configurable)

### 📊 Estado Inteligente
- **Historial completo**: Mantiene registro de todos los partidos jugados
- **Balance de descansos**: Rastrea cuántas veces ha descansado cada equipo
- **Jornadas generadas**: Controla qué jornadas ya existen
- **Emparejamientos existentes**: Evita repeticiones automáticamente

### 🔄 Flujo de Confirmación
- **Propuesta previa**: Muestra la jornada propuesta antes de guardarla
- **Validaciones en tiempo real**: Indica errores y advertencias
- **Alternativas**: Ofrece opciones alternativas si la propuesta no es óptima
- **Confirmación manual**: Requiere tu aprobación antes de guardar

## Cómo Usar el Sistema

### 1. Acceder al Sistema Dinámico

1. Ve a la página de detalle de tu torneo
2. Haz clic en la pestaña **"Sistema Dinámico"**
3. Haz clic en **"Generar Jornada Dinámica"**

### 2. Configurar la Jornada

En el modal que se abre, puedes configurar:

#### Equipo que debe descansar
- **Automático**: El sistema selecciona el equipo con menos descansos
- **Manual**: Selecciona un equipo específico de la lista

#### Días entre jornadas
- 3 días
- 7 días (recomendado)
- 14 días

#### Opciones avanzadas
- **Permitir descansos consecutivos**: Marca esta opción si necesitas que un equipo descanse dos jornadas seguidas

### 3. Revisar la Propuesta

El sistema te mostrará:

#### Estadísticas de la Jornada
- Total de encuentros
- Nuevos emparejamientos vs repetidos
- Equipos con descanso
- Opciones futuras disponibles

#### Validaciones
- ✅ **Válida**: La jornada cumple todas las restricciones
- ⚠️ **Advertencias**: Problemas menores que puedes ignorar
- ❌ **Errores**: Problemas que impiden generar la jornada

#### Encuentros Propuestos
- Lista de todos los partidos de la jornada
- Información de cancha y árbitro
- Prioridad de cada emparejamiento (Nuevo/Medio/Repetido)

### 4. Confirmar o Regenerar

- **Confirmar Jornada**: Guarda la propuesta en la base de datos
- **Regenerar**: Genera una nueva propuesta con las mismas configuraciones
- **Cancelar**: Cierra el modal sin guardar cambios

## Funciones Avanzadas

### Regenerar Jornada Existente

1. Ve a la pestaña **"Fixture"**
2. Encuentra la jornada que quieres regenerar
3. Haz clic en el botón de regenerar (🔄) de esa jornada
4. El sistema te mostrará una nueva propuesta
5. Confirma para reemplazar la jornada existente

**Restricciones**: Solo puedes regenerar jornadas que no estén "cerradas" (donde todos los encuentros estén finalizados o en curso).

### Análisis del Torneo

En la pestaña **"Análisis"** puedes ver:

- **Progreso del torneo**: Porcentaje de emparejamientos completados
- **Balance de descansos**: Cuántas veces ha descansado cada equipo
- **Recomendaciones**: Sugerencias del sistema para optimizar el torneo
- **Historial de jornadas**: Lista de todas las jornadas generadas

## Restricciones y Validaciones

### Restricciones Automáticas
- ✅ No repite partidos ya jugados
- ✅ Evita descansos consecutivos (configurable)
- ✅ Mantiene equilibrio en descansos entre equipos
- ✅ Valida que todos los equipos estén incluidos en la jornada

### Validaciones de Estado
- ✅ Verifica que la jornada no exista previamente
- ✅ Confirma que hay suficientes equipos (mínimo 2)
- ✅ Valida que los equipos seleccionados existan

### Advertencias del Sistema
- ⚠️ Desbalance en descansos entre equipos
- ⚠️ Descansos consecutivos (si no están permitidos)
- ⚠️ Pocas opciones futuras disponibles

## Casos de Uso Comunes

### Caso 1: Torneo Nuevo
1. Agrega todos los equipos al torneo
2. Ve a "Sistema Dinámico"
3. Genera la primera jornada (el sistema seleccionará automáticamente el equipo que descansa)
4. Revisa la propuesta y confirma
5. Repite para las siguientes jornadas

### Caso 2: Equipo con Restricciones
1. Si un equipo no puede jugar en una jornada específica
2. En "Sistema Dinámico", selecciona ese equipo para que descanse
3. El sistema generará la jornada respetando esa restricción
4. Revisa y confirma la propuesta

### Caso 3: Regenerar Jornada Problemática
1. Si una jornada tiene problemas (equipos no disponibles, etc.)
2. Ve a "Fixture" y encuentra la jornada
3. Haz clic en regenerar (🔄)
4. El sistema generará una nueva propuesta
5. Confirma para reemplazar la jornada

### Caso 4: Torneo con Descansos Consecutivos
1. Si necesitas que un equipo descanse dos jornadas seguidas
2. Marca "Permitir descansos consecutivos" en la configuración
3. Genera la jornada normalmente
4. El sistema te advertirá pero permitirá la configuración

## Ventajas del Sistema Dinámico

### 🎯 Control Total
- Decides exactamente qué equipo descansa en cada jornada
- Configuras las restricciones según tus necesidades
- Revisas cada propuesta antes de confirmarla

### 🧠 Inteligencia Automática
- Evita repeticiones de partidos automáticamente
- Mantiene el equilibrio de descansos
- Optimiza las opciones futuras

### 📊 Transparencia
- Muestra estadísticas detalladas de cada jornada
- Indica la prioridad de cada emparejamiento
- Proporciona análisis del estado del torneo

### 🔄 Flexibilidad
- Permite regenerar jornadas existentes
- Ofrece alternativas cuando es posible
- Se adapta a diferentes tipos de torneos

## Comparación con el Sistema Tradicional

| Característica | Sistema Tradicional | Sistema Dinámico |
|---|---|---|
| Generación | Automática completa | Jornada por jornada |
| Descansos | Automáticos | Configurables |
| Validación | Básica | Avanzada con advertencias |
| Confirmación | Inmediata | Con revisión previa |
| Regeneración | Completa del fixture | Jornada individual |
| Control | Limitado | Total |

## Recomendaciones de Uso

### Para Torneos Pequeños (4-8 equipos)
- Usa el sistema dinámico para mayor control
- Genera jornada por jornada para ajustar según necesidades
- Revisa el análisis regularmente

### Para Torneos Grandes (9+ equipos)
- Considera usar el sistema tradicional para las primeras jornadas
- Usa el sistema dinámico para ajustes específicos
- Aprovecha las recomendaciones del análisis

### Para Torneos con Restricciones
- Siempre usa el sistema dinámico
- Configura descansos forzados según necesidades
- Permite descansos consecutivos si es necesario

## Solución de Problemas

### Error: "La jornada X ya existe"
- La jornada ya fue generada previamente
- Usa la función de regenerar si quieres cambiarla

### Error: "Se necesitan al menos 2 equipos"
- Agrega más equipos al torneo antes de generar jornadas

### Advertencia: "Descansos consecutivos"
- Un equipo descansaría dos jornadas seguidas
- Marca "Permitir descansos consecutivos" si es necesario

### Advertencia: "Desbalance en descansos"
- Algunos equipos han descansado más que otros
- Considera forzar descansos para equipos con menos descansos

## Soporte Técnico

Si encuentras problemas con el sistema:

1. Revisa las validaciones y advertencias mostradas
2. Consulta la pestaña "Análisis" para entender el estado del torneo
3. Usa la función de regenerar si una jornada tiene problemas
4. Verifica que todos los equipos estén correctamente agregados al torneo

El sistema está diseñado para ser intuitivo y guiarte a través del proceso de planificación de tu torneo deportivo.
