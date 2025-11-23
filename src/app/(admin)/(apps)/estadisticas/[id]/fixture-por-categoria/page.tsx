'use client'
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import { Card, CardBody, CardHeader, Col, Container, Row, Badge, Table, Modal, Form, Button, FormSelect } from 'react-bootstrap'
import { LuCalendarDays, LuMapPin, LuClock, LuGamepad2 } from 'react-icons/lu'
import EstadisticasTabs from '../components/Tabs'
import { getTorneoById, getEncuentrosByTorneo } from '../../../torneos/actions'
import { getHorarios } from '../../../torneos/horarios-actions'
import { getCanchas, getCanchasByCategoriaId } from '@/app/(admin)/(apps)/canchas/actions'
import type { TorneoWithRelations, EncuentroWithRelations, Horario, Cancha } from '@/db/types'

const obtenerEtiquetaDia = (dia?: string | null) => {
	if (!dia) return 'Viernes'
	const diaLower = dia.toLowerCase()
	if (diaLower === 'viernes') return 'Viernes'
	if (diaLower === 'sabado') return 'Sábado'
	if (diaLower === 'domingo') return 'Domingo'
	return 'Viernes'
}

const formatFechaConDia = (fecha?: Date | string | null) => {
	if (!fecha) return 'Sin fecha'
	const d = fecha instanceof Date ? fecha : new Date(fecha)
	if (isNaN(d.getTime())) return 'Sin fecha'
	const diaSemana = d.toLocaleDateString('es-ES', { weekday: 'long' })
	const fechaStr = d.toLocaleDateString('es-ES')
	const diaCapitalizado = diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1)
	return `${diaCapitalizado} ${fechaStr}`
}

const formatHora = (iso?: Date | string | null, horarioInicio?: string | null) => {
	// SIEMPRE usar horario.hora_inicio si está disponible
	// fecha_programada solo se usa para la fecha, nunca para la hora
	if (horarioInicio && /^\d{2}:\d{2}/.test(horarioInicio)) {
		return horarioInicio.slice(0, 5)
	}
	// Si no hay horario, no mostrar hora
	return null
}

const FixturePorCategoriaPage = () => {
	const params = useParams()
	const torneoId = parseInt(params.id as string)
  
	const [torneo, setTorneo] = useState<TorneoWithRelations | null>(null)
	const [encuentros, setEncuentros] = useState<EncuentroWithRelations[]>([])
	const [horarios, setHorarios] = useState<Horario[]>([])
	const [canchas, setCanchas] = useState<Cancha[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [showModal, setShowModal] = useState(false)
	const [form, setForm] = useState({
		equipoLocalId: '',
		equipoVisitanteId: '',
		fecha: '',
		horarioId: '',
		cancha: '',
		jornada: ''
	})

	const equiposOptions = useMemo(() => {
		return (torneo?.equiposTorneo ?? []).map((et: any) => ({
			id: et.equipo?.id,
			nombre: et.equipo?.nombre
		})).filter((e: any) => e.id && e.nombre)
	}, [torneo])

	const handleCreate = async () => {
		try {
			if (!form.equipoLocalId || !form.equipoVisitanteId) {
				alert('Selecciona equipos local y visitante')
				return
			}
			if (form.equipoLocalId === form.equipoVisitanteId) {
				alert('Los equipos no pueden ser iguales')
				return
			}

			// Verificar si ya existe un encuentro entre estos equipos
			const equipoLocalId = Number(form.equipoLocalId)
			const equipoVisitanteId = Number(form.equipoVisitanteId)
			
			// Si el torneo permite revancha, solo bloquear si existe un encuentro con exactamente los mismos equipos en las mismas posiciones
			// Si no permite revancha, bloquear cualquier encuentro entre estos equipos
			const encuentroExistente = encuentros.find(encuentro => {
				if (torneo?.permite_revancha) {
					// Con revancha: solo bloquear si es exactamente el mismo emparejamiento (mismo local y mismo visitante)
					return encuentro.equipo_local_id === equipoLocalId && 
					       encuentro.equipo_visitante_id === equipoVisitanteId
				} else {
					// Sin revancha: bloquear cualquier encuentro entre estos equipos
					return (encuentro.equipo_local_id === equipoLocalId && encuentro.equipo_visitante_id === equipoVisitanteId) ||
					       (encuentro.equipo_local_id === equipoVisitanteId && encuentro.equipo_visitante_id === equipoLocalId)
				}
			})

			if (encuentroExistente) {
				const equipoLocal = equiposOptions.find(e => e.id === equipoLocalId)?.nombre || 'Equipo Local'
				const equipoVisitante = equiposOptions.find(e => e.id === equipoVisitanteId)?.nombre || 'Equipo Visitante'
				alert(`Ya existe un encuentro entre ${equipoLocal} y ${equipoVisitante} en este torneo`)
				return
			}

			const res = await fetch('/api/encuentros/manual', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					torneoId,
					equipoLocalId: Number(form.equipoLocalId),
					equipoVisitanteId: Number(form.equipoVisitanteId),
					fechaProgramada: form.fecha ? new Date(form.fecha).toISOString() : null,
					horarioId: form.horarioId ? Number(form.horarioId) : null,
					cancha: form.cancha || null,
					jornada: form.jornada ? Number(form.jornada) : null
				})
			})
			const data = await res.json()
			if (!res.ok) {
				throw new Error(data?.error || 'Error al crear emparejamiento')
			}
			setShowModal(false)
			// Recargar lista
			setEncuentros(prev => [...prev, data.encuentro])
			// Reset
			setForm({ equipoLocalId: '', equipoVisitanteId: '', fecha: '', horarioId: '', cancha: '', jornada: '' })
		} catch (e: any) {
			alert(e.message || 'Error al crear emparejamiento')
		}
	}

	useEffect(() => {
		const loadData = async () => {
			try {
				setLoading(true)
				const [torneoData, encuentrosData, horariosData] = await Promise.all([
					getTorneoById(torneoId),
					getEncuentrosByTorneo(torneoId),
					getHorarios(torneoId)
				])
        
				setTorneo(torneoData as unknown as TorneoWithRelations)
				setEncuentros(encuentrosData as unknown as EncuentroWithRelations[])
				setHorarios(horariosData)
				
				// Cargar canchas según la categoría del torneo
				const canchasData = torneoData?.categoria_id 
					? await getCanchasByCategoriaId(torneoData.categoria_id)
					: await getCanchas()
				// Mapear canchas si vienen del join (estructura { canchas: {...}, canchas_categorias: {...} })
				const canchasMapeadas = canchasData.map((item: any) => item.canchas || item)
				setCanchas(canchasMapeadas)
			} catch (err) {
				setError('Error al cargar el fixture del torneo')
				console.error('Error loading data:', err)
			} finally {
				setLoading(false)
			}
		}

		if (torneoId) {
			loadData()
		}
	}, [torneoId])

	const encuentrosPorJornada = useMemo(() => {
		const grupos: Record<number, EncuentroWithRelations[]> = {}
		encuentros.forEach(e => {
			const j = e.jornada || 0
			if (!grupos[j]) grupos[j] = []
			grupos[j].push(e)
		})
		return Object.entries(grupos)
			.map(([j, lista]) => [parseInt(j), lista] as [number, EncuentroWithRelations[]])
			.sort((a, b) => a[0] - b[0])
	}, [encuentros])

	if (loading) {
		return (
			<Container fluid>
				<PageBreadcrumb title="Cargando..." />
				<div className="text-center py-5">
					<div className="spinner-border text-primary" role="status">
						<span className="visualmente-hidden">Cargando...</span>
					</div>
				</div>
			</Container>
		)
	}

	if (error || !torneo) {
		return (
			<Container fluid>
				<PageBreadcrumb title="Error" />
				<div className="text-center py-5">
					<p className="text-danger">{error || 'Torneo no encontrado'}</p>
				</div>
			</Container>
		)
	}

	return (
		<Container fluid>
			<PageBreadcrumb title={`Fixture por categoría - ${torneo.nombre}`} />
			<EstadisticasTabs active="fixture" />

			<Row>
				<Col>
					<Card>
						<CardHeader className="p-0">
							<div className="d-flex justify-content-between align-items-center p-3">
								<div>
									<h5 className="mb-1">
										<LuCalendarDays className="me-2 text-primary" />
										Fixture por categoría
									</h5>
									<p className="text-muted mb-0">
										Categoría: <strong>{torneo.categoria?.nombre || 'Sin categoría'}</strong>
									</p>
								</div>
								<div className="d-flex gap-2 align-items-center">
									<Badge bg="secondary" className="fs-6 px-3 py-2">
										<LuGamepad2 className="me-2" />
										{encuentros.length} partidos programados
									</Badge>
									<Button
										variant="primary"
										onClick={() => setShowModal(true)}
										className="d-flex align-items-center gap-2"
									>
										<LuCalendarDays />
										Crear emparejamiento
									</Button>
								</div>
							</div>
						</CardHeader>
						<CardBody>
							{encuentrosPorJornada.length === 0 ? (
								<div className="text-center py-5 text-muted">
									No hay encuentros programados.
								</div>
							) : (
								<Row className="g-4">
									{encuentrosPorJornada.map(([jornada, lista]) => (
										<Col key={jornada} md={12}>
											<Card>
												<CardHeader className="bg-light d-flex justify-content-between align-items-center">
													<div className="fw-bold">Jornada {jornada}</div>
													<div className="text-muted small">
														{lista.filter(e => e.estado === 'finalizado').length} finalizado(s)
													</div>
												</CardHeader>
												<CardBody className="p-0">
													<Table hover responsive className="mb-0 align-middle">
														<thead className="table-secondary">
															<tr>
																<th style={{ width: 180 }}>Fecha</th>
																<th>Local</th>
																<th className="text-center" style={{ width: 80 }}>vs</th>
																<th>Visitante</th>
																<th style={{ width: 180 }}>Cancha</th>
															</tr>
														</thead>
														<tbody>
															{lista
																.sort((a, b) => {
																	// Función para obtener el valor de ordenamiento por hora
																	const getSortValue = (e: EncuentroWithRelations) => {
																		// 1) PRIORIZAR horario.hora_inicio (siempre usar la hora del horario asignado)
																		if (e.horario?.hora_inicio && /^\d{2}:\d{2}/.test(e.horario.hora_inicio)) {
																			const [hh, mm] = e.horario.hora_inicio.split(':').map(Number)
																			// Convertir a minutos del día para ordenar correctamente
																			return hh * 60 + mm
																		}
																		// 2) Si no hay horario, usar fecha_programada como respaldo
																		if (e.fecha_programada) {
																			const ts = new Date(e.fecha_programada).getTime()
																			if (!isNaN(ts)) return ts
																		}
																		// 3) Último recurso: 0 (sin hora)
																		return 0
																	}
																	return getSortValue(a) - getSortValue(b)
																})
																.map(encuentro => (
																	<tr key={encuentro.id}>
																		<td>
																			<div className="d-flex align-items-center gap-2">
																				<LuClock className="text-muted" />
																				<div className="d-flex flex-column">
																					<span>
																						{encuentro.fecha_programada
																							? formatFechaConDia(encuentro.fecha_programada)
																							: 'Sin fecha'}
																					</span>
																					{formatHora(encuentro.fecha_programada, encuentro.horario?.hora_inicio) && (
																						<small className="text-muted">
																							{formatHora(encuentro.fecha_programada, encuentro.horario?.hora_inicio)} hs
																						</small>
																					)}
																				</div>
																			</div>
																		</td>
																		<td className="fw-semibold">
																			{encuentro.equipoLocal?.nombre || '-'}
																		</td>
																		<td className="text-center">vs</td>
																		<td className="fw-semibold">
																			{encuentro.equipoVisitante?.nombre || '-'}
																		</td>
																		<td>
																			<div className="d-flex align-items-center gap-2">
																				<LuMapPin className="text-muted" />
																				<span>
																					{typeof (encuentro as any).cancha === 'string'
																						? ((encuentro as any).cancha || 'Sin asignar')
																						: ((encuentro as any).cancha?.nombre || 'Sin asignar')}
																				</span>
																			</div>
																		</td>
																	</tr>
																))}
														</tbody>
													</Table>
												</CardBody>
											</Card>
										</Col>
									))}
								</Row>
							)}
						</CardBody>
					</Card>
				</Col>
			</Row>

			{/* Modal para creación manual */}
			<Modal show={showModal} onHide={() => setShowModal(false)} centered>
				<Modal.Header closeButton>
					<Modal.Title>Crear emparejamiento</Modal.Title>
				</Modal.Header>
				<Modal.Body>
					<Form className="d-grid gap-3">
						<Form.Group>
							<Form.Label>Equipo local</Form.Label>
							<Form.Select
								value={form.equipoLocalId}
								onChange={(e) => setForm(f => ({ ...f, equipoLocalId: e.target.value }))}
							>
								<option value="">Selecciona equipo</option>
								{equiposOptions.map(opt => (
									<option key={opt.id} value={opt.id}>{opt.nombre}</option>
								))}
							</Form.Select>
						</Form.Group>
						<Form.Group>
							<Form.Label>Equipo visitante</Form.Label>
							<Form.Select
								value={form.equipoVisitanteId}
								onChange={(e) => setForm(f => ({ ...f, equipoVisitanteId: e.target.value }))}
							>
								<option value="">Selecciona equipo</option>
								{equiposOptions.map(opt => (
									<option key={opt.id} value={opt.id}>{opt.nombre}</option>
								))}
							</Form.Select>
						</Form.Group>
						<Form.Group>
							<Form.Label>Fecha y hora (opcional)</Form.Label>
							<Form.Control
								type="datetime-local"
								value={form.fecha}
								onChange={(e) => setForm(f => ({ ...f, fecha: e.target.value }))}
							/>
						</Form.Group>
						<Form.Group>
							<Form.Label>Horario (opcional)</Form.Label>
							<Form.Select
								value={form.horarioId}
								onChange={(e) => setForm(f => ({ ...f, horarioId: e.target.value }))}
							>
								<option value="">Selecciona un horario</option>
								{horarios.map(horario => (
									<option key={horario.id} value={horario.id}>
										{obtenerEtiquetaDia(horario.dia_semana)} - {horario.hora_inicio}
									</option>
								))}
							</Form.Select>
							<Form.Text className="text-muted">
								Si seleccionas un horario, se ignorará la hora manual.
							</Form.Text>
						</Form.Group>
						<Form.Group>
							<Form.Label>Cancha (opcional)</Form.Label>
							<Form.Select
								value={form.cancha}
								onChange={(e) => setForm(f => ({ ...f, cancha: e.target.value }))}
							>
								<option value="">Selecciona una cancha</option>
								{canchas.map(cancha => (
									<option key={cancha.id} value={cancha.nombre}>
										{cancha.nombre} {cancha.ubicacion && `- ${cancha.ubicacion}`}
									</option>
								))}
							</Form.Select>
						</Form.Group>
						<Form.Group>
							<Form.Label>Jornada (opcional)</Form.Label>
							<Form.Control
								type="number"
								min={1}
								value={form.jornada}
								onChange={(e) => setForm(f => ({ ...f, jornada: e.target.value }))}
							/>
						</Form.Group>
					</Form>
				</Modal.Body>
				<Modal.Footer>
					<Button variant="outline-secondary" onClick={() => setShowModal(false)}>Cancelar</Button>
					<Button variant="primary" onClick={handleCreate}>Guardar</Button>
				</Modal.Footer>
			</Modal>
		</Container>
	)
}

export default FixturePorCategoriaPage


