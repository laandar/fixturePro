import React, { useState } from 'react';
import {
    Row,
    Col,
    Button,
    Modal,
    ModalHeader,
    ModalTitle,
    ModalBody,
    ModalFooter,
    Form,
    Dropdown,
    DropdownMenu,
    DropdownItem,
    Badge,
    Image
} from 'react-bootstrap';
import { TbCheck, TbMenu2, TbUserPlus, TbUsers, TbExchange, TbTrash } from 'react-icons/tb';
import { useGestionJugadores } from './GestionJugadoresContext';
import type { JugadorWithEquipo } from '@/db/types';
import InlineNotification from '@/components/InlineNotification';
import ConfirmationModal from '@/components/table/DeleteConfirmationModal';

// CustomToggle component for the dropdown
const CustomToggle = React.forwardRef<HTMLAnchorElement, { children: React.ReactNode; onClick: (e: React.MouseEvent<HTMLAnchorElement>) => void }>(({ 
    children, 
    onClick 
}, ref) => (
    <a
        href=""
        ref={ref}
        onClick={(e) => {
            e.preventDefault();
            onClick(e);
        }}
        className="text-secondary"
        title="Opciones de sanción"
    >
        {children}
    </a>
));
CustomToggle.displayName = 'CustomToggle';

const TabPaneJugadores = () => {
    const [showImageModal, setShowImageModal] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [showChangeModal, setShowChangeModal] = useState(false);
    const [selectedPlayerForChange, setSelectedPlayerForChange] = useState<JugadorWithEquipo | null>(null);
    const [changeTeam, setChangeTeam] = useState<'A' | 'B' | null>(null);
    const [showConfirmationModal, setShowConfirmationModal] = useState(false);
    const [confirmationData, setConfirmationData] = useState<{
        cambioId: number;
        jugadorEntraId: number;
        jugadorSale: string;
        jugadorEntra: string;
    } | null>(null);

    const {
        loading,
        error,
        jugadoresEquipoA,
        jugadoresEquipoB,
        jugadoresParticipantesA,
        jugadoresParticipantesB,
        nombreEquipoA,
        nombreEquipoB,
        showSelectionModalA,
        setShowSelectionModalA,
        showSelectionModalB,
        setShowSelectionModalB,
        handleTogglePlayerSelection,
        handleSelectAllPlayers,
        handleClearAllPlayers,
        handleQuickSanction,
        handleQuickGoal,
        goles,
        tarjetas,
        isSaving,
        saveJugadoresParticipantes,
        saveCambiosJugadores,
        saveCambioJugador,
        realizarCambioJugadorCompleto,
        addCambioJugador,
        loadCambiosJugadores,
        handlePlayerChange,
        deshacerCambioJugador,
        torneoId,
        equipoLocalId,
        equipoVisitanteId,
        jornada,
        cambiosJugadores,
        setCambiosJugadores
    } = useGestionJugadores();

    const handleImageClick = (imageUrl: string) => {
        setSelectedImage(imageUrl);
        setShowImageModal(true);
    };

    const isPlayerSubstituted = (jugador: JugadorWithEquipo, equipo: 'A' | 'B') => {
        return cambiosJugadores.some(change => change.sale.id === jugador.id && change.equipo === equipo);
    };

    const handleOpenChangeModal = (jugador: JugadorWithEquipo, equipo: 'A' | 'B') => {
        setSelectedPlayerForChange(jugador);
        setChangeTeam(equipo);
        setShowChangeModal(true);
    };

    const handleDeshacerCambio = (cambioId: number, jugadorEntraId: number, jugadorSale: string, jugadorEntra: string) => {
        if (!torneoId || !equipoLocalId || !equipoVisitanteId || !jornada) {
            console.error('Faltan parámetros para deshacer cambio')
            return
        }

        // Configurar y mostrar modal de confirmación
        setConfirmationData({
            cambioId,
            jugadorEntraId,
            jugadorSale,
            jugadorEntra
        });
        setShowConfirmationModal(true);
    };

    const confirmDeshacerCambio = async () => {
        if (!confirmationData || !torneoId || !equipoLocalId || !equipoVisitanteId || !jornada) return;

        const { cambioId, jugadorEntraId } = confirmationData;

        try {
            // Obtener el encuentro actual
            const { getEncuentrosByTorneo } = await import('../../torneos/actions')
            const encuentros = await getEncuentrosByTorneo(torneoId)
            const encuentro = encuentros.find(e => 
                e.equipo_local_id === equipoLocalId && 
                e.equipo_visitante_id === equipoVisitanteId && 
                e.jornada === jornada
            )
            
            if (!encuentro) {
                console.error('No se encontró el encuentro para deshacer cambio')
                return
            }

            await deshacerCambioJugador(cambioId, jugadorEntraId, encuentro.id)
            
            // Recargar datos para actualizar la UI
            await loadCambiosJugadores()
            
            // Cerrar el modal después de completar la acción
            setShowConfirmationModal(false);
            setConfirmationData(null);
            
        } catch (error) {
            console.error('Error al deshacer cambio:', error)
            // También cerrar el modal en caso de error
            setShowConfirmationModal(false);
            setConfirmationData(null);
        }
    };

    const handlePlayerChangeLocal = async (jugadorSale: JugadorWithEquipo, jugadorEntra: JugadorWithEquipo, equipo: 'A' | 'B') => {
        try {
            // Realizar cambio completo: registrar en cambios_jugadores Y insertar en jugadores_participantes
            const result = await realizarCambioJugadorCompleto({ sale: jugadorSale, entra: jugadorEntra, equipo });
            
            
            // Actualizar estado local con el ID del cambio creado
            await handlePlayerChange(jugadorSale, jugadorEntra, equipo, (result as any)?.cambio?.id);
            
            console.log('✅ Cambio de jugador completado exitosamente');
        } catch (error) {
            console.error('❌ Error al realizar cambio de jugador:', error);
        } finally {
            setShowChangeModal(false);
            setSelectedPlayerForChange(null);
            setChangeTeam(null);
        }
    };

    const handleConfirmSave = async (equipo: 'A' | 'B') => {
        try {
            setSaveMessage(null);
            await saveJugadoresParticipantes();
            setSaveMessage({ type: 'success', text: '✅ Jugadores guardados exitosamente' });
            
            // Cerrar el modal después de un breve delay
            setTimeout(() => {
                if (equipo === 'A') {
                    setShowSelectionModalA(false);
                } else {
                    setShowSelectionModalB(false);
                }
                setSaveMessage(null);
            }, 1500);
        } catch (err) {
            console.error('Error al guardar:', err);
            setSaveMessage({ type: 'error', text: '❌ Error al guardar jugadores' });
        }
    };

    if (loading) {
        return <p>Cargando jugadores...</p>;
    }

    if (error) {
        return <p>Error al cargar datos: {error}</p>;
    }

    return (
        <>
            <Row>
                <Col md={6}>
                    <div className="mb-4">
                        <div className="d-flex align-items-center justify-content-between mb-3">
                            <h5 className="d-flex align-items-center mb-0">
                                <TbUsers className="me-2" />
                                {nombreEquipoA}
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
                                    style={{ padding: '4px 8px' }}
                                >
                                    <TbUsers />
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
                                {jugadoresParticipantesA.map((jugador: JugadorWithEquipo) => {
                                    const jugadorIdStr = jugador.id.toString();
                                    const tarjetasJugador = tarjetas.filter(t => t.jugador === jugadorIdStr);
                                    const amarillas = tarjetasJugador.filter(t => t.tipo === 'amarilla').length;
                                    const rojas = tarjetasJugador.filter(t => t.tipo === 'roja').length;
                                    const expulsado = rojas > 0 || amarillas >= 2;
                                    const sustituido = isPlayerSubstituted(jugador, 'A');
                                    const deshabilitado = expulsado || sustituido;

                                    return (
                                        <div key={jugador.id} className={`d-flex align-items-center p-2 border rounded shadow-sm ${deshabilitado ? 'bg-light' : 'bg-white'}`}>
                                            {jugador.foto ? (
                                                <Image
                                                    src={jugador.foto}
                                                    alt={jugador.apellido_nombre}
                                                    roundedCircle
                                                    className="me-3"
                                                    style={{ width: '40px', height: '40px', objectFit: 'cover', cursor: 'pointer' }}
                                                    onClick={() => handleImageClick(jugador.foto!)}
                                                />
                                            ) : (
                                                <div
                                                    className="rounded-circle bg-light d-flex align-items-center justify-content-center me-3"
                                                    style={{ width: '40px', height: '40px' }}
                                                >
                                                    <TbUsers className="text-muted" />
                                                </div>
                                            )}
                                            <div className="flex-grow-1">
                                                <div className={`fw-bold ${deshabilitado ? 'text-muted' : ''}`}>{jugador.apellido_nombre}</div>
                                                <div className={`text-muted small ${deshabilitado ? 'text-decoration-line-through' : ''}`}>
                                                    {jugador.cedula}
                                                    {sustituido && <span className="ms-2 badge bg-warning">SUSTITUIDO</span>}
                                                </div>
                                            </div>
                                            <div className="d-flex align-items-center gap-1">
                                                {tarjetasJugador.map(tarjeta => (
                                                    <span key={tarjeta.id} title={`${tarjeta.tipo.charAt(0).toUpperCase() + tarjeta.tipo.slice(1)} al min ${tarjeta.minuto}`}>
                                                        {tarjeta.tipo === 'amarilla' ? '🟨' : '🟥'}
                                                    </span>
                                                ))}
                                                {amarillas >= 2 && rojas === 0 && (
                                                    <span title="Expulsado por doble amarilla">🟥</span>
                                                )}
                                                {goles
                                                    .filter(g => g.jugador === jugadorIdStr)
                                                    .map(gol => (
                                                        <Badge
                                                            key={gol.id}
                                                            bg={gol.tipo === 'autogol' ? 'secondary' : 'success'}
                                                            style={{ fontSize: '0.6em' }}
                                                        >
                                                            {gol.tipo === 'gol' ? '⚽' : gol.tipo === 'penal' ? '🥅' : '⚽💔'}
                                                        </Badge>
                                                    ))}
                                            </div>
                                            <div className="ms-2">
                                                <Dropdown drop='start'>
                                                    <Dropdown.Toggle as={CustomToggle} disabled={deshabilitado}>
                                                        <TbMenu2 size={20} style={{ opacity: deshabilitado ? 0.5 : 1 }} />
                                                    </Dropdown.Toggle>
                                                    <DropdownMenu>
                                                        <DropdownItem
                                                            onClick={() => handleQuickSanction(jugador, 'amarilla')}
                                                            className="d-flex align-items-center"
                                                            disabled={deshabilitado}
                                                        >
                                                            <span className="me-2">🟨</span>
                                                            Tarjeta Amarilla
                                                        </DropdownItem>
                                                        <DropdownItem
                                                            onClick={() => handleQuickSanction(jugador, 'roja')}
                                                            className="d-flex align-items-center"
                                                            disabled={deshabilitado}
                                                        >
                                                            <span className="me-2">🟥</span>
                                                            Tarjeta Roja
                                                        </DropdownItem>
                                                        <Dropdown.Divider />
                                                        <DropdownItem 
                                                            onClick={() => handleQuickGoal(jugador, 'gol')}
                                                            className="d-flex align-items-center"
                                                            disabled={deshabilitado}
                                                        >
                                                            <span className="me-2">⚽</span>
                                                            Gol
                                                        </DropdownItem>
                                                        <Dropdown.Divider />
                                                        <DropdownItem 
                                                            onClick={() => handleOpenChangeModal(jugador, 'A')}
                                                            className="d-flex align-items-center"
                                                            disabled={sustituido}
                                                        >
                                                            <TbExchange className="me-2" />
                                                            Cambiar Jugador
                                                        </DropdownItem>
                                                    </DropdownMenu>
                                                </Dropdown>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center text-muted py-5">
                                <TbUserPlus size={48} className="mb-3" />
                                <p>No hay jugadores seleccionados para {nombreEquipoA}</p>
                                <Button
                                    variant="primary"
                                    onClick={() => setShowSelectionModalA(true)}
                                >
                                    Seleccionar Jugadores
                                </Button>
                            </div>
                        )}
                        
                        {/* Sección de Cambios de Jugadores - Equipo A */}
                        {cambiosJugadores.filter(c => c.equipo === 'A').length > 0 && (
                            <div className="mt-4">
                                <h6 className="d-flex align-items-center mb-3">
                                    <TbExchange className="me-2" />
                                    Cambios Realizados
                                    <Badge bg="info" className="ms-2">{cambiosJugadores.filter(c => c.equipo === 'A').length}</Badge>
                                </h6>
                                <div className="d-grid gap-2">
                                    {cambiosJugadores.filter(c => c.equipo === 'A').map((change, index) => (
                                        <div key={index} className="d-flex align-items-center p-2 border rounded bg-light">
                                            <div className="d-flex align-items-center me-3">
                                                {change.sale.foto ? (
                                                    <Image
                                                        src={change.sale.foto}
                                                        alt={change.sale.apellido_nombre}
                                                        roundedCircle
                                                        className="me-2"
                                                        style={{ width: '30px', height: '30px', objectFit: 'cover' }}
                                                    />
                                                ) : (
                                                    <div
                                                        className="rounded-circle bg-white d-flex align-items-center justify-content-center me-2"
                                                        style={{ width: '30px', height: '30px' }}
                                                    >
                                                        <TbUsers size={16} className="text-muted" />
                                                    </div>
                                                )}
                                                <div className="text-danger small">
                                                    <div className="fw-bold">{change.sale.apellido_nombre}</div>
                                                    <div>SALE</div>
                                                </div>
                                            </div>
                                            
                                            <TbExchange className="mx-2 text-muted" size={20} />
                                            
                                            <div className="d-flex align-items-center">
                                                {change.entra.foto ? (
                                                    <Image
                                                        src={change.entra.foto}
                                                        alt={change.entra.apellido_nombre}
                                                        roundedCircle
                                                        className="me-2"
                                                        style={{ width: '30px', height: '30px', objectFit: 'cover' }}
                                                    />
                                                ) : (
                                                    <div
                                                        className="rounded-circle bg-white d-flex align-items-center justify-content-center me-2"
                                                        style={{ width: '30px', height: '30px' }}
                                                    >
                                                        <TbUsers size={16} className="text-muted" />
                                                    </div>
                                                )}
                                                <div className="text-success small">
                                                    <div className="fw-bold">{change.entra.apellido_nombre}</div>
                                                    <div>ENTRA</div>
                                                </div>
                                            </div>
                                            
                                            <div className="ms-auto d-flex align-items-center">
                                                <div className="text-muted small me-2">
                                                    {change.timestamp.toLocaleTimeString()}
                                                </div>
                                                <Button 
                                                    variant="outline-danger" 
                                                    size="sm"
       onClick={() => {
           if (change.id) {
               handleDeshacerCambio(change.id, change.entra.id, change.sale.apellido_nombre, change.entra.apellido_nombre);
           }
       }}
                                                    title="Deshacer cambio1"
                                                >
                                                    <TbTrash size={14} />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </Col>

                <Col md={6}>
                    <div className="mb-4">
                        <div className="d-flex align-items-center justify-content-between mb-3">
                            <h5 className="d-flex align-items-center mb-0">
                                <TbUsers className="me-2" />
                                {nombreEquipoB}
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
                                    style={{ padding: '4px 8px' }}
                                >
                                    <TbUsers />
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
                                {jugadoresParticipantesB.map((jugador: JugadorWithEquipo) => {
                                    const jugadorIdStr = jugador.id.toString();
                                    const tarjetasJugador = tarjetas.filter(t => t.jugador === jugadorIdStr);
                                    const amarillas = tarjetasJugador.filter(t => t.tipo === 'amarilla').length;
                                    const rojas = tarjetasJugador.filter(t => t.tipo === 'roja').length;
                                    const expulsado = rojas > 0 || amarillas >= 2;
                                    const sustituido = isPlayerSubstituted(jugador, 'B');
                                    const deshabilitado = expulsado || sustituido;

                                    return (
                                        <div key={jugador.id} className={`d-flex align-items-center p-2 border rounded shadow-sm ${deshabilitado ? 'bg-light' : 'bg-white'}`}>
                                            {jugador.foto ? (
                                                <Image
                                                    src={jugador.foto}
                                                    alt={jugador.apellido_nombre}
                                                    roundedCircle
                                                    className="me-3"
                                                    style={{ width: '40px', height: '40px', objectFit: 'cover', cursor: 'pointer' }}
                                                    onClick={() => handleImageClick(jugador.foto!)}
                                                />
                                            ) : (
                                                <div
                                                    className="rounded-circle bg-light d-flex align-items-center justify-content-center me-3"
                                                    style={{ width: '40px', height: '40px' }}
                                                >
                                                    <TbUsers className="text-muted" />
                                                </div>
                                            )}
                                            <div className="flex-grow-1">
                                                <div className={`fw-bold ${deshabilitado ? 'text-muted' : ''}`}>{jugador.apellido_nombre}</div>
                                                <div className={`text-muted small ${deshabilitado ? 'text-decoration-line-through' : ''}`}>
                                                    {jugador.cedula}
                                                    {sustituido && <span className="ms-2 badge bg-warning">SUSTITUIDO</span>}
                                                </div>
                                            </div>
                                            <div className="d-flex align-items-center gap-1">
                                                {tarjetasJugador.map(tarjeta => (
                                                    <span key={tarjeta.id} title={`${tarjeta.tipo.charAt(0).toUpperCase() + tarjeta.tipo.slice(1)} al min ${tarjeta.minuto}`}>
                                                        {tarjeta.tipo === 'amarilla' ? '🟨' : '🟥'}
                                                    </span>
                                                ))}
                                                {amarillas >= 2 && rojas === 0 && (
                                                    <span title="Expulsado por doble amarilla">🟥</span>
                                                )}
                                                {goles
                                                    .filter(g => g.jugador === jugadorIdStr)
                                                    .map(gol => (
                                                        <Badge
                                                            key={gol.id}
                                                            bg={gol.tipo === 'autogol' ? 'secondary' : 'success'}
                                                            style={{ fontSize: '0.6em' }}
                                                        >
                                                            {gol.tipo === 'gol' ? '⚽' : gol.tipo === 'penal' ? '🥅' : '⚽💔'}
                                                        </Badge>
                                                    ))}
                                            </div>
                                            <div className="ms-2">
                                                <Dropdown drop='start'>
                                                    <Dropdown.Toggle as={CustomToggle} disabled={deshabilitado}>
                                                        <TbMenu2 size={20} style={{ opacity: deshabilitado ? 0.5 : 1 }} />
                                                    </Dropdown.Toggle>
                                                    <DropdownMenu>
                                                        <DropdownItem
                                                            onClick={() => handleQuickSanction(jugador, 'amarilla')}
                                                            className="d-flex align-items-center"
                                                            disabled={expulsado}
                                                        >
                                                            <span className="me-2">🟨</span>
                                                            Tarjeta Amarilla
                                                        </DropdownItem>
                                                        <DropdownItem
                                                            onClick={() => handleQuickSanction(jugador, 'roja')}
                                                            className="d-flex align-items-center"
                                                            disabled={expulsado}
                                                        >
                                                            <span className="me-2">🟥</span>
                                                            Tarjeta Roja
                                                        </DropdownItem>
                                                        <Dropdown.Divider />
                                                        <DropdownItem 
                                                            onClick={() => handleQuickGoal(jugador, 'gol')}
                                                            className="d-flex align-items-center"
                                                            disabled={expulsado}
                                                        >
                                                            <span className="me-2">⚽</span>
                                                            Gol
                                                        </DropdownItem>
                                                        <Dropdown.Divider />
                                                        <DropdownItem 
                                                            onClick={() => handleOpenChangeModal(jugador, 'B')}
                                                            className="d-flex align-items-center"
                                                            disabled={sustituido}
                                                        >
                                                            <TbExchange className="me-2" />
                                                            Cambiar Jugador
                                                        </DropdownItem>
                                                    </DropdownMenu>
                                                </Dropdown>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center text-muted py-5">
                                <TbUserPlus size={48} className="mb-3" />
                                <p>No hay jugadores seleccionados para {nombreEquipoB}</p>
                                <Button
                                    variant="primary"
                                    onClick={() => setShowSelectionModalB(true)}
                                >
                                    Seleccionar Jugadores
                                </Button>
                            </div>
                        )}
                        
                        {/* Sección de Cambios de Jugadores - Equipo B */}
                        {cambiosJugadores.filter(c => c.equipo === 'B').length > 0 && (
                            <div className="mt-4">
                                <h6 className="d-flex align-items-center mb-3">
                                    <TbExchange className="me-2" />
                                    Cambios Realizados
                                    <Badge bg="info" className="ms-2">{cambiosJugadores.filter(c => c.equipo === 'B').length}</Badge>
                                </h6>
                                <div className="d-grid gap-2">
                                    {cambiosJugadores.filter(c => c.equipo === 'B').map((change, index) => (
                                        <div key={index} className="d-flex align-items-center p-2 border rounded bg-light">
                                            <div className="d-flex align-items-center me-3">
                                                {change.sale.foto ? (
                                                    <Image
                                                        src={change.sale.foto}
                                                        alt={change.sale.apellido_nombre}
                                                        roundedCircle
                                                        className="me-2"
                                                        style={{ width: '30px', height: '30px', objectFit: 'cover' }}
                                                    />
                                                ) : (
                                                    <div
                                                        className="rounded-circle bg-white d-flex align-items-center justify-content-center me-2"
                                                        style={{ width: '30px', height: '30px' }}
                                                    >
                                                        <TbUsers size={16} className="text-muted" />
                                                    </div>
                                                )}
                                                <div className="text-danger small">
                                                    <div className="fw-bold">{change.sale.apellido_nombre}</div>
                                                    <div>SALE</div>
                                                </div>
                                            </div>
                                            
                                            <TbExchange className="mx-2 text-muted" size={20} />
                                            
                                            <div className="d-flex align-items-center">
                                                {change.entra.foto ? (
                                                    <Image
                                                        src={change.entra.foto}
                                                        alt={change.entra.apellido_nombre}
                                                        roundedCircle
                                                        className="me-2"
                                                        style={{ width: '30px', height: '30px', objectFit: 'cover' }}
                                                    />
                                                ) : (
                                                    <div
                                                        className="rounded-circle bg-white d-flex align-items-center justify-content-center me-2"
                                                        style={{ width: '30px', height: '30px' }}
                                                    >
                                                        <TbUsers size={16} className="text-muted" />
                                                    </div>
                                                )}
                                                <div className="text-success small">
                                                    <div className="fw-bold">{change.entra.apellido_nombre}</div>
                                                    <div>ENTRA</div>
                                                </div>
                                            </div>
                                            
                                            <div className="ms-auto d-flex align-items-center">
                                                <div className="text-muted small me-2">
                                                    {change.timestamp.toLocaleTimeString()}
                                                </div>
                                                <Button 
                                                    variant="outline-danger" 
                                                    size="sm"
                                                    onClick={() => change.id && handleDeshacerCambio(change.id, change.entra.id, change.sale.apellido_nombre, change.entra.apellido_nombre)}
                                                    title="Deshacer cambio"
                                                >
                                                    <TbTrash size={14} />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </Col>
            </Row>

            {/* Modal de Selección de Jugadores Equipo A */}
            <Modal show={showSelectionModalA} onHide={() => setShowSelectionModalA(false)} size="lg">
                <ModalHeader closeButton>
                    <ModalTitle>Seleccionar Jugadores para Equipo A</ModalTitle>
                </ModalHeader>
                <ModalBody>
                    <div className="d-flex justify-content-end mb-3">
                        <Button variant="outline-primary" size="sm" onClick={() => handleSelectAllPlayers('A')} className="me-2">
                            Seleccionar Todos
                        </Button>
                        <Button variant="outline-danger" size="sm" onClick={() => handleClearAllPlayers('A')}>
                            Limpiar Selección
                        </Button>
                    </div>
                    <Row>
                        {jugadoresEquipoA.map((jugador: JugadorWithEquipo) => (
                            <Col md={6} key={jugador.id}>
                                <Form.Check
                                    type="checkbox"
                                    id={`jugador-A-${jugador.id}`}
                                    label={`${jugador.apellido_nombre} (${jugador.cedula})`}
                                    checked={jugadoresParticipantesA.some(p => p.id === jugador.id)}
                                    onChange={() => handleTogglePlayerSelection(jugador, 'A')}
                                />
                            </Col>
                        ))}
                    </Row>
                </ModalBody>
                <ModalFooter>
                    {saveMessage && (
                        <InlineNotification
                            type={saveMessage.type === 'success' ? 'success' : 'error'}
                            message={saveMessage.text}
                            onClose={() => setSaveMessage(null)}
                            className="me-auto"
                        />
                    )}
                    <Button variant="secondary" onClick={() => {
                        setShowSelectionModalA(false);
                        setSaveMessage(null);
                    }}>
                        Cerrar
                    </Button>
                    <Button 
                        variant="primary" 
                        onClick={() => handleConfirmSave('A')}
                        disabled={isSaving}
                    >
                        <TbCheck /> {isSaving ? 'Guardando...' : 'Confirmar Selección'}
                    </Button>
                </ModalFooter>
            </Modal>

            {/* Modal de Selección de Jugadores Equipo B */}
            <Modal show={showSelectionModalB} onHide={() => setShowSelectionModalB(false)} size="lg">
                <ModalHeader closeButton>
                    <ModalTitle>Seleccionar Jugadores para Equipo B</ModalTitle>
                </ModalHeader>
                <ModalBody>
                    <div className="d-flex justify-content-end mb-3">
                        <Button variant="outline-primary" size="sm" onClick={() => handleSelectAllPlayers('B')} className="me-2">
                            Seleccionar Todos
                        </Button>
                        <Button variant="outline-danger" size="sm" onClick={() => handleClearAllPlayers('B')}>
                            Limpiar Selección
                        </Button>
                    </div>
                    <Row>
                        {jugadoresEquipoB.map((jugador: JugadorWithEquipo) => (
                            <Col md={6} key={jugador.id}>
                                <Form.Check
                                    type="checkbox"
                                    id={`jugador-B-${jugador.id}`}
                                    label={`${jugador.apellido_nombre} (${jugador.cedula})`}
                                    checked={jugadoresParticipantesB.some(p => p.id === jugador.id)}
                                    onChange={() => handleTogglePlayerSelection(jugador, 'B')}
                                />
                            </Col>
                        ))}
                    </Row>
                </ModalBody>
                <ModalFooter>
                    {saveMessage && (
                        <InlineNotification
                            type={saveMessage.type === 'success' ? 'success' : 'error'}
                            message={saveMessage.text}
                            onClose={() => setSaveMessage(null)}
                            className="me-auto"
                        />
                    )}
                    <Button variant="secondary" onClick={() => {
                        setShowSelectionModalB(false);
                        setSaveMessage(null);
                    }}>
                        Cerrar
                    </Button>
                    <Button 
                        variant="primary" 
                        onClick={() => handleConfirmSave('B')}
                        disabled={isSaving}
                    >
                        <TbCheck /> {isSaving ? 'Guardando...' : 'Confirmar Selección'}
                    </Button>
                </ModalFooter>
            </Modal>

            {/* Modal para ver imagen del jugador */}
            <Modal show={showImageModal} onHide={() => setShowImageModal(false)} centered size="lg">
                <Modal.Body className="p-0">
                    {selectedImage && <Image src={selectedImage} fluid />}
                </Modal.Body>
            </Modal>

            {/* Modal para cambio de jugadores */}
            <Modal show={showChangeModal} onHide={() => setShowChangeModal(false)} size="lg">
                <ModalHeader closeButton>
                    <ModalTitle>
                        Cambiar Jugador - {selectedPlayerForChange?.apellido_nombre}
                    </ModalTitle>
                </ModalHeader>
                <ModalBody>
                    {selectedPlayerForChange && changeTeam && (
                        <div>
                            <InlineNotification
                                type="info"
                                message={`Jugador que sale: ${selectedPlayerForChange.apellido_nombre} (${selectedPlayerForChange.cedula})`}
                                className="mb-4"
                                size="lg"
                            />
                            
                            <h6 className="mb-3">Selecciona el jugador que entra:</h6>
                            
                            <div className="row">
                                {(changeTeam === 'A' ? jugadoresEquipoA : jugadoresEquipoB)
                                    .filter(jugador => {
                                        // Excluir al jugador que sale y a los que ya están en el campo
                                        const participantes = changeTeam === 'A' ? jugadoresParticipantesA : jugadoresParticipantesB;
                                        return jugador.id !== selectedPlayerForChange.id && 
                                               !participantes.some(p => p.id === jugador.id);
                                    })
                                    .map(jugador => (
                                        <div key={jugador.id} className="col-md-6 mb-3">
                                            <div 
                                                className="card h-100 cursor-pointer border-2 border-transparent hover-border-primary"
                                                style={{ cursor: 'pointer' }}
                                                onClick={() => handlePlayerChangeLocal(selectedPlayerForChange, jugador, changeTeam)}
                                            >
                                                <div className="card-body d-flex align-items-center">
                                                    {jugador.foto ? (
                                                        <Image
                                                            src={jugador.foto}
                                                            alt={jugador.apellido_nombre}
                                                            roundedCircle
                                                            className="me-3"
                                                            style={{ width: '40px', height: '40px', objectFit: 'cover' }}
                                                        />
                                                    ) : (
                                                        <div
                                                            className="rounded-circle bg-light d-flex align-items-center justify-content-center me-3"
                                                            style={{ width: '40px', height: '40px' }}
                                                        >
                                                            <TbUsers className="text-muted" />
                                                        </div>
                                                    )}
                                                    <div>
                                                        <div className="fw-bold">{jugador.apellido_nombre}</div>
                                                        <div className="text-muted small">{jugador.cedula}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                            
                            {(changeTeam === 'A' ? jugadoresEquipoA : jugadoresEquipoB)
                                .filter(jugador => {
                                    const participantes = changeTeam === 'A' ? jugadoresParticipantesA : jugadoresParticipantesB;
                                    return jugador.id !== selectedPlayerForChange.id && 
                                           !participantes.some(p => p.id === jugador.id);
                                }).length === 0 && (
                                <div className="text-center text-muted py-4">
                                    <TbUsers size={48} className="mb-3" />
                                    <p>No hay jugadores disponibles para el cambio</p>
                                </div>
                            )}
                        </div>
                    )}
                </ModalBody>
                <ModalFooter>
                    <Button variant="secondary" onClick={() => setShowChangeModal(false)}>
                        Cancelar
                    </Button>
                </ModalFooter>
            </Modal>

            {/* Modal de confirmación para deshacer cambio */}
            <ConfirmationModal
                show={showConfirmationModal}
                onHide={() => {
                    setShowConfirmationModal(false);
                    setConfirmationData(null);
                }}
                onConfirm={confirmDeshacerCambio}
                modalTitle="Deshacer Cambio de Jugador"
                confirmButtonText="Deshacer Cambio"
                cancelButtonText="Cancelar"
                variant="warning"
            >
                {confirmationData && (
                    <div className="text-center">
                        <p>¿Estás seguro de que deseas deshacer este cambio?</p>
                        <div className="mb-3">
                            <h6 className="text-warning mb-2">Jugador que sale:</h6>
                            <span className="badge bg-warning-subtle text-warning-emphasis fs-6 px-3 py-2">
                                {confirmationData.jugadorSale}
                            </span>
                        </div>
                        <div className="mb-3">
                            <h6 className="text-info mb-2">Jugador que entra:</h6>
                            <span className="badge bg-info-subtle text-info-emphasis fs-6 px-3 py-2">
                                {confirmationData.jugadorEntra}
                            </span>
                        </div>
                        <p className="text-muted small">
                            Esta acción no se puede deshacer.
                        </p>
                    </div>
                )}
            </ConfirmationModal>
        </>
    );
};

export default TabPaneJugadores;
