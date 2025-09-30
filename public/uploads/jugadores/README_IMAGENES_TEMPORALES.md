# Imágenes Temporales de Jugadores

## Descripción
Este directorio contiene imágenes temporales de jugadores famosos que se utilizan como placeholders cuando los jugadores no tienen fotos asignadas.

## Imágenes Disponibles
Las siguientes imágenes de jugadores famosos están disponibles como placeholders:

1. **Lionel Messi** - Argentina
2. **Cristiano Ronaldo** - Portugal  
3. **Neymar Jr** - Brasil
4. **Kylian Mbappé** - Francia
5. **Erling Haaland** - Noruega
6. **Kevin De Bruyne** - Bélgica
7. **Luka Modrić** - Croacia
8. **Virgil van Dijk** - Países Bajos
9. **Mohamed Salah** - Egipto
10. **Robert Lewandowski** - Polonia

## Cómo Funciona
- Las imágenes se asignan automáticamente basándose en el ID del jugador
- Si un jugador no tiene foto, se le asigna una imagen temporal
- Las imágenes se rotan usando el módulo del ID del jugador
- Esto asegura que cada jugador tenga una imagen consistente

## Implementación
El sistema utiliza el componente `TempPlayerImages.tsx` que contiene:
- Array de URLs de imágenes temporales
- Función `getTempPlayerImage()` para obtener imagen basada en ID
- Función `getRandomTempPlayerImage()` para imagen aleatoria

## Nota Importante
Estas son imágenes temporales para propósitos de demostración. En un entorno de producción, se deben reemplazar con fotos reales de los jugadores.
