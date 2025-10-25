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
import { Button, Card, CardFooter, CardHeader, Col, Container, FloatingLabel, Form, FormControl, FormSelect, Offcanvas, OffcanvasBody, OffcanvasHeader, OffcanvasTitle, Row, Alert } from 'react-bootstrap'
import { LuSearch, LuTrophy } from 'react-icons/lu'
import { TbEdit, TbPlus, TbTrash } from 'react-icons/tb'
import { getCategorias, createCategoria, updateCategoria, deleteCategoria, deleteMultipleCategorias } from './actions'
import type { Categoria } from '@/db/types'
import { formatearRangoEdad } from '@/lib/age-helpers'

const columnHelper = createColumnHelper<Categoria>()

const Page = () => {
  const { isTrue: showOffcanvas, toggle: toggleOffcanvas } = useToggle()
  const { isTrue: showEditOffcanvas, toggle: toggleEditOffcanvas } = useToggle()
  
  const { puedeVer, puedeCrear, puedeEditar, puedeEliminar, cargando: cargandoPermisos } = usePermisos('categorias')
  
  const [data, setData] = useState<Categoria[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null)
  const [editingCategoria, setEditingCategoria] = useState<Categoria | null>(null)
  const [editFormError, setEditFormError] = useState<string | null>(null)
  const [editFormSuccess, setEditFormSuccess] = useState<string | null>(null)
  
  const columns = [
    columnHelper.accessor('nombre', {
      header: 'Nombre de la Categoría',
      cell: ({ row }) => (
        <div className="d-flex justify-content-start align-items-center gap-2">
          <div className="avatar avatar-sm">
            <div className="avatar-title bg-light rounded-circle">
              <LuTrophy className="fs-lg text-warning" />
            </div>
          </div>
          <div>
            <h5 className="text-nowrap mb-0 lh-base fs-base">
              <Link href={`/categorias/${row.original.id}`} className="link-reset">
                {row.original.nombre}
              </Link>
            </h5>
            <p className="text-muted fs-xs mb-0">ID: {row.original.id}</p>
          </div>
        </div>
      ),
    }),
    columnHelper.accessor('estado', {
      header: 'Estado',
      filterFn: 'equalsString',
      enableColumnFilter: true,
      cell: ({ row }) => (
        <span className={`badge ${row.original.estado ? 'bg-success-subtle text-success' : 'bg-secondary-subtle text-secondary'} badge-label`}>
          {row.original.estado ? 'Activo' : 'Inactivo'}
        </span>
      ),
    }),
    {
      header: 'Rango de Edad',
      cell: ({ row }: { row: TableRow<Categoria> }) => {
        const categoria = row.original
        if (categoria.edad_minima_anos !== null && categoria.edad_maxima_anos !== null) {
          const rango = {
            edadMinimaAnos: categoria.edad_minima_anos,
            edadMinimaMeses: categoria.edad_minima_meses || 0,
            edadMaximaAnos: categoria.edad_maxima_anos,
            edadMaximaMeses: categoria.edad_maxima_meses || 0
          }
          return (
            <span className="badge bg-info-subtle text-info">
              {formatearRangoEdad(rango)}
            </span>
          )
        }
        return <span className="text-muted">Sin rango definido</span>
      },
    },
    columnHelper.accessor('createdAt', { 
      header: 'Fecha Creación',
      cell: ({ row }) => row.original.createdAt ? new Date(row.original.createdAt).toLocaleDateString('es-ES') : 'N/A'
    }),
    {
      header: 'Acciones',
      cell: ({ row }: { row: TableRow<Categoria> }) => (
        <div className="d-flex gap-1">
          {puedeEditar && (
            <Button 
              variant="light" 
              size="sm" 
              className="btn-icon rounded-circle"
              onClick={() => handleEditClick(row.original)}
              title="Editar categoría">
              <TbEdit className="fs-lg" />
            </Button>
          )}
          {puedeEliminar && (
            <Button
              variant="light"
              size="sm"
              className="btn-icon rounded-circle"
              onClick={() => handleDeleteSingle(row.original)}
              title="Eliminar categoría">
              <TbTrash className="fs-lg" />
            </Button>
          )}
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
  const [categoriaToDelete, setCategoriaToDelete] = useState<Categoria | null>(null)

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
      setCategoriaToDelete(null)
    }
  }

  const handleDeleteSingle = (categoria: Categoria) => {
    if (loading) return
    
    setCategoriaToDelete(categoria)
    setShowDeleteModal(true)
  }

  const handleDelete = async () => {
    if (loading) return
    
    if (!puedeEliminar) {
      setError('No tienes permiso para eliminar categorías')
      setShowDeleteModal(false)
      return
    }
    
    try {
      setLoading(true)
      
      if (categoriaToDelete) {
        const categoriaNombre = categoriaToDelete.nombre
        await deleteCategoria(categoriaToDelete.id)
        setCategoriaToDelete(null)
        setDeleteSuccess(`La categoría "${categoriaNombre}" ha sido eliminada exitosamente`)
      }
      
      await loadData()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error al eliminar categoría')
    } finally {
      setLoading(false)
      setShowDeleteModal(false)
    }
  }

  const handleEditClick = (categoria: Categoria) => {
    if (!puedeEditar) {
      setError('No tienes permiso para editar categorías')
      return
    }
    
    setEditingCategoria(categoria)
    setEditFormError(null)
    setEditFormSuccess(null)
    toggleEditOffcanvas()
  }

  const handleUpdateCategoria = async (formData: FormData) => {
    if (!editingCategoria) return
    
    if (!puedeEditar) {
      setEditFormError('No tienes permiso para editar categorías')
      return
    }
    
    try {
      setLoading(true)
      setEditFormError(null)
      setEditFormSuccess(null)
      
      await updateCategoria(editingCategoria.id, formData)
      setEditFormSuccess('Categoría actualizada exitosamente')
      
      // Recargar datos después de un breve delay
      setTimeout(async () => {
        await loadData()
        toggleEditOffcanvas()
        setEditingCategoria(null)
      }, 1000)
    } catch (error) {
      setEditFormError(error instanceof Error ? error.message : 'Error al actualizar categoría')
    } finally {
      setLoading(false)
    }
  }

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      const categoriasData = await getCategorias()
      setData(categoriasData)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error al cargar categorías')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCategoria = async (formData: FormData) => {
    if (!puedeCrear) {
      setFormError('No tienes permiso para crear categorías')
      return
    }
    
    try {
      setLoading(true)
      setFormError(null)
      setFormSuccess(null)
      
      await createCategoria(formData)
      setFormSuccess('Categoría creada exitosamente')
      
      // Recargar datos después de un breve delay
      setTimeout(async () => {
        await loadData()
        toggleOffcanvas()
      }, 1000)
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Error al crear categoría')
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
        <PageBreadcrumb title="Categorías" subtitle="Apps" />
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
        <PageBreadcrumb title="Categorías" subtitle="Apps" />
        <Row className="justify-content-center">
          <Col xxl={8}>
            <Alert variant="danger" className="mt-4">
              <Alert.Heading>❌ Acceso Denegado</Alert.Heading>
              <p className="mb-0">
                No tienes permisos para acceder a esta página.
                <br />
                <small className="text-muted">Contacta al administrador para solicitar acceso al módulo de Categorías.</small>
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
        <PageBreadcrumb title="Categorías" subtitle="Apps" />
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
      <PageBreadcrumb title="Categorías" subtitle="Apps" />

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
                    placeholder="Buscar categorías..."
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
                    title="Agregar nueva categoría">
                    <TbPlus className="fs-lg" />
                  </Button>
                ) : (
                  <Button 
                    type="button" 
                    className="btn-secondary rounded-circle btn-icon" 
                    disabled
                    title="No tienes permiso para crear categorías">
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
                    <option value="true">Activo</option>
                    <option value="false">Inactivo</option>
                  </select>
                  <LuTrophy className="app-search-icon text-muted" />
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

            <DataTable<Categoria> table={table} emptyMessage="No se encontraron registros" />

            {table.getRowModel().rows.length > 0 && (
              <CardFooter className="border-0">
                <TablePagination
                  totalItems={totalItems}
                  start={start}
                  end={end}
                  itemsName="categorías"
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
              itemName="categoría"
              variant="danger"
              isLoading={loading}
              showBadgeDesign={false}
              itemToDelete={categoriaToDelete?.nombre}
            />
          </Card>
        </Col>
      </Row>

      {/* Offcanvas Right con Formulario de Floating Labels para Crear */}
      <Offcanvas show={showOffcanvas} onHide={toggleOffcanvas} placement="end" className="offcanvas-end">
        <OffcanvasHeader closeButton>
          <OffcanvasTitle as="h5" className="mt-0">
            Agregar Nueva Categoría
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
          
          <Form action={handleCreateCategoria}>
            <Row className="g-3">
              <Col lg={12}>
                <FloatingLabel label="Nombre de la Categoría">
                  <FormControl type="text" name="nombre" placeholder="Ingrese el nombre de la categoría" required />
                </FloatingLabel>
              </Col>

              <Col lg={6}>
                <FloatingLabel label="Edad Mínima (Años)">
                  <FormControl type="number" name="edad_minima_anos" placeholder="0" min="0" max="100" />
                </FloatingLabel>
              </Col>

              <Col lg={6}>
                <FloatingLabel label="Edad Mínima (Meses)">
                  <FormControl type="number" name="edad_minima_meses" placeholder="0" min="0" max="11" defaultValue="0" />
                </FloatingLabel>
              </Col>

              <Col lg={6}>
                <FloatingLabel label="Edad Máxima (Años)">
                  <FormControl type="number" name="edad_maxima_anos" placeholder="0" min="0" max="100" />
                </FloatingLabel>
              </Col>

              <Col lg={6}>
                <FloatingLabel label="Edad Máxima (Meses)">
                  <FormControl type="number" name="edad_maxima_meses" placeholder="0" min="0" max="11" defaultValue="0" />
                </FloatingLabel>
              </Col>

              <Col lg={12}>
                <FloatingLabel label="Estado">
                  <FormSelect name="estado">
                    <option value="false">Inactivo</option>
                    <option value="true">Activo</option>
                  </FormSelect>
                </FloatingLabel>
              </Col>

              <Col lg={12}>
                <div className="d-flex gap-2 justify-content-end">
                  <Button variant="light" onClick={toggleOffcanvas}>
                    Cancelar
                  </Button>
                  <Button variant="success" type="submit">
                    Crear Categoría
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
            Editar Categoría
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
          
          {editingCategoria && (
            <Form action={handleUpdateCategoria}>
              <Row className="g-3">
                <Col lg={12}>
                  <FloatingLabel label="Nombre de la Categoría">
                    <FormControl 
                      type="text" 
                      name="nombre" 
                      placeholder="Ingrese el nombre de la categoría" 
                      defaultValue={editingCategoria.nombre}
                      required 
                    />
                  </FloatingLabel>
                </Col>

                <Col lg={6}>
                  <FloatingLabel label="Edad Mínima (Años)">
                    <FormControl 
                      type="number" 
                      name="edad_minima_anos" 
                      placeholder="0" 
                      min="0" 
                      max="100" 
                      defaultValue={editingCategoria.edad_minima_anos || ''}
                    />
                  </FloatingLabel>
                </Col>

                <Col lg={6}>
                  <FloatingLabel label="Edad Mínima (Meses)">
                    <FormControl 
                      type="number" 
                      name="edad_minima_meses" 
                      placeholder="0" 
                      min="0" 
                      max="11" 
                      defaultValue={editingCategoria.edad_minima_meses || 0}
                    />
                  </FloatingLabel>
                </Col>

                <Col lg={6}>
                  <FloatingLabel label="Edad Máxima (Años)">
                    <FormControl 
                      type="number" 
                      name="edad_maxima_anos" 
                      placeholder="0" 
                      min="0" 
                      max="100" 
                      defaultValue={editingCategoria.edad_maxima_anos || ''}
                    />
                  </FloatingLabel>
                </Col>

                <Col lg={6}>
                  <FloatingLabel label="Edad Máxima (Meses)">
                    <FormControl 
                      type="number" 
                      name="edad_maxima_meses" 
                      placeholder="0" 
                      min="0" 
                      max="11" 
                      defaultValue={editingCategoria.edad_maxima_meses || 0}
                    />
                  </FloatingLabel>
                </Col>

                <Col lg={12}>
                  <FloatingLabel label="Estado">
                    <FormSelect name="estado" defaultValue={editingCategoria.estado?.toString() ?? 'true'}>
                      <option value="false">Inactivo</option>
                      <option value="true">Activo</option>
                    </FormSelect>
                  </FloatingLabel>
                </Col>

                <Col lg={12}>
                  <div className="d-flex gap-2 justify-content-end">
                    <Button variant="light" onClick={toggleEditOffcanvas}>
                      Cancelar
                    </Button>
                    <Button variant="primary" type="submit">
                      Actualizar Categoría
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
