-- Script para insertar las pantallas faltantes en la tabla menus
-- Ejecutar este script en la base de datos

-- ============================================================
-- 1. INSERTAR MENÚS FALTANTES
-- ============================================================

-- Ingreso de Jugadores (bajo Gestión Deportiva)
INSERT INTO menus (key, label, url, icon, parent_id, orden, es_title, activo)
VALUES (
  'ingreso-jugadores',
  'Calificación de Jugadores',
  '/ingreso-jugadores',
  NULL,
  (SELECT id FROM menus WHERE key = 'sports'),
  14.5,
  false,
  true
)
ON CONFLICT (key) DO NOTHING;

-- Asignar Equipos a Usuarios (bajo Administración - independiente)
INSERT INTO menus (key, label, url, icon, parent_id, orden, es_title, activo)
VALUES (
  'asignar-equipos-usuarios',
  'Asignar Equipos a Usuarios',
  '/asignar-equipos-usuarios',
  'TbUsers',
  NULL,
  21.5,
  false,
  true
)
ON CONFLICT (key) DO NOTHING;

-- Descargar PDFs Vocalía (bajo Gestión Deportiva)
INSERT INTO menus (key, label, url, icon, parent_id, orden, es_title, activo)
VALUES (
  'descargar-pdfs-vocalia',
  'Descargar PDFs Vocalía',
  '/descargar-pdfs-vocalia',
  NULL,
  (SELECT id FROM menus WHERE key = 'sports'),
  17.5,
  false,
  true
)
ON CONFLICT (key) DO NOTHING;

-- Contabilidad de Tarjetas (bajo Gestión Deportiva)
INSERT INTO menus (key, label, url, icon, parent_id, orden, es_title, activo)
VALUES (
  'contabilidad-tarjetas',
  'Contabilidad',
  '/contabilidad-tarjetas',
  NULL,
  (SELECT id FROM menus WHERE key = 'sports'),
  19,
  false,
  true
)
ON CONFLICT (key) DO NOTHING;

-- Fixture (bajo Gestión Deportiva)
INSERT INTO menus (key, label, url, icon, parent_id, orden, es_title, activo)
VALUES (
  'fixture',
  'Fixture',
  '/fixture',
  NULL,
  (SELECT id FROM menus WHERE key = 'sports'),
  20,
  false,
  true
)
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- 2. ASIGNAR PERMISOS A ROLES (roles_menus)
-- ============================================================

-- Permisos para ADMIN en todas las pantallas nuevas
INSERT INTO roles_menus (rol_id, menu_id, puede_ver, puede_crear, puede_editar, puede_eliminar)
SELECT 
  r.id,
  m.id,
  true,  -- puede_ver
  true,  -- puede_crear
  true,  -- puede_editar
  true   -- puede_eliminar
FROM roles r
CROSS JOIN menus m
WHERE r.nombre = 'admin'
  AND m.key IN ('ingreso-jugadores', 'asignar-equipos-usuarios', 'descargar-pdfs-vocalia', 'contabilidad-tarjetas', 'fixture')
ON CONFLICT (rol_id, menu_id) DO UPDATE SET
  puede_ver = EXCLUDED.puede_ver,
  puede_crear = EXCLUDED.puede_crear,
  puede_editar = EXCLUDED.puede_editar,
  puede_eliminar = EXCLUDED.puede_eliminar;

-- Permisos para ARBITRO en descargar-pdfs-vocalia (igual que gestion-jugadores)
INSERT INTO roles_menus (rol_id, menu_id, puede_ver, puede_crear, puede_editar, puede_eliminar)
SELECT 
  r.id,
  m.id,
  true,  -- puede_ver
  true,  -- puede_crear
  true,  -- puede_editar
  false  -- puede_eliminar
FROM roles r
CROSS JOIN menus m
WHERE r.nombre = 'arbitro'
  AND m.key = 'descargar-pdfs-vocalia'
ON CONFLICT (rol_id, menu_id) DO UPDATE SET
  puede_ver = EXCLUDED.puede_ver,
  puede_crear = EXCLUDED.puede_crear,
  puede_editar = EXCLUDED.puede_editar,
  puede_eliminar = EXCLUDED.puede_eliminar;

-- ============================================================
-- 3. VERIFICACIÓN (opcional - descomentar para verificar)
-- ============================================================

-- SELECT m.key, m.label, m.url, m.orden, 
--        CASE WHEN m.parent_id IS NULL THEN 'Raíz' ELSE pm.label END as padre
-- FROM menus m
-- LEFT JOIN menus pm ON m.parent_id = pm.id
-- WHERE m.key IN ('ingreso-jugadores', 'asignar-equipos-usuarios', 'descargar-pdfs-vocalia', 'contabilidad-tarjetas', 'fixture')
-- ORDER BY m.orden;

