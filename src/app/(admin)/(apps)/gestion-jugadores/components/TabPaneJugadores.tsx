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
import { TbCheck, TbMenu2, TbUserPlus, TbUsers } from 'react-icons/tb';
import { useGestionJugadores } from './GestionJugadoresContext';
import type { JugadorWithEquipo } from '@/db/types';

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
        saveJugadoresParticipantes
    } = useGestionJugadores();

    const handleImageClick = (imageUrl: string) => {
        setSelectedImage(imageUrl);
        setShowImageModal(true);
    };

    if (loading) {
        return <p>Cargando jugadores...</p>;
    }

    if (error) {
        return <p>Error al cargar datos: {error}</p>;
    }

    return (
        <>
            {/* Botón de guardado manual para debug */}
            <div className="mb-3 text-center">
                <Button 
                    variant="primary" 
                    onClick={saveJugadoresParticipantes}
                    disabled={isSaving}
                    size="sm"
                >
                    {isSaving ? 'Guardando...' : 'Guardar Selección Manualmente'}
                </Button>
                <small className="d-block text-muted mt-1">
                    Equipo A: {jugadoresParticipantesA.length} | Equipo B: {jugadoresParticipantesB.length}
                </small>
            </div>
            
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

                                    return (
                                        <div key={jugador.id} className={`d-flex align-items-center p-2 border rounded shadow-sm ${expulsado ? 'bg-light' : 'bg-white'}`}>
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
                                                <div className={`fw-bold ${expulsado ? 'text-muted' : ''}`}>{jugador.apellido_nombre}</div>
                                                <div className={`text-muted small ${expulsado ? 'text-decoration-line-through' : ''}`}>{jugador.cedula}</div>
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
                                                    <Dropdown.Toggle as={CustomToggle} disabled={expulsado}>
                                                        <TbMenu2 size={20} style={{ opacity: expulsado ? 0.5 : 1 }} />
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

                                    return (
                                        <div key={jugador.id} className={`d-flex align-items-center p-2 border rounded shadow-sm ${expulsado ? 'bg-light' : 'bg-white'}`}>
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
                                                <div className={`fw-bold ${expulsado ? 'text-muted' : ''}`}>{jugador.apellido_nombre}</div>
                                                <div className={`text-muted small ${expulsado ? 'text-decoration-line-through' : ''}`}>{jugador.cedula}</div>
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
                                                    <Dropdown.Toggle as={CustomToggle} disabled={expulsado}>
                                                        <TbMenu2 size={20} style={{ opacity: expulsado ? 0.5 : 1 }} />
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
                    <Button variant="secondary" onClick={() => setShowSelectionModalA(false)}>
                        Cerrar
                    </Button>
                    <Button variant="primary" onClick={() => setShowSelectionModalA(false)}>
                        <TbCheck /> Confirmar Selección
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
                    <Button variant="secondary" onClick={() => setShowSelectionModalB(false)}>
                        Cerrar
                    </Button>
                    <Button variant="primary" onClick={() => setShowSelectionModalB(false)}>
                        <TbCheck /> Confirmar Selección
                    </Button>
                </ModalFooter>
            </Modal>

            {/* Modal para ver imagen del jugador */}
            <Modal show={showImageModal} onHide={() => setShowImageModal(false)} centered size="lg">
                <Modal.Body className="p-0">
                    {selectedImage && <Image src={selectedImage} fluid />}
                </Modal.Body>
            </Modal>
        </>
    );
};

export default TabPaneJugadores;
