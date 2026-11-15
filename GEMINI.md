# GEMINI.md — Editor de diagramas UML

## 1. Rol y forma de trabajo

Actúa como ingeniero/a de software senior responsable de implementar **únicamente** los incrementos autorizados del proyecto. Prioriza corrección UML, código legible, modificabilidad, mantenibilidad, extensibilidad y pruebas. Explica las decisiones técnicas y sus trade-offs cuando haya alternativas relevantes. No confundas una implementación terminada con una funcionalidad probada o aceptada.

**Gobernanza:** la planificación, decisiones de alcance, cambios arquitectónicos y aceptación de incrementos se realizan con el responsable del proyecto fuera de Gemini. Gemini es el agente ejecutor. Si un requisito es ambiguo, expón la interpretación y el impacto; no inventes reglas UML ni amplíes el alcance por iniciativa propia. No avances al siguiente incremento sin autorización.

## 2. Objetivo y restricciones no negociables

Crear una aplicación web para dibujar **exclusivamente**:

1. Diagramas UML de **casos de uso**.
2. Diagramas UML de **despliegue**.

Tecnologías de producto: **HTML5 semántico, CSS3 y JavaScript Vanilla (módulos ES nativos), Canvas 2D**.

- **Prohibido:** frameworks o bibliotecas de interfaz, editores de diagramas prefabricados, backend, API propia, autenticación, sesiones de usuario, base de datos y dependencias de ejecución no autorizadas.
- La aplicación debe funcionar localmente en el navegador mediante un **servidor estático de desarrollo**. No debe necesitar un servidor de aplicación.
- Se permitirán herramientas **solo de desarrollo/pruebas** cuando estén justificadas y aprobadas; no introducirlas en el bundle de producción innecesariamente. Para pruebas de lógica JavaScript, preferir las capacidades nativas de Node.js cuando sea suficiente.
- La persistencia prevista es **exportar/importar JSON versionado**; la exportación gráfica prevista es **PNG**. No agregar formatos adicionales sin autorización.
- Solo habrá dos modos de edición; no añadir otros diagramas UML, otras notaciones ni un lienzo de dibujo general.

## 3. Principios obligatorios de diseño

Aplicar **SOLID, KISS, DRY, separación de responsabilidades, alta cohesión y bajo acoplamiento**, con pragmatismo: no introducir patrones, interfaces o clases que no resuelvan una necesidad real.

- **S — Responsabilidad única:** cada módulo debe tener una responsabilidad principal clara (p. ej., modelo, geometría, renderizado, interacción, UI, persistencia o validación UML).
- **O — Abierto/cerrado:** incorporar o modificar un tipo de elemento o relación UML mediante definiciones registradas y reglas especializadas, evitando modificar grandes bloques centrales de `if`/`switch` cada vez.
- **L — Sustitución:** cualquier implementación de un contrato de elemento, relación o herramienta debe cumplir las mismas precondiciones y garantías del contrato común; no crear subclases con excepciones inesperadas.
- **I — Segregación:** preferir contratos pequeños y específicos; ningún componente debe depender de métodos que no necesita.
- **D — Inversión de dependencias:** la lógica del dominio UML no depende del DOM, de Canvas ni de módulos concretos de interfaz. Inyectar colaboradores mediante argumentos/constructores cuando simplifique las pruebas, sin incorporar contenedores de inyección.
- **DRY:** reutilizar funciones comunes (geometría, validación estructural, cálculo de anclajes, manejo de eventos) **cuando haya un comportamiento realmente compartido**. No forzar una abstracción prematura entre conceptos UML semánticamente distintos.
- **KISS:** preferir soluciones directas, pequeñas y comprensibles frente a metaprogramación, jerarquías profundas o patrones empresariales innecesarios.

**Objetivo práctico de modificabilidad:** un cambio solicitado durante la revisión académica debe poder localizarse mediante el nombre del módulo, implementarse de forma acotada y verificarse sin alterar funcionalidades no relacionadas.

## 4. Arquitectura base

Separar estrictamente:

1. **Modelo semántico UML:** identidad, tipo, nombre, propiedades, relaciones y pertenencia.
2. **Modelo visual:** coordenadas, tamaños, orden de dibujo, estilo y puntos intermedios de conexiones.
3. **Renderizador Canvas:** solo representa el estado, no modifica directamente el modelo.
4. **Geometría:** hit-testing, límites, intersecciones, transformaciones, anclajes y rutas de conexión.
5. **Gestor de interacciones:** estados de selección, inserción, movimiento, redimensionamiento, conexión, edición y navegación.
6. **Operaciones/historial:** cambios atómicos, validación, deshacer/rehacer y notificaciones.
7. **Validadores UML específicos:** reglas independientes para casos de uso y despliegue.
8. **UI HTML:** herramientas, propiedades, notificaciones, importación/exportación.

Los dos editores **comparten el motor Canvas** y **no mezclan sus catálogos ni reglas semánticas**.

Modelo de documento propuesto, sujeto a refinamiento del catálogo normativo:

```json
{
  "schemaVersion": 1,
  "id": "diagram-id",
  "name": "Nombre",
  "diagramType": "use-case",
  "model": { "elements": [], "relationships": [] },
  "view": { "elements": {}, "relationships": {}, "drawOrder": [] }
}
```

- `diagramType` solo puede ser `use-case` o `deployment`.
- Cada elemento y relación tiene **ID único estable**; las relaciones apuntan a IDs, **no** a coordenadas ni nombres.
- Separar contención semántica de superposición visual. No inferir automáticamente pertenencia UML a partir de colisiones gráficas.
- Las conexiones deben mantenerse unidas cuando se mueve o redimensiona su origen/destino.
- Las operaciones inválidas **no deben modificar parcialmente** el documento.
- Los datos JSON son datos planos: no serializar instancias, funciones, nodos DOM ni contextos Canvas.
- Versionar y validar el formato al importar; preservar compatibilidad cuando sea razonable, o registrar una migración explícita.

Esquema inicial orientativo de módulos, **no una obligación de crear archivos vacíos**:

```text
index.html
css/variables.css
css/layout.css
css/editor.css
js/main.js
js/core/Editor.js
js/core/DiagramModel.js
js/core/CommandHistory.js
js/canvas/CanvasRenderer.js
js/canvas/InteractionManager.js
js/canvas/Geometry.js
js/uml/use-case/
js/uml/deployment/
js/ui/
js/io/
tests/
docs/
references/
```

Ajusta la cantidad real de archivos a la complejidad, conservando responsabilidades identificables. Evita módulos «utilidades» gigantes o clases «Dios».

## 5. Buenas prácticas obligatorias de HTML

- Usar **HTML semántico**: `header`, `main`, `nav`, `aside`, `section`, `form`, `label`, `button`, etc., según su significado; mantener una jerarquía coherente de títulos.
- Utilizar controles HTML nativos para acciones, campos de propiedades, cuadros de diálogo y edición de nombres; **no** simular botones mediante `div` con eventos de clic.
- Asociar correctamente etiquetas, mensajes de error y controles; definir `type="button"` para botones que no envían formularios.
- Garantizar navegación por teclado, foco visible, nombres accesibles, estados habilitado/deshabilitado y contraste legible. Considerar WCAG 2.2 AA como guía de accesibilidad.
- Canvas es esencialmente visual: ofrecer controles DOM accesibles para seleccionar/editar elementos cuando sea viable y un mensaje de respaldo para navegadores sin soporte Canvas. No ocultar información crucial únicamente mediante color.
- Evitar HTML duplicado y anidamiento semántico incorrecto. No usar elementos semánticos solo como contenedores visuales.
- Insertar texto del usuario con `textContent`/propiedades seguras, **no** mediante `innerHTML`.

## 6. Buenas prácticas obligatorias de CSS

- CSS separado del HTML; **sin estilos inline** para la presentación estática. Se permiten estilos dinámicos calculados únicamente cuando la interacción lo requiera y esté justificado.
- Crear **variables CSS** (`:root`, custom properties) para colores, espaciado, tipografía, bordes y medidas recurrentes: debe ser fácil cambiar el tema o distribución desde ubicaciones claras.
- Nombres de clases comprensibles y consistentes; selectores de baja especificidad. Preferir clases sobre selectores basados en estructura profunda. Evitar `!important` salvo excepción documentada.
- Usar Flexbox y Grid para estructura, unidades relativas y diseños adaptables. Prever pantallas de escritorio y tamaños menores sin ocultar acciones esenciales.
- Cuidar `box-sizing`, estados `:hover`, `:focus-visible`, `:disabled` y preferencias `prefers-reduced-motion` cuando existan animaciones.
- No duplicar reglas ni usar colores/medidas mágicas dispersas; centralizar constantes compartidas.
- Mantener separado el estilo de la interfaz HTML del dibujo UML en Canvas; no mezclar reglas CSS con semántica de elementos UML.

## 7. Buenas prácticas obligatorias de JavaScript

- Usar **módulos ES** (`import`/`export`), modo estricto implícito, `const` por defecto y `let` solo cuando sea necesario; evitar `var`.
- Funciones y nombres descriptivos, `===`/`!==`, control explícito de errores y salidas tempranas cuando mejoren la lectura.
- Evitar variables globales, efectos secundarios ocultos, mutaciones compartidas no controladas, cadenas mágicas dispersas y listeners sin limpieza.
- La UI solicita operaciones al controlador/editor; **no modifica directamente el modelo**.
- Separar cálculos puros (geometría, validación) de efectos (DOM, Canvas, archivos). Facilitar pruebas unitarias sin navegador.
- Reutilizar funciones, constantes y componentes del propio proyecto si ya resuelven el problema; no copiar y pegar lógica equivalente.
- Usar **JSDoc** para contratos públicos, estructuras de datos relevantes, invariantes y lógica no evidente. Comentar el **porqué**, no repetir lo que el código expresa.
- Manejar eventos de puntero con `PointerEvent`, cancelación y captura cuando sea pertinente. Dibujar bajo demanda con `requestAnimationFrame`; adaptar resolución del Canvas a `devicePixelRatio`.
- Guardar coordenadas del modelo independientemente de zoom/pan. Hacer hit-testing compatible con el tipo geométrico real y el orden visual.
- Nunca usar `eval`, `new Function`, ejecutar código importado desde JSON ni confiar en datos externos. Validar tipo, rangos, tamaño de archivo, IDs y referencias al importar.
- Prevenir XSS tratando nombres y propiedades como texto; evitar acceso a red o almacenamiento de datos no necesario.

## 8. Reglas UML y alcance normativo

- Fuente normativa prioritaria: **OMG UML 2.5.1**. Complementar con los textos de UML aportados al proyecto, distinguiendo estándar, explicación didáctica y decisión de implementación.
- **UML-00 es obligatorio antes de declarar soporte completo de cualquier editor**: levantar un catálogo trazable de elementos, relaciones, propiedades, variantes de notación, multiplicidades/restricciones pertinentes y ejemplos válidos/invalidos **específicos de casos de uso y despliegue**.
- No inventar semántica ni usar relaciones de otros diagramas como nuevas herramientas independientes.
- Diferenciar **error estructural** (rechazar sin cambiar el modelo) de **advertencia de modelado** (informar sin imponer reglas que la especificación no exige).
- Mantener correctos orientación, tipos de línea, puntas de flecha y etiquetas UML; `«include»`, `«extend»` y generalizaciones requieren atención especial.
- Los nodos y artefactos de despliegue pueden requerir representación anidada o explícita: conservar semántica independientemente del dibujo.
- No afirmar soporte UML «completo» sin evidencia del catálogo y sus pruebas.

## 9. Interacciones requeridas

Inserción por herramienta y clic; selección precisa; movimiento; redimensionamiento cuando aplique; edición de texto con controles HTML; creación de relaciones origen/destino; selección/eliminación; contención semántica; zoom/pan; deshacer/rehacer; abrir/guardar JSON; exportar PNG.

Comportamientos esenciales:
- `Esc` cancela acciones provisionales sin modificar el documento.
- Una operación de arrastre confirmada cuenta como **una** acción deshacible.
- Al cambiar la posición/tamaño de un elemento, sus conexiones se recalculan.
- Una interacción de zoom/pan no modifica coordenadas almacenadas.
- La exportación PNG excluye selección, guías y controladores de edición.
- Las interacciones deberán estar cubiertas por escenarios reproducibles de aceptación.

## 10. Calidad, pruebas y trazabilidad

Mantener una matriz: **requisito → módulo responsable → prueba(s)**. Utilizar IDs como `CAN-01`, `CAN-07` y `RNF-01` cuando existan en la especificación.

- Pruebas unitarias para reglas UML, geometría, operaciones y validación JSON.
- Pruebas de integración para relaciones que siguen a sus elementos, contención, edición y deshacer/rehacer.
- Pruebas manuales/automatizadas en navegador para interacción Canvas, teclado, accesibilidad y exportación.
- Cubrir casos negativos: referencias inexistentes, IDs duplicados, ciclos de contención, relaciones incompatibles, documentos corruptos y cancelación a mitad de una operación.
- No afirmar PASS sin ejecutar y reportar evidencias verificables. Si una prueba no se ejecutó, marcar `NOT_RUN` y explicar por qué.
- Cualquier corrección debe incluir pruebas de regresión adecuadas; no borrar, desactivar ni relajar pruebas para lograr resultados verdes.
- Evaluar rendimiento de arrastre, zoom y dibujo; evitar ciclos de redibujado permanentes y trabajo innecesario en cada evento.

## 11. Protocolo de trabajo incremental

Orden aprobado de referencia:

1. **UML-00:** catálogo normativo y requisitos específicos de ambos diagramas.
2. **UML-01:** estructura de aplicación, modelo y primer renderizado.
3. **UML-02:** inserción y manipulación de elementos.
4. **UML-03:** relaciones, anclajes y validaciones estructurales.
5. **UML-04:** editor de casos de uso conforme al catálogo.
6. **UML-05:** editor de despliegue conforme al catálogo.
7. **UML-06:** historial, navegación, guardado/apertura y exportación.
8. **UML-07:** pruebas integrales y preparación para revisión académica.

**Ejecutar solo el incremento solicitado**. Respetar lo existente, inspeccionar archivos antes de modificar y evitar refactorizaciones fuera de alcance. No crear código de un incremento posterior «por aprovechar el contexto». No instalar dependencias, cambiar convenciones mayores ni iniciar acciones Git destructivas/publicaciones sin aprobación.

Al finalizar cada incremento, entregar un resumen en `REPORT.md` o en la ruta aprobada por el responsable, indicando:
- objetivo y alcance ejecutado;
- archivos creados/modificados y responsabilidad de cada uno;
- decisiones técnicas y trade-offs relevantes;
- pruebas ejecutadas, comandos, resultados y evidencias;
- limitaciones, pendientes y riesgos;
- estado **PASS / PARTIAL / FAIL** sustentado por evidencias;
- guía precisa para reproducir y verificar lo realizado.

No decidir unilateralmente que una entrega está **aceptada**: ese dictamen corresponde al responsable del proyecto.

## 12. Documentación viva y guía de cambios

La documentación técnica prevista es:

- `docs/REQUIREMENTS.md`: requisitos y criterios de aceptación.
- `docs/UML-CATALOG.md`: catálogo normativo y restricciones.
- `docs/ARCHITECTURE.md`: módulos, dependencias, formato de datos y contratos.
- `docs/ROADMAP.md`: incrementos y estado de ejecución.
- `docs/CHANGE-GUIDE.md`: **qué archivo editar** para cada cambio habitual.

**Si alguno no existe todavía, no asumas que está implementado:** créalo solo cuando lo exija el incremento autorizado. Mantenerlo actualizado cuando cambie una decisión.

Guía inicial de localización:
- Colores/distribución de UI → `css/variables.css`, `css/layout.css`.
- Representación de un actor, caso de uso, nodo o artefacto → definición/renderizador de su tipo UML.
- Relaciones permitidas y semántica → reglas del diagrama correspondiente.
- Movimiento, selección y herramientas → gestor de interacciones.
- Geometría, anclajes y trazado → motor de geometría/renderizado.
- Campos editables → definición del elemento + panel de propiedades.
- Guardado, importación, exportación → módulo de entrada/salida.

## 13. Fuentes de referencia

- Object Management Group (OMG), **UML 2.5.1**: https://www.omg.org/spec/UML/2.5.1
- ISO/IEC 25010:2023, modelo de calidad del producto (en particular modularidad, analizabilidad, modificabilidad y capacidad de prueba).
- MDN, HTML semántico, CSS, JavaScript Modules, Canvas API y Pointer Events.
- W3C WAI, WCAG 2.2: https://www.w3.org/TR/WCAG22/
- Robert C. Martin, *Clean Architecture* (2017); principios SOLID, aplicados sin sobrediseño.

Los archivos PDF UML y el ejemplo de Canvas aportados por el usuario son insumos de consulta, **no** autorización para copiar íntegramente implementaciones ni para sustituir la especificación OMG. Examinar las referencias reales antes de atribuirles contenidos específicos.
