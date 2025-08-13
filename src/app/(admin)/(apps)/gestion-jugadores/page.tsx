'use client'
import { useEffect, useState } from 'react'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import {
    Card,
    CardBody,
    CardHeader,
    CardTitle,
    Col,
    Container,
    Nav,
    NavItem,
    NavLink,
    Row,
    TabContainer,
    TabContent,
    TabPane,
    Form,
    FormControl,
    FormSelect,
    Button,
    Table,
    Badge,
    Alert,
    Modal,
    ModalHeader,
    ModalTitle,
    ModalBody,
    ModalFooter,
    FloatingLabel,
    Dropdown,
    DropdownToggle,
    DropdownMenu,
    DropdownItem
} from 'react-bootstrap'
import {
    TbUsers,
    TbExchange,
    TbCards,
    TbSignature,
    TbPlus,
    TbTrash,
    TbCheck,
    TbAlertTriangle,
    TbDots,
    TbBall,
    TbTarget,
    TbUserPlus
} from 'react-icons/tb'
import { getJugadores, getEquipos, getCategorias } from '../jugadores/actions'
import type { JugadorWithEquipo, Equipo, Categoria } from '@/db/types'

// Tipos para las diferentes funcionalidades
type PlayerChange = {
    id: string
    equipoA: string
    jugadorSale: string
    jugadorEntra: string
    minuto: number
    tiempo: 'primer' | 'segundo'
}

type Card = {
    id: string
    jugador: string
    equipo: string
    tipo: 'amarilla' | 'roja'
    minuto: number
    tiempo: 'primer' | 'segundo'
    motivo: string
}

type Goal = {
    id: string
    jugador: string
    equipo: string
    minuto: number
    tiempo: 'primer' | 'segundo'
    tipo: 'gol' | 'penal' | 'autogol'
}

type Signature = {
    vocal: string
    arbitro: string
    capitanA: string
    capitanB: string
    fechaFirma: string
}

const GestionJugadores = () => {
    // Estados generales
    const [jugadores, setJugadores] = useState<JugadorWithEquipo[]>([])
    const [equipos, setEquipos] = useState<Equipo[]>([])
    const [categorias, setCategorias] = useState<Categoria[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    //const [success, setSuccess] = useState<string | null>(null)

    // Estados para jugadores por equipo
    const [jugadoresEquipoA, setJugadoresEquipoA] = useState<JugadorWithEquipo[]>([])
    const [jugadoresEquipoB, setJugadoresEquipoB] = useState<JugadorWithEquipo[]>([])
    
    // Estados para selección de jugadores participantes
    const [jugadoresParticipantesA, setJugadoresParticipantesA] = useState<JugadorWithEquipo[]>([])
    const [jugadoresParticipantesB, setJugadoresParticipantesB] = useState<JugadorWithEquipo[]>([])
    const [showSelectionModalA, setShowSelectionModalA] = useState(false)
    const [showSelectionModalB, setShowSelectionModalB] = useState(false)

    // Estados para cambios de jugadores
    const [cambios, setCambios] = useState<PlayerChange[]>([])
    const [showCambioModal, setShowCambioModal] = useState(false)
    const [nuevoCambio, setNuevoCambio] = useState<Partial<PlayerChange>>({})

    // Estados para tarjetas
    const [tarjetas, setTarjetas] = useState<Card[]>([])
    const [showTarjetaModal, setShowTarjetaModal] = useState(false)
    const [nuevaTarjeta, setNuevaTarjeta] = useState<Partial<Card>>({})

    // Estados para goles
    const [goles, setGoles] = useState<Goal[]>([])
    const [showGolModal, setShowGolModal] = useState(false)
    const [nuevoGol, setNuevoGol] = useState<Partial<Goal>>({})

    // Estados para firmas
    const [firmas, setFirmas] = useState<Signature>({
        vocal: '',
        arbitro: '',
        capitanA: '',
        capitanB: '',
        fechaFirma: new Date().toISOString().split('T')[0]
    })

    // Cargar datos iniciales
    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        try {
            setLoading(true)
            const [jugadoresData, equiposData, categoriasData] = await Promise.all([
                getJugadores(),
                getEquipos(),
                getCategorias()
            ])

            setJugadores(jugadoresData)
            setEquipos(equiposData)
            setCategorias(categoriasData)
        } catch (err) {
            setError('Error al cargar los datos')
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    // Filtrar jugadores por equipos predefinidos (disponibles para selección)
    useEffect(() => {
        // Filtrar jugadores del equipo "UDEF" para Equipo A
        const jugadoresA = jugadores.filter(j => j.equipo?.nombre === 'UDEF')
        setJugadoresEquipoA(jugadoresA)

        // Filtrar jugadores del equipo "9 Octubre" para Equipo B
        const jugadoresB = jugadores.filter(j => j.equipo?.nombre === '9 Octubre')
        setJugadoresEquipoB(jugadoresB)
    }, [jugadores])

    // Funciones para manejo de selección de jugadores
    const handleTogglePlayerSelection = (jugador: JugadorWithEquipo, equipo: 'A' | 'B') => {
        if (equipo === 'A') {
            const isSelected = jugadoresParticipantesA.some(j => j.id === jugador.id)
            if (isSelected) {
                setJugadoresParticipantesA(jugadoresParticipantesA.filter(j => j.id !== jugador.id))
            } else {
                setJugadoresParticipantesA([...jugadoresParticipantesA, jugador])
            }
        } else {
            const isSelected = jugadoresParticipantesB.some(j => j.id === jugador.id)
            if (isSelected) {
                setJugadoresParticipantesB(jugadoresParticipantesB.filter(j => j.id !== jugador.id))
            } else {
                setJugadoresParticipantesB([...jugadoresParticipantesB, jugador])
            }
        }
    }

    const handleSelectAllPlayers = (equipo: 'A' | 'B') => {
        if (equipo === 'A') {
            setJugadoresParticipantesA([...jugadoresEquipoA])
        } else {
            setJugadoresParticipantesB([...jugadoresEquipoB])
        }
    }

    const handleClearAllPlayers = (equipo: 'A' | 'B') => {
        if (equipo === 'A') {
            setJugadoresParticipantesA([])
        } else {
            setJugadoresParticipantesB([])
        }
    }

    // Funciones para cambios
    const handleAddCambio = () => {
        if (nuevoCambio.equipoA && nuevoCambio.jugadorSale && nuevoCambio.jugadorEntra && nuevoCambio.minuto) {
            const cambio: PlayerChange = {
                id: Date.now().toString(),
                equipoA: nuevoCambio.equipoA,
                jugadorSale: nuevoCambio.jugadorSale,
                jugadorEntra: nuevoCambio.jugadorEntra,
                minuto: nuevoCambio.minuto,
                tiempo: nuevoCambio.tiempo || 'primer'
            }
            setCambios([...cambios, cambio])
            setNuevoCambio({})
            setShowCambioModal(false)
            //setSuccess('Cambio agregado exitosamente')
        }
    }

    const handleDeleteCambio = (id: string) => {
        setCambios(cambios.filter(c => c.id !== id))
        //setSuccess('Cambio eliminado exitosamente')
    }

    // Funciones para tarjetas
    const handleAddTarjeta = () => {
        if (nuevaTarjeta.jugador && nuevaTarjeta.tipo && nuevaTarjeta.minuto && nuevaTarjeta.motivo) {
            const tarjeta: Card = {
                id: Date.now().toString(),
                jugador: nuevaTarjeta.jugador,
                equipo: nuevaTarjeta.equipo || '',
                tipo: nuevaTarjeta.tipo,
                minuto: nuevaTarjeta.minuto,
                tiempo: nuevaTarjeta.tiempo || 'primer',
                motivo: nuevaTarjeta.motivo
            }
            setTarjetas([...tarjetas, tarjeta])
            setNuevaTarjeta({})
            setShowTarjetaModal(false)
            //setSuccess('Tarjeta agregada exitosamente')
        }
    }

    const handleDeleteTarjeta = (id: string) => {
        setTarjetas(tarjetas.filter(t => t.id !== id))
        //setSuccess('Tarjeta eliminada exitosamente')
    }

    // Función para sancionar jugador rápidamente
    const handleQuickSanction = (jugador: JugadorWithEquipo, tipo: 'amarilla' | 'roja') => {
        const tarjeta: Card = {
            id: Date.now().toString(),
            jugador: jugador.id.toString(),
            equipo: jugador.equipo?.id.toString() || '',
            tipo: tipo,
            minuto: 45, // Minuto por defecto, se puede editar después
            tiempo: 'primer', // Tiempo por defecto
            motivo: tipo === 'amarilla' ? 'Conducta antideportiva' : 'Falta violenta'
        }
        setTarjetas([...tarjetas, tarjeta])
        //setSuccess(`Tarjeta ${tipo} agregada a ${jugador.apellido_nombre}`)
    }

    // Funciones para goles
    const handleAddGol = () => {
        if (nuevoGol.jugador && nuevoGol.tipo && nuevoGol.minuto) {
            const gol: Goal = {
                id: Date.now().toString(),
                jugador: nuevoGol.jugador,
                equipo: nuevoGol.equipo || '',
                tipo: nuevoGol.tipo,
                minuto: nuevoGol.minuto,
                tiempo: nuevoGol.tiempo || 'primer'
            }
            setGoles([...goles, gol])
            setNuevoGol({})
            setShowGolModal(false)
            //setSuccess('Gol agregado exitosamente')
        }
    }

    const handleDeleteGol = (id: string) => {
        setGoles(goles.filter(g => g.id !== id))
        //setSuccess('Gol eliminado exitosamente')
    }

    // Función para agregar gol rápidamente
    const handleQuickGoal = (jugador: JugadorWithEquipo, tipo: 'gol' | 'penal' = 'gol') => {
        const gol: Goal = {
            id: Date.now().toString(),
            jugador: jugador.id.toString(),
            equipo: jugador.equipo?.id.toString() || '',
            tipo: tipo,
            minuto: 45, // Minuto por defecto, se puede editar después
            tiempo: 'primer' // Tiempo por defecto
        }
        setGoles([...goles, gol])
        //setSuccess(`${tipo === 'gol' ? 'Gol' : 'Penal'} agregado a ${jugador.apellido_nombre}`)
    }

    if (loading) {
        return (
            <Container fluid>
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
                <PageBreadcrumb title="Gestión de Jugadores" subtitle="Partidos" />

                {error && (
                    <Alert variant="danger" dismissible onClose={() => setError(null)}>
                        {error}
                    </Alert>
                )}

               

                <Container fluid className="padding: initial">
                    <Row>
                        <Col xs={12}>
                            <TabContainer defaultActiveKey="jugadores">
                                <Card>
                                    <CardHeader className="card-tabs d-flex align-items-center">
                                        <div className="flex-grow-1">
                                            <CardTitle as={'h4'}>Gestión de Partido</CardTitle>
                                        </div>
                                        <Nav className="nav-tabs nav-justified card-header-tabs nav-bordered">
                                            <NavItem>
                                                <NavLink eventKey="jugadores">
                                                    <TbUsers className="d-md-none d-block" />
                                                    <span className="d-none d-md-block">Jugadores</span>
                                                </NavLink>
                                            </NavItem>
                                            <NavItem>
                                                <NavLink eventKey="cambios">
                                                    <TbExchange className="d-md-none d-block" />
                                                    <span className="d-none d-md-block">Cambios</span>
                                                </NavLink>
                                            </NavItem>
                                            <NavItem>
                                                <NavLink eventKey="amonestaciones">
                                                    <TbCards className="d-md-none d-block" />
                                                    <span className="d-none d-md-block">Amonestaciones</span>
                                                </NavLink>
                                            </NavItem>
                                            <NavItem>
                                                <NavLink eventKey="firmas">
                                                    <TbSignature className="d-md-none d-block" />
                                                    <span className="d-none d-md-block">Firmas</span>
                                                </NavLink>
                                            </NavItem>
                                        </Nav>
                                    </CardHeader>
                                    <CardBody>
                                        <TabContent>

                                            {/* TAB 1: JUGADORES */}
                                            <TabPane eventKey="jugadores">
                                                <Row>
                                                    <Col md={6}>
                                                        <div className="mb-4">
                                                            <div className="d-flex align-items-center justify-content-between mb-3">
                                                                <h5 className="d-flex align-items-center mb-0">
                                                                    <TbUsers className="me-2" />
                                                                    UDEF
                                                                    <Badge bg="secondary" className="ms-2">
                                                                        {jugadoresParticipantesA.length}/{jugadoresEquipoA.length}
                                                                    </Badge>
                                                                </h5>
                                                                <div className="d-flex align-items-center gap-2">
                                                                    <Button
                                                                        variant="outline-secondary"
                                                                        size="sm"
                                                                        onClick={() => setShowSelectionModalA(true)}
                                                                        title="Editar jugadores seleccionados"
                                                                    >
                                                                        <TbUsers className="me-1" />
                                                                        Editar
                                                                    </Button>
                                                                    <span className="badge rounded-pill" style={{
                                                                        background: 'linear-gradient(45deg, #28a745, #20c997)',
                                                                        fontSize: '1.1em',
                                                                        padding: '8px 15px',
                                                                        boxShadow: '0 4px 8px rgba(40, 167, 69, 0.3)',
                                                                        border: '2px solid #fff',
                                                                        animation: goles.filter(g => {
                                                                            const jugador = jugadoresParticipantesA.find(j => j.id.toString() === g.jugador)
                                                                            return jugador && g.tipo !== 'autogol'
                                                                        }).length > 0 ? 'pulse 2s infinite' : 'none'
                                                                    }}>
                                                                        <span style={{ fontSize: '1.2em', marginRight: '5px' }}>⚽</span>
                                                                        <strong>{goles.filter(g => {
                                                                            const jugador = jugadoresParticipantesA.find(j => j.id.toString() === g.jugador)
                                                                            return jugador && g.tipo !== 'autogol'
                                                                        }).length}</strong>
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            {jugadoresParticipantesA.length > 0 ? (
                                                                <div className="d-grid gap-2">
                                                                    {jugadoresParticipantesA.map(jugador => (
                                                                        <div key={jugador.id} className="d-flex align-items-start p-2 border rounded">
                                                                            <div className="me-3">
                                                                                {jugador.foto ? (
                                                                                    <img
                                                                                        src={jugador.foto}
                                                                                        alt={jugador.apellido_nombre}
                                                                                        className="rounded-circle"
                                                                                        style={{ width: '40px', height: '40px', objectFit: 'cover' }}
                                                                                    />
                                                                                ) : (
                                                                                    <div
                                                                                        className="rounded-circle bg-light d-flex align-items-center justify-content-center"
                                                                                        style={{ width: '40px', height: '40px' }}
                                                                                    >
                                                                                        <TbUsers className="text-muted" />
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                            <div className="flex-grow-1">
                                                                                <div className="fw-semibold">{jugador.apellido_nombre}</div>
                                                                                <small className="text-muted">{jugador.cedula}</small>
                                                                            </div>
                                                                            <div className="d-flex flex-column gap-1">
                                                                                {/* Mostrar tarjetas y goles existentes */}
                                                                                <div className="d-flex flex-wrap gap-1 mb-1">
                                                                                    {/* Mostrar tarjetas */}
                                                                                    {tarjetas
                                                                                        .filter(t => t.jugador === jugador.id.toString())
                                                                                        .map(tarjeta => (
                                                                                            <Badge
                                                                                                key={tarjeta.id}
                                                                                                bg={tarjeta.tipo === 'amarilla' ? 'warning' : 'danger'}
                                                                                                style={{ fontSize: '0.6em' }}
                                                                                            >
                                                                                                {tarjeta.tipo === 'amarilla' ? '🟨' : '🟥'} {tarjeta.minuto}'
                                                                                            </Badge>
                                                                                        ))}
                                                                                    {/* AGREGAR ESTA SECCIÓN PARA MOSTRAR GOLES */}
                                                                                    {goles
                                                                                        .filter(g => g.jugador === jugador.id.toString())
                                                                                        .map(gol => (
                                                                                            <Badge
                                                                                                key={gol.id}
                                                                                                bg={gol.tipo === 'autogol' ? 'secondary' : 'success'}
                                                                                                style={{ fontSize: '0.6em' }}
                                                                                            >
                                                                                                {gol.tipo === 'gol' ? '⚽' : gol.tipo === 'penal' ? '🥅' : '⚽💔'} {gol.minuto}'
                                                                                            </Badge>
                                                                                        ))}
                                                                                </div>
                                                                                {/* Menú contextual de sanción rápida */}
                                                                                <Dropdown>
                                                                                    <DropdownToggle
                                                                                        variant="outline-secondary"
                                                                                        size="sm"
                                                                                        style={{ padding: '2px 6px', fontSize: '0.8em' }}
                                                                                        title="Opciones de sanción"
                                                                                    >
                                                                                        <TbDots />
                                                                                    </DropdownToggle>
                                                                                    <DropdownMenu>
                                                                                        <DropdownItem
                                                                                            onClick={() => handleQuickSanction(jugador, 'amarilla')}
                                                                                            className="d-flex align-items-center"
                                                                                        >
                                                                                            <span className="me-2">🟨</span>
                                                                                            Tarjeta Amarilla
                                                                                        </DropdownItem>
                                                                                        <DropdownItem
                                                                                            onClick={() => handleQuickSanction(jugador, 'roja')}
                                                                                            className="d-flex align-items-center"
                                                                                        >
                                                                                            <span className="me-2">🟥</span>
                                                                                            Tarjeta Roja
                                                                                        </DropdownItem>
                                                                                        {/* AGREGAR ESTAS NUEVAS OPCIONES */}
                                                                                        <Dropdown.Divider />
                                                                                        <DropdownItem
                                                                                            onClick={() => handleQuickGoal(jugador, 'gol')}
                                                                                            className="d-flex align-items-center"
                                                                                        >
                                                                                            <span className="me-2">⚽</span>
                                                                                            Gol
                                                                                        </DropdownItem>

                                                                                    </DropdownMenu>
                                                                                </Dropdown>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <div className="text-center text-muted py-5">
                                                                    <TbUserPlus size={48} className="mb-3" />
                                                                    <p>No hay jugadores seleccionados para UDEF</p>
                                                                    <Button
                                                                        variant="primary"
                                                                        onClick={() => setShowSelectionModalA(true)}
                                                                    >
                                                                        Seleccionar Jugadores
                                                                    </Button>
                                                                </div>
                                                            )}












                                                        </div>
                                                    </Col>

                                                    <Col md={6}>
                                                        <div className="mb-4">
                                                            <div className="d-flex align-items-center justify-content-between mb-3">
                                                                <h5 className="d-flex align-items-center mb-0">
                                                                    <TbUsers className="me-2" />
                                                                    9 Octubre
                                                                    <Badge bg="secondary" className="ms-2">
                                                                        {jugadoresParticipantesB.length}/{jugadoresEquipoB.length}
                                                                    </Badge>
                                                                </h5>
                                                                <div className="d-flex align-items-center gap-2">
                                                                    <Button
                                                                        variant="outline-secondary"
                                                                        size="sm"
                                                                        onClick={() => setShowSelectionModalB(true)}
                                                                        title="Editar jugadores seleccionados"
                                                                    >
                                                                        <TbUsers className="me-1" />
                                                                        Editar
                                                                    </Button>
                                                                    <span className="badge rounded-pill" style={{
                                                                        background: 'linear-gradient(45deg, #dc3545, #fd7e14)',
                                                                        fontSize: '1.1em',
                                                                        padding: '8px 15px',
                                                                        boxShadow: '0 4px 8px rgba(220, 53, 69, 0.3)',
                                                                        border: '2px solid #fff',
                                                                        animation: goles.filter(g => {
                                                                            const jugador = jugadoresParticipantesB.find(j => j.id.toString() === g.jugador)
                                                                            return jugador && g.tipo !== 'autogol'
                                                                        }).length > 0 ? 'pulse 2s infinite' : 'none'
                                                                    }}>
                                                                        <span style={{ fontSize: '1.2em', marginRight: '5px' }}>⚽</span>
                                                                        <strong>{goles.filter(g => {
                                                                            const jugador = jugadoresParticipantesB.find(j => j.id.toString() === g.jugador)
                                                                            return jugador && g.tipo !== 'autogol'
                                                                        }).length}</strong>
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            {jugadoresParticipantesB.length > 0 ? (
                                                                <div className="d-grid gap-2">
                                                                    {jugadoresParticipantesB.map(jugador => (
                                                                        <div key={jugador.id} className="d-flex align-items-start p-2 border rounded">
                                                                            <div className="me-3">
                                                                                {jugador.foto ? (
                                                                                    <img
                                                                                        src={jugador.foto}
                                                                                        alt={jugador.apellido_nombre}
                                                                                        className="rounded-circle"
                                                                                        style={{ width: '40px', height: '40px', objectFit: 'cover' }}
                                                                                    />
                                                                                ) : (
                                                                                    <div
                                                                                        className="rounded-circle bg-light d-flex align-items-center justify-content-center"
                                                                                        style={{ width: '40px', height: '40px' }}
                                                                                    >
                                                                                        <TbUsers className="text-muted" />
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                            <div className="flex-grow-1">
                                                                                <div className="fw-semibold">{jugador.apellido_nombre}</div>
                                                                                <small className="text-muted">{jugador.cedula}</small>
                                                                            </div>
                                                                            <div className="d-flex flex-column gap-1">
                                                                                {/* Mostrar tarjetas y goles existentes */}
                                                                                <div className="d-flex flex-wrap gap-1 mb-1">
                                                                                    {/* Mostrar tarjetas */}
                                                                                    {tarjetas
                                                                                        .filter(t => t.jugador === jugador.id.toString())
                                                                                        .map(tarjeta => (
                                                                                            <Badge
                                                                                                key={tarjeta.id}
                                                                                                bg={tarjeta.tipo === 'amarilla' ? 'warning' : 'danger'}
                                                                                                style={{ fontSize: '0.6em' }}
                                                                                            >
                                                                                                {tarjeta.tipo === 'amarilla' ? '🟨' : '🟥'} {tarjeta.minuto}'
                                                                                            </Badge>
                                                                                        ))}
                                                                                    {/* AGREGAR ESTA SECCIÓN PARA MOSTRAR GOLES */}
                                                                                    {goles
                                                                                        .filter(g => g.jugador === jugador.id.toString())
                                                                                        .map(gol => (
                                                                                            <Badge
                                                                                                key={gol.id}
                                                                                                bg={gol.tipo === 'autogol' ? 'secondary' : 'success'}
                                                                                                style={{ fontSize: '0.6em' }}
                                                                                            >
                                                                                                {gol.tipo === 'gol' ? '⚽' : gol.tipo === 'penal' ? '🥅' : '⚽💔'} {gol.minuto}'
                                                                                            </Badge>
                                                                                        ))}
                                                                                </div>
                                                                                {/* Menú contextual de sanción rápida */}
                                                                                <Dropdown>
                                                                                    <DropdownToggle
                                                                                        variant="outline-secondary"
                                                                                        size="sm"
                                                                                        style={{ padding: '2px 6px', fontSize: '0.8em' }}
                                                                                        title="Opciones de sanción"
                                                                                    >
                                                                                        <TbDots />
                                                                                    </DropdownToggle>
                                                                                    <DropdownMenu>
                                                                                        <DropdownItem
                                                                                            onClick={() => handleQuickSanction(jugador, 'amarilla')}
                                                                                            className="d-flex align-items-center"
                                                                                        >
                                                                                            <span className="me-2">🟨</span>
                                                                                            Tarjeta Amarilla
                                                                                        </DropdownItem>
                                                                                        <DropdownItem
                                                                                            onClick={() => handleQuickSanction(jugador, 'roja')}
                                                                                            className="d-flex align-items-center"
                                                                                        >
                                                                                            <span className="me-2">🟥</span>
                                                                                            Tarjeta Roja
                                                                                        </DropdownItem>
                                                                                        {/* AGREGAR ESTAS NUEVAS OPCIONES */}
                                                                                        <Dropdown.Divider />
                                                                                        <DropdownItem
                                                                                            onClick={() => handleQuickGoal(jugador, 'gol')}
                                                                                            className="d-flex align-items-center"
                                                                                        >
                                                                                            <span className="me-2">⚽</span>
                                                                                            Gol
                                                                                        </DropdownItem>

                                                                                    </DropdownMenu>
                                                                                </Dropdown>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <div className="text-center text-muted py-5">
                                                                    <TbUserPlus size={48} className="mb-3" />
                                                                    <p>No hay jugadores seleccionados para 9 Octubre</p>
                                                                    <Button
                                                                        variant="primary"
                                                                        onClick={() => setShowSelectionModalB(true)}
                                                                    >
                                                                        Seleccionar Jugadores
                                                                    </Button>
                                                                </div>
                                                            )}

                                                        </div>
                                                    </Col>
                                                </Row>
                                            </TabPane>

                                            {/* TAB 2: CAMBIOS */}
                                            <TabPane eventKey="cambios">
                                                <Card>
                                                    <CardHeader>
                                                        <div className="d-flex justify-content-between align-items-center">
                                                            <CardTitle className="d-flex align-items-center">
                                                                <TbExchange className="me-2" />
                                                                Cambios de Jugadores
                                                            </CardTitle>
                                                            <Button variant="primary" onClick={() => setShowCambioModal(true)}>
                                                                <TbPlus className="me-1" />
                                                                Agregar Cambio
                                                            </Button>
                                                        </div>
                                                    </CardHeader>
                                                    <CardBody>
                                                        {cambios.length > 0 ? (
                                                            <Table responsive striped>
                                                                <thead>
                                                                    <tr>
                                                                        <th>Equipo</th>
                                                                        <th>Sale</th>
                                                                        <th>Entra</th>
                                                                        <th>Minuto</th>
                                                                        <th>Tiempo</th>
                                                                        <th>Acciones</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {cambios.map(cambio => {
                                                                        const equipo = equipos.find(e => e.id === cambio.equipoA)
                                                                        const jugadorSale = jugadores.find(j => j.id === parseInt(cambio.jugadorSale))
                                                                        const jugadorEntra = jugadores.find(j => j.id === parseInt(cambio.jugadorEntra))

                                                                        return (
                                                                            <tr key={cambio.id}>
                                                                                <td>{equipo?.nombre}</td>
                                                                                <td>{jugadorSale?.apellido_nombre}</td>
                                                                                <td>{jugadorEntra?.apellido_nombre}</td>
                                                                                <td>{cambio.minuto}'</td>
                                                                                <td>
                                                                                    <Badge bg={cambio.tiempo === 'primer' ? 'primary' : 'secondary'}>
                                                                                        {cambio.tiempo === 'primer' ? '1er Tiempo' : '2do Tiempo'}
                                                                                    </Badge>
                                                                                </td>
                                                                                <td>
                                                                                    <Button
                                                                                        variant="outline-danger"
                                                                                        size="sm"
                                                                                        onClick={() => handleDeleteCambio(cambio.id)}
                                                                                    >
                                                                                        <TbTrash />
                                                                                    </Button>
                                                                                </td>
                                                                            </tr>
                                                                        )
                                                                    })}
                                                                </tbody>
                                                            </Table>
                                                        ) : (
                                                            <div className="text-center text-muted py-5">
                                                                <TbExchange size={48} className="mb-3" />
                                                                <p>No hay cambios registrados</p>
                                                            </div>
                                                        )}
                                                    </CardBody>
                                                </Card>
                                            </TabPane>

                                            {/* TAB 3: AMONESTACIONES */}
                                            <TabPane eventKey="amonestaciones">
                                                <Card>
                                                    <CardHeader>
                                                        <div className="d-flex justify-content-between align-items-center">
                                                            <CardTitle className="d-flex align-items-center">
                                                                <TbCards className="me-2" />
                                                                Amonestaciones
                                                            </CardTitle>
                                                            <Button variant="primary" onClick={() => setShowTarjetaModal(true)}>
                                                                <TbPlus className="me-1" />
                                                                Agregar Tarjeta
                                                            </Button>
                                                        </div>
                                                    </CardHeader>
                                                    <CardBody>
                                                        {tarjetas.length > 0 ? (
                                                            <Table responsive striped>
                                                                <thead>
                                                                    <tr>
                                                                        <th>Jugador</th>
                                                                        <th>Equipo</th>
                                                                        <th>Tipo</th>
                                                                        <th>Minuto</th>
                                                                        <th>Tiempo</th>
                                                                        <th>Motivo</th>
                                                                        <th>Acciones</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {tarjetas.map(tarjeta => {
                                                                        const jugador = jugadores.find(j => j.id === parseInt(tarjeta.jugador))
                                                                        const equipo = equipos.find(e => e.id === parseInt(tarjeta.equipo))

                                                                        return (
                                                                            <tr key={tarjeta.id}>
                                                                                <td>{jugador?.apellido_nombre}</td>
                                                                                <td>{equipo?.nombre}</td>
                                                                                <td>
                                                                                    <Badge bg={tarjeta.tipo === 'amarilla' ? 'warning' : 'danger'}>
                                                                                        {tarjeta.tipo === 'amarilla' ? 'Amarilla' : 'Roja'}
                                                                                    </Badge>
                                                                                </td>
                                                                                <td>{tarjeta.minuto}'</td>
                                                                                <td>
                                                                                    <Badge bg={tarjeta.tiempo === 'primer' ? 'primary' : 'secondary'}>
                                                                                        {tarjeta.tiempo === 'primer' ? '1er Tiempo' : '2do Tiempo'}
                                                                                    </Badge>
                                                                                </td>
                                                                                <td>{tarjeta.motivo}</td>
                                                                                <td>
                                                                                    <Button
                                                                                        variant="outline-danger"
                                                                                        size="sm"
                                                                                        onClick={() => handleDeleteTarjeta(tarjeta.id)}
                                                                                    >
                                                                                        <TbTrash />
                                                                                    </Button>
                                                                                </td>
                                                                            </tr>
                                                                        )
                                                                    })}
                                                                </tbody>
                                                            </Table>
                                                        ) : (
                                                            <div className="text-center text-muted py-5">
                                                                <TbCards size={48} className="mb-3" />
                                                                <p>No hay tarjetas registradas</p>
                                                            </div>
                                                        )}
                                                    </CardBody>
                                                </Card>
                                            </TabPane>

                                            {/* TAB 4: FIRMAS */}
                                            <TabPane eventKey="firmas">
                                                <Card>
                                                    <CardHeader>
                                                        <CardTitle className="d-flex align-items-center">
                                                            <TbSignature className="me-2" />
                                                            Firmas del Partido
                                                        </CardTitle>
                                                    </CardHeader>
                                                    <CardBody>
                                                        <Form>
                                                            <Row>
                                                                <Col md={6}>
                                                                    <FloatingLabel controlId="vocal" label="Vocal" className="mb-3">
                                                                        <FormControl
                                                                            type="text"
                                                                            value={firmas.vocal}
                                                                            onChange={(e) => setFirmas({ ...firmas, vocal: e.target.value })}
                                                                            placeholder="Nombre del vocal"
                                                                        />
                                                                    </FloatingLabel>
                                                                </Col>
                                                                <Col md={6}>
                                                                    <FloatingLabel controlId="arbitro" label="Árbitro" className="mb-3">
                                                                        <FormControl
                                                                            type="text"
                                                                            value={firmas.arbitro}
                                                                            onChange={(e) => setFirmas({ ...firmas, arbitro: e.target.value })}
                                                                            placeholder="Nombre del árbitro"
                                                                        />
                                                                    </FloatingLabel>
                                                                </Col>
                                                                <Col md={6}>
                                                                    <FloatingLabel controlId="capitanA" label="Capitán Equipo A" className="mb-3">
                                                                        <FormControl
                                                                            type="text"
                                                                            value={firmas.capitanA}
                                                                            onChange={(e) => setFirmas({ ...firmas, capitanA: e.target.value })}
                                                                            placeholder="Nombre del capitán del equipo A"
                                                                        />
                                                                    </FloatingLabel>
                                                                </Col>
                                                                <Col md={6}>
                                                                    <FloatingLabel controlId="capitanB" label="Capitán Equipo B" className="mb-3">
                                                                        <FormControl
                                                                            type="text"
                                                                            value={firmas.capitanB}
                                                                            onChange={(e) => setFirmas({ ...firmas, capitanB: e.target.value })}
                                                                            placeholder="Nombre del capitán del equipo B"
                                                                        />
                                                                    </FloatingLabel>
                                                                </Col>
                                                                <Col md={6}>
                                                                    <FloatingLabel controlId="fechaFirma" label="Fecha de Firma" className="mb-3">
                                                                        <FormControl
                                                                            type="date"
                                                                            value={firmas.fechaFirma}
                                                                            onChange={(e) => setFirmas({ ...firmas, fechaFirma: e.target.value })}
                                                                        />
                                                                    </FloatingLabel>
                                                                </Col>
                                                            </Row>

                                                            <div className="mt-4 p-4 border rounded bg-light">
                                                                <h6 className="mb-3">Resumen de Firmas</h6>
                                                                <Row>
                                                                    <Col md={6}>
                                                                        <div className="mb-2">
                                                                            <strong>Vocal:</strong> {firmas.vocal || 'Sin firmar'}
                                                                            {firmas.vocal && <TbCheck className="text-success ms-2" />}
                                                                        </div>
                                                                        <div className="mb-2">
                                                                            <strong>Árbitro:</strong> {firmas.arbitro || 'Sin firmar'}
                                                                            {firmas.arbitro && <TbCheck className="text-success ms-2" />}
                                                                        </div>
                                                                    </Col>
                                                                    <Col md={6}>
                                                                        <div className="mb-2">
                                                                            <strong>Capitán Equipo A:</strong> {firmas.capitanA || 'Sin firmar'}
                                                                            {firmas.capitanA && <TbCheck className="text-success ms-2" />}
                                                                        </div>
                                                                        <div className="mb-2">
                                                                            <strong>Capitán Equipo B:</strong> {firmas.capitanB || 'Sin firmar'}
                                                                            {firmas.capitanB && <TbCheck className="text-success ms-2" />}
                                                                        </div>
                                                                    </Col>
                                                                </Row>
                                                                <div className="mt-3">
                                                                    <strong>Fecha:</strong> {firmas.fechaFirma}
                                                                </div>
                                                                <div className="mt-3">
                                                                    <div className="progress" style={{ height: '8px' }}>
                                                                        <div
                                                                            className="progress-bar bg-success"
                                                                            role="progressbar"
                                                                            style={{
                                                                                width: `${(
                                                                                    (firmas.vocal ? 1 : 0) +
                                                                                    (firmas.arbitro ? 1 : 0) +
                                                                                    (firmas.capitanA ? 1 : 0) +
                                                                                    (firmas.capitanB ? 1 : 0)
                                                                                ) * 25}%`
                                                                            }}
                                                                        ></div>
                                                                    </div>
                                                                    <small className="text-muted mt-1 d-block">
                                                                        Progreso de firmas: {(
                                                                            (firmas.vocal ? 1 : 0) +
                                                                            (firmas.arbitro ? 1 : 0) +
                                                                            (firmas.capitanA ? 1 : 0) +
                                                                            (firmas.capitanB ? 1 : 0)
                                                                        )}/4 completadas
                                                                    </small>
                                                                </div>
                                                            </div>

                                                            <div className="mt-4 d-flex gap-2 justify-content-end">
                                                                <Button
                                                                    variant="outline-secondary"
                                                                    onClick={() => setFirmas({
                                                                        vocal: '',
                                                                        arbitro: '',
                                                                        capitanA: '',
                                                                        capitanB: '',
                                                                        fechaFirma: new Date().toISOString().split('T')[0]
                                                                    })}
                                                                >
                                                                    Limpiar Todo
                                                                </Button>
                                                                <Button
                                                                    variant="success"
                                                                    disabled={!firmas.vocal || !firmas.arbitro || !firmas.capitanA || !firmas.capitanB}
                                                                    
                                                                >
                                                                    <TbCheck className="me-1" />
                                                                    Guardar Firmas
                                                                </Button>
                                                            </div>
                                                        </Form>
                                                    </CardBody>
                                                </Card>
                                            </TabPane>
                                        </TabContent>
                                    </CardBody>
                                </Card>
                            </TabContainer>
                        </Col>
                    </Row>
                </Container>
            </Container>

            {/* Modal para seleccionar jugadores Equipo A */}
            <Modal show={showSelectionModalA} onHide={() => setShowSelectionModalA(false)} size="lg">
                <ModalHeader closeButton>
                    <ModalTitle>Seleccionar Jugadores - UDEF</ModalTitle>
                </ModalHeader>
                <ModalBody>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <h6>Jugadores Disponibles ({jugadoresEquipoA.length})</h6>
                        <div className="d-flex gap-2">
                            <Button variant="outline-success" size="sm" onClick={() => handleSelectAllPlayers('A')}>
                                Seleccionar Todos
                            </Button>
                            <Button variant="outline-danger" size="sm" onClick={() => handleClearAllPlayers('A')}>
                                Limpiar Selección
                            </Button>
                        </div>
                    </div>
                    <div className="d-grid gap-2" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                        {jugadoresEquipoA.map(jugador => {
                            const isSelected = jugadoresParticipantesA.some(j => j.id === jugador.id)
                            return (
                                <div 
                                    key={jugador.id} 
                                    className={`d-flex align-items-center p-3 border rounded cursor-pointer ${isSelected ? 'border-primary bg-light' : ''}`}
                                    onClick={() => handleTogglePlayerSelection(jugador, 'A')}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <div className="me-3">
                                        {jugador.foto ? (
                                            <img
                                                src={jugador.foto}
                                                alt={jugador.apellido_nombre}
                                                className="rounded-circle"
                                                style={{ width: '40px', height: '40px', objectFit: 'cover' }}
                                            />
                                        ) : (
                                            <div
                                                className="rounded-circle bg-light d-flex align-items-center justify-content-center"
                                                style={{ width: '40px', height: '40px' }}
                                            >
                                                <TbUsers className="text-muted" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-grow-1">
                                        <div className="fw-semibold">{jugador.apellido_nombre}</div>
                                        <small className="text-muted">{jugador.cedula} - {jugador.liga}</small>
                                    </div>
                                    <div className="ms-2">
                                        {isSelected ? (
                                            <TbCheck className="text-success" size={20} />
                                        ) : (
                                            <div className="border rounded" style={{ width: '20px', height: '20px' }}></div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                    <div className="mt-3 text-center">
                        <Badge bg="info">
                            {jugadoresParticipantesA.length} de {jugadoresEquipoA.length} jugadores seleccionados
                        </Badge>
                    </div>
                </ModalBody>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowSelectionModalA(false)}>
                        Cerrar
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Modal para seleccionar jugadores Equipo B */}
            <Modal show={showSelectionModalB} onHide={() => setShowSelectionModalB(false)} size="lg">
                <ModalHeader closeButton>
                    <ModalTitle>Seleccionar Jugadores - 9 Octubre</ModalTitle>
                </ModalHeader>
                <ModalBody>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <h6>Jugadores Disponibles ({jugadoresEquipoB.length})</h6>
                        <div className="d-flex gap-2">
                            <Button variant="outline-success" size="sm" onClick={() => handleSelectAllPlayers('B')}>
                                Seleccionar Todos
                            </Button>
                            <Button variant="outline-danger" size="sm" onClick={() => handleClearAllPlayers('B')}>
                                Limpiar Selección
                            </Button>
                        </div>
                    </div>
                    <div className="d-grid gap-2" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                        {jugadoresEquipoB.map(jugador => {
                            const isSelected = jugadoresParticipantesB.some(j => j.id === jugador.id)
                            return (
                                <div 
                                    key={jugador.id} 
                                    className={`d-flex align-items-center p-3 border rounded cursor-pointer ${isSelected ? 'border-primary bg-light' : ''}`}
                                    onClick={() => handleTogglePlayerSelection(jugador, 'B')}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <div className="me-3">
                                        {jugador.foto ? (
                                            <img
                                                src={jugador.foto}
                                                alt={jugador.apellido_nombre}
                                                className="rounded-circle"
                                                style={{ width: '40px', height: '40px', objectFit: 'cover' }}
                                            />
                                        ) : (
                                            <div
                                                className="rounded-circle bg-light d-flex align-items-center justify-content-center"
                                                style={{ width: '40px', height: '40px' }}
                                            >
                                                <TbUsers className="text-muted" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-grow-1">
                                        <div className="fw-semibold">{jugador.apellido_nombre}</div>
                                        <small className="text-muted">{jugador.cedula} - {jugador.liga}</small>
                                    </div>
                                    <div className="ms-2">
                                        {isSelected ? (
                                            <TbCheck className="text-success" size={20} />
                                        ) : (
                                            <div className="border rounded" style={{ width: '20px', height: '20px' }}></div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                    <div className="mt-3 text-center">
                        <Badge bg="info">
                            {jugadoresParticipantesB.length} de {jugadoresEquipoB.length} jugadores seleccionados
                        </Badge>
                    </div>
                </ModalBody>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowSelectionModalB(false)}>
                        Cerrar
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Modal para agregar cambio */}
            <Modal show={showCambioModal} onHide={() => setShowCambioModal(false)} size="lg">
                <ModalHeader closeButton>
                    <ModalTitle>Agregar Cambio de Jugador</ModalTitle>
                </ModalHeader>
                <ModalBody>
                    <Form>
                        <Row>
                            <Col md={6}>
                                <FloatingLabel controlId="equipoCambio" label="Equipo" className="mb-3">
                                    <FormSelect
                                        value={nuevoCambio.equipoA || ''}
                                        onChange={(e) => setNuevoCambio({ ...nuevoCambio, equipoA: e.target.value })}
                                    >
                                        <option value="">Seleccione un equipo...</option>
                                        {equipos.map(equipo => (
                                            <option key={equipo.id} value={equipo.id}>{equipo.nombre}</option>
                                        ))}
                                    </FormSelect>
                                </FloatingLabel>
                            </Col>
                            <Col md={6}>
                                <FloatingLabel controlId="tiempoCambio" label="Tiempo" className="mb-3">
                                    <FormSelect
                                        value={nuevoCambio.tiempo || ''}
                                        onChange={(e) => setNuevoCambio({ ...nuevoCambio, tiempo: e.target.value as 'primer' | 'segundo' })}
                                    >
                                        <option value="">Seleccione tiempo...</option>
                                        <option value="primer">Primer Tiempo</option>
                                        <option value="segundo">Segundo Tiempo</option>
                                    </FormSelect>
                                </FloatingLabel>
                            </Col>
                            <Col md={6}>
                                <FloatingLabel controlId="jugadorSale" label="Jugador que Sale" className="mb-3">
                                    <FormSelect
                                        value={nuevoCambio.jugadorSale || ''}
                                        onChange={(e) => setNuevoCambio({ ...nuevoCambio, jugadorSale: e.target.value })}
                                    >
                                        <option value="">Seleccione jugador...</option>
                                        {jugadores
                                            .filter(j => j.equipo?.id === nuevoCambio.equipoA)
                                            .map(jugador => (
                                                <option key={jugador.id} value={jugador.id}>
                                                    {jugador.apellido_nombre} ({jugador.cedula})
                                                </option>
                                            ))}
                                    </FormSelect>
                                </FloatingLabel>
                            </Col>
                            <Col md={6}>
                                <FloatingLabel controlId="jugadorEntra" label="Jugador que Entra" className="mb-3">
                                    <FormSelect
                                        value={nuevoCambio.jugadorEntra || ''}
                                        onChange={(e) => setNuevoCambio({ ...nuevoCambio, jugadorEntra: e.target.value })}
                                    >
                                        <option value="">Seleccione jugador...</option>
                                        {jugadores
                                            .filter(j => j.equipo?.id === nuevoCambio.equipoA)
                                            .map(jugador => (
                                                <option key={jugador.id} value={jugador.id}>
                                                    {jugador.apellido_nombre} ({jugador.cedula})
                                                </option>
                                            ))}
                                    </FormSelect>
                                </FloatingLabel>
                            </Col>
                            <Col md={12}>
                                <FloatingLabel controlId="minutoCambio" label="Minuto" className="mb-3">
                                    <FormControl
                                        type="number"
                                        min="1"
                                        max="120"
                                        value={nuevoCambio.minuto || ''}
                                        onChange={(e) => setNuevoCambio({ ...nuevoCambio, minuto: parseInt(e.target.value) })}
                                        placeholder="Minuto del cambio"
                                    />
                                </FloatingLabel>
                            </Col>
                        </Row>
                    </Form>
                </ModalBody>
                <ModalFooter>
                    <Button variant="secondary" onClick={() => setShowCambioModal(false)}>
                        Cancelar
                    </Button>
                    <Button variant="primary" onClick={handleAddCambio}>
                        Agregar Cambio
                    </Button>
                </ModalFooter>
            </Modal>

            {/* Modal para agregar tarjeta */}
            <Modal show={showTarjetaModal} onHide={() => setShowTarjetaModal(false)} size="lg">
                <ModalHeader closeButton>
                    <ModalTitle>Agregar Tarjeta</ModalTitle>
                </ModalHeader>
                <ModalBody>
                    <Form>
                        <Row>
                            <Col md={6}>
                                <FloatingLabel controlId="equipoTarjeta" label="Equipo" className="mb-3">
                                    <FormSelect
                                        value={nuevaTarjeta.equipo || ''}
                                        onChange={(e) => setNuevaTarjeta({ ...nuevaTarjeta, equipo: e.target.value })}
                                    >
                                        <option value="">Seleccione un equipo...</option>
                                        {equipos.map(equipo => (
                                            <option key={equipo.id} value={equipo.id}>{equipo.nombre}</option>
                                        ))}
                                    </FormSelect>
                                </FloatingLabel>
                            </Col>
                            <Col md={6}>
                                <FloatingLabel controlId="tipoTarjeta" label="Tipo de Tarjeta" className="mb-3">
                                    <FormSelect
                                        value={nuevaTarjeta.tipo || ''}
                                        onChange={(e) => setNuevaTarjeta({ ...nuevaTarjeta, tipo: e.target.value as 'amarilla' | 'roja' })}
                                    >
                                        <option value="">Seleccione tipo...</option>
                                        <option value="amarilla">Tarjeta Amarilla</option>
                                        <option value="roja">Tarjeta Roja</option>
                                    </FormSelect>
                                </FloatingLabel>
                            </Col>
                            <Col md={6}>
                                <FloatingLabel controlId="jugadorTarjeta" label="Jugador" className="mb-3">
                                    <FormSelect
                                        value={nuevaTarjeta.jugador || ''}
                                        onChange={(e) => setNuevaTarjeta({ ...nuevaTarjeta, jugador: e.target.value })}
                                    >
                                        <option value="">Seleccione jugador...</option>
                                        {jugadores
                                            .filter(j => j.equipo?.id === parseInt(nuevaTarjeta.equipo || '0'))
                                            .map(jugador => (
                                                <option key={jugador.id} value={jugador.id}>
                                                    {jugador.apellido_nombre} ({jugador.cedula})
                                                </option>
                                            ))}
                                    </FormSelect>
                                </FloatingLabel>
                            </Col>
                            <Col md={6}>
                                <FloatingLabel controlId="tiempoTarjeta" label="Tiempo" className="mb-3">
                                    <FormSelect
                                        value={nuevaTarjeta.tiempo || ''}
                                        onChange={(e) => setNuevaTarjeta({ ...nuevaTarjeta, tiempo: e.target.value as 'primer' | 'segundo' })}
                                    >
                                        <option value="">Seleccione tiempo...</option>
                                        <option value="primer">Primer Tiempo</option>
                                        <option value="segundo">Segundo Tiempo</option>
                                    </FormSelect>
                                </FloatingLabel>
                            </Col>
                            <Col md={6}>
                                <FloatingLabel controlId="minutoTarjeta" label="Minuto" className="mb-3">
                                    <FormControl
                                        type="number"
                                        min="1"
                                        max="120"
                                        value={nuevaTarjeta.minuto || ''}
                                        onChange={(e) => setNuevaTarjeta({ ...nuevaTarjeta, minuto: parseInt(e.target.value) })}
                                        placeholder="Minuto de la tarjeta"
                                    />
                                </FloatingLabel>
                            </Col>
                            <Col md={6}>
                                <FloatingLabel controlId="motivoTarjeta" label="Motivo" className="mb-3">
                                    <FormSelect
                                        value={nuevaTarjeta.motivo || ''}
                                        onChange={(e) => setNuevaTarjeta({ ...nuevaTarjeta, motivo: e.target.value })}
                                    >
                                        <option value="">Seleccione motivo...</option>
                                        <option value="Falta violenta">Falta violenta</option>
                                        <option value="Conducta antideportiva">Conducta antideportiva</option>
                                        <option value="Desacuerdo con el árbitro">Desacuerdo con el árbitro</option>
                                        <option value="Juego peligroso">Juego peligroso</option>
                                        <option value="Retraso del juego">Retraso del juego</option>
                                        <option value="Entrada imprudente">Entrada imprudente</option>
                                        <option value="Lenguaje ofensivo">Lenguaje ofensivo</option>
                                        <option value="Segunda amarilla">Segunda amarilla</option>
                                        <option value="Agresión">Agresión</option>
                                        <option value="Otro">Otro</option>
                                    </FormSelect>
                                </FloatingLabel>
                            </Col>
                        </Row>
                    </Form>
                </ModalBody>
                <ModalFooter>
                    <Button variant="secondary" onClick={() => setShowTarjetaModal(false)}>
                        Cancelar
                    </Button>
                    <Button variant="primary" onClick={handleAddTarjeta}>
                        Agregar Tarjeta
                    </Button>
                </ModalFooter>
            </Modal>
        </>
    )
}

export default GestionJugadores
