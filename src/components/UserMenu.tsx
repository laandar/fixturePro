'use client';

import { useAuth } from '@/hooks/useAuth';
import { logoutAction } from '@/app/(auth)/actions';
import { Dropdown } from 'react-bootstrap';
import Image from 'next/image';
import Link from 'next/link';

export function UserMenu() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="spinner-border spinner-border-sm" role="status" />;
  }

  if (!user) {
    return null;
  }

  const handleLogout = async () => {
    await logoutAction();
  };

  const getRoleBadge = (role: string) => {
    const badges = {
      admin: 'bg-danger',
      arbitro: 'bg-warning',
      jugador: 'bg-info',
      visitante: 'bg-secondary',
    };
    return badges[role as keyof typeof badges] || 'bg-secondary';
  };

  const getRoleLabel = (role: string) => {
    const labels = {
      admin: 'Administrador',
      arbitro: 'Árbitro',
      jugador: 'Jugador',
      visitante: 'Visitante',
    };
    return labels[role as keyof typeof labels] || 'Usuario';
  };

  return (
    <Dropdown align="end">
      <Dropdown.Toggle as="a" className="nav-link dropdown-toggle arrow-none nav-user" role="button">
        <span className="d-flex align-items-center">
          <span className="account-user-avatar">
            {user.image ? (
              <Image 
                src={user.image} 
                alt={user.name || 'Usuario'} 
                className="rounded-circle"
                width={32}
                height={32}
              />
            ) : (
              <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center" style={{ width: 32, height: 32 }}>
                {user.name?.charAt(0).toUpperCase() || 'U'}
              </div>
            )}
          </span>
          <span className="account-user-name ms-2">{user.name || 'Usuario'}</span>
          <span className={`badge ${getRoleBadge(user.role)} ms-2`}>
            {getRoleLabel(user.role)}
          </span>
        </span>
      </Dropdown.Toggle>

      <Dropdown.Menu className="dropdown-menu-end dropdown-menu-animated profile-dropdown">
        <div className="dropdown-header noti-title">
          <h6 className="text-overflow m-0">Bienvenido!</h6>
        </div>

        <Link href="/perfil" className="dropdown-item">
          <i className="mdi mdi-account-circle me-1"></i>
          <span>Mi Perfil</span>
        </Link>

        <Link href="/configuracion" className="dropdown-item">
          <i className="mdi mdi-cog me-1"></i>
          <span>Configuración</span>
        </Link>

        <Dropdown.Divider />

        <button onClick={handleLogout} className="dropdown-item">
          <i className="mdi mdi-logout me-1"></i>
          <span>Cerrar Sesión</span>
        </button>
      </Dropdown.Menu>
    </Dropdown>
  );
}

