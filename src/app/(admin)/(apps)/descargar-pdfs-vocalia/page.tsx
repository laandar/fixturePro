'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Container, Row, Col, Card, Button, Form, Alert, Spinner } from 'react-bootstrap'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import { getCategorias } from '@/app/(admin)/(apps)/jugadores/actions'
import { getEncuentrosCompletosPorCategoriaJornada, getJornadasDisponiblesPorCategoria } from '@/app/(admin)/(apps)/gestion-jugadores/actions'
import { generarPDFHojaVocalia } from '@/lib/pdf-generator'
import jsPDF from 'jspdf'

const DescargarPDFsVocaliaPage = () => {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [categorias, setCategorias] = useState<any[]>([])
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<number | null>(null)
  const [jornadaSeleccionada, setJornadaSeleccionada] = useState<number | null>(null)
  const [jornadasDisponibles, setJornadasDisponibles] = useState<number[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Protección de autenticación
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth-3/sign-in')
    }
  }, [status, router])

  // Cargar categorías
  useEffect(() => {
    const loadCategorias = async () => {
      try {
        const categoriasData = await getCategorias()
        setCategorias(categoriasData.filter((c: any) => c.estado === true))
      } catch (error) {
        console.error('Error al cargar categorías:', error)
        setError('Error al cargar categorías')
      }
    }
    loadCategorias()
  }, [])

  // Cuando se selecciona una categoría, obtener jornadas disponibles
  useEffect(() => {
    const loadJornadas = async () => {
      if (!categoriaSeleccionada) {
        setJornadasDisponibles([])
        return
      }

      try {
        const jornadas = await getJornadasDisponiblesPorCategoria(categoriaSeleccionada)
        setJornadasDisponibles(jornadas)
      } catch (error) {
        console.error('Error al cargar jornadas:', error)
        setError('Error al cargar jornadas disponibles')
      }
    }

    loadJornadas()
  }, [categoriaSeleccionada])

  const handleDescargarPDFs = async () => {
    if (!categoriaSeleccionada || !jornadaSeleccionada) {
      setError('Por favor selecciona una categoría y una jornada')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      // Obtener todos los encuentros de la categoría y jornada
      const encuentros = await getEncuentrosCompletosPorCategoriaJornada(
        categoriaSeleccionada,
        jornadaSeleccionada
      )

      if (encuentros.length === 0) {
        setError('No se encontraron encuentros para la categoría y jornada seleccionadas')
        setLoading(false)
        return
      }

      // Obtener nombre de la categoría
      const categoria = categorias.find((c: any) => c.id === categoriaSeleccionada)
      const categoriaNombre = categoria?.nombre || ''

      // Generar un PDF por cada encuentro
      for (let i = 0; i < encuentros.length; i++) {
        const encuentro = encuentros[i]
        const pdf = await generarPDFHojaVocalia(encuentro, categoriaNombre, jornadaSeleccionada)

        // Nombre del archivo
        const equipoLocalNombre = encuentro.equipoLocal?.nombre || 'Equipo Local'
        const equipoVisitanteNombre = encuentro.equipoVisitante?.nombre || 'Equipo Visitante'
        const fileName = `Hoja_Vocalia_${categoriaNombre}_J${jornadaSeleccionada}_${equipoLocalNombre}_vs_${equipoVisitanteNombre}.pdf`
          .replace(/[^a-zA-Z0-9_]/g, '_')

        // Descargar el PDF
        pdf.save(fileName)

        // Pequeña pausa entre descargas para evitar problemas
        if (i < encuentros.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      }

      setSuccess(`Se descargaron ${encuentros.length} PDF(s) exitosamente`)
    } catch (error) {
      console.error('Error al generar PDFs:', error)
      setError('Error al generar los PDFs: ' + (error instanceof Error ? error.message : 'Error desconocido'))
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading') {
    return (
      <Container fluid>
        <div className="text-center py-5">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Cargando...</span>
          </Spinner>
        </div>
      </Container>
    )
  }

  if (status === 'unauthenticated') {
    return null
  }

  return (
    <Container fluid>
      <PageBreadcrumb title="Descargar PDFs de Hoja de Vocalía" />
      
      <Row>
        <Col lg={8} className="mx-auto">
          <Card>
            <Card.Header>
              <Card.Title>Descargar PDFs de Hoja de Vocalía</Card.Title>
            </Card.Header>
            <Card.Body>
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

              <Form>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Categoría</Form.Label>
                      <Form.Select
                        value={categoriaSeleccionada || ''}
                        onChange={(e) => {
                          setCategoriaSeleccionada(e.target.value ? parseInt(e.target.value) : null)
                          setJornadaSeleccionada(null)
                        }}
                        disabled={loading}
                      >
                        <option value="">Selecciona una categoría</option>
                        {categorias.map((categoria: any) => (
                          <option key={categoria.id} value={categoria.id}>
                            {categoria.nombre}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Jornada</Form.Label>
                      <Form.Select
                        value={jornadaSeleccionada || ''}
                        onChange={(e) => setJornadaSeleccionada(e.target.value ? parseInt(e.target.value) : null)}
                        disabled={loading || !categoriaSeleccionada || jornadasDisponibles.length === 0}
                      >
                        <option value="">
                          {!categoriaSeleccionada
                            ? 'Primero selecciona una categoría'
                            : jornadasDisponibles.length === 0
                            ? 'No hay jornadas disponibles'
                            : 'Selecciona una jornada'}
                        </option>
                        {jornadasDisponibles.map((jornada) => (
                          <option key={jornada} value={jornada}>
                            Jornada {jornada}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>

                <div className="d-grid gap-2">
                  <Button
                    variant="primary"
                    onClick={handleDescargarPDFs}
                    disabled={loading || !categoriaSeleccionada || !jornadaSeleccionada}
                  >
                    {loading ? (
                      <>
                        <Spinner animation="border" size="sm" className="me-2" />
                        Generando PDFs...
                      </>
                    ) : (
                      'Descargar PDFs de Hoja de Vocalía'
                    )}
                  </Button>
                </div>
              </Form>

              <Alert variant="info" className="mt-3">
                <strong>Nota:</strong> Se generará un PDF por cada encuentro de la categoría y jornada seleccionadas.
                Los archivos se descargarán automáticamente.
              </Alert>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  )
}

export default DescargarPDFsVocaliaPage

