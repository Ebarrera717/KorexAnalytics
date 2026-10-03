# MATRIZ DE DEPENDENCIAS - KOREX ANALYTICS

---

## 1. CONTROL ESTRICTO DE DEPENDENCIAS

| Dependencia | Tipo | Propósito | Justificación de Inclusión | Estado de Licencia / Seguridad |
|---|---|---|---|---|
| `next` | Core Framework | Renderizado SSR, Routing App Router y API endpoints. | Robusto, optimizado para React y producción. | MIT / Validada |
| `react`, `react-dom` | UI Library | Renderizado interactivo y gestión de estado reactivo. | Estándar de la industria. | MIT / Validada |
| `typescript` | Lenguaje | Tipado estático estricto y prevención de errores en compilación. | Calidad de código y mantenibilidad. | Apache-2.0 / Validada |
| `tailwindcss` | Estilos | Sistema de diseño basado en tokens y utilidades CSS. | Alto rendimiento y consistencia visual. | MIT / Validada |
| `lucide-react` | Iconografía | Iconos vectoriales limpios y coherentes. | Estandarizado en el ecosistema. | ISC / Validada |
| `mssql` | Driver Base Datos | Conexión directa y ejecución nativa sobre SQL Server. | Driver oficial y de alto rendimiento. | MIT / Validada |
| `bcryptjs` | Criptografía | Hash seguro de contraseñas de usuarios. | Algoritmo estándar sin dependencias C++ nativas. | MIT / Validada |
| `jsonwebtoken` | Seguridad | Firma y verificación de tokens de sesión JWT. | Stateless y seguro. | MIT / Validada |
| `xlsx` | Exportación | Exportación de datos de ejecución a formato Excel. | Utilidad para exportaciones de clientes. | Apache-2.0 / Validada |

---

## 2. POLÍTICA DE DEPENDENCIAS PROHIBIDAS

- Prohibido instalar librerías pesadas o sin mantenimiento activo (> 2 años sin commits).
- Prohibido instalar librerías que expongan vulnerabilidades conocidas (auditadas mediante `npm audit`).
- Prohibido instalar conectores o dependencias que introduzcan acoplamiento con AgenciasNew.
