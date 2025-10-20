/**
 * Ejemplo de página protegida con autenticación
 * Solo usuarios autenticados pueden acceder
 */

import { requireAuth, requireRole } from '@/lib/auth-helpers';
import PageBreadcrumb from '@/components/PageBreadcrumb';

export default async function ProtectedPage() {
  // Requiere autenticación
  const user = await requireAuth();
  
  // O si necesitas un rol específico:
  // const user = await requireRole(['admin', 'arbitro']);

  return (
    <>
      <PageBreadcrumb 
        title="Página Protegida" 
        subtitle="Ejemplo" 
      />

      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-body">
              <h4 className="header-title">Ejemplo de Autenticación</h4>
              
              <div className="alert alert-success" role="alert">
                <h5 className="alert-heading">¡Bienvenido, {user.name}!</h5>
                <p>Has accedido exitosamente a esta página protegida.</p>
                <hr />
                <div className="mb-0">
                  <strong>Email:</strong> {user.email}<br />
                  <strong>Rol:</strong> {user.role}<br />
                  <strong>ID:</strong> {user.id}
                  {user.equipoId && (
                    <><br /><strong>Equipo ID:</strong> {user.equipoId}</>
                  )}
                </div>
              </div>

              <div className="mt-4">
                <h5>Características de Seguridad:</h5>
                <ul>
                  <li>✅ Requiere autenticación</li>
                  <li>✅ Redirige a login si no está autenticado</li>
                  <li>✅ Puede verificar roles específicos</li>
                  <li>✅ Server-side (seguro)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

