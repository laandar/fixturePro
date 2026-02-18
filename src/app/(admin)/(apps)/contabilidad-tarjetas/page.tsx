'use client'

import { useEffect, useMemo, useState } from 'react'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import { Container, Row, Col, Card, CardHeader, CardBody, Alert, FormSelect, Table, Badge, Button, Modal, Form, FormControl, Tabs, Tab } from 'react-bootstrap'
import { TbHelp } from 'react-icons/tb'
import { getTorneos } from '@/app/(admin)/(apps)/torneos/actions'
import { getResumenTarjetasPorJornadaEquipo, getValoresTarjetas, type ResumenTarjetasItem, getSaldosPorEquipo, registrarPagoTorneo, registrarCargoManual, getCargosManualesTorneo, updateCargoManual, deleteCargoManual, getTarjetasPorEquipoJornada, deleteTarjetaContabilidad, type TarjetaDetalle, getResumenGeneral, getEstadoCuentaEquipo, getPagosTorneo, updatePago, anularPago, reactivarPago, getJornadaFechaFuturaMasCercana, getJornadasDisponibles, type ResumenGeneral, type EstadoCuentaEquipo, type PagoItem } from './actions'

const ContabilidadTarjetasPage = () => {
  const [torneos, setTorneos] = useState<any[]>([])
  const [selectedTorneo, setSelectedTorneo] = useState<number | null>(null)
  const [resumen, setResumen] = useState<ResumenTarjetasItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [valores, setValores] = useState<{ valorAmarilla: number; valorRoja: number }>({ valorAmarilla: 0, valorRoja: 0 })
  const [saldos, setSaldos] = useState<any[]>([])
  const [cargos, setCargos] = useState<any[]>([])
  const [showCargoModal, setShowCargoModal] = useState(false)
  const [editingCargo, setEditingCargo] = useState<any | null>(null)
  const [cargoEquipoId, setCargoEquipoId] = useState<number | ''>('' as any)
  const [cargoMonto, setCargoMonto] = useState<string>('')
  const [cargoDesc, setCargoDesc] = useState<string>('')
  const [cargoJornada, setCargoJornada] = useState<string>('')
  const [aplicarATodosEquipos, setAplicarATodosEquipos] = useState<boolean>(false)
  const [filterText, setFilterText] = useState<string>('')
  const [cargoError, setCargoError] = useState<string | null>(null)
  const [cargoSuccess, setCargoSuccess] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [cargoToDelete, setCargoToDelete] = useState<any | null>(null)
  const [showTarjetasModal, setShowTarjetasModal] = useState(false)
  const [tarjetasDetalle, setTarjetasDetalle] = useState<TarjetaDetalle[]>([])
  const [tarjetaModalEquipo, setTarjetaModalEquipo] = useState<{equipo_id: number, equipo_nombre: string, jornada: number} | null>(null)
  const [showTarjetaDeleteConfirm, setShowTarjetaDeleteConfirm] = useState(false)
  const [tarjetaToDelete, setTarjetaToDelete] = useState<number | null>(null)
  
  // Estados para reportes y filtros
  const [activeTab, setActiveTab] = useState<string>('contabilidad')
  const [fechaDesde, setFechaDesde] = useState<string>('')
  const [fechaHasta, setFechaHasta] = useState<string>('')
  const [resumenGeneral, setResumenGeneral] = useState<ResumenGeneral | null>(null)
  const [estadoCuenta, setEstadoCuenta] = useState<EstadoCuentaEquipo | null>(null)
  const [equipoEstadoCuenta, setEquipoEstadoCuenta] = useState<number | null>(null)
  const [jornadaEstadoCuenta, setJornadaEstadoCuenta] = useState<number | null>(null)
  const [jornadasDisponibles, setJornadasDisponibles] = useState<number[]>([])
  const [listaPagos, setListaPagos] = useState<PagoItem[]>([])
  const [loadingReportes, setLoadingReportes] = useState(false)
  
  // Estados para edición de pagos
  const [showPagoModal, setShowPagoModal] = useState(false)
  const [editingPago, setEditingPago] = useState<PagoItem | null>(null)
  const [pagoMonto, setPagoMonto] = useState<string>('')
  const [pagoDescripcion, setPagoDescripcion] = useState<string>('')
  const [pagoReferencia, setPagoReferencia] = useState<string>('')
  const [pagoJornada, setPagoJornada] = useState<string>('')
  const [showAnularModal, setShowAnularModal] = useState(false)
  const [pagoToAnular, setPagoToAnular] = useState<PagoItem | null>(null)
  const [motivoAnulacion, setMotivoAnulacion] = useState<string>('')
  const [incluirAnulados, setIncluirAnulados] = useState<boolean>(false)
  
  // Estados para modal de pago
  const [showPagoEquipoModal, setShowPagoEquipoModal] = useState(false)
  const [equipoPagoId, setEquipoPagoId] = useState<number | null>(null)
  const [equipoPagoNombre, setEquipoPagoNombre] = useState<string>('')
  const [montoPagoEquipo, setMontoPagoEquipo] = useState<string>('')
  const [descripcionPagoEquipo, setDescripcionPagoEquipo] = useState<string>('')
  const [errorPagoEquipo, setErrorPagoEquipo] = useState<string | null>(null)
  
  // Estados para modal de cargo manual (desde botón directo)
  const [showCargoManualModal, setShowCargoManualModal] = useState(false)
  const [equipoCargoId, setEquipoCargoId] = useState<number | null>(null)
  const [equipoCargoNombre, setEquipoCargoNombre] = useState<string>('')
  const [montoCargoManual, setMontoCargoManual] = useState<string>('')
  const [descripcionCargoManual, setDescripcionCargoManual] = useState<string>('')
  const [jornadaCargoManual, setJornadaCargoManual] = useState<string>('')
  const [aplicarATodosEquiposManual, setAplicarATodosEquiposManual] = useState<boolean>(false)
  const [errorCargoManual, setErrorCargoManual] = useState<string | null>(null)
  const [showManualUsuario, setShowManualUsuario] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        setError(null)
        const [ts, vs] = await Promise.all([
          getTorneos(),
          getValoresTarjetas(),
        ])
        setTorneos(ts || [])
        setValores(vs)
        if ((ts || []).length > 0) {
          setSelectedTorneo(ts[0].id)
        }
      } catch (e) {
        setError('Error al cargar torneos o configuraciones')
      }
    }
    load()
  }, [])

  useEffect(() => {
    const loadResumen = async () => {
      if (!selectedTorneo) return
      try {
        setLoading(true)
        setError(null)
        const [data, saldosData, cargosData, jornadas] = await Promise.all([
          getResumenTarjetasPorJornadaEquipo(selectedTorneo),
          getSaldosPorEquipo(selectedTorneo),
          getCargosManualesTorneo(selectedTorneo),
          getJornadasDisponibles(selectedTorneo)
        ])
        setResumen(data)
        setSaldos(saldosData)
        setCargos(cargosData)
        setJornadasDisponibles(jornadas)
      } catch (e) {
        setError('Error al cargar resumen de tarjetas')
      } finally {
        setLoading(false)
      }
    }
    loadResumen()
  }, [selectedTorneo])

  const agrupadoPorJornada = useMemo(() => {
    const map: Record<number, ResumenTarjetasItem[]> = {}
    for (const item of resumen) {
      if (!map[item.jornada]) map[item.jornada] = []
      map[item.jornada].push(item)
    }
    return Object.fromEntries(Object.entries(map).sort((a, b) => Number(a[0]) - Number(b[0])))
  }, [resumen])

  const calcularTotal = (amarillas: number, rojas: number) => amarillas * valores.valorAmarilla + rojas * valores.valorRoja

  const totalGeneral = useMemo(() => {
    return resumen.reduce((acc, r) => acc + calcularTotal(r.amarillas, r.rojas), 0)
  }, [resumen, valores])

  const totalSaldoGeneral = useMemo(() => {
    return saldos.reduce((acc, s) => acc + (s.saldo_cents || 0), 0) / 100
  }, [saldos])

  const abrirModalPagoEquipo = (equipoId: number, equipoNombre: string) => {
    setEquipoPagoId(equipoId)
    setEquipoPagoNombre(equipoNombre)
    setMontoPagoEquipo('')
    setDescripcionPagoEquipo('')
    setErrorPagoEquipo(null)
    setShowPagoEquipoModal(true)
  }

  const cerrarModalPagoEquipo = () => {
    setShowPagoEquipoModal(false)
    setEquipoPagoId(null)
    setEquipoPagoNombre('')
    setMontoPagoEquipo('')
    setDescripcionPagoEquipo('')
    setErrorPagoEquipo(null)
  }

  const confirmarPagoEquipo = async () => {
    if (!selectedTorneo || !equipoPagoId) return
    
    setErrorPagoEquipo(null)
    const monto = parseFloat(montoPagoEquipo)
    if (isNaN(monto) || monto <= 0) {
      setErrorPagoEquipo('El monto debe ser mayor a 0')
      return
    }
    
    try {
      await registrarPagoTorneo(selectedTorneo, equipoPagoId, monto, descripcionPagoEquipo)
      const saldosData = await getSaldosPorEquipo(selectedTorneo)
      setSaldos(saldosData)
      cerrarModalPagoEquipo()
    } catch (error) {
      setErrorPagoEquipo(error instanceof Error ? error.message : 'Error al registrar el pago')
    }
  }

  const abrirModalCargoManual = async (equipoId: number, equipoNombre: string) => {
    setEquipoCargoId(equipoId)
    setEquipoCargoNombre(equipoNombre)
    setMontoCargoManual('')
    setDescripcionCargoManual('')
    setAplicarATodosEquiposManual(false)
    setErrorCargoManual(null)
    
    // Obtener la jornada con la fecha futura más cercana
    if (selectedTorneo) {
      try {
        const jornadaFutura = await getJornadaFechaFuturaMasCercana(selectedTorneo)
        setJornadaCargoManual(jornadaFutura ? jornadaFutura.toString() : '')
      } catch (e) {
        setJornadaCargoManual('')
      }
    } else {
      setJornadaCargoManual('')
    }
    
    setShowCargoManualModal(true)
  }

  const cerrarModalCargoManual = () => {
    setShowCargoManualModal(false)
    setEquipoCargoId(null)
    setEquipoCargoNombre('')
    setMontoCargoManual('')
    setDescripcionCargoManual('')
    setJornadaCargoManual('')
    setAplicarATodosEquiposManual(false)
    setErrorCargoManual(null)
  }

  const confirmarCargoManual = async () => {
    if (!selectedTorneo) return
    
    setErrorCargoManual(null)
    const monto = parseFloat(montoCargoManual)
    if (isNaN(monto) || monto <= 0) {
      setErrorCargoManual('El monto debe ser mayor a 0')
      return
    }
    
    const jornada = jornadaCargoManual ? parseInt(jornadaCargoManual) : null
    if (jornadaCargoManual && (isNaN(parseInt(jornadaCargoManual)) || parseInt(jornadaCargoManual) <= 0)) {
      setErrorCargoManual('La jornada debe ser un número mayor a 0')
      return
    }
    
    try {
      if (aplicarATodosEquiposManual) {
        // Aplicar cargo a todos los equipos del torneo
        const equiposIds = saldos.map(s => s.equipo_id)
        for (const equipoId of equiposIds) {
          await registrarCargoManual(selectedTorneo, equipoId, monto, descripcionCargoManual, jornada)
        }
        setErrorCargoManual(null)
      } else {
        if (!equipoCargoId) {
          setErrorCargoManual('Debe seleccionar un equipo o marcar "Aplicar a todos los equipos"')
          return
        }
        await registrarCargoManual(selectedTorneo, equipoCargoId, monto, descripcionCargoManual, jornada)
      }
      const [saldosData, cargosData] = await Promise.all([
        getSaldosPorEquipo(selectedTorneo),
        getCargosManualesTorneo(selectedTorneo)
      ])
      setSaldos(saldosData)
      setCargos(cargosData)
      cerrarModalCargoManual()
    } catch (error) {
      setErrorCargoManual(error instanceof Error ? error.message : 'Error al registrar el cargo manual')
    }
  }

  const handleEditCargo = async (id: number, current: any) => {
    setEditingCargo(current)
    setCargoEquipoId(current.equipo_id)
    setCargoMonto((current.monto_centavos/100).toFixed(2))
    setCargoDesc(current.descripcion || '')
    setCargoJornada(current.jornada_aplicacion ? current.jornada_aplicacion.toString() : '')
    setShowCargoModal(true)
  }

  const handleDeleteCargo = (cargo: any) => {
    setCargoToDelete(cargo)
    setShowDeleteConfirm(true)
  }

  const confirmDeleteCargo = async () => {
    if (!selectedTorneo || !cargoToDelete) return
    try {
      await deleteCargoManual(cargoToDelete.id)
      const [saldosData, cargosData] = await Promise.all([
        getSaldosPorEquipo(selectedTorneo),
        getCargosManualesTorneo(selectedTorneo)
      ])
      setSaldos(saldosData)
      setCargos(cargosData)
      setShowDeleteConfirm(false)
      setCargoToDelete(null)
    } catch (e) {
      setCargoError(e instanceof Error ? e.message : 'Error al eliminar el cargo')
      setShowDeleteConfirm(false)
    }
  }

  const handleVerTarjetas = async (equipoId: number, equipoNombre: string, jornada: number) => {
    if (!selectedTorneo) return
    try {
      setLoading(true)
      const tarjetas = await getTarjetasPorEquipoJornada(selectedTorneo, equipoId, jornada)
      setTarjetasDetalle(tarjetas)
      setTarjetaModalEquipo({ equipo_id: equipoId, equipo_nombre: equipoNombre, jornada })
      setShowTarjetasModal(true)
    } catch (e) {
      setError('Error al cargar tarjetas')
    } finally {
      setLoading(false)
    }
  }

  const handleEliminarTarjeta = (tarjetaId: number) => {
    setTarjetaToDelete(tarjetaId)
    setShowTarjetaDeleteConfirm(true)
  }

  const confirmDeleteTarjeta = async () => {
    if (!selectedTorneo || !tarjetaToDelete || !tarjetaModalEquipo) return
    try {
      await deleteTarjetaContabilidad(tarjetaToDelete)
      // Recargar tarjetas del modal
      const tarjetas = await getTarjetasPorEquipoJornada(selectedTorneo, tarjetaModalEquipo.equipo_id, tarjetaModalEquipo.jornada)
      setTarjetasDetalle(tarjetas)
      // Recargar resumen
      const [resumenData, saldosData] = await Promise.all([
        getResumenTarjetasPorJornadaEquipo(selectedTorneo),
        getSaldosPorEquipo(selectedTorneo)
      ])
      setResumen(resumenData)
      setSaldos(saldosData)
      setShowTarjetaDeleteConfirm(false)
      setTarjetaToDelete(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al eliminar la tarjeta')
      setShowTarjetaDeleteConfirm(false)
    }
  }

  // Cargar resumen general
  const loadResumenGeneral = async () => {
    if (!selectedTorneo) return
    try {
      setLoadingReportes(true)
      const resumen = await getResumenGeneral(selectedTorneo)
      setResumenGeneral(resumen)
    } catch (e) {
      setError('Error al cargar resumen general')
    } finally {
      setLoadingReportes(false)
    }
  }

  // Cargar estado de cuenta
  const loadEstadoCuenta = async () => {
    if (!selectedTorneo || !equipoEstadoCuenta) return
    try {
      setLoadingReportes(true)
      const estado = await getEstadoCuentaEquipo(selectedTorneo, equipoEstadoCuenta, undefined, undefined, jornadaEstadoCuenta)
      setEstadoCuenta(estado)
    } catch (e) {
      setError('Error al cargar estado de cuenta')
    } finally {
      setLoadingReportes(false)
    }
  }

  // Cargar lista de pagos
  const loadListaPagos = async () => {
    if (!selectedTorneo) return
    try {
      setLoadingReportes(true)
      const pagos = await getPagosTorneo(selectedTorneo, undefined, undefined, undefined, incluirAnulados)
      setListaPagos(pagos)
    } catch (e) {
      setError('Error al cargar lista de pagos')
    } finally {
      setLoadingReportes(false)
    }
  }

  // Cargar datos según la pestaña activa
  useEffect(() => {
    if (!selectedTorneo) return
    if (activeTab === 'resumen') {
      loadResumenGeneral()
    } else if (activeTab === 'estado-cuenta') {
      if (equipoEstadoCuenta) loadEstadoCuenta()
    } else if (activeTab === 'pagos') {
      loadListaPagos()
    }
  }, [selectedTorneo, activeTab, equipoEstadoCuenta, jornadaEstadoCuenta, incluirAnulados])

  // Editar pago
  const handleEditPago = (pago: PagoItem) => {
    setEditingPago(pago)
    setPagoMonto((pago.monto_centavos / 100).toFixed(2))
    setPagoDescripcion(pago.descripcion || '')
    setPagoReferencia(pago.referencia || '')
    setPagoJornada(pago.jornada?.toString() || '')
    setShowPagoModal(true)
  }

  const handleSubmitPago = async () => {
    if (!selectedTorneo || !editingPago) return
    try {
      const monto = parseFloat(pagoMonto)
      if (isNaN(monto) || monto <= 0) {
        setError('Monto inválido')
        return
      }
      await updatePago(
        editingPago.id,
        monto,
        pagoDescripcion || undefined,
        pagoReferencia || undefined,
        pagoJornada ? parseInt(pagoJornada) : null
      )
      await loadListaPagos()
      const [saldosData] = await Promise.all([getSaldosPorEquipo(selectedTorneo)])
      setSaldos(saldosData)
      setShowPagoModal(false)
      setEditingPago(null)
      setPagoMonto('')
      setPagoDescripcion('')
      setPagoReferencia('')
      setPagoJornada('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al actualizar el pago')
    }
  }

  // Anular pago
  const handleAnularPago = (pago: PagoItem) => {
    setPagoToAnular(pago)
    setMotivoAnulacion('')
    setShowAnularModal(true)
  }

  const confirmAnularPago = async () => {
    if (!selectedTorneo || !pagoToAnular || !motivoAnulacion.trim()) return
    try {
      await anularPago(pagoToAnular.id, motivoAnulacion)
      await loadListaPagos()
      const [saldosData] = await Promise.all([getSaldosPorEquipo(selectedTorneo)])
      setSaldos(saldosData)
      setShowAnularModal(false)
      setPagoToAnular(null)
      setMotivoAnulacion('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al anular el pago')
    }
  }

  // Reactivar pago
  const handleReactivarPago = async (pagoId: number) => {
    if (!selectedTorneo) return
    try {
      await reactivarPago(pagoId)
      await loadListaPagos()
      const [saldosData] = await Promise.all([getSaldosPorEquipo(selectedTorneo)])
      setSaldos(saldosData)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al reactivar el pago')
    }
  }

  const openCreateCargoModal = async (equipoId?: number) => {
    setEditingCargo(null)
    setCargoEquipoId(equipoId || (saldos[0]?.equipo_id || ('' as any)))
    setCargoMonto('')
    setCargoDesc('')
    setAplicarATodosEquipos(false)
    setCargoError(null)
    setCargoSuccess(null)
    
    // Obtener la jornada con la fecha futura más cercana
    if (selectedTorneo) {
      try {
        const jornadaFutura = await getJornadaFechaFuturaMasCercana(selectedTorneo)
        setCargoJornada(jornadaFutura ? jornadaFutura.toString() : '')
      } catch (e) {
        setCargoJornada('')
      }
    } else {
      setCargoJornada('')
    }
    
    setShowCargoModal(true)
  }

  const handleSubmitCargo = async () => {
    setCargoError(null)
    setCargoSuccess(null)
    if (!selectedTorneo) {
      setCargoError('Debe seleccionar un torneo')
      return
    }
    if (!aplicarATodosEquipos && !cargoEquipoId) {
      setCargoError('Debe seleccionar un equipo o marcar "Aplicar a todos los equipos"')
      return
    }
    const monto = parseFloat(cargoMonto)
    if (isNaN(monto) || monto <= 0) {
      setCargoError('El monto debe ser mayor a 0')
      return
    }
    const jornada = cargoJornada ? parseInt(cargoJornada) : null
    if (cargoJornada && (isNaN(parseInt(cargoJornada)) || parseInt(cargoJornada) <= 0)) {
      setCargoError('La jornada debe ser un número mayor a 0')
      return
    }
    try {
      if (editingCargo) {
        await updateCargoManual(editingCargo.id, monto, cargoDesc, jornada)
        setCargoSuccess('Cargo actualizado exitosamente')
      } else {
        if (aplicarATodosEquipos) {
          // Aplicar cargo a todos los equipos del torneo
          const equiposIds = saldos.map(s => s.equipo_id)
          for (const equipoId of equiposIds) {
            await registrarCargoManual(selectedTorneo, equipoId, monto, cargoDesc, jornada)
          }
          setCargoSuccess(`Cargo creado exitosamente para ${equiposIds.length} equipos`)
        } else {
          await registrarCargoManual(selectedTorneo, Number(cargoEquipoId), monto, cargoDesc, jornada)
          setCargoSuccess('Cargo creado exitosamente')
        }
      }
      const [saldosData, cargosData] = await Promise.all([
        getSaldosPorEquipo(selectedTorneo),
        getCargosManualesTorneo(selectedTorneo)
      ])
      setSaldos(saldosData)
      setCargos(cargosData)
      setTimeout(() => {
        setShowCargoModal(false)
        setCargoSuccess(null)
        setAplicarATodosEquipos(false)
      }, 1500)
    } catch (e) {
      setCargoError(e instanceof Error ? e.message : 'Error al guardar el cargo')
    }
  }

  return (
    <Container fluid>
      <Row className="mb-3 align-items-center">
        <Col>
          <PageBreadcrumb title="Contabilidad de Tarjetas" subtitle="Apps" />
        </Col>
        <Col xs="auto">
          <Button
            variant="outline-info"
            size="sm"
            onClick={() => setShowManualUsuario(true)}
            className="d-flex align-items-center"
            title="Manual de Usuario"
          >
            <TbHelp className="me-2" size={18} />
            Manual de Usuario
          </Button>
        </Col>
      </Row>

      {error && (
        <Alert variant="danger">{error}</Alert>
      )}

      <Row className="mb-3">
        <Col md={6} lg={4}>
          <Card>
            <CardHeader>
              <h6 className="mb-0">Seleccionar Torneo</h6>
            </CardHeader>
            <CardBody>
              <FormSelect
                value={selectedTorneo ?? ''}
                onChange={(e) => setSelectedTorneo(e.target.value ? parseInt(e.target.value) : null)}
              >
                {torneos.map((t) => (
                  <option key={t.id} value={t.id}>{t.nombre}</option>
                ))}
              </FormSelect>
              <div className="mt-3 small text-muted">
                Valores actuales: <Badge bg="warning" className="text-dark">🟨 ${valores.valorAmarilla.toFixed(2)}</Badge>{' '}
                <Badge bg="danger">🟥 ${valores.valorRoja.toFixed(2)}</Badge>
              </div>
            </CardBody>
          </Card>
        </Col>
        <Col md={6} lg={8}>
          <Card>
            <CardHeader>
              <h6 className="mb-0">Total General</h6>
            </CardHeader>
            <CardBody>
              <h3 className="mb-0">${totalGeneral.toFixed(2)}</h3>
            </CardBody>
          </Card>
        </Col>
      </Row>


      {/* Sistema de pestañas */}
      <Tabs activeKey={activeTab} onSelect={(k) => k && setActiveTab(k)} className="mb-3">
        <Tab eventKey="contabilidad" title="Contabilidad">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border" role="status">
                <span className="visually-hidden">Cargando...</span>
              </div>
            </div>
          ) : (
            Object.keys(agrupadoPorJornada).length === 0 ? (
              <Alert variant="info">No hay tarjetas registradas para este torneo.</Alert>
            ) : (
              Object.entries(agrupadoPorJornada).map(([jornada, items]) => {
                const totalJornada = items.reduce((acc, r) => acc + calcularTotal(r.amarillas, r.rojas), 0)
                return (
                  <Card key={jornada} className="mb-3">
                    <CardHeader className="d-flex justify-content-between align-items-center">
                      <h5 className="mb-0">Jornada {jornada}</h5>
                      <Badge bg="primary">Total: ${totalJornada.toFixed(2)}</Badge>
                    </CardHeader>
                    <CardBody>
                      <div className="table-responsive">
                        <Table striped bordered hover size="sm">
                          <thead>
                            <tr>
                              <th>Equipo</th>
                              <th className="text-center">🟨 Amarillas</th>
                              <th className="text-center">🟥 Rojas</th>
                              <th className="text-end">Monto</th>
                            </tr>
                          </thead>
                          <tbody>
                            {items.map((r) => (
                              <tr key={`${r.equipo_id}`}> 
                                <td>{r.equipo_nombre}</td>
                                <td className="text-center text-warning fw-bold">
                                  {r.amarillas}
                                  {(r.amarillas > 0 || r.rojas > 0) && (
                                    <Button 
                                      size="sm" 
                                      variant="link" 
                                      className="p-0 ms-2 text-decoration-none"
                                      onClick={() => handleVerTarjetas(r.equipo_id, r.equipo_nombre, parseInt(jornada))}
                                    >
                                      Ver/Editar
                                    </Button>
                                  )}
                                </td>
                                <td className="text-center text-danger fw-bold">{r.rojas}</td>
                                <td className="text-end fw-semibold">${calcularTotal(r.amarillas, r.rojas).toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </Table>
                      </div>
                    </CardBody>
                  </Card>
                )
              })
            )
          )}

          {/* Saldos por equipo con opción de abonar */}
          <Row className="mt-3">
            <Col>
              <Card>
                <CardHeader className="d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">Saldos por Equipo</h5>
                  <Badge bg={totalSaldoGeneral > 0 ? 'warning' : 'success'} className={totalSaldoGeneral > 0 ? 'text-dark' : ''}>
                    Saldo General: ${totalSaldoGeneral.toFixed(2)}
                  </Badge>
                </CardHeader>
                <CardBody>
                  {saldos.length === 0 ? (
                    <Alert variant="light" className="mb-0">No hay movimientos aún.</Alert>
                  ) : (
                    <div className="table-responsive">
                      <Table striped bordered hover size="sm">
                        <thead>
                          <tr>
                            <th>Equipo</th>
                            <th className="text-center">🟨</th>
                            <th className="text-center">🟥</th>
                            <th className="text-end">Importe + Cargos</th>
                            <th className="text-end">Pagos</th>
                            <th className="text-end">Saldo</th>
                            <th className="text-end">Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {saldos.map((s: any) => (
                            <tr key={s.equipo_id}>
                              <td>{s.equipo_nombre}</td>
                              <td className="text-center text-warning fw-bold">{s.amarillas}</td>
                              <td className="text-center text-danger fw-bold">{s.rojas}</td>
                              <td className="text-end">${(s.importe_cents/100).toFixed(2)}</td>
                              <td className="text-end">${(s.pagos_cents/100).toFixed(2)}</td>
                              <td className="text-end fw-bold">
                                <Badge bg={s.saldo_cents > 0 ? 'warning' : 'success'} className={s.saldo_cents > 0 ? 'text-dark' : ''}>
                                  ${(s.saldo_cents/100).toFixed(2)}
                                </Badge>
                              </td>
                              <td className="text-end">
                                <div className="d-flex justify-content-end gap-2">
                                  <Button size="sm" variant="outline-success" onClick={() => abrirModalPagoEquipo(s.equipo_id, s.equipo_nombre)}>Abonar</Button>
                                  <Button size="sm" variant="outline-warning" className="text-dark" onClick={() => abrirModalCargoManual(s.equipo_id, s.equipo_nombre)}>Cargo manual</Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                  )}
                </CardBody>
              </Card>
            </Col>
          </Row>

          {/* CRUD de Cargos manuales */}
          <Row className="mt-3">
            <Col>
              <Card>
                <CardHeader className="d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">Cargos Manuales</h5>
                  <div className="d-flex gap-2">
                    <FormControl placeholder="Buscar..." value={filterText} onChange={(e) => setFilterText(e.target.value)} style={{ maxWidth: 220 }} />
                    <Button size="sm" onClick={() => openCreateCargoModal()}>Nuevo</Button>
                  </div>
                </CardHeader>
                <CardBody>
                  {cargos.length === 0 ? (
                    <Alert variant="light" className="mb-0">No hay cargos manuales.</Alert>
                  ) : (
                    <div className="table-responsive">
                      <Table striped bordered hover size="sm">
                        <thead>
                          <tr>
                            <th>ID</th>
                            <th>Equipo</th>
                            <th>Jornada</th>
                            <th>Descripción</th>
                            <th className="text-end">Monto</th>
                            <th className="text-end">Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cargos.filter((c:any) => {
                            const equipo = saldos.find(s => s.equipo_id === c.equipo_id)?.equipo_nombre || ''
                            const text = (equipo + ' ' + (c.descripcion || '')).toLowerCase()
                            return text.includes(filterText.toLowerCase())
                          }).map((c: any) => {
                            const equipo = saldos.find(s => s.equipo_id === c.equipo_id)?.equipo_nombre || c.equipo_id
                            return (
                              <tr key={c.id}>
                                <td>{c.id}</td>
                                <td>{equipo}</td>
                                <td>
                                  {c.jornada_aplicacion ? (
                                    <Badge bg="info">J{c.jornada_aplicacion}</Badge>
                                  ) : (
                                    <Badge bg="secondary">Global</Badge>
                                  )}
                                </td>
                                <td>{c.descripcion || '-'}</td>
                                <td className="text-end">${(c.monto_centavos/100).toFixed(2)}</td>
                                <td className="text-end">
                                  <div className="d-flex justify-content-end gap-2">
                                    <Button size="sm" variant="outline-primary" onClick={() => handleEditCargo(c.id, c)}>Editar</Button>
                                    <Button size="sm" variant="outline-danger" onClick={() => handleDeleteCargo(c)}>Eliminar</Button>
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </Table>
                    </div>
                  )}
                </CardBody>
              </Card>
            </Col>
          </Row>
        </Tab>
        <Tab eventKey="resumen" title="Resumen General">
          {loadingReportes ? (
            <div className="text-center py-5">
              <div className="spinner-border" role="status">
                <span className="visually-hidden">Cargando...</span>
              </div>
            </div>
          ) : resumenGeneral ? (
            <Row>
              <Col md={6}>
                <Card className="mb-3">
                  <CardHeader>
                    <h5 className="mb-0">Ingresos</h5>
                  </CardHeader>
                  <CardBody>
                    <Table size="sm" className="mb-0">
                      <tbody>
                        <tr>
                          <td>Tarjetas Amarillas ({resumenGeneral.totalTarjetasAmarillas})</td>
                          <td className="text-end">${(resumenGeneral.totalTarjetasAmarillas * valores.valorAmarilla).toFixed(2)}</td>
                        </tr>
                        <tr>
                          <td>Tarjetas Rojas ({resumenGeneral.totalTarjetasRojas})</td>
                          <td className="text-end">${(resumenGeneral.totalTarjetasRojas * valores.valorRoja).toFixed(2)}</td>
                        </tr>
                        <tr>
                          <td>Cargos Manuales</td>
                          <td className="text-end">${(resumenGeneral.totalCargosManualesCents / 100).toFixed(2)}</td>
                        </tr>
                        <tr className="table-secondary">
                          <td className="fw-bold">Total Ingresos</td>
                          <td className="text-end fw-bold">${(resumenGeneral.totalIngresosCents / 100).toFixed(2)}</td>
                        </tr>
                      </tbody>
                    </Table>
                  </CardBody>
                </Card>
              </Col>
              <Col md={6}>
                <Card className="mb-3">
                  <CardHeader>
                    <h5 className="mb-0">Egresos</h5>
                  </CardHeader>
                  <CardBody>
                    <Table size="sm" className="mb-0">
                      <tbody>
                        <tr>
                          <td>Pagos Realizados</td>
                          <td className="text-end">${(resumenGeneral.totalPagosCents / 100).toFixed(2)}</td>
                        </tr>
                        <tr className="table-secondary">
                          <td className="fw-bold">Total Egresos</td>
                          <td className="text-end fw-bold">${(resumenGeneral.totalEgresosCents / 100).toFixed(2)}</td>
                        </tr>
                      </tbody>
                    </Table>
                  </CardBody>
                </Card>
              </Col>
              <Col md={12}>
                <Card>
                  <CardHeader>
                    <h5 className="mb-0">Resumen Financiero</h5>
                  </CardHeader>
                  <CardBody>
                    <Row>
                      <Col md={4}>
                        <div className="text-center">
                          <div className="h3 text-success">${(resumenGeneral.totalIngresosCents / 100).toFixed(2)}</div>
                          <small className="text-muted">Ingresos Totales</small>
                        </div>
                      </Col>
                      <Col md={4}>
                        <div className="text-center">
                          <div className="h3 text-danger">${(resumenGeneral.totalEgresosCents / 100).toFixed(2)}</div>
                          <small className="text-muted">Egresos Totales</small>
                        </div>
                      </Col>
                      <Col md={4}>
                        <div className="text-center">
                          <div className={`h3 ${resumenGeneral.saldoNetoCents >= 0 ? 'text-success' : 'text-danger'}`}>
                            ${(resumenGeneral.saldoNetoCents / 100).toFixed(2)}
                          </div>
                          <small className="text-muted">Saldo Neto</small>
                        </div>
                      </Col>
                    </Row>
                    <hr />
                    <div className="text-center">
                      <Badge bg={resumenGeneral.equiposConSaldo > 0 ? 'warning' : 'success'} className="fs-6 px-3 py-2">
                        {resumenGeneral.equiposConSaldo} {resumenGeneral.equiposConSaldo === 1 ? 'equipo' : 'equipos'} con saldo pendiente
                      </Badge>
                    </div>
                  </CardBody>
                </Card>
              </Col>
            </Row>
          ) : (
            <Alert variant="info">Seleccione un torneo para ver el resumen general.</Alert>
          )}
        </Tab>
        <Tab eventKey="estado-cuenta" title="Estado de Cuenta">
          <Row className="mb-3">
            <Col md={6}>
              <Card>
                <CardHeader>
                  <h6 className="mb-0">Seleccionar Equipo</h6>
                </CardHeader>
                <CardBody>
                  <FormSelect
                    value={equipoEstadoCuenta ?? ''}
                    onChange={(e) => setEquipoEstadoCuenta(e.target.value ? parseInt(e.target.value) : null)}
                  >
                    <option value="">Seleccione un equipo...</option>
                    {saldos.map((s: any) => (
                      <option key={s.equipo_id} value={s.equipo_id}>{s.equipo_nombre}</option>
                    ))}
                  </FormSelect>
                </CardBody>
              </Card>
            </Col>
            <Col md={6}>
              <Card>
                <CardHeader>
                  <h6 className="mb-0">Filtrar por Jornada</h6>
                </CardHeader>
                <CardBody>
                  <FormSelect
                    value={jornadaEstadoCuenta ?? ''}
                    onChange={(e) => setJornadaEstadoCuenta(e.target.value ? parseInt(e.target.value) : null)}
                  >
                    <option value="">Todas las jornadas</option>
                    {jornadasDisponibles.map((j) => (
                      <option key={j} value={j}>Jornada {j}</option>
                    ))}
                  </FormSelect>
                </CardBody>
              </Card>
            </Col>
          </Row>
          {loadingReportes ? (
            <div className="text-center py-5">
              <div className="spinner-border" role="status">
                <span className="visually-hidden">Cargando...</span>
              </div>
            </div>
          ) : estadoCuenta ? (
            <Card>
              <CardHeader>
                <h5 className="mb-0">
                  Estado de Cuenta - {estadoCuenta.equipo_nombre}
                  {jornadaEstadoCuenta && (
                    <small className="ms-2 text-muted">
                      (Jornada {jornadaEstadoCuenta})
                    </small>
                  )}
                </h5>
              </CardHeader>
              <CardBody>
                <Row className="mb-3">
                  <Col md={4}>
                    <div className="text-center border rounded p-3">
                      <div className="h4">${(estadoCuenta.saldo_inicial_cents / 100).toFixed(2)}</div>
                      <small className="text-muted">Saldo Inicial</small>
                    </div>
                  </Col>
                  <Col md={4}>
                    <div className="text-center border rounded p-3">
                      <div className="h4">${(estadoCuenta.saldo_final_cents / 100).toFixed(2)}</div>
                      <small className="text-muted">Saldo Final</small>
                    </div>
                  </Col>
                  <Col md={4}>
                    <div className="text-center border rounded p-3">
                      <div className="h4">{estadoCuenta.movimientos.length}</div>
                      <small className="text-muted">Movimientos</small>
                    </div>
                  </Col>
                </Row>
                <div className="table-responsive">
                  <Table striped bordered hover size="sm">
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Tipo</th>
                        <th>Descripción</th>
                        <th>Jornada</th>
                        <th className="text-end">Monto</th>
                        <th className="text-end">Saldo Acumulado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {estadoCuenta.movimientos.map((mov, idx) => {
                        const saldoAcumulado = estadoCuenta.saldo_inicial_cents + 
                          estadoCuenta.movimientos.slice(0, idx + 1).reduce((acc, m) => acc + m.monto_cents, 0)
                        return (
                          <tr key={idx}>
                            <td>{mov.fecha.toLocaleDateString()}</td>
                            <td>
                              <Badge bg={
                                mov.tipo === 'tarjeta_amarilla' ? 'warning' :
                                mov.tipo === 'tarjeta_roja' ? 'danger' :
                                mov.tipo === 'cargo_manual' ? 'info' : 'success'
                              } className={mov.tipo === 'tarjeta_amarilla' ? 'text-dark' : ''}>
                                {mov.tipo === 'tarjeta_amarilla' ? '🟨' :
                                 mov.tipo === 'tarjeta_roja' ? '🟥' :
                                 mov.tipo === 'cargo_manual' ? '➕' : '💳'}
                              </Badge>
                            </td>
                            <td>{mov.descripcion}</td>
                            <td>{mov.jornada ? `J${mov.jornada}` : '-'}</td>
                            <td className={`text-end ${mov.monto_cents >= 0 ? 'text-danger' : 'text-success'}`}>
                              {mov.monto_cents >= 0 ? '+' : ''}${(mov.monto_cents / 100).toFixed(2)}
                            </td>
                            <td className={`text-end fw-semibold ${saldoAcumulado >= 0 ? 'text-warning' : 'text-success'}`}>
                              ${(saldoAcumulado / 100).toFixed(2)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </Table>
                </div>
              </CardBody>
            </Card>
          ) : (
            <Alert variant="info">Seleccione un equipo para ver su estado de cuenta.</Alert>
          )}
        </Tab>
        <Tab eventKey="pagos" title="Gestión de Pagos">
          <Row className="mb-3">
            <Col md={12}>
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  checked={incluirAnulados}
                  onChange={(e) => setIncluirAnulados(e.target.checked)}
                  id="incluirAnulados"
                />
                <label className="form-check-label" htmlFor="incluirAnulados">
                  Incluir pagos anulados
                </label>
              </div>
            </Col>
          </Row>
          {loadingReportes ? (
            <div className="text-center py-5">
              <div className="spinner-border" role="status">
                <span className="visually-hidden">Cargando...</span>
              </div>
            </div>
          ) : listaPagos.length > 0 ? (
            <Card>
              <CardHeader>
                <h5 className="mb-0">Lista de Pagos ({listaPagos.length})</h5>
              </CardHeader>
              <CardBody>
                <div className="table-responsive">
                  <Table striped bordered hover size="sm">
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Equipo</th>
                        <th>Monto</th>
                        <th>Descripción</th>
                        <th>Referencia</th>
                        <th>Jornada</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {listaPagos.map((pago) => (
                        <tr key={pago.id} className={pago.anulado ? 'opacity-50' : ''}>
                          <td>{pago.createdAt ? new Date(pago.createdAt).toLocaleDateString() : '-'}</td>
                          <td>{pago.equipo_nombre}</td>
                          <td className="text-end">${(pago.monto_centavos / 100).toFixed(2)}</td>
                          <td>{pago.descripcion || '-'}</td>
                          <td>{pago.referencia || '-'}</td>
                          <td>{pago.jornada ? `J${pago.jornada}` : '-'}</td>
                          <td>
                            {pago.anulado ? (
                              <Badge bg="danger">Anulado</Badge>
                            ) : (
                              <Badge bg="success">Activo</Badge>
                            )}
                          </td>
                          <td>
                            <div className="d-flex gap-2">
                              {!pago.anulado ? (
                                <>
                                  <Button size="sm" variant="outline-primary" onClick={() => handleEditPago(pago)}>
                                    Editar
                                  </Button>
                                  <Button size="sm" variant="outline-danger" onClick={() => handleAnularPago(pago)}>
                                    Anular
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button size="sm" variant="outline-success" onClick={() => handleReactivarPago(pago.id)}>
                                    Reactivar
                                  </Button>
                                  {pago.motivo_anulacion && (
                                    <small className="text-muted d-flex align-items-center">
                                      Motivo: {pago.motivo_anulacion}
                                    </small>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              </CardBody>
            </Card>
          ) : (
            <Alert variant="info">No hay pagos registrados.</Alert>
          )}
        </Tab>
      </Tabs>

      <Modal show={showCargoModal} onHide={() => setShowCargoModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>{editingCargo ? 'Editar cargo manual' : 'Nuevo cargo manual'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {cargoError && (
            <Alert variant="danger" dismissible onClose={() => setCargoError(null)}>
              {cargoError}
            </Alert>
          )}
          {cargoSuccess && (
            <Alert variant="success" dismissible onClose={() => setCargoSuccess(null)}>
              {cargoSuccess}
            </Alert>
          )}
          <Form>
            {!editingCargo && (
              <div className="mb-3">
                <label className="form-label">Equipo</label>
                <FormSelect 
                  value={cargoEquipoId || ''} 
                  onChange={(e) => {
                    setCargoEquipoId(e.target.value ? parseInt(e.target.value) : ('' as any))
                    setCargoError(null)
                  }} 
                  disabled={aplicarATodosEquipos}
                  isInvalid={!aplicarATodosEquipos && !cargoEquipoId}
                >
                  <option value="">Selecciona equipo...</option>
                  {saldos.map((s:any) => (
                    <option key={s.equipo_id} value={s.equipo_id}>{s.equipo_nombre}</option>
                  ))}
                </FormSelect>
                {!aplicarATodosEquipos && !cargoEquipoId && <div className="invalid-feedback d-block">Seleccione un equipo o marque "Aplicar a todos los equipos"</div>}
              </div>
            )}
            <div className="mb-3">
              <label className="form-label">Monto (USD)</label>
              <FormControl 
                type="number" 
                step="0.01" 
                min="0.01" 
                value={cargoMonto} 
                onChange={(e) => {
                  setCargoMonto(e.target.value)
                  setCargoError(null)
                }}
                isInvalid={!!cargoMonto && (isNaN(parseFloat(cargoMonto)) || parseFloat(cargoMonto) <= 0)}
              />
              {cargoMonto && (isNaN(parseFloat(cargoMonto)) || parseFloat(cargoMonto) <= 0) && (
                <div className="invalid-feedback">El monto debe ser mayor a 0</div>
              )}
            </div>
            <div className="mb-3">
              <label className="form-label">Jornada (opcional)</label>
              <FormControl
                type="number"
                min="1"
                value={cargoJornada}
                onChange={(e) => {
                  setCargoJornada(e.target.value)
                  setCargoError(null)
                }}
                placeholder="Dejar vacío para cargo global"
                isInvalid={!!cargoJornada && (isNaN(parseInt(cargoJornada)) || parseInt(cargoJornada) <= 0)}
              />
              {cargoJornada && (isNaN(parseInt(cargoJornada)) || parseInt(cargoJornada) <= 0) && (
                <div className="invalid-feedback">La jornada debe ser un número mayor a 0</div>
              )}
              <small className="form-text text-muted">Dejar vacío para aplicar el cargo a todo el torneo</small>
            </div>
            <div className="mb-3">
              <label className="form-label">Descripción</label>
              <FormControl as="textarea" rows={2} value={cargoDesc} onChange={(e) => setCargoDesc(e.target.value)} />
            </div>
            {!editingCargo && (
              <div className="mb-3">
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={aplicarATodosEquipos}
                    onChange={(e) => {
                      setAplicarATodosEquipos(e.target.checked)
                      if (e.target.checked) {
                        setCargoEquipoId('' as any)
                      }
                    }}
                    id="aplicarATodosEquipos"
                  />
                  <label className="form-check-label" htmlFor="aplicarATodosEquipos">
                    Aplicar este cargo a todos los equipos
                  </label>
                </div>
              </div>
            )}
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCargoModal(false)}>Cancelar</Button>
          <Button 
            variant="primary" 
            onClick={handleSubmitCargo} 
            disabled={(!aplicarATodosEquipos && !cargoEquipoId) || !cargoMonto || isNaN(parseFloat(cargoMonto)) || parseFloat(cargoMonto) <= 0 || !!cargoSuccess}
          >
            {cargoSuccess ? 'Guardado' : 'Guardar'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal de confirmación de eliminación */}
      <Modal show={showDeleteConfirm} onHide={() => setShowDeleteConfirm(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Confirmar eliminación</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {cargoToDelete && (
            <>
              <p>¿Está seguro que desea eliminar este cargo manual?</p>
              <div className="border rounded p-3 bg-light">
                <div className="d-flex justify-content-between mb-2">
                  <strong>Equipo:</strong>
                  <span>{saldos.find(s => s.equipo_id === cargoToDelete.equipo_id)?.equipo_nombre || cargoToDelete.equipo_id}</span>
                </div>
                <div className="d-flex justify-content-between mb-2">
                  <strong>Monto:</strong>
                  <span>${((cargoToDelete.monto_centavos || 0) / 100).toFixed(2)}</span>
                </div>
                {cargoToDelete.descripcion && (
                  <div className="d-flex justify-content-between">
                    <strong>Descripción:</strong>
                    <span>{cargoToDelete.descripcion}</span>
                  </div>
                )}
              </div>
              <Alert variant="warning" className="mb-0 mt-3">
                Esta acción no se puede deshacer.
              </Alert>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => {
            setShowDeleteConfirm(false)
            setCargoToDelete(null)
          }}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={confirmDeleteCargo}>
            Eliminar
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal de tarjetas por equipo y jornada */}
      <Modal show={showTarjetasModal} onHide={() => setShowTarjetasModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            Tarjetas - {tarjetaModalEquipo?.equipo_nombre} - Jornada {tarjetaModalEquipo?.jornada}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {tarjetasDetalle.length === 0 ? (
            <Alert variant="info">No hay tarjetas registradas para este equipo en esta jornada.</Alert>
          ) : (
            <div className="table-responsive">
              <Table striped bordered hover size="sm">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Tipo</th>
                    <th>Jugador ID</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {tarjetasDetalle.map((t) => (
                    <tr key={t.id}>
                      <td>{t.id}</td>
                      <td>
                        <Badge bg={t.tipo === 'amarilla' ? 'warning' : 'danger'} className={t.tipo === 'amarilla' ? 'text-dark' : ''}>
                          {t.tipo === 'amarilla' ? '🟨 Amarilla' : '🟥 Roja'}
                        </Badge>
                      </td>
                      <td>{t.jugador_id || '-'}</td>
                      <td>
                        <Button 
                          size="sm" 
                          variant="outline-danger" 
                          onClick={() => handleEliminarTarjeta(t.id)}
                        >
                          Eliminar
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowTarjetasModal(false)}>
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal de confirmación de eliminación de tarjeta */}
      <Modal show={showTarjetaDeleteConfirm} onHide={() => setShowTarjetaDeleteConfirm(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Confirmar eliminación</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>¿Está seguro que desea eliminar esta tarjeta?</p>
          <Alert variant="warning" className="mb-0 mt-3">
            Esta acción no se puede deshacer.
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowTarjetaDeleteConfirm(false)}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={confirmDeleteTarjeta}>
            Eliminar
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal de edición de pago */}
      <Modal show={showPagoModal} onHide={() => setShowPagoModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Editar Pago</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {editingPago && (
            <Form>
              <div className="mb-3">
                <label className="form-label">Equipo</label>
                <FormControl value={editingPago.equipo_nombre} disabled />
              </div>
              <div className="mb-3">
                <label className="form-label">Monto (USD)</label>
                <FormControl
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={pagoMonto}
                  onChange={(e) => setPagoMonto(e.target.value)}
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Descripción</label>
                <FormControl
                  as="textarea"
                  rows={2}
                  value={pagoDescripcion}
                  onChange={(e) => setPagoDescripcion(e.target.value)}
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Referencia</label>
                <FormControl
                  value={pagoReferencia}
                  onChange={(e) => setPagoReferencia(e.target.value)}
                  placeholder="Ej: Número de recibo"
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Jornada (opcional)</label>
                <FormControl
                  type="number"
                  min="1"
                  value={pagoJornada}
                  onChange={(e) => setPagoJornada(e.target.value)}
                  placeholder="Dejar vacío para pago general"
                />
              </div>
            </Form>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => {
            setShowPagoModal(false)
            setEditingPago(null)
            setPagoMonto('')
            setPagoDescripcion('')
            setPagoReferencia('')
            setPagoJornada('')
          }}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmitPago}
            disabled={!pagoMonto || isNaN(parseFloat(pagoMonto)) || parseFloat(pagoMonto) <= 0}
          >
            Guardar Cambios
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal de pago para equipo */}
      <Modal show={showPagoEquipoModal} onHide={cerrarModalPagoEquipo}>
        <Modal.Header closeButton>
          <Modal.Title>Registrar Pago - {equipoPagoNombre}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {errorPagoEquipo && (
            <Alert variant="danger" dismissible onClose={() => setErrorPagoEquipo(null)}>
              {errorPagoEquipo}
            </Alert>
          )}
          <Form>
            <div className="mb-3">
              <label className="form-label">Monto (USD) *</label>
              <FormControl
                type="number"
                step="0.01"
                min="0.01"
                value={montoPagoEquipo}
                onChange={(e) => {
                  setMontoPagoEquipo(e.target.value)
                  setErrorPagoEquipo(null)
                }}
                placeholder="Ingrese el monto a abonar"
                isInvalid={!!montoPagoEquipo && (isNaN(parseFloat(montoPagoEquipo)) || parseFloat(montoPagoEquipo) <= 0)}
              />
              {montoPagoEquipo && (isNaN(parseFloat(montoPagoEquipo)) || parseFloat(montoPagoEquipo) <= 0) && (
                <div className="invalid-feedback">El monto debe ser mayor a 0</div>
              )}
            </div>
            <div className="mb-3">
              <label className="form-label">Descripción (opcional)</label>
              <FormControl
                as="textarea"
                rows={3}
                value={descripcionPagoEquipo}
                onChange={(e) => setDescripcionPagoEquipo(e.target.value)}
                placeholder="Ingrese una descripción del pago"
              />
            </div>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={cerrarModalPagoEquipo}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={confirmarPagoEquipo}
            disabled={!montoPagoEquipo || isNaN(parseFloat(montoPagoEquipo)) || parseFloat(montoPagoEquipo) <= 0}
          >
            Registrar Pago
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal de cargo manual desde botón directo */}
      <Modal show={showCargoManualModal} onHide={cerrarModalCargoManual}>
        <Modal.Header closeButton>
          <Modal.Title>Nuevo Cargo Manual - {equipoCargoNombre}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {errorCargoManual && (
            <Alert variant="danger" dismissible onClose={() => setErrorCargoManual(null)}>
              {errorCargoManual}
            </Alert>
          )}
          <Form>
            <div className="mb-3">
              <label className="form-label">Monto (USD) *</label>
              <FormControl
                type="number"
                step="0.01"
                min="0.01"
                value={montoCargoManual}
                onChange={(e) => {
                  setMontoCargoManual(e.target.value)
                  setErrorCargoManual(null)
                }}
                placeholder="Ingrese el monto del cargo"
                isInvalid={!!montoCargoManual && (isNaN(parseFloat(montoCargoManual)) || parseFloat(montoCargoManual) <= 0)}
              />
              {montoCargoManual && (isNaN(parseFloat(montoCargoManual)) || parseFloat(montoCargoManual) <= 0) && (
                <div className="invalid-feedback">El monto debe ser mayor a 0</div>
              )}
            </div>
            <div className="mb-3">
              <label className="form-label">Jornada (opcional)</label>
              <FormControl
                type="number"
                min="1"
                value={jornadaCargoManual}
                onChange={(e) => {
                  setJornadaCargoManual(e.target.value)
                  setErrorCargoManual(null)
                }}
                placeholder="Dejar vacío para cargo global"
                isInvalid={!!jornadaCargoManual && (isNaN(parseInt(jornadaCargoManual)) || parseInt(jornadaCargoManual) <= 0)}
              />
              {jornadaCargoManual && (isNaN(parseInt(jornadaCargoManual)) || parseInt(jornadaCargoManual) <= 0) && (
                <div className="invalid-feedback">La jornada debe ser un número mayor a 0</div>
              )}
              <small className="form-text text-muted">Dejar vacío para aplicar el cargo a todo el torneo</small>
            </div>
            <div className="mb-3">
              <label className="form-label">Descripción (opcional)</label>
              <FormControl
                as="textarea"
                rows={3}
                value={descripcionCargoManual}
                onChange={(e) => setDescripcionCargoManual(e.target.value)}
                placeholder="Ingrese una descripción del cargo"
              />
            </div>
            <div className="mb-3">
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  checked={aplicarATodosEquiposManual}
                  onChange={(e) => setAplicarATodosEquiposManual(e.target.checked)}
                  id="aplicarATodosEquiposManual"
                />
                <label className="form-check-label" htmlFor="aplicarATodosEquiposManual">
                  Aplicar este cargo a todos los equipos
                </label>
              </div>
            </div>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={cerrarModalCargoManual}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={confirmarCargoManual}
            disabled={!montoCargoManual || isNaN(parseFloat(montoCargoManual)) || parseFloat(montoCargoManual) <= 0}
          >
            Registrar Cargo
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal de anulación de pago */}
      <Modal show={showAnularModal} onHide={() => setShowAnularModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Anular Pago</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {pagoToAnular && (
            <>
              <p>¿Está seguro que desea anular este pago?</p>
              <div className="border rounded p-3 mb-3">
                <div className="d-flex justify-content-between mb-2">
                  <strong>Equipo:</strong>
                  <span>{pagoToAnular.equipo_nombre}</span>
                </div>
                <div className="d-flex justify-content-between mb-2">
                  <strong>Monto:</strong>
                  <span>${(pagoToAnular.monto_centavos / 100).toFixed(2)}</span>
                </div>
                {pagoToAnular.descripcion && (
                  <div className="d-flex justify-content-between mb-2">
                    <strong>Descripción:</strong>
                    <span>{pagoToAnular.descripcion}</span>
                  </div>
                )}
                {pagoToAnular.referencia && (
                  <div className="d-flex justify-content-between">
                    <strong>Referencia:</strong>
                    <span>{pagoToAnular.referencia}</span>
                  </div>
                )}
              </div>
              <div className="mb-3">
                <label className="form-label">Motivo de anulación *</label>
                <FormControl
                  as="textarea"
                  rows={3}
                  value={motivoAnulacion}
                  onChange={(e) => setMotivoAnulacion(e.target.value)}
                  placeholder="Ingrese el motivo de la anulación..."
                  required
                />
              </div>
              <Alert variant="warning" className="mb-0">
                El pago será marcado como anulado y no se considerará en los cálculos de saldos.
              </Alert>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => {
            setShowAnularModal(false)
            setPagoToAnular(null)
            setMotivoAnulacion('')
          }}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={confirmAnularPago}
            disabled={!motivoAnulacion.trim()}
          >
            Anular Pago
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal Manual de Usuario */}
      <Modal show={showManualUsuario} onHide={() => setShowManualUsuario(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title className="d-flex align-items-center">
            <TbHelp className="me-2" />
            Manual de Usuario - Contabilidad de Tarjetas
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          <div className="manual-content">
            <Alert variant="info" className="mb-4">
              <strong>Contabilidad de Tarjetas</strong>
              <br />
              <small>Desde aquí se gestiona la contabilidad por tarjetas amarillas y rojas de cada torneo: montos por equipo, pagos, cargos manuales, resúmenes y estado de cuenta.</small>
            </Alert>

            <h6 className="text-primary mb-2">Seleccionar Torneo</h6>
            <p>En la parte superior elige el <strong>torneo</strong> del que quieres ver la contabilidad. Debajo del selector aparecen los <strong>valores unitarios</strong> actuales: cuánto vale cada tarjeta amarilla y cada tarjeta roja (en la moneda configurada para el torneo). Esos valores se usan para calcular automáticamente el monto por equipo: (amarillas × valor amarilla) + (rojas × valor roja). Si no ves valores o son cero, revisa la configuración del torneo.</p>

            <h6 className="text-primary mb-2 mt-3">Pestaña Contabilidad</h6>
            <h6 className="text-secondary small mb-1">Resumen por jornada</h6>
            <p>Se listan las <strong>jornadas</strong> en tarjetas; en cada una hay una tabla con: <strong>Equipo</strong>, cantidad de <strong>amarillas</strong> y <strong>rojas</strong>, y <strong>Monto</strong> calculado. En la columna de amarillas, si el equipo tiene al menos una tarjeta en esa jornada, aparece el enlace <strong>&quot;Ver/Editar&quot;</strong>.</p>
            <ul className="small mb-2">
              <li><strong>Ver/Editar:</strong> Abre un modal con el detalle de cada tarjeta de ese equipo en esa jornada: <strong>ID</strong>, <strong>Tipo</strong> (amarilla/roja), <strong>Jugador ID</strong>. Desde ahí puedes <strong>Eliminar</strong> una tarjeta (por ejemplo si se cargó por error); al eliminar se pide confirmación y la acción no se puede deshacer. Los montos y saldos se recalculan al cerrar el modal.</li>
            </ul>
            <h6 className="text-secondary small mb-1">Saldos por Equipo</h6>
            <p>Tabla con: <strong>Equipo</strong>, total de amarillas y rojas, <strong>Importe + Cargos</strong> (lo que debe por tarjetas y cargos manuales), <strong>Pagos</strong> (lo ya abonado), <strong>Saldo</strong> (importe + cargos − pagos). Un saldo <strong>positivo</strong> (badge amarillo) significa que el equipo debe dinero; un saldo <strong>negativo o cero</strong> (badge verde) significa que está al día o con saldo a favor. Arriba a la derecha se muestra el <strong>Saldo General</strong> del torneo.</p>
            <ul className="small mb-2">
              <li><strong>Abonar:</strong> Registra un pago de ese equipo. En el modal se pide <strong>Monto</strong> (obligatorio, mayor a 0) y <strong>Descripción</strong> (opcional). Al guardar, el saldo del equipo disminuye.</li>
              <li><strong>Cargo manual:</strong> Agrega un cargo a ese equipo (multa, recargo, etc.). Se abre un modal con <strong>Monto</strong>, <strong>Descripción</strong>, <strong>Jornada</strong> (opcional; si se deja vacía el cargo es &quot;global&quot;) y la opción &quot;Aplicar a todos los equipos&quot;. Al guardar, el saldo del equipo aumenta.</li>
            </ul>
            <h6 className="text-secondary small mb-1">Cargos Manuales</h6>
            <p>Listado de todos los cargos manuales del torneo con: <strong>ID</strong>, <strong>Equipo</strong>, <strong>Jornada</strong> (número de jornada o &quot;Global&quot;), <strong>Descripción</strong>, <strong>Monto</strong>. Acciones: <strong>Nuevo</strong> (crear cargo: elegir equipo o marcar &quot;Aplicar a todos los equipos&quot;, monto, jornada opcional, descripción), <strong>Editar</strong> (cambiar monto, jornada, descripción), <strong>Eliminar</strong> (con confirmación; no se puede deshacer). El <strong>campo de búsqueda</strong> filtra por nombre de equipo o texto de la descripción.</p>

            <h6 className="text-primary mb-2 mt-3">Pestaña Resumen General</h6>
            <p>Muestra un resumen financiero del torneo. <strong>Ingresos:</strong> detalle por tarjetas amarillas (cantidad y monto), tarjetas rojas (cantidad y monto), cargos manuales, y total de ingresos. <strong>Egresos:</strong> pagos realizados y total de egresos. <strong>Resumen:</strong> Ingresos totales, Egresos totales y <strong>Saldo neto</strong> (ingresos − egresos). Abajo se indica cuántos equipos tienen saldo pendiente (deben dinero). Los datos se cargan al entrar en la pestaña o al cambiar de torneo.</p>

            <h6 className="text-primary mb-2 mt-3">Pestaña Estado de Cuenta</h6>
            <p>Permite ver el detalle de movimientos de un equipo. Primero selecciona un <strong>equipo</strong> en el desplegable (lista los equipos que tienen saldo en el torneo). Opcionalmente elige una <strong>jornada</strong> para filtrar solo movimientos hasta esa jornada; &quot;Todas las jornadas&quot; muestra todo. Se muestra: <strong>Saldo inicial</strong>, <strong>Saldo final</strong>, cantidad de <strong>movimientos</strong> y una tabla con cada movimiento: <strong>Fecha</strong>, <strong>Tipo</strong> (tarjeta amarilla, roja, cargo manual, pago), <strong>Descripción</strong>, <strong>Jornada</strong>, <strong>Monto</strong> (positivo = suma al debe, negativo = pago/abono), <strong>Saldo acumulado</strong>. Los tipos se distinguen con íconos/colores (amarilla, roja, cargo, pago).</p>

            <h6 className="text-primary mb-2 mt-3">Pestaña Gestión de Pagos</h6>
            <p>Lista todos los pagos registrados del torneo. Columnas: <strong>Fecha</strong>, <strong>Equipo</strong>, <strong>Monto</strong>, <strong>Descripción</strong>, <strong>Referencia</strong>, <strong>Jornada</strong>, <strong>Estado</strong> (Activo / Anulado), <strong>Acciones</strong>. Arriba: el checkbox <strong>Incluir pagos anulados</strong> muestra u oculta los pagos anulados en la lista (por defecto están ocultos).</p>
            <ul className="small mb-2">
              <li><strong>Editar:</strong> Solo para pagos activos. Permite cambiar Monto, Descripción, Referencia y Jornada. El equipo no se puede cambiar.</li>
              <li><strong>Anular:</strong> Solo para pagos activos. Se debe indicar un <strong>motivo de anulación</strong> (obligatorio). El pago deja de sumar en los saldos; el equipo volverá a tener ese monto como pendiente. La anulación queda registrada.</li>
              <li><strong>Reactivar:</strong> Solo para pagos anulados. Revierte la anulación y el pago vuelve a considerarse en los saldos. Útil si se anuló por error.</li>
            </ul>

            <h6 className="text-primary mb-2 mt-3">Solución de problemas</h6>
            <ul className="small mb-2">
              <li>Si una tarjeta se cargó mal en un partido, use <strong>Ver/Editar</strong> en la jornada correspondiente y elimine la tarjeta incorrecta. Las tarjetas correctas se siguen cargando desde <strong>Gestión de Jugadores</strong> del encuentro.</li>
              <li>Si un pago se registró mal, puede <strong>Editar</strong> el monto/descripción en Gestión de Pagos, o <strong>Anular</strong> y registrar uno nuevo con Abonar.</li>
              <li>Los valores por amarilla/roja se configuran en el torneo; si cambian, los montos ya calculados no se recalculan solos para movimientos pasados, pero los nuevos cálculos usarán los valores actuales.</li>
            </ul>

            <Alert variant="success" className="mb-0 mt-3">
              <strong>Consejo:</strong> Las tarjetas se registran en la pantalla de Gestión de Jugadores del partido; aquí solo se consultan, se registran pagos y cargos, y se ven los resúmenes.
            </Alert>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowManualUsuario(false)}>
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  )
}

export default ContabilidadTarjetasPage


