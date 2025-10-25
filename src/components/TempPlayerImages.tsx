'use client'

// URLs de imágenes temporales de jugadores famosos
export const tempPlayerImages = [
  'https://img.a.transfermarkt.technology/portrait/header/28003-1671435885.jpg?lm=1', // Messi
  'https://img.a.transfermarkt.technology/portrait/header/8198-1671435885.jpg?lm=1', // Ronaldo
  'https://img.a.transfermarkt.technology/portrait/header/68290-1671435885.jpg?lm=1', // Neymar
  'https://img.a.transfermarkt.technology/portrait/header/342229-1671435885.jpg?lm=1', // Mbappé
  'https://img.a.transfermarkt.technology/portrait/header/418560-1671435885.jpg?lm=1', // Haaland
  'https://img.a.transfermarkt.technology/portrait/header/88755-1671435885.jpg?lm=1', // De Bruyne
  'https://img.a.transfermarkt.technology/portrait/header/30972-1671435885.jpg?lm=1', // Modrić
  'https://img.a.transfermarkt.technology/portrait/header/134425-1671435885.jpg?lm=1', // van Dijk
  'https://img.a.transfermarkt.technology/portrait/header/148455-1671435885.jpg?lm=1', // Salah
  'https://img.a.transfermarkt.technology/portrait/header/38272-1671435885.jpg?lm=1', // Lewandowski
]

// Función para obtener una imagen temporal basada en el ID del jugador
export const getTempPlayerImage = (jugadorId: number | string): string => {
  const numericId = typeof jugadorId === 'string' ? parseInt(jugadorId) || 0 : jugadorId
  const index = numericId % tempPlayerImages.length
  return tempPlayerImages[index]
}

// Función para obtener una imagen temporal aleatoria
export const getRandomTempPlayerImage = (): string => {
  const randomIndex = Math.floor(Math.random() * tempPlayerImages.length)
  return tempPlayerImages[randomIndex]
}
