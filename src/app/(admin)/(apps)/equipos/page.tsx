'use client'
import { useEffect, useState, useRef } from 'react'
import '@/styles/react-select.css'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import DataTable from '@/components/table/DataTable'
import ConfirmationModal from '@/components/table/DeleteConfirmationModal'
import TablePagination from '@/components/table/TablePagination'
import Loader from '@/components/Loader'
import { Toast } from 'primereact/toast'
import 'primereact/resources/themes/lara-light-cyan/theme.css'
import 'primereact/resources/primereact.min.css'
import 'primeicons/primeicons.css'
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
import { Button, Card, CardFooter, CardHeader, Col, Container, FloatingLabel, Form, FormControl, FormSelect, FormCheck, Offcanvas, OffcanvasBody, OffcanvasHeader, OffcanvasTitle, Row, Alert, Modal, ModalHeader, ModalBody, ModalFooter, ModalTitle } from 'react-bootstrap'
import Select from 'react-select'
import { LuSearch, LuTrophy, LuUsers } from 'react-icons/lu'
import { TbEdit, TbEye, TbPlus, TbTrash } from 'react-icons/tb'
import { getEquipos, getCategorias, getEntrenadores, createEquipo, updateEquipo, deleteEquipo, deleteMultipleEquipos, getEquipoByIdWithRelations, getJugadoresAfectadosPorCambioCategoria, migrarJugadoresACategoria } from './actions'
import type { EquipoWithRelations, Categoria, Entrenador } from '@/db/types'

const columnHelper = createColumnHelper<EquipoWithRelations>()

// Función de filtro personalizada para categorías
const categoriaFilterFn = (row: any, columnId: string, filterValue: string) => {
  const equipo = row.original as EquipoWithRelations
  const categoriasNombres = equipo.equiposCategoria?.map(ec => ec.categoria.nombre) || []
  const coincide = categoriasNombres.includes(filterValue)
  console.log('Filtro categoría:', {
    filterValue,
    categoriasNombres,
    coincide
  })
  return coincide
}

const Page = () => {
  const { isTrue: showOffcanvas, toggle: toggleOffcanvas } = useToggle()
  const { isTrue: showEditOffcanvas, toggle: toggleEditOffcanvas } = useToggle()
  
  // 🔐 Sistema de permisos dinámicos
  const { puedeVer, puedeCrear, puedeEditar, puedeEliminar, cargando: cargandoPermisos } = usePermisos('equipos')
  
  const [data, setData] = useState<EquipoWithRelations[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [entrenadores, setEntrenadores] = useState<Entrenador[]>([])
  const [loading, setLoading] = useState(true)
  const [editingEquipo, setEditingEquipo] = useState<EquipoWithRelations | null>(null)
  const [selectedCategorias, setSelectedCategorias] = useState<{ value: number; label: string }[]>([])
  const [editSelectedCategorias, setEditSelectedCategorias] = useState<{ value: number; label: string }[]>([])
  const toast = useRef<any>(null)
  
  // Estados para el modal de migración de jugadores
  const [showMigracionModal, setShowMigracionModal] = useState(false)
  const [jugadoresAfectados, setJugadoresAfectados] = useState<Array<{
    relacionId: number
    jugadorId: string
    jugadorCedula: string
    jugadorNombre: string
    equipoCategoriaId: number
    categoriaId: number
    numeroJugador: number | null
  }>>([])
  const [categoriaMigracionGlobal, setCategoriaMigracionGlobal] = useState<number | null>(null) // Categoría para migrar todos
  const [formDataPendiente, setFormDataPendiente] = useState<FormData | null>(null)
  
  // Opciones para React Select
  const categoriaOptions = categorias.map(categoria => ({
    value: categoria.id,
    label: categoria.nombre
  }))
  
  const columns = [
    columnHelper.accessor('nombre', {
      header: 'Nombre del Equipo',
      cell: ({ row }) => (
        <div className="d-flex justify-content-start align-items-center gap-2">
          <div className="avatar avatar-sm">
            <Image 
              src={row.original.imagen_equipo || 'https://via.placeholder.com/32x32/6c757d/ffffff?text=⚽'} 
              height={32} 
              width={32} 
              alt="" 
              className="img-fluid rounded-circle" 
            />
          </div>
          <div>
            <h5 className="text-nowrap mb-0 lh-base fs-base">
              <Link href={`/equipos/${row.original.id}`} className="link-reset">
                {row.original.nombre}
              </Link>
            </h5>
            <p className="text-muted fs-xs mb-0">{row.original.entrenador?.nombre || 'Sin entrenador'}</p>
          </div>
        </div>
      ),
    }),
    columnHelper.accessor('entrenador', { 
      header: 'Entrenador',
      cell: ({ row }) => row.original.entrenador?.nombre || 'Sin entrenador'
    }),
    {
      id: 'categorias',
      header: 'Categorías',
      filterFn: categoriaFilterFn,
      enableColumnFilter: true,
      cell: ({ row }: { row: TableRow<EquipoWithRelations> }) => {
        const categorias = row.original.equiposCategoria?.map(ec => ec.categoria) || []
        return (
          <div className="d-flex flex-wrap gap-1">
            {categorias.length > 0 ? (
              categorias.map((categoria, index) => (
                <span key={index} className="badge p-1 text-bg-light fs-sm">
                  <LuTrophy className="me-1" /> {categoria.nombre}
                </span>
              ))
            ) : (
              <span className="badge p-1 text-bg-secondary fs-sm">Sin categorías</span>
            )}
          </div>
        )
      },
    },
    columnHelper.accessor('createdAt', { 
      header: 'Fecha Creación',
      cell: ({ row }) => row.original.createdAt ? new Date(row.original.createdAt).toLocaleDateString('es-ES') : 'N/A'
    }),
    columnHelper.accessor('estado', {
      header: 'Estado',
      filterFn: 'equalsString',
      enableColumnFilter: true,
      cell: ({ row }) => (
        <span
          className={`badge ${row.original.estado ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'} badge-label`}>
          {row.original.estado ? 'Activo' : 'Inactivo'}
        </span>
      ),
    }),
    {
      header: 'Acciones',
      cell: ({ row }: { row: TableRow<EquipoWithRelations> }) => (
        <div className="d-flex gap-1">
          {/* 🔐 Botón Editar - Solo visible si tiene permiso */}
          {puedeEditar && (
            <Button 
              variant="light" 
              size="sm" 
              className="btn-icon rounded-circle"
              onClick={() => handleEditClick(row.original)}
              title="Editar equipo">
              <TbEdit className="fs-lg" />
            </Button>
          )}
          
          {/* 🔐 Botón Eliminar - Solo visible si tiene permiso */}
          {puedeEliminar && (
            <Button
              variant="light"
              size="sm"
              className="btn-icon rounded-circle"
              onClick={() => handleDeleteSingle(row.original)}
              title="Eliminar equipo">
              <TbTrash className="fs-lg" />
            </Button>
          )}
          
          {/* Mensaje si no tiene permisos */}
          {!puedeEditar && !puedeEliminar && (
            <small className="text-muted">Sin acciones</small>
          )}
        </div>
      ),
    },
  ]

  const [globalFilter, setGlobalFilter] = useState('')
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([
    { id: 'estado', value: 'true' } // Mostrar solo activos por defecto
  ])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 8 })
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false)
  const [equipoToDelete, setEquipoToDelete] = useState<EquipoWithRelations | null>(null)

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
    enableRowSelection: false, // Deshabilitado
  })

  const pageIndex = table.getState().pagination.pageIndex
  const pageSize = table.getState().pagination.pageSize
  const totalItems = table.getFilteredRowModel().rows.length

  const start = pageIndex * pageSize + 1
  const end = Math.min(start + pageSize - 1, totalItems)

  const toggleDeleteModal = () => {
    if (loading) return // Evitar cerrar modal durante eliminación
    
    setShowDeleteModal(!showDeleteModal)
    if (!showDeleteModal) {
      setEquipoToDelete(null)
    }
  }

  const handleDeleteSingle = (equipo: EquipoWithRelations) => {
    if (loading) return // Evitar múltiples eliminaciones simultáneas
    
    setEquipoToDelete(equipo)
    setShowDeleteModal(true)
  }

  const handleDelete = async () => {
    if (loading) return // Evitar múltiples ejecuciones simultáneas
    
    // 🔐 Verificar permiso antes de eliminar
    if (!puedeEliminar) {
      toast.current?.show({ severity: 'error', summary: 'Error', detail: 'No tienes permiso para eliminar equipos', life: 5000 })
      setShowDeleteModal(false)
      return
    }
    
    try {
      setLoading(true)
      
      if (equipoToDelete) {
        // Eliminar equipo individual
        const equipoNombre = equipoToDelete.nombre
        await deleteEquipo(equipoToDelete.id)
        setEquipoToDelete(null)
        toast.current?.show({ severity: 'success', summary: 'Éxito', detail: `El equipo "${equipoNombre}" ha sido eliminado exitosamente`, life: 5000 })
      }
      
      setPagination({ ...pagination, pageIndex: 0 })
      setShowDeleteModal(false)
      await loadData()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al eliminar equipos'
      toast.current?.show({ severity: 'error', summary: 'Error', detail: errorMessage, life: 5000 })
      // Cerrar el modal cuando hay un error (por ejemplo, dependencias)
      setShowDeleteModal(false)
      setEquipoToDelete(null)
    } finally {
      setLoading(false)
    }
  }

  const handleEditClick = (equipo: EquipoWithRelations) => {
    // 🔐 Verificar permiso antes de abrir modal
    if (!puedeEditar) {
      toast.current?.show({ severity: 'error', summary: 'Error', detail: 'No tienes permiso para editar equipos', life: 5000 })
      return
    }
    
    setEditingEquipo(equipo)
    
    // Establecer las categorías seleccionadas para React Select
    const categoriasSeleccionadas = equipo.equiposCategoria?.map(ec => ({
      value: ec.categoria.id,
      label: ec.categoria.nombre
    })) || []
    setEditSelectedCategorias(categoriasSeleccionadas)
    
    toggleEditOffcanvas()
  }

  const handleUpdateEquipo = async (formData: FormData) => {
    if (!editingEquipo) return
    
    // 🔐 Verificar permiso antes de actualizar
    if (!puedeEditar) {
      toast.current?.show({ severity: 'error', summary: 'Error', detail: 'No tienes permiso para editar equipos', life: 5000 })
      return
    }
    
    try {
      // Limpiar categorías existentes del FormData para evitar duplicados
      formData.delete('categoria_ids')
      
      // Agregar las categorías seleccionadas al FormData
      editSelectedCategorias.forEach(categoria => {
        formData.append('categoria_ids', categoria.value.toString())
      })
      
      // Debug: verificar qué datos se están enviando
      const categoria_ids = formData.getAll('categoria_ids')
      console.log('Datos enviados desde el frontend (update):', {
        id: editingEquipo.id,
        nombre: formData.get('nombre'),
        categoria_ids,
        entrenador_id: formData.get('entrenador_id'),
        estado: formData.get('estado')
      })
      
      // Enviar actualización al servidor (retorna resultado en vez de lanzar para JUGADORES_AFECTADOS)
      const result = await updateEquipo(editingEquipo.id, formData)
      
      // El servidor retorna { success: false, code: 'JUGADORES_AFECTADOS', data } cuando hay jugadores
      if (result && result.success === false && result.code === 'JUGADORES_AFECTADOS') {
        const jugadoresData = result.data.jugadoresAfectados || result.data
        setJugadoresAfectados(jugadoresData)
        setCategoriaMigracionGlobal(null)
        setFormDataPendiente(formData)
        setShowMigracionModal(true)
        return
      }
      
      toast.current?.show({ severity: 'success', summary: 'Éxito', detail: 'Equipo actualizado exitosamente', life: 5000 })
      setEditSelectedCategorias([]) // Limpiar selección
      toggleEditOffcanvas()
      setEditingEquipo(null)
      
      // Actualizar el equipo en el estado local para mantener la paginación
      const updatedEquipo = await getEquipoByIdWithRelations(editingEquipo.id)
      if (updatedEquipo) {
        setData(prev => prev.map(equipo => 
          equipo.id === editingEquipo.id ? (updatedEquipo as EquipoWithRelations) : equipo
        ))
      } else {
        await loadData()
      }
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error al actualizar equipo'
      toast.current?.show({ severity: 'error', summary: 'Error', detail: errorMessage, life: 5000 })
    }
  }

  const loadData = async () => {
    try {
      setLoading(true)
      const [equiposData, categoriasData, entrenadoresData] = await Promise.all([
        getEquipos(),
        getCategorias(),
        getEntrenadores()
      ])
      setData(equiposData)
      setCategorias(categoriasData)
      setEntrenadores(entrenadoresData)
    } catch (error) {
      toast.current?.show({ severity: 'error', summary: 'Error', detail: error instanceof Error ? error.message : 'Error al cargar datos', life: 5000 })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateEquipo = async (formData: FormData) => {
    // 🔐 Verificar permiso antes de crear
    if (!puedeCrear) {
      toast.current?.show({ severity: 'error', summary: 'Error', detail: 'No tienes permiso para crear equipos', life: 5000 })
      return
    }
    
    try {
      // Agregar las categorías seleccionadas al FormData
      selectedCategorias.forEach(categoria => {
        formData.append('categoria_ids', categoria.value.toString())
      })
      
      // Debug: verificar qué datos se están enviando
      const categoria_ids = formData.getAll('categoria_ids')
      console.log('Datos enviados desde el frontend:', {
        nombre: formData.get('nombre'),
        categoria_ids,
        entrenador_id: formData.get('entrenador_id'),
        estado: formData.get('estado')
      })
      
      await createEquipo(formData)
      toast.current?.show({ severity: 'success', summary: 'Éxito', detail: 'Equipo creado exitosamente', life: 5000 })
      setSelectedCategorias([]) // Limpiar selección
      toggleOffcanvas()
      await loadData()
    } catch (error) {
      toast.current?.show({ severity: 'error', summary: 'Error', detail: error instanceof Error ? error.message : 'Error al crear equipo', life: 5000 })
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // 🔐 Verificar permisos mientras se cargan
  if (cargandoPermisos) {
    return (
      <Container fluid>
        <PageBreadcrumb title="Equipos" subtitle="Apps" />
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Verificando permisos...</span>
          </div>
          <p className="text-muted mt-2">Verificando permisos de acceso...</p>
        </div>
      </Container>
    )
  }

  // 🔐 Bloquear acceso si no tiene permiso de ver
  if (!puedeVer) {
    return (
      <Container fluid>
        <PageBreadcrumb title="Equipos" subtitle="Apps" />
        <Row className="justify-content-center">
          <Col xxl={8}>
            <Alert variant="danger" className="mt-4">
              <Alert.Heading>❌ Acceso Denegado</Alert.Heading>
              <p className="mb-0">
                No tienes permisos para acceder a esta página.
                <br />
                <small className="text-muted">Contacta al administrador para solicitar acceso al módulo de Equipos.</small>
              </p>
            </Alert>
          </Col>
        </Row>
      </Container>
    )
  }

  return (
    <Container fluid className="position-relative">
      <PageBreadcrumb title="Equipos" subtitle="Apps" />

      {/* Loading overlay con pelota de fútbol */}
      {loading && (
        <div 
          className="position-fixed top-0 start-0 w-100 h-100"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 9999,
            backdropFilter: 'blur(2px)'
          }}
        >
          <Loader height="100vh" width="100%" overlay={false} />
        </div>
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
                    placeholder="Buscar equipos..."
                    value={globalFilter ?? ''}
                    onChange={(e) => setGlobalFilter(e.target.value)}
                  />
                  <LuSearch className="app-search-icon text-muted" />
                </div>

                {/* 🔐 Botón Crear - Solo visible si tiene permiso */}
                {puedeCrear ? (
                  <Button 
                    type="button" 
                    className="btn-purple rounded-circle btn-icon" 
                    onClick={toggleOffcanvas}
                    title="Agregar nuevo equipo">
                    <TbPlus className="fs-lg" />
                  </Button>
                ) : (
                  <Button 
                    type="button" 
                    className="btn-secondary rounded-circle btn-icon" 
                    disabled
                    title="No tienes permiso para crear equipos">
                    <TbPlus className="fs-lg" />
                  </Button>
                )}
              </div>

              <div className="d-flex align-items-center gap-2">
                <span className="me-2 fw-semibold">Filtrar por:</span>

                <div className="app-search">
                  <select
                    className="form-select form-control my-1 my-md-0"
                    value={(table.getColumn('categorias')?.getFilterValue() as string) ?? 'Todas'}
                    onChange={(e) => table.getColumn('categorias')?.setFilterValue(e.target.value === 'Todas' ? undefined : e.target.value)}>
                    <option value="Todas">Categoría</option>
                    {categorias.map((categoria) => (
                      <option key={categoria.id} value={categoria.nombre}>
                        {categoria.nombre}
                      </option>
                    ))}
                  </select>
                  <LuTrophy className="app-search-icon text-muted" />
                </div>

                <div className="app-search">
                  <select
                    className="form-select form-control my-1 my-md-0"
                    value={(table.getColumn('estado')?.getFilterValue() as string) ?? 'Todos'}
                    onChange={(e) => table.getColumn('estado')?.setFilterValue(e.target.value === 'Todos' ? undefined : e.target.value)}>
                    <option value="Todos">Estado</option>
                    <option value="true">Activo</option>
                    <option value="false">Inactivo</option>
                  </select>
                  <LuUsers className="app-search-icon text-muted" />
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

            <DataTable<EquipoWithRelations> table={table} emptyMessage="No se encontraron registros" />

            {table.getRowModel().rows.length > 0 && (
              <CardFooter className="border-0">
                <TablePagination
                  totalItems={totalItems}
                  start={start}
                  end={end}
                  itemsName="equipos"
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
              itemName="equipo"
              variant="danger"
              isLoading={loading}
              showBadgeDesign={false}
              itemToDelete={equipoToDelete?.nombre}
              confirmButtonVariant='danger'
            />
          </Card>
        </Col>
      </Row>

      {/* Offcanvas Right con Formulario de Floating Labels para Crear */}
      <Offcanvas show={showOffcanvas} onHide={toggleOffcanvas} placement="end" className="offcanvas-end">
        <OffcanvasHeader closeButton>
          <OffcanvasTitle as="h5" className="mt-0">
            Agregar Nuevo Equipo
          </OffcanvasTitle>
        </OffcanvasHeader>
        <OffcanvasBody>
          <Form action={handleCreateEquipo}>
            <Row className="g-3">
              <Col lg={12}>
                <FloatingLabel label="Nombre del Equipo">
                  <FormControl type="text" name="nombre" placeholder="Ingrese el nombre del equipo" required />
                </FloatingLabel>
              </Col>

              <Col lg={12}>
                <label className="form-label fw-semibold">Categorías del Equipo</label>
                <Select
                  isMulti
                  name="categoria_ids"
                  options={categoriaOptions}
                  value={selectedCategorias}
                  onChange={(selectedOptions) => setSelectedCategorias(selectedOptions as { value: number; label: string }[])}
                  placeholder="Selecciona las categorías..."
                  className="react-select-container"
                  classNamePrefix="react-select"
                  styles={{
                    control: (base) => ({
                      ...base,
                      minHeight: '48px',
                      border: '1px solid #ced4da',
                      borderRadius: '0.375rem',
                      '&:hover': {
                        borderColor: '#86b7fe'
                      }
                    }),
                    multiValue: (base) => ({
                      ...base,
                      backgroundColor: '#e7f3ff',
                      borderRadius: '0.25rem'
                    }),
                    multiValueLabel: (base) => ({
                      ...base,
                      color: '#0066cc',
                      fontWeight: '500'
                    }),
                    multiValueRemove: (base) => ({
                      ...base,
                      color: '#0066cc',
                      '&:hover': {
                        backgroundColor: '#b3d9ff',
                        color: '#004499'
                      }
                    })
                  }}
                />
                <small className="text-muted">Selecciona múltiples categorías para este equipo</small>
              </Col>

              <Col lg={6}>
                <FloatingLabel label="Entrenador">
                  <FormSelect name="entrenador_id" required>
                    <option value="">Seleccionar...</option>
                    {entrenadores.map((entrenador) => (
                      <option key={entrenador.id} value={entrenador.id}>
                        {entrenador.nombre}
                      </option>
                    ))}
                  </FormSelect>
                </FloatingLabel>
              </Col>

              <Col lg={6}>
                <FloatingLabel label="Estado">
                  <FormSelect name="estado">
                    <option value="true">Activo</option>
                    <option value="false">Inactivo</option>
                  </FormSelect>
                </FloatingLabel>
              </Col>

              <Col lg={6}>
                <FloatingLabel label="Imagen del Equipo">
                  <FormControl type="url" name="imagen_equipo" placeholder="URL de la imagen" />
                </FloatingLabel>
              </Col>

              <Col lg={12}>
                <div className="d-flex gap-2 justify-content-end">
                  <Button variant="light" onClick={toggleOffcanvas}>
                    Cancelar
                  </Button>
                  <Button variant="success" type="submit">
                    Crear Equipo
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
            Editar Equipo
          </OffcanvasTitle>
        </OffcanvasHeader>
        <OffcanvasBody>
          {editingEquipo && (
            <Form action={handleUpdateEquipo}>
              <Row className="g-3">
                <Col lg={12}>
                  <FloatingLabel label="Nombre del Equipo">
                    <FormControl 
                      type="text" 
                      name="nombre" 
                      placeholder="Ingrese el nombre del equipo" 
                      defaultValue={editingEquipo.nombre}
                      required 
                    />
                  </FloatingLabel>
                </Col>

                <Col lg={12}>
                  <label className="form-label fw-semibold">Categorías del Equipo</label>
                  <Select
                    isMulti
                    name="categoria_ids"
                    options={categoriaOptions}
                    value={editSelectedCategorias}
                    onChange={(selectedOptions) => setEditSelectedCategorias(selectedOptions as { value: number; label: string }[])}
                    placeholder="Selecciona las categorías..."
                    className="react-select-container"
                    classNamePrefix="react-select"
                    styles={{
                      control: (base) => ({
                        ...base,
                        minHeight: '48px',
                        border: '1px solid #ced4da',
                        borderRadius: '0.375rem',
                        '&:hover': {
                          borderColor: '#86b7fe'
                        }
                      }),
                      multiValue: (base) => ({
                        ...base,
                        backgroundColor: '#e7f3ff',
                        borderRadius: '0.25rem'
                      }),
                      multiValueLabel: (base) => ({
                        ...base,
                        color: '#0066cc',
                        fontWeight: '500'
                      }),
                      multiValueRemove: (base) => ({
                        ...base,
                        color: '#0066cc',
                        '&:hover': {
                          backgroundColor: '#b3d9ff',
                          color: '#004499'
                        }
                      })
                    }}
                  />
                  <small className="text-muted">Selecciona múltiples categorías para este equipo</small>
                </Col>

                <Col lg={6}>
                  <FloatingLabel label="Entrenador">
                    <FormSelect name="entrenador_id" defaultValue={editingEquipo.entrenador_id?.toString()} required>
                      <option value="">Seleccionar...</option>
                      {entrenadores.map((entrenador) => (
                        <option key={entrenador.id} value={entrenador.id}>
                          {entrenador.nombre}
                        </option>
                      ))}
                    </FormSelect>
                  </FloatingLabel>
                </Col>

                <Col lg={6}>
                  <FloatingLabel label="Estado">
                                         <FormSelect name="estado" defaultValue={(editingEquipo.estado ?? true).toString()}>
                      <option value="true">Activo</option>
                      <option value="false">Inactivo</option>
                    </FormSelect>
                  </FloatingLabel>
                </Col>

                <Col lg={6}>
                  <FloatingLabel label="Imagen del Equipo">
                    <FormControl 
                      type="url" 
                      name="imagen_equipo" 
                      placeholder="URL de la imagen" 
                      defaultValue={editingEquipo.imagen_equipo || ''}
                    />
                  </FloatingLabel>
                </Col>

                <Col lg={12}>
                  <div className="d-flex gap-2 justify-content-end">
                    <Button variant="light" onClick={toggleEditOffcanvas}>
                      Cancelar
                    </Button>
                    <Button variant="primary" type="submit">
                      Actualizar Equipo
                    </Button>
                  </div>
                </Col>
              </Row>
            </Form>
          )}
        </OffcanvasBody>
      </Offcanvas>

      {/* Modal de Migración de Jugadores */}
      <Modal show={showMigracionModal} onHide={() => setShowMigracionModal(false)} size="lg" centered>
        <ModalHeader closeButton>
          <ModalTitle>Migración de Jugadores</ModalTitle>
        </ModalHeader>
        <ModalBody>
          <Alert variant="warning" className="mb-3">
            <strong>Atención:</strong> Al cambiar las categorías del equipo, {jugadoresAfectados.length} jugador(es) se verán afectados. 
            Por favor, selecciona a qué categoría deseas migrar todos los jugadores.
          </Alert>
          
          <Row className="mb-3">
            <Col>
              <FloatingLabel label="Migrar todos los jugadores a la categoría">
                <FormSelect
                  value={categoriaMigracionGlobal || ''}
                  onChange={(e) => {
                    const categoriaId = e.target.value ? parseInt(e.target.value) : null
                    setCategoriaMigracionGlobal(categoriaId)
                  }}
                  required
                >
                  <option value="">Seleccionar categoría...</option>
                  {categoriaOptions.filter(cat => {
                    // Mostrar solo categorías activas
                    const categoria = categorias.find(c => c.id === cat.value)
                    return categoria && categoria.estado === true
                  }).map(cat => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </FormSelect>
              </FloatingLabel>
            </Col>
          </Row>
          
          <div className="table-responsive" style={{ maxHeight: '300px', overflowY: 'auto' }}>
            <table className="table table-hover">
              <thead className="table-light sticky-top">
                <tr>
                  <th>Jugador</th>
                  <th>Cédula</th>
                  <th>Número</th>
                  <th>Categoría Actual</th>
                </tr>
              </thead>
              <tbody>
                {jugadoresAfectados.map((jugador) => {
                  const categoriaActual = categorias.find(c => c.id === jugador.categoriaId)
                  return (
                    <tr key={jugador.relacionId}>
                      <td>{jugador.jugadorNombre}</td>
                      <td>{jugador.jugadorCedula}</td>
                      <td>{jugador.numeroJugador || 'N/A'}</td>
                      <td>{categoriaActual?.nombre || 'N/A'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => {
            setShowMigracionModal(false)
            setJugadoresAfectados([])
            setCategoriaMigracionGlobal(null)
            setFormDataPendiente(null)
          }}>
            Cancelar
          </Button>
          <Button 
            variant="primary" 
            onClick={async () => {
              // Verificar que se haya seleccionado una categoría
              if (!categoriaMigracionGlobal) {
                toast.current?.show({ 
                  severity: 'warn', 
                  summary: 'Advertencia', 
                  detail: 'Debes seleccionar una categoría para migrar los jugadores', 
                  life: 5000 
                })
                return
              }
              
              try {
                setLoading(true)
                
                // Crear migraciones para todos los jugadores con la misma categoría
                const migraciones = jugadoresAfectados.map(jugador => ({
                  relacionId: jugador.relacionId,
                  nuevaCategoriaId: categoriaMigracionGlobal
                }))
                
                // Migrar jugadores
                if (editingEquipo) {
                  await migrarJugadoresACategoria(editingEquipo.id, migraciones)
                  
                  // Actualizar editSelectedCategorias para incluir la nueva categoría
                  if (categoriaMigracionGlobal) {
                    const nuevaCategoria = categorias.find(c => c.id === categoriaMigracionGlobal);
                    if (nuevaCategoria) {
                      const categoriasActualizadas = [...editSelectedCategorias];
                      // Verificar si la categoría ya está en la lista
                      const categoriaExiste = categoriasActualizadas.some(c => c.value === categoriaMigracionGlobal);
                      if (!categoriaExiste) {
                        categoriasActualizadas.push({
                          value: nuevaCategoria.id,
                          label: nuevaCategoria.nombre
                        });
                        setEditSelectedCategorias(categoriasActualizadas);
                      }
                    }
                  }
                  
                  // Ahora actualizar el equipo
                  if (formDataPendiente) {
                    // Limpiar categorías duplicadas del FormData pendiente
                    formDataPendiente.delete('categoria_ids');
                    
                    // Agregar la nueva categoría a la que se migraron los jugadores
                    // y mantener las otras categorías que el usuario seleccionó
                    const categoriasFinales = [...new Set([
                      categoriaMigracionGlobal!,
                      ...editSelectedCategorias.map(c => c.value)
                    ])];
                    
                    categoriasFinales.forEach(catId => {
                      formDataPendiente.append('categoria_ids', catId.toString());
                    });
                    
                    await updateEquipo(editingEquipo.id, formDataPendiente)
                  }
                  
                  toast.current?.show({ 
                    severity: 'success', 
                    summary: 'Éxito', 
                    detail: `${jugadoresAfectados.length} jugador(es) migrado(s) y equipo actualizado exitosamente`, 
                    life: 5000 
                  })
                  
                  // Cerrar modales y limpiar estados
                  setShowMigracionModal(false)
                  setJugadoresAfectados([])
                  setCategoriaMigracionGlobal(null)
                  setFormDataPendiente(null)
                  setEditSelectedCategorias([])
                  toggleEditOffcanvas()
                  setEditingEquipo(null)
                  
                  // Recargar datos
                  await loadData()
                }
              } catch (error: unknown) {
                console.error('Error completo al migrar jugadores:', error)
                let errorMessage = 'Error al migrar jugadores'
                if (error instanceof Error) {
                  errorMessage = error.message
                } else if (error && typeof error === 'object' && 'message' in error && typeof (error as { message?: unknown }).message === 'string') {
                  errorMessage = (error as { message: string }).message
                }
                
                // Si el error es de jugadores afectados, no debería ocurrir aquí
                const jugadoresAfectadosPrefix = 'JUGADORES_AFECTADOS:'
                if (errorMessage.includes(jugadoresAfectadosPrefix)) {
                  try {
                    const jsonStart = errorMessage.indexOf(jugadoresAfectadosPrefix) + jugadoresAfectadosPrefix.length
                    const errorData = JSON.parse(errorMessage.substring(jsonStart))
                    console.error('Error detallado:', {
                      equipoId: errorData.equipoId,
                      equipoNombre: errorData.equipoNombre,
                      categoriasAEliminar: errorData.categoriasAEliminar,
                      totalJugadoresAfectados: errorData.totalJugadoresAfectados,
                      timestamp: errorData.timestamp,
                      contexto: errorData.contexto
                    })
                    
                    toast.current?.show({ 
                      severity: 'error', 
                      summary: 'Error', 
                      detail: `Error inesperado: Se detectaron ${errorData.totalJugadoresAfectados} jugador(es) afectado(s) después de la migración. Por favor, intenta nuevamente.`, 
                      life: 8000 
                    })
                  } catch (parseError) {
                    console.error('Error al parsear error de jugadores afectados:', parseError)
                    toast.current?.show({ 
                      severity: 'error', 
                      summary: 'Error', 
                      detail: errorMessage.substring(0, 200) + (errorMessage.length > 200 ? '...' : ''), 
                      life: 8000 
                    })
                  }
                } else {
                  toast.current?.show({ 
                    severity: 'error', 
                    summary: 'Error', 
                    detail: errorMessage.substring(0, 200) + (errorMessage.length > 200 ? '...' : ''), 
                    life: 8000 
                  })
                }
              } finally {
                setLoading(false)
              }
            }}
            disabled={loading || !categoriaMigracionGlobal}
          >
            {loading ? 'Migrando...' : `Migrar ${jugadoresAfectados.length} jugador(es)`}
          </Button>
        </ModalFooter>
      </Modal>

      <Toast ref={toast} position="top-right" />
    </Container>
  )
}

export default Page 