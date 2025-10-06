'use client'

import { useEffect, useState } from 'react'
import { Button } from 'react-bootstrap'
import { X, CheckCircle, ExclamationTriangle, InfoCircle, ExclamationCircle } from 'react-bootstrap-icons'

interface NotificationCardProps {
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
  title?: string
  onClose?: () => void
  autoClose?: boolean
  duration?: number
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const NotificationCard = ({
  type,
  message,
  title,
  onClose,
  autoClose = false,
  duration = 5000,
  className = '',
  size = 'md'
}: NotificationCardProps) => {
  const [isVisible, setIsVisible] = useState(true)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (autoClose) {
      const timer = setTimeout(() => {
        handleClose()
      }, duration)

      return () => clearTimeout(timer)
    }
  }, [autoClose, duration])

  const handleClose = () => {
    setIsAnimating(true)
    setTimeout(() => {
      setIsVisible(false)
      onClose?.()
    }, 300)
  }

  const getIcon = () => {
    const iconSize = size === 'sm' ? 16 : size === 'lg' ? 24 : 20
    
    switch (type) {
      case 'success':
        return <CheckCircle className="text-success" size={iconSize} />
      case 'error':
        return <ExclamationCircle className="text-danger" size={iconSize} />
      case 'warning':
        return <ExclamationTriangle className="text-warning" size={iconSize} />
      case 'info':
        return <InfoCircle className="text-info" size={iconSize} />
      default:
        return <InfoCircle className="text-info" size={iconSize} />
    }
  }

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'p-2'
      case 'lg':
        return 'p-4'
      default:
        return 'p-3'
    }
  }

  const getBackgroundClass = () => {
    switch (type) {
      case 'success':
        return 'bg-light-success border-success'
      case 'error':
        return 'bg-light-danger border-danger'
      case 'warning':
        return 'bg-light-warning border-warning'
      case 'info':
        return 'bg-light-info border-info'
      default:
        return 'bg-light-info border-info'
    }
  }

  if (!isVisible) return null

  return (
    <div 
      className={`notification-card border rounded ${getSizeClasses()} mb-3 shadow-sm ${getBackgroundClass()} ${className} ${
        isAnimating ? 'notification-fade-out' : 'notification-fade-in'
      }`}
      style={{
        transition: 'all 0.3s ease-in-out',
        opacity: isAnimating ? 0 : 1,
        transform: isAnimating ? 'translateX(100%)' : 'translateX(0)'
      }}
    >
      <div className="d-flex align-items-start gap-3">
        <div className="flex-shrink-0 mt-1">
          {getIcon()}
        </div>
        
        <div className="flex-grow-1">
          {title && (
            <h6 className={`mb-2 fw-semibold text-${type === 'success' ? 'success' : type === 'error' ? 'danger' : type === 'warning' ? 'warning' : 'info'}`}>
              {title}
            </h6>
          )}
          <p className="mb-0 text-muted small">
            {message}
          </p>
        </div>

        {onClose && (
          <Button
            variant="link"
            size="sm"
            className="p-0 flex-shrink-0"
            onClick={handleClose}
            style={{ 
              color: 'var(--bs-gray-500)',
              fontSize: '1.2rem',
              lineHeight: 1
            }}
          >
            <X />
          </Button>
        )}
      </div>
    </div>
  )
}

export default NotificationCard
