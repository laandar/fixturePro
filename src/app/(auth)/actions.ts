'use server';

import { signIn, signOut } from '@/auth';
import { AuthError } from 'next-auth';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { users } from '@/db/schema';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';

export type AuthResult = {
  success: boolean;
  error?: string;
};

/**
 * Acción para iniciar sesión
 */
export async function loginAction(
  prevState: AuthResult | null,
  formData: FormData
): Promise<AuthResult> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const callbackUrl = formData.get('callbackUrl') as string;

  if (!email || !password) {
    return {
      success: false,
      error: 'Por favor ingresa email y contraseña',
    };
  }

  try {
    await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    // Si llega aquí, la autenticación fue exitosa
    redirect(callbackUrl || '/dashboard');
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return {
            success: false,
            error: 'Email o contraseña incorrectos',
          };
        default:
          return {
            success: false,
            error: 'Error al iniciar sesión',
          };
      }
    }
    // Si es un redirect, lo dejamos pasar
    throw error;
  }
}

/**
 * Acción para cerrar sesión
 */
export async function logoutAction() {
  await signOut({ redirectTo: '/auth-3/sign-in' });
}

/**
 * Acción para registrar un nuevo usuario
 */
export async function registerAction(
  prevState: AuthResult | null,
  formData: FormData
): Promise<AuthResult> {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirmPassword') as string;

  // Validaciones
  if (!name || !email || !password || !confirmPassword) {
    return {
      success: false,
      error: 'Todos los campos son requeridos',
    };
  }

  if (password !== confirmPassword) {
    return {
      success: false,
      error: 'Las contraseñas no coinciden',
    };
  }

  if (password.length < 6) {
    return {
      success: false,
      error: 'La contraseña debe tener al menos 6 caracteres',
    };
  }

  try {
    // Verificar si el usuario ya existe
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (existingUser) {
      return {
        success: false,
        error: 'El email ya está registrado',
      };
    }

    // Hashear contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear usuario
    await db.insert(users).values({
      name,
      email,
      password: hashedPassword,
      role: 'visitante', // Rol por defecto
    });

    // Iniciar sesión automáticamente después del registro
    await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    redirect('/dashboard');
  } catch (error) {
    console.error('Error al registrar usuario:', error);
    
    // Si es un redirect, lo dejamos pasar
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
      throw error;
    }
    
    return {
      success: false,
      error: 'Error al registrar el usuario',
    };
  }
}

