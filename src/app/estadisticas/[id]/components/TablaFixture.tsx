'use client'
import { Card, CardBody, CardHeader, Col, Row, Table, Badge } from 'react-bootstrap'
import { useMemo } from 'react'
import { LuClock, LuMapPin, LuGamepad2 } from 'react-icons/lu'

interface Equipo {
	id: number
	nombre: string
	imagen_equipo?: string | null
}

interface Cancha {
	id: number
	nombre: string
}

interface Encuentro {
	id: number
	jornada?: number | null
	fecha_programada?: string | null
	estado?: string | null
	equipoLocal?: Equipo | null
	equipoVisitante?: Equipo | null
	horario?: { nombre?: string | null, hora_inicio?: string | null } | null
	cancha?: string | Cancha | null
}

interface TablaFixtureProps {
	encuentros: Encuentro[]
	equiposDescansan?: Record<number, number[]>
	equiposMap?: Record<number, { id: number; nombre: string; imagen_equipo?: string | null }>
	filtrarPorFechaActual?: boolean
}

export default function TablaFixture({ encuentros, equiposDescansan = {}, equiposMap = {}, filtrarPorFechaActual = true }: TablaFixtureProps) {
	const formatFechaConDia = (iso?: string | null) => {
		if (!iso) return 'Sin fecha'
		const d = new Date(iso)
		const diaSemana = d.toLocaleDateString('es-ES', { weekday: 'long' })
		const fecha = d.toLocaleDateString('es-ES')
		const diaCapitalizado = diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1)
		return `${diaCapitalizado} ${fecha}`
	}
	const formatHora = (iso?: string | null, horarioInicio?: string | null) => {
		// SIEMPRE usar horario.hora_inicio si está disponible
		// fecha_programada solo se usa para la fecha, nunca para la hora
		if (horarioInicio && /^\d{2}:\d{2}/.test(horarioInicio)) {
			return horarioInicio.slice(0, 5)
		}
		// Si no hay horario, no mostrar hora
		return ''
	}
	const getEstadoColors = (estado?: string | null) => {
		if (estado === 'en_curso') return { bg: '#2ecc71', border: '#27ae60' } // verde
		if (estado === 'finalizado') return { bg: '#0d6efd', border: '#0b5ed7' } // azul
		if (estado === 'suspendido') return { bg: '#dc3545', border: '#bb2d3b' } // rojo
		return { bg: '#17a2b8', border: '#138496' } // programado/info
	}
	const getCanchaName = (c: string | Cancha | null | undefined) => {
		if (!c) return ''
		return typeof c === 'string' ? c : (c.nombre || '')
	}
	const getCanchaColor = (nombre: string) => {
		if (!nombre) return '#6c757d'
		// Paleta de colores vibrantes y legibles
		const palette = [
			'#e74c3c', // rojo
			'#f39c12', // naranja
			'#27ae60', // verde
			'#2980b9', // azul
			'#8e44ad', // morado
			'#d35400', // naranja oscuro
			'#16a085', // verde azulado
			'#c0392b', // rojo oscuro
			'#2c3e50', // azul gris
			'#7f8c8d', // gris
		]
		// Hash simple por nombre
		let hash = 0
		for (let i = 0; i < nombre.length; i++) {
			hash = (hash * 31 + nombre.charCodeAt(i)) >>> 0
		}
		return palette[hash % palette.length]
	}
	const getFechaColor = (fechaIso?: string | null) => {
		if (!fechaIso) return '#6c757d'
		// Normalizar fecha (solo día, sin hora)
		const fecha = new Date(fechaIso)
		fecha.setHours(0, 0, 0, 0)
		const fechaString = fecha.toISOString().split('T')[0] // YYYY-MM-DD
		
		// Usar solo naranja y verde, alternando según la fecha
		const colors = ['#f39c12', '#2ecc71'] // naranja y verde
		
		// Hash simple por fecha para determinar el color
		let hash = 0
		for (let i = 0; i < fechaString.length; i++) {
			hash = (hash * 31 + fechaString.charCodeAt(i)) >>> 0
		}
		return colors[hash % 2] // Alterna entre los dos colores
	}
	// Crear mapa de equipos desde los encuentros y el mapa de equipos del torneo
	const equiposMapCompleto = useMemo(() => {
		const map = new Map<number, Equipo>()
		// Primero agregar equipos del mapa del torneo
		Object.values(equiposMap).forEach(equipo => {
			map.set(equipo.id, {
				id: equipo.id,
				nombre: equipo.nombre,
				imagen_equipo: equipo.imagen_equipo
			})
		})
		// Luego agregar equipos de los encuentros (pueden tener más información)
		encuentros.forEach(e => {
			if (e.equipoLocal) map.set(e.equipoLocal.id, e.equipoLocal)
			if (e.equipoVisitante) map.set(e.equipoVisitante.id, e.equipoVisitante)
		})
		return map
	}, [encuentros, equiposMap])

	const encuentrosPorJornada = useMemo(() => {
		const grupos: Record<number, Encuentro[]> = {}
		for (const e of encuentros) {
			const j = e.jornada || 0
			if (!grupos[j]) grupos[j] = []
			grupos[j].push(e)
		}
		
		let jornadasFiltradas = Object.entries(grupos)
			.map(([j, lista]) => [parseInt(j), lista] as [number, Encuentro[]])
		
		// Si la bandera está activada, filtrar jornadas por fecha actual
		if (filtrarPorFechaActual) {
			// Obtener fecha actual (solo fecha, sin hora)
			const fechaActual = new Date()
			fechaActual.setHours(0, 0, 0, 0)
			
			// Filtrar jornadas que tengan al menos un encuentro con fecha >= fecha actual
			jornadasFiltradas = jornadasFiltradas.filter(([jornada, lista]) => {
				// Si la jornada tiene al menos un encuentro con fecha >= fecha actual, incluirla
				return lista.some(encuentro => {
					if (!encuentro.fecha_programada) return false
					const fechaEncuentro = new Date(encuentro.fecha_programada)
					fechaEncuentro.setHours(0, 0, 0, 0)
					return fechaEncuentro >= fechaActual
				})
			})
		}
		
		return jornadasFiltradas.sort((a, b) => a[0] - b[0])
	}, [encuentros, filtrarPorFechaActual])

	// Obtener equipos que descansan en una jornada
	const getEquiposQueDescansan = (jornada: number): Equipo[] => {
		// Primero intentar obtener desde los datos de la base de datos
		const equiposIds = equiposDescansan[jornada] || []
		if (equiposIds.length > 0) {
			const equipos = equiposIds.map(id => equiposMapCompleto.get(id)).filter((e): e is Equipo => e !== undefined)
			if (equipos.length > 0) {
				return equipos
			}
		}

		// Si no hay datos en BD, calcular automáticamente
		// Obtener todos los equipos que juegan en esta jornada
		const encuentrosJornada = encuentros.filter(e => e.jornada === jornada)
		const equiposQueJuegan = new Set<number>()
		encuentrosJornada.forEach(encuentro => {
			if (encuentro.equipoLocal) equiposQueJuegan.add(encuentro.equipoLocal.id)
			if (encuentro.equipoVisitante) equiposQueJuegan.add(encuentro.equipoVisitante.id)
		})

		// Obtener todos los equipos del torneo
		const todosEquiposIds = Array.from(equiposMapCompleto.keys())
		
		// Encontrar los equipos que NO juegan (descansan)
		const equiposQueDescansanIds = todosEquiposIds.filter(id => !equiposQueJuegan.has(id))
		
		// Si hay un número impar de equipos, debería haber exactamente 1 que descansa
		// Si hay un número par, no debería haber ninguno (pero mostramos si hay)
		if (equiposQueDescansanIds.length > 0) {
			const equipos = equiposQueDescansanIds
				.map(id => equiposMapCompleto.get(id))
				.filter((e): e is Equipo => e !== undefined)
			return equipos
		}

		return []
	}

	const sortEncuentros = (a: Encuentro, b: Encuentro) => {
		// 1) Primero ordenar por fecha (solo día, sin hora)
		const fechaA = a.fecha_programada ? new Date(a.fecha_programada) : null
		const fechaB = b.fecha_programada ? new Date(b.fecha_programada) : null
		
		if (fechaA && fechaB) {
			// Normalizar fechas (solo día, sin hora)
			fechaA.setHours(0, 0, 0, 0)
			fechaB.setHours(0, 0, 0, 0)
			
			const diffFecha = fechaA.getTime() - fechaB.getTime()
			if (diffFecha !== 0) {
				return diffFecha
			}
		} else if (fechaA && !fechaB) {
			return -1
		} else if (!fechaA && fechaB) {
			return 1
		}
		
		// 2) Si las fechas son iguales, ordenar por hora
		// PRIORIZAR horario.hora_inicio (siempre usar la hora del horario asignado)
		let horaA = 0
		let horaB = 0
		
		if (a.horario?.hora_inicio && /^\d{2}:\d{2}/.test(a.horario.hora_inicio)) {
			const [hh, mm] = a.horario.hora_inicio.split(':').map(Number)
			horaA = hh * 60 + mm
		}
		
		if (b.horario?.hora_inicio && /^\d{2}:\d{2}/.test(b.horario.hora_inicio)) {
			const [hh, mm] = b.horario.hora_inicio.split(':').map(Number)
			horaB = hh * 60 + mm
		}
		
		return horaA - horaB
	}

	if (encuentros.length === 0) {
		return (
			<div className="text-center py-5 text-muted">
				<div className="mb-3">
					<div className="d-inline-flex align-items-center justify-content-center bg-light rounded-circle mb-3" style={{width: '80px', height: '80px'}}>
						<LuGamepad2 className="fs-1 text-muted" />
					</div>
				</div>
				No hay encuentros programados.
			</div>
		)
	}

	return (
		<div className="p-3">
			<Row className="g-4">
				{encuentrosPorJornada.map(([jornada, lista]) => (
					<Col key={jornada} md={12}>
						<Card 
							className="border-0 overflow-hidden"
							style={{
								background: 'rgba(26, 26, 26, 0.95)',
								color: '#ffffff',
								boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
								border: '1px solid rgba(255, 215, 0, 0.1)'
							}}
						>
							<CardHeader 
								className="d-flex justify-content-between align-items-center border-0"
								style={{
									background: 'linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 100%)',
									color: '#ffffff',
									borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
								}}
							>
								<div className="d-flex flex-column gap-1">
									<h5 className="mb-0 fw-bold">Jornada {jornada}</h5>
									{(() => {
										const equiposDescansando = getEquiposQueDescansan(jornada)
										if (equiposDescansando.length > 0) {
											return (
												<div className="d-flex align-items-center gap-2" style={{ marginTop: '4px' }}>
													<span style={{ 
														color: '#ffc107',
														fontSize: '0.85rem',
														fontWeight: '500',
														opacity: 0.9,
														display: 'flex',
														alignItems: 'center',
														gap: '6px'
													}}>
														<span style={{ fontSize: '1rem' }}>⚽</span>
														<span style={{ 
															color: 'rgba(255, 255, 255, 0.7)',
															fontSize: '0.85rem',
															fontWeight: '400'
														}}>
															Descansa:
														</span>
														<span style={{ 
															color: '#ffc107',
															fontWeight: '600',
															fontSize: '0.9rem'
														}}>
															{equiposDescansando.map(e => e.nombre).join(', ')}
														</span>
													</span>
												</div>
											)
										}
										return null
									})()}
								</div>
								<div className="d-flex align-items-center gap-2">
									<Badge 
										className="px-3 py-2 fw-semibold"
										style={{ background: '#4a4a4a', color: '#ffffff', border: 'none' }}
									>
										{lista.length} partidos
									</Badge>
									<Badge 
										className="px-3 py-2 fw-semibold"
										style={{ background: '#666666', color: '#ffffff', border: 'none' }}
									>
										{lista.filter(e => e.estado === 'finalizado').length} finalizados
									</Badge>
								</div>
							</CardHeader>
							<CardBody className="p-0" style={{ background: 'transparent' }}>
								{/* Vista de tabla para desktop */}
								<div className="table-responsive d-none d-md-block">
									<Table className="table-fifa mb-0">
										<thead>
											<tr style={{
												background: 'linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 100%)',
												color: '#ffffff',
												borderBottom: 'none',
												fontWeight: 'bold'
											}}>
												<th className="fw-bold py-2" style={{ width: '220px', fontSize: '1rem', color: '#ffffff' }}>Fecha</th>
												<th className="fw-bold py-2 text-end" style={{ width: '280px', fontSize: '1rem', color: '#ffffff' }}>Local</th>
												<th className="text-center fw-bold py-2" style={{ width: '80px', fontSize: '1rem', color: '#ffffff' }}>vs</th>
												<th className="fw-bold py-2" style={{ width: '280px', fontSize: '1rem', color: '#ffffff' }}>Visitante</th>
												<th className="fw-bold py-2" style={{ width: '220px', fontSize: '1rem', color: '#ffffff' }}>Cancha</th>
												<th className="fw-bold py-2" style={{ width: '160px', fontSize: '1rem', color: '#ffffff' }}>Estado</th>
											</tr>
										</thead>
										<tbody>
											{(() => {
												const listaOrdenada = [...lista].sort(sortEncuentros)
												return listaOrdenada.map((encuentro, index) => {
													// Detectar si la fecha cambia respecto al encuentro anterior
													const fechaActual = encuentro.fecha_programada 
														? new Date(encuentro.fecha_programada).toISOString().split('T')[0]
														: null
													const fechaProgAnterior = index > 0 ? listaOrdenada[index - 1]?.fecha_programada : null
													const fechaAnterior = fechaProgAnterior != null && fechaProgAnterior
														? new Date(fechaProgAnterior).toISOString().split('T')[0]
														: null
													const esNuevaFecha = fechaActual && fechaActual !== fechaAnterior
													
													return (
													<tr 
														key={encuentro.id}
														className="animate-slide-in-up"
														style={{
															animationDelay: `${index * 0.05}s`,
															background: 'rgba(255, 255, 255, 0.02)',
															borderTop: esNuevaFecha ? '2px solid rgba(255, 255, 255, 0.3)' : 'none',
															borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
															transition: 'background 0.3s ease'
														}}
														onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)' }}
														onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)' }}
													>
														<td className="align-middle py-2">
															<div className="d-flex align-items-center gap-2 text-white">
																<LuClock className="text-white-50" />
																<div className="d-flex flex-column">
																	<span 
																		className="fw-semibold"
																		style={{ color: getFechaColor(encuentro.fecha_programada) }}
																	>
																		{formatFechaConDia(encuentro.fecha_programada)}
																	</span>
																	{(formatHora(encuentro.fecha_programada, encuentro.horario?.hora_inicio)) && (
																		<small className="text-white-50">
																			{formatHora(encuentro.fecha_programada, encuentro.horario?.hora_inicio)} hs
																		</small>
																	)}
																</div>
															</div>
														</td>
														<td className="align-middle py-2 text-end pe-3">
															<span className="fw-bold text-white">{encuentro.equipoLocal?.nombre || '-'}</span>
														</td>
														<td className="align-middle py-2 px-0" style={{ width: 80 }}>
															<div className="d-flex justify-content-center">
																<span 
																	className="fw-bold"
																	style={{ 
																		background: '#ffc107',
																		color: '#1a1a1a',
																		borderRadius: '9999px',
																		padding: '4px 10px',
																		display: 'inline-block',
																		minWidth: '44px',
																		textAlign: 'center'
																	}}
																>
																	vs
																</span>
															</div>
														</td>
														<td className="align-middle py-2 text-start ps-3">
															<span className="fw-bold text-white">{encuentro.equipoVisitante?.nombre || '-'}</span>
														</td>
														<td className="align-middle py-2">
															<div className="d-flex align-items-center gap-2 text-white">
																<LuMapPin className="text-white-50" />
																{(() => {
																	const canchaNombre = getCanchaName(encuentro.cancha) || 'Sin asignar'
																	const color = canchaNombre === 'Sin asignar' ? '#adb5bd' : getCanchaColor(canchaNombre)
																	return (
																		<span className="fw-semibold" style={{ color }}>{canchaNombre}</span>
																	)
																})()}
															</div>
														</td>
														<td className="align-middle py-2">
															<Badge 
																className="px-3 py-2 fw-semibold"
																style={{
																	background: getEstadoColors(encuentro.estado).bg,
																	color: '#ffffff',
																	border: 'none',
																	boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
																}}
															>
																{encuentro.estado || 'programado'}
															</Badge>
														</td>
													</tr>
													)
												})
											})()}
										</tbody>
									</Table>
								</div>
								
								{/* Vista de tarjetas para móvil */}
								<div className="d-md-none p-2">
									{(() => {
										const listaOrdenada = [...lista].sort(sortEncuentros)
										return listaOrdenada.map((encuentro, index) => {
											const fechaActual = encuentro.fecha_programada 
												? new Date(encuentro.fecha_programada).toISOString().split('T')[0]
												: null
											const fechaProgAnterior = index > 0 ? listaOrdenada[index - 1]?.fecha_programada : null
											const fechaAnterior = fechaProgAnterior != null && fechaProgAnterior
												? new Date(fechaProgAnterior).toISOString().split('T')[0]
												: null
											const esNuevaFecha = fechaActual && fechaActual !== fechaAnterior
											const canchaNombre = getCanchaName(encuentro.cancha) || 'Sin asignar'
											const canchaColor = canchaNombre === 'Sin asignar' ? '#adb5bd' : getCanchaColor(canchaNombre)
											
											return (
												<div
													key={encuentro.id}
													className="mb-2 p-3 rounded"
													style={{
														background: 'rgba(255, 255, 255, 0.02)',
														borderTop: esNuevaFecha ? '2px solid rgba(255, 255, 255, 0.3)' : 'none',
														borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
														animationDelay: `${index * 0.05}s`
													}}
												>
													{/* Fecha y hora */}
													<div className="d-flex align-items-center gap-2 mb-2">
														<LuClock className="text-white-50" style={{ fontSize: '1rem' }} />
														<div className="d-flex flex-column">
															<span 
																className="fw-semibold"
																style={{ 
																	color: getFechaColor(encuentro.fecha_programada),
																	fontSize: '0.9rem'
																}}
															>
																{formatFechaConDia(encuentro.fecha_programada)}
															</span>
															{(formatHora(encuentro.fecha_programada, encuentro.horario?.hora_inicio)) && (
																<small className="text-white-50" style={{ fontSize: '0.75rem' }}>
																	{formatHora(encuentro.fecha_programada, encuentro.horario?.hora_inicio)} hs
																</small>
															)}
														</div>
													</div>
													
													{/* Equipos */}
													<div className="d-flex align-items-center justify-content-between mb-2">
														<div className="flex-grow-1 text-end pe-2">
															<span className="fw-bold text-white" style={{ fontSize: '0.95rem' }}>
																{encuentro.equipoLocal?.nombre || '-'}
															</span>
														</div>
														<span 
															className="fw-bold"
															style={{ 
																background: '#ffc107',
																color: '#1a1a1a',
																borderRadius: '9999px',
																padding: '4px 8px',
																fontSize: '0.75rem',
																minWidth: '36px',
																textAlign: 'center',
																flexShrink: 0
															}}
														>
															vs
														</span>
														<div className="flex-grow-1 text-start ps-2">
															<span className="fw-bold text-white" style={{ fontSize: '0.95rem' }}>
																{encuentro.equipoVisitante?.nombre || '-'}
															</span>
														</div>
													</div>
													
													{/* Cancha y Estado */}
													<div className="d-flex align-items-center justify-content-between">
														<div className="d-flex align-items-center gap-2">
															<LuMapPin className="text-white-50" style={{ fontSize: '0.9rem' }} />
															<span className="fw-semibold" style={{ color: canchaColor, fontSize: '0.85rem' }}>
																{canchaNombre}
															</span>
														</div>
														<Badge 
															className="px-2 py-1 fw-semibold"
															style={{
																background: getEstadoColors(encuentro.estado).bg,
																color: '#ffffff',
																border: 'none',
																fontSize: '0.75rem'
															}}
														>
															{encuentro.estado || 'programado'}
														</Badge>
													</div>
												</div>
											)
										})
									})()}
								</div>
							</CardBody>
						</Card>
					</Col>
				))}
			</Row>
		</div>
	)
}


