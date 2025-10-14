import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      id: number;
      role: 'admin' | 'arbitro' | 'jugador' | 'visitante';
      equipoId: number | null;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }

  interface User {
    id: string;
    role: 'admin' | 'arbitro' | 'jugador' | 'visitante';
    equipoId: number | null;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: number;
    role?: 'admin' | 'arbitro' | 'jugador' | 'visitante';
    equipoId?: number | null;
  }
}

