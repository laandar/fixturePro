import { StaticImageData } from 'next/image'

// Imágenes de ejemplo para jugadores (usando placeholders por ahora)
// Puedes reemplazar con imágenes reales cuando estén disponibles
const placeholderImage = 'https://via.placeholder.com/32x32/007bff/ffffff?text=⚽'

export type JugadorType = {
  id: number
  cedula: string
  apellido_nombre: string
  nacionalidad: string
  liga: string
  equipo: string
  estado: 'activo' | 'inactivo'
  fechaCreacion: string
  imagen: string
  url: string
}

export const jugadores: JugadorType[] = [
  {
    id: 1,
    cedula: '1719860916',
    apellido_nombre: 'SINCHE COLLAGUAZO DARWIN PATRICIO',
    nacionalidad: 'ECUATORIANA',
    liga: 'ATAHUALPA',
    equipo: 'U.D. E. FAJARDO',
    estado: 'activo',
    fechaCreacion: 'Ene 15, 2024',
    imagen: placeholderImage,
    url: '/pages/jugador/1',
  },
  {
    id: 2,
    cedula: '1723456789',
    apellido_nombre: 'GONZÁLEZ PÉREZ CARLOS ALBERTO',
    nacionalidad: 'ECUATORIANA',
    liga: 'ATAHUALPA',
    equipo: 'REAL MADRID',
    estado: 'activo',
    fechaCreacion: 'Ene 20, 2024',
    imagen: placeholderImage,
    url: '/pages/jugador/2',
  },
  {
    id: 3,
    cedula: '1734567890',
    apellido_nombre: 'RODRÍGUEZ LÓPEZ JUAN PABLO',
    nacionalidad: 'ECUATORIANA',
    liga: 'ATAHUALPA',
    equipo: 'BARCELONA FC',
    estado: 'activo',
    fechaCreacion: 'Feb 5, 2024',
    imagen: placeholderImage,
    url: '/pages/jugador/3',
  },
  {
    id: 4,
    cedula: '1745678901',
    apellido_nombre: 'MARTÍNEZ SÁNCHEZ LUIS FERNANDO',
    nacionalidad: 'ECUATORIANA',
    liga: 'ATAHUALPA',
    equipo: 'ATLÉTICO MADRID',
    estado: 'activo',
    fechaCreacion: 'Feb 12, 2024',
    imagen: placeholderImage,
    url: '/pages/jugador/4',
  },
  {
    id: 5,
    cedula: '1756789012',
    apellido_nombre: 'HERNÁNDEZ GARCÍA MIGUEL ÁNGEL',
    nacionalidad: 'ECUATORIANA',
    liga: 'ATAHUALPA',
    equipo: 'SEVILLA FC',
    estado: 'inactivo',
    fechaCreacion: 'Mar 1, 2024',
    imagen: placeholderImage,
    url: '/pages/jugador/5',
  },
]
