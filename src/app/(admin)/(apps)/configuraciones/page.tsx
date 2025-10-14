'use client'

import { useEffect, useState } from 'react'
import { Container, Row, Col, Card, CardHeader, CardBody, Form, FloatingLabel, FormControl, Button, Alert, Accordion, Badge } from 'react-bootstrap'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import { getConfiguraciones, updateConfiguracionPorClave, inicializarConfiguracionesPorDefecto, agregarConfiguracionesFaltantes } from './actions'
import type { Configuracion } from '@/db/types'
import { TbDeviceFloppy, TbRefresh, TbAlertCircle } from 'react-icons/tb'

const Page = () => {
  const [configuraciones, setConfiguraciones] = useState<Configuracion[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  // Estados para los valores editables
  const [valores, setValores] = useState<Record<string, string>>({})

  const loadConfiguraciones = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Primero inicializar configuraciones por defecto si no existen
      await inicializarConfiguracionesPorDefecto()
      
      // Agregar configuraciones faltantes (si se agregaron nuevas)
      await agregarConfiguracionesFaltantes()
      
      const data = await getConfiguraciones()
      setConfiguraciones(data)
      
      // Inicializar valores editables
      const valoresIniciales: Record<string, string> = {}
      data.forEach((config) => {
        valoresIniciales[config.clave] = config.valor
      })
      setValores(valoresIniciales)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error al cargar configuraciones')
    } finally {
      setLoading(false)
    }
  }

  const handleGuardar = async () => {
    try {
      setSaving(true)
      setError(null)
      setSuccess(null)

      // Actualizar todas las configuraciones que hayan cambiado
      for (const config of configuraciones) {
        if (valores[config.clave] !== config.valor) {
          await updateConfiguracionPorClave(config.clave, valores[config.clave])
        }
      }

      setSuccess('Configuraciones guardadas exitosamente')
      await loadConfiguraciones()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error al guardar configuraciones')
    } finally {
      setSaving(false)
    }
  }

  const handleRestaurar = () => {
    const valoresIniciales: Record<string, string> = {}
    configuraciones.forEach((config) => {
      valoresIniciales[config.clave] = config.valor
    })
    setValores(valoresIniciales)
    setSuccess('Valores restaurados')
  }

  useEffect(() => {
    loadConfiguraciones()
  }, [])

  // Agrupar configuraciones por categoría
  const configsPorCategoria = configuraciones.reduce((acc, config) => {
    if (!acc[config.categoria]) {
      acc[config.categoria] = []
    }
    acc[config.categoria].push(config)
    return acc
  }, {} as Record<string, Configuracion[]>)

  const getTituloCategoria = (categoria: string) => {
    const titulos: Record<string, string> = {
      'sanciones': 'Sanciones Deportivas',
      'valores_economicos': 'Valores Económicos',
      'puntos': 'Sistema de Puntos',
      'general': 'Configuración General',
    }
    return titulos[categoria] || categoria
  }

  const getIconoCategoria = (categoria: string) => {
    const iconos: Record<string, string> = {
      'sanciones': '⚠️',
      'valores_economicos': '💰',
      'puntos': '🏆',
      'general': '⚙️',
    }
    return iconos[categoria] || '📋'
  }

  if (loading) {
    return (
      <Container fluid>
        <PageBreadcrumb title="Configuraciones" subtitle="Sistema" />
        <div className="text-center py-5">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Cargando...</span>
          </div>
        </div>
      </Container>
    )
  }

  return (
    <Container fluid>
      <PageBreadcrumb title="Configuraciones del Sistema" subtitle="Administración" />

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          <TbAlertCircle className="me-2" />
          {error}
        </Alert>
      )}

      {success && (
        <Alert variant="success" dismissible onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <Row>
        <Col lg={12}>
          <Card>
            <CardHeader className="d-flex justify-content-between align-items-center">
              <div>
                <h4 className="mb-1">Configuraciones del Sistema</h4>
                <p className="text-muted mb-0 small">
                  Configure las reglas y parámetros del sistema
                </p>
              </div>
              <div className="d-flex gap-2">
                <Button
                  variant="outline-secondary"
                  onClick={handleRestaurar}
                  disabled={saving}
                >
                  <TbRefresh className="me-1" />
                  Restaurar
                </Button>
                <Button
                  variant="primary"
                  onClick={handleGuardar}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <TbDeviceFloppy className="me-1" />
                      Guardar Cambios
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardBody>
              <Accordion defaultActiveKey={['0']} alwaysOpen>
                {Object.entries(configsPorCategoria).map(([categoria, configs], index) => (
                  <Accordion.Item eventKey={index.toString()} key={categoria}>
                    <Accordion.Header>
                      <div className="d-flex align-items-center gap-2">
                        <span className="fs-4">{getIconoCategoria(categoria)}</span>
                        <div>
                          <h5 className="mb-0">{getTituloCategoria(categoria)}</h5>
                          <small className="text-muted">{configs.length} configuraciones</small>
                        </div>
                      </div>
                    </Accordion.Header>
                    <Accordion.Body>
                      <Row className="g-3">
                        {configs.map((config) => (
                          <Col md={6} key={config.id}>
                            <div className="border rounded p-3 h-100">
                              <div className="d-flex justify-content-between align-items-start mb-2">
                                <div className="flex-grow-1">
                                  <label className="form-label fw-semibold mb-1">
                                    {config.descripcion || config.clave}
                                  </label>
                                  <div className="d-flex gap-2 mb-2">
                                    <Badge bg="light" text="dark" className="text-uppercase">
                                      {config.tipo}
                                    </Badge>
                                    <code className="small text-muted">{config.clave}</code>
                                  </div>
                                </div>
                              </div>
                              
                              {config.tipo === 'number' ? (
                                <FormControl
                                  type="number"
                                  step={config.clave.includes('valor') ? '0.01' : '1'}
                                  min="0"
                                  value={valores[config.clave] || ''}
                                  onChange={(e) =>
                                    setValores({ ...valores, [config.clave]: e.target.value })
                                  }
                                  disabled={saving}
                                />
                              ) : config.tipo === 'boolean' ? (
                                <Form.Check
                                  type="switch"
                                  checked={valores[config.clave] === 'true'}
                                  onChange={(e) =>
                                    setValores({
                                      ...valores,
                                      [config.clave]: e.target.checked ? 'true' : 'false',
                                    })
                                  }
                                  disabled={saving}
                                />
                              ) : (
                                <FormControl
                                  type="text"
                                  value={valores[config.clave] || ''}
                                  onChange={(e) =>
                                    setValores({ ...valores, [config.clave]: e.target.value })
                                  }
                                  disabled={saving}
                                />
                              )}
                              
                              {valores[config.clave] !== config.valor && (
                                <div className="mt-2">
                                  <small className="text-warning">
                                    <TbAlertCircle className="me-1" />
                                    Valor modificado (original: {config.valor})
                                  </small>
                                </div>
                              )}
                            </div>
                          </Col>
                        ))}
                      </Row>
                    </Accordion.Body>
                  </Accordion.Item>
                ))}
              </Accordion>

              {Object.keys(configsPorCategoria).length === 0 && (
                <Alert variant="info" className="mb-0">
                  No hay configuraciones disponibles. Se inicializarán las configuraciones por defecto.
                </Alert>
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>

      {/* Información adicional */}
      <Row className="mt-3">
        <Col lg={12}>
          <Card className="bg-light">
            <CardBody>
              <h6 className="mb-2">
                <TbAlertCircle className="me-2" />
                Información Importante
              </h6>
              <ul className="mb-0 small text-muted">
                <li>Los cambios en las configuraciones se aplicarán inmediatamente en todo el sistema</li>
                <li>Los valores económicos se expresan en dólares (USD)</li>
                <li>Las sanciones se expresan en número de partidos</li>
                <li>Los puntos pueden ser positivos o negativos (use - para penalizaciones)</li>
                <li>WO (walkover) se refiere a partidos no jugados por incomparecencia de un equipo</li>
                <li>Los goles por WO definen el marcador ficticio asignado (ej: 3-0 significa 3 goles a favor, 0 en contra)</li>
                <li>Asegúrese de guardar los cambios antes de salir de esta página</li>
              </ul>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </Container>
  )
}

export default Page

