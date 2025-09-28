import ExcelJS from 'exceljs'
import type { TorneoWithRelations, EncuentroWithRelations } from '@/db/types'

interface ExcelExportOptions {
  torneo: TorneoWithRelations
  encuentros: EncuentroWithRelations[]
  equiposParticipantes: any[]
  getEncuentrosPorJornada: () => Record<number, EncuentroWithRelations[]>
  getEquiposQueDescansan: (jornada: number) => any[]
}

export const exportFixtureToExcel = async ({
  torneo,
  encuentros,
  equiposParticipantes,
  getEncuentrosPorJornada,
  getEquiposQueDescansan
}: ExcelExportOptions) => {
  // Crear un nuevo libro de trabajo con ExcelJS
  const workbook = new ExcelJS.Workbook()
  
  // Crear hoja de información del torneo
  const torneoSheet = workbook.addWorksheet('Información Torneo')
  
  // Agregar título
  torneoSheet.addRow(['INFORMACIÓN DEL TORNEO'])
  torneoSheet.addRow([])
  
  // Agregar datos del torneo
  const torneoInfo = [
    ['Nombre:', torneo.nombre],
    ['Descripción:', torneo.descripcion || 'Sin descripción'],
    ['Categoría:', torneo.categoria?.nombre || 'Sin categoría'],
    ['Tipo:', torneo.tipo_torneo === 'liga' ? 'Liga' : torneo.tipo_torneo === 'eliminacion' ? 'Eliminación' : 'Grupos'],
    ['Permite Revancha:', torneo.permite_revancha ? 'Sí' : 'No'],
    ['Estado:', torneo.estado === 'planificado' ? 'Planificado' : torneo.estado === 'en_curso' ? 'En Curso' : torneo.estado === 'finalizado' ? 'Finalizado' : 'Cancelado'],
    ['Fecha Inicio:', torneo.fecha_inicio ? new Date(torneo.fecha_inicio).toLocaleDateString('es-ES') : 'N/A'],
    ['Fecha Fin:', torneo.fecha_fin ? new Date(torneo.fecha_fin).toLocaleDateString('es-ES') : 'N/A'],
    ['Total Equipos:', equiposParticipantes.length],
    ['Total Encuentros:', encuentros.length],
    ['Encuentros Jugados:', encuentros.filter(e => e.estado === 'finalizado').length],
    ['Encuentros Pendientes:', encuentros.filter(e => e.estado === 'programado').length],
    [''],
    ['GENERADO EL:', new Date().toLocaleString('es-ES')]
  ]
  
  torneoInfo.forEach(([label, value]) => {
    torneoSheet.addRow([label, value])
  })
  
  // Estilos para la hoja de información
  applyTorneoInfoStyles(torneoSheet, torneoInfo.length)

  // Preparar datos del fixture por jornadas
  const jornadas = getEncuentrosPorJornada()
  const jornadasOrdenadas = Object.keys(jornadas).map(Number).sort((a, b) => a - b)

  jornadasOrdenadas.forEach(jornada => {
    const encuentrosJornada = jornadas[jornada]
    const equiposQueDescansan = getEquiposQueDescansan(jornada)
    
    // Crear hoja para la jornada
    const jornadaSheet = workbook.addWorksheet(`Fecha ${jornada}`)
    
    // Agregar título
    jornadaSheet.addRow([`FECHA ${jornada}`])
    jornadaSheet.addRow([])
    
    // Agregar encabezados
    jornadaSheet.addRow(['Fecha', 'Categoria', 'CANCHA', 'HORA', 'Equipo 1', 'VS', 'Equipo 2'])

    // Agregar encuentros
    encuentrosJornada.forEach(encuentro => {
      const fechaEncuentro = encuentro.fecha_programada ? 
        new Date(encuentro.fecha_programada).toLocaleDateString('es-ES') : ''
      const horarioEncuentro = encuentro.horario ? encuentro.horario.hora_inicio : ''
      
      jornadaSheet.addRow([
        fechaEncuentro,
        torneo.categoria?.nombre || 'MAXIMA',
        encuentro.cancha || '',
        horarioEncuentro,
        encuentro.equipoLocal?.nombre || 'N/A',
        'VS',
        encuentro.equipoVisitante?.nombre || 'N/A'
      ])
    })

    // Agregar equipos que descansan
    if (equiposQueDescansan.length > 0) {
      equiposQueDescansan.forEach(equipo => {
        jornadaSheet.addRow([
          '',
          torneo.categoria?.nombre || 'MAXIMA',
          '',
          '',
          equipo?.nombre || 'N/A',
          'VS',
          'DESCANSA'
        ])
      })
    }

    // Aplicar estilos a la hoja de jornada
    applyJornadaStyles(jornadaSheet)
  })

  // Crear hoja de tabla de posiciones
  const tablaSheet = workbook.addWorksheet('Tabla Posiciones')
  
  // Agregar título
  tablaSheet.addRow(['TABLA DE POSICIONES'])
  tablaSheet.addRow([])
  
  // Agregar encabezados
  tablaSheet.addRow(['Pos', 'Equipo', 'PJ', 'PG', 'PE', 'PP', 'GF', 'GC', 'DG', 'Pts'])

  // Agregar datos de equipos
  equiposParticipantes
    .sort((a, b) => {
      const puntosA = a.puntos ?? 0
      const puntosB = b.puntos ?? 0
      if (puntosB !== puntosA) return puntosB - puntosA
      const dgA = a.diferencia_goles ?? 0
      const dgB = b.diferencia_goles ?? 0
      return dgB - dgA
    })
    .forEach((equipoTorneo, index) => {
      tablaSheet.addRow([
        index + 1,
        equipoTorneo.equipo?.nombre || 'N/A',
        equipoTorneo.partidos_jugados ?? 0,
        equipoTorneo.partidos_ganados ?? 0,
        equipoTorneo.partidos_empatados ?? 0,
        equipoTorneo.partidos_perdidos ?? 0,
        equipoTorneo.goles_favor ?? 0,
        equipoTorneo.goles_contra ?? 0,
        ((equipoTorneo.diferencia_goles ?? 0) >= 0 ? '+' : '') + (equipoTorneo.diferencia_goles ?? 0),
        equipoTorneo.puntos ?? 0
      ])
    })

  // Aplicar estilos a la tabla de posiciones
  applyTablaPosicionesStyles(tablaSheet)

  // Generar el archivo Excel
  const buffer = await workbook.xlsx.writeBuffer()
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}

// Función para aplicar estilos a la hoja de información del torneo
const applyTorneoInfoStyles = (sheet: ExcelJS.Worksheet, infoRows: number) => {
  // Título
  sheet.getCell('A1').font = { bold: true, size: 18, color: { argb: 'FFFFFFFF' } }
  sheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7C3AED' } }
  sheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' }
  sheet.mergeCells('A1:B1')
  
  // Etiquetas
  for (let i = 3; i <= infoRows + 1; i++) {
    const cell = sheet.getCell(`A${i}`)
    if (cell.value && cell.value.toString().endsWith(':')) {
      cell.font = { bold: true, color: { argb: 'FF374151' } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } }
      cell.alignment = { horizontal: 'right', vertical: 'middle' }
    }
  }
  
  // Ajustar ancho de columnas
  sheet.getColumn('A').width = 20
  sheet.getColumn('B').width = 30
}

// Función para aplicar estilos a las hojas de jornadas
const applyJornadaStyles = (sheet: ExcelJS.Worksheet) => {
  // Título
  const titleCell = sheet.getCell('A1')
  titleCell.font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } }
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } }
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
  sheet.mergeCells('A1:G1')
  
  // Encabezados
  const headerRow = 3
  const headers = ['Fecha', 'Categoria', 'CANCHA', 'HORA', 'Equipo 1', 'VS', 'Equipo 2']
  headers.forEach((header, colIndex) => {
    const cell = sheet.getCell(headerRow, colIndex + 1)
    cell.font = { bold: true, color: { argb: 'FF000000' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFD700' } }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'thin', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } }
    }
  })
  
  // Estilos para las filas de datos
  for (let row = headerRow + 1; row <= sheet.rowCount; row++) {
    for (let col = 1; col <= 7; col++) {
      const cell = sheet.getCell(row, col)
      const isDescanso = cell.value === 'DESCANSA' || (col >= 5 && col <= 7 && cell.value === 'DESCANSA')
      
      if (isDescanso && col >= 5 && col <= 7) {
        // Estilo para descansos
        cell.font = { bold: true }
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFD700' } }
        cell.alignment = { horizontal: 'center', vertical: 'middle' }
      } else {
        // Estilo normal
        const isCanchaHora = col === 3 || col === 4
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isCanchaHora ? 'FF90EE90' : 'FFFFFFFF' } }
        cell.alignment = { horizontal: 'center', vertical: 'middle' }
      }
      
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        right: { style: 'thin', color: { argb: 'FFCCCCCC' } }
      }
    }
  }
  
  // Ajustar ancho de columnas
  sheet.getColumn(1).width = 12 // Fecha
  sheet.getColumn(2).width = 15 // Categoria
  sheet.getColumn(3).width = 15 // CANCHA
  sheet.getColumn(4).width = 8  // HORA
  sheet.getColumn(5).width = 20 // Equipo 1
  sheet.getColumn(6).width = 6  // VS
  sheet.getColumn(7).width = 20 // Equipo 2
}

// Función para aplicar estilos a la tabla de posiciones
const applyTablaPosicionesStyles = (sheet: ExcelJS.Worksheet) => {
  // Título
  const tablaTitleCell = sheet.getCell('A1')
  tablaTitleCell.font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } }
  tablaTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF10B981' } }
  tablaTitleCell.alignment = { horizontal: 'center', vertical: 'middle' }
  sheet.mergeCells('A1:J1')
  
  // Encabezados
  const tablaHeaderRow = 3
  const tablaHeaders = ['Pos', 'Equipo', 'PJ', 'PG', 'PE', 'PP', 'GF', 'GC', 'DG', 'Pts']
  tablaHeaders.forEach((header, colIndex) => {
    const cell = sheet.getCell(tablaHeaderRow, colIndex + 1)
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF374151' } }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'thin', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } }
    }
  })
  
  // Filas de datos con colores alternados
  for (let row = tablaHeaderRow + 1; row <= sheet.rowCount; row++) {
    for (let col = 1; col <= 10; col++) {
      const cell = sheet.getCell(row, col)
      const isEvenRow = (row - tablaHeaderRow) % 2 === 0
      const isPositionCol = col === 1
      
      const fillColor = isPositionCol ? 'FFE5E7EB' : (isEvenRow ? 'FFF9FAFB' : 'FFFFFFFF')
      
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } }
      cell.alignment = { horizontal: col === 2 ? 'left' : 'center', vertical: 'middle' }
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
      }
    }
  }
  
  // Ajustar ancho de columnas para la tabla
  sheet.getColumn(1).width = 6  // Pos
  sheet.getColumn(2).width = 20 // Equipo
  sheet.getColumn(3).width = 6  // PJ
  sheet.getColumn(4).width = 6  // PG
  sheet.getColumn(5).width = 6  // PE
  sheet.getColumn(6).width = 6  // PP
  sheet.getColumn(7).width = 6  // GF
  sheet.getColumn(8).width = 6  // GC
  sheet.getColumn(9).width = 6  // DG
  sheet.getColumn(10).width = 6 // Pts
}
