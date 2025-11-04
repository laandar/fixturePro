'use client'

import { Suspense, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { GestionJugadoresProvider } from './components/GestionJugadoresProvider'
import { useGestionJugadores } from './components/GestionJugadoresContext'
import Layout from './components/Layout'
import TabPaneAmonestaciones from './components/TabPaneAmonestaciones'
import TabPaneFirmas from './components/TabPaneFirmas'
import TabPanePagos from './components/TabPanePagos'
import TabPaneGoles from './components/TabPaneGoles'
import TabPaneJugadores from './components/TabPaneJugadores'

const GestionJugadoresContent = () => {
  const { nombreEquipoA, nombreEquipoB } = useGestionJugadores()
  
  return (
    <Layout
      tabJugadores={<TabPaneJugadores />}
      tabAmonestaciones={<TabPaneAmonestaciones />}
      tabGoles={<TabPaneGoles />}
      tabFirmas={<TabPaneFirmas />}
      tabPagos={<TabPanePagos />}
      nombreEquipoA={nombreEquipoA}
      nombreEquipoB={nombreEquipoB}
    />
  )
}

const GestionJugadoresPage = () => {
  const router = useRouter()
  const { data: session, status } = useSession()

  // Protección de autenticación: redirigir a login si no está autenticado
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth-3/sign-in')
    }
  }, [status, router])

  // Manejo de navegación hacia atrás en móvil
  useEffect(() => {
    const isMobile = typeof navigator !== 'undefined' && /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
    if (!isMobile || typeof window === 'undefined' || typeof history === 'undefined') return

    // Empuja un estado inicial para evitar que el primer "atrás" salga de la página
    history.pushState(null, '', window.location.href)

      const confirmMessage = 'Hay cambios sin guardar. Si sales, los registros se perderán. ¿Deseas salir?'

      const handlePopState = () => {
        const confirmExit = window.confirm(confirmMessage)
        if (confirmExit) {
          // Permitir salir: desuscribir temporalmente para evitar bucle
          window.removeEventListener('popstate', handlePopState)
          history.back()
          // Re-suscribir tras dejar avanzar el historial
          setTimeout(() => {
            window.addEventListener('popstate', handlePopState)
          }, 0)
        } else {
          // Mantenerse en la página
          history.pushState(null, '', window.location.href)
        }
      }

      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault()
        e.returnValue = confirmMessage
        return confirmMessage
      }

    window.addEventListener('popstate', handlePopState)
      window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('popstate', handlePopState)
        window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [])

  // Mostrar loading mientras se verifica la sesión
  if (status === 'loading') {
    return <div>Cargando...</div>
  }

  // No renderizar nada si no está autenticado (se redirigirá)
  if (status === 'unauthenticated') {
    return null
  }

  return (
    <GestionJugadoresProvider>
      <Suspense fallback={<div>Cargando...</div>}>
        <GestionJugadoresContent />
      </Suspense>
    </GestionJugadoresProvider>
  )
}

export default GestionJugadoresPage
