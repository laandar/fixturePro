'use client'

import { useEffect, useState, useCallback } from 'react'
import DataTable from '@/components/table/DataTable'
import TablePagination from '@/components/table/TablePagination'
import {
  ColumnFiltersState,
  createColumnHelper,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  Row as TableRow,
  useReactTable,
} from '@tanstack/react-table'
import { Button, Card, CardBody, CardHeader, CardFooter, Container, Alert, Spinner, FormSelect, Row, Col, Form, FloatingLabel, Modal, FormControl } from 'react-bootstrap'
import { TbPlus, TbTrash, TbDeviceFloppy, TbRefresh, TbFilter, TbEdit, TbX, TbSearch, TbDownload, TbHelp } from 'react-icons/tb'
import ExcelJS from 'exceljs'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import { usePermisos } from '@/hooks/usePermisos'
import { useAuth } from '@/hooks/useAuth'
import {
  getJugadoresIngreso,
  getEquiposParaFiltro,
  getTorneosActivosParaFiltro,
  buscarJugadorPorCedula,
  createJugadorIngreso,
  updateJugadorIngreso,
  deleteJugadorIngreso,
  detectarJugadoresMultiplesCategoriasEquipos,
  verificarJugadorEnOtroEquipo,
  obtenerCategoriaTorneo,
  type JugadorIngreso
} from './actions'

type JugadorRow = JugadorIngreso

const columnHelper = createColumnHelper<JugadorRow>()

const sexoOptions = [
  { value: '', label: 'Seleccionar...' },
  { value: 'masculino', label: 'Masculino' },
  { value: 'femenino', label: 'Femenino' },
  { value: 'otro', label: 'Otro' },
]

export default function IngresoJugadoresPage() {
  const { puedeVer, puedeCrear, puedeEditar, puedeEliminar, cargando: cargandoPermisos } = usePermisos('ingreso-jugadores')
  const { user, isLoading: isLoadingAuth } = useAuth()
  
  const [rows, setRows] = useState<JugadorRow[]>([])
  const [originalRows, setOriginalRows] = useState<JugadorRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  // Estados para la tabla
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })
  const [globalFilter, setGlobalFilter] = useState('')
  
  // Filtros
  const [equipos, setEquipos] = useState<Array<{ id: number; nombre: string }>>([])
  const [torneos, setTorneos] = useState<Array<{ id: number; nombre: string; categoria?: { nombre: string } | null }>>([])
  const [selectedEquipoId, setSelectedEquipoId] = useState<number | undefined>(undefined)
  const [selectedTorneoId, setSelectedTorneoId] = useState<number | undefined>(undefined)
  const [equipoIdInicializado, setEquipoIdInicializado] = useState(false) // Para evitar re-inicializaciones
  
  // Filtrar equipos para mostrar solo el del usuario si tiene uno asignado
  const equiposParaMostrar = user?.equipoId 
    ? equipos.filter(e => e.id === user.equipoId)
    : equipos

  // Estado del formulario
  const [formData, setFormData] = useState<JugadorIngreso>({
    cedula: '',
    apellidos: '',
    nombres: '',
    nacionalidad: '',
    sexo: null,
    numero_jugador: null,
    situacion_jugador: null,
    telefono: null,
    provincia: null,
    direccion: null,
  })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [buscandoCedula, setBuscandoCedula] = useState(false)
  const [jugadorExiste, setJugadorExiste] = useState(false) // Indica si el jugador ya existe en la BD
  const [showModal, setShowModal] = useState(false) // Controla si el modal está abierto
  const [showConfirmacionExportar, setShowConfirmacionExportar] = useState(false) // Modal de confirmación para exportar
  const [jugadoresMultiplesCategorias, setJugadoresMultiplesCategorias] = useState<Array<{cedula: string, nombre: string, categorias: string[]}>>([])
  const [jugadoresMultiplesEquipos, setJugadoresMultiplesEquipos] = useState<Array<{cedula: string, nombre: string, equipos: string[]}>>([])
  const [jugadoresParaExportar, setJugadoresParaExportar] = useState<JugadorRow[]>([]) // Guardar jugadores para exportar después de confirmar
  const [showManualUsuario, setShowManualUsuario] = useState(false) // Modal del manual de usuario
  const [showAdvertenciaOtroEquipo, setShowAdvertenciaOtroEquipo] = useState(false) // Modal de advertencia de jugador en otro equipo
  const [infoJugadorOtroEquipo, setInfoJugadorOtroEquipo] = useState<{
    jugador: string
    cedula: string
    otrosEquipos: Array<{ equipo: string; categoria: string; situacion: string | null }>
    regularizado: boolean
  } | null>(null)

  // Cargar equipos y torneos
  const loadFiltros = useCallback(async () => {
    try {
      const [equiposData, torneosData] = await Promise.all([
        getEquiposParaFiltro(),
        getTorneosActivosParaFiltro()
      ])
      setEquipos(equiposData)
      setTorneos(torneosData)
    } catch (err) {
      console.error('Error al cargar filtros:', err)
    }
  }, [])
  
  // Inicializar equipoId del usuario después de cargar los equipos
  useEffect(() => {
    if (!isLoadingAuth && user?.equipoId && !equipoIdInicializado && equipos.length > 0) {
      // Verificar que el equipo existe en la lista
      const equipoExiste = equipos.some(e => e.id === user.equipoId)
      if (equipoExiste && selectedEquipoId === undefined) {
        setSelectedEquipoId(user.equipoId)
        setEquipoIdInicializado(true)
      }
    }
  }, [user?.equipoId, isLoadingAuth, equipoIdInicializado, equipos, selectedEquipoId])

  // Cargar jugadores con filtros
  const loadJugadores = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getJugadoresIngreso(selectedEquipoId, selectedTorneoId)
      setRows(data)
      setOriginalRows(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar jugadores')
    } finally {
      setLoading(false)
    }
  }, [selectedEquipoId, selectedTorneoId])

  useEffect(() => {
    if (puedeVer && !cargandoPermisos && !isLoadingAuth) {
      loadFiltros()
    }
  }, [puedeVer, cargandoPermisos, isLoadingAuth, loadFiltros])
  
  // Recargar cuando cambien los filtros
  useEffect(() => {
    if (puedeVer && !cargandoPermisos && !isLoadingAuth) {
      loadJugadores()
    }
  }, [selectedEquipoId, selectedTorneoId, puedeVer, cargandoPermisos, isLoadingAuth, loadJugadores])

  // Limpiar formulario
  const clearForm = () => {
    setFormData({
      cedula: '',
      apellidos: '',
      nombres: '',
      nacionalidad: '',
      sexo: null,
      numero_jugador: null,
      situacion_jugador: null,
      telefono: null,
      provincia: null,
      direccion: null,
    })
    setEditingId(null)
    setJugadorExiste(false) // Resetear estado de jugador existe
    setShowModal(false) // Cerrar el modal
  }

  // Abrir modal para nuevo jugador
  const handleOpenModal = () => {
    // Validar que haya un torneo seleccionado
    if (!selectedTorneoId) {
      setError('Debe seleccionar un torneo antes de agregar o modificar un jugador')
      setTimeout(() => setError(null), 5000)
      return
    }
    clearForm()
    setShowModal(true)
  }

  // Actualizar cédula en el estado (sin buscar)
  const handleCedulaChange = (cedula: string) => {
    const cedulaAnterior = formData.cedula.trim()
    const cedulaNueva = cedula.trim()
    
    // Si la cédula cambió y es diferente a la anterior, limpiar los demás campos
    // Esto evita que los datos de una cédula anterior se mantengan al escribir una nueva
    if (cedulaAnterior !== cedulaNueva) {
      // Si había un jugador cargado o datos en el formulario, limpiarlos
      if (editingId || (cedulaAnterior.length > 0 && (formData.apellidos || formData.nombres))) {
        // Limpiar todos los campos excepto la cédula que se está escribiendo
        setFormData({
          cedula: cedula,
          apellidos: '',
          nombres: '',
          nacionalidad: '',
          sexo: null,
          numero_jugador: null,
          situacion_jugador: null,
          telefono: null,
          provincia: null,
          direccion: null,
        })
        setEditingId(null)
        setJugadorExiste(false)
      } else {
        // Solo actualizar la cédula si no hay datos previos
        setFormData({ ...formData, cedula })
      }
    } else {
      // Si la cédula no cambió, solo actualizarla
      setFormData({ ...formData, cedula })
    }
    
    // Si limpiamos la cédula completamente mientras estamos editando, limpiar el formulario
    if (cedula.trim().length === 0 && editingId) {
      clearForm()
    }
  }

  // Buscar jugador por cédula (se ejecuta al salir del campo o presionar Enter)
  const handleCedulaBlur = async () => {
    const cedula = formData.cedula.trim()
    
    // Solo buscar si la cédula tiene al menos 3 caracteres y no estamos editando manualmente
    if (cedula.length >= 3 && !editingId) {
      setBuscandoCedula(true)
      try {
        const jugador = await buscarJugadorPorCedula(cedula)
        if (jugador && jugador.id) {
          // Jugador existe - cargar datos y deshabilitar todos los campos excepto número
          setFormData({
            cedula: jugador.cedula,
            apellidos: jugador.apellidos,
            nombres: jugador.nombres,
            nacionalidad: jugador.nacionalidad,
            sexo: jugador.sexo,
            numero_jugador: jugador.numero_jugador,
            situacion_jugador: jugador.situacion_jugador,
            telefono: jugador.telefono,
            provincia: jugador.provincia,
            direccion: jugador.direccion,
          })
          setEditingId(jugador.id)
          setJugadorExiste(true) // Marcar que el jugador existe
          setSuccess('Jugador encontrado. Solo puede modificar el número de jugador.')
          setTimeout(() => setSuccess(null), 3000)
        } else {
          // Jugador no existe - habilitar todos los campos
          setJugadorExiste(false)
          setEditingId(null)
        }
      } catch (err) {
        console.error('Error al buscar jugador:', err)
        // Si hay error, asumir que no existe y habilitar todos los campos
        setJugadorExiste(false)
        setEditingId(null)
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

  // Guardar jugador directamente en la base de datos desde el formulario
  const handleSaveFromForm = async () => {
    if (!puedeCrear && !puedeEditar) {
      setError('No tienes permiso para guardar jugadores')
      return
    }

    // Validar que haya un torneo seleccionado
    if (!selectedTorneoId) {
      setError('Debe seleccionar un torneo antes de guardar un jugador')
      return
    }

    // Validar campos requeridos
    if (!formData.cedula || !formData.apellidos || !formData.nombres || !formData.nacionalidad) {
      setError('Cédula, apellidos, nombres y nacionalidad son campos obligatorios')
      return
    }

    // Validar que haya un equipo seleccionado
    if (!selectedEquipoId) {
      setError('Debe seleccionar un equipo antes de guardar un jugador')
      return
    }

    // Obtener la categoría del torneo para la verificación
    try {
      // Obtener la categoría del torneo seleccionado
      const categoriaId = await obtenerCategoriaTorneo(selectedTorneoId)

      if (categoriaId) {
        // Verificar si el jugador ya está en otro equipo de la misma categoría
        const verificacion = await verificarJugadorEnOtroEquipo(formData.cedula, selectedEquipoId, categoriaId)
        
        if (verificacion) {
          // El jugador está en otro equipo de la misma categoría, mostrar advertencia
          setInfoJugadorOtroEquipo(verificacion)
          setShowAdvertenciaOtroEquipo(true)
          return // No guardar, esperar confirmación del usuario
        }
      }
    } catch (err) {
      console.error('Error al verificar jugador en otro equipo:', err)
      // Continuar con el guardado si hay error en la verificación
    }

    // Si no está en otro equipo o hay error en la verificación, proceder a guardar
    await guardarJugador()
  }

  // Función auxiliar para guardar el jugador (separada para poder llamarla después de confirmar)
  const guardarJugador = async () => {
    try {
      setSaving(true)
      setError(null)
      setSuccess(null)

      if (editingId && !editingId.startsWith('new-')) {
        // Actualizar jugador existente en la base de datos
        await updateJugadorIngreso(editingId, formData, selectedEquipoId, selectedTorneoId)
        setSuccess('Jugador actualizado exitosamente')
      } else {
        // Crear nuevo jugador en la base de datos
        await createJugadorIngreso(formData, selectedEquipoId, selectedTorneoId)
        setSuccess('Jugador creado exitosamente')
      }

      // Recargar la lista
      await loadJugadores()
      
      // Limpiar formulario y cerrar modal
      clearForm()
      setShowAdvertenciaOtroEquipo(false)
      setInfoJugadorOtroEquipo(null)
      
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar jugador')
    } finally {
      setSaving(false)
    }
  }

  // Editar jugador - cargar datos al formulario
  const handleEdit = (row: JugadorRow) => {
    if (!puedeEditar) {
      setError('No tienes permiso para editar jugadores')
      return
    }

    // Validar que haya un torneo seleccionado
    if (!selectedTorneoId) {
      setError('Debe seleccionar un torneo antes de agregar o modificar un jugador')
      setTimeout(() => setError(null), 5000)
      return
    }

    setFormData({
      cedula: row.cedula,
      apellidos: row.apellidos,
      nombres: row.nombres,
      nacionalidad: row.nacionalidad,
      sexo: row.sexo,
      numero_jugador: row.numero_jugador,
      situacion_jugador: row.situacion_jugador,
      telefono: row.telefono,
      provincia: row.provincia,
      direccion: row.direccion,
    })
    setEditingId(row.id || null)
    setJugadorExiste(true) // Marcar que el jugador existe cuando se edita desde la tabla
    setShowModal(true) // Abrir el modal al editar
  }

  // Eliminar relación jugador-equipo-categoría (NO modifica la tabla jugadores)
  const handleDeleteRow = async (rowId: string | undefined) => {
    if (!puedeEliminar) {
      setError('No tienes permiso para eliminar jugadores')
      return
    }

    if (!rowId) {
      setError('ID de jugador inválido')
      return
    }

    // Validar que haya filtros seleccionados
    if (!selectedEquipoId || !selectedTorneoId) {
      setError('Debe seleccionar un equipo y un torneo para eliminar la relación del jugador')
      return
    }

    if (!confirm('¿Está seguro de que desea eliminar la relación de este jugador con el equipo y torneo seleccionados?')) {
      return
    }

    try {
      setSaving(true)
      setError(null)
      await deleteJugadorIngreso(rowId, selectedEquipoId, selectedTorneoId)
      setSuccess('Relación del jugador eliminada exitosamente')
      
      // Si estaba editando este jugador, limpiar el formulario
      if (editingId === rowId) {
        clearForm()
      }
      
      // Recargar la lista
      await loadJugadores()
      
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar jugador')
    } finally {
      setSaving(false)
    }
  }

  // Definir columnas para la tabla
  const columns = [
    columnHelper.accessor('cedula', {
      header: 'Cédula',
      cell: ({ row }) => row.original.cedula,
    }),
    {
      id: 'nombres_completos',
      header: 'Nombres',
      cell: ({ row }: { row: TableRow<JugadorRow> }) => {
        const apellidos = row.original.apellidos || ''
        const nombres = row.original.nombres || ''
        const nombreCompleto = `${apellidos} ${nombres}`.trim()
        return nombreCompleto || '-'
      },
    },
    columnHelper.accessor('nacionalidad', {
      header: 'Nacionalidad',
      cell: ({ row }) => (
        <span className="badge bg-light text-dark badge-label">
          {row.original.nacionalidad}
        </span>
      ),
    }),
    columnHelper.accessor('sexo', {
      header: 'Sexo',
      cell: ({ row }) => {
        const sexo = row.original.sexo
        if (!sexo) return <span className="text-muted">-</span>
        const label = sexoOptions.find(opt => opt.value === sexo)?.label || sexo
        return (
          <span className="badge bg-info-subtle text-info badge-label">
            {label}
          </span>
        )
      },
    }),
    columnHelper.accessor('numero_jugador', {
      header: 'Número Jugador',
      cell: ({ row }) => (
        <span className="badge bg-primary-subtle text-primary badge-label">
          {row.original.numero_jugador ?? 'Sin número'}
        </span>
      ),
    }),
    columnHelper.accessor('situacion_jugador', {
      header: 'Situación',
      cell: ({ row }) => {
        const situacion = row.original.situacion_jugador
        if (!situacion) return <span className="text-muted">-</span>
        const variant = situacion === 'PASE' ? 'success' : 'warning'
        return (
          <span className={`badge bg-${variant}-subtle text-${variant} badge-label`}>
            {situacion}
          </span>
        )
      },
    }),
    columnHelper.accessor('telefono', {
      header: 'Teléfono',
      cell: ({ row }) => row.original.telefono ?? 'Sin teléfono',
    }),
    columnHelper.accessor('provincia', {
      header: 'Provincia',
      cell: ({ row }) => row.original.provincia ?? 'Sin provincia',
    }),
    columnHelper.accessor('direccion', {
      header: 'Dirección',
      cell: ({ row }) => row.original.direccion ?? 'Sin dirección',
    }),
    {
      header: 'Acciones',
      cell: ({ row }: { row: TableRow<JugadorRow> }) => (
        <div className="d-flex gap-1">
          {puedeEditar && (
            <Button
              variant="light"
              size="sm"
              className="btn-icon rounded-circle"
              onClick={() => handleEdit(row.original)}
              disabled={saving}
              title="Editar"
            >
              <TbEdit className="fs-lg" />
            </Button>
          )}
          {puedeEliminar && (
            <Button
              variant="light"
              size="sm"
              className="btn-icon rounded-circle"
              onClick={() => handleDeleteRow(row.original.id)}
              disabled={saving}
              title="Eliminar"
            >
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

  // Función de filtro global personalizada que busca por nombre completo o cédula
  const globalFilterFn = (row: any, columnId: string, filterValue: string): boolean => {
    const jugador = row.original as JugadorRow
    if (!filterValue) return true
    
    const searchTerm = filterValue.toLowerCase()
    
    // Combinar apellidos y nombres para búsqueda
    const nombreCompleto = `${jugador.apellidos || ''} ${jugador.nombres || ''}`.trim().toLowerCase()
    
    // Buscar en nombre completo o cédula
    return (
      nombreCompleto.includes(searchTerm) ||
      jugador.cedula?.toLowerCase().includes(searchTerm)
    ) || false
  }

  // Configurar la tabla
  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting, columnFilters, pagination, globalFilter },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: globalFilterFn,
    enableRowSelection: false,
    getRowId: (row) => row.id || '',
  })

  const pageIndex = table.getState().pagination.pageIndex
  const pageSize = table.getState().pagination.pageSize
  const totalItems = table.getFilteredRowModel().rows.length
  const start = pageIndex * pageSize + 1
  const end = Math.min(start + pageSize - 1, totalItems)

  // Función para verificar jugadores antes de exportar
  const handleVerificarYExportar = async () => {
    try {
      // Obtener los jugadores filtrados de la tabla
      const jugadoresFiltrados = table.getFilteredRowModel().rows.map(row => row.original)
      
      if (jugadoresFiltrados.length === 0) {
        setError('No hay jugadores para exportar')
        setTimeout(() => setError(null), 5000)
        return
      }

      // Obtener las cédulas de los jugadores
      const cedulas = jugadoresFiltrados.map(j => j.cedula).filter(Boolean) as string[]
      
      // Detectar jugadores con múltiples categorías o equipos
      const { jugadoresMultiplesCategorias: multiCategorias, jugadoresMultiplesEquipos: multiEquipos } = 
        await detectarJugadoresMultiplesCategoriasEquipos(cedulas)

      // Si hay jugadores con múltiples categorías o equipos, mostrar alerta
      if (multiCategorias.length > 0 || multiEquipos.length > 0) {
        setJugadoresMultiplesCategorias(multiCategorias)
        setJugadoresMultiplesEquipos(multiEquipos)
        setJugadoresParaExportar(jugadoresFiltrados)
        setShowConfirmacionExportar(true)
        return
      }

      // Si no hay problemas, exportar directamente
      await handleExportToExcel(jugadoresFiltrados)
    } catch (error) {
      console.error('Error al verificar jugadores:', error)
      setError('Error al verificar jugadores: ' + (error instanceof Error ? error.message : 'Error desconocido'))
      setTimeout(() => setError(null), 5000)
    }
  }

  // Función para exportar a Excel (ahora recibe los jugadores como parámetro)
  const handleExportToExcel = async (jugadoresFiltrados?: JugadorRow[]) => {
    try {
      // Si no se pasan jugadores, obtenerlos de la tabla
      const jugadores = jugadoresFiltrados || table.getFilteredRowModel().rows.map(row => row.original)
      
      if (jugadores.length === 0) {
        setError('No hay jugadores para exportar')
        setTimeout(() => setError(null), 5000)
        return
      }

      // Crear un nuevo libro de trabajo
      const workbook = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet('Jugadores Ingreso')

      // Obtener nombres de equipo y torneo para el título
      const equipoNombre = selectedEquipoId 
        ? equipos.find(e => e.id === selectedEquipoId)?.nombre || ''
        : 'Todos los equipos'
      const torneoNombre = selectedTorneoId
        ? torneos.find(t => t.id === selectedTorneoId)?.nombre || ''
        : 'Todos los torneos'

      // Agregar título
      worksheet.addRow(['LISTADO DE JUGADORES - INGRESO'])
      worksheet.addRow([])
      worksheet.addRow(['Equipo:', equipoNombre])
      worksheet.addRow(['Torneo:', torneoNombre])
      worksheet.addRow(['Generado el:', new Date().toLocaleString('es-ES')])
      worksheet.addRow(['Total de jugadores:', jugadores.length])
      worksheet.addRow([])

      // Agregar encabezados
      const headers = [
        'Cédula',
        'Apellidos',
        'Nombres',
        'Nacionalidad',
        'Sexo',
        'Número Jugador',
        'Teléfono',
        'Provincia',
        'Dirección'
      ]
      worksheet.addRow(headers)

      // Agregar datos
      jugadores.forEach(jugador => {
        const sexoLabel = sexoOptions.find(opt => opt.value === jugador.sexo)?.label || jugador.sexo || 'No especificado'
        
        worksheet.addRow([
          jugador.cedula || '',
          jugador.apellidos || '',
          jugador.nombres || '',
          jugador.nacionalidad || '',
          sexoLabel,
          jugador.numero_jugador ?? 'Sin número',
          jugador.telefono || 'Sin teléfono',
          jugador.provincia || 'Sin provincia',
          jugador.direccion || 'Sin dirección'
        ])
      })

      // Aplicar estilos
      // Título
      const titleCell = worksheet.getCell('A1')
      titleCell.font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } }
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } }
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
      worksheet.mergeCells('A1:I1')

      // Encabezados
      const headerRow = 9
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
            horizontal: col === 2 || col === 3 || col === 9 ? 'left' : 'center', 
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
      worksheet.getColumn(2).width = 25  // Apellidos
      worksheet.getColumn(3).width = 25  // Nombres
      worksheet.getColumn(4).width = 15  // Nacionalidad
      worksheet.getColumn(5).width = 12  // Sexo
      worksheet.getColumn(6).width = 15  // Número Jugador
      worksheet.getColumn(7).width = 15  // Teléfono
      worksheet.getColumn(8).width = 20  // Provincia
      worksheet.getColumn(9).width = 35  // Dirección

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
      const equipoStr = equipoNombre.replace(/[^a-zA-Z0-9]/g, '_')
      const torneoStr = torneoNombre.replace(/[^a-zA-Z0-9]/g, '_')
      link.download = `Ingreso_Jugadores_${equipoStr}_${torneoStr}_${fecha}.xlsx`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      setSuccess(`Excel descargado exitosamente. Total: ${jugadores.length} jugadores`)
      // Cerrar modal de confirmación si estaba abierto
      setShowConfirmacionExportar(false)
      setJugadoresMultiplesCategorias([])
      setJugadoresMultiplesEquipos([])
      setJugadoresParaExportar([])
      setTimeout(() => setSuccess(null), 3000)
    } catch (error) {
      console.error('Error al exportar a Excel:', error)
      setError('Error al exportar a Excel: ' + (error instanceof Error ? error.message : 'Error desconocido'))
      setTimeout(() => setError(null), 5000)
    }
  }

  // Si no tiene permisos o está cargando
  if (cargandoPermisos) {
    return (
      <Container fluid>
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
          <Spinner animation="border" />
        </div>
      </Container>
    )
  }

  if (!puedeVer) {
    return (
      <Container fluid>
        <Alert variant="danger">
          No tienes permiso para acceder a esta página. Contacta al administrador.
        </Alert>
      </Container>
    )
  }

  return (
    <Container fluid>
      <PageBreadcrumb title="Ingreso de Jugadores" />
      
      {/* Filtros */}
      <Card className="mb-3">
        <CardBody>
          <Row className="align-items-end">
            <Col md={3}>
              <label className="form-label fw-semibold">
                <TbFilter className="me-1" />
                Filtrar por Equipo
                {user?.equipoId && (
                  <span className="badge bg-info ms-2">Tu equipo</span>
                )}
              </label>
              <FormSelect
                value={selectedEquipoId || ''}
                onChange={(e) => {
                  const value = e.target.value === '' ? undefined : parseInt(e.target.value)
                  setSelectedEquipoId(value)
                }}
                disabled={user?.equipoId !== undefined && equiposParaMostrar.length === 1}
              >
                {!user?.equipoId && <option value="">Todos los equipos</option>}
                {equiposParaMostrar.map((equipo) => (
                  <option key={equipo.id} value={equipo.id}>
                    {equipo.nombre}
                  </option>
                ))}
              </FormSelect>
              
            </Col>
            <Col md={3}>
              <label className="form-label fw-semibold">
                <TbFilter className="me-1" />
                Filtrar por Torneo
              </label>
              <FormSelect
                value={selectedTorneoId || ''}
                onChange={(e) => {
                  const value = e.target.value === '' ? undefined : parseInt(e.target.value)
                  setSelectedTorneoId(value)
                }}
              >
                <option value="">Todos los torneos</option>
                {torneos.map((torneo) => (
                  <option key={torneo.id} value={torneo.id}>
                    {torneo.nombre} {torneo.categoria ? `(${torneo.categoria.nombre})` : ''}
                  </option>
                ))}
              </FormSelect>
            </Col>
            <Col md={3} className="d-flex align-items-end">
              {/* Solo mostrar botón de limpiar si el usuario no tiene equipo asignado o si tiene un torneo seleccionado */}
              {(!user?.equipoId && (selectedEquipoId || selectedTorneoId)) || (user?.equipoId && selectedTorneoId) ? (
                <Button
                  variant="outline-secondary"
                  onClick={() => {
                    // Si el usuario tiene un equipo asignado, solo limpiar el torneo
                    // Si no, limpiar completamente
                    if (user?.equipoId) {
                      setSelectedTorneoId(undefined)
                    } else {
                      setSelectedEquipoId(undefined)
                      setSelectedTorneoId(undefined)
                    }
                  }}
                  className="w-100"
                >
                  Limpiar Filtros
                </Button>
              ) : null}
            </Col>
            <Col md={3} className="d-flex align-items-end">
              <Button
                variant="primary"
                onClick={handleOpenModal}
                disabled={!puedeCrear || saving}
                className="w-100"
              >
                <TbPlus className="me-1" />
                Agregar Nuevo Jugador
              </Button>
            </Col>
          </Row>
        </CardBody>
      </Card>

      {/* Modal con Formulario */}
      <Modal show={showModal} onHide={clearForm} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>
            {editingId ? 'Editar Jugador' : 'Agregar Nuevo Jugador'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={(e) => { e.preventDefault(); handleSaveFromForm(); }}>
            <Row>
              <Col md={6}>
                <FloatingLabel label="Cédula *" className="mb-3">
                  <Form.Control
                    type="text"
                    value={formData.cedula}
                    onChange={(e) => handleCedulaChange(e.target.value)}
                    onBlur={handleCedulaBlur}
                    onKeyDown={handleCedulaKeyDown}
                    required
                    disabled={saving || buscandoCedula}
                    placeholder={buscandoCedula ? 'Buscando...' : 'Ingrese y presione Tab o Enter'}
                  />
                  {buscandoCedula && (
                    <div className="position-absolute top-50 end-0 translate-middle-y pe-3" style={{ zIndex: 10 }}>
                      <Spinner animation="border" size="sm" />
                    </div>
                  )}
                </FloatingLabel>
              </Col>
              <Col md={6}>
                <FloatingLabel label="Apellidos *" className="mb-3">
                  <Form.Control
                    type="text"
                    value={formData.apellidos}
                    onChange={(e) => setFormData({ ...formData, apellidos: e.target.value })}
                    required
                    disabled={saving || jugadorExiste}
                  />
                </FloatingLabel>
              </Col>
              <Col md={6}>
                <FloatingLabel label="Nombres *" className="mb-3">
                  <Form.Control
                    type="text"
                    value={formData.nombres}
                    onChange={(e) => setFormData({ ...formData, nombres: e.target.value })}
                    required
                    disabled={saving || jugadorExiste}
                  />
                </FloatingLabel>
              </Col>
              <Col md={6}>
                <FloatingLabel label="Nacionalidad *" className="mb-3">
                  <Form.Control
                    type="text"
                    value={formData.nacionalidad}
                    onChange={(e) => setFormData({ ...formData, nacionalidad: e.target.value })}
                    required
                    disabled={saving || jugadorExiste}
                  />
                </FloatingLabel>
              </Col>
              <Col md={6}>
                <FloatingLabel label="Sexo" className="mb-3">
                  <FormSelect
                    value={formData.sexo || ''}
                    onChange={(e) => setFormData({ ...formData, sexo: e.target.value === '' ? null : e.target.value as 'masculino' | 'femenino' | 'otro' })}
                    disabled={saving || jugadorExiste}
                  >
                    {sexoOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </FormSelect>
                </FloatingLabel>
              </Col>
              <Col md={6}>
                <FloatingLabel label="Número Jugador" className="mb-3">
                  <Form.Control
                    type="number"
                    value={formData.numero_jugador || ''}
                    onChange={(e) => setFormData({ ...formData, numero_jugador: e.target.value === '' ? null : parseInt(e.target.value) })}
                    disabled={saving}
                  />
                </FloatingLabel>
              </Col>
              <Col md={6}>
                <FloatingLabel label="Situación Jugador" className="mb-3">
                  <FormSelect
                    value={formData.situacion_jugador || ''}
                    onChange={(e) => {
                      const value = e.target.value
                      setFormData({ 
                        ...formData, 
                        situacion_jugador: value === '' ? null : (value === 'PASE' ? 'PASE' : value === 'PRÉSTAMO' ? 'PRÉSTAMO' : null) as 'PASE' | 'PRÉSTAMO' | null
                      })
                    }}
                    disabled={saving}
                  >
                    <option value="">Seleccionar...</option>
                    <option value="PASE">PASE</option>
                    <option value="PRÉSTAMO">PRÉSTAMO</option>
                  </FormSelect>
                </FloatingLabel>
              </Col>
              <Col md={6}>
                <FloatingLabel label="Teléfono" className="mb-3">
                  <Form.Control
                    type="text"
                    value={formData.telefono || ''}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value || null })}
                    disabled={saving}
                  />
                </FloatingLabel>
              </Col>
              <Col md={6}>
                <FloatingLabel label="Provincia" className="mb-3">
                  <Form.Control
                    type="text"
                    value={formData.provincia || ''}
                    onChange={(e) => setFormData({ ...formData, provincia: e.target.value || null })}
                    disabled={saving || jugadorExiste}
                  />
                </FloatingLabel>
              </Col>
              <Col md={12}>
                <FloatingLabel label="Dirección" className="mb-3">
                  <Form.Control
                    type="text"
                    value={formData.direccion || ''}
                    onChange={(e) => setFormData({ ...formData, direccion: e.target.value || null })}
                    disabled={saving}
                  />
                </FloatingLabel>
              </Col>
            </Row>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={clearForm}
            disabled={saving}
          >
            <TbX className="me-1" />
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleSaveFromForm}
            disabled={saving || (!puedeCrear && !puedeEditar)}
          >
            <TbDeviceFloppy className="me-1" />
            {saving ? 'Guardando...' : editingId ? 'Actualizar Jugador' : 'Guardar Jugador'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal de Advertencia - Jugador en Otro Equipo */}
      <Modal show={showAdvertenciaOtroEquipo} onHide={() => setShowAdvertenciaOtroEquipo(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title className="text-warning">
            ⚠️ Advertencia: Jugador en Otro Equipo
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {infoJugadorOtroEquipo && (
            <>
              <Alert variant="danger" className="mb-3">
                <strong>No se puede agregar este jugador al equipo seleccionado.</strong>
              </Alert>
              
              <div className="mb-3">
                <p>
                  El jugador <strong>{infoJugadorOtroEquipo.jugador}</strong> (Cédula: <strong>{infoJugadorOtroEquipo.cedula}</strong>) 
                  ya se encuentra registrado en otro(s) equipo(s):
                </p>
                
                <div className="table-responsive">
                  <table className="table table-bordered table-sm">
                    <thead className="table-light">
                      <tr>
                        <th>Equipo</th>
                        <th>Categoría</th>
                        <th>Situación</th>
                      </tr>
                    </thead>
                    <tbody>
                      {infoJugadorOtroEquipo.otrosEquipos.map((otroEquipo, index) => (
                        <tr key={index}>
                          <td><strong>{otroEquipo.equipo}</strong></td>
                          <td>{otroEquipo.categoria}</td>
                          <td>
                            {otroEquipo.situacion ? (
                              <span className="badge bg-success">{otroEquipo.situacion}</span>
                            ) : (
                              <span className="text-muted">Sin regularizar</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <Alert variant="danger" className="mb-0">
                <strong>Jugador No Regularizado:</strong> Este jugador <strong>NO se podrá calificar</strong> hasta que se regularice su situación. 
                Por favor, contacte con la Comisión de Calificaciones para regularizar la situación del jugador (PASE o PRÉSTAMO) 
                antes de intentar agregarlo a otro equipo.
                <br /><br />
                <strong>Contacto:</strong> <strong>0995252001</strong> - Dolores Collaguazo
              </Alert>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => {
              setShowAdvertenciaOtroEquipo(false)
              setInfoJugadorOtroEquipo(null)
            }}
          >
            <TbX className="me-1" />
            Entendido
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal de Confirmación para Exportar */}
      <Modal show={showConfirmacionExportar} onHide={() => setShowConfirmacionExportar(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Confirmar Exportación</Modal.Title>
        </Modal.Header>
        <Modal.Body>
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
            <strong>¿Desea continuar con la exportación?</strong> Los jugadores listados aparecerán en el archivo Excel.
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => {
              setShowConfirmacionExportar(false)
              setJugadoresMultiplesCategorias([])
              setJugadoresMultiplesEquipos([])
              setJugadoresParaExportar([])
            }}
          >
            <TbX className="me-1" />
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={async () => {
              if (jugadoresParaExportar.length > 0) {
                await handleExportToExcel(jugadoresParaExportar)
              }
            }}
          >
            <TbDownload className="me-1" />
            Continuar con la Exportación
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal de Manual de Usuario */}
      <Modal show={showManualUsuario} onHide={() => setShowManualUsuario(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <TbHelp className="me-2" />
            Manual de Usuario - Ingreso de Jugadores
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          <div className="manual-content">
            <Alert variant="info" className="mb-4">
              <strong>Bienvenido al Manual de Usuario</strong>
              <br />
              <small>Esta guía te ayudará a utilizar todas las funcionalidades del módulo de Ingreso de Jugadores.</small>
            </Alert>

            <div className="mb-4">
              <h5 className="text-primary mb-3">
                <TbFilter className="me-2" />
                1. Vista General y Filtros
              </h5>
              <p>
                El módulo de <strong>Ingreso de Jugadores</strong> te permite registrar y gestionar jugadores para equipos y torneos específicos.
                Esta pantalla requiere que selecciones un <strong>Equipo</strong> y/o un <strong>Torneo</strong> para mostrar los jugadores.
              </p>
              <p className="mt-3"><strong>Filtros Obligatorios:</strong></p>
              <ul>
                <li><strong>Filtrar por Equipo:</strong> Selecciona un equipo para ver sus jugadores. Si tu usuario tiene un equipo asignado, se mostrará automáticamente.</li>
                <li><strong>Filtrar por Torneo:</strong> Selecciona un torneo para ver los jugadores de ese torneo. Los torneos muestran su categoría entre paréntesis.</li>
              </ul>
              <Alert variant="warning" className="mt-2 mb-0">
                <small><strong>Importante:</strong> Debes seleccionar al menos un equipo o un torneo para poder ver la lista de jugadores. Sin filtros, la tabla estará vacía.</small>
              </Alert>
            </div>

            <div className="mb-4">
              <h5 className="text-primary mb-3">
                <TbSearch className="me-2" />
                2. Buscar Jugadores
              </h5>
              <p>El campo de búsqueda te permite encontrar jugadores rápidamente:</p>
              <ul>
                <li>Utiliza el campo de búsqueda en la parte superior de la tabla</li>
                <li>Busca por nombre completo (apellidos y nombres) o por cédula</li>
              </ul>
            </div>

            <div className="mb-4">
              <h5 className="text-primary mb-3">
                <TbPlus className="me-2" />
                3. Agregar Nuevo Jugador
              </h5>
              <p>Para agregar un nuevo jugador a un equipo y torneo:</p>
              <ol>
                <li><strong>Selecciona un Torneo:</strong> Primero debes seleccionar un torneo (es obligatorio para agregar jugadores)</li>
                <li>Haz clic en el botón <strong>"Agregar Nuevo Jugador"</strong> (botón azul con ícono +)</li>
                <li>Haz clic en <strong>"Guardar Jugador"</strong> para crear el registro</li>
              </ol>
              
              <Alert variant="info" className="mt-2 mb-0">
                <small><strong>Nota Importante:</strong> Si el jugador ya existe en el sistema (mismo número de cédula), el sistema cargará automáticamente sus datos. Puedes modificar: <strong>Número de Jugador</strong>, <strong>Teléfono</strong> y <strong>Dirección</strong>. Los demás campos (Apellidos, Nombres, Nacionalidad, Sexo, Provincia) estarán deshabilitados para proteger los datos personales.</small>
              </Alert>
              <Alert variant="info" className="mt-2 mb-0">
                <small><strong>Fecha de Nacimiento:</strong> Este campo no se muestra en el formulario porque debe ser validado posteriormente en la toma de fotografía durante el proceso de calificación.</small>
              </Alert>
            </div>

            <div className="mb-4">
              <h5 className="text-primary mb-3">
                <TbEdit className="me-2" />
                4. Editar Jugador
              </h5>
              <p>Para editar la información de un jugador registrado:</p>
              <ol>
                <li>Haz clic en el botón <strong>Editar</strong> (ícono de lápiz) en la fila del jugador</li>
                <li>Se abrirá el mismo formulario con los datos del jugador cargados</li>
                <li>Si el jugador ya existe en la base de datos, podrás modificar:
                  <ul>
                    <li><strong>Número de Jugador</strong></li>
                    <li><strong>Teléfono</strong></li>
                    <li><strong>Dirección</strong></li>
                  </ul>
                </li>
                <li>Si es un jugador nuevo, podrás modificar todos los campos</li>
                <li>Haz clic en <strong>"Actualizar Jugador"</strong> para guardar los cambios</li>
              </ol>
              <Alert variant="info" className="mt-2 mb-0">
                <small><strong>Nota:</strong> Si el jugador existe en la base de datos, puedes actualizar el número de jugador, teléfono y dirección. Los demás campos personales (Apellidos, Nombres, Nacionalidad, Sexo, Provincia) están protegidos y no pueden modificarse desde esta pantalla.</small>
              </Alert>
            </div>

            <div className="mb-4">
              <h5 className="text-primary mb-3">
                <TbTrash className="me-2" />
                5. Eliminar Relación de Jugador
              </h5>
              <p>Para eliminar la relación de un jugador con un equipo-torneo específico:</p>
              <ol>
                <li>Haz clic en el botón <strong>Eliminar</strong> (ícono de papelera) en la fila del jugador</li>
                <li>Confirma la eliminación en el mensaje de confirmación</li>
              </ol>
              <Alert variant="warning" className="mt-2 mb-0">
                <small><strong>Importante:</strong> Esta acción solo elimina la relación del jugador con el equipo y torneo seleccionados. El jugador y su información personal permanecen en el sistema y pueden ser asignados a otros equipos o torneos.</small>
              </Alert>
            </div>

            <div className="mb-4">
              <h5 className="text-primary mb-3">
                <TbSearch className="me-2" />
                6. Búsqueda Automática por Cédula
              </h5>
              <p>El sistema tiene una funcionalidad especial para buscar jugadores por cédula:</p>
              <ul>
                <li>Al ingresar una cédula en el formulario y presionar <strong>Tab</strong> o <strong>Enter</strong>, el sistema busca automáticamente si el jugador existe</li>
                <li>Si encuentra el jugador:
                  <ul>
                    <li>Carga automáticamente todos sus datos (apellidos, nombres, nacionalidad, sexo, teléfono, provincia, dirección)</li>
                    <li>Deshabilita los campos protegidos (Apellidos, Nombres, Nacionalidad, Sexo, Provincia)</li>
                    <li>Mantiene habilitados los campos que puedes modificar: <strong>Número de Jugador</strong>, <strong>Teléfono</strong> y <strong>Dirección</strong></li>
                    <li>Muestra un mensaje indicando que el jugador fue encontrado</li>
                  </ul>
                </li>
                <li>Si no encuentra el jugador, todos los campos permanecen habilitados para que puedas ingresar los datos nuevos</li>
                <li>Mientras busca, muestra un indicador de carga (spinner)</li>
              </ul>
              <Alert variant="info" className="mt-2 mb-0">
                <small><strong>Consejo:</strong> La búsqueda automática requiere al menos 3 caracteres en la cédula. Si cambias la cédula mientras escribes, el sistema limpia los demás campos automáticamente.</small>
              </Alert>
            </div>

            <div className="mb-4">
              <h5 className="text-primary mb-3">
                <TbRefresh className="me-2" />
                7. Paginación
              </h5>
              <p>La tabla muestra 10 jugadores por página:</p>
              <ul>
                <li>Usa los botones de navegación para cambiar de página</li>
                <li>El contador muestra cuántos jugadores estás visualizando</li>
                <li>La paginación se aplica a los jugadores filtrados actualmente</li>
              </ul>
            </div>

            <div className="mb-3">
              <h5 className="text-primary mb-3">
                <TbFilter className="me-2" />
                8. Consejos Adicionales
              </h5>
              <ul>
                <li>Usa los filtros de Equipo y Torneo para encontrar rápidamente los jugadores que necesitas</li>
                <li>La búsqueda funciona en tiempo real, no necesitas presionar Enter</li>
                <li>Si un jugador ya existe, aprovecha la búsqueda automática por cédula para ahorrar tiempo</li>
                <li>Al exportar, el sistema te advierte sobre jugadores en múltiples categorías o equipos</li>
                <li>El número de jugador es específico para cada relación equipo-torneo</li>
                <li>Si tu usuario tiene un equipo asignado, solo verás y podrás gestionar jugadores de ese equipo</li>
                <li>Los campos deshabilitados indican que el jugador ya existe y no pueden modificarse desde esta pantalla</li>
                <li>El sistema valida automáticamente los campos obligatorios antes de guardar</li>
              </ul>
            </div>

            <Alert variant="success" className="mb-0">
              <strong>¿Necesitas más ayuda?</strong>
              <br />
              <small>Si tienes preguntas adicionales o encuentras algún problema, contacta al administrador del sistema.</small>
            </Alert>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowManualUsuario(false)}>
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Tabla */}
      <Card>
        <CardHeader>
          <Row className="align-items-center">
            <Col>
              <h4 className="mb-0">Lista de Jugadores</h4>
            </Col>
            <Col xs="auto" className="d-flex gap-2 align-items-center">
              <div className="position-relative" style={{ width: '250px' }}>
                <FormControl
                  type="text"
                  placeholder="Buscar por nombre o cédula..."
                  value={globalFilter}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  className="ps-5"
                />
                <TbSearch className="position-absolute top-50 translate-middle-y ms-2" style={{ left: '0.5rem', pointerEvents: 'none' }} />
              </div>
              <Button
                variant="success"
                onClick={handleVerificarYExportar}
                disabled={table.getFilteredRowModel().rows.length === 0 || saving}
                title="Descargar jugadores filtrados en Excel"
              >
                <TbDownload className="me-1" />
                <span className="d-none d-sm-inline">Descargar Excel</span>
                <span className="d-sm-none">Excel</span>
              </Button>
              <Button
                variant="secondary"
                onClick={loadJugadores}
                disabled={saving}
              >
                <TbRefresh className="me-1" />
                Actualizar
              </Button>
              <Button 
                variant="outline-info" 
                onClick={() => setShowManualUsuario(true)}
                title="Manual de Usuario"
              >
                <TbHelp className="me-1" />
                <span className="d-none d-sm-inline">Ayuda</span>
              </Button>
            </Col>
          </Row>
        </CardHeader>
        <CardBody>
          {error && (
            <Alert variant="danger" dismissible onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
          
          {success && (
            <Alert variant="success" dismissible onClose={() => setSuccess(null)}>
              {success}
            </Alert>
          )}

          {loading ? (
            <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
              <Spinner animation="border" />
            </div>
          ) : (
            <>
              <DataTable<JugadorRow> table={table} emptyMessage="No se encontraron jugadores" />
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
            </>
          )}

        </CardBody>
      </Card>
    </Container>
  )
}
