---
name: installer-decision
description: Protocolo para consultar al usuario en español si desea generar el instalador (Korex_Setup.exe) y el actualizador (Korex_Update_Setup.exe) automáticamente o realizarlos manualmente.
---

# Protocolo de Decisión de Generación de Instalador y Actualizador

Este Skill establece el protocolo obligatorio para consultar explícitamente al usuario en español si desea que la IA ejecute la generación automatizada de los programas de instalación y actualización (`Korex_Setup.exe` y `Korex_Update_Setup.exe`) o si prefiere realizar la compilación manualmente.

---

## 1. Momento de Aplicación

Este protocolo debe activarse en las siguientes situaciones:
- Al finalizar un desarrollo, corrección de errores, refactorización o actualización de procedimientos almacenados/esquemas.
- Cuando el usuario solicite preparar o generar los ejecutables para producción o pruebas.
- Antes de iniciar cualquier tarea pesada de compilación de Inno Setup o empaquetado de Next.js.

---

## 2. Protocolo de Pregunta al Usuario (en Español)

Antes de ejecutar los scripts de compilación, la IA **debe formular la pregunta clara en español al usuario** (utilizando la herramienta `ask_question` si está disponible, o mediante un mensaje en el chat):

> **¿Deseas que genere el Instalador (`Korex_Setup.exe`) y el Actualizador (`Korex_Update_Setup.exe`) automáticamente ahora, o prefieres realizar la generación manualmente?**

### Opciones Presentadas:
1. **Generar Automáticamente (Recomendado)**: La IA ejecutará la secuencia completa de validación de esquemas, empaquetado y compilación con Inno Setup.
2. **Realizar Manualmente**: La IA no compilará los ejecutables y le proporcionará al usuario las instrucciones y scripts `.bat` para que realice la compilación cuando guste.

---

## 3. Flujo de Ejecución según la Respuesta

### Opción A: Generación Automática
Si el usuario confirma que desea la generación automática:

1. **Validación Pre-Empaquetado y Esquemas**:
   ```powershell
   node deploy/gen_schema_json.js
   ```
2. **Empaquetado Standalone Next.js**:
   ```powershell
   powershell.exe -ExecutionPolicy Bypass -File deploy/Generar_Empaquetado.ps1
   ```
3. **Compilación de Ejecutables con Inno Setup**:
   - Ejecutar `GenerarSetup.bat` o compilar directo:
     ```cmd
     "C:\Program Files (x86)\Inno Setup 6\ISCC.exe" deploy/Korex.iss
     ```
   - Ejecutar `GenerarActualizador.bat` o compilar directo:
     ```cmd
     "C:\Program Files (x86)\Inno Setup 6\ISCC.exe" deploy/Korex_Update.iss
     ```
4. **Verificación de Salida**:
   Confirmar la presencia de los ejecutables en la carpeta `Instalador/`:
   - `Instalador/Korex_Setup.exe`
   - `Instalador/Korex_Update_Setup.exe`

---

### Opción B: Realización Manual
Si el usuario prefiere realizar la generación manualmente:

1. **Detener ejecución de compilación**: No ejecutar `ISCC.exe` ni scripts `.ps1`/`.bat`.
2. **Proporcionar instrucciones claras**:
   Indicar al usuario las vías para compilar manualmente:
   - **Instalador Completo (`Korex_Setup.exe`)**:
     - Ejecutar el archivo [`GenerarSetup.bat`](file:///f:/Proyectos/AgenciasNew/GenerarSetup.bat) en la raíz del proyecto.
     - O hacer clic derecho sobre [`deploy/Korex.iss`](file:///f:/Proyectos/AgenciasNew/deploy/Korex.iss) y seleccionar **Compile** en Inno Setup.
   - **Actualizador Lite (`Korex_Update_Setup.exe`)**:
     - Ejecutar el archivo [`GenerarActualizador.bat`](file:///f:/Proyectos/AgenciasNew/GenerarActualizador.bat) en la raíz del proyecto.
     - O hacer clic derecho sobre [`deploy/Korex_Update.iss`](file:///f:/Proyectos/AgenciasNew/deploy/Korex_Update.iss) y seleccionar **Compile** en Inno Setup.
3. Finalizar el turno informando que el código está listo para empaquetar cuando el usuario lo disponga.
