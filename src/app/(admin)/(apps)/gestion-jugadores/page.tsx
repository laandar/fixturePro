'use client'

import { Suspense } from 'react'
import { GestionJugadoresProvider } from './components/GestionJugadoresProvider'
import { useGestionJugadores } from './components/GestionJugadoresContext'
import Layout from './components/Layout'
import TabPaneAmonestaciones from './components/TabPaneAmonestaciones'
import TabPaneFirmas from './components/TabPaneFirmas'
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
      nombreEquipoA={nombreEquipoA}
      nombreEquipoB={nombreEquipoB}
    />
  )
}

const GestionJugadoresPage = () => {
  return (
    <GestionJugadoresProvider>
      <Suspense fallback={<div>Cargando...</div>}>
        <GestionJugadoresContent />
      </Suspense>
    </GestionJugadoresProvider>
  )
}

export default GestionJugadoresPage
