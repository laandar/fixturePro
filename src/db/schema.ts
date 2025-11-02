import { pgTable, serial, text, varchar, timestamp, boolean, integer, date, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Tabla de categorías
export const categorias = pgTable('categorias', {
  id: serial('id').primaryKey(),
  nombre: text('nombre').notNull(),
  estado: boolean('estado').default(true),
  usuario_id: integer('usuario_id'),
  // Rangos de edad para la categoría
  edad_minima_anos: integer('edad_minima_anos'), // Edad mínima en años
  edad_minima_meses: integer('edad_minima_meses').default(0), // Meses adicionales para edad mínima
  edad_maxima_anos: integer('edad_maxima_anos'), // Edad máxima en años
  edad_maxima_meses: integer('edad_maxima_meses').default(0), // Meses adicionales para edad máxima
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Tabla de entrenadores
export const entrenadores = pgTable('entrenadores', {
  id: serial('id').primaryKey(),
  nombre: text('nombre').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Tabla de equipos
export const equipos = pgTable('equipos', {
  id: serial('id').primaryKey(),
  nombre: text('nombre').notNull(),
  entrenador_id: integer('entrenador_id').references(() => entrenadores.id),
  imagen_equipo: text('imagen_equipo'),
  estado: boolean('estado').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Tabla de jugadores
export const jugadores = pgTable('jugadores', {
  id: varchar('id', { length: 255 }).primaryKey(), // ID como varchar
  cedula: varchar('cedula', { length: 20 }).notNull().unique(),
  apellido_nombre: text('apellido_nombre').notNull(),
  nacionalidad: text('nacionalidad').notNull(),
  liga: text('liga').notNull(),
  fecha_nacimiento: date('fecha_nacimiento'), // Fecha de nacimiento del jugador
  foto: text('foto'), // Campo para almacenar la URL o ruta de la foto
  sexo: text('sexo', { enum: ['masculino', 'femenino', 'otro'] }), // Sexo del jugador
  numero_jugador: integer('numero_jugador'), // Número de camiseta del jugador
  telefono: text('telefono'), // Teléfono de contacto
  provincia: text('provincia'), // Provincia de residencia
  direccion: text('direccion'), // Dirección de residencia
  observacion: text('observacion'), // Observaciones del jugador
  foraneo: boolean('foraneo').default(false), // Indica si es jugador foráneo
  estado: boolean('estado').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Tabla intermedia para relación muchos a muchos entre equipos y categorías
export const equipoCategoria = pgTable('equipo_categoria', {
  id: serial('id').primaryKey(),
  equipo_id: integer('equipo_id').references(() => equipos.id).notNull(),
  categoria_id: integer('categoria_id').references(() => categorias.id).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  uniqueEquipoCategoria: uniqueIndex('unique_equipo_categoria').on(table.equipo_id, table.categoria_id),
}));

// Tabla intermedia para relación muchos a muchos entre jugadores y equipo-categoría
export const jugadorEquipoCategoria = pgTable('jugador_equipo_categoria', {
  id: serial('id').primaryKey(),
  jugador_id: varchar('jugador_id', { length: 255 }).references(() => jugadores.id).notNull(),
  equipo_categoria_id: integer('equipo_categoria_id').references(() => equipoCategoria.id).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  uniqueJugadorEquipoCategoria: uniqueIndex('unique_jugador_equipo_categoria').on(table.jugador_id, table.equipo_categoria_id),
}));

// Tabla de torneos
export const torneos = pgTable('torneos', {
  id: serial('id').primaryKey(),
  nombre: text('nombre').notNull(),
  descripcion: text('descripcion'),
  categoria_id: integer('categoria_id').references(() => categorias.id),
  fecha_inicio: date('fecha_inicio').notNull(),
  fecha_fin: date('fecha_fin').notNull(),
  estado: text('estado').default('planificado'), // planificado, en_curso, finalizado, cancelado
  tipo_torneo: text('tipo_torneo').default('liga'), // liga, eliminacion, grupos
  permite_revancha: boolean('permite_revancha').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Tabla de equipos participantes en torneos
export const equiposTorneo = pgTable('equipos_torneo', {
  id: serial('id').primaryKey(),
  torneo_id: integer('torneo_id').references(() => torneos.id).notNull(),
  equipo_id: integer('equipo_id').references(() => equipos.id).notNull(),
  grupo: text('grupo'), // Para torneos por grupos
  posicion: integer('posicion'), // Posición en el grupo o tabla general
  puntos: integer('puntos').default(0),
  partidos_jugados: integer('partidos_jugados').default(0),
  partidos_ganados: integer('partidos_ganados').default(0),
  partidos_empatados: integer('partidos_empatados').default(0),
  partidos_perdidos: integer('partidos_perdidos').default(0),
  goles_favor: integer('goles_favor').default(0),
  goles_contra: integer('goles_contra').default(0),
  diferencia_goles: integer('diferencia_goles').default(0),
  estado: text('estado').default('activo'), // activo, eliminado, descalificado
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Tabla de horarios
export const horarios = pgTable('horarios', {
  id: serial('id').primaryKey(),
  hora_inicio: text('hora_inicio').notNull(), // Formato HH:MM (24h)
  color: text('color').default('#007bff'), // Color para identificar el horario
  orden: integer('orden').default(0), // Orden de aparición
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Tabla de encuentros/partidos
export const encuentros = pgTable('encuentros', {
  id: serial('id').primaryKey(),
  torneo_id: integer('torneo_id').references(() => torneos.id).notNull(),
  equipo_local_id: integer('equipo_local_id').references(() => equipos.id).notNull(),
  equipo_visitante_id: integer('equipo_visitante_id').references(() => equipos.id).notNull(),
  horario_id: integer('horario_id').references(() => horarios.id), // Referencia al horario asignado
  fecha_programada: timestamp('fecha_programada'),
  fecha_jugada: timestamp('fecha_jugada'),
  cancha: text('cancha'),
  arbitro: text('arbitro'),
  estado: text('estado').default('programado'), // programado, en_curso, finalizado, cancelado, aplazado
  goles_local: integer('goles_local'),
  goles_visitante: integer('goles_visitante'),
  tiempo_extra: boolean('tiempo_extra').default(false),
  penales_local: integer('penales_local'),
  penales_visitante: integer('penales_visitante'),
  observaciones: text('observaciones'),
  jornada: integer('jornada'), // Número de jornada/fecha
  fase: text('fase').default('regular'), // regular, octavos, cuartos, semifinal, final
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Tabla para guardar el historial de equipos que descansan por jornada
export const equiposDescansan = pgTable('equipos_descansan', {
  id: serial('id').primaryKey(),
  torneo_id: integer('torneo_id').references(() => torneos.id).notNull(),
  equipo_id: integer('equipo_id').references(() => equipos.id).notNull(),
  jornada: integer('jornada').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Tabla de canchas
export const canchas = pgTable('canchas', {
  id: serial('id').primaryKey(),
  nombre: text('nombre').notNull(),
  ubicacion: text('ubicacion'),
  tipo: text('tipo'), // futbol, futsal, basquet, tenis, voley, otro
  capacidad: integer('capacidad'),
  descripcion: text('descripcion'),
  estado: boolean('estado').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Tabla intermedia para relación muchos a muchos entre canchas y categorías
export const canchasCategorias = pgTable('canchas_categorias', {
  id: serial('id').primaryKey(),
  cancha_id: integer('cancha_id').references(() => canchas.id).notNull(),
  categoria_id: integer('categoria_id').references(() => categorias.id).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  uniqueCanchaCategoria: uniqueIndex('unique_cancha_categoria').on(table.cancha_id, table.categoria_id),
}));

// Relaciones
export const categoriasRelations = relations(categorias, ({ many }) => ({
  equiposCategoria: many(equipoCategoria),
  canchasCategorias: many(canchasCategorias),
}));

export const entrenadoresRelations = relations(entrenadores, ({ many }) => ({
  equipos: many(equipos),
}));

export const jugadoresRelations = relations(jugadores, ({ many }) => ({
  jugadoresEquipoCategoria: many(jugadorEquipoCategoria),
}));

// Relaciones para torneos
export const torneosRelations = relations(torneos, ({ one, many }) => ({
  categoria: one(categorias, {
    fields: [torneos.categoria_id],
    references: [categorias.id],
  }),
  equiposTorneo: many(equiposTorneo),
  encuentros: many(encuentros),
  equiposDescansan: many(equiposDescansan),
}));

export const equiposTorneoRelations = relations(equiposTorneo, ({ one }) => ({
  torneo: one(torneos, {
    fields: [equiposTorneo.torneo_id],
    references: [torneos.id],
  }),
  equipo: one(equipos, {
    fields: [equiposTorneo.equipo_id],
    references: [equipos.id],
  }),
}));

export const encuentrosRelations = relations(encuentros, ({ one, many }) => ({
  torneo: one(torneos, {
    fields: [encuentros.torneo_id],
    references: [torneos.id],
  }),
  equipoLocal: one(equipos, {
    fields: [encuentros.equipo_local_id],
    references: [equipos.id],
  }),
  equipoVisitante: one(equipos, {
    fields: [encuentros.equipo_visitante_id],
    references: [equipos.id],
  }),
  horario: one(horarios, {
    fields: [encuentros.horario_id],
    references: [horarios.id],
  }),
  goles: many(goles),
  tarjetas: many(tarjetas),
  cambiosJugadores: many(cambiosJugadores),
}));

// Relaciones para equipos que descansan
export const equiposDescansanRelations = relations(equiposDescansan, ({ one }) => ({
  torneo: one(torneos, {
    fields: [equiposDescansan.torneo_id],
    references: [torneos.id],
  }),
  equipo: one(equipos, {
    fields: [equiposDescansan.equipo_id],
    references: [equipos.id],
  }),
}));

// Relaciones adicionales para equipos
export const equiposRelations = relations(equipos, ({ one, many }) => ({
  entrenador: one(entrenadores, {
    fields: [equipos.entrenador_id],
    references: [entrenadores.id],
  }),
  equiposCategoria: many(equipoCategoria),
  equiposTorneo: many(equiposTorneo),
  encuentrosLocal: many(encuentros, { relationName: 'equipoLocal' }),
  encuentrosVisitante: many(encuentros, { relationName: 'equipoVisitante' }),
}));

// Relaciones para canchas
export const canchasRelations = relations(canchas, ({ many }) => ({
  canchasCategorias: many(canchasCategorias),
}));

// Relaciones para la tabla intermedia
export const canchasCategoriasRelations = relations(canchasCategorias, ({ one }) => ({
  cancha: one(canchas, {
    fields: [canchasCategorias.cancha_id],
    references: [canchas.id],
  }),
  categoria: one(categorias, {
    fields: [canchasCategorias.categoria_id],
    references: [categorias.id],
  }),
}));

// Relaciones para equipo_categoria
export const equipoCategoriaRelations = relations(equipoCategoria, ({ one, many }) => ({
  equipo: one(equipos, {
    fields: [equipoCategoria.equipo_id],
    references: [equipos.id],
  }),
  categoria: one(categorias, {
    fields: [equipoCategoria.categoria_id],
    references: [categorias.id],
  }),
  jugadoresEquipoCategoria: many(jugadorEquipoCategoria),
}));

// Relaciones para jugador_equipo_categoria
export const jugadorEquipoCategoriaRelations = relations(jugadorEquipoCategoria, ({ one }) => ({
  jugador: one(jugadores, {
    fields: [jugadorEquipoCategoria.jugador_id],
    references: [jugadores.id],
  }),
  equipoCategoria: one(equipoCategoria, {
    fields: [jugadorEquipoCategoria.equipo_categoria_id],
    references: [equipoCategoria.id],
  }),
}));

// Tabla de goles
export const goles = pgTable('goles', {
  id: serial('id').primaryKey(),
  encuentro_id: integer('encuentro_id').references(() => encuentros.id).notNull(),
  jugador_id: varchar('jugador_id', { length: 255 }).references(() => jugadores.id).notNull(),
  equipo_id: integer('equipo_id').references(() => equipos.id).notNull(),
  minuto: integer('minuto').notNull(),
  tiempo: text('tiempo', { enum: ['primer', 'segundo'] }).notNull(),
  tipo: text('tipo', { enum: ['gol', 'penal', 'autogol'] }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Relaciones para horarios
export const horariosRelations = relations(horarios, ({ many }) => ({
  encuentros: many(encuentros),
}));

// Tabla de tarjetas
export const tarjetas = pgTable('tarjetas', {
  id: serial('id').primaryKey(),
  encuentro_id: integer('encuentro_id').references(() => encuentros.id).notNull(),
  jugador_id: varchar('jugador_id', { length: 255 }).references(() => jugadores.id).notNull(),
  equipo_id: integer('equipo_id').references(() => equipos.id).notNull(),
  tipo: text('tipo', { enum: ['amarilla', 'roja'] }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Relaciones para goles
export const golesRelations = relations(goles, ({ one }) => ({
  encuentro: one(encuentros, {
    fields: [goles.encuentro_id],
    references: [encuentros.id],
  }),
  jugador: one(jugadores, {
    fields: [goles.jugador_id],
    references: [jugadores.id],
  }),
  equipo: one(equipos, {
    fields: [goles.equipo_id],
    references: [equipos.id],
  }),
}));

// Tabla de jugadores participantes en encuentros
export const jugadoresParticipantes = pgTable('jugadores_participantes', {
  id: serial('id').primaryKey(),
  encuentro_id: integer('encuentro_id').references(() => encuentros.id).notNull(),
  jugador_id: varchar('jugador_id', { length: 255 }).references(() => jugadores.id).notNull(),
  equipo_tipo: text('equipo_tipo', { enum: ['local', 'visitante'] }).notNull(),
  es_capitan: boolean('es_capitan').default(false), // Indica si el jugador es capitán del equipo
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Relaciones para tarjetas
export const tarjetasRelations = relations(tarjetas, ({ one }) => ({
  encuentro: one(encuentros, {
    fields: [tarjetas.encuentro_id],
    references: [encuentros.id],
  }),
  jugador: one(jugadores, {
    fields: [tarjetas.jugador_id],
    references: [jugadores.id],
  }),
  equipo: one(equipos, {
    fields: [tarjetas.equipo_id],
    references: [equipos.id],
  }),
}));

// Tabla de cambios de jugadores
export const cambiosJugadores = pgTable('cambios_jugadores', {
  id: serial('id').primaryKey(),
  encuentro_id: integer('encuentro_id').references(() => encuentros.id).notNull(),
  jugador_sale_id: varchar('jugador_sale_id', { length: 255 }).references(() => jugadores.id).notNull(),
  jugador_entra_id: varchar('jugador_entra_id', { length: 255 }).references(() => jugadores.id).notNull(),
  equipo_id: integer('equipo_id').references(() => equipos.id).notNull(),
  minuto: integer('minuto').notNull(),
  tiempo: text('tiempo', { enum: ['primer', 'segundo'] }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Relaciones para jugadores participantes
export const jugadoresParticipantesRelations = relations(jugadoresParticipantes, ({ one }) => ({
  encuentro: one(encuentros, {
    fields: [jugadoresParticipantes.encuentro_id],
    references: [encuentros.id],
  }),
  jugador: one(jugadores, {
    fields: [jugadoresParticipantes.jugador_id],
    references: [jugadores.id],
  }),
}));

// Relaciones para cambios de jugadores
export const cambiosJugadoresRelations = relations(cambiosJugadores, ({ one }) => ({
  encuentro: one(encuentros, {
    fields: [cambiosJugadores.encuentro_id],
    references: [encuentros.id],
  }),
  jugadorSale: one(jugadores, {
    fields: [cambiosJugadores.jugador_sale_id],
    references: [jugadores.id],
    relationName: 'jugadorSale',
  }),
  jugadorEntra: one(jugadores, {
    fields: [cambiosJugadores.jugador_entra_id],
    references: [jugadores.id],
    relationName: 'jugadorEntra',
  }),
  equipo: one(equipos, {
    fields: [cambiosJugadores.equipo_id],
    references: [equipos.id],
  }),
}));

// Tabla de firmas de encuentros
export const firmasEncuentros = pgTable('firmas_encuentros', {
  id: serial('id').primaryKey(),
  encuentro_id: integer('encuentro_id').references(() => encuentros.id).notNull().unique(),
  vocal_nombre: text('vocal_nombre'),
  vocal_firma: text('vocal_firma'), // Base64 de la imagen de la firma
  vocal_informe: text('vocal_informe'), // Informe del vocal
  arbitro_nombre: text('arbitro_nombre'),
  arbitro_firma: text('arbitro_firma'), // Base64 de la imagen de la firma
  arbitro_informe: text('arbitro_informe'), // Informe del árbitro
  capitan_local_nombre: text('capitan_local_nombre'),
  capitan_local_firma: text('capitan_local_firma'), // Base64 de la imagen de la firma
  capitan_visitante_nombre: text('capitan_visitante_nombre'),
  capitan_visitante_firma: text('capitan_visitante_firma'), // Base64 de la imagen de la firma
  fecha_firma: timestamp('fecha_firma'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Relaciones para firmas de encuentros
export const firmasEncuentrosRelations = relations(firmasEncuentros, ({ one }) => ({
  encuentro: one(encuentros, {
    fields: [firmasEncuentros.encuentro_id],
    references: [encuentros.id],
  }),
}));

// Tabla de pagos/abonos de multas (tarjetas)
export const pagosMultas = pgTable('pagos_multas', {
  id: serial('id').primaryKey(),
  torneo_id: integer('torneo_id').references(() => torneos.id).notNull(),
  equipo_id: integer('equipo_id').references(() => equipos.id).notNull(),
  jornada: integer('jornada'), // Jornada a la que se aplica el pago (opcional)
  monto_centavos: integer('monto_centavos').notNull(), // Monto en centavos para evitar problemas de redondeo
  descripcion: text('descripcion'),
  referencia: text('referencia'),
  anulado: boolean('anulado').default(false),
  motivo_anulacion: text('motivo_anulacion'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const pagosMultasRelations = relations(pagosMultas, ({ one }) => ({
  torneo: one(torneos, {
    fields: [pagosMultas.torneo_id],
    references: [torneos.id],
  }),
  equipo: one(equipos, {
    fields: [pagosMultas.equipo_id],
    references: [equipos.id],
  }),
}));

// Tabla de cargos manuales (ajustes) a aplicar en una jornada específica
export const cargosManuales = pgTable('cargos_manuales', {
  id: serial('id').primaryKey(),
  torneo_id: integer('torneo_id').references(() => torneos.id).notNull(),
  equipo_id: integer('equipo_id').references(() => equipos.id).notNull(),
  jornada_aplicacion: integer('jornada_aplicacion'),
  monto_centavos: integer('monto_centavos').notNull(),
  descripcion: text('descripcion'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const cargosManualesRelations = relations(cargosManuales, ({ one }) => ({
  torneo: one(torneos, {
    fields: [cargosManuales.torneo_id],
    references: [torneos.id],
  }),
  equipo: one(equipos, {
    fields: [cargosManuales.equipo_id],
    references: [equipos.id],
  }),
}));

// Tabla de historial de jugadores
export const historialJugadores = pgTable('historial_jugadores', {
  id: serial('id').primaryKey(),
  jugador_id: varchar('jugador_id', { length: 255 }).references(() => jugadores.id).notNull(),
  liga: text('liga').notNull(),
  equipo: text('equipo'), // Nombre del equipo como texto
  numero: integer('numero'), // Número de camiseta
  nombre_calificacion: text('nombre_calificacion'),
  disciplina: text('disciplina'),
  fecha_calificacion: date('fecha_calificacion'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Relaciones para historial de jugadores
export const historialJugadoresRelations = relations(historialJugadores, ({ one }) => ({
  jugador: one(jugadores, {
    fields: [historialJugadores.jugador_id],
    references: [jugadores.id],
  }),
}));

// Tabla de configuraciones del sistema
export const configuraciones = pgTable('configuraciones', {
  id: serial('id').primaryKey(),
  clave: text('clave').notNull().unique(), // Identificador único de la configuración
  valor: text('valor').notNull(), // Valor de la configuración (se guardará como texto y se parseará según sea necesario)
  tipo: text('tipo').notNull(), // 'number', 'text', 'boolean', 'json'
  categoria: text('categoria').notNull(), // 'sanciones', 'valores_economicos', 'general', etc.
  descripcion: text('descripcion'), // Descripción de la configuración
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ==================== TABLAS DE AUTENTICACIÓN (Auth.js) ====================

// Tabla de usuarios
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name'),
  email: text('email').notNull().unique(),
  emailVerified: timestamp('email_verified', { mode: 'date' }),
  password: text('password'), // Para autenticación con credenciales (hasheada con bcrypt)
  image: text('image'),
  role: text('role', { enum: ['admin', 'arbitro', 'jugador', 'visitante'] }).default('visitante').notNull(),
  equipoId: integer('equipo_id').references(() => equipos.id), // Relación opcional con un equipo
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Tabla de cuentas (para OAuth providers como Google, GitHub, etc.)
export const accounts = pgTable('accounts', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  provider: text('provider').notNull(),
  providerAccountId: text('provider_account_id').notNull(),
  refresh_token: text('refresh_token'),
  access_token: text('access_token'),
  expires_at: integer('expires_at'),
  token_type: text('token_type'),
  scope: text('scope'),
  id_token: text('id_token'),
  session_state: text('session_state'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  uniqueProviderAccount: uniqueIndex('unique_provider_account').on(table.provider, table.providerAccountId),
}));

// Tabla de sesiones
export const sessions = pgTable('sessions', {
  id: serial('id').primaryKey(),
  sessionToken: text('session_token').notNull().unique(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Tabla de tokens de verificación (para reset password, verificación de email, etc.)
export const verificationTokens = pgTable('verification_tokens', {
  identifier: text('identifier').notNull(),
  token: text('token').notNull().unique(),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  uniqueIdentifierToken: uniqueIndex('unique_identifier_token').on(table.identifier, table.token),
}));

// Relaciones para usuarios
export const usersRelations = relations(users, ({ one, many }) => ({
  equipo: one(equipos, {
    fields: [users.equipoId],
    references: [equipos.id],
  }),
  accounts: many(accounts),
  sessions: many(sessions),
}));

// Relaciones para cuentas
export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

// Relaciones para sesiones
export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

// ==================== SISTEMA DINÁMICO DE ROLES Y PERMISOS ====================

// Tabla de Roles (Catálogo de roles del sistema)
export const roles = pgTable('roles', {
  id: serial('id').primaryKey(),
  nombre: text('nombre').notNull().unique(), // 'admin', 'arbitro', 'jugador', 'visitante'
  descripcion: text('descripcion'), // Descripción del rol
  nivel: integer('nivel').notNull(), // Jerarquía: 1=admin (mayor poder), 4=visitante (menor poder)
  activo: boolean('activo').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Tabla de Menús (Todos los ítems del menú del sistema)
export const menus = pgTable('menus', {
  id: serial('id').primaryKey(),
  key: text('key').notNull().unique(), // Identificador único: 'equipos', 'categorias'
  label: text('label').notNull(), // Texto visible: 'Equipos', 'Categorías'
  url: text('url'), // Ruta: '/equipos', null si es menú padre
  icon: text('icon'), // Nombre del icono (TbTrophy, etc.)
  parentId: integer('parent_id'), // ID del menú padre (NULL si es raíz)
  orden: integer('orden').default(0), // Orden de aparición en el menú
  esTitle: boolean('es_title').default(false), // Si es un título separador
  activo: boolean('activo').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Tabla de Roles-Menús (Permisos: qué roles pueden ver qué menús)
export const rolesMenus = pgTable('roles_menus', {
  id: serial('id').primaryKey(),
  rolId: integer('rol_id').references(() => roles.id, { onDelete: 'cascade' }).notNull(),
  menuId: integer('menu_id').references(() => menus.id, { onDelete: 'cascade' }).notNull(),
  puedeVer: boolean('puede_ver').default(true),
  puedeCrear: boolean('puede_crear').default(false),
  puedeEditar: boolean('puede_editar').default(false),
  puedeEliminar: boolean('puede_eliminar').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  uniqueRolMenu: uniqueIndex('unique_rol_menu').on(table.rolId, table.menuId),
}));

// Tabla de Roles-Usuarios (Asignación de roles a usuarios - soporta múltiples roles)
export const rolesUsuarios = pgTable('roles_usuarios', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  rolId: integer('rol_id').references(() => roles.id, { onDelete: 'cascade' }).notNull(),
  esRolPrincipal: boolean('es_rol_principal').default(false), // Rol principal que se muestra
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  uniqueUserRol: uniqueIndex('unique_user_rol').on(table.userId, table.rolId),
}));

// Relaciones para roles
export const rolesRelations = relations(roles, ({ many }) => ({
  rolesMenus: many(rolesMenus),
  rolesUsuarios: many(rolesUsuarios),
}));

// Relaciones para menús
export const menusRelations = relations(menus, ({ one, many }) => ({
  menuPadre: one(menus, {
    fields: [menus.parentId],
    references: [menus.id],
    relationName: 'menusHijos',
  }),
  menusHijos: many(menus, { relationName: 'menusHijos' }),
  rolesMenus: many(rolesMenus),
}));

// Relaciones para roles_menus
export const rolesMenusRelations = relations(rolesMenus, ({ one }) => ({
  rol: one(roles, {
    fields: [rolesMenus.rolId],
    references: [roles.id],
  }),
  menu: one(menus, {
    fields: [rolesMenus.menuId],
    references: [menus.id],
  }),
}));

// Relaciones para roles_usuarios
export const rolesUsuariosRelations = relations(rolesUsuarios, ({ one }) => ({
  user: one(users, {
    fields: [rolesUsuarios.userId],
    references: [users.id],
  }),
  rol: one(roles, {
    fields: [rolesUsuarios.rolId],
    references: [roles.id],
  }),
}));

// Actualizar relaciones de users para incluir roles_usuarios
export const usersRelationsUpdated = relations(users, ({ one, many }) => ({
  equipo: one(equipos, {
    fields: [users.equipoId],
    references: [equipos.id],
  }),
  accounts: many(accounts),
  sessions: many(sessions),
  rolesUsuarios: many(rolesUsuarios),
}));