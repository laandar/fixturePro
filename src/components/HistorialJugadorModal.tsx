'use client'

import { useState, useEffect } from 'react'
import { Modal, Button, Table, Form, Row, Col, FloatingLabel, FormControl, FormSelect, Alert, Spinner } from 'react-bootstrap'
import { TbPlus, TbEdit, TbTrash, TbCheck, TbX } from 'react-icons/tb'
import type { HistorialJugadorWithRelations } from '@/db/types'
import { getHistorialJugador, createHistorialJugador, updateHistorialJugador, deleteHistorialJugador } from '@/app/(admin)/(apps)/jugadores/actions'
import ConfirmationModal from '@/components/table/DeleteConfirmationModal'

interface HistorialJugadorModalProps {
  show: boolean
  onHide: () => void
  jugadorId: number
  jugadorNombre: string
}

interface FormData {
  liga: string
  equipo: string
  numero: string
  nombre_calificacion: string
  disciplina: string
  fecha_calificacion: string
}

const HistorialJugadorModal = ({ show, onHide, jugadorId, jugadorNombre }: HistorialJugadorModalProps) => {
  const [historial, setHistorial] = useState<HistorialJugadorWithRelations[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  // Estados para el modal de confirmación de eliminación
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [registroToDelete, setRegistroToDelete] = useState<HistorialJugadorWithRelations | null>(null)
  
  // Estados para el formulario de creación
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [createFormData, setCreateFormData] = useState<FormData>({
    liga: '',
    equipo: '',
    numero: '',
    nombre_calificacion: '',
    disciplina: '',
    fecha_calificacion: '',
  })
  
  // Estados para edición inline
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editFormData, setEditFormData] = useState<FormData>({
    liga: '',
    equipo: '',
    numero: '',
    nombre_calificacion: '',
    disciplina: '',
    fecha_calificacion: '',
  })

  const loadHistorial = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getHistorialJugador(jugadorId)
      setHistorial(data)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error al cargar historial')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (show) {
      loadHistorial()
      setShowCreateForm(false)
      setEditingId(null)
    }
  }, [show, jugadorId])

  const handleCreate = async () => {
    try {
      setLoading(true)
      setError(null)
      setSuccess(null)

      // Validar y parsear el número
      const numeroParseado = createFormData.numero ? parseInt(createFormData.numero, 10) : null
      const numeroValido = numeroParseado !== null && !isNaN(numeroParseado) ? numeroParseado : null

      await createHistorialJugador({
        jugador_id: jugadorId,
        liga: createFormData.liga,
        equipo: createFormData.equipo || null,
        numero: numeroValido,
        nombre_calificacion: createFormData.nombre_calificacion || null,
        disciplina: createFormData.disciplina || null,
        fecha_calificacion: createFormData.fecha_calificacion || null,
      })

      setSuccess('Registro creado exitosamente')
      setShowCreateForm(false)
      setCreateFormData({
        liga: '',
        equipo: '',
        numero: '',
        nombre_calificacion: '',
        disciplina: '',
        fecha_calificacion: '',
      })
      await loadHistorial()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error al crear registro')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (registro: HistorialJugadorWithRelations) => {
    setEditingId(registro.id)
    setEditFormData({
      liga: registro.liga || '',
      equipo: registro.equipo || '',
      numero: registro.numero?.toString() || '',
      nombre_calificacion: registro.nombre_calificacion || '',
      disciplina: registro.disciplina || '',
      fecha_calificacion: registro.fecha_calificacion || '',
    })
  }

  const handleUpdate = async () => {
    if (!editingId) return

    try {
      setLoading(true)
      setError(null)
      setSuccess(null)

      // Validar y parsear el número
      const numeroParseado = editFormData.numero ? parseInt(editFormData.numero, 10) : null
      const numeroValido = numeroParseado !== null && !isNaN(numeroParseado) ? numeroParseado : null

      await updateHistorialJugador(editingId, {
        liga: editFormData.liga,
        equipo: editFormData.equipo || null,
        numero: numeroValido,
        nombre_calificacion: editFormData.nombre_calificacion || null,
        disciplina: editFormData.disciplina || null,
        fecha_calificacion: editFormData.fecha_calificacion || null,
      })

      setSuccess('Registro actualizado exitosamente')
      setEditingId(null)
      await loadHistorial()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error al actualizar registro')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteClick = (registro: HistorialJugadorWithRelations) => {
    setRegistroToDelete(registro)
    setShowDeleteModal(true)
  }

  const handleDeleteConfirm = async () => {
    if (!registroToDelete) return

    try {
      setLoading(true)
      setError(null)
      setSuccess(null)

      await deleteHistorialJugador(registroToDelete.id)
      setSuccess('Registro eliminado exitosamente')
      setShowDeleteModal(false)
      setRegistroToDelete(null)
      await loadHistorial()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error al eliminar registro')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteCancel = () => {
    setShowDeleteModal(false)
    setRegistroToDelete(null)
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditFormData({
      liga: '',
      equipo: '',
      numero: '',
      nombre_calificacion: '',
      disciplina: '',
      fecha_calificacion: '',
    })
  }

  return (
    <Modal show={show} onHide={onHide} size="xl" centered>
      <Modal.Header closeButton>
        <Modal.Title>Historial del Jugador: {jugadorNombre}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
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

        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="mb-0">Registros: {historial.length}</h5>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowCreateForm(!showCreateForm)}
            disabled={loading}
          >
            <TbPlus className="me-1" />
            {showCreateForm ? 'Cancelar' : 'Agregar Registro'}
          </Button>
        </div>

        {/* Formulario de creación */}
        {showCreateForm && (
          <div className="border rounded p-3 mb-3 bg-light">
            <h6 className="mb-3">Nuevo Registro</h6>
            <Row className="g-2">
              <Col md={4}>
                <FloatingLabel label="Liga *">
                  <FormControl
                    type="text"
                    placeholder="Liga"
                    value={createFormData.liga}
                    onChange={(e) => setCreateFormData({ ...createFormData, liga: e.target.value })}
                  />
                </FloatingLabel>
              </Col>
              <Col md={4}>
                <FloatingLabel label="Equipo">
                  <FormControl
                    type="text"
                    placeholder="Equipo"
                    value={createFormData.equipo}
                    onChange={(e) => setCreateFormData({ ...createFormData, equipo: e.target.value })}
                  />
                </FloatingLabel>
              </Col>
              <Col md={4}>
                <FloatingLabel label="Número">
                  <FormControl
                    type="number"
                    placeholder="Número"
                    value={createFormData.numero}
                    onChange={(e) => setCreateFormData({ ...createFormData, numero: e.target.value })}
                  />
                </FloatingLabel>
              </Col>
              <Col md={4}>
                <FloatingLabel label="Nombre Calificación">
                  <FormControl
                    type="text"
                    placeholder="Nombre Calificación"
                    value={createFormData.nombre_calificacion}
                    onChange={(e) => setCreateFormData({ ...createFormData, nombre_calificacion: e.target.value })}
                  />
                </FloatingLabel>
              </Col>
              <Col md={4}>
                <FloatingLabel label="Disciplina">
                  <FormControl
                    type="text"
                    placeholder="Disciplina"
                    value={createFormData.disciplina}
                    onChange={(e) => setCreateFormData({ ...createFormData, disciplina: e.target.value })}
                  />
                </FloatingLabel>
              </Col>
              <Col md={4}>
                <FloatingLabel label="Fecha Calificación">
                  <FormControl
                    type="date"
                    placeholder="Fecha Calificación"
                    value={createFormData.fecha_calificacion}
                    onChange={(e) => setCreateFormData({ ...createFormData, fecha_calificacion: e.target.value })}
                  />
                </FloatingLabel>
              </Col>
              <Col xs={12}>
                <div className="d-flex gap-2 justify-content-end">
                  <Button
                    variant="light"
                    size="sm"
                    onClick={() => setShowCreateForm(false)}
                    disabled={loading}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="success"
                    size="sm"
                    onClick={handleCreate}
                    disabled={loading || !createFormData.liga}
                  >
                    {loading ? <Spinner size="sm" /> : <TbCheck className="me-1" />}
                    Guardar
                  </Button>
                </div>
              </Col>
            </Row>
          </div>
        )}

        {/* Tabla de historial */}
        <div className="table-responsive">
          <Table striped bordered hover>
            <thead>
              <tr>
                <th>Liga</th>
                <th>Equipo</th>
                <th>Número</th>
                <th>Nombre Calificación</th>
                <th>Disciplina</th>
                <th>Fecha Calificación</th>
                <th style={{ width: '120px' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading && historial.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-4">
                    <Spinner animation="border" size="sm" className="me-2" />
                    Cargando...
                  </td>
                </tr>
              ) : historial.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-4 text-muted">
                    No hay registros en el historial
                  </td>
                </tr>
              ) : (
                historial.map((registro) => (
                  <tr key={registro.id}>
                    {editingId === registro.id ? (
                      <>
                        <td>
                          <FormControl
                            type="text"
                            size="sm"
                            value={editFormData.liga}
                            onChange={(e) => setEditFormData({ ...editFormData, liga: e.target.value })}
                          />
                        </td>
                        <td>
                          <FormControl
                            type="text"
                            size="sm"
                            value={editFormData.equipo}
                            onChange={(e) => setEditFormData({ ...editFormData, equipo: e.target.value })}
                          />
                        </td>
                        <td>
                          <FormControl
                            type="number"
                            size="sm"
                            value={editFormData.numero}
                            onChange={(e) => setEditFormData({ ...editFormData, numero: e.target.value })}
                          />
                        </td>
                        <td>
                          <FormControl
                            type="text"
                            size="sm"
                            value={editFormData.nombre_calificacion}
                            onChange={(e) => setEditFormData({ ...editFormData, nombre_calificacion: e.target.value })}
                          />
                        </td>
                        <td>
                          <FormControl
                            type="text"
                            size="sm"
                            value={editFormData.disciplina}
                            onChange={(e) => setEditFormData({ ...editFormData, disciplina: e.target.value })}
                          />
                        </td>
                        <td>
                          <FormControl
                            type="date"
                            size="sm"
                            value={editFormData.fecha_calificacion}
                            onChange={(e) => setEditFormData({ ...editFormData, fecha_calificacion: e.target.value })}
                          />
                        </td>
                        <td>
                          <div className="d-flex gap-1">
                            <Button
                              variant="success"
                              size="sm"
                              className="btn-icon"
                              onClick={handleUpdate}
                              disabled={loading}
                              title="Guardar cambios"
                            >
                              <TbCheck />
                            </Button>
                            <Button
                              variant="light"
                              size="sm"
                              className="btn-icon"
                              onClick={handleCancelEdit}
                              disabled={loading}
                              title="Cancelar edición"
                            >
                              <TbX />
                            </Button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td>{registro.liga}</td>
                        <td>{registro.equipo || '-'}</td>
                        <td>{registro.numero || '-'}</td>
                        <td>{registro.nombre_calificacion || '-'}</td>
                        <td>{registro.disciplina || '-'}</td>
                        <td>
                          {registro.fecha_calificacion
                            ? new Date(registro.fecha_calificacion).toLocaleDateString('es-ES')
                            : '-'}
                        </td>
                        <td>
                          <div className="d-flex gap-1">
                            <Button
                              variant="light"
                              size="sm"
                              className="btn-icon"
                              onClick={() => handleEdit(registro)}
                              disabled={loading || editingId !== null}
                              title="Editar registro"
                            >
                              <TbEdit />
                            </Button>
                            <Button
                              variant="light"
                              size="sm"
                              className="btn-icon"
                              onClick={() => handleDeleteClick(registro)}
                              disabled={loading || editingId !== null}
                              title="Eliminar registro"
                            >
                              <TbTrash />
                            </Button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide} disabled={loading}>
          Cerrar
        </Button>
      </Modal.Footer>

      {/* Modal de confirmación de eliminación */}
      <ConfirmationModal
        show={showDeleteModal}
        onHide={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        itemName="registro del historial"
        variant="danger"
        isLoading={loading}
        message={
          registroToDelete
            ? `¿Está seguro de eliminar el registro de la liga "${registroToDelete.liga}"${
                registroToDelete.equipo ? ` con el equipo "${registroToDelete.equipo}"` : ''
              }?`
            : '¿Está seguro de eliminar este registro?'
        }
      />
    </Modal>
  )
}

export default HistorialJugadorModal

