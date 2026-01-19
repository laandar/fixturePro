'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import PageBreadcrumb from '@/components/PageBreadcrumb';
import DataTable from '@/components/table/DataTable';
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
  FormControl,
  FormSelect,
  Row,
  Alert,
  Badge,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalTitle,
} from 'react-bootstrap';
import { LuSearch } from 'react-icons/lu';
import { TbEdit, TbUsers } from 'react-icons/tb';
import {
  getUsuariosConEquipos,
  getEquiposDisponibles,
  asignarEquipoAUsuario,
  asignarEquiposMasivo,
} from './actions';

type UsuarioConEquipo = {
  id: number;
  name: string | null;
  email: string;
  role: 'admin' | 'arbitro' | 'jugador' | 'visitante';
  equipoId: number | null;
  equipoNombre: string | null;
  createdAt: string | null;
};

type Equipo = {
  id: number;
  nombre: string;
  estado: boolean;
};

const columnHelper = createColumnHelper<UsuarioConEquipo>();

export default function AsignarEquiposUsuariosPage() {
  const { isAdmin } = useAuth();
  const [usuarios, setUsuarios] = useState<UsuarioConEquipo[]>([]);
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Estados del modal de asignación
  const [showAsignarModal, setShowAsignarModal] = useState(false);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState<UsuarioConEquipo | null>(null);
  const [equipoSeleccionado, setEquipoSeleccionado] = useState<string>('');
  const [asignando, setAsignando] = useState(false);

  // Estados para asignación masiva
  const [showAsignarMasivoModal, setShowAsignarMasivoModal] = useState(false);
  const [equipoMasivo, setEquipoMasivo] = useState<string>('');

  // Estados de la tabla
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = useState({});
  const [globalFilter, setGlobalFilter] = useState('');

  // Cargar datos
  const loadData = async () => {
    try {
      setLoading(true);
      const [usuariosData, equiposData] = await Promise.all([
        getUsuariosConEquipos(),
        getEquiposDisponibles(),
      ]);
      
      if (Array.isArray(usuariosData)) {
        setUsuarios(usuariosData as UsuarioConEquipo[]);
      } else {
        setUsuarios([]);
      }
      
      if (Array.isArray(equiposData)) {
        setEquipos(equiposData as Equipo[]);
      } else {
        setEquipos([]);
      }
    } catch (err: any) {
      setError(err.message || 'Error al cargar datos');
      setUsuarios([]);
      setEquipos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handlers
  const handleAsignarEquipo = useCallback((usuario: UsuarioConEquipo) => {
    setUsuarioSeleccionado(usuario);
    setEquipoSeleccionado(usuario.equipoId?.toString() || '');
    setShowAsignarModal(true);
  }, []);

  const handleConfirmarAsignacion = async () => {
    if (!usuarioSeleccionado) return;

    try {
      setAsignando(true);
      setError(null);
      
      const equipoId = equipoSeleccionado === '' || equipoSeleccionado === '0' 
        ? null 
        : parseInt(equipoSeleccionado);
      
      await asignarEquipoAUsuario(usuarioSeleccionado.id, equipoId);
      setSuccess(equipoId ? 'Equipo asignado exitosamente' : 'Equipo removido exitosamente');
      setShowAsignarModal(false);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Error al asignar equipo');
    } finally {
      setAsignando(false);
    }
  };

  const handleAsignarMasivo = () => {
    const selectedIds = table
      .getSelectedRowModel()
      .rows.map((row) => row.original.id);

    if (selectedIds.length === 0) {
      setError('Por favor selecciona al menos un usuario');
      return;
    }

    setEquipoMasivo('');
    setShowAsignarMasivoModal(true);
  };

  const handleConfirmarAsignacionMasiva = async () => {
    const selectedIds = table
      .getSelectedRowModel()
      .rows.map((row) => row.original.id);

    if (selectedIds.length === 0) return;

    try {
      setAsignando(true);
      setError(null);
      
      const equipoId = equipoMasivo === '' || equipoMasivo === '0' 
        ? null 
        : parseInt(equipoMasivo);
      
      await asignarEquiposMasivo(selectedIds, equipoId);
      setSuccess(`Equipo ${equipoId ? 'asignado' : 'removido'} a ${selectedIds.length} usuarios exitosamente`);
      setShowAsignarMasivoModal(false);
      setRowSelection({});
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Error al asignar equipos');
    } finally {
      setAsignando(false);
    }
  };

  // Columnas de la tabla
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
        
        const variant = variants[role] || 'primary';
        const label = labels[role] || (role.charAt(0).toUpperCase() + role.slice(1));
        
        return <Badge bg={variant}>{label}</Badge>;
      },
    }),
    columnHelper.accessor('equipoNombre', {
      header: 'Equipo Asignado',
      cell: (info) => {
        const equipoNombre = info.getValue();
        return equipoNombre ? (
          <Badge bg="success">{equipoNombre}</Badge>
        ) : (
          <Badge bg="secondary">Sin equipo</Badge>
        );
      },
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Acciones',
      cell: ({ row }) => (
        <Button
          size="sm"
          variant="soft-primary"
          onClick={() => handleAsignarEquipo(row.original)}
        >
          <TbEdit className="me-1" />
          Asignar Equipo
        </Button>
      ),
    }),
  ], [handleAsignarEquipo]);

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
      <PageBreadcrumb title="Asignar Equipos a Usuarios" subtitle="Asignación de Equipos" />

      <Row>
        <Col xs={12}>
          <Card>
            <CardHeader className="d-flex justify-content-between align-items-center">
              <h4 className="header-title">
                <TbUsers className="me-2" />
                Asignación de Equipos a Usuarios
              </h4>
              <div className="d-flex gap-2">
                {Object.keys(rowSelection).length > 0 && (
                  <Button variant="primary" size="sm" onClick={handleAsignarMasivo}>
                    <TbUsers className="me-1" />
                    Asignar Equipo a Seleccionados ({Object.keys(rowSelection).length})
                  </Button>
                )}
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

      {/* Modal para asignar equipo a un usuario */}
      <Modal show={showAsignarModal} onHide={() => setShowAsignarModal(false)}>
        <ModalHeader closeButton>
          <ModalTitle>Asignar Equipo a Usuario</ModalTitle>
        </ModalHeader>
        <ModalBody>
          {usuarioSeleccionado && (
            <>
              <p>
                <strong>Usuario:</strong> {usuarioSeleccionado.name || usuarioSeleccionado.email}
              </p>
              <p>
                <strong>Email:</strong> {usuarioSeleccionado.email}
              </p>
              <p>
                <strong>Equipo actual:</strong>{' '}
                {usuarioSeleccionado.equipoNombre || 'Sin equipo asignado'}
              </p>
              
              <div className="mb-3">
                <label className="form-label">Seleccionar Equipo</label>
                <FormSelect
                  value={equipoSeleccionado}
                  onChange={(e) => setEquipoSeleccionado(e.target.value)}
                >
                  <option value="0">Sin equipo (Remover asignación)</option>
                  {equipos.map((equipo) => (
                    <option key={equipo.id} value={equipo.id}>
                      {equipo.nombre}
                    </option>
                  ))}
                </FormSelect>
              </div>
            </>
          )}
        </ModalBody>
        <ModalFooter>
          <Button
            variant="secondary"
            onClick={() => setShowAsignarModal(false)}
            disabled={asignando}
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirmarAsignacion}
            disabled={asignando}
          >
            {asignando ? 'Asignando...' : 'Confirmar Asignación'}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Modal para asignación masiva */}
      <Modal show={showAsignarMasivoModal} onHide={() => setShowAsignarMasivoModal(false)}>
        <ModalHeader closeButton>
          <ModalTitle>Asignar Equipo a Múltiples Usuarios</ModalTitle>
        </ModalHeader>
        <ModalBody>
          <p>
            Se asignará el equipo seleccionado a{' '}
            <strong>{Object.keys(rowSelection).length} usuario(s)</strong>.
          </p>
          
          <div className="mb-3">
            <label className="form-label">Seleccionar Equipo</label>
            <FormSelect
              value={equipoMasivo}
              onChange={(e) => setEquipoMasivo(e.target.value)}
            >
              <option value="0">Sin equipo (Remover asignación)</option>
              {equipos.map((equipo) => (
                <option key={equipo.id} value={equipo.id}>
                  {equipo.nombre}
                </option>
              ))}
            </FormSelect>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="secondary"
            onClick={() => setShowAsignarMasivoModal(false)}
            disabled={asignando}
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirmarAsignacionMasiva}
            disabled={asignando}
          >
            {asignando ? 'Asignando...' : 'Confirmar Asignación'}
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
}

