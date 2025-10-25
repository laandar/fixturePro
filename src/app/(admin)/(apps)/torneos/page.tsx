'use client'
import { useEffect, useState } from 'react'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import DataTable from '@/components/table/DataTable'
import ConfirmationModal from '@/components/table/DeleteConfirmationModal'
import TablePagination from '@/components/table/TablePagination'
import { toPascalCase } from '@/helpers/casing'
import useToggle from '@/hooks/useToggle'
import { usePermisos } from '@/hooks/usePermisos'
import {
  ColumnFiltersState,
  createColumnHelper,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  Row as TableRow,
  Table as TableType,
  useReactTable,
} from '@tanstack/react-table'
import Image from 'next/image'
import Link from 'next/link'
import { Button, Card, CardFooter, CardHeader, Col, Container, FloatingLabel, Form, FormControl, FormSelect, Offcanvas, OffcanvasBody, OffcanvasHeader, OffcanvasTitle, Row, Alert, Badge } from 'react-bootstrap'
import { LuSearch, LuTrophy, LuCalendar, LuUsers, LuGamepad2 } from 'react-icons/lu'
import { TbEdit, TbEye, TbPlus, TbTrash, TbSettings } from 'react-icons/tb'
import { getTorneos, deleteTorneo, createTorneo, updateTorneo } from './actions'
import { getCategorias } from '../categorias/actions'
import type { TorneoWithRelations, Categoria } from '@/db/types'

const columnHelper = createColumnHelper<TorneoWithRelations>()

const Page = () => {
  const { isTrue: showOffcanvas, toggle: toggleOffcanvas } = useToggle()
  const { isTrue: showEditOffcanvas, toggle: toggleEditOffcanvas } = useToggle()
  const { puedeVer, puedeCrear, puedeEditar, puedeEliminar, cargando: cargandoPermisos } = usePermisos('torneos')
  
  const [data, setData] = useState<TorneoWithRelations[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)
  const [editingTorneo, setEditingTorneo] = useState<TorneoWithRelations | null>(null)
  const [editFormError, setEditFormError] = useState<string | null>(null)
  const [editFormSuccess, setEditFormSuccess] = useState<string | null>(null)
  
  const columns = [
    columnHelper.accessor('nombre', {
      header: 'Nombre del Torneo',
      cell: ({ row }) => (
        <div className="d-flex justify-content-start align-items-center gap-2">
          <div className="avatar avatar-sm">
            <div className="avatar-title bg-primary-subtle text-primary rounded-circle">
              <LuTrophy className="fs-lg" />
            </div>
          </div>
          <div>
            <h5 className="text-nowrap mb-0 lh-base fs-base">
              <Link href={`/torneos/${row.original.id}`} className="link-reset">
                {row.original.nombre}
              </Link>
            </h5>
            <p className="text-muted fs-xs mb-0">{row.original.descripcion || 'Sin descripción'}</p>
          </div>
        </div>
      ),
    }),
    columnHelper.accessor('categoria', { 
      header: 'Categoría',
      cell: ({ row }) => (
        <span className="badge p-1 text-bg-light fs-sm">
          <LuTrophy className="me-1" /> {row.original.categoria?.nombre || 'Sin categoría'}
        </span>
      )
    }),
    {
      id: 'tipo_torneo',
      header: 'Tipo',
      cell: ({ row }: { row: TableRow<TorneoWithRelations> }) => {
        const tipo = row.original.tipo_torneo
        const tipoLabels: Record<string, string> = {
          liga: 'Liga',
          eliminacion: 'Eliminación',
          grupos: 'Grupos'
        }
        return (
          <Badge bg={tipo === 'liga' ? 'primary' : tipo === 'eliminacion' ? 'danger' : 'warning'}>
            {tipo ? tipoLabels[tipo] || tipo : 'Sin tipo'}
          </Badge>
        )
      },
    },
    {
      id: 'equipos_count',
      header: 'Equipos',
      cell: ({ row }: { row: TableRow<TorneoWithRelations> }) => (
        <div className="d-flex align-items-center gap-1">
          <LuUsers className="text-muted" />
          <span>{row.original.equiposTorneo?.length || 0}</span>
        </div>
      ),
    },
    {
      id: 'encuentros_count',
      header: 'Encuentros',
      cell: ({ row }: { row: TableRow<TorneoWithRelations> }) => (
        <div className="d-flex align-items-center gap-1">
          <LuGamepad2 className="text-muted" />
          <span>{row.original.encuentros?.length || 0}</span>
        </div>
      ),
    },
    {
      id: 'fechas',
      header: 'Período',
      cell: ({ row }: { row: TableRow<TorneoWithRelations> }) => (
        <div className="text-center">
          <div className="fs-sm fw-semibold">
            {row.original.fecha_inicio ? new Date(row.original.fecha_inicio).toLocaleDateString('es-ES') : 'N/A'}
          </div>
          <div className="fs-xs text-muted">
            {row.original.fecha_fin ? new Date(row.original.fecha_fin).toLocaleDateString('es-ES') : 'N/A'}
          </div>
        </div>
      ),
    },
    {
      id: 'estado',
      header: 'Estado',
      cell: ({ row }: { row: TableRow<TorneoWithRelations> }) => {
        const estado = row.original.estado
        const estadoConfig: Record<string, { bg: string; text: string; label: string }> = {
          planificado: { bg: 'secondary', text: 'secondary', label: 'Planificado' },
          en_curso: { bg: 'success', text: 'success', label: 'En Curso' },
          finalizado: { bg: 'primary', text: 'primary', label: 'Finalizado' },
          cancelado: { bg: 'danger', text: 'danger', label: 'Cancelado' }
        }
        const config = estado ? estadoConfig[estado] || { bg: 'secondary', text: 'secondary', label: estado } : { bg: 'secondary', text: 'secondary', label: 'Sin estado' }
        
        return (
          <Badge bg={config.bg} className={`text-${config.text}`}>
            {config.label}
          </Badge>
        )
      },
    },
    {
      header: 'Acciones',
      cell: ({ row }: { row: TableRow<TorneoWithRelations> }) => (
        <div className="d-flex gap-1">
          <Link href={`/torneos/${row.original.id}`}>
            <Button 
              variant="light" 
              size="sm" 
              className="btn-icon rounded-circle"
              title="Ver detalles del torneo">
              <TbEye className="fs-lg" />
            </Button>
          </Link>
          {puedeEditar && (
            <Button 
              variant="light" 
              size="sm" 
              className="btn-icon rounded-circle"
              onClick={() => handleEditClick(row.original)}
              title="Editar torneo">
              <TbEdit className="fs-lg" />
            </Button>
          )}
          {puedeEliminar && (
            <Button
              variant="light"
              size="sm"
              className="btn-icon rounded-circle"
              onClick={() => handleDeleteSingle(row.original)}
              title="Eliminar torneo">
              <TbTrash className="fs-lg" />
            </Button>
          )}
          {!puedeEditar && !puedeEliminar && (
            <small className="text-muted">Solo ver</small>
          )}
        </div>
      ),
    },
  ]

  const [globalFilter, setGlobalFilter] = useState('')
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 8 })
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false)
  const [torneoToDelete, setTorneoToDelete] = useState<TorneoWithRelations | null>(null)

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter, columnFilters, pagination },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: 'includesString',
    enableColumnFilters: true,
    enableRowSelection: false,
  })

  const pageIndex = table.getState().pagination.pageIndex
  const pageSize = table.getState().pagination.pageSize
  const totalItems = table.getFilteredRowModel().rows.length

  const start = pageIndex * pageSize + 1
  const end = Math.min(start + pageSize - 1, totalItems)

  const toggleDeleteModal = () => {
    if (loading) return
    
    setShowDeleteModal(!showDeleteModal)
    if (!showDeleteModal) {
      setTorneoToDelete(null)
    }
  }

  const handleDeleteSingle = (torneo: TorneoWithRelations) => {
    if (loading) return
    
    setTorneoToDelete(torneo)
    setShowDeleteModal(true)
  }

  const handleDelete = async () => {
    if (loading || !torneoToDelete) return
    
    if (!puedeEliminar) {
      setError('No tienes permiso para eliminar torneos')
      setShowDeleteModal(false)
      return
    }
    
    try {
      setLoading(true)
      
      const torneoNombre = torneoToDelete.nombre
      await deleteTorneo(torneoToDelete.id)
      setTorneoToDelete(null)
      setFormSuccess(`El torneo "${torneoNombre}" ha sido eliminado exitosamente`)
      
      setPagination({ ...pagination, pageIndex: 0 })
      setShowDeleteModal(false)
      setError(null)
      await loadData()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error al eliminar torneo')
    } finally {
      setLoading(false)
    }
  }

  const handleEditClick = (torneo: TorneoWithRelations) => {
    if (!puedeEditar) {
      setError('No tienes permiso para editar torneos')
      return
    }
    
    setEditingTorneo(torneo)
    setEditFormError(null)
    setEditFormSuccess(null)
    toggleEditOffcanvas()
  }

  const handleCreateTorneo = async (formData: FormData) => {
    if (!puedeCrear) {
      setFormError('No tienes permiso para crear torneos')
      return
    }
    
    try {
      setLoading(true)
      setFormError(null)
      setFormSuccess(null)
      
      await createTorneo(formData)
      setFormSuccess('Torneo creado exitosamente')
      
      // Recargar datos después de un breve delay
      setTimeout(async () => {
        await loadData()
        toggleOffcanvas()
      }, 1000)
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Error al crear torneo')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateTorneo = async (formData: FormData) => {
    if (!editingTorneo) return
    
    if (!puedeEditar) {
      setEditFormError('No tienes permiso para editar torneos')
      return
    }
    
    try {
      setLoading(true)
      setEditFormError(null)
      setEditFormSuccess(null)
      
      await updateTorneo(editingTorneo.id, formData)
      setEditFormSuccess('Torneo actualizado exitosamente')
      
      // Recargar datos después de un breve delay
      setTimeout(async () => {
        await loadData()
        toggleEditOffcanvas()
        setEditingTorneo(null)
      }, 1000)
    } catch (error) {
      setEditFormError(error instanceof Error ? error.message : 'Error al actualizar torneo')
    } finally {
      setLoading(false)
    }
  }

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      const [torneosData, categoriasData] = await Promise.all([
        getTorneos(),
        getCategorias()
      ])
      setData(torneosData as any)
      setCategorias(categoriasData)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  if (cargandoPermisos) {
    return (
      <Container fluid>
        <PageBreadcrumb title="Torneos" subtitle="Apps" />
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Verificando permisos...</span>
          </div>
          <p className="text-muted mt-2">Verificando permisos de acceso...</p>
        </div>
      </Container>
    )
  }

  if (!puedeVer) {
    return (
      <Container fluid>
        <PageBreadcrumb title="Torneos" subtitle="Apps" />
        <Row className="justify-content-center">
          <Col xxl={8}>
            <Alert variant="danger" className="mt-4">
              <Alert.Heading>❌ Acceso Denegado</Alert.Heading>
              <p className="mb-0">
                No tienes permisos para acceder a esta página.
                <br />
                <small className="text-muted">Contacta al administrador para solicitar acceso al módulo de Torneos.</small>
              </p>
            </Alert>
          </Col>
        </Row>
      </Container>
    )
  }

  if (loading) {
    return (
      <Container fluid>
        <PageBreadcrumb title="Torneos" subtitle="Apps" />
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
      <PageBreadcrumb title="Torneos" subtitle="Apps" />

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {formSuccess && (
        <Alert variant="success" dismissible onClose={() => setFormSuccess(null)}>
          {formSuccess}
        </Alert>
      )}

      <Row className="justify-content-center">
        <Col xxl={10}>
          <Card>
            <CardHeader className="card-header border-light justify-content-between">
              <div className="d-flex gap-2">
                <div className="app-search">
                  <input
                    type="search"
                    className="form-control"
                    placeholder="Buscar torneos..."
                    value={globalFilter ?? ''}
                    onChange={(e) => setGlobalFilter(e.target.value)}
                  />
                  <LuSearch className="app-search-icon text-muted" />
                </div>

                {puedeCrear ? (
                  <Button 
                    type="button" 
                    className="btn-purple rounded-circle btn-icon" 
                    onClick={toggleOffcanvas}
                    title="Agregar nuevo torneo">
                    <TbPlus className="fs-lg" />
                  </Button>
                ) : (
                  <Button 
                    type="button" 
                    className="btn-secondary rounded-circle btn-icon" 
                    disabled
                    title="No tienes permiso para crear torneos">
                    <TbPlus className="fs-lg" />
                  </Button>
                )}
              </div>

              <div className="d-flex align-items-center gap-2">
                <span className="me-2 fw-semibold">Filtrar por:</span>

                <div className="app-search">
                  <select
                    className="form-select form-control my-1 my-md-0"
                    value={(table.getColumn('estado')?.getFilterValue() as string) ?? 'Todos'}
                    onChange={(e) => table.getColumn('estado')?.setFilterValue(e.target.value === 'Todos' ? undefined : e.target.value)}>
                    <option value="Todos">Estado</option>
                    <option value="planificado">Planificado</option>
                    <option value="en_curso">En Curso</option>
                    <option value="finalizado">Finalizado</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                  <LuCalendar className="app-search-icon text-muted" />
                </div>

                <div className="app-search">
                  <select
                    className="form-select form-control my-1 my-md-0"
                    value={(table.getColumn('tipo_torneo')?.getFilterValue() as string) ?? 'Todos'}
                    onChange={(e) => table.getColumn('tipo_torneo')?.setFilterValue(e.target.value === 'Todos' ? undefined : e.target.value)}>
                    <option value="Todos">Tipo</option>
                    <option value="liga">Liga</option>
                    <option value="eliminacion">Eliminación</option>
                    <option value="grupos">Grupos</option>
                  </select>
                  <LuGamepad2 className="app-search-icon text-muted" />
                </div>

                <div>
                  <select
                    className="form-select form-control my-1 my-md-0"
                    value={table.getState().pagination.pageSize}
                    onChange={(e) => table.setPageSize(Number(e.target.value))}>
                    {[5, 8, 10, 15, 20].map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </CardHeader>

            <DataTable<TorneoWithRelations> table={table} emptyMessage="No se encontraron torneos" />

            {table.getRowModel().rows.length > 0 && (
              <CardFooter className="border-0">
                <TablePagination
                  totalItems={totalItems}
                  start={start}
                  end={end}
                  itemsName="torneos"
                  showInfo
                  previousPage={table.previousPage}
                  canPreviousPage={table.getCanPreviousPage()}
                  pageCount={table.getPageCount()}
                  pageIndex={table.getState().pagination.pageIndex}
                  setPageIndex={table.setPageIndex}
                  nextPage={table.nextPage}
                  canNextPage={table.getCanNextPage()}
                />
              </CardFooter>
            )}

            <ConfirmationModal
              show={showDeleteModal}
              onHide={toggleDeleteModal}
              onConfirm={handleDelete}
              selectedCount={1}
              itemName="torneo"
              variant="danger"
              isLoading={loading}
              showBadgeDesign={false}
              itemToDelete={torneoToDelete?.nombre}
            />
          </Card>
        </Col>
      </Row>

      {/* Offcanvas para crear torneo */}
      <Offcanvas show={showOffcanvas} onHide={toggleOffcanvas} placement="end" className="offcanvas-end">
        <OffcanvasHeader closeButton>
          <OffcanvasTitle as="h5" className="mt-0">
            <LuTrophy className="me-2" />
            Crear Nuevo Torneo
          </OffcanvasTitle>
        </OffcanvasHeader>
        <OffcanvasBody>
          {formError && (
            <Alert variant="danger" dismissible onClose={() => setFormError(null)}>
              {formError}
            </Alert>
          )}

          {formSuccess && (
            <Alert variant="success" dismissible onClose={() => setFormSuccess(null)}>
              {formSuccess}
            </Alert>
          )}

          <Form action={handleCreateTorneo}>
            <Row>
              <Col md={12}>
                <FloatingLabel controlId="nombre" label="Nombre del Torneo" className="mb-3">
                  <FormControl
                    type="text"
                    name="nombre"
                    placeholder="Nombre del Torneo"
                    required
                  />
                </FloatingLabel>
              </Col>
            </Row>

            <Row>
              <Col md={12}>
                <FloatingLabel controlId="descripcion" label="Descripción" className="mb-3">
                  <FormControl
                    as="textarea"
                    name="descripcion"
                    placeholder="Descripción del torneo"
                    style={{ height: '80px' }}
                  />
                </FloatingLabel>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <FloatingLabel controlId="categoria_id" label="Categoría" className="mb-3">
                  <FormSelect name="categoria_id" required>
                    <option value="">Seleccionar categoría</option>
                    {categorias.map((categoria) => (
                      <option key={categoria.id} value={categoria.id}>
                        {categoria.nombre}
                      </option>
                    ))}
                  </FormSelect>
                </FloatingLabel>
              </Col>
              <Col md={6}>
                <FloatingLabel controlId="tipo_torneo" label="Tipo de Torneo" className="mb-3">
                  <FormSelect name="tipo_torneo" required>
                    <option value="">Seleccionar tipo</option>
                    <option value="liga">Liga</option>
                    <option value="eliminacion">Eliminación</option>
                    <option value="grupos">Grupos</option>
                  </FormSelect>
                </FloatingLabel>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <FloatingLabel controlId="fecha_inicio" label="Fecha de Inicio" className="mb-3">
                  <FormControl
                    type="date"
                    name="fecha_inicio"
                    required
                  />
                </FloatingLabel>
              </Col>
              <Col md={6}>
                <FloatingLabel controlId="fecha_fin" label="Fecha de Fin" className="mb-3">
                  <FormControl
                    type="date"
                    name="fecha_fin"
                    required
                  />
                </FloatingLabel>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <FloatingLabel controlId="estado" label="Estado" className="mb-3">
                  <FormSelect name="estado" required>
                    <option value="planificado">Planificado</option>
                    <option value="en_curso">En Curso</option>
                    <option value="finalizado">Finalizado</option>
                    <option value="cancelado">Cancelado</option>
                  </FormSelect>
                </FloatingLabel>
              </Col>
              <Col md={6}>
                <div className="mb-3">
                  <Form.Check
                    type="checkbox"
                    id="permite_revancha"
                    name="permite_revancha"
                    label="Permitir Revancha"
                  />
                </div>
              </Col>
            </Row>

            <div className="d-flex gap-2 justify-content-end">
              <Button variant="light" onClick={toggleOffcanvas}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary" disabled={loading}>
                {loading ? 'Creando...' : 'Crear Torneo'}
              </Button>
            </div>
          </Form>
        </OffcanvasBody>
      </Offcanvas>

      {/* Offcanvas para editar torneo */}
      <Offcanvas show={showEditOffcanvas} onHide={toggleEditOffcanvas} placement="end" className="offcanvas-end">
        <OffcanvasHeader closeButton>
          <OffcanvasTitle as="h5" className="mt-0">
            <TbEdit className="me-2" />
            Editar Torneo
          </OffcanvasTitle>
        </OffcanvasHeader>
        <OffcanvasBody>
          {editFormError && (
            <Alert variant="danger" dismissible onClose={() => setEditFormError(null)}>
              {editFormError}
            </Alert>
          )}

          {editFormSuccess && (
            <Alert variant="success" dismissible onClose={() => setEditFormSuccess(null)}>
              {editFormSuccess}
            </Alert>
          )}

          {editingTorneo && (
            <Form action={handleUpdateTorneo}>
              <Row>
                <Col md={12}>
                  <FloatingLabel controlId="edit_nombre" label="Nombre del Torneo" className="mb-3">
                    <FormControl
                      type="text"
                      name="nombre"
                      placeholder="Nombre del Torneo"
                      defaultValue={editingTorneo.nombre}
                      required
                    />
                  </FloatingLabel>
                </Col>
              </Row>

              <Row>
                <Col md={12}>
                  <FloatingLabel controlId="edit_descripcion" label="Descripción" className="mb-3">
                    <FormControl
                      as="textarea"
                      name="descripcion"
                      placeholder="Descripción del torneo"
                      defaultValue={editingTorneo.descripcion || ''}
                      style={{ height: '80px' }}
                    />
                  </FloatingLabel>
                </Col>
              </Row>

              <Row>
                <Col md={6}>
                  <FloatingLabel controlId="edit_categoria_id" label="Categoría" className="mb-3">
                    <FormSelect name="categoria_id" defaultValue={editingTorneo.categoria_id?.toString() || ''} required>
                      <option value="">Seleccionar categoría</option>
                      {categorias.map((categoria) => (
                        <option 
                          key={categoria.id} 
                          value={categoria.id}
                        >
                          {categoria.nombre}
                        </option>
                      ))}
                    </FormSelect>
                  </FloatingLabel>
                </Col>
                <Col md={6}>
                  <FloatingLabel controlId="edit_tipo_torneo" label="Tipo de Torneo" className="mb-3">
                    <FormSelect name="tipo_torneo" defaultValue={editingTorneo.tipo_torneo || ''} required>
                      <option value="">Seleccionar tipo</option>
                      <option value="liga">Liga</option>
                      <option value="eliminacion">Eliminación</option>
                      <option value="grupos">Grupos</option>
                    </FormSelect>
                  </FloatingLabel>
                </Col>
              </Row>

              <Row>
                <Col md={6}>
                  <FloatingLabel controlId="edit_fecha_inicio" label="Fecha de Inicio" className="mb-3">
                    <FormControl
                      type="date"
                      name="fecha_inicio"
                      defaultValue={editingTorneo.fecha_inicio ? new Date(editingTorneo.fecha_inicio).toISOString().split('T')[0] : ''}
                      required
                    />
                  </FloatingLabel>
                </Col>
                <Col md={6}>
                  <FloatingLabel controlId="edit_fecha_fin" label="Fecha de Fin" className="mb-3">
                    <FormControl
                      type="date"
                      name="fecha_fin"
                      defaultValue={editingTorneo.fecha_fin ? new Date(editingTorneo.fecha_fin).toISOString().split('T')[0] : ''}
                      required
                    />
                  </FloatingLabel>
                </Col>
              </Row>

              <Row>
                <Col md={6}>
                  <FloatingLabel controlId="edit_estado" label="Estado" className="mb-3">
                    <FormSelect name="estado" defaultValue={editingTorneo.estado || ''} required>
                      <option value="planificado">Planificado</option>
                      <option value="en_curso">En Curso</option>
                      <option value="finalizado">Finalizado</option>
                      <option value="cancelado">Cancelado</option>
                    </FormSelect>
                  </FloatingLabel>
                </Col>
                <Col md={6}>
                  <div className="mb-3">
                    <Form.Check
                      type="checkbox"
                      id="edit_permite_revancha"
                      name="permite_revancha"
                      label="Permitir Revancha"
                      defaultChecked={editingTorneo.permite_revancha || false}
                    />
                  </div>
                </Col>
              </Row>

              <div className="d-flex gap-2 justify-content-end">
                <Button variant="light" onClick={toggleEditOffcanvas}>
                  Cancelar
                </Button>
                <Button type="submit" variant="primary" disabled={loading}>
                  {loading ? 'Actualizando...' : 'Actualizar Torneo'}
                </Button>
              </div>
            </Form>
          )}
        </OffcanvasBody>
      </Offcanvas>
    </Container>
  )
}

export default Page
