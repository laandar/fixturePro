import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
  pages: {
    signIn: '/auth-3/sign-in',
    signOut: '/auth-3/sign-out',
    error: '/error/401',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnAdmin = nextUrl.pathname.startsWith('/(admin)');
      const isOnAuth = nextUrl.pathname.startsWith('/auth-');
      
      if (isOnAdmin) {
        if (isLoggedIn) return true;
        return false; // Redirige a login
      } else if (isLoggedIn && isOnAuth) {
        return Response.redirect(new URL('/dashboard', nextUrl));
      }
      
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        const userId = typeof user.id === 'string' ? parseInt(user.id) : user.id;
        if (!isNaN(userId)) {
          token.id = userId;
        }
        token.role = user.role;
        token.equipoId = user.equipoId;
      }
      return token;
    },
    session({ session, token }) {
      if (token.id !== undefined && token.role) {
        // @ts-ignore - Custom user type extension
        session.user.id = token.id;
        // @ts-ignore - Custom user type extension
        session.user.role = token.role;
        // @ts-ignore - Custom user type extension
        session.user.equipoId = token.equipoId ?? null;
      }
      return session;
    },
  },
  providers: [], // Se configuran en auth.ts
} satisfies NextAuthConfig;

