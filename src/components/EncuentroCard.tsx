'use client'
import MagicBentoCard from './MagicBentoCard'
import { formatFechaProgramada } from '@/helpers/date'
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
  
  const getDiaLabel = (dia?: string | null) => {
    switch ((dia || '').toLowerCase()) {
      case 'sabado':
        return 'Sábado'
      case 'domingo':
        return 'Domingo'
      case 'viernes':
      default:
        return 'Viernes'
    }
  }
  
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
      style={{ padding: '8px' }}
    >
      {/* Header compacto con equipos, fecha y estado */}
      <div style={{ marginBottom: '2px' }}>
        {/* Equipos con nombres completos - Vertical (arriba y abajo) */}
        <div className="d-flex flex-column align-items-center justify-content-center" style={{ gap: '1px' }}>
          {/* Equipo Local - Arriba */}
          <div className="d-flex align-items-center gap-1">
            <div 
              className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white position-relative" 
              style={{
                width: 'clamp(22px, 3vw, 30px)', 
                height: 'clamp(22px, 3vw, 30px)',
                background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                fontSize: 'clamp(8px, 1.6vw, 10px)',
                boxShadow: '0 2px 8px rgba(37, 99, 235, 0.4)',
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
                fontSize: 'clamp(10px, 2vw, 13px)',
                lineHeight: '1'
              }}
            >
              {encuentro.equipoLocal?.nombre || 'Local'}
            </span>
          </div>
          
          {/* Separador VS */}
          <div className="d-flex align-items-center justify-content-center" style={{ margin: '0' }}>
            <span 
              className="fw-semibold" 
              style={{
                color: '#6B7280', 
                fontSize: 'clamp(7px, 1.6vw, 9px)',
                opacity: 0.5
              }}
            >
              VS
            </span>
          </div>
          
          {/* Equipo Visitante - Abajo */}
          <div className="d-flex align-items-center gap-1">
            <div 
              className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white position-relative" 
              style={{
                width: 'clamp(22px, 3vw, 30px)', 
                height: 'clamp(22px, 3vw, 30px)',
                background: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
                fontSize: 'clamp(8px, 1.6vw, 10px)',
                boxShadow: '0 2px 8px rgba(34, 197, 94, 0.4)',
                transition: 'all 0.3s ease',
                flexShrink: 0
              }}
            >
              {encuentro.equipoVisitante?.nombre?.substring(0, 2).toUpperCase() || 'V'}
            </div>
            <span 
              className="fw-bold text-center" 
              style={{
                color: '#1F2937',
                fontSize: 'clamp(10px, 2vw, 13px)',
                lineHeight: '1'
              }}
            >
              {encuentro.equipoVisitante?.nombre || 'Visitante'}
            </span>
          </div>
        </div>
        
        {/* Fecha, horario y estado - Responsivo */}
        <div className="row align-items-center justify-content-center g-1" style={{ marginTop: '2px' }}>
          {/* Fecha */}
          <div className="col-auto">
            <span 
              className="fw-bold d-block text-center" 
              style={{
                background: 'linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                fontSize: 'clamp(9px, 1.8vw, 12px)',
                lineHeight: '1'
              }}
            >
              {formatFechaProgramada(encuentro.fecha_programada)}
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
                    fontSize: 'clamp(9px, 1.8vw, 12px)',
                    lineHeight: '1'
                  }}
                >
                  🕐 {getDiaLabel(encuentro.horario.dia_semana)} · {encuentro.horario.hora_inicio}
                </span>
              </div>
              <div className="col-auto">
                <span style={{color: '#D1D5DB', fontSize: 'clamp(10px, 1.5vw, 12px)'}}>•</span>
              </div>
            </>
          )}
          
          {/* Cancha */}
          {encuentro.cancha && (
            <>
              <div className="col-auto">
                <span 
                  className="fw-semibold d-block text-center" 
                  style={{
                    background: 'linear-gradient(135deg, #374151 0%, #1F2937 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    fontSize: 'clamp(9px, 1.8vw, 12px)',
                    lineHeight: '1'
                  }}
                >
                  📍 {encuentro.cancha}
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
      
      {/* Botones de acción en nueva línea debajo de la cancha */}
      {actions.length > 0 && (
        <div 
          className="d-flex justify-content-center align-items-center"
          style={{
            gap: 'clamp(12px, 3vw, 8px)',
            paddingTop: '0',
            marginTop: '2px'
          }}
        >
          {actions.map((action, index) => (
            <button
              key={index}
              className={`btn btn-${action.variant?.replace('outline-', '')} btn-sm`}
              onClick={action.onClick}
              title={action.title}
              style={{ 
                borderRadius: '10px',
                border: action.variant?.includes('outline') ? '1px solid rgba(37, 99, 235, 0.3)' : 'none',
                background: action.variant?.includes('outline') ? 'rgba(37, 99, 235, 0.1)' : undefined,
                backdropFilter: 'blur(5px)',
                padding: 'clamp(12px, 3vw, 6px) clamp(16px, 4vw, 10px)',
                fontSize: 'clamp(18px, 4vw, 12px)',
                width: 'clamp(52px, 11vw, 36px)',
                height: 'clamp(52px, 11vw, 36px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)'
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)'
              }}
            >
              {action.icon}
            </button>
          ))}
        </div>
      )}
    </MagicBentoCard>
  )
}
