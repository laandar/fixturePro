'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import { Button, Card, CardBody, CardHeader, Col, Container, Row, Alert, Badge, Nav, NavItem, NavLink, Table, Modal, ModalHeader, ModalBody, ModalFooter, Form, FormControl, FloatingLabel, FormSelect, Tab } from 'react-bootstrap'
import { LuTrophy, LuCalendar, LuUsers, LuGamepad2, LuSettings, LuPlus, LuTrash, LuTriangle, LuCheck, LuX, LuClock, LuFilter, LuDownload, LuInfo } from 'react-icons/lu'
import { getTorneoById, addEquiposToTorneo, removeEquipoFromTorneo, generateFixtureForTorneo, getEncuentrosByTorneo, updateEncuentro, regenerateFixtureFromJornada, generateSingleJornada, regenerateSingleJornada, deleteJornada } from '../actions'
import { getCategorias, getEquipos } from '../../equipos/actions'
import type { TorneoWithRelations, EquipoWithRelations, Categoria, EncuentroWithRelations } from '@/db/types'
// @ts-ignore
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'

const TorneoDetailPage = () => {
  const params = useParams()
  const torneoId = parseInt(params.id as string)
  
  const [torneo, setTorneo] = useState<TorneoWithRelations | null>(null)
  const [equiposDisponibles, setEquiposDisponibles] = useState<EquipoWithRelations[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [encuentros, setEncuentros] = useState<EncuentroWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  // Estados para modales
  const [showAddEquiposModal, setShowAddEquiposModal] = useState(false)
  const [showFixtureModal, setShowFixtureModal] = useState(false)
  const [showEncuentroModal, setShowEncuentroModal] = useState(false)
  const [selectedEquipos, setSelectedEquipos] = useState<number[]>([])
  const [editingEncuentro, setEditingEncuentro] = useState<EncuentroWithRelations | null>(null)
  const [showRestrictions, setShowRestrictions] = useState(false)
  const [unavailableByJornada, setUnavailableByJornada] = useState<Record<number, number[]>>({})
  const [equiposDescansan, setEquiposDescansan] = useState<Record<number, number>>({})
  const [showRestrictionsModal, setShowRestrictionsModal] = useState(false)
  const [selectedJornada, setSelectedJornada] = useState<number>(1)
  const [restriccionesJornada, setRestriccionesJornada] = useState<number[]>([])
  const [showJornadaModal, setShowJornadaModal] = useState(false)
  const [jornadaAGenerar, setJornadaAGenerar] = useState<number>(1)
  const [showRegenerarJornadaModal, setShowRegenerarJornadaModal] = useState(false)
  const [jornadaARegenerar, setJornadaARegenerar] = useState<number>(1)
  const [showDeleteJornadaModal, setShowDeleteJornadaModal] = useState(false)
  const [jornadaAEliminar, setJornadaAEliminar] = useState<number>(1)
  
  // Estado para tabs
  const [activeTab, setActiveTab] = useState('general')

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const [torneoData, equiposData, categoriasData, encuentrosData] = await Promise.all([
        getTorneoById(torneoId),
        getEquipos(),
        getCategorias(),
        getEncuentrosByTorneo(torneoId)
      ])
      
      setTorneo((torneoData ?? null) as TorneoWithRelations | null)
      setEquiposDisponibles(equiposData)
      setCategorias(categoriasData)
      setEncuentros(encuentrosData as any)
      
      // Calcular equipos que descansan basándose en los encuentros cargados
      if (torneoData && encuentrosData) {
        const equiposDescansanCalculados: Record<number, number> = {}
        const equiposParticipantes = (torneoData as TorneoWithRelations).equiposTorneo?.map(et => et.equipo_id) || []
        
        if (equiposParticipantes.length % 2 !== 0) {
          // Agrupar encuentros por jornada
          const jornadas = new Map<number, any[]>()
          encuentrosData.forEach((encuentro: any) => {
            if (encuentro.jornada) {
              if (!jornadas.has(encuentro.jornada)) {
                jornadas.set(encuentro.jornada, [])
              }
              jornadas.get(encuentro.jornada)!.push(encuentro)
            }
          })
          
          // Para cada jornada, encontrar el equipo que descansa
          jornadas.forEach((encuentrosJornada, jornada) => {
            const equiposQueJuegan = new Set<number>()
            
            encuentrosJornada.forEach((encuentro: any) => {
              equiposQueJuegan.add(encuentro.equipo_local_id)
              equiposQueJuegan.add(encuentro.equipo_visitante_id)
            })
            
            // El equipo que descansa es el que no aparece en ningún encuentro
            const equipoQueDescansa = equiposParticipantes.find(equipoId => 
              !equiposQueJuegan.has(equipoId)
            )
            
            if (equipoQueDescansa) {
              equiposDescansanCalculados[jornada] = equipoQueDescansa
            }
          })
          
          setEquiposDescansan(equiposDescansanCalculados)
        }
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (torneoId) {
      loadData()
    }
  }, [torneoId])

  const handleAddEquipos = async () => {
    if (selectedEquipos.length === 0) {
      setError('Debes seleccionar al menos un equipo')
      return
    }

    try {
      await addEquiposToTorneo(torneoId, selectedEquipos)
      setSuccess('Equipos agregados exitosamente')
      setSelectedEquipos([])
      setShowAddEquiposModal(false)
      await loadData()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error al agregar equipos')
    }
  }

  const handleRemoveEquipo = async (equipoId: number) => {
    try {
      await removeEquipoFromTorneo(torneoId, equipoId)
      setSuccess('Equipo removido exitosamente')
      await loadData()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error al remover equipo')
    }
  }

  const handleGenerateFixture = async () => {
    if (!torneo?.equiposTorneo || torneo.equiposTorneo.length < 2) {
      setError('Se necesitan al menos 2 equipos para generar un fixture')
      return
    }

    try {
      const equipos = torneo.equiposTorneo.map(et => et.equipo!).filter(e => e)
      const result = await generateFixtureForTorneo(torneoId, equipos, {})
      
      // Capturar información de equipos que descansan
      if (result.equiposDescansan) {
        setEquiposDescansan(result.equiposDescansan)
      }
      
      setSuccess(`Fixture generado exitosamente con ${result.encuentrosCreados} encuentros`)
      setShowFixtureModal(false)
      await loadData()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error al generar fixture')
    }
  }



  const handleUpdateEncuentro = async (formData: FormData) => {
    if (!editingEncuentro) return

    try {
      await updateEncuentro(editingEncuentro.id, formData)
      setSuccess('Encuentro actualizado exitosamente')
      setShowEncuentroModal(false)
      setEditingEncuentro(null)
      await loadData()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error al actualizar encuentro')
    }
  }

  const handleRegenerarFixtureConRestricciones = async () => {
    if (!torneo?.equiposTorneo || torneo.equiposTorneo.length < 2) {
      setError('Se necesitan al menos 2 equipos para regenerar el fixture')
      return
    }

    const jornadaActual = getJornadaActual()

    try {
      const result = await regenerateFixtureFromJornada(torneoId, jornadaActual, {
        unavailableByJornada: unavailableByJornada,
        diasEntreJornadas: 7
      })
      
      // Capturar información de equipos que descansan
      if (result.equiposDescansan) {
        setEquiposDescansan(result.equiposDescansan)
      }
      
      setSuccess(`Fixture regenerado exitosamente desde la jornada ${jornadaActual}. ${result.encuentrosCreados} encuentros creados, ${result.encuentrosEliminados} eliminados.`)
      setShowRestrictionsModal(false)
      await loadData()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error al regenerar fixture')
    }
  }

  const handleGenerarJornada = async () => {
    if (!torneo?.equiposTorneo || torneo.equiposTorneo.length < 2) {
      setError('Se necesitan al menos 2 equipos para generar la jornada')
      return
    }

    console.log(`Generando jornada ${jornadaAGenerar} con restricciones:`, unavailableByJornada)
    console.log(`Restricciones para jornada ${jornadaAGenerar}:`, unavailableByJornada[jornadaAGenerar] || [])
    console.log(`Estado completo de restricciones:`, unavailableByJornada)
    
    // TEMPORAL: Configurar restricción para UDEF en jornada 2 si no está configurada
    if (jornadaAGenerar === 2 && (!unavailableByJornada[2] || unavailableByJornada[2].length === 0)) {
      console.log('Configurando restricción temporal para UDEF en jornada 2')
      const restriccionesTemporales = { ...unavailableByJornada, 2: [9] } // 9 es el ID de UDEF
      console.log('Restricciones temporales:', restriccionesTemporales)
      
      try {
        const result = await generateSingleJornada(torneoId, jornadaAGenerar, {
          unavailableByJornada: restriccionesTemporales,
          diasEntreJornadas: 7
        })
        
        setSuccess(`Jornada ${result.jornada} generada exitosamente. ${result.encuentrosCreados} encuentros creados.`)
        if (result.equipoQueDescansa) {
          setEquiposDescansan(prev => ({ ...prev, [result.jornada]: result.equipoQueDescansa! }))
        }
        setShowJornadaModal(false)
        await loadData()
        return
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Error al generar jornada')
        return
      }
    }

    try {
      const result = await generateSingleJornada(torneoId, jornadaAGenerar, {
        unavailableByJornada: unavailableByJornada,
        diasEntreJornadas: 7
      })
      
      setSuccess(`Jornada ${result.jornada} generada exitosamente. ${result.encuentrosCreados} encuentros creados.`)
      if (result.equipoQueDescansa) {
        setEquiposDescansan(prev => ({ ...prev, [result.jornada]: result.equipoQueDescansa! }))
      }
      setShowJornadaModal(false)
      await loadData()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error al generar jornada')
    }
  }

  const handleRegenerarJornada = async () => {
    if (!torneo?.equiposTorneo || torneo.equiposTorneo.length < 2) {
      setError('Se necesitan al menos 2 equipos para regenerar la jornada')
      return
    }

    try {
      const result = await regenerateSingleJornada(torneoId, jornadaARegenerar, {
        unavailableByJornada: unavailableByJornada,
        diasEntreJornadas: 7
      })
      
      setSuccess(`Jornada ${result.jornada} regenerada exitosamente. ${result.encuentrosCreados} encuentros creados, ${result.encuentrosEliminados} eliminados.`)
      if (result.equipoQueDescansa) {
        setEquiposDescansan(prev => ({ ...prev, [result.jornada]: result.equipoQueDescansa! }))
      }
      setShowRegenerarJornadaModal(false)
      await loadData()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error al regenerar jornada')
    }
  }

  const handleDeleteJornada = async () => {
    try {
      const result = await deleteJornada(torneoId, jornadaAEliminar)
      
      setSuccess(result.mensaje)
      setShowDeleteJornadaModal(false)
      await loadData()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error al eliminar jornada')
    }
  }

  const handleAbrirRestricciones = (jornada: number) => {
    const jornadaActual = getJornadaActual()
    const jornadas = getEncuentrosPorJornada()
    const jornadasOrdenadas = Object.keys(jornadas).map(Number).sort((a, b) => a - b)
    
    // Permitir configurar la jornada actual o la siguiente jornada que no existe
    const proximaJornadaDisponible = jornadasOrdenadas.length > 0 ? Math.max(...jornadasOrdenadas) + 1 : 1
    
    if (jornada !== jornadaActual && jornada !== proximaJornadaDisponible) {
      setError('Solo puedes configurar restricciones para la jornada actual o la próxima jornada disponible')
      return
    }
    
    setSelectedJornada(jornada)
    setRestriccionesJornada(unavailableByJornada[jornada] || [])
    setShowRestrictionsModal(true)
  }

  const handleGuardarRestricciones = () => {
    const nuevasRestricciones = { ...unavailableByJornada }
    
    // Guardar restricciones para la jornada seleccionada
    if (restriccionesJornada.length > 0) {
      nuevasRestricciones[selectedJornada] = restriccionesJornada
    } else {
      delete nuevasRestricciones[selectedJornada]
    }
    
    setUnavailableByJornada(nuevasRestricciones)
    setShowRestrictionsModal(false)
    setSuccess(`Restricciones guardadas exitosamente para la jornada ${selectedJornada}`)
  }

  // Función para simular que la jornada 1 ya pasó (solo para ejemplificar)
  const handleSimularJornada1Completada = async () => {
    try {
      const encuentrosJornada1 = encuentros.filter(e => e.jornada === 1)
      
      if (encuentrosJornada1.length === 0) {
        setError('No hay encuentros en la jornada 1 para simular')
        return
      }

      // Actualizar todos los encuentros de la jornada 1 como finalizados
      for (const encuentro of encuentrosJornada1) {
        const formData = new FormData()
        formData.append('estado', 'finalizado')
        formData.append('goles_local', '2')
        formData.append('goles_visitante', '1')
        formData.append('fecha_jugada', new Date().toISOString())
        
        await updateEncuentro(encuentro.id, formData)
      }
      
      setSuccess('Jornada 1 marcada como completada. Ahora la jornada 2 será la actual.')
      await loadData()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error al simular jornada completada')
    }
  }

  const getEncuentrosPorJornada = () => {
    const jornadas: Record<number, EncuentroWithRelations[]> = {}
    encuentros.forEach(encuentro => {
      if (encuentro.jornada) {
        if (!jornadas[encuentro.jornada]) {
          jornadas[encuentro.jornada] = []
        }
        jornadas[encuentro.jornada].push(encuentro)
      }
    })
    return jornadas
  }

  // Función para determinar si una jornada está jugada (todos los encuentros finalizados o en curso)
  const isJornadaJugada = (jornada: number) => {
    const encuentrosJornada = encuentros.filter(e => e.jornada === jornada)
    if (encuentrosJornada.length === 0) return false
    
    return encuentrosJornada.every(e => 
      e.estado === 'finalizado' || e.estado === 'en_curso'
    )
  }

  // Función para obtener la jornada actual (próxima jornada no jugada)
  const getJornadaActual = () => {
    const jornadas = getEncuentrosPorJornada()
    const jornadasOrdenadas = Object.keys(jornadas)
      .map(Number)
      .sort((a, b) => a - b)
    
    // Buscar la primera jornada que no esté jugada
    for (const jornada of jornadasOrdenadas) {
      if (!isJornadaJugada(jornada)) {
        return jornada
      }
    }
    
    // Si todas las jornadas están jugadas, retornar la siguiente
    return jornadasOrdenadas.length > 0 ? Math.max(...jornadasOrdenadas) + 1 : 1
  }

  // Función para obtener el estado de una jornada
  const getEstadoJornada = (jornada: number) => {
    if (isJornadaJugada(jornada)) {
      return 'jugada'
    }
    
    const jornadaActual = getJornadaActual()
    if (jornada === jornadaActual) {
      return 'actual'
    }
    
    return 'futura'
  }

  // Función para verificar si una jornada se puede regenerar
  const sePuedeRegenerarJornada = (jornada: number) => {
    const encuentrosJornada = encuentros.filter(e => e.jornada === jornada)
    if (encuentrosJornada.length === 0) return false // No existe la jornada
    
    // Se puede regenerar si no está cerrada (no todos los encuentros están finalizados o en curso)
    return !encuentrosJornada.every(e => e.estado === 'finalizado' || e.estado === 'en_curso')
  }

  const getResumenRestricciones = (restricciones: Record<number, number[]>) => {
    const jornadasConRestricciones = Object.keys(restricciones).filter(jornada => 
      restricciones[parseInt(jornada)].length > 0
    )
    
    if (jornadasConRestricciones.length === 0) return null
    
    const totalRestricciones = jornadasConRestricciones.reduce((total, jornada) => 
      total + restricciones[parseInt(jornada)].length, 0
    )
    
    return {
      jornadas: jornadasConRestricciones.length,
      totalRestricciones,
      jornadasList: jornadasConRestricciones.map(j => parseInt(j)).sort((a, b) => a - b)
    }
  }

  const getEstadoBadge = (estado: string | null) => {
    const config: Record<string, { bg: string; text: string; label: string }> = {
      programado: { bg: 'secondary', text: 'secondary', label: 'Programado' },
      en_curso: { bg: 'warning', text: 'warning', label: 'En Curso' },
      finalizado: { bg: 'success', text: 'success', label: 'Finalizado' },
      cancelado: { bg: 'danger', text: 'danger', label: 'Cancelado' },
      aplazado: { bg: 'info', text: 'info', label: 'Aplazado' }
    }
    const estadoKey = estado ?? 'programado'
    const configItem = config[estadoKey] || { bg: 'secondary', text: 'secondary', label: estadoKey }
    
    return (
      <Badge bg={configItem.bg} className={`text-${configItem.text}`}>
        {configItem.label}  
      </Badge>
    )
  }

  const handleDownloadFixtureExcel = () => {
    if (!torneo || encuentros.length === 0) {
      setError('No hay fixture disponible para descargar')
      return
    }

    try {
      // Crear un nuevo libro de trabajo
      const workbook = XLSX.utils.book_new()
      
      // Datos del torneo
      const torneoData = [
        ['INFORMACIÓN DEL TORNEO'],
        [''],
        ['Nombre:', torneo.nombre],
        ['Descripción:', torneo.descripcion || 'Sin descripción'],
        ['Categoría:', torneo.categoria?.nombre || 'Sin categoría'],
        ['Tipo:', torneo.tipo_torneo === 'liga' ? 'Liga' : torneo.tipo_torneo === 'eliminacion' ? 'Eliminación' : 'Grupos'],
        ['Permite Revancha:', torneo.permite_revancha ? 'Sí' : 'No'],
        ['Estado:', torneo.estado === 'planificado' ? 'Planificado' : torneo.estado === 'en_curso' ? 'En Curso' : torneo.estado === 'finalizado' ? 'Finalizado' : 'Cancelado'],
        ['Fecha Inicio:', torneo.fecha_inicio ? new Date(torneo.fecha_inicio).toLocaleDateString('es-ES') : 'N/A'],
        ['Fecha Fin:', torneo.fecha_fin ? new Date(torneo.fecha_fin).toLocaleDateString('es-ES') : 'N/A'],
        ['Total Equipos:', equiposParticipantes.length],
        ['Total Encuentros:', encuentros.length],
        ['Encuentros Jugados:', encuentros.filter(e => e.estado === 'finalizado').length],
        ['Encuentros Pendientes:', encuentros.filter(e => e.estado === 'programado').length],
        [''],
        ['GENERADO EL:', new Date().toLocaleString('es-ES')]
      ]

      // Crear hoja de información del torneo
      const torneoSheet = XLSX.utils.aoa_to_sheet(torneoData)
      XLSX.utils.book_append_sheet(workbook, torneoSheet, 'Información Torneo')

      // Preparar datos del fixture por jornadas
      const jornadas = getEncuentrosPorJornada()
      const jornadasOrdenadas = Object.keys(jornadas).map(Number).sort((a, b) => a - b)

      jornadasOrdenadas.forEach(jornada => {
        const encuentrosJornada = jornadas[jornada]
        const equipoQueDescansa = getEquipoQueDescansa(jornada)
        
        // Encabezados para cada jornada
        const jornadaData = [
          [`JORNADA ${jornada}`],
          [''],
          ['Local', 'Goles Local', 'Goles Visitante', 'Visitante', 'Fecha', 'Estado', 'Cancha', 'Observaciones']
        ]

        // Agregar encuentros de la jornada
        encuentrosJornada.forEach(encuentro => {
          jornadaData.push([
            encuentro.equipoLocal?.nombre || 'N/A',
            encuentro.goles_local !== null ? encuentro.goles_local.toString() : '',
            encuentro.goles_visitante !== null ? encuentro.goles_visitante.toString() : '',
            encuentro.equipoVisitante?.nombre || 'N/A',
            encuentro.fecha_programada ? new Date(encuentro.fecha_programada).toLocaleDateString('es-ES') : 'Por definir',
            encuentro.estado === 'programado' ? 'Programado' : 
            encuentro.estado === 'en_curso' ? 'En Curso' : 
            encuentro.estado === 'finalizado' ? 'Finalizado' : 
            encuentro.estado === 'cancelado' ? 'Cancelado' : 
            encuentro.estado === 'aplazado' ? 'Aplazado' : 'N/A',
            encuentro.cancha || '',
            encuentro.observaciones || ''
          ])
        })

        // Agregar información del equipo que descansa si existe
        if (equipoQueDescansa) {
          jornadaData.push([''])
          jornadaData.push(['EQUIPO QUE DESCANSA:', equipoQueDescansa.nombre])
        }

        // Crear hoja para la jornada
        const jornadaSheet = XLSX.utils.aoa_to_sheet(jornadaData)
        XLSX.utils.book_append_sheet(workbook, jornadaSheet, `Jornada ${jornada}`)
      })

      // Crear hoja de tabla de posiciones
      const tablaData = [
        ['TABLA DE POSICIONES'],
        [''],
        ['Pos', 'Equipo', 'PJ', 'PG', 'PE', 'PP', 'GF', 'GC', 'DG', 'Pts']
      ]

      equiposParticipantes
        .sort((a, b) => {
          const puntosA = a.puntos ?? 0
          const puntosB = b.puntos ?? 0
          if (puntosB !== puntosA) return puntosB - puntosA
          const dgA = a.diferencia_goles ?? 0
          const dgB = b.diferencia_goles ?? 0
          return dgB - dgA
        })
        .forEach((equipoTorneo, index) => {
          tablaData.push([
            (index + 1).toString(),
            equipoTorneo.equipo?.nombre || 'N/A',
            (equipoTorneo.partidos_jugados ?? 0).toString(),
            (equipoTorneo.partidos_ganados ?? 0).toString(),
            (equipoTorneo.partidos_empatados ?? 0).toString(),
            (equipoTorneo.partidos_perdidos ?? 0).toString(),
            (equipoTorneo.goles_favor ?? 0).toString(),
            (equipoTorneo.goles_contra ?? 0).toString(),
            ((equipoTorneo.diferencia_goles ?? 0) >= 0 ? '+' : '') + (equipoTorneo.diferencia_goles ?? 0).toString(),
            (equipoTorneo.puntos ?? 0).toString()
          ])
        })

      const tablaSheet = XLSX.utils.aoa_to_sheet(tablaData)
      XLSX.utils.book_append_sheet(workbook, tablaSheet, 'Tabla Posiciones')

      // Generar el archivo Excel
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
      const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      
      // Descargar el archivo
      const fileName = `Fixture_${torneo.nombre.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`
      saveAs(data, fileName)
      
      setSuccess('Fixture descargado exitosamente en formato Excel')
    } catch (error) {
      setError('Error al generar el archivo Excel: ' + (error instanceof Error ? error.message : 'Error desconocido'))
    }
  }

  const getEquipoQueDescansa = (jornada: number) => {
    // Primero intentar usar el estado equiposDescansan (si está disponible)
    const equipoId = equiposDescansan[jornada]
    if (equipoId) {
      const equipoTorneo = torneo?.equiposTorneo?.find(et => et.equipo_id === equipoId)
      return equipoTorneo?.equipo || null
    }
    
    // Si no está en el estado, calcular dinámicamente basándose en los encuentros
    if (!torneo?.equiposTorneo || encuentros.length === 0) return null
    
    const equiposParticipantes = torneo.equiposTorneo.map(et => et.equipo_id)
    const encuentrosJornada = encuentros.filter(e => e.jornada === jornada)
    
    // Debug: mostrar información de la jornada
    console.log(`Jornada ${jornada}:`, {
      equiposParticipantes,
      encuentrosJornada: encuentrosJornada.length,
      equiposQueJuegan: encuentrosJornada.map(e => [e.equipo_local_id, e.equipo_visitante_id])
    })
    
    // Si hay número impar de equipos, uno debe descansar
    if (equiposParticipantes.length % 2 !== 0) {
      const equiposQueJuegan = new Set<number>()
      
      encuentrosJornada.forEach(encuentro => {
        equiposQueJuegan.add(encuentro.equipo_local_id)
        equiposQueJuegan.add(encuentro.equipo_visitante_id)
      })
      
      // El equipo que descansa es el que no aparece en ningún encuentro de esta jornada
      const equipoQueDescansa = equiposParticipantes.find(equipoId => 
        !equiposQueJuegan.has(equipoId)
      )
      
      console.log(`Equipo que descansa en jornada ${jornada}:`, equipoQueDescansa)
      
      if (equipoQueDescansa) {
        const equipoTorneo = torneo.equiposTorneo.find(et => et.equipo_id === equipoQueDescansa)
        return equipoTorneo?.equipo || null
      }
    }
    
    return null
  }

  if (loading) {
    return (
      <Container fluid>
        <PageBreadcrumb title="Detalle del Torneo" subtitle="Apps" />
        <div className="text-center py-5">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Cargando...</span>
          </div>
        </div>
      </Container>
    )
  }

  if (!torneo) {
    return (
      <Container fluid>
        <PageBreadcrumb title="Torneo no encontrado" subtitle="Apps" />
        <Alert variant="danger">El torneo no fue encontrado</Alert>
      </Container>
    )
  }

  const jornadas = getEncuentrosPorJornada()
  const equiposParticipantes = torneo.equiposTorneo || []
  const equiposDisponiblesParaAgregar = equiposDisponibles.filter(
    equipo => !equiposParticipantes.some(ep => ep.equipo_id === equipo.id)
  )
  const totalJornadasIda = Math.max(0, equiposParticipantes.length - 1)
  const totalJornadas = torneo.permite_revancha ? totalJornadasIda * 2 : totalJornadasIda

  return (
    <Container fluid>
      <PageBreadcrumb title={torneo.nombre} subtitle="Apps" />

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

      {/* Información general del torneo */}
      <Row className="mb-4">
        <Col>
          <Card>
            <CardHeader className="d-flex justify-content-between align-items-center">
              <div>
                <h4 className="mb-0">
                  <LuTrophy className="me-2 text-primary" />
                  {torneo.nombre}
                </h4>
                <p className="text-muted mb-0">{torneo.descripcion}</p>
              </div>
              <div className="d-flex gap-2">
                <Badge bg={torneo.estado === 'en_curso' ? 'success' : torneo.estado === 'finalizado' ? 'primary' : 'secondary'}>
                  {torneo.estado === 'planificado' ? 'Planificado' : 
                   torneo.estado === 'en_curso' ? 'En Curso' : 
                   torneo.estado === 'finalizado' ? 'Finalizado' : 'Cancelado'}
                </Badge>
              </div>
            </CardHeader>
            <CardBody>
              <Row>
                <Col md={3}>
                  <div className="text-center">
                    <LuTrophy className="fs-2 text-primary mb-2" />
                    <h6>Categoría</h6>
                    <p className="text-muted">{torneo.categoria?.nombre || 'Sin categoría'}</p>
                  </div>
                </Col>
                <Col md={3}>
                  <div className="text-center">
                    <LuUsers className="fs-2 text-success mb-2" />
                    <h6>Equipos</h6>
                    <p className="text-muted">{equiposParticipantes.length}</p>
                  </div>
                </Col>
                <Col md={3}>
                  <div className="text-center">
                    <LuGamepad2 className="fs-2 text-warning mb-2" />
                    <h6>Encuentros</h6>
                    <p className="text-muted">{encuentros.length}</p>
                  </div>
                </Col>
                <Col md={3}>
                  <div className="text-center">
                    <LuCalendar className="fs-2 text-info mb-2" />
                    <h6>Período</h6>
                    <p className="text-muted">
                      {torneo.fecha_inicio ? new Date(torneo.fecha_inicio).toLocaleDateString('es-ES') : 'N/A'} - 
                      {torneo.fecha_fin ? new Date(torneo.fecha_fin).toLocaleDateString('es-ES') : 'N/A'}
                    </p>
                  </div>
                </Col>

              </Row>
            </CardBody>
          </Card>
        </Col>
      </Row>

      {/* Tabs de navegación */}
      <Row>
        <Col>
          <Card>
            <Tab.Container activeKey={activeTab} onSelect={(k) => setActiveTab(k || 'general')}>
              <CardHeader>
                <Nav variant="tabs">
                  <NavItem>
                    <NavLink eventKey="general">Información General</NavLink>
                  </NavItem>
                  <NavItem>
                    <NavLink eventKey="equipos">Equipos Participantes</NavLink>
                  </NavItem>
                  <NavItem>
                    <NavLink eventKey="fixture">Fixture</NavLink>
                  </NavItem>
                  <NavItem>
                    <NavLink eventKey="tabla">Tabla de Posiciones</NavLink>
                  </NavItem>
                  <NavItem>
                    <NavLink eventKey="restricciones">Restricciones por Jornada</NavLink>
                  </NavItem>
                </Nav>
              </CardHeader>
              <CardBody>
                <Tab.Content>
                {/* Tab: Información General */}
                <Tab.Pane eventKey="general">
                  <Row>
                    <Col md={6}>
                      <h5>Detalles del Torneo</h5>
                      <Table borderless>
                        <tbody>
                          <tr>
                            <td><strong>Nombre:</strong></td>
                            <td>{torneo.nombre}</td>
                          </tr>
                          <tr>
                            <td><strong>Descripción:</strong></td>
                            <td>{torneo.descripcion || 'Sin descripción'}</td>
                          </tr>
                          <tr>
                            <td><strong>Tipo:</strong></td>
                            <td>
                              <Badge bg={torneo.tipo_torneo === 'liga' ? 'primary' : 'warning'}>
                                {torneo.tipo_torneo === 'liga' ? 'Liga' : 
                                 torneo.tipo_torneo === 'eliminacion' ? 'Eliminación' : 'Grupos'}
                              </Badge>
                            </td>
                          </tr>
                          <tr>
                            <td><strong>Permite Revancha:</strong></td>
                            <td>
                              <Badge bg={torneo.permite_revancha ? 'success' : 'secondary'}>
                                {torneo.permite_revancha ? 'Sí' : 'No'}
                              </Badge>
                            </td>
                          </tr>
                        </tbody>
                      </Table>
                    </Col>
                    <Col md={6}>
                      <h5>Estadísticas</h5>
                      <div className="d-grid gap-3">
                        <div className="d-flex justify-content-between align-items-center p-3 bg-light rounded">
                          <span>Total de Equipos:</span>
                          <Badge bg="primary">{equiposParticipantes.length}</Badge>
                        </div>
                        <div className="d-flex justify-content-between align-items-center p-3 bg-light rounded">
                          <span>Total de Encuentros:</span>
                          <Badge bg="success">{encuentros.length}</Badge>
                        </div>
                        <div className="d-flex justify-content-between align-items-center p-3 bg-light rounded">
                          <span>Encuentros Jugados:</span>
                          <Badge bg="info">{encuentros.filter(e => e.estado === 'finalizado').length}</Badge>
                        </div>
                        <div className="d-flex justify-content-between align-items-center p-3 bg-light rounded">
                          <span>Encuentros Pendientes:</span>
                          <Badge bg="warning">{encuentros.filter(e => e.estado === 'programado').length}</Badge>
                        </div>
                      </div>
                    </Col>
                  </Row>


                </Tab.Pane>

                {/* Tab: Equipos Participantes */}
                <Tab.Pane eventKey="equipos">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5>Equipos Participantes ({equiposParticipantes.length})</h5>
                    <div className="d-flex gap-2">
                      <Button 
                        variant="primary" 
                        size="sm"
                        onClick={() => setShowAddEquiposModal(true)}
                        disabled={equiposDisponiblesParaAgregar.length === 0}>
                        <LuPlus className="me-1" />
                        Agregar Equipos
                      </Button>
                      {equiposParticipantes.length >= 2 && (
                        <Button 
                          variant="success" 
                          size="sm"
                          onClick={() => setShowFixtureModal(true)}>
                          <LuSettings className="me-1" />
                          Generar Fixture
                        </Button>
                      )}
                    </div>
                  </div>

                  <Row>
                    {equiposParticipantes.map((equipoTorneo) => (
                      <Col key={equipoTorneo.id} md={6} lg={4} className="mb-3">
                        <Card>
                          <CardBody className="text-center">
                            <div className="avatar avatar-lg mx-auto mb-3">
                              <img 
                                src={equipoTorneo.equipo?.imagen_equipo || 'https://via.placeholder.com/64x64/17a2b8/ffffff?text=🏅'} 
                                alt="" 
                                className="img-fluid rounded-circle"
                                width={64}
                                height={64}
                              />
                            </div>
                            <h6>{equipoTorneo.equipo?.nombre}</h6>
                            <p className="text-muted small mb-2">
                              {equipoTorneo.equipo?.entrenador?.nombre || 'Sin entrenador'}
                            </p>
                            <div className="d-flex justify-content-center gap-2">
                              <Badge bg="primary">{equipoTorneo.puntos ?? 0} pts</Badge>
                              <Badge bg="secondary">{equipoTorneo.partidos_jugados ?? 0} PJ</Badge>
                            </div>
                            <Button 
                              variant="outline-danger" 
                              size="sm" 
                              className="mt-2"
                              onClick={() => handleRemoveEquipo(equipoTorneo.equipo_id)}>
                              <LuTrash className="me-1" />
                              Remover
                            </Button>
                          </CardBody>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                </Tab.Pane>

                {/* Tab: Fixture */}
                <Tab.Pane eventKey="fixture">
                  {encuentros.length === 0 ? (
                    <div className="text-center py-5">
                      <LuGamepad2 className="fs-1 text-muted mb-3" />
                      <h5>No hay encuentros programados</h5>
                      <p className="text-muted">
                        {equiposParticipantes.length >= 2 
                          ? 'Genera el fixture para ver los encuentros programados'
                          : 'Agrega al menos 2 equipos para generar el fixture'}
                      </p>
                      {equiposParticipantes.length >= 2 && (
                        <Button 
                          variant="primary"
                          onClick={() => setShowFixtureModal(true)}>
                          <LuSettings className="me-1" />
                          Generar Fixture
                        </Button>
                      )}
                    </div>
                                    ) : (
                    <div>
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <h5>Fixture del Torneo</h5>
                        <div className="d-flex gap-2">
                          <Button 
                            variant="outline-success" 
                            size="sm"
                            onClick={handleDownloadFixtureExcel}
                            disabled={encuentros.length === 0}>
                            <LuDownload className="me-1" />
                            Descargar Excel
                          </Button>
                          <Button 
                            variant="outline-primary" 
                            size="sm"
                            onClick={() => setShowFixtureModal(true)}>
                            <LuSettings className="me-1" />
                            Regenerar Fixture Completo
                          </Button>
                          <Button 
                            variant="outline-success" 
                            size="sm"
                            onClick={() => setShowJornadaModal(true)}>
                            <LuPlus className="me-1" />
                            Generar Jornada Individual
                          </Button>
                          <Button 
                            variant="outline-warning" 
                            size="sm"
                            onClick={() => setShowRegenerarJornadaModal(true)}>
                            <LuTriangle className="me-1" />
                            Regenerar Jornada
                          </Button>

                        </div>
                      </div>
                      {Object.keys(jornadas).sort((a, b) => parseInt(a) - parseInt(b)).map(jornadaNum => (
                        <Card key={jornadaNum} className="mb-4">
                          <CardHeader>
                            <div className="d-flex justify-content-between align-items-center">
                              <div className="d-flex align-items-center gap-3">
                                <h6 className="mb-0">Jornada {jornadaNum}</h6>
                                {getEquipoQueDescansa(parseInt(jornadaNum)) && (
                                  <div className="d-flex align-items-center gap-2 bg-warning p-2 rounded">
                                    <img 
                                      src={getEquipoQueDescansa(parseInt(jornadaNum))?.imagen_equipo || 'https://via.placeholder.com/24x24/ffc107/000000?text=💤'} 
                                      alt="" 
                                      className="rounded-circle"
                                      width={24}
                                      height={24}
                                    />
                                    <span className="text-dark fw-semibold">
                                      🛌 {getEquipoQueDescansa(parseInt(jornadaNum))?.nombre} descansa
                                    </span>
                                  </div>
                                )}
                                {sePuedeRegenerarJornada(parseInt(jornadaNum)) && (
                                  <Badge bg="info" text="dark" className="ms-2">
                                    <LuTriangle className="me-1" />
                                    Regenerable
                                  </Badge>
                                )}
                                {!sePuedeRegenerarJornada(parseInt(jornadaNum)) && isJornadaJugada(parseInt(jornadaNum)) && (
                                  <Badge bg="success" text="dark" className="ms-2">
                                    <LuCheck className="me-1" />
                                    Cerrada
                                  </Badge>
                                )}
                              </div>
                              <div className="d-flex align-items-center gap-2">
                                <Badge bg="light" text="dark">
                                  {jornadas[parseInt(jornadaNum)].length} encuentros
                                </Badge>
                                {sePuedeRegenerarJornada(parseInt(jornadaNum)) && (
                                  <Button 
                                    variant="outline-warning" 
                                    size="sm"
                                    onClick={() => {
                                      setJornadaARegenerar(parseInt(jornadaNum))
                                      setShowRegenerarJornadaModal(true)
                                    }}
                                    title="Regenerar esta jornada">
                                    <LuTriangle className="fs-sm" />
                                  </Button>
                                )}
                                {sePuedeRegenerarJornada(parseInt(jornadaNum)) && (
                                  <Button 
                                    variant="outline-danger" 
                                    size="sm"
                                    onClick={() => {
                                      setJornadaAEliminar(parseInt(jornadaNum))
                                      setShowDeleteJornadaModal(true)
                                    }}
                                    title="Eliminar esta jornada">
                                    <LuTrash className="fs-sm" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </CardHeader>
                          <CardBody>
                            <Row>
                              {jornadas[parseInt(jornadaNum)].map((encuentro) => (
                                <Col key={encuentro.id} md={6} lg={4} className="mb-3">
                                  <Card className="border">
                                    <CardBody className="p-3">
                                      <div className="d-flex justify-content-between align-items-center mb-2">
                                        <div className="d-flex align-items-center gap-2">
                                          <img 
                                            src={encuentro.equipoLocal?.imagen_equipo || 'https://via.placeholder.com/24x24/007bff/ffffff?text=🏠'} 
                                            alt="" 
                                            className="rounded-circle"
                                            width={24}
                                            height={24}
                                          />
                                          <span className="fw-semibold">{encuentro.equipoLocal?.nombre}</span>
                                        </div>
                                        <div className="text-center">
                                          {encuentro.goles_local !== null && encuentro.goles_visitante !== null ? (
                                            <span className="fw-bold fs-5">
                                              {encuentro.goles_local} - {encuentro.goles_visitante}
                                            </span>
                                          ) : (
                                            <span className="text-muted">vs</span>
                                          )}
                                        </div>
                                        <div className="d-flex align-items-center gap-2">
                                          <span className="fw-semibold">{encuentro.equipoVisitante?.nombre}</span>
                                          <img 
                                            src={encuentro.equipoVisitante?.imagen_equipo || 'https://via.placeholder.com/24x24/28a745/ffffff?text=✈️'} 
                                            alt="" 
                                            className="rounded-circle"
                                            width={24}
                                            height={24}
                                          />
                                        </div>
                                      </div>
                                      <div className="d-flex justify-content-between align-items-center">
                                        <small className="text-muted">
                                          {encuentro.fecha_programada ? 
                                            new Date(encuentro.fecha_programada).toLocaleDateString('es-ES') : 'Fecha por definir'}
                                        </small>
                                        <div className="d-flex gap-1">
                                          {getEstadoBadge(encuentro.estado)}
                                          <Button 
                                            variant="outline-primary" 
                                            size="sm"
                                            onClick={() => {
                                              setEditingEncuentro(encuentro)
                                              setShowEncuentroModal(true)
                                            }}>
                                            <LuSettings className="fs-sm" />
                                          </Button>
                                        </div>
                                      </div>
                                    </CardBody>
                                  </Card>
                                </Col>
                              ))}
                            </Row>
                          </CardBody>
                        </Card>
                      ))}


                    </div>
                  )}
                </Tab.Pane>

                {/* Tab: Tabla de Posiciones */}
                <Tab.Pane eventKey="tabla">
                  <h5>Tabla de Posiciones</h5>
                  {equiposParticipantes.length === 0 ? (
                    <div className="text-center py-5">
                      <p className="text-muted">No hay equipos participantes</p>
                    </div>
                  ) : (
                    <Table striped bordered hover responsive>
                      <thead>
                        <tr>
                          <th>Pos</th>
                          <th>Equipo</th>
                          <th>PJ</th>
                          <th>PG</th>
                          <th>PE</th>
                          <th>PP</th>
                          <th>GF</th>
                          <th>GC</th>
                          <th>DG</th>
                          <th>Pts</th>
                        </tr>
                      </thead>
                      <tbody>
                        {equiposParticipantes
                          .sort((a, b) => {
                            const puntosA = a.puntos ?? 0
                            const puntosB = b.puntos ?? 0
                            if (puntosB !== puntosA) return puntosB - puntosA
                            const dgA = a.diferencia_goles ?? 0
                            const dgB = b.diferencia_goles ?? 0
                            return dgB - dgA
                          })
                          .map((equipoTorneo, index) => (
                            <tr key={equipoTorneo.id}>
                              <td className="fw-bold">{index + 1}</td>
                              <td>
                                <div className="d-flex align-items-center gap-2">
                                  <img 
                                    src={equipoTorneo.equipo?.imagen_equipo || 'https://via.placeholder.com/24x24/fd7e14/ffffff?text=🏆'} 
                                    alt="" 
                                    className="rounded-circle"
                                    width={24}
                                    height={24}
                                  />
                                  <span>{equipoTorneo.equipo?.nombre}</span>
                                </div>
                              </td>
                              <td>{equipoTorneo.partidos_jugados ?? 0}</td>
                              <td className="text-success fw-bold">{equipoTorneo.partidos_ganados ?? 0}</td>
                              <td className="text-warning fw-bold">{equipoTorneo.partidos_empatados ?? 0}</td>
                              <td className="text-danger fw-bold">{equipoTorneo.partidos_perdidos ?? 0}</td>
                              <td>{equipoTorneo.goles_favor ?? 0}</td>
                              <td>{equipoTorneo.goles_contra ?? 0}</td>
                              <td className={(equipoTorneo.diferencia_goles ?? 0) >= 0 ? 'text-success' : 'text-danger'}>
                                {(equipoTorneo.diferencia_goles ?? 0) >= 0 ? '+' : ''}{equipoTorneo.diferencia_goles ?? 0}
                              </td>
                              <td className="fw-bold text-primary">{equipoTorneo.puntos ?? 0}</td>
                            </tr>
                          ))}
                      </tbody>
                    </Table>
                  )}
                </Tab.Pane>

                {/* Tab: Restricciones por Jornada */}
                <Tab.Pane eventKey="restricciones">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5>Restricciones por Jornada</h5>
                    <div className="d-flex gap-2">
                      {/* Botón temporal para simular jornada 1 completada */}
                      <Button 
                        variant="info" 
                        size="sm"
                        onClick={handleSimularJornada1Completada}
                        disabled={encuentros.filter(e => e.jornada === 1).length === 0}>
                        <LuCheck className="me-1" />
                        Simular Jornada 1 Completada
                      </Button>
                      <Button 
                        variant="warning" 
                        size="sm"
                        onClick={() => {
                          setUnavailableByJornada({})
                          setSuccess('Todas las restricciones han sido limpiadas')
                        }}
                        disabled={Object.keys(unavailableByJornada).length === 0}>
                        <LuTrash className="me-1" />
                        Limpiar Todas
                      </Button>
                    </div>
                  </div>

                  {encuentros.length === 0 ? (
                    <div className="text-center py-5">
                      <LuGamepad2 className="fs-1 text-muted mb-3" />
                      <h5>No hay encuentros programados</h5>
                      <p className="text-muted">
                        Genera el fixture primero para poder configurar restricciones por jornada
                      </p>
                    </div>
                  ) : (
                    <div>
                      <Alert variant="info" className="mb-4">
                        <h6><LuSettings className="me-2" />Configuración de Restricciones</h6>
                        <p className="mb-0">
                          <strong>Puedes parametrizar la jornada actual y la próxima jornada disponible.</strong> 
                          Esto te permite configurar restricciones por adelantado, incluso para jornadas que aún no han sido generadas.
                          Las jornadas anteriores quedan cerradas para facilitar la programación.
                        </p>
                      </Alert>

                      {/* Información de la jornada actual */}
                      {(() => {
                        const jornadaActual = getJornadaActual()
                        const jornadas = getEncuentrosPorJornada()
                        const jornadasOrdenadas = Object.keys(jornadas).map(Number).sort((a, b) => a - b)
                        const proximaJornadaDisponible = jornadasOrdenadas.length > 0 ? Math.max(...jornadasOrdenadas) + 1 : 1
                        
                        return (
                          <Alert variant="primary" className="mb-4">
                            <h6><LuCalendar className="me-2" />Estado de Jornadas</h6>
                            <div className="mb-2">
                              <strong>Jornada Actual: {jornadaActual}</strong> - Esta es la próxima jornada que se puede parametrizar.
                              <br />
                              <strong>Próxima Jornada Disponible: {proximaJornadaDisponible}</strong> - También puedes configurar restricciones para esta jornada futura.
                            </div>
                            <div className="small">
                              <strong>Progreso:</strong> 
                              {jornadasOrdenadas.map(jornada => {
                                const estado = getEstadoJornada(jornada)
                                const icon = estado === 'jugada' ? '✅' : estado === 'actual' ? '🎯' : '⏳'
                                return (
                                  <span key={jornada} className="me-2">
                                    {icon} J{jornada}
                                  </span>
                                )
                              })}
                            </div>
                            <p className="mb-0 mt-2">
                              Las restricciones configuradas se aplicarán cuando se genere o recalcule el fixture para cada jornada.
                              <br />
                              <strong>Nota:</strong> Las jornadas que no están cerradas (jugadas) se pueden regenerar individualmente 
                              usando el botón "Regenerar" en cada jornada.
                            </p>
                          </Alert>
                        )
                      })()}

                      {(() => {
                        const jornadaActual = getJornadaActual()
                        const jornadas = getEncuentrosPorJornada()
                        const jornadasOrdenadas = Object.keys(jornadas).map(Number).sort((a, b) => a - b)
                        const proximaJornadaDisponible = jornadasOrdenadas.length > 0 ? Math.max(...jornadasOrdenadas) + 1 : 1
                        
                        // Crear array con todas las jornadas existentes más la próxima disponible
                        const todasLasJornadas = [...jornadasOrdenadas]
                        if (!todasLasJornadas.includes(proximaJornadaDisponible)) {
                          todasLasJornadas.push(proximaJornadaDisponible)
                        }
                        
                        return todasLasJornadas.sort((a, b) => a - b).map(jornadaNum => {
                          const jornada = parseInt(jornadaNum.toString())
                          const encuentrosJornada = jornadas[jornada] || []
                          const estadoJornada = getEstadoJornada(jornada)
                          const restriccionesJornada = unavailableByJornada[jornada] || []
                          const equiposRestringidos = restriccionesJornada.map(id => 
                            equiposParticipantes.find(ep => ep.equipo_id === id)?.equipo?.nombre
                          ).filter(Boolean)
                          
                          // Determinar si esta jornada se puede configurar
                          const sePuedeConfigurar = jornada === jornadaActual || jornada === proximaJornadaDisponible
                          const esJornadaFutura = !jornadasOrdenadas.includes(jornada)

                          return (
                            <Card key={jornadaNum} className={`mb-3 ${estadoJornada === 'jugada' ? 'border-success' : estadoJornada === 'actual' ? 'border-primary' : esJornadaFutura ? 'border-info' : 'border-secondary'}`}>
                              <CardHeader className={estadoJornada === 'jugada' ? 'bg-success text-white' : estadoJornada === 'actual' ? 'bg-primary text-white' : esJornadaFutura ? 'bg-info text-white' : 'bg-secondary text-white'}>
                                <div className="d-flex justify-content-between align-items-center">
                                  <div>
                                    <h6 className="mb-0">Jornada {jornadaNum}</h6>
                                    {estadoJornada === 'jugada' && (
                                      <Badge bg="light" text="dark" className="ms-2">
                                        <LuCheck className="me-1" />
                                        Jornada Jugada
                                      </Badge>
                                    )}
                                    {estadoJornada === 'actual' && (
                                      <Badge bg="warning" text="dark" className="ms-2">
                                        <LuSettings className="me-1" />
                                        Jornada Actual
                                      </Badge>
                                    )}
                                    {esJornadaFutura && (
                                      <Badge bg="info" text="dark" className="ms-2">
                                        <LuPlus className="me-1" />
                                        Jornada Futura
                                      </Badge>
                                    )}
                                    {estadoJornada === 'futura' && !esJornadaFutura && (
                                      <Badge bg="light" text="dark" className="ms-2">
                                        <LuClock className="me-1" />
                                        Jornada Futura
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="d-flex gap-2">
                                    {restriccionesJornada.length > 0 && (
                                      <Badge bg="warning" text="dark">
                                        {restriccionesJornada.length} equipo(s) restringido(s)
                                      </Badge>
                                    )}
                                    {sePuedeConfigurar ? (
                                      <Button 
                                        variant="outline-light" 
                                        size="sm"
                                        onClick={() => handleAbrirRestricciones(jornada)}>
                                        <LuSettings className="me-1" />
                                        Configurar
                                      </Button>
                                    ) : (
                                      <Button 
                                        variant="outline-light" 
                                        size="sm"
                                        disabled>
                                        <LuX className="me-1" />
                                        {estadoJornada === 'jugada' ? 'Cerrada' : 'No disponible'}
                                      </Button>
                                    )}
                                    {sePuedeRegenerarJornada(jornada) && (
                                      <Button 
                                        variant="outline-warning" 
                                        size="sm"
                                        onClick={() => {
                                          setJornadaARegenerar(jornada)
                                          setShowRegenerarJornadaModal(true)
                                        }}>
                                        <LuTriangle className="me-1" />
                                        Regenerar
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </CardHeader>
                              <CardBody>
                                {estadoJornada === 'jugada' ? (
                                  <div>
                                    <p className="text-muted mb-2">
                                      <LuCheck className="me-1" />
                                      Esta jornada ya fue jugada y no se puede modificar.
                                    </p>
                                    {restriccionesJornada.length > 0 && (
                                      <div>
                                        <h6 className="text-warning mb-2">
                                          <LuX className="me-1" />
                                          Equipos que no jugaron esta jornada:
                                        </h6>
                                        <div className="d-flex flex-wrap gap-2">
                                          {equiposRestringidos.map((nombre, index) => (
                                            <Badge key={index} bg="warning" text="dark">
                                              {nombre}
                                            </Badge>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ) : estadoJornada === 'actual' ? (
                                  <div>
                                    <p className="text-primary mb-2">
                                      <LuSettings className="me-1" />
                                      Esta es la jornada actual. Puedes configurar restricciones para los equipos que no pueden jugar.
                                    </p>
                                    {restriccionesJornada.length > 0 ? (
                                      <div>
                                        <h6 className="text-warning mb-2">
                                          <LuX className="me-1" />
                                          Equipos que no jugarán esta jornada:
                                        </h6>
                                        <div className="d-flex flex-wrap gap-2">
                                          {equiposRestringidos.map((nombre, index) => (
                                            <Badge key={index} bg="warning" text="dark">
                                              {nombre}
                                            </Badge>
                                          ))}
                                        </div>
                                      </div>
                                    ) : (
                                      <p className="text-muted mb-0">
                                        No hay restricciones configuradas para esta jornada
                                      </p>
                                    )}
                                  </div>
                                ) : esJornadaFutura ? (
                                  <div>
                                    <p className="text-info mb-2">
                                      <LuPlus className="me-1" />
                                      Esta es una jornada futura que aún no ha sido generada. Puedes configurar restricciones por adelantado.
                                    </p>
                                    {restriccionesJornada.length > 0 ? (
                                      <div>
                                        <h6 className="text-warning mb-2">
                                          <LuX className="me-1" />
                                          Equipos que no jugarán esta jornada:
                                        </h6>
                                        <div className="d-flex flex-wrap gap-2">
                                          {equiposRestringidos.map((nombre, index) => (
                                            <Badge key={index} bg="warning" text="dark">
                                              {nombre}
                                            </Badge>
                                          ))}
                                        </div>
                                      </div>
                                    ) : (
                                      <p className="text-muted mb-0">
                                        No hay restricciones configuradas para esta jornada
                                      </p>
                                    )}
                                  </div>
                                ) : (
                                  <div>
                                    <p className="text-muted mb-2">
                                      <LuClock className="me-1" />
                                      Esta jornada se configurará automáticamente basándose en las restricciones de la jornada actual.
                                    </p>
                                    {restriccionesJornada.length > 0 && (
                                      <div>
                                        <h6 className="text-info mb-2">
                                          <LuSettings className="me-2" />
                                          Restricciones heredadas:
                                        </h6>
                                        <div className="d-flex flex-wrap gap-2">
                                          {equiposRestringidos.map((nombre, index) => (
                                            <Badge key={index} bg="info" text="dark">
                                              {nombre}
                                            </Badge>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </CardBody>
                            </Card>
                          )
                        })
                      })()}

                      {Object.keys(unavailableByJornada).length > 0 && (
                        <Card className="mt-4 border-warning">
                          <CardHeader className="bg-warning text-dark">
                            <h6 className="mb-0">
                              <LuSettings className="me-2" />
                              Aplicar Restricciones y Recalcular Fixture
                            </h6>
                          </CardHeader>
                          <CardBody>
                            <p className="text-muted mb-3">
                              Al hacer clic en el botón, se recalcularán automáticamente todas las jornadas futuras 
                              considerando las restricciones configuradas. Las jornadas ya jugadas no se modificarán.
                            </p>
                            <div className="d-flex gap-2">
                              <Button 
                                variant="warning" 
                                onClick={handleRegenerarFixtureConRestricciones}>
                                <LuSettings className="me-1" />
                                Recalcular Fixture con Restricciones
                              </Button>
                            </div>
                          </CardBody>
                        </Card>
                      )}
                    </div>
                  )}
                </Tab.Pane>
              </Tab.Content>
            </CardBody>
            </Tab.Container>
          </Card>
        </Col>
      </Row>

      {/* Modal para agregar equipos */}
      <Modal show={showAddEquiposModal} onHide={() => setShowAddEquiposModal(false)} size="lg">
        <ModalHeader closeButton>
          <Modal.Title>Agregar Equipos al Torneo</Modal.Title>
        </ModalHeader>
        <ModalBody>
          <p className="text-muted mb-3">
            Selecciona los equipos que deseas agregar al torneo:
          </p>
          <Row>
            {equiposDisponiblesParaAgregar.map((equipo) => (
              <Col key={equipo.id} md={6} className="mb-2">
                <Form.Check
                  type="checkbox"
                  id={`equipo-${equipo.id}`}
                  label={
                    <div className="d-flex align-items-center gap-2">
                      <img 
                        src={equipo.imagen_equipo || 'https://via.placeholder.com/24x24/6f42c1/ffffff?text=⭐'} 
                        alt="" 
                        className="rounded-circle"
                        width={24}
                        height={24}
                      />
                      <span>{equipo.nombre}</span>
                    </div>
                  }
                  checked={selectedEquipos.includes(equipo.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedEquipos([...selectedEquipos, equipo.id])
                    } else {
                      setSelectedEquipos(selectedEquipos.filter(id => id !== equipo.id))
                    }
                  }}
                />
              </Col>
            ))}
          </Row>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowAddEquiposModal(false)}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleAddEquipos}>
            Agregar Equipos
          </Button>
        </ModalFooter>
      </Modal>

      {/* Modal para generar fixture */}
      <Modal show={showFixtureModal} onHide={() => setShowFixtureModal(false)} size="lg">
        <ModalHeader closeButton>
          <Modal.Title>Generar Fixture</Modal.Title>
        </ModalHeader>
        <ModalBody>
          <p>
            Se generará un fixture automático para los {equiposParticipantes.length} equipos participantes.
            {torneo.permite_revancha && ' Se incluirán partidos de ida y vuelta.'}
          </p>
          <p className="text-muted small">
            El algoritmo Round Robin asegura que cada equipo juegue contra todos los demás.
          </p>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowFixtureModal(false)}>
            Cancelar
          </Button>
          <Button variant="success" onClick={handleGenerateFixture}>
            Generar Fixture
          </Button>
        </ModalFooter>
      </Modal>

      {/* Modal para editar encuentro */}
      <Modal show={showEncuentroModal} onHide={() => setShowEncuentroModal(false)}>
        <ModalHeader closeButton>
          <Modal.Title>Editar Encuentro</Modal.Title>
        </ModalHeader>
        <ModalBody>
          {editingEncuentro && (
            <Form id="encuentro-form" action={handleUpdateEncuentro}>
              <Row>
                <Col md={6}>
                  <FloatingLabel label="Goles Local">
                    <FormControl 
                      type="number" 
                      name="goles_local" 
                      min="0"
                      defaultValue={editingEncuentro.goles_local || ''} 
                    />
                  </FloatingLabel>
                </Col>
                <Col md={6}>
                  <FloatingLabel label="Goles Visitante">
                    <FormControl 
                      type="number" 
                      name="goles_visitante" 
                      min="0"
                      defaultValue={editingEncuentro.goles_visitante || ''} 
                    />
                  </FloatingLabel>
                </Col>
              </Row>
              <Row className="mt-3">
                <Col md={6}>
                  <FloatingLabel label="Estado">
                    <FormSelect name="estado" defaultValue={editingEncuentro.estado ?? 'programado'}>
                      <option value="programado">Programado</option>
                      <option value="en_curso">En Curso</option>
                      <option value="finalizado">Finalizado</option>
                      <option value="cancelado">Cancelado</option>
                      <option value="aplazado">Aplazado</option>
                    </FormSelect>
                  </FloatingLabel>
                </Col>
                <Col md={6}>
                  <FloatingLabel label="Cancha">
                    <FormControl 
                      type="text" 
                      name="cancha" 
                      defaultValue={editingEncuentro.cancha || ''} 
                    />
                  </FloatingLabel>
                </Col>
              </Row>
              <Row className="mt-3">
                <Col>
                  <FloatingLabel label="Observaciones">
                    <FormControl 
                      as="textarea" 
                      name="observaciones" 
                      rows={3}
                      defaultValue={editingEncuentro.observaciones || ''} 
                    />
                  </FloatingLabel>
                </Col>
              </Row>
            </Form>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowEncuentroModal(false)}>
            Cancelar
          </Button>
          <Button variant="primary" type="submit" form="encuentro-form">
            Actualizar
          </Button>
        </ModalFooter>
      </Modal>

      {/* Modal para configurar restricciones por jornada */}
      <Modal show={showRestrictionsModal} onHide={() => setShowRestrictionsModal(false)} size="lg">
        <ModalHeader closeButton>
          <Modal.Title>
            <LuSettings className="me-2" />
            Configurar Restricciones - Jornada {selectedJornada}
          </Modal.Title>
        </ModalHeader>
        <ModalBody>
          <Alert variant="primary" className="mb-3">
            <h6><LuCalendar className="me-2" />Configuración de Jornada</h6>
            <p className="mb-0">
              Estás configurando las restricciones para la <strong>jornada {selectedJornada}</strong>. 
              Las restricciones configuradas aquí se aplicarán cuando se genere o recalcule el fixture 
              para esta jornada.
            </p>
          </Alert>

          <Alert variant="info" className="mb-3">
            <h6><LuSettings className="me-2" />Instrucciones</h6>
            <p className="mb-0">
              Selecciona los equipos que <strong>NO pueden jugar</strong> en la jornada {selectedJornada}. 
              Estos equipos serán excluidos del cálculo cuando se genere esta jornada.
            </p>
          </Alert>

          <div className="mb-3">
            <h6>Equipos Participantes</h6>
            <p className="text-muted small">
              Marca los equipos que solicitan no jugar en esta jornada:
            </p>
          </div>

          <Row>
            {equiposParticipantes.map((equipoTorneo) => (
              <Col key={equipoTorneo.id} md={6} className="mb-2">
                <Form.Check
                  type="checkbox"
                  id={`restriccion-${equipoTorneo.equipo_id}`}
                  label={
                    <div className="d-flex align-items-center gap-2">
                      <img 
                        src={equipoTorneo.equipo?.imagen_equipo || 'https://via.placeholder.com/24x24/6f42c1/ffffff?text=⭐'} 
                        alt="" 
                        className="rounded-circle"
                        width={24}
                        height={24}
                      />
                      <span>{equipoTorneo.equipo?.nombre}</span>
                    </div>
                  }
                  checked={restriccionesJornada.includes(equipoTorneo.equipo_id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setRestriccionesJornada([...restriccionesJornada, equipoTorneo.equipo_id])
                    } else {
                      setRestriccionesJornada(restriccionesJornada.filter(id => id !== equipoTorneo.equipo_id))
                    }
                  }}
                />
              </Col>
            ))}
          </Row>

          {restriccionesJornada.length > 0 && (
            <Alert variant="warning" className="mt-3">
              <h6><LuX className="me-2" />Equipos Restringidos</h6>
              <p className="mb-2">
                Los siguientes equipos no jugarán en la jornada {selectedJornada}:
              </p>
              <div className="d-flex flex-wrap gap-2">
                {restriccionesJornada.map(equipoId => {
                  const equipo = equiposParticipantes.find(ep => ep.equipo_id === equipoId)?.equipo
                  return (
                    <Badge key={equipoId} bg="warning" text="dark">
                      {equipo?.nombre}
                    </Badge>
                  )
                })}
              </div>
            </Alert>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowRestrictionsModal(false)}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleGuardarRestricciones}>
            <LuCheck className="me-1" />
            Guardar Restricciones
          </Button>
        </ModalFooter>
      </Modal>

      {/* Modal para generar jornada individual */}
      <Modal show={showJornadaModal} onHide={() => setShowJornadaModal(false)}>
        <ModalHeader closeButton>
          <Modal.Title>
            <LuPlus className="me-2" />
            Generar Jornada Individual
          </Modal.Title>
        </ModalHeader>
        <ModalBody>
          <Alert variant="info" className="mb-3">
            <h6><LuCalendar className="me-2" />Generar Jornada por Jornada</h6>
            <p className="mb-0">
              Esta opción te permite generar una jornada específica y guardarla en la base de datos. 
              Es útil para validar correctamente los descansos y restricciones jornada por jornada.
            </p>
          </Alert>

          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Seleccionar Jornada</Form.Label>
              <FormSelect 
                value={jornadaAGenerar} 
                onChange={(e) => setJornadaAGenerar(parseInt(e.target.value))}
              >
                {Array.from({ length: (torneo?.equiposTorneo?.length || 0) - 1 }, (_, i) => i + 1).map(jornada => (
                  <option key={jornada} value={jornada}>
                    Jornada {jornada}
                  </option>
                ))}
              </FormSelect>
              <Form.Text className="text-muted">
                Selecciona la jornada que deseas generar. La jornada debe no existir previamente.
              </Form.Text>
            </Form.Group>

            {unavailableByJornada[jornadaAGenerar] && unavailableByJornada[jornadaAGenerar].length > 0 && (
              <Alert variant="warning" className="mb-3">
                <h6><LuX className="me-2" />Restricciones Configuradas</h6>
                <p className="mb-2">
                  Para la jornada {jornadaAGenerar}, los siguientes equipos no jugarán:
                </p>
                <div className="d-flex flex-wrap gap-2">
                  {unavailableByJornada[jornadaAGenerar].map(equipoId => {
                    const equipo = equiposParticipantes.find(ep => ep.equipo_id === equipoId)?.equipo
                    return (
                      <Badge key={equipoId} bg="warning" text="dark">
                        {equipo?.nombre}
                      </Badge>
                    )
                  })}
                </div>
              </Alert>
            )}
          </Form>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowJornadaModal(false)}>
            Cancelar
          </Button>
          <Button variant="success" onClick={handleGenerarJornada}>
            <LuPlus className="me-1" />
            Generar Jornada {jornadaAGenerar}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Modal para regenerar jornada individual */}
      <Modal show={showRegenerarJornadaModal} onHide={() => setShowRegenerarJornadaModal(false)}>
        <ModalHeader closeButton>
          <Modal.Title>
            <LuTriangle className="me-2" />
            Regenerar Jornada Individual
          </Modal.Title>
        </ModalHeader>
        <ModalBody>
          <Alert variant="warning" className="mb-3">
            <h6><LuTriangle className="me-2" />Regenerar Jornada Existente</h6>
            <p className="mb-0">
              Esta opción te permite regenerar una jornada ya generada, eliminando los encuentros existentes 
              y creando nuevos emparejamientos. <strong>Las jornadas cerradas (jugadas) no se pueden regenerar.</strong>
            </p>
          </Alert>

          <Alert variant="info" className="mb-3">
            <h6><LuInfo className="me-2" />¿Cuándo se puede regenerar una jornada?</h6>
            <ul className="mb-0">
              <li><strong>Se puede regenerar:</strong> Jornadas con encuentros en estado "programado" o "aplazado"</li>
              <li><strong>No se puede regenerar:</strong> Jornadas donde todos los encuentros están "finalizados" o "en curso"</li>
              <li><strong>Beneficios:</strong> Permite ajustar emparejamientos y descansos sin afectar jornadas ya jugadas</li>
            </ul>
          </Alert>

          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Seleccionar Jornada a Regenerar</Form.Label>
              <FormSelect 
                value={jornadaARegenerar} 
                onChange={(e) => setJornadaARegenerar(parseInt(e.target.value))}
              >
                {Object.keys(jornadas).map(jornadaNum => {
                  const jornada = parseInt(jornadaNum)
                  const sePuedeRegenerar = sePuedeRegenerarJornada(jornada)
                  const estadoJornada = getEstadoJornada(jornada)
                  
                  return (
                    <option 
                      key={jornada} 
                      value={jornada}
                      disabled={!sePuedeRegenerar}
                    >
                      Jornada {jornada} {!sePuedeRegenerar ? `(${estadoJornada === 'jugada' ? 'Cerrada' : 'No disponible'})` : ''}
                    </option>
                  )
                })}
              </FormSelect>
              <Form.Text className="text-muted">
                Selecciona la jornada que deseas regenerar. Solo se muestran jornadas que se pueden regenerar.
              </Form.Text>
            </Form.Group>

            {(() => {
              const jornadaSeleccionada = jornadas[jornadaARegenerar] || []
              const estadoJornada = getEstadoJornada(jornadaARegenerar)
              const sePuedeRegenerar = sePuedeRegenerarJornada(jornadaARegenerar)
              
              if (!sePuedeRegenerar) {
                return (
                  <Alert variant="danger" className="mb-3">
                    <h6><LuX className="me-2" />Jornada No Regenerable</h6>
                    <p className="mb-0">
                      La jornada {jornadaARegenerar} no se puede regenerar porque {estadoJornada === 'jugada' ? 'ya fue jugada' : 'no está disponible'}.
                    </p>
                  </Alert>
                )
              }

              return (
                <div>
                  <Alert variant="info" className="mb-3">
                    <h6><LuInfo className="me-2" />Información de la Jornada</h6>
                    <p className="mb-2">
                      <strong>Jornada {jornadaARegenerar}</strong> - {jornadaSeleccionada.length} encuentros
                    </p>
                    <p className="mb-0">
                      Estado: <Badge bg={estadoJornada === 'actual' ? 'primary' : 'secondary'}>
                        {estadoJornada === 'actual' ? 'Actual' : 'Futura'}
                      </Badge>
                    </p>
                  </Alert>

                  {unavailableByJornada[jornadaARegenerar] && unavailableByJornada[jornadaARegenerar].length > 0 && (
                    <Alert variant="warning" className="mb-3">
                      <h6><LuX className="me-2" />Restricciones Configuradas</h6>
                      <p className="mb-2">
                        Para la jornada {jornadaARegenerar}, los siguientes equipos no jugarán:
                      </p>
                      <div className="d-flex flex-wrap gap-2">
                        {unavailableByJornada[jornadaARegenerar].map(equipoId => {
                          const equipo = equiposParticipantes.find(ep => ep.equipo_id === equipoId)?.equipo
                          return (
                            <Badge key={equipoId} bg="warning" text="dark">
                              {equipo?.nombre}
                            </Badge>
                          )
                        })}
                      </div>
                    </Alert>
                  )}
                </div>
              )
            })()}
          </Form>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowRegenerarJornadaModal(false)}>
            Cancelar
          </Button>
          <Button 
            variant="warning" 
            onClick={handleRegenerarJornada}
            disabled={!sePuedeRegenerarJornada(jornadaARegenerar)}
          >
            <LuTriangle className="me-1" />
            Regenerar Jornada {jornadaARegenerar}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Modal para eliminar jornada */}
      <Modal show={showDeleteJornadaModal} onHide={() => setShowDeleteJornadaModal(false)}>
        <ModalHeader closeButton>
          <Modal.Title>
            <LuTrash className="me-2" />
            Eliminar Jornada
          </Modal.Title>
        </ModalHeader>
        <ModalBody>
          <Alert variant="danger" className="mb-3">
            <h6><LuTrash className="me-2" />Confirmar Eliminación de Jornada</h6>
            <p className="mb-0">
              <strong>¿Estás seguro de que deseas eliminar la jornada {jornadaAEliminar}?</strong>
            </p>
          </Alert>

          <Alert variant="warning" className="mb-3">
            <h6><LuInfo className="me-2" />Información Importante</h6>
            <ul className="mb-0">
              <li><strong>Se eliminarán:</strong> Todos los encuentros de la jornada {jornadaAEliminar}</li>
              <li><strong>Se eliminará:</strong> El registro de descanso de la jornada {jornadaAEliminar}</li>
              <li><strong>No se puede deshacer:</strong> Esta acción es irreversible</li>
              <li><strong>Restricción:</strong> Solo se pueden eliminar jornadas que no estén cerradas (jugadas)</li>
            </ul>
          </Alert>

          <div className="bg-light p-3 rounded">
            <h6>Jornada a Eliminar: {jornadaAEliminar}</h6>
            <p className="mb-0 text-muted">
              Esta acción eliminará completamente la jornada y todos sus encuentros programados.
            </p>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowDeleteJornadaModal(false)}>
            Cancelar
          </Button>
          <Button 
            variant="danger" 
            onClick={handleDeleteJornada}
          >
            <LuTrash className="me-1" />
            Eliminar Jornada {jornadaAEliminar}
          </Button>
        </ModalFooter>
      </Modal>

    </Container>
  )
}

export default TorneoDetailPage
