'use client'

import { useState, useEffect } from 'react'
import { Button } from 'react-bootstrap'
import { X, CheckCircle, ExclamationTriangle, InfoCircle, ExclamationCircle } from 'react-bootstrap-icons'

interface InlineNotificationProps {
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
  onClose?: () => void
  autoClose?: boolean
  duration?: number
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const InlineNotification = ({
  type,
  message,
  onClose,
  autoClose = false,
  duration = 4000,
  className = '',
  size = 'md'
}: InlineNotificationProps) => {
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
    }, 200)
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
        return 'py-1 px-2'
      case 'lg':
        return 'py-3 px-4'
      default:
        return 'py-2 px-3'
    }
  }

  const getBackgroundClass = () => {
    switch (type) {
      case 'success':
        return 'bg-success-subtle border border-success-subtle'
      case 'error':
        return 'bg-danger-subtle border border-danger-subtle'
      case 'warning':
        return 'bg-warning-subtle border border-warning-subtle'
      case 'info':
        return 'bg-info-subtle border border-info-subtle'
      default:
        return 'bg-info-subtle border border-info-subtle'
    }
  }

  const getTextClass = () => {
    switch (type) {
      case 'success':
        return 'text-success-emphasis'
      case 'error':
        return 'text-danger-emphasis'
      case 'warning':
        return 'text-warning-emphasis'
      case 'info':
        return 'text-info-emphasis'
      default:
        return 'text-info-emphasis'
    }
  }

  if (!isVisible) return null

  return (
    <div 
      className={`inline-notification rounded d-flex align-items-center gap-2 ${getBackgroundClass()} ${getSizeClasses()} ${className} ${
        isAnimating ? 'inline-fade-out' : 'inline-fade-in'
      }`}
      style={{
        transition: 'all 0.2s ease-in-out',
        opacity: isAnimating ? 0 : 1,
        transform: isAnimating ? 'scale(0.95)' : 'scale(1)'
      }}
    >
      <div className="flex-shrink-0">
        {getIcon()}
      </div>
      
      <span className={`flex-grow-1 small fw-medium ${getTextClass()}`}>
        {message}
      </span>

      {onClose && (
        <Button
          variant="link"
          size="sm"
          className="p-0 flex-shrink-0"
          onClick={handleClose}
          style={{ 
            color: 'inherit',
            fontSize: size === 'sm' ? '0.8rem' : '1rem',
            lineHeight: 1,
            opacity: 0.7
          }}
        >
          <X />
        </Button>
      )}
    </div>
  )
}

export default InlineNotification
