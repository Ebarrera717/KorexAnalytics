---
name: korex-analytics-design
description: Regla de diseño obligatorio e identidad visual propia para Korex Analytics y diferenciación total de AgenciasNew.
---

# DISEÑO VISUAL Y DIFERENCIACIÓN DE AGENCIASNEW

Korex Analytics debe tener una **identidad visual propia y claramente diferenciada de AgenciasNew**.

No se debe reutilizar exactamente la misma combinación de colores, estilos visuales, encabezados, botones, fondos o elementos gráficos de AgenciasNew.

---

## 1. IDENTIDAD VISUAL PROPIA

Definir una nueva paleta de colores exclusiva para Korex Analytics.

La selección debe transmitir:
* tecnología;
* análisis;
* información;
* confiabilidad;
* modernidad;
* profesionalismo.

Como propuesta inicial utilizar una combinación basada en:
* **Azul petróleo / azul oscuro** para navegación y elementos principales.
* **Turquesa** para acciones y elementos interactivos.
* **Gris claro** para fondos secundarios.
* **Blanco** para superficies y contenido.
* **Azul medio** para información.
* **Verde** para estados exitosos.
* **Naranja/ámbar** para advertencias.
* **Rojo** exclusivamente para errores o acciones destructivas.

La paleta definitiva debe definirse durante el diseño inicial y documentarse para que todo el proyecto mantenga consistencia.

---

## 2. NO COPIAR EL DISEÑO DE AGENCIASNEW

Aunque se reutilice la lógica y arquitectura de AgenciasNew, NO copiar automáticamente:
* colores;
* temas;
* fondos;
* botones;
* tarjetas;
* iconografía;
* encabezados;
* menú;
* estilos de tablas;
* estilos de formularios;
* tipografías;
* componentes visuales.

Los componentes funcionales pueden utilizarse como referencia, pero la presentación visual debe pertenecer a **Korex Analytics**.

---

## 3. COMPONENTES QUE DEBEN RESPETAR LA NUEVA IDENTIDAD

Aplicar la identidad visual a:
* Login.
* Menú principal.
* Dashboard.
* Parámetros de Usuarios.
* Configuración SQL Server.
* Ejecuciones.
* Historial de Ejecuciones.
* Formularios.
* Tablas.
* Modales.
* Alertas.
* Mensajes.
* Botones.
* Indicadores de estado.

---

## 4. IDENTIFICACIÓN DEL MÓDULO DE EJECUCIONES

El módulo de **Ejecuciones** debe tener una identificación visual clara.

Los estados deben utilizar una representación consistente:
* Pendiente → color informativo.
* En ejecución → color de proceso/actividad.
* Finalizada → verde.
* Error → rojo.
* Cancelada → gris o color neutral.
* Advertencia → ámbar.

No utilizar únicamente colores para comunicar el estado; acompañar cuando corresponda con:
* texto;
* icono;
* tooltip;
* indicador visual.

Esto permite mantener accesibilidad.

---

## 5. DASHBOARD

El Dashboard de Korex Analytics debe tener un diseño orientado al análisis y seguimiento de ejecuciones.

Mostrar, cuando corresponda:
* ejecuciones recientes;
* ejecuciones en proceso;
* ejecuciones exitosas;
* ejecuciones con error;
* duración;
* usuario;
* base de datos utilizada;
* servidor;
* indicadores de actividad.

La presentación debe ser visualmente diferente de AgenciasNew.

---

## 6. TEMA Y COMPONENTES REUTILIZABLES

Crear una configuración centralizada del tema visual.

No colocar colores directamente dispersos por los componentes.

Utilizar variables/tokens de diseño, por ejemplo:
```text
--primary
--secondary
--background
--surface
--text
--success
--warning
--error
--info
--border
```

De esta manera la identidad visual puede modificarse posteriormente desde un único lugar.

---

## 7. RESPONSIVE

El diseño debe funcionar correctamente en:
* escritorio;
* portátil;
* tablet;
* resoluciones diferentes.

El diseño debe priorizar el uso administrativo y operativo, manteniendo buena lectura de tablas y Ejecuciones.

---

## 8. ACCESIBILIDAD

Los colores seleccionados deben mantener suficiente contraste.

No utilizar el color como único mecanismo para diferenciar estados o resultados.

Validar:
* contraste;
* legibilidad;
* tamaños;
* foco de teclado;
* estados hover/focus;
* mensajes de error.

---

## 9. REGLA FINAL

Korex Analytics debe poder identificarse visualmente como un producto diferente de AgenciasNew aunque ambos compartan componentes técnicos y lógica de desarrollo.

La reutilización de arquitectura y funcionalidad **NO debe significar reutilización automática de la identidad visual**.

Así dejamos **separadas la arquitectura y la identidad visual**: Korex Analytics puede heredar la lógica probada de AgenciasNew, pero tendrá una apariencia propia.

---

> [!NOTE]
> Para conocer el alcance técnico integral, fases de desarrollo (Fase 0), seguridad, manejo de conexiones SQL Server dinámicas, ejecuciones y arquitectura completa, consultar el [**Prompt Maestro de Desarrollo - Korex Analytics**](file:///f:/Proyectos/AgenciasNew/docs/PROMPT_MAESTRO_KOREX_ANALYTICS.md).

