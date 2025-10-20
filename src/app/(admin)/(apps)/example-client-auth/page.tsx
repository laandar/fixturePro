/**
 * Ejemplo de componente cliente con autenticación
 */

'use client';

import { useAuth } from '@/hooks/useAuth';
import PageBreadcrumb from '@/components/PageBreadcrumb';
import { Card, Badge, Alert, Spinner } from 'react-bootstrap';

export default function ExampleClientAuthPage() {
  const { user, isLoading, isAuthenticated, isAdmin, isArbitro, hasRole } = useAuth();

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Alert variant="warning">
        Debes iniciar sesión para ver esta página.
      </Alert>
    );
  }

  return (
    <>
      <PageBreadcrumb 
        title="Autenticación en Cliente" 
        subtitle="Ejemplo" 
      />

      <div className="row">
        <div className="col-12">
          <Card>
            <Card.Body>
              <h4 className="header-title mb-3">Ejemplo de Client Component con Auth</h4>
              
              <div className="mb-4">
                <h5>Información del Usuario</h5>
                <table className="table table-sm">
                  <tbody>
                    <tr>
                      <th>Nombre:</th>
                      <td>{user?.name}</td>
                    </tr>
                    <tr>
                      <th>Email:</th>
                      <td>{user?.email}</td>
                    </tr>
                    <tr>
                      <th>Rol:</th>
                      <td>
                        <Badge bg={
                          user?.role === 'admin' ? 'danger' :
                          user?.role === 'arbitro' ? 'warning' :
                          user?.role === 'jugador' ? 'info' :
                          'secondary'
                        }>
                          {user?.role}
                        </Badge>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="mb-4">
                <h5>Verificación de Roles</h5>
                <ul className="list-unstyled">
                  <li>
                    {isAdmin() ? '✅' : '❌'} Es Administrador
                  </li>
                  <li>
                    {isArbitro() ? '✅' : '❌'} Es Árbitro
                  </li>
                  <li>
                    {hasRole(['admin', 'arbitro']) ? '✅' : '❌'} Es Admin o Árbitro
                  </li>
                  <li>
                    {hasRole('jugador') ? '✅' : '❌'} Es Jugador
                  </li>
                </ul>
              </div>

              <div>
                <h5>Renderizado Condicional por Rol</h5>
                
                {isAdmin() && (
                  <Alert variant="danger">
                    <strong>Panel de Administrador</strong><br />
                    Este contenido solo es visible para administradores.
                  </Alert>
                )}

                {isArbitro() && (
                  <Alert variant="warning">
                    <strong>Panel de Árbitro</strong><br />
                    Este contenido solo es visible para árbitros.
                  </Alert>
                )}

                {hasRole(['admin', 'arbitro']) && (
                  <Alert variant="info">
                    <strong>Acceso Especial</strong><br />
                    Este contenido es visible para admins y árbitros.
                  </Alert>
                )}

                {!hasRole(['admin', 'arbitro']) && (
                  <Alert variant="secondary">
                    <strong>Usuario Regular</strong><br />
                    No tienes permisos especiales.
                  </Alert>
                )}
              </div>
            </Card.Body>
          </Card>
        </div>
      </div>
    </>
  );
}

