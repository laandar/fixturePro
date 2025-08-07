import { StaticImageData } from 'next/image'

// Imágenes de ejemplo para equipos (puedes reemplazar con imágenes reales)
import user1 from '@/assets/images/users/user-1.jpg'
import user2 from '@/assets/images/users/user-2.jpg'
import user3 from '@/assets/images/users/user-3.jpg'
import user4 from '@/assets/images/users/user-4.jpg'
import user5 from '@/assets/images/users/user-5.jpg'
import user6 from '@/assets/images/users/user-6.jpg'
import user7 from '@/assets/images/users/user-7.jpg'
import user8 from '@/assets/images/users/user-8.jpg'

export type EquipoType = {
  id: number
  nombre: string
  categoria: string
  entrenador: string
  entrenadorEmail: string
  entrenadorImage: StaticImageData
  categoriaPermiteRevancha: boolean
  fechaCreacion: string
  estado: 'activo' | 'inactivo' | 'pendiente'
  url: string
}

export const equipos: EquipoType[] = [
  {
    id: 1,
    nombre: 'Real Madrid',
    categoria: 'Primera División',
    entrenador: 'Carlo Ancelotti',
    entrenadorEmail: 'carlo.ancelotti@realmadrid.com',
    entrenadorImage: user1,
    categoriaPermiteRevancha: true,
    fechaCreacion: 'Ene 15, 2024',
    estado: 'activo',
    url: '/pages/equipo/1',
  },
  {
    id: 2,
    nombre: 'Barcelona FC',
    categoria: 'Primera División',
    entrenador: 'Xavi Hernández',
    entrenadorEmail: 'xavi.hernandez@fcbarcelona.com',
    entrenadorImage: user2,
    categoriaPermiteRevancha: true,
    fechaCreacion: 'Ene 20, 2024',
    estado: 'activo',
    url: '/pages/equipo/2',
  },
  {
    id: 3,
    nombre: 'Atlético Madrid',
    categoria: 'Primera División',
    entrenador: 'Diego Simeone',
    entrenadorEmail: 'diego.simeone@atleticomadrid.com',
    entrenadorImage: user3,
    categoriaPermiteRevancha: true,
    fechaCreacion: 'Feb 5, 2024',
    estado: 'activo',
    url: '/pages/equipo/3',
  },
  {
    id: 4,
    nombre: 'Sevilla FC',
    categoria: 'Primera División',
    entrenador: 'Quique Sánchez Flores',
    entrenadorEmail: 'quique.sanchez@sevillafc.com',
    entrenadorImage: user4,
    categoriaPermiteRevancha: true,
    fechaCreacion: 'Feb 12, 2024',
    estado: 'pendiente',
    url: '/pages/equipo/4',
  },
  {
    id: 5,
    nombre: 'Valencia CF',
    categoria: 'Segunda División',
    entrenador: 'Rubén Baraja',
    entrenadorEmail: 'ruben.baraja@valenciacf.com',
    entrenadorImage: user5,
    categoriaPermiteRevancha: false,
    fechaCreacion: 'Mar 1, 2024',
    estado: 'activo',
    url: '/pages/equipo/5',
  },
  {
    id: 6,
    nombre: 'Villarreal CF',
    categoria: 'Primera División',
    entrenador: 'Marcelino García',
    entrenadorEmail: 'marcelino.garcia@villarrealcf.com',
    entrenadorImage: user6,
    categoriaPermiteRevancha: true,
    fechaCreacion: 'Mar 8, 2024',
    estado: 'inactivo',
    url: '/pages/equipo/6',
  },
  {
    id: 7,
    nombre: 'Athletic Club',
    categoria: 'Primera División',
    entrenador: 'Ernesto Valverde',
    entrenadorEmail: 'ernesto.valverde@athletic-club.com',
    entrenadorImage: user7,
    categoriaPermiteRevancha: true,
    fechaCreacion: 'Mar 15, 2024',
    estado: 'activo',
    url: '/pages/equipo/7',
  },
  {
    id: 8,
    nombre: 'Real Sociedad',
    categoria: 'Primera División',
    entrenador: 'Imanol Alguacil',
    entrenadorEmail: 'imanol.alguacil@realsociedad.com',
    entrenadorImage: user8,
    categoriaPermiteRevancha: true,
    fechaCreacion: 'Mar 22, 2024',
    estado: 'activo',
    url: '/pages/equipo/8',
  },
] 