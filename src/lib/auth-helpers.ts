import { auth } from '@/auth';
import { redirect } from 'next/navigation';

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

