'use client'
import MagicBentoCard from './MagicBentoCard'

interface Product {
  id: number
  name: string
  price: number
  image?: string
  description?: string
  category?: string
}

interface ProductCardProps {
  product: Product
  onAddToCart?: (product: Product) => void
  onViewDetails?: (product: Product) => void
  onEdit?: (product: Product) => void
  variant?: 'glass' | 'solid' | 'gradient'
  size?: 'sm' | 'md' | 'lg'
}

export default function ProductCard({ 
  product, 
  onAddToCart,
  onViewDetails,
  onEdit,
  variant = 'solid',
  size = 'md'
}: ProductCardProps) {
  
  const actions = []
  
  if (onAddToCart) {
    actions.push({
      icon: '🛒',
      onClick: () => onAddToCart(product),
      variant: 'outline-success' as const,
      title: 'Agregar al carrito'
    })
  }
  
  if (onViewDetails) {
    actions.push({
      icon: '👁️',
      onClick: () => onViewDetails(product),
      variant: 'outline-primary' as const,
      title: 'Ver detalles'
    })
  }
  
  if (onEdit) {
    actions.push({
      icon: '✏️',
      onClick: () => onEdit(product),
      variant: 'outline-secondary' as const,
      title: 'Editar producto'
    })
  }
  
  return (
    <MagicBentoCard 
      variant={variant}
      size={size}
      actions={actions}
    >
      {/* Imagen del producto */}
      <div className="text-center mb-3">
        {product.image ? (
          <img 
            src={product.image} 
            alt={product.name}
            className="rounded-3"
            style={{ 
              width: '100%', 
              height: '120px', 
              objectFit: 'cover' 
            }}
          />
        ) : (
          <div 
            className="rounded-3 d-flex align-items-center justify-content-center"
            style={{ 
              width: '100%', 
              height: '120px', 
              backgroundColor: '#f8f9fa',
              color: '#6c757d'
            }}
          >
            📦 Sin imagen
          </div>
        )}
      </div>
      
      {/* Nombre del producto */}
      <h6 className="fw-bold text-center mb-2" style={{
        background: 'linear-gradient(135deg, #374151 0%, #1F2937 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text'
      }}>
        {product.name}
      </h6>
      
      {/* Precio */}
      <div className="text-center mb-2">
        <span 
          className="fw-bold fs-5" 
          style={{
            background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}
        >
          ${product.price.toFixed(2)}
        </span>
      </div>
      
      {/* Categoría */}
      {product.category && (
        <div className="text-center">
          <span 
            className="badge rounded-pill" 
            style={{
              background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
              color: 'white',
              fontSize: '0.75rem'
            }}
          >
            {product.category}
          </span>
        </div>
      )}
      
      {/* Descripción */}
      {product.description && (
        <div className="mt-2">
          <p 
            className="text-muted small mb-0 text-center" 
            style={{ 
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}
          >
            {product.description}
          </p>
        </div>
      )}
    </MagicBentoCard>
  )
}
