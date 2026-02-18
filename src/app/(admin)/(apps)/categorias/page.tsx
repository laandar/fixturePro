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
import { Button, Card, CardFooter, CardHeader, Col, Container, FloatingLabel, Form, FormControl, FormSelect, Offcanvas, OffcanvasBody, OffcanvasHeader, OffcanvasTitle, Row, Alert, Modal, ModalHeader, ModalBody, ModalFooter, ModalTitle } from 'react-bootstrap'
import { LuSearch, LuTrophy } from 'react-icons/lu'
import { TbEdit, TbHelp, TbPhoto, TbPlus, TbTrash } from 'react-icons/tb'
import { getCategorias, createCategoria, updateCategoria, deleteCategoria, deleteMultipleCategorias, updateCarnetImages } from './actions'
import type { Categoria } from '@/db/types'
import { formatearRangoEdad } from '@/lib/age-helpers'

const columnHelper = createColumnHelper<Categoria>()

const Page = () => {
  const { isTrue: showOffcanvas, toggle: toggleOffcanvas } = useToggle()
  const { isTrue: showEditOffcanvas, toggle: toggleEditOffcanvas } = useToggle()
  const { isTrue: showCarnetModal, toggle: toggleCarnetModal } = useToggle()
  
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
  const [carnetCategoria, setCarnetCategoria] = useState<Categoria | null>(null)
  const [carnetFormError, setCarnetFormError] = useState<string | null>(null)
  const [carnetFormSuccess, setCarnetFormSuccess] = useState<string | null>(null)
  const [uploadingCarnet, setUploadingCarnet] = useState(false)
  const [previewFrontal, setPreviewFrontal] = useState<string | null>(null)
  const [previewTrasera, setPreviewTrasera] = useState<string | null>(null)
  const [frontalInputKey, setFrontalInputKey] = useState(0)
  const [traseraInputKey, setTraseraInputKey] = useState(0)
  
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
    {
      header: 'Jugadores Permitidos',
      cell: ({ row }: { row: TableRow<Categoria> }) => {
        const categoria = row.original
        if (categoria.numero_jugadores_permitidos !== null && categoria.numero_jugadores_permitidos !== undefined) {
          return (
            <span className="badge bg-primary-subtle text-primary">
              {categoria.numero_jugadores_permitidos} jugadores
            </span>
          )
        }
        return <span className="text-muted">No definido</span>
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
            <>
              <Button 
                variant="light" 
                size="sm" 
                className="btn-icon rounded-circle"
                onClick={() => handleEditClick(row.original)}
                title="Editar categoría">
                <TbEdit className="fs-lg" />
              </Button>
              <Button 
                variant="light" 
                size="sm" 
                className="btn-icon rounded-circle"
                onClick={() => handleCarnetClick(row.original)}
                title="Configurar carnet">
                <TbPhoto className="fs-lg" />
              </Button>
            </>
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
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([
    { id: 'estado', value: 'true' } // Mostrar solo activos por defecto
  ])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 8 })
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false)
  const [categoriaToDelete, setCategoriaToDelete] = useState<Categoria | null>(null)
  const [showManualUsuario, setShowManualUsuario] = useState(false)

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

  const handleCarnetClick = (categoria: Categoria) => {
    if (!puedeEditar) {
      setError('No tienes permiso para editar categorías')
      return
    }
    
    // Limpiar todo el estado antes de abrir el modal con una nueva categoría
    setPreviewFrontal(null)
    setPreviewTrasera(null)
    setCarnetFormError(null)
    setCarnetFormSuccess(null)
    
    // Actualizar la categoría y resetear los inputs de archivo
    setCarnetCategoria(categoria)
    setFrontalInputKey(prev => prev + 1)
    setTraseraInputKey(prev => prev + 1)
    
    toggleCarnetModal()
  }

  // Efecto para limpiar previews cuando cambia la categoría en el modal
  useEffect(() => {
    if (showCarnetModal && carnetCategoria) {
      // Si el modal se cierra y se vuelve a abrir, los previews ya están limpios
      // Pero asegurémonos de que cuando cambia la categoría, se limpien
      setPreviewFrontal(null)
      setPreviewTrasera(null)
    }
  }, [carnetCategoria?.id, showCarnetModal])

  const handleFrontalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreviewFrontal(reader.result as string)
      }
      reader.readAsDataURL(file)
    } else {
      setPreviewFrontal(null)
    }
  }

  const handleTraseraChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreviewTrasera(reader.result as string)
      }
      reader.readAsDataURL(file)
    } else {
      setPreviewTrasera(null)
    }
  }

  const handleCloseCarnetModal = () => {
    setPreviewFrontal(null)
    setPreviewTrasera(null)
    setCarnetFormError(null)
    setCarnetFormSuccess(null)
    setCarnetCategoria(null)
    // Resetear los inputs de archivo
    setFrontalInputKey(prev => prev + 1)
    setTraseraInputKey(prev => prev + 1)
    toggleCarnetModal()
  }

  const handleUpdateCarnetImages = async (formData: FormData) => {
    if (!carnetCategoria) return
    
    if (!puedeEditar) {
      setCarnetFormError('No tienes permiso para editar categorías')
      return
    }
    
    try {
      setUploadingCarnet(true)
      setCarnetFormError(null)
      setCarnetFormSuccess(null)
      
      await updateCarnetImages(carnetCategoria.id, formData)
      setCarnetFormSuccess('Imágenes del carnet actualizadas exitosamente')
      
      // Recargar datos después de un breve delay y cerrar el modal
      setTimeout(async () => {
        await loadData()
        // Actualizar la categoría en el estado del modal con los nuevos datos
        const categoriaActualizada = await getCategorias()
        const categoriaEncontrada = categoriaActualizada.find(c => c.id === carnetCategoria.id)
        if (categoriaEncontrada) {
          setCarnetCategoria(categoriaEncontrada)
        }
        // Limpiar previews y resetear inputs de archivo
        setPreviewFrontal(null)
        setPreviewTrasera(null)
        setFrontalInputKey(prev => prev + 1)
        setTraseraInputKey(prev => prev + 1)
        // Cerrar el modal después de actualizar todo
        handleCloseCarnetModal()
      }, 1000)
    } catch (error) {
      setCarnetFormError(error instanceof Error ? error.message : 'Error al actualizar imágenes del carnet')
    } finally {
      setUploadingCarnet(false)
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
                <Button 
                  variant="outline-info" 
                  className="rounded-circle btn-icon"
                  onClick={() => setShowManualUsuario(true)}
                  title="Manual de Usuario">
                  <TbHelp className="fs-lg" />
                </Button>
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
                <FloatingLabel label="Número de Jugadores Permitidos por Equipo">
                  <FormControl 
                    type="number" 
                    name="numero_jugadores_permitidos" 
                    placeholder="Ej: 20" 
                    min="1" 
                    max="50" 
                  />
                </FloatingLabel>
              </Col>

              <Col lg={12}>
                <FloatingLabel label="Jugadores Menores a Edad Mínima Permitidos">
                  <FormControl 
                    type="number" 
                    name="numero_jugadores_menores_permitidos" 
                    placeholder="Ej: 2 (0 = no permitir)" 
                    min="0" 
                    max="10" 
                  />
                  <small className="text-muted">Número máximo de jugadores menores a la edad mínima permitidos por equipo. Dejar vacío o 0 para no permitir.</small>
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
                  <FloatingLabel label="Número de Jugadores Permitidos por Equipo">
                    <FormControl 
                      type="number" 
                      name="numero_jugadores_permitidos" 
                      placeholder="Ej: 20" 
                      min="1" 
                      max="50" 
                      defaultValue={editingCategoria.numero_jugadores_permitidos || ''}
                    />
                  </FloatingLabel>
                </Col>

                <Col lg={12}>
                  <FloatingLabel label="Jugadores Menores a Edad Mínima Permitidos">
                    <FormControl 
                      type="number" 
                      name="numero_jugadores_menores_permitidos" 
                      placeholder="Ej: 2 (0 = no permitir)" 
                      min="0" 
                      max="10" 
                      defaultValue={editingCategoria.numero_jugadores_menores_permitidos || ''}
                    />
                    <small className="text-muted">Número máximo de jugadores menores a la edad mínima permitidos por equipo. Dejar vacío o 0 para no permitir.</small>
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

      {/* Modal para configurar imágenes del carnet */}
      <Modal show={showCarnetModal} onHide={handleCloseCarnetModal} size="lg" centered>
        <ModalHeader closeButton>
          <ModalTitle as="h5" className="mt-0">
            <TbPhoto className="me-2" />
            Configurar Carnet - {carnetCategoria?.nombre}
          </ModalTitle>
        </ModalHeader>
        <ModalBody>
          {carnetFormError && (
            <Alert variant="danger" dismissible onClose={() => setCarnetFormError(null)}>
              {carnetFormError}
            </Alert>
          )}
          {carnetFormSuccess && (
            <Alert variant="success" dismissible onClose={() => setCarnetFormSuccess(null)}>
              {carnetFormSuccess}
            </Alert>
          )}
          
          {carnetCategoria && (
            <Form action={handleUpdateCarnetImages} id="carnet-form">
              <Row className="g-3">
                <Col lg={12}>
                  <label className="form-label fw-semibold">Imagen Frontal del Carnet</label>
                  <FormControl 
                    type="file" 
                    name="imagen_carnet_frontal" 
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    className="mb-2"
                    onChange={handleFrontalChange}
                    key={`frontal-${carnetCategoria.id}-${frontalInputKey}`}
                  />
                  
                  {/* Mostrar preview de nueva imagen si existe, si no mostrar imagen actual */}
                  {previewFrontal ? (
                    <div className="mt-2">
                      <p className="text-muted small mb-1">Nueva imagen (preview):</p>
                      <Image
                        src={previewFrontal}
                        alt="Preview imagen frontal"
                        width={200}
                        height={150}
                        className="img-thumbnail"
                        style={{ objectFit: 'contain' }}
                      />
                    </div>
                  ) : carnetCategoria.imagen_carnet_frontal ? (
                    <div className="mt-2">
                      <p className="text-muted small mb-1">Imagen actual:</p>
                      <Image
                        src={carnetCategoria.imagen_carnet_frontal}
                        alt="Carnet frontal actual"
                        width={200}
                        height={150}
                        className="img-thumbnail"
                        style={{ objectFit: 'contain' }}
                      />
                    </div>
                  ) : null}
                  <small className="text-muted">Formatos permitidos: PNG, JPEG, WEBP</small>
                </Col>

                <Col lg={12}>
                  <label className="form-label fw-semibold">Imagen Trasera del Carnet</label>
                  <FormControl 
                    type="file" 
                    name="imagen_carnet_trasera" 
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    className="mb-2"
                    onChange={handleTraseraChange}
                    key={`trasera-${carnetCategoria.id}-${traseraInputKey}`}
                  />
                  
                  {/* Mostrar preview de nueva imagen si existe, si no mostrar imagen actual */}
                  {previewTrasera ? (
                    <div className="mt-2">
                      <p className="text-muted small mb-1">Nueva imagen (preview):</p>
                      <Image
                        src={previewTrasera}
                        alt="Preview imagen trasera"
                        width={200}
                        height={150}
                        className="img-thumbnail"
                        style={{ objectFit: 'contain' }}
                      />
                    </div>
                  ) : carnetCategoria.imagen_carnet_trasera ? (
                    <div className="mt-2">
                      <p className="text-muted small mb-1">Imagen actual:</p>
                      <Image
                        src={carnetCategoria.imagen_carnet_trasera}
                        alt="Carnet trasero actual"
                        width={200}
                        height={150}
                        className="img-thumbnail"
                        style={{ objectFit: 'contain' }}
                      />
                    </div>
                  ) : null}
                  <small className="text-muted">Formatos permitidos: PNG, JPEG, WEBP</small>
                </Col>

                <Col lg={12}>
                  <div className="d-flex gap-2 justify-content-end">
                    <Button variant="light" onClick={handleCloseCarnetModal} disabled={uploadingCarnet}>
                      Cancelar
                    </Button>
                    <Button variant="primary" type="submit" disabled={uploadingCarnet}>
                      {uploadingCarnet ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                          Guardando...
                        </>
                      ) : (
                        'Guardar Imágenes'
                      )}
                    </Button>
                  </div>
                </Col>
              </Row>
            </Form>
          )}
        </ModalBody>
      </Modal>

      {/* Modal de Manual de Usuario */}
      <Modal show={showManualUsuario} onHide={() => setShowManualUsuario(false)} size="lg" centered>
        <ModalHeader closeButton>
          <ModalTitle>
            <TbHelp className="me-2" />
            Manual de Usuario - Categorías
          </ModalTitle>
        </ModalHeader>
        <ModalBody style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          <div className="manual-content">
            <Alert variant="info" className="mb-4">
              <strong>Bienvenido al Manual de Usuario</strong>
              <br />
              <small>Esta guía te ayudará a gestionar las categorías deportivas: crear, editar, configurar carnets y administrar los rangos de edad y jugadores permitidos.</small>
            </Alert>

            <div className="mb-4">
              <h5 className="text-primary mb-3">
                <LuSearch className="me-2" />
                1. Búsqueda y Vista General
              </h5>
              <p>
                La pantalla de <strong>Categorías</strong> muestra una tabla con todas las categorías registradas (Sub-8, Sub-10, Sub-12, etc.). Cada fila incluye el nombre, estado, rango de edad, jugadores permitidos y fecha de creación.
              </p>
              <ul>
                <li><strong>Campo de búsqueda:</strong> Escribe en el campo superior para buscar categorías por nombre en tiempo real.</li>
              </ul>
            </div>

            <div className="mb-4">
              <h5 className="text-primary mb-3">
                <LuTrophy className="me-2" />
                2. Filtros
              </h5>
              <p>Utiliza los filtros para encontrar categorías específicas:</p>
              <ul>
                <li><strong>Filtrar por Estado:</strong> Filtra por categorías <strong>Activas</strong> o <strong>Inactivas</strong>. Por defecto se muestran solo las activas.</li>
                <li><strong>Registros por página:</strong> El selector numérico permite mostrar 5, 8, 10, 15 o 20 categorías por página.</li>
              </ul>
            </div>

            <div className="mb-4">
              <h5 className="text-primary mb-3">
                <TbPlus className="me-2" />
                3. Crear Nueva Categoría
              </h5>
              <p>Para agregar una nueva categoría:</p>
              <ol>
                <li>Haz clic en el botón <strong>+</strong> (botón morado circular) en la barra superior.</li>
                <li>Se abrirá un panel lateral con el formulario de creación.</li>
                <li>Completa los campos:
                  <ul>
                    <li><strong>Nombre de la Categoría:</strong> Nombre oficial (ej: Sub-10, Sub-12).</li>
                    <li><strong>Edad Mínima/Máxima:</strong> Define el rango en años y meses (ej: 8 años 0 meses a 10 años 11 meses para Sub-10).</li>
                    <li><strong>Número de Jugadores Permitidos:</strong> Cantidad máxima de jugadores por equipo en esta categoría.</li>
                    <li><strong>Jugadores Menores Permitidos:</strong> Cantidad de jugadores que pueden ser menores a la edad mínima (0 = no permitir).</li>
                    <li><strong>Estado:</strong> Activo o Inactivo.</li>
                  </ul>
                </li>
                <li>Haz clic en <strong>Crear Categoría</strong> para guardar.</li>
              </ol>
              <Alert variant="info" className="mt-2 mb-0">
                <small><strong>Nota:</strong> Si no tienes permiso para crear categorías, el botón aparecerá deshabilitado.</small>
              </Alert>
            </div>

            <div className="mb-4">
              <h5 className="text-primary mb-3">
                <TbEdit className="me-2" />
                4. Editar Categoría
              </h5>
              <p>Para modificar la información de una categoría:</p>
              <ol>
                <li>Haz clic en el botón <strong>Editar</strong> (ícono de lápiz) en la fila de la categoría.</li>
                <li>Se abrirá un panel lateral con los datos actuales.</li>
                <li>Modifica los campos que necesites y haz clic en <strong>Actualizar Categoría</strong>.</li>
              </ol>
            </div>

            <div className="mb-4">
              <h5 className="text-primary mb-3">
                <TbPhoto className="me-2" />
                5. Configurar Carnet
              </h5>
              <p>Las categorías pueden tener imágenes personalizadas para los carnets de jugadores:</p>
              <ol>
                <li>Haz clic en el botón <strong>Configurar Carnet</strong> (ícono de cámara/foto) en la fila de la categoría.</li>
                <li>Se abrirá un modal donde podrás subir:
                  <ul>
                    <li><strong>Imagen Frontal del Carnet:</strong> Diseño de la parte frontal del carnet.</li>
                    <li><strong>Imagen Trasera del Carnet:</strong> Diseño de la parte trasera del carnet.</li>
                  </ul>
                </li>
                <li>Formatos permitidos: PNG, JPEG, WEBP.</li>
                <li>Verás una vista previa de la imagen actual o la nueva antes de guardar.</li>
                <li>Haz clic en <strong>Guardar Imágenes</strong> para aplicar los cambios.</li>
              </ol>
            </div>

            <div className="mb-4">
              <h5 className="text-primary mb-3">
                <TbTrash className="me-2" />
                6. Eliminar Categoría
              </h5>
              <p>Para eliminar una categoría:</p>
              <ol>
                <li>Haz clic en el botón <strong>Eliminar</strong> (ícono de papelera) en la fila de la categoría.</li>
                <li>Confirma la eliminación en el mensaje de advertencia que aparece.</li>
              </ol>
              <Alert variant="danger" className="mt-2 mb-0">
                <small><strong>Importante:</strong> La eliminación es irreversible. Asegúrate de que la categoría no tenga equipos, jugadores o torneos asociados antes de eliminarla.</small>
              </Alert>
            </div>

            <div className="mb-4">
              <h5 className="text-primary mb-3">
                <LuTrophy className="me-2" />
                7. Columnas de la Tabla
              </h5>
              <ul>
                <li><strong>Nombre de la Categoría:</strong> Nombre e ID de la categoría.</li>
                <li><strong>Estado:</strong> Activo (verde) o Inactivo (gris).</li>
                <li><strong>Rango de Edad:</strong> Badge con el rango formateado (ej: 8a 0m - 10a 11m).</li>
                <li><strong>Jugadores Permitidos:</strong> Número máximo de jugadores por equipo.</li>
                <li><strong>Fecha Creación:</strong> Fecha en que se registró la categoría.</li>
                <li><strong>Acciones:</strong> Botones para editar, configurar carnet y eliminar (según permisos).</li>
              </ul>
            </div>

            <div className="mb-4">
              <h5 className="text-primary mb-3">
                8. Paginación
              </h5>
              <p>En la parte inferior de la tabla encontrarás la paginación para navegar entre páginas y el contador de registros mostrados.</p>
            </div>

            <div className="mb-3">
              <h5 className="text-primary mb-3">
                9. Consejos
              </h5>
              <ul>
                <li>El rango de edad es útil para validar que los jugadores cumplan los requisitos de la categoría.</li>
                <li>Las categorías inactivas no aparecerán en algunos filtros de torneos o equipos.</li>
                <li>Configura las imágenes del carnet antes de generar carnets para los jugadores.</li>
                <li>Los jugadores menores permitidos permiten cierta flexibilidad en categorías donde se aceptan jugadores ligeramente menores.</li>
              </ul>
            </div>

            <Alert variant="success" className="mb-0">
              <strong>¿Necesitas más ayuda?</strong>
              <br />
              <small>Si tienes preguntas adicionales o encuentras algún problema, contacta al administrador del sistema.</small>
            </Alert>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowManualUsuario(false)}>
            Cerrar
          </Button>
        </ModalFooter>
      </Modal>
    </Container>
  )
}

export default Page
