# Editor de diagramas UML

Aplicación web académica para crear y editar **diagramas UML de casos de uso y de despliegue**, utilizando **HTML5 semántico, CSS3, JavaScript Vanilla (módulos ES) y Canvas 2D**, sin frameworks ni backend.

> **Estado:** planificación y preparación documental. La aplicación aún no está implementada. El primer incremento previsto es **UML-00** (catálogo normativo y requisitos).

## Objetivo

Ofrecer una herramienta visual sencilla para elaborar exclusivamente los dos diagramas indicados, respetando la semántica UML y facilitando las modificaciones que puedan solicitarse durante una revisión académica.

## Funcionalidades previstas

- Dos modos especializados: **casos de uso** y **despliegue**.
- Paletas de elementos y relaciones específicas de cada tipo de diagrama.
- Edición sobre Canvas: inserción, selección, movimiento, redimensionamiento cuando proceda, conexiones, edición de propiedades y eliminación.
- Reglas UML y validaciones estructurales; relaciones vinculadas a sus elementos.
- Zoom, desplazamiento, deshacer y rehacer.
- Importar y guardar diagramas como **JSON versionado** y exportar imágenes **PNG**.

Estas capacidades son **requisitos planificados**, no características ya disponibles.

## Límites tecnológicos

- Sin frameworks de interfaz, editores prefabricados, autenticación, sesiones, base de datos ni servidor de aplicación.
- El navegador ejecutará la aplicación; durante el desarrollo se utilizará un servidor estático local para cargar módulos ES.
- Las dependencias de desarrollo o pruebas deberán justificarse y aprobarse.

## Arquitectura y calidad

Se utilizará **un motor Canvas compartido**, con **modelo UML independiente del dibujo** y **reglas específicas por diagrama**. Se priorizan **SOLID, KISS, DRY, HTML semántico, accesibilidad, reutilización razonable, mantenibilidad, modificabilidad, extensibilidad y pruebas de regresión**. Evitamos abstracciones y dependencias innecesarias.

## Documentos del proyecto

- [`GEMINI.md`](GEMINI.md): instrucciones permanentes para Gemini como agente ejecutor.
- [`docs/PROJECT-CONTEXT.md`](docs/PROJECT-CONTEXT.md): motivación académica, alcance, usuarios y prioridades.
- `docs/REQUIREMENTS.md`, `docs/UML-CATALOG.md`, `docs/ARCHITECTURE.md`, `docs/ROADMAP.md` y `docs/CHANGE-GUIDE.md`: documentos previstos para los incrementos; **aún no creados**.

## Ruta de desarrollo

| Incremento | Entrega prevista |
| --- | --- |
| UML-00 | Catálogo normativo y requisitos |
| UML-01 | Estructura, modelo y primer renderizado |
| UML-02 | Manipulación de elementos |
| UML-03 | Relaciones, anclajes y validaciones |
| UML-04 | Editor de casos de uso |
| UML-05 | Editor de despliegue |
| UML-06 | Historial, navegación y archivos |
| UML-07 | Pruebas integrales y preparación de la entrega |

**Gemini implementará únicamente incrementos autorizados.** Las decisiones de alcance y la aceptación técnica se realizarán fuera del agente.

## Referencias principales

- [OMG — UML 2.5.1](https://www.omg.org/spec/UML/2.5.1)
- Seidl et al. (2015), *UML @ Classroom*.
- Rosenberg y Stephens (2007), *Use Case Driven Object Modeling with UML*.
- ISO/IEC 25010:2023 (calidad del producto software).
- [MDN Web Docs](https://developer.mozilla.org/) y [WCAG 2.2](https://www.w3.org/TR/WCAG22/).

Los textos y el ejemplo didáctico de Canvas aportados para consulta no se redistribuyen íntegramente en este repositorio público sin verificar los permisos correspondientes.
