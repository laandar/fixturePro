'use client';

import { useAuth } from '@/hooks/useAuth';
import { logoutAction } from '@/app/(auth)/actions';
import Image from 'next/image';
import Link from 'next/link';
import { Dropdown, DropdownDivider, DropdownItem, DropdownMenu, DropdownToggle, Badge } from 'react-bootstrap';
import { TbChevronDown, TbUserCircle, TbSettings2, TbLogout2 } from 'react-icons/tb';

import user2 from '@/assets/images/users/user-2.jpg';

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
      <div className="topbar-item nav-user">
        <div className="spinner-border spinner-border-sm" role="status">
          <span className="visually-hidden">Cargando...</span>
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
    <div className="topbar-item nav-user">
      <Dropdown align="end">
        <DropdownToggle as={'a'} className="topbar-link dropdown-toggle drop-arrow-none px-2 cursor-pointer">
          {user.image ? (
            <Image 
              src={user.image} 
              width="32" 
              height="32" 
              className="rounded-circle me-lg-2 d-flex" 
              alt="user-image" 
            />
          ) : (
            <div 
              className="rounded-circle me-lg-2 d-flex align-items-center justify-content-center bg-primary text-white"
              style={{ width: '32px', height: '32px', fontSize: '14px', fontWeight: 'bold' }}
            >
              {user.name?.charAt(0).toUpperCase() || 'U'}
            </div>
          )}
          <div className="d-lg-flex align-items-center gap-1 d-none">
            <h5 className="my-0">{user.name || 'Usuario'}</h5>
            <TbChevronDown className="align-middle" />
          </div>
        </DropdownToggle>
        <DropdownMenu className="dropdown-menu-end">
          {/* Header */}
          <div className="dropdown-header noti-title">
            <h6 className="text-overflow m-0">¡Bienvenido!</h6>
          </div>

          {/* User Info */}
          <div className="px-3 py-2">
            <div className="d-flex align-items-center mb-2">
              <strong className="me-2">{user.name}</strong>
              <Badge bg={getRoleBadge(user.role)}>
                {getRoleLabel(user.role)}
              </Badge>
            </div>
            <small className="text-muted">{user.email}</small>
          </div>

          <DropdownDivider />

          {/* Menu Items */}
          <DropdownItem as={Link} href="/perfil">
            <TbUserCircle className="me-2 fs-17 align-middle" />
            <span className="align-middle">Mi Perfil</span>
          </DropdownItem>

          <DropdownItem as={Link} href="/configuracion">
            <TbSettings2 className="me-2 fs-17 align-middle" />
            <span className="align-middle">Configuración</span>
          </DropdownItem>

          <DropdownDivider />

          {/* Logout */}
          <DropdownItem onClick={handleLogout} className="text-danger fw-semibold">
            <TbLogout2 className="me-2 fs-17 align-middle" />
            <span className="align-middle">Cerrar Sesión</span>
          </DropdownItem>
        </DropdownMenu>
      </Dropdown>
    </div>
  );
};

export default UserProfile;
