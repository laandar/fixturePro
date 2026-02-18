import PageBreadcrumb from '@/components/PageBreadcrumb';
import {
    Container,
    TabContainer,
    Nav,
    NavItem,
    NavLink,
    TabContent,
    TabPane,
    Row,
    Col,
    Button,
    Modal,
    ModalHeader,
    ModalTitle,
    ModalBody,
    ModalFooter,
    Alert
} from 'react-bootstrap';
import { TbUsers, TbCards, TbSoccerField, TbSignature, TbCurrencyDollar, TbFileDownload, TbHelp } from 'react-icons/tb';
import EstadoEncuentro from './EstadoEncuentro';
import { useGestionJugadores } from './GestionJugadoresContext';
import { useState } from 'react';
import { getEncuentroCompletoParaPDF } from '../actions';
import { generarPDFHojaVocalia } from '@/lib/pdf-generator';

interface LayoutProps {
    tabJugadores: React.ReactNode;
    tabAmonestaciones: React.ReactNode;
    tabGoles: React.ReactNode;
    tabFirmas: React.ReactNode;
    tabPagos?: React.ReactNode;
    nombreEquipoA?: string;
    nombreEquipoB?: string;
}

const Layout = ({ tabJugadores, tabAmonestaciones, tabGoles, tabFirmas, tabPagos, nombreEquipoA, nombreEquipoB }: LayoutProps) => {
    const { torneoId, equipoLocalId, equipoVisitanteId, jornada, encuentroIdNum, torneoCategoriaId, getEncuentroActual } = useGestionJugadores()
    const [descargandoPDF, setDescargandoPDF] = useState(false)
    const [showManualUsuario, setShowManualUsuario] = useState(false)
    const tituloPartido = (nombreEquipoA && nombreEquipoB) ? `${nombreEquipoA} vs ${nombreEquipoB}` : "Gestión del Partido"
    
    const handleDescargarPDF = async () => {
        setDescargandoPDF(true)
        try {
            // Obtener el ID del encuentro si no está disponible directamente
            let encuentroId: number | null = encuentroIdNum
            if (!encuentroId) {
                const encuentro = await getEncuentroActual()
                if (!encuentro || !encuentro.id) {
                    alert('No se puede descargar el PDF: encuentro no encontrado')
                    setDescargandoPDF(false)
                    return
                }
                encuentroId = encuentro.id
            }

            // Verificar que encuentroId no sea null antes de usar
            if (!encuentroId) {
                alert('No se puede descargar el PDF: encuentro no encontrado')
                setDescargandoPDF(false)
                return
            }

            // Obtener encuentro completo desde server action
            const encuentroCompleto = await getEncuentroCompletoParaPDF(encuentroId)

            // Generar PDF
            const pdf = await generarPDFHojaVocalia(
                encuentroCompleto as any,
                encuentroCompleto.categoriaNombre,
                encuentroCompleto.jornada
            )

            // Nombre del archivo
            const equipoLocalNombre = encuentroCompleto.equipoLocal?.nombre || 'Equipo Local'
            const equipoVisitanteNombre = encuentroCompleto.equipoVisitante?.nombre || 'Equipo Visitante'
            const fileName = `Hoja_Vocalia_${equipoLocalNombre}_vs_${equipoVisitanteNombre}_J${encuentroCompleto.jornada}.pdf`
                .replace(/[^a-zA-Z0-9_]/g, '_')

            // Descargar
            pdf.save(fileName)
        } catch (error) {
            console.error('Error al generar PDF:', error)
            alert('Error al generar el PDF: ' + (error instanceof Error ? error.message : 'Error desconocido'))
        } finally {
            setDescargandoPDF(false)
        }
    }
    
    return (
        <Container fluid>
            <Row className="mb-3">
                <Col xs={12} className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                    <PageBreadcrumb title={tituloPartido} />
                    <div className="d-flex align-items-center gap-2">
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
                        {(encuentroIdNum || (torneoId && equipoLocalId && equipoVisitanteId && jornada)) && (
                            <Button
                                variant="primary"
                                size="sm"
                                onClick={handleDescargarPDF}
                                disabled={descargandoPDF}
                                className="d-flex align-items-center"
                            >
                                <TbFileDownload className="me-2" size={18} />
                                {descargandoPDF ? 'Generando...' : 'Descargar PDF'}
                            </Button>
                        )}
                    </div>
                </Col>
            </Row>
            
            {/* Componente de Estado del Encuentro */}
            {torneoId && equipoLocalId && equipoVisitanteId && jornada && (
                <Row className="mb-4">
                    <Col xs={12}>
                        <EstadoEncuentro 
                            torneoId={torneoId}
                            equipoLocalId={equipoLocalId}
                            equipoVisitanteId={equipoVisitanteId}
                            jornada={jornada}
                        />
                    </Col>
                </Row>
            )}
            
            <Row>
                <Col xs={12}>
                    <TabContainer defaultActiveKey="jugadores">
                        <Nav variant="tabs" className="nav-bordered" as="ul">
                            <NavItem as="li">
                                <NavLink eventKey="jugadores">
                                    <TbUsers size={20} />
                                </NavLink>
                            </NavItem>
                            <NavItem as="li">
                                <NavLink eventKey="amonestaciones">
                                    <TbCards size={20} />
                                </NavLink>
                            </NavItem>
                            <NavItem as="li">
                                <NavLink eventKey="goles">
                                    <TbSoccerField size={20} />
                                </NavLink>
                            </NavItem>
                            <NavItem as="li">
                                <NavLink eventKey="pagos">
                                    <TbCurrencyDollar size={20} />
                                </NavLink>
                            </NavItem>
                            <NavItem as="li">
                                <NavLink eventKey="firmas">
                                    <TbSignature size={20} />
                                </NavLink>
                            </NavItem>
                        </Nav>
                        <TabContent>
                            <TabPane eventKey="jugadores">
                                {tabJugadores}
                            </TabPane>
                            <TabPane eventKey="amonestaciones">
                                {tabAmonestaciones}
                            </TabPane>
                            <TabPane eventKey="goles">
                                {tabGoles}
                            </TabPane>
                            <TabPane eventKey="pagos">
                                {tabPagos}
                            </TabPane>
                            <TabPane eventKey="firmas">
                                {tabFirmas}
                            </TabPane>
                        </TabContent>
                    </TabContainer>
                </Col>
            </Row>

            {/* Modal Manual de Usuario */}
            <Modal show={showManualUsuario} onHide={() => setShowManualUsuario(false)} size="lg" centered>
                <ModalHeader closeButton>
                    <ModalTitle className="d-flex align-items-center">
                        <TbHelp className="me-2" />
                        Manual de Usuario - Gestión del Partido
                    </ModalTitle>
                </ModalHeader>
                <ModalBody style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                    <div className="manual-content">
                        <Alert variant="info" className="mb-4">
                            <strong>Gestión de Jugadores del Partido</strong>
                            <br />
                            <small>Esta pantalla permite registrar jugadores participantes, amonestaciones, goles, pagos de multas y firmas de la hoja de vocalía para un encuentro. </small>
                        </Alert>

                        
                        <h6 className="text-primary mb-2 mt-3">Estado del encuentro</h6>
                        <p>En la parte superior se muestra el estado del partido (pendiente, en curso, finalizado). Puedes cambiar el estado desde ese bloque. Si el encuentro está <strong>finalizado</strong> y quieres editar datos (jugadores, goles, tarjetas, etc.), el sistema te pedirá confirmar el cambio a &quot;en curso&quot;.</p>

                        <h6 className="text-primary mb-2 mt-3">Descargar PDF</h6>
                        <p>El botón <strong>Descargar PDF</strong> genera la hoja de vocalía del partido con los datos actuales (equipos, jugadores, goles, tarjetas, firmas) lista para imprimir.</p>

                        <h6 className="text-primary mb-2 mt-3">Pestaña Jugadores</h6>
                        <p>Gestionas qué jugadores participan en el partido para cada equipo (local y visitante). Puedes seleccionar jugadores desde la lista disponible, designar capitán, realizar cambios (sale/entra) y usar acciones rápidas de tarjeta o gol desde el menú del jugador. Los cambios se guardan con el botón correspondiente.</p>

                        <h6 className="text-primary mb-2 mt-3">Pestaña Amonestaciones</h6>
                        <p>Registra tarjetas amarillas y rojas: selecciona jugador, tipo de tarjeta y guarda. Las tarjetas se listan por equipo. Puedes eliminar una tarjeta si se registró por error. Estas amonestaciones se usan para multas y estadísticas de sanciones.</p>

                        <h6 className="text-primary mb-2 mt-3">Pestaña Goles</h6>
                        <p>Registra los goles del partido: jugador que anotó, minuto, tiempo (primer/second half) y tipo (gol, penal, etc.). Puedes eliminar un gol si fue cargado por error. El marcador se actualiza según los goles registrados.</p>

                        <h6 className="text-primary mb-2 mt-3">Pestaña Pagos</h6>
                        <p>Muestra los saldos de multas por equipo (acumulado hasta la jornada anterior) y permite registrar pagos. Incluye detalle de valores (tarjetas, cargos manuales) y opción para agregar cargos manuales por jornada si aplica.</p>

                        <h6 className="text-primary mb-2 mt-3">Pestaña Firmas</h6>
                        <p>Completa los datos y firmas de la hoja de vocalía: vocal, árbitro, capitanes (local y visitante), fecha y, si aplica, tribunal. Al guardar se almacenan las firmas asociadas al encuentro. Estos datos se incluyen en el PDF de la hoja de vocalía.</p>

                        <Alert variant="warning" className="mt-3 mb-0">
                            <strong>Importante:</strong> Si sales de la página con cambios sin guardar, se mostrará un aviso. Guarda cada pestaña (jugadores, firmas, etc.) antes de salir para no perder información.
                        </Alert>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <Button variant="secondary" onClick={() => setShowManualUsuario(false)}>
                        Cerrar
                    </Button>
                </ModalFooter>
            </Modal>
        </Container>
    );
};

export default Layout;
