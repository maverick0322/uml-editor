# Contexto académico y funcional — Editor UML

> **Naturaleza:** contexto del proyecto, no instrucciones que sustituyan a [`GEMINI.md`](../GEMINI.md). Las normas UML específicas deberán documentarse durante **UML-00** con referencias verificables.

## 1. Motivación

Este proyecto académico busca desarrollar una aplicación web para representar y editar **exclusivamente diagramas UML de casos de uso y de despliegue**. Un profesor revisará el trabajo y podrá solicitar ajustes visuales, funcionales o de notación. Por eso, **modificabilidad, mantenibilidad, extensibilidad y facilidad para localizar el código** son prioridades arquitectónicas, además del funcionamiento correcto.

No se han confirmado una institución, asignatura, rúbrica detallada ni fecha de entrega. El agente no debe inventarlas.

## 2. Usuarios y experiencia esperada

Usuarios que necesitan crear los dos tipos de diagramas desde el navegador, sin aprender un editor gráfico multipropósito. La interfaz propuesta incluye:

1. **Barra superior:** nuevo, abrir, guardar, exportar, deshacer y rehacer.
2. **Paleta lateral:** herramientas que cambian de acuerdo con el diagrama activo.
3. **Canvas central:** composición y edición.
4. **Panel de propiedades:** atributos de los elementos y relaciones seleccionados.
5. **Barra de estado:** herramienta actual, zoom y notificaciones.

Comportamiento previsto: selección por clic, inserción mediante herramienta + clic, arrastre para mover, controladores para redimensionar cuando proceda, doble clic o panel HTML para editar texto, conexión mediante origen/destino y `Esc` para cancelar una operación provisional. El editor conservará las conexiones al mover figuras y distinguirá entre pertenencia UML y simple superposición visual.

La distribución exacta y el estilo visual pueden ajustarse durante revisiones académicas.

## 3. Alcance incluido

- **Casos de uso UML:** elementos, relaciones, propiedades y variantes de representación aplicables a ese tipo de diagrama, según el catálogo normativo que elaborará UML-00.
- **Despliegue UML:** elementos, relaciones, propiedades, contención y variantes aplicables a ese tipo de diagrama, según UML-00.
- Manipulación visual sobre Canvas 2D, validación de integridad y semántica UML, historial, zoom y desplazamiento.
- Guardado/apertura mediante archivos **JSON versionados** y exportación gráfica **PNG**.
- Un motor gráfico compartido con reglas y catálogos independientes para cada diagrama.

**Advertencia sobre cobertura:** los ejemplos conocidos (actor, caso de uso, límite del sistema, nodo, dispositivo, entorno de ejecución, artefacto, etc.) **no son todavía un inventario exhaustivo**. Gemini debe obtener el catálogo y sus reglas de las fuentes durante UML-00 y señalar cualquier ambigüedad normativa.

## 4. Fuera de alcance

- Diagramas UML distintos de los dos indicados o notaciones no UML.
- Login, cuentas, sesiones, backend, API propia, base de datos y colaboración en tiempo real.
- Frameworks de interfaz y bibliotecas prefabricadas de diagramación.
- Sincronización en la nube, XMI y formatos adicionales de exportación, salvo decisión posterior expresa.

La ejecución local puede usar un **servidor estático de desarrollo**; eso no significa incorporar un backend al producto.

## 5. Decisiones de arquitectura

- **HTML5 semántico, CSS3 y JavaScript Vanilla**, con módulos ES nativos; **Canvas 2D** para la superficie de dibujo.
- **Modelo semántico UML** separado del **modelo visual** (posiciones, dimensiones, estilos, orden de dibujo y puntos de paso).
- Los elementos y las relaciones poseen **identificadores estables**; las relaciones enlazan identificadores, no coordenadas.
- **Renderizador sin mutaciones del modelo**; interacciones controladas mediante operaciones atómicas y validadas.
- **Reglas de casos de uso y despliegue independientes** sobre un motor Canvas compartido.
- Cálculos de geometría e integridad verificables mediante pruebas; texto de usuario tratado como datos, no HTML ejecutable.
- Favorecer **SOLID, KISS, DRY** y reutilización real, sin jerarquías o abstracciones innecesarias.

El esquema de JSON documentado en `GEMINI.md` es una propuesta inicial; solo podrá ajustarse con justificación y aprobación.

## 6. Requisitos no funcionales prioritarios

| ID | Requisito | Evidencia esperada |
| --- | --- | --- |
| RNF-01 | Mantenibilidad y modificabilidad | Un cambio aislado se localiza y prueba sin afectar módulos ajenos. |
| RNF-02 | Extensibilidad | Incorporar o ajustar un tipo UML no obliga a reescribir el motor Canvas. |
| RNF-03 | Comprensibilidad | Nombres, responsabilidades, JSDoc y guía de cambios permiten identificar el código responsable. |
| RNF-04 | Corrección e integridad | Las operaciones inválidas no dejan relaciones huérfanas, IDs duplicados ni cambios parciales. |
| RNF-05 | Usabilidad y accesibilidad | Controles HTML semánticos, foco visible, teclado y mensajes claros. |

Ejemplos de modificaciones previsibles:

| Solicitud del profesor | Área principal a modificar |
| --- | --- |
| Ajustar colores o distribución | Variables y layout CSS |
| Cambiar símbolo de actor o nodo | Definición/renderizador del tipo UML |
| Corregir una relación permitida | Validador específico del diagrama |
| Cambiar el arrastre o selección | Motor de interacciones y pruebas |

La documentación debe incluir trazabilidad **requisito → módulo responsable → pruebas**.

## 7. Materiales de referencia

1. [OMG — UML 2.5.1](https://www.omg.org/spec/UML/2.5.1), fuente normativa principal.
2. Seidl et al., *UML @ Classroom* (2015), texto didáctico aportado por el responsable.
3. Rosenberg y Stephens, *Use Case Driven Object Modeling with UML* (2007), texto didáctico aportado.
4. Proyecto JavaScript/Canvas de ejemplo aportado, útil como referencia del funcionamiento de dibujos y arrastre, **no como arquitectura obligatoria**.
5. ISO/IEC 25010:2023, MDN y WCAG 2.2 para calidad, APIs web y accesibilidad.

Los materiales de terceros **no están incluidos automáticamente** en el repositorio público. Si Gemini no dispone de ellos, debe declararlo sin inventar hallazgos ni subir obras protegidas sin permiso.

## 8. Gobernanza e incrementos

**Gemini es el agente ejecutor**, mientras que el responsable del proyecto define el alcance, revisa los entregables y aprueba los incrementos. No deben adelantarse tareas no autorizadas.

| ID | Objetivo | Estado |
| --- | --- | --- |
| UML-00 | Catálogo normativo y requisitos detallados | Pendiente |
| UML-01 | Estructura, modelo y primer renderizado | No iniciado |
| UML-02 | Inserción y manipulación de elementos | No iniciado |
| UML-03 | Relaciones, anclajes y validaciones | No iniciado |
| UML-04 | Editor de casos de uso | No iniciado |
| UML-05 | Editor de despliegue | No iniciado |
| UML-06 | Historial, navegación, JSON y PNG | No iniciado |
| UML-07 | Pruebas integrales y preparación para revisión | No iniciado |

**Pendientes de resolver durante UML-00:** catálogo exhaustivo y verificable por tipo de diagrama, escenarios válidos e inválidos, requisitos específicos y trazabilidad normativa. **Pendientes posteriores:** contratos concretos del código, umbrales de rendimiento y detalles de implementación.
