'use client'
import { useEffect, useState, useRef } from 'react'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import DataTable from '@/components/table/DataTable'
import DeleteConfirmationModal from '@/components/table/DeleteConfirmationModal'
import TablePagination from '@/components/table/TablePagination'
import { toPascalCase } from '@/helpers/casing'
import useToggle from '@/hooks/useToggle'
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
import { Button, Card, CardBody, CardFooter, CardHeader, Col, Container, FloatingLabel, Form, FormControl, FormSelect, FormCheck, Offcanvas, OffcanvasBody, OffcanvasHeader, OffcanvasTitle, Row, Alert, Nav, Badge, Pagination } from 'react-bootstrap'
import { LuSearch, LuUser, LuTrophy, LuLayoutGrid, LuList, LuMenu, LuChevronLeft, LuChevronRight, LuClock } from 'react-icons/lu'
import { TbEdit, TbPlus, TbTrash, TbCamera } from 'react-icons/tb'
import { getJugadores, createJugador, updateJugador, deleteJugador, deleteMultipleJugadores, getEquipos, getCategorias } from './actions'
import type { JugadorWithEquipo, Equipo, Categoria } from '@/db/types'
import CameraCapture from '@/components/CameraCapture'

const columnHelper = createColumnHelper<JugadorWithEquipo>()

// Función de filtro personalizada para equipos
const equipoFilterFn = (row: any, columnId: string, filterValue: string | string[]) => {
  const jugador = row.original as JugadorWithEquipo
  if (Array.isArray(filterValue)) {
    return filterValue.includes(jugador.equipo?.nombre || '')
  }
  return jugador.equipo?.nombre === filterValue
}

// Función de filtro personalizada para categorías
const categoriaFilterFn = (row: any, columnId: string, filterValue: string | string[]) => {
  const jugador = row.original as JugadorWithEquipo
  if (Array.isArray(filterValue)) {
    return filterValue.includes(jugador.categoria?.nombre || '')
  }
  return jugador.categoria?.nombre === filterValue
}

// Función de filtro personalizada para estado
const estadoFilterFn = (row: any, columnId: string, filterValue: string) => {
  const jugador = row.original as JugadorWithEquipo
  const estadoString = jugador.estado ? 'true' : 'false'
  return estadoString === filterValue
}

const Page = () => {
  const { isTrue: showOffcanvas, toggle: toggleOffcanvas } = useToggle()
  const { isTrue: showEditOffcanvas, toggle: toggleEditOffcanvas } = useToggle()
  const { isTrue: showFilterOffcanvas, toggle: toggleFilterOffcanvas } = useToggle()
  
  const [data, setData] = useState<JugadorWithEquipo[]>([])
  const [equipos, setEquipos] = useState<Equipo[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null)
  const [editingJugador, setEditingJugador] = useState<JugadorWithEquipo | null>(null)
  const [editFormError, setEditFormError] = useState<string | null>(null)
  const [editFormSuccess, setEditFormSuccess] = useState<string | null>(null)
  
  // Estados para la vista (cards o tabla)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  
  // Estados para filtros con checkboxes
  const [selectedCategorias, setSelectedCategorias] = useState<string[]>([])
  const [selectedEquipos, setSelectedEquipos] = useState<string[]>([])
  
  // Función para obtener equipos filtrados por categorías seleccionadas
  const getFilteredEquipos = () => {
    if (selectedCategorias.length === 0) {
      return equipos
    }
    
    // Obtener equipos que tienen jugadores en las categorías seleccionadas
    const equiposEnCategorias = new Set<string>()
    data.forEach(jugador => {
      if (jugador.categoria && selectedCategorias.includes(jugador.categoria.nombre) && jugador.equipo) {
        equiposEnCategorias.add(jugador.equipo.nombre)
      }
    })
    
    return equipos.filter(equipo => equiposEnCategorias.has(equipo.nombre))
  }
  
  // Estados para la funcionalidad de cámara
  const [showCamera, setShowCamera] = useState(false)
  const [showEditCamera, setShowEditCamera] = useState(false)
  const [capturedPhoto, setCapturedPhoto] = useState<Blob | null>(null)
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState<string | null>(null)
  const [editCapturedPhoto, setEditCapturedPhoto] = useState<Blob | null>(null)
  const [editCapturedPhotoUrl, setEditCapturedPhotoUrl] = useState<string | null>(null)
  
  // Referencia para el canvas oculto
  const canvasRef = useRef<HTMLCanvasElement>(null)
  
  const columns = [
    columnHelper.accessor('apellido_nombre', {
      header: 'Jugador',
      cell: ({ row }) => (
        <div className="d-flex justify-content-start align-items-center gap-2">
          <div className="avatar avatar-sm">
            {row.original.foto ? (
              <img
                src={row.original.foto}
                alt={row.original.apellido_nombre}
                className="avatar-title rounded-circle"
                style={{ width: '40px', height: '40px', objectFit: 'cover' }}
                onError={(e) => {
                  // Fallback a icono si la imagen no carga
                  const target = e.target as HTMLImageElement
                  target.style.display = 'none'
                  target.nextElementSibling?.classList.remove('d-none')
                }}
              />
            ) : null}
            <div className={`avatar-title bg-light rounded-circle ${row.original.foto ? 'd-none' : ''}`}>
              <LuUser className="fs-lg text-primary" />
            </div>
          </div>
          <div>
            <h5 className="text-nowrap mb-0 lh-base fs-base">
              <Link href={`/jugadores/${row.original.id}`} className="link-reset">
                {row.original.apellido_nombre}
              </Link>
            </h5>
            <p className="text-muted fs-xs mb-0">Cédula: {row.original.cedula}</p>
          </div>
        </div>
      ),
    }),
    columnHelper.accessor('nacionalidad', {
      header: 'Nacionalidad',
      cell: ({ row }) => (
        <span className="badge bg-light text-dark badge-label">
          {row.original.nacionalidad}
        </span>
      ),
    }),
    columnHelper.accessor('liga', {
      header: 'Liga',
      cell: ({ row }) => row.original.liga,
    }),
    {
      id: 'categoria',
      header: 'Categoría',
      filterFn: categoriaFilterFn,
      enableColumnFilter: true,
      cell: ({ row }: { row: TableRow<JugadorWithEquipo> }) => (
        <span className="badge p-1 text-bg-warning fs-sm">
          <LuTrophy className="me-1" /> {row.original.categoria?.nombre || 'Sin categoría'}
        </span>
      ),
    },
    {
      id: 'equipo',
      header: 'Equipo',
      filterFn: equipoFilterFn,
      enableColumnFilter: true,
      cell: ({ row }: { row: TableRow<JugadorWithEquipo> }) => (
        <span className="badge p-1 text-bg-light fs-sm">
          {row.original.equipo?.nombre || 'Sin equipo'}
        </span>
      ),
    },
    {
      id: 'estado',
      header: 'Estado',
      filterFn: estadoFilterFn,
      enableColumnFilter: true,
      cell: ({ row }: { row: TableRow<JugadorWithEquipo> }) => (
        <span className={`badge ${row.original.estado ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'} badge-label`}>
          {row.original.estado ? 'Activo' : 'Inactivo'}
        </span>
      ),
    },
    columnHelper.accessor('createdAt', { 
      header: 'Fecha Creación',
      cell: ({ row }) => row.original.createdAt ? new Date(row.original.createdAt).toLocaleDateString('es-ES') : 'N/A'
    }),
    {
      header: 'Acciones',
      cell: ({ row }: { row: TableRow<JugadorWithEquipo> }) => (
        <div className="d-flex gap-1">
          <Button 
            variant="light" 
            size="sm" 
            className="btn-icon rounded-circle"
            onClick={() => handleEditClick(row.original)}>
            <TbEdit className="fs-lg" />
          </Button>
          <Button
            variant="light"
            size="sm"
            className="btn-icon rounded-circle"
            onClick={() => handleDeleteSingle(row.original)}>
            <TbTrash className="fs-lg" />
          </Button>
        </div>
      ),
    },
  ]

  const [globalFilter, setGlobalFilter] = useState('')
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 8 })
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false)
  const [jugadorToDelete, setJugadorToDelete] = useState<JugadorWithEquipo | null>(null)

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
      setJugadorToDelete(null)
    }
  }

  const handleDeleteSingle = (jugador: JugadorWithEquipo) => {
    if (loading) return
    
    setJugadorToDelete(jugador)
    setShowDeleteModal(true)
  }

  const handleDelete = async () => {
    if (loading) return
    
    try {
      setLoading(true)
      
      if (jugadorToDelete) {
        const jugadorNombre = jugadorToDelete.apellido_nombre
        await deleteJugador(jugadorToDelete.id)
        setJugadorToDelete(null)
        setDeleteSuccess(`El jugador "${jugadorNombre}" ha sido eliminado exitosamente`)
      }
      
      await loadData()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error al eliminar jugador')
    } finally {
      setLoading(false)
      setShowDeleteModal(false)
    }
  }

  const handleEditClick = (jugador: JugadorWithEquipo) => {
    setEditingJugador(jugador)
    setEditFormError(null)
    setEditFormSuccess(null)
    setEditCapturedPhoto(null)
    setEditCapturedPhotoUrl(null)
    toggleEditOffcanvas()
  }

  // Funciones para manejar la captura de fotos
  const handlePhotoCapture = (blob: Blob) => {
    setCapturedPhoto(blob)
    const url = URL.createObjectURL(blob)
    setCapturedPhotoUrl(url)
  }

  const handleEditPhotoCapture = (blob: Blob) => {
    setEditCapturedPhoto(blob)
    const url = URL.createObjectURL(blob)
    setEditCapturedPhotoUrl(url)
  }

  const removePhoto = () => {
    if (capturedPhotoUrl) {
      URL.revokeObjectURL(capturedPhotoUrl)
    }
    setCapturedPhoto(null)
    setCapturedPhotoUrl(null)
  }

  const removeEditPhoto = () => {
    if (editCapturedPhotoUrl) {
      URL.revokeObjectURL(editCapturedPhotoUrl)
    }
    setEditCapturedPhoto(null)
    setEditCapturedPhotoUrl(null)
  }

  const handleUpdateJugador = async (formData: FormData) => {
    if (!editingJugador) return
    
    try {
      setLoading(true)
      setEditFormError(null)
      setEditFormSuccess(null)
      
      // Agregar la foto si existe
      if (editCapturedPhoto) {
        formData.append('foto', editCapturedPhoto, 'jugador-foto.jpg')
      }
      
      await updateJugador(editingJugador.id, formData)
      setEditFormSuccess('Jugador actualizado exitosamente')
      
      // Limpiar foto capturada
      setEditCapturedPhoto(null)
      setEditCapturedPhotoUrl(null)
      
      // Recargar datos después de un breve delay
      setTimeout(async () => {
        await loadData()
        toggleEditOffcanvas()
        setEditingJugador(null)
      }, 1000)
    } catch (error) {
      setEditFormError(error instanceof Error ? error.message : 'Error al actualizar jugador')
    } finally {
      setLoading(false)
    }
  }

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      const [jugadoresData, equiposData, categoriasData] = await Promise.all([
        getJugadores(),
        getEquipos(),
        getCategorias()
      ])
      setData(jugadoresData)
      setEquipos(equiposData)
      setCategorias(categoriasData)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error al cargar jugadores')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateJugador = async (formData: FormData) => {
    try {
      setLoading(true)
      setFormError(null)
      setFormSuccess(null)
      
      // Agregar la foto si existe
      if (capturedPhoto) {
        formData.append('foto', capturedPhoto, 'jugador-foto.jpg')
      }
      
      await createJugador(formData)
      setFormSuccess('Jugador creado exitosamente')
      
      // Limpiar foto capturada
      setCapturedPhoto(null)
      setCapturedPhotoUrl(null)
      
      // Recargar datos después de un breve delay
      setTimeout(async () => {
        await loadData()
        toggleOffcanvas()
      }, 1000)
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Error al crear jugador')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  if (loading) {
    return (
      <Container fluid>
        <PageBreadcrumb title="Jugadores" subtitle="Apps" />
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
      <PageBreadcrumb title="Jugadores" subtitle="Apps" />

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {deleteSuccess && (
        <Alert variant="success" dismissible onClose={() => setDeleteSuccess(null)}>
          {deleteSuccess}
        </Alert>
      )}

      {/* Header section similar to products-grid */}
      <Row className="mb-2">
        <Col lg={12}>
          <div className="bg-light-subtle rounded border p-3">
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
              <div className="d-lg-none">
                <Button variant="light" className="btn-icon" onClick={toggleFilterOffcanvas}>
                  <LuMenu className="fs-lg" />
                </Button>
              </div>
              <h3 className="mb-0 fs-xl flex-grow-1">{data.length} Jugadores</h3>
              <div className="d-flex gap-1">
                <Button 
                  variant={viewMode === 'grid' ? 'primary' : 'soft-primary'} 
                  className="btn-icon"
                  onClick={() => setViewMode('grid')}
                >
                  <LuLayoutGrid className="fs-lg" />
                </Button>
                <Button 
                  variant={viewMode === 'list' ? 'primary' : 'soft-primary'} 
                  className="btn-icon"
                  onClick={() => setViewMode('list')}
                >
                  <LuList className="fs-lg" />
                </Button>
                <Button variant="danger" className="ms-1" onClick={toggleOffcanvas}>
                  <TbPlus className="fs-sm me-2" /> Agregar Jugador
                </Button>
              </div>
            </div>
          </div>
        </Col>
      </Row>

      {/* Main content area with sidebar and content */}
      <Row className="g-2">
        {/* Filter Sidebar */}
        <Col xl={3} className="d-none d-xl-block">
          <Card className="h-100">
            <CardHeader className="border-bottom">
              <h6 className="mb-0">Filtros</h6>
            </CardHeader>
            <CardBody>
              <div className="mb-4">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <label className="form-label fw-semibold mb-0">Categoría:</label>
                  <Button 
                    variant="link" 
                    size="sm" 
                    className="p-0 text-decoration-none"
                    onClick={() => {
                      setSelectedCategorias([])
                      table.getColumn('categoria')?.setFilterValue(undefined)
                      // También limpiar equipos cuando se limpian categorías
                      setSelectedEquipos([])
                      table.getColumn('equipo')?.setFilterValue(undefined)
                    }}
                  >
                    Ver Todas
                  </Button>
                </div>
                <div className="filter-list">
                  {categorias.map((categoria) => {
                    const count = data.filter(jugador => jugador.categoria?.nombre === categoria.nombre).length
                    const isChecked = selectedCategorias.includes(categoria.nombre)
                    return (
                      <div key={categoria.id} className="d-flex justify-content-between align-items-center py-1">
                        <FormCheck
                          type="checkbox"
                          id={`categoria-${categoria.id}`}
                          label={categoria.nombre}
                          checked={isChecked}
                          onChange={(e) => {
                            const newSelected = e.target.checked 
                              ? [...selectedCategorias, categoria.nombre]
                              : selectedCategorias.filter(c => c !== categoria.nombre)
                            setSelectedCategorias(newSelected)
                            table.getColumn('categoria')?.setFilterValue(newSelected.length > 0 ? newSelected : undefined)
                            
                            // Limpiar equipos seleccionados cuando cambian las categorías
                            setSelectedEquipos([])
                            table.getColumn('equipo')?.setFilterValue(undefined)
                          }}
                          className="flex-grow-1"
                        />
                        <span className="text-primary fw-semibold">{count}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
              
              <div className="mb-4">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <label className="form-label fw-semibold mb-0">Equipo:</label>
                  <Button 
                    variant="link" 
                    size="sm" 
                    className="p-0 text-decoration-none"
                    onClick={() => {
                      setSelectedEquipos([])
                      table.getColumn('equipo')?.setFilterValue(undefined)
                    }}
                  >
                    Ver Todos
                  </Button>
                </div>
                <div className="filter-list">
                  {getFilteredEquipos().map((equipo) => {
                    // Contar solo jugadores en las categorías seleccionadas (o todos si no hay categorías seleccionadas)
                    const count = selectedCategorias.length > 0 
                      ? data.filter(jugador => 
                          jugador.equipo?.nombre === equipo.nombre && 
                          jugador.categoria && 
                          selectedCategorias.includes(jugador.categoria.nombre)
                        ).length
                      : data.filter(jugador => jugador.equipo?.nombre === equipo.nombre).length
                    const isChecked = selectedEquipos.includes(equipo.nombre)
                    return (
                      <div key={equipo.id} className="d-flex justify-content-between align-items-center py-1">
                        <FormCheck
                          type="checkbox"
                          id={`equipo-${equipo.id}`}
                          label={equipo.nombre}
                          checked={isChecked}
                          onChange={(e) => {
                            const newSelected = e.target.checked 
                              ? [...selectedEquipos, equipo.nombre]
                              : selectedEquipos.filter(eq => eq !== equipo.nombre)
                            setSelectedEquipos(newSelected)
                            table.getColumn('equipo')?.setFilterValue(newSelected.length > 0 ? newSelected : undefined)
                          }}
                          className="flex-grow-1"
                        />
                        <span className="text-primary fw-semibold">{count}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
              
              <div className="mb-3">
                <label className="form-label fw-semibold">Estado</label>
                <Form.Select
                  value={(table.getColumn('estado')?.getFilterValue() as string) ?? 'Todos'}
                  onChange={(e) => table.getColumn('estado')?.setFilterValue(e.target.value === 'Todos' ? undefined : e.target.value)}
                >
                  <option value="Todos">Todos los estados</option>
                  <option value="true">Activo</option>
                  <option value="false">Inactivo</option>
                </Form.Select>
              </div>
              
              <div className="mb-3">
                <label className="form-label fw-semibold">Elementos por página</label>
                <Form.Select
                  value={table.getState().pagination.pageSize}
                  onChange={(e) => table.setPageSize(Number(e.target.value))}
                >
                  {[5, 8, 10, 15, 20].map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </Form.Select>
              </div>
            </CardBody>
          </Card>
        </Col>
        
        {/* Mobile Filter Offcanvas */}
        <Offcanvas show={showFilterOffcanvas} onHide={toggleFilterOffcanvas} placement="start">
          <OffcanvasHeader closeButton>
            <OffcanvasTitle>Filtros</OffcanvasTitle>
          </OffcanvasHeader>
          <OffcanvasBody>
            <div className="mb-3">
              <label className="form-label fw-semibold">Categoría</label>
              <Form.Select
                value={(table.getColumn('categoria')?.getFilterValue() as string) ?? 'Todas'}
                onChange={(e) => table.getColumn('categoria')?.setFilterValue(e.target.value === 'Todas' ? undefined : e.target.value)}
              >
                <option value="Todas">Todas las categorías</option>
                {categorias.map((categoria) => (
                  <option key={categoria.id} value={categoria.nombre}>
                    {categoria.nombre}
                  </option>
                ))}
              </Form.Select>
            </div>
            
            <div className="mb-3">
              <label className="form-label fw-semibold">Equipo</label>
              <Form.Select
                value={(table.getColumn('equipo')?.getFilterValue() as string) ?? 'Todos'}
                onChange={(e) => table.getColumn('equipo')?.setFilterValue(e.target.value === 'Todos' ? undefined : e.target.value)}
              >
                <option value="Todos">Todos los equipos</option>
                {equipos.map((equipo) => (
                  <option key={equipo.id} value={equipo.nombre}>
                    {equipo.nombre}
                  </option>
                ))}
              </Form.Select>
            </div>
            
            <div className="mb-3">
              <label className="form-label fw-semibold">Estado</label>
              <Form.Select
                value={(table.getColumn('estado')?.getFilterValue() as string) ?? 'Todos'}
                onChange={(e) => table.getColumn('estado')?.setFilterValue(e.target.value === 'Todos' ? undefined : e.target.value)}
              >
                <option value="Todos">Todos los estados</option>
                <option value="true">Activo</option>
                <option value="false">Inactivo</option>
              </Form.Select>
            </div>
          </OffcanvasBody>
        </Offcanvas>
        
        {/* Main Content Area */}
        <Col xl={9}>

          {/* Grid View - Cards */}
          {viewMode === 'grid' && (
            <Row className="row-cols-xxl-4 row-cols-lg-3 row-cols-sm-2 row-col-1 g-2">
              {table.getRowModel().rows.length === 0 && (
                <Col>
                  <Alert variant="info" className="text-center">
                    No se encontraron jugadores.
                  </Alert>
                </Col>
              )}
              {table.getRowModel().rows.map((row) => {
                const jugador = row.original
                return (
                  <Col className="col" key={jugador.id}>
                    <Card className="h-100 mb-2">
                      <Badge className={`text-bg-${jugador.estado ? 'success' : 'danger'} badge-label fs-base rounded position-absolute top-0 start-0 m-3`}>
                        {jugador.estado ? 'Activo' : 'Inactivo'}
                      </Badge>
                      <CardBody>
                        <div className="bg-light-subtle p-3 mb-3 border border-light rounded d-flex justify-content-center align-items-center" style={{ minHeight: '200px' }}>
                          {jugador.foto ? (
                            <img
                              src={jugador.foto}
                              alt={jugador.apellido_nombre}
                              className="img-fluid rounded-circle"
                              style={{ width: '120px', height: '120px', objectFit: 'cover' }}
                            />
                          ) : (
                            <div className="d-flex align-items-center justify-content-center rounded-circle bg-light" style={{ width: '120px', height: '120px' }}>
                              <LuUser size={48} className="text-primary" />
                            </div>
                          )}
                        </div>
                        <h6 className="fs-sm lh-base mb-2 text-center">
                          <Link href={`/jugadores/${jugador.id}`} className="link-reset">
                            {jugador.apellido_nombre}
                          </Link>
                        </h6>
                        <div className="text-center">
                          <div className="text-muted fs-sm mb-1">
                            <LuTrophy className="me-1" />
                            {jugador.categoria?.nombre || 'Sin categoría'}
                          </div>
                          <div className="text-muted fs-xs">
                            {jugador.equipo?.nombre || 'Sin equipo'}
                          </div>
                        </div>
                      </CardBody>
                      <CardFooter className="bg-transparent d-flex justify-content-center gap-2">
                        <Button
                          size="sm"
                          variant="primary"
                          className="btn-icon"
                          onClick={() => handleEditClick(jugador)}
                        >
                          <TbEdit className="fs-lg" />
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          className="btn-icon"
                          onClick={() => handleDeleteSingle(jugador)}
                        >
                          <TbTrash className="fs-lg" />
                        </Button>
                      </CardFooter>
                    </Card>
                  </Col>
                )
              })}
            </Row>
          )}

          {/* List View - DataTable */}
          {viewMode === 'list' && (
            <Card>
              <CardHeader className="card-header border-light justify-content-between">
                <span className="fw-semibold">Listado de Jugadores</span>
              </CardHeader>
              <DataTable<JugadorWithEquipo> table={table} emptyMessage="No se encontraron registros" />
              {table.getRowModel().rows.length > 0 && (
                <CardFooter className="border-0">
                  <TablePagination
                    totalItems={totalItems}
                    start={start}
                    end={end}
                    itemsName="jugadores"
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
            </Card>
          )}
          
          {/* Pagination for Grid View */}
          {viewMode === 'grid' && table.getRowModel().rows.length > 0 && (
            <div className="d-flex justify-content-between align-items-center mb-4 mt-3">
              <span className="text-muted fst-italic">
                Última modificación: <LuClock className="me-1" /> {new Date().toLocaleString()}
              </span>
              <Pagination className="pagination-boxed justify-content-center mb-0">
                <Pagination.Prev 
                  disabled={!table.getCanPreviousPage()}
                  onClick={() => table.previousPage()}
                >
                  <LuChevronLeft />
                </Pagination.Prev>
                {Array.from({ length: Math.min(5, table.getPageCount()) }, (_, i) => {
                  const pageIndex = table.getState().pagination.pageIndex
                  const startPage = Math.max(0, pageIndex - 2)
                  const currentPage = startPage + i
                  if (currentPage >= table.getPageCount()) return null
                  return (
                    <Pagination.Item 
                      key={currentPage}
                      active={currentPage === pageIndex}
                      onClick={() => table.setPageIndex(currentPage)}
                    >
                      {currentPage + 1}
                    </Pagination.Item>
                  )
                })}
                {table.getPageCount() > 5 && <Pagination.Ellipsis />}
                <Pagination.Next 
                  disabled={!table.getCanNextPage()}
                  onClick={() => table.nextPage()}
                >
                  <LuChevronRight />
                </Pagination.Next>
              </Pagination>
            </div>
          )}
        </Col>
      </Row>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        show={showDeleteModal}
        onHide={toggleDeleteModal}
        onConfirm={handleDelete}
        selectedCount={1}
        itemName="jugadores"
        modalTitle="Confirmar Eliminación"
        confirmButtonText="Eliminar"
        cancelButtonText="Cancelar"
        confirmButtonVariant="danger"
        cancelButtonVariant="light"
        isLoading={loading}
      >
        {jugadorToDelete && (
          <div className="text-center">
            <p>¿Estás seguro de que quieres eliminar el jugador:</p>
            <h6 className="text-danger mb-3">"{jugadorToDelete.apellido_nombre}"?</h6>
            <p className="text-muted small">
              Esta acción no se puede deshacer.
            </p>
          </div>
        )}
      </DeleteConfirmationModal>

      {/* Offcanvas Right con Formulario de Floating Labels para Crear */}
      <Offcanvas show={showOffcanvas} onHide={toggleOffcanvas} placement="end" className="offcanvas-end">
        <OffcanvasHeader closeButton>
          <OffcanvasTitle as="h5" className="mt-0">
            Agregar Nuevo Jugador
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
          
          <Form action={handleCreateJugador}>
            <Row className="g-3">
              <Col lg={12}>
                <FloatingLabel label="Cédula">
                  <FormControl type="text" name="cedula" placeholder="Ingrese la cédula" required />
                </FloatingLabel>
              </Col>

              <Col lg={12}>
                <FloatingLabel label="Apellido y Nombre">
                  <FormControl type="text" name="apellido_nombre" placeholder="Ingrese apellido y nombre" required />
                </FloatingLabel>
              </Col>

              <Col lg={6}>
                <FloatingLabel label="Nacionalidad">
                  <FormControl type="text" name="nacionalidad" placeholder="Ingrese nacionalidad" required />
                </FloatingLabel>
              </Col>

              <Col lg={6}>
                <FloatingLabel label="Liga">
                  <FormControl type="text" name="liga" placeholder="Ingrese liga" required />
                </FloatingLabel>
              </Col>

              <Col lg={6}>
                <FloatingLabel label="Categoría">
                  <FormSelect name="categoria_id" required>
                    <option value="">Seleccionar...</option>
                    {categorias.map((categoria) => (
                      <option key={categoria.id} value={categoria.id}>
                        {categoria.nombre}
                      </option>
                    ))}
                  </FormSelect>
                </FloatingLabel>
              </Col>

              <Col lg={6}>
                <FloatingLabel label="Equipo">
                  <FormSelect name="equipo_id" required>
                    <option value="">Seleccionar...</option>
                    {equipos.map((equipo) => (
                      <option key={equipo.id} value={equipo.id}>
                        {equipo.nombre}
                      </option>
                    ))}
                  </FormSelect>
                </FloatingLabel>
              </Col>

              <Col lg={12}>
                <FloatingLabel label="Estado">
                  <FormSelect name="estado">
                    <option value="true">Activo</option>
                    <option value="false">Inactivo</option>
                  </FormSelect>
                </FloatingLabel>
              </Col>

              <Col lg={12}>
                <div className="border rounded p-3">
                  <h6 className="mb-3">Foto del Jugador</h6>
                  
                  {capturedPhotoUrl ? (
                    <div className="text-center">
                      <img
                        src={capturedPhotoUrl}
                        alt="Foto del jugador"
                        className="img-fluid rounded mb-3"
                        style={{ maxHeight: '200px' }}
                      />
                      <div className="d-flex gap-2 justify-content-center">
                        <Button variant="outline-primary" size="sm" onClick={() => setShowCamera(true)}>
                          <TbCamera className="me-1" />
                          Cambiar Foto
                        </Button>
                        <Button variant="outline-danger" size="sm" onClick={removePhoto}>
                          <TbTrash className="me-1" />
                          Eliminar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="border-2 border-dashed rounded p-4 mb-3" style={{ borderStyle: 'dashed', borderColor: '#dee2e6' }}>
                        <TbCamera size={48} className="text-muted mb-2" />
                        <p className="text-muted mb-0">No hay foto seleccionada</p>
                      </div>
                      <Button variant="primary" onClick={() => setShowCamera(true)}>
                        <TbCamera className="me-2" />
                        Tomar Foto
                      </Button>
                    </div>
                  )}
                </div>
              </Col>

              <Col lg={12}>
                <div className="d-flex gap-2 justify-content-end">
                  <Button variant="light" onClick={toggleOffcanvas}>
                    Cancelar
                  </Button>
                  <Button variant="success" type="submit">
                    Crear Jugador
                  </Button>
                </div>
              </Col>
            </Row>
          </Form>
        </OffcanvasBody>
      </Offcanvas>

      {/* Offcanvas Right con Formulario de Floating Labels para Editar */}
      <Offcanvas show={showEditOffcanvas} onHide={toggleEditOffcanvas} placement="end" className="offcanvas-end">
        <OffcanvasHeader closeButton>
          <OffcanvasTitle as="h5" className="mt-0">
            Editar Jugador
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
          
          {editingJugador && (
            <Form action={handleUpdateJugador}>
              <Row className="g-3">
                <Col lg={12}>
                  <FloatingLabel label="Cédula">
                    <FormControl 
                      type="text" 
                      name="cedula" 
                      placeholder="Ingrese la cédula" 
                      defaultValue={editingJugador.cedula}
                      required 
                    />
                  </FloatingLabel>
                </Col>

                <Col lg={12}>
                  <FloatingLabel label="Apellido y Nombre">
                    <FormControl 
                      type="text" 
                      name="apellido_nombre" 
                      placeholder="Ingrese apellido y nombre" 
                      defaultValue={editingJugador.apellido_nombre}
                      required 
                    />
                  </FloatingLabel>
                </Col>

                <Col lg={6}>
                  <FloatingLabel label="Nacionalidad">
                    <FormControl 
                      type="text" 
                      name="nacionalidad" 
                      placeholder="Ingrese nacionalidad" 
                      defaultValue={editingJugador.nacionalidad}
                      required 
                    />
                  </FloatingLabel>
                </Col>

                <Col lg={6}>
                  <FloatingLabel label="Liga">
                    <FormControl 
                      type="text" 
                      name="liga" 
                      placeholder="Ingrese liga" 
                      defaultValue={editingJugador.liga}
                      required 
                    />
                  </FloatingLabel>
                </Col>

                <Col lg={6}>
                  <FloatingLabel label="Categoría">
                    <FormSelect name="categoria_id" defaultValue={editingJugador.categoria_id?.toString()} required>
                      <option value="">Seleccionar...</option>
                      {categorias.map((categoria) => (
                        <option key={categoria.id} value={categoria.id}>
                          {categoria.nombre}
                        </option>
                      ))}
                    </FormSelect>
                  </FloatingLabel>
                </Col>

                <Col lg={6}>
                  <FloatingLabel label="Equipo">
                    <FormSelect name="equipo_id" defaultValue={editingJugador.equipo_id?.toString()} required>
                      <option value="">Seleccionar...</option>
                      {equipos.map((equipo) => (
                        <option key={equipo.id} value={equipo.id}>
                          {equipo.nombre}
                        </option>
                      ))}
                    </FormSelect>
                  </FloatingLabel>
                </Col>

                <Col lg={12}>
                  <FloatingLabel label="Estado">
                    <FormSelect name="estado" defaultValue={(editingJugador.estado ?? true).toString()}>
                      <option value="true">Activo</option>
                      <option value="false">Inactivo</option>
                    </FormSelect>
                  </FloatingLabel>
                </Col>

                <Col lg={12}>
                  <div className="border rounded p-3">
                    <h6 className="mb-3">Foto del Jugador</h6>
                    
                                         {editCapturedPhotoUrl ? (
                       <div className="text-center">
                         <img
                           src={editCapturedPhotoUrl}
                           alt="Foto del jugador"
                           className="img-fluid rounded mb-3"
                           style={{ maxHeight: '200px' }}
                         />
                         <div className="d-flex gap-2 justify-content-center">
                           <Button variant="outline-primary" size="sm" onClick={() => setShowEditCamera(true)}>
                             <TbCamera className="me-1" />
                             Cambiar Foto
                           </Button>
                           <Button variant="outline-danger" size="sm" onClick={removeEditPhoto}>
                             <TbTrash className="me-1" />
                             Eliminar
                           </Button>
                         </div>
                       </div>
                     ) : editingJugador.foto ? (
                       <div className="text-center">
                         <img
                           src={editingJugador.foto}
                           alt="Foto actual del jugador"
                           className="img-fluid rounded mb-3"
                           style={{ maxHeight: '200px' }}
                         />
                         <div className="d-flex gap-2 justify-content-center">
                           <Button variant="outline-primary" size="sm" onClick={() => setShowEditCamera(true)}>
                             <TbCamera className="me-1" />
                             Cambiar Foto
                           </Button>
                           <Button variant="outline-danger" size="sm" onClick={removeEditPhoto}>
                             <TbTrash className="me-1" />
                             Eliminar
                           </Button>
                         </div>
                       </div>
                     ) : (
                       <div className="text-center">
                         <div className="border-2 border-dashed rounded p-4 mb-3" style={{ borderStyle: 'dashed', borderColor: '#dee2e6' }}>
                           <TbCamera size={48} className="text-muted mb-2" />
                           <p className="text-muted mb-0">No hay foto seleccionada</p>
                         </div>
                         <Button variant="primary" onClick={() => setShowEditCamera(true)}>
                           <TbCamera className="me-2" />
                           Tomar Foto
                         </Button>
                       </div>
                     )}
                  </div>
                </Col>

                <Col lg={12}>
                  <div className="d-flex gap-2 justify-content-end">
                    <Button variant="light" onClick={toggleEditOffcanvas}>
                      Cancelar
                    </Button>
                    <Button variant="primary" type="submit">
                      Actualizar Jugador
                    </Button>
                  </div>
                </Col>
              </Row>
            </Form>
          )}
        </OffcanvasBody>
      </Offcanvas>

      {/* Canvas oculto para procesamiento de imágenes */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Componente de captura de cámara para crear jugador */}
      <CameraCapture
        show={showCamera}
        onHide={() => setShowCamera(false)}
        onCapture={handlePhotoCapture}
        title="Tomar Foto del Jugador"
      />

      {/* Componente de captura de cámara para editar jugador */}
      <CameraCapture
        show={showEditCamera}
        onHide={() => setShowEditCamera(false)}
        onCapture={handleEditPhotoCapture}
        title="Tomar Foto del Jugador"
      />
    </Container>
  )
}

export default Page
