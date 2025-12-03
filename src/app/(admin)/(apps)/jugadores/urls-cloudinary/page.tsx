'use client'

import { useEffect, useState } from 'react'
import { Container, Card, CardHeader, CardBody, Button, Table, Alert, Row, Col } from 'react-bootstrap'
import { TbDownload, TbCloud, TbRefresh } from 'react-icons/tb'
import PageBreadcrumb from '@/components/PageBreadcrumb'

interface JugadorURL {
  jugador_id: string
  cedula: string
  apellido_nombre: string
  url_cloudinary: string
  public_id: string
  encontrado: boolean
}

export default function URLsCloudinaryPage() {
  const [urls, setUrls] = useState<JugadorURL[]>([])
  const [loading, setLoading] = useState(false)
  const [actualizando, setActualizando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const cargarURLs = async () => {
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/jugadores/urls-cloudinary')
      if (!response.ok) {
        throw new Error('Error al obtener las URLs')
      }

      const data = await response.json()
      setUrls(data.urls || [])
      setSuccess(`Se encontraron ${data.urls?.length || 0} URLs de Cloudinary`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar las URLs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarURLs()
  }, [])

  const exportarJSON = () => {
    const dataStr = JSON.stringify(urls, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `urls-cloudinary-${new Date().toISOString().split('T')[0]}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const exportarCSV = () => {
    const headers = 'jugador_id,cedula,apellido_nombre,url_cloudinary,public_id\n'
    const rows = urls.map(u => 
      `"${u.jugador_id}","${u.cedula}","${u.apellido_nombre}","${u.url_cloudinary}","${u.public_id}"`
    ).join('\n')
    
    const csv = headers + rows
    const dataBlob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `urls-cloudinary-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const copiarURL = (url: string) => {
    navigator.clipboard.writeText(url)
    setSuccess('URL copiada al portapapeles')
    setTimeout(() => setSuccess(null), 2000)
  }

  const actualizarBaseDeDatos = async () => {
    if (!confirm('¿Estás seguro de actualizar la base de datos con las URLs de Cloudinary?')) {
      return
    }

    setActualizando(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/jugadores/urls-cloudinary', {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Error al actualizar la base de datos')
      }

      const data = await response.json()
      setSuccess(`✅ Base de datos actualizada: ${data.actualizados} jugadores actualizados, ${data.noEncontrados} no encontrados`)
      
      // Recargar las URLs
      await cargarURLs()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar la base de datos')
    } finally {
      setActualizando(false)
    }
  }

  return (
    <Container fluid className="py-4">
      <PageBreadcrumb title="URLs Cloudinary" subtitle="Jugadores" />

      <Row className="mb-4">
        <Col>
          <Card>
            <CardHeader className="d-flex justify-content-between align-items-center">
              <div>
                <h4 className="mb-0">
                  <TbCloud className="me-2" />
                  URLs de Imágenes en Cloudinary
                </h4>
                <p className="text-muted mb-0 mt-1">
                  Consulta y exporta las URLs de todas las imágenes almacenadas en Cloudinary
                </p>
              </div>
              <div className="d-flex gap-2">
                <Button
                  variant="outline-primary"
                  onClick={cargarURLs}
                  disabled={loading || actualizando}
                >
                  <TbRefresh className="me-1" />
                  {loading ? 'Cargando...' : 'Actualizar Lista'}
                </Button>
                <Button
                  variant="warning"
                  onClick={actualizarBaseDeDatos}
                  disabled={urls.length === 0 || actualizando}
                >
                  <TbCloud className="me-1" />
                  {actualizando ? 'Actualizando BD...' : 'Actualizar Base de Datos'}
                </Button>
                <Button variant="primary" onClick={exportarJSON} disabled={urls.length === 0}>
                  <TbDownload className="me-1" />
                  Exportar JSON
                </Button>
                <Button variant="success" onClick={exportarCSV} disabled={urls.length === 0}>
                  <TbDownload className="me-1" />
                  Exportar CSV
                </Button>
              </div>
            </CardHeader>
            <CardBody>
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

              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Cargando...</span>
                  </div>
                  <p className="mt-3">Consultando Cloudinary...</p>
                </div>
              ) : urls.length === 0 ? (
                <Alert variant="info">
                  No se encontraron URLs de Cloudinary. Asegúrate de que hay imágenes subidas.
                </Alert>
              ) : (
                <>
                  <div className="mb-3">
                    <strong>Total de URLs encontradas: {urls.length}</strong>
                    {' '}
                    ({urls.filter(u => u.encontrado).length} asociadas a jugadores)
                  </div>

                  <div className="table-responsive" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                    <Table striped bordered hover>
                      <thead style={{ position: 'sticky', top: 0, backgroundColor: 'white', zIndex: 10 }}>
                        <tr>
                          <th>Jugador</th>
                          <th>Cédula</th>
                          <th>URL Cloudinary</th>
                          <th>Public ID</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {urls.map((item, index) => (
                          <tr key={index}>
                            <td>
                              {item.encontrado ? (
                                <strong>{item.apellido_nombre}</strong>
                              ) : (
                                <span className="text-muted">No encontrado</span>
                              )}
                            </td>
                            <td>{item.cedula}</td>
                            <td>
                              <div className="d-flex align-items-center gap-2">
                                <code className="small" style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {item.url_cloudinary}
                                </code>
                                <Button
                                  variant="link"
                                  size="sm"
                                  onClick={() => copiarURL(item.url_cloudinary)}
                                  title="Copiar URL"
                                >
                                  📋
                                </Button>
                              </div>
                            </td>
                            <td>
                              <code className="small">{item.public_id}</code>
                            </td>
                            <td>
                              <Button
                                variant="link"
                                size="sm"
                                href={item.url_cloudinary}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                Ver Imagen
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                </>
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>
    </Container>
  )
}

