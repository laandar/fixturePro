'use client'

import type { JugadorWithEquipo } from '@/db/types'
import { getTempPlayerImage } from '@/components/TempPlayerImages'

/**
 * Formatea una fecha al formato español completo
 * Ejemplo: "martes, 25 de febrero de 2025"
 */
function formatearFechaCompleta(fecha: Date): string {
  const diasSemana = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
  
  const diaSemana = diasSemana[fecha.getDay()]
  const dia = fecha.getDate()
  const mes = meses[fecha.getMonth()]
  const año = fecha.getFullYear()
  
  return `${diaSemana}, ${dia} de ${mes} de ${año}`
}

/**
 * Formatea una fecha al formato DD/MM/YYYY
 */
function formatearFechaCorta(fecha: Date | string | null | undefined): string {
  if (!fecha) return ''
  
  const fechaObj = typeof fecha === 'string' ? new Date(fecha) : fecha
  if (isNaN(fechaObj.getTime())) return ''
  
  const dia = String(fechaObj.getDate()).padStart(2, '0')
  const mes = String(fechaObj.getMonth() + 1).padStart(2, '0')
  const año = fechaObj.getFullYear()
  
  return `${dia}/${mes}/${año}`
}

/**
 * Divide el nombre completo en apellidos y nombres
 */
function dividirNombre(apellidoNombre: string): { apellidos: string; nombres: string } {
  const partes = apellidoNombre.trim().split(/\s+/)
  if (partes.length === 1) {
    return { apellidos: partes[0].toUpperCase(), nombres: '' }
  }
  
  // Generalmente el último elemento es el segundo apellido, pero para simplificar
  // tomamos los primeros 2 como apellidos y el resto como nombres
  if (partes.length === 2) {
    return { apellidos: partes[0].toUpperCase(), nombres: partes[1].toUpperCase() }
  }
  
  // Si hay más de 2 partes, asumimos que los primeros 2 son apellidos
  const apellidos = partes.slice(0, 2).join(' ').toUpperCase()
  const nombres = partes.slice(2).join(' ').toUpperCase()
  
  return { apellidos, nombres }
}

/**
 * Carga una imagen desde una URL
 */
function cargarImagen(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = (error) => reject(error)
    img.src = url
  })
}

/**
 * Genera el carnet del jugador y lo muestra en una ventana de impresión
 */
export async function generarCarnetJugador(jugador: JugadorWithEquipo): Promise<void> {
  try {
    // Obtener categoría del jugador
    const categoria = jugador.jugadoresEquipoCategoria?.[0]?.equipoCategoria?.categoria
    
    // Usar imágenes de la categoría si existen, si no usar las por defecto
    const imagenFrontalUrl = categoria?.imagen_carnet_frontal || '/carnets/m1.png'
    const imagenTraseraUrl = categoria?.imagen_carnet_trasera || '/carnets/m2.jpg'
    
    // Cargar las plantillas
    const [plantillaFrontal, plantillaTrasera] = await Promise.all([
      cargarImagen(imagenFrontalUrl),
      cargarImagen(imagenTraseraUrl)
    ])

    // Obtener foto del jugador
    const fotoJugadorUrl = jugador.foto || getTempPlayerImage(jugador.id)
    let fotoJugador: HTMLImageElement
    try {
      fotoJugador = await cargarImagen(fotoJugadorUrl)
    } catch (error) {
      // Si falla cargar la foto, crear una imagen placeholder
      const placeholderCanvas = document.createElement('canvas')
      placeholderCanvas.width = 150
      placeholderCanvas.height = 180
      const placeholderCtx = placeholderCanvas.getContext('2d')
      if (placeholderCtx) {
        placeholderCtx.fillStyle = '#E5E7EB'
        placeholderCtx.fillRect(0, 0, placeholderCanvas.width, placeholderCanvas.height)
        placeholderCtx.fillStyle = '#9CA3AF'
        placeholderCtx.font = '48px Arial'
        placeholderCtx.textAlign = 'center'
        placeholderCtx.textBaseline = 'middle'
        placeholderCtx.fillText('📷', placeholderCanvas.width / 2, placeholderCanvas.height / 2)
      }
      fotoJugador = await new Promise((resolve) => {
        const img = new Image()
        img.onload = () => resolve(img)
        img.src = placeholderCanvas.toDataURL()
      })
    }

    // Dividir el nombre
    const { apellidos, nombres } = dividirNombre(jugador.apellido_nombre || '')
    
    // Obtener número de jugador
    const relacionJugador = jugador.jugadoresEquipoCategoria?.[0] as any
    const numeroJugador = relacionJugador?.numero_jugador
    const numeroFormateado = numeroJugador ? String(numeroJugador).padStart(2, '0') : '00'
    
    // Formatear fechas
    const fechaNacimiento = formatearFechaCorta(jugador.fecha_nacimiento)
    const fechaActual = formatearFechaCompleta(new Date())
    
    // Obtener categoría
    const categoriaNombre = jugador.jugadoresEquipoCategoria?.[0]?.equipoCategoria?.categoria?.nombre || 'MASTER'
    
    // Obtener nombre del equipo
    const nombreEquipo = jugador.jugadoresEquipoCategoria?.[0]?.equipoCategoria?.equipo?.nombre || 'SIN EQUIPO'
    
    // Crear canvas para el carnet frontal
    const canvasFrontal = document.createElement('canvas')
    canvasFrontal.width = plantillaFrontal.width
    canvasFrontal.height = plantillaFrontal.height
    const ctxFrontal = canvasFrontal.getContext('2d')
    
    if (!ctxFrontal) {
      throw new Error('No se pudo obtener el contexto del canvas')
    }

    // Dibujar plantilla frontal
    ctxFrontal.drawImage(plantillaFrontal, 0, 0)
    
    // Configurar fuente y estilo
    ctxFrontal.fillStyle = '#000000'
    ctxFrontal.textAlign = 'left'
    ctxFrontal.textBaseline = 'top'
    
    // Función auxiliar para dibujar texto con sombra
    const dibujarTextoConSombra = (texto: string, x: number, y: number, color: string, fontSize: string, align: 'left' | 'center' | 'right' = 'left') => {
      ctxFrontal.textAlign = align
      ctxFrontal.textBaseline = 'top'
      ctxFrontal.font = fontSize
      // Sombra del texto
      ctxFrontal.fillStyle = 'rgba(0, 0, 0, 0.3)'
      ctxFrontal.fillText(texto, x + 2, y + 2)
      // Texto principal
      ctxFrontal.fillStyle = color
      ctxFrontal.fillText(texto, x, y)
    }
    
    // Dibujar nombre del equipo (en negritas, más grande y en azul con sombra)
    dibujarTextoConSombra(nombreEquipo.toUpperCase(), 50, 120, '#0000FF', 'bold 32px Arial', 'left')
    
    // Dibujar apellidos (con salto después del nombre del equipo y sombra)
    dibujarTextoConSombra(apellidos, 50, 175, '#000000', 'bold 26px Arial', 'left')
    
    // Dibujar nombres (con sombra)
    dibujarTextoConSombra(nombres, 50, 210, '#000000', 'bold 26px Arial', 'left')
    
    // Dibujar fecha de nacimiento (con sombra)
    dibujarTextoConSombra(fechaNacimiento, 50, 245, '#000000', 'bold 22px Arial', 'left')
    
    // Dibujar cédula (con sombra)
    dibujarTextoConSombra(jugador.cedula || '', 50, 275, '#000000', 'bold 22px Arial', 'left')
    
    // Dibujar fecha actual (con sombra)
    dibujarTextoConSombra(fechaActual, 50, canvasFrontal.height - 80, '#000000', 'bold 16px Arial', 'left')
    
    // Restaurar valores por defecto
    ctxFrontal.fillStyle = '#000000'
    ctxFrontal.textAlign = 'left'
    
    // Definir posición de la foto primero (necesario para calcular posición de categoría y número)
    const fotoWidth = 220
    const fotoHeight = 250
    const fotoX = canvasFrontal.width - 240  // Movido más a la izquierda para compensar el ancho aumentado
    const fotoY = 130
    
    // Dibujar categoría (MASTER en azul) - centrada sobre la imagen con sombra
    const categoriaX = fotoX + (fotoWidth / 2)  // Centro horizontal de la imagen
    const categoriaY = fotoY - 35  // Justo arriba de la imagen
    dibujarTextoConSombra(categoriaNombre, categoriaX, categoriaY, '#0000FF', 'bold 28px Arial', 'center')
    ctxFrontal.textAlign = 'left'  // Volver a alineación izquierda para el resto
    
    // Dibujar número de jugador (rojo, grande) - A LA IZQUIERDA de la foto con sombra
    ctxFrontal.textAlign = 'center'
    ctxFrontal.textBaseline = 'middle'
    // Posicionar el número a la izquierda de la foto, centrado verticalmente con la foto
    const numeroX = fotoX - 90  // Movido más a la izquierda para compensar
    const numeroY = fotoY + (fotoHeight / 2)  // Centrado verticalmente con la foto
    // Sombra del número
    ctxFrontal.fillStyle = 'rgba(0, 0, 0, 0.4)'
    ctxFrontal.font = 'bold 96px Arial'
    ctxFrontal.fillText(numeroFormateado, numeroX + 3, numeroY + 3)
    // Número principal
    ctxFrontal.fillStyle = '#CC0000'  // Rojo más oscuro para mejor contraste
    ctxFrontal.fillText(numeroFormateado, numeroX, numeroY)
    ctxFrontal.fillStyle = '#000000'
    ctxFrontal.textAlign = 'left'
    ctxFrontal.textBaseline = 'top'
    
    // Dibujar foto del jugador (ajustar posición según la plantilla)
    // Redimensionar foto a tamaño apropiado
    
    // Crear un canvas temporal para la foto con marco y sombra
    const fotoCanvas = document.createElement('canvas')
    fotoCanvas.width = fotoWidth + 10  // Espacio extra para sombra y marco
    fotoCanvas.height = fotoHeight + 10
    const fotoCtx = fotoCanvas.getContext('2d')
    
    if (fotoCtx) {
      // Dibujar sombra de la foto
      fotoCtx.fillStyle = 'rgba(0, 0, 0, 0.3)'
      fotoCtx.fillRect(8, 8, fotoWidth + 4, fotoHeight + 4)
      
      // Dibujar marco blanco alrededor de la foto
      fotoCtx.fillStyle = '#FFFFFF'
      fotoCtx.fillRect(5, 5, fotoWidth + 4, fotoHeight + 4)
      
      // Dibujar marco gris oscuro (borde)
      fotoCtx.strokeStyle = '#333333'
      fotoCtx.lineWidth = 3
      fotoCtx.strokeRect(5, 5, fotoWidth + 4, fotoHeight + 4)
      
      // Dibujar foto redimensionada (con margen para el marco)
      fotoCtx.drawImage(fotoJugador, 7, 7, fotoWidth, fotoHeight)
      
      // Dibujar el canvas de la foto en el canvas principal (ajustando posición para la sombra)
      ctxFrontal.drawImage(fotoCanvas, fotoX - 5, fotoY - 5)
    }

    // Crear canvas para el carnet trasero
    const canvasTrasera = document.createElement('canvas')
    canvasTrasera.width = plantillaTrasera.width
    canvasTrasera.height = plantillaTrasera.height
    const ctxTrasera = canvasTrasera.getContext('2d')
    
    if (!ctxTrasera) {
      throw new Error('No se pudo obtener el contexto del canvas')
    }

    // Dibujar plantilla trasera
    ctxTrasera.drawImage(plantillaTrasera, 0, 0)
    
    // Aquí se podría agregar un QR code si es necesario
    // Por ahora solo dibujamos la plantilla trasera

    // Crear una ventana nueva con ambas imágenes
    const ventanaImpresion = window.open('', '_blank', 'width=800,height=600')
    if (!ventanaImpresion) {
      throw new Error('No se pudo abrir la ventana de impresión')
    }

    ventanaImpresion.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Carnet de Juego - ${jugador.apellido_nombre}</title>
          <style>
            @media print {
              @page {
                size: portrait;
                margin: 0;
              }
              body {
                margin: 0;
                padding: 0;
              }
            }
            body {
              margin: 20px;
              display: flex;
              justify-content: center;
              align-items: center;
              gap: 20px;
              background: #f5f5f5;
            }
            .carnet-container {
              display: flex;
              gap: 5px;
              align-items: center;
            }
            img {
              max-width: 400px;
              height: auto;
              box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            }
            @media print {
              body {
                background: white;
                margin: 0;
                padding: 0;
                display: flex;
                flex-direction: column;
                justify-content: flex-start;
                align-items: center;
                min-height: auto;
              }
              .carnet-container {
                gap: 2px;
                display: flex;
                align-items: center;
                margin-top: 0;
              }
              img {
                width: 7.65cm;
                height: 5.5cm;
                max-width: none;
                box-shadow: none;
                object-fit: contain;
              }
            }
          </style>
        </head>
        <body>
          <div class="carnet-container">
            <img src="${canvasFrontal.toDataURL('image/png')}" alt="Carnet Frontal" />
            <img src="${canvasTrasera.toDataURL('image/jpeg')}" alt="Carnet Trasero" />
          </div>
          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `)
    
    ventanaImpresion.document.close()
    
  } catch (error) {
    console.error('Error al generar carnet:', error)
    alert('Error al generar el carnet. Por favor, intente nuevamente.')
  }
}

/**
 * Genera múltiples carnets de jugadores y los muestra en una ventana de impresión
 */
export async function generarCarnetsMultiples(jugadores: JugadorWithEquipo[]): Promise<void> {
  if (jugadores.length === 0) {
    alert('No hay jugadores seleccionados')
    return
  }

  try {
    // Generar todos los carnets
    const carnetsFrontales: string[] = []
    const carnetsTraseros: string[] = []

    for (const jugador of jugadores) {
      // Obtener categoría del jugador
      const categoria = jugador.jugadoresEquipoCategoria?.[0]?.equipoCategoria?.categoria
      
      // Usar imágenes de la categoría si existen, si no usar las por defecto
      const imagenFrontalUrl = categoria?.imagen_carnet_frontal || '/carnets/m1.png'
      const imagenTraseraUrl = categoria?.imagen_carnet_trasera || '/carnets/m2.jpg'
      
      // Cargar las plantillas
      const [plantillaFrontal, plantillaTrasera] = await Promise.all([
        cargarImagen(imagenFrontalUrl),
        cargarImagen(imagenTraseraUrl)
      ])

      // Obtener foto del jugador
      const fotoJugadorUrl = jugador.foto || getTempPlayerImage(jugador.id)
      let fotoJugador: HTMLImageElement
      try {
        fotoJugador = await cargarImagen(fotoJugadorUrl)
      } catch (error) {
        const placeholderCanvas = document.createElement('canvas')
        placeholderCanvas.width = 150
        placeholderCanvas.height = 180
        const placeholderCtx = placeholderCanvas.getContext('2d')
        if (placeholderCtx) {
          placeholderCtx.fillStyle = '#E5E7EB'
          placeholderCtx.fillRect(0, 0, placeholderCanvas.width, placeholderCanvas.height)
          placeholderCtx.fillStyle = '#9CA3AF'
          placeholderCtx.font = '48px Arial'
          placeholderCtx.textAlign = 'center'
          placeholderCtx.textBaseline = 'middle'
          placeholderCtx.fillText('📷', placeholderCanvas.width / 2, placeholderCanvas.height / 2)
        }
        fotoJugador = await new Promise((resolve) => {
          const img = new Image()
          img.onload = () => resolve(img)
          img.src = placeholderCanvas.toDataURL()
        })
      }

      // Dividir el nombre
      const { apellidos, nombres } = dividirNombre(jugador.apellido_nombre || '')
      
      // Obtener número de jugador
      const relacionJugador = jugador.jugadoresEquipoCategoria?.[0] as any
      const numeroJugador = relacionJugador?.numero_jugador
      const numeroFormateado = numeroJugador ? String(numeroJugador).padStart(2, '0') : '00'
      
      // Formatear fechas
      const fechaNacimiento = formatearFechaCorta(jugador.fecha_nacimiento)
      const fechaActual = formatearFechaCompleta(new Date())
      
      // Obtener categoría
      const categoriaNombre = jugador.jugadoresEquipoCategoria?.[0]?.equipoCategoria?.categoria?.nombre || 'MASTER'
      
      // Obtener nombre del equipo
      const nombreEquipo = jugador.jugadoresEquipoCategoria?.[0]?.equipoCategoria?.equipo?.nombre || 'SIN EQUIPO'
      
      // Crear canvas para el carnet frontal
      const canvasFrontal = document.createElement('canvas')
      canvasFrontal.width = plantillaFrontal.width
      canvasFrontal.height = plantillaFrontal.height
      const ctxFrontal = canvasFrontal.getContext('2d')
      
      if (!ctxFrontal) {
        throw new Error('No se pudo obtener el contexto del canvas')
      }

      // Dibujar plantilla frontal
      ctxFrontal.drawImage(plantillaFrontal, 0, 0)
      
      // Configurar fuente y estilo
      ctxFrontal.fillStyle = '#000000'
      ctxFrontal.textAlign = 'left'
      ctxFrontal.textBaseline = 'top'
      
      // Función auxiliar para dibujar texto con sombra
      const dibujarTextoConSombra = (texto: string, x: number, y: number, color: string, fontSize: string, align: 'left' | 'center' | 'right' = 'left') => {
        ctxFrontal.textAlign = align
        ctxFrontal.textBaseline = 'top'
        ctxFrontal.font = fontSize
        ctxFrontal.fillStyle = 'rgba(0, 0, 0, 0.3)'
        ctxFrontal.fillText(texto, x + 2, y + 2)
        ctxFrontal.fillStyle = color
        ctxFrontal.fillText(texto, x, y)
      }
      
      // Dibujar nombre del equipo (en negritas, más grande y en azul con sombra)
      dibujarTextoConSombra(nombreEquipo.toUpperCase(), 50, 120, '#0000FF', 'bold 32px Arial', 'left')
      
      // Dibujar apellidos (con salto después del nombre del equipo y sombra)
      dibujarTextoConSombra(apellidos, 50, 175, '#000000', 'bold 26px Arial', 'left')
      
      // Dibujar nombres (con sombra)
      dibujarTextoConSombra(nombres, 50, 210, '#000000', 'bold 26px Arial', 'left')
      
      // Dibujar fecha de nacimiento (con sombra)
      dibujarTextoConSombra(fechaNacimiento, 50, 245, '#000000', 'bold 22px Arial', 'left')
      
      // Dibujar cédula (con sombra)
      dibujarTextoConSombra(jugador.cedula || '', 50, 275, '#000000', 'bold 22px Arial', 'left')
      
      // Dibujar fecha actual (con sombra)
      dibujarTextoConSombra(fechaActual, 50, canvasFrontal.height - 80, '#000000', 'bold 16px Arial', 'left')
      
      // Restaurar valores por defecto
      ctxFrontal.fillStyle = '#000000'
      ctxFrontal.textAlign = 'left'
      
      // Definir posición de la foto primero (necesario para calcular posición de categoría y número)
      const fotoWidth = 220
      const fotoHeight = 250
      const fotoX = canvasFrontal.width - 240
      const fotoY = 130
      
      // Dibujar categoría (MASTER en azul) - centrada sobre la imagen con sombra
      const categoriaX = fotoX + (fotoWidth / 2)
      const categoriaY = fotoY - 35
      dibujarTextoConSombra(categoriaNombre, categoriaX, categoriaY, '#0000FF', 'bold 28px Arial', 'center')
      ctxFrontal.textAlign = 'left'
      
      // Dibujar número de jugador (rojo, grande) - A LA IZQUIERDA de la foto con sombra
      ctxFrontal.textAlign = 'center'
      ctxFrontal.textBaseline = 'middle'
      const numeroX = fotoX - 90
      const numeroY = fotoY + (fotoHeight / 2)
      ctxFrontal.fillStyle = 'rgba(0, 0, 0, 0.4)'
      ctxFrontal.font = 'bold 96px Arial'
      ctxFrontal.fillText(numeroFormateado, numeroX + 3, numeroY + 3)
      ctxFrontal.fillStyle = '#CC0000'
      ctxFrontal.fillText(numeroFormateado, numeroX, numeroY)
      ctxFrontal.fillStyle = '#000000'
      ctxFrontal.textAlign = 'left'
      ctxFrontal.textBaseline = 'top'
      
      // Dibujar foto del jugador con marco y sombra
      const fotoCanvas = document.createElement('canvas')
      fotoCanvas.width = fotoWidth + 10
      fotoCanvas.height = fotoHeight + 10
      const fotoCtx = fotoCanvas.getContext('2d')
      
      if (fotoCtx) {
        fotoCtx.fillStyle = 'rgba(0, 0, 0, 0.3)'
        fotoCtx.fillRect(8, 8, fotoWidth + 4, fotoHeight + 4)
        fotoCtx.fillStyle = '#FFFFFF'
        fotoCtx.fillRect(5, 5, fotoWidth + 4, fotoHeight + 4)
        fotoCtx.strokeStyle = '#333333'
        fotoCtx.lineWidth = 3
        fotoCtx.strokeRect(5, 5, fotoWidth + 4, fotoHeight + 4)
        fotoCtx.drawImage(fotoJugador, 7, 7, fotoWidth, fotoHeight)
        ctxFrontal.drawImage(fotoCanvas, fotoX - 5, fotoY - 5)
      }

      // Crear canvas para el carnet trasero
      const canvasTrasera = document.createElement('canvas')
      canvasTrasera.width = plantillaTrasera.width
      canvasTrasera.height = plantillaTrasera.height
      const ctxTrasera = canvasTrasera.getContext('2d')
      
      if (!ctxTrasera) {
        throw new Error('No se pudo obtener el contexto del canvas')
      }

      // Dibujar plantilla trasera
      ctxTrasera.drawImage(plantillaTrasera, 0, 0)
      
      // Agregar las imágenes a los arrays
      carnetsFrontales.push(canvasFrontal.toDataURL('image/png'))
      carnetsTraseros.push(canvasTrasera.toDataURL('image/jpeg'))
    }

    // Crear una ventana nueva con todos los carnets
    const ventanaImpresion = window.open('', '_blank', 'width=800,height=600')
    if (!ventanaImpresion) {
      throw new Error('No se pudo abrir la ventana de impresión')
    }

    // Crear HTML con todos los carnets
    const carnetsHTML = carnetsFrontales.map((frontal, index) => `
      <div class="carnet-container">
        <img src="${frontal}" alt="Carnet Frontal ${index + 1}" />
        <img src="${carnetsTraseros[index]}" alt="Carnet Trasero ${index + 1}" />
      </div>
    `).join('')

    ventanaImpresion.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Carnets de Juego - ${jugadores.length} jugadores</title>
          <style>
            @media print {
              @page {
                size: portrait;
                margin: 0;
              }
              body {
                margin: 0;
                padding: 0;
              }
            }
            body {
              margin: 20px;
              display: flex;
              flex-direction: column;
              gap: 20px;
              background: #f5f5f5;
            }
            .carnet-container {
              display: flex;
              gap: 5px;
              align-items: center;
              page-break-inside: avoid;
            }
            img {
              max-width: 400px;
              height: auto;
              box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            }
            @media print {
              body {
                background: white;
                margin: 0;
                padding: 0;
                display: flex;
                flex-direction: column;
                gap: 10px;
                justify-content: flex-start;
                align-items: center;
                min-height: auto;
              }
              .carnet-container {
                gap: 2px;
                display: flex;
                align-items: center;
                margin-top: 0;
              }
              img {
                width: 7.65cm;
                height: 5.5cm;
                max-width: none;
                box-shadow: none;
                object-fit: contain;
              }
            }
          </style>
        </head>
        <body>
          ${carnetsHTML}
          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `)
    
    ventanaImpresion.document.close()
    
  } catch (error) {
    console.error('Error al generar carnets múltiples:', error)
    alert('Error al generar los carnets. Por favor, intente nuevamente.')
  }
}

