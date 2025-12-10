'use client'

import { Card, CardBody, CardHeader, Badge, Button } from 'react-bootstrap'
import { LuTrophy, LuCalendar, LuUsers, LuEye } from 'react-icons/lu'
import { TbSoccerField } from 'react-icons/tb'
import Link from 'next/link'
import { useState } from 'react'

interface TorneoCardProps {
  torneo: any
}

export default function TorneoCard({ torneo }: TorneoCardProps) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <Card 
      className="border-0 h-100 position-relative overflow-hidden" 
      style={{
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(255, 255, 255, 0.95) 100%)',
        backdropFilter: 'blur(20px)',
        borderRadius: '12px',
        boxShadow: isHovered 
          ? '0 20px 50px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.5)' 
          : '0 8px 24px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.3)',
        transform: isHovered ? 'translateY(-6px) scale(1.01)' : 'translateY(0) scale(1)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        overflow: 'hidden'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Decorative gradient bar */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '3px',
        background: 'linear-gradient(90deg, #3a7d8f 0%, #2c5f6f 50%, #3a7d8f 100%)',
        opacity: isHovered ? 1 : 0.8,
        transition: 'opacity 0.3s ease'
      }} />
      
      {/* Decorative corner element */}
      <div style={{
        position: 'absolute',
        top: '-20px',
        right: '-20px',
        width: '100px',
        height: '100px',
        background: 'linear-gradient(135deg, rgba(58, 125, 143, 0.1) 0%, rgba(44, 95, 111, 0.05) 100%)',
        borderRadius: '50%',
        filter: 'blur(20px)',
        transition: 'transform 0.3s ease',
        transform: isHovered ? 'scale(1.2)' : 'scale(1)'
      }} />
      
      {/* Soccer field icon watermark */}
      <div style={{
        position: 'absolute',
        bottom: '12px',
        right: '18px',
        opacity: 0.04,
        transform: 'rotate(-15deg)',
        zIndex: 0
      }}>
        <TbSoccerField style={{ fontSize: '60px', color: '#3a7d8f' }} />
      </div>
      <CardHeader className="border-0 bg-transparent p-2 pb-1 position-relative" style={{
        borderBottom: '1px solid rgba(58, 125, 143, 0.1)'
      }}>
        <div className="d-flex align-items-start justify-content-between" style={{ gap: '0.5rem' }}>
          <div className="d-flex align-items-center flex-grow-1 min-w-0" style={{ gap: '0.5rem' }}>
              <div className="avatar avatar-sm position-relative flex-shrink-0">
                <div className="position-absolute" style={{
                  top: '-3px',
                  left: '-3px',
                  right: '-3px',
                  bottom: '-3px',
                  background: 'linear-gradient(135deg, rgba(58, 125, 143, 0.3) 0%, rgba(44, 95, 111, 0.3) 100%)',
                  borderRadius: '50%',
                  filter: 'blur(6px)',
                  zIndex: 0,
                  transition: 'transform 0.3s ease',
                  transform: isHovered ? 'scale(1.1)' : 'scale(1)'
                }} />
                <div className="avatar-title rounded-circle position-relative" style={{
                  background: 'linear-gradient(135deg, #3a7d8f 0%, #2c5f6f 100%)',
                  color: '#ffffff',
                  boxShadow: '0 4px 12px rgba(58, 125, 143, 0.3)',
                  zIndex: 1,
                  transition: 'transform 0.3s ease',
                  transform: isHovered ? 'scale(1.1) rotate(5deg)' : 'scale(1) rotate(0deg)'
                }}>
                  <LuTrophy style={{ fontSize: '0.9rem' }} />
                </div>
              </div>
            <div className="min-w-0 flex-grow-1">
              <h6 className="mb-0 fw-bold text-dark" style={{ 
                fontSize: '0.9rem',
                lineHeight: '1.2',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {torneo.nombre}
              </h6>
              {torneo.categoria && (
                <small className="text-muted d-block" style={{ 
                  fontSize: '0.7rem',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  marginTop: '1px'
                }}>
                  {torneo.categoria.nombre}
                </small>
              )}
            </div>
          </div>
          <Badge className="position-relative flex-shrink-0" style={{
            background: torneo.estado === 'en_curso' 
              ? 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)' 
              : torneo.estado === 'finalizado' 
              ? 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)' 
              : torneo.estado === 'planificado' 
              ? 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)' 
              : 'linear-gradient(135deg, #f87171 0%, #ef4444 100%)',
            color: '#ffffff',
            border: 'none',
            fontSize: '0.65rem',
            fontWeight: '600',
            borderRadius: '6px',
            padding: '0.25rem 0.5rem',
            boxShadow: torneo.estado === 'en_curso' 
              ? '0 2px 8px rgba(74, 222, 128, 0.4)' 
              : torneo.estado === 'finalizado' 
              ? '0 2px 8px rgba(96, 165, 250, 0.4)' 
              : '0 2px 8px rgba(0, 0, 0, 0.15)',
            transition: 'all 0.3s ease',
            transform: isHovered ? 'scale(1.05)' : 'scale(1)'
          }}>
            {torneo.estado === 'en_curso' ? '⚡ En Curso' : 
             torneo.estado === 'finalizado' ? '✓ Finalizado' : 
             torneo.estado === 'planificado' ? '📅 Planificado' : '✕ Cancelado'}
          </Badge>
        </div>
      </CardHeader>
      <CardBody className="p-2 pt-1 position-relative">
        <div className="d-flex align-items-center mb-2 rounded" style={{
          gap: '0.5rem',
          padding: '0.375rem',
          background: 'linear-gradient(135deg, rgba(58, 125, 143, 0.06) 0%, rgba(44, 95, 111, 0.06) 100%)',
          border: '1px solid rgba(58, 125, 143, 0.15)',
          transition: 'transform 0.3s ease',
          transform: isHovered ? 'scale(1.01)' : 'scale(1)'
        }}>
          <div className="d-flex align-items-center" style={{ gap: '0.3rem' }}>
            <div style={{
              background: 'rgba(58, 125, 143, 0.1)',
              borderRadius: '4px',
              padding: '3px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <LuCalendar className="text-dark" style={{ fontSize: '0.75rem' }} />
            </div>
            <small className="text-dark fw-medium" style={{ fontSize: '0.7rem' }}>
              {new Date(torneo.fecha_inicio).toLocaleDateString('es-ES', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
              })}
            </small>
          </div>
          <div className="d-flex align-items-center" style={{ gap: '0.3rem' }}>
            <div style={{
              background: 'rgba(58, 125, 143, 0.1)',
              borderRadius: '4px',
              padding: '3px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <LuUsers className="text-dark" style={{ fontSize: '0.75rem' }} />
            </div>
            <small className="text-dark fw-medium" style={{ fontSize: '0.7rem' }}>
              {torneo.equiposCount || 0} equipos
            </small>
          </div>
        </div>

        <Link href={`/estadisticas/${torneo.id}`} className="text-decoration-none">
          <div className="position-relative">
            <Button 
              className="w-100 d-flex align-items-center justify-content-center border-0 position-relative"
              style={{
                background: 'linear-gradient(135deg, #3a7d8f 0%, #2c5f6f 100%)',
                color: '#ffffff',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: '600',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: isHovered 
                  ? '0 8px 20px rgba(58, 125, 143, 0.4)' 
                  : '0 4px 12px rgba(58, 125, 143, 0.25)',
                transform: isHovered ? 'translateY(-2px) scale(1.02)' : 'translateY(0) scale(1)',
                gap: '0.5rem'
              }}
            >
              <LuEye style={{ 
                transition: 'transform 0.3s ease',
                transform: isHovered ? 'scale(1.15) rotate(5deg)' : 'scale(1) rotate(0deg)',
                fontSize: '0.9rem'
              }} />
              Ver Estadísticas
            </Button>
          </div>
        </Link>
      </CardBody>
    </Card>
  )
}

