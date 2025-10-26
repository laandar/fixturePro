# 🚀 Configuración de Railway para FixturePro

## Variables de Entorno Necesarias

### Variables Obligatorias:
```
DATABASE_URL=postgresql://usuario:contraseña@host:puerto/nombre_db
NEXTAUTH_URL=https://tu-app.railway.app
NEXTAUTH_SECRET=ce96ff6389d47fd677117e8ec48523c154564e640fd74e9f73d292a0a7542b4e
```

### Variables Opcionales (para optimización):
```
NODE_ENV=production
PORT=3000
```

## Pasos para Configurar:

1. **En Railway Dashboard:**
   - Ve a tu servicio "fixturePro"
   - Haz clic en "Variables"
   - Agrega las variables listadas arriba

2. **Obtener DATABASE_URL:**
   - Ve a tu servicio PostgreSQL
   - Copia la variable DATABASE_URL
   - Pégala en las variables de tu app

3. **Obtener NEXTAUTH_URL:**
   - Después del primer deploy, Railway te dará una URL
   - Úsala como NEXTAUTH_URL

## Comandos para Desplegar:

```bash
# Desplegar y configurar base de datos
npm run railway:setup

# O manualmente:
npm run db:push
npm run seed:roles-menus
npm run auth:seed-admin
```

## Verificación:

Una vez configurado, puedes verificar que todo funciona:
- La app debería cargar sin errores
- El login debería funcionar
- La base de datos debería tener las tablas creadas
