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
import { Button, Card, CardFooter, CardHeader, Col, Container, FloatingLabel, Form, FormControl, FormSelect, FormCheck, Offcanvas, OffcanvasBody, OffcanvasHeader, OffcanvasTitle, Row, Alert } from 'react-bootstrap'
import { LuSearch, LuMapPin } from 'react-icons/lu'
import { TbEdit, TbPlus, TbTrash } from 'react-icons/tb'
import { getCanchasWithCategorias, createCancha, updateCancha, deleteCancha } from './actions'
import { getCategorias } from '../categorias/actions'
import type { CanchaWithCategorias, Categoria } from '@/db/types'

const columnHelper = createColumnHelper<CanchaWithCategorias>()

const Page = () => {
  const { isTrue: showOffcanvas, toggle: toggleOffcanvas } = useToggle()
  const { isTrue: showEditOffcanvas, toggle: toggleEditOffcanvas } = useToggle()
  const { puedeVer, puedeCrear, puedeEditar, puedeEliminar, cargando: cargandoPermisos } = usePermisos('canchas')
  
  const [data, setData] = useState<CanchaWithCategorias[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null)
  const [editingCancha, setEditingCancha] = useState<CanchaWithCategorias | null>(null)
  const [editFormError, setEditFormError] = useState<string | null>(null)
  const [editFormSuccess, setEditFormSuccess] = useState<string | null>(null)
  const [selectedCategorias, setSelectedCategorias] = useState<number[]>([])
  const [editSelectedCategorias, setEditSelectedCategorias] = useState<number[]>([])
  
  const columns = [
    columnHelper.accessor('nombre', {
      header: 'Nombre de la Cancha',
      cell: ({ row }) => (
        <div className="d-flex justify-content-start align-items-center gap-2">
          <div className="avatar avatar-sm">
            <div className="avatar-title bg-light rounded-circle">
              <LuMapPin className="fs-lg text-success" />
            </div>
          </div>
          <div>
            <h5 className="text-nowrap mb-0 lh-base fs-base">
              <Link href={`/canchas/${row.original.id}`} className="link-reset">
                {row.original.nombre}
              </Link>
            </h5>
            <p className="text-muted fs-xs mb-0">ID: {row.original.id}</p>
          </div>
        </div>
      ),
    }),
    columnHelper.accessor('categorias', {
      header: 'Categorías',
      enableColumnFilter: true,
      cell: ({ row }) => (
        <div className="d-flex flex-wrap gap-1">
          {row.original.categorias && row.original.categorias.length > 0 ? (
            row.original.categorias.map((categoria) => (
              <span key={categoria.id} className="badge bg-primary-subtle text-primary badge-label">
                {categoria.nombre}
              </span>
            ))
          ) : (
            <span className="text-muted fs-xs">Sin categorías</span>
          )}
        </div>
      ),
    }),
    // columnHelper.accessor('ubicacion', {
    //   header: 'Ubicación',
    //   cell: ({ row }) => (
    //     <span className="text-muted">
    //       {row.original.ubicacion || 'No especificada'}
    //     </span>
    //   ),
    // }),
    columnHelper.accessor('tipo', {
      header: 'Tipo',
      filterFn: 'equalsString',
      enableColumnFilter: true,
      cell: ({ row }) => {
        const tipo = row.original.tipo || 'otro'
        const colorMap: Record<string, string> = {
          'futbol': 'bg-success-subtle text-success',
          'futsal': 'bg-primary-subtle text-primary',
          'basquet': 'bg-warning-subtle text-warning',
          'tenis': 'bg-info-subtle text-info',
          'voley': 'bg-danger-subtle text-danger',
          'otro': 'bg-secondary-subtle text-secondary'
        }
        return (
          <span className={`badge ${colorMap[tipo] || 'bg-secondary-subtle text-secondary'} badge-label`}>
            {tipo ? tipo.charAt(0).toUpperCase() + tipo.slice(1) : 'No especificado'}
          </span>
        )
      },
    }),
    // columnHelper.accessor('capacidad', {
    //   header: 'Capacidad',
    //   cell: ({ row }) => (
    //     <span className="fw-semibold">
    //       {row.original.capacidad ? `${row.original.capacidad} personas` : 'No especificada'}
    //     </span>
    //   ),
    // }),
    columnHelper.accessor('estado', {
      header: 'Estado',
      filterFn: 'equalsString',
      enableColumnFilter: true,
      cell: ({ row }) => (
        <span className={`badge ${row.original.estado ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'} badge-label`}>
          {row.original.estado ? 'Activa' : 'Inactiva'}
        </span>
      ),
    }),
    columnHelper.accessor('createdAt', { 
      header: 'Fecha Creación',
      cell: ({ row }) => row.original.createdAt ? new Date(row.original.createdAt).toLocaleDateString('es-ES') : 'N/A'
    }),
    {
      header: 'Acciones',
      cell: ({ row }: { row: TableRow<CanchaWithCategorias> }) => (
        <div className="d-flex gap-1">
          {puedeEditar && (
            <Button 
              variant="light" 
              size="sm" 
              className="btn-icon rounded-circle"
              onClick={() => handleEditClick(row.original)}
              title="Editar cancha">
              <TbEdit className="fs-lg" />
            </Button>
          )}
          {puedeEliminar && (
            <Button
              variant="light"
              size="sm"
              className="btn-icon rounded-circle"
              onClick={() => handleDeleteSingle(row.original)}
              title="Eliminar cancha">
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
  const [canchaToDelete, setCanchaToDelete] = useState<CanchaWithCategorias | null>(null)

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
    filterFns: {
      categoriasFilter: (row, columnId, filterValue) => {
        const categorias = row.getValue(columnId) as Categoria[];
        if (filterValue === 'has') {
          return categorias && categorias.length > 0;
        } else if (filterValue === 'empty') {
          return !categorias || categorias.length === 0;
        }
        return true;
      },
    },
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
      setCanchaToDelete(null)
    }
  }

  const handleDeleteSingle = (cancha: CanchaWithCategorias) => {
    if (loading) return
    
    setCanchaToDelete(cancha)
    setShowDeleteModal(true)
  }

  const handleDelete = async () => {
    if (loading) return
    
    if (!puedeEliminar) {
      setError('No tienes permiso para eliminar canchas')
      setShowDeleteModal(false)
      return
    }
    
    try {
      setLoading(true)
      
      if (canchaToDelete) {
        const canchaNombre = canchaToDelete.nombre
        await deleteCancha(canchaToDelete.id)
        setCanchaToDelete(null)
        setDeleteSuccess(`La cancha "${canchaNombre}" ha sido eliminada exitosamente`)
      }
      
      await loadData()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error al eliminar cancha')
    } finally {
      setLoading(false)
      setShowDeleteModal(false)
    }
  }

  const handleEditClick = (cancha: CanchaWithCategorias) => {
    if (!puedeEditar) {
      setError('No tienes permiso para editar canchas')
      return
    }
    
    setEditingCancha(cancha)
    setEditSelectedCategorias(cancha.categorias?.map(c => c.id) || [])
    setEditFormError(null)
    setEditFormSuccess(null)
    toggleEditOffcanvas()
  }

  const handleUpdateCancha = async (formData: FormData) => {
    if (!editingCancha) return
    
    if (!puedeEditar) {
      setEditFormError('No tienes permiso para editar canchas')
      return
    }
    
    try {
      setLoading(true)
      setEditFormError(null)
      setEditFormSuccess(null)
      
      // Agregar las categorías seleccionadas al formData
      editSelectedCategorias.forEach((id) => {
        formData.append('categorias', id.toString())
      })
      
      await updateCancha(editingCancha.id, formData)
      setEditFormSuccess('Cancha actualizada exitosamente')
      setEditSelectedCategorias([]) // Resetear selección
      
      // Recargar datos después de un breve delay
      setTimeout(async () => {
        await loadData()
        toggleEditOffcanvas()
        setEditingCancha(null)
      }, 1000)
    } catch (error) {
      setEditFormError(error instanceof Error ? error.message : 'Error al actualizar cancha')
    } finally {
      setLoading(false)
    }
  }

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      const [canchasData, categoriasData] = await Promise.all([
        getCanchasWithCategorias(),
        getCategorias(),
      ])
      setData(canchasData as any)
      // Filtrar solo categorías activas
      const categoriasActivas = categoriasData.filter(categoria => categoria.estado === true)
      setCategorias(categoriasActivas)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error al cargar canchas')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCancha = async (formData: FormData) => {
    if (!puedeCrear) {
      setFormError('No tienes permiso para crear canchas')
      return
    }
    
    try {
      setLoading(true)
      setFormError(null)
      setFormSuccess(null)
      
      // Agregar las categorías seleccionadas al formData
      selectedCategorias.forEach((id) => {
        formData.append('categorias', id.toString())
      })
      
      await createCancha(formData)
      setFormSuccess('Cancha creada exitosamente')
      setSelectedCategorias([]) // Resetear selección
      
      // Recargar datos después de un breve delay
      setTimeout(async () => {
        await loadData()
        toggleOffcanvas()
      }, 1000)
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Error al crear cancha')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Resetear categorías seleccionadas cuando se abre el offcanvas de crear
  useEffect(() => {
    if (showOffcanvas) {
      setSelectedCategorias([])
    }
  }, [showOffcanvas])

  // Resetear categorías seleccionadas cuando se abre el offcanvas de editar
  useEffect(() => {
    if (showEditOffcanvas && editingCancha) {
      setEditSelectedCategorias(editingCancha.categorias?.map(c => c.id) || [])
    } else if (!showEditOffcanvas) {
      setEditSelectedCategorias([])
    }
  }, [showEditOffcanvas, editingCancha])

  // Función para manejar el cierre del offcanvas de crear
  const handleCloseCreateOffcanvas = () => {
    setSelectedCategorias([])
    setFormError(null)
    setFormSuccess(null)
    toggleOffcanvas()
  }

  // Función para manejar el cierre del offcanvas de editar
  const handleCloseEditOffcanvas = () => {
    setEditSelectedCategorias([])
    setEditFormError(null)
    setEditFormSuccess(null)
    setEditingCancha(null)
    toggleEditOffcanvas()
  }

  if (cargandoPermisos) {
    return (
      <Container fluid>
        <PageBreadcrumb title="Canchas" subtitle="Apps" />
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
        <PageBreadcrumb title="Canchas" subtitle="Apps" />
        <Row className="justify-content-center">
          <Col xxl={8}>
            <Alert variant="danger" className="mt-4">
              <Alert.Heading>❌ Acceso Denegado</Alert.Heading>
              <p className="mb-0">
                No tienes permisos para acceder a esta página.
                <br />
                <small className="text-muted">Contacta al administrador para solicitar acceso al módulo de Canchas.</small>
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
        <PageBreadcrumb title="Canchas" subtitle="Apps" />
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
      <PageBreadcrumb title="Canchas" subtitle="Apps" />

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
                    placeholder="Buscar canchas..."
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
                    title="Agregar nueva cancha">
                    <TbPlus className="fs-lg" />
                  </Button>
                ) : (
                  <Button 
                    type="button" 
                    className="btn-secondary rounded-circle btn-icon" 
                    disabled
                    title="No tienes permiso para crear canchas">
                    <TbPlus className="fs-lg" />
                  </Button>
                )}
              </div>

              <div className="d-flex align-items-center gap-2">
                <span className="me-2 fw-semibold">Filtrar por:</span>

                <div className="app-search">
                  <select
                    className="form-select form-control my-1 my-md-0"
                    value={(table.getColumn('tipo')?.getFilterValue() as string) ?? 'Todos'}
                    onChange={(e) => table.getColumn('tipo')?.setFilterValue(e.target.value === 'Todos' ? undefined : e.target.value)}>
                    <option value="Todos">Tipo</option>
                    <option value="futbol">Fútbol</option>
                    <option value="futsal">Futsal</option>
                    <option value="basquet">Básquet</option>
                    <option value="tenis">Tenis</option>
                    <option value="voley">Vóley</option>
                    <option value="otro">Otro</option>
                  </select>
                  <LuMapPin className="app-search-icon text-muted" />
                </div>

                <div className="app-search">
                  <select
                    className="form-select form-control my-1 my-md-0"
                    value={(table.getColumn('estado')?.getFilterValue() as string) ?? 'Todos'}
                    onChange={(e) => table.getColumn('estado')?.setFilterValue(e.target.value === 'Todos' ? undefined : e.target.value)}>
                    <option value="Todos">Estado</option>
                    <option value="true">Activa</option>
                    <option value="false">Inactiva</option>
                  </select>
                </div>

                <div className="app-search">
                  <select
                    className="form-select form-control my-1 my-md-0"
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === 'Todos') {
                        setGlobalFilter('');
                      } else if (value === 'Con Categorías') {
                        // Filtrar canchas que tienen categorías
                        const filteredData = data.filter(cancha => 
                          cancha.categorias && cancha.categorias.length > 0
                        );
                        setData(filteredData);
                      } else if (value === 'Sin Categorías') {
                        // Filtrar canchas que no tienen categorías
                        const filteredData = data.filter(cancha => 
                          !cancha.categorias || cancha.categorias.length === 0
                        );
                        setData(filteredData);
                      }
                    }}>
                    <option value="Todos">Categorías</option>
                    <option value="Con Categorías">Con Categorías</option>
                    <option value="Sin Categorías">Sin Categorías</option>
                  </select>
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

            <DataTable<CanchaWithCategorias> table={table} emptyMessage="No se encontraron registros" />

            {table.getRowModel().rows.length > 0 && (
              <CardFooter className="border-0">
                <TablePagination
                  totalItems={totalItems}
                  start={start}
                  end={end}
                  itemsName="canchas"
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
              itemName="cancha"
              variant="danger"
              isLoading={loading}
              showBadgeDesign={false}
              itemToDelete={canchaToDelete?.nombre}
            />
          </Card>
        </Col>
      </Row>

      {/* Offcanvas Right con Formulario de Floating Labels para Crear */}
      <Offcanvas show={showOffcanvas} onHide={handleCloseCreateOffcanvas} placement="end" className="offcanvas-end">
        <OffcanvasHeader closeButton>
          <OffcanvasTitle as="h5" className="mt-0">
            Agregar Nueva Cancha
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
          
          <Form action={handleCreateCancha}>
            <Row className="g-3">
              <Col lg={12}>
                <FloatingLabel label="Nombre de la Cancha">
                  <FormControl type="text" name="nombre" placeholder="Ingrese el nombre de la cancha" required />
                </FloatingLabel>
              </Col>

              {/* <Col lg={12}>
                <FloatingLabel label="Ubicación">
                  <FormControl type="text" name="ubicacion" placeholder="Ingrese la ubicación de la cancha" />
                </FloatingLabel>
              </Col> */}

              <Col lg={12}>
                <FloatingLabel label="Tipo de Cancha">
                  <FormSelect name="tipo" required>
                    <option value="">Seleccione un tipo</option>
                    <option value="futbol">Fútbol</option>
                    <option value="futsal">Futsal</option>
                    <option value="basquet">Básquet</option>
                    <option value="tenis">Tenis</option>
                    <option value="voley">Vóley</option>
                    <option value="otro">Otro</option>
                  </FormSelect>
                </FloatingLabel>
              </Col>

              {/* <Col lg={12}>
                <FloatingLabel label="Capacidad">
                  <FormControl type="number" name="capacidad" placeholder="Ingrese la capacidad de la cancha" min="1" />
                </FloatingLabel>
              </Col> */}

              <Col lg={12}>
                <FloatingLabel label="Descripción">
                  <FormControl as="textarea" name="descripcion" placeholder="Ingrese una descripción de la cancha" rows={3} />
                </FloatingLabel>
              </Col>

              <Col lg={12}>
                <FloatingLabel label="Estado">
                  <FormSelect name="estado">
                    <option value="true">Activa</option>
                    <option value="false">Inactiva</option>
                  </FormSelect>
                </FloatingLabel>
              </Col>

              <Col lg={12}>
                <label className="form-label fw-semibold mb-2">
                  Categorías Disponibles
                </label>
                <div 
                  className="border rounded p-3"
                  style={{
                    maxHeight: '300px',
                    overflowY: 'auto',
                    backgroundColor: '#f8f9fa',
                    border: '2px solid #e0e0e0',
                  }}
                >
                  {categorias.length > 0 ? (
                    <div className="d-flex flex-column gap-2">
                      {categorias.map((categoria) => (
                        <FormCheck
                          key={categoria.id}
                          type="checkbox"
                          id={`categoria-create-${categoria.id}`}
                          label={categoria.nombre}
                          checked={selectedCategorias.includes(categoria.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCategorias([...selectedCategorias, categoria.id])
                            } else {
                              setSelectedCategorias(selectedCategorias.filter(id => id !== categoria.id))
                            }
                          }}
                          className="p-2 rounded"
                          style={{
                            backgroundColor: selectedCategorias.includes(categoria.id) ? '#e7f3ff' : 'white',
                            border: selectedCategorias.includes(categoria.id) ? '2px solid #0d6efd' : '1px solid #dee2e6',
                            transition: 'all 0.2s ease',
                            cursor: 'pointer'
                          }}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-muted py-3">
                      No hay categorías activas disponibles
                    </div>
                  )}
                </div>
                {selectedCategorias.length > 0 && (
                  <div className="mt-2">
                    <small className="text-muted">
                      <strong>{selectedCategorias.length}</strong> categoría{selectedCategorias.length > 1 ? 's' : ''} seleccionada{selectedCategorias.length > 1 ? 's' : ''}
                    </small>
                  </div>
                )}
              </Col>

              <Col lg={12}>
                <div className="d-flex gap-2 justify-content-end">
                  <Button variant="light" onClick={handleCloseCreateOffcanvas}>
                    Cancelar
                  </Button>
                  <Button variant="success" type="submit">
                    Crear Cancha
                  </Button>
                </div>
              </Col>
            </Row>
          </Form>
        </OffcanvasBody>
      </Offcanvas>

      {/* Offcanvas Right con Formulario de Floating Labels para Editar */}
      <Offcanvas show={showEditOffcanvas} onHide={handleCloseEditOffcanvas} placement="end" className="offcanvas-end">
        <OffcanvasHeader closeButton>
          <OffcanvasTitle as="h5" className="mt-0">
            Editar Cancha
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
          
          {editingCancha && (
            <Form action={handleUpdateCancha}>
              <Row className="g-3">
                <Col lg={12}>
                  <FloatingLabel label="Nombre de la Cancha">
                    <FormControl 
                      type="text" 
                      name="nombre" 
                      placeholder="Ingrese el nombre de la cancha" 
                      defaultValue={editingCancha.nombre}
                      required 
                    />
                  </FloatingLabel>
                </Col>

                {/* <Col lg={12}>
                  <FloatingLabel label="Ubicación">
                    <FormControl 
                      type="text" 
                      name="ubicacion" 
                      placeholder="Ingrese la ubicación de la cancha"
                      defaultValue={editingCancha.ubicacion || ''}
                    />
                  </FloatingLabel>
                </Col> */}

                <Col lg={12}>
                  <FloatingLabel label="Tipo de Cancha">
                    <FormSelect name="tipo" defaultValue={editingCancha.tipo || ''} required>
                      <option value="">Seleccione un tipo</option>
                      <option value="futbol">Fútbol</option>
                      <option value="futsal">Futsal</option>
                      <option value="basquet">Básquet</option>
                      <option value="tenis">Tenis</option>
                      <option value="voley">Vóley</option>
                      <option value="otro">Otro</option>
                    </FormSelect>
                  </FloatingLabel>
                </Col>

                {/* <Col lg={12}>
                  <FloatingLabel label="Capacidad">
                    <FormControl 
                      type="number" 
                      name="capacidad" 
                      placeholder="Ingrese la capacidad de la cancha" 
                      defaultValue={editingCancha.capacidad || ''}
                      min="1" 
                    />
                  </FloatingLabel>
                </Col> */}

                <Col lg={12}>
                  <FloatingLabel label="Descripción">
                    <FormControl 
                      as="textarea" 
                      name="descripcion" 
                      placeholder="Ingrese una descripción de la cancha" 
                      defaultValue={editingCancha.descripcion || ''}
                      rows={3} 
                    />
                  </FloatingLabel>
                </Col>

                <Col lg={12}>
                  <FloatingLabel label="Estado">
                    <FormSelect name="estado" defaultValue={(editingCancha.estado ?? true).toString()}>
                      <option value="true">Activa</option>
                      <option value="false">Inactiva</option>
                    </FormSelect>
                  </FloatingLabel>
                </Col>

                <Col lg={12}>
                  <label className="form-label fw-semibold mb-2">
                    Categorías Disponibles
                  </label>
                  <div 
                    className="border rounded p-3"
                    style={{
                      maxHeight: '300px',
                      overflowY: 'auto',
                      backgroundColor: '#f8f9fa',
                      border: '2px solid #e0e0e0',
                    }}
                  >
                    {categorias.length > 0 ? (
                      <div className="d-flex flex-column gap-2">
                        {categorias.map((categoria) => (
                          <FormCheck
                            key={categoria.id}
                            type="checkbox"
                            id={`categoria-edit-${categoria.id}`}
                            label={categoria.nombre}
                            checked={editSelectedCategorias.includes(categoria.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setEditSelectedCategorias([...editSelectedCategorias, categoria.id])
                              } else {
                                setEditSelectedCategorias(editSelectedCategorias.filter(id => id !== categoria.id))
                              }
                            }}
                            className="p-2 rounded"
                            style={{
                              backgroundColor: editSelectedCategorias.includes(categoria.id) ? '#e7f3ff' : 'white',
                              border: editSelectedCategorias.includes(categoria.id) ? '2px solid #0d6efd' : '1px solid #dee2e6',
                              transition: 'all 0.2s ease',
                              cursor: 'pointer'
                            }}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="text-center text-muted py-3">
                        No hay categorías activas disponibles
                      </div>
                    )}
                  </div>
                  {editSelectedCategorias.length > 0 && (
                    <div className="mt-2">
                      <small className="text-muted">
                        <strong>{editSelectedCategorias.length}</strong> categoría{editSelectedCategorias.length > 1 ? 's' : ''} seleccionada{editSelectedCategorias.length > 1 ? 's' : ''}
                      </small>
                    </div>
                  )}
                </Col>

                <Col lg={12}>
                  <div className="d-flex gap-2 justify-content-end">
                    <Button variant="light" onClick={handleCloseEditOffcanvas}>
                      Cancelar
                    </Button>
                    <Button variant="primary" type="submit">
                      Actualizar Cancha
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
