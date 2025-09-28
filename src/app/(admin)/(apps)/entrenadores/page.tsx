'use client'
import { useEffect, useState } from 'react'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import DataTable from '@/components/table/DataTable'
import DeleteConfirmationModal from '@/components/table/DeleteConfirmationModal'
import TablePagination from '@/components/table/TablePagination'
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
import Link from 'next/link'
import { Button, Card, CardFooter, CardHeader, Col, Container, FloatingLabel, Form, FormControl, FormSelect, Offcanvas, OffcanvasBody, OffcanvasHeader, OffcanvasTitle, Row, Alert } from 'react-bootstrap'
import { LuSearch, LuUser } from 'react-icons/lu'
import { TbEdit, TbPlus, TbTrash } from 'react-icons/tb'
import { getEntrenadores, createEntrenador, updateEntrenador, deleteEntrenador, deleteMultipleEntrenadores } from './actions'
import type { Entrenador } from '@/db/types'

const columnHelper = createColumnHelper<Entrenador>()

const Page = () => {
  const { isTrue: showOffcanvas, toggle: toggleOffcanvas } = useToggle()
  const { isTrue: showEditOffcanvas, toggle: toggleEditOffcanvas } = useToggle()
  
  const [data, setData] = useState<Entrenador[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null)
  const [editingEntrenador, setEditingEntrenador] = useState<Entrenador | null>(null)
  const [editFormError, setEditFormError] = useState<string | null>(null)
  const [editFormSuccess, setEditFormSuccess] = useState<string | null>(null)

  const columns = [
    columnHelper.accessor('nombre', {
      header: 'Nombre del Entrenador',
      cell: ({ row }) => (
        <div className="d-flex justify-content-start align-items-center gap-2">
          <div className="avatar avatar-sm">
            <div className="avatar-title bg-light rounded-circle">
              <LuUser className="fs-lg text-primary" />
            </div>
          </div>
          <div>
            <h5 className="text-nowrap mb-0 lh-base fs-base">
              <Link href={`/entrenadores/${row.original.id}`} className="link-reset">
                {row.original.nombre}
              </Link>
            </h5>
            <p className="text-muted fs-xs mb-0">ID: {row.original.id}</p>
          </div>
        </div>
      ),
    }),
    columnHelper.accessor('createdAt', { 
      header: 'Fecha Creación',
      cell: ({ row }) => row.original.createdAt ? new Date(row.original.createdAt).toLocaleDateString('es-ES') : 'N/A'
    }),
    {
      header: 'Acciones',
      cell: ({ row }: { row: TableRow<Entrenador> }) => (
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
  const [entrenadorToDelete, setEntrenadorToDelete] = useState<Entrenador | null>(null)

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
      setEntrenadorToDelete(null)
    }
  }

  const handleDeleteSingle = (entrenador: Entrenador) => {
    if (loading) return
    
    setEntrenadorToDelete(entrenador)
    setShowDeleteModal(true)
  }

  const handleDelete = async () => {
    if (loading) return
    
    try {
      setLoading(true)
      
      if (entrenadorToDelete) {
        const entrenadorNombre = entrenadorToDelete.nombre
        await deleteEntrenador(entrenadorToDelete.id)
        setEntrenadorToDelete(null)
        setDeleteSuccess(`El entrenador "${entrenadorNombre}" ha sido eliminado exitosamente`)
      }
      
      await loadData()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error al eliminar entrenador')
    } finally {
      setLoading(false)
      setShowDeleteModal(false)
    }
  }

  const handleEditClick = (entrenador: Entrenador) => {
    setEditingEntrenador(entrenador)
    setEditFormError(null)
    setEditFormSuccess(null)
    toggleEditOffcanvas()
  }

  const handleUpdateEntrenador = async (formData: FormData) => {
    if (!editingEntrenador) return
    
    try {
      setLoading(true)
      setEditFormError(null)
      setEditFormSuccess(null)
      
      await updateEntrenador(editingEntrenador.id, formData)
      setEditFormSuccess('Entrenador actualizado exitosamente')
      
      // Recargar datos después de un breve delay
      setTimeout(async () => {
        await loadData()
        toggleEditOffcanvas()
        setEditingEntrenador(null)
      }, 1000)
    } catch (error) {
      setEditFormError(error instanceof Error ? error.message : 'Error al actualizar entrenador')
    } finally {
      setLoading(false)
    }
  }

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      const entrenadoresData = await getEntrenadores()
      setData(entrenadoresData)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error al cargar entrenadores')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateEntrenador = async (formData: FormData) => {
    try {
      setLoading(true)
      setFormError(null)
      setFormSuccess(null)
      
      await createEntrenador(formData)
      setFormSuccess('Entrenador creado exitosamente')
      
      // Recargar datos después de un breve delay
      setTimeout(async () => {
        await loadData()
        toggleOffcanvas()
      }, 1000)
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Error al crear entrenador')
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
        <PageBreadcrumb title="Entrenadores" subtitle="Apps" />
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
      <PageBreadcrumb title="Entrenadores" subtitle="Apps" />

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
                    placeholder="Buscar entrenadores..."
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

            <DataTable<Entrenador> table={table} emptyMessage="No se encontraron registros" />

            {table.getRowModel().rows.length > 0 && (
              <CardFooter className="border-0">
                <TablePagination
                  totalItems={totalItems}
                  start={start}
                  end={end}
                  itemsName="entrenadores"
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
              itemName="entrenadores"
              modalTitle="Confirmar Eliminación"
              confirmButtonText="Eliminar"
              cancelButtonText="Cancelar"
              confirmButtonVariant="danger"
              cancelButtonVariant="light"
              isLoading={loading}
            >
              {entrenadorToDelete && (
                <div className="text-center">
                  <p>¿Estás seguro de que quieres eliminar el entrenador:</p>
                  <h6 className="text-danger mb-3">"{entrenadorToDelete.nombre}"?</h6>
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
            Agregar Nuevo Entrenador
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
          
          <Form action={handleCreateEntrenador}>
            <Row className="g-3">
              <Col lg={12}>
                <FloatingLabel label="Nombre del Entrenador">
                  <FormControl type="text" name="nombre" placeholder="Ingrese el nombre del entrenador" required />
                </FloatingLabel>
              </Col>

              <Col lg={12}>
                <div className="d-flex gap-2 justify-content-end">
                  <Button variant="light" onClick={toggleOffcanvas}>
                    Cancelar
                  </Button>
                  <Button variant="success" type="submit">
                    Crear Entrenador
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
            Editar Entrenador
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
          
          {editingEntrenador && (
            <Form action={handleUpdateEntrenador}>
              <Row className="g-3">
                <Col lg={12}>
                  <FloatingLabel label="Nombre del Entrenador">
                    <FormControl 
                      type="text" 
                      name="nombre" 
                      placeholder="Ingrese el nombre del entrenador" 
                      defaultValue={editingEntrenador.nombre}
                      required 
                    />
                  </FloatingLabel>
                </Col>

                <Col lg={12}>
                  <div className="d-flex gap-2 justify-content-end">
                    <Button variant="light" onClick={toggleEditOffcanvas}>
                      Cancelar
                    </Button>
                    <Button variant="primary" type="submit">
                      Actualizar Entrenador
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
