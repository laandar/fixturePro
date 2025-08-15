'use client'

import { GestionJugadoresProvider } from './components/GestionJugadoresProvider'
import Layout from './components/Layout'
import TabPaneAmonestaciones from './components/TabPaneAmonestaciones'
import TabPaneCambios from './components/TabPaneCambios'
import TabPaneFirmas from './components/TabPaneFirmas'
import TabPaneGoles from './components/TabPaneGoles'
import TabPaneJugadores from './components/TabPaneJugadores'

const GestionJugadoresPage = () => {
  return (
    <GestionJugadoresProvider>
      <Layout
        tabJugadores={<TabPaneJugadores />}
        tabCambios={<TabPaneCambios />}
        tabAmonestaciones={<TabPaneAmonestaciones />}
        tabGoles={<TabPaneGoles />}
        tabFirmas={<TabPaneFirmas />}
      />
    </GestionJugadoresProvider>
  )
}

export default GestionJugadoresPage
