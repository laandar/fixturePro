'use server'
import { NextResponse } from 'next/server'
import { encuentroQueries, torneoQueries } from '@/db/queries'
import { revalidatePath } from 'next/cache'
import { getDateOnlyString } from '@/helpers/date'

export async function POST(request: Request) {
	try {
		const body = await request.json()
		const {
			torneoId,
			equipoLocalId,
			equipoVisitanteId,
			fechaProgramada, // ISO string opcional
			cancha,          // string opcional
			horarioId,       // number opcional
			jornada          // number opcional
		} = body || {}

		if (!torneoId || !equipoLocalId || !equipoVisitanteId) {
			return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 })
		}
		if (equipoLocalId === equipoVisitanteId) {
			return NextResponse.json({ error: 'Los equipos no pueden ser iguales' }, { status: 400 })
		}

		// Obtener información del torneo para verificar si permite revancha
		const torneo = await torneoQueries.getById(Number(torneoId))
		if (!torneo) {
			return NextResponse.json({ error: 'Torneo no encontrado' }, { status: 404 })
		}

		// Verificar si ya existe un encuentro entre estos equipos en este torneo
		const encuentrosExistentes = await encuentroQueries.getByTorneoId(Number(torneoId))
		
		// Si el torneo permite revancha, solo bloquear si existe un encuentro con exactamente los mismos equipos en las mismas posiciones
		// Si no permite revancha, bloquear cualquier encuentro entre estos equipos
		const encuentroDuplicado = encuentrosExistentes.find(encuentro => {
			if (torneo.permite_revancha) {
				// Con revancha: solo bloquear si es exactamente el mismo emparejamiento (mismo local y mismo visitante)
				return encuentro.equipo_local_id === Number(equipoLocalId) && 
				       encuentro.equipo_visitante_id === Number(equipoVisitanteId)
			} else {
				// Sin revancha: bloquear cualquier encuentro entre estos equipos
				return (encuentro.equipo_local_id === Number(equipoLocalId) && encuentro.equipo_visitante_id === Number(equipoVisitanteId)) ||
				       (encuentro.equipo_local_id === Number(equipoVisitanteId) && encuentro.equipo_visitante_id === Number(equipoLocalId))
			}
		})

		if (encuentroDuplicado) {
			return NextResponse.json({ error: 'Ya existe un encuentro entre estos equipos en este torneo' }, { status: 409 })
		}

		const nuevo = await encuentroQueries.create({
			torneo_id: Number(torneoId),
			equipo_local_id: Number(equipoLocalId),
			equipo_visitante_id: Number(equipoVisitanteId),
			fecha_programada: fechaProgramada ? getDateOnlyString(fechaProgramada) : null,
			horario_id: horarioId ? Number(horarioId) : null,
			cancha: cancha ?? null,
			jornada: jornada ? Number(jornada) : null,
			estado: 'programado'
		} as any)

		// Revalidar posibles vistas
		revalidatePath(`/admin/apps/estadisticas/${torneoId}/fixture-por-categoria`)

		return NextResponse.json({ ok: true, encuentro: nuevo })
	} catch (error: any) {
		console.error('Error creando encuentro manual:', error)
		return NextResponse.json({ error: error?.message || 'Error interno' }, { status: 500 })
	}
}


