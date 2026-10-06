---
name: post-development-test
description: Guía y flujo de trabajo para desplegar y verificar cambios locales en base de datos y sitio Next.js tras finalizar un desarrollo.
---

# Flujo de Despliegue y Pruebas Post-Desarrollo

Este Skill provee las instrucciones necesarias para desplegar cambios de base de datos Postgres, validar tipos de TypeScript, actualizar Prisma ORM y arrancar el servidor Next.js localmente para asegurar el correcto funcionamiento del desarrollo.

## Flujo de Trabajo

### Paso 1: Desplegar y Compilar Procedimientos Almacenados y Funciones en BD Local
Cada vez que se modifique o cree una función o procedimiento almacenado SQL (en la carpeta `SQL/Function`, `SQL/SP` o `SQL/Table`), se DEBE ejecutar INMEDIATAMENTE en el mismo turno el validador y compilador de base de datos local:
- **Comando Obligatorio**:
  ```powershell
  node deploy/gen_schema_json.js
  ```
  Este script despliega y recompila en tiempo real las funciones y SPs en PostgreSQL local (`Korex_colaereo`), asegurando que la base de datos ejecute la última versión sin desfasamiento.

### Paso 2: Sincronizar Prisma ORM (Si hay cambios en tablas/columnas)
Si el desarrollo implicó modificaciones en la estructura de tablas o columnas de la base de datos de Postgres:
1. Sincroniza el esquema local de Prisma con la base de datos:
   ```powershell
   npx prisma db pull
   ```
2. Regenera el cliente de Prisma para TypeScript:
   ```powershell
   npx prisma generate
   ```

### Paso 3: Validar Compilación y Tipado de TypeScript
Antes de dar por concluido un desarrollo, realiza una validación rigurosa de errores de tipado e importación en Next.js:
- **Verificación rápida**:
  ```powershell
  node node_modules/typescript/bin/tsc --noEmit
  ```
- **Verificación completa (Build)**:
  ```powershell
  npm run build
  ```

### Paso 4: Validar Listado de Maestros Afectados (Prueba Obligatoria)
Si el desarrollo involucró una modificación en un Maestro (Cargos e Impuestos, Proveedores, Clientes, Usuarios, Productos, Sucursales, etc.):
- Probar la función de consulta/listado (`public.fn...Listar()` o Endpoint `/api/...`) mediante consulta directa o script local.
- Confirmar que retorne el arreglo con la lista de elementos completa.
- Verificar que en el frontend las columnas no queden desalineadas y que no devuelva `Mostrando 0 a 0 de 0 registros` de forma errónea.

### Paso 5: Levantar y Probar el Sitio Localmente
Para probar el sitio web Next.js con los cambios aplicados:
1. Corre el script de inicio completo para producción local en el puerto `3001`:
   ```powershell
   cmd /c iniciar-next.bat
   ```
2. Alternativamente, para desarrollo rápido y depuración en caliente, inicia Next.js en modo desarrollo:
   ```powershell
   npm run dev
   ```
3. Realiza las pruebas manuales ingresando a: `http://localhost:3000/dashboard` o `http://localhost:3001/dashboard` según el modo seleccionado.
