# Configuración MCP para Cursor

## Archivo: `C:\Users\<tu_usuario>\.cursor\mcp.json`

```json
{
  "mcpServers": {
    "postgres-mcp-server": {
      "command": "C:\\Program Files\\nodejs\\npx.cmd",
      "args": ["@ahmedmustahid/postgres-mcp-server", "stdio"],
      "env": {
        "POSTGRES_URL": "postgresql://usuario:contraseña@localhost:5432/nombre_db?sslmode=disable"
      }
    }
  }
}
```

## Pasos para configurar en otro Cursor:

1. **Verificar Node.js instalado**
   - Abre PowerShell/CMD
   - Ejecuta: `node --version` y `npx --version`
   - Si no está instalado, descárgalo de: https://nodejs.org/

2. **Encontrar la ruta de npx**
   - Ejecuta: `where npx` en Windows
   - Usa la ruta completa (ej: `C:\\Program Files\\nodejs\\npx.cmd`)

3. **Crear el archivo de configuración**
   - Abre Cursor
   - Presiona `Ctrl+Shift+P` (o `Cmd+Shift+P` en Mac)
   - Busca: "Preferences: Open User Settings (JSON)"
   - O navega manualmente a: `C:\Users\<tu_usuario>\.cursor\`
   - Crea/edita el archivo `mcp.json`

4. **Configurar la conexión a PostgreSQL**
   - Reemplaza `POSTGRES_URL` con tu cadena de conexión:
   - Formato: `postgresql://usuario:contraseña@host:puerto/nombre_base_datos?sslmode=disable`
   - Ejemplo: `postgresql://postgres:password123@localhost:5432/mi_base_datos?sslmode=disable`

5. **Reiniciar Cursor**
   - Cierra completamente Cursor
   - Abre Cursor nuevamente
   - El servidor MCP debería iniciarse automáticamente

## Para usar con la base de datos FixturePro:

Si quieres conectarte a la base de datos del proyecto FixturePro, usa:

```json
{
  "mcpServers": {
    "postgres-mcp-server": {
      "command": "C:\\Program Files\\nodejs\\npx.cmd",
      "args": ["@ahmedmustahid/postgres-mcp-server", "stdio"],
      "env": {
        "POSTGRES_URL": "postgresql://postgres:Fu41a07..@localhost:5432/FixturePro?sslmode=disable"
      }
    }
  }
}
```

## Verificar que funciona:

1. Abre una conversación con Cursor AI
2. Intenta hacer una consulta como: "¿Qué tablas hay en la base de datos?"
3. Si funciona, verás que puede consultar las tablas

## Notas importantes:

- ⚠️ **Seguridad**: No compartas este archivo con credenciales en repositorios públicos
- 🔄 **Reinicio**: Siempre reinicia Cursor después de cambiar la configuración
- 🛠️ **Troubleshooting**: Si no funciona, verifica:
  - Que Node.js esté en el PATH
  - Que la ruta de `npx` sea correcta (usa rutas absolutas con doble backslash `\\`)
  - Que PostgreSQL esté corriendo y accesible
  - Que las credenciales sean correctas

