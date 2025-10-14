'use client';

import { useSession } from 'next-auth/react';
import type { UserRole } from '@/lib/auth-helpers';

/**
 * Hook para usar en Client Components
 * Proporciona información de la sesión del usuario
 */
export function useAuth() {
  const { data: session, status } = useSession();
  
  const isLoading = status === 'loading';
  const isAuthenticated = status === 'authenticated';
  const user = session?.user;
  
  const hasRole = (roles: UserRole | UserRole[]) => {
    if (!user) return false;
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    return allowedRoles.includes(user.role);
  };
  
  const isAdmin = () => hasRole('admin');
  const isArbitro = () => hasRole('arbitro');
  const isJugador = () => hasRole('jugador');
  
  return {
    user,
    isLoading,
    isAuthenticated,
    hasRole,
    isAdmin,
    isArbitro,
    isJugador,
  };
}

