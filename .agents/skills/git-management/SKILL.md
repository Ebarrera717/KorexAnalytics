---
name: git-management
description: Instrucciones y flujo de trabajo para la gestión de Git en AgenciasNew. Se activa cuando el usuario solicita subir cambios a Git.
---

# Gestión de Git en AgenciasNew

Este skill define el protocolo obligatorio a seguir cuando el usuario solicite subir cambios a Git.

## Reglas de Subida a Git

1. **Subida Completa del Proyecto Local**:
   - Cuando el usuario solicite **"subir a git"** (o cualquier instrucción equivalente), se debe agregar **TODO el contenido del proyecto local que haya cambiado o se haya creado** (`git add .` o `git add -A`).
   - No se deben filtrar selectivamente archivos del proyecto creados durante la sesión (scripts, nuevos endpoints, componentes UI, funciones SQL, actualizadores, etc.), excepto los excluidos por `.gitignore` (como `node_modules` o archivos temporales no deseados).

2. **Flujo de Ejecución**:
   ```cmd
   git add .
   git commit -m "<mensaje claro y descriptivo del desarrollo>"
   git push origin <rama_actual>
   ```

3. **Verificación Pos-Subida**:
   - Confirmar que el comando `git push` haya finalizado correctamente con código de salida 0.
   - Presentar al usuario un resumen claro del hash del commit y los módulos o cambios incluidos en el push.
