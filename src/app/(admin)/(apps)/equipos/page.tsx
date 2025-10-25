'use client'
import { useEffect, useState } from 'react'
import '@/styles/react-select.css'
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
import { Button, Card, CardFooter, CardHeader, Col, Container, FloatingLabel, Form, FormControl, FormSelect, FormCheck, Offcanvas, OffcanvasBody, OffcanvasHeader, OffcanvasTitle, Row, Alert } from 'react-bootstrap'
import Select from 'react-select'
import { LuSearch, LuTrophy, LuUsers } from 'react-icons/lu'
import { TbEdit, TbEye, TbPlus, TbTrash } from 'react-icons/tb'
import { getEquipos, getCategorias, getEntrenadores, createEquipo, updateEquipo, deleteEquipo, deleteMultipleEquipos, getEquipoByIdWithRelations } from './actions'
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
  const [error, setError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null)
  const [editingEquipo, setEditingEquipo] = useState<EquipoWithRelations | null>(null)
  const [editFormError, setEditFormError] = useState<string | null>(null)
  const [editFormSuccess, setEditFormSuccess] = useState<string | null>(null)
  const [selectedCategorias, setSelectedCategorias] = useState<{ value: number; label: string }[]>([])
  const [editSelectedCategorias, setEditSelectedCategorias] = useState<{ value: number; label: string }[]>([])
  
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
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
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
      setError('No tienes permiso para eliminar equipos')
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
        setDeleteSuccess(`El equipo "${equipoNombre}" ha sido eliminado exitosamente`)
      }
      
      setPagination({ ...pagination, pageIndex: 0 })
      setShowDeleteModal(false)
      setError(null)
      await loadData()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error al eliminar equipos')
    } finally {
      setLoading(false)
    }
  }

  const handleEditClick = (equipo: EquipoWithRelations) => {
    // 🔐 Verificar permiso antes de abrir modal
    if (!puedeEditar) {
      setError('No tienes permiso para editar equipos')
      return
    }
    
    setEditingEquipo(equipo)
    setEditFormError(null)
    setEditFormSuccess(null)
    
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
      setEditFormError('No tienes permiso para editar equipos')
      return
    }
    
    try {
      setEditFormError(null)
      setEditFormSuccess(null)
      
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
      
      // Enviar actualización al servidor
      await updateEquipo(editingEquipo.id, formData)
      
      setEditFormSuccess('Equipo actualizado exitosamente')
      setEditSelectedCategorias([]) // Limpiar selección
      toggleEditOffcanvas()
      setEditingEquipo(null)
      
      // Actualizar el equipo en el estado local para mantener la paginación
      // Obtener los datos actualizados del equipo desde el servidor
      const updatedEquipo = await getEquipoByIdWithRelations(editingEquipo.id)
      if (updatedEquipo) {
        setData(prev => prev.map(equipo => 
          equipo.id === editingEquipo.id ? (updatedEquipo as EquipoWithRelations) : equipo
        ))
      } else {
        // Si no se puede obtener el equipo actualizado, recargar todos los datos
        await loadData()
      }
      
    } catch (error) {
      setEditFormError(error instanceof Error ? error.message : 'Error al actualizar equipo')
    }
  }

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      const [equiposData, categoriasData, entrenadoresData] = await Promise.all([
        getEquipos(),
        getCategorias(),
        getEntrenadores()
      ])
      setData(equiposData)
      setCategorias(categoriasData)
      setEntrenadores(entrenadoresData)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateEquipo = async (formData: FormData) => {
    // 🔐 Verificar permiso antes de crear
    if (!puedeCrear) {
      setFormError('No tienes permiso para crear equipos')
      return
    }
    
    try {
      setFormError(null)
      setFormSuccess(null)
      
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
      setFormSuccess('Equipo creado exitosamente')
      setSelectedCategorias([]) // Limpiar selección
      toggleOffcanvas()
      await loadData()
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Error al crear equipo')
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

  if (loading) {
    return (
      <Container fluid>
        <PageBreadcrumb title="Equipos" subtitle="Apps" />
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
      <PageBreadcrumb title="Equipos" subtitle="Apps" />

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
    </Container>
  )
}

export default Page 