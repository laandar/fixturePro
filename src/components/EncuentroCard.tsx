'use client'
import MagicBentoCard from './MagicBentoCard'
import type { EncuentroWithRelations } from '@/db/types'

interface EncuentroCardProps {
  encuentro: EncuentroWithRelations
  onManagePlayers?: (encuentro: EncuentroWithRelations) => void
  onDeleteEncuentro?: (encuentro: EncuentroWithRelations) => void
  onEditHorario?: (encuentro: EncuentroWithRelations) => void
  variant?: 'glass' | 'solid' | 'gradient'
  size?: 'sm' | 'md' | 'lg'
}

export default function EncuentroCard({ 
  encuentro, 
  onManagePlayers,
  onDeleteEncuentro,
  onEditHorario,
  variant = 'glass',
  size = 'sm'
}: EncuentroCardProps) {
  
  // Función para generar badge de estado
  const getEstadoBadge = (estado: string | null) => {
    const config: Record<string, { 
      text: string; 
      label: string; 
      icon: string;
      border: string;
    }> = {
      programado: { 
        text: 'secondary', 
        label: 'Programado',
        icon: '⏰',
        border: 'border border-secondary'
      },
      en_curso: { 
        text: 'warning', 
        label: 'En Curso',
        icon: '⚽',
        border: 'border border-warning'
      },
      finalizado: { 
        text: 'success', 
        label: 'Finalizado',
        icon: '✅',
        border: 'border border-success'
      },
      cancelado: { 
        text: 'danger', 
        label: 'Cancelado',
        icon: '❌',
        border: 'border border-danger'
      },
      aplazado: { 
        text: 'info', 
        label: 'Aplazado',
        icon: '⏳',
        border: 'border border-info'
      }
    }
    const estadoKey = estado ?? 'programado'
    const configItem = config[estadoKey] || { 
      text: 'secondary', 
      label: estadoKey,
      icon: '❓',
      border: 'border border-secondary'
    }
    
    return (
      <span 
        className={`badge text-${configItem.text} ${configItem.border} px-2 py-1 rounded-pill fw-semibold d-flex align-items-center justify-content-center bg-transparent`}
        style={{ 
          fontSize: 'clamp(10px, 1.5vw, 12px)', 
          width: 'clamp(20px, 4vw, 24px)', 
          height: 'clamp(20px, 4vw, 24px)',
          lineHeight: '1'
        }}
        title={configItem.label}
      >
        {configItem.icon}
      </span>
    )
  }
  
  // Preparar acciones
  const actions = []
  
  if (onManagePlayers) {
    actions.push({
      icon: '👥',
      onClick: () => onManagePlayers(encuentro),
      variant: 'outline-primary' as const,
      title: 'Gestionar jugadores'
    })
  }
  
  if (onEditHorario) {
    actions.push({
      icon: '🕐',
      onClick: () => onEditHorario(encuentro),
      variant: 'outline-success' as const,
      title: 'Configurar horario'
    })
  }
  
  
  if (onDeleteEncuentro) {
    actions.push({
      icon: '🗑️',
      onClick: () => onDeleteEncuentro(encuentro),
      variant: 'outline-danger' as const,
      title: 'Eliminar encuentro'
    })
  }
  
  return (
    <MagicBentoCard 
      variant={variant}
      size={size}
    >
      {/* Header compacto con equipos, fecha y estado */}
      <div className="mb-3">
        {/* Equipos con nombres completos - Responsivo */}
        <div className="row align-items-center justify-content-center g-2 mb-2">
          {/* Equipo Local */}
          <div className="col-auto d-flex align-items-center gap-1 gap-md-2">
            <div 
              className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white position-relative" 
              style={{
                width: 'clamp(28px, 4vw, 36px)', 
                height: 'clamp(28px, 4vw, 36px)',
                background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                fontSize: 'clamp(10px, 2vw, 12px)',
                boxShadow: '0 4px 15px rgba(37, 99, 235, 0.4)',
                transition: 'all 0.3s ease',
                flexShrink: 0
              }}
            >
              {encuentro.equipoLocal?.nombre?.substring(0, 2).toUpperCase() || 'L'}
            </div>
            <span 
              className="fw-bold text-center" 
              style={{
                color: '#1F2937',
                fontSize: 'clamp(12px, 2.5vw, 16px)',
                lineHeight: '1.2'
              }}
            >
              {encuentro.equipoLocal?.nombre || 'Local'}
            </span>
          </div>
          
          {/* VS */}
          <div className="col-auto">
            <span 
              className="fw-semibold d-block text-center" 
              style={{color: '#6B7280', fontSize: 'clamp(10px, 2vw, 14px)'}}
            >
              VS
            </span>
          </div>
          
          {/* Equipo Visitante */}
          <div className="col-auto d-flex align-items-center gap-1 gap-md-2">
            <span 
              className="fw-bold text-center" 
              style={{
                color: '#1F2937',
                fontSize: 'clamp(12px, 2.5vw, 16px)',
                lineHeight: '1.2'
              }}
            >
              {encuentro.equipoVisitante?.nombre || 'Visitante'}
            </span>
            <div 
              className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white position-relative" 
              style={{
                width: 'clamp(28px, 4vw, 36px)', 
                height: 'clamp(28px, 4vw, 36px)',
                background: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
                fontSize: 'clamp(10px, 2vw, 12px)',
                boxShadow: '0 4px 15px rgba(34, 197, 94, 0.4)',
                transition: 'all 0.3s ease',
                flexShrink: 0
              }}
            >
              {encuentro.equipoVisitante?.nombre?.substring(0, 2).toUpperCase() || 'V'}
            </div>
          </div>
        </div>
        
        {/* Fecha, horario y estado - Responsivo */}
        <div className="row align-items-center justify-content-center g-1 g-md-2">
          {/* Fecha */}
          <div className="col-auto">
            <span 
              className="fw-bold d-block text-center" 
              style={{
                background: 'linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                fontSize: 'clamp(11px, 2vw, 14px)',
                lineHeight: '1.2'
              }}
            >
              {encuentro.fecha_programada ? 
                new Date(encuentro.fecha_programada).toLocaleDateString('es-ES') : 'Sin fecha'}
            </span>
          </div>
          
          {/* Separador */}
          <div className="col-auto">
            <span style={{color: '#D1D5DB', fontSize: 'clamp(10px, 1.5vw, 12px)'}}>•</span>
          </div>
          
          {/* Horario */}
          {encuentro.horario && (
            <>
              <div className="col-auto">
                <span 
                  className="fw-semibold d-block text-center" 
                  style={{
                    background: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    fontSize: 'clamp(10px, 2vw, 13px)',
                    lineHeight: '1.2'
                  }}
                >
                  🕐 {encuentro.horario.hora_inicio}
                </span>
              </div>
              <div className="col-auto">
                <span style={{color: '#D1D5DB', fontSize: 'clamp(10px, 1.5vw, 12px)'}}>•</span>
              </div>
            </>
          )}
          
          {/* Badge de Estado */}
          <div className="col-auto">
            {getEstadoBadge(encuentro.estado)}
          </div>
        </div>
      </div>
      
      {/* Sección de cancha con botones alineados - Responsivo */}
      <div className="row align-items-center g-2">
        {/* Cancha */}
        <div className="col">
          {encuentro.cancha ? (
            <div 
              className="p-2 rounded-2" 
              style={{
                background: 'linear-gradient(135deg, rgba(243, 244, 246, 0.8), rgba(229, 231, 235, 0.6))',
                border: '1px solid rgba(209, 213, 219, 0.3)',
                backdropFilter: 'blur(5px)'
              }}
            >
              <span 
                className="fw-semibold d-block text-center" 
                style={{
                  background: 'linear-gradient(135deg, #374151 0%, #1F2937 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  fontSize: 'clamp(11px, 2vw, 13px)',
                  lineHeight: '1.2'
                }}
              >
                📍 {encuentro.cancha}
              </span>
            </div>
          ) : (
            <span 
              className="text-muted d-block text-center" 
              style={{fontSize: 'clamp(11px, 2vw, 13px)'}}
            >
              Sin cancha asignada
            </span>
          )}
        </div>
        
        {/* Botones de acción alineados con la cancha */}
        {actions.length > 0 && (
          <div className="col-auto">
            <div className="d-flex gap-1">
              {actions.map((action, index) => (
                <button
                  key={index}
                  className={`btn btn-${action.variant?.replace('outline-', '')} btn-sm`}
                  onClick={action.onClick}
                  title={action.title}
                  style={{ 
                    borderRadius: '8px',
                    border: action.variant?.includes('outline') ? '1px solid rgba(37, 99, 235, 0.3)' : 'none',
                    background: action.variant?.includes('outline') ? 'rgba(37, 99, 235, 0.1)' : undefined,
                    backdropFilter: 'blur(5px)',
                    padding: '4px 8px',
                    fontSize: 'clamp(10px, 1.5vw, 12px)',
                    width: 'clamp(28px, 5vw, 32px)',
                    height: 'clamp(28px, 5vw, 32px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {action.icon}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </MagicBentoCard>
  )
}
