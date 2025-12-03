'use client'
import { useEffect, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

const NavigationLoader = () => {
  const [loading, setLoading] = useState(false)
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    setLoading(false)
  }, [pathname, searchParams])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const link = target.closest('a')
      
      // Ignorar clicks en pestañas (tabs) - elementos dentro de .nav, .tab, o con eventKey
      const isTab = target.closest('.nav') || 
                    target.closest('.tab') || 
                    target.closest('[role="tab"]') ||
                    target.closest('[data-tab]') ||
                    link?.closest('.nav') ||
                    link?.closest('.tab') ||
                    link?.hasAttribute('role') && link.getAttribute('role') === 'tab'
      
      if (isTab) {
        return // No activar loading para cambios de pestañas
      }
      
      // Ignorar clicks en botones de paginación - elementos dentro de .pagination o con clase .page-link
      const paginationContainer = target.closest('.pagination') || target.closest('.pagination-boxed')
      const isPaginationButton = target.tagName === 'BUTTON' && (
        target.classList.contains('page-link') ||
        target.closest('.page-link') ||
        paginationContainer
      )
      const isPaginationElement = target.classList.contains('page-link') ||
                                  target.closest('.page-link') ||
                                  target.closest('.page-item') ||
                                  paginationContainer
      
      if (isPaginationButton || isPaginationElement) {
        return // No activar loading para cambios de paginación
      }
      
      if (link && link.href && !link.href.startsWith('javascript:') && !link.target) {
        const currentUrl = window.location.href
        const linkUrl = link.href
        
        // Solo mostrar loading si es una navegación interna diferente
        if (linkUrl !== currentUrl && linkUrl.startsWith(window.location.origin)) {
          setLoading(true)
        }
      }
    }

    document.addEventListener('click', handleClick)
    
    return () => {
      document.removeEventListener('click', handleClick)
    }
  }, [])

  if (!loading) return null

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 99999
    }}>
      <style>{`
        @keyframes football-bounce-nav {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
          }
          25% {
            transform: translateY(-30px) rotate(90deg);
          }
          50% {
            transform: translateY(0) rotate(180deg);
          }
          75% {
            transform: translateY(-30px) rotate(270deg);
          }
        }
        .football-navigation-loading {
          animation: football-bounce-nav 1.5s ease-in-out infinite;
          font-size: 60px;
          filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));
        }
      `}</style>
      <div className="football-navigation-loading">
        ⚽
      </div>
    </div>
  )
}

export default NavigationLoader

