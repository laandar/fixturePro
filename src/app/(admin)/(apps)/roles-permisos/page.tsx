'use client';

import React, { useEffect, useState } from 'react';
import PageBreadcrumb from '@/components/PageBreadcrumb';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardHeader,
  Row,
  Col,
  Alert,
  Table,
  Form,
  Badge,
  Button,
  Container,
  Tabs,
  Tab,
  Offcanvas,
  OffcanvasHeader,
  OffcanvasTitle,
  OffcanvasBody,
  FloatingLabel,
  FormControl,
  FormSelect,
} from 'react-bootstrap';
import { TbCheck, TbX, TbShieldLock, TbMenu2, TbPlus, TbEdit, TbTrash } from 'react-icons/tb';
import ConfirmationModal from '@/components/table/DeleteConfirmationModal';
import { getPermisosMatrix, setPermiso, createRol, updateRol, deleteRol } from './actions';

type Rol = {
  id: number;
  nombre: string;
  descripcion: string | null;
  nivel: number;
  activo: boolean;
};

type Menu = {
  id: number;
  key: string;
  label: string;
  url: string | null;
  parentId: number | null;
  esTitle: boolean;
  activo: boolean;
};

type Permiso = {
  id: number;
  rolId: number;
  menuId: number;
  puedeVer: boolean;
  puedeCrear: boolean;
  puedeEditar: boolean;
  puedeEliminar: boolean;
};

export default function RolesPermisosPage() {
  const { isAdmin } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [rolesData, setRolesData] = useState<Rol[]>([]);
  const [menusData, setMenusData] = useState<Menu[]>([]);
  const [permisosData, setPermisosData] = useState<Permiso[]>([]);
  
  // Estados para gestión de roles
  const [showRolOffcanvas, setShowRolOffcanvas] = useState(false);
  const [editingRol, setEditingRol] = useState<Rol | null>(null);
  const [rolForm, setRolForm] = useState({
    nombre: '',
    descripcion: '',
    nivel: '5',
  });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [rolToDelete, setRolToDelete] = useState<Rol | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await getPermisosMatrix();
      setRolesData(data.roles);
      setMenusData(data.menus.filter((m: Menu) => !m.esTitle && m.activo));
      setPermisosData(data.permisos);
    } catch (err: any) {
      setError(err.message || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const tienePermiso = (rolId: number, menuId: number, tipo: 'ver' | 'crear' | 'editar' | 'eliminar'): boolean => {
    const permiso = permisosData.find(p => p.rolId === rolId && p.menuId === menuId);
    if (!permiso) return false;
    
    if (tipo === 'ver') return permiso.puedeVer;
    if (tipo === 'crear') return permiso.puedeCrear;
    if (tipo === 'editar') return permiso.puedeEditar;
    if (tipo === 'eliminar') return permiso.puedeEliminar;
    return false;
  };

  const handleTogglePermiso = async (
    rolId: number,
    menuId: number,
    tipo: 'ver' | 'crear' | 'editar' | 'eliminar'
  ) => {
    try {
      const valorActual = tienePermiso(rolId, menuId, tipo);
      const nuevoValor = !valorActual;
      
      // Actualización optimista: cambiar inmediatamente en el estado local
      setPermisosData(prevPermisos => {
        const permisoExistente = prevPermisos.find(p => p.rolId === rolId && p.menuId === menuId);
        
        if (permisoExistente) {
          // Actualizar permiso existente
          return prevPermisos.map(p => 
            p.rolId === rolId && p.menuId === menuId 
              ? { ...p, [`puede${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`]: nuevoValor }
              : p
          );
        } else {
          // Crear nuevo permiso
          const nuevoPermiso = {
            id: Date.now(), // ID temporal
            rolId,
            menuId,
            puedeVer: tipo === 'ver' ? nuevoValor : false,
            puedeCrear: tipo === 'crear' ? nuevoValor : false,
            puedeEditar: tipo === 'editar' ? nuevoValor : false,
            puedeEliminar: tipo === 'eliminar' ? nuevoValor : false,
          };
          return [...prevPermisos, nuevoPermiso];
        }
      });
      
      // Llamar al servidor en segundo plano
      await setPermiso(rolId, menuId, tipo, nuevoValor);
      
      setSuccess(`✅ Permiso actualizado correctamente`);
      
      // Limpiar mensaje después de 2 segundos
      setTimeout(() => {
        setSuccess(null);
      }, 2000);
    } catch (err: any) {
      // En caso de error, revertir el cambio y recargar datos
      setError(err.message || 'Error al actualizar permiso');
      await loadData();
    }
  };

  const getRoleBadge = (nombre: string) => {
    const variants: Record<string, string> = {
      admin: 'danger',
      arbitro: 'warning',
      jugador: 'info',
      visitante: 'secondary',
    };
    return variants[nombre] || 'primary';
  };

  // Handlers para roles
  const handleNuevoRol = () => {
    setEditingRol(null);
    setRolForm({ nombre: '', descripcion: '', nivel: '5' });
    setShowRolOffcanvas(true);
  };

  const handleEditRol = (rol: Rol) => {
    setEditingRol(rol);
    setRolForm({
      nombre: rol.nombre,
      descripcion: rol.descripcion || '',
      nivel: rol.nivel.toString(),
    });
    setShowRolOffcanvas(true);
  };

  const handleDeleteRolClick = (rol: Rol) => {
    setRolToDelete(rol);
    setShowDeleteModal(true);
  };

  const handleDeleteRolConfirm = async () => {
    if (!rolToDelete) return;

    try {
      await deleteRol(rolToDelete.id);
      setSuccess('Rol eliminado exitosamente');
      await loadData();
      setShowDeleteModal(false);
      setRolToDelete(null);
    } catch (err: any) {
      setError(err.message || 'Error al eliminar rol');
      setShowDeleteModal(false);
    }
  };

  const handleSubmitRol = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const formData = new FormData();
      formData.append('nombre', rolForm.nombre);
      formData.append('descripcion', rolForm.descripcion);
      formData.append('nivel', rolForm.nivel);

      if (editingRol) {
        formData.append('activo', 'true');
        await updateRol(editingRol.id, formData);
        setSuccess('Rol actualizado exitosamente');
      } else {
        await createRol(formData);
        setSuccess('Rol creado exitosamente');
      }

      await loadData();
      setShowRolOffcanvas(false);
      setRolForm({ nombre: '', descripcion: '', nivel: '5' });
    } catch (err: any) {
      setError(err.message || 'Error al guardar rol');
    }
  };

  const handleRefreshSession = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/auth/refresh-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const result = await response.json();
      
      if (result.success) {
        setSuccess(`✅ Sesión actualizada. Nuevo rol: ${result.nuevoRol || result.rolActual}`);
        
        // Limpiar mensaje después de 3 segundos
        setTimeout(() => {
          setSuccess(null);
        }, 3000);
      } else {
        setError(result.error || 'Error al actualizar sesión');
      }
    } catch (err: any) {
      setError(err.message || 'Error al actualizar sesión');
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin()) {
    return (
      <Container>
        <Alert variant="danger">No tienes permisos para acceder a esta página</Alert>
      </Container>
    );
  }

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
      <PageBreadcrumb title="Roles y Permisos" subtitle="Administración" />

      <Row>
        <Col xs={12}>
          {error && <Alert variant="danger" dismissible onClose={() => setError(null)}>{error}</Alert>}
          {success && <Alert variant="success" dismissible onClose={() => setSuccess(null)}>{success}</Alert>}

          {/* Botón para refrescar sesión */}
          <div className="d-flex justify-content-end mb-3">
            <Button 
              variant="outline-primary" 
              size="sm" 
              onClick={handleRefreshSession}
              disabled={loading}
            >
              🔄 Refrescar Sesión
            </Button>
          </div>

          <Tabs defaultActiveKey="permisos" className="mb-3">
            {/* TAB 1: Matriz de Permisos */}
            <Tab eventKey="permisos" title={<><TbShieldLock className="me-2" />Matriz de Permisos</>}>
              <Card>
                <CardHeader>
                  <div>
                    <h4 className="header-title mb-0">
                      Permisos por Rol y Menú
                    </h4>
                    <p className="text-muted mb-0">
                      Click en cada permiso para activar/desactivar. 
                      <strong className="text-success"> Los cambios se aplican inmediatamente</strong> sin recargar la página.
                    </p>
                  </div>
                </CardHeader>
                <Card.Body>
                  <div className="table-responsive" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                    <Table bordered hover className="mb-0">
                      <thead 
                        className="table-light" 
                        style={{ 
                          position: 'sticky', 
                          top: 0, 
                          zIndex: 10,
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}
                      >
                        <tr style={{ backgroundColor: '#f8f9fa' }}>
                          <th style={{ 
                            width: '200px', 
                            position: 'sticky', 
                            top: 0,
                            backgroundColor: '#f8f9fa',
                            zIndex: 11
                          }}>
                            Menú / Recurso
                          </th>
                          {rolesData.map(rol => (
                            <th 
                              key={rol.id} 
                              className="text-center" 
                              colSpan={4}
                              style={{ 
                                position: 'sticky', 
                                top: 0,
                                backgroundColor: '#f8f9fa'
                              }}
                            >
                              <Badge bg={getRoleBadge(rol.nombre)} className="px-3 py-2">
                                {rol.nombre.toUpperCase()}
                              </Badge>
                            </th>
                          ))}
                        </tr>
                        <tr style={{ backgroundColor: '#f8f9fa' }}>
                          <th style={{ 
                            position: 'sticky', 
                            top: '52px',
                            backgroundColor: '#f8f9fa',
                            zIndex: 11
                          }}></th>
                          {rolesData.map(rol => (
                            <React.Fragment key={`headers-${rol.id}`}>
                              <th 
                                className="text-center bg-light-subtle" 
                                style={{ 
                                  fontSize: '11px', 
                                  width: '60px',
                                  position: 'sticky',
                                  top: '52px',
                                  backgroundColor: '#e9ecef'
                                }}
                              >
                                Ver
                              </th>
                              <th 
                                className="text-center bg-light-subtle" 
                                style={{ 
                                  fontSize: '11px', 
                                  width: '60px',
                                  position: 'sticky',
                                  top: '52px',
                                  backgroundColor: '#e9ecef'
                                }}
                              >
                                Crear
                              </th>
                              <th 
                                className="text-center bg-light-subtle" 
                                style={{ 
                                  fontSize: '11px', 
                                  width: '60px',
                                  position: 'sticky',
                                  top: '52px',
                                  backgroundColor: '#e9ecef'
                                }}
                              >
                                Editar
                              </th>
                              <th 
                                className="text-center bg-light-subtle" 
                                style={{ 
                                  fontSize: '11px', 
                                  width: '60px',
                                  position: 'sticky',
                                  top: '52px',
                                  backgroundColor: '#e9ecef'
                                }}
                              >
                                Eliminar
                              </th>
                            </React.Fragment>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {menusData.map(menu => (
                          <tr key={menu.id}>
                            <td style={{ backgroundColor: '#fff', fontWeight: 500 }}>
                              <strong>{menu.label}</strong>
                              {menu.url && <><br /><small className="text-muted">{menu.url}</small></>}
                            </td>
                            {rolesData.map(rol => (
                              <React.Fragment key={`permisos-${rol.id}-${menu.id}`}>
                                {/* Ver */}
                                <td className="text-center p-1">
                                  <div
                                    onClick={() => handleTogglePermiso(rol.id, menu.id, 'ver')}
                                    className="cursor-pointer p-2"
                                    style={{ cursor: 'pointer' }}
                                  >
                                    {tienePermiso(rol.id, menu.id, 'ver') ? (
                                      <TbCheck className="text-success fs-4" />
                                    ) : (
                                      <TbX className="text-muted fs-4 opacity-25" />
                                    )}
                                  </div>
                                </td>
                                {/* Crear */}
                                <td className="text-center p-1">
                                  <div
                                    onClick={() => handleTogglePermiso(rol.id, menu.id, 'crear')}
                                    className="cursor-pointer p-2"
                                    style={{ cursor: 'pointer' }}
                                  >
                                    {tienePermiso(rol.id, menu.id, 'crear') ? (
                                      <TbCheck className="text-primary fs-4" />
                                    ) : (
                                      <TbX className="text-muted fs-4 opacity-25" />
                                    )}
                                  </div>
                                </td>
                                {/* Editar */}
                                <td className="text-center p-1">
                                  <div
                                    onClick={() => handleTogglePermiso(rol.id, menu.id, 'editar')}
                                    className="cursor-pointer p-2"
                                    style={{ cursor: 'pointer' }}
                                  >
                                    {tienePermiso(rol.id, menu.id, 'editar') ? (
                                      <TbCheck className="text-warning fs-4" />
                                    ) : (
                                      <TbX className="text-muted fs-4 opacity-25" />
                                    )}
                                  </div>
                                </td>
                                {/* Eliminar */}
                                <td className="text-center p-1">
                                  <div
                                    onClick={() => handleTogglePermiso(rol.id, menu.id, 'eliminar')}
                                    className="cursor-pointer p-2"
                                    style={{ cursor: 'pointer' }}
                                  >
                                    {tienePermiso(rol.id, menu.id, 'eliminar') ? (
                                      <TbCheck className="text-danger fs-4" />
                                    ) : (
                                      <TbX className="text-muted fs-4 opacity-25" />
                                    )}
                                  </div>
                                </td>
                              </React.Fragment>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>

                  <div className="mt-3">
                    <Alert variant="info" className="mb-0">
                      <strong>Leyenda:</strong>
                      <ul className="mb-0 mt-2">
                        <li><TbCheck className="text-success" /> <strong>Ver:</strong> Puede ver el menú y acceder a la página</li>
                        <li><TbCheck className="text-primary" /> <strong>Crear:</strong> Puede crear nuevos registros</li>
                        <li><TbCheck className="text-warning" /> <strong>Editar:</strong> Puede modificar registros existentes</li>
                        <li><TbCheck className="text-danger" /> <strong>Eliminar:</strong> Puede eliminar registros</li>
                      </ul>
                    </Alert>
                  </div>
                </Card.Body>
              </Card>
            </Tab>

            {/* TAB 2: Gestión de Roles */}
            <Tab eventKey="roles" title={<><TbShieldLock className="me-2" />Roles</>}>
              <Card>
                <CardHeader className="d-flex justify-content-between align-items-center">
                  <div>
                    <h4 className="header-title mb-0">Roles del Sistema</h4>
                    <p className="text-muted mb-0">Gestiona los roles y sus niveles de acceso</p>
                  </div>
                  <Button variant="primary" size="sm" onClick={handleNuevoRol}>
                    <TbPlus className="me-1" />
                    Nuevo Rol
                  </Button>
                </CardHeader>
                <Card.Body>
                  <Table striped bordered hover>
                    <thead>
                      <tr>
                        <th>Nombre</th>
                        <th>Descripción</th>
                        <th style={{ width: '100px' }}>Nivel</th>
                        <th style={{ width: '100px' }}>Estado</th>
                        <th style={{ width: '120px' }}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rolesData.map(rol => (
                        <tr key={rol.id}>
                          <td>
                            <Badge bg={getRoleBadge(rol.nombre)} className="px-3 py-2">
                              {rol.nombre.toUpperCase()}
                            </Badge>
                          </td>
                          <td>{rol.descripcion || '-'}</td>
                          <td className="text-center">
                            <Badge bg="secondary">{rol.nivel}</Badge>
                          </td>
                          <td className="text-center">
                            {rol.activo ? (
                              <Badge bg="success">Activo</Badge>
                            ) : (
                              <Badge bg="secondary">Inactivo</Badge>
                            )}
                          </td>
                          <td>
                            <div className="d-flex gap-2">
                              <Button
                                size="sm"
                                variant="soft-primary"
                                onClick={() => handleEditRol(rol)}
                              >
                                <TbEdit />
                              </Button>
                              <Button
                                size="sm"
                                variant="soft-danger"
                                onClick={() => handleDeleteRolClick(rol)}
                                disabled={['admin', 'arbitro', 'jugador', 'visitante'].includes(rol.nombre)}
                              >
                                <TbTrash />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>

                  <Alert variant="info" className="mt-3 mb-0">
                    <strong>💡 Niveles de Jerarquía:</strong>
                    <ul className="mb-0 mt-2">
                      <li><strong>1:</strong> Nivel más alto (más permisos) - Ej: Admin</li>
                      <li><strong>2-3:</strong> Nivel medio - Ej: Árbitro, Jugador</li>
                      <li><strong>4+:</strong> Nivel bajo (menos permisos) - Ej: Visitante</li>
                    </ul>
                    <p className="mb-0 mt-2">
                      <strong>⚠️ Nota:</strong> Los roles del sistema base (admin, arbitro, jugador, visitante) no se pueden eliminar.
                    </p>
                  </Alert>
                </Card.Body>
              </Card>
            </Tab>

            {/* TAB 3: Gestión de Menús */}
            <Tab eventKey="menus" title={<><TbMenu2 className="me-2" />Menús</>}>
              <Card>
                <CardHeader>
                  <h4 className="header-title mb-0">Menús del Sistema</h4>
                </CardHeader>
                <Card.Body>
                  <Table striped bordered hover>
                    <thead>
                      <tr>
                        <th>Key</th>
                        <th>Label</th>
                        <th>URL</th>
                        <th>Orden</th>
                        <th>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {menusData.map(menu => (
                        <tr key={menu.id}>
                          <td><code>{menu.key}</code></td>
                          <td>{menu.label}</td>
                          <td>{menu.url || <span className="text-muted">-</span>}</td>
                          <td>{menu.parentId ? `  └─ ${menu.parentId}` : menu.id}</td>
                          <td>
                            {menu.activo ? (
                              <Badge bg="success">Activo</Badge>
                            ) : (
                              <Badge bg="secondary">Inactivo</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>
            </Tab>
          </Tabs>
        </Col>
      </Row>

      {/* Offcanvas para crear/editar roles */}
      <Offcanvas show={showRolOffcanvas} onHide={() => setShowRolOffcanvas(false)} placement="end">
        <OffcanvasHeader closeButton>
          <OffcanvasTitle>
            {editingRol ? 'Editar Rol' : 'Nuevo Rol'}
          </OffcanvasTitle>
        </OffcanvasHeader>
        <OffcanvasBody>
          <Form onSubmit={handleSubmitRol}>
            <FloatingLabel label="Nombre del Rol *" className="mb-3">
              <FormControl
                type="text"
                placeholder="Nombre"
                value={rolForm.nombre}
                onChange={(e) => setRolForm({ ...rolForm, nombre: e.target.value })}
                required
                disabled={!!editingRol} // No permitir cambiar nombre al editar
                pattern="[a-z_]+"
                title="Solo letras minúsculas y guiones bajos"
              />
              <small className="text-muted">
                Solo letras minúsculas y guiones bajos. Ej: entrenador, prensa_deportiva
              </small>
            </FloatingLabel>

            <FloatingLabel label="Descripción" className="mb-3">
              <FormControl
                as="textarea"
                placeholder="Descripción"
                value={rolForm.descripcion}
                onChange={(e) => setRolForm({ ...rolForm, descripcion: e.target.value })}
                style={{ height: '100px' }}
              />
            </FloatingLabel>

            <FloatingLabel label="Nivel de Jerarquía *" className="mb-3">
              <FormControl
                type="number"
                placeholder="Nivel"
                value={rolForm.nivel}
                onChange={(e) => setRolForm({ ...rolForm, nivel: e.target.value })}
                required
                min="1"
                max="99"
              />
              <small className="text-muted">
                1 = Mayor poder (admin), números mayores = menor poder
              </small>
            </FloatingLabel>

            <Alert variant="warning">
              <strong>⚠️ Importante:</strong>
              <ul className="mb-0 mt-2">
                <li>Después de crear el rol, ve a la pestaña "Matriz de Permisos"</li>
                <li>Asigna los permisos correspondientes al nuevo rol</li>
                <li>Los usuarios podrán tener este rol asignado desde /usuarios</li>
              </ul>
            </Alert>

            <div className="d-grid gap-2">
              <Button type="submit" variant="primary">
                {editingRol ? 'Actualizar Rol' : 'Crear Rol'}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setShowRolOffcanvas(false)}>
                Cancelar
              </Button>
            </div>
          </Form>
        </OffcanvasBody>
      </Offcanvas>

      {/* Modal de confirmación para eliminar rol */}
      <ConfirmationModal
        show={showDeleteModal}
        onHide={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteRolConfirm}
        modalTitle="Eliminar Rol"
        message={`¿Estás seguro de eliminar el rol "${rolToDelete?.nombre}"? Esto afectará a todos los usuarios que tengan este rol asignado.`}
        variant="danger"
        confirmButtonVariant="danger"
        confirmButtonText="Eliminar Rol"
      />
    </>
  );
}

  