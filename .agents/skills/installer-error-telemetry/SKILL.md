---
name: installer-error-telemetry
description: Regla de arquitectura y patrón universal para la notificación e inspección explícita de errores en pantalla durante la ejecución de instaladores y scripts de despliegue.
---

# Regla de Arquitectura de Diagnóstico y Telemetría de Errores en Instaladores

Este Skill establece la **Regla Obligatoria de Diagnóstico y Visibilidad en Pantalla** para cualquier script de automatización de instaladores o despliegue (`Setup_Korex_Silent.ps1`, `Setup_Korex_SQLServer_Silent.ps1`, `Update_Korex.ps1`, etc.) en AgenciasNew.

---

## 1. Principio Fundamental: Prohibición de Fallos Silenciosos

Bajo ninguna circunstancia un instalador o script de post-configuración debe abortar o fallar en silencio (`exit 1` sin notificación visual). 

Cualquier error durante el proceso de instalación (Node.js no encontrado, falta de permisos administrativos, fallo en creación de servicio de Windows, fallo al registrar sitio en IIS, conflicto insalvable de puertos o fallo en la verificación de salud HTTP) **DEBE mostrar inmediatamente una ventana emergente modal (MessageBox) en la pantalla del usuario** detallando la causa técnica y la ruta del archivo de log.

---

## 2. Implementación Estándar de Alerta en Pantalla (`Show-Alert`)

Todos los scripts PowerShell de instalación deben definir la función modal universal de alerta:

```powershell
function Show-Alert($title, $message, $icon = "Error") {
    try {
        Add-Type -AssemblyName System.Windows.Forms
        [System.Windows.Forms.MessageBox]::Show($message, $title, [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::$icon) | Out-Null
    } catch {
        $wshell = New-Object -ComObject Wscript.Shell
        $wshell.Popup($message, 0, $title, 16) | Out-Null
    }
}
```

---

## 3. Trampa Global de Excepciones no Capturadas (`trap`)

Todo script de instalador debe incluir en su encabezado un manejador global de excepciones:

```powershell
trap {
    $errLine = $_.InvocationInfo.ScriptLineNumber
    $errMsg = $_.Exception.Message
    Write-Log "ERROR NO CAPTURADO (Línea $errLine): $errMsg" "ERROR"
    Show-Alert "Fallo de Instalación" "Ocurrió un error no esperado en la línea $errLine:`n`n$errMsg`n`nConsulte el archivo de log en: $LogFile"
    exit 1
}
```

---

## 4. Puntos Obligatorios de Verificación con Notificación en Pantalla

1. **Requisitos Previos (Node.js e IIS)**:
   - Si Node.js no se puede instalar o IIS (W3SVC) no se encuentra habilitado, notificar en pantalla el procedimiento manual requerido.

2. **Registro de Servicio de Windows (`Korex_NextJS` / `Korex_SQLServer_Service`)**:
   - Si `install-service.js` o `sc.exe` fallan o el servicio pasa a estado `Stopped` inmediatamente tras iniciar, extraer las últimas líneas del archivo `.err.log` y desplegarlas en pantalla con `Show-Alert`.

3. **Registro de Sitio Web en IIS (`New-Website` / `Start-Website`)**:
   - Si la creación del sitio en IIS falla (ej. falta de puerto o módulo URL Rewrite / ARR no instalado), notificar en pantalla la causa exacta emitida por IIS.

4. **Verificación de Salud HTTP Final**:
   - Si tras 5 intentos el sitio en `http://localhost:<Port>/` no responde HTTP 200/302, mostrar alerta modal de pantalla guiando a la revisión de `install_log.txt`.

---

## 5. Auditoría Pre-Compilación

Antes de compilar instaladores con Inno Setup (`ISCC.exe`), se debe auditar que el script `.ps1` empaquetado incluya las alertas modales de pantalla y que el ejecutable de Inno Setup no oculte errores fatales.
