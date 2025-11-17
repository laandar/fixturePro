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
import { Button, Card, CardBody, CardFooter, CardHeader, Col, Container, FloatingLabel, Form, FormControl, FormSelect, Offcanvas, OffcanvasBody, OffcanvasHeader, OffcanvasTitle, Row, Alert, Badge, ProgressBar } from 'react-bootstrap'
import { LuSearch, LuTrophy, LuCalendar, LuUsers, LuGamepad2, LuClock, LuCheck, LuX } from 'react-icons/lu'
import { TbEdit, TbEye, TbPlus, TbTrash, TbSettings } from 'react-icons/tb'
import { getTorneos, deleteTorneo, createTorneo, updateTorneo, getMapaGeneralHorarios, getMapaHorariosCanchasGeneral } from './actions'
import { getCategorias } from '../categorias/actions'
import type { TorneoWithRelations, Categoria } from '@/db/types'

type MapaHorarioTorneo = {
  torneoId: number
  torneo: string
  estado: string | null
  categoria: string | null
  totales: {
    totalHorarios: number
    horariosCubiertos: number
    horariosLibres: number
    coberturaPorcentaje: number
  }
  dias: Array<{
    dia: string
    label: string
    totalHorarios: number
    cubiertos: number
    libres: number
  }>
  horarios: Array<{
    id: number
    dia: string
    labelDia: string
    hora: string
    cubierto: boolean
    totalEncuentros: number
  }>
}

type MapaHorariosCanchas = {
  torneoId: number
  torneo: string
  estado: string | null
  categoria: string | null
  canchas: Array<{ id: number; nombre: string }>
  filas: Array<{
    horarioId: number
    dia: string
    labelDia: string
    hora: string
    celdas: Array<{
      canchaId: number
      cancha: string
      cubierto: boolean
      totalEncuentros: number
    }>
    resumen: { cubiertas: number; libres: number }
  }>
}

const columnHelper = createColumnHelper<TorneoWithRelations>()

const Page = () => {
  const { isTrue: showOffcanvas, toggle: toggleOffcanvas } = useToggle()
  const { isTrue: showEditOffcanvas, toggle: toggleEditOffcanvas } = useToggle()
  const { puedeVer, puedeCrear, puedeEditar, puedeEliminar, cargando: cargandoPermisos } = usePermisos('torneos')
  
  const [data, setData] = useState<TorneoWithRelations[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [mapaHorarios, setMapaHorarios] = useState<MapaHorarioTorneo[]>([])
  const [mapaHorariosCanchas, setMapaHorariosCanchas] = useState<MapaHorariosCanchas[]>([])
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
        const estadoConfig: Record<string, { bg: string; text: string; label: string; icon: string }> = {
          planificado: { bg: 'warning', text: 'dark', label: 'Planificado', icon: '⏳' },
          en_curso: { bg: 'success', text: 'white', label: 'En Curso', icon: '▶️' },
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
      const [torneosData, categoriasData, mapaData, mapaHCanchas] = await Promise.all([
        getTorneos(),
        getCategorias(),
        getMapaGeneralHorarios(),
        getMapaHorariosCanchasGeneral()
      ])
      setData(torneosData as any)
      setCategorias(categoriasData)
      setMapaHorarios(mapaData)
      setMapaHorariosCanchas(mapaHCanchas)
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

  const totalHorariosMapa = mapaHorarios.reduce((acc, torneo) => acc + torneo.totales.totalHorarios, 0)
  const totalCubiertosMapa = mapaHorarios.reduce((acc, torneo) => acc + torneo.totales.horariosCubiertos, 0)
  const totalLibresMapa = Math.max(totalHorariosMapa - totalCubiertosMapa, 0)
  const coberturaGlobal = totalHorariosMapa === 0 ? 0 : Math.round((totalCubiertosMapa / totalHorariosMapa) * 100)

  const getEstadoBadgeConfig = (estado?: string | null) => {
    const estadoConfig: Record<string, { bg: string; text: string; label: string }> = {
      planificado: { bg: 'warning', text: 'dark', label: 'Planificado' },
      en_curso: { bg: 'success', text: 'white', label: 'En Curso' },
      finalizado: { bg: 'primary', text: 'white', label: 'Finalizado' },
      cancelado: { bg: 'danger', text: 'white', label: 'Cancelado' }
    }
    return estado ? estadoConfig[estado] || { bg: 'secondary', text: 'white', label: estado } : { bg: 'secondary', text: 'white', label: 'Sin estado' }
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

      {mapaHorarios.length > 0 && (
        <Row className="justify-content-center mb-4">
          <Col xxl={10}>
            <Card className="shadow-sm border-0">
              <CardHeader className="bg-white border-light">
                <div className="d-flex flex-column flex-md-row justify-content-between gap-2">
                  <div>
                    <h5 className="mb-1 d-flex align-items-center gap-2">
                      <LuClock />
                      Mapa general de horarios activos
                    </h5>
                    <small className="text-muted">
                      {mapaHorarios.length} torneo(s) planificados o en curso · {totalHorariosMapa} horarios totales
                    </small>
                  </div>
                  <div className="text-md-end">
                    <div className="fw-semibold text-success">
                      {totalCubiertosMapa} horarios cubiertos
                    </div>
                    <div className="text-danger fw-semibold">
                      {totalLibresMapa} sin encuentros
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardBody>
                <div className="mb-4">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="fw-semibold">Cobertura global</span>
                    <span className="fw-semibold">{coberturaGlobal}%</span>
                  </div>
                  <ProgressBar
                    now={coberturaGlobal}
                    variant={coberturaGlobal >= 80 ? 'success' : coberturaGlobal >= 50 ? 'warning' : 'danger'}
                    style={{ height: '10px' }}
                  />
                </div>

                <div className="d-flex flex-column gap-3">
                  {mapaHorarios.map(torneo => {
                    const estadoBadge = getEstadoBadgeConfig(torneo.estado)
                    return (
                      <div key={torneo.torneoId} className="border rounded-3 p-3 bg-light-subtle">
                        <div className="d-flex flex-column flex-md-row justify-content-between align-items-start gap-3">
                          <div>
                            <h5 className="mb-1">{torneo.torneo}</h5>
                            <div className="d-flex flex-wrap gap-2 align-items-center">
                              <Badge bg={estadoBadge.bg} className={`text-${estadoBadge.text}`}>
                                {estadoBadge.label}
                              </Badge>
                              <small className="text-muted">{torneo.categoria || 'Sin categoría'}</small>
                            </div>
                          </div>
                          <div className="text-md-end">
                            <div className="fw-semibold">{torneo.totales.totalHorarios} horarios configurados</div>
                            <small className="text-muted">
                              {torneo.totales.horariosCubiertos} cubiertos · {torneo.totales.horariosLibres} libres
                            </small>
                            <ProgressBar
                              now={torneo.totales.coberturaPorcentaje}
                              variant={torneo.totales.coberturaPorcentaje >= 80 ? 'success' : torneo.totales.coberturaPorcentaje >= 50 ? 'warning' : 'danger'}
                              className="mt-2"
                              style={{ height: '8px', minWidth: '220px' }}
                            />
                          </div>
                        </div>

                        <div className="d-flex flex-wrap gap-2 mt-3">
                          {torneo.dias.map(dia => (
                            <div
                              key={`${torneo.torneoId}-${dia.dia}`}
                              className="flex-grow-1 p-2 bg-white rounded border text-center"
                              style={{ minWidth: '150px' }}
                            >
                              <div className="fw-semibold">{dia.label}</div>
                              {dia.totalHorarios > 0 ? (
                                <small className="text-muted">
                                  {dia.cubiertos}/{dia.totalHorarios} cubiertos
                                </small>
                              ) : (
                                <small className="text-muted">Sin horarios</small>
                              )}
                            </div>
                          ))}
                        </div>

                        {torneo.totales.horariosLibres > 0 && (
                          <div className="mt-3">
                            <small className="text-muted d-block mb-1">Horarios sin encuentros:</small>
                            <div className="d-flex flex-wrap gap-2">
                              {torneo.horarios
                                .filter(h => !h.cubierto)
                                .map(horario => (
                                  <Badge
                                    key={horario.id}
                                    bg="light"
                                    text="danger"
                                    className="border border-danger-subtle rounded-pill px-3 py-2"
                                  >
                                    {horario.labelDia} · {horario.hora}
                                  </Badge>
                                ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </CardBody>
            </Card>
          </Col>
        </Row>
      )}

      {mapaHorariosCanchas.length > 0 && (
        <Row className="justify-content-center mb-4">
          <Col xxl={10}>
            <Card className="shadow-sm border-0">
              <CardHeader className="bg-white border-light">
                <h5 className="mb-0 d-flex align-items-center gap-2">
                  <LuClock />
                  Cobertura por horario y cancha
                </h5>
              </CardHeader>
              <CardBody>
                <div className="d-flex flex-column gap-4">
                  {mapaHorariosCanchas.map(t => (
                    <div key={t.torneoId} className="border rounded-3 overflow-auto">
                      <div className="p-3 d-flex flex-wrap justify-content-between align-items-center gap-3">
                        <div className="d-flex flex-column">
                          <div className="fw-semibold">{t.torneo}</div>
                          <small className="text-muted">{t.categoria || 'Sin categoría'}</small>
                        </div>
                        <div className="d-flex align-items-center gap-2">
                          <span className="badge bg-primary text-white d-flex align-items-center gap-1 px-3 py-2">
                            <LuCheck /> <span className="fw-semibold">Cubierto</span>
                          </span>
                          <span className="badge bg-white border border-secondary-subtle text-secondary d-flex align-items-center gap-1 px-3 py-2">
                            <LuX /> <span className="fw-semibold">Libre</span>
                          </span>
                        </div>
                      </div>
                      <div className="p-3 pt-0">
                        <div className="table-responsive">
                          <table className="table table-sm align-middle mb-0" style={{ tableLayout: 'fixed', minWidth: '640px' }}>
                            <thead>
                              <tr style={{ position: 'sticky', top: 0, zIndex: 1 }} className="bg-white">
                                <th style={{ minWidth: '180px', position: 'sticky', left: 0, zIndex: 2 }} className="bg-white">
                                  Horario
                                </th>
                                {t.canchas.map(c => (
                                  <th key={c.id} className="text-center" style={{ minWidth: '140px' }}>{c.nombre}</th>
                                ))}
                                <th className="text-center" style={{ minWidth: '110px' }}>Cubiertas</th>
                                <th className="text-center" style={{ minWidth: '90px' }}>Libres</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(() => {
                                // Agrupar filas por día para mostrar separadores
                                const grupos = t.filas.reduce<Record<string, typeof t.filas>>((acc, f) => {
                                  acc[f.labelDia] = acc[f.labelDia] || []
                                  acc[f.labelDia].push(f)
                                  return acc
                                }, {})
                                const ordenDias = ['Viernes', 'Sábado', 'Domingo']
                                const secciones = Object.entries(grupos).sort(
                                  (a, b) => ordenDias.indexOf(a[0]) - ordenDias.indexOf(b[0])
                                )
                                return secciones.flatMap(([labelDia, filas], idxSec) => [
                                  <tr key={`sep-${labelDia}`} className="table-light">
                                    <td colSpan={t.canchas.length + 3} className="fw-semibold">
                                      {labelDia}
                                    </td>
                                  </tr>,
                                  ...filas.map((f, idx) => (
                                    <tr key={f.horarioId} className={idx % 2 === 1 ? 'table-striped' : ''}>
                                      <td className="fw-semibold" style={{ position: 'sticky', left: 0, background: '#fff', zIndex: 1 }}>
                                        {f.hora}
                                      </td>
                                      {t.canchas.map(c => {
                                        const celda = f.celdas.find(x => x.canchaId === c.id)
                                        const cubierto = celda?.cubierto
                                        const total = celda?.totalEncuentros ?? 0
                                        return (
                                          <td key={`${f.horarioId}-${c.id}`} className="text-center">
                                            {cubierto ? (
                                              <span className="badge text-bg-success-subtle border border-success-subtle d-inline-flex align-items-center gap-2 px-3 py-2">
                                                <span className="rounded-circle bg-success" style={{ width: 8, height: 8 }} />
                                                <span className="fw-semibold text-dark">{total}</span>
                                              </span>
                                            ) : (
                                              <span className="badge text-bg-light border border-secondary-subtle d-inline-flex align-items-center gap-2 px-3 py-2">
                                                <span className="rounded-circle bg-secondary" style={{ width: 8, height: 8 }} />
                                                <span className="fw-semibold text-secondary">0</span>
                                              </span>
                                            )}
                                          </td>
                                        )
                                      })}
                                  <td className="text-center" style={{ minWidth: '86px' }}>
                                    <span className="badge text-bg-success-subtle border border-success-subtle px-3 py-2">
                                      <span className="fw-bold text-success">{f.resumen.cubiertas}</span>
                                    </span>
                                  </td>
                                  <td className="text-center" style={{ minWidth: '86px' }}>
                                    <span className="badge text-bg-danger-subtle border border-danger-subtle px-3 py-2">
                                      <span className="fw-bold text-danger">{f.resumen.libres}</span>
                                    </span>
                                  </td>
                                    </tr>
                                  ))
                                ])
                              })()}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          </Col>
        </Row>
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
