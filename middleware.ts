import { auth } from '@/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  // Forzar HTTPS en producción
  if (process.env.NODE_ENV === 'production' && req.headers.get('x-forwarded-proto') !== 'https') {
    return NextResponse.redirect(`https://${req.headers.get('host')}${req.nextUrl.pathname}`, 301);
  }

  const isLoggedIn = !!req.auth;
  const pathname = req.nextUrl.pathname;
  
  // Rutas públicas que NO requieren autenticación
  const publicPaths = [
    '/auth-3',
    '/landing',
    '/estadisticas',
    '/api',
    '/_next',
    '/favicon.ico',
    '/uploads',
    '/iconpattern.png',
  ];
  
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path));
  const isOnAuth = pathname.startsWith('/auth-3');

  // Si no es una ruta pública y no está logueado, redirigir a login
  if (!isPublicPath && !isLoggedIn) {
    const loginUrl = new URL('/auth-3/sign-in', req.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return Response.redirect(loginUrl);
  }

  // Redirigir a dashboard si ya está autenticado y está en página de login
  if (isLoggedIn && isOnAuth) {
    return Response.redirect(new URL('/dashboard', req.url));
  }

  return undefined;
});

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};

