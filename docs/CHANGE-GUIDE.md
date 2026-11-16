# Guía de Cambios y Mantenimiento (`docs/CHANGE-GUIDE.md`)

> **Propósito:** Localizar de forma rápida y acotada qué archivo modificar ante cualquier cambio funcional, visual, normativo o de pruebas durante la revisión académica, sin alterar funcionalidades no relacionadas (`GEMINI.md` §12, `RNF-01`).

---

## 1. Visión de la Arquitectura

El editor sigue una separación estricta de responsabilidades en módulos ES nativos (`import`/`export`, sin frameworks ni dependencias externas):

1. **Dominio y Estado (`js/core/`):** `DiagramModel` mantiene el modelo semántico (`model.elements`, `model.relationships`) separado del modelo visual (`view.elements`, `view.relationships`, `view.drawOrder`), validando invariantes de forma atómica. `Editor` orquesta las operaciones, la selección, las herramientas activas, `CommandHistory` (`Undo`/`Redo`) y el `Viewport`.
2. **Catálogos y Validadores UML (`js/uml/`):** Cada diagrama (`use-case` y `deployment`) registra sus descriptores declarativos de elementos y relaciones y sus reglas de validación específicas, compartiendo únicamente `Comment`/`CommentLink` (`CommonCatalog.js`) y algoritmos de grafos (`GraphValidation.js`).
3. **Motor Canvas (`js/canvas/`):** `CanvasRenderer` dibuja bajo demanda (`requestAnimationFrame`) adaptando `devicePixelRatio`; `Geometry` realiza cálculos puros de hit-testing y anclajes sobre perímetros reales; `Viewport` gestiona cámara 2D (`zoom`/`pan`); `InteractionManager` traduce `PointerEvent` y teclado a comandos del `Editor`.
4. **Entrada/Salida (`js/io/`):** `JsonSerializer` serializa y valida archivos `.json` versionados (`schemaVersion: 1`, límite `2 MiB`); `PngExporter` calcula dimensiones seguras (`<= 8192` px por lado y `<= 16_777_216` px totales) y exporta PNG limpio sin guías ni selección.
5. **Interfaz HTML (`index.html`, `css/`, `js/main.js`):** Controles nativos accesibles sincronizados con `Editor` mediante suscripción (`textContent`, formularios DOM nativos, sin `innerHTML`).

---

## 2. Estructura de Directorios

```text
index.html                  # Estructura HTML5 semántica (5 regiones + formularios accesibles)
css/
  variables.css             # Custom properties (colores, tipografía, espaciados, bordes)
  layout.css                # Grid/Flexbox de 5 regiones y breakpoints responsivos
  editor.css                # Estilos de controles, :focus-visible, :disabled y alertas
js/
  main.js                   # Punto de entrada y enlace UI <-> Editor (bindToolbarControls)
  core/
    DiagramModel.js         # Modelo semántico/visual, validación estructural e invariantes
    Editor.js               # Controlador de estado, operaciones atómicas, historial y viewport
    CommandHistory.js       # Pila Undo/Redo por instantáneas (maxEntries = 50)
  canvas/
    CanvasRenderer.js       # Renderizado 2D bajo demanda (Canvas + exportación PNG)
    Geometry.js             # Hit-testing, cajas, intersección en perímetros y rutas
    InteractionManager.js   # Estados de puntero, arrastre, redimensionado, conexión y teclado
    Viewport.js             # Transformaciones screen<->world, zoomAt, panBy, fitToBounds
  uml/
    common/
      CommonCatalog.js      # Descriptor compartido de Comment y CommentLink (DP-01)
      GraphValidation.js    # Utilidades de grafos (detección de ciclos dirigidos)
    use-case/
      UseCaseCatalog.js     # Descriptores de Actor, UseCase, SystemBoundary y relaciones
      UseCaseValidator.js   # Reglas semánticas de Casos de Uso y advertencias
    deployment/
      DeploymentCatalog.js  # Descriptores de Node, Device, ExecutionEnv, Artifact, Spec y rels
      DeploymentValidator.js# Reglas semánticas de Despliegue, contención y ciclos
    SampleDiagrams.js       # Documentos de ejemplo (SAMPLE_USE_CASE_DOCUMENT / SAMPLE_DEPLOYMENT_DOCUMENT)
  io/
    JsonSerializer.js       # Exportación/importación JSON versionada (límite 2 MiB)
    PngExporter.js          # Cálculo de límites/escala segura y exportación PNG
tests/
  diagram-model.test.js     # Pruebas base de modelo, geometría y UML-01-FIX / UML-02-FIX
  uml-02-interactions.test.js
  uml-03-relationships.test.js
  uml-04-use-case.test.js
  uml-05-deployment.test.js
  uml-06-cross-cutting.test.js
  UML-06-INDEPENDENT-REGRESSIONS.test.js
  es-module-integrity.test.js
  uml-07-audit.test.js      # Pruebas integrales, seguridad, teclado y benchmarks
docs/
  UML-CATALOG.md            # Catálogo normativo OMG UML 2.5.1
  REQUIREMENTS.md           # Requisitos CAN-*, RF-* y RNF-*
  ARCHITECTURE.md           # Contratos y arquitectura conceptual
  ROADMAP.md                # Estado de incrementos
  CHANGE-GUIDE.md           # Este documento
```

---

## 3. Responsabilidades de Cada Módulo

| Módulo | Responsabilidad principal |
| --- | --- |
| `js/core/DiagramModel.js` | Identidad única, mapa seguro sin claves de prototipo (`RESERVED_PROTOTYPE_KEYS`), correspondencia `model`/`view`, `validateDocumentSnapshot()`, mutaciones atómicas de elementos/relaciones. |
| `js/core/Editor.js` | Coordinación de mutaciones reversibles (`_executeRecordedMutation`), selección, herramienta activa, confirmación `DP-03`, notificaciones `reportFeedback()` y suscripción de UI. |
| `js/core/CommandHistory.js` | Historial acotado (`maxEntries = 50`) basado en instantáneas `before`/`after`. |
| `js/canvas/Geometry.js` | Funciones puras: `clientToCanvasLogicalPoint()`, hit-testing por forma (`isPointInActor`, `isPointInEllipse`, `isPointInThreeDimensionalCube`, `isPointInFoldedNote`, `isPointInRectangle`), perímetros (`getRectanglePerimeterPoint`, `getEllipsePerimeterPoint`) y manejadores de redimensionado. |
| `js/canvas/CanvasRenderer.js` | Dibujo en Canvas 2D (`renderDiagramToContext`) compartido entre pantalla y `PngExporter`. |
| `js/canvas/InteractionManager.js` | Máquina de estados de puntero (`PointerEvent`), teclado (`Delete`, `Backspace`, `Escape`, `Ctrl+Z/Y`), rueda y `PANNING`. |
| `js/io/JsonSerializer.js` | `serializeDiagramToJson`, `prepareJsonExport`, `getUtf8ByteLength`, `parseAndValidateDiagramJson`. |
| `js/io/PngExporter.js` | `computeDiagramExportBounds`, `computeSafeExportDimensions`, `exportDiagramToPngBlob`. |

---

## 4. Cómo Incorporar o Modificar un Elemento UML

1. Localizar el catálogo correspondiente:
   - Casos de uso: `js/uml/use-case/UseCaseCatalog.js`
   - Despliegue: `js/uml/deployment/DeploymentCatalog.js`
   - Común (`Comment`): `js/uml/common/CommonCatalog.js`
2. Editar o registrar el descriptor dentro de `elements`:
   - `type`, `label`, `defaultSize`, `minSize` (o `getMinimumSize(element, view)` si depende del contenido), `resizable`, `shape` (`'actor'`, `'ellipse'`, `'node3d'`, `'note'`, `'rect'`), `editableFields`, `render(ctx, element, view, helpers)`.
3. Verificar compatibilidad de contención (`canContain` / `allowedParentTypes`) en el validador del diagrama.
4. No es necesario editar `CanvasRenderer.js` ni `InteractionManager.js` si la figura usa una `shape` existente.

---

## 5. Cómo Modificar Validaciones Semánticas

1. **Reglas estructurales generales** (IDs duplicados, referencias rotas, ciclos genéricos de `parentId`, claves reservadas): `js/core/DiagramModel.js` (`validateDocumentSnapshot`).
2. **Reglas específicas de Casos de Uso** (extremos permitidos en `Include`/`Extend`/`Association`, ciclos, `SystemBoundary` sin anidación `DP-02`, advertencias §8.2): `js/uml/use-case/UseCaseValidator.js`.
3. **Reglas específicas de Despliegue** (contención multinivel Matriz 7.4, `Deployment`, `CommunicationPath`, `Manifestation`, `isInstance`, advertencias §8.2): `js/uml/deployment/DeploymentValidator.js`.
4. **Regla obligatoria:** Toda validación fallida debe retornar `{ isValid: false, errors: [...] }` **antes** de mutar el estado del documento.

---

## 6. Cómo Modificar Propiedades y Formularios HTML

1. Declarar el campo en `editableFields` del descriptor del elemento en su catálogo (`UseCaseCatalog.js` o `DeploymentCatalog.js`).
2. Si requiere un control especializado (como `extensionPoints`, `manifestedElements` o `DeploymentSpecification.properties`), actualizar el renderizador de formulario y la recolección de valores en `js/main.js` (`buildElementPropertiesForm()` / `readElementChangesFromForm()`), usando siempre creación de nodos DOM nativos y `textContent`/`value` (nunca `innerHTML`).
3. **Controles DOM de posición, tamaño y navegación (`UML-07-FIX`):**
   - `bindElementGeometryControls({ doc, editor })` en `js/main.js` conecta los campos `#prop-geom-x`, `#prop-geom-y`, `#prop-geom-width`, `#prop-geom-height` y los botones `#btn-apply-position` / `#btn-apply-size` (definidos en `#element-geometry-section` dentro de `index.html`) con `editor.commitMoveElement()` y `editor.commitResizeElement()`.
   - La sincronización (`syncGeometryFields`) evita sobrescribir el input activo (`doc.activeElement`) y mantiene la firma separada de `#element-dynamic-fields` para no destruir el foco durante la edición.
   - `bindToolbarControls()` conecta `#btn-pan-left`, `#btn-pan-up`, `#btn-pan-down` y `#btn-pan-right` con `editor.panBy(dx, dy)` usando un paso fijo `ACCESSIBLE_PAN_STEP_PX = 80` px sin mutar `DiagramModel` ni `CommandHistory`.
4. Para cambiar estilos visuales o paleta de UI, editar únicamente `css/variables.css`, `css/layout.css` o `css/editor.css`.

---

## 7. Cómo Modificar Renderizadores y Geometría

- **Apariencia de un tipo UML:** editar la función `render(ctx, element, view, helpers)` de su descriptor en `UseCaseCatalog.js`, `DeploymentCatalog.js` o `CommonCatalog.js`.
- **Paleta y tipografía del lienzo Canvas:** `UML_CANVAS_THEME` en `js/canvas/CanvasRenderer.js`.
- **Hit-testing o cálculo de intersección en perímetro:** `Editor.hitTestElementAt()` en `js/core/Editor.js` junto con las funciones geométricas de `js/canvas/Geometry.js` (`isPointInRectangle`, `isPointInEllipse`, `isPointInFoldedNote`, `isPointInThreeDimensionalCube`, `isPointInActor`, `getRectanglePerimeterPoint` y `getEllipsePerimeterPoint`).
- **Cámara (zoom/pan):** `js/canvas/Viewport.js` (`minZoom = 0.25`, `maxZoom = 3`).

---

## 8. Cómo Ejecutar y Ampliar las Pruebas

- **Ejecutar toda la suite automatizada (Node.js nativo, sin dependencias):**
  ```powershell
  node --test
  ```
- **Ejecutar un archivo concreto:**
  ```powershell
  node --test tests/uml-07-audit.test.js
  ```
- **Ampliar pruebas:** agregar casos `test('...', () => { ... })` en el archivo `tests/*.test.js` del ámbito correspondiente manteniendo pruebas positivas y negativas (atomicidad ante fallo).
- **Verificación manual en navegador:** servir la raíz con un servidor estático (p. ej. `python -m http.server 8080 --bind 127.0.0.1`) y abrir `http://127.0.0.1:8080/index.html` con DevTools (`Disable cache` activo durante desarrollo local).

---

## 9. Contrato JSON y Compatibilidad

```json
{
  "schemaVersion": 1,
  "id": "diagram-id",
  "name": "Nombre del diagrama",
  "diagramType": "use-case",
  "model": { "elements": [], "relationships": [] },
  "view": { "elements": {}, "relationships": {}, "drawOrder": [] }
}
```

- `schemaVersion`: entero estrictamente igual a `1` (`SUPPORTED_SCHEMA_VERSION`).
- `diagramType`: exclusivamente `'use-case'` o `'deployment'`.
- Límite de archivo en guardado y apertura: `MAX_JSON_FILE_BYTES = 2 * 1024 * 1024` (2 MiB UTF-8).
- Política de IDs: `isSafeIdentifier()` rechaza claves vacías, no string y claves reservadas de prototipo (`__proto__`, `constructor`, `prototype`).
- Cualquier evolución futura de esquema debe incrementar `SUPPORTED_SCHEMA_VERSION` y registrar una función de migración explícita en `JsonSerializer.js`.

---

## 10. Decisiones Técnicas, Limitaciones y Puntos de Extensión

- **Decisiones clave:** `DP-01` (`Comment`/`CommentLink` compartidos), `DP-02` (`SystemBoundary` sin anidación), `DP-03` (`Extend` con confirmación atómica de `ExtensionPoint`), `DP-04` (`isInstance`/`classifierName` sin duplicar herramientas), `DP-05` (OMG UML 2.5.1 como fuente normativa prioritaria).
- **Limitaciones conocidas:**
  1. Los elementos no redimensionables (`Actor`, `Comment` según descriptor) muestran ancho/alto en modo `readOnly` y deshabilitan **Aplicar tamaño**.
  2. El historial `CommandHistory` conserva hasta 50 entradas en memoria de sesión (sin persistencia entre recargas).
  3. El servidor estático `python -m http.server` no añade `favicon.ico` (404 cosmético) ni cabeceras `Cache-Control: no-store` durante desarrollo.
- **Puntos de extensión limpios:** Nuevos atributos en elementos existentes (vía `editableFields` + descriptor), ajustes visuales en `CanvasRenderer.js` o `css/variables.css`, y futuras migraciones de `schemaVersion` en `JsonSerializer.js`.
