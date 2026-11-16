# Catálogo Normativo y Reglas UML — Casos de Uso y Despliegue (UML-00 / UML-00R / UML-01)

> **Estado del documento:** Contrato normativo reconciliado y ajustado al inicio de **UML-01**. Define el catálogo semántico, visual y de validación para los dos únicos diagramas soportados por el editor: **Casos de Uso** (`use-case`) y **Despliegue** (`deployment`), verificado contra **OMG UML 2.5.1 (`formal/2017-12-05`)** e integrando las decisiones aprobadas (`DP-01` a `DP-05`).

---

## 1. Fuentes de referencia, convención de paginación y estado de verificación

Para garantizar trazabilidad académica rigurosa y evitar la invención de reglas, las fuentes del proyecto se clasifican según su disponibilidad y nivel de verificación:

| Fuente | Rol en el proyecto | Estado de consulta | Observaciones |
| --- | --- | --- | --- |
| **OMG Unified Modeling Language (UML) v2.5.1** (`formal/2017-12-05`, diciembre 2017) | Fuente normativa principal y prioritaria (`DP-05`) | **Verificada sistemáticamente** (Cláusulas 7, 9, 11, 18 y 19) | Se registran cláusulas, subsecciones exactas, nombres de restricciones OCL y páginas verificadas (tanto página impresa como página PDF) del documento oficial de 796 páginas. |
| **Seidl, Scholz, Huemer & Kappel (2015)**, *UML @ Classroom: An Introduction to Object-Oriented Modeling* | Referencia didáctica complementaria | **Pendiente de contraste físico (no bloquea UML-01 según `DP-05`)** | Los PDFs protegidos por derechos de autor no están incluidos en el repositorio (`GEMINI.md`, `docs/PROJECT-CONTEXT.md`). No se atribuyen páginas ni reglas inventadas a esta obra. |
| **Rosenberg & Stephens (2007)**, *Use Case Driven Object Modeling with UML: Theory and Practice* | Referencia didáctica complementaria (Casos de Uso) | **Pendiente de contraste físico (no bloquea UML-01 según `DP-05`)** | Ídem. Cualquier convención didáctica adicional se podrá incorporar de forma acotada en el catálogo declarativo si el responsable lo solicita tras revisión. |
| **Ejemplo didáctico de Canvas en JavaScript** | Insumo técnico de referencia de interacción | **No disponible en el repositorio local** | No afecta la semántica ni la notación normativa UML. |

### 1.1 Convención de paginación e índice verificado de OMG UML 2.5.1 (`formal/2017-12-05`)

> **Distinción entre página impresa y página PDF en `formal/2017-12-05`:** El archivo PDF oficial de OMG UML 2.5.1 (`formal/2017-12-05`, 796 páginas totales) contiene **40 páginas preliminares** en numeración romana (`i`–`xl`, que incluyen portada, prefacio e índice general) seguidas de **756 páginas numeradas en arábigos** (`1`–`756`). En consecuencia, para toda sección del cuerpo del estándar se cumple exactamente que **`página PDF = página impresa + 40`**. En todo este documento se indica primero la **página impresa** (la que figura en el índice general y en el pie de página del estándar) seguida entre corchetes de la **página del archivo PDF** (`p. X [PDF Y]`).

A continuación se presenta el índice consolidado y verificado contra la tabla de contenido y el cuerpo de `formal/2017-12-05`:

| Cláusula / Subsección en `formal/2017-12-05` | Título oficial en OMG UML 2.5.1 | Páginas impresas `[PDF]` | Restricciones OCL / Figuras verificadas |
| --- | --- | --- | --- |
| **Cláusula 7** | **7 Common Structure** | pp. 21–56 `[PDF 61–96]` | — |
| `§7.2` (`§7.2.1`–`§7.2.4`) | `7.2 Root` (`7.2.1 Summary` p. 21; `7.2.2 Abstract Syntax` pp. 21–22; `7.2.3 Semantics` pp. 22–23; `7.2.4 Notation` pp. 23–24) | pp. 21–24 `[PDF 61–64]` | Fig. 7.2 (`Root`, p. 21 `[PDF 61]`), Fig. 7.3 (`Comment notation`, p. 23 `[PDF 63]`) |
| `§7.6` (`§7.6.1`–`§7.6.5`) | `7.6 Constraints` | pp. 34–37 `[PDF 74–77]` | Fig. 7.12 (`Constraints`), Fig. 7.13 (`Constraint in a note`) |
| `§7.7` (`§7.7.1`–`§7.7.5`) | `7.7 Dependencies` | pp. 37–39 `[PDF 77–79]` | Fig. 7.15 (`Dependencies`), Fig. 7.16 (`Dependency notation`, p. 38 `[PDF 78]`) |
| `§7.8.1` | `7.8.1 Abstraction [from CommonStructure]` | p. 40 `[PDF 80]` | Superclase de `Manifestation` |
| `§7.8.2` | `7.8.2 Comment [from CommonStructure]` | pp. 40–41 `[PDF 80–81]` | `annotatedElement : Element[*]`, `body : String[0..1]` |
| `§7.8.3` | `7.8.3 Constraint [from CommonStructure]` | pp. 41–42 `[PDF 81–82]` | `boolean_value [1]`, `no_side_effects [2]`, `not_apply_to_self [3]` |
| `§7.8.4` | `7.8.4 Dependency [from CommonStructure]` | p. 42 `[PDF 82]` | `client : NamedElement[1..*]`, `supplier : NamedElement[1..*]` |
| **Cláusula 9** | **9 Classification** | pp. 89–162 `[PDF 129–202]` | — |
| `§9.2` (`§9.2.1`–`§9.2.5`) | `9.2 Classifiers` | pp. 89–96 `[PDF 129–136]` | Fig. 9.1 (`Classifiers`), Fig. 9.2 (`Generalization notation`, p. 94 `[PDF 134]`) |
| `§9.5` (`§9.5.1`–`§9.5.5`) | `9.5 Properties` | pp. 105–112 `[PDF 145–152]` | Multiplicidades y extremos de asociación |
| `§9.8` (`§9.8.1`–`§9.8.5`) | `9.8 Instances` | pp. 124–129 `[PDF 164–169]` | Notación subrayada `name : Classifier` (`§9.8.4`, pp. 126–128 `[PDF 166–168]`) |
| `§9.9.2` | `9.9.2 Classifier [from Classification]` | pp. 130–136 `[PDF 170–176]` | `specialize_type [2]`, `no_cycles_in_generalization [3]` (`§9.9.4.8`, p. 135 `[PDF 175]`) |
| `§9.9.7` | `9.9.7 Generalization [from Classification]` | pp. 138–139 `[PDF 178–179]` | `general : Classifier[1]`, `specific : Classifier[1]` |
| `§9.9.9` | `9.9.9 InstanceSpecification [from Classification]` | pp. 140–141 `[PDF 180–181]` | `classifier : Classifier[*]`, `deployment_target [1]`, `structural_feature [2]` |
| `§9.9.17` | `9.9.17 Property [from Classification]` | pp. 146–150 `[PDF 186–190]` | Atributos y extremos de asociación |
| **Cláusula 11** | **11 Structured Classifiers** | pp. 181–238 `[PDF 221–278]` | — |
| `§11.5` (`§11.5.1`–`§11.5.5`) | `11.5 Associations` | pp. 197–207 `[PDF 237–247]` | Sintaxis abstracta, semántica y notación de asociaciones |
| `§11.8.1` | `11.8.1 Association [from StructuredClassifiers]` | pp. 213–216 `[PDF 253–256]` | `memberEnd : Property[2..*]`, `binary_associations` |
| **Cláusula 18** | **18 UseCases** | pp. 639–650 `[PDF 679–690]` | — |
| `§18.1.1` | `18.1.1 Summary` | p. 639 `[PDF 679]` | — |
| `§18.1.2` | `18.1.2 Abstract Syntax` | pp. 639–640 `[PDF 679–680]` | Fig. 18.1 (`UseCases`) |
| `§18.1.3` | `18.1.3 Semantics` | pp. 640–641 `[PDF 680–681]` | Semántica de `Actor`, `UseCase`, `subject`, `Include`, `Extend` |
| `§18.1.4` | `18.1.4 Notation` | pp. 641–643 `[PDF 681–683]` | Fig. 18.2–18.9 (`Extend`, `Include`, `ExtensionPoints`, `Actor`, `Subject`) |
| `§18.1.5` | `18.1.5 Examples` | pp. 643–644 `[PDF 683–684]` | Fig. 18.10–18.11 |
| `§18.2.1` | `18.2.1 Actor [from UseCases]` | pp. 644–645 `[PDF 684–685]` | Constraints: `associations [1]`, `must_have_name [2]` |
| `§18.2.2` | `18.2.2 Extend [from UseCases]` | pp. 645–646 `[PDF 685–686]` | Constraint: `extension_points [1]` |
| `§18.2.3` | `18.2.3 ExtensionPoint [from UseCases]` | pp. 646–647 `[PDF 686–687]` | Constraint: `must_have_name [1]` |
| `§18.2.4` | `18.2.4 Include [from UseCases]` | p. 647 `[PDF 687]` | `addition : UseCase[1]`, `includingCase : UseCase[1]` |
| `§18.2.5` | `18.2.5 UseCase [from UseCases]` | pp. 647–649 `[PDF 687–689]` | Constraints: `binary_associations [1]`, `no_association_to_use_case [2]`, `cannot_include_self [3]`, `must_have_name [4]` |
| `§18.3` | `18.3 Association Descriptions` | pp. 649–650 `[PDF 689–690]` | Asociaciones del metamodelo de `UseCases` |
| **Cláusula 19** | **19 Deployments** | pp. 651–664 `[PDF 691–704]` | *(Nota: la Cláusula 20 `InformationFlows` inicia en p. 665 `[PDF 705]`)* |
| `§19.1` | `19.1 Summary` | p. 651 `[PDF 691]` | — |
| `§19.2` (`§19.2.1`–`§19.2.5`) | `19.2 Deployments` | pp. 651–653 `[PDF 691–693]` | Fig. 19.1 (`Deployments`), Fig. 19.2–19.3 |
| `§19.3` (`§19.3.1`–`§19.3.5`) | `19.3 Artifacts` | pp. 653–655 `[PDF 693–695]` | Fig. 19.4 (`Artifacts`), Fig. 19.5–19.7 |
| `§19.4` (`§19.4.1`–`§19.4.5`) | `19.4 Nodes` | pp. 655–657 `[PDF 695–697]` | Fig. 19.8 (`Nodes`), Fig. 19.9–19.11 |
| `§19.5.1` | `19.5.1 Artifact [from Deployments]` | pp. 657–658 `[PDF 697–698]` | `fileName : String[0..1]`, `manifestation : Manifestation[*]`, `nestedArtifact : Artifact[*]` |
| `§19.5.2` | `19.5.2 CommunicationPath [from Deployments]` | p. 658 `[PDF 698]` | Constraint: `association_ends [1]` |
| `§19.5.3` | `19.5.3 DeployedArtifact [from Deployments]` | pp. 658–659 `[PDF 698–699]` | Metaclase abstracta |
| `§19.5.4` | `19.5.4 Deployment [from Deployments]` | p. 659 `[PDF 699]` | `configuration : DeploymentSpecification[*]`, `deployedArtifact : DeployedArtifact[*]`, `location : DeploymentTarget[1]` |
| `§19.5.5` | `19.5.5 DeploymentSpecification [from Deployments]` | pp. 659–660 `[PDF 699–700]` | Constraints: `deployed_elements [1]`, `deployment_target [2]` |
| `§19.5.6` | `19.5.6 DeploymentTarget [from Deployments]` | pp. 660–661 `[PDF 700–701]` | Derivation: `deployedElement [1]` |
| `§19.5.7` | `19.5.7 Device [from Deployments]` | p. 661 `[PDF 701]` | Subclase de `Node` |
| `§19.5.8` | `19.5.8 ExecutionEnvironment [from Deployments]` | pp. 661–662 `[PDF 701–702]` | Subclase de `Node` |
| `§19.5.9` | `19.5.9 Manifestation [from Deployments]` | p. 662 `[PDF 702]` | `utilizedElement : PackageableElement[1]` |
| `§19.5.10` | `19.5.10 Node [from Deployments]` | pp. 662–663 `[PDF 702–703]` | `nestedNode : Node[*]`; Constraint: `internal_structure [1]` |
| `§19.6` | `19.6 Association Descriptions` | pp. 663–664 `[PDF 703–704]` | Asociaciones del metamodelo de `Deployments` |

---

## 2. Taxonomía de reglas y decisiones

En cumplimiento de `GEMINI.md` (§8), toda regla del catálogo se clasifica rigurosamente en una de tres categorías:

1. **Normativo (`[NORMATIVO]`):** exigido explícitamente por la especificación **OMG UML 2.5.1** (sintaxis abstracta, multiplicidades del metamodelo, restricciones OCL o semántica normativa). Su incumplimiento constituye un **error estructural** que el editor rechaza sin modificar el documento.
2. **Decisión del proyecto (`[DECISIÓN PROYECTO]`):** restricción adicional, simplificación del metamodelo o comportamiento interactivo acordado para este editor académico con el fin de preservar el alcance (**exclusivamente Casos de Uso y Despliegue**), **KISS**, **SOLID** y modificabilidad. Cuando una regla del editor es deliberadamente más estricta que UML 2.5.1 (p. ej., prohibir toda asociación entre dos `UseCase` incluso de distinto sujeto, o limitar la pertenencia de un `UseCase` a `0..1` `SystemBoundary` mediante `parentId`), su violación se rechaza en el editor como error de operación, pero **se documenta explícitamente como `[DECISIÓN PROYECTO]` y nunca como una prohibición general de UML**.
3. **Recomendado (`[RECOMENDADO]`):** buena práctica de modelado o legibilidad visual no exigida por el estándar (p. ej., que todo `UseCase` interactúe con al menos un `Actor`, o que una relación `Extend` especifique texto de condición). Su incumplimiento genera únicamente una **advertencia de modelado (`WARNING`)** no bloqueante.

---

## 3. Distinción entre Paleta Visual y Conceptos Internos del Metamodelo

### 3.1 Elementos y relaciones de la paleta (herramientas seleccionables por modo)

Conforme a la decisión aprobada **`DP-01`**, ambos editores incluyen el elemento común `Comment` y su vínculo `CommentLink` (`annotatedElement`).

| Modo de diagrama | Elementos de paleta (Nodos/Contenedores) | Relaciones de paleta (Conectores) |
| --- | --- | --- |
| **Casos de Uso** (`use-case`) | 1. Actor (`Actor`)<br>2. Caso de Uso (`UseCase`)<br>3. Límite del Sistema / Sujeto (`SystemBoundary`)<br>4. Comentario / Nota (`Comment`) `[DP-01]` | 1. Asociación (`Association`)<br>2. Inclusión (`Include`, `«include»`)<br>3. Extensión (`Extend`, `«extend»`)<br>4. Generalización (`Generalization`)<br>5. Enlace de Comentario (`CommentLink`) `[DP-01]` |
| **Despliegue** (`deployment`) | 1. Nodo (`Node`)<br>2. Dispositivo (`Device`, `«device»`)<br>3. Entorno de Ejecución (`ExecutionEnvironment`, `«executionEnvironment»`)<br>4. Artefacto (`Artifact`, `«artifact»`)<br>5. Especificación de Despliegue (`DeploymentSpecification`, `«deploymentSpec»`)<br>6. Comentario / Nota (`Comment`) `[DP-01]` | 1. Camino de Comunicación (`CommunicationPath`)<br>2. Despliegue (`Deployment`, `«deploy»`)<br>3. Manifestación (`Manifestation`, `«manifest»`)<br>4. Dependencia (`Dependency`)<br>5. Generalización (`Generalization`)<br>6. Enlace de Comentario (`CommentLink`) `[DP-01]` |

### 3.2 Conceptos internos del metamodelo UML y simplificaciones documentadas

Estos conceptos existen en el modelo semántico JSON y se gestionan mediante el **Panel de Propiedades** o flujos asistidos sin añadir botones redundantes en la paleta:

| Concepto UML | Ubicación en OMG UML 2.5.1 (`formal/2017-12-05`) | Naturaleza en UML vs. Simplificación en el editor (`[DECISIÓN PROYECTO]`) |
| --- | --- | --- |
| `ExtensionPoint` | `§18.1.2` (p. 639 `[PDF 679]`), `§18.2.3` (pp. 646–647 `[PDF 686–687]`) | En UML es un `RedefinableElement` propiedad de `UseCase` (`extensionPoint : ExtensionPoint[*]`). En el editor se almacena como colección `{ id, name }` dentro de `UseCase`, se renderiza en el compartimento `extension points` de la elipse y se selecciona/crea atómicamente al confirmar una relación `Extend` (`DP-03`). |
| `Constraint` (Condición de `Extend`) | `§7.6` (pp. 34–37 `[PDF 74–77]`), `§7.8.3` (pp. 41–42 `[PDF 81–82]`), `§18.1.2`, `§18.2.2` (pp. 645–646 `[PDF 685–686]`) | En UML, `Extend::condition : Constraint[0..1]` es un paquete `Constraint` con `ValueSpecification`. En el editor se simplifica como propiedad `condition: string` en la relación `Extend`. |
| `Property` / Extremos de Asociación (`memberEnd`) | `§9.5` (pp. 105–112), `§9.9.17` (pp. 146–150), `§11.5.2` (p. 197), `§18.1.2` (p. 639) | En UML, una `Association` posee `memberEnd : Property[2..*]`. En el editor se modela mediante propiedades planas `sourceMultiplicity`, `targetMultiplicity`, `sourceRole` y `targetRole` en `Association` y `CommunicationPath`. |
| `InstanceSpecification` (Nivel de instancia en Despliegue — `DP-04`) | `§9.8.4` (pp. 126–128 `[PDF 166–168]`), `§9.9.9` (pp. 140–141 `[PDF 180–181]`), `§19.2.4` (p. 652 `[PDF 692]`), `§19.4.4` (p. 656 `[PDF 696]`) | En el metamodelo UML, un nodo o artefacto a nivel de instancia es una `InstanceSpecification` cuyo `classifier` apunta a `Node` o `Artifact`. Conforme a **`DP-04`**, se colapsa en los propios elementos de despliegue mediante las propiedades opcionales `isInstance: boolean` y `classifierName: string` (mostrando `nombre : Clasificador` subrayado), evitando duplicar las 4 herramientas en la paleta. |
| `PackageableElement` externo en `Manifestation` | `§19.3.2` (p. 653 `[PDF 693]`), `§19.5.9` (p. 662 `[PDF 702]`) | En UML, `Manifestation::utilizedElement : PackageableElement[1]` suele apuntar a un `Component`, `Class`, `Package` o `Artifact`. Como el proyecto prohíbe editores de componentes o clases, los destinos en el lienzo se acotan a `Artifact` / `DeploymentSpecification` y los destinos externos (`Component`, `Class`, `Package`) se registran mediante la propiedad estructurada `manifestedElements` dentro de `Artifact` (véase §6.3 `DEP-REL-03`). |
| `DeploymentTarget` y `DeployedArtifact` | `§19.2.2` (p. 651 `[PDF 691]`), `§19.5.3` (pp. 658–659 `[PDF 698–699]`), `§19.5.6` (pp. 660–661 `[PDF 700–701]`) | Metaclases abstractas del metamodelo cumplidas concretamente por `Node`/`Device`/`ExecutionEnvironment` (`DeploymentTarget`) y por `Artifact`/`DeploymentSpecification` (`DeployedArtifact`). |
| Contención semántica (`subject`, `nestedNode`, `nestedArtifact`, `deployment`) | `§18.1.2` (p. 639), `§19.2.2` (p. 651), `§19.3.2` (p. 653), `§19.4.2` (p. 655) | Representada mediante `parentId: string | null` en `model.elements`, estrictamente separada de las coordenadas visuales en `view.elements` (`GEMINI.md` §4). |

---

## 4. Elementos y Relaciones Comunes a Ambos Editores (`DP-01`)

### 4.1 Elemento Común

#### CMN-EL-01: Comentario / Nota (`Comment`)
- **Concepto UML:** `Comment` (especialización de `Element` en `CommonStructure`). Anotación textual adjuntable a cualquier `Element` del modelo (tanto elementos clasificadores/nodos como relaciones UML, dado que en `§7.2.2` `Relationship` es subclase de `Element`) sin alterar su semántica estructural.
- **Diagramas:** `use-case` y `deployment` (`[DECISIÓN PROYECTO: DP-01]`).
- **Referencia OMG UML 2.5.1:** Cláusula 7, `§7.2.2` (Abstract Syntax, Fig. 7.2, pp. 21–22 `[PDF 61–62]`), `§7.2.3` (Semantics, pp. 22–23 `[PDF 62–63]`), `§7.2.4` (Notation, Fig. 7.3, pp. 23–24 `[PDF 63–64]`), `§7.8.2` (Classifier Descriptions: `Comment [from CommonStructure]`, pp. 40–41 `[PDF 80–81]`).
- **Propiedades del modelo:**
  - `id` (string, único, obligatorio) `[DECISIÓN PROYECTO]`
  - `type`: `"Comment"` `[DECISIÓN PROYECTO]`
  - `body` (string, texto del comentario) `[NORMATIVO: §7.8.2 body : String[0..1], p. 40 [PDF 80]]`
  - `parentId`: `null` (los comentarios se sitúan libremente en el lienzo y se vinculan mediante `CommentLink`) `[DECISIÓN PROYECTO]`
- **Notación gráfica:**
  - Rectángulo con la esquina superior derecha doblada («note symbol») que muestra el texto `body` en su interior `[NORMATIVO: §7.2.4, Fig. 7.3, p. 23 [PDF 63]]`.
- **Restricciones:**
  - `[NORMATIVO: §7.2.2, §7.8.2]` Un `Comment` no es un `Classifier` ni un `DeploymentTarget`; no puede participar en relaciones semánticas (`Association`, `Include`, `Extend`, `Generalization`, `CommunicationPath`, `Deployment`, `Manifestation`, `Dependency`), sino únicamente en `CommentLink`.
  - `[DECISIÓN PROYECTO]` Un `Comment` no actúa como contenedor (`parentId`) de otros elementos.
- **Escenario de prueba (PA-CMN-01):** Insertar un `Comment` en un diagrama `use-case` y otro en `deployment`, editar su propiedad `body`, verificar el símbolo de hoja con esquina doblada y enlazarlo mediante `CommentLink` a un elemento o a una relación UML del diagrama.

### 4.2 Relación Común y Contrato de Referencias de `CommentLink`

#### CMN-REL-01: Enlace de Comentario (`CommentLink`)
- **Concepto UML:** Asociación de metamodelo `Comment::annotatedElement : Element[*]` que vincula un `Comment` con el `Element` anotado (en `§7.2.2`, tanto las figuras del lienzo como cualquier `Relationship` son subtipos de `Element`).
- **Diagramas:** `use-case` y `deployment` (`[DECISIÓN PROYECTO: DP-01]`).
- **Referencia OMG UML 2.5.1:** Cláusula 7, `§7.2.2` (Fig. 7.2, pp. 21–22 `[PDF 61–62]`), `§7.2.4` (Notation, pp. 23–24 `[PDF 63–64]`), `§7.8.2` (pp. 40–41 `[PDF 80–81]`).
- **Contrato de referencias e invariantes de `CommentLink` (`[NORMATIVO + DECISIÓN PROYECTO]`):**
  1. **Origen canónico (`sourceId`):** Debe referenciar obligatoriamente el `id` de un elemento de tipo `"Comment"` existente en `model.elements`. *(Si en la interfaz futura el usuario traza desde un elemento/relación hacia un `Comment`, el controlador normaliza la dirección para que `sourceId` sea siempre el `Comment` y `targetId` el objetivo anotado, salvo que ambos sean `Comment`)*.
  2. **Destino polimórfico (`targetId` — Elemento o Relación UML):** A diferencia de las relaciones semánticas cuyos extremos deben ser siempre entradas de `model.elements`, en `CommentLink` el campo `targetId` (`targetId !== sourceId`) puede referenciar:
     - el `id` de cualquier elemento existente en `model.elements`, **o bien**
     - el `id` de cualquier relación UML semántica existente en `model.relationships` (`Association`, `Include`, `Extend`, `Generalization`, `CommunicationPath`, `Deployment`, `Manifestation`, `Dependency`), lo que permite adjuntar notas explicativas o restricciones a conectores (p. ej. documentar una relación `Extend` o `Deployment`).
  3. **Prohibición de enlaces sobre enlaces (`[DECISIÓN PROYECTO]`):** `targetId` **no** puede apuntar a otro `CommentLink` (evitando cadenas recursivas de anclaje geométrico entre líneas de nota).
  4. **Invariante de eliminación en cascada:** Al eliminar un elemento de `model.elements` o una relación de `model.relationships`, cualquier `CommentLink` cuyo `sourceId` o `targetId` apunte al ID eliminado se elimina atómicamente en la misma operación para mantener cero referencias huérfanas.
  5. **Cálculo de anclaje visual:** Cuando `targetId` es un elemento de `model.elements`, la línea discontinua une los perímetros de ambas cajas; cuando `targetId` es una relación de `model.relationships`, la línea discontinua une el perímetro del `Comment` con el punto medio de la polilínea de la relación anotada.
- **Notación gráfica:**
  - Línea discontinua (dashed) sin punta de flecha ni estereotipo que une la nota (`Comment`) con el elemento o relación anotada `[NORMATIVO: §7.2.4, p. 23 [PDF 63]]`.

---

## 5. Catálogo del Diagrama de Casos de Uso (`use-case`)

### 5.1 Elementos de Casos de Uso

#### UC-EL-01: Actor (`Actor`)
- **Concepto UML:** `Actor` (especialización de `BehavioredClassifier`). Especifica un rol desempeñado por un usuario humano, hardware externo u otro sujeto que interactúa con el sujeto modelado.
- **Referencia OMG UML 2.5.1:** Cláusula 18, `§18.1.2` (Abstract Syntax, Fig. 18.1, pp. 639–640 `[PDF 679–680]`), `§18.1.3` (Semantics, pp. 640–641 `[PDF 680–681]`), `§18.1.4` (Notation, Fig. 18.8, pp. 641–643 `[PDF 681–683]`), `§18.2.1` (Classifier Descriptions: `Actor [from UseCases]`, pp. 644–645 `[PDF 684–685]`).
- **Propiedades del modelo:**
  - `id` (string, único, obligatorio) `[DECISIÓN PROYECTO]`
  - `type`: `"Actor"` `[DECISIÓN PROYECTO]`
  - `name` (string no vacío, nombre del rol) `[NORMATIVO: §18.2.1 Constraint must_have_name [2]: name->notEmpty(), p. 645 [PDF 685]]`
  - `isAbstract` (boolean, por defecto `false`; si es `true`, el nombre se dibuja en cursiva) `[NORMATIVO: §9.2.4, p. 93 [PDF 133]]`
  - `notationVariant`: `"stickman"` (por defecto) | `"rectangle"` (rectángulo de clasificador con la palabra clave `«actor»`) `[NORMATIVO: §18.1.4, Fig. 18.8, p. 642 [PDF 682]]`
  - `parentId`: siempre `null` `[NORMATIVO: §18.1.3]`
- **Notación gráfica:**
  - Variante por defecto: icono «stick man» con el nombre debajo de la figura.
  - Variante alternativa normativa: rectángulo con la palabra clave `«actor»` sobre el nombre.
- **Contención permitida:**
  - `[NORMATIVO: §18.1.3, p. 640 [PDF 680]]` Los actores modelan entidades que están **fuera** del sujeto («Actors model entities that are outside the subject»). **Prohibido** asignar un `SystemBoundary` (ni ningún otro elemento del diagrama) como `parentId` de un `Actor`.
  - `[NORMATIVO: §18.1.2]` Un `Actor` no posee elementos hijos en el diagrama de casos de uso.
- **Relaciones permitidas y clasificación de restricciones:**
  - `[NORMATIVO: §18.2.1 Constraint associations [1], p. 645 [PDF 685]]` En UML 2.5.1, un `Actor` solo puede tener asociaciones hacia `UseCases`, `Components` y `Classes`, y dichas asociaciones deben ser binarias (`Association` entre `Actor` y `Actor` está prohibida normativamente por `associations [1]`).
  - `[DECISIÓN PROYECTO]` Dado que este editor en modo `use-case` no incluye clases ni componentes independientes en el lienzo, un `Actor` puede asociarse mediante `Association` **exclusivamente con `UseCase`**.
  - `[NORMATIVO: §9.2.3, §9.9.2 Constraint specialize_type [2], §18.1.3, p. 641 [PDF 681]]` Un `Actor` solo puede generalizar a otro `Actor` (`Actor → Actor`, sin ciclos).
  - `[NORMATIVO: §18.2.2, §18.2.4, pp. 645–647 [PDF 685–687]]` Un `Actor` **no** puede ser origen ni destino de `Include` ni de `Extend`.
- **Escenario de prueba (PA-UC-01):** Insertar un `Actor`, verificar su nombre no vacío por defecto y su renderizado como stickman; alternar `notationVariant` a `"rectangle"` y verificar la etiqueta `«actor»`. Intentar anidar el `Actor` dentro de un `SystemBoundary` o asociar dos `Actor` entre sí mediante `Association` y comprobar que el validador rechaza ambas operaciones como errores estructurales.

#### UC-EL-02: Caso de Uso (`UseCase`)
- **Concepto UML:** `UseCase` (especialización de `BehavioredClassifier`). Especifica un conjunto de acciones realizadas por su(s) sujeto(s) que produce un resultado observable y de valor para uno o más actores u otros interesados.
- **Referencia OMG UML 2.5.1:** Cláusula 18, `§18.1.2` (Fig. 18.1, pp. 639–640 `[PDF 679–680]`), `§18.1.3` (pp. 640–641 `[PDF 680–681]`), `§18.1.4` (Fig. 18.6–18.7, pp. 641–643 `[PDF 681–683]`), `§18.2.5` (Classifier Descriptions: `UseCase [from UseCases]`, pp. 647–649 `[PDF 687–689]`).
- **Propiedades del modelo:**
  - `id` (string, único, obligatorio)
  - `type`: `"UseCase"`
  - `name` (string no vacío) `[NORMATIVO: §18.2.5 Constraint must_have_name [4]: name -> notEmpty(), p. 649 [PDF 689]]`
  - `isAbstract` (boolean, por defecto `false`) `[NORMATIVO: §9.2.4]`
  - `parentId` (string | `null`): ID del `SystemBoundary` al que pertenece en el diagrama `[DECISIÓN PROYECTO — véase distinción de multiplicidad de sujeto abajo]`
  - `extensionPoints`: arreglo de `{ id, name }` donde cada `name` es no vacío `[NORMATIVO: §18.1.2, §18.2.3 Constraint must_have_name [1], p. 646 [PDF 686]]`
  - `showExtensionPoints` (boolean, por defecto `true` cuando `extensionPoints.length > 0`) `[DECISIÓN PROYECTO]`
- **Notación gráfica:**
  - Elipse que contiene el nombre del caso de uso centrado (en cursiva si `isAbstract: true`) `[NORMATIVO: §18.1.4, Fig. 18.6, p. 642 [PDF 682]]`.
  - Si tiene puntos de extensión visibles, la elipse se divide mediante una línea horizontal e incluye el compartimento inferior `extension points` con la lista de puntos de extensión `[NORMATIVO: §18.1.4, Fig. 18.7, p. 642 [PDF 682]]`.
  - *(Nota sobre variante no incluida)*: UML 2.5.1 (`§18.1.4`, p. 642 `[PDF 682]`) permite también representar un `UseCase` como rectángulo de clasificador con un icono de elipse en la esquina superior derecha; en este proyecto se adopta la **elipse** (con o sin compartimento de `extension points`) como única notación gráfica de `UseCase` `[DECISIÓN PROYECTO]`.
- **Clasificación rigurosa de reglas de contención y multiplicidad de sujetos:**
  - **Multiplicidad de `subject` en UML vs. en el editor:**
    - `[NORMATIVO: §18.1.2, Fig. 18.1, p. 639 [PDF 679]; §18.2.5, p. 648 [PDF 688]]` En el metamodelo de OMG UML 2.5.1, la asociación `UseCase::subject : Classifier[*]` tiene multiplicidad `0..*` (un caso de uso puede aplicarse a cero, uno o múltiples sujetos).
    - `[DECISIÓN PROYECTO]` En el modelo del editor, la pertenencia gráfica y semántica al límite del sistema se representa mediante `parentId: string | null`, por lo que cada `UseCase` se asocia como máximo a `0..1` `SystemBoundary` (`parentId: null` fuera de límite o `parentId: "<id-system-boundary>"`). Esta acotación `0..1` es una **simplificación del editor** y no una restricción del estándar UML.
  - **Prohibición de anidar casos de uso dentro de casos de uso:**
    - `[NORMATIVO: §18.1.2, §18.1.4]` Un `UseCase` solo posee `extensionPoint : ExtensionPoint[*]`, `include : Include[*]` y `extend : Extend[*]`; no es contenedor gráfico de otros `UseCase` ni `Actor`.
    - `[DECISIÓN PROYECTO]` El validador rechaza asignar un `UseCase` como `parentId` de cualquier elemento.
- **Relaciones permitidas:**
  - `Association` con `Actor` (véase clasificación detallada en `UC-REL-01`).
  - Origen y destino de `Include` con otro `UseCase` distinto y sin ciclos (`[NORMATIVO: §18.2.5 Constraint cannot_include_self [3], p. 649 [PDF 689]]`).
  - Origen y destino de `Extend` con otro `UseCase` distinto (`[NORMATIVO: §18.2.2]`).
  - Origen y destino de `Generalization` con otro `UseCase` distinto y sin ciclos (`[NORMATIVO: §9.9.4.8 Constraint no_cycles_in_generalization [3], p. 135 [PDF 175]]`).
  - Destino de `CommentLink` desde un `Comment` (`[DP-01]`).
- **Escenario de prueba (PA-UC-02):** Crear un `UseCase` `"Procesar Pago"`, añadirle el punto de extensión `"Pago Rechazado"` y verificar que la elipse muestra la línea divisoria y el compartimento `extension points` con `"Pago Rechazado"`. Intentar guardar el nombre vacío en el `UseCase` o en su `ExtensionPoint` y comprobar que el validador impide confirmar un nombre vacío (`must_have_name`).

#### UC-EL-03: Límite del Sistema / Sujeto (`SystemBoundary`)
- **Concepto UML:** `Classifier` que actúa como `subject` de un conjunto de `UseCases` (`UseCase::subject : Classifier[*]`), delimitando la frontera entre el sistema bajo estudio y los actores externos.
- **Referencia OMG UML 2.5.1:** Cláusula 18, `§18.1.2` (pp. 639–640 `[PDF 679–680]`), `§18.1.3` (p. 640 `[PDF 680]`), `§18.1.4` (Notation: Subject rectangle, Fig. 18.9, pp. 642–643 `[PDF 682–683]`).
- **Propiedades del modelo:**
  - `id` (string, único, obligatorio)
  - `type`: `"SystemBoundary"`
  - `name` (string, nombre del sistema o subsistema) `[NORMATIVO: §18.1.4, p. 642 [PDF 682]]`
  - `stereotype` (string opcional, p. ej. `«subsystem»` o vacío) `[RECOMENDADO]`
  - `parentId`: siempre `null` `[DECISIÓN PROYECTO: DP-02]`
- **Notación gráfica:**
  - Rectángulo contenedor redimensionable con el nombre del sujeto en la esquina/franja superior interna y los `UseCases` asignados dibujados en su interior `[NORMATIVO: §18.1.4, Fig. 18.9, p. 643 [PDF 683]]`.
- **Clasificación rigurosa de reglas de contención y multiplicidad de límites (`DP-02`):**
  - `[NORMATIVO: §18.1.2, §18.1.4]` Un diagrama puede mostrar uno o varios sujetos (`SystemBoundary`) y cada sujeto puede agrupar múltiples `UseCase`.
  - `[NORMATIVO: §18.1.3, p. 640 [PDF 680]]` **Prohibido** contener `Actor` dentro de un `SystemBoundary`.
  - `[DECISIÓN PROYECTO: DP-02]` Se permite crear **múltiples `SystemBoundary` independientes** en un mismo diagrama de casos de uso (`parentId: null`), pero **se prohíbe anidar un `SystemBoundary` dentro de otro `SystemBoundary`**. *(En UML general un `Component` o `Package` podría anidar sub-clasificadores, pero en este editor se acota a límites de sistema de un solo nivel conforme a `DP-02`)*.
- **Relaciones permitidas:**
  - `[DECISIÓN PROYECTO]` En el editor de casos de uso, `SystemBoundary` actúa como contenedor semántico de `UseCase` (y puede recibir `CommentLink` desde un `Comment`), sin recibir conectores `Association`, `Include`, `Extend` ni `Generalization`.
- **Escenario de prueba (PA-UC-03):** Crear dos `SystemBoundary` independientes (`"Módulo de Ventas"` y `"Pasarela Bancaria"`) en el mismo diagrama (válido según `DP-02`), asignar un `UseCase` a cada uno mediante contención explícita y verificar su `parentId`. Intentar anidar `"Pasarela Bancaria"` dentro de `"Módulo de Ventas"` y comprobar que se rechaza según `DP-02`. Verificar también que superponer visualmente un `UseCase` sin asignarlo no altera su `parentId` (`GEMINI.md` §4).

---

### 5.2 Relaciones de Casos de Uso

#### UC-REL-01: Asociación / Comunicación (`Association`)
- **Concepto UML:** `Association` binaria que vincula un `Actor` con un `UseCase` en cuya ejecución participa dicho actor.
- **Referencia OMG UML 2.5.1:** Cláusula 11, `§11.5` (pp. 197–207 `[PDF 237–247]`), `§11.8.1` (pp. 213–216 `[PDF 253–256]`) y Cláusula 18, `§18.1.2` (p. 639 `[PDF 679]`), `§18.1.4` (pp. 642–643 `[PDF 682–683]`), `§18.2.1` Constraint `associations [1]` (p. 645 `[PDF 685]`), `§18.2.5` Constraints `binary_associations [1]` y `no_association_to_use_case [2]` (pp. 648–649 `[PDF 688–689]`).
- **Propiedades del modelo:**
  - `id`, `type`: `"Association"`, `sourceId`, `targetId`
  - `name` (string opcional)
  - `sourceMultiplicity`, `targetMultiplicity` (strings opcionales, p. ej. `"1"`, `"0..1"`, `"*"`, `"1..*"`) `[NORMATIVO: §18.1.4, Fig. 18.9, p. 643 [PDF 683]]`
  - `sourceRole`, `targetRole` (strings opcionales) `[NORMATIVO: §11.5.4]`
- **Notación gráfica:**
  - Línea continua sólida entre el `Actor` y el `UseCase`, sin punta de flecha `[NORMATIVO: §18.1.4, Fig. 18.9, p. 643 [PDF 683]]`, con multiplicidades y roles opcionales cerca de los extremos correspondientes.
- **Clasificación rigurosa de restricciones (Estándar vs. Editor):**
  - `[NORMATIVO: §18.2.5 Constraint binary_associations [1], p. 648 [PDF 688]]` Los `UseCases` solo pueden participar en asociaciones binarias.
  - `[NORMATIVO: §18.2.1 Constraint associations [1], p. 645 [PDF 685]]` Un `Actor` solo puede asociarse con `UseCases`, `Components` y `Classes` (lo cual **prohíbe normativamente** la asociación `Actor ↔ Actor`).
  - `[NORMATIVO: §18.2.5 Constraint no_association_to_use_case [2], p. 649 [PDF 689]]` El estándar UML establece: *«UseCases can not have Associations to UseCases specifying the same subject»* (`self.subject->intersection(uc.subject)->isEmpty()`). Es decir, **OMG UML 2.5.1 prohíbe asociaciones entre dos `UseCase` que compartan el mismo sujeto**, pero no prohíbe en abstracto asociaciones entre `UseCases` pertenecientes a sujetos distintos (ni cuando ambos carecen de sujeto común).
  - `[DECISIÓN PROYECTO]` En nuestro editor de casos de uso, la herramienta `Association` se restringe deliberadamente a conectar **exclusivamente `Actor ↔ UseCase`** (en cualquier sentido `Actor → UseCase` o `UseCase → Actor`), rechazando toda `Association` entre dos `UseCase` incluso si están en distintos `SystemBoundary` o en la raíz. Esta restricción más estricta simplifica el modelado académico y evita confundir `Association` con `Include` o `Extend`.
- **Escenario de prueba (PA-UC-04):** Conectar un `Actor` con un `UseCase` mediante `Association` (válido). Intentar conectar dos `UseCase` del mismo sujeto (violación `[NORMATIVO]`) o de distinto sujeto (violación `[DECISIÓN PROYECTO]`) o dos `Actor` (violación `[NORMATIVO]`) y comprobar que el validador rechaza la operación sin modificar el modelo.

#### UC-REL-02: Inclusión (`Include`)
- **Concepto UML:** `Include` (especialización de `DirectedRelationship` y `NamedElement`). Especifica que un caso de uso base (`includingCase`) incorpora obligatoriamente el comportamiento de otro caso de uso (`addition`).
- **Referencia OMG UML 2.5.1:** Cláusula 18, `§18.1.2` (Fig. 18.1, p. 639 `[PDF 679]`), `§18.1.3` (p. 641 `[PDF 681]`), `§18.1.4` (Fig. 18.5, p. 642 `[PDF 682]`), `§18.2.4` (Classifier Descriptions: `Include [from UseCases]`, p. 647 `[PDF 687]`), `§18.2.5` Constraint `cannot_include_self [3]` (p. 649 `[PDF 689]`).
- **Propiedades del modelo:**
  - `id`, `type`: `"Include"`, `sourceId` (`includingCase`: caso de uso base), `targetId` (`addition`: caso de uso incluido).
- **Notación gráfica:**
  - Línea discontinua (dashed) con punta de flecha abierta dirigida desde el **caso de uso base (`sourceId`)** hacia el **caso de uso incluido (`targetId`)**, etiquetada con la palabra clave `«include»` `[NORMATIVO: §18.1.4, Fig. 18.5, p. 642 [PDF 682]]`.
- **Restricciones:**
  - `[NORMATIVO: §18.1.2, §18.2.4, p. 647 [PDF 687]]` Tanto `sourceId` (`includingCase`) como `targetId` (`addition`) deben ser instancias de `UseCase`.
  - `[NORMATIVO: §18.2.5 Constraint cannot_include_self [3], p. 649 [PDF 689]]` Un `UseCase` no puede incluir casos de uso que directa o indirectamente lo incluyan a él (`not self.allIncludedUseCases()->includes(self)`). Esto prohíbe la auto-inclusión (`sourceId === targetId`) y cualquier ciclo dirigido de relaciones `Include`.
- **Escenario de prueba (PA-UC-05):** Crear `Include` desde `"Retirar Efectivo"` (`sourceId`) hacia `"Autenticar Cliente"` (`targetId`). Verificar flecha discontinua con `«include»` apuntando a `"Autenticar Cliente"`. Intentar crear un `Include` de `"Autenticar Cliente"` hacia `"Retirar Efectivo"` y verificar rechazo por ciclo (`cannot_include_self [3]`).

#### UC-REL-03: Extensión (`Extend`)
- **Concepto UML:** `Extend` (especialización de `DirectedRelationship` y `NamedElement`). Especifica cómo y cuándo el comportamiento definido en un caso de uso extensor (`extension`) puede insertarse en el comportamiento de un caso de uso extendido (`extendedCase`) en uno o más puntos de extensión (`extensionLocation : ExtensionPoint[1..*]`).
- **Referencia OMG UML 2.5.1:** Cláusula 18, `§18.1.2` (Fig. 18.1, p. 639 `[PDF 679]`), `§18.1.3` (p. 641 `[PDF 681]`), `§18.1.4` (Fig. 18.2–18.4, pp. 641–642 `[PDF 681–682]`), `§18.2.2` (Classifier Descriptions: `Extend [from UseCases]`, pp. 645–646 `[PDF 685–686]`).
- **Propiedades del modelo:**
  - `id`, `type`: `"Extend"`
  - `sourceId` (`extension : UseCase[1]`: caso de uso extensor) `[NORMATIVO: §18.2.2]`
  - `targetId` (`extendedCase : UseCase[1]`: caso de uso base extendido) `[NORMATIVO: §18.2.2]`
  - `extensionLocation` (string obligatorio al confirmar: ID de un `ExtensionPoint` válido perteneciente a `targetId`) `[NORMATIVO: §18.1.2 extensionLocation : ExtensionPoint[1..*], §18.2.2 Constraint extension_points [1], p. 646 [PDF 686]]`
  - `condition` (string opcional: expresión textual de la condición bajo la cual toma lugar la extensión) `[NORMATIVO: §18.1.2 condition : Constraint[0..1], §18.1.4, pp. 641–642 [PDF 681–682]]`
- **Notación gráfica:**
  - Línea discontinua (dashed) con punta de flecha abierta dirigida desde el **caso de uso extensor (`sourceId`)** hacia el **caso de uso extendido/base (`targetId`)**, etiquetada con la palabra clave `«extend»` `[NORMATIVO: §18.1.4, Fig. 18.3, p. 641 [PDF 681]]`.
  - Cuando existe `extensionLocation` y/o `condition`, se muestra la anotación asociada (`Condition: { ... }` y `Extension point: <nombre>`) junto a la relación `[NORMATIVO: §18.1.4, Fig. 18.2 y 18.4, pp. 641–642 [PDF 681–682]]`.
- **Clasificación rigurosa de restricciones y flujo de confirmación atómica (`DP-03`):**
  - `[NORMATIVO: §18.1.2, §18.2.2, pp. 645–646 [PDF 685–686]]` `sourceId` y `targetId` deben ser `UseCase`; además, `extensionLocation` tiene multiplicidad obligatoria `[1..*]` en el metamodelo y debe cumplir la restricción `extension_points [1]` (*«The ExtensionPoints referenced by the Extend relationship must belong to the UseCase that is being extended»*: `extensionLocation->forAll(xp | extendedCase.extensionPoint->includes(xp))`).
  - `[DECISIÓN PROYECTO]` Se prohíbe auto-extensión (`sourceId === targetId`) y ciclos directos/indirectos de extensión sobre el mismo par.
  - `[DECISIÓN PROYECTO: DP-03]` **Flujo interactivo y confirmación atómica:** Al trazar una relación `Extend` en el lienzo, el gestor de interacciones permite una **previsualización visual provisional** del conector mientras el usuario selecciona el destino; al soltar sobre el `UseCase` destino (`targetId`), se solicita seleccionar un `ExtensionPoint` existente en `targetId` o crear uno nuevo con nombre no vacío en ese mismo paso. **La operación solo se confirma atómicamente en `DiagramModel` y `CommandHistory` después de asignar o crear dicho `ExtensionPoint` válido** (si se crea un nuevo `ExtensionPoint`, la adición del punto en `targetId` y la creación de la relación `Extend` forman un único comando atómico deshacible; si el usuario cancela con `Esc` o cierra el diálogo sin confirmar, la previsualización desaparece y el modelo no sufre ninguna mutación).
- **Escenario de prueba (PA-UC-06):** Iniciar la creación de `Extend` desde `"Emitir Comprobante Impreso"` hacia `"Procesar Pago"`, verificar la previsualización provisional, cancelar con `Esc` y comprobar que el modelo permanece intacto. Repetir el trazo y confirmar creando el `ExtensionPoint` `"Pago Finalizado"`: verificar que en una sola operación atómica se agrega `"Pago Finalizado"` a `"Procesar Pago"` y se crea la relación `Extend` con flecha hacia `"Procesar Pago"`.

#### UC-REL-04: Generalización (`Generalization`)
- **Concepto UML:** `Generalization` (relación taxonómica dirigida entre un `Classifier` específico y un `Classifier` más general).
- **Referencia OMG UML 2.5.1:** Cláusula 9, `§9.2.2`–`§9.2.4` (Fig. 9.1–9.2, pp. 89–96 `[PDF 129–136]`), `§9.9.2` (`Classifier`, Constraint `specialize_type [2]`) y `§9.9.4.8` (`no_cycles_in_generalization [3]`, p. 135 `[PDF 175]`), `§9.9.7` (`Generalization`, pp. 138–139 `[PDF 178–179]`) y Cláusula 18, `§18.1.3` (p. 641 `[PDF 681]`), `§18.1.5` (Fig. 18.10, p. 644 `[PDF 684]`).
- **Propiedades del modelo:**
  - `id`, `type`: `"Generalization"`, `sourceId` (`specific`: subtipo/hijo), `targetId` (`general`: supertipo/padre).
- **Notación gráfica:**
  - Línea continua sólida con punta de **triángulo cerrado hueco (vacío)** apuntando al clasificador general (`targetId`) `[NORMATIVO: §9.2.4, Fig. 9.2, p. 94 [PDF 134]]`.
- **Restricciones normativas:**
  - `[NORMATIVO: §9.9.2 Constraint specialize_type [2], p. 135 [PDF 175]]` Un `Classifier` solo puede especializar clasificadores de tipo compatible: en el diagrama de casos de uso únicamente se permite `Actor → Actor` o `UseCase → UseCase`. **Prohibido** `Actor → UseCase` o `UseCase → Actor`.
  - `[NORMATIVO: §9.9.4.8 Constraint no_cycles_in_generalization [3], p. 135 [PDF 175]]` La generalización es transitiva y antirreversible; están prohibidos la auto-generalización (`A → A`) y los ciclos (`not self.allParents()->includes(self)`).
- **Escenario de prueba (PA-UC-07):** Conectar `Actor("Cliente VIP")` con `Actor("Cliente")` mediante `Generalization` (válido, punta triangular hueca en `"Cliente"`). Intentar conectar `Actor("Cliente")` con `UseCase("Comprar")` mediante `Generalization` y verificar rechazo por `specialize_type [2]`.

---

## 6. Catálogo del Diagrama de Despliegue (`deployment`)

### 6.1 Simplificación transversal para instancias de despliegue (`DP-04`)

En **OMG UML 2.5.1** (`§9.8.4`, pp. 126–128 `[PDF 166–168]`; `§9.9.9 InstanceSpecification`, pp. 140–141 `[PDF 180–181]`; `§19.2.4`, p. 652 `[PDF 692]`; `§19.4.4`, p. 656 `[PDF 696]`), los diagramas de despliegue pueden mostrarse a **nivel de tipo/clasificador** (p. ej. `AppServer`) o a **nivel de instancia** (p. ej. `<u>srv01 : AppServer</u>`).

Conforme a la decisión aprobada **`DP-04`**:
- No se duplican herramientas en la paleta para instancias de nodos o artefactos ni se expone `InstanceSpecification` como metaclase separada.
- Los elementos `Node`, `Device`, `ExecutionEnvironment` y `Artifact` incorporan las propiedades opcionales:
  - `isInstance` (boolean, por defecto `false`) `[DECISIÓN PROYECTO: DP-04]`
  - `classifierName` (string opcional, p. ej. `"AppServer"`) `[DECISIÓN PROYECTO: DP-04]`
- Cuando `isInstance === true`, el renderizador Canvas formatea el encabezado como `<name> : <classifierName>` (o `<name>` si `classifierName` está vacío) y lo dibuja **subrayado**, cumpliendo la notación normativa de `§9.8.4` y `§19.4.4`.

---

### 6.2 Elementos de Despliegue

#### DEP-EL-01: Nodo (`Node`)
- **Concepto UML:** `Node` (especialización de `Class` y `DeploymentTarget`). Representa un recurso computacional sobre el cual se pueden desplegar artefactos para su ejecución.
- **Referencia OMG UML 2.5.1:** Cláusula 19, `§19.1` (p. 651 `[PDF 691]`), `§19.4.2` (Abstract Syntax, Fig. 19.8, p. 655 `[PDF 695]`), `§19.4.3` (Semantics, pp. 655–656 `[PDF 695–696]`), `§19.4.4` (Notation, Fig. 19.9, p. 656 `[PDF 696]`), `§19.5.10` (Classifier Descriptions: `Node [from Deployments]`, pp. 662–663 `[PDF 702–703]`).
- **Propiedades del modelo:**
  - `id`, `type`: `"Node"`, `name` (string)
  - `isInstance` (boolean, por defecto `false`) y `classifierName` (string opcional) `[DECISIÓN PROYECTO: DP-04; Notación: §19.4.4, p. 656 [PDF 696]]`
  - `stereotype` (string opcional, p. ej. `«node»` o personalizado)
  - `parentId` (string | `null`: ID de otro `Node` o `Device` padre si está anidado) `[NORMATIVO: §19.4.2 nestedNode : Node[*], p. 655 [PDF 695]]`
- **Notación gráfica:**
  - Cubo tridimensional (caja en perspectiva 3D) con el nombre en su parte superior frontal (subrayado `nombre : Tipo` si `isInstance: true`) `[NORMATIVO: §19.4.4, Fig. 19.9, p. 656 [PDF 696]]`.
- **Contención permitida (`parentId`):**
  - `[NORMATIVO: §19.4.2, §19.5.10 Constraint internal_structure [1], p. 663 [PDF 703]]` Puede contener semánticamente otros `Node`, `Device` y `ExecutionEnvironment` (`nestedNode : Node[*]`).
  - `[NORMATIVO: §19.2.2, §19.2.4, pp. 651–653 [PDF 691–693]]` Puede contener `Artifact` y `DeploymentSpecification` desplegados en él.
- **Escenario de prueba (PA-DEP-01):** Crear un `Node` con `name: "nodo-01"`, activar `isInstance: true` y `classifierName: "ClusterNode"`, y verificar que el cubo 3D muestra `nodo-01 : ClusterNode` subrayado (`DP-04`).

#### DEP-EL-02: Dispositivo (`Device`)
- **Concepto UML:** `Device` (especialización de `Node`). Representa un recurso computacional físico con capacidad de procesamiento (servidor físico, estación de trabajo, router, dispositivo móvil).
- **Referencia OMG UML 2.5.1:** Cláusula 19, `§19.4.2` (Fig. 19.8, p. 655 `[PDF 695]`), `§19.4.3` (pp. 655–656 `[PDF 695–696]`), `§19.4.4` (Notation, Fig. 19.10, p. 656 `[PDF 696]`), `§19.5.7` (Classifier Descriptions: `Device [from Deployments]`, p. 661 `[PDF 701]`).
- **Propiedades del modelo:**
  - `id`, `type`: `"Device"`, `name` (string), `isInstance` (boolean), `classifierName` (string opcional) `[DP-04]`, `parentId` (string | `null`).
- **Notación gráfica:**
  - Cubo tridimensional (`Node`) etiquetado con la palabra clave `«device»` sobre el nombre `[NORMATIVO: §19.4.4, Fig. 19.10, p. 656 [PDF 696]]`.
- **Contención permitida:**
  - `[NORMATIVO: §19.4.2, §19.4.4]` Puede estar en la raíz o anidado dentro de un `Node` o de otro `Device` (`nestedNode`). Puede contener otros `Device`, `Node`, `ExecutionEnvironment`, `Artifact` y `DeploymentSpecification`.
- **Escenario de prueba (PA-DEP-02):** Insertar un `Device("Servidor Principal")`, verificar el cubo 3D con `«device»` y anidar dentro de él un `Device("Tarjeta Aceleradora")` y un `ExecutionEnvironment("Ubuntu 24.04")`.

#### DEP-EL-03: Entorno de Ejecución (`ExecutionEnvironment`)
- **Concepto UML:** `ExecutionEnvironment` (especialización de `Node`). Representa un entorno de ejecución de software (sistema operativo, motor de contenedores, servidor de aplicaciones, SGBD) que ofrece servicios para alojar y ejecutar artefactos de software.
- **Referencia OMG UML 2.5.1:** Cláusula 19, `§19.4.2` (Fig. 19.8, p. 655 `[PDF 695]`), `§19.4.3` (pp. 655–656 `[PDF 695–696]`), `§19.4.4` (p. 656 `[PDF 696]`), `§19.5.8` (Classifier Descriptions: `ExecutionEnvironment [from Deployments]`, pp. 661–662 `[PDF 701–702]`).
- **Propiedades del modelo:**
  - `id`, `type`: `"ExecutionEnvironment"`, `name` (string), `isInstance` (boolean), `classifierName` (string opcional) `[DP-04]`, `parentId` (string | `null`).
- **Notación gráfica:**
  - Cubo tridimensional (`Node`) etiquetado con la palabra clave `«executionEnvironment»` sobre el nombre `[NORMATIVO: §19.4.4, p. 656 [PDF 696]]`.
- **Clasificación rigurosa de reglas de contención:**
  - `[NORMATIVO: §19.4.2, §19.4.3, pp. 655–656 [PDF 695–696]]` Puede anidarse dentro de un `Device`, `Node` u otro `ExecutionEnvironment` (`nestedNode`) o situarse en la raíz del diagrama. Puede alojar `ExecutionEnvironment`, `Artifact` y `DeploymentSpecification`.
  - `[DECISIÓN PROYECTO]` Aunque en la sintaxis abstracta de UML 2.5.1 `ExecutionEnvironment` hereda `Node::nestedNode : Node[*]`, su semántica normativa (`§19.4.3`, p. 656 `[PDF 696]`) establece que representa un entorno de software alojado normalmente dentro de un nodo o dispositivo físico. Por coherencia semántica, **en este editor se prohíbe anidar un `Device` (hardware físico) o un `Node` genérico dentro de un `ExecutionEnvironment`** (solo puede anidar otros `ExecutionEnvironment`, `Artifact` y `DeploymentSpecification`).
- **Escenario de prueba (PA-DEP-03):** Anidar un `ExecutionEnvironment("JVM 21")` dentro de un `ExecutionEnvironment("Contenedor Docker")` (válido). Intentar anidar un `Device("Servidor Rack")` dentro de `"JVM 21"` y comprobar que se rechaza.

#### DEP-EL-04: Artefacto (`Artifact`)
- **Concepto UML:** `Artifact` (especialización de `Classifier` y `DeployedArtifact`). Especifica una pieza física de información utilizada o producida por un proceso de desarrollo de software o por el despliegue y operación de un sistema.
- **Referencia OMG UML 2.5.1:** Cláusula 19, `§19.3.2` (Abstract Syntax, Fig. 19.4, pp. 653–654 `[PDF 693–694]`), `§19.3.3` (Semantics, p. 654 `[PDF 694]`), `§19.3.4` (Notation, Fig. 19.5–19.7, pp. 654–655 `[PDF 694–695]`), `§19.5.1` (Classifier Descriptions: `Artifact [from Deployments]`, pp. 657–658 `[PDF 697–698]`).
- **Propiedades del modelo:**
  - `id`, `type`: `"Artifact"`, `name` (string, p. ej. `"orders-service.jar"`)
  - `fileName` (string opcional) `[NORMATIVO: §19.5.1 fileName : String[0..1], p. 657 [PDF 697]]`
  - `isInstance` (boolean, por defecto `false`) y `classifierName` (string opcional) `[DECISIÓN PROYECTO: DP-04; Notación: §19.3.4, pp. 654–655 [PDF 694–695]]`
  - `manifestedElements`: arreglo opcional de `{ name: string, kind: "Component" | "Package" | "Class" | "Interface" | "Classifier" }` para registrar elementos del modelo (`PackageableElement`) manifestados por este artefacto que pertenecen a otros diagramas UML fuera de la paleta de despliegue `[DECISIÓN PROYECTO — véase DEP-REL-03]`
  - `parentId` (string | `null`: ID de un `Node`, `Device`, `ExecutionEnvironment` donde está desplegado por contención, o de otro `Artifact` compuesto) `[NORMATIVO: §19.2.4, p. 652 [PDF 692]; §19.3.2 nestedArtifact : Artifact[*], p. 653 [PDF 693]]`
- **Notación gráfica:**
  - Rectángulo de clasificador con la palabra clave `«artifact»` sobre el nombre y un icono de documento (hoja con esquina doblada) en la esquina superior derecha `[NORMATIVO: §19.3.4, Fig. 19.5, p. 654 [PDF 694]]`.
  - Si `manifestedElements` no está vacío, se muestra un compartimento textual opcional en el interior del `Artifact` con la lista `«manifest» <kind>: <name>` `[DECISIÓN PROYECTO]`.
- **Contención permitida:**
  - `[NORMATIVO: §19.2.4, §19.3.2]` Puede situarse en la raíz del diagrama, anidado dentro de `Node`/`Device`/`ExecutionEnvironment` (despliegue implícito por contención) o anidado dentro de otro `Artifact` (`nestedArtifact`). Puede contener otros `Artifact` (`nestedArtifact`) y `DeploymentSpecification`.
  - `[NORMATIVO: §19.3.2, §19.5.1]` Un `Artifact` **no** es un `DeploymentTarget` ni posee `nestedNode`; por tanto, está **prohibido** que contenga `Node`, `Device` o `ExecutionEnvironment`.
- **Escenario de prueba (PA-DEP-04):** Crear un `Artifact("billing.jar")`, anidar dentro de él un sub-artefacto `Artifact("billing-config.xml")` (`nestedArtifact`) y añadir en `manifestedElements` la entrada `{ name: "BillingComponent", kind: "Component" }`, verificando su representación gráfica.

#### DEP-EL-05: Especificación de Despliegue (`DeploymentSpecification`)
- **Concepto UML:** `DeploymentSpecification` (especialización de `Artifact`). Especifica un conjunto de propiedades que determinan los parámetros de ejecución de un `Artifact` desplegado en un `Node`.
- **Referencia OMG UML 2.5.1:** Cláusula 19, `§19.2.2` (Fig. 19.1, p. 651 `[PDF 691]`), `§19.2.3` (p. 652 `[PDF 692]`), `§19.2.4` (Notation, Fig. 19.2–19.3, pp. 652–653 `[PDF 692–693]`), `§19.5.5` (Classifier Descriptions: `DeploymentSpecification [from Deployments]`, pp. 659–660 `[PDF 699–700]`).
- **Propiedades del modelo:**
  - `id`, `type`: `"DeploymentSpecification"`, `name` (string)
  - `deploymentLocation` (string opcional) `[NORMATIVO: §19.5.5 deploymentLocation : String[0..1], p. 659 [PDF 699]]`
  - `executionLocation` (string opcional) `[NORMATIVO: §19.5.5 executionLocation : String[0..1], p. 659 [PDF 699]]`
  - `properties` (lista opcional de pares `{ name, value }`) `[NORMATIVO: §19.2.4, Fig. 19.2–19.3, pp. 652–653 [PDF 692–693]]`
  - `parentId` (string | `null`: puede anidarse dentro de un `Node`/`Device`/`ExecutionEnvironment` o dentro de un `Artifact`) `[NORMATIVO: §19.2.4, p. 652 [PDF 692]]`
- **Notación gráfica:**
  - Rectángulo con la palabra clave `«deploymentSpec»` sobre el nombre y un compartimento inferior con los valores `deploymentLocation`, `executionLocation` y `properties` `[NORMATIVO: §19.2.4, Fig. 19.2–19.3, pp. 652–653 [PDF 692–693]]`.
- **Contención permitida:**
  - `[DECISIÓN PROYECTO]` Una `DeploymentSpecification` no actúa como contenedor padre (`parentId`) de otros nodos ni artefactos en el lienzo.
- **Escenario de prueba (PA-DEP-05):** Crear una `DeploymentSpecification("web-deploy.yaml")` con `executionLocation: "/opt/app"` y verificar el compartimento de propiedades bajo el encabezado `«deploymentSpec»`.

---

### 6.3 Relaciones de Despliegue

#### DEP-REL-01: Camino de Comunicación (`CommunicationPath`)
- **Concepto UML:** `CommunicationPath` (especialización de `Association`). Define un canal mediante el cual dos `DeploymentTargets` intercambian señales y mensajes.
- **Referencia OMG UML 2.5.1:** Cláusula 19, `§19.4.2` (Fig. 19.8, p. 655 `[PDF 695]`), `§19.4.3` (p. 656 `[PDF 696]`), `§19.4.4` (Fig. 19.11, p. 656 `[PDF 696]`), `§19.5.2` (Classifier Descriptions: `CommunicationPath [from Deployments]`, p. 658 `[PDF 698]`).
- **Propiedades del modelo:**
  - `id`, `type`: `"CommunicationPath"`, `sourceId`, `targetId`
  - `name` / `stereotype` (string opcional, p. ej. `«tcp/ip»`, `«https»`)
  - `sourceMultiplicity`, `targetMultiplicity` (strings opcionales)
- **Notación gráfica:**
  - Línea continua sólida sin puntas de flecha entre dos nodos (`Node`, `Device` o `ExecutionEnvironment`), con etiqueta y multiplicidades opcionales `[NORMATIVO: §19.4.4, Fig. 19.11, p. 656 [PDF 696]]`.
- **Restricciones normativas:**
  - `[NORMATIVO: §19.5.2 Constraint association_ends [1], p. 658 [PDF 698]]` Los extremos de un `CommunicationPath` solo pueden estar tipados por `DeploymentTargets` (`endType->forAll(oclIsKindOf(DeploymentTarget))`). En nuestro catálogo de despliegue, únicamente `Node`, `Device` y `ExecutionEnvironment` son `DeploymentTargets`; por tanto, está **prohibido normativamente** conectar un `Artifact`, una `DeploymentSpecification` o un `Comment` mediante `CommunicationPath`.

#### DEP-REL-02: Relación de Despliegue (`Deployment`)
- **Concepto UML:** `Deployment` (especialización de `Dependency`). Es la asignación de uno o más artefactos (`DeployedArtifact`) a un destino de despliegue (`DeploymentTarget`).
- **Referencia OMG UML 2.5.1:** Cláusula 19, `§19.2.2` (Fig. 19.1, p. 651 `[PDF 691]`), `§19.2.3` (p. 652 `[PDF 692]`), `§19.2.4` (Notation, Fig. 19.2, p. 652 `[PDF 692]`), `§19.5.4` (Classifier Descriptions: `Deployment [from Deployments]`, p. 659 `[PDF 699]`).
- **Propiedades del modelo:**
  - `id`, `type`: `"Deployment"`
  - `sourceId` (`deployedArtifact`: `Artifact` o `DeploymentSpecification`)
  - `targetId` (`location`: `Node`, `Device` o `ExecutionEnvironment`)
- **Notación gráfica:**
  - Línea discontinua (dashed) con punta de flecha abierta dirigida desde el **artefacto desplegado (`sourceId`)** hacia el **nodo destino (`targetId`)**, etiquetada con la palabra clave `«deploy»` `[NORMATIVO: §19.2.4, Fig. 19.2, p. 652 [PDF 692]]`.
  - *(Nota sobre doble representación)*: OMG UML 2.5.1 (`§19.2.4`, pp. 652–653 `[PDF 692–693]`) permite expresar el despliegue tanto por **contención gráfica** (`parentId`) dentro del nodo como mediante la **flecha explícita `«deploy»`**. `[DECISIÓN PROYECTO]` El editor soporta ambas variantes, pero rechaza crear una flecha `«deploy»` redundante entre un artefacto y el mismo nodo que ya es su contenedor directo (`parentId === targetId`).
- **Restricciones normativas:**
  - `[NORMATIVO: §19.2.2, §19.5.4, p. 659 [PDF 699]]` El origen (`sourceId`) debe ser un `DeployedArtifact` (`Artifact` o `DeploymentSpecification`) y el destino (`targetId`) debe ser un `DeploymentTarget` (`Node`, `Device` o `ExecutionEnvironment`).

#### DEP-REL-03: Manifestación (`Manifestation`) — Alcance acotado y tratamiento de destinos externos
- **Concepto UML:** `Manifestation` (especialización de `Abstraction` → `Dependency`). Es la realización física concreta de uno o más elementos empaquetables del modelo (`utilizedElement : PackageableElement[1]`) por un `Artifact`.
- **Referencia OMG UML 2.5.1:** Cláusula 19, `§19.3.2` (Fig. 19.4, pp. 653–654 `[PDF 693–694]`), `§19.3.3` (p. 654 `[PDF 694]`), `§19.3.4` (Notation, pp. 654–655 `[PDF 694–695]`), `§19.5.9` (Classifier Descriptions: `Manifestation [from Deployments]`, p. 662 `[PDF 702]`).
- **Análisis normativo y restricción de alcance del proyecto:**
  - En OMG UML 2.5.1 (`§19.3.2`, `§19.5.9`), el origen (`client` / `source`) de una `Manifestation` es un `Artifact` y su destino (`supplier` / `utilizedElement`) es cualquier `PackageableElement` (típicamente un `Component`, `Class`, `Package` o también otro `Artifact`, dado que `Artifact → Classifier → RedefinableElement / PackageableElement`).
  - Por restricción no negociable del proyecto (`GEMINI.md` §2), **está prohibido incorporar un editor de componentes, paquetes o clases** en la paleta. Por ello, **no se declara soporte gráfico completo de todos los `PackageableElement` de UML**, sino una solución híbrida acotada dentro del editor de despliegue:
    1. **Conector gráfico `Manifestation` (`«manifest»`) en el lienzo (`[NORMATIVO + DECISIÓN PROYECTO]`):** Permite conectar como origen (`sourceId`) un `Artifact` o `DeploymentSpecification` hacia otro `Artifact` o `DeploymentSpecification` presente en el lienzo (`targetId`, con `sourceId !== targetId`), ya que `Artifact` es un `PackageableElement` legítimo en el diagrama de despliegue. **Se prohíbe** usar `Manifestation` hacia un `Node`, `Device` o `ExecutionEnvironment` en el editor de despliegue (para asignar un artefacto a un nodo la relación normativa correspondiente es `Deployment` `«deploy»`, `§19.2.2`).
    2. **Propiedad estructurada `manifestedElements` en `Artifact` para destinos externos (`[DECISIÓN PROYECTO]`):** Cuando el usuario necesita expresar que un `Artifact` manifiesta un elemento lógico no perteneciente a la paleta de despliegue (p. ej. un `Component` `"OrderService"`, una `Class` `"OrderController"` o un `Package` `"com.tienda.billing"`), lo registra en la propiedad `manifestedElements: Array<{ name: string, kind: "Component" | "Package" | "Class" | "Interface" | "Classifier" }>` del `Artifact` desde el Panel de Propiedades. El renderizador muestra estas entradas textualmente en un compartimento interno del `Artifact` (p. ej. `«manifest» «component» OrderService`), preservando la semántica de `§19.3.3` sin introducir figuras de otros diagramas en el lienzo.
- **Notación gráfica del conector en el lienzo:**
  - Línea discontinua (dashed) con punta de flecha abierta desde el `Artifact` (`sourceId`) hacia el `Artifact`/`DeploymentSpecification` manifestado (`targetId`), etiquetada con la palabra clave `«manifest»` `[NORMATIVO: §19.3.4, pp. 654–655 [PDF 694–695]]`.
- **Reglas de validación:**
  - `[NORMATIVO: §19.3.2, §19.5.9]` `sourceId` debe ser `Artifact` o `DeploymentSpecification`.
  - `[DECISIÓN PROYECTO]` En el conector gráfico `Manifestation`, `targetId` debe ser otro `Artifact` o `DeploymentSpecification` (`sourceId !== targetId`) sin formar ciclos directos; si se intenta conectar `Artifact → Node/Device/ExecutionEnvironment` con `Manifestation`, el validador rechaza la operación e informa que para nodos debe utilizarse `Deployment` (`«deploy»`). En la propiedad `manifestedElements` de `Artifact`, cada entrada exige `name` no vacío y un `kind` válido de la lista acotada.
- **Escenario de prueba (PA-DEP-06):**
  1. Conectar `Artifact("release-bundle.tar")` con `Artifact("orders-api.jar")` mediante el conector `Manifestation` (`«manifest»`) y comprobar que se acepta.
  2. Intentar conectar `Artifact("orders-api.jar")` con `Device("Servidor App")` mediante `Manifestation` y comprobar que el validador rechaza la operación indicando usar `Deployment` (`«deploy»`).
  3. Agregar en `Artifact("orders-api.jar")` la entrada `manifestedElements: [{ name: "OrderService", kind: "Component" }]` y verificar que se muestra en el compartimento del artefacto.

#### DEP-REL-04: Dependencia (`Dependency`)
- **Concepto UML:** `Dependency` (relación dirigida cliente → proveedor que indica que un elemento requiere a otro para su especificación o implementación).
- **Referencia OMG UML 2.5.1:** Cláusula 7, `§7.7.2`–`§7.7.4` (Fig. 7.15–7.16, pp. 37–39 `[PDF 77–79]`), `§7.8.4` (`Dependency [from CommonStructure]`, p. 42 `[PDF 82]`) y Cláusula 19, `§19.2.4` (Fig. 19.3, p. 653 `[PDF 693]`), `§19.3.4` (pp. 654–655 `[PDF 694–695]`).
- **Propiedades del modelo:**
  - `id`, `type`: `"Dependency"`, `sourceId` (`client`), `targetId` (`supplier`), `name` / `stereotype` (string opcional).
- **Notación gráfica:**
  - Línea discontinua (dashed) con punta de flecha abierta desde el cliente (`sourceId`) hacia el proveedor (`targetId`) `[NORMATIVO: §7.7.4, Fig. 7.16, p. 38 [PDF 78]]`.
- **Restricciones en el diagrama de despliegue:**
  - `[NORMATIVO: §7.8.4]` En UML general, `Dependency` conecta cualesquiera `NamedElement` (`client` y `supplier`).
  - `[DECISIÓN PROYECTO]` En el editor de despliegue se permite `Dependency` entre artefactos/especificaciones (`Artifact` / `DeploymentSpecification` → `Artifact` / `DeploymentSpecification`, p. ej. una `DeploymentSpecification` que parametriza a un `Artifact` según `§19.2.4` Fig. 19.3, o un `.jar` que depende de otro `.jar`) y entre nodos (`Node`/`Device`/`ExecutionEnvironment` → `Node`/`Device`/`ExecutionEnvironment`), exigiendo `sourceId !== targetId`. Para vincular un `Artifact` con un `Node` se exige usar la relación especializada `Deployment` (`«deploy»`).

#### DEP-REL-05: Generalización (`Generalization`)
- **Concepto UML:** `Generalization` entre clasificadores compatibles del diagrama de despliegue.
- **Referencia OMG UML 2.5.1:** Cláusula 9, `§9.2.2`–`§9.2.4` (pp. 89–96 `[PDF 129–136]`), `§9.9.2` (Constraint `specialize_type [2]`) y `§9.9.4.8` (`no_cycles_in_generalization [3]`, p. 135 `[PDF 175]`), `§9.9.7` (pp. 138–139 `[PDF 178–179]`) y Cláusula 19, `§19.3.2` (`Artifact` es `Classifier`, p. 653 `[PDF 693]`), `§19.4.2` (`Node` es `Class` → `Classifier`, p. 655 `[PDF 695]`).
- **Propiedades del modelo:**
  - `id`, `type`: `"Generalization"`, `sourceId` (`specific`), `targetId` (`general`).
- **Notación gráfica:**
  - Línea continua sólida con punta de triángulo cerrado hueco en `targetId` `[NORMATIVO: §9.2.4, Fig. 9.2, p. 94 [PDF 134]]`.
- **Restricciones:**
  - `[NORMATIVO: §9.9.2 Constraint specialize_type [2], p. 135 [PDF 175]]` Solo se permite entre clasificadores de categoría compatible: entre nodos (`Node`/`Device`/`ExecutionEnvironment` → `Node`/`Device`/`ExecutionEnvironment`) o entre artefactos (`Artifact` → `Artifact` o `DeploymentSpecification` → `DeploymentSpecification` / `Artifact`). **Prohibido** generalizar un `Node` a partir de un `Artifact` o viceversa.
  - `[NORMATIVO: §9.9.4.8 Constraint no_cycles_in_generalization [3], p. 135 [PDF 175]]` Prohibidos `sourceId === targetId` y los ciclos de generalización.
  - `[NORMATIVO: §9.2.2, §9.9.9]` La generalización es una relación entre `Classifier`s (nivel de tipo); si un elemento está marcado como instancia (`isInstance: true`, `DP-04`), no debe participar en `Generalization` `[NORMATIVO + DECISIÓN PROYECTO]`.

---

## 7. Matrices de Compatibilidad y Contención

### 7.1 Matriz de relaciones permitidas — Diagrama de Casos de Uso (`use-case`)

*(Filas = Origen `sourceId`; Columnas = Destino `targetId`. En toda relación se exige `sourceId !== targetId`)*

| Origen \ Destino | `Actor` | `UseCase` | `SystemBoundary` | `Comment` (`DP-01`) | Relación UML semántica (`Association`, `Include`, `Extend`, `Generalization`) |
| --- | --- | --- | --- | --- | --- |
| **`Actor`** | `Generalization` `[NORMATIVO: §9.9.2, §18.1.3]` *(sin ciclos; `Association` prohibida por `§18.2.1 [1]`)* | `Association` `[NORMATIVO: §18.1.2]` | **Ninguna** `[DECISIÓN PROYECTO]` | **Ninguna** *(el origen canónico de `CommentLink` es `Comment`)* | **Ninguna** |
| **`UseCase`** | `Association` `[NORMATIVO: §18.1.2]` | `Include` `[NORMATIVO: §18.2.4]` *(sin ciclos `§18.2.5 [3]`)*,<br>`Extend` `[NORMATIVO: §18.2.2, DP-03]`,<br>`Generalization` `[NORMATIVO: §9.9.2]` *(sin ciclos; `Association` prohibida por `§18.2.5 [2]` + `[DECISIÓN PROYECTO]`)* | **Ninguna** *(pertenencia vía `parentId`)* | **Ninguna** | **Ninguna** |
| **`SystemBoundary`** | **Ninguna** | **Ninguna** *(contiene `UseCase` vía `parentId`)* | **Ninguna** | **Ninguna** | **Ninguna** |
| **`Comment` (`DP-01`)** | `CommentLink` `[NORMATIVO: §7.8.2]` | `CommentLink` `[NORMATIVO: §7.8.2]` | `CommentLink` `[NORMATIVO: §7.8.2]` | `CommentLink` *(si `source !== target`)* | `CommentLink` `[NORMATIVO: §7.2.2, §7.8.2]` *(excepto otro `CommentLink`)* |

### 7.2 Matriz de contención semántica (`parentId`) — Diagrama de Casos de Uso (`use-case`)

| Contenedor (`parentId`) \ Hijo | `Actor` | `UseCase` | `SystemBoundary` | `Comment` (`DP-01`) |
| --- | --- | --- | --- | --- |
| **Raíz (`parentId: null`)** | **PERMITIDO** `[NORMATIVO]` | **PERMITIDO** `[NORMATIVO: §18.1.2 subject 0..*]` | **PERMITIDO** *(múltiples límites permitidos por `DP-02`)* | **PERMITIDO** `[DP-01]` |
| **`SystemBoundary`** | **PROHIBIDO** `[NORMATIVO: §18.1.3, p. 640]` | **PERMITIDO** `[NORMATIVO: §18.1.4, p. 643]` *(máx. 1 padre por `[DECISIÓN PROYECTO]`)* | **PROHIBIDO** `[DECISIÓN PROYECTO: DP-02]` | **NO PERMITIDO** `[DECISIÓN PROYECTO]` |
| **`UseCase` / `Actor` / `Comment`** | **PROHIBIDO** | **PROHIBIDO** | **PROHIBIDO** | **PROHIBIDO** |

### 7.3 Matriz de relaciones permitidas — Diagrama de Despliegue (`deployment`)

*(Filas = Origen `sourceId`; Columnas = Destino `targetId`. En toda relación se exige `sourceId !== targetId` y ausencia de ciclos en `Generalization`)*

| Origen \ Destino | `Node` / `Device` / `ExecutionEnvironment` | `Artifact` | `DeploymentSpecification` | `Comment` (`DP-01`) | Relación UML semántica (`CommunicationPath`, `Deployment`, `Manifestation`, `Dependency`, `Generalization`) |
| --- | --- | --- | --- | --- | --- |
| **`Node` / `Device` / `ExecutionEnvironment`** | `CommunicationPath` `[NORMATIVO: §19.5.2 [1]]`,<br>`Generalization` `[NORMATIVO: §9.9.2]` *(solo clasificadores `isInstance: false`)*,<br>`Dependency` `[NORMATIVO: §7.8.4]` | **Ninguna** *(la dirección de `Deployment` es `Artifact → Node`, `§19.5.4`)* | **Ninguna** | **Ninguna** | **Ninguna** |
| **`Artifact`** | `Deployment` (`«deploy»`) `[NORMATIVO: §19.5.4]` | `Manifestation` (`«manifest»`) `[NORMATIVO: §19.5.9 + DECISIÓN PROYECTO]`,<br>`Dependency` `[NORMATIVO: §7.8.4]`,<br>`Generalization` `[NORMATIVO: §9.9.2]` *(si `isInstance: false`)* | `Manifestation` (`«manifest»`),<br>`Dependency` `[NORMATIVO: §7.8.4]` | **Ninguna** | **Ninguna** |
| **`DeploymentSpecification`** | `Deployment` (`«deploy»`) `[NORMATIVO: §19.5.4]` | `Dependency` `[NORMATIVO: §19.2.4 Fig. 19.3]`,<br>`Manifestation` (`«manifest»`),<br>`Generalization` `[NORMATIVO: §19.2.2]` | `Generalization` `[NORMATIVO: §9.9.2]`,<br>`Dependency` `[NORMATIVO: §7.8.4]` | **Ninguna** | **Ninguna** |
| **`Comment` (`DP-01`)** | `CommentLink` `[NORMATIVO: §7.8.2]` | `CommentLink` `[NORMATIVO: §7.8.2]` | `CommentLink` `[NORMATIVO: §7.8.2]` | `CommentLink` *(si `source !== target`)* | `CommentLink` `[NORMATIVO: §7.2.2, §7.8.2]` *(excepto otro `CommentLink`)* |

> **Nota sobre `Manifestation` hacia otros `PackageableElement` (`Component`, `Class`, `Package`):** cuando el elemento manifestado no es otro `Artifact` del diagrama de despliegue, se registra mediante la propiedad `manifestedElements` del `Artifact` (véase §6.3 `DEP-REL-03`).

### 7.4 Matriz de contención semántica (`parentId`) — Diagrama de Despliegue (`deployment`)

*(En todos los casos se prohíben ciclos de contención directa o indirecta)*

| Contenedor (`parentId`) \ Hijo | `Node` | `Device` | `ExecutionEnvironment` | `Artifact` | `DeploymentSpecification` | `Comment` (`DP-01`) |
| --- | --- | --- | --- | --- | --- | --- |
| **Raíz (`parentId: null`)** | **PERMITIDO** | **PERMITIDO** | **PERMITIDO** | **PERMITIDO** | **PERMITIDO** | **PERMITIDO** |
| **`Node`** | **PERMITIDO** `[NORMATIVO: §19.4.2 nestedNode]` | **PERMITIDO** `[NORMATIVO: §19.4.2 nestedNode]` | **PERMITIDO** `[NORMATIVO: §19.4.2 nestedNode]` | **PERMITIDO** `[NORMATIVO: §19.2.4]` | **PERMITIDO** `[NORMATIVO: §19.2.4]` | **NO PERMITIDO** `[DECISIÓN PROYECTO]` |
| **`Device`** | **PERMITIDO** `[NORMATIVO: §19.4.2 nestedNode]` | **PERMITIDO** `[NORMATIVO: §19.4.2 nestedNode]` | **PERMITIDO** `[NORMATIVO: §19.4.2 nestedNode]` | **PERMITIDO** `[NORMATIVO: §19.2.4]` | **PERMITIDO** `[NORMATIVO: §19.2.4]` | **NO PERMITIDO** `[DECISIÓN PROYECTO]` |
| **`ExecutionEnvironment`** | **PROHIBIDO** `[DECISIÓN PROYECTO]` | **PROHIBIDO** `[DECISIÓN PROYECTO + SEMÁNTICA §19.4.3]` | **PERMITIDO** `[NORMATIVO: §19.4.2 nestedNode]` | **PERMITIDO** `[NORMATIVO: §19.2.4]` | **PERMITIDO** `[NORMATIVO: §19.2.4]` | **NO PERMITIDO** `[DECISIÓN PROYECTO]` |
| **`Artifact`** | **PROHIBIDO** `[NORMATIVO: §19.3.2]` | **PROHIBIDO** `[NORMATIVO: §19.3.2]` | **PROHIBIDO** `[NORMATIVO: §19.3.2]` | **PERMITIDO** `[NORMATIVO: §19.3.2 nestedArtifact]` | **PERMITIDO** `[NORMATIVO: §19.2.4]` | **NO PERMITIDO** `[DECISIÓN PROYECTO]` |
| **`DeploymentSpecification` / `Comment`** | **PROHIBIDO** | **PROHIBIDO** | **PROHIBIDO** | **PROHIBIDO** | **PROHIBIDO** | **PROHIBIDO** |

---

## 8. Diferenciación entre Errores Estructurales y Advertencias de Modelado

De acuerdo con `GEMINI.md` (§8), el validador clasifica los hallazgos según su severidad y distingue si la regla proviene del estándar UML (`[NORMATIVO]`) o del alcance del editor (`[DECISIÓN PROYECTO]`):

### 8.1 Operaciones rechazadas atómicamente (`ERROR` — El modelo no se modifica)

1. **Mezcla de catálogos (`[DECISIÓN PROYECTO]`):** intentar insertar un elemento o relación exclusivo de `deployment` en un documento `use-case` o viceversa.
2. **Incompatibilidad de extremos en relaciones (`[NORMATIVO]` / `[DECISIÓN PROYECTO]`):** cualquier combinación `Origen → Destino` marcada como no permitida en las matrices 7.1 y 7.3:
   - `Include` o `Extend` con un `Actor` (`[NORMATIVO: §18.2.2, §18.2.4]`).
   - `Association` entre dos `Actor` (`[NORMATIVO: §18.2.1 Constraint associations [1]]`).
   - `Association` entre dos `UseCase` del mismo sujeto (`[NORMATIVO: §18.2.5 Constraint no_association_to_use_case [2]]`) o entre dos `UseCase` cualesquiera en el editor (`[DECISIÓN PROYECTO]`).
   - `CommunicationPath` con un `Artifact` o `DeploymentSpecification` (`[NORMATIVO: §19.5.2 Constraint association_ends [1]]`).
   - `Deployment` invertido desde `Node` hacia `Artifact` (`[NORMATIVO: §19.5.4]`).
   - `Manifestation` conectada hacia un `Node`, `Device` o `ExecutionEnvironment` (`[DECISIÓN PROYECTO]`).
   - `CommentLink` cuyo `sourceId` no sea un `Comment` o cuyo `targetId` sea otro `CommentLink` (`[DECISIÓN PROYECTO]`).
3. **Contención inválida (`[NORMATIVO]` / `[DECISIÓN PROYECTO]`):** cualquier combinación prohibida en las matrices 7.2 y 7.4:
   - `Actor` dentro de `SystemBoundary` (`[NORMATIVO: §18.1.3]`).
   - `Node`, `Device` o `ExecutionEnvironment` dentro de `Artifact` (`[NORMATIVO: §19.3.2]`).
   - `SystemBoundary` dentro de otro `SystemBoundary` (`[DECISIÓN PROYECTO: DP-02]`).
   - `Device` o `Node` dentro de `ExecutionEnvironment` (`[DECISIÓN PROYECTO]`).
4. **Ciclos taxonómicos, de inclusión o de contención (`[NORMATIVO]`):**
   - Ciclos en `Generalization` (`[NORMATIVO: §9.9.4.8 Constraint no_cycles_in_generalization [3]]`).
   - Ciclos en `Include` (`[NORMATIVO: §18.2.5 Constraint cannot_include_self [3]]`).
   - Ciclos en `parentId` (`[NORMATIVO]`).
5. **Confirmación de `Extend` sin `ExtensionPoint` válido (`[NORMATIVO: §18.2.2 Constraint extension_points [1]]` + `[DECISIÓN PROYECTO: DP-03]`):** una relación `Extend` no se confirma en el modelo si no referencia un `ExtensionPoint` válido perteneciente al `UseCase` destino (`targetId`).
6. **Nombres obligatorios en `Actor`, `UseCase` y `ExtensionPoint` (`[NORMATIVO: §18.2.1 [2], §18.2.3 [1], §18.2.5 [4]]`):** intentar confirmar un nombre vacío (`""`) en un `Actor`, `UseCase` o `ExtensionPoint` se rechaza restaurando el último nombre válido no vacío.
7. **Integridad referencial:** `sourceId`, `targetId` o `parentId` apuntando a un ID inexistente (respetando que en `CommentLink` `targetId` puede apuntar a `model.elements` o a `model.relationships` excepto `CommentLink`), o IDs duplicados entre elementos y relaciones.

### 8.2 Advertencias de modelado (`WARNING` — Operación permitida con aviso no bloqueante)

1. **Caso de uso aislado (`[RECOMENDADO]`):** un `UseCase` que no participa en ninguna relación (`Association`, `Include`, `Extend`, `Generalization`).
2. **Relación `Extend` sin texto de condición (`[RECOMENDADO]`):** en UML 2.5.1 (`§18.1.2`), `condition : Constraint[0..1]` es opcional (`0..1`); si se deja vacía tras asignar el `ExtensionPoint`, se informa como sugerencia didáctica no bloqueante.
3. **Instancia de despliegue sin nombre de clasificador (`[RECOMENDADO]`):** un elemento con `isInstance: true` (`DP-04`) cuyo `classifierName` está vacío (en UML `§9.8.4` es válido escribir `<u>nombre :</u>` o `<u>nombre</u>`, pero se recomienda indicar el clasificador).
4. **Nodo o artefacto desconectado en despliegue (`[RECOMENDADO]`):** un `Node` o `Artifact` sin relaciones ni contención.

---

## 9. Escenarios de Aceptación y Ejemplos de Referencia

### 9.1 Escenarios de relaciones y operaciones válidas e inválidas

| ID Escenario | Diagrama | Acción de prueba | Resultado esperado | Clasificación y referencia verificada (`formal/2017-12-05`) |
| --- | --- | --- | --- | --- |
| **ESC-UC-V01** | `use-case` | Crear `Association` entre `Actor("Cliente")` y `UseCase("Realizar Pedido")`. | **ACEPTADO.** Se registra la relación y se dibuja línea continua. | `[NORMATIVO]` `§18.1.4` (p. 643 `[PDF 683]`) |
| **ESC-UC-V02** | `use-case` | Crear `Include` desde `UseCase("Realizar Pedido")` hacia `UseCase("Validar Stock")`. | **ACEPTADO.** Línea discontinua con flecha abierta hacia `"Validar Stock"` y etiqueta `«include»`. | `[NORMATIVO]` `§18.1.4` (p. 642), `§18.2.4` (p. 647 `[PDF 687]`) |
| **ESC-UC-V03** | `use-case` | Trazar `Extend` desde `UseCase("Aplicar Cupón")` hacia `UseCase("Realizar Pedido")`, previsualizar y confirmar asignando/creando el `ExtensionPoint("Cálculo de Total")`. | **ACEPTADO (`DP-03`).** Confirmación atómica con `extensionLocation` válido y flecha discontinua `«extend»` hacia `"Realizar Pedido"`. | `[NORMATIVO]` `§18.2.2` Constraint `extension_points [1]` (pp. 645–646 `[PDF 685–686]`) + `[DECISIÓN PROYECTO: DP-03]` |
| **ESC-UC-V04** | `use-case` | Crear `Generalization` desde `Actor("Cliente Corporativo")` hacia `Actor("Cliente")`. | **ACEPTADO.** Línea continua con triángulo cerrado hueco apuntando a `"Cliente"`. | `[NORMATIVO]` `§9.2.4` (p. 94 `[PDF 134]`), `§18.1.3` (p. 641 `[PDF 681]`) |
| **ESC-UC-V05** | `use-case` | Crear dos `SystemBoundary` separados (`"Portal Web"` y `"Sistema ERP"`) y un `Comment` enlazado a `"Realizar Pedido"` o a una relación `Extend`. | **ACEPTADO (`DP-01`, `DP-02`).** Se permiten múltiples límites no anidados y notas UML enlazadas a elementos o relaciones. | `[NORMATIVO]` `§7.2.4` (p. 23 `[PDF 63]`), `§7.8.2` (p. 40 `[PDF 80]`), `§18.1.4` (p. 643 `[PDF 683]`) + `[DECISIÓN PROYECTO: DP-01, DP-02]` |
| **ESC-UC-I01** | `use-case` | Intentar crear `Association` entre `UseCase("Realizar Pedido")` y `UseCase("Pagar")`. | **RECHAZADO (`ERROR`).** El modelo no sufre cambios. | `[NORMATIVO]` `§18.2.5` Constraint `no_association_to_use_case [2]` (p. 649 `[PDF 689]`) *(mismo sujeto)* + `[DECISIÓN PROYECTO]` *(en cualquier caso)* |
| **ESC-UC-I02** | `use-case` | Intentar crear `Include` o `Extend` entre `Actor("Cliente")` y `UseCase("Pagar")`. | **RECHAZADO (`ERROR`).** El modelo no sufre cambios. | `[NORMATIVO]` `§18.2.2`, `§18.2.4` (pp. 645–647 `[PDF 685–687]`) |
| **ESC-UC-I03** | `use-case` | Intentar meter semánticamente `Actor("Cliente")` dentro de `SystemBoundary("Tienda Web")` o anidar un `SystemBoundary` dentro de otro `SystemBoundary`. | **RECHAZADO (`ERROR`).** El modelo no sufre cambios. | `Actor`: `[NORMATIVO]` `§18.1.3` (p. 640 `[PDF 680]`); `SystemBoundary`: `[DECISIÓN PROYECTO: DP-02]` |
| **ESC-UC-I04** | `use-case` | Intentar crear un ciclo `Include`: `UC1 -> UC2` y luego `UC2 -> UC1`. | **RECHAZADO (`ERROR`).** La segunda operación se cancela sin modificar el modelo. | `[NORMATIVO]` `§18.2.5` Constraint `cannot_include_self [3]` (p. 649 `[PDF 689]`) |
| **ESC-UC-I05** | `use-case` | Trazar `Extend` hacia un `UseCase` y presionar `Esc` durante la selección de `ExtensionPoint`. | **CANCELADO (`DP-03`).** La previsualización desaparece y el modelo queda sin mutaciones. | `[DECISIÓN PROYECTO: DP-03]` |
| **ESC-DEP-V01** | `deployment` | Anidar `ExecutionEnvironment("JVM 21")` dentro de `Device("Servidor App")` (`isInstance: true`, `classifierName: "BladeServer"`) y anidar `Artifact("api.jar")` dentro de `"JVM 21"`. | **ACEPTADO (`DP-04`).** Jerarquía `parentId` actualizada y encabezado del dispositivo subrayado. | `[NORMATIVO]` `§9.8.4` (p. 126 `[PDF 166]`), `§19.2.4`, `§19.4.4` (pp. 652, 656 `[PDF 692, 696]`) + `[DECISIÓN PROYECTO: DP-04]` |
| **ESC-DEP-V02** | `deployment` | Crear `CommunicationPath` entre `Device("Servidor App")` y `Device("Servidor BD")` con estereotipo `«tcp/ip»`. | **ACEPTADO.** Línea continua sólida entre ambos dispositivos con etiqueta `«tcp/ip»`. | `[NORMATIVO]` `§19.4.4` (p. 656 `[PDF 696]`), `§19.5.2` (p. 658 `[PDF 698]`) |
| **ESC-DEP-V03** | `deployment` | Crear relación `Deployment` (`«deploy»`) desde `Artifact("schema.sql")` hacia `ExecutionEnvironment("PostgreSQL 16")`. | **ACEPTADO.** Línea discontinua con flecha abierta hacia `"PostgreSQL 16"` y etiqueta `«deploy»`. | `[NORMATIVO]` `§19.2.4` (p. 652 `[PDF 692]`), `§19.5.4` (p. 659 `[PDF 699]`) |
| **ESC-DEP-V04** | `deployment` | Conectar `Artifact("bundle.tar")` hacia `Artifact("orders.jar")` con `Manifestation` (`«manifest»`) y registrar `{ name: "OrderService", kind: "Component" }` en `manifestedElements` de `"orders.jar"`. | **ACEPTADO.** Se dibuja el conector `«manifest»` entre artefactos y el compartimento textual en `"orders.jar"`. | `[NORMATIVO]` `§19.3.4` (pp. 654–655 `[PDF 694–695]`), `§19.5.9` (p. 662 `[PDF 702]`) + `[DECISIÓN PROYECTO]` |
| **ESC-DEP-I01** | `deployment` | Intentar crear `CommunicationPath` entre `Artifact("api.jar")` y `Device("Servidor BD")`. | **RECHAZADO (`ERROR`).** `CommunicationPath` solo conecta `DeploymentTargets`. | `[NORMATIVO]` `§19.5.2` Constraint `association_ends [1]` (p. 658 `[PDF 698]`) |
| **ESC-DEP-I02** | `deployment` | Intentar crear `Deployment` (`«deploy»`) desde `Device("Servidor App")` hacia `Artifact("api.jar")` (dirección invertida), o `Manifestation` (`«manifest»`) desde `Artifact("api.jar")` hacia `Device("Servidor App")`. | **RECHAZADO (`ERROR`).** Dirección/tipo inválido para `Deployment` y `Manifestation`. | `[NORMATIVO]` `§19.5.4` (p. 659 `[PDF 699]`), `§19.5.9` (p. 662 `[PDF 702]`) + `[DECISIÓN PROYECTO]` |
| **ESC-DEP-I03** | `deployment` | Intentar anidar `Device("Router")` dentro de `Artifact("config.json")` o dentro de `ExecutionEnvironment("Docker")`. | **RECHAZADO (`ERROR`).** Contención inválida. | `En Artifact`: `[NORMATIVO]` `§19.3.2` (p. 653 `[PDF 693]`); `En ExecutionEnvironment`: `[DECISIÓN PROYECTO + SEMÁNTICA §19.4.3]` (p. 656 `[PDF 696]`) |

### 9.2 Ejemplo completo 1: Diagrama de Casos de Uso — «Sistema de Banca en Línea»

- **Límites del sistema (`SystemBoundary`, `DP-02`):**
  - `sb-1`: `"Portal de Banca en Línea"` (`parentId: null`)
  - `sb-2`: `"Módulo de Auditoría Externa"` (`parentId: null`)
- **Actores (`Actor`, externos, `parentId: null`):**
  - `act-1`: `"Cliente Bancario"`
  - `act-2`: `"Cliente Corporativo"` (con `Generalization` hacia `act-1`)
  - `act-3`: `"Red Interbancaria SPEI"` (actor externo secundario)
- **Casos de Uso (`UseCase`):**
  - `uc-1`: `"Transferir Fondos"` (`parentId: "sb-1"`, `extensionPoints: [{ id: "ep-1", name: "Monto Mayor al Límite" }]`)
  - `uc-2`: `"Autenticar con Token 2FA"` (`parentId: "sb-1"`)
  - `uc-3`: `"Solicitar Autorización Mancomunada"` (`parentId: "sb-1"`)
  - `uc-4`: `"Consultar Saldo"` (`parentId: "sb-1"`)
  - `uc-5`: `"Registrar Traza Regulatoria"` (`parentId: "sb-2"`)
- **Comentarios (`Comment`, `DP-01`):**
  - `cmn-1`: `"Condición: {monto > $50,000}\nPunto: Monto Mayor al Límite"` (vinculado mediante `CommentLink` a la relación `Extend` entre `uc-3` y `uc-1`).
- **Relaciones:**
  - `Association`: `act-1` ↔ `uc-1`, `act-1` ↔ `uc-4`, `uc-1` ↔ `act-3`, `act-3` ↔ `uc-5`.
  - `Generalization`: `act-2` → `act-1`.
  - `Include`: `uc-1` → `uc-2` (`«include»`, toda transferencia incluye autenticación 2FA).
  - `Extend`: `uc-3` → `uc-1` (`«extend»`, `extensionLocation: "ep-1"`, `condition: "monto > $50,000 y cuenta corporativa"`).
  - `CommentLink`: `cmn-1` — `rel-extend-1` (apuntando al `id` de la relación `Extend`).

### 9.3 Ejemplo completo 2: Diagrama de Despliegue — «Arquitectura Web de Comercio Electrónico»

- **Nodos y Dispositivos (con soporte de instancias `DP-04`):**
  - `dev-1`: `Device` `"lb-01"` (`isInstance: true`, `classifierName: "LoadBalancer"`, `parentId: null`)
  - `dev-2`: `Device` `"app-srv-01"` (`isInstance: true`, `classifierName: "AppServer"`, `parentId: null`)
    - `env-1`: `ExecutionEnvironment` `"Node.js 22 Runtime"` (`isInstance: false`, `parentId: "dev-2"`)
      - `art-1`: `Artifact` `"catalog-service.js"` (`parentId: "env-1"`, desplegado por contención, con `manifestedElements: [{ name: "CatalogComponent", kind: "Component" }]`)
      - `spec-1`: `DeploymentSpecification` `"env-production.json"` (`parentId: "env-1"`, `executionLocation: "cluster-worker"`)
  - `dev-3`: `Device` `"db-srv-01"` (`isInstance: true`, `classifierName: "DatabaseServer"`, `parentId: null`)
    - `env-2`: `ExecutionEnvironment` `"PostgreSQL 16"` (`isInstance: false`, `parentId: "dev-3"`)
- **Artefactos externos:**
  - `art-2`: `Artifact` `"db-migrations.sql"` (`parentId: null`)
  - `art-3`: `Artifact` `"release-package.tar"` (`parentId: null`)
- **Comentarios (`Comment`, `DP-01`):**
  - `cmn-dep-1`: `"Canal interno con TLS mutuo"` (vinculado mediante `CommentLink` al `CommunicationPath` entre `dev-1` y `dev-2`).
- **Relaciones:**
  - `CommunicationPath`: `dev-1` ↔ `dev-2` (`«https»`, multiplicidades `"1"` a `"1..*"`), `dev-2` ↔ `dev-3` (`«tcp/ip : 5432»`).
  - `Deployment` (`«deploy»`): `art-2` → `env-2`.
  - `Manifestation` (`«manifest»`): `art-3` → `art-1` (el paquete de release manifiesta el artefacto desplegable `"catalog-service.js"`).
  - `Dependency`: `spec-1` → `art-1` (la especificación de despliegue parametriza al artefacto `"catalog-service.js"`).
  - `CommentLink`: `cmn-dep-1` — `rel-comm-1`.

---

## 10. Registro de Decisiones Aprobadas en UML-00R / UML-01 y Cuestiones Pendientes

### 10.1 Decisiones aprobadas e integradas en este catálogo (`DP-01` a `DP-05`)

| ID | Estado | Decisión aprobada por el responsable del proyecto | Sección donde se integra |
| --- | --- | --- | --- |
| **DP-01** | **APROBADA (UML-00R / Ajustada en UML-01)** | Incluir `Comment` (Nota UML) en **ambos editores** (`use-case` y `deployment`), con su notación normativa de esquina doblada y su vínculo en línea discontinua (`CommentLink`) capaz de referenciar tanto elementos (`model.elements`) como relaciones UML (`model.relationships`, excepto otro `CommentLink`). | §3.1, §4 (`CMN-EL-01`, `CMN-REL-01`), §7.1–7.4, §9 |
| **DP-02** | **APROBADA (UML-00R)** | Permitir múltiples límites de sistema (`SystemBoundary`) en un mismo diagrama de casos de uso, pero **sin anidamiento** entre `SystemBoundary`. | §5.1 (`UC-EL-03`), §7.2, §8.1, §9.1–9.2 |
| **DP-03** | **APROBADA (UML-00R)** | Al crear `Extend`, permitir previsualización provisional durante el trazo; **confirmar atómicamente en el modelo solo después de asignar o crear un `ExtensionPoint` válido** en el `UseCase` destino. | §3.2, §5.2 (`UC-REL-03`), §8.1, §9.1 |
| **DP-04** | **APROBADA (UML-00R)** | Soportar representación opcional de instancias de despliegue mediante propiedades (`isInstance`, `classifierName`, notación subrayada `nombre : Tipo`) sin duplicar herramientas en la paleta, documentando la simplificación del metamodelo (`InstanceSpecification`). | §3.2, §6.1, §6.2 (`DEP-EL-01` a `DEP-EL-04`), §9.1, §9.3 |
| **DP-05** | **APROBADA (UML-00R)** | Mantener **OMG UML 2.5.1** como referencia normativa principal. La bibliografía didáctica (*Seidl et al. 2015*, *Rosenberg & Stephens 2007*) continúa pendiente de contraste físico y **no bloquea UML-01**. | §1, §10.2 |

### 10.2 Cuestiones abiertas o limitaciones documentadas

1. **Contraste físico con bibliografía didáctica (`DP-05` — No bloqueante):** Si durante las revisiones académicas posteriores el responsable desea incorporar alguna convención didáctica específica de *Seidl et al. (2015)* o *Rosenberg & Stephens (2007)*, la arquitectura abierta/cerrada (`OCP`) permitirá agregarla en los módulos `js/uml/use-case/` o `js/uml/deployment/` sin modificar el motor Canvas.
2. **Alcance acotado de `Manifestation` (`DEP-REL-03`):** Tal como se documenta en §6.3, este editor no incluye diagramas ni paletas de componentes, paquetes o clases. Por tanto, el conector gráfico `Manifestation` (`«manifest»`) solo enlaza artefactos/especificaciones presentes en el lienzo de despliegue, mientras que la manifestación de componentes, clases o paquetes lógicos se representa de forma acotada mediante la propiedad estructurada `manifestedElements` del `Artifact`. No se afirma soporte gráfico completo de las cláusulas de Componentes (`Cláusula 11.6`) ni de Clases (`Cláusula 11.4`).
