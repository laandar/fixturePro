'use client'
import MagicBentoCard from './MagicBentoCard'

interface User {
  id: number
  name: string
  email: string
  avatar?: string
  role?: string
  status?: 'active' | 'inactive'
}

interface UserCardProps {
  user: User
  onEdit?: (user: User) => void
  onDelete?: (user: User) => void
  onViewProfile?: (user: User) => void
  variant?: 'glass' | 'solid' | 'gradient'
  size?: 'sm' | 'md' | 'lg'
}

export default function UserCard({ 
  user, 
  onEdit,
  onDelete,
  onViewProfile,
  variant = 'glass',
  size = 'md'
}: UserCardProps) {
  
  const actions = []
  
  if (onViewProfile) {
    actions.push({
      icon: '👤',
      onClick: () => onViewProfile(user),
      variant: 'outline-primary' as const,
      title: 'Ver perfil'
    })
  }
  
  if (onEdit) {
    actions.push({
      icon: '✏️',
      onClick: () => onEdit(user),
      variant: 'outline-secondary' as const,
      title: 'Editar usuario'
    })
  }
  
  if (onDelete) {
    actions.push({
      icon: '🗑️',
      onClick: () => onDelete(user),
      variant: 'outline-danger' as const,
      title: 'Eliminar usuario'
    })
  }
  
  return (
    <MagicBentoCard 
      variant={variant}
      size={size}
      actions={actions}
    >
      {/* Avatar */}
      <div className="text-center mb-3">
        {user.avatar ? (
          <img 
            src={user.avatar} 
            alt={user.name}
            className="rounded-circle"
            style={{ 
              width: '80px', 
              height: '80px', 
              objectFit: 'cover',
              border: '3px solid rgba(255, 255, 255, 0.2)'
            }}
          />
        ) : (
          <div 
            className="rounded-circle d-flex align-items-center justify-content-center mx-auto"
            style={{ 
              width: '80px', 
              height: '80px', 
              backgroundColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              fontSize: '2rem'
            }}
          >
            {user.name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      
      {/* Nombre */}
      <h6 className="fw-bold text-center mb-1" style={{
        background: 'linear-gradient(135deg, #374151 0%, #1F2937 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text'
      }}>
        {user.name}
      </h6>
      
      {/* Email */}
      <p className="text-muted small text-center mb-2">
        {user.email}
      </p>
      
      {/* Role y Status */}
      <div className="d-flex justify-content-center gap-2 mb-2">
        {user.role && (
          <span 
            className="badge rounded-pill" 
            style={{
              background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
              color: 'white',
              fontSize: '0.7rem'
            }}
          >
            {user.role}
          </span>
        )}
        
        {user.status && (
          <span 
            className="badge rounded-pill" 
            style={{
              background: user.status === 'active' 
                ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
                : 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
              color: 'white',
              fontSize: '0.7rem'
            }}
          >
            {user.status === 'active' ? 'Activo' : 'Inactivo'}
          </span>
        )}
      </div>
    </MagicBentoCard>
  )
}
