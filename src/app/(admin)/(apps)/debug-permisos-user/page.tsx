'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Container, Card, Table, Alert, Badge } from 'react-bootstrap';
import PageBreadcrumb from '@/components/PageBreadcrumb';

export default function DebugPermisosPage() {
  const { data: session } = useSession();
  const [permisos, setPermisos] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user) {
      fetch('/api/debug/permisos-usuario')
        .then(res => res.json())
        .then(data => setPermisos(data))
        .catch(err => setError(err.message));
    }
  }, [session]);

  return (
    <Container fluid>
      <PageBreadcrumb title="Debug - Permisos del Usuario" subtitle="Debug" />

      <Card>
        <Card.Header>
          <h4>Información de Sesión</h4>
        </Card.Header>
        <Card.Body>
          {session?.user ? (
            <div>
              <p><strong>ID:</strong> {session.user.id}</p>
              <p><strong>Email:</strong> {session.user.email}</p>
              <p><strong>Nombre:</strong> {session.user.name}</p>
              <p><strong>Rol:</strong> <Badge bg="primary">{session.user.role}</Badge></p>
            </div>
          ) : (
            <Alert variant="warning">No hay sesión activa</Alert>
          )}
        </Card.Body>
      </Card>

      {error && <Alert variant="danger" className="mt-3">{error}</Alert>}

      {permisos && (
        <Card className="mt-3">
          <Card.Header>
            <h4>Permisos del Usuario</h4>
          </Card.Header>
          <Card.Body>
            <Table striped bordered>
              <thead>
                <tr>
                  <th>Recurso</th>
                  <th>Ver</th>
                  <th>Crear</th>
                  <th>Editar</th>
                  <th>Eliminar</th>
                </tr>
              </thead>
              <tbody>
                {permisos.permisos?.map((p: any) => (
                  <tr key={p.menuKey}>
                    <td><strong>{p.menuLabel}</strong> <small className="text-muted">({p.menuKey})</small></td>
                    <td>{p.puedeVer ? '✅' : '❌'}</td>
                    <td>{p.puedeCrear ? '✅' : '❌'}</td>
                    <td>{p.puedeEditar ? '✅' : '❌'}</td>
                    <td>{p.puedeEliminar ? '✅' : '❌'}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      )}
    </Container>
  );
}

