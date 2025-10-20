'use client';

import React, { useState, useEffect } from 'react';
import PageBreadcrumb from '@/components/PageBreadcrumb';
import { useAuth } from '@/hooks/useAuth';
import {
  Card,
  CardHeader,
  CardBody,
  Row,
  Col,
  Alert,
  Container,
  Table,
  Badge,
  Button,
} from 'react-bootstrap';
import { TbBug, TbEye, TbRefresh } from 'react-icons/tb';

interface UsuarioInfo {
  id: number;
  email: string;
  role: string;
  rolesEnDB: Array<{
    id: number;
    nombre: string;
    esRolPrincipal: boolean;
  }>;
  permisos: Array<{
    menuId: number;
    menuLabel: string;
    menuKey: string;
    menuUrl: string;
    puedeVer: boolean;
    puedeCrear: boolean;
    puedeEditar: boolean;
    puedeEliminar: boolean;
  }>;
}

export default function DebugPermisosPage() {
  const { user } = useAuth();
  const [usuarioInfo, setUsuarioInfo] = useState<UsuarioInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUsuarioInfo = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/debug/permisos', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (result.success) {
        setUsuarioInfo(result.data);
      } else {
        setError(result.error || 'Error al cargar información del usuario');
      }
    } catch (err: any) {
      setError(err.message || 'Error al cargar información');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsuarioInfo();
  }, []);

  const getBadgeVariant = (permiso: boolean) => {
    return permiso ? 'success' : 'secondary';
  };

  if (loading) {
    return (
      <Container>
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Cargando...</span>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <>
      <PageBreadcrumb title="Debug Permisos" subtitle="Herramientas de Desarrollo" />

      <Row>
        <Col xs={12}>
          {error && <Alert variant="danger" dismissible onClose={() => setError(null)}>{error}</Alert>}

          <Card>
            <CardHeader>
              <div className="d-flex align-items-center justify-content-between">
                <div className="d-flex align-items-center">
                  <TbBug className="me-2 fs-4" />
                  <div>
                    <h4 className="header-title mb-0">Debug de Permisos del Usuario</h4>
                    <p className="text-muted mb-0">
                      Información detallada sobre roles y permisos del usuario actual
                    </p>
                  </div>
                </div>
                <Button variant="outline-primary" size="sm" onClick={loadUsuarioInfo}>
                  <TbRefresh className="me-2" />
                  Actualizar
                </Button>
              </div>
            </CardHeader>
            <CardBody>
              {usuarioInfo && (
                <>
                  {/* Información del Usuario */}
                  <Row className="mb-4">
                    <Col md={6}>
                      <Card className="border">
                        <CardHeader className="py-2">
                          <h6 className="mb-0">👤 Información del Usuario</h6>
                        </CardHeader>
                        <CardBody className="py-2">
                          <p className="mb-1"><strong>ID:</strong> {usuarioInfo.id}</p>
                          <p className="mb-1"><strong>Email:</strong> {usuarioInfo.email}</p>
                          <p className="mb-0"><strong>Rol en sesión:</strong> 
                            <Badge bg="primary" className="ms-2">{usuarioInfo.role}</Badge>
                          </p>
                        </CardBody>
                      </Card>
                    </Col>
                    <Col md={6}>
                      <Card className="border">
                        <CardHeader className="py-2">
                          <h6 className="mb-0">🎭 Roles en roles_usuarios</h6>
                        </CardHeader>
                        <CardBody className="py-2">
                          {usuarioInfo.rolesEnDB.length > 0 ? (
                            <div>
                              {usuarioInfo.rolesEnDB.map((rol, index) => (
                                <Badge 
                                  key={index} 
                                  bg={rol.esRolPrincipal ? 'success' : 'secondary'} 
                                  className="me-1 mb-1"
                                >
                                  {rol.nombre} {rol.esRolPrincipal && '(Principal)'}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted">No hay roles asignados</span>
                          )}
                        </CardBody>
                      </Card>
                    </Col>
                  </Row>

                  {/* Análisis de Discrepancias */}
                  {usuarioInfo.rolesEnDB.length === 0 && (
                    <Alert variant="warning" className="mb-4">
                      <h6>⚠️ Problema Detectado</h6>
                      <p className="mb-0">
                        El usuario no tiene roles asignados en la tabla <code>roles_usuarios</code>. 
                        Esto significa que no verá ningún menú en el sidebar.
                      </p>
                    </Alert>
                  )}

                  {/* Tabla de Permisos */}
                  <Card className="border">
                    <CardHeader className="py-2">
                      <h6 className="mb-0">
                        <TbEye className="me-2" />
                        Permisos por Menú ({usuarioInfo.permisos.length} menús)
                      </h6>
                    </CardHeader>
                    <CardBody className="py-2">
                      <div className="table-responsive">
                        <Table striped bordered hover size="sm">
                          <thead>
                            <tr>
                              <th>Menú</th>
                              <th>Key</th>
                              <th>URL</th>
                              <th>Ver</th>
                              <th>Crear</th>
                              <th>Editar</th>
                              <th>Eliminar</th>
                            </tr>
                          </thead>
                          <tbody>
                            {usuarioInfo.permisos.map((permiso, index) => (
                              <tr key={index}>
                                <td>
                                  <strong>{permiso.menuLabel}</strong>
                                </td>
                                <td>
                                  <code>{permiso.menuKey}</code>
                                </td>
                                <td>
                                  {permiso.menuUrl ? (
                                    <code>{permiso.menuUrl}</code>
                                  ) : (
                                    <span className="text-muted">-</span>
                                  )}
                                </td>
                                <td className="text-center">
                                  <Badge bg={getBadgeVariant(permiso.puedeVer)}>
                                    {permiso.puedeVer ? '✓' : '✗'}
                                  </Badge>
                                </td>
                                <td className="text-center">
                                  <Badge bg={getBadgeVariant(permiso.puedeCrear)}>
                                    {permiso.puedeCrear ? '✓' : '✗'}
                                  </Badge>
                                </td>
                                <td className="text-center">
                                  <Badge bg={getBadgeVariant(permiso.puedeEditar)}>
                                    {permiso.puedeEditar ? '✓' : '✗'}
                                  </Badge>
                                </td>
                                <td className="text-center">
                                  <Badge bg={getBadgeVariant(permiso.puedeEliminar)}>
                                    {permiso.puedeEliminar ? '✓' : '✗'}
                                  </Badge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </Table>
                      </div>

                      {usuarioInfo.permisos.length === 0 && (
                        <Alert variant="info" className="mb-0">
                          <h6>ℹ️ Sin Permisos</h6>
                          <p className="mb-0">
                            El usuario no tiene permisos para ver ningún menú. 
                            Esto puede deberse a que no tiene roles asignados en <code>roles_usuarios</code>.
                          </p>
                        </Alert>
                      )}
                    </CardBody>
                  </Card>

                  {/* Recomendaciones */}
                  <Alert variant="info" className="mt-4">
                    <h6>💡 Recomendaciones</h6>
                    <ul className="mb-0">
                      <li>
                        <strong>Si no ves el menú "Vocalías":</strong> 
                        Necesitas tener rol <code>admin</code> o <code>arbitro</code> en <code>roles_usuarios</code>
                      </li>
                      <li>
                        <strong>Para ver todos los menús:</strong> 
                        Asigna el rol <code>admin</code> desde la página de usuarios
                      </li>
                      <li>
                        <strong>Para ver solo Vocalías:</strong> 
                        Asigna el rol <code>arbitro</code> desde la página de usuarios
                      </li>
                    </ul>
                  </Alert>
                </>
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>
    </>
  );
}
