'use client'
import Link from 'next/link'
import { useParams, usePathname } from 'next/navigation'
import { Nav } from 'react-bootstrap'
import { LuTrophy, LuUserPlus, LuCalendarDays } from 'react-icons/lu'

interface TabsProps {
	active?: 'posiciones' | 'goleadores' | 'fixture'
}

export default function EstadisticasTabs({ active }: TabsProps) {
	const params = useParams()
	const pathname = usePathname()
	const torneoId = params?.id as string

	const isActive = (key: 'posiciones' | 'goleadores' | 'fixture') => {
		if (active) return active === key
		return pathname.includes(`/estadisticas/${torneoId}/${key === 'posiciones' ? 'tabla-posiciones' : key === 'goleadores' ? 'goleadores' : 'fixture-por-categoria'}`)
	}

	return (
		<Nav variant="tabs" className="mb-3">
			<Nav.Item>
				<Nav.Link as={Link} href={`/admin/apps/estadisticas/${torneoId}/tabla-posiciones`} active={isActive('posiciones')}>
					<LuTrophy className="me-2" />
					Tabla de posiciones
				</Nav.Link>
			</Nav.Item>
			<Nav.Item>
				<Nav.Link as={Link} href={`/admin/apps/estadisticas/${torneoId}/goleadores`} active={isActive('goleadores')}>
					<LuUserPlus className="me-2" />
					Goleadores
				</Nav.Link>
			</Nav.Item>
			<Nav.Item>
				<Nav.Link as={Link} href={`/admin/apps/estadisticas/${torneoId}/fixture-por-categoria`} active={isActive('fixture')}>
					<LuCalendarDays className="me-2" />
					Fixture por categoría
				</Nav.Link>
			</Nav.Item>
		</Nav>
	)
}


