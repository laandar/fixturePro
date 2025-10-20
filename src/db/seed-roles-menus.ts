/**
 * Script para poblar las tablas de roles y menús con datos iniciales
 * Ejecutar con: npx tsx src/db/seed-roles-menus.ts
 */

import { db } from './index';
import { roles, menus, rolesMenus } from './schema';
import { eq } from 'drizzle-orm';

async function seedRolesYMenus() {
  console.log('🌱 Iniciando seed de roles y menús...\n');

  try {
    // ==================== ROLES ====================
    console.log('📋 1. Creando roles...');
    
    const rolesData = [
      { nombre: 'admin', descripcion: 'Administrador del sistema - Acceso total', nivel: 1 },
      { nombre: 'arbitro', descripcion: 'Árbitro/Vocal - Carga resultados de partidos', nivel: 2 },
      { nombre: 'jugador', descripcion: 'Jugador - Ve sus propias estadísticas', nivel: 3 },
      { nombre: 'visitante', descripcion: 'Visitante - Solo lectura pública', nivel: 4 },
    ];

    const rolesCreados = [];
    for (const rol of rolesData) {
      const existing = await db.query.roles.findFirst({
        where: eq(roles.nombre, rol.nombre),
      });

      if (existing) {
        console.log(`   ✓ Rol "${rol.nombre}" ya existe`);
        rolesCreados.push(existing);
      } else {
        const [nuevoRol] = await db.insert(roles).values(rol).returning();
        console.log(`   ✅ Rol "${rol.nombre}" creado`);
        rolesCreados.push(nuevoRol);
      }
    }

    // ==================== MENÚS ====================
    console.log('\n📋 2. Creando menús...');
    
    const menusData = [
      // Títulos
      { key: 'menu-title', label: 'Menu', esTitle: true, orden: 1 },
      { key: 'apps-title', label: 'Aplicaciones', esTitle: true, orden: 10 },
      { key: 'admin-title', label: 'Administración', esTitle: true, orden: 20 },
      
      // Menús principales
      { key: 'dashboard', label: 'Dashboard', url: '/dashboard', icon: 'TbLayoutDashboard', orden: 2 },
      { key: 'landing', label: 'Landing Page', url: '/landing', icon: 'TbStackFront', orden: 3 },
      { key: 'estadisticas', label: 'Estadísticas', url: '/estadisticas', icon: 'TbStar', orden: 4 },
      
      // Gestión Deportiva (padre)
      { key: 'sports', label: 'Gestión Deportiva', icon: 'TbTrophy', orden: 11 },
      
      // Hijos de Gestión Deportiva
      { key: 'equipos', label: 'Equipos', url: '/equipos', parentId: null, orden: 12 },
      { key: 'categorias', label: 'Categorías', url: '/categorias', parentId: null, orden: 13 },
      { key: 'jugadores', label: 'Jugadores', url: '/jugadores', parentId: null, orden: 14 },
      { key: 'entrenadores', label: 'Entrenadores', url: '/entrenadores', parentId: null, orden: 15 },
      { key: 'torneos', label: 'Torneos', url: '/torneos', parentId: null, orden: 16 },
      { key: 'gestion-jugadores', label: 'Vocalías', url: '/gestion-jugadores', parentId: null, orden: 17 },
      { key: 'canchas', label: 'Canchas', url: '/canchas', parentId: null, orden: 18 },
      
      // Administración
      { key: 'usuarios', label: 'Usuarios', url: '/usuarios', icon: 'TbUserCircle', orden: 21 },
      { key: 'configuraciones', label: 'Configuraciones', url: '/configuraciones', icon: 'TbAdjustments', orden: 22 },
      { key: 'roles-permisos', label: 'Roles y Permisos', url: '/roles-permisos', icon: 'TbShieldLock', orden: 23 },
    ];

    const menusCreados = [];
    for (const menu of menusData) {
      const existing = await db.query.menus.findFirst({
        where: eq(menus.key, menu.key),
      });

      if (existing) {
        console.log(`   ✓ Menú "${menu.label}" ya existe`);
        menusCreados.push(existing);
      } else {
        const [nuevoMenu] = await db.insert(menus).values(menu).returning();
        console.log(`   ✅ Menú "${menu.label}" creado`);
        menusCreados.push(nuevoMenu);
      }
    }

    // Actualizar parentId para menús hijos de "sports"
    console.log('\n📋 3. Configurando jerarquía de menús...');
    const sportsMenu = menusCreados.find(m => m.key === 'sports');
    if (sportsMenu) {
      const hijosDeportivos = ['equipos', 'categorias', 'jugadores', 'entrenadores', 'torneos', 'gestion-jugadores', 'canchas'];
      for (const hijoKey of hijosDeportivos) {
        await db.update(menus)
          .set({ parentId: sportsMenu.id })
          .where(eq(menus.key, hijoKey));
      }
      console.log('   ✅ Jerarquía de "Gestión Deportiva" configurada');
    }

    // ==================== PERMISOS (ROLES-MENUS) ====================
    console.log('\n📋 4. Asignando permisos a roles...');
    
    const adminRol = rolesCreados.find(r => r.nombre === 'admin')!;
    const arbitroRol = rolesCreados.find(r => r.nombre === 'arbitro')!;
    const jugadorRol = rolesCreados.find(r => r.nombre === 'jugador')!;
    const visitanteRol = rolesCreados.find(r => r.nombre === 'visitante')!;

    const permisosData = [
      // TODOS pueden ver dashboard, landing y estadísticas
      { rolId: adminRol.id, menuKey: 'dashboard', puedeVer: true },
      { rolId: arbitroRol.id, menuKey: 'dashboard', puedeVer: true },
      { rolId: jugadorRol.id, menuKey: 'dashboard', puedeVer: true },
      { rolId: visitanteRol.id, menuKey: 'dashboard', puedeVer: true },
      
      { rolId: adminRol.id, menuKey: 'landing', puedeVer: true },
      { rolId: arbitroRol.id, menuKey: 'landing', puedeVer: true },
      { rolId: jugadorRol.id, menuKey: 'landing', puedeVer: true },
      { rolId: visitanteRol.id, menuKey: 'landing', puedeVer: true },
      
      { rolId: adminRol.id, menuKey: 'estadisticas', puedeVer: true },
      { rolId: arbitroRol.id, menuKey: 'estadisticas', puedeVer: true },
      { rolId: jugadorRol.id, menuKey: 'estadisticas', puedeVer: true },
      { rolId: visitanteRol.id, menuKey: 'estadisticas', puedeVer: true },
      
      // Solo ADMIN y ARBITRO ven "Gestión Deportiva"
      { rolId: adminRol.id, menuKey: 'sports', puedeVer: true },
      { rolId: arbitroRol.id, menuKey: 'sports', puedeVer: true },
      
      // Solo ADMIN puede gestionar equipos, categorías, jugadores, entrenadores, torneos, canchas
      { rolId: adminRol.id, menuKey: 'equipos', puedeVer: true, puedeCrear: true, puedeEditar: true, puedeEliminar: true },
      { rolId: adminRol.id, menuKey: 'categorias', puedeVer: true, puedeCrear: true, puedeEditar: true, puedeEliminar: true },
      { rolId: adminRol.id, menuKey: 'jugadores', puedeVer: true, puedeCrear: true, puedeEditar: true, puedeEliminar: true },
      { rolId: adminRol.id, menuKey: 'entrenadores', puedeVer: true, puedeCrear: true, puedeEditar: true, puedeEliminar: true },
      { rolId: adminRol.id, menuKey: 'torneos', puedeVer: true, puedeCrear: true, puedeEditar: true, puedeEliminar: true },
      { rolId: adminRol.id, menuKey: 'canchas', puedeVer: true, puedeCrear: true, puedeEditar: true, puedeEliminar: true },
      
      // ADMIN y ARBITRO pueden acceder a Vocalías
      { rolId: adminRol.id, menuKey: 'gestion-jugadores', puedeVer: true, puedeCrear: true, puedeEditar: true },
      { rolId: arbitroRol.id, menuKey: 'gestion-jugadores', puedeVer: true, puedeCrear: true, puedeEditar: true },
      
      // Solo ADMIN puede ver administración
      { rolId: adminRol.id, menuKey: 'usuarios', puedeVer: true, puedeCrear: true, puedeEditar: true, puedeEliminar: true },
      { rolId: adminRol.id, menuKey: 'configuraciones', puedeVer: true, puedeCrear: true, puedeEditar: true },
      { rolId: adminRol.id, menuKey: 'roles-permisos', puedeVer: true, puedeCrear: true, puedeEditar: true },
    ];

    let permisosCreados = 0;
    for (const permiso of permisosData) {
      const menu = menusCreados.find(m => m.key === permiso.menuKey);
      if (!menu) continue;

      const existing = await db.query.rolesMenus.findFirst({
        where: (rolesMenus, { and, eq }) => 
          and(
            eq(rolesMenus.rolId, permiso.rolId),
            eq(rolesMenus.menuId, menu.id)
          ),
      });

      if (!existing) {
        await db.insert(rolesMenus).values({
          rolId: permiso.rolId,
          menuId: menu.id,
          puedeVer: permiso.puedeVer,
          puedeCrear: permiso.puedeCrear || false,
          puedeEditar: permiso.puedeEditar || false,
          puedeEliminar: permiso.puedeEliminar || false,
        });
        permisosCreados++;
      }
    }

    console.log(`   ✅ ${permisosCreados} permisos asignados`);

    // ==================== RESUMEN ====================
    console.log('\n' + '='.repeat(50));
    console.log('✅ SEED COMPLETADO');
    console.log('='.repeat(50));
    console.log(`\n📊 Resumen:`);
    console.log(`   • Roles creados: ${rolesData.length}`);
    console.log(`   • Menús creados: ${menusData.length}`);
    console.log(`   • Permisos asignados: ${permisosCreados}`);
    console.log('\n🎯 Próximos pasos:');
    console.log('   1. Migrar usuarios existentes: npm run migrate-users-to-roles');
    console.log('   2. Iniciar servidor: npm run dev');
    console.log('   3. Ir a /roles-permisos para gestionar permisos\n');

  } catch (error) {
    console.error('❌ Error al hacer seed:', error);
    process.exit(1);
  }
}

seedRolesYMenus();

