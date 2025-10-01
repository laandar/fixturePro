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
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px)',
        borderRadius: '20px',
        boxShadow: isHovered ? '0 30px 60px rgba(0, 0, 0, 0.3)' : '0 20px 40px rgba(0, 0, 0, 0.2)',
        transform: isHovered ? 'translateY(-8px)' : 'translateY(0)',
        transition: 'transform 0.3s ease, box-shadow 0.3s ease',
        border: '1px solid rgba(58, 125, 143, 0.1)'
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
        height: '4px',
        background: 'linear-gradient(90deg, #3a7d8f 0%, #2c5f6f 50%, #3a7d8f 100%)',
        opacity: isHovered ? 1 : 0.7,
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
      <CardHeader className="border-0 bg-transparent p-3 position-relative" style={{
        borderBottom: '1px solid rgba(58, 125, 143, 0.08)'
      }}>
        <div className="d-flex align-items-start justify-content-between">
          <div className="d-flex align-items-center gap-2">
              <div className="avatar avatar-sm position-relative">
                <div className="position-absolute" style={{
                  top: '-2px',
                  left: '-2px',
                  right: '-2px',
                  bottom: '-2px',
                  background: 'linear-gradient(135deg, rgba(58, 125, 143, 0.3) 0%, rgba(44, 95, 111, 0.3) 100%)',
                  borderRadius: '50%',
                  filter: 'blur(4px)',
                  zIndex: 0
                }} />
                <div className="avatar-title rounded-circle position-relative" style={{
                  background: 'linear-gradient(135deg, #3a7d8f 0%, #2c5f6f 100%)',
                  color: '#ffffff',
                  boxShadow: '0 4px 12px rgba(58, 125, 143, 0.3)',
                  zIndex: 1
                }}>
                  <LuTrophy />
                </div>
              </div>
            <div>
              <h6 className="mb-0 fw-bold text-dark" style={{ fontSize: '0.9rem' }}>
                {torneo.nombre}
              </h6>
              {torneo.categoria && (
                <small className="text-muted">{torneo.categoria.nombre}</small>
              )}
            </div>
          </div>
          <Badge className="px-2 py-1 position-relative" style={{
            background: torneo.estado === 'en_curso' ? '#4ade80' : 
                       torneo.estado === 'finalizado' ? '#60a5fa' : 
                       torneo.estado === 'planificado' ? '#94a3b8' : '#f87171',
            color: '#ffffff',
            border: 'none',
            fontSize: '0.7rem',
            fontWeight: '600',
            boxShadow: torneo.estado === 'en_curso' ? '0 2px 8px rgba(74, 222, 128, 0.3)' : 
                      torneo.estado === 'finalizado' ? '0 2px 8px rgba(96, 165, 250, 0.3)' : 
                      '0 2px 8px rgba(0, 0, 0, 0.1)'
          }}>
            {torneo.estado === 'en_curso' ? '⚡ En Curso' : 
             torneo.estado === 'finalizado' ? '✓ Finalizado' : 
             torneo.estado === 'planificado' ? '' : '✕ Cancelado'}
          </Badge>
        </div>
      </CardHeader>
      <CardBody className="p-3 pt-0 position-relative">
        {torneo.descripcion && (
          <p className="text-muted small mb-3" style={{ 
            fontSize: '0.8rem',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            lineHeight: '1.5'
          }}>
            {torneo.descripcion}
          </p>
        )}
        
        <div className="d-flex align-items-center gap-3 mb-3 p-2 rounded" style={{
          background: 'rgba(58, 125, 143, 0.05)',
          border: '1px solid rgba(58, 125, 143, 0.1)'
        }}>
          <div className="d-flex align-items-center gap-1">
            <LuCalendar className="text-muted" style={{ fontSize: '0.9rem' }} />
            <small className="text-muted" style={{ fontSize: '0.75rem' }}>
              {new Date(torneo.fecha_inicio).toLocaleDateString('es-ES', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
              })}
            </small>
          </div>
          <div className="d-flex align-items-center gap-1">
            <LuUsers className="text-muted" style={{ fontSize: '0.9rem' }} />
            <small className="text-muted" style={{ fontSize: '0.75rem' }}>
              {torneo.equiposCount || 0} equipos
            </small>
          </div>
        </div>

        <Link href={`/estadisticas/${torneo.id}`} className="text-decoration-none">
          <div className="position-relative">
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(135deg, rgba(58, 125, 143, 0.4) 0%, rgba(44, 95, 111, 0.4) 100%)',
              borderRadius: '12px',
              filter: 'blur(8px)',
              opacity: isHovered ? 0.8 : 0,
              transition: 'opacity 0.3s ease'
            }} />
            <Button 
              className="w-100 d-flex align-items-center justify-content-center gap-2 border-0 position-relative"
              style={{
                background: isHovered 
                  ? 'linear-gradient(135deg, #2c5f6f 0%, #1e4451 100%)'
                  : 'linear-gradient(135deg, #3a7d8f 0%, #2c5f6f 100%)',
                color: '#ffffff',
                padding: '0.6rem 1.2rem',
                borderRadius: '12px',
                fontSize: '0.85rem',
                fontWeight: '600',
                transition: 'all 0.3s ease',
                boxShadow: isHovered 
                  ? '0 8px 20px rgba(58, 125, 143, 0.4)' 
                  : '0 4px 12px rgba(58, 125, 143, 0.2)',
                transform: isHovered ? 'scale(1.02)' : 'scale(1)'
              }}
            >
              <LuEye style={{ 
                transition: 'transform 0.3s ease',
                transform: isHovered ? 'scale(1.1)' : 'scale(1)'
              }} />
              Ver Estadísticas
            </Button>
          </div>
        </Link>
      </CardBody>
    </Card>
  )
}

