# Especificación de Requisitos y Criterios de Aceptación (UML-00 / UML-00R)

> **Estado del documento:** Entregable reconciliado en **UML-00R**. Documenta los requisitos funcionales, de interacción en Canvas (`CAN-*`), de validación UML y no funcionales (`RNF-*`), junto con sus criterios de aceptación y matriz de trazabilidad hacia la arquitectura propuesta, alineados con las decisiones aprobadas `DP-01` a `DP-05`.

---

## 1. Alcance del Producto y Restricciones Tecnológicas

1. **Exclusividad de diagramas:** La aplicación permite crear y editar **únicamente** diagramas UML de **Casos de Uso** (`use-case`) y diagramas UML de **Despliegue** (`deployment`), conforme a [`docs/UML-CATALOG.md`](UML-CATALOG.md).
2. **Stack tecnológico obligatorio:** HTML5 semántico, CSS3 (con Custom Properties, Flexbox y Grid), JavaScript Vanilla (módulos ES nativos en modo estricto) y API **Canvas 2D**.
3. **Prohibiciones expresas:** Sin frameworks de UI (React, Vue, Angular, etc.), sin bibliotecas de diagramación prefabricadas (JointJS, GoJS, Draw.io, Cytoscape, Konva, Fabric, etc.), sin backend, sin base de datos, sin sesiones ni autenticación.
4. **Ejecución local:** Debe funcionar en navegador moderno servido desde un servidor estático local de desarrollo.

---

## 2. Requisitos Funcionales de Interacción y Canvas (`CAN-*`)

| ID | Requisito | Clasificación | Criterio de aceptación verificable |
| --- | --- | --- | --- |
| **CAN-01** | **Selección de modo de diagrama y paleta exclusiva** | `[DECISIÓN PROYECTO]` | Al crear o abrir un diagrama, el modo (`use-case` o `deployment`) determina exclusivamente las herramientas disponibles en la paleta lateral. No se mezclan elementos ni relaciones específicos de ambos diagramas (compartiendo únicamente el elemento común `Comment` y su enlace `CommentLink` según `DP-01`). |
| **CAN-02** | **Inserción por herramienta y clic** | `[DECISIÓN PROYECTO]` | Al seleccionar una herramienta de elemento en la paleta y hacer clic en el Canvas, se crea una instancia con ID único estable en las coordenadas del modelo (independientes de zoom/pan) y queda seleccionada. |
| **CAN-03** | **Selección precisa (Hit-testing geométrico)** | `[DECISIÓN PROYECTO]` | Hacer clic sobre un elemento o relación lo selecciona respetando su geometría real (elipse, rectángulo, nota con esquina doblada, cubo 3D, segmento de línea con tolerancia) y el orden de dibujo (`drawOrder`). Hacer clic en el fondo vacío limpia la selección. |
| **CAN-04** | **Movimiento por arrastre y actualización de conexiones** | `[NORMATIVO / PROYECTO]` | Arrastrar un elemento seleccionado actualiza su posición visual; todas sus relaciones conectadas recalculan sus puntos de anclaje en tiempo real. Al soltar el puntero, el movimiento completo se registra como **una única** operación deshacible (`GEMINI.md` §9). |
| **CAN-05** | **Redimensionamiento mediante controladores** | `[DECISIÓN PROYECTO]` | Los elementos redimensionables (`UseCase`, `SystemBoundary`, `Node`, `Device`, `ExecutionEnvironment`, `Artifact`, `DeploymentSpecification`, `Comment`) muestran manejadores al seleccionarse, respetando dimensiones mínimas por tipo y recalculando anclajes de relaciones conectadas. |
| **CAN-06** | **Creación de relaciones origen → destino y confirmación atómica** | `[NORMATIVO / PROYECTO]` | Con una herramienta de relación activa, seleccionar el origen y luego el destino muestra una previsualización provisional e invoca al validador del diagrama. En `Extend` (`DP-03`), la confirmación atómica exige asignar o crear un `ExtensionPoint` válido en el `UseCase` destino antes de mutar el modelo. En `CommentLink` (`DP-01`), `sourceId` referencia un `Comment` y `targetId` puede referenciar tanto un elemento (`model.elements`) como una relación UML semántica (`model.relationships`, excepto otro `CommentLink`). Si la relación es válida, enlaza `sourceId` y `targetId` (nunca coordenadas sueltas); si es inválida o se cancela, no altera el modelo y se notifica el motivo. |
| **CAN-07** | **Cancelación de operaciones provisionales con `Esc`** | `[DECISIÓN PROYECTO]` | Presionar la tecla `Esc` durante una inserción, un arrastre en curso o el trazado/confirmación provisional de una relación (incluida la selección de `ExtensionPoint` en `Extend` según `DP-03`) cancela inmediatamente la acción y restaura el estado previo sin modificar el documento ni agregar entradas al historial (`GEMINI.md` §9). |
| **CAN-08** | **Contención semántica explícita vs. superposición visual** | `[NORMATIVO / PROYECTO]` | Superponer gráficamente una figura sobre otra no asigna pertenencia UML de forma implícita silenciosa. La contención semántica (`parentId`) se establece mediante acción explícita validada (inserción directa en contenedor válido, acción de asignación o arrastre con confirmación visual de contenedor válido) y mover un contenedor traslada consigo a sus hijos semánticos. |
| **CAN-09** | **Edición de nombres y propiedades con controles HTML** | `[DECISIÓN PROYECTO]` | El usuario edita nombres, texto de comentarios (`body`), estereotipos, puntos de extensión, condiciones, multiplicidades, indicadores de instancia (`isInstance`/`classifierName`) y elementos manifestados (`manifestedElements`) mediante controles HTML nativos (`input`, `textarea`, `select`, `checkbox`, `button`) en el panel de propiedades. El texto se procesa como datos planos (`textContent` / Canvas `fillText`), nunca con `innerHTML`. |
| **CAN-10** | **Eliminación íntegra sin referencias huérfanas** | `[DECISIÓN PROYECTO]` | Eliminar un elemento o relación mediante `Delete`/`Backspace` o botón de UI elimina atómicamente sus relaciones y enlaces `CommentLink` incidentes (incluidos aquellos `CommentLink` que anoten a una relación eliminada) y actualiza o elimina su descendencia según la política del comando, garantizando cero referencias huérfanas en `model.relationships` y `view`. |
| **CAN-11** | **Navegación del lienzo (Zoom y Pan)** | `[DECISIÓN PROYECTO]` | El usuario puede hacer zoom (acercar, alejar, restablecer 100%) y desplazar la vista (pan). Estas transformaciones afectan únicamente a la cámara/vista temporal del Canvas y **no** modifican las coordenadas almacenadas de los elementos en el documento (`GEMINI.md` §9). |
| **CAN-12** | **Historial Deshacer / Rehacer (`Undo` / `Redo`)** | `[DECISIÓN PROYECTO]` | Toda mutación confirmada del documento se ejecuta como operación atómica reversible. El usuario puede deshacer (`Ctrl+Z`) y rehacer (`Ctrl+Y` / `Ctrl+Shift+Z`) desde teclado y barra superior, manteniendo sincronizados el modelo, la vista y el panel de propiedades. |

---

## 3. Requisitos Funcionales Específicos por Diagrama y Persistencia (`RF-*`)

### 3.1 Editor de Casos de Uso (`RF-UC-*`)

| ID | Requisito | Clasificación | Criterio de aceptación verificable |
| --- | --- | --- | --- |
| **RF-UC-01** | **Soporte del catálogo de elementos de Casos de Uso** | `[NORMATIVO / DP-01 / DP-02]` | Permite insertar y renderizar `Actor` (variantes stickman y rectángulo `«actor»`), `UseCase` (elipse con compartimento opcional `extension points`), múltiples `SystemBoundary` independientes sin anidación entre sí (`DP-02`) y notas `Comment` con esquina doblada (`DP-01`). Exige nombres no vacíos en `Actor`, `UseCase` y `ExtensionPoint` (`must_have_name`). |
| **RF-UC-02** | **Soporte del catálogo de relaciones de Casos de Uso** | `[NORMATIVO / DP-01 / DP-03]` | Permite trazar y renderizar `Association` (línea continua con multiplicidades/roles opcionales), `Include` (línea discontinua, flecha abierta hacia el caso incluido y etiqueta `«include»`), `Extend` (previsualización provisional y confirmación atómica tras asignar/crear un `ExtensionPoint` válido en el caso base extendido según `DP-03`, con flecha abierta hacia el caso extendido y etiqueta `«extend»`), `Generalization` (línea continua con triángulo cerrado hueco hacia el elemento general) y `CommentLink` (línea discontinua sin flecha hacia/desde `Comment`, `DP-01`). |
| **RF-UC-03** | **Validación estructural de Casos de Uso** | `[NORMATIVO / PROYECTO]` | Aplica las matrices 7.1 y 7.2 de [`docs/UML-CATALOG.md`](UML-CATALOG.md): impide actores dentro de `SystemBoundary` (`[NORMATIVO]`), impide anidar `SystemBoundary` dentro de otro `SystemBoundary` (`[DECISIÓN PROYECTO: DP-02]`), impide asociaciones entre dos `Actor` (`[NORMATIVO]`) y entre dos `UseCase` (`[NORMATIVO]` mismo sujeto / `[DECISIÓN PROYECTO]` en general), impide `Include`/`Extend` con actores (`[NORMATIVO]`), impide confirmar `Extend` sin `ExtensionPoint` perteneciente al `UseCase` destino (`[NORMATIVO + DP-03]`), impide generalizaciones cruzadas `Actor ↔ UseCase` (`[NORMATIVO]`) e impide ciclos en `Generalization` e `Include` (`[NORMATIVO]`). |

### 3.2 Editor de Despliegue (`RF-DEP-*`)

| ID | Requisito | Clasificación | Criterio de aceptación verificable |
| --- | --- | --- | --- |
| **RF-DEP-01** | **Soporte del catálogo de elementos de Despliegue e instancias opcionales** | `[NORMATIVO / DP-01 / DP-04]` | Permite insertar y renderizar `Node` (cubo 3D), `Device` (cubo 3D con `«device»`), `ExecutionEnvironment` (cubo 3D con `«executionEnvironment»`), `Artifact` (rectángulo con `«artifact»`, icono de documento y compartimento opcional de `manifestedElements`), `DeploymentSpecification` (rectángulo con `«deploymentSpec»` y compartimento de propiedades) y `Comment` (`DP-01`). Soporta representación opcional a nivel de instancia (`isInstance: true`, `classifierName`) dibujando el encabezado `nombre : Clasificador` subrayado sin duplicar herramientas en la paleta (`DP-04`). |
| **RF-DEP-02** | **Soporte del catálogo de relaciones de Despliegue y `Manifestation` acotada** | `[NORMATIVO / PROYECTO]` | Permite trazar y renderizar `CommunicationPath` (línea continua entre `DeploymentTargets` con estereotipo/multiplicidad opcional), `Deployment` (línea discontinua con flecha abierta y `«deploy»` de artefacto a nodo), `Manifestation` (`«manifest»` entre artefactos/especificaciones en el lienzo, complementado con la propiedad `manifestedElements` en `Artifact` para registrar `Component`, `Class` o `Package` externos sin introducir editores de otros diagramas), `Dependency`, `Generalization` y `CommentLink` (`DP-01`). |
| **RF-DEP-03** | **Representación dual de despliegue y anidación multinivel** | `[NORMATIVO / PROYECTO]` | Permite anidar nodos dentro de nodos (`nestedNode`), artefactos dentro de artefactos (`nestedArtifact`) y artefactos dentro de nodos (despliegue por contención) o conectarlos externamente con `«deploy»`, aplicando las matrices 7.3 y 7.4 de [`docs/UML-CATALOG.md`](UML-CATALOG.md) (impidiendo `CommunicationPath` con artefactos, `Deployment` invertido, `Manifestation` hacia nodos, `Node`/`Device` dentro de `Artifact` o `ExecutionEnvironment`, y ciclos de contención o generalización). |

### 3.3 Persistencia JSON y Exportación PNG (`RF-IO-*`)

| ID | Requisito | Clasificación | Criterio de aceptación verificable |
| --- | --- | --- | --- |
| **RF-IO-01** | **Exportación de documento JSON versionado** | `[DECISIÓN PROYECTO]` | Guarda el diagrama activo en un archivo `.json` plano que cumple el esquema con `schemaVersion: 1`, `id`, `name`, `diagramType`, `model` y `view`, sin serializar referencias DOM, funciones ni estado efímero de interacción. |
| **RF-IO-02** | **Importación y validación estricta de JSON** | `[DECISIÓN PROYECTO]` | Al abrir un archivo `.json`, valida tamaño, sintaxis JSON, versión de esquema, tipos permitidos para el `diagramType`, unicidad de IDs, existencia de `sourceId`/`targetId`/`parentId`, validez de `extensionLocation` en `Extend` y ausencia de ciclos antes de reemplazar el diagrama activo. Si el archivo es corrupto o inválido, rechaza la carga sin alterar el documento en memoria e informa el error. |
| **RF-IO-03** | **Exportación gráfica PNG limpia** | `[DECISIÓN PROYECTO]` | Genera una imagen `.png` del diagrama excluyendo resaltados de selección, manejadores de redimensionamiento, rejillas de ayuda o cursores de edición (`GEMINI.md` §9). |

---

## 4. Requisitos No Funcionales Prioritarios (`RNF-*`)

Se conservan los identificadores base definidos en [`docs/PROJECT-CONTEXT.md`](PROJECT-CONTEXT.md) y se detallan sus mecanismos de verificación conforme a **ISO/IEC 25010:2023**:

| ID | Atributo de calidad (ISO 25010) | Descripción del requisito | Criterio de aceptación y evidencia esperada |
| --- | --- | --- | --- |
| **RNF-01** | **Mantenibilidad y Modificabilidad** | Cada módulo tiene una única responsabilidad clara (`GEMINI.md` §3). Las reglas y renderizadores de cada tipo UML están aislados del motor general. | Cambiar el dibujo de un `Actor`, el color de la interfaz o una regla de validación de `Extend` requiere modificar únicamente el archivo responsable identificado en la arquitectura, sin romper pruebas de otros módulos. |
| **RNF-02** | **Extensibilidad (Principio Abierto/Cerrado)** | Los elementos y relaciones de cada diagrama se registran mediante descriptores declarativos/polimórficos en su catálogo respectivo. | Incorporar una variante de notación o ajustar las propiedades de un elemento no obliga a modificar bloques condicionales (`if`/`switch`) en `CanvasRenderer` ni en `InteractionManager`. |
| **RNF-03** | **Comprensibilidad y Analizabilidad** | Código autoexplicativo con contratos públicos documentados en JSDoc, constantes con nombre y estructura de carpetas predecible. | Cualquier requisito funcional puede rastrearse en la matriz de trazabilidad hacia su módulo exacto y sus pruebas asociadas. |
| **RNF-04** | **Corrección, Atomicidad e Integridad** | Ninguna operación inválida o cancelada puede dejar el documento en un estado parcialmente mutado, con IDs duplicados, ciclos o relaciones huérfanas. | El 100 % de las pruebas negativas de validación y de cancelación (`Esc`) verifican que el snapshot de `model` y `view` permanece idéntico al estado previo al fallo. |
| **RNF-05** | **Usabilidad y Accesibilidad (WCAG 2.2 AA)** | Uso de HTML5 semántico (`header`, `main`, `nav`, `aside`, `section`, `form`, `label`, `button`), navegación por teclado, `:focus-visible`, contraste suficiente y controles DOM alternativos para seleccionar y editar propiedades de elementos del Canvas. | Todos los botones tienen `type="button"` (salvo envío de formulario), etiquetas asociadas, estado `:disabled` claro y notificaciones legibles sin depender únicamente del color. |
| **RNF-06** | **Seguridad y Prevención de XSS** | Tratamiento de entradas de usuario y archivos JSON importados exclusivamente como datos planos. Prohibido `eval`, `new Function` e `innerHTML` con datos del modelo. | Pruebas con nombres de elementos que contienen cadenas como `<script>alert(1)</script>` o payloads malformados en JSON demuestran que se renderizan literalmente como texto inofensivo o son rechazados por el validador de esquemas. |
| **RNF-07** | **Eficiencia de Rendimiento en Canvas** | Dibujo bajo demanda con `requestAnimationFrame` y soporte de `devicePixelRatio` sin bucles infinitos de repintado cuando el editor está inactivo. | El Canvas solo se redibuja cuando ocurre un cambio en el estado del modelo, la selección, la interacción en curso o el viewport (zoom/pan/resize). |

---

## 5. Matriz de Trazabilidad Inicial (Requisito → Módulo Responsable → Pruebas Previstas)

Esta matriz vincula cada requisito con el módulo de la arquitectura conceptual ([`docs/ARCHITECTURE.md`](ARCHITECTURE.md)) y los escenarios de prueba definidos en [`docs/UML-CATALOG.md`](UML-CATALOG.md):

| ID Requisito | Módulo(s) responsable(s) previsto(s) | Incremento de implementación | Escenarios / Pruebas de verificación previstas |
| --- | --- | --- | --- |
| **CAN-01** | `js/core/Editor.js`, `js/ui/PaletteView.js`, registros en `js/uml/common/`, `js/uml/use-case/` y `js/uml/deployment/` | UML-01, UML-04, UML-05 | Prueba de cambio de modo, disponibilidad de `Comment` en ambos modos (`DP-01`) y aislamiento de catálogos específicos. |
| **CAN-02** | `js/canvas/InteractionManager.js`, `js/core/DiagramModel.js` | UML-02 | Prueba de inserción por clic con transformación inversa de coordenadas de cámara. |
| **CAN-03** | `js/canvas/Geometry.js`, `js/canvas/InteractionManager.js` | UML-02, UML-03 | Pruebas unitarias de hit-testing en rectángulos, elipses, notas con esquina doblada, cubos 3D y segmentos con orden Z (`drawOrder`). |
| **CAN-04** | `js/canvas/InteractionManager.js`, `js/canvas/Geometry.js`, `js/core/CommandHistory.js` | UML-02, UML-03, UML-06 | Prueba de integración: mover elemento recalcula anclajes de relaciones y genera 1 solo comando en historial. |
| **CAN-05** | `js/canvas/InteractionManager.js`, `js/canvas/Geometry.js` | UML-02 | Prueba de redimensionamiento respetando tamaños mínimos y actualizando anclajes. |
| **CAN-06** | `js/canvas/InteractionManager.js`, `js/uml/*/Validator.js`, `js/core/DiagramModel.js` | UML-03, UML-04, UML-05 | Escenarios `ESC-UC-V01..V05`, `ESC-UC-I01..I05`, `ESC-DEP-V01..V04`, `ESC-DEP-I01..I03`. |
| **CAN-07** | `js/canvas/InteractionManager.js` | UML-02, UML-03, UML-04 | Prueba de pulsación de `Esc` a mitad de arrastre y durante la confirmación de `Extend` (`ESC-UC-I05`, `DP-03`) sin mutar `DiagramModel`. |
| **CAN-08** | `js/core/DiagramModel.js`, `js/uml/*/Validator.js`, `js/canvas/InteractionManager.js` | UML-02, UML-04, UML-05 | `PA-UC-03`, `ESC-UC-V05`, `ESC-UC-I03`, `ESC-DEP-V01`, `ESC-DEP-I03` (separación entre colisión visual y `parentId`, no anidación entre `SystemBoundary` según `DP-02`). |
| **CAN-09** | `js/ui/PropertiesPanel.js`, `js/core/Editor.js` | UML-02, UML-04, UML-05 | Prueba de edición de propiedades (`name`, `body`, `extensionPoints`, `isInstance`, `manifestedElements`) mediante controles DOM nativos. |
| **CAN-10** | `js/core/DiagramModel.js`, `js/core/Editor.js` | UML-02, UML-03 | Prueba unitaria de borrado en cascada de relaciones conectadas y verificación de 0 referencias huérfanas. |
| **CAN-11** | `js/canvas/Viewport.js` (o `CanvasRenderer.js`), `js/canvas/InteractionManager.js` | UML-06 | Prueba de invariancia de `view.elements[id].x/y` tras operaciones de zoom y pan. |
| **CAN-12** | `js/core/CommandHistory.js`, `js/core/Editor.js` | UML-06 | Pruebas unitarias y de integración de secuencias `execute -> undo -> redo` para todas las operaciones. |
| **RF-UC-01..03** | `js/uml/use-case/UseCaseCatalog.js`, `js/uml/use-case/UseCaseValidator.js`, `js/uml/use-case/UseCaseRenderers.js` | UML-03, UML-04 | `PA-CMN-01`, `PA-UC-01..07`, `ESC-UC-V01..V05`, `ESC-UC-I01..I05`. |
| **RF-DEP-01..03** | `js/uml/deployment/DeploymentCatalog.js`, `js/uml/deployment/DeploymentValidator.js`, `js/uml/deployment/DeploymentRenderers.js` | UML-03, UML-05 | `PA-CMN-01`, `PA-DEP-01..06`, `ESC-DEP-V01..V04`, `ESC-DEP-I01..I03`. |
| **RF-IO-01..03** | `js/io/JsonSerializer.js`, `js/io/SchemaValidator.js`, `js/io/PngExporter.js` | UML-06 | Pruebas unitarias de ida y vuelta JSON (`serialize -> parse/validate`), rechazo de JSON corrupto y exportación PNG sin guías. |
| **RNF-01..07** | Transversal a toda la arquitectura (`css/`, `js/core/`, `js/canvas/`, `js/uml/`, `js/ui/`, `js/io/`) | UML-01 a UML-07 | Revisión de aislamiento modular, pruebas negativas de integridad, validación HTML/WCAG y sanitización XSS. |
