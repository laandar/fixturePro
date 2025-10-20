'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import PageBreadcrumb from '@/components/PageBreadcrumb';
import DataTable from '@/components/table/DataTable';
import ConfirmationModal from '@/components/table/DeleteConfirmationModal';
import TablePagination from '@/components/table/TablePagination';
import { useAuth } from '@/hooks/useAuth';
import {
  ColumnFiltersState,
  createColumnHelper,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import {
  Button,
  Card,
  CardFooter,
  CardHeader,
  Col,
  Container,
  FloatingLabel,
  Form,
  FormControl,
  FormSelect,
  Offcanvas,
  OffcanvasBody,
  OffcanvasHeader,
  OffcanvasTitle,
  Row,
  Alert,
  Badge,
} from 'react-bootstrap';
import { LuSearch } from 'react-icons/lu';
import { TbEdit, TbPlus, TbTrash, TbUserPlus, TbKey } from 'react-icons/tb';
import {
  getUsuarios,
  createUsuario,
  updateUsuario,
  deleteUsuario,
  deleteMultipleUsuarios,
  cambiarRol,
  resetPassword,
  getRolesDisponibles,
} from './actions';

type Usuario = {
  id: number;
  name: string | null;
  email: string;
  role: 'admin' | 'arbitro' | 'jugador' | 'visitante';
  equipoId: number | null;
  createdAt: string | null;
};

const columnHelper = createColumnHelper<Usuario>();

export default function UsuariosPage() {
  const { isAdmin } = useAuth();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [rolesDisponibles, setRolesDisponibles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Estados del formulario
  const [showOffcanvas, setShowOffcanvas] = useState(false);
  const [editingUsuario, setEditingUsuario] = useState<Usuario | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'visitante' as 'admin' | 'arbitro' | 'jugador' | 'visitante',
    equipoId: '',
  });

  // Estados de la tabla
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = useState({});
  const [globalFilter, setGlobalFilter] = useState('');

  // Modal de confirmación
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [usuarioToDelete, setUsuarioToDelete] = useState<number | null>(null);

  // Cargar usuarios y roles
  const loadUsuarios = async () => {
    try {
      setLoading(true);
      const data = await getUsuarios();
      
      if (Array.isArray(data)) {
        setUsuarios(data as Usuario[]);
      } else {
        setUsuarios([]);
      }
    } catch (err: any) {
      setError(err.message || 'Error al cargar usuarios');
      setUsuarios([]);
    } finally {
      setLoading(false);
    }
  };

  const loadRoles = async () => {
    try {
      const roles = await getRolesDisponibles();
      setRolesDisponibles(roles);
    } catch (err: any) {
      console.error('Error al cargar roles:', err);
    }
  };

  useEffect(() => {
    loadUsuarios();
    loadRoles();
  }, []);

  // Handlers con useCallback
  const handleEdit = useCallback((usuario: Usuario) => {
    setEditingUsuario(usuario);
    setFormData({
      name: usuario.name || '',
      email: usuario.email,
      password: '', // No prellenar password
      role: usuario.role,
      equipoId: usuario.equipoId?.toString() || '',
    });
    setShowOffcanvas(true);
  }, []);

  const handleDeleteClick = useCallback((id: number) => {
    setUsuarioToDelete(id);
    setShowDeleteModal(true);
  }, []);

  // Columnas de la tabla con useMemo
  const columns = useMemo(() => [
    columnHelper.display({
      id: 'select',
      header: ({ table }) => (
        <input
          type="checkbox"
          className="form-check-input"
          checked={table.getIsAllRowsSelected()}
          onChange={table.getToggleAllRowsSelectedHandler()}
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          className="form-check-input"
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
        />
      ),
    }),
    columnHelper.accessor('name', {
      header: 'Nombre',
      cell: (info) => <strong>{info.getValue() || 'Sin nombre'}</strong>,
    }),
    columnHelper.accessor('email', {
      header: 'Email',
      cell: (info) => info.getValue(),
    }),
    columnHelper.accessor('role', {
      header: 'Rol',
      cell: (info) => {
        const role = info.getValue();
        if (!role) return <Badge bg="secondary">Sin rol</Badge>;
        
        const variants: Record<string, string> = {
          admin: 'danger',
          arbitro: 'warning',
          jugador: 'info',
          visitante: 'secondary',
        };
        const labels: Record<string, string> = {
          admin: 'Administrador',
          arbitro: 'Árbitro',
          jugador: 'Jugador',
          visitante: 'Visitante',
        };
        
        // Para roles dinámicos, usar el nombre con primera letra mayúscula
        const variant = variants[role] || 'primary';
        const label = labels[role] || (role.charAt(0).toUpperCase() + role.slice(1));
        
        return <Badge bg={variant}>{label}</Badge>;
      },
    }),
    columnHelper.accessor('createdAt', {
      header: 'Fecha de Registro',
      cell: (info) => {
        const dateString = info.getValue();
        if (!dateString) return '-';
        try {
          return new Date(dateString).toLocaleDateString('es-ES');
        } catch (e) {
          return '-';
        }
      },
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Acciones',
      cell: ({ row }) => (
        <div className="d-flex gap-2">
          <Button
            size="sm"
            variant="soft-primary"
            onClick={() => handleEdit(row.original)}
          >
            <TbEdit />
          </Button>
          <Button
            size="sm"
            variant="soft-danger"
            onClick={() => handleDeleteClick(row.original.id)}
          >
            <TbTrash />
          </Button>
        </div>
      ),
    }),
  ], [handleEdit, handleDeleteClick]);

  // Tabla
  const table = useReactTable({
    data: usuarios,
    columns,
    state: { sorting, columnFilters, rowSelection, globalFilter },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: 10 },
    },
  });

  const handleDeleteConfirm = async () => {
    if (!usuarioToDelete) return;

    try {
      await deleteUsuario(usuarioToDelete);
      setSuccess('Usuario eliminado exitosamente');
      await loadUsuarios();
      setShowDeleteModal(false);
      setUsuarioToDelete(null);
    } catch (err: any) {
      setError(err.message || 'Error al eliminar usuario');
    }
  };

  const handleDeleteMultiple = async () => {
    const selectedIds = table
      .getSelectedRowModel()
      .rows.map((row) => row.original.id);

    if (selectedIds.length === 0) return;

    try {
      await deleteMultipleUsuarios(selectedIds);
      setSuccess(`${selectedIds.length} usuarios eliminados`);
      await loadUsuarios();
      setRowSelection({});
    } catch (err: any) {
      setError(err.message || 'Error al eliminar usuarios');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      const form = new FormData();
      form.append('name', formData.name);
      form.append('email', formData.email);
      form.append('password', formData.password);
      form.append('role', formData.role);
      form.append('equipoId', formData.equipoId);

      if (editingUsuario) {
        await updateUsuario(editingUsuario.id, form);
        setSuccess('Usuario actualizado exitosamente');
      } else {
        await createUsuario(form);
        setSuccess('Usuario creado exitosamente');
      }

      await loadUsuarios();
      setShowOffcanvas(false);
      resetForm();
    } catch (err: any) {
      setError(err.message || 'Error al guardar usuario');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'visitante',
      equipoId: '',
    });
    setEditingUsuario(null);
  };

  const handleNewUser = () => {
    resetForm();
    setShowOffcanvas(true);
  };

  if (!isAdmin()) {
    return (
      <Container>
        <Alert variant="danger">
          No tienes permisos para acceder a esta página
        </Alert>
      </Container>
    );
  }

  return (
    <>
      <PageBreadcrumb title="Gestión de Usuarios" subtitle="Usuarios" />

      <Row>
        <Col xs={12}>
          <Card>
            <CardHeader className="d-flex justify-content-between align-items-center">
              <h4 className="header-title">Usuarios del Sistema</h4>
              <div className="d-flex gap-2">
                {Object.keys(rowSelection).length > 0 && (
                  <Button variant="danger" size="sm" onClick={handleDeleteMultiple}>
                    <TbTrash className="me-1" />
                    Eliminar Seleccionados ({Object.keys(rowSelection).length})
                  </Button>
                )}
                <Button variant="primary" size="sm" onClick={handleNewUser}>
                  <TbUserPlus className="me-1" />
                  Nuevo Usuario
                </Button>
              </div>
            </CardHeader>

            <Card.Body>
              {error && <Alert variant="danger" dismissible onClose={() => setError(null)}>{error}</Alert>}
              {success && <Alert variant="success" dismissible onClose={() => setSuccess(null)}>{success}</Alert>}

              <Row className="mb-3">
                <Col md={6}>
                  <div className="position-relative">
                    <FormControl
                      type="search"
                      placeholder="Buscar usuarios..."
                      value={globalFilter ?? ''}
                      onChange={(e) => setGlobalFilter(e.target.value)}
                      className="ps-5"
                    />
                    <LuSearch className="position-absolute top-50 start-0 translate-middle-y ms-3" />
                  </div>
                </Col>
              </Row>

              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Cargando...</span>
                  </div>
                </div>
              ) : (
                <DataTable table={table} />
              )}
            </Card.Body>

            <CardFooter>
              <TablePagination
                totalItems={table.getFilteredRowModel().rows.length}
                start={(table.getState().pagination.pageIndex * table.getState().pagination.pageSize) + 1}
                end={Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, table.getFilteredRowModel().rows.length)}
                itemsName="usuarios"
                showInfo
                previousPage={table.previousPage}
                canPreviousPage={table.getCanPreviousPage()}
                pageCount={table.getPageCount()}
                pageIndex={table.getState().pagination.pageIndex}
                setPageIndex={table.setPageIndex}
                nextPage={table.nextPage}
                canNextPage={table.getCanNextPage()}
              />
            </CardFooter>
          </Card>
        </Col>
      </Row>

      {/* Offcanvas para crear/editar */}
      <Offcanvas show={showOffcanvas} onHide={() => setShowOffcanvas(false)} placement="end">
        <OffcanvasHeader closeButton>
          <OffcanvasTitle>
            {editingUsuario ? 'Editar Usuario' : 'Nuevo Usuario'}
          </OffcanvasTitle>
        </OffcanvasHeader>
        <OffcanvasBody>
          <Form onSubmit={handleSubmit}>
            <FloatingLabel label="Nombre completo *" className="mb-3">
              <FormControl
                type="text"
                placeholder="Nombre"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </FloatingLabel>

            <FloatingLabel label="Email *" className="mb-3">
              <FormControl
                type="email"
                placeholder="Email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </FloatingLabel>

            <FloatingLabel 
              label={editingUsuario ? "Nueva contraseña (dejar vacío para no cambiar)" : "Contraseña *"} 
              className="mb-3"
            >
              <FormControl
                type="password"
                placeholder="Contraseña"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required={!editingUsuario}
                minLength={6}
              />
            </FloatingLabel>

            <FloatingLabel label="Rol *" className="mb-3">
              <FormSelect
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                required
              >
                {rolesDisponibles.length > 0 ? (
                  rolesDisponibles.map(rol => (
                    <option key={rol.id} value={rol.nombre}>
                      {rol.nombre.charAt(0).toUpperCase() + rol.nombre.slice(1)}
                      {rol.descripcion && ` - ${rol.descripcion}`}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="visitante">Visitante (Solo lectura)</option>
                    <option value="jugador">Jugador</option>
                    <option value="arbitro">Árbitro</option>
                    <option value="admin">Administrador</option>
                  </>
                )}
              </FormSelect>
            </FloatingLabel>

            {rolesDisponibles.length > 0 && (
              <div className="alert alert-info">
                <strong>Roles Disponibles:</strong>
                <ul className="mb-0 mt-2">
                  {rolesDisponibles.map(rol => (
                    <li key={rol.id}>
                      <strong>{rol.nombre.charAt(0).toUpperCase() + rol.nombre.slice(1)}:</strong> {rol.descripcion || 'Sin descripción'}
                    </li>
                  ))}
                </ul>
                <p className="mb-0 mt-2 text-muted">
                  <small>💡 Puedes crear más roles en /roles-permisos</small>
                </p>
              </div>
            )}

            <div className="d-grid gap-2">
              <Button type="submit" variant="primary">
                {editingUsuario ? 'Actualizar Usuario' : 'Crear Usuario'}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setShowOffcanvas(false)}>
                Cancelar
              </Button>
            </div>
          </Form>
        </OffcanvasBody>
      </Offcanvas>

      {/* Modal de confirmación */}
      <ConfirmationModal
        show={showDeleteModal}
        onHide={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
        modalTitle="Eliminar Usuario"
        message="¿Estás seguro de que deseas eliminar este usuario? Esta acción no se puede deshacer."
        variant="danger"
      />
    </>
  );
}

