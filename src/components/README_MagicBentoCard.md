# MagicBentoCard Component

Un componente reutilizable para mostrar encuentros deportivos con el estilo Magic Bento (glassmorphism).

## Uso

```tsx
import MagicBentoCard from '@/components/MagicBentoCard'
import type { EncuentroWithRelations } from '@/db/types'

// Ejemplo básico
<MagicBentoCard encuentro={encuentro} />

// Con callback para gestión de jugadores
<MagicBentoCard 
  encuentro={encuentro}
  onManagePlayers={(encuentro) => {
    router.push(`/gestion-jugadores?torneo=${torneoId}&jornada=${encuentro.jornada}`)
  }}
/>

// Con múltiples callbacks
<MagicBentoCard 
  encuentro={encuentro}
  onManagePlayers={(encuentro) => handleManagePlayers(encuentro)}
  onEditEncuentro={(encuentro) => handleEditEncuentro(encuentro)}
  onDeleteEncuentro={(encuentro) => handleDeleteEncuentro(encuentro)}
/>
```

## Props

| Prop | Tipo | Requerido | Descripción |
|------|------|-----------|-------------|
| `encuentro` | `EncuentroWithRelations` | ✅ | Datos del encuentro |
| `onManagePlayers` | `(encuentro: EncuentroWithRelations) => void` | ❌ | Callback para gestionar jugadores |
| `onEditEncuentro` | `(encuentro: EncuentroWithRelations) => void` | ❌ | Callback para editar encuentro |
| `onDeleteEncuentro` | `(encuentro: EncuentroWithRelations) => void` | ❌ | Callback para eliminar encuentro |

## Características

- **Glassmorphism**: Efecto de cristal con `backdrop-filter`
- **Animaciones suaves**: Hover con elevación y escala
- **Gradientes modernos**: En badges y texto
- **Responsive**: Se adapta a diferentes tamaños
- **Accesible**: Tooltips y navegación por teclado

## Estilos aplicados

- Bordes redondeados (20px)
- Sombras glassmorphism
- Gradientes en badges de equipos
- Texto con gradiente
- Efectos de hover suaves
- Transiciones CSS avanzadas
