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

export default function TablaFixture({ encuentros }: { encuentros: Encuentro[] }) {
	const formatFechaConDia = (iso?: string | null) => {
		if (!iso) return 'Sin fecha'
		const d = new Date(iso)
		const diaSemana = d.toLocaleDateString('es-ES', { weekday: 'long' })
		const fecha = d.toLocaleDateString('es-ES')
		const diaCapitalizado = diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1)
		return `${diaCapitalizado} ${fecha}`
	}
	const formatHora = (iso?: string | null, horarioInicio?: string | null) => {
		if (iso) {
			const d = new Date(iso)
			return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
		}
		if (horarioInicio && /^\d{2}:\d{2}/.test(horarioInicio)) {
			return horarioInicio.slice(0,5)
		}
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
	const encuentrosPorJornada = useMemo(() => {
		const grupos: Record<number, Encuentro[]> = {}
		for (const e of encuentros) {
			const j = e.jornada || 0
			if (!grupos[j]) grupos[j] = []
			grupos[j].push(e)
		}
		return Object.entries(grupos)
			.map(([j, lista]) => [parseInt(j), lista] as [number, Encuentro[]])
			.sort((a, b) => a[0] - b[0])
	}, [encuentros])

	const getSortValue = (e: Encuentro) => {
		// 1) Si hay fecha con hora, usarla
		if (e.fecha_programada) {
			const ts = new Date(e.fecha_programada).getTime()
			if (!isNaN(ts)) return ts
		}
		// 2) Si no hay hora en fecha, intentar con horario.hora_inicio (HH:MM)
		if (e.horario?.hora_inicio && /^\d{2}:\d{2}/.test(e.horario.hora_inicio)) {
			const [hh, mm] = e.horario.hora_inicio.split(':').map(Number)
			return hh * 60 + mm // minutos del día, suficiente para ordenar dentro de la jornada
		}
		// 3) Último recurso: 0
		return 0
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
								<h5 className="mb-0 fw-bold">Jornada {jornada}</h5>
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
								<div className="table-responsive">
									<Table className="table-fifa mb-0">
										<thead>
											<tr style={{
												background: 'linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 100%)',
												color: '#ffffff',
												borderBottom: 'none',
												fontWeight: 'bold'
											}}>
												<th className="fw-bold py-2" style={{ width: '220px', fontSize: '1rem', color: '#ffffff' }}>Fecha</th>
												<th className="fw-bold py-2" style={{ width: '280px', fontSize: '1rem', color: '#ffffff' }}>Local</th>
												<th className="text-center fw-bold py-2" style={{ width: '80px', fontSize: '1rem', color: '#ffffff' }}>vs</th>
												<th className="fw-bold py-2" style={{ width: '280px', fontSize: '1rem', color: '#ffffff' }}>Visitante</th>
												<th className="fw-bold py-2" style={{ width: '220px', fontSize: '1rem', color: '#ffffff' }}>Cancha</th>
												<th className="fw-bold py-2" style={{ width: '160px', fontSize: '1rem', color: '#ffffff' }}>Estado</th>
											</tr>
										</thead>
										<tbody>
											{lista
												.sort((a, b) => getSortValue(a) - getSortValue(b))
												.map((encuentro, index) => (
													<tr 
														key={encuentro.id}
														className="animate-slide-in-up"
														style={{
															animationDelay: `${index * 0.05}s`,
															background: 'rgba(255, 255, 255, 0.02)',
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
																	<span>{formatFechaConDia(encuentro.fecha_programada)}</span>
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
												))}
										</tbody>
									</Table>
								</div>
							</CardBody>
						</Card>
					</Col>
				))}
			</Row>
		</div>
	)
}


