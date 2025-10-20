'use client';

import { useAuth } from '@/hooks/useAuth';
import { logoutAction } from '@/app/(auth)/actions';
import Link from 'next/link';
import { Dropdown, DropdownDivider, DropdownItem, DropdownMenu, DropdownToggle, Badge } from 'react-bootstrap';
import { TbSettings, TbUserCircle, TbLogout2 } from 'react-icons/tb';
import Image from 'next/image';

const UserProfile = () => {
  const { user, isLoading } = useAuth();

  const handleLogout = async () => {
    try {
      await logoutAction();
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="sidenav-user">
        <div className="text-center py-3">
          <div className="spinner-border spinner-border-sm" role="status">
            <span className="visually-hidden">Cargando...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const getRoleBadge = (role: string) => {
    const badges = {
      admin: 'danger',
      arbitro: 'warning',
      jugador: 'info',
      visitante: 'secondary',
    };
    return badges[role as keyof typeof badges] || 'primary'; // Roles personalizados en morado
  };

  const getRoleLabel = (role: string) => {
    const labels = {
      admin: 'Administrador',
      arbitro: 'Árbitro',
      jugador: 'Jugador',
      visitante: 'Visitante',
    };
    // Si no está en los labels, capitalizar el nombre del rol
    return labels[role as keyof typeof labels] || (role.charAt(0).toUpperCase() + role.slice(1));
  };

  return (
    <div className="sidenav-user">
      <div className="d-flex justify-content-between align-items-center">
        <div>
          <Link href="/perfil" className="link-reset">
            {user.image ? (
              <Image 
                src={user.image} 
                alt="user-image" 
                width="36" 
                height="36" 
                className="rounded-circle mb-2 avatar-md" 
              />
            ) : (
              <div 
                className="rounded-circle mb-2 d-flex align-items-center justify-content-center bg-primary text-white mx-auto"
                style={{ width: '36px', height: '36px', fontSize: '16px', fontWeight: 'bold' }}
              >
                {user.name?.charAt(0).toUpperCase() || 'U'}
              </div>
            )}
            <span className="sidenav-user-name fw-bold">{user.name || 'Usuario'}</span>
            <span className="fs-12 fw-semibold d-block mt-1">
              <Badge bg={getRoleBadge(user.role)} className="px-2">
                {getRoleLabel(user.role)}
              </Badge>
            </span>
          </Link>
        </div>
        <Dropdown>
          <DropdownToggle
            as={'a'}
            role="button"
            aria-label="profile dropdown"
            className="dropdown-toggle drop-arrow-none link-reset sidenav-user-set-icon cursor-pointer">
            <TbSettings className="fs-24 align-middle ms-1" />
          </DropdownToggle>

          <DropdownMenu>
            <div className="dropdown-header noti-title">
              <h6 className="text-overflow m-0">Configuración</h6>
            </div>

            <DropdownItem as={Link} href="/perfil">
              <TbUserCircle className="me-2 fs-17 align-middle" />
              <span className="align-middle">Mi Perfil</span>
            </DropdownItem>

            <DropdownDivider />

            <DropdownItem onClick={handleLogout} className="text-danger fw-semibold">
              <TbLogout2 className="me-2 fs-17 align-middle" />
              <span className="align-middle">Cerrar Sesión</span>
            </DropdownItem>
          </DropdownMenu>
        </Dropdown>
      </div>
    </div>
  );
};

export default UserProfile;
