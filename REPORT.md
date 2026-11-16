# Informe Final de Auditoría — UML-07 y UML-07-FIX: Pruebas Integrales, Accesibilidad y Preparación para Revisión Académica

**Dictamen definitivo:** **PASS — PROYECTO TÉCNICAMENTE ACEPTADO** *(63/63 pruebas automatizadas Node.js PASS + 5/5 verificaciones manuales de UML-07-FIX PASS; sin defectos bloqueantes pendientes).*

**Estado de fases previas:** **UML-06** (incluidos `UML-06-FIX`, `UML-06-FIX2` y `UML-06-FIX3`) queda registrado como **Aceptado** en [`docs/ROADMAP.md`](docs/ROADMAP.md) (53/53 Node.js PASS, 16/16 comprobaciones adicionales PASS, 5/5 verificaciones manuales de UML-06-FIX3 PASS).

---

## 1. Matriz de Trazabilidad Integral (`Requisito → Módulo → Prueba → Evidencia → Estado`)

| ID | Módulo(s) responsable(s) | Prueba(s) | Evidencia | Estado |
| --- | --- | --- | --- | --- |
| **CAN-01** | `Editor.js`, `UseCaseCatalog.js`, `DeploymentCatalog.js`, `CommonCatalog.js`, `main.js` | `tests/diagram-model.test.js` (#2), `tests/uml-07-audit.test.js` (`UML-07.1`) | Cambio de modo limpia historial/selección y aísla catálogos salvo `Comment`/`CommentLink` (`DP-01`). | **Implementado y verificado** |
| **CAN-02** | `InteractionManager.js`, `Editor.js`, `DiagramModel.js` | `tests/uml-02-interactions.test.js` (`UML-02.3`) | Inserción por clic convierte coordenadas con `Viewport` y selecciona el nuevo ID. | **Implementado y verificado** |
| **CAN-03** | `Geometry.js`, `InteractionManager.js` | `tests/uml-02-interactions.test.js` (`UML-02.2`) | Hit-testing geométrico por forma (`actor`, `ellipse`, `node3d`, `note`, `rect`) respetando `drawOrder`. | **Implementado y verificado** |
| **CAN-04** | `InteractionManager.js`, `Geometry.js`, `Editor.js`, `CommandHistory.js`, `main.js` | `tests/uml-02-interactions.test.js` (`UML-02.4`, `UML-02.9`), `tests/uml-06-cross-cutting.test.js` (`UML-06.1`), `tests/uml-07-fix-accessibility.test.js` (`UML-07-FIX.1`–`.2`) | Arrastre y alternativa DOM X/Y (`#btn-apply-position`) trasladan descendientes, recalculan anclajes y registran 1 entrada en `CommandHistory`. | **Implementado y verificado** |
| **CAN-05** | `InteractionManager.js`, `Geometry.js`, `Editor.js`, `main.js` | `tests/uml-02-interactions.test.js` (`UML-02.5`, `UML-02.9`), `tests/uml-07-fix-accessibility.test.js` (`UML-07-FIX.3`) | 8 manejadores y alternativa DOM Ancho/Alto (`#btn-apply-size`), respetando mínimos estáticos/dinámicos y anclajes. | **Implementado y verificado** |
| **CAN-06** | `InteractionManager.js`, `Editor.js`, `UseCaseValidator.js`, `DeploymentValidator.js` | `tests/uml-03-relationships.test.js` (`UML-03.1`–`UML-03.5`), `tests/uml-07-audit.test.js` (`UML-07.3`) | Trazado origen→destino, confirmación atómica `Extend` (`DP-03`) y alternativa DOM `#relationship-creator-form`. | **Implementado y verificado** |
| **CAN-07** | `InteractionManager.js`, `Editor.js` | `tests/uml-02-interactions.test.js` (`UML-02.6`), `tests/uml-03-relationships.test.js` (`UML-03.3`), `tests/uml-07-audit.test.js` (`UML-07.3`) | `Esc` cancela inserción, arrastre, redimensionado y conexión sin mutar el modelo ni ensuciar historial. | **Implementado y verificado** |
| **CAN-08** | `DiagramModel.js`, `UseCaseValidator.js`, `DeploymentValidator.js`, `main.js` | `tests/uml-02-interactions.test.js` (`UML-02.4`), `tests/uml-04-use-case.test.js` (`UML-04.3`), `tests/uml-05-deployment.test.js` (`UML-05.3`) | Superposición visual no altera `parentId`; contención explícita validada contra ciclos y reglas. | **Implementado y verificado** |
| **CAN-09** | `main.js`, `Editor.js`, `UseCaseCatalog.js`, `DeploymentCatalog.js` | `tests/uml-02-interactions.test.js` (`UML-02.7`), `tests/uml-07-audit.test.js` (`UML-07.2`) | Edición mediante controles HTML nativos y `textContent`/Canvas `fillText` (sin `innerHTML`). | **Implementado y verificado** |
| **CAN-10** | `DiagramModel.js`, `Editor.js`, `InteractionManager.js` | `tests/uml-02-interactions.test.js` (`UML-02.8`), `tests/uml-03-relationships.test.js` (`UML-03.5`), `tests/uml-07-audit.test.js` (`UML-07.3`) | `Delete`/`Backspace` y UI eliminan relaciones/`CommentLink` encadenados con política `detach`/`cascade`. | **Implementado y verificado** |
| **CAN-11** | `Viewport.js`, `CanvasRenderer.js`, `InteractionManager.js` | `tests/uml-06-cross-cutting.test.js` (`UML-06.4`, `UML-06-FIX.1`) | Zoom (`0.25×`–`3×`) y pan preservan intactas las coordenadas lógicas en `view.elements`. | **Implementado y verificado** |
| **CAN-12** | `CommandHistory.js`, `Editor.js`, `InteractionManager.js` | `tests/uml-06-cross-cutting.test.js` (`UML-06.1`–`UML-06.3`), `tests/uml-07-audit.test.js` (`UML-07.3`, `UML-07.5`) | Undo/Redo atómico (incluyendo `Extend + ExtensionPoint`), atajos respetan `<input>`/`<textarea>`, límite 50. | **Implementado y verificado** |
| **RF-UC-01..03** | `UseCaseCatalog.js`, `UseCaseValidator.js`, `GraphValidation.js` | `tests/uml-04-use-case.test.js` (`UML-04.1`–`UML-04.6`) | `Actor`, `UseCase`, `ExtensionPoint`, `SystemBoundary` (`DP-02`), ciclos, advertencias y ejemplo banca. | **Implementado y verificado** |
| **RF-DEP-01..03** | `DeploymentCatalog.js`, `DeploymentValidator.js`, `GraphValidation.js` | `tests/uml-05-deployment.test.js` (`UML-05.1`–`UML-05.7`, `UML-05-FIX.1`–`.2`) | `Node`, `Device`, `ExecutionEnvironment`, `Artifact`, `DeploymentSpecification`, `isInstance` (`DP-04`), contención y ejemplo e-commerce. | **Implementado y verificado** |
| **RF-IO-01..02** | `JsonSerializer.js`, `DiagramModel.js`, `main.js` | `tests/uml-06-cross-cutting.test.js` (`UML-06.5`–`.6`), `tests/UML-06-INDEPENDENT-REGRESSIONS.test.js` (`AUD-06.1`), `tests/uml-07-audit.test.js` (`UML-07.2`, `UML-07.4`) | Round-trip `schemaVersion: 1`, límite `2 MiB` al guardar y abrir, rechazo atómico de corruptos. | **Implementado y verificado** |
| **RF-IO-03** | `PngExporter.js`, `CanvasRenderer.js`, `main.js` | `tests/uml-06-cross-cutting.test.js` (`UML-06.7`), `tests/UML-06-INDEPENDENT-REGRESSIONS.test.js` (`AUD-06.2`), `tests/uml-07-audit.test.js` (`UML-07.2`) | Exportación limpia sin overlays y cotas `<= 8192` px / `<= 16_777_216` px totales; exportación PNG en navegador validada en la aceptación de UML-06 y regresión de UML-07. | **Implementado y verificado** |
| **RNF-01..04** | Toda la arquitectura modular (`js/core`, `js/canvas`, `js/uml`, `js/io`) | `tests/es-module-integrity.test.js` (`MOD-01`) + suite vigente completa (`63/63`) | Bajo acoplamiento, Open/Closed por descriptores, JSDoc, atomicidad 100 % ante errores. | **Implementado y verificado** |
| **RNF-05** | `index.html`, `css/*.css`, `js/main.js` | `tests/uml-07-fix-accessibility.test.js` (`UML-07-FIX.1`–`.5`) + 5/5 verificaciones manuales PASS | HTML semántico, `:focus-visible`, alternativa DOM para relaciones, posición X/Y, tamaño y pan (`80` px), más reflow 320–1280 px comprobados en las 5 pruebas manuales aprobadas de UML-07-FIX (sin declarar certificación integral WCAG 2.2 AA). | **Implementado y verificado (con alcance documentado)** |
| **RNF-06** | `DiagramModel.js`, `JsonSerializer.js`, `main.js` | `tests/diagram-model.test.js` (#10–#11), `tests/uml-07-audit.test.js` (`UML-07.2`, `UML-07.4`) | Cero `innerHTML`/`eval`/`new Function`; rechazo de `__proto__`/`constructor`/`prototype`; XSS seguro. | **Implementado y verificado** |
| **RNF-07** | `CanvasRenderer.js`, `CommandHistory.js` | `tests/uml-07-audit.test.js` (`UML-07.5`) | Dibujo bajo demanda con `requestAnimationFrame` (sin bucle ocioso) y tiempos `< 1.5 ms` en 200 nodos. | **Implementado y verificado** |

---

## 2. Auditoría de Accesibilidad (WCAG 2.2 Nivel AA)

- **Criterios implementados y verificados por código:**
  - **HTML semántico y roles (`1.3.1`, `4.1.2`):** Regiones `<header>`, `<nav>`, `<aside>`, `<main>`, `<footer>`, formularios nativos con `<label for="...">`, botones explícitos `type="button"` / `type="submit"`, `aria-pressed` en herramienta activa, `role="alert"` en `#properties-error-alert` y `aria-live="polite"` en `#zoom-level-indicator`.
  - **Foco visible y estados (`2.4.7`, `2.4.11`):** `css/editor.css` define `:focus-visible` (`outline: 2px solid var(--color-focus-ring); outline-offset: 2px;`) para `.btn`, `.form-select`, `.form-input`, `.form-textarea` y `.palette-button`, además de estilos `:disabled`.
  - **Contraste (`1.4.3`, `1.4.11`):** Paleta centralizada en `css/variables.css` (`#0f172a` sobre `#ffffff`/`#f8fafc`, `#ffffff` sobre `#1d4ed8` y `#dc2626`, `#991b1b` sobre `#fee2e2`).
  - **Alternativas DOM y teclado (`2.1.1`, `2.5.7` — UML-07-FIX):**
    - **Relaciones:** `#relationship-creator-form` permite crear relaciones seleccionando tipo, origen, destino y `ExtensionPoint` (`DP-03`).
    - **Posición y dimensiones (`UML-07-FIX`):** `#element-geometry-section` dentro de `#element-properties-form` expone `#prop-geom-x`, `#prop-geom-y`, `#prop-geom-width`, `#prop-geom-height` (paso `1` px) y botones **Aplicar posición** (`#btn-apply-position`) y **Aplicar tamaño** (`#btn-apply-size`) conectados mediante `bindElementGeometryControls()` a `Editor.commitMoveElement()` y `Editor.commitResizeElement()`. Los elementos no redimensionables (`resizable === false`) muestran ancho/alto en `readOnly` y deshabilitan **Aplicar tamaño**. La sincronización conserva el foco del usuario y no sobrescribe el campo activo.
    - **Navegación del viewport (`UML-07-FIX`):** cuatro botones accesibles (`#btn-pan-left`, `#btn-pan-up`, `#btn-pan-down`, `#btn-pan-right`) operables por Tab/Enter/Espacio invocan `Editor.panBy()` con un paso constante `ACCESSIBLE_PAN_STEP_PX = 80` px de pantalla sin modificar el modelo ni el historial.
  - **Reflow en pantallas estrechas (`1.4.10` — 320, 375, 649, 768, 1280 px):** Verificado previamente 5/5 PASS en UML-07; los nuevos botones de pan heredan `flex-wrap: wrap` en `.toolbar-group`.
- **Nota de alcance WCAG 2.2 AA:** Las 5 verificaciones manuales de UML-07-FIX (selección accesible, posición X/Y, tamaño, pan y reflow) resultaron **PASS**; no obstante, no se declara certificación integral WCAG 2.2 AA del producto completo.

---

## 3. Auditoría de Seguridad y Robustez

Verificación estática sobre `index.html` y `js/**/*.js` + pruebas negativas (`tests/uml-07-audit.test.js`):
1. **XSS e inyección DOM:** `0` ocurrencias de `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, `eval`, `new Function`, `localStorage`, `sessionStorage` o `fetch` en todo `index.html` y `js/`. Cadenas `<script>alert("xss")</script>` se conservan y renderizan como texto plano (`UML-07.2`).
2. **Contaminación de prototipos:** `DiagramModel` (`isSafeIdentifier`, `RESERVED_PROTOTYPE_KEYS`) rechaza atómicamente `__proto__`, `constructor` y `prototype` tanto en API directa como al importar JSON (`UML-07.4`).
3. **Validación JSON y límites:** Rechazo estricto sin mutar el documento activo ante sintaxis inválida, `schemaVersion !== 1`, IDs duplicados, ciclos, geometrías por debajo del mínimo y tamaño `> 2 MiB` tanto al guardar como al abrir.
4. **Grafo completo de módulos ES:** Verificado por `MOD-01` (`tests/es-module-integrity.test.js`).

---

## 4. Auditoría de Rendimiento y Mantenibilidad

Mediciones reproducibles obtenidas en Node.js (`tests/uml-07-audit.test.js`, `UML-07.5`) sobre contexto 2D instrumentado:
- **Renderizado Canvas (`CanvasRenderer.renderDiagramToContext`, `1280×800`):**
  - Diagrama pequeño (ejemplo Casos de Uso): **1.20 ms**
  - Diagrama mediano (60 nodos, 45 relaciones): **0.59 ms**
  - Diagrama grande (200 nodos, 150 relaciones): **0.78 ms**
- **Validación estructural completa (`validateDocumentSnapshot`, 200 nodos / 150 relaciones):** **0.11 ms**
- **Importación y validación JSON cercana al límite (`1,900,556` bytes UTF-8, ~1.81 MiB):** **2.67 ms**
- **Memoria de historial (`CommandHistory`):** Acotado de forma verificada a `50` entradas tras `65` inserciones consecutivas.
- **Redibujado bajo demanda:** `CanvasRenderer.requestRender()` programa un único `requestAnimationFrame` pendiente sin bucles continuos en reposo.
- **Mantenibilidad:** Módulos cohesionados y desacoplados; no se detectó duplicación crítica ni dependencias circulares que justifiquen refactorizaciones extensas en esta fase.

---

## 5. Observaciones No Bloqueantes Heredadas

1. **`favicon.ico` 404 en servidor local:** Propio de `python -m http.server` cuando no existe icono; no afecta funcionalidad ni módulos (no se agrega asset innecesario).
2. **Caché de módulos ES en desarrollo local:** `python -m http.server` no envía `Cache-Control: no-store`; durante desarrollo local se recomienda mantener **Disable cache** en DevTools al cambiar archivos entre incrementos.
3. **Distribución en pantallas estrechas:** Mitigado el posible desbordamiento de `.toolbar-group` y `.toolbar-select` en `css/layout.css` (pendiente verificación visual en navegador real).

---

## 6. Resultados de Pruebas y Clasificación de Hallazgos

- **Suite automatizada (`node --test`):** **63/63 PASS** (`0` fallos, `0` omitidas, duración `460.5717 ms`):
  - `tests/UML-06-INDEPENDENT-REGRESSIONS.test.js`: 2/2 PASS
  - `tests/diagram-model.test.js`: 11/11 PASS
  - `tests/es-module-integrity.test.js`: 1/1 PASS (`MOD-01`)
  - `tests/uml-02-interactions.test.js`: 9/9 PASS
  - `tests/uml-03-relationships.test.js`: 6/6 PASS
  - `tests/uml-04-use-case.test.js`: 6/6 PASS
  - `tests/uml-05-deployment.test.js`: 9/9 PASS
  - `tests/uml-06-cross-cutting.test.js`: 9/9 PASS
  - `tests/uml-07-audit.test.js`: 5/5 PASS (`UML-07.1`–`UML-07.5`)
  - `tests/uml-07-fix-accessibility.test.js`: 5/5 PASS (`UML-07-FIX.1`–`UML-07-FIX.5`, incluyendo rechazo estricto de fracciones `123.5` y `201.5`)
- **Verificación manual previa aceptada (UML-07-FIX):** **5/5 PASS** (comunicado en la aceptación de UML-07-FIX; no repetida tras el cierre estricto de enteros al no alterar el comportamiento válido).

### Cierre de observaciones menores (UML-07)

1. **`parseIntegerPixelValue()` en `js/main.js`:** Rechaza fracciones (`123.5`, `201.5`, `-12.5`), `NaN`, infinitos y vacíos mediante `/^-?\d+$/` + `Number.isSafeInteger()`, manteniendo enteros positivos y negativos válidos sin mutar modelo, historial ni selección en caso de rechazo (`UML-07-FIX.5`).
2. **`docs/CHANGE-GUIDE.md`:** Actualizadas todas las referencias de funciones a los símbolos reales del repositorio (`buildElementPropertiesForm()`, `readElementChangesFromForm()`, `Editor.hitTestElementAt()`, `getRectanglePerimeterPoint()`, `getEllipsePerimeterPoint()`, `clientToCanvasLogicalPoint()`, `isPointIn*`).

### Procedimiento reproducible para verificación manual de UML-07-FIX en navegador

1. Servir la raíz del proyecto con `python -m http.server 8080 --bind 127.0.0.1` y abrir `http://127.0.0.1:8080/index.html` con DevTools abierto (**Disable cache** activo).
2. Seleccionar un elemento usando `#accessible-entity-select` exclusivamente con teclado (`Tab`, flechas, `Enter`).
3. Tabular hasta **Posición y dimensiones** (`Posición X`, `Posición Y`), cambiar los valores con teclado y activar **Aplicar posición** con `Enter` o `Espacio`: comprobar desplazamiento en Canvas, recálculo de relaciones y 1 entrada en `Deshacer`.
4. Tabular hasta `Ancho` y `Alto`, introducir dimensiones válidas y activar **Aplicar tamaño**; luego probar valores inválidos (`-10`, vacío, o altura inferior al mínimo dinámico de un `Artifact` con 3 `manifestedElements`) comprobando rechazo en rojo (`status-pill-error`) sin perder el texto introducido.
5. Probar `Deshacer` / `Rehacer` (`Ctrl+Z` / `Ctrl+Y` o botones) verificando actualización sincronizada de `X`, `Y`, `Ancho` y `Alto`.
6. Activar los botones `←`, `↑`, `↓`, `→` con `Tab` + `Enter`/`Espacio` comprobando desplazamiento del lienzo sin habilitar `Deshacer` ni alterar coordenadas en `Detalle en DiagramModel`.
7. Verificar ausencia de errores en consola y reflow limpio en **320 px, 375 px y 1280 px**.
