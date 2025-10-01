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
import ProfileCard from '@/components/ProfileCard'
import { getTempPlayerImage } from '@/components/TempPlayerImages'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Navigation, Pagination as SwiperPagination, Autoplay } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'
import '@/styles/mobile-carousel.css'

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
  
  // Estado para detectar si estamos en móvil
  const [isMobile, setIsMobile] = useState(false)
  
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
            <img
              src={row.original.foto || getTempPlayerImage(row.original.id)}
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
            <div className={`avatar-title bg-light rounded-circle d-none`}>
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

  // Detectar si estamos en móvil
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    return () => window.removeEventListener('resize', checkMobile)
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
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
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

            {/* Filtros superiores - Solo visible en escritorio */}
            <div className="d-none d-lg-block">
              <Row className="g-2 align-items-end">
                <Col lg={3}>
                  <label className="form-label fw-semibold mb-1">Buscar Jugador</label>
                  <div className="position-relative">
                    <FormControl
                      type="text"
                      placeholder="Buscar por nombre..."
                      value={globalFilter ?? ''}
                      onChange={(e) => setGlobalFilter(e.target.value)}
                      className="ps-5"
                    />
                    <LuSearch className="position-absolute top-50 translate-middle-y ms-2" style={{ left: '0.5rem' }} />
                  </div>
                </Col>
                <Col lg={3}>
                  <label className="form-label fw-semibold mb-1">Categoría</label>
                  <FormSelect
                    value={selectedCategorias.length === 1 ? selectedCategorias[0] : 'Todas'}
                    onChange={(e) => {
                      if (e.target.value === 'Todas') {
                        setSelectedCategorias([])
                        table.getColumn('categoria')?.setFilterValue(undefined)
                        setSelectedEquipos([])
                        table.getColumn('equipo')?.setFilterValue(undefined)
                      } else {
                        setSelectedCategorias([e.target.value])
                        table.getColumn('categoria')?.setFilterValue([e.target.value])
                        setSelectedEquipos([])
                        table.getColumn('equipo')?.setFilterValue(undefined)
                      }
                    }}
                  >
                    <option value="Todas">Todas las categorías</option>
                    {categorias.map((categoria) => (
                      <option key={categoria.id} value={categoria.nombre}>
                        {categoria.nombre}
                      </option>
                    ))}
                  </FormSelect>
                </Col>
                <Col lg={3}>
                  <label className="form-label fw-semibold mb-1">Equipo</label>
                  <FormSelect
                    value={selectedEquipos.length === 1 ? selectedEquipos[0] : 'Todos'}
                    onChange={(e) => {
                      if (e.target.value === 'Todos') {
                        setSelectedEquipos([])
                        table.getColumn('equipo')?.setFilterValue(undefined)
                      } else {
                        setSelectedEquipos([e.target.value])
                        table.getColumn('equipo')?.setFilterValue([e.target.value])
                      }
                    }}
                    disabled={selectedCategorias.length === 0}
                  >
                    <option value="Todos">Todos los equipos</option>
                    {getFilteredEquipos().map((equipo) => (
                      <option key={equipo.id} value={equipo.nombre}>
                        {equipo.nombre}
                      </option>
                    ))}
                  </FormSelect>
                </Col>
                <Col lg={3}>
                  <label className="form-label fw-semibold mb-1">Elementos por página</label>
                  <FormSelect
                    value={table.getState().pagination.pageSize}
                    onChange={(e) => table.setPageSize(Number(e.target.value))}
                  >
                    {[5, 8, 10, 15, 20].map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </FormSelect>
                </Col>
              </Row>
              
              {/* Botón para limpiar todos los filtros */}
              {(selectedCategorias.length > 0 || selectedEquipos.length > 0 || globalFilter) && (
                <div className="mt-2">
                  <Button 
                    variant="link" 
                    size="sm" 
                    className="p-0 text-decoration-none"
                    onClick={() => {
                      setSelectedCategorias([])
                      setSelectedEquipos([])
                      setGlobalFilter('')
                      table.getColumn('categoria')?.setFilterValue(undefined)
                      table.getColumn('equipo')?.setFilterValue(undefined)
                    }}
                  >
                    Limpiar todos los filtros
                  </Button>
                </div>
              )}
            </div>
          </div>
        </Col>
      </Row>

      {/* Main content area */}
      <Row className="g-2">
        
        {/* Mobile Filter Offcanvas */}
        <Offcanvas show={showFilterOffcanvas} onHide={toggleFilterOffcanvas} placement="start">
          <OffcanvasHeader closeButton>
            <OffcanvasTitle>Filtros</OffcanvasTitle>
          </OffcanvasHeader>
          <OffcanvasBody>
            <div className="mb-3">
              <label className="form-label fw-semibold">Buscar Jugador</label>
              <div className="position-relative">
                <FormControl
                  type="text"
                  placeholder="Buscar por nombre..."
                  value={globalFilter ?? ''}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  className="ps-5"
                />
                <LuSearch className="position-absolute top-50 translate-middle-y ms-2" style={{ left: '0.5rem' }} />
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label fw-semibold">Categoría</label>
              <FormSelect
                value={selectedCategorias.length === 1 ? selectedCategorias[0] : 'Todas'}
                onChange={(e) => {
                  if (e.target.value === 'Todas') {
                    setSelectedCategorias([])
                    table.getColumn('categoria')?.setFilterValue(undefined)
                    setSelectedEquipos([])
                    table.getColumn('equipo')?.setFilterValue(undefined)
                  } else {
                    setSelectedCategorias([e.target.value])
                    table.getColumn('categoria')?.setFilterValue([e.target.value])
                    setSelectedEquipos([])
                    table.getColumn('equipo')?.setFilterValue(undefined)
                  }
                }}
              >
                <option value="Todas">Todas las categorías</option>
                {categorias.map((categoria) => (
                  <option key={categoria.id} value={categoria.nombre}>
                    {categoria.nombre}
                  </option>
                ))}
              </FormSelect>
            </div>
            
            <div className="mb-3">
              <label className="form-label fw-semibold">Equipo</label>
              <FormSelect
                value={selectedEquipos.length === 1 ? selectedEquipos[0] : 'Todos'}
                onChange={(e) => {
                  if (e.target.value === 'Todos') {
                    setSelectedEquipos([])
                    table.getColumn('equipo')?.setFilterValue(undefined)
                  } else {
                    setSelectedEquipos([e.target.value])
                    table.getColumn('equipo')?.setFilterValue([e.target.value])
                  }
                }}
                disabled={selectedCategorias.length === 0}
              >
                <option value="Todos">Todos los equipos</option>
                {getFilteredEquipos().map((equipo) => (
                  <option key={equipo.id} value={equipo.nombre}>
                    {equipo.nombre}
                  </option>
                ))}
              </FormSelect>
            </div>
            
            {/* Botón para limpiar filtros en móvil */}
            {(selectedCategorias.length > 0 || selectedEquipos.length > 0 || globalFilter) && (
              <div className="mt-3">
                <Button 
                  variant="outline-secondary" 
                  size="sm" 
                  className="w-100"
                  onClick={() => {
                    setSelectedCategorias([])
                    setSelectedEquipos([])
                    setGlobalFilter('')
                    table.getColumn('categoria')?.setFilterValue(undefined)
                    table.getColumn('equipo')?.setFilterValue(undefined)
                  }}
                >
                  Limpiar todos los filtros
                </Button>
              </div>
            )}
          </OffcanvasBody>
        </Offcanvas>
        
        {/* Main Content Area */}
        <Col xl={12}>

          {/* Grid View - ProfileCards */}
          {viewMode === 'grid' && (
            <>
              {/* Vista de escritorio/tablet - Grid normal */}
              {!isMobile && (
                <Row className="row-cols-xxl-5 row-cols-xl-5 row-cols-lg-4 row-cols-md-3 row-cols-sm-2 g-4 profile-cards-grid" style={{ margin: '0 -15px' }}>
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
                      <Col className="col mb-4" key={jugador.id} style={{ padding: '0 15px' }}>
                        <div className="profile-card-container" style={{ height: '400px', width: '100%' }}>
                          <div className="position-relative">
                            <ProfileCard
                              name={jugador.apellido_nombre}
                              title={jugador.categoria?.nombre || 'Sin categoría'}
                              handle={jugador.equipo?.nombre || 'Sin equipo'}
                              status={jugador.estado ? 'Activo' : 'Inactivo'}
                              avatarUrl={jugador.foto || getTempPlayerImage(jugador.id)}
                              showUserInfo={true}
                              enableTilt={true}
                              enableMobileTilt={false}
                              onContactClick={() => window.location.href = `/jugadores/${jugador.id}`}
                              contactText="Ver Perfil"
                              className="h-100"
                            />
                            {/* Botones de acción flotantes */}
                            <div className="position-absolute top-0 end-0 p-2 d-flex gap-1">
                              <Button 
                                variant="light" 
                                size="sm" 
                                className="btn-icon rounded-circle shadow-sm"
                                onClick={() => handleEditClick(jugador)}
                                title="Editar jugador"
                              >
                                <TbEdit className="fs-sm" />
                              </Button>
                              <Button
                                variant="light"
                                size="sm"
                                className="btn-icon rounded-circle shadow-sm"
                                onClick={() => handleDeleteSingle(jugador)}
                                title="Eliminar jugador"
                              >
                                <TbTrash className="fs-sm" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </Col>
                    )
                  })}
                </Row>
              )}

              {/* Vista móvil - Carrusel */}
              {isMobile && (
                <div className="mobile-carousel-container">
                  {table.getRowModel().rows.length === 0 ? (
                    <Alert variant="info" className="text-center">
                      No se encontraron jugadores.
                    </Alert>
                  ) : (
                    <Swiper
                      modules={[Navigation, SwiperPagination, Autoplay]}
                      spaceBetween={20}
                      slidesPerView={1}
                      navigation={{
                        nextEl: '.swiper-button-next',
                        prevEl: '.swiper-button-prev',
                      }}
                      pagination={{
                        clickable: true,
                        dynamicBullets: true,
                      }}
                      autoplay={{
                        delay: 4000,
                        disableOnInteraction: false,
                      }}
                      loop={table.getRowModel().rows.length > 1}
                      className="mobile-swiper"
                    >
                      {table.getRowModel().rows.map((row) => {
                        const jugador = row.original
                        return (
                          <SwiperSlide key={jugador.id}>
                            <div className="mobile-profile-card-container" style={{ padding: '0 20px' }}>
                              <div className="position-relative">
                                <ProfileCard
                                  name={jugador.apellido_nombre}
                                  title={jugador.categoria?.nombre || 'Sin categoría'}
                                  handle={jugador.equipo?.nombre || 'Sin equipo'}
                                  status={jugador.estado ? 'Activo' : 'Inactivo'}
                                  avatarUrl={jugador.foto || getTempPlayerImage(jugador.id)}
                                  showUserInfo={true}
                                  enableTilt={false}
                                  enableMobileTilt={false}
                                  onContactClick={() => window.location.href = `/jugadores/${jugador.id}`}
                                  contactText="Ver Perfil"
                                  className="h-100"
                                />
                                {/* Botones de acción flotantes */}
                                <div className="position-absolute top-0 end-0 p-2 d-flex gap-1">
                                  <Button 
                                    variant="light" 
                                    size="sm" 
                                    className="btn-icon rounded-circle shadow-sm"
                                    onClick={() => handleEditClick(jugador)}
                                    title="Editar jugador"
                                  >
                                    <TbEdit className="fs-sm" />
                                  </Button>
                                  <Button
                                    variant="light"
                                    size="sm"
                                    className="btn-icon rounded-circle shadow-sm"
                                    onClick={() => handleDeleteSingle(jugador)}
                                    title="Eliminar jugador"
                                  >
                                    <TbTrash className="fs-sm" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </SwiperSlide>
                        )
                      })}
                    </Swiper>
                  )}
                </div>
              )}
            </>
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
