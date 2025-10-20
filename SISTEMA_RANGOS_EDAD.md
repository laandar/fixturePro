# Sistema de Rangos de Edad para Categorías

## Descripción

Se ha implementado un sistema completo de rangos de edad para las categorías de jugadores, permitiendo configurar edades mínimas y máximas con precisión de años y meses.

## Características Implementadas

### 1. Campos de Base de Datos

**Tabla `categorias`:**
- `edad_minima_anos`: Edad mínima en años
- `edad_minima_meses`: Meses adicionales para edad mínima (0-11)
- `edad_maxima_anos`: Edad máxima en años  
- `edad_maxima_meses`: Meses adicionales para edad máxima (0-11)

**Tabla `jugadores`:**
- `fecha_nacimiento`: Fecha de nacimiento del jugador

### 2. Funciones Auxiliares (`src/lib/age-helpers.ts`)

#### Cálculo de Edad
```typescript
import { calcularEdad } from '@/lib/age-helpers'

const edad = calcularEdad(new Date('2010-05-15'))
// Resultado: { anos: 13, meses: 8, dias: 15 }
```

#### Validación de Rangos
```typescript
import { verificarRangoEdad, RangoEdad } from '@/lib/age-helpers'

const rango: RangoEdad = {
  edadMinimaAnos: 6,
  edadMinimaMeses: 0,
  edadMaximaAnos: 12,
  edadMaximaMeses: 4
}

const cumpleRango = verificarRangoEdad(fechaNacimiento, rango)
```

#### Formateo de Edades
```typescript
import { formatearRangoEdad, formatearEdad } from '@/lib/age-helpers'

const rangoFormateado = formatearRangoEdad(rango)
// Resultado: "6 años - 12 años y 4 meses"

const edadFormateada = formatearEdad(8, 3)
// Resultado: "8 años y 3 meses"
```

### 3. Interfaz de Usuario

#### Categorías
- **Formulario de creación/edición**: Campos para configurar rangos de edad
- **Tabla de categorías**: Columna que muestra el rango de edad configurado
- **Validación**: Los rangos se validan para asegurar coherencia (mínimo ≤ máximo)

#### Jugadores
- **Campo de fecha de nacimiento**: Input de tipo `date`
- **Validación automática**: Al crear/editar jugadores, se verifica que cumplan con el rango de su categoría
- **Mensajes de error descriptivos**: Información clara cuando un jugador no cumple con el rango

### 4. Validaciones Implementadas

#### Al Crear/Editar Categorías
- La edad mínima no puede ser mayor que la edad máxima
- Los meses deben estar entre 0 y 11
- Los años deben ser valores positivos

#### Al Crear/Editar Jugadores
- Si la categoría tiene rango definido y el jugador tiene fecha de nacimiento, se valida automáticamente
- Mensajes de error específicos indican el problema y la solución

## Ejemplo de Uso: Categoría Sub 12

### Configuración
- **Edad mínima**: 6 años, 0 meses
- **Edad máxima**: 12 años, 4 meses
- **Rango formateado**: "6 años - 12 años y 4 meses"

### Validación
Un jugador nacido el 15 de marzo de 2010:
- **Edad actual**: 13 años y 8 meses (aproximadamente)
- **Resultado**: ❌ No cumple (excede el máximo de 12 años y 4 meses)

Un jugador nacido el 15 de marzo de 2018:
- **Edad actual**: 5 años y 8 meses (aproximadamente)  
- **Resultado**: ❌ No cumple (no alcanza el mínimo de 6 años)

Un jugador nacido el 15 de marzo de 2012:
- **Edad actual**: 11 años y 8 meses (aproximadamente)
- **Resultado**: ✅ Cumple con el rango

## Categorías Comunes Predefinidas

El sistema incluye rangos predefinidos para categorías comunes:

```typescript
import { crearRangoCategoriaComun } from '@/lib/age-helpers'

const rangoSub12 = crearRangoCategoriaComun('Sub 12')
// Resultado: { edadMinimaAnos: 10, edadMinimaMeses: 0, edadMaximaAnos: 12, edadMaximaMeses: 4 }
```

Categorías disponibles:
- Sub 6: 4-6 años
- Sub 8: 6-8 años  
- Sub 10: 8-10 años
- Sub 12: 10-12 años y 4 meses
- Sub 14: 12-14 años
- Sub 16: 14-16 años
- Sub 18: 16-18 años
- Sub 20: 18-20 años

## Scripts de Población

### Crear Categoría Sub 12
```bash
npx tsx src/db/seed-categoria-sub12.ts
```

Este script crea automáticamente una categoría "Sub 12" con el rango de edad solicitado (6 años mínimo, 12 años y 4 meses máximo).

## Migración de Base de Datos

La migración `0029_silly_barracuda.sql` agrega los nuevos campos:

```sql
ALTER TABLE "categorias" ADD COLUMN "edad_minima_anos" integer;
ALTER TABLE "categorias" ADD COLUMN "edad_minima_meses" integer DEFAULT 0;
ALTER TABLE "categorias" ADD COLUMN "edad_maxima_anos" integer;
ALTER TABLE "categorias" ADD COLUMN "edad_maxima_meses" integer DEFAULT 0;
ALTER TABLE "jugadores" ADD COLUMN "fecha_nacimiento" date;
```

## Beneficios del Sistema

1. **Precisión**: Permite configurar rangos exactos con meses
2. **Flexibilidad**: Cada categoría puede tener su propio rango
3. **Validación automática**: Previene errores de inscripción
4. **Interfaz intuitiva**: Formularios claros y fáciles de usar
5. **Mensajes descriptivos**: Errores claros y soluciones sugeridas
6. **Compatibilidad**: Funciona con el sistema existente sin romper funcionalidad

## Próximos Pasos

1. Ejecutar la migración de base de datos
2. Crear categorías con rangos de edad apropiados
3. Actualizar jugadores existentes con fechas de nacimiento
4. Configurar validaciones adicionales según necesidades específicas
