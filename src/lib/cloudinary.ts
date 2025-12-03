/**
 * Utilidad para gestionar imágenes en Cloudinary
 * 
 * Configuración requerida en .env.local:
 * - CLOUDINARY_CLOUD_NAME
 * - CLOUDINARY_API_KEY
 * - CLOUDINARY_API_SECRET
 */

import { v2 as cloudinary } from 'cloudinary'

// Configurar Cloudinary
if (
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true, // Usar HTTPS
  })
} else {
  console.warn('⚠️  Cloudinary no está configurado. Las variables de entorno faltan.')
}

/**
 * Sube una imagen a Cloudinary desde un Buffer
 * @param buffer Buffer de la imagen
 * @param publicId ID público para la imagen (sin extensión)
 * @param folder Carpeta donde guardar la imagen
 * @returns URL de la imagen subida
 */
export async function uploadImageToCloudinary(
  buffer: Buffer,
  publicId: string,
  folder: string = 'jugadores'
): Promise<string> {
  // Verificar y configurar Cloudinary si no está configurado
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME
  const apiKey = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET
  
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('Cloudinary no está configurado. Verifica las variables de entorno: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET')
  }
  
  // Reconfigurar Cloudinary para asegurar que esté correcto
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  })

  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: publicId,
        overwrite: true, // Sobrescribir si ya existe
        resource_type: 'image',
        transformation: [
          {
            width: 400,
            height: 400,
            crop: 'fill',
            gravity: 'face', // Enfocar en la cara si es posible
            quality: 'auto',
            fetch_format: 'auto', // WebP si es compatible
          },
        ],
      },
      (error, result) => {
        if (error) {
          console.error('❌ Error al subir imagen a Cloudinary:', error)
          reject(error)
        } else if (result) {
          console.log(`✅ Imagen subida exitosamente. Public ID: ${result.public_id}`)
          console.log(`✅ URL: ${result.secure_url}`)
          // Retornar la URL que Cloudinary nos da directamente
          resolve(result.secure_url)
        } else {
          reject(new Error('No se recibió resultado de Cloudinary'))
        }
      }
    ).end(buffer)
  })
}

/**
 * Sube una imagen a Cloudinary desde un File (para uso en Server Actions)
 * @param file Archivo de imagen
 * @param publicId ID público para la imagen (sin extensión)
 * @param folder Carpeta donde guardar la imagen
 * @returns URL de la imagen subida
 */
export async function uploadFileToCloudinary(
  file: File,
  publicId: string,
  folder: string = 'jugadores'
): Promise<string> {
  // Convertir File a Buffer
  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  return uploadImageToCloudinary(buffer, publicId, folder)
}

/**
 * Elimina una imagen de Cloudinary
 * @param publicId ID público de la imagen (con o sin folder)
 * @param folder Carpeta donde está la imagen
 * @returns Resultado de la eliminación
 */
export async function deleteImageFromCloudinary(
  publicId: string,
  folder: string = 'jugadores'
): Promise<any> {
  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    throw new Error('Cloudinary no está configurado. Verifica las variables de entorno.')
  }

  const fullPublicId = folder ? `${folder}/${publicId}` : publicId

  return new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(fullPublicId, (error, result) => {
      if (error) {
        console.error('Error al eliminar imagen de Cloudinary:', error)
        reject(error)
      } else {
        resolve(result)
      }
    })
  })
}

/**
 * Obtiene la URL de una imagen con transformaciones
 * Útil para generar URLs optimizadas sin subir la imagen
 * @param publicId ID público de la imagen
 * @param transformations Transformaciones a aplicar
 * @param folder Carpeta donde está la imagen
 * @returns URL transformada
 */
export function getCloudinaryUrl(
  publicId: string,
  transformations: any[] = [],
  folder: string = 'jugadores'
): string {
  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    throw new Error('Cloudinary no está configurado. Verifica las variables de entorno.')
  }

  const fullPublicId = folder ? `${folder}/${publicId}` : publicId

  return cloudinary.url(fullPublicId, {
    transformation: transformations,
    secure: true,
  })
}

/**
 * Verifica si una URL es de Cloudinary
 * @param url URL a verificar
 * @returns true si es una URL de Cloudinary
 */
export function isCloudinaryUrl(url: string): boolean {
  return url.includes('cloudinary.com')
}

/**
 * Extrae el public_id de una URL de Cloudinary
 * @param url URL de Cloudinary
 * @returns public_id o null si no es una URL válida
 */
export function extractPublicIdFromUrl(url: string): string | null {
  if (!isCloudinaryUrl(url)) {
    return null
  }

  try {
    // Formato: https://res.cloudinary.com/{cloud_name}/image/upload/{transformations}/{public_id}.{format}
    const match = url.match(/\/upload\/(?:[^\/]+\/)*([^\/]+)\.(jpg|jpeg|png|webp|gif)/i)
    if (match && match[1]) {
      // Remover el folder si está incluido
      return match[1].replace(/^jugadores\//, '')
    }
  } catch (error) {
    console.error('Error al extraer public_id:', error)
  }

  return null
}

