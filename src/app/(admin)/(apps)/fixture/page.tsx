'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import { Button, Card, CardBody, CardHeader, Col, Container, Row, Alert, Badge, FormSelect, FloatingLabel, Modal, ModalHeader, ModalBody, ModalFooter } from 'react-bootstrap'
import { LuTrophy, LuGamepad2, LuSettings, LuTrash, LuDownload, LuUsers } from 'react-icons/lu'
import { getTorneoById, getEncuentrosByTorneo, deleteJornada, getEquiposDescansan, getTorneos, crearJornadaConEmparejamientos } from '../torneos/actions'
import { confirmarJornada, confirmarRegeneracionJornada } from '../torneos/dynamic-actions'
import type { TorneoWithRelations, EncuentroWithRelations } from '@/db/types'
import type { JornadaPropuesta } from '@/lib/dynamic-fixture-generator'
import DynamicFixtureModal from '@/components/DynamicFixtureModal'
import EmparejamientosFaltantesModal from '@/components/EmparejamientosFaltantesModal'
import TorneoFixtureSection from '@/components/TorneoFixtureSection'
import { saveAs } from 'file-saver'
import { exportFixtureToExcel } from '@/lib/excel-exporter'

const FixturePage = () => {
  const router = useRouter()
  const [torneos, setTorneos] = useState<any[]>([])
  const [selectedTorneoId, setSelectedTorneoId] = useState<number | null>(null)
  const [torneo, setTorneo] = useState<TorneoWithRelations | null>(null)
  const [encuentros, setEncuentros] = useState<EncuentroWithRelations[]>([])
  const [equiposDescansan, setEquiposDescansan] = useState<Record<number, number[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  // Estados para modales
  const [showFixtureModal, setShowFixtureModal] = useState(false)
  const [showDynamicFixtureModal, setShowDynamicFixtureModal] = useState(false)
  const [showDynamicRegenerateModal, setShowDynamicRegenerateModal] = useState(false)
  const [showEmparejamientosModal, setShowEmparejamientosModal] = useState(false)
  const [showDeleteJornadaModal, setShowDeleteJornadaModal] = useState(false)
  const [jornadaDinamica, setJornadaDinamica] = useState<number>(1)
  const [jornadaAEliminar, setJornadaAEliminar] = useState<number>(1)

  // Cargar lista de torneos
  const loadTorneos = async () => {
    try {
      const torneosData = await getTorneos()
      setTorneos(torneosData)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error al cargar torneos')
    }
  }

  // Cargar datos del torneo seleccionado
  const loadTorneoData = async (torneoId: number) => {
    try {
      setLoading(true)
      setError(null)
      
      const [torneoData, encuentrosData, descansosData] = await Promise.all([
        getTorneoById(torneoId),
        getEncuentrosByTorneo(torneoId),
        getEquiposDescansan(torneoId)
      ])
      
      setTorneo((torneoData ?? null) as TorneoWithRelations | null)
      setEncuentros(encuentrosData as any)
      setEquiposDescansan(descansosData)
      
      console.log('Equipos que descansan cargados desde BD:', descansosData)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error al cargar datos del torneo')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTorneos()
  }, [])

  useEffect(() => {
    if (selectedTorneoId) {
      loadTorneoData(selectedTorneoId)
    } else {
      setTorneo(null)
      setEncuentros([])
      setEquiposDescansan({})
    }
  }, [selectedTorneoId])

  const getJornadaActual = () => {
    const jornadas: Record<number, EncuentroWithRelations[]> = {}
    encuentros.forEach(encuentro => {
      if (encuentro.jornada) {
        if (!jornadas[encuentro.jornada]) {
          jornadas[encuentro.jornada] = []
        }
        jornadas[encuentro.jornada].push(encuentro)
      }
    })
    const jornadasOrdenadas = Object.keys(jornadas)
      .map(Number)
      .sort((a, b) => a - b)
    
    return jornadasOrdenadas.length > 0 ? Math.max(...jornadasOrdenadas) + 1 : 1
  }

  const handleDeleteJornada = async () => {
    if (!selectedTorneoId) return
    
    try {
      const result = await deleteJornada(selectedTorneoId, jornadaAEliminar)
      setSuccess(result.mensaje)
      setShowDeleteJornadaModal(false)
      await loadTorneoData(selectedTorneoId)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error al eliminar jornada')
    }
  }

  const handleGenerarJornadaDinamica = async (jornada: number) => {
    setJornadaDinamica(jornada)
    setShowDynamicFixtureModal(true)
  }

  const handleConfirmarJornadaDinamica = async (jornada: JornadaPropuesta) => {
    if (!selectedTorneoId) return
    
    try {
      const result = await confirmarJornada(selectedTorneoId, jornada)
      setSuccess(result.mensaje)
      
      if (result.equiposQueDescansan && result.equiposQueDescansan.length > 0) {
        setEquiposDescansan(prev => ({ ...prev, [jornada.numero]: result.equiposQueDescansan! }))
      }
      
      setShowDynamicFixtureModal(false)
      await loadTorneoData(selectedTorneoId)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error al confirmar jornada')
    }
  }

  const handleConfirmarRegeneracionDinamica = async (jornada: JornadaPropuesta) => {
    if (!selectedTorneoId) return
    
    try {
      const result = await confirmarRegeneracionJornada(selectedTorneoId, jornada)
      setSuccess(result.mensaje)
      
      if (result.equiposQueDescansan && result.equiposQueDescansan.length > 0) {
        setEquiposDescansan(prev => ({ ...prev, [jornada.numero]: result.equiposQueDescansan! }))
      }
      
      setShowDynamicRegenerateModal(false)
      await loadTorneoData(selectedTorneoId)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error al regenerar jornada')
    }
  }

  const handleSeleccionarEmparejamientos = async (emparejamientos: Array<{equipo1: {id: number, nombre: string}, equipo2: {id: number, nombre: string}}>, fecha?: Date) => {
    if (!selectedTorneoId) return
    
    try {
      const resultado = await crearJornadaConEmparejamientos(selectedTorneoId, emparejamientos, fecha)
      setSuccess(resultado.mensaje)
      await loadTorneoData(selectedTorneoId)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error al crear jornada con emparejamientos seleccionados')
    }
  }

  const navigateToGestionJugadores = (encuentro: EncuentroWithRelations) => {
    router.push(`/gestion-jugadores?encuentroId=${encuentro.id}`)
  }

  const handleSeleccionarHorario = (encuentro: EncuentroWithRelations) => {
    router.push(`/torneos/${selectedTorneoId}?tab=horarios`)
  }

  const handleDownloadFixtureExcel = async () => {
    if (!torneo || encuentros.length === 0) {
      setError('No hay fixture disponible para descargar')
      return
    }

    try {
      const equiposParticipantes = torneo.equiposTorneo || []
      const getEncuentrosPorJornada = () => {
        const jornadas: Record<number, EncuentroWithRelations[]> = {}
        encuentros.forEach(encuentro => {
          if (encuentro.jornada) {
            if (!jornadas[encuentro.jornada]) {
              jornadas[encuentro.jornada] = []
            }
            jornadas[encuentro.jornada].push(encuentro)
          }
        })
        return jornadas
      }
      const getEquiposQueDescansan = (jornada: number) => {
        const equiposIds = equiposDescansan[jornada] || []
        if (equiposIds.length > 0 && torneo?.equiposTorneo) {
          const equiposTorneo = torneo.equiposTorneo.filter(et => equiposIds.includes(et.equipo_id))
          return equiposTorneo.map(et => et.equipo).filter(e => e)
        }
        if (equiposIds.length === 0 && torneo?.equiposTorneo && encuentros.length > 0) {
          const encuentrosJornada = encuentros.filter(e => e.jornada === jornada)
          const equiposQueJuegan = new Set<number>()
          encuentrosJornada.forEach(encuentro => {
            if (encuentro.equipo_local_id) equiposQueJuegan.add(encuentro.equipo_local_id)
            if (encuentro.equipo_visitante_id) equiposQueJuegan.add(encuentro.equipo_visitante_id)
          })
          const equiposQueDescansan = torneo.equiposTorneo.filter(et => 
            et.equipo && !equiposQueJuegan.has(et.equipo_id)
          )
          return equiposQueDescansan.map(et => et.equipo).filter(e => e)
        }
        return []
      }
      const data = await exportFixtureToExcel({
        torneo,
        encuentros,
        equiposParticipantes,
        getEncuentrosPorJornada,
        getEquiposQueDescansan
      })
      
      const fileName = `Fixture_${torneo.nombre.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`
      saveAs(data, fileName)
      
      setSuccess('Fixture descargado exitosamente con colores y estilos')
    } catch (error) {
      console.error('Error al generar el archivo Excel:', error)
      setError('Error al generar el archivo Excel: ' + (error instanceof Error ? error.message : 'Error desconocido'))
    }
  }

  const equiposParticipantes = torneo?.equiposTorneo || []

  return (
    <Container fluid style={{ backgroundColor: '#FCFCFC', minHeight: '100vh' }}>
      <PageBreadcrumb title="Fixture" subtitle="Apps" />

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert variant="success" dismissible onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Selector de Torneo */}
      <Row className="mb-4">
        <Col>
          <Card>
            <CardHeader>
              <h5 className="mb-0">
                <LuTrophy className="me-2 text-primary" />
                Seleccionar Torneo
              </h5>
            </CardHeader>
            <CardBody>
              <FloatingLabel label="Torneo">
                <FormSelect
                  value={selectedTorneoId || ''}
                  onChange={(e) => setSelectedTorneoId(e.target.value ? parseInt(e.target.value) : null)}
                >
                  <option value="">Selecciona un torneo...</option>
                  {torneos.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nombre} {t.categoria?.nombre && `- ${t.categoria.nombre}`}
                    </option>
                  ))}
                </FormSelect>
              </FloatingLabel>
              {selectedTorneoId && torneo && (
                <div className="mt-3">
                  <Badge bg={torneo.estado === 'en_curso' ? 'success' : torneo.estado === 'finalizado' ? 'primary' : 'secondary'}>
                    {torneo.estado === 'planificado' ? 'Planificado' : 
                     torneo.estado === 'en_curso' ? 'En Curso' : 
                     torneo.estado === 'finalizado' ? 'Finalizado' : 'Cancelado'}
                  </Badge>
                  <span className="ms-2 text-muted">
                    {equiposParticipantes.length} equipos • {encuentros.length} encuentros
                  </span>
                </div>
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>

      {!selectedTorneoId ? (
        <Row>
          <Col>
            <Card>
              <CardBody className="text-center py-5">
                <LuTrophy className="fs-1 text-muted mb-3" />
                <h4>Selecciona un torneo</h4>
                <p className="text-muted">Por favor, selecciona un torneo de la lista para ver su fixture</p>
              </CardBody>
            </Card>
          </Col>
        </Row>
      ) : loading ? (
        <Row>
          <Col>
            <Card>
              <CardBody className="text-center py-5">
                <div className="spinner-border" role="status">
                  <span className="visually-hidden">Cargando...</span>
                </div>
              </CardBody>
            </Card>
          </Col>
        </Row>
      ) : !torneo ? (
        <Row>
          <Col>
            <Card>
              <CardBody>
                <Alert variant="danger">El torneo no fue encontrado</Alert>
              </CardBody>
            </Card>
          </Col>
        </Row>
      ) : (
        <>
          {/* Sección Fixture */}
          <Row>
            <Col>
              <Card>
                <CardHeader>
                  <h5 className="mb-0">
                    <LuGamepad2 className="me-2 text-primary" />
                    Fixture del Torneo: {torneo.nombre}
                  </h5>
                </CardHeader>
                <CardBody>
                  <TorneoFixtureSection
                    torneo={torneo}
                    encuentros={encuentros}
                    equiposParticipantes={equiposParticipantes}
                    equiposDescansan={equiposDescansan}
                    onEliminarJornada={(jornada) => {
                      setJornadaAEliminar(jornada)
                      setShowDeleteJornadaModal(true)
                    }}
                    onManagePlayers={navigateToGestionJugadores}
                    onEditHorario={handleSeleccionarHorario}
                    showActions={true}
                  />
                </CardBody>
              </Card>
            </Col>
          </Row>
        </>
      )}

      {/* Modal del Sistema Dinámico */}
      <DynamicFixtureModal
        show={showDynamicFixtureModal}
        onHide={() => setShowDynamicFixtureModal(false)}
        torneoId={selectedTorneoId || 0}
        jornada={jornadaDinamica}
        equipos={equiposParticipantes.map(et => et.equipo!).filter(e => e)}
        onConfirm={handleConfirmarJornadaDinamica}
        isRegenerating={false}
        encuentrosExistentes={encuentros}
        descansosExistentes={equiposDescansan as any}
      />

      {/* Modal de Regeneración Dinámica */}
      <DynamicFixtureModal
        show={showDynamicRegenerateModal}
        onHide={() => setShowDynamicRegenerateModal(false)}
        torneoId={selectedTorneoId || 0}
        jornada={jornadaDinamica}
        equipos={equiposParticipantes.map(et => et.equipo!).filter(e => e)}
        onConfirm={handleConfirmarRegeneracionDinamica}
        onRegenerate={handleConfirmarRegeneracionDinamica}
        isRegenerating={true}
        encuentrosExistentes={encuentros}
        descansosExistentes={equiposDescansan as any}
      />

      {/* Modal de Emparejamientos Faltantes */}
      <EmparejamientosFaltantesModal
        show={showEmparejamientosModal}
        onHide={() => setShowEmparejamientosModal(false)}
        torneoId={selectedTorneoId || 0}
        onSeleccionarEmparejamientos={handleSeleccionarEmparejamientos}
      />

      {/* Modal para eliminar jornada */}
      <Modal show={showDeleteJornadaModal} onHide={() => setShowDeleteJornadaModal(false)}>
        <ModalHeader closeButton>
          <Modal.Title>
            <LuTrash className="me-2" />
            Eliminar Jornada
          </Modal.Title>
        </ModalHeader>
        <ModalBody>
          <Alert variant="danger" className="mb-3">
            <h6><LuTrash className="me-2" />Confirmar Eliminación de Jornada</h6>
            <p className="mb-0">
              <strong>¿Estás seguro de que deseas eliminar la jornada {jornadaAEliminar}?</strong>
            </p>
          </Alert>

          <Alert variant="warning" className="mb-3">
            <h6>Información Importante</h6>
            <ul className="mb-0">
              <li><strong>Se eliminarán:</strong> Todos los encuentros de la jornada {jornadaAEliminar}</li>
              <li><strong>Se eliminará:</strong> El registro de descanso de la jornada {jornadaAEliminar}</li>
              <li><strong>No se puede deshacer:</strong> Esta acción es irreversible</li>
            </ul>
          </Alert>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowDeleteJornadaModal(false)}>
            Cancelar
          </Button>
          <Button 
            variant="danger" 
            onClick={handleDeleteJornada}
          >
            <LuTrash className="me-1" />
            Eliminar Jornada {jornadaAEliminar}
          </Button>
        </ModalFooter>
      </Modal>
    </Container>
  )
}

export default FixturePage

