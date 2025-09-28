# Magic Bento Cards System

Sistema de componentes reutilizables basado en el diseño Magic Bento (glassmorphism) para crear cards modernas y elegantes.

## Componentes Disponibles

### 1. MagicBentoCard (Componente Base)
Componente genérico que puede ser usado para cualquier tipo de card.

#### Props
```typescript
interface MagicBentoCardProps {
  children: ReactNode                    // Contenido de la card
  className?: string                     // Clases CSS adicionales
  style?: React.CSSProperties           // Estilos inline adicionales
  onClick?: () => void                  // Callback para click en la card
  onMouseEnter?: () => void             // Callback para hover
  onMouseLeave?: () => void             // Callback para salir del hover
  actions?: Array<{                     // Array de botones de acción
    icon: ReactNode                     // Ícono del botón
    onClick: () => void                 // Callback del botón
    variant?: ButtonVariant             // Variante del botón
    title?: string                      // Tooltip del botón
  }>
  header?: ReactNode                    // Contenido del header
  footer?: ReactNode                    // Contenido del footer
  size?: 'sm' | 'md' | 'lg'            // Tamaño de la card
  variant?: 'default' | 'glass' | 'solid' | 'gradient' // Estilo visual
}
```

#### Variantes de Estilo
- **`glass`**: Efecto glassmorphism con blur (por defecto)
- **`solid`**: Fondo sólido con sombra suave
- **`gradient`**: Fondo con gradiente colorido
- **`default`**: Similar a glass pero sin blur

#### Tamaños
- **`sm`**: Pequeño (12px padding, 12px border-radius)
- **`md`**: Mediano (16px padding, 20px border-radius) - por defecto
- **`lg`**: Grande (24px padding, 24px border-radius)

### 2. EncuentroCard (Para Encuentros Deportivos)
Componente específico para mostrar encuentros deportivos.

#### Props
```typescript
interface EncuentroCardProps {
  encuentro: EncuentroWithRelations     // Datos del encuentro
  onManagePlayers?: (encuentro) => void // Callback para gestionar jugadores
  onDeleteEncuentro?: (encuentro) => void // Callback para eliminar encuentro
  onEditHorario?: (encuentro) => void   // Callback para configurar horario y cancha
  variant?: 'glass' | 'solid' | 'gradient' // Estilo visual
  size?: 'sm' | 'md' | 'lg'            // Tamaño de la card
}
```

### 3. ProductCard (Para Productos)
Componente específico para mostrar productos en un catálogo.

#### Props
```typescript
interface ProductCardProps {
  product: Product                      // Datos del producto
  onAddToCart?: (product) => void       // Callback para agregar al carrito
  onViewDetails?: (product) => void     // Callback para ver detalles
  onEdit?: (product) => void            // Callback para editar producto
  variant?: 'glass' | 'solid' | 'gradient' // Estilo visual
  size?: 'sm' | 'md' | 'lg'            // Tamaño de la card
}
```

### 4. UserCard (Para Usuarios)
Componente específico para mostrar información de usuarios.

#### Props
```typescript
interface UserCardProps {
  user: User                            // Datos del usuario
  onEdit?: (user) => void               // Callback para editar usuario
  onDelete?: (user) => void             // Callback para eliminar usuario
  onViewProfile?: (user) => void        // Callback para ver perfil
  variant?: 'glass' | 'solid' | 'gradient' // Estilo visual
  size?: 'sm' | 'md' | 'lg'            // Tamaño de la card
}
```

## Ejemplos de Uso

### MagicBentoCard Genérico
```tsx
import MagicBentoCard from '@/components/MagicBentoCard'

// Card simple
<MagicBentoCard>
  <h5>Mi Card</h5>
  <p>Contenido de la card</p>
</MagicBentoCard>

// Card con acciones
<MagicBentoCard 
  variant="gradient"
  size="lg"
  actions={[
    { icon: '👍', onClick: () => console.log('Like'), title: 'Me gusta' },
    { icon: '👎', onClick: () => console.log('Dislike'), title: 'No me gusta' }
  ]}
>
  <h5>Card con Acciones</h5>
  <p>Esta card tiene botones de acción</p>
</MagicBentoCard>

// Card con header y footer
<MagicBentoCard 
  header={<h6>Header</h6>}
  footer={<small>Footer</small>}
>
  <p>Contenido principal</p>
</MagicBentoCard>
```

### EncuentroCard
```tsx
import EncuentroCard from '@/components/EncuentroCard'

<EncuentroCard 
  encuentro={encuentro}
  onManagePlayers={(encuentro) => {
    router.push(`/gestion-jugadores?id=${encuentro.id}`)
  }}
  onEditHorario={(encuentro) => {
    handleSeleccionarHorario(encuentro)
  }}
  variant="glass"
/>
```

### ProductCard
```tsx
import ProductCard from '@/components/ProductCard'

<ProductCard 
  product={product}
  onAddToCart={(product) => addToCart(product.id)}
  onViewDetails={(product) => viewProduct(product.id)}
  variant="solid"
/>
```

### UserCard
```tsx
import UserCard from '@/components/UserCard'

<UserCard 
  user={user}
  onEdit={(user) => editUser(user.id)}
  onViewProfile={(user) => viewProfile(user.id)}
  variant="glass"
/>
```

## Crear Tu Propio Componente

```tsx
import MagicBentoCard from '@/components/MagicBentoCard'

interface MiCardProps {
  data: MiTipoDeDatos
  onAction?: (data: MiTipoDeDatos) => void
  variant?: 'glass' | 'solid' | 'gradient'
}

export default function MiCard({ data, onAction, variant = 'glass' }: MiCardProps) {
  const actions = onAction ? [{
    icon: '🚀',
    onClick: () => onAction(data),
    variant: 'outline-primary' as const,
    title: 'Mi Acción'
  }] : []
  
  return (
    <MagicBentoCard 
      variant={variant}
      actions={actions}
    >
      {/* Tu contenido personalizado aquí */}
      <h5>{data.titulo}</h5>
      <p>{data.descripcion}</p>
    </MagicBentoCard>
  )
}
```

## Características del Sistema

- ✅ **Reutilizable**: Un componente base para múltiples casos de uso
- ✅ **Flexible**: Múltiples variantes y tamaños
- ✅ **Accesible**: Tooltips y navegación por teclado
- ✅ **Moderno**: Efectos glassmorphism y animaciones suaves
- ✅ **TypeScript**: Completamente tipado
- ✅ **Responsive**: Se adapta a diferentes tamaños de pantalla
- ✅ **Extensible**: Fácil de personalizar y extender

## Estilos Incluidos

- Efectos glassmorphism con `backdrop-filter`
- Gradientes modernos en textos y elementos
- Animaciones suaves de hover
- Sombras dinámicas
- Bordes redondeados
- Transiciones CSS avanzadas
- Botones con efectos de blur
