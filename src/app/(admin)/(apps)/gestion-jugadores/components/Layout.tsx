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
    Button
} from 'react-bootstrap';
import { TbUsers, TbCards, TbSoccerField, TbSignature, TbCurrencyDollar, TbFileDownload } from 'react-icons/tb';
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
                <Col xs={12} className="d-flex justify-content-between align-items-center">
                    <PageBreadcrumb title={tituloPartido} />
                    {(encuentroIdNum || (torneoId && equipoLocalId && equipoVisitanteId && jornada)) && (
                        <Button
                            variant="primary"
                            onClick={handleDescargarPDF}
                            disabled={descargandoPDF}
                            className="d-flex align-items-center"
                        >
                            <TbFileDownload className="me-2" size={18} />
                            {descargandoPDF ? 'Generando...' : 'Descargar PDF'}
                        </Button>
                    )}
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
        </Container>
    );
};

export default Layout;
