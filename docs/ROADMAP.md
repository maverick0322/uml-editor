# Hoja de Ruta e Incrementos de Desarrollo (UML-00 / UML-00R)

> **Estado del documento:** Entregable reconciliado en **UML-00R**. Registra el plan incremental aprobado en [`GEMINI.md`](../GEMINI.md) (§11), la revisión técnica de **UML-00** (`PARTIAL`), la ejecución de la reconciliación normativa **UML-00R**, los entregables por fase y las condiciones de paso entre incrementos.

---

## 1. Gobernanza del Proceso Incremental

1. **Autorización explícita:** Ningún incremento puede iniciarse sin la autorización expresa del responsable del proyecto tras revisar el incremento anterior.
2. **Alcance estricto:** En cada incremento se implementan únicamente los módulos y funcionalidades asignados a dicha fase, sin adelantar código de incrementos futuros.
3. **Dictamen técnico:** Al concluir cada incremento, el agente ejecutor entrega evidencia verificable y un estado técnico (`PASS`, `PARTIAL` o `FAIL`), pero la **aceptación formal** corresponde exclusivamente al responsable del proyecto.

---

## 2. Estado General de los Incrementos

| Incremento | Nombre | Estado actual | Entregables principales |
| --- | --- | --- | --- |
| **UML-00** | Contrato normativo y requisitos | **Aceptado con observaciones (tras UML-00R)** | `docs/UML-CATALOG.md`, `docs/REQUIREMENTS.md`, `docs/ARCHITECTURE.md`, `docs/ROADMAP.md`, `REPORT.md` |
| **UML-01** | Estructura de aplicación, modelo y primer renderizado | **Aceptado con observaciones (tras UML-01-FIX)** | Base HTML5/CSS3 (`index.html`, `css/`), `DiagramModel`, `Editor`, `Geometry`, `CanvasRenderer`, catálogos iniciales (`use-case`, `deployment`, `common`), `SampleDiagrams.js` y suite `tests/diagram-model.test.js` (9/9 PASS + 5/5 navegador PASS) |
| **UML-02** | Inserción y manipulación de elementos | **Aceptado (tras UML-02-FIX)** | `InteractionManager`, `Geometry` (conversión de coordenadas con DPR, hit-testing geométrico por forma, 8 manejadores de redimensionamiento), operaciones atómicas en `DiagramModel` y `Editor`, política segura de identificadores (`isSafeIdentifier`, `RESERVED_PROTOTYPE_KEYS`), desacoplamiento por inyección de catálogo, formulario nativo de propiedades, borrado con políticas `'detach'`/`'cascade'` y suite `tests/uml-02-interactions.test.js` (20/20 Node.js PASS + 10/10 navegador PASS) |
| **UML-03** | Relaciones, anclajes y validaciones estructurales | **Aceptado** | `DiagramModel.addRelationship()`, trazado interactivo origen→destino en `InteractionManager` (`CONNECTING`) y `CanvasRenderer` (conexión provisional), anclajes dinámicos sobre perímetros, confirmación `DP-03` (`Extend` con `ExtensionPoint`), `CMN-REL-01` (`CommentLink` hacia elementos y relaciones), alternativa DOM accesible (`#relationship-creator-form`) y suite `tests/uml-03-relationships.test.js` (26/26 Node.js PASS + 10/10 navegador PASS) |
| **UML-04** | Editor de casos de uso conforme al catálogo | **Aceptado** | `UseCaseValidator.js` (detección de ciclos dirigidos en `Include`, `Generalization` y `Extend`; diferenciación de advertencias no bloqueantes §8.2), `DiagramModel.updateElementAndAddRelationship()`, confirmación atómica `DP-03` con creación opcional de `ExtensionPoint`, panel de advertencias y suite `tests/uml-04-use-case.test.js` (32/32 Node.js PASS + 10/10 navegador PASS) |
| **UML-05** | Editor de despliegue conforme al catálogo | **Aceptado (tras UML-05-FIX)** | `GraphValidation.js`, `DeploymentValidator.js`, `DeploymentCatalog.js` (`getMinimumSize`, recorte y renderizado completo de `manifestedElements` y `DeploymentSpecification.properties`), controles HTML en `main.js` y suite `tests/uml-05-deployment.test.js` (41/41 Node.js PASS + 10/10 UML-05 + 2/2 UML-05-FIX navegador PASS) |
| **UML-06** | Historial, navegación, guardado/apertura y exportación | **Aceptado (tras UML-06-FIX, FIX2 y FIX3)** | `CommandHistory.js`, `Viewport.js`, `JsonSerializer.js` (`prepareJsonExport`, `2 MiB`), `PngExporter.js` (`computeSafeExportDimensions`, `8192` px / `16_777_216` px), `DiagramModel.js`, `Editor.js` (`reportFeedback`), `CanvasRenderer.js`, `InteractionManager.js`, `index.html`, `main.js`, `tests/uml-06-cross-cutting.test.js`, `tests/UML-06-INDEPENDENT-REGRESSIONS.test.js` y `tests/es-module-integrity.test.js` (53/53 Node.js PASS + 5/5 navegador PASS) |
| **UML-07** | Pruebas integrales y preparación para revisión académica | **Aceptado (tras UML-07-FIX y cierre de observaciones menores)** | `docs/CHANGE-GUIDE.md`, `css/layout.css`, `css/editor.css`, `index.html`, `js/main.js` (`bindElementGeometryControls`, `parseIntegerPixelValue` estricto, `ACCESSIBLE_PAN_STEP_PX = 80`), `tests/uml-07-audit.test.js`, `tests/uml-07-fix-accessibility.test.js`, matriz de trazabilidad y `REPORT.md` (63/63 pruebas automatizadas PASS + 5/5 verificaciones manuales de UML-07-FIX PASS) |

---

## 3. Detalle por Incremento

### UML-00 y UML-00R — Contrato normativo, requisitos y reconciliación
- **Objetivo:** Establecer el catálogo normativo trazable a OMG UML 2.5.1 (`formal/2017-12-05`) para Casos de Uso y Despliegue, los requisitos funcionales y no funcionales, las matrices de compatibilidad, los escenarios de aceptación y la arquitectura conceptual.
- **Reconciliación ejecutada en UML-00R:**
  1. Contraste y corrección sistemática de secciones, restricciones OCL y páginas impresas/PDF contra `formal/2017-12-05` (especialmente Cláusulas 7, 9, 11, 18 y apartados `19.5.1` a `19.5.10`).
  2. Distinción rigurosa entre reglas explícitas del estándar (`[NORMATIVO]`), acotaciones adicionales del editor (`[DECISIÓN PROYECTO]`) y sugerencias (`[RECOMENDADO]`).
  3. Integración de decisiones aprobadas `DP-01` (`Comment` en ambos editores), `DP-02` (múltiples `SystemBoundary` sin anidación), `DP-03` (previsualización provisional y confirmación atómica de `Extend` con `ExtensionPoint`), `DP-04` (instancias de despliegue mediante propiedades `isInstance`/`classifierName`) y `DP-05` (OMG UML 2.5.1 como referencia normativa sin bloqueo de `UML-01`).
  4. Definición acotada de `Manifestation` en el editor de despliegue (conector entre artefactos en el lienzo + propiedad estructurada `manifestedElements` en `Artifact` para elementos empaquetables externos sin agregar editores de componentes o clases).
- **Restricción clave:** Cero implementación de HTML, CSS o JavaScript del editor.

### UML-01 — Estructura de aplicación, modelo y primer renderizado
- **Precondición:** Aceptación de **UML-00R** y autorización expresa del responsable para iniciar **UML-01**.
- **Alcance previsto:**
  - Maquetación en HTML5 semántico (`index.html`) y CSS3 modular (`css/variables.css`, `css/layout.css`, `css/editor.css`) con las cinco regiones de interfaz previstas en `docs/PROJECT-CONTEXT.md`.
  - Implementación de `DiagramModel` (separación `model`/`view`, invariantes de IDs y `drawOrder`) y estructura inicial de `Editor`.
  - Implementación de `CanvasRenderer` con ajuste a `devicePixelRatio`, renderizado bajo demanda con `requestAnimationFrame` y dibujo inicial de figuras cargadas en el modelo.
- **Verificación prevista:** Pruebas unitarias en Node.js para `DiagramModel` y verificación en navegador estático del renderizado inicial y estructura semántica HTML/CSS.

### UML-02 — Inserción y manipulación de elementos
- **Precondición:** Aprobación de **UML-01**.
- **Alcance previsto:**
  - `Geometry`: hit-testing para rectángulos, elipses, notas con esquina doblada y cubos 3D respetando `drawOrder`.
  - `InteractionManager`: inserción mediante selección de herramienta + clic, selección individual, movimiento por arrastre, redimensionamiento con manejadores, eliminación sin huérfanos y cancelación provisional con `Esc`.
  - Panel de propiedades HTML conectado al elemento seleccionado para editar nombre y atributos básicos de forma segura (`textContent`/`value`).
- **Verificación prevista:** Pruebas unitarias de `Geometry` y operaciones de `DiagramModel`, más pruebas interactivas de inserción, arrastre, redimensionado y cancelación con `Esc`.

### UML-03 — Relaciones, anclajes y validaciones estructurales
- **Precondición:** Aprobación de **UML-02**.
- **Alcance previsto:**
  - Creación interactiva de relaciones seleccionando origen y destino con previsualización provisional.
  - Cálculo geométrico de intersecciones con el perímetro de las figuras para que las conexiones sigan automáticamente a los elementos al moverlos o redimensionarlos.
  - Renderizado de líneas continuas, discontinuas, flechas abiertas, triángulos cerrados huecos y etiquetas de estereotipo (`«include»`, `«extend»`, `«deploy»`, `«manifest»`).
  - Motor de validación estructural pre-operación (rechazo atómico de relaciones inválidas sin mutar el documento).
- **Verificación prevista:** Pruebas unitarias de intersección geométrica, recálculo de anclajes tras movimiento y rechazo atómico de relaciones incompatibles.

### UML-04 — Editor de casos de uso conforme al catálogo
- **Precondición:** Aprobación de **UML-03**.
- **Alcance previsto:**
  - Implementación completa del catálogo `use-case` según [`docs/UML-CATALOG.md`](UML-CATALOG.md) (§4, §5 y §7.1–7.2): `Actor` (stickman y variante rectángulo `«actor»`), `UseCase` (con compartimento opcional `extension points`), múltiples `SystemBoundary` sin anidamiento (`DP-02`), `Comment` y `CommentLink` (`DP-01`), y relaciones `Association`, `Include`, `Extend` (confirmación atómica tras asignar o crear un `ExtensionPoint` válido en el destino según `DP-03`) y `Generalization`.
  - Validación completa de casos de uso (errores estructurales vs. advertencias de modelado).
- **Verificación prevista:** Ejecución de todos los escenarios `PA-CMN-01`, `PA-UC-01..07`, `ESC-UC-V01..V05`, `ESC-UC-I01..I05` y construcción completa del ejemplo «Sistema de Banca en Línea».

### UML-05 — Editor de despliegue conforme al catálogo
- **Precondición:** Aprobación de **UML-04**.
- **Alcance previsto:**
  - Implementación completa del catálogo `deployment` según [`docs/UML-CATALOG.md`](UML-CATALOG.md) (§4, §6 y §7.3–7.4): `Node`, `Device` (`«device»`), `ExecutionEnvironment` (`«executionEnvironment»`), `Artifact` (`«artifact»`, icono de documento y compartimento `manifestedElements`), `DeploymentSpecification` (`«deploymentSpec»` y propiedades), `Comment` y `CommentLink` (`DP-01`), soporte opcional de instancias (`isInstance`, `classifierName` con subrayado según `DP-04`), y relaciones `CommunicationPath`, `Deployment` (`«deploy»`), `Manifestation` (`«manifest»` acotada), `Dependency` y `Generalization`.
  - Contención semántica multinivel (`nestedNode`, despliegue por anidación y `nestedArtifact`) y validación específica.
- **Verificación prevista:** Ejecución de todos los escenarios `PA-CMN-01`, `PA-DEP-01..06`, `ESC-DEP-V01..V04`, `ESC-DEP-I01..I03` y construcción completa del ejemplo «Arquitectura Web de Comercio Electrónico».

### UML-06 — Historial, navegación, guardado/apertura y exportación
- **Precondición:** Aprobación de **UML-05**.
- **Alcance previsto:**
  - `CommandHistory` completo (`Undo`/`Redo` por teclado y botones, garantizando que un arrastre confirmado sea un único paso deshacible).
  - Navegación `Zoom` y `Pan` en el lienzo sin alterar las coordenadas lógicas del modelo.
  - Guardado e importación de archivos `.json` versionados (`schemaVersion: 1`) con validación rigurosa contra documentos corruptos, referencias inexistentes o ciclos.
  - Exportación a imagen `.png` limpia (excluyendo selección, guías y manejadores).
- **Verificación prevista:** Pruebas unitarias de `CommandHistory`, serialización/validación JSON (casos positivos y corruptos) y pruebas de exportación PNG e invariancia de coordenadas bajo zoom/pan.

### UML-07 — Pruebas integrales y preparación para revisión académica
- **Precondición:** Aprobación de **UML-06**.
- **Alcance previsto:**
  - Creación de `docs/CHANGE-GUIDE.md` detallada con referencias exactas a los archivos y funciones implementados.
  - Ejecución completa de la suite de pruebas unitarias, de integración y de aceptación (funcionales, negativas, accesibilidad WCAG 2.2 AA y rendimiento de redibujado).
  - Verificación de trazabilidad final extremo a extremo (`REQUIREMENTS.md` → código → `tests/`).
