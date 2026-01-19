import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface JugadorParticipante {
  id: number
  jugador_id: string
  equipo_tipo: 'local' | 'visitante'
  es_capitan: boolean
  jugador?: {
    id: string
    apellido_nombre: string
    numero_jugador: number | null
    fecha_nacimiento?: string | null
  } | null
}

interface Gol {
  id: number
  jugador_id: string
  minuto: number
  tipo: 'gol' | 'penal' | 'autogol'
  jugador?: {
    id: string
    apellido_nombre: string
  } | null
}

interface Tarjeta {
  id: number
  jugador_id: string
  tipo: 'amarilla' | 'roja'
  jugador?: {
    id: string
    apellido_nombre: string
  } | null
}

interface CambioJugador {
  id: number
  jugador_sale_id: string
  jugador_entra_id: string
  equipo_tipo: 'local' | 'visitante'
  jugador_sale?: {
    id: string
    apellido_nombre: string
    numero_jugador: number | null
  } | null
  jugador_entra?: {
    id: string
    apellido_nombre: string
    numero_jugador: number | null
  } | null
}

interface FirmaEncuentro {
  vocal_nombre?: string | null
  vocal_firma?: string | null
  vocal_informe?: string | null
  arbitro_nombre?: string | null
  arbitro_firma?: string | null
  arbitro_informe?: string | null
  capitan_local_nombre?: string | null
  capitan_local_firma?: string | null
  capitan_visitante_nombre?: string | null
  capitan_visitante_firma?: string | null
  tribunal_informe?: string | null
  tribunal_presidente_firma?: string | null
  tribunal_secretario_firma?: string | null
  tribunal_vocal_firma?: string | null
}

interface EncuentroCompleto {
  id: number
  fecha_programada: Date | null
  cancha?: string | null
  horario?: {
    hora_inicio?: string | null
    nombre?: string | null
  } | null
  equipoLocal: {
    id: number
    nombre: string
  } | null
  equipoVisitante: {
    id: number
    nombre: string
  } | null
  jugadoresParticipantes: JugadorParticipante[]
  goles: Gol[]
  tarjetas: Tarjeta[]
  cambios: CambioJugador[]
  firmas: FirmaEncuentro | null
}

interface ConfiguracionEscuela {
  nombre?: string
  direccion?: string
  telefono?: string
  email?: string
}

/**
 * Genera un PDF de hoja de vocalía para un encuentro
 */
export async function generarPDFHojaVocalia(
  encuentro: EncuentroCompleto,
  categoriaNombre: string,
  jornada: number,
  configuracion?: ConfiguracionEscuela
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 10
  
  // Cargar imagen de marca de agua y procesarla con opacidad
  let watermarkDataUrl: string | null = null
  let watermarkAspectRatio: number = 1 // Relación de aspecto de la imagen
  try {
    // Verificar que estamos en el navegador (document está disponible)
    if (typeof document !== 'undefined') {
      const watermarkUrl = '/uploads/campeonato-de-futbol.png'
      const watermarkImg = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => resolve(img)
        img.onerror = reject
        img.src = watermarkUrl
      })

      // Guardar relación de aspecto
      watermarkAspectRatio = watermarkImg.height / watermarkImg.width

      // Crear canvas para aplicar opacidad a la marca de agua
      const canvas = document.createElement('canvas')
      canvas.width = watermarkImg.width
      canvas.height = watermarkImg.height
      const ctx = canvas.getContext('2d')
      
      if (ctx) {
        // Aplicar opacidad (0.30 = 30% de opacidad para que sea más visible a través del contenido blanco)
        // La marca de agua se dibuja ANTES del contenido, pero necesita suficiente opacidad para verse
        ctx.globalAlpha = 0.04
        ctx.drawImage(watermarkImg, 0, 0, canvas.width, canvas.height)
        // Convertir canvas a data URL
        watermarkDataUrl = canvas.toDataURL('image/png')
      }
    }
  } catch (error) {
    console.warn('No se pudo cargar la imagen de marca de agua:', error)
  }
  
  // Función para dibujar marca de agua
  const dibujarMarcaDeAgua = () => {
    if (watermarkDataUrl) {
      // Calcular tamaño de la marca de agua (aproximadamente 60% del ancho de la página para mejor visibilidad)
      const watermarkWidth = pageWidth * 0.6
      // Calcular altura basándose en la relación de aspecto real de la imagen
      const watermarkHeight = watermarkWidth * watermarkAspectRatio
      
      // Centrar la marca de agua en la página
      const watermarkX = (pageWidth - watermarkWidth) / 2
      const watermarkY = (pageHeight - watermarkHeight) / 2
      
      // Agregar la imagen de marca de agua con opacidad ya aplicada
      // Usar 'SLOW' para mejor calidad de renderizado
      doc.addImage(watermarkDataUrl, 'PNG', watermarkX, watermarkY, watermarkWidth, watermarkHeight, undefined, 'SLOW')
    }
  }
  
  // Configurar bordes redondeados para las tablas (más pronunciado)
  doc.setLineJoin('round')
  doc.setLineCap('round')
  const contentWidth = pageWidth - 2 * margin

  // Configuración de la escuela (valores por defecto si no se proporcionan)
  const escuelaNombre = configuracion?.nombre || '"LIGA DEPORTIVA BARRIAL ATAHUALPA"'
  const escuelaDireccion = configuracion?.direccion || 'VALLE DE LOS CHILLOS - CHAUPITENA'
  const escuelaTelefono = configuracion?.telefono || 'TELF. 000000'
  const escuelaEmail = configuracion?.email || 'ligaatahualpaoficial.com'

  let yPos = margin

  // Definir colores principales (máximo 2)
  const colorPrincipal: [number, number, number] = [0, 51, 102] // Azul oscuro
  const colorSecundario: [number, number, number] = [64, 64, 64] // Gris oscuro
  const colorGrisAzulado: [number, number, number] = [95, 125, 160] // Gris azulado para títulos

  // Crear banner profesional
  const bannerHeight = 28 // Altura del banner (reducida)
  const bannerY = yPos
  const bannerWidth = pageWidth - (2 * margin)
  
  // Dibujar fondo del banner con gradiente simulado (de azul oscuro a azul medio)
  doc.setFillColor(colorPrincipal[0], colorPrincipal[1], colorPrincipal[2])
  doc.setDrawColor(colorPrincipal[0], colorPrincipal[1], colorPrincipal[2])
  const savedLineWidthBanner = doc.getLineWidth()
  doc.setLineWidth(0.1)
  doc.roundedRect(margin, bannerY, bannerWidth, bannerHeight, 3, 3, 'FD')
  
  // Agregar una línea decorativa en la parte inferior del banner (más clara)
  const colorBannerClaro: [number, number, number] = [30, 70, 120] // Azul medio
  doc.setFillColor(colorBannerClaro[0], colorBannerClaro[1], colorBannerClaro[2])
  doc.rect(margin, bannerY + bannerHeight - 2, bannerWidth, 2, 'F')
  
  // Cargar y agregar logo dentro del banner (centrado a la izquierda)
  let logoWidth = 0
  let logoHeight = 0
  let logoX = margin + 8
  let logoY = bannerY + (bannerHeight / 2)
  
  try {
    const logoUrl = '/uploads/logoLdba.png'
    const logoImg = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = logoUrl
    })

    // Tamaño del logo dentro del banner (reducido para banner más bajo)
    logoWidth = 22
    logoHeight = 22
    logoY = bannerY + (bannerHeight - logoHeight) / 2
    doc.addImage(logoImg, 'PNG', logoX, logoY, logoWidth, logoHeight)
  } catch (error) {
    console.warn('No se pudo cargar el logo:', error)
  }
  
  // Calcular área central para el texto (entre logo y margen derecho)
  const textoAreaX = logoX + logoWidth + 10
  const textoAreaWidth = bannerWidth - textoAreaX - 8
  const textoCenterX = textoAreaX + (textoAreaWidth / 2)
  
  // Calcular posiciones verticales centradas (ajustadas para banner más bajo)
  const textoBannerY = bannerY + (bannerHeight / 2) - 5
  
  // Nombre de la escuela en blanco y negrita (centrado)
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255) // Blanco
  doc.text(escuelaNombre, textoCenterX, textoBannerY, { align: 'center', maxWidth: textoAreaWidth })
  
  // Dirección y teléfono debajo del nombre (centrado, más pequeño)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(220, 220, 220) // Gris claro
  const infoY = textoBannerY + 4
  doc.text(`${escuelaDireccion} | ${escuelaTelefono}`, textoCenterX, infoY, { align: 'center', maxWidth: textoAreaWidth })
  
  // Título "HOJA DE VOCALÍA - CATEGORÍA" dentro del banner (centrado)
  const tituloTexto = `HOJA DE VOCALÍA - ${categoriaNombre.toUpperCase()}`
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255) // Blanco
  const tituloY = infoY + 4
  doc.text(tituloTexto, textoCenterX, tituloY, { align: 'center', maxWidth: textoAreaWidth })
  
  // Restaurar configuración
  doc.setTextColor(0, 0, 0) // Resetear a negro
  doc.setLineWidth(savedLineWidthBanner)
  
  yPos = bannerY + bannerHeight + 5

  // Fecha, hora y cancha
  const fechaTexto = encuentro.fecha_programada
    ? new Date(encuentro.fecha_programada).toLocaleDateString('es-ES')
    : ''
  
  // Formatear hora
  let horaTexto = ''
  if (encuentro.horario?.hora_inicio) {
    try {
      const hora = new Date(`2000-01-01T${encuentro.horario.hora_inicio}`)
      horaTexto = hora.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    } catch {
      horaTexto = encuentro.horario.hora_inicio
    }
  }
  
  const canchaTexto = encuentro.cancha || 'No especificada'
  
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(colorSecundario[0], colorSecundario[1], colorSecundario[2])
  
  // Fecha, hora y cancha en la cabecera
  doc.text(`FECHA: ${fechaTexto}`, margin, yPos)
  if (horaTexto) {
    doc.text(`HORA: ${horaTexto}`, margin + 60, yPos)
  }
  doc.text(`CANCHA: ${canchaTexto}`, margin, yPos + 5)
  
  // Equipos
  const equipoLocalNombre = encuentro.equipoLocal?.nombre || ''
  const equipoVisitanteNombre = encuentro.equipoVisitante?.nombre || ''
  
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(colorPrincipal[0], colorPrincipal[1], colorPrincipal[2])
  
  // Calcular total de goles por equipo (para mostrar en la cabecera)
  const golesLocal = encuentro.goles.filter(g => {
    const jugador = encuentro.jugadoresParticipantes.find(jp => jp.jugador_id === g.jugador_id)
    return jugador?.equipo_tipo === 'local' && g.tipo === 'gol'
  }).length

  const golesVisitante = encuentro.goles.filter(g => {
    const jugador = encuentro.jugadoresParticipantes.find(jp => jp.jugador_id === g.jugador_id)
    return jugador?.equipo_tipo === 'visitante' && g.tipo === 'gol'
  }).length
  
  // Mostrar total de goles en la cabecera
  yPos += 5
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(colorPrincipal[0], colorPrincipal[1], colorPrincipal[2])
  doc.text(`TOTAL: ${equipoLocalNombre} ${golesLocal} - ${golesVisitante} ${equipoVisitanteNombre}`, pageWidth / 2, yPos, { align: 'center' })
  
  // Resetear color a negro
  doc.setTextColor(0, 0, 0)
  
  // Calcular espacio entre tablas (estándar para todas las tablas)
  const espacioEntreTablas = 20
  // Ancho de cada tabla: (ancho total - 2 márgenes - espacio entre tablas) / 2
  const anchoTotalDisponible = pageWidth - (2 * margin) - espacioEntreTablas
  const anchoTabla = anchoTotalDisponible / 2
  // Posición de inicio de la tabla derecha
  const inicioTablaDerecha = margin + anchoTabla + espacioEntreTablas
  
  yPos += 8

  // Obtener IDs de jugadores que ENTRAN en cambios (solo estos se excluyen de la tabla de jugadores)
  // Los jugadores que SALEN sí se muestran en la tabla de jugadores
  const jugadoresQueEntranIds = new Set<string>()
  encuentro.cambios.forEach(cambio => {
    if (cambio.jugador_entra_id) {
      jugadoresQueEntranIds.add(cambio.jugador_entra_id)
    }
  })

  // Separar jugadores por equipo, excluyendo solo los que ENTRAN en cambios
  // Los que SALEN sí se muestran en la tabla de jugadores
  const jugadoresLocal = encuentro.jugadoresParticipantes
    .filter(jp => jp.equipo_tipo === 'local' && !jugadoresQueEntranIds.has(jp.jugador_id))
  
  const jugadoresVisitante = encuentro.jugadoresParticipantes
    .filter(jp => jp.equipo_tipo === 'visitante' && !jugadoresQueEntranIds.has(jp.jugador_id))

  // Función auxiliar para calcular si es juvenil (menor de 18 años)
  const esJuvenil = (fechaNacimiento: string | null | undefined): boolean => {
    if (!fechaNacimiento) return false
    try {
      const fechaNac = new Date(fechaNacimiento)
      const hoy = new Date()
      const edad = hoy.getFullYear() - fechaNac.getFullYear()
      const mes = hoy.getMonth() - fechaNac.getMonth()
      if (mes < 0 || (mes === 0 && hoy.getDate() < fechaNac.getDate())) {
        return (edad - 1) < 18
      }
      return edad < 18
    } catch {
      return false
    }
  }

  // Arrays para rastrear qué filas son juveniles (para aplicar color)
  const esJuvenilLocal: boolean[] = []
  const esJuvenilVisitante: boolean[] = []

  // Tabla de jugadores local
  const tableDataLocal = jugadoresLocal.map((jp, index) => {
    const jugador = jp.jugador
    const nombre = jugador?.apellido_nombre || ''
    const numero = jugador?.numero_jugador || ''
    
    // Contar goles del jugador
    const golesJugador = encuentro.goles.filter(
      g => g.jugador_id === jp.jugador_id && g.tipo === 'gol'
    ).length
    
    // Determinar si es capitán o juvenil
    const esCap = jp.es_capitan
    const esJuv = esJuvenil(jugador?.fecha_nacimiento)
    esJuvenilLocal.push(esJuv) // Guardar si es juvenil para esta fila
    
    // Construir el nombre con las letras C y/o J
    let nombreConMarcas = nombre
    const marcas: string[] = []
    if (esCap) marcas.push('C')
    if (esJuv) marcas.push('J')
    if (marcas.length > 0) {
      nombreConMarcas = `${nombre} (${marcas.join('')})`
    }
    
    return [
      numero.toString(),
      nombreConMarcas,
      golesJugador > 0 ? golesJugador.toString() : '',
    ]
  })

  // Tabla de jugadores visitante
  const tableDataVisitante = jugadoresVisitante.map((jp, index) => {
    const jugador = jp.jugador
    const nombre = jugador?.apellido_nombre || ''
    const numero = jugador?.numero_jugador || ''
    
    // Contar goles del jugador
    const golesJugador = encuentro.goles.filter(
      g => g.jugador_id === jp.jugador_id && g.tipo === 'gol'
    ).length
    
    // Determinar si es capitán o juvenil
    const esCap = jp.es_capitan
    const esJuv = esJuvenil(jugador?.fecha_nacimiento)
    esJuvenilVisitante.push(esJuv) // Guardar si es juvenil para esta fila
    
    // Construir el nombre con las letras C y/o J
    let nombreConMarcas = nombre
    const marcas: string[] = []
    if (esCap) marcas.push('C')
    if (esJuv) marcas.push('J')
    if (marcas.length > 0) {
      nombreConMarcas = `${nombre} (${marcas.join('')})`
    }
    
    return [
      numero.toString(),
      nombreConMarcas,
      golesJugador > 0 ? golesJugador.toString() : '',
    ]
  })

  // Calcular el máximo de filas necesarias (máximo entre local y visitante, mínimo 6)
  const maxFilas = Math.max(tableDataLocal.length, tableDataVisitante.length, 6)
  
  // Agregar filas vacías para que ambas tablas tengan el mismo número de filas
  while (tableDataLocal.length < maxFilas) {
    tableDataLocal.push(['', '', ''])
    esJuvenilLocal.push(false) // Las filas vacías no son juveniles
  }
  while (tableDataVisitante.length < maxFilas) {
    tableDataVisitante.push(['', '', ''])
    esJuvenilVisitante.push(false) // Las filas vacías no son juveniles
  }

  // NO agregar fila de total a la tabla (el total se muestra en la cabecera)

  // Combinar datos de jugadores en una sola tabla (local y visitante lado a lado)
  const jugadoresDataCombinada: any[] = []
  for (let i = 0; i < maxFilas; i++) {
    const filaLocal = tableDataLocal[i] || ['', '', '']
    const filaVisitante = tableDataVisitante[i] || ['', '', '']
    jugadoresDataCombinada.push([...filaLocal, ...filaVisitante])
  }

  // Tabla unificada de jugadores (ocupa todo el ancho)
  autoTable(doc, {
    startY: yPos,
    head: [
      [{ content: `${equipoLocalNombre} vs ${equipoVisitanteNombre}`, colSpan: 6, styles: { fillColor: colorGrisAzulado, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 10, halign: 'center', cellPadding: { top: 3, bottom: 2, left: 2, right: 2 }, lineWidth: 0.1, lineColor: [0, 0, 0] } }],
      ['#', 'JUGADOR', 'GOL', '#', 'JUGADOR', 'GOL']
    ],
    headStyles: {
      fillColor: [255, 255, 255], // Sin color
      textColor: [0, 0, 0], // Negro
      fontStyle: 'bold',
      fontSize: 8,
      minCellHeight: 8, // Aumentar altura de la cabecera
      cellPadding: { top: 3, bottom: 3, left: 2, right: 2 },
      lineWidth: 0, // Sin líneas en la cabecera (igual que cambios)
      lineColor: [0, 0, 0],
    },
    body: jugadoresDataCombinada,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 1, lineWidth: 0.1, lineColor: [0, 0, 0], textColor: [0, 0, 0], halign: 'left', fillColor: false },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 70 },
      2: { cellWidth: 15 },
      3: { cellWidth: 10 },
      4: { cellWidth: 70 },
      5: { cellWidth: 15 },
    },
    margin: { left: margin, right: margin },
    tableWidth: pageWidth - (2 * margin),
    didParseCell: (data: any) => {
      // Asegurar que los títulos se vean correctamente
      if (data.section === 'head' && data.row.index === 0) {
        data.cell.styles.fillColor = false // Desactivar fillColor automático para dibujarlo manualmente
        data.cell.styles.textColor = [255, 255, 255] // Texto blanco
        data.cell.styles.lineWidth = 0 // Sin bordes en los títulos, se dibujan manualmente
      } else if (data.section === 'head' && data.row.index === 1) {
        // Quitar todas las líneas de la segunda fila de la cabecera (encabezados de columnas)
        // Igual que en la tabla de cambios
        data.cell.styles.lineWidth = { top: 0, bottom: 0, left: 0, right: 0 }
        data.cell.styles.lineColor = [0, 0, 0]
      } else {
        // Asegurar bordes en todas las demás celdas (excepto bordes exteriores)
        const isLastRow = data.section === 'body' && data.row.index === jugadoresDataCombinada.length - 1
        const isFirstCol = data.column.index === 0
        const isLastCol = data.column.index === 5
        
        // Configurar bordes: quitar bordes exteriores y la línea de separación en el medio
        const lineWidth: any = { top: 0.1, bottom: 0.1, left: 0.1, right: 0.1 }
        if (isLastRow) lineWidth.bottom = 0 // Quitar borde inferior de la última fila
        if (isFirstCol) lineWidth.left = 0
        if (isLastCol) lineWidth.right = 0
        // Quitar línea vertical en la separación entre equipos (columna 2 derecha y columna 3 izquierda)
        if (data.column.index === 2) lineWidth.right = 0 // Sin borde derecho en la última columna del equipo local
        if (data.column.index === 3) lineWidth.left = 0 // Sin borde izquierdo en la primera columna del equipo visitante
        
        data.cell.styles.lineWidth = lineWidth
        data.cell.styles.lineColor = [0, 0, 0]
        
        // Aplicar color de fondo sutil para jugadores juveniles
        if (data.section === 'body') {
          const rowIndex = data.row.index
          // Columnas 0, 1, 2 son del equipo local, columnas 3, 4, 5 son del equipo visitante
          const isLocal = data.column.index < 3
          const esJuvenilFila = isLocal ? esJuvenilLocal[rowIndex] : esJuvenilVisitante[rowIndex]
          
          if (esJuvenilFila) {
            // Color de fondo sutil (gris claro)
            data.cell.styles.fillColor = [240, 240, 240] // Gris claro
          }
        }
      }
    },
    didDrawCell: (data: any) => {
      // Dibujar fondo redondeado sin color en las líneas de los bordes
      if (data.section === 'head' && data.row.index === 0) {
        const cell = data.cell
        const x = cell.x
        const y = cell.y
        const width = cell.width
        const height = cell.height
        const radius = 3
        
        // Dibujar el fondo con borde redondeado pero sin color en las líneas
        doc.setFillColor(colorGrisAzulado[0], colorGrisAzulado[1], colorGrisAzulado[2])
        doc.setDrawColor(colorGrisAzulado[0], colorGrisAzulado[1], colorGrisAzulado[2]) // Mismo color que el fondo para que no se vea la línea
        const savedLineWidth = doc.getLineWidth()
        doc.setLineWidth(0.1)
        doc.roundedRect(x, y, width, height, radius, radius, 'FD') // 'FD' = Fill and Draw
        
        // Redibujar el texto con color blanco después del fondo
        doc.setTextColor(255, 255, 255)
        const text = Array.isArray(cell.text) ? cell.text[0] : (cell.text || '')
        if (text) {
          const textX = x + width / 2
          const textY = y + height / 2 + 2
          doc.text(text, textX, textY, { align: 'center', baseline: 'middle' })
        }
        doc.setLineWidth(savedLineWidth)
      }
    },
    willDrawPage: (data: any) => {
      // Dibujar marca de agua ANTES de que se dibuje cada página de la tabla
      // Esto asegura que la marca de agua esté detrás del contenido
      dibujarMarcaDeAgua()
    },
  })

  // Obtener la posición Y después de las tablas
  const finalY = (doc as any).lastAutoTable.finalY || yPos + 50
  const tableStartY = (doc as any).lastAutoTable.startY || yPos
  
  // Dibujar borde exterior alrededor de la tabla de jugadores
  // Solo redondeo en los bordes superiores (top)
  const tableHeight = finalY - tableStartY
  const tableWidth = pageWidth - (2 * margin)
  const radius = 3 // Radio de redondeo
  const savedLineWidth = doc.getLineWidth()
  doc.setLineWidth(0.1)
  doc.setDrawColor(0, 0, 0)
  
  // Dibujar borde manualmente con redondeo solo en esquinas superiores
  // Línea superior (desde después de la esquina izquierda hasta antes de la esquina derecha)
  doc.line(margin + radius, tableStartY, pageWidth - margin - radius, tableStartY)
  
  // Esquina superior izquierda redondeada (usando roundedRect solo para el arco)
  doc.roundedRect(margin, tableStartY, radius * 2, radius * 2, radius, 0, 'S')
  
  // Esquina superior derecha redondeada (usando roundedRect solo para el arco)
  doc.roundedRect(pageWidth - margin - radius * 2, tableStartY, radius * 2, radius * 2, radius, 0, 'S')
  
  // Línea izquierda (recta, desde después del redondeo hasta el fondo)
  doc.line(margin, tableStartY + radius, margin, finalY)
  
  // Línea derecha (recta, desde después del redondeo hasta el fondo)
  doc.line(pageWidth - margin, tableStartY + radius, pageWidth - margin, finalY)
  
  // Línea inferior (recta)
  doc.line(margin, finalY, pageWidth - margin, finalY)
  
  doc.setLineWidth(savedLineWidth)
  
  yPos = finalY + 3

  // Sección de cambios

  // Obtener cambios por equipo
  const cambiosLocal = encuentro.cambios.filter(c => c.equipo_tipo === 'local').slice(0, 6)
  const cambiosVisitante = encuentro.cambios.filter(c => c.equipo_tipo === 'visitante').slice(0, 6)

  // Preparar datos de cambios con información de jugadores
  const cambiosDataLocal = cambiosLocal.map((c, index) => {
    const jugadorEntra = c.jugador_entra
    const jugadorSale = c.jugador_sale
    const nombre = jugadorEntra?.apellido_nombre || ''
    const numero = jugadorEntra?.numero_jugador || ''
    const numeroSale = jugadorSale?.numero_jugador || ''
    
    // Contar goles del jugador que entra
    const golesJugador = encuentro.goles.filter(
      g => g.jugador_id === c.jugador_entra_id && g.tipo === 'gol'
    ).length
    
    return [
      numero.toString(),
      nombre,
      golesJugador > 0 ? golesJugador.toString() : '',
      numeroSale ? numeroSale.toString() : '',
    ]
  })

  const cambiosDataVisitante = cambiosVisitante.map((c, index) => {
    const jugadorEntra = c.jugador_entra
    const jugadorSale = c.jugador_sale
    const nombre = jugadorEntra?.apellido_nombre || ''
    const numero = jugadorEntra?.numero_jugador || ''
    const numeroSale = jugadorSale?.numero_jugador || ''
    
    // Contar goles del jugador que entra
    const golesJugador = encuentro.goles.filter(
      g => g.jugador_id === c.jugador_entra_id && g.tipo === 'gol'
    ).length
    
    return [
      numero.toString(),
      nombre,
      golesJugador > 0 ? golesJugador.toString() : '',
      numeroSale ? numeroSale.toString() : '',
    ]
  })

  while (cambiosDataLocal.length < 6) {
    cambiosDataLocal.push(['', '', '', ''])
  }
  while (cambiosDataVisitante.length < 6) {
    cambiosDataVisitante.push(['', '', '', ''])
  }

  // Combinar datos de cambios en una sola tabla (local y visitante lado a lado)
  const cambiosDataCombinada: any[] = []
  for (let i = 0; i < 6; i++) {
    const filaLocal = cambiosDataLocal[i] || ['', '', '', '']
    const filaVisitante = cambiosDataVisitante[i] || ['', '', '', '']
    cambiosDataCombinada.push([...filaLocal, ...filaVisitante])
  }

  // Tabla unificada de cambios (ocupa todo el ancho)
  autoTable(doc, {
    startY: yPos,
    head: [
      [{ content: 'CAMBIOS', colSpan: 8, styles: { fillColor: colorGrisAzulado, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 10, halign: 'center', cellPadding: { top: 3, bottom: 2, left: 2, right: 2 }, lineWidth: 0.1, lineColor: [0, 0, 0] } }],
      ['#', 'JUGADOR ENTRA', 'GOL', 'SALE', '#', 'JUGADOR', 'GOL', 'SALE']
    ],
    headStyles: {
      fillColor: [255, 255, 255], // Sin color
      textColor: [0, 0, 0], // Negro
      fontStyle: 'bold',
      fontSize: 8,
      minCellHeight: 8, // Aumentar altura de la cabecera
      cellPadding: { top: 3, bottom: 3, left: 2, right: 2 },
    },
    body: cambiosDataCombinada,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 1, lineWidth: 0.1, lineColor: [0, 0, 0], textColor: [0, 0, 0], fillColor: false },
    columnStyles: {
      0: { cellWidth: 10 },  // #
      1: { cellWidth: 65 },  // JUGADOR
      2: { cellWidth: 8 },   // GOL
      3: { cellWidth: 12 },  // SALE
      4: { cellWidth: 10 },  // #
      5: { cellWidth: 65 },  // JUGADOR
      6: { cellWidth: 8 },   // GOL
      7: { cellWidth: 12 },  // SALE
    },
    margin: { left: margin, right: margin },
    tableWidth: pageWidth - (2 * margin),
    didParseCell: (data: any) => {
      // Asegurar que el título se vea correctamente
      if (data.section === 'head' && data.row.index === 0) {
        // Evitar que autoTable dibuje fondo o bordes
        data.cell.styles.fillColor = [255, 255, 255]
        data.cell.styles.textColor = [255, 255, 255]
        data.cell.styles.lineWidth = 0
        data.cell.styles.cellPadding = 0
      } else {
        // Asegurar bordes en todas las demás celdas (excepto bordes exteriores)
        const isFirstRow = data.section === 'head' && data.row.index === 1
        const isLastRow = data.section === 'body' && data.row.index === cambiosDataCombinada.length - 1
        const isFirstCol = data.column.index === 0
        const isLastCol = data.column.index === 7
        
        // Configurar bordes: quitar bordes exteriores, mantener internos
        const lineWidth: any = { top: 0.1, bottom: 0.1, left: 0.1, right: 0.1 }
        if (isFirstRow) lineWidth.top = 0
        if (isLastRow) lineWidth.bottom = 0
        if (isFirstCol) lineWidth.left = 0
        if (isLastCol) lineWidth.right = 0
        
        data.cell.styles.lineWidth = lineWidth
        data.cell.styles.lineColor = [0, 0, 0]
        
        // Agregar línea vertical más gruesa en el medio para separar los equipos
        if (data.column.index === 3) {
          data.cell.styles.lineWidth = { top: lineWidth.top, bottom: lineWidth.bottom, left: 0.1, right: 0.2 }
          data.cell.styles.lineColor = [0, 0, 0]
        } else if (data.column.index === 4) {
          data.cell.styles.lineWidth = { top: lineWidth.top, bottom: lineWidth.bottom, left: 0.2, right: 0.1 }
          data.cell.styles.lineColor = [0, 0, 0]
        }
      }
    },
    didDrawCell: (data: any) => {
      // Dibujar fondo redondeado sin color en las líneas de los bordes
      if (data.section === 'head' && data.row.index === 0) {
        const cell = data.cell
        const x = cell.x
        const y = cell.y
        const width = cell.width
        const height = cell.height
        const radius = 3
        
        // Dibujar el fondo con borde redondeado pero sin color en las líneas
        doc.setFillColor(colorGrisAzulado[0], colorGrisAzulado[1], colorGrisAzulado[2])
        doc.setDrawColor(colorGrisAzulado[0], colorGrisAzulado[1], colorGrisAzulado[2]) // Mismo color que el fondo para que no se vea la línea
        const savedLineWidthCambios = doc.getLineWidth()
        doc.setLineWidth(0.1)
        doc.roundedRect(x, y, width, height, radius, radius, 'FD') // 'FD' = Fill and Draw
        
        // Redibujar el texto con color blanco después del fondo
        doc.setTextColor(255, 255, 255)
        const text = Array.isArray(cell.text) ? cell.text[0] : (cell.text || '')
        if (text) {
          const textX = x + width / 2
          const textY = y + height / 2 + 2
          doc.text(text, textX, textY, { align: 'center', baseline: 'middle' })
        }
        doc.setLineWidth(savedLineWidthCambios)
      }
    },
    willDrawPage: (data: any) => {
      // Dibujar marca de agua ANTES de que se dibuje cada página de la tabla
      dibujarMarcaDeAgua()
    },
  })

  const finalYCambios = (doc as any).lastAutoTable.finalY || yPos + 50
  const tableStartYCambios = (doc as any).lastAutoTable.startY || yPos
  
  // Dibujar borde exterior redondeado alrededor de la tabla de cambios
  const tableHeightCambios = finalYCambios - tableStartYCambios
  const radiusCambios = 3 // Radio de redondeo
  const savedLineWidthCambios = doc.getLineWidth()
  doc.setLineWidth(0.1)
  doc.setDrawColor(0, 0, 0)
  doc.roundedRect(margin, tableStartYCambios, pageWidth - (2 * margin), tableHeightCambios, radiusCambios, radiusCambios)
  doc.setLineWidth(savedLineWidthCambios)
  
  yPos = finalYCambios + 3

  // Sección de resumen de tarjetas

  // Obtener tarjetas por equipo
  const tarjetasLocal = encuentro.tarjetas.filter(t => {
    const jugador = encuentro.jugadoresParticipantes.find(jp => jp.jugador_id === t.jugador_id)
    return jugador?.equipo_tipo === 'local'
  })

  const tarjetasVisitante = encuentro.tarjetas.filter(t => {
    const jugador = encuentro.jugadoresParticipantes.find(jp => jp.jugador_id === t.jugador_id)
    return jugador?.equipo_tipo === 'visitante'
  })

  // Separar tarjetas amarillas y rojas por equipo
  const tarjetasAmarillasLocal = tarjetasLocal.filter(t => t.tipo === 'amarilla')
  const tarjetasRojasLocal = tarjetasLocal.filter(t => t.tipo === 'roja')
  const tarjetasAmarillasVisitante = tarjetasVisitante.filter(t => t.tipo === 'amarilla')
  const tarjetasRojasVisitante = tarjetasVisitante.filter(t => t.tipo === 'roja')

  // Preparar datos de tarjetas amarillas
  const tarjetasAmarillasDataLocal = tarjetasAmarillasLocal.map(t => {
    const jugador = encuentro.jugadoresParticipantes.find(jp => jp.jugador_id === t.jugador_id)?.jugador
    const nombre = jugador?.apellido_nombre || ''
    const numero = jugador?.numero_jugador || ''
    return `${numero} - ${nombre}`
  })

  const tarjetasAmarillasDataVisitante = tarjetasAmarillasVisitante.map(t => {
    const jugador = encuentro.jugadoresParticipantes.find(jp => jp.jugador_id === t.jugador_id)?.jugador
    const nombre = jugador?.apellido_nombre || ''
    const numero = jugador?.numero_jugador || ''
    return `${numero} - ${nombre}`
  })

  // Preparar datos de tarjetas rojas
  const tarjetasRojasDataLocal = tarjetasRojasLocal.map(t => {
    const jugador = encuentro.jugadoresParticipantes.find(jp => jp.jugador_id === t.jugador_id)?.jugador
    const nombre = jugador?.apellido_nombre || ''
    const numero = jugador?.numero_jugador || ''
    return `${numero} - ${nombre}`
  })

  const tarjetasRojasDataVisitante = tarjetasRojasVisitante.map(t => {
    const jugador = encuentro.jugadoresParticipantes.find(jp => jp.jugador_id === t.jugador_id)?.jugador
    const nombre = jugador?.apellido_nombre || ''
    const numero = jugador?.numero_jugador || ''
    return `${numero} - ${nombre}`
  })

  // Obtener el máximo de filas para las tablas (amarillas y rojas juntas)
  const maxFilasAmarillas = Math.max(
    tarjetasAmarillasDataLocal.length,
    tarjetasAmarillasDataVisitante.length,
    1
  )
  
  const maxFilasRojas = Math.max(
    tarjetasRojasDataLocal.length,
    tarjetasRojasDataVisitante.length,
    1
  )

  // Preparar datos de tarjetas amarillas
  const amarillasTableDataLocal = tarjetasAmarillasDataLocal.length > 0 
    ? tarjetasAmarillasDataLocal.map(nombre => [nombre])
    : [['Ninguna']]
  
  const amarillasTableDataVisitante = tarjetasAmarillasDataVisitante.length > 0
    ? tarjetasAmarillasDataVisitante.map(nombre => [nombre])
    : [['Ninguna']]

  // Preparar datos de tarjetas rojas
  const rojasTableDataLocal = tarjetasRojasDataLocal.length > 0
    ? tarjetasRojasDataLocal.map(nombre => [nombre])
    : [['Ninguna']]
  
  const rojasTableDataVisitante = tarjetasRojasDataVisitante.length > 0
    ? tarjetasRojasDataVisitante.map(nombre => [nombre])
    : [['Ninguna']]

  // Completar con filas vacías si es necesario
  while (amarillasTableDataLocal.length < maxFilasAmarillas) {
    amarillasTableDataLocal.push([''])
  }
  while (amarillasTableDataVisitante.length < maxFilasAmarillas) {
    amarillasTableDataVisitante.push([''])
  }
  while (rojasTableDataLocal.length < maxFilasRojas) {
    rojasTableDataLocal.push([''])
  }
  while (rojasTableDataVisitante.length < maxFilasRojas) {
    rojasTableDataVisitante.push([''])
  }

  // Combinar datos: primero amarillas, luego rojas, todo en una sola tabla
  const tarjetasDataCombinada: any[] = []
  
  // Agregar fila de título "TARJETAS AMARILLAS"
  tarjetasDataCombinada.push([
    { content: 'TARJETAS AMARILLAS', colSpan: 1, styles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 8 } },
    { content: 'TARJETAS AMARILLAS', colSpan: 1, styles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 8 } }
  ])
  
  // Agregar datos de tarjetas amarillas
  for (let i = 0; i < maxFilasAmarillas; i++) {
    const filaLocal = amarillasTableDataLocal[i] || ['']
    const filaVisitante = amarillasTableDataVisitante[i] || ['']
    tarjetasDataCombinada.push([...filaLocal, ...filaVisitante])
  }
  
  // Agregar fila de título "TARJETAS ROJAS"
  tarjetasDataCombinada.push([
    { content: 'TARJETAS ROJAS', colSpan: 1, styles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 8 } },
    { content: 'TARJETAS ROJAS', colSpan: 1, styles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 8 } }
  ])
  
  // Agregar datos de tarjetas rojas
  for (let i = 0; i < maxFilasRojas; i++) {
    const filaLocal = rojasTableDataLocal[i] || ['']
    const filaVisitante = rojasTableDataVisitante[i] || ['']
    tarjetasDataCombinada.push([...filaLocal, ...filaVisitante])
  }

  // Tabla unificada de tarjetas (ocupa todo el ancho)
  autoTable(doc, {
    startY: yPos,
    head: [
      [{ content: 'RESUMEN DE TARJETAS', colSpan: 2, styles: { fillColor: colorGrisAzulado, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 10, halign: 'center', cellPadding: { top: 3, bottom: 2, left: 2, right: 2 }, lineWidth: 0.1, lineColor: [0, 0, 0] } }],
      [{ content: equipoLocalNombre, colSpan: 1, styles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 8, halign: 'center', cellPadding: { top: 2, bottom: 2, left: 2, right: 2 }, lineWidth: 0.1, lineColor: [0, 0, 0] } }, { content: equipoVisitanteNombre, colSpan: 1, styles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 8, halign: 'center', cellPadding: { top: 2, bottom: 2, left: 2, right: 2 }, lineWidth: 0.1, lineColor: [0, 0, 0] } }]
    ],
    headStyles: {
      fillColor: [255, 255, 255], // Sin color
      textColor: [0, 0, 0], // Negro
      fontStyle: 'bold',
      fontSize: 8,
      minCellHeight: 8, // Aumentar altura de la cabecera
      cellPadding: { top: 3, bottom: 3, left: 2, right: 2 },
    },
    body: tarjetasDataCombinada,
    theme: 'grid',
    styles: { fontSize: 7, cellPadding: 2, lineWidth: 0.1, lineColor: [0, 0, 0], textColor: [0, 0, 0], fillColor: false },
    columnStyles: {
      0: { cellWidth: (pageWidth - (2 * margin)) / 2 },
      1: { cellWidth: (pageWidth - (2 * margin)) / 2 },
    },
    margin: { left: margin, right: margin },
    tableWidth: pageWidth - (2 * margin),
    didParseCell: (data: any) => {
      // Asegurar que el título se vea correctamente
      if (data.section === 'head' && data.row.index === 0) {
        // Evitar que autoTable dibuje fondo o bordes
        data.cell.styles.fillColor = [255, 255, 255]
        data.cell.styles.textColor = [255, 255, 255]
        data.cell.styles.lineWidth = 0
        data.cell.styles.cellPadding = 0
      } else {
        // Asegurar bordes en todas las demás celdas (excepto bordes exteriores)
        const isFirstRow = data.section === 'head' && data.row.index === 1
        const isLastRow = data.section === 'body' && data.row.index === tarjetasDataCombinada.length - 1
        const isFirstCol = data.column.index === 0
        const isLastCol = data.column.index === 1
        
        // Configurar bordes: quitar bordes exteriores, mantener internos
        const lineWidth: any = { top: 0.1, bottom: 0.1, left: 0.1, right: 0.1 }
        if (isFirstRow) lineWidth.top = 0
        if (isLastRow) lineWidth.bottom = 0
        if (isFirstCol) lineWidth.left = 0
        if (isLastCol) lineWidth.right = 0
        
        data.cell.styles.lineWidth = lineWidth
        data.cell.styles.lineColor = [0, 0, 0]
        
        // Agregar línea vertical más gruesa en el medio para separar los equipos
        if (data.column.index === 0) {
          data.cell.styles.lineWidth = { top: lineWidth.top, bottom: lineWidth.bottom, left: 0, right: 0.2 }
          data.cell.styles.lineColor = [0, 0, 0]
        } else if (data.column.index === 1) {
          data.cell.styles.lineWidth = { top: lineWidth.top, bottom: lineWidth.bottom, left: 0.2, right: 0 }
          data.cell.styles.lineColor = [0, 0, 0]
        }
        
        // Estilo para las filas de título "TARJETAS AMARILLAS" y "TARJETAS ROJAS"
        if (data.section === 'body') {
          const rowIndex = data.row.index
          const amarillasTitleIndex = 0
          const rojasTitleIndex = maxFilasAmarillas + 1
          if (rowIndex === amarillasTitleIndex || rowIndex === rojasTitleIndex) {
            data.cell.styles.fontStyle = 'bold'
            data.cell.styles.fontSize = 8
            data.cell.styles.halign = 'center'
          }
        }
      }
    },
    didDrawCell: (data: any) => {
      // Dibujar fondo redondeado sin color en las líneas de los bordes
      if (data.section === 'head' && data.row.index === 0) {
        const cell = data.cell
        const x = cell.x
        const y = cell.y
        const width = cell.width
        const height = cell.height
        const radius = 3
        
        // Dibujar el fondo con borde redondeado pero sin color en las líneas
        doc.setFillColor(colorGrisAzulado[0], colorGrisAzulado[1], colorGrisAzulado[2])
        doc.setDrawColor(colorGrisAzulado[0], colorGrisAzulado[1], colorGrisAzulado[2]) // Mismo color que el fondo para que no se vea la línea
        const savedLineWidthTarjetas = doc.getLineWidth()
        doc.setLineWidth(0.1)
        doc.roundedRect(x, y, width, height, radius, radius, 'FD') // 'FD' = Fill and Draw
        
        // Redibujar el texto con color blanco después del fondo
        doc.setTextColor(255, 255, 255)
        const text = Array.isArray(cell.text) ? cell.text[0] : (cell.text || '')
        if (text) {
          const textX = x + width / 2
          const textY = y + height / 2 + 2
          doc.text(text, textX, textY, { align: 'center', baseline: 'middle' })
        }
        doc.setLineWidth(savedLineWidthTarjetas)
      }
    },
    willDrawPage: (data: any) => {
      // Dibujar marca de agua ANTES de que se dibuje cada página de la tabla
      dibujarMarcaDeAgua()
    },
  })

  const finalYRojas = (doc as any).lastAutoTable.finalY || yPos + 20
  const tableStartYTarjetas = (doc as any).lastAutoTable.startY || yPos
  
  // Dibujar borde exterior redondeado alrededor de la tabla de tarjetas
  const tableHeightTarjetas = finalYRojas - tableStartYTarjetas
  const radiusTarjetas = 3 // Radio de redondeo
  const savedLineWidthTarjetas = doc.getLineWidth()
  doc.setLineWidth(0.1)
  doc.setDrawColor(0, 0, 0)
  doc.roundedRect(margin, tableStartYTarjetas, pageWidth - (2 * margin), tableHeightTarjetas, radiusTarjetas, radiusTarjetas)
  doc.setLineWidth(savedLineWidthTarjetas)
  
  yPos = finalYRojas + 3

  // Calcular espacio necesario para las firmas de los capitanes (si existen)
  const capitanLocalFirma = encuentro.firmas?.capitan_local_firma || ''
  const capitanVisitanteFirma = encuentro.firmas?.capitan_visitante_firma || ''
  let espacioFirmaCapitanes = 0
  
  // Calcular la altura máxima de las dos firmas de capitanes
  if (capitanLocalFirma) {
    try {
      const firmaImg = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => resolve(img)
        img.onerror = reject
        img.src = capitanLocalFirma
      })
      const firmaWidth = 50
      const firmaHeight = (firmaImg.height / firmaImg.width) * firmaWidth
      espacioFirmaCapitanes = Math.max(espacioFirmaCapitanes, firmaHeight + 5)
    } catch (error) {
      espacioFirmaCapitanes = Math.max(espacioFirmaCapitanes, 10)
    }
  }
  
  if (capitanVisitanteFirma) {
    try {
      const firmaImg = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => resolve(img)
        img.onerror = reject
        img.src = capitanVisitanteFirma
      })
      const firmaWidth = 50
      const firmaHeight = (firmaImg.height / firmaImg.width) * firmaWidth
      espacioFirmaCapitanes = Math.max(espacioFirmaCapitanes, firmaHeight + 5)
    } catch (error) {
      espacioFirmaCapitanes = Math.max(espacioFirmaCapitanes, 10)
    }
  }
  
  if (espacioFirmaCapitanes === 0) {
    espacioFirmaCapitanes = 10 // Espacio por defecto si no hay firmas
  }

  // Sección de firmas - calcular posición dinámicamente para evitar solapamiento
  const firmaY = Math.max(yPos + espacioFirmaCapitanes + 5, pageHeight - 80)

  // Capitanes - Lado a lado
  // Lado izquierdo - Capitán local
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.line(margin, firmaY, margin + 60, firmaY)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.text(`CAPITÁN ${equipoLocalNombre}`, margin, firmaY + 4)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  const capitanLocalNombre = encuentro.firmas?.capitan_local_nombre || ''
  
  // Mostrar imagen de firma si existe (justo sobre la línea)
  if (capitanLocalFirma) {
    try {
      const firmaImg = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => resolve(img)
        img.onerror = reject
        img.src = capitanLocalFirma
      })
      const firmaWidth = 50
      const firmaHeight = (firmaImg.height / firmaImg.width) * firmaWidth
      // Colocar la firma justo encima de la línea (2mm arriba)
      doc.addImage(firmaImg, 'PNG', margin, firmaY - firmaHeight - 2, firmaWidth, firmaHeight)
    } catch (error) {
      console.warn('No se pudo cargar la firma del capitán local:', error)
    }
  }
  // Mostrar nombre siempre (debajo de la línea)
  if (capitanLocalNombre) {
    doc.text(capitanLocalNombre, margin, firmaY + 8)
  } else {
    doc.text('___________________', margin, firmaY + 8)
  }

  // Lado derecho - Capitán visitante
  doc.line(pageWidth / 2 + margin, firmaY, pageWidth - margin, firmaY)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.text(`CAPITÁN ${equipoVisitanteNombre}`, pageWidth / 2 + margin, firmaY + 4)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  const capitanVisitanteNombre = encuentro.firmas?.capitan_visitante_nombre || ''
  
  // Mostrar imagen de firma si existe (justo sobre la línea)
  if (capitanVisitanteFirma) {
    try {
      const firmaImg = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => resolve(img)
        img.onerror = reject
        img.src = capitanVisitanteFirma
      })
      const firmaWidth = 50
      const firmaHeight = (firmaImg.height / firmaImg.width) * firmaWidth
      // Colocar la firma justo encima de la línea (2mm arriba)
      doc.addImage(firmaImg, 'PNG', pageWidth / 2 + margin, firmaY - firmaHeight - 2, firmaWidth, firmaHeight)
    } catch (error) {
      console.warn('No se pudo cargar la firma del capitán visitante:', error)
    }
  }
  // Mostrar nombre siempre (debajo de la línea)
  if (capitanVisitanteNombre) {
    doc.text(capitanVisitanteNombre, pageWidth / 2 + margin, firmaY + 8)
  } else {
    doc.text('___________________', pageWidth / 2 + margin, firmaY + 8)
  }
  
  // Observaciones del árbitro - Ancho completo
  let yPosArbitro = firmaY + 18
  const observacionesArbitro = encuentro.firmas?.arbitro_informe || ''
  
  // Verificar si hay espacio suficiente para el título y al menos una línea de contenido
  // Si no hay espacio, agregar nueva página ANTES de imprimir el título
  const espacioNecesario = 8 + 5 + 3.5 // Alto del título + espacio + una línea
  if (yPosArbitro + espacioNecesario > pageHeight - 40) {
    doc.addPage()
    dibujarMarcaDeAgua()
    yPosArbitro = margin + 10
  }
  
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  
  // Calcular ancho del texto para el fondo
  const obsArbitroTexto = 'INFORME ÁRBITRO:'
  const obsArbitroAlto = 8 // Mismo alto que los títulos de las tablas (cellPadding top: 3 + bottom: 2 + fontSize: 10 ≈ 8mm)
  const obsArbitroAncho = pageWidth - (2 * margin)
  
  // Dibujar fondo con color gris azulado y bordes redondeados (ancho completo)
  doc.setFillColor(colorGrisAzulado[0], colorGrisAzulado[1], colorGrisAzulado[2])
  doc.setDrawColor(colorGrisAzulado[0], colorGrisAzulado[1], colorGrisAzulado[2])
  const savedLineWidthArbitro = doc.getLineWidth()
  doc.setLineWidth(0.1)
  doc.roundedRect(margin, yPosArbitro - 6, obsArbitroAncho, obsArbitroAlto, 3, 3, 'FD')
  
  // Escribir texto en blanco sobre el fondo
  doc.setFontSize(10)
  doc.setTextColor(255, 255, 255)
  doc.text(obsArbitroTexto, pageWidth / 2, yPosArbitro, { align: 'center' })
  doc.setTextColor(0, 0, 0) // Resetear a negro
  doc.setLineWidth(savedLineWidthArbitro)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  
  if (observacionesArbitro) {
    // Dividir observaciones usando todo el ancho de la página
    const anchoObservaciones = pageWidth - (2 * margin)
    const observacionesLineas = doc.splitTextToSize(observacionesArbitro, anchoObservaciones)
    // Mostrar TODAS las líneas
    observacionesLineas.forEach((linea: string, idx: number) => {
      let yPosicion = yPosArbitro + 5 + (idx * 3.5)
      // Si nos acercamos al final de la página, agregar nueva página
      if (yPosicion > pageHeight - 40) {
        doc.addPage()
        dibujarMarcaDeAgua()
        yPosArbitro = margin + 10
        yPosicion = yPosArbitro + 5
        // Re-imprimir el título en la nueva página
        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        
        // Calcular ancho del texto para el fondo
        const obsArbitroContTexto = 'INFORME ÁRBITRO:'
        const obsArbitroContAlto = 8 // Mismo alto que los títulos de las tablas
        const obsArbitroContAncho = pageWidth - (2 * margin)
        
        // Dibujar fondo con color gris azulado y bordes redondeados (ancho completo)
        doc.setFillColor(colorGrisAzulado[0], colorGrisAzulado[1], colorGrisAzulado[2])
        doc.setDrawColor(colorGrisAzulado[0], colorGrisAzulado[1], colorGrisAzulado[2])
        const savedLineWidthArbitroCont = doc.getLineWidth()
        doc.setLineWidth(0.1)
        doc.roundedRect(margin, yPosArbitro - 6, obsArbitroContAncho, obsArbitroContAlto, 3, 3, 'FD')
        
        // Escribir texto en blanco sobre el fondo
        doc.setFontSize(10)
        doc.setTextColor(255, 255, 255)
        doc.text(obsArbitroContTexto, pageWidth / 2, yPosArbitro, { align: 'center' })
        doc.setTextColor(0, 0, 0) // Resetear a negro
        doc.setLineWidth(savedLineWidthArbitroCont)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7)
      }
      doc.text(linea, margin, yPosicion)
    })
    // Calcular nueva posición Y después de todas las observaciones
    yPosArbitro = yPosArbitro + 5 + (observacionesLineas.length * 3.5)
  } else {
    yPosArbitro = yPosArbitro + 5
  }
  
  // Calcular espacio necesario para la firma (si existe)
  const arbitroFirma = encuentro.firmas?.arbitro_firma || ''
  let espacioFirmaArbitro = 0
  if (arbitroFirma) {
    try {
      const firmaImg = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => resolve(img)
        img.onerror = reject
        img.src = arbitroFirma
      })
      const firmaWidth = 50
      const firmaHeight = (firmaImg.height / firmaImg.width) * firmaWidth
      espacioFirmaArbitro = firmaHeight + 5 // Altura de la firma + espacio adicional
    } catch (error) {
      espacioFirmaArbitro = 10 // Espacio por defecto si no se puede cargar
    }
  } else {
    espacioFirmaArbitro = 10 // Espacio por defecto si no hay firma
  }
  
  // Línea de firma árbitro (con espacio suficiente para que la firma no tape el texto)
  const firmaArbitroY = yPosArbitro + espacioFirmaArbitro + 5
  doc.line(margin, firmaArbitroY, margin + 60, firmaArbitroY)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.text('ÁRBITRO', margin, firmaArbitroY + 5)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  const arbitroNombre = encuentro.firmas?.arbitro_nombre || ''
  
  // Mostrar imagen de firma si existe (justo sobre la línea)
  if (arbitroFirma) {
    try {
      const firmaImg = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => resolve(img)
        img.onerror = reject
        img.src = arbitroFirma
      })
      const firmaWidth = 50
      const firmaHeight = (firmaImg.height / firmaImg.width) * firmaWidth
      // Colocar la firma justo encima de la línea (2mm arriba)
      doc.addImage(firmaImg, 'PNG', margin, firmaArbitroY - firmaHeight - 2, firmaWidth, firmaHeight)
    } catch (error) {
      console.warn('No se pudo cargar la firma del árbitro:', error)
    }
  }
  // Mostrar nombre siempre (debajo de la línea)
  if (arbitroNombre) {
    doc.text(arbitroNombre, margin, firmaArbitroY + 9)
  } else {
    doc.text('___________________', margin, firmaArbitroY + 9)
  }

  // Observaciones del vocal - Ancho completo, debajo de las del árbitro (con espacio suficiente)
  let yPosVocal = firmaArbitroY + 20
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  
  // Calcular ancho del texto para el fondo
  const obsVocalTexto = 'INFORME VOCAL:'
  const obsVocalAlto = 8 // Mismo alto que los títulos de las tablas (cellPadding top: 3 + bottom: 2 + fontSize: 10 ≈ 8mm)
  const obsVocalAncho = pageWidth - (2 * margin)
  
  // Dibujar fondo con color gris azulado y bordes redondeados (ancho completo)
  doc.setFillColor(colorGrisAzulado[0], colorGrisAzulado[1], colorGrisAzulado[2])
  doc.setDrawColor(colorGrisAzulado[0], colorGrisAzulado[1], colorGrisAzulado[2])
  const savedLineWidthVocal = doc.getLineWidth()
  doc.setLineWidth(0.1)
  doc.roundedRect(margin, yPosVocal - 6, obsVocalAncho, obsVocalAlto, 3, 3, 'FD')
  
  // Escribir texto en blanco sobre el fondo
  doc.setFontSize(10)
  doc.setTextColor(255, 255, 255)
  doc.text(obsVocalTexto, pageWidth / 2, yPosVocal, { align: 'center' })
  doc.setTextColor(0, 0, 0) // Resetear a negro
  doc.setLineWidth(savedLineWidthVocal)
  doc.setFont('helvetica', 'normal')
  const observacionesVocal = encuentro.firmas?.vocal_informe || ''
  doc.setFontSize(7)
  if (observacionesVocal) {
    // Dividir observaciones usando todo el ancho de la página
    const anchoObservaciones = pageWidth - (2 * margin)
    const observacionesLineas = doc.splitTextToSize(observacionesVocal, anchoObservaciones)
    // Mostrar TODAS las líneas
    observacionesLineas.forEach((linea: string, idx: number) => {
      let yPosicion = yPosVocal + 5 + (idx * 3.5)
      // Si nos acercamos al final de la página, agregar nueva página
      if (yPosicion > pageHeight - 40) {
        doc.addPage()
        dibujarMarcaDeAgua()
        yPosVocal = margin + 10
        yPosicion = yPosVocal + 5
          // Re-imprimir el título en la nueva página
          doc.setFontSize(8)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(colorGrisAzulado[0], colorGrisAzulado[1], colorGrisAzulado[2])
          // Calcular ancho del texto para el fondo
          const obsVocalContTexto = 'INFORME VOCAL:'
          const obsVocalContAlto = 8 // Mismo alto que los títulos de las tablas
          const obsVocalContAncho = pageWidth - (2 * margin)
          
          // Dibujar fondo con color gris azulado y bordes redondeados (ancho completo)
          doc.setFillColor(colorGrisAzulado[0], colorGrisAzulado[1], colorGrisAzulado[2])
          doc.setDrawColor(colorGrisAzulado[0], colorGrisAzulado[1], colorGrisAzulado[2])
          const savedLineWidthVocalCont = doc.getLineWidth()
          doc.setLineWidth(0.1)
          doc.roundedRect(margin, yPosVocal - 6, obsVocalContAncho, obsVocalContAlto, 3, 3, 'FD')
          
          // Escribir texto en blanco sobre el fondo
          doc.setFontSize(10)
          doc.setTextColor(255, 255, 255)
          doc.text(obsVocalContTexto, pageWidth / 2, yPosVocal, { align: 'center' })
          doc.setTextColor(0, 0, 0) // Resetear a negro
          doc.setLineWidth(savedLineWidthVocalCont)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7)
      }
      doc.text(linea, margin, yPosicion)
    })
    // Calcular nueva posición Y después de todas las observaciones
    yPosVocal = yPosVocal + 5 + (observacionesLineas.length * 3.5)
  } else {
    yPosVocal = yPosVocal + 5
  }
  
  // Calcular espacio necesario para la firma (si existe)
  const vocalFirma = encuentro.firmas?.vocal_firma || ''
  let espacioFirmaVocal = 0
  if (vocalFirma) {
    try {
      const firmaImg = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => resolve(img)
        img.onerror = reject
        img.src = vocalFirma
      })
      const firmaWidth = 50
      const firmaHeight = (firmaImg.height / firmaImg.width) * firmaWidth
      espacioFirmaVocal = firmaHeight + 5 // Altura de la firma + espacio adicional
    } catch (error) {
      espacioFirmaVocal = 10 // Espacio por defecto si no se puede cargar
    }
  } else {
    espacioFirmaVocal = 10 // Espacio por defecto si no hay firma
  }
  
  // Línea de firma vocal (con espacio suficiente para que la firma no tape el texto)
  const firmaVocalY = yPosVocal + espacioFirmaVocal + 5
  doc.line(margin, firmaVocalY, margin + 60, firmaVocalY)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.text('VOCAL', margin, firmaVocalY + 5)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  const vocalNombre = encuentro.firmas?.vocal_nombre || ''
  
  // Mostrar imagen de firma si existe (justo sobre la línea)
  if (vocalFirma) {
    try {
      const firmaImg = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => resolve(img)
        img.onerror = reject
        img.src = vocalFirma
      })
      const firmaWidth = 50
      const firmaHeight = (firmaImg.height / firmaImg.width) * firmaWidth
      // Colocar la firma justo encima de la línea (2mm arriba)
      doc.addImage(firmaImg, 'PNG', margin, firmaVocalY - firmaHeight - 2, firmaWidth, firmaHeight)
    } catch (error) {
      console.warn('No se pudo cargar la firma del vocal:', error)
    }
  }
  // Mostrar nombre siempre (debajo de la línea)
  if (vocalNombre) {
    doc.text(vocalNombre, margin, firmaVocalY + 9)
  } else {
    doc.text('___________________', margin, firmaVocalY + 9)
  }

  // Sección: Informe del Tribunal de Penas
  // Verificar si hay espacio suficiente, si no, agregar nueva página
  let yPosTribunal = firmaVocalY + 25
  if (yPosTribunal + 60 > pageHeight - 40) {
    doc.addPage()
    dibujarMarcaDeAgua()
    yPosTribunal = margin + 10
  }

  // Título de la sección con el mismo diseño que otros títulos
  const tituloTribunalAlto = 8
  const tituloTribunalAncho = pageWidth - (2 * margin)
  doc.setFillColor(colorGrisAzulado[0], colorGrisAzulado[1], colorGrisAzulado[2])
  doc.setDrawColor(colorGrisAzulado[0], colorGrisAzulado[1], colorGrisAzulado[2])
  const savedLineWidthTribunal = doc.getLineWidth()
  doc.setLineWidth(0.1)
  doc.roundedRect(margin, yPosTribunal - 6, tituloTribunalAncho, tituloTribunalAlto, 3, 3, 'FD')
  
  // Texto del título en blanco
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text('INFORME DEL TRIBUNAL DE PENAS', pageWidth / 2, yPosTribunal, { align: 'center' })
  doc.setTextColor(0, 0, 0) // Restaurar color negro
  doc.setFont('helvetica', 'normal')
  doc.setLineWidth(savedLineWidthTribunal)
  
  // Mostrar el informe del tribunal si existe, o líneas en blanco
  const tribunalInforme = encuentro.firmas?.tribunal_informe || ''
  const inicioLineas = yPosTribunal + 8
  
  if (tribunalInforme) {
    // Mostrar el texto del informe
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(0, 0, 0)
    
    const informeLineas = doc.splitTextToSize(tribunalInforme, pageWidth - (2 * margin))
    let yPosInforme = inicioLineas
    
    informeLineas.forEach((linea: string) => {
      if (yPosInforme > pageHeight - 80) {
        doc.addPage()
        dibujarMarcaDeAgua()
        yPosInforme = margin + 10
      }
      doc.text(linea, margin, yPosInforme)
      yPosInforme += 3.5
    })
    
    yPosTribunal = yPosInforme + 15 // Aumentar espacio antes de las firmas
  } else {
    // Espacio para escribir el informe (líneas horizontales)
    const espacioInforme = 30
    for (let i = 0; i < 8; i++) {
      const yLinea = inicioLineas + (i * 3.5)
      if (yLinea > pageHeight - 80) {
        doc.addPage()
        dibujarMarcaDeAgua()
        yPosTribunal = margin + 10
        break
      }
      doc.setDrawColor(200, 200, 200) // Color gris claro para las líneas
      doc.setLineWidth(0.1)
      doc.line(margin, yLinea, pageWidth - margin, yLinea)
    }
    yPosTribunal = inicioLineas + espacioInforme + 15 // Aumentar espacio antes de las firmas
  }
  
  // Sección de firmas del Tribunal
  let yPosFirmasTribunal = yPosTribunal + 10 // Aumentar espacio adicional
  if (yPosFirmasTribunal + 20 > pageHeight - 40) {
    doc.addPage()
    dibujarMarcaDeAgua()
    yPosFirmasTribunal = margin + 10
  }
  
  doc.setDrawColor(0, 0, 0) // Restaurar color negro
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.text('Tribunal de la Comisión de Penas y Sanciones', margin, yPosFirmasTribunal)
  
  // Tres columnas para las firmas
  const anchoColumna = (pageWidth - (2 * margin)) / 3
  const espacioEntreColumnas = 5
  
  // Calcular espacio necesario para las firmas antes de dibujarlas
  const firmaPresidente = encuentro.firmas?.tribunal_presidente_firma || ''
  const firmaSecretario = encuentro.firmas?.tribunal_secretario_firma || ''
  const firmaVocalTribunal = encuentro.firmas?.tribunal_vocal_firma || ''
  
  let maxFirmaHeight = 0
  if (firmaPresidente || firmaSecretario || firmaVocalTribunal) {
    const firmas = [firmaPresidente, firmaSecretario, firmaVocalTribunal].filter(f => f)
    for (const firma of firmas) {
      try {
        const firmaImg = await new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image()
          img.crossOrigin = 'anonymous'
          img.onload = () => resolve(img)
          img.onerror = reject
          img.src = firma
        })
        const firmaWidth = 40
        const firmaHeight = (firmaImg.height / firmaImg.width) * firmaWidth
        maxFirmaHeight = Math.max(maxFirmaHeight, firmaHeight)
      } catch (error) {
        // Ignorar errores de carga
      }
    }
  }
  
  // Ajustar posición de las firmas con espacio suficiente
  const espacioFirmaTribunal = maxFirmaHeight > 0 ? maxFirmaHeight + 5 : 10
  const firmaTribunalY = yPosFirmasTribunal + espacioFirmaTribunal + 5
  
  // Definir posiciones de las columnas
  const col1X = margin
  const col2X = margin + anchoColumna
  const col3X = margin + (anchoColumna * 2)
  
  // Columna 1: Presidente
  // Mostrar firma del presidente si existe
  if (firmaPresidente) {
    try {
      const firmaImg = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => resolve(img)
        img.onerror = reject
        img.src = firmaPresidente
      })
      const firmaWidth = 40
      const firmaHeight = (firmaImg.height / firmaImg.width) * firmaWidth
      doc.addImage(firmaImg, 'PNG', col1X, firmaTribunalY - firmaHeight - 2, firmaWidth, firmaHeight)
    } catch (error) {
      console.warn('No se pudo cargar la firma del presidente:', error)
    }
  }
  
  doc.line(col1X, firmaTribunalY, col1X + anchoColumna - espacioEntreColumnas, firmaTribunalY)
  doc.setFontSize(6)
  doc.setFont('helvetica', 'bold')
  doc.text('PRESIDENTE DE LA COMISIÓN DE PENAS Y SANCIONES', col1X, firmaTribunalY + 5, { maxWidth: anchoColumna - espacioEntreColumnas })
  
  // Columna 2: Secretario
  // Mostrar firma del secretario si existe
  if (firmaSecretario) {
    try {
      const firmaImg = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => resolve(img)
        img.onerror = reject
        img.src = firmaSecretario
      })
      const firmaWidth = 40
      const firmaHeight = (firmaImg.height / firmaImg.width) * firmaWidth
      doc.addImage(firmaImg, 'PNG', col2X, firmaTribunalY - firmaHeight - 2, firmaWidth, firmaHeight)
    } catch (error) {
      console.warn('No se pudo cargar la firma del secretario:', error)
    }
  }
  
  doc.line(col2X, firmaTribunalY, col2X + anchoColumna - espacioEntreColumnas, firmaTribunalY)
  doc.text('SECRETARIO DE LA COMISIÓN DE PENAS Y SANCIONES', col2X, firmaTribunalY + 5, { maxWidth: anchoColumna - espacioEntreColumnas })
  
  // Columna 3: Vocal
  // Mostrar firma del vocal del tribunal si existe
  if (firmaVocalTribunal) {
    try {
      const firmaImg = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => resolve(img)
        img.onerror = reject
        img.src = firmaVocalTribunal
      })
      const firmaWidth = 40
      const firmaHeight = (firmaImg.height / firmaImg.width) * firmaWidth
      doc.addImage(firmaImg, 'PNG', col3X, firmaTribunalY - firmaHeight - 2, firmaWidth, firmaHeight)
    } catch (error) {
      console.warn('No se pudo cargar la firma del vocal del tribunal:', error)
    }
  }
  
  doc.line(col3X, firmaTribunalY, col3X + anchoColumna - espacioEntreColumnas, firmaTribunalY)
  doc.text('VOCAL DE LA COMISIÓN DE PENAS Y SANCIONES', col3X, firmaTribunalY + 5, { maxWidth: anchoColumna - espacioEntreColumnas })

  // Footer
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text(escuelaEmail, margin, pageHeight - 5)
  doc.text(`Página 1`, pageWidth - margin, pageHeight - 5, { align: 'right' })

  return doc
}

