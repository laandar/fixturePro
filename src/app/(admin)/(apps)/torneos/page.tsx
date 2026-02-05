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
import { Button, Card, CardBody, CardFooter, CardHeader, Col, Container, FloatingLabel, Form, FormControl, FormSelect, Offcanvas, OffcanvasBody, OffcanvasHeader, OffcanvasTitle, Row, Alert, Badge, Modal, ModalHeader, ModalBody, ModalFooter, ModalTitle } from 'react-bootstrap'
import { LuSearch, LuTrophy, LuCalendar, LuUsers, LuGamepad2, LuMapPin, LuChevronDown, LuChevronUp, LuCircleCheck, LuX } from 'react-icons/lu'
import { TbEdit, TbEye, TbPlus, TbTrash, TbSettings } from 'react-icons/tb'
import { getTorneos, deleteTorneo, createTorneo, updateTorneo, getAllEncuentrosTodosTorneos, getAllHorariosTodosTorneos } from './actions'
import { getTemporadas, createTemporada, updateTemporada, deleteTemporada, toggleTemporadaActiva } from './temporadas-actions'
import { getCategorias } from '../categorias/actions'
import type { TorneoWithRelations, Categoria, EncuentroWithRelations, Horario, Temporada } from '@/db/types'
import TablaHorariosCanchas from '@/components/TablaHorariosCanchas'



const columnHelper = createColumnHelper<TorneoWithRelations>()

const Page = () => {
  const { isTrue: showOffcanvas, toggle: toggleOffcanvas } = useToggle()
  const { isTrue: showEditOffcanvas, toggle: toggleEditOffcanvas } = useToggle()
  const { puedeVer, puedeCrear, puedeEditar, puedeEliminar, cargando: cargandoPermisos } = usePermisos('torneos')
  
  const [data, setData] = useState<TorneoWithRelations[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [temporadas, setTemporadas] = useState<Temporada[]>([])
  const [loading, setLoading] = useState(true)
  const [showTemporadasModal, setShowTemporadasModal] = useState(false)
  const [temporadasExpandidas, setTemporadasExpandidas] = useState<Set<number | null>>(new Set())
  const [showTablaGlobal, setShowTablaGlobal] = useState(false)
  const [encuentrosGlobales, setEncuentrosGlobales] = useState<EncuentroWithRelations[]>([])
  const [horariosGlobales, setHorariosGlobales] = useState<Horario[]>([])
  const [loadingTablaGlobal, setLoadingTablaGlobal] = useState(false)
  const [torneosSeleccionados, setTorneosSeleccionados] = useState<number[]>([])
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
      accessorFn: (row: TorneoWithRelations) => row.estado,
      enableColumnFilter: true,
      cell: ({ row }: { row: TableRow<TorneoWithRelations> }) => {
        const estado = row.original.estado
        const estadoConfig: Record<string, { bg: string; text: string; label: string; icon: string }> = {
          planificado: { bg: 'warning', text: 'dark', label: 'Planificado', icon: '⏳' },
          en_curso: { bg: 'info', text: 'white', label: 'En Curso', icon: '▶️' },
          finalizado: { bg: 'primary', text: 'white', label: 'Finalizado', icon: '✅' },
          cancelado: { bg: 'danger', text: 'white', label: 'Cancelado', icon: '❌' }
        }
        const config = estado ? estadoConfig[estado] || { bg: 'secondary', text: 'white', label: estado, icon: '❓' } : { bg: 'secondary', text: 'white', label: 'Sin estado', icon: '❓' }
        
        return (
          <div className="d-flex align-items-center gap-2">
            <span className="fs-5">{config.icon}</span>
            <Badge 
              bg={config.bg} 
              className={`px-3 py-2 fw-semibold text-${config.text} border-0`}
              style={{ 
                fontSize: '0.8rem',
                borderRadius: '20px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              {config.label}
            </Badge>
          </div>
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
              <TbEye className="fs-lg d-none d-md-inline" />
              <TbEye className="fs-1 d-md-none" />
            </Button>
          </Link>
          {puedeEditar && (
            <Button 
              variant="light" 
              size="sm" 
              className="btn-icon rounded-circle"
              onClick={() => handleEditClick(row.original)}
              title="Editar torneo">
              <TbEdit className="fs-lg d-none d-md-inline" />
              <TbEdit className="fs-1 d-md-none" />
            </Button>
          )}
          {puedeEliminar && (
            <Button
              variant="light"
              size="sm"
              className="btn-icon rounded-circle"
              onClick={() => handleDeleteSingle(row.original)}
              title="Eliminar torneo">
              <TbTrash className="fs-lg d-none d-md-inline" />
              <TbTrash className="fs-1 d-md-none" />
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
      const [torneosData, categoriasData, temporadasData] = await Promise.all([
        getTorneos(),
        getCategorias(),
        getTemporadas()
      ])
      setData(torneosData as any)
      setCategorias(categoriasData)
      setTemporadas(temporadasData)
      
      // Expandir todas las temporadas activas que tienen torneos por defecto
      const temporadasConTorneos = new Set<number | null>()
      temporadasConTorneos.add(null) // Expandir "Sin Temporada" también
      ;(torneosData as any[]).forEach(torneo => {
        if (torneo.temporada_id) {
          // Solo expandir si la temporada está activa
          const temporada = temporadasData.find(t => t.id === torneo.temporada_id)
          if (temporada && temporada.activa) {
            temporadasConTorneos.add(torneo.temporada_id)
          }
        } else {
          temporadasConTorneos.add(null)
        }
      })
      setTemporadasExpandidas(temporadasConTorneos)
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

      <Row className="justify-content-center mb-4">
        <Col xxl={10}>
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
            <Button 
              variant="outline-primary" 
              size="sm"
              onClick={() => setShowTemporadasModal(true)}
            >
              <LuCalendar className="me-1" />
              Gestionar Temporadas
            </Button>
            <Button 
              variant="primary" 
              size="sm"
              onClick={async () => {
                setLoadingTablaGlobal(true)
                try {
                  const [encuentros, horarios] = await Promise.all([
                    getAllEncuentrosTodosTorneos(),
                    getAllHorariosTodosTorneos()
                  ])
                  setEncuentrosGlobales(encuentros)
                  setHorariosGlobales(horarios)
                  // Inicializar con todos los torneos activos seleccionados
                  const torneosActivos = data.filter(t => t.estado === 'en_curso').map(t => t.id)
                  setTorneosSeleccionados(torneosActivos)
                  setShowTablaGlobal(true)
                } catch (err) {
                  setError('Error al cargar la tabla global')
                } finally {
                  setLoadingTablaGlobal(false)
                }
              }}
              disabled={loadingTablaGlobal}
            >
              {loadingTablaGlobal ? (
                <>
                  <span className="spinner-border spinner-border-sm me-1" />
                  Cargando...
                </>
              ) : (
                <>
                  <LuMapPin className="me-1" />
                  Ver Tabla Global
                </>
              )}
            </Button>
          </div>
        </Col>
      </Row>


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


              </div>
            </CardHeader>

            {/* Vista agrupada por temporada */}
            {(() => {
              // Agrupar torneos por temporada
              const torneosFiltrados = table.getFilteredRowModel().rows.map(row => row.original)
              const torneosPorTemporada = new Map<number | null, TorneoWithRelations[]>()
              
              // Agregar torneos sin temporada
              torneosPorTemporada.set(null, [])
              
              torneosFiltrados.forEach(torneo => {
                const temporadaId = torneo.temporada_id || null
                // Solo incluir torneos de temporadas activas o sin temporada
                if (temporadaId === null) {
                  // Torneos sin temporada siempre se incluyen
                  if (!torneosPorTemporada.has(null)) {
                    torneosPorTemporada.set(null, [])
                  }
                  torneosPorTemporada.get(null)!.push(torneo)
                } else {
                  // Solo incluir si la temporada está activa
                  const temporada = temporadas.find(t => t.id === temporadaId)
                  if (temporada && temporada.activa) {
                    if (!torneosPorTemporada.has(temporadaId)) {
                      torneosPorTemporada.set(temporadaId, [])
                    }
                    torneosPorTemporada.get(temporadaId)!.push(torneo)
                  }
                }
              })

              const temporadasOrdenadas = Array.from(torneosPorTemporada.keys())
                .map(id => {
                  const temporada = id ? temporadas.find(t => t.id === id) : null
                  return { id, temporada, torneos: torneosPorTemporada.get(id) || [] }
                })
                .filter(item => item.torneos.length > 0)
                .sort((a, b) => {
                  if (!a.temporada && !b.temporada) return 0
                  if (!a.temporada) return 1
                  if (!b.temporada) return -1
                  return (b.temporada.nombre || '').localeCompare(a.temporada.nombre || '')
                })

              if (temporadasOrdenadas.length === 0) {
                return (
                  <div className="text-center py-5">
                    <p className="text-muted">No se encontraron torneos</p>
                  </div>
                )
              }

              return (
                <div className="p-3">
                  {temporadasOrdenadas.map(({ id, temporada, torneos }) => {
                    const estaExpandida = temporadasExpandidas.has(id)
                    const toggleExpandir = () => {
                      const nuevasExpandidas = new Set(temporadasExpandidas)
                      if (estaExpandida) {
                        nuevasExpandidas.delete(id)
                      } else {
                        nuevasExpandidas.add(id)
                      }
                      setTemporadasExpandidas(nuevasExpandidas)
                    }

                    return (
                      <div key={id || 'sin-temporada'} className="mb-4">
                        <div 
                          className="mb-3 pb-2 border-bottom cursor-pointer"
                          onClick={toggleExpandir}
                          style={{ cursor: 'pointer' }}
                        >
                          <div className="d-flex align-items-center gap-2 mb-1">
                            <Button
                              variant="link"
                              className="p-0 text-decoration-none"
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleExpandir()
                              }}
                            >
                              {estaExpandida ? (
                                <LuChevronUp className="text-primary" size={20} />
                              ) : (
                                <LuChevronDown className="text-primary" size={20} />
                              )}
                            </Button>
                            <LuCalendar className="text-primary" />
                            <h5 className="mb-0 fw-semibold flex-grow-1">
                              {temporada ? temporada.nombre : 'Sin Temporada'}
                            </h5>
                            {temporada && (
                              <Badge bg={temporada.activa ? 'success' : 'secondary'} className="me-2">
                                {temporada.activa ? 'Activa' : 'Inactiva'}
                              </Badge>
                            )}
                            <Badge bg="secondary" className="ms-2">
                              {torneos.length} torneo{torneos.length !== 1 ? 's' : ''}
                            </Badge>
                          </div>
                          {temporada?.descripcion && (
                            <p className="text-muted mb-0 ms-4 fs-sm">
                              {temporada.descripcion}
                            </p>
                          )}
                        </div>
                        {estaExpandida && (
                          <div className="row g-3">
                        {torneos.map(torneo => {
                          const estadoConfig: Record<string, { bg: string; text: string; label: string; icon: string }> = {
                            planificado: { bg: 'warning', text: 'dark', label: 'Planificado', icon: '⏳' },
                            en_curso: { bg: 'info', text: 'white', label: 'En Curso', icon: '▶️' },
                            finalizado: { bg: 'primary', text: 'white', label: 'Finalizado', icon: '✅' },
                            cancelado: { bg: 'danger', text: 'white', label: 'Cancelado', icon: '❌' }
                          }
                          const config = torneo.estado ? estadoConfig[torneo.estado] || { bg: 'secondary', text: 'white', label: torneo.estado, icon: '❓' } : { bg: 'secondary', text: 'white', label: 'Sin estado', icon: '❓' }
                          
                          return (
                            <Col md={6} lg={4} key={torneo.id}>
                              <Card className="h-100">
                                <CardBody>
                                  <div className="d-flex justify-content-between align-items-start mb-2">
                                    <div className="d-flex align-items-center gap-2">
                                      <div className="avatar avatar-sm">
                                        <div className="avatar-title bg-primary-subtle text-primary rounded-circle">
                                          <LuTrophy className="fs-lg" />
                                        </div>
                                      </div>
                                      <div className="flex-grow-1">
                                        <h6 className="mb-0">
                                          <Link href={`/torneos/${torneo.id}`} className="link-reset">
                                            {torneo.nombre}
                                          </Link>
                                        </h6>
                                        <small className="text-muted">{torneo.descripcion || 'Sin descripción'}</small>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="mt-3">
                                    <div className="d-flex flex-wrap gap-2 mb-2">
                                      <Badge bg="light" text="dark" className="fs-xs">
                                        <LuTrophy className="me-1" /> {torneo.categoria?.nombre || 'Sin categoría'}
                                      </Badge>
                                      <Badge bg={config.bg} className={`px-2 py-1 fw-semibold text-${config.text} border-0`}>
                                        <span className="me-1">{config.icon}</span>
                                        {config.label}
                                      </Badge>
                                    </div>
                                    <div className="d-flex justify-content-between align-items-center mt-2">
                                      <div className="d-flex gap-3 text-muted small">
                                        <span><LuUsers className="me-1" /> {torneo.equiposTorneo?.length || 0}</span>
                                        <span><LuGamepad2 className="me-1" /> {torneo.encuentros?.length || 0}</span>
                                      </div>
                                      <div className="d-flex gap-1">
                                        <Link href={`/torneos/${torneo.id}`}>
                                          <Button variant="light" size="sm" className="btn-icon rounded-circle" title="Ver detalles">
                                            <TbEye className="fs-sm" />
                                          </Button>
                                        </Link>
                                        {puedeEditar && (
                                          <Button variant="light" size="sm" className="btn-icon rounded-circle" onClick={() => handleEditClick(torneo)} title="Editar">
                                            <TbEdit className="fs-sm" />
                                          </Button>
                                        )}
                                        {puedeEliminar && (
                                          <Button variant="light" size="sm" className="btn-icon rounded-circle" onClick={() => handleDeleteSingle(torneo)} title="Eliminar">
                                            <TbTrash className="fs-sm" />
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </CardBody>
                              </Card>
                            </Col>
                          )
                        })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })()}

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
                    {categorias.filter(categoria => categoria.estado === true).map((categoria) => (
                      <option key={categoria.id} value={categoria.id}>
                        {categoria.nombre}
                      </option>
                    ))}
                  </FormSelect>
                </FloatingLabel>
              </Col>
              <Col md={6}>
                <FloatingLabel controlId="temporada_id" label="Temporada/Campeonato" className="mb-3">
                  <FormSelect name="temporada_id">
                    <option value="">Sin temporada</option>
                    {temporadas.filter(t => t.activa).map((temporada) => (
                      <option key={temporada.id} value={temporada.id}>
                        {temporada.nombre}
                      </option>
                    ))}
                  </FormSelect>
                </FloatingLabel>
              </Col>
            </Row>

            <Row>
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
                      {categorias.filter(categoria => categoria.estado === true).map((categoria) => (
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
                  <FloatingLabel controlId="edit_temporada_id" label="Temporada/Campeonato" className="mb-3">
                    <FormSelect name="temporada_id" defaultValue={editingTorneo.temporada_id?.toString() || ''}>
                      <option value="">Sin temporada</option>
                      {temporadas.filter(t => t.activa).map((temporada) => (
                        <option key={temporada.id} value={temporada.id}>
                          {temporada.nombre}
                        </option>
                      ))}
                    </FormSelect>
                  </FloatingLabel>
                </Col>
              </Row>

              <Row>
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

      {/* Modal: Tabla Global Horarios vs Canchas */}
      <Modal 
        show={showTablaGlobal} 
        onHide={() => setShowTablaGlobal(false)}
        centered
        fullscreen
      >
        <ModalHeader closeButton className="border-bottom">
          <ModalTitle className="d-flex align-items-center">
            <LuMapPin className="me-2" />
            Tabla Global de Horarios
          </ModalTitle>
        </ModalHeader>
        <ModalBody className="p-0">
          {/* Selector de torneos - Barra superior simple */}
          <div className="bg-light border-bottom p-3">
            <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
              <div className="d-flex align-items-center gap-2">
                <LuTrophy className="text-primary" />
                <span className="fw-semibold">Torneos activos:</span>
              </div>
              <div className="d-flex flex-wrap gap-2">
                {data.filter(torneo => torneo.estado === 'en_curso').length === 0 ? (
                  <span className="text-muted small">No hay torneos activos</span>
                ) : (
                  data.filter(torneo => torneo.estado === 'en_curso').map((torneo) => (
                    <Button
                      key={torneo.id}
                      variant="outline-secondary"
                      size="sm"
                      onClick={() => {
                        if (torneosSeleccionados.includes(torneo.id)) {
                          setTorneosSeleccionados(torneosSeleccionados.filter(id => id !== torneo.id))
                        } else {
                          setTorneosSeleccionados([...torneosSeleccionados, torneo.id])
                        }
                      }}
                      style={torneosSeleccionados.includes(torneo.id) ? {
                        backgroundColor: 'rgba(24, 127, 205, 0.8)',
                        borderColor: 'rgba(24, 127, 205, 0.8)',
                        color: '#fff'
                      } : {}}
                      onMouseEnter={(e) => {
                        if (!torneosSeleccionados.includes(torneo.id)) {
                          e.currentTarget.style.backgroundColor = 'rgba(24, 127, 205, 0.8)'
                          e.currentTarget.style.borderColor = 'rgba(24, 127, 205, 0.8)'
                          e.currentTarget.style.color = '#fff'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!torneosSeleccionados.includes(torneo.id)) {
                          e.currentTarget.style.backgroundColor = 'transparent'
                          e.currentTarget.style.borderColor = '#6c757d'
                          e.currentTarget.style.color = '#6c757d'
                        }
                      }}
                    >
                      {torneo.nombre}
                    </Button>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Contenido de la tabla */}
          <div className="p-3">
            {torneosSeleccionados.length === 0 ? (
              <Alert variant="info" className="text-center mb-0">
                <LuTrophy className="me-2" size={20} />
                <Alert.Heading className="h6">Selecciona al menos un torneo</Alert.Heading>
                <p className="mb-0 small">Elige uno o más torneos activos para ver su programación</p>
              </Alert>
            ) : (() => {
              // Filtrar encuentros por torneos seleccionados
              const encuentrosFiltrados = encuentrosGlobales.filter(encuentro => {
                return encuentro.torneo_id && torneosSeleccionados.includes(encuentro.torneo_id)
              })
              
              // Extraer los horario_id únicos de los encuentros filtrados
              const horariosIdsUsados = new Set(
                encuentrosFiltrados
                  .map(e => e.horario_id)
                  .filter((id): id is number => id !== null && id !== undefined)
              )
              
              // Filtrar horarios para mostrar solo los usados por los torneos seleccionados
              const horariosFiltrados = horariosGlobales.filter(horario => 
                horariosIdsUsados.has(horario.id)
              )
              
              const refetchTablaGlobal = async () => {
                try {
                  const [encuentros, horarios] = await Promise.all([
                    getAllEncuentrosTodosTorneos(),
                    getAllHorariosTodosTorneos()
                  ])
                  setEncuentrosGlobales(encuentros)
                  setHorariosGlobales(horarios)
                } catch {
                  setError('Error al actualizar la tabla')
                }
              }

              return (
                <TablaHorariosCanchas 
                  encuentros={encuentrosFiltrados}
                  horarios={horariosFiltrados}
                  canchas={Array.from(new Set(
                    encuentrosFiltrados
                      .map(e => e.cancha)
                      .filter((c): c is string => c !== null && c !== undefined && c.trim() !== '')
                  )).sort()}
                  onMoveSuccess={refetchTablaGlobal}
                />
              )
            })()}
          </div>
        </ModalBody>
        <ModalFooter className="border-top">
          <div className="d-flex justify-content-between align-items-center w-100">
            <small className="text-muted">
              {torneosSeleccionados.length > 0 && (
                <>{torneosSeleccionados.length} torneo{torneosSeleccionados.length !== 1 ? 's' : ''} seleccionado{torneosSeleccionados.length !== 1 ? 's' : ''}</>
              )}
            </small>
            <Button variant="secondary" onClick={() => setShowTablaGlobal(false)}>
              Cerrar
            </Button>
          </div>
        </ModalFooter>
      </Modal>

      {/* Modal: Gestión de Temporadas */}
      <Modal 
        show={showTemporadasModal} 
        onHide={() => setShowTemporadasModal(false)}
        size="lg"
        centered
      >
        <ModalHeader closeButton className="border-bottom">
          <ModalTitle className="d-flex align-items-center">
            <LuCalendar className="me-2" />
            Gestionar Temporadas
          </ModalTitle>
        </ModalHeader>
        <ModalBody>
          <TemporadasManager 
            temporadas={temporadas}
            onRefresh={loadData}
            puedeCrear={puedeCrear}
            puedeEditar={puedeEditar}
            puedeEliminar={puedeEliminar}
          />
        </ModalBody>
        <ModalFooter className="border-top">
          <Button variant="secondary" onClick={() => setShowTemporadasModal(false)}>
            Cerrar
          </Button>
        </ModalFooter>
      </Modal>
    </Container>
  )
}

// Componente para gestionar temporadas
const TemporadasManager = ({ 
  temporadas, 
  onRefresh, 
  puedeCrear, 
  puedeEditar, 
  puedeEliminar 
}: { 
  temporadas: Temporada[]
  onRefresh: () => void
  puedeCrear: boolean
  puedeEditar: boolean
  puedeEliminar: boolean
}) => {
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingTemporada, setEditingTemporada] = useState<Temporada | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [temporadaToDelete, setTemporadaToDelete] = useState<Temporada | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const handleCreate = async (formData: FormData) => {
    if (!puedeCrear) {
      setFormError('No tienes permiso para crear temporadas')
      return
    }
    
    try {
      setLoading(true)
      setFormError(null)
      await createTemporada(formData)
      setFormSuccess('Temporada creada exitosamente')
      setTimeout(() => {
        onRefresh()
        setShowCreateForm(false)
        setFormSuccess(null)
      }, 1000)
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Error al crear temporada')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdate = async (formData: FormData) => {
    if (!editingTemporada || !puedeEditar) {
      setFormError('No tienes permiso para editar temporadas')
      return
    }
    
    try {
      setLoading(true)
      setFormError(null)
      await updateTemporada(editingTemporada.id, formData)
      setFormSuccess('Temporada actualizada exitosamente')
      setTimeout(() => {
        onRefresh()
        setEditingTemporada(null)
        setFormSuccess(null)
      }, 1000)
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Error al actualizar temporada')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!temporadaToDelete || !puedeEliminar) {
      setFormError('No tienes permiso para eliminar temporadas')
      return
    }
    
    try {
      setLoading(true)
      await deleteTemporada(temporadaToDelete.id)
      setShowDeleteModal(false)
      setTemporadaToDelete(null)
      onRefresh()
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Error al eliminar temporada')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleActiva = async (temporada: Temporada) => {
    if (!puedeEditar) {
      setFormError('No tienes permiso para editar temporadas')
      return
    }
    
    try {
      setLoading(true)
      setFormError(null)
      await toggleTemporadaActiva(temporada.id, !temporada.activa)
      setFormSuccess(`Temporada ${!temporada.activa ? 'activada' : 'desactivada'} exitosamente`)
      setTimeout(() => {
        onRefresh()
        setFormSuccess(null)
      }, 1000)
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Error al cambiar estado de temporada')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
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

      <div className="d-flex justify-content-between align-items-center mb-3">
        <h6 className="mb-0">Temporadas ({temporadas.length})</h6>
        {puedeCrear && (
          <Button 
            variant="primary" 
            size="sm"
            onClick={() => {
              setShowCreateForm(true)
              setEditingTemporada(null)
              setFormError(null)
            }}
          >
            <TbPlus className="me-1" />
            Nueva Temporada
          </Button>
        )}
      </div>

      {showCreateForm && (
        <Card className="mb-3">
          <CardHeader>
            <h5 className="mb-0">Crear Nueva Temporada</h5>
          </CardHeader>
          <CardBody>
            <Form action={handleCreate}>
              <Row>
                <Col md={6}>
                  <FloatingLabel controlId="temp_nombre" label="Nombre (ej: 2025-2026)" className="mb-3">
                    <FormControl type="text" name="nombre" placeholder="2025-2026" required />
                  </FloatingLabel>
                </Col>
                <Col md={6}>
                  <FloatingLabel controlId="temp_activa" label="Estado" className="mb-3">
                    <FormSelect name="activa" defaultValue="true">
                      <option value="true">Activa</option>
                      <option value="false">Inactiva</option>
                    </FormSelect>
                  </FloatingLabel>
                </Col>
              </Row>
              <Row>
                <Col md={6}>
                  <FloatingLabel controlId="temp_fecha_inicio" label="Fecha Inicio" className="mb-3">
                    <FormControl type="date" name="fecha_inicio" />
                  </FloatingLabel>
                </Col>
                <Col md={6}>
                  <FloatingLabel controlId="temp_fecha_fin" label="Fecha Fin" className="mb-3">
                    <FormControl type="date" name="fecha_fin" />
                  </FloatingLabel>
                </Col>
              </Row>
              <FloatingLabel controlId="temp_descripcion" label="Descripción" className="mb-3">
                <FormControl as="textarea" name="descripcion" style={{ height: '80px' }} />
              </FloatingLabel>
              <div className="d-flex gap-2">
                <Button type="submit" variant="primary" disabled={loading}>
                  {loading ? 'Creando...' : 'Crear'}
                </Button>
                <Button type="button" variant="light" onClick={() => setShowCreateForm(false)}>
                  Cancelar
                </Button>
              </div>
            </Form>
          </CardBody>
        </Card>
      )}

      {editingTemporada && (
        <Card className="mb-3">
          <CardHeader>
            <h5 className="mb-0">Editar Temporada</h5>
          </CardHeader>
          <CardBody>
            <Form action={handleUpdate}>
              <Row>
                <Col md={6}>
                  <FloatingLabel controlId="edit_temp_nombre" label="Nombre" className="mb-3">
                    <FormControl 
                      type="text" 
                      name="nombre" 
                      defaultValue={editingTemporada.nombre} 
                      required 
                    />
                  </FloatingLabel>
                </Col>
                <Col md={6}>
                  <FloatingLabel controlId="edit_temp_activa" label="Estado" className="mb-3">
                    <FormSelect name="activa" defaultValue={editingTemporada.activa ? 'true' : 'false'}>
                      <option value="true">Activa</option>
                      <option value="false">Inactiva</option>
                    </FormSelect>
                  </FloatingLabel>
                </Col>
              </Row>
              <Row>
                <Col md={6}>
                  <FloatingLabel controlId="edit_temp_fecha_inicio" label="Fecha Inicio" className="mb-3">
                    <FormControl 
                      type="date" 
                      name="fecha_inicio" 
                      defaultValue={editingTemporada.fecha_inicio ? new Date(editingTemporada.fecha_inicio).toISOString().split('T')[0] : ''} 
                    />
                  </FloatingLabel>
                </Col>
                <Col md={6}>
                  <FloatingLabel controlId="edit_temp_fecha_fin" label="Fecha Fin" className="mb-3">
                    <FormControl 
                      type="date" 
                      name="fecha_fin" 
                      defaultValue={editingTemporada.fecha_fin ? new Date(editingTemporada.fecha_fin).toISOString().split('T')[0] : ''} 
                    />
                  </FloatingLabel>
                </Col>
              </Row>
              <FloatingLabel controlId="edit_temp_descripcion" label="Descripción" className="mb-3">
                <FormControl 
                  as="textarea" 
                  name="descripcion" 
                  defaultValue={editingTemporada.descripcion || ''} 
                  style={{ height: '80px' }} 
                />
              </FloatingLabel>
              <div className="d-flex gap-2">
                <Button type="submit" variant="primary" disabled={loading}>
                  {loading ? 'Actualizando...' : 'Actualizar'}
                </Button>
                <Button type="button" variant="light" onClick={() => setEditingTemporada(null)}>
                  Cancelar
                </Button>
              </div>
            </Form>
          </CardBody>
        </Card>
      )}

      <div className="list-group">
        {temporadas.length === 0 ? (
          <div className="text-center py-4 text-muted">
            No hay temporadas creadas
          </div>
        ) : (
          temporadas.map(temporada => (
            <div 
              key={temporada.id} 
              className={`list-group-item d-flex justify-content-between align-items-center ${!temporada.activa ? 'opacity-75' : ''}`}
            >
              <div className="flex-grow-1">
                <div className="d-flex align-items-center gap-2 mb-1">
                  <h6 className="mb-0">{temporada.nombre}</h6>
                  <Badge bg={temporada.activa ? 'success' : 'secondary'}>
                    {temporada.activa ? (
                      <>
                        <LuCircleCheck className="me-1" size={14} />
                        Activa
                      </>
                    ) : (
                      <>
                        <LuX className="me-1" size={14} />
                        Inactiva
                      </>
                    )}
                  </Badge>
                </div>
                {temporada.descripcion && (
                  <small className="text-muted d-block mb-1">{temporada.descripcion}</small>
                )}
                {temporada.fecha_inicio && temporada.fecha_fin && (
                  <small className="text-muted">
                    {new Date(temporada.fecha_inicio).toLocaleDateString('es-ES')} - {new Date(temporada.fecha_fin).toLocaleDateString('es-ES')}
                  </small>
                )}
              </div>
              <div className="d-flex gap-1">
                {puedeEditar && (
                  <>
                    <Button 
                      variant={temporada.activa ? "outline-warning" : "outline-success"} 
                      size="sm"
                      onClick={() => handleToggleActiva(temporada)}
                      title={temporada.activa ? "Desactivar temporada" : "Activar temporada"}
                      disabled={loading}
                    >
                      {temporada.activa ? (
                        <>
                          <LuX className="me-1" />
                          Cerrar
                        </>
                      ) : (
                        <>
                          <LuCircleCheck className="me-1" />
                          Activar
                        </>
                      )}
                    </Button>
                    <Button 
                      variant="light" 
                      size="sm"
                      onClick={() => {
                        setEditingTemporada(temporada)
                        setShowCreateForm(false)
                        setFormError(null)
                      }}
                      title="Editar temporada"
                    >
                      <TbEdit />
                    </Button>
                  </>
                )}
                {puedeEliminar && (
                  <Button 
                    variant="light" 
                    size="sm"
                    onClick={() => {
                      setTemporadaToDelete(temporada)
                      setShowDeleteModal(true)
                    }}
                    title="Eliminar temporada"
                  >
                    <TbTrash />
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <ConfirmationModal
        show={showDeleteModal}
        onHide={() => {
          setShowDeleteModal(false)
          setTemporadaToDelete(null)
        }}
        onConfirm={handleDelete}
        selectedCount={1}
        itemName="temporada"
        variant="danger"
        isLoading={loading}
        showBadgeDesign={false}
        itemToDelete={temporadaToDelete?.nombre}
      />
    </div>
  )
}

export default Page
