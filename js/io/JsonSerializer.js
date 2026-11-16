/**
 * Serialización e importación segura de documentos UML en JSON versionado — Incremento UML-06 (RF-IO-01, RF-IO-02).
 *
 * Módulo puro en su lógica de análisis y validación (sin dependencias del DOM):
 * - No evalúa código (`JSON.parse` exclusivamente).
 * - Rechaza archivos que superen `MAX_JSON_FILE_BYTES` (2 MiB).
 * - Valida esquema (`schemaVersion === 1`), `diagramType`, unicidad de IDs, referencias,
 *   reglas semánticas de catálogo y dimensiones mínimas mediante `validateDocumentSnapshot()`.
 */

import {
  SUPPORTED_SCHEMA_VERSION,
  validateDocumentSnapshot
} from '../core/DiagramModel.js';
import { UseCaseCatalog } from '../uml/use-case/UseCaseCatalog.js';
import { DeploymentCatalog } from '../uml/deployment/DeploymentCatalog.js';

export const MAX_JSON_FILE_BYTES = 2 * 1024 * 1024; // 2 MiB

const DEFAULT_CATALOGS_BY_TYPE = Object.freeze({
  'use-case': UseCaseCatalog,
  deployment: DeploymentCatalog
});

/**
 * Calcula el tamaño exacto en bytes UTF-8 de una cadena sin depender de APIs específicas de Node.
 * @param {string} text
 * @returns {number}
 */
export function getUtf8ByteLength(text) {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(text).byteLength;
  }
  return text.length * 2;
}

/**
 * Serializa el documento actual del `DiagramModel` a JSON plano formateado sin estado provisional.
 *
 * @param {import('../core/DiagramModel.js').DiagramModel} diagramModel
 * @returns {string}
 */
export function serializeDiagramToJson(diagramModel) {
  if (!diagramModel || typeof diagramModel.toJSON !== 'function') {
    throw new TypeError('serializeDiagramToJson requiere una instancia válida de DiagramModel.');
  }
  return JSON.stringify(diagramModel.toJSON(), null, 2);
}

/**
 * Prepara la exportación JSON verificando que el resultado serializado respete el mismo
 * límite `MAX_JSON_FILE_BYTES` aplicado al importar, garantizando que todo archivo guardado
 * pueda volver a abrirse en la misma versión del editor.
 *
 * @param {import('../core/DiagramModel.js').DiagramModel} diagramModel
 * @param {{ maxBytes?: number }} [options]
 * @returns {{ isValid: boolean, byteSize: number, maxBytes: number, jsonText?: string, errors: string[] }}
 */
export function prepareJsonExport(
  diagramModel,
  { maxBytes = MAX_JSON_FILE_BYTES } = {}
) {
  const jsonText = serializeDiagramToJson(diagramModel);
  const byteSize = getUtf8ByteLength(jsonText);
  if (byteSize > maxBytes) {
    return {
      isValid: false,
      byteSize,
      maxBytes,
      errors: [
        `El documento serializado (${byteSize} bytes) supera el límite máximo permitido de ${maxBytes} bytes para guardar y reabrir JSON.`
      ]
    };
  }
  return {
    isValid: true,
    byteSize,
    maxBytes,
    jsonText,
    errors: []
  };
}

/**
 * Sugiere un nombre de archivo `.json` seguro a partir del nombre del diagrama.
 *
 * @param {string} diagramName
 * @param {string} diagramType
 * @returns {string}
 */
export function buildSafeJsonFilename(diagramName, diagramType) {
  const base = String(diagramName || diagramType || 'diagrama-uml')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${base || 'diagrama-uml'}.json`;
}

/**
 * Analiza y valida de forma estricta un texto JSON importado sin mutar ningún documento activo.
 *
 * @param {string} rawText
 * @param {{
 *   maxBytes?: number,
 *   catalogsByType?: Record<string, object>
 * }} [options]
 * @returns {{ isValid: boolean, errors: string[], document?: object }}
 */
export function parseAndValidateDiagramJson(
  rawText,
  { maxBytes = MAX_JSON_FILE_BYTES, catalogsByType = DEFAULT_CATALOGS_BY_TYPE } = {}
) {
  if (typeof rawText !== 'string' || rawText.trim().length === 0) {
    return {
      isValid: false,
      errors: ['El archivo JSON está vacío o no contiene texto legible.']
    };
  }

  const byteSize = getUtf8ByteLength(rawText);
  if (byteSize > maxBytes) {
    return {
      isValid: false,
      errors: [
        `El archivo JSON (${byteSize} bytes) supera el límite máximo permitido de ${maxBytes} bytes.`
      ]
    };
  }

  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch (error) {
    return {
      isValid: false,
      errors: [`JSON sintácticamente inválido: ${error instanceof Error ? error.message : String(error)}.`]
    };
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {
      isValid: false,
      errors: ['La raíz del documento JSON debe ser un objeto plano.']
    };
  }

  if (parsed.schemaVersion !== SUPPORTED_SCHEMA_VERSION) {
    return {
      isValid: false,
      errors: [
        `Versión de esquema incompatible ("${String(parsed.schemaVersion)}"). Se requiere schemaVersion: ${SUPPORTED_SCHEMA_VERSION}.`
      ]
    };
  }

  const catalog =
    catalogsByType && Object.prototype.hasOwnProperty.call(catalogsByType, parsed.diagramType)
      ? catalogsByType[parsed.diagramType]
      : null;

  if (!catalog) {
    return {
      isValid: false,
      errors: [
        `Tipo de diagrama no soportado o ausente ("${String(parsed.diagramType)}"). Solo se admiten "use-case" y "deployment".`
      ]
    };
  }

  const validation = validateDocumentSnapshot(parsed, catalog);
  if (!validation.isValid) {
    return {
      isValid: false,
      errors: validation.errors
    };
  }

  return {
    isValid: true,
    errors: [],
    document: parsed
  };
}
