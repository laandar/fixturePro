'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { obtenerPermisosUsuario } from '@/app/(admin)/permisos-actions';

/**
 * Hook para verificar permisos del usuario actual en un recurso específico
 * @param menuKey - El key del menú/recurso (ej: 'entrenadores', 'equipos')
 */
export function usePermisos(menuKey: string) {
  const { data: session, status } = useSession();
  const [permisos, setPermisos] = useState({
    puedeVer: false,
    puedeCrear: false,
    puedeEditar: false,
    puedeEliminar: false,
    cargando: true,
  });

  useEffect(() => {
    const cargarPermisos = async () => {
      if (status === 'loading') return;
      
      if (!session?.user) {
        setPermisos({
          puedeVer: false,
          puedeCrear: false,
          puedeEditar: false,
          puedeEliminar: false,
          cargando: false,
        });
        return;
      }

      try {
        // Llamar a la server action para obtener permisos
        const permisosObtenidos = await obtenerPermisosUsuario(menuKey);

        setPermisos({
          ...permisosObtenidos,
          cargando: false,
        });
      } catch (error) {
        console.error('Error al cargar permisos:', error);
        setPermisos({
          puedeVer: false,
          puedeCrear: false,
          puedeEditar: false,
          puedeEliminar: false,
          cargando: false,
        });
      }
    };

    cargarPermisos();
  }, [menuKey, session, status]);

  return permisos;
}

