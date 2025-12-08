'use client'
import { useEffect, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { Spinner } from 'react-bootstrap'

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
      
      // Solo activar loading si el click es en un enlace del sidebar
      const sidebarLink = target.closest('.side-nav-link')
      const sidebarItem = target.closest('.side-nav-item')
      
      // Verificar que sea un enlace del sidebar (no un botón para abrir/cerrar menús)
      if (sidebarLink && sidebarItem) {
        const link = sidebarLink.closest('a')
        
        // Ignorar si es un botón (para abrir/cerrar submenús)
        if (sidebarLink.tagName === 'BUTTON') {
          return
        }
        
        // Solo activar si es un enlace válido y es navegación interna
        if (link && link.href && !link.href.startsWith('javascript:')) {
          const currentUrl = window.location.href
          const linkUrl = link.href
          
          // Solo mostrar loading si es una navegación interna diferente
          if (linkUrl !== currentUrl && linkUrl.startsWith(window.location.origin)) {
            setLoading(true)
          }
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
      <Spinner animation="border" variant="light" style={{ width: '3rem', height: '3rem' }} />
    </div>
  )
}

export default NavigationLoader

