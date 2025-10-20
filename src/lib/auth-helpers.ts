import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { currentUserTienePermiso } from '@/lib/permisos-helpers';

export type UserRole = 'admin' | 'arbitro' | 'jugador' | 'visitante';

/**
 * Obtiene la sesión actual del usuario
 * Úsala en Server Components o Server Actions
 */
export async function getCurrentUser() {
  const session = await auth();
  return session?.user;
}

/**
 * Requiere que el usuario esté autenticado
 * Redirige a login si no lo está
 */
export async function requireAuth() {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect('/auth-1/sign-in');
  }
  
  return user;
}

/**
 * Requiere que el usuario tenga un rol específico
 * Redirige a login si no está autenticado o a 403 si no tiene el rol
 */
export async function requireRole(roles: UserRole | UserRole[]) {
  const user = await requireAuth();
  
  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  
  if (!allowedRoles.includes(user.role)) {
    redirect('/error/403');
  }
  
  return user;
}

/**
 * Verifica si el usuario tiene un rol específico
 */
export async function hasRole(roles: UserRole | UserRole[]) {
  const user = await getCurrentUser();
  
  if (!user) return false;
  
  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  return allowedRoles.includes(user.role);
}

/**
 * Verifica si el usuario es administrador
 */
export async function isAdmin() {
  return await hasRole('admin');
}

/**
 * Requiere que el usuario sea administrador
 */
export async function requireAdmin() {
  return await requireRole('admin');
}

/**
 * Verifica si el usuario actual tiene un permiso específico sobre un recurso
 * @param menuKey - El key del menú/recurso (ej: 'entrenadores', 'equipos')
 * @param accion - La acción a verificar: 'ver', 'crear', 'editar', 'eliminar'
 * @returns true si tiene el permiso, false si no
 */
export async function tienePermiso(
  menuKey: string,
  accion: 'ver' | 'crear' | 'editar' | 'eliminar'
): Promise<boolean> {
  const user = await getCurrentUser();
  
  if (!user) return false;
  
  // Los admins tienen todos los permisos
  if (user.role === 'admin') return true;
  
  // Verificar permisos específicos para otros roles
  return await currentUserTienePermiso(menuKey, accion);
}

/**
 * Requiere que el usuario tenga un permiso específico
 * Lanza error si no tiene el permiso
 * @param menuKey - El key del menú/recurso (ej: 'entrenadores', 'equipos')
 * @param accion - La acción a verificar: 'ver', 'crear', 'editar', 'eliminar'
 */
export async function requirePermiso(
  menuKey: string,
  accion: 'ver' | 'crear' | 'editar' | 'eliminar'
) {
  const user = await requireAuth();
  
  // Los admins siempre pasan
  if (user.role === 'admin') return user;
  
  const tieneElPermiso = await currentUserTienePermiso(menuKey, accion);
  
  if (!tieneElPermiso) {
    throw new Error(
      `No tienes permiso para ${accion} en ${menuKey}. Contacta al administrador.`
    );
  }
  
  return user;
}

