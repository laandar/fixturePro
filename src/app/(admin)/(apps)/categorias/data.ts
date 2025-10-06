import { StaticImageData } from 'next/image'

// Imágenes de ejemplo para categorías (usando placeholders por ahora)
// Puedes reemplazar con imágenes reales cuando estén disponibles
const placeholderImage = 'https://via.placeholder.com/32x32/ffc107/ffffff?text=🏆'

export type CategoriaType = {
  id: number
  nombre: string
  estado: boolean
  usuario_id: number | null
  fechaCreacion: string
  equiposCount: number
  imagen: string
  url: string
}

export const categorias: CategoriaType[] = [
  {
    id: 1,
    nombre: 'Primera División',
    estado: true,
    usuario_id: 1,
    fechaCreacion: 'Ene 15, 2024',
    equiposCount: 8,
    imagen: placeholderImage,
    url: '/pages/categoria/1',
  },
  {
    id: 2,
    nombre: 'Segunda División',
    estado: true,
    usuario_id: 1,
    fechaCreacion: 'Ene 20, 2024',
    equiposCount: 6,
    imagen: placeholderImage,
    url: '/pages/categoria/2',
  },
  {
    id: 3,
    nombre: 'Tercera División',
    estado: true,
    usuario_id: 1,
    fechaCreacion: 'Feb 5, 2024',
    equiposCount: 4,
    imagen: placeholderImage,
    url: '/pages/categoria/3',
  },
  {
    id: 4,
    nombre: 'Copa del Rey',
    estado: true,
    usuario_id: 1,
    fechaCreacion: 'Feb 12, 2024',
    equiposCount: 12,
    imagen: placeholderImage,
    url: '/pages/categoria/4',
  },
  {
    id: 5,
    nombre: 'Supercopa',
    estado: true,
    usuario_id: 1,
    fechaCreacion: 'Mar 1, 2024',
    equiposCount: 4,
    imagen: placeholderImage,
    url: '/pages/categoria/5',
  },
]
