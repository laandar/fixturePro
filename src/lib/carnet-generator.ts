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
    img.onerror = () => {
      reject(new Error(`No se pudo cargar la imagen: ${url}`))
    }
    img.src = url
  })
}

/**
 * Tamaño de referencia de la plantilla (713x455)
 * Todas las posiciones y tamaños se calculan proporcionalmente a este tamaño
 */
const PLANTILLA_REFERENCIA = {
  width: 713,
  height: 455
}

/**
 * Calcula un valor proporcional basado en el tamaño de la plantilla actual
 * @param valorReferencia Valor en la plantilla de referencia
 * @param dimensionReferencia Dimension de referencia (width o height)
 * @param dimensionActual Dimension actual de la plantilla
 * @returns Valor proporcional ajustado
 */
function calcularProporcion(
  valorReferencia: number,
  dimensionReferencia: number,
  dimensionActual: number
): number {
  return (valorReferencia / dimensionReferencia) * dimensionActual
}

/**
 * Calcula el tamaño de fuente proporcional
 * @param fontSizeReferencia Tamaño de fuente en la plantilla de referencia (ej: 32)
 * @param widthReferencia Ancho de referencia
 * @param widthActual Ancho actual
 * @returns Tamaño de fuente ajustado
 */
function calcularTamañoFuente(
  fontSizeReferencia: number,
  widthReferencia: number,
  widthActual: number
): number {
  return Math.round((fontSizeReferencia / widthReferencia) * widthActual)
}

/**
 * Genera el carnet del jugador y lo muestra en una ventana de impresión
 */
export async function generarCarnetJugador(jugador: JugadorWithEquipo): Promise<void> {
  try {
    // Obtener categoría del jugador
    const categoria = jugador.jugadoresEquipoCategoria?.[0]?.equipoCategoria?.categoria
    
    // Verificar que la categoría tenga imágenes configuradas
    if (!categoria) {
      throw new Error('El jugador no tiene una categoría asignada')
    }
    
    if (!categoria.imagen_carnet_frontal || !categoria.imagen_carnet_trasera) {
      const nombreCategoria = categoria.nombre || 'sin nombre'
      throw new Error(`La categoría "${nombreCategoria}" no tiene imágenes de carnet configuradas. Por favor, configure las imágenes frontal y trasera en la configuración de categorías.`)
    }
    
    // Usar las imágenes de la categoría del jugador
    const imagenFrontalUrl = categoria.imagen_carnet_frontal
    const imagenTraseraUrl = categoria.imagen_carnet_trasera
    
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

    // Calcular factores de proporción basados en el tamaño real de la plantilla
    const factorAncho = canvasFrontal.width / PLANTILLA_REFERENCIA.width
    const factorAlto = canvasFrontal.height / PLANTILLA_REFERENCIA.height
    // Usar el factor promedio para mantener la proporción general
    const factorProporcion = (factorAncho + factorAlto) / 2

    // Dibujar plantilla frontal
    ctxFrontal.drawImage(plantillaFrontal, 0, 0)
    
    // Configurar fuente y estilo
    ctxFrontal.fillStyle = '#000000'
    ctxFrontal.textAlign = 'left'
    ctxFrontal.textBaseline = 'top'
    
    // Función auxiliar para dibujar texto con sombra (con tamaños proporcionales)
    const dibujarTextoConSombra = (texto: string, x: number, y: number, color: string, fontSizePx: number, align: 'left' | 'center' | 'right' = 'left') => {
      ctxFrontal.textAlign = align
      ctxFrontal.textBaseline = 'top'
      const fontSizeAjustado = calcularTamañoFuente(fontSizePx, PLANTILLA_REFERENCIA.width, canvasFrontal.width)
      ctxFrontal.font = `bold ${fontSizeAjustado}px Arial`
      const offsetSombra = Math.max(1, Math.round(2 * factorProporcion))
      // Sombra del texto
      ctxFrontal.fillStyle = 'rgba(0, 0, 0, 0.3)'
      ctxFrontal.fillText(texto, x + offsetSombra, y + offsetSombra)
      // Texto principal
      ctxFrontal.fillStyle = color
      ctxFrontal.fillText(texto, x, y)
    }
    
    // Calcular posiciones proporcionales (valores de referencia basados en 713x455)
    const xInicio = calcularProporcion(50, PLANTILLA_REFERENCIA.width, canvasFrontal.width)
    const yEquipo = calcularProporcion(120, PLANTILLA_REFERENCIA.height, canvasFrontal.height)
    const yApellidos = calcularProporcion(175, PLANTILLA_REFERENCIA.height, canvasFrontal.height)
    const yNombres = calcularProporcion(210, PLANTILLA_REFERENCIA.height, canvasFrontal.height)
    const yFechaNac = calcularProporcion(245, PLANTILLA_REFERENCIA.height, canvasFrontal.height)
    const yCedula = calcularProporcion(275, PLANTILLA_REFERENCIA.height, canvasFrontal.height)
    const yFechaActual = canvasFrontal.height - calcularProporcion(80, PLANTILLA_REFERENCIA.height, canvasFrontal.height)
    
    // Dibujar nombre del equipo (en negritas, más grande y en azul con sombra)
    dibujarTextoConSombra(nombreEquipo.toUpperCase(), xInicio, yEquipo, '#0000FF', 32, 'left')
    
    // Dibujar apellidos (con salto después del nombre del equipo y sombra)
    dibujarTextoConSombra(apellidos, xInicio, yApellidos, '#000000', 26, 'left')
    
    // Dibujar nombres (con sombra)
    dibujarTextoConSombra(nombres, xInicio, yNombres, '#000000', 26, 'left')
    
    // Dibujar fecha de nacimiento (con sombra)
    dibujarTextoConSombra(fechaNacimiento, xInicio, yFechaNac, '#000000', 22, 'left')
    
    // Dibujar cédula (con sombra)
    dibujarTextoConSombra(jugador.cedula || '', xInicio, yCedula, '#000000', 22, 'left')
    
    // Dibujar fecha actual (con sombra)
    dibujarTextoConSombra(fechaActual, xInicio, yFechaActual, '#000000', 16, 'left')
    
    // Restaurar valores por defecto
    ctxFrontal.fillStyle = '#000000'
    ctxFrontal.textAlign = 'left'
    
    // Definir posición de la foto primero (valores de referencia basados en 713x455)
    const fotoWidth = calcularProporcion(220, PLANTILLA_REFERENCIA.width, canvasFrontal.width)
    const fotoHeight = calcularProporcion(250, PLANTILLA_REFERENCIA.height, canvasFrontal.height)
    const fotoX = canvasFrontal.width - calcularProporcion(240, PLANTILLA_REFERENCIA.width, canvasFrontal.width)
    const fotoY = calcularProporcion(130, PLANTILLA_REFERENCIA.height, canvasFrontal.height)
    
    // Dibujar categoría (MASTER en azul) - centrada sobre la imagen con sombra
    const categoriaX = fotoX + (fotoWidth / 2)  // Centro horizontal de la imagen
    const categoriaY = fotoY - calcularProporcion(35, PLANTILLA_REFERENCIA.height, canvasFrontal.height)  // Justo arriba de la imagen
    dibujarTextoConSombra(categoriaNombre, categoriaX, categoriaY, '#0000FF', 28, 'center')
    ctxFrontal.textAlign = 'left'  // Volver a alineación izquierda para el resto
    
    // Dibujar número de jugador (rojo, grande) - A LA IZQUIERDA de la foto con sombra
    ctxFrontal.textAlign = 'center'
    ctxFrontal.textBaseline = 'middle'
    // Posicionar el número a la izquierda de la foto, centrado verticalmente con la foto
    const numeroX = fotoX - calcularProporcion(90, PLANTILLA_REFERENCIA.width, canvasFrontal.width)
    const numeroY = fotoY + (fotoHeight / 2)  // Centrado verticalmente con la foto
    const fontSizeNumero = calcularTamañoFuente(96, PLANTILLA_REFERENCIA.width, canvasFrontal.width)
    const offsetSombraNumero = Math.max(1, Math.round(3 * factorProporcion))
    // Sombra del número
    ctxFrontal.fillStyle = 'rgba(0, 0, 0, 0.4)'
    ctxFrontal.font = `bold ${fontSizeNumero}px Arial`
    ctxFrontal.fillText(numeroFormateado, numeroX + offsetSombraNumero, numeroY + offsetSombraNumero)
    // Número principal
    ctxFrontal.fillStyle = '#CC0000'  // Rojo más oscuro para mejor contraste
    ctxFrontal.fillText(numeroFormateado, numeroX, numeroY)
    ctxFrontal.fillStyle = '#000000'
    ctxFrontal.textAlign = 'left'
    ctxFrontal.textBaseline = 'top'
    
    // Dibujar foto del jugador (ajustar posición según la plantilla)
    // Redimensionar foto a tamaño apropiado
    
    // Crear un canvas temporal para la foto con marco y sombra (tamaños proporcionales)
    const marcoExtra = calcularProporcion(10, PLANTILLA_REFERENCIA.width, canvasFrontal.width)
    const offsetMarco = calcularProporcion(5, PLANTILLA_REFERENCIA.width, canvasFrontal.width)
    const offsetSombraMarco = calcularProporcion(8, PLANTILLA_REFERENCIA.width, canvasFrontal.width)
    const grosorMarco = Math.max(1, Math.round(calcularProporcion(3, PLANTILLA_REFERENCIA.width, canvasFrontal.width)))
    const offsetFoto = calcularProporcion(7, PLANTILLA_REFERENCIA.width, canvasFrontal.width)
    
    const fotoCanvas = document.createElement('canvas')
    fotoCanvas.width = fotoWidth + marcoExtra
    fotoCanvas.height = fotoHeight + marcoExtra
    const fotoCtx = fotoCanvas.getContext('2d')
    
    if (fotoCtx) {
      // Dibujar sombra de la foto
      fotoCtx.fillStyle = 'rgba(0, 0, 0, 0.3)'
      fotoCtx.fillRect(offsetSombraMarco, offsetSombraMarco, fotoWidth + 4, fotoHeight + 4)
      
      // Dibujar marco blanco alrededor de la foto
      fotoCtx.fillStyle = '#FFFFFF'
      fotoCtx.fillRect(offsetMarco, offsetMarco, fotoWidth + 4, fotoHeight + 4)
      
      // Dibujar marco gris oscuro (borde)
      fotoCtx.strokeStyle = '#333333'
      fotoCtx.lineWidth = grosorMarco
      fotoCtx.strokeRect(offsetMarco, offsetMarco, fotoWidth + 4, fotoHeight + 4)
      
      // Dibujar foto redimensionada (con margen para el marco)
      fotoCtx.drawImage(fotoJugador, offsetFoto, offsetFoto, fotoWidth, fotoHeight)
      
      // Dibujar el canvas de la foto en el canvas principal (ajustando posición para la sombra)
      ctxFrontal.drawImage(fotoCanvas, fotoX - offsetMarco, fotoY - offsetMarco)
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

    const errores: string[] = []

    for (let i = 0; i < jugadores.length; i++) {
      const jugador = jugadores[i]
      try {
        // Obtener categoría del jugador
        const categoria = jugador.jugadoresEquipoCategoria?.[0]?.equipoCategoria?.categoria
        
        // Verificar que la categoría tenga imágenes configuradas
        if (!categoria) {
          throw new Error('El jugador no tiene una categoría asignada')
        }
        
        if (!categoria.imagen_carnet_frontal || !categoria.imagen_carnet_trasera) {
          const nombreCategoria = categoria.nombre || 'sin nombre'
          throw new Error(`La categoría "${nombreCategoria}" no tiene imágenes de carnet configuradas. Por favor, configure las imágenes frontal y trasera en la configuración de categorías.`)
        }
        
        // Usar las imágenes de la categoría del jugador
        const imagenFrontalUrl = categoria.imagen_carnet_frontal
        const imagenTraseraUrl = categoria.imagen_carnet_trasera
        
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

      // Calcular factores de proporción basados en el tamaño real de la plantilla
      const factorAncho = canvasFrontal.width / PLANTILLA_REFERENCIA.width
      const factorAlto = canvasFrontal.height / PLANTILLA_REFERENCIA.height
      // Usar el factor promedio para mantener la proporción general
      const factorProporcion = (factorAncho + factorAlto) / 2

      // Dibujar plantilla frontal
      ctxFrontal.drawImage(plantillaFrontal, 0, 0)
      
      // Configurar fuente y estilo
      ctxFrontal.fillStyle = '#000000'
      ctxFrontal.textAlign = 'left'
      ctxFrontal.textBaseline = 'top'
      
      // Función auxiliar para dibujar texto con sombra (con tamaños proporcionales)
      const dibujarTextoConSombra = (texto: string, x: number, y: number, color: string, fontSizePx: number, align: 'left' | 'center' | 'right' = 'left') => {
        ctxFrontal.textAlign = align
        ctxFrontal.textBaseline = 'top'
        const fontSizeAjustado = calcularTamañoFuente(fontSizePx, PLANTILLA_REFERENCIA.width, canvasFrontal.width)
        ctxFrontal.font = `bold ${fontSizeAjustado}px Arial`
        const offsetSombra = Math.max(1, Math.round(2 * factorProporcion))
        // Sombra del texto
        ctxFrontal.fillStyle = 'rgba(0, 0, 0, 0.3)'
        ctxFrontal.fillText(texto, x + offsetSombra, y + offsetSombra)
        // Texto principal
        ctxFrontal.fillStyle = color
        ctxFrontal.fillText(texto, x, y)
      }
      
      // Calcular posiciones proporcionales (valores de referencia basados en 713x455)
      const xInicio = calcularProporcion(50, PLANTILLA_REFERENCIA.width, canvasFrontal.width)
      const yEquipo = calcularProporcion(120, PLANTILLA_REFERENCIA.height, canvasFrontal.height)
      const yApellidos = calcularProporcion(175, PLANTILLA_REFERENCIA.height, canvasFrontal.height)
      const yNombres = calcularProporcion(210, PLANTILLA_REFERENCIA.height, canvasFrontal.height)
      const yFechaNac = calcularProporcion(245, PLANTILLA_REFERENCIA.height, canvasFrontal.height)
      const yCedula = calcularProporcion(275, PLANTILLA_REFERENCIA.height, canvasFrontal.height)
      const yFechaActual = canvasFrontal.height - calcularProporcion(80, PLANTILLA_REFERENCIA.height, canvasFrontal.height)
      
      // Dibujar nombre del equipo (en negritas, más grande y en azul con sombra)
      dibujarTextoConSombra(nombreEquipo.toUpperCase(), xInicio, yEquipo, '#0000FF', 32, 'left')
      
      // Dibujar apellidos (con salto después del nombre del equipo y sombra)
      dibujarTextoConSombra(apellidos, xInicio, yApellidos, '#000000', 26, 'left')
      
      // Dibujar nombres (con sombra)
      dibujarTextoConSombra(nombres, xInicio, yNombres, '#000000', 26, 'left')
      
      // Dibujar fecha de nacimiento (con sombra)
      dibujarTextoConSombra(fechaNacimiento, xInicio, yFechaNac, '#000000', 22, 'left')
      
      // Dibujar cédula (con sombra)
      dibujarTextoConSombra(jugador.cedula || '', xInicio, yCedula, '#000000', 22, 'left')
      
      // Dibujar fecha actual (con sombra)
      dibujarTextoConSombra(fechaActual, xInicio, yFechaActual, '#000000', 16, 'left')
      
      // Restaurar valores por defecto
      ctxFrontal.fillStyle = '#000000'
      ctxFrontal.textAlign = 'left'
      
      // Definir posición de la foto primero (valores de referencia basados en 713x455)
      const fotoWidth = calcularProporcion(220, PLANTILLA_REFERENCIA.width, canvasFrontal.width)
      const fotoHeight = calcularProporcion(250, PLANTILLA_REFERENCIA.height, canvasFrontal.height)
      const fotoX = canvasFrontal.width - calcularProporcion(240, PLANTILLA_REFERENCIA.width, canvasFrontal.width)
      const fotoY = calcularProporcion(130, PLANTILLA_REFERENCIA.height, canvasFrontal.height)
      
      // Dibujar categoría (MASTER en azul) - centrada sobre la imagen con sombra
      const categoriaX = fotoX + (fotoWidth / 2)  // Centro horizontal de la imagen
      const categoriaY = fotoY - calcularProporcion(35, PLANTILLA_REFERENCIA.height, canvasFrontal.height)  // Justo arriba de la imagen
      dibujarTextoConSombra(categoriaNombre, categoriaX, categoriaY, '#0000FF', 28, 'center')
      ctxFrontal.textAlign = 'left'  // Volver a alineación izquierda para el resto
      
      // Dibujar número de jugador (rojo, grande) - A LA IZQUIERDA de la foto con sombra
      ctxFrontal.textAlign = 'center'
      ctxFrontal.textBaseline = 'middle'
      // Posicionar el número a la izquierda de la foto, centrado verticalmente con la foto
      const numeroX = fotoX - calcularProporcion(90, PLANTILLA_REFERENCIA.width, canvasFrontal.width)
      const numeroY = fotoY + (fotoHeight / 2)  // Centrado verticalmente con la foto
      const fontSizeNumero = calcularTamañoFuente(96, PLANTILLA_REFERENCIA.width, canvasFrontal.width)
      const offsetSombraNumero = Math.max(1, Math.round(3 * factorProporcion))
      // Sombra del número
      ctxFrontal.fillStyle = 'rgba(0, 0, 0, 0.4)'
      ctxFrontal.font = `bold ${fontSizeNumero}px Arial`
      ctxFrontal.fillText(numeroFormateado, numeroX + offsetSombraNumero, numeroY + offsetSombraNumero)
      // Número principal
      ctxFrontal.fillStyle = '#CC0000'  // Rojo más oscuro para mejor contraste
      ctxFrontal.fillText(numeroFormateado, numeroX, numeroY)
      ctxFrontal.fillStyle = '#000000'
      ctxFrontal.textAlign = 'left'
      ctxFrontal.textBaseline = 'top'
      
      // Dibujar foto del jugador con marco y sombra (tamaños proporcionales)
      const marcoExtra = calcularProporcion(10, PLANTILLA_REFERENCIA.width, canvasFrontal.width)
      const offsetMarco = calcularProporcion(5, PLANTILLA_REFERENCIA.width, canvasFrontal.width)
      const offsetSombraMarco = calcularProporcion(8, PLANTILLA_REFERENCIA.width, canvasFrontal.width)
      const grosorMarco = Math.max(1, Math.round(calcularProporcion(3, PLANTILLA_REFERENCIA.width, canvasFrontal.width)))
      const offsetFoto = calcularProporcion(7, PLANTILLA_REFERENCIA.width, canvasFrontal.width)
      
      const fotoCanvas = document.createElement('canvas')
      fotoCanvas.width = fotoWidth + marcoExtra
      fotoCanvas.height = fotoHeight + marcoExtra
      const fotoCtx = fotoCanvas.getContext('2d')
      
      if (fotoCtx) {
        fotoCtx.fillStyle = 'rgba(0, 0, 0, 0.3)'
        fotoCtx.fillRect(offsetSombraMarco, offsetSombraMarco, fotoWidth + 4, fotoHeight + 4)
        fotoCtx.fillStyle = '#FFFFFF'
        fotoCtx.fillRect(offsetMarco, offsetMarco, fotoWidth + 4, fotoHeight + 4)
        fotoCtx.strokeStyle = '#333333'
        fotoCtx.lineWidth = grosorMarco
        fotoCtx.strokeRect(offsetMarco, offsetMarco, fotoWidth + 4, fotoHeight + 4)
        fotoCtx.drawImage(fotoJugador, offsetFoto, offsetFoto, fotoWidth, fotoHeight)
        ctxFrontal.drawImage(fotoCanvas, fotoX - offsetMarco, fotoY - offsetMarco)
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
      } catch (error) {
        const nombreJugador = jugador.apellido_nombre || jugador.cedula || `Jugador ${i + 1}`
        const mensajeError = error instanceof Error ? error.message : String(error) || 'Error desconocido'
        const errorCompleto = `Error al generar carnet para ${nombreJugador}: ${mensajeError}`
        errores.push(errorCompleto)
        console.error(errorCompleto, error)
        // Continuar con el siguiente jugador
      }
    }

    // Si no se generó ningún carnet, mostrar error
    if (carnetsFrontales.length === 0) {
      const mensajeError = errores.length > 0 
        ? `No se pudo generar ningún carnet. Errores:\n${errores.join('\n')}`
        : 'No se pudo generar ningún carnet. Por favor, intente nuevamente.'
      throw new Error(mensajeError)
    }

    // Si hubo errores pero se generaron algunos carnets, mostrar advertencia
    if (errores.length > 0) {
      console.warn('Algunos carnets no se pudieron generar:', errores)
    }

    // Crear una ventana nueva con todos los carnets
    const ventanaImpresion = window.open('', '_blank', 'width=800,height=600')
    if (!ventanaImpresion) {
      throw new Error('No se pudo abrir la ventana de impresión. Por favor, verifique que los bloqueadores de ventanas emergentes estén deshabilitados.')
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
          <title>Carnets de Juego - ${carnetsFrontales.length} jugadores</title>
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

    // Si hubo errores, mostrar advertencia al usuario
    if (errores.length > 0) {
      const mensajeAdvertencia = `Se generaron ${carnetsFrontales.length} de ${jugadores.length} carnets.\n\nErrores:\n${errores.join('\n')}`
      alert(mensajeAdvertencia)
    }
    
  } catch (error) {
    const mensajeError = error instanceof Error 
      ? error.message 
      : `Error desconocido: ${String(error)}`
    console.error('Error al generar carnets múltiples:', error)
    alert(`Error al generar los carnets: ${mensajeError}`)
    throw error // Re-lanzar el error para que el componente pueda manejarlo
  }
}

