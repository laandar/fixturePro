'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import Select from 'react-select'
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
import { Button, Card, CardBody, CardFooter, CardHeader, Col, Container, FloatingLabel, Form, FormControl, FormSelect, FormCheck, Offcanvas, OffcanvasBody, OffcanvasHeader, OffcanvasTitle, Row, Alert, Nav, Badge, Pagination, Modal, ModalHeader, ModalBody, ModalFooter, ModalTitle } from 'react-bootstrap'
import { LuSearch, LuUser, LuTrophy, LuLayoutGrid, LuList, LuMenu, LuChevronLeft, LuChevronRight, LuClock, LuDownload } from 'react-icons/lu'
import { TbEdit, TbPlus, TbTrash, TbCamera } from 'react-icons/tb'
import ExcelJS from 'exceljs'
import { getJugadores, createJugador, updateJugador, deleteJugador, deleteMultipleJugadores, getEquiposCategorias } from './actions'
import type { JugadorWithEquipo, Equipo, Categoria } from '@/db/types'
import CameraCapture from '@/components/CameraCapture'
import ProfileCard from '@/components/ProfileCard'
import { getTempPlayerImage } from '@/components/TempPlayerImages'
import HistorialJugadorModal from '@/components/HistorialJugadorModal'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Navigation, Pagination as SwiperPagination, Autoplay } from 'swiper/modules'
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
  const { isTrue: showCreateModal, toggle: toggleCreateModal } = useToggle()
  const { isTrue: showEditModal, toggle: toggleEditModal } = useToggle()
  const { isTrue: showFilterOffcanvas, toggle: toggleFilterOffcanvas } = useToggle()
  
  // 🔐 Sistema de permisos dinámicos
  const { puedeVer, puedeCrear, puedeEditar, puedeEliminar, cargando: cargandoPermisos } = usePermisos('jugadores')
  
  const [data, setData] = useState<JugadorWithEquipo[]>([])
  const [equiposCategorias, setEquiposCategorias] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
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
  
  // Referencia para el canvas oculto
  const canvasRef = useRef<HTMLCanvasElement>(null)
  
  const columns = [
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
              <Link href={`/jugadores/${row.original.id}`} className="link-reset">
                {row.original.apellido_nombre}
              </Link>
            </h5>
            <p className="text-muted fs-xs mb-0">Cédula: {row.original.cedula}</p>
          </div>
        </div>
      ),
    }),
    columnHelper.accessor('nacionalidad', {
      header: 'Nacionalidad',
      cell: ({ row }) => (
        <span className="badge bg-light text-dark badge-label">
          {row.original.nacionalidad}
        </span>
      ),
    }),
    columnHelper.accessor('liga', {
      header: 'Liga',
      cell: ({ row }) => row.original.liga,
    }),
    columnHelper.accessor('sexo', {
      header: 'Sexo',
      cell: ({ row }) => (
        <span className="badge bg-info-subtle text-info badge-label">
          {row.original.sexo || 'No especificado'}
        </span>
      ),
    }),
    columnHelper.accessor('numero_jugador', {
      header: 'Número',
      cell: ({ row }) => (
        <span className="badge bg-primary-subtle text-primary badge-label">
          {row.original.numero_jugador || 'Sin número'}
        </span>
      ),
    }),
    columnHelper.accessor('telefono', {
      header: 'Teléfono',
      cell: ({ row }) => row.original.telefono || 'Sin teléfono',
    }),
    columnHelper.accessor('provincia', {
      header: 'Provincia',
      cell: ({ row }) => row.original.provincia || 'Sin provincia',
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
      cell: ({ row }: { row: TableRow<JugadorWithEquipo> }) => (
        <span className={`badge ${row.original.estado ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'} badge-label`}>
          {row.original.estado ? 'Activo' : 'Inactivo'}
        </span>
      ),
    },
    columnHelper.accessor('createdAt', { 
      header: 'Fecha Creación',
      cell: ({ row }) => row.original.createdAt ? new Date(row.original.createdAt).toLocaleDateString('es-ES') : 'N/A'
    }),
    {
      header: 'Acciones',
      cell: ({ row }: { row: TableRow<JugadorWithEquipo> }) => (
        <div className="d-flex gap-1">
          {puedeEditar && (
            <Button 
              variant="light" 
              size="sm" 
              className="btn-icon rounded-circle"
              onClick={() => handleEditClick(row.original)}
              title="Editar jugador">
              <TbEdit className="fs-lg" />
            </Button>
          )}
          {puedeEliminar && (
            <Button
              variant="light"
              size="sm"
              className="btn-icon rounded-circle"
              onClick={() => handleDeleteSingle(row.original)}
              title="Eliminar jugador">
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
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false)
  const [jugadorToDelete, setJugadorToDelete] = useState<JugadorWithEquipo | null>(null)

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
    globalFilterFn: globalFilterFn,
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
        await deleteJugador(jugadorToDelete.id)
        setJugadorToDelete(null)
        setDeleteSuccess(`El jugador "${jugadorNombre}" ha sido eliminado exitosamente`)
      }
      
      await loadData()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error al eliminar jugador')
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
    
    try {
      setLoading(true)
      setEditFormError(null)
      setEditFormSuccess(null)
      
      // Agregar la foto si existe
      if (editCapturedPhoto) {
        formData.append('foto', editCapturedPhoto, 'jugador-foto.jpg')
      }
      
      await updateJugador(editingJugador.id, formData)
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
      setEditFormError(error instanceof Error ? error.message : 'Error al actualizar jugador')
    } finally {
      setLoading(false)
    }
  }

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      const [jugadoresData, equiposCategoriasData] = await Promise.all([
        getJugadores(),
        getEquiposCategorias()
      ])
      setData(jugadoresData)
      setEquiposCategorias(equiposCategoriasData)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error al cargar jugadores')
    } finally {
      setLoading(false)
    }
  }

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

        worksheet.addRow([
          jugador.cedula || '',
          jugador.apellido_nombre || '',
          jugador.nacionalidad || '',
          jugador.liga || '',
          jugador.sexo || 'No especificado',
          jugador.numero_jugador || 'Sin número',
          jugador.telefono || 'Sin teléfono',
          jugador.provincia || 'Sin provincia',
          jugador.direccion || '',
          jugador.foraneo ? 'Sí' : 'No',
          categoria,
          equipo,
          jugador.estado ? 'Activo' : 'Inactivo',
          fechaNacimiento,
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
      worksheet.getColumn(15).width = 40 // Observaciones

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

  const handleCreateJugador = async (formData: FormData) => {
    if (!puedeCrear) {
      setFormError('No tienes permiso para crear jugadores')
      return
    }
    
    try {
      setLoading(true)
      setFormError(null)
      setFormSuccess(null)
      
      // Agregar la foto si existe
      if (capturedPhoto) {
        formData.append('foto', capturedPhoto, 'jugador-foto.jpg')
      }
      
      await createJugador(formData)
      setFormSuccess('Jugador creado exitosamente')
      
      // Limpiar foto capturada
      setCapturedPhoto(null)
      setCapturedPhotoUrl(null)
      
      // Recargar datos después de un breve delay
      setTimeout(async () => {
        await loadData()
        setSelectedEquipoCategoria(null) // Limpiar react-select
        toggleCreateModal()
      }, 1000)
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Error al crear jugador')
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
              <h3 className="mb-0 fs-xl flex-grow-1">{data.length} Jugadores</h3>
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
                {puedeCrear ? (
                  <Button variant="danger" className="ms-1" onClick={toggleCreateModal}>
                    <TbPlus className="fs-sm me-2" /> Agregar Jugador
                  </Button>
                ) : (
                  <Button variant="secondary" className="ms-1" disabled title="No tienes permiso para crear jugadores">
                    <TbPlus className="fs-sm me-2" /> Agregar Jugador
                  </Button>
                )}
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
                    return (
                      <Col className="col mb-4" key={jugador.id} style={{ padding: '0 15px' }}>
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
                              onEditClick={() => handleEditClick(jugador)}
                              onDeleteClick={() => handleDeleteSingle(jugador)}
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
                        return (
                          <SwiperSlide key={jugador.id}>
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
                                  onEditClick={() => handleEditClick(jugador)}
                                  onDeleteClick={() => handleDeleteSingle(jugador)}
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
      <Modal show={showCreateModal} onHide={toggleCreateModal} size="lg" centered>
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
          
          <Form action={handleCreateJugador}>
            <Row className="g-3">
              <Col lg={4}>
                <FloatingLabel label="Cédula">
                  <FormControl type="text" name="cedula" placeholder="Ingrese la cédula" required />
                </FloatingLabel>
              </Col>

              <Col lg={4}>
                <FloatingLabel label="Apellido y Nombre">
                  <FormControl type="text" name="apellido_nombre" placeholder="Ingrese apellido y nombre" required />
                </FloatingLabel>
              </Col>

              <Col lg={4}>
                <FloatingLabel label="Nacionalidad">
                  <FormSelect name="nacionalidad" required>
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

              <Col lg={4}>
                <FloatingLabel label="Liga">
                  <FormControl type="text" name="liga" placeholder="Ingrese liga" required />
                </FloatingLabel>
              </Col>

              <Col lg={4}>
                <FloatingLabel label="Fecha de Nacimiento">
                  <FormControl type="date" name="fecha_nacimiento" placeholder="Seleccione la fecha de nacimiento" />
                </FloatingLabel>
              </Col>

              <Col lg={4}>
                <FloatingLabel label="Sexo">
                  <FormSelect name="sexo">
                    <option value="">Seleccionar...</option>
                    <option value="masculino">Masculino</option>
                    <option value="femenino">Femenino</option>
                    <option value="otro">Otro</option>
                  </FormSelect>
                </FloatingLabel>
              </Col>

              <Col lg={4}>
                <FloatingLabel label="Número de Jugador">
                  <FormControl type="number" name="numero_jugador" placeholder="Número de camiseta" min="1" max="99" />
                </FloatingLabel>
              </Col>

              <Col lg={4}>
                <FloatingLabel label="Teléfono">
                  <FormControl type="tel" name="telefono" placeholder="Número de teléfono" />
                </FloatingLabel>
              </Col>

              <Col lg={4}>
                <FloatingLabel label="Provincia">
                  <FormControl type="text" name="provincia" placeholder="Provincia de residencia" />
                </FloatingLabel>
              </Col>

              <Col lg={12}>
                <FloatingLabel label="Dirección">
                  <FormControl type="text" name="direccion" placeholder="Dirección de residencia" />
                </FloatingLabel>
              </Col>

              <Col lg={12}>
                <FloatingLabel label="Observaciones">
                  <FormControl 
                    as="textarea" 
                    name="observacion" 
                    placeholder="Observaciones del jugador" 
                    style={{ height: '100px' }}
                  />
                </FloatingLabel>
              </Col>

              <Col lg={6}>
                
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
                />
                <input
                  type="hidden"
                  name="equipo_categoria_id"
                  value={selectedEquipoCategoria?.value || ''}
                />
              </Col>

              <Col lg={3}>
                <FloatingLabel label="Estado">
                  <FormSelect name="estado">
                    <option value="true">Activo</option>
                    <option value="false">Inactivo</option>
                  </FormSelect>
                </FloatingLabel>
              </Col>

              <Col lg={3}>
                <div className="form-check">
                  <FormCheck
                    type="checkbox"
                    name="foraneo"
                    value="true"
                    id="foraneo"
                    label="Jugador Foráneo"
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
                        <Button variant="outline-danger" size="sm" onClick={removePhoto}>
                          <TbTrash className="me-1" />
                          Eliminar
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
                  <Button variant="light" onClick={toggleCreateModal}>
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
              <Row className="g-3">
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

                <Col lg={4}>
                  <FloatingLabel label="Liga">
                    <FormControl 
                      type="text" 
                      name="liga" 
                      placeholder="Ingrese liga" 
                      defaultValue={editingJugador.liga}
                      required 
                    />
                  </FloatingLabel>
                </Col>

                <Col lg={4}>
                  <FloatingLabel label="Fecha de Nacimiento">
                    <FormControl 
                      type="date" 
                      name="fecha_nacimiento" 
                      placeholder="Seleccione la fecha de nacimiento"
                      defaultValue={editingJugador.fecha_nacimiento ? new Date(editingJugador.fecha_nacimiento).toISOString().split('T')[0] : ''}
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
                  <FloatingLabel label="Número de Jugador">
                    <FormControl 
                      type="number" 
                      name="numero_jugador" 
                      placeholder="Número de camiseta" 
                      min="1" 
                      max="99"
                      defaultValue={editingJugador.numero_jugador || ''}
                    />
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

                <Col lg={12}>
                  <FloatingLabel label="Dirección">
                    <FormControl 
                      type="text" 
                      name="direccion" 
                      placeholder="Dirección de residencia"
                      defaultValue={editingJugador.direccion || ''}
                    />
                  </FloatingLabel>
                </Col>

                <Col lg={12}>
                  <FloatingLabel label="Observaciones">
                    <FormControl 
                      as="textarea" 
                      name="observacion" 
                      placeholder="Observaciones del jugador" 
                      style={{ height: '100px' }}
                      defaultValue={editingJugador.observacion || ''}
                    />
                  </FloatingLabel>
                </Col>

                <Col lg={6}>
                  
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
                  />
                  <input
                    type="hidden"
                    name="equipo_categoria_id"
                    value={selectedEditEquipoCategoria?.value || ''}
                  />
                </Col>

                <Col lg={3}>
                  <FloatingLabel label="Estado">
                    <FormSelect name="estado" defaultValue={(editingJugador.estado ?? true).toString()}>
                      <option value="true">Activo</option>
                      <option value="false">Inactivo</option>
                    </FormSelect>
                  </FloatingLabel>
                </Col>

                <Col lg={3}>
                  <div className="form-check">
                    <FormCheck
                      type="checkbox"
                      name="foraneo"
                      value="true"
                      id="foraneo_edit"
                      label="Jugador Foráneo"
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
                           <Button variant="outline-danger" size="sm" onClick={removeEditPhoto}>
                             <TbTrash className="me-1" />
                             Eliminar
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
                           <Button variant="outline-danger" size="sm" onClick={removeEditPhoto}>
                             <TbTrash className="me-1" />
                             Eliminar
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
    </Container>
  )
}

export default Page
