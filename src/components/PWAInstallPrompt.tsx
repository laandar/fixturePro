'use client'

import { useEffect, useState, useRef } from 'react'
import { X } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [isDevelopment, setIsDevelopment] = useState(false)
  const fallbackTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Detectar si es un dispositivo móvil
    const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
      (typeof window !== 'undefined' && window.innerWidth <= 768)
    setIsMobile(mobile)

    // Detectar si es iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    setIsIOS(iOS)

    // Detectar si la app ya está instalada (modo standalone)
    const standalone = typeof window !== 'undefined' && (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://')
    )
    
    if (standalone) {
      setIsInstalled(true)
      return
    }

    // Detectar si estamos en desarrollo (localhost)
    const devMode = typeof window !== 'undefined' && (
      window.location.hostname === 'localhost' || 
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname.includes('local')
    )
    setIsDevelopment(devMode)

    // Verificar si el usuario ya ha rechazado anteriormente
    const checkDismissed = () => {
      if (typeof window === 'undefined') return true
      // En desarrollo, no respetar el rechazo para facilitar testing
      if (devMode) return false
      
      const dismissedAt = localStorage.getItem('pwa-install-dismissed')
      if (dismissedAt) {
        const daysSinceDismissed = (Date.now() - parseInt(dismissedAt)) / (1000 * 60 * 60 * 24)
        // Solo mostrar nuevamente después de 7 días
        if (daysSinceDismissed < 7) {
          return true
        }
      }
      return false
    }

    if (checkDismissed() && !devMode) {
      return
    }

    // Función para mostrar el prompt
    const displayPrompt = () => {
      if (!checkDismissed() && mobile) {
        setShowPrompt(true)
      }
    }

    // Escuchar el evento beforeinstallprompt (Android/Chrome)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      
      // Cancelar el fallback si existe
      if (fallbackTimeoutRef.current) {
        clearTimeout(fallbackTimeoutRef.current)
        fallbackTimeoutRef.current = null
      }
      
      // Mostrar el prompt después de un breve delay
      setTimeout(() => {
        displayPrompt()
      }, 2000)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // Para móviles Android: mostrar prompt después de un delay (fallback)
    // Esto ayuda en desarrollo donde el evento puede no dispararse
    if (mobile && !iOS) {
      // Mostrar después de 3 segundos si no recibimos el evento
      fallbackTimeoutRef.current = setTimeout(() => {
        // Solo mostrar en desarrollo o si el evento no llegó
        if (isDevelopment || !deferredPrompt) {
          displayPrompt()
        }
      }, 3000)
    }

    // Para iOS, mostrar el prompt después de un delay si no está instalado
    if (iOS && mobile) {
      setTimeout(() => {
        displayPrompt()
      }, 2000)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      if (fallbackTimeoutRef.current) {
        clearTimeout(fallbackTimeoutRef.current)
      }
    }
  }, []) // Sin dependencias para que solo se ejecute una vez

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        // Mostrar el prompt de instalación nativo
        await deferredPrompt.prompt()
        const { outcome } = await deferredPrompt.userChoice
        
        if (outcome === 'accepted') {
          setShowPrompt(false)
          setIsInstalled(true)
        }
      } catch (error) {
        // Error silencioso
      } finally {
        setDeferredPrompt(null)
      }
    } else {
      // En desarrollo o cuando no hay prompt nativo, mostrar instrucciones manuales
      const instructions = isIOS
        ? `Para instalar en iOS:
1. Toca el botón de compartir (cuadrado con flecha arriba) en la parte inferior
2. Desplázate y busca "Agregar a pantalla de inicio"
3. Toca "Agregar"`

        : `Para instalar en Android (en desarrollo):
1. Toca el menú de tres puntos (⋮) en la esquina superior derecha de Chrome
2. Busca "Instalar aplicación" o "Agregar a pantalla de inicio"
3. Toca "Instalar" o "Agregar"

En producción, el botón funcionará automáticamente.`

      alert(instructions)
    }
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    // Guardar la fecha de rechazo en localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('pwa-install-dismissed', Date.now().toString())
    }
  }

  // No mostrar si ya está instalada, no es móvil, o no hay prompt
  if (isInstalled || !showPrompt || !isMobile) {
    return null
  }

  return (
    <>
      <style>{`
        @keyframes pwa-slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .pwa-install-prompt {
          animation: pwa-slide-up 0.3s ease-out;
        }
      `}</style>
      <div 
        className="pwa-install-prompt"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 9999,
          padding: '1rem',
          background: 'linear-gradient(to right, #2563eb, #1d4ed8)',
          color: 'white',
          boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 -2px 4px -1px rgba(0, 0, 0, 0.06)',
        }}
      >
        <div style={{
          maxWidth: '28rem',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
        }}>
          <div style={{ flex: 1 }}>
            <h3 style={{
              fontWeight: 600,
              fontSize: '1rem',
              margin: 0,
              marginBottom: '0.25rem',
            }}>
              {isIOS ? 'Agrega a tu pantalla de inicio' : 'Instala la aplicación'}
            </h3>
            <p style={{
              fontSize: '0.875rem',
              opacity: 0.9,
              margin: 0,
              lineHeight: '1.25rem',
            }}>
              {isDevelopment 
                ? (isIOS 
                  ? 'En desarrollo: Toca el botón de compartir y luego "Agregar a pantalla de inicio".'
                  : 'En desarrollo: Toca el botón "Instalar" para ver instrucciones o usa el menú de Chrome.')
                : (isIOS 
                  ? 'Toca el botón de compartir y luego "Agregar a pantalla de inicio" para un acceso más rápido.'
                  : 'Agrega esta aplicación a tu pantalla de inicio para un acceso más rápido.')}
            </p>
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}>
            {!isIOS && (
              <button
                onClick={handleInstallClick}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: deferredPrompt ? 'white' : 'rgba(255, 255, 255, 0.8)',
                  color: '#2563eb',
                  borderRadius: '0.5rem',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
                  transition: 'background-color 0.2s',
                  opacity: deferredPrompt ? 1 : 0.9,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = deferredPrompt ? '#f3f4f6' : 'rgba(255, 255, 255, 0.9)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = deferredPrompt ? 'white' : 'rgba(255, 255, 255, 0.8)'
                }}
              >
                {deferredPrompt ? 'Instalar' : isDevelopment ? 'Ver instrucciones' : 'Instalar'}
              </button>
            )}
            <button
              onClick={handleDismiss}
              style={{
                padding: '0.5rem',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'white',
                borderRadius: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
              }}
              aria-label="Cerrar"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export default PWAInstallPrompt
