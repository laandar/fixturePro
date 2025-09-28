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
    Col
} from 'react-bootstrap';
import { TbUsers, TbExchange, TbCards, TbSoccerField, TbSignature } from 'react-icons/tb';
import EstadoEncuentro from './EstadoEncuentro';
import { useGestionJugadores } from './GestionJugadoresContext';

interface LayoutProps {
    tabJugadores: React.ReactNode;
    tabCambios: React.ReactNode;
    tabAmonestaciones: React.ReactNode;
    tabGoles: React.ReactNode;
    tabFirmas: React.ReactNode;
    nombreEquipoA?: string;
    nombreEquipoB?: string;
}

const Layout = ({ tabJugadores, tabCambios, tabAmonestaciones, tabGoles, tabFirmas, nombreEquipoA, nombreEquipoB }: LayoutProps) => {
    const { torneoId, equipoLocalId, equipoVisitanteId, jornada } = useGestionJugadores()
    const tituloPartido = (nombreEquipoA && nombreEquipoB) ? `${nombreEquipoA} vs ${nombreEquipoB}` : "Gestión del Partido"
    
    return (
        <Container fluid>
            <PageBreadcrumb title={tituloPartido} />
            
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
                                <NavLink eventKey="cambios">
                                    <TbExchange size={20} />
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
                                <NavLink eventKey="firmas">
                                    <TbSignature size={20} />
                                </NavLink>
                            </NavItem>
                        </Nav>
                        <TabContent>
                            <TabPane eventKey="jugadores">
                                {tabJugadores}
                            </TabPane>
                            <TabPane eventKey="cambios">
                                {tabCambios}
                            </TabPane>
                            <TabPane eventKey="amonestaciones">
                                {tabAmonestaciones}
                            </TabPane>
                            <TabPane eventKey="goles">
                                {tabGoles}
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
