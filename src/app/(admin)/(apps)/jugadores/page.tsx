'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import Select from 'react-select'
import { Toast } from 'primereact/toast'
import 'primereact/resources/themes/lara-light-cyan/theme.css'
import 'primereact/resources/primereact.min.css'
import 'primeicons/primeicons.css'
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
  RowSelectionState,
  VisibilityState,
} from '@tanstack/react-table'
import Image from 'next/image'
import Link from 'next/link'
import { Button, Card, CardBody, CardFooter, CardHeader, Col, Container, FloatingLabel, Form, FormControl, FormSelect, FormCheck, Offcanvas, OffcanvasBody, OffcanvasHeader, OffcanvasTitle, Row, Alert, Nav, Badge, Pagination, Modal, ModalHeader, ModalBody, ModalFooter, ModalTitle, Spinner } from 'react-bootstrap'
import { LuSearch, LuUser, LuTrophy, LuLayoutGrid, LuList, LuMenu, LuChevronLeft, LuChevronRight, LuClock, LuDownload, LuRefreshCw } from 'react-icons/lu'
import { TbEdit, TbPlus, TbTrash, TbCamera, TbPrinter, TbX, TbHelp } from 'react-icons/tb'
import ExcelJS from 'exceljs'
import { getJugadores, createJugador, updateJugador, deleteJugador, deleteMultipleJugadores, getEquiposCategorias, buscarJugadorPorCedula, detectarJugadoresMultiplesCategoriasEquipos } from './actions'
import type { JugadorWithEquipo, Equipo, Categoria } from '@/db/types'
import { calcularEdad, esMenorALaEdadMinima } from '@/lib/age-helpers'
import CameraCapture from '@/components/CameraCapture'
import ProfileCard from '@/components/ProfileCard'
import { getTempPlayerImage } from '@/components/TempPlayerImages'
import HistorialJugadorModal from '@/components/HistorialJugadorModal'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Navigation, Pagination as SwiperPagination, Autoplay } from 'swiper/modules'
import { generarCarnetJugador, generarCarnetsMultiples } from '@/lib/carnet-generator'
import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'
import '@/styles/mobile-carousel.css'
import '@/styles/react-select.css'

const columnHelper = createColumnHelper<JugadorWithEquipo>()

// Función de filtro personalizada para equipos
  const equipoFilterFn = (row: any, columnId: string, filterValue: string | string[]) => {
  const jugador = row.original as JugadorWithEquipo
  const equipoNombre = jugador.jugadoresEquipoCategoria?.[0]?.equipoCategoria?.equipo?.nombre || ''
  if (Array.isArray(filterValue)) {
    return filterValue.includes(equipoNombre)
  }
  return equipoNombre === filterValue
}

// Función de filtro personalizada para categorías
const categoriaFilterFn = (row: any, columnId: string, filterValue: string | string[]) => {
  const jugador = row.original as JugadorWithEquipo
  const categoriaNombre = jugador.jugadoresEquipoCategoria?.[0]?.equipoCategoria?.categoria?.nombre || ''
  if (Array.isArray(filterValue)) {
    return filterValue.includes(categoriaNombre)
  }
  return categoriaNombre === filterValue
}

// Función de filtro personalizada para estado
const estadoFilterFn = (row: any, columnId: string, filterValue: string) => {
  const jugador = row.original as JugadorWithEquipo
  const estadoString = jugador.estado ? 'true' : 'false'
  return estadoString === filterValue
}

// Función de filtro global personalizada que incluye búsqueda por cédula
const globalFilterFn = (row: any, columnId: string, filterValue: string): boolean => {
  const jugador = row.original as JugadorWithEquipo
  if (!filterValue) return true
  
  const searchTerm = filterValue.toLowerCase()
  
  // Buscar en múltiples campos incluyendo cédula
  return (
    jugador.apellido_nombre?.toLowerCase().includes(searchTerm) ||
    jugador.cedula?.toLowerCase().includes(searchTerm) ||
    jugador.nacionalidad?.toLowerCase().includes(searchTerm) ||
    jugador.liga?.toLowerCase().includes(searchTerm) ||
    jugador.telefono?.toLowerCase().includes(searchTerm) ||
    jugador.provincia?.toLowerCase().includes(searchTerm) ||
    jugador.jugadoresEquipoCategoria?.[0]?.equipoCategoria?.equipo?.nombre?.toLowerCase().includes(searchTerm) ||
    jugador.jugadoresEquipoCategoria?.[0]?.equipoCategoria?.categoria?.nombre?.toLowerCase().includes(searchTerm)
  ) || false
}

const Page = () => {
  const toast = useRef<any>(null)
  const { isTrue: showCreateModal, toggle: toggleCreateModal } = useToggle()
  const { isTrue: showEditModal, toggle: toggleEditModal } = useToggle()
  const { isTrue: showFilterOffcanvas, toggle: toggleFilterOffcanvas } = useToggle()
  
  // 🔐 Sistema de permisos dinámicos
  const { puedeVer, puedeCrear, puedeEditar, puedeEliminar, cargando: cargandoPermisos } = usePermisos('jugadores')
  
  const [data, setData] = useState<JugadorWithEquipo[]>([])
  const [allData, setAllData] = useState<JugadorWithEquipo[]>([]) // Almacena todos los jugadores
  const [equiposCategorias, setEquiposCategorias] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null)
  const [editingJugador, setEditingJugador] = useState<JugadorWithEquipo | null>(null)
  const [editFormError, setEditFormError] = useState<string | null>(null)
  const [editFormSuccess, setEditFormSuccess] = useState<string | null>(null)
  
  // Estados para el modal de historial
  const [showHistorialModal, setShowHistorialModal] = useState(false)
  const [selectedJugadorForHistorial, setSelectedJugadorForHistorial] = useState<JugadorWithEquipo | null>(null)
  
  // Estados para el modal de confirmación de cambio de equipo
  const [showConfirmacionCambioEquipo, setShowConfirmacionCambioEquipo] = useState(false)
  const [pendingFormData, setPendingFormData] = useState<FormData | null>(null)
  const [equipoAnteriorInfo, setEquipoAnteriorInfo] = useState<{ nombre: string; categoria: string } | null>(null)
  const [equipoNuevoInfo, setEquipoNuevoInfo] = useState<{ nombre: string; categoria: string } | null>(null)
  
  // Estados para el modal de confirmación de impresión
  const [showConfirmacionImprimir, setShowConfirmacionImprimir] = useState(false)
  const [jugadoresMultiplesCategorias, setJugadoresMultiplesCategorias] = useState<Array<{cedula: string, nombre: string, categorias: string[]}>>([])
  const [jugadoresMultiplesEquipos, setJugadoresMultiplesEquipos] = useState<Array<{cedula: string, nombre: string, equipos: string[]}>>([])
  const [jugadoresParaImprimir, setJugadoresParaImprimir] = useState<JugadorWithEquipo[]>([])
  
  // Estado para el modal del manual de usuario
  const [showManualUsuario, setShowManualUsuario] = useState(false)
  
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
      return equiposCategorias
    }
    
    // Filtrar equipos-categorías que pertenecen a las categorías seleccionadas
    return equiposCategorias.filter(equipoCategoria => 
      selectedCategorias.includes(equipoCategoria.categoria.nombre)
    )
  }

  // Función para obtener categorías únicas de los equipos-categorías
  const getCategoriasUnicas = () => {
    const categoriasUnicas = new Set<string>()
    equiposCategorias.forEach(equipoCategoria => {
      if (equipoCategoria.categoria?.nombre) {
        categoriasUnicas.add(equipoCategoria.categoria.nombre)
      }
    })
    return Array.from(categoriasUnicas).sort()
  }
  
  // Estados para la funcionalidad de cámara
  const [showCamera, setShowCamera] = useState(false)
  const [showEditCamera, setShowEditCamera] = useState(false)
  const [capturedPhoto, setCapturedPhoto] = useState<Blob | null>(null)
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState<string | null>(null)
  const [editCapturedPhoto, setEditCapturedPhoto] = useState<Blob | null>(null)
  const [editCapturedPhotoUrl, setEditCapturedPhotoUrl] = useState<string | null>(null)
  
  // Estados para el formulario de crear jugador
  const [createFormData, setCreateFormData] = useState({
    cedula: '',
    apellido_nombre: '',
    nacionalidad: '',
    liga: '',
    fecha_nacimiento: '',
    sexo: '',
    telefono: '',
    provincia: '',
    direccion: '',
    observacion: '',
    estado: 'true',
    foraneo: false,
  })
  const [buscandoCedula, setBuscandoCedula] = useState(false)
  const [jugadorExistente, setJugadorExistente] = useState<any>(null)
  
  // Referencia para el canvas oculto
  const canvasRef = useRef<HTMLCanvasElement>(null)
  
  const columns = [
    {
      id: 'select',
      header: ({ table }: { table: TableType<JugadorWithEquipo> }) => (
        <FormCheck
          checked={table.getIsAllPageRowsSelected()}
          onChange={table.getToggleAllPageRowsSelectedHandler()}
          title="Seleccionar todos"
        />
      ),
      cell: ({ row }: { row: TableRow<JugadorWithEquipo> }) => (
        <FormCheck
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
          title="Seleccionar jugador"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
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
              <span 
                className="link-reset" 
                style={{ cursor: 'pointer' }}
                onClick={() => handleVerPerfilClick(row.original)}
                title="Ver historial del jugador"
              >
                {row.original.apellido_nombre}
              </span>
            </h5>
            <p className="text-muted fs-xs mb-0">Cédula: {row.original.cedula}</p>
          </div>
        </div>
      ),
    }),
    columnHelper.accessor('sexo', {
      header: 'Sexo',
      cell: ({ row }) => (
        <span className="badge bg-info-subtle text-info badge-label">
          {row.original.sexo || 'No especificado'}
        </span>
      ),
      enableHiding: true,
    }),
    {
      id: 'numero_jugador',
      header: 'Número',
      cell: ({ row }: { row: TableRow<JugadorWithEquipo> }) => {
        // Obtener el número de jugador de la relación jugador_equipo_categoria
        const relacionJugador = row.original.jugadoresEquipoCategoria?.[0] as any
        const numeroJugador = relacionJugador?.numero_jugador
        return (
          <span className="badge bg-primary-subtle text-primary badge-label">
            {numeroJugador || 'Sin número'}
          </span>
        )
      },
    },
    {
      id: 'situacion_jugador',
      header: 'Situación',
      cell: ({ row }: { row: TableRow<JugadorWithEquipo> }) => {
        // Obtener la situación del jugador de la relación jugador_equipo_categoria
        const relacionJugador = row.original.jugadoresEquipoCategoria?.[0] as any
        const situacion = relacionJugador?.situacion_jugador
        if (!situacion) return <span className="text-muted">-</span>
        // Normalizar PRESTAMO a PRÉSTAMO si viene de la base de datos
        const situacionNormalizada = situacion === 'PRESTAMO' || situacion === 'PRÉSTAMO' ? 'PRÉSTAMO' : situacion
        const variant = situacionNormalizada === 'PASE' ? 'success' : 'warning'
        return (
          <span className={`badge bg-${variant}-subtle text-${variant} badge-label`}>
            {situacionNormalizada}
          </span>
        )
      },
    },
    columnHelper.accessor('telefono', {
      header: 'Teléfono',
      cell: ({ row }) => row.original.telefono || 'Sin teléfono',
      enableHiding: true,
    }),
    columnHelper.accessor('foraneo', {
      header: 'Foráneo',
      cell: ({ row }) => (
        <span className={`badge ${row.original.foraneo ? 'bg-warning-subtle text-warning' : 'bg-secondary-subtle text-secondary'} badge-label`}>
          {row.original.foraneo ? 'Sí' : 'No'}
        </span>
      ),
    }),
    {
      id: 'categoria',
      header: 'Categoría',
      filterFn: categoriaFilterFn,
      enableColumnFilter: true,
      cell: ({ row }: { row: TableRow<JugadorWithEquipo> }) => {
        const categoria = row.original.jugadoresEquipoCategoria?.[0]?.equipoCategoria?.categoria
        return (
          <span className="badge p-1 text-bg-warning fs-sm">
            <LuTrophy className="me-1" /> {categoria?.nombre || 'Sin categoría'}
          </span>
        )
      },
    },
    {
      id: 'equipo',
      header: 'Equipo',
      filterFn: equipoFilterFn,
      enableColumnFilter: true,
      cell: ({ row }: { row: TableRow<JugadorWithEquipo> }) => {
        const equipo = row.original.jugadoresEquipoCategoria?.[0]?.equipoCategoria?.equipo
        return (
          <span className="badge p-1 text-bg-light fs-sm">
            {equipo?.nombre || 'Sin equipo'}
          </span>
        )
      },
    },
    {
      id: 'estado',
      header: 'Estado',
      filterFn: estadoFilterFn,
      enableColumnFilter: true,
      enableHiding: true,
      cell: ({ row }: { row: TableRow<JugadorWithEquipo> }) => (
        <span className={`badge ${row.original.estado ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'} badge-label`}>
          {row.original.estado ? 'Activo' : 'Inactivo'}
        </span>
      ),
    },
    {
      id: 'fecha_nacimiento',
      header: 'Fecha de Nacimiento',
      cell: ({ row }: { row: TableRow<JugadorWithEquipo> }) => {
        const fechaNacimiento = row.original.fecha_nacimiento
        if (!fechaNacimiento) return <span className="text-muted">-</span>
        return new Date(fechaNacimiento).toLocaleDateString('es-ES')
      },
    },
    {
      id: 'edad',
      header: 'Edad',
      cell: ({ row }: { row: TableRow<JugadorWithEquipo> }) => {
        const fechaNacimiento = row.original.fecha_nacimiento
        const categoria = row.original.jugadoresEquipoCategoria?.[0]?.equipoCategoria?.categoria
        if (!fechaNacimiento) return <span className="text-muted">-</span>
        try {
          const edad = calcularEdad(new Date(fechaNacimiento))
          const edadTexto = `${edad.anos} años${edad.meses > 0 ? ` ${edad.meses} meses` : ''}`
          
          // Verificar si es menor a la edad mínima de la categoría
          let esMenor = false
          if (categoria && categoria.edad_minima_anos !== null && categoria.edad_minima_meses !== null) {
            const rango = {
              edadMinimaAnos: categoria.edad_minima_anos,
              edadMinimaMeses: categoria.edad_minima_meses || 0,
              edadMaximaAnos: categoria.edad_maxima_anos || 0,
              edadMaximaMeses: categoria.edad_maxima_meses || 0
            }
            esMenor = esMenorALaEdadMinima(new Date(fechaNacimiento), rango)
          }
          
          return (
            <div className="d-flex align-items-center gap-2">
              <span className="badge bg-info-subtle text-info badge-label">
                {edadTexto}
              </span>
              {esMenor && (
                <span 
                  className="badge bg-warning-subtle text-warning badge-label" 
                  title="Jugador menor a la edad mínima de la categoría"
                >
                  JUVENIL
                </span>
              )}
            </div>
          )
        } catch {
          return <span className="text-muted">-</span>
        }
      },
    },
    columnHelper.accessor('createdAt', { 
      header: 'Fecha Creación',
      cell: ({ row }) => row.original.createdAt ? new Date(row.original.createdAt).toLocaleDateString('es-ES') : 'N/A'
    }),
    {
      header: 'Acciones',
      cell: ({ row }: { row: TableRow<JugadorWithEquipo> }) => {
        const jugador = row.original
        const tieneRelacion = jugador.jugadoresEquipoCategoria && jugador.jugadoresEquipoCategoria.length > 0
        
        return (
          <div className="d-flex gap-1">
            <Button 
              variant="light" 
              size="sm" 
              className="btn-icon rounded-circle"
              onClick={() => generarCarnetJugador(row.original)}
              title="Imprimir carnet de juego">
              <TbPrinter className="fs-lg" />
            </Button>
            {puedeEditar && (
              <Button 
                variant="light" 
                size="sm" 
                className="btn-icon rounded-circle"
                onClick={() => handleEditClick(row.original)}
                disabled={!tieneRelacion}
                title={tieneRelacion ? "Editar jugador" : "El jugador no tiene categoría ni equipo asignado"}>
                <TbEdit className="fs-lg" />
              </Button>
            )}
            {puedeEliminar && (
              <Button
                variant="light"
                size="sm"
                className="btn-icon rounded-circle"
                onClick={() => handleDeleteSingle(row.original)}
                disabled={!tieneRelacion}
                title={tieneRelacion ? "Eliminar jugador" : "El jugador no tiene categoría ni equipo asignado"}>
                <TbTrash className="fs-lg" />
              </Button>
            )}
            {!puedeEditar && !puedeEliminar && (
              <small className="text-muted">Sin acciones</small>
            )}
          </div>
        )
      },
    },
  ]

  const [globalFilter, setGlobalFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedEquipoCategoria, setSelectedEquipoCategoria] = useState<any>(null)
  const [selectedEditEquipoCategoria, setSelectedEditEquipoCategoria] = useState<any>(null)

  // Opciones para react-select
  const equipoCategoriaOptions = equiposCategorias.map((equipoCategoria) => ({
    value: equipoCategoria.id,
    label: `${equipoCategoria.equipo.nombre} - ${equipoCategoria.categoria.nombre}`,
    equipoCategoria: equipoCategoria
  }))
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 8 })
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    sexo: false,
    telefono: false,
    estado: false,
  })
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false)
  const [jugadorToDelete, setJugadorToDelete] = useState<JugadorWithEquipo | null>(null)

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter, columnFilters, pagination, rowSelection, columnVisibility },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: globalFilterFn,
    enableColumnFilters: true,
    enableRowSelection: true,
    // Generar una clave única combinando el ID del jugador y el ID de la relación
    getRowId: (row) => {
      const jugador = row as JugadorWithEquipo
      const relacionJugador = jugador.jugadoresEquipoCategoria?.[0] as any
      const relacionId = relacionJugador?.id
      return relacionId ? `${jugador.id}-${relacionId}` : jugador.id
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
    
    if (!puedeEliminar) {
      setError('No tienes permiso para eliminar jugadores')
      setShowDeleteModal(false)
      return
    }
    
    try {
      setLoading(true)
      
      if (jugadorToDelete) {
        const jugadorNombre = jugadorToDelete.apellido_nombre
        // Obtener el ID de la relación jugador_equipo_categoria
        const relacionJugador = jugadorToDelete.jugadoresEquipoCategoria?.[0] as any
        const relacionId = relacionJugador?.id
        await deleteJugador(jugadorToDelete.id, relacionId)
        setJugadorToDelete(null)
        setDeleteSuccess(`La relación del jugador "${jugadorNombre}" ha sido eliminada exitosamente`)
      }
      
      await loadData()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error al eliminar relación del jugador')
    } finally {
      setLoading(false)
      setShowDeleteModal(false)
    }
  }

  const handleEditClick = (jugador: JugadorWithEquipo) => {
    if (!puedeEditar) {
      setError('No tienes permiso para editar jugadores')
      return
    }
    
    // Establecer el equipo_categoria_id del primer equipo-categoría del jugador
    const jugadorConEquipoCategoria = {
      ...jugador,
      equipo_categoria_id: jugador.jugadoresEquipoCategoria?.[0]?.equipoCategoria?.id || null
    }
    
    setEditingJugador(jugadorConEquipoCategoria)
    setEditFormError(null)
    setEditFormSuccess(null)
    setEditCapturedPhoto(null)
    setEditCapturedPhotoUrl(null)
    
    // Establecer el valor inicial del react-select para edición
    const equipoCategoriaId = jugador.jugadoresEquipoCategoria?.[0]?.equipoCategoria?.id
    if (equipoCategoriaId) {
      const selectedOption = equipoCategoriaOptions.find(option => option.value === equipoCategoriaId)
      setSelectedEditEquipoCategoria(selectedOption || null)
    } else {
      setSelectedEditEquipoCategoria(null)
    }
    
    toggleEditModal()
  }

  const handleVerPerfilClick = (jugador: JugadorWithEquipo) => {
    setSelectedJugadorForHistorial(jugador)
    setShowHistorialModal(true)
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
    
    if (!puedeEditar) {
      setEditFormError('No tienes permiso para editar jugadores')
      return
    }
    
    // Agregar la foto si existe
    if (editCapturedPhoto) {
      formData.append('foto', editCapturedPhoto, 'jugador-foto.jpg')
    }
    
    // Obtener el equipo_categoria_id del formulario
    const nuevoEquipoCategoriaId = formData.get('equipo_categoria_id') as string
    const equipoCategoriaIdOriginal = editingJugador.jugadoresEquipoCategoria?.[0]?.equipoCategoria?.id
    
    // Verificar si el equipo cambió
    if (nuevoEquipoCategoriaId && equipoCategoriaIdOriginal && parseInt(nuevoEquipoCategoriaId) !== equipoCategoriaIdOriginal) {
      // Obtener información del equipo anterior
      const equipoAnterior = editingJugador.jugadoresEquipoCategoria?.[0]?.equipoCategoria
      const equipoAnteriorNombre = equipoAnterior?.equipo?.nombre || 'Sin equipo'
      const equipoAnteriorCategoria = equipoAnterior?.categoria?.nombre || 'Sin categoría'
      
      // Obtener información del nuevo equipo
      const nuevoEquipoCategoria = equipoCategoriaOptions.find(opt => opt.value === parseInt(nuevoEquipoCategoriaId))
      const equipoNuevoNombre = nuevoEquipoCategoria?.equipoCategoria?.equipo?.nombre || 'Sin equipo'
      const equipoNuevoCategoria = nuevoEquipoCategoria?.equipoCategoria?.categoria?.nombre || 'Sin categoría'
      
      // Guardar datos pendientes y mostrar modal de confirmación
      setPendingFormData(formData)
      setEquipoAnteriorInfo({ nombre: equipoAnteriorNombre, categoria: equipoAnteriorCategoria })
      setEquipoNuevoInfo({ nombre: equipoNuevoNombre, categoria: equipoNuevoCategoria })
      setShowConfirmacionCambioEquipo(true)
      return
    }
    
    // Si no cambió el equipo, proceder directamente
    await procederConActualizacion(formData)
  }
  
  const procederConActualizacion = async (formData: FormData) => {
    if (!editingJugador) return
    
    try {
      setLoading(true)
      setEditFormError(null)
      setEditFormSuccess(null)
      
      // Obtener el ID de la relación que se está editando
      const relacionJugador = editingJugador.jugadoresEquipoCategoria?.[0] as any
      const relacionId = relacionJugador?.id
      
      const result = await updateJugador(editingJugador.id, formData, relacionId)
      
      if (!result.success) {
        // Si hay un error, verificar si es de límite de jugadores
        const isLimitError = result.error?.includes('No se puede agregar más jugadores') || 
            result.error?.includes('límite máximo permitido') ||
            result.error?.includes('límite') ||
            result.error?.includes('jugadores permitidos')
        
        if (isLimitError) {
          // Mostrar como toast
          setTimeout(() => {
            if (toast.current) {
              toast.current.show({ 
                severity: 'warn', 
                summary: 'Límite de Jugadores', 
                detail: result.error || 'No se puede agregar más jugadores', 
                life: 6000 
              })
            } else {
              setEditFormError(result.error || 'Error al actualizar jugador')
            }
          }, 100)
        } else {
          setEditFormError(result.error || 'Error al actualizar jugador')
        }
        return
      }
      
      setEditFormSuccess('Jugador actualizado exitosamente')
      
      // Limpiar foto capturada
      setEditCapturedPhoto(null)
      setEditCapturedPhotoUrl(null)
      
      // Recargar datos después de un breve delay
      setTimeout(async () => {
        await loadData()
        setSelectedEditEquipoCategoria(null) // Limpiar react-select
        toggleEditModal()
        setEditingJugador(null)
      }, 1000)
    } catch (error) {
      // Error inesperado (no debería pasar si las Server Actions retornan correctamente)
      console.error('Error inesperado:', error)
      setEditFormError('Error inesperado al actualizar jugador')
    } finally {
      setLoading(false)
    }
  }
  
  const handleConfirmarCambioEquipo = async () => {
    if (pendingFormData) {
      setShowConfirmacionCambioEquipo(false)
      await procederConActualizacion(pendingFormData)
      setPendingFormData(null)
      setEquipoAnteriorInfo(null)
      setEquipoNuevoInfo(null)
    }
  }
  
  const handleCancelarCambioEquipo = () => {
    setShowConfirmacionCambioEquipo(false)
    setPendingFormData(null)
    setEquipoAnteriorInfo(null)
    setEquipoNuevoInfo(null)
  }

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      const [jugadoresData, equiposCategoriasData] = await Promise.all([
        getJugadores(),
        getEquiposCategorias()
      ])
      // Guardar todos los jugadores
      setAllData(jugadoresData)
      // Inicialmente mostrar solo los primeros 5 jugadores
      setData(jugadoresData.slice(0, 5))
      setEquiposCategorias(equiposCategoriasData)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error al cargar jugadores')
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    try {
      setRefreshing(true)
      setError(null)
      const [jugadoresData, equiposCategoriasData] = await Promise.all([
        getJugadores(),
        getEquiposCategorias()
      ])
      // Guardar todos los jugadores
      setAllData(jugadoresData)
      // Actualizar datos mostrados según filtros activos
      if (hasActiveFilters) {
        setData(jugadoresData)
      } else {
        setData(jugadoresData.slice(0, 5))
      }
      setEquiposCategorias(equiposCategoriasData)
      setFormSuccess('Tabla actualizada exitosamente')
      setTimeout(() => setFormSuccess(null), 3000)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error al actualizar jugadores')
    } finally {
      setRefreshing(false)
    }
  }

  // Detectar si hay filtros activos
  const hasActiveFilters = selectedCategorias.length > 0 || selectedEquipos.length > 0 || searchQuery.trim().length > 0

  // Actualizar datos mostrados según si hay filtros activos
  useEffect(() => {
    if (hasActiveFilters) {
      // Si hay filtros activos, mostrar todos los jugadores (el filtrado se hace en la tabla)
      setData(allData)
    } else {
      // Si no hay filtros, mostrar solo los primeros 5 jugadores
      setData(allData.slice(0, 5))
    }
  }, [hasActiveFilters, selectedCategorias, selectedEquipos, searchQuery, allData])

  // Resetear selección de filas cuando cambien los filtros o la búsqueda
  useEffect(() => {
    setRowSelection({})
  }, [selectedCategorias, selectedEquipos, searchQuery])

  // Debounce para la búsqueda local
  useEffect(() => {
    const timer = setTimeout(() => {
      // Usar el globalFilter de la tabla para filtrar localmente
      setGlobalFilter(searchQuery)
    }, 300) // 300ms de delay para respuesta más rápida

    return () => clearTimeout(timer)
  }, [searchQuery])

  const handleClearSearch = () => {
    setSearchQuery('')
    setGlobalFilter('')
  }

  const handleExportToExcel = async () => {
    try {
      // Obtener los jugadores filtrados de la tabla
      const jugadoresFiltrados = table.getFilteredRowModel().rows.map(row => row.original)
      
      if (jugadoresFiltrados.length === 0) {
        setError('No hay jugadores para exportar')
        return
      }

      // Crear un nuevo libro de trabajo
      const workbook = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet('Jugadores')

      // Agregar título
      worksheet.addRow(['LISTADO DE JUGADORES'])
      worksheet.addRow([])
      worksheet.addRow(['Generado el:', new Date().toLocaleString('es-ES')])
      worksheet.addRow(['Total de jugadores:', jugadoresFiltrados.length])
      worksheet.addRow([])

      // Agregar encabezados
      const headers = [
        'Cédula',
        'Apellido y Nombre',
        'Nacionalidad',
        'Liga',
        'Sexo',
        'Número',
        'Teléfono',
        'Provincia',
        'Dirección',
        'Foráneo',
        'Categoría',
        'Equipo',
        'Estado',
        'Fecha de Nacimiento',
        'Edad',
        'Observaciones'
      ]
      worksheet.addRow(headers)

      // Agregar datos
      jugadoresFiltrados.forEach(jugador => {
        const categoria = jugador.jugadoresEquipoCategoria?.[0]?.equipoCategoria?.categoria?.nombre || 'Sin categoría'
        const equipo = jugador.jugadoresEquipoCategoria?.[0]?.equipoCategoria?.equipo?.nombre || 'Sin equipo'
        const fechaNacimiento = jugador.fecha_nacimiento 
          ? new Date(jugador.fecha_nacimiento).toLocaleDateString('es-ES') 
          : ''
        const edad = jugador.fecha_nacimiento
          ? (() => {
              try {
                const edadCalculada = calcularEdad(new Date(jugador.fecha_nacimiento))
                return `${edadCalculada.anos} años${edadCalculada.meses > 0 ? ` ${edadCalculada.meses} meses` : ''}`
              } catch {
                return '-'
              }
            })()
          : '-'

        worksheet.addRow([
          jugador.cedula || '',
          jugador.apellido_nombre || '',
          jugador.nacionalidad || '',
          jugador.liga || '',
          jugador.sexo || 'No especificado',
          ((jugador.jugadoresEquipoCategoria?.[0] as any)?.numero_jugador) || 'Sin número',
          jugador.telefono || 'Sin teléfono',
          jugador.provincia || 'Sin provincia',
          jugador.direccion || '',
          jugador.foraneo ? 'Sí' : 'No',
          categoria,
          equipo,
          jugador.estado ? 'Activo' : 'Inactivo',
          fechaNacimiento,
          edad,
          jugador.observacion || ''
        ])
      })

      // Aplicar estilos
      // Título
      const titleCell = worksheet.getCell('A1')
      titleCell.font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } }
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } }
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
      worksheet.mergeCells('A1:O1')

      // Encabezados
      const headerRow = 6
      headers.forEach((header, colIndex) => {
        const cell = worksheet.getCell(headerRow, colIndex + 1)
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF374151' } }
        cell.alignment = { horizontal: 'center', vertical: 'middle' }
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        }
      })

      // Filas de datos con colores alternados
      for (let row = headerRow + 1; row <= worksheet.rowCount; row++) {
        for (let col = 1; col <= headers.length; col++) {
          const cell = worksheet.getCell(row, col)
          const isEvenRow = (row - headerRow) % 2 === 0
          cell.fill = { 
            type: 'pattern', 
            pattern: 'solid', 
            fgColor: { argb: isEvenRow ? 'FFF9FAFB' : 'FFFFFFFF' } 
          }
          cell.alignment = { 
            horizontal: col === 2 || col === 9 || col === 15 ? 'left' : 'center', 
            vertical: 'middle' 
          }
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
            bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
            left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
            right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
          }
        }
      }

      // Ajustar ancho de columnas
      worksheet.getColumn(1).width = 15  // Cédula
      worksheet.getColumn(2).width = 30 // Apellido y Nombre
      worksheet.getColumn(3).width = 15 // Nacionalidad
      worksheet.getColumn(4).width = 15 // Liga
      worksheet.getColumn(5).width = 12 // Sexo
      worksheet.getColumn(6).width = 10 // Número
      worksheet.getColumn(7).width = 15 // Teléfono
      worksheet.getColumn(8).width = 15 // Provincia
      worksheet.getColumn(9).width = 30 // Dirección
      worksheet.getColumn(10).width = 10 // Foráneo
      worksheet.getColumn(11).width = 20 // Categoría
      worksheet.getColumn(12).width = 25 // Equipo
      worksheet.getColumn(13).width = 12 // Estado
      worksheet.getColumn(14).width = 15 // Fecha de Nacimiento
      worksheet.getColumn(15).width = 15 // Edad
      worksheet.getColumn(16).width = 40 // Observaciones

      // Congelar la fila de encabezados
      worksheet.views = [{ state: 'frozen', ySplit: headerRow }]

      // Generar el archivo Excel
      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      })

      // Crear enlace de descarga
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      const fecha = new Date().toISOString().split('T')[0]
      link.download = `Jugadores_${fecha}.xlsx`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      setFormSuccess(`Excel descargado exitosamente. Total: ${jugadoresFiltrados.length} jugadores`)
    } catch (error) {
      console.error('Error al exportar a Excel:', error)
      setError('Error al exportar a Excel: ' + (error instanceof Error ? error.message : 'Error desconocido'))
    }
  }

  // Función para verificar jugadores antes de imprimir
  const handleVerificarYImprimir = async (jugadoresSeleccionados: JugadorWithEquipo[]) => {
    try {
      if (jugadoresSeleccionados.length === 0) {
        setError('No hay jugadores seleccionados para imprimir')
        setTimeout(() => setError(null), 5000)
        return
      }

      // Obtener las cédulas de los jugadores
      const cedulas = jugadoresSeleccionados.map(j => j.cedula).filter(Boolean) as string[]
      
      // Detectar jugadores con múltiples categorías o equipos
      const { jugadoresMultiplesCategorias: multiCategorias, jugadoresMultiplesEquipos: multiEquipos } = 
        await detectarJugadoresMultiplesCategoriasEquipos(cedulas)

      // Si hay jugadores con múltiples categorías o equipos, mostrar alerta
      if (multiCategorias.length > 0 || multiEquipos.length > 0) {
        setJugadoresMultiplesCategorias(multiCategorias)
        setJugadoresMultiplesEquipos(multiEquipos)
        setJugadoresParaImprimir(jugadoresSeleccionados)
        setShowConfirmacionImprimir(true)
        return
      }

      // Si no hay problemas, imprimir directamente
      await handleImprimir(jugadoresSeleccionados)
    } catch (error) {
      console.error('Error al verificar jugadores:', error)
      setError('Error al verificar jugadores: ' + (error instanceof Error ? error.message : 'Error desconocido'))
      setTimeout(() => setError(null), 5000)
    }
  }

  // Función para imprimir carnets (ahora recibe los jugadores como parámetro)
  const handleImprimir = async (jugadoresParaImprimir?: JugadorWithEquipo[]) => {
    try {
      const jugadores = jugadoresParaImprimir || []
      
      if (jugadores.length === 0) {
        setError('No hay jugadores para imprimir')
        setTimeout(() => setError(null), 5000)
        return
      }

      // Generar carnets múltiples
      await generarCarnetsMultiples(jugadores)
      
      // Cerrar modal de confirmación si estaba abierto
      setShowConfirmacionImprimir(false)
      setJugadoresMultiplesCategorias([])
      setJugadoresMultiplesEquipos([])
      setJugadoresParaImprimir([])
      
      setFormSuccess(`Carnets generados exitosamente. Total: ${jugadores.length} jugadores`)
      setTimeout(() => setFormSuccess(null), 3000)
    } catch (error) {
      console.error('Error al imprimir carnets:', error)
      setError('Error al imprimir carnets: ' + (error instanceof Error ? error.message : 'Error desconocido'))
      setTimeout(() => setError(null), 5000)
    }
  }

  // Buscar jugador por cédula al escribir
  const handleCedulaChange = (cedula: string) => {
    setCreateFormData({ ...createFormData, cedula })
  }

  // Buscar jugador por cédula (se ejecuta al salir del campo o presionar Enter)
  const handleCedulaBlur = async () => {
    const cedula = createFormData.cedula.trim()
    
    // Solo buscar si la cédula tiene al menos 3 caracteres
    if (cedula.length >= 3) {
      setBuscandoCedula(true)
      try {
        const jugador = await buscarJugadorPorCedula(cedula)
        if (jugador) {
          // Jugador existe - cargar datos
          setJugadorExistente(jugador)
          setCreateFormData({
            cedula: jugador.cedula,
            apellido_nombre: jugador.apellido_nombre || '',
            nacionalidad: jugador.nacionalidad || '',
            liga: jugador.liga || '',
            fecha_nacimiento: jugador.fecha_nacimiento ? new Date(jugador.fecha_nacimiento).toISOString().split('T')[0] : '',
            sexo: jugador.sexo || '',
            telefono: jugador.telefono || '',
            provincia: jugador.provincia || '',
            direccion: jugador.direccion || '',
            observacion: jugador.observacion || '',
            estado: jugador.estado ? 'true' : 'false',
            foraneo: jugador.foraneo || false,
          })
          // Cargar la foto del jugador si existe
          if (jugador.foto) {
            setCapturedPhotoUrl(jugador.foto)
            setCapturedPhoto(null) // No hay una foto nueva capturada, solo la existente
          } else {
            // Si no tiene foto, usar la imagen temporal
            const tempImage = getTempPlayerImage(jugador.id)
            setCapturedPhotoUrl(tempImage)
            setCapturedPhoto(null)
          }
          setFormSuccess('Jugador encontrado. Puede crear una nueva relación con diferente categoría.')
          setTimeout(() => setFormSuccess(null), 3000)
        } else {
          // Jugador no existe - limpiar datos
          setJugadorExistente(null)
          setCapturedPhotoUrl(null)
          setCapturedPhoto(null)
          setFormSuccess(null)
        }
      } catch (err) {
        console.error('Error al buscar jugador:', err)
        setJugadorExistente(null)
        setCapturedPhotoUrl(null)
        setCapturedPhoto(null)
      } finally {
        setBuscandoCedula(false)
      }
    }
  }

  // Buscar al presionar Enter en el campo de cédula
  const handleCedulaKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleCedulaBlur()
    }
  }

  const handleCreateJugador = async (formData: FormData) => {
    if (!puedeCrear) {
      setFormError('No tienes permiso para crear jugadores')
      return
    }
    
    try {
      setLoading(true)
      setFormError(null)
      setFormSuccess(null)
      
      // Agregar equipo_categoria_id del select (react-select no está en el FormData automáticamente)
      if (selectedEquipoCategoria?.value) {
        formData.append('equipo_categoria_id', selectedEquipoCategoria.value.toString())
      }
      
      // Agregar la foto si existe
      if (capturedPhoto) {
        formData.append('foto', capturedPhoto, 'jugador-foto.jpg')
      }
      
      // Si el jugador existe, pasar su ID para que solo cree la relación
      if (jugadorExistente) {
        formData.append('jugador_existente_id', jugadorExistente.id)
      }
      
      const result = await createJugador(formData)
      
      if (!result.success) {
        // Si hay un error, verificar si es de límite de jugadores
        const isLimitError = result.error?.includes('No se puede agregar más jugadores') || 
            result.error?.includes('límite máximo permitido') ||
            result.error?.includes('límite') ||
            result.error?.includes('jugadores permitidos')
        
        if (isLimitError) {
          // Mostrar como toast
          setTimeout(() => {
            if (toast.current) {
              toast.current.show({ 
                severity: 'warn', 
                summary: 'Límite de Jugadores', 
                detail: result.error || 'No se puede agregar más jugadores', 
                life: 6000 
              })
            } else {
              setFormError(result.error || 'Error al crear jugador')
            }
          }, 100)
        } else {
          setFormError(result.error || 'Error al crear jugador')
        }
        // NO limpiar el formulario ni recargar datos cuando hay error
        // Mantener los valores seleccionados para que el usuario pueda corregir
        return
      }
      
      setFormSuccess('Jugador creado exitosamente')
      
      // Solo limpiar cuando la operación fue exitosa
      setCapturedPhoto(null)
      setCapturedPhotoUrl(null)
      setJugadorExistente(null)
      setCreateFormData({
        cedula: '',
        apellido_nombre: '',
        nacionalidad: '',
        liga: '',
        fecha_nacimiento: '',
        sexo: '',
        telefono: '',
        provincia: '',
        direccion: '',
        observacion: '',
        estado: 'true',
        foraneo: false,
      })
      
      // Recargar datos después de un breve delay
      setTimeout(async () => {
        await loadData()
        setSelectedEquipoCategoria(null) // Limpiar react-select
        toggleCreateModal()
      }, 1000)
    } catch (error) {
      // Error inesperado (no debería pasar si las Server Actions retornan correctamente)
      console.error('Error inesperado:', error)
      setFormError('Error inesperado al crear jugador')
      // NO limpiar el formulario cuando hay error inesperado
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

  if (cargandoPermisos) {
    return (
      <Container fluid>
        <PageBreadcrumb title="Jugadores" subtitle="Apps" />
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
        <PageBreadcrumb title="Jugadores" subtitle="Apps" />
        <Row className="justify-content-center">
          <Col xxl={8}>
            <Alert variant="danger" className="mt-4">
              <Alert.Heading>❌ Acceso Denegado</Alert.Heading>
              <p className="mb-0">
                No tienes permisos para acceder a esta página.
                <br />
                <small className="text-muted">Contacta al administrador para solicitar acceso al módulo de Jugadores.</small>
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
    <>
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
              <h3 className="mb-0 fs-xl flex-grow-1">
                {hasActiveFilters ? table.getFilteredRowModel().rows.length : allData.length} Jugadores
                {!hasActiveFilters && allData.length > 5 && (
                  <small className="text-muted ms-2">(mostrando 5 de {allData.length})</small>
                )}
              </h3>
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
                {Object.keys(rowSelection).length > 0 && (
                  <Button 
                    variant="warning" 
                    className="ms-1" 
                    onClick={async () => {
                      const selectedJugadores = table.getSelectedRowModel().rows.map(row => row.original)
                      await handleVerificarYImprimir(selectedJugadores)
                    }}
                    title="Imprimir carnets de jugadores seleccionados"
                  >
                    <TbPrinter className="fs-sm me-2" /> 
                    <span className="d-none d-sm-inline">Imprimir ({Object.keys(rowSelection).length})</span>
                    <span className="d-sm-none">Imprimir</span>
                  </Button>
                )}
                <Button 
                  variant="success" 
                  className="ms-1" 
                  onClick={handleExportToExcel}
                  disabled={table.getFilteredRowModel().rows.length === 0}
                  title="Descargar jugadores filtrados en Excel"
                >
                  <LuDownload className="fs-sm me-2" /> 
                  <span className="d-none d-sm-inline">Descargar Excel</span>
                  <span className="d-sm-none">Excel</span>
                </Button>
                <Button 
                  variant="info" 
                  className="ms-1" 
                  onClick={handleRefresh}
                  disabled={refreshing || loading}
                  title="Actualizar tabla de jugadores"
                >
                  <LuRefreshCw 
                    className="fs-sm me-2" 
                    style={refreshing ? { animation: 'spin 1s linear infinite' } : {}} 
                  /> 
                  <span className="d-none d-sm-inline">Actualizar</span>
                  <span className="d-sm-none">Refrescar</span>
                </Button>
                {puedeCrear ? (
                  <Button variant="danger" className="ms-1" onClick={toggleCreateModal}>
                    <TbPlus className="fs-sm me-2" /> Agregar Jugador
                  </Button>
                ) : (
                  <Button variant="secondary" className="ms-1" disabled title="No tienes permiso para crear jugadores">
                    <TbPlus className="fs-sm me-2" /> Agregar Jugador
                  </Button>
                )}
                <Button 
                  variant="outline-info" 
                  className="ms-1" 
                  onClick={() => setShowManualUsuario(true)}
                  title="Manual de Usuario"
                >
                  <TbHelp className="fs-sm me-2" />
                  <span className="d-none d-sm-inline">Ayuda</span>
                </Button>
              </div>
            </div>

            {/* Filtros superiores - Solo visible en escritorio */}
            <div className="d-none d-lg-block">
              <Row className="g-2 align-items-end">
                <Col lg={4}>
                  <label className="form-label fw-semibold mb-1">Buscar Jugador</label>
                  <div className="position-relative">
                    <FormControl
                      type="text"
                      placeholder="Buscar por nombre o cédula..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="ps-5"
                    />
                    <LuSearch className="position-absolute top-50 translate-middle-y ms-2" style={{ left: '0.5rem' }} />
                  </div>
                </Col>
                <Col lg={4}>
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
                    {getCategoriasUnicas().map((categoria) => (
                      <option key={categoria} value={categoria}>
                        {categoria}
                      </option>
                    ))}
                  </FormSelect>
                </Col>
                <Col lg={4}>
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
                    {getFilteredEquipos().map((equipoCategoria) => (
                      <option key={equipoCategoria.id} value={equipoCategoria.equipo.nombre}>
                        {equipoCategoria.equipo.nombre}
                      </option>
                    ))}
                  </FormSelect>
                </Col>
              </Row>
              
              {/* Botón para limpiar todos los filtros */}
              {(selectedCategorias.length > 0 || selectedEquipos.length > 0 || globalFilter || searchQuery) && (
                <div className="mt-2">
                  <Button 
                    variant="link" 
                    size="sm" 
                    className="p-0 text-decoration-none"
                    onClick={() => {
                      setSelectedCategorias([])
                      setSelectedEquipos([])
                      setGlobalFilter('')
                      setSearchQuery('')
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
                  placeholder="Buscar por nombre o cédula..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
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
                {getCategoriasUnicas().map((categoria) => (
                  <option key={categoria} value={categoria}>
                    {categoria}
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
                {getFilteredEquipos().map((equipoCategoria) => (
                  <option key={equipoCategoria.id} value={equipoCategoria.equipo.nombre}>
                    {equipoCategoria.equipo.nombre}
                  </option>
                ))}
              </FormSelect>
            </div>
            
            {/* Botón para limpiar filtros en móvil */}
            {(selectedCategorias.length > 0 || selectedEquipos.length > 0 || globalFilter || searchQuery) && (
              <div className="mt-3">
                <Button 
                  variant="outline-secondary" 
                  size="sm" 
                  className="w-100"
                  onClick={() => {
                    setSelectedCategorias([])
                    setSelectedEquipos([])
                    setGlobalFilter('')
                    setSearchQuery('')
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
                        // Usar una clave única combinando el ID del jugador y el ID de la relación
                        const relacionJugador = jugador.jugadoresEquipoCategoria?.[0] as any
                        const uniqueKey = relacionJugador?.id 
                          ? `${jugador.id}-${relacionJugador.id}` 
                          : jugador.id
                        const tieneRelacion = jugador.jugadoresEquipoCategoria && jugador.jugadoresEquipoCategoria.length > 0
                    return (
                      <Col className="col mb-4" key={uniqueKey} style={{ padding: '0 15px' }}>
                        <div className="profile-card-container" style={{ height: '400px', width: '100%' }}>
                          <div className="position-relative">
                            <ProfileCard
                              name={jugador.apellido_nombre}
                              title={jugador.jugadoresEquipoCategoria?.[0]?.equipoCategoria?.categoria?.nombre || 'Sin categoría'}
                              handle={jugador.jugadoresEquipoCategoria?.[0]?.equipoCategoria?.equipo?.nombre || 'Sin equipo'}
                              status={jugador.estado ? 'Activo' : 'Inactivo'}
                              avatarUrl={jugador.foto || getTempPlayerImage(jugador.id)}
                              showUserInfo={true}
                              enableTilt={true}
                              enableMobileTilt={false}
                              onContactClick={() => handleVerPerfilClick(jugador)}
                              contactText="Ver Perfil"
                              onEditClick={tieneRelacion ? () => handleEditClick(jugador) : undefined}
                              onDeleteClick={tieneRelacion ? () => handleDeleteSingle(jugador) : undefined}
                              showActionButtons={true}
                              className="h-100"
                            />
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
                        // Usar una clave única combinando el ID del jugador y el ID de la relación
                        const relacionJugador = jugador.jugadoresEquipoCategoria?.[0] as any
                        const uniqueKey = relacionJugador?.id 
                          ? `${jugador.id}-${relacionJugador.id}` 
                          : jugador.id
                        const tieneRelacion = jugador.jugadoresEquipoCategoria && jugador.jugadoresEquipoCategoria.length > 0
                        return (
                          <SwiperSlide key={uniqueKey}>
                            <div className="mobile-profile-card-container" style={{ padding: '0 20px' }}>
                              <div className="position-relative">
                                <ProfileCard
                                  name={jugador.apellido_nombre}
                                  title={jugador.jugadoresEquipoCategoria?.[0]?.equipoCategoria?.categoria?.nombre || 'Sin categoría'}
                                  handle={jugador.jugadoresEquipoCategoria?.[0]?.equipoCategoria?.equipo?.nombre || 'Sin equipo'}
                                  status={jugador.estado ? 'Activo' : 'Inactivo'}
                                  avatarUrl={jugador.foto || getTempPlayerImage(jugador.id)}
                                  showUserInfo={true}
                                  enableTilt={false}
                                  enableMobileTilt={false}
                                  onContactClick={() => handleVerPerfilClick(jugador)}
                                  contactText="Ver Perfil"
                                  onEditClick={tieneRelacion ? () => handleEditClick(jugador) : undefined}
                                  onDeleteClick={tieneRelacion ? () => handleDeleteSingle(jugador) : undefined}
                                  showActionButtons={true}
                                  className="h-100"
                                />
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
      <ConfirmationModal
        show={showDeleteModal}
        onHide={toggleDeleteModal}
        onConfirm={handleDelete}
        selectedCount={1}
        itemName="jugador"
        variant="danger"
        isLoading={loading}
        showBadgeDesign={false}
        itemToDelete={jugadorToDelete?.apellido_nombre}
      />

      {/* Modal para Crear Jugador */}
      <Modal 
        show={showCreateModal} 
        onHide={() => {
          toggleCreateModal()
          // Limpiar formulario al cerrar
          setCreateFormData({
            cedula: '',
            apellido_nombre: '',
            nacionalidad: '',
            liga: '',
            fecha_nacimiento: '',
            sexo: '',
            telefono: '',
            provincia: '',
            direccion: '',
            observacion: '',
            estado: 'true',
            foraneo: false,
          })
          setJugadorExistente(null)
          setCapturedPhoto(null)
          setCapturedPhotoUrl(null)
          setSelectedEquipoCategoria(null)
        }} 
        size="lg" 
        centered
      >
        <ModalHeader closeButton>
          <ModalTitle>Agregar Nuevo Jugador</ModalTitle>
        </ModalHeader>
        <ModalBody>
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
          
          <Form onSubmit={(e) => {
            e.preventDefault()
            const formData = new FormData(e.currentTarget)
            handleCreateJugador(formData)
          }}>
            <Row className="g-2">
              <Col lg={4}>
                <FloatingLabel label="Cédula" className="position-relative">
                  <FormControl 
                    type="text" 
                    name="cedula" 
                    placeholder="Ingrese la cédula y presione Tab o Enter" 
                    value={createFormData.cedula}
                    onChange={(e) => handleCedulaChange(e.target.value)}
                    onBlur={handleCedulaBlur}
                    onKeyDown={handleCedulaKeyDown}
                    required 
                    disabled={buscandoCedula}
                    className={buscandoCedula ? 'pe-5' : ''}
                  />
                  {buscandoCedula && (
                    <div className="position-absolute top-50 end-0 translate-middle-y pe-3" style={{ zIndex: 10, pointerEvents: 'none' }}>
                      <Spinner animation="border" size="sm" />
                    </div>
                  )}
                </FloatingLabel>
              </Col>

              <Col lg={4}>
                <FloatingLabel label="Apellido y Nombre">
                  <FormControl 
                    type="text" 
                    name="apellido_nombre" 
                    placeholder="Ingrese apellido y nombre" 
                    value={createFormData.apellido_nombre}
                    onChange={(e) => setCreateFormData({ ...createFormData, apellido_nombre: e.target.value })}
                    required 
                  />
                </FloatingLabel>
              </Col>

              <Col lg={4}>
                <FloatingLabel label="Nacionalidad">
                  <FormSelect 
                    name="nacionalidad" 
                    value={createFormData.nacionalidad}
                    onChange={(e) => setCreateFormData({ ...createFormData, nacionalidad: e.target.value })}
                    required
                  >
                    <option value="">Seleccionar...</option>
                    <option value="Ecuatoriana">Ecuatoriana</option>
                    <option value="Colombiana">Colombiana</option>
                    <option value="Venezolana">Venezolana</option>
                    <option value="Peruana">Peruana</option>
                    <option value="Boliviana">Boliviana</option>
                    <option value="Chilena">Chilena</option>
                    <option value="Argentina">Argentina</option>
                    <option value="Otros">Otros</option>
                  </FormSelect>
                </FloatingLabel>
              </Col>
              
              {/* Campo oculto para liga con valor por defecto */}
              <input type="hidden" name="liga" value="ATAHUALPA" />

              <Col lg={4}>
                <FloatingLabel label="Fecha de Nacimiento">
                  <FormControl 
                    type="date" 
                    name="fecha_nacimiento" 
                    placeholder="Seleccione la fecha de nacimiento"
                    value={createFormData.fecha_nacimiento}
                    onChange={(e) => setCreateFormData({ ...createFormData, fecha_nacimiento: e.target.value })}
                    required
                  />
                </FloatingLabel>
              </Col>

              <Col lg={4}>
                <FloatingLabel label="Edad">
                  <FormControl 
                    type="text" 
                    readOnly
                    value={
                      createFormData.fecha_nacimiento 
                        ? (() => {
                            try {
                              const edad = calcularEdad(new Date(createFormData.fecha_nacimiento))
                              return `${edad.anos} años${edad.meses > 0 ? ` ${edad.meses} meses` : ''}`
                            } catch {
                              return '-'
                            }
                          })()
                        : '-'
                    }
                    className="bg-light"
                  />
                </FloatingLabel>
              </Col>

              <Col lg={4}>
                <FloatingLabel label="Sexo">
                  <FormSelect 
                    name="sexo"
                    value={createFormData.sexo}
                    onChange={(e) => setCreateFormData({ ...createFormData, sexo: e.target.value })}
                  >
                    <option value="">Seleccionar...</option>
                    <option value="masculino">Masculino</option>
                    <option value="femenino">Femenino</option>
                    <option value="otro">Otro</option>
                  </FormSelect>
                </FloatingLabel>
              </Col>

              <Col lg={4}>
                <FloatingLabel label="Número de Jugador *" className="fw-bold">
                  <FormControl 
                    type="number" 
                    name="numero_jugador" 
                    placeholder="Número de camiseta" 
                    min="1" 
                    max="99"
                    className="border-primary border-2"
                    style={{ fontSize: '1.1rem', fontWeight: '600' }}
                  />
                </FloatingLabel>
              </Col>

              <Col lg={4}>
                <FloatingLabel label="Situación Jugador">
                  <FormSelect name="situacion_jugador" required>
                    <option value="">Seleccionar...</option>
                    <option value="PASE">PASE</option>
                    <option value="PRÉSTAMO">PRÉSTAMO</option>
                  </FormSelect>
                </FloatingLabel>
              </Col>

              <Col lg={4}>
                <FloatingLabel label="Teléfono">
                  <FormControl 
                    type="tel" 
                    name="telefono" 
                    placeholder="Número de teléfono"
                    value={createFormData.telefono}
                    onChange={(e) => setCreateFormData({ ...createFormData, telefono: e.target.value })}
                  />
                </FloatingLabel>
              </Col>

              <Col lg={4}>
                <FloatingLabel label="Provincia">
                  <FormControl 
                    type="text" 
                    name="provincia" 
                    placeholder="Provincia de residencia"
                    value={createFormData.provincia}
                    onChange={(e) => setCreateFormData({ ...createFormData, provincia: e.target.value })}
                  />
                </FloatingLabel>
              </Col>

              <Col lg={4}>
                <FloatingLabel label="Dirección">
                  <FormControl 
                    type="text" 
                    name="direccion" 
                    placeholder="Dirección de residencia"
                    value={createFormData.direccion}
                    onChange={(e) => setCreateFormData({ ...createFormData, direccion: e.target.value })}
                  />
                </FloatingLabel>
              </Col>

              <Col lg={4}>
                
                <Select
                  value={selectedEquipoCategoria}
                  onChange={(selectedOption) => setSelectedEquipoCategoria(selectedOption)}
                  options={equipoCategoriaOptions}
                  placeholder="Seleccionar equipo-categoría..."
                  isSearchable
                  maxMenuHeight={300}
                  className="react-select-container"
                  classNamePrefix="react-select"
                  name="equipo_categoria_id"
                  required
                />
                <input
                  type="hidden"
                  name="equipo_categoria_id"
                  value={selectedEquipoCategoria?.value || ''}
                  required
                />
              </Col>

              <Col lg={4}>
                <FloatingLabel label="Estado">
                  <FormSelect 
                    name="estado"
                    value={createFormData.estado}
                    onChange={(e) => setCreateFormData({ ...createFormData, estado: e.target.value })}
                  >
                    <option value="true">Activo</option>
                    <option value="false">Inactivo</option>
                  </FormSelect>
                </FloatingLabel>
              </Col>

              <Col lg={6}>
                <FloatingLabel label="Observaciones">
                  <FormControl 
                    as="textarea" 
                    name="observacion" 
                    placeholder="Observaciones del jugador"
                    value={createFormData.observacion}
                    onChange={(e) => setCreateFormData({ ...createFormData, observacion: e.target.value })}
                    style={{ height: '60px' }}
                  />
                </FloatingLabel>
              </Col>

              <Col lg={2} className="d-flex align-items-end">
                <div className="form-check w-100">
                  <FormCheck
                    type="checkbox"
                    name="foraneo"
                    value="true"
                    id="foraneo"
                    checked={createFormData.foraneo}
                    onChange={(e) => setCreateFormData({ ...createFormData, foraneo: e.target.checked })}
                    label="Foráneo"
                  />
                </div>
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
                  <Button 
                    variant="light" 
                    onClick={() => {
                      toggleCreateModal()
                      // Limpiar formulario al cancelar
                      setCreateFormData({
                        cedula: '',
                        apellido_nombre: '',
                        nacionalidad: '',
                        liga: '',
                        fecha_nacimiento: '',
                        sexo: '',
                        telefono: '',
                        provincia: '',
                        direccion: '',
                        observacion: '',
                        estado: 'true',
                        foraneo: false,
                      })
                      setJugadorExistente(null)
                      setCapturedPhoto(null)
                      setCapturedPhotoUrl(null)
                      setSelectedEquipoCategoria(null)
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button variant="success" type="submit">
                    Crear Jugador
                  </Button>
                </div>
              </Col>
            </Row>
          </Form>
        </ModalBody>
      </Modal>

      {/* Modal para Editar Jugador */}
      <Modal show={showEditModal} onHide={toggleEditModal} size="lg" centered>
        <ModalHeader closeButton>
          <ModalTitle>Editar Jugador</ModalTitle>
        </ModalHeader>
        <ModalBody>
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
              <Row className="g-2">
                <Col lg={4}>
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

                <Col lg={4}>
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

                <Col lg={4}>
                  <FloatingLabel label="Nacionalidad">
                    <FormSelect name="nacionalidad" defaultValue={editingJugador.nacionalidad || ''} required>
                      <option value="">Seleccionar...</option>
                      <option value="Ecuatoriana">Ecuatoriana</option>
                      <option value="Colombiana">Colombiana</option>
                      <option value="Venezolana">Venezolana</option>
                      <option value="Peruana">Peruana</option>
                      <option value="Boliviana">Boliviana</option>
                      <option value="Chilena">Chilena</option>
                      <option value="Argentina">Argentina</option>
                      <option value="Otros">Otros</option>
                    </FormSelect>
                  </FloatingLabel>
                </Col>
                
                {/* Campo oculto para liga con valor por defecto */}
                <input type="hidden" name="liga" value={editingJugador.liga || 'ATAHUALPA'} />

                <Col lg={4}>
                  <FloatingLabel label="Fecha de Nacimiento">
                    <FormControl 
                      type="date" 
                      name="fecha_nacimiento" 
                      placeholder="Seleccione la fecha de nacimiento"
                      defaultValue={editingJugador.fecha_nacimiento ? new Date(editingJugador.fecha_nacimiento).toISOString().split('T')[0] : ''}
                      onChange={(e) => {
                        // Actualizar la edad cuando cambie la fecha
                        const fechaNacimiento = e.target.value
                        const edadInput = document.querySelector('input[name="edad_display"]') as HTMLInputElement
                        if (edadInput && fechaNacimiento) {
                          try {
                            const edad = calcularEdad(new Date(fechaNacimiento))
                            edadInput.value = `${edad.anos} años${edad.meses > 0 ? ` ${edad.meses} meses` : ''}`
                          } catch {
                            if (edadInput) edadInput.value = '-'
                          }
                        } else if (edadInput) {
                          edadInput.value = '-'
                        }
                      }}
                      required
                    />
                  </FloatingLabel>
                </Col>

                <Col lg={4}>
                  <FloatingLabel label="Edad">
                    <FormControl 
                      type="text" 
                      name="edad_display"
                      readOnly
                      defaultValue={
                        editingJugador.fecha_nacimiento 
                          ? (() => {
                              try {
                                const edad = calcularEdad(new Date(editingJugador.fecha_nacimiento))
                                return `${edad.anos} años${edad.meses > 0 ? ` ${edad.meses} meses` : ''}`
                              } catch {
                                return '-'
                              }
                            })()
                          : '-'
                      }
                      className="bg-light"
                    />
                  </FloatingLabel>
                </Col>

                <Col lg={4}>
                  <FloatingLabel label="Sexo">
                    <FormSelect name="sexo" defaultValue={editingJugador.sexo || ''}>
                      <option value="">Seleccionar...</option>
                      <option value="masculino">Masculino</option>
                      <option value="femenino">Femenino</option>
                      <option value="otro">Otro</option>
                    </FormSelect>
                  </FloatingLabel>
                </Col>

                <Col lg={4}>
                  <FloatingLabel label="Número de Jugador *" className="fw-bold">
                    <FormControl 
                      type="number" 
                      name="numero_jugador" 
                      placeholder="Número de camiseta" 
                      min="1" 
                      max="99"
                      defaultValue={(editingJugador.jugadoresEquipoCategoria?.[0] as any)?.numero_jugador || ''}
                      className="border-primary border-2"
                      style={{ fontSize: '1.1rem', fontWeight: '600' }}
                    />
                  </FloatingLabel>
                </Col>

                <Col lg={4}>
                  <FloatingLabel label="Situación Jugador">
                    <FormSelect 
                      name="situacion_jugador"
                      required
                      defaultValue={(() => {
                        const situacion = (editingJugador.jugadoresEquipoCategoria?.[0] as any)?.situacion_jugador
                        if (!situacion) return ''
                        // Normalizar PRESTAMO a PRÉSTAMO
                        return situacion === 'PRESTAMO' || situacion === 'PRÉSTAMO' ? 'PRÉSTAMO' : situacion
                      })()}
                    >
                      <option value="">Seleccionar...</option>
                      <option value="PASE">PASE</option>
                      <option value="PRÉSTAMO">PRÉSTAMO</option>
                    </FormSelect>
                  </FloatingLabel>
                </Col>

                <Col lg={4}>
                  <FloatingLabel label="Teléfono">
                    <FormControl 
                      type="tel" 
                      name="telefono" 
                      placeholder="Número de teléfono"
                      defaultValue={editingJugador.telefono || ''}
                    />
                  </FloatingLabel>
                </Col>

                <Col lg={4}>
                  <FloatingLabel label="Provincia">
                    <FormControl 
                      type="text" 
                      name="provincia" 
                      placeholder="Provincia de residencia"
                      defaultValue={editingJugador.provincia || ''}
                    />
                  </FloatingLabel>
                </Col>

                <Col lg={4}>
                  <FloatingLabel label="Dirección">
                    <FormControl 
                      type="text" 
                      name="direccion" 
                      placeholder="Dirección de residencia"
                      defaultValue={editingJugador.direccion || ''}
                    />
                  </FloatingLabel>
                </Col>

                <Col lg={4}>
                  
                  <Select
                    value={selectedEditEquipoCategoria}
                    onChange={(selectedOption) => setSelectedEditEquipoCategoria(selectedOption)}
                    options={equipoCategoriaOptions}
                    placeholder="Seleccionar equipo-categoría..."
                    isSearchable
                    maxMenuHeight={300}
                    className="react-select-container"
                    classNamePrefix="react-select"
                    name="equipo_categoria_id"
                    required
                  />
                  <input
                    type="hidden"
                    name="equipo_categoria_id"
                    value={selectedEditEquipoCategoria?.value || ''}
                    required
                  />
                </Col>

                <Col lg={4}>
                  <FloatingLabel label="Estado">
                    <FormSelect name="estado" defaultValue={(editingJugador.estado ?? true).toString()}>
                      <option value="true">Activo</option>
                      <option value="false">Inactivo</option>
                    </FormSelect>
                  </FloatingLabel>
                </Col>

                <Col lg={6}>
                  <FloatingLabel label="Observaciones">
                    <FormControl 
                      as="textarea" 
                      name="observacion" 
                      placeholder="Observaciones del jugador" 
                      style={{ height: '60px' }}
                      defaultValue={editingJugador.observacion || ''}
                    />
                  </FloatingLabel>
                </Col>

                <Col lg={2} className="d-flex align-items-end">
                  <div className="form-check w-100">
                    <FormCheck
                      type="checkbox"
                      name="foraneo"
                      value="true"
                      id="foraneo_edit"
                      label="Foráneo"
                      defaultChecked={editingJugador.foraneo || false}
                    />
                  </div>
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
                    <Button variant="light" onClick={toggleEditModal}>
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
        </ModalBody>
      </Modal>

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

      {/* Modal de historial del jugador */}
      {selectedJugadorForHistorial && (
        <HistorialJugadorModal
          show={showHistorialModal}
          onHide={() => {
            setShowHistorialModal(false)
            setSelectedJugadorForHistorial(null)
          }}
          jugadorId={selectedJugadorForHistorial.id as string}
          jugadorNombre={selectedJugadorForHistorial.apellido_nombre}
        />
      )}

      {/* Modal de Confirmación para Imprimir */}
      <Modal show={showConfirmacionImprimir} onHide={() => setShowConfirmacionImprimir(false)} size="lg" centered>
        <ModalHeader closeButton>
          <ModalTitle>Confirmar Impresión</ModalTitle>
        </ModalHeader>
        <ModalBody>
          <Alert variant="warning" className="mb-3">
            <strong>Advertencia:</strong> Se han detectado jugadores que se encuentran en más de una categoría o equipo.
          </Alert>

          {jugadoresMultiplesCategorias.length > 0 && (
            <div className="mb-4">
              <h6 className="text-danger mb-2">
                <strong>Jugadores en múltiples categorías ({jugadoresMultiplesCategorias.length}):</strong>
              </h6>
              <div className="table-responsive" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                <table className="table table-sm table-bordered">
                  <thead className="table-light">
                    <tr>
                      <th>Cédula</th>
                      <th>Nombre</th>
                      <th>Categorías</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jugadoresMultiplesCategorias.map((jugador, idx) => (
                      <tr key={idx}>
                        <td>{jugador.cedula}</td>
                        <td>{jugador.nombre}</td>
                        <td>
                          <ul className="mb-0">
                            {jugador.categorias.map((cat, catIdx) => (
                              <li key={catIdx}>{cat}</li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {jugadoresMultiplesEquipos.length > 0 && (
            <div className="mb-3">
              <h6 className="text-danger mb-2">
                <strong>Jugadores en múltiples equipos ({jugadoresMultiplesEquipos.length}):</strong>
              </h6>
              <div className="table-responsive" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                <table className="table table-sm table-bordered">
                  <thead className="table-light">
                    <tr>
                      <th>Cédula</th>
                      <th>Nombre</th>
                      <th>Equipos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jugadoresMultiplesEquipos.map((jugador, idx) => (
                      <tr key={idx}>
                        <td>{jugador.cedula}</td>
                        <td>{jugador.nombre}</td>
                        <td>
                          <ul className="mb-0">
                            {jugador.equipos.map((equipo, eqIdx) => (
                              <li key={eqIdx}>{equipo}</li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <Alert variant="info" className="mb-0">
            <strong>¿Desea continuar con la impresión?</strong> Los carnets de los jugadores listados serán generados.
          </Alert>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="secondary"
            onClick={() => {
              setShowConfirmacionImprimir(false)
              setJugadoresMultiplesCategorias([])
              setJugadoresMultiplesEquipos([])
              setJugadoresParaImprimir([])
            }}
          >
            <TbX className="me-1" />
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={async () => {
              if (jugadoresParaImprimir.length > 0) {
                await handleImprimir(jugadoresParaImprimir)
              }
            }}
          >
            <TbPrinter className="me-1" />
            Continuar con la Impresión
          </Button>
        </ModalFooter>
      </Modal>

      {/* Modal de Manual de Usuario */}
      <Modal show={showManualUsuario} onHide={() => setShowManualUsuario(false)} size="lg" centered>
        <ModalHeader closeButton>
          <ModalTitle>
            <TbHelp className="me-2" />
            Manual de Usuario - Gestión de Jugadores
          </ModalTitle>
        </ModalHeader>
        <ModalBody style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          <div className="manual-content">
            <Alert variant="info" className="mb-4">
              <strong>Bienvenido al Manual de Usuario</strong>
              <br />
              <small>Esta guía te ayudará a utilizar todas las funcionalidades del módulo de Jugadores.</small>
            </Alert>

            <div className="mb-4">
              <h5 className="text-primary mb-3">
                <LuUser className="me-2" />
                1. Vista General
              </h5>
              <p>
                El módulo de Jugadores te permite gestionar toda la información de los jugadores del sistema.
                Puedes visualizar los jugadores en dos formatos:
              </p>
              <ul>
                <li><strong>Vista de Tarjetas (Grid):</strong> Visualización en formato de tarjetas con imágenes</li>
                <li><strong>Vista de Lista (Table):</strong> Visualización en formato de tabla para una vista más compacta</li>
              </ul>
            </div>

            <div className="mb-4">
              <h5 className="text-primary mb-3">
                <LuSearch className="me-2" />
                2. Buscar y Filtrar Jugadores
              </h5>
              <p><strong>Buscar Jugador:</strong></p>
              <ul>
                <li>Utiliza el campo de búsqueda para buscar jugadores por múltiples criterios:
                  <ul>
                    <li>Nombre completo</li>
                    <li>Cédula</li>
                    <li>Nacionalidad</li>
                    <li>Liga</li>
                    <li>Teléfono</li>
                    <li>Provincia</li>
                    <li>Nombre del equipo</li>
                    <li>Nombre de la categoría</li>
                  </ul>
                </li>
                <li>La búsqueda es en tiempo real y filtra los resultados automáticamente</li>
                <li>No necesitas presionar Enter, los resultados se actualizan mientras escribes</li>
              </ul>
              <p className="mt-3"><strong>Filtros por Categoría y Equipo:</strong></p>
              <ul>
                <li>Selecciona una categoría para filtrar los jugadores de esa categoría</li>
                <li>Luego selecciona un equipo para ver solo los jugadores de ese equipo</li>
                <li>Los filtros son combinables y se aplican en tiempo real</li>
              </ul>
            </div>

            <div className="mb-4">
              <h5 className="text-primary mb-3">
                <TbPlus className="me-2" />
                3. Agregar Nuevo Jugador
              </h5>
              <p>Para agregar un nuevo jugador:</p>
              <ol>
                <li>Haz clic en el botón <strong>"Agregar Jugador"</strong> (botón rojo con ícono +)</li>
                <li>Completa el formulario con la información del jugador:
                  <ul>
                    <li><strong>Cédula:</strong> Ingresa la cédula y presiona Tab o Enter para buscar si el jugador ya existe</li>
                    <li><strong>Apellido y Nombre:</strong> Nombre completo del jugador</li>
                    <li><strong>Nacionalidad:</strong> País de origen del jugador</li>
                    <li><strong>Liga:</strong> Liga a la que pertenece</li>
                    <li><strong>Fecha de Nacimiento:</strong> Fecha de nacimiento del jugador</li>
                    <li><strong>Sexo:</strong> Selecciona el sexo del jugador (Masculino, Femenino u Otro)</li>
                    <li><strong>Teléfono:</strong> Número de contacto (opcional)</li>
                    <li><strong>Provincia y Dirección:</strong> Datos de ubicación (opcional)</li>
                    <li><strong>Observaciones:</strong> Notas adicionales sobre el jugador (opcional)</li>
                    <li><strong>Estado:</strong> Selecciona si el jugador está "Activo" o "Inactivo" (por defecto: Activo)</li>
                    <li><strong>Jugador Foráneo:</strong> Marca esta casilla si el jugador es foráneo</li>
                  </ul>
                </li>
                <li>Selecciona el <strong>Equipo-Categoría</strong> donde se asignará el jugador (obligatorio)</li>
                <li>Ingresa el <strong>Número de Jugador</strong> (número de camiseta, entre 1 y 99)</li>
                <li>Opcionalmente, captura una foto del jugador:
                  <ul>
                    <li>Haz clic en <strong>"Capturar Foto"</strong> para usar la cámara del dispositivo</li>
                  </ul>
                </li>
                <li>Haz clic en <strong>"Guardar"</strong> para crear el jugador</li>
              </ol>
              <Alert variant="warning" className="mt-2 mb-0">
                <small><strong>Nota:</strong> Si la cédula ya existe, el sistema cargará los datos existentes y solo creará una nueva relación con el equipo-categoría seleccionado.</small>
              </Alert>
              <Alert variant="info" className="mt-2 mb-0">
                <small><strong>Campos obligatorios:</strong> Cédula, Apellido y Nombre, Nacionalidad, Liga y Equipo-Categoría.</small>
              </Alert>
            </div>

            <div className="mb-4">
              <h5 className="text-primary mb-3">
                <TbEdit className="me-2" />
                4. Editar Jugador
              </h5>
              <p>Para editar la información de un jugador:</p>
              <ol>
                <li>Haz clic en el botón <strong>Editar</strong> (ícono de lápiz) en la tarjeta o fila del jugador</li>
                <li>Modifica los campos que necesites actualizar</li>
                <li>Puedes cambiar la foto del jugador usando la cámara (haz clic en "Cambiar Foto")</li>
                <li>Haz clic en <strong>"Actualizar Jugador"</strong> para aplicar los cambios</li>
              </ol>
              <Alert variant="info" className="mt-2 mb-0">
                <small><strong>Nota:</strong> Solo puedes editar jugadores que tengan un equipo-categoría asignado. Si un jugador no tiene relación con un equipo-categoría, el botón de Editar estará deshabilitado.</small>
              </Alert>
            </div>

            <div className="mb-4">
              <h5 className="text-primary mb-3">
                <TbPrinter className="me-2" />
                5. Imprimir Carnets de Jugadores
              </h5>
              <p><strong>Imprimir Carnet Individual:</strong></p>
              <ul>
                <li>En cada fila de la tabla, hay un botón de impresora (ícono de impresora)</li>
                <li>Haz clic en este botón para imprimir el carnet de ese jugador específico</li>
                <li>El carnet se generará en una nueva ventana lista para imprimir</li>
              </ul>
              <p className="mt-3"><strong>Imprimir Múltiples Carnets:</strong></p>
              <ol>
                <li>Selecciona uno o más jugadores marcando las casillas de verificación</li>
                <li>Haz clic en el botón <strong>"Imprimir"</strong> (botón amarillo con ícono de impresora) en la barra superior</li>
                <li>Si hay jugadores que están en múltiples categorías o equipos, se mostrará una advertencia:
                  <ul>
                    <li>Se listarán los jugadores con múltiples categorías</li>
                    <li>Se listarán los jugadores en múltiples equipos</li>
                    <li>Puedes elegir continuar con la impresión o cancelar</li>
                  </ul>
                </li>
                <li>Los carnets se generarán en una nueva ventana lista para imprimir</li>
              </ol>
              <Alert variant="info" className="mt-2 mb-0">
                <small><strong>Consejo:</strong> Los carnets se generan con el diseño estándar de identificación de jugadores. Asegúrate de tener una impresora configurada antes de imprimir.</small>
              </Alert>
            </div>

            <div className="mb-4">
              <h5 className="text-primary mb-3">
                <LuDownload className="me-2" />
                6. Exportar a Excel
              </h5>
              <p>Para descargar la lista de jugadores en formato Excel:</p>
              <ol>
                <li>Haz clic en el botón <strong>"Descargar Excel"</strong> (botón verde con ícono de descarga)</li>
                <li>El archivo Excel se descargará con todos los jugadores filtrados actualmente</li>
                <li>El archivo incluye toda la información de los jugadores: cédula, nombre, categoría, equipo, número de jugador, etc.</li>
              </ol>
            </div>

            <div className="mb-4">
              <h5 className="text-primary mb-3">
                <LuRefreshCw className="me-2" />
                7. Actualizar Datos
              </h5>
              <p>
                El botón <strong>"Actualizar"</strong> (botón azul con ícono de actualizar) recarga todos los datos desde el servidor.
                Úsalo cuando quieras asegurarte de tener la información más reciente.
              </p>
            </div>

            <div className="mb-4">
              <h5 className="text-primary mb-3">
                <TbTrash className="me-2" />
                8. Eliminar Relación de Jugador
              </h5>
              <p>Para eliminar la relación de un jugador con un equipo-categoría:</p>
              <ol>
                <li>Haz clic en el botón <strong>Eliminar</strong> (ícono de papelera) en la tarjeta o fila del jugador</li>
                <li>Confirma la eliminación en el modal de confirmación</li>
              </ol>
              <Alert variant="warning" className="mt-2 mb-0">
                <small><strong>Importante:</strong> Esta acción solo elimina la relación del jugador con el equipo-categoría actual. El jugador y su información permanecen en el sistema.</small>
              </Alert>
            </div>

            <div className="mb-4">
              <h5 className="text-primary mb-3">
                <LuClock className="me-2" />
                9. Ver Historial de Jugador
              </h5>
              <p>Para ver el historial completo de un jugador:</p>
              <ol>
                <li>Haz clic en el botón <strong>Historial</strong> (ícono de reloj) en la tarjeta o fila del jugador</li>
                <li>Se abrirá un modal mostrando todo el historial de cambios, movimientos entre equipos, categorías, etc.</li>
              </ol>
            </div>

            <div className="mb-4">
              <h5 className="text-primary mb-3">
                <LuUser className="me-2" />
                10. Selección Múltiple
              </h5>
              <p>Puedes seleccionar múltiples jugadores para realizar acciones en lote:</p>
              <ul>
                <li>Marca las casillas de verificación en los jugadores que deseas seleccionar</li>
                <li>Usa la casilla en el encabezado para seleccionar todos los jugadores visibles</li>
                <li>Con jugadores seleccionados, el botón de "Imprimir" estará disponible</li>
              </ul>
            </div>

            <div className="mb-4">
              <h5 className="text-primary mb-3">
                <TbCamera className="me-2" />
                11. Funcionalidad de Foto del Jugador
              </h5>
              <p>El sistema permite capturar una foto para cada jugador:</p>
              <ul>
                <li><strong>Capturar Foto:</strong> Haz clic en "Capturar Foto" para usar la cámara de tu dispositivo</li>
                <li><strong>Cambiar Foto:</strong> Al editar, puedes cambiar o eliminar la foto existente</li>
                <li><strong>Foto por Defecto:</strong> Si no hay foto, se mostrará un avatar por defecto</li>
              </ul>
              <Alert variant="info" className="mt-2 mb-0">
                <small><strong>Recomendación:</strong> Usa fotos claras y recientes para una mejor identificación de los jugadores en los carnets.</small>
              </Alert>
            </div>

            <div className="mb-4">
              <h5 className="text-primary mb-3">
                <LuChevronLeft className="me-2" />
                12. Paginación y Navegación
              </h5>
              <p>En la vista de lista:</p>
              <ul>
                <li>La tabla muestra 8 jugadores por página por defecto</li>
                <li>Usa los botones de navegación (← →) para cambiar de página</li>
                <li>El contador muestra cuántos jugadores se están visualizando</li>
                <li>Puedes hacer clic en el nombre del jugador en la vista de tabla para navegar a su perfil completo (página de detalle del jugador)</li>
              </ul>
            </div>

            <div className="mb-4">
              <h5 className="text-primary mb-3">
                <LuUser className="me-2" />
                13. Permisos y Restricciones
              </h5>
              <p>El sistema utiliza un sistema de permisos que controla qué acciones puedes realizar:</p>
              <ul>
                <li><strong>Ver:</strong> Todos los usuarios con acceso pueden ver la lista de jugadores</li>
                <li><strong>Crear:</strong> Solo usuarios con permiso de creación pueden agregar nuevos jugadores</li>
                <li><strong>Editar:</strong> Solo usuarios con permiso de edición pueden modificar información</li>
                <li><strong>Eliminar:</strong> Solo usuarios con permiso de eliminación pueden eliminar relaciones</li>
              </ul>
              <Alert variant="warning" className="mt-2 mb-0">
                <small><strong>Importante:</strong> Los botones de Editar y Eliminar estarán deshabilitados si no tienes los permisos correspondientes o si el jugador no tiene equipo-categoría asignado.</small>
              </Alert>
            </div>

            <div className="mb-4">
              <h5 className="text-primary mb-3">
                <LuUser className="me-2" />
                14. Información Adicional en la Vista
              </h5>
              <p>En la vista de tabla, puedes ver las siguientes columnas:</p>
              <ul>
                <li><strong>Jugador:</strong> Foto, nombre completo y cédula (el nombre es un enlace al detalle)</li>
                <li><strong>Nacionalidad:</strong> País de origen del jugador</li>
                <li><strong>Liga:</strong> Liga a la que pertenece</li>
                <li><strong>Sexo:</strong> Sexo del jugador</li>
                <li><strong>Número:</strong> Número de camiseta en el equipo-categoría actual</li>
                <li><strong>Teléfono:</strong> Número de contacto</li>
                <li><strong>Provincia:</strong> Provincia de residencia</li>
                <li><strong>Foráneo:</strong> Indica si el jugador es foráneo (Sí/No)</li>
                <li><strong>Categoría:</strong> Categoría del torneo donde está inscrito</li>
                <li><strong>Equipo:</strong> Equipo al que pertenece</li>
                <li><strong>Estado:</strong> Estado del jugador (Activo/Inactivo)</li>
                <li><strong>Fecha Creación:</strong> Fecha en que se registró el jugador en el sistema</li>
              </ul>
            </div>

            <div className="mb-3">
              <h5 className="text-primary mb-3">
                <LuTrophy className="me-2" />
                15. Consejos Adicionales
              </h5>
              <ul>
                <li>Usa los filtros para encontrar rápidamente grupos específicos de jugadores</li>
                <li>La búsqueda funciona en tiempo real, no necesitas presionar Enter</li>
                <li>Puedes cambiar entre vista de tarjetas y vista de lista según tu preferencia</li>
                <li>Si un jugador está en múltiples equipos o categorías, el sistema te lo advertirá al imprimir</li>
                <li>El sistema valida automáticamente los datos antes de guardar</li>
                <li>Un jugador puede estar en múltiples equipos o categorías - esto es normal y el sistema lo maneja correctamente</li>
                <li>Haz clic en el nombre del jugador en la tabla para ver su perfil completo</li>
                <li>Los jugadores sin foto mostrarán un avatar por defecto</li>
                <li>El campo de "Observaciones" es útil para notas importantes sobre el jugador</li>
                <li>Al imprimir múltiples carnets, se generan en una sola ventana lista para imprimir</li>
              </ul>
            </div>

            <div className="mb-3">
              <h5 className="text-primary mb-3">
                <LuUser className="me-2" />
                16. Solución de Problemas Comunes
              </h5>
              <p><strong>No puedo editar o eliminar un jugador:</strong></p>
              <ul>
                <li>Verifica que tengas los permisos necesarios</li>
                <li>Verifica que el jugador tenga una relación con un equipo-categoría (los botones estarán deshabilitados si no)</li>
              </ul>
              <p className="mt-3"><strong>No puedo agregar un jugador:</strong></p>
              <ul>
                <li>Verifica que tengas permisos de creación</li>
                <li>Asegúrate de completar todos los campos obligatorios</li>
                <li>Verifica que hayas seleccionado un Equipo-Categoría</li>
              </ul>
              <p className="mt-3"><strong>La cámara no funciona:</strong></p>
              <ul>
                <li>Verifica que hayas dado permisos de cámara al navegador</li>
                <li>Asegúrate de que tu dispositivo tenga una cámara disponible</li>
                <li>Verifica que el navegador tenga acceso a la cámara en la configuración de permisos</li>
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

      {/* Modal de confirmación de cambio de equipo */}
      <Modal 
        show={showConfirmacionCambioEquipo} 
        onHide={handleCancelarCambioEquipo} 
        centered
      >
        <ModalHeader closeButton>
          <ModalTitle>Confirmar Cambio de Equipo</ModalTitle>
        </ModalHeader>
        <ModalBody>
          <Alert variant="warning" className="mb-3">
            <strong>¿Estás seguro de que deseas cambiar el equipo de este jugador?</strong>
          </Alert>
          {equipoAnteriorInfo && equipoNuevoInfo && (
            <div>
              <p className="mb-2">
                <strong>Jugador:</strong> {editingJugador?.apellido_nombre}
              </p>
              <div className="mb-3">
                <p className="mb-1"><strong>Equipo Actual:</strong></p>
                <div className="ps-3">
                  <p className="mb-0">• <strong>Equipo:</strong> {equipoAnteriorInfo.nombre}</p>
                  <p className="mb-0">• <strong>Categoría:</strong> {equipoAnteriorInfo.categoria}</p>
                </div>
              </div>
              <div className="mb-3">
                <p className="mb-1"><strong>Nuevo Equipo:</strong></p>
                <div className="ps-3">
                  <p className="mb-0">• <strong>Equipo:</strong> {equipoNuevoInfo.nombre}</p>
                  <p className="mb-0">• <strong>Categoría:</strong> {equipoNuevoInfo.categoria}</p>
                </div>
              </div>
              <Alert variant="info" className="mb-0">
                <small>
                  <strong>Nota:</strong> Este cambio se registrará en el historial del jugador.
                </small>
                <small>
                  Verifica si se encuera regularizada su situación (PASE/PRÉSTAMO)
                </small>
              </Alert>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={handleCancelarCambioEquipo}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleConfirmarCambioEquipo}>
            Confirmar Cambio
          </Button>
        </ModalFooter>
      </Modal>

    </Container>
    
    {/* Toast de PrimeReact - Fuera del Container para mejor visibilidad */}
    <Toast ref={toast} position="top-right" style={{ zIndex: 1100 }} />
  </>
  )
}

export default Page
