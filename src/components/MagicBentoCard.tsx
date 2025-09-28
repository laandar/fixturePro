'use client'
import { Card, CardBody, Button } from 'react-bootstrap'
import type { ReactNode } from 'react'

interface MagicBentoCardProps {
  children: ReactNode
  className?: string
  style?: React.CSSProperties
  onClick?: () => void
  onMouseEnter?: () => void
  onMouseLeave?: () => void
  actions?: Array<{
    icon: ReactNode
    onClick: () => void
    variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark' | 'outline-primary' | 'outline-secondary' | 'outline-success' | 'outline-danger' | 'outline-warning' | 'outline-info' | 'outline-light' | 'outline-dark'
    title?: string
  }>
  header?: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'glass' | 'solid' | 'gradient'
}

export default function MagicBentoCard({ 
  children,
  className = '',
  style = {},
  onClick,
  onMouseEnter,
  onMouseLeave,
  actions = [],
  header,
  footer,
  size = 'md',
  variant = 'glass'
}: MagicBentoCardProps) {
  
  // Configuración de tamaños
  const sizeConfig = {
    sm: { padding: '12px', borderRadius: '12px' },
    md: { padding: '16px', borderRadius: '20px' },
    lg: { padding: '24px', borderRadius: '24px' }
  }
  
  // Configuración de variantes
  const variantConfig: Record<string, any> = {
    default: {
      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05))',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)'
    },
    glass: {
      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05))',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      backdropFilter: 'blur(10px)',
      boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)'
    },
    solid: {
      background: 'linear-gradient(135deg, #ffffff, #f8f9fa)',
      border: '1px solid #e9ecef',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
    },
    gradient: {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      boxShadow: '0 8px 32px 0 rgba(102, 126, 234, 0.37)'
    }
  }
  
  const currentSize = sizeConfig[size]
  const currentVariant = variantConfig[variant]
  
  const cardStyle = {
    borderRadius: currentSize.borderRadius,
    border: currentVariant.border,
    background: currentVariant.background,
    ...(currentVariant.backdropFilter && { backdropFilter: currentVariant.backdropFilter }),
    boxShadow: currentVariant.boxShadow,
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    cursor: onClick ? 'pointer' : 'default',
    ...style
  }
  
  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    if (variant === 'glass' || variant === 'default') {
      e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)'
      e.currentTarget.style.boxShadow = '0 20px 40px 0 rgba(31, 38, 135, 0.5)'
    }
    onMouseEnter?.()
  }
  
  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    if (variant === 'glass' || variant === 'default') {
      e.currentTarget.style.transform = 'translateY(0) scale(1)'
      e.currentTarget.style.boxShadow = currentVariant.boxShadow
    }
    onMouseLeave?.()
  }
  
  return (
    <Card 
      className={`h-100 overflow-hidden position-relative ${className}`}
      style={cardStyle}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Glass effect overlay para variantes glass y default */}
      {(variant === 'glass' || variant === 'default') && (
        <div 
          className="position-absolute top-0 start-0 w-100 h-100" 
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)',
            borderRadius: currentSize.borderRadius,
            pointerEvents: 'none'
          }}
        />
      )}
      
      {/* Header */}
      {header && (
        <div className="position-relative" style={{ zIndex: 2 }}>
          {header}
        </div>
      )}
      
      {/* Content */}
      <CardBody 
        className="position-relative" 
        style={{ 
          borderRadius: currentSize.borderRadius, 
          zIndex: 1,
          padding: currentSize.padding
        }}
      >
        {children}
        
        {/* Actions */}
        {actions.length > 0 && (
          <div className="d-flex justify-content-center gap-2 mt-3">
            {actions.map((action, index) => (
              <Button
                key={index}
                variant={action.variant || 'outline-primary'}
                size="sm"
                onClick={action.onClick}
                title={action.title}
                style={{ 
                  borderRadius: '12px',
                  border: action.variant?.includes('outline') ? '1px solid rgba(37, 99, 235, 0.3)' : 'none',
                  background: action.variant?.includes('outline') ? 'rgba(37, 99, 235, 0.1)' : undefined,
                  backdropFilter: 'blur(5px)',
                  padding: '4px 8px' 
                }}
              >
                {action.icon}
              </Button>
            ))}
          </div>
        )}
      </CardBody>
      
      {/* Footer */}
      {footer && (
        <div className="position-relative" style={{ zIndex: 2 }}>
          {footer}
        </div>
      )}
    </Card>
  )
}