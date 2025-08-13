'use client'
import { useEffect, useState } from 'react'
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
import { Button, Card, CardFooter, CardHeader, Col, Container, FloatingLabel, Form, FormControl, FormSelect, Offcanvas, OffcanvasBody, OffcanvasHeader, OffcanvasTitle, Row, Alert } from 'react-bootstrap'
import { LuSearch, LuTrophy, LuUsers } from 'react-icons/lu'
import { TbEdit, TbEye, TbPlus, TbTrash } from 'react-icons/tb'
import { getEquipos, getCategorias, getEntrenadores, createEquipo, updateEquipo, deleteEquipo, deleteMultipleEquipos } from './actions'
import type { EquipoWithRelations, Categoria, Entrenador } from '@/db/types'

const columnHelper = createColumnHelper<EquipoWithRelations>()

// Función de filtro personalizada para categorías
const categoriaFilterFn = (row: any, columnId: string, filterValue: string) => {
  const equipo = row.original as EquipoWithRelations
  console.log('Filtro categoría:', {
    filterValue,
    categoriaNombre: equipo.categoria?.nombre,
    coincide: equipo.categoria?.nombre === filterValue
  })
  return equipo.categoria?.nombre === filterValue
}

const Page = () => {
  const { isTrue: showOffcanvas, toggle: toggleOffcanvas } = useToggle()
  const { isTrue: showEditOffcanvas, toggle: toggleEditOffcanvas } = useToggle()
  
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
      id: 'categoria',
      header: 'Categoría',
      filterFn: categoriaFilterFn,
      enableColumnFilter: true,
      cell: ({ row }: { row: TableRow<EquipoWithRelations> }) => (
        <span className="badge p-1 text-bg-light fs-sm">
          <LuTrophy className="me-1" /> {row.original.categoria?.nombre || 'Sin categoría'}
        </span>
      ),
    },
    {
      id: 'permite_revancha',
      header: 'Permite Revancha',
      cell: ({ row }: { row: TableRow<EquipoWithRelations> }) => (
        <span className={`badge ${row.original.categoria?.permite_revancha ? 'bg-success-subtle text-success' : 'bg-secondary-subtle text-secondary'} badge-label`}>
          {row.original.categoria?.permite_revancha ? 'Sí' : 'No'}
        </span>
      ),
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
    setEditingEquipo(equipo)
    setEditFormError(null)
    setEditFormSuccess(null)
    toggleEditOffcanvas()
  }

  const handleUpdateEquipo = async (formData: FormData) => {
    if (!editingEquipo) return
    
    try {
      setEditFormError(null)
      setEditFormSuccess(null)
      
      // Optimistic update - actualizar la tabla inmediatamente
      const nombre = formData.get('nombre') as string
      const categoria_id = parseInt(formData.get('categoria_id') as string)
      const entrenador_id = parseInt(formData.get('entrenador_id') as string)
      const estado = formData.get('estado') === 'true'
      const imagen_equipo = formData.get('imagen_equipo') as string
      
      // Actualizar la tabla inmediatamente
      setData(prev => prev.map(equipo => 
        equipo.id === editingEquipo.id 
          ? {
              ...equipo,
              nombre,
              categoria_id,
              entrenador_id,
              estado,
              imagen_equipo: imagen_equipo || null,
              categoria: categorias.find(c => c.id === categoria_id) || null,
              entrenador: entrenadores.find(e => e.id === entrenador_id) || null
            }
          : equipo
      ))
      
      // Enviar actualización al servidor
      await updateEquipo(editingEquipo.id, formData)
      
      setEditFormSuccess('Equipo actualizado exitosamente')
      toggleEditOffcanvas()
      setEditingEquipo(null)
      
    } catch (error) {
      // Si hay error, revertir el cambio optimista
      setData(prev => prev.map(equipo => 
        equipo.id === editingEquipo.id ? editingEquipo : equipo
      ))
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
    try {
      setFormError(null)
      setFormSuccess(null)
      await createEquipo(formData)
      setFormSuccess('Equipo creado exitosamente')
      toggleOffcanvas()
      await loadData()
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Error al crear equipo')
    }
  }

  useEffect(() => {
    loadData()
  }, [])

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

                <Button type="submit" className="btn-purple rounded-circle btn-icon" onClick={toggleOffcanvas}>
                  <TbPlus className="fs-lg" />
                </Button>
              </div>

              <div className="d-flex align-items-center gap-2">
                <span className="me-2 fw-semibold">Filtrar por:</span>

                <div className="app-search">
                  <select
                    className="form-select form-control my-1 my-md-0"
                    value={(table.getColumn('categoria')?.getFilterValue() as string) ?? 'Todas'}
                    onChange={(e) => table.getColumn('categoria')?.setFilterValue(e.target.value === 'Todas' ? undefined : e.target.value)}>
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

            <DeleteConfirmationModal
              show={showDeleteModal}
              onHide={toggleDeleteModal}
              onConfirm={handleDelete}
              selectedCount={1}
              itemName="equipos"
              modalTitle="Confirmar Eliminación"
              confirmButtonText="Eliminar"
              cancelButtonText="Cancelar"
              confirmButtonVariant="danger"
              cancelButtonVariant="light"
              isLoading={loading}
            >
              {equipoToDelete && (
                <div className="text-center">
                  <p>¿Estás seguro de que quieres eliminar el equipo:</p>
                  <h6 className="text-danger mb-3">"{equipoToDelete.nombre}"?</h6>
                  <p className="text-muted small">
                    Esta acción no se puede deshacer.
                  </p>
                </div>
              )}
            </DeleteConfirmationModal>
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

                <Col lg={6}>
                  <FloatingLabel label="Categoría">
                    <FormSelect name="categoria_id" defaultValue={editingEquipo.categoria_id?.toString()} required>
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