/**
 * Modelo de documento UML con separación estricta entre modelo semántico (model)
 * y modelo visual (view) — Incrementos UML-01 y UML-02.
 *
 * Este módulo pertenece al núcleo de dominio y NO depende del DOM, de Canvas 2D ni
 * importa catálogos concretos (Principio de Inversión de Dependencias — DIP / RNF-04).
 * Recibe el catálogo del modo activo por inyección desde `Editor`.
 */

export const SUPPORTED_SCHEMA_VERSION = 1;

export const VALID_DIAGRAM_TYPES = Object.freeze(['use-case', 'deployment']);

/**
 * Registro interno de catálogos inyectados por el coordinador (`Editor`) para evitar
 * acoplamiento estático de `DiagramModel` hacia los módulos concretos de `js/uml/`.
 * @type { Map<string, object> }
 */
const registeredCatalogsByType = new Map();

/**
 * Registra los catálogos disponibles por `diagramType` (invocado por `Editor`).
 * @param {Record<string, object>} catalogsMap
 */
export function registerDefaultCatalogs(catalogsMap) {
  if (!catalogsMap || typeof catalogsMap !== 'object') {
    return;
  }
  for (const [type, catalog] of Object.entries(catalogsMap)) {
    if (catalog && typeof catalog === 'object') {
      registeredCatalogsByType.set(type, catalog);
    }
  }
}

/**
 * Resuelve el catálogo a utilizar (priorizando el inyectado explícitamente).
 * @param {string} diagramType
 * @param {object | null} explicitCatalog
 * @returns {object | null}
 */
function resolveCatalog(diagramType, explicitCatalog = null) {
  if (explicitCatalog && typeof explicitCatalog === 'object') {
    return explicitCatalog;
  }
  return registeredCatalogsByType.get(diagramType) || null;
}

/**
 * Realiza una copia profunda segura de datos planos JSON.
 * @template T
 * @param {T} value
 * @returns {T}
 */
export function clonePlainData(value) {
  return JSON.parse(JSON.stringify(value));
}

/**
 * Comprueba si un valor es un número finito.
 * @param {unknown} value
 * @returns {boolean}
 */
function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Calcula las dimensiones mínimas efectivas de un elemento considerando tanto el mínimo
 * estático del descriptor como el mínimo dinámico calculado según su contenido (`getMinimumSize`).
 *
 * @param {object | null | undefined} descriptor
 * @param {object | null | undefined} element
 * @returns {{ width: number, height: number }}
 */
export function resolveDescriptorMinSize(descriptor, element) {
  const baseMin = (descriptor && descriptor.minSize) || { width: 40, height: 30 };
  if (descriptor && typeof descriptor.getMinimumSize === 'function' && element) {
    const dynamicMin = descriptor.getMinimumSize(element);
    if (dynamicMin && isFiniteNumber(dynamicMin.width) && isFiniteNumber(dynamicMin.height)) {
      return {
        width: Math.round(dynamicMin.width),
        height: Math.round(dynamicMin.height)
      };
    }
  }
  return baseMin;
}

/**
 * Comprueba si un valor es una cadena no vacía tras eliminar espacios extremos.
 * @param {unknown} value
 * @returns {boolean}
 */
function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Claves reservadas del prototipo de Object en JavaScript que no pueden usarse como
 * identificadores en mapas basados en objetos planos (`view.elements`, `view.relationships`),
 * ya que comprometen la correspondencia entre `model` y `view` o la serialización JSON.
 */
export const RESERVED_PROTOTYPE_KEYS = Object.freeze(
  new Set([
    '__proto__',
    'prototype',
    'constructor',
    ...Object.getOwnPropertyNames(Object.prototype)
  ])
);

/**
 * Política explícita de identificadores seguros del documento:
 * debe ser una cadena no vacía sin espacios extremos ni coincidencia con claves reservadas del prototipo.
 *
 * @param {unknown} value
 * @returns {boolean}
 */
export function isSafeIdentifier(value) {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.trim() === value &&
    !RESERVED_PROTOTYPE_KEYS.has(value)
  );
}

/**
 * Comprueba si un objeto plano conserva un prototipo estándar (`Object.prototype` o `null`).
 * @param {unknown} obj
 * @returns {boolean}
 */
function hasPlainObjectPrototype(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return false;
  }
  const proto = Object.getPrototypeOf(obj);
  return proto === Object.prototype || proto === null;
}

/**
 * Lee una entrada propia de un mapa objeto sin recorrer la cadena de prototipos.
 * @param {object} mapObj
 * @param {string} key
 * @returns {any}
 */
function getOwnMapValue(mapObj, key) {
  if (!mapObj || typeof mapObj !== 'object' || !isSafeIdentifier(key)) {
    return undefined;
  }
  return Object.prototype.hasOwnProperty.call(mapObj, key) ? mapObj[key] : undefined;
}

/**
 * Asigna una entrada propia en un mapa objeto mediante `Object.defineProperty`,
 * evitando invocar setters del prototipo (como `__proto__`).
 * @param {object} mapObj
 * @param {string} key
 * @param {any} value
 */
function setOwnMapValue(mapObj, key, value) {
  if (!isSafeIdentifier(key)) {
    throw new Error(`Identificador reservado o inválido para mapa de documento: "${String(key)}".`);
  }
  Object.defineProperty(mapObj, key, {
    value,
    writable: true,
    enumerable: true,
    configurable: true
  });
}

/**
 * Elimina una entrada propia de un mapa objeto de forma segura.
 * @param {object} mapObj
 * @param {string} key
 */
function deleteOwnMapValue(mapObj, key) {
  if (
    mapObj &&
    typeof mapObj === 'object' &&
    isSafeIdentifier(key) &&
    Object.prototype.hasOwnProperty.call(mapObj, key)
  ) {
    delete mapObj[key];
  }
}

/**
 * Reordena `drawOrder` preservando el orden relativo existente pero garantizando que
 * todo elemento contenedor preceda siempre a sus descendientes semánticos (`parentId`).
 *
 * @param {Array<object>} elements
 * @param {Array<string>} currentDrawOrder
 * @returns {Array<string>}
 */
function normalizeDrawOrderForContainment(elements, currentDrawOrder) {
  const byId = new Map(elements.map((el) => [el.id, el]));
  const orderRank = new Map(currentDrawOrder.map((id, idx) => [id, idx]));

  const orderedIds = [...currentDrawOrder].sort((a, b) => {
    return (orderRank.get(a) ?? 0) - (orderRank.get(b) ?? 0);
  });

  const result = [];
  const emitted = new Set();
  const visiting = new Set();

  function emitWithAncestors(id) {
    if (emitted.has(id) || visiting.has(id) || !byId.has(id)) {
      return;
    }
    visiting.add(id);
    const el = byId.get(id);
    if (el && el.parentId && byId.has(el.parentId)) {
      emitWithAncestors(el.parentId);
    }
    visiting.delete(id);
    if (!emitted.has(id)) {
      emitted.add(id);
      result.push(id);
    }
  }

  for (const id of orderedIds) {
    emitWithAncestors(id);
  }

  return result;
}

/**
 * Valida íntegramente un documento candidato contra el contrato estructural e invariantes.
 * No muta el objeto recibido.
 *
 * @param {unknown} candidate
 * @param {object} [catalog] Catálogo del diagrama activo inyectado por `Editor` o prueba.
 * @returns {{ isValid: boolean, errors: string[] }}
 */
export function validateDocumentSnapshot(candidate, catalog = null) {
  const errors = [];

  if (candidate === null || typeof candidate !== 'object' || Array.isArray(candidate)) {
    return { isValid: false, errors: ['El documento debe ser un objeto JSON plano.'] };
  }

  if (candidate.schemaVersion !== SUPPORTED_SCHEMA_VERSION) {
    errors.push(
      `Versión de esquema no soportada (${String(candidate.schemaVersion)}); se esperaba ${SUPPORTED_SCHEMA_VERSION}.`
    );
  }

  if (!isSafeIdentifier(candidate.id)) {
    errors.push(
      'El documento debe poseer un identificador "id" válido, no vacío y no reservado.'
    );
  }

  if (!isNonEmptyString(candidate.name)) {
    errors.push('El documento debe poseer un nombre "name" no vacío.');
  }

  if (!VALID_DIAGRAM_TYPES.includes(candidate.diagramType)) {
    errors.push(
      `Tipo de diagrama inválido (${String(candidate.diagramType)}). Solo se permiten "use-case" y "deployment".`
    );
    return { isValid: false, errors };
  }

  const activeCatalog = resolveCatalog(candidate.diagramType, catalog);
  if (!activeCatalog) {
    errors.push(
      `No se ha proporcionado ni registrado un catálogo para el modo "${candidate.diagramType}".`
    );
    return { isValid: false, errors };
  }

  if (activeCatalog.diagramType && activeCatalog.diagramType !== candidate.diagramType) {
    errors.push(
      `El catálogo proporcionado (${activeCatalog.diagramType}) no coincide con el diagramType del documento (${candidate.diagramType}).`
    );
  }

  const { model, view } = candidate;
  if (!model || typeof model !== 'object' || Array.isArray(model)) {
    errors.push('El documento debe incluir el bloque semántico "model".');
    return { isValid: false, errors };
  }

  if (!view || typeof view !== 'object' || Array.isArray(view)) {
    errors.push('El documento debe incluir el bloque visual "view".');
    return { isValid: false, errors };
  }

  if (!Array.isArray(model.elements) || !Array.isArray(model.relationships)) {
    errors.push('"model.elements" y "model.relationships" deben ser arreglos.');
    return { isValid: false, errors };
  }

  if (
    !hasPlainObjectPrototype(view.elements) ||
    !hasPlainObjectPrototype(view.relationships) ||
    !Array.isArray(view.drawOrder)
  ) {
    errors.push(
      '"view.elements" y "view.relationships" deben ser mapas de objetos planos y "view.drawOrder" debe ser un arreglo.'
    );
    return { isValid: false, errors };
  }

  const catalogElements = activeCatalog.elements || {};
  const catalogRelationships = activeCatalog.relationships || {};

  const globalIds = new Set();
  const elementsById = new Map();

  for (const el of model.elements) {
    if (!el || typeof el !== 'object') {
      errors.push('Cada entrada de "model.elements" debe ser un objeto.');
      continue;
    }

    if (!isSafeIdentifier(el.id)) {
      const reason =
        typeof el.id === 'string' && RESERVED_PROTOTYPE_KEYS.has(el.id)
          ? `Identificador de elemento reservado o prohibido: "${el.id}".`
          : 'Todo elemento debe tener un "id" string no vacío y sin espacios extremos.';
      errors.push(reason);
      continue;
    }

    if (globalIds.has(el.id)) {
      errors.push(`ID duplicado detectado en el documento: "${el.id}".`);
      continue;
    }
    globalIds.add(el.id);
    elementsById.set(el.id, el);

    const elementDescriptor = Object.prototype.hasOwnProperty.call(catalogElements, el.type)
      ? catalogElements[el.type]
      : null;

    if (!elementDescriptor) {
      errors.push(
        `El tipo de elemento "${String(el.type)}" (${el.id}) no pertenece al catálogo "${candidate.diagramType}".`
      );
    } else if (typeof elementDescriptor.validateElement === 'function') {
      errors.push(...elementDescriptor.validateElement(el));
    }

    const viewBox = getOwnMapValue(view.elements, el.id);
    if (!viewBox || typeof viewBox !== 'object') {
      errors.push(`Falta la geometría visual en "view.elements" para el elemento "${el.id}".`);
    } else if (
      !isFiniteNumber(viewBox.x) ||
      !isFiniteNumber(viewBox.y) ||
      !isFiniteNumber(viewBox.width) ||
      !isFiniteNumber(viewBox.height) ||
      viewBox.width <= 0 ||
      viewBox.height <= 0
    ) {
      errors.push(
        `Geometría inválida en "view.elements[${el.id}]": x, y deben ser números finitos y width, height > 0.`
      );
    } else if (elementDescriptor) {
      const requiredMin = resolveDescriptorMinSize(elementDescriptor, el);
      if (viewBox.width < requiredMin.width || viewBox.height < requiredMin.height) {
        errors.push(
          `Geometría insuficiente en "view.elements[${el.id}]" (${el.type}): se requieren al menos ${requiredMin.width}×${requiredMin.height} px, pero se recibió ${viewBox.width}×${viewBox.height} px.`
        );
      }
    }
  }

  for (const viewElId of Object.keys(view.elements)) {
    if (!isSafeIdentifier(viewElId)) {
      errors.push(`"view.elements" contiene una clave reservada o inválida: "${viewElId}".`);
    } else if (!elementsById.has(viewElId)) {
      errors.push(
        `"view.elements" contiene un ID huérfano inexistente en "model.elements": "${viewElId}".`
      );
    }
  }

  // Validación de drawOrder (1 a 1 con model.elements)
  const drawOrderSeen = new Set();
  const drawOrderIndex = new Map();
  for (let i = 0; i < view.drawOrder.length; i += 1) {
    const id = view.drawOrder[i];
    if (drawOrderSeen.has(id)) {
      errors.push(`ID duplicado en "view.drawOrder": "${id}".`);
    }
    drawOrderSeen.add(id);
    drawOrderIndex.set(id, i);
    if (!elementsById.has(id)) {
      errors.push(`"view.drawOrder" referencia un elemento inexistente: "${id}".`);
    }
  }

  for (const elId of elementsById.keys()) {
    if (!drawOrderSeen.has(elId)) {
      errors.push(`El elemento "${elId}" no figura en "view.drawOrder".`);
    }
  }

  // Validación de contención semántica (parentId), ausencia de ciclos y orden padre->hijo en drawOrder
  for (const el of elementsById.values()) {
    if (el.parentId !== null && el.parentId !== undefined) {
      if (!elementsById.has(el.parentId)) {
        errors.push(
          `El elemento "${el.id}" tiene un parentId inexistente: "${String(el.parentId)}".`
        );
        continue;
      }

      if (el.parentId === el.id) {
        errors.push(`El elemento "${el.id}" no puede ser contenedor de sí mismo.`);
        continue;
      }

      // Comprobación de ciclos en parentId
      const visited = new Set([el.id]);
      let cursor = elementsById.get(el.parentId);
      while (cursor) {
        if (visited.has(cursor.id)) {
          errors.push(`Ciclo de contención semántica detectado involucrando al elemento "${el.id}".`);
          break;
        }
        visited.add(cursor.id);
        cursor = cursor.parentId ? elementsById.get(cursor.parentId) : null;
      }

      // Comprobación de reglas de contención delegada a los descriptores del catálogo activo
      const parentEl = elementsById.get(el.parentId);
      if (parentEl) {
        const parentDescriptor = Object.prototype.hasOwnProperty.call(
          catalogElements,
          parentEl.type
        )
          ? catalogElements[parentEl.type]
          : null;
        const childDescriptor = Object.prototype.hasOwnProperty.call(catalogElements, el.type)
          ? catalogElements[el.type]
          : null;

        if (parentDescriptor && childDescriptor) {
          const parentAllowsChild =
            Array.isArray(parentDescriptor.allowedChildTypes) &&
            parentDescriptor.allowedChildTypes.includes(el.type);
          const childAllowsParent =
            Array.isArray(childDescriptor.allowedParentTypes) &&
            childDescriptor.allowedParentTypes.includes(parentEl.type);

          if (!parentAllowsChild || !childAllowsParent) {
            errors.push(
              `Contención inválida en "${candidate.diagramType}": "${parentEl.type}" ("${parentEl.id}") no puede contener a "${el.type}" ("${el.id}").`
            );
          }
        }

        // Verificar que el contenedor se dibuje antes que el hijo
        if (
          drawOrderIndex.has(parentEl.id) &&
          drawOrderIndex.has(el.id) &&
          drawOrderIndex.get(parentEl.id) > drawOrderIndex.get(el.id)
        ) {
          errors.push(
            `Orden de dibujo inválido en "view.drawOrder": el contenedor "${parentEl.id}" debe dibujarse antes que su hijo "${el.id}".`
          );
        }
      }
    }
  }

  // Primera pasada de relaciones para registrar sus IDs y validar unicidad global
  const relationshipsById = new Map();
  for (const rel of model.relationships) {
    if (!rel || typeof rel !== 'object') {
      errors.push('Cada entrada de "model.relationships" debe ser un objeto.');
      continue;
    }

    if (!isSafeIdentifier(rel.id)) {
      const reason =
        typeof rel.id === 'string' && RESERVED_PROTOTYPE_KEYS.has(rel.id)
          ? `Identificador de relación reservado o prohibido: "${rel.id}".`
          : 'Toda relación debe tener un "id" string no vacío y sin espacios extremos.';
      errors.push(reason);
      continue;
    }

    if (globalIds.has(rel.id)) {
      errors.push(`ID duplicado detectado en relaciones: "${rel.id}".`);
      continue;
    }
    globalIds.add(rel.id);
    relationshipsById.set(rel.id, rel);

    if (!Object.prototype.hasOwnProperty.call(catalogRelationships, rel.type)) {
      errors.push(
        `El tipo de relación "${String(rel.type)}" (${rel.id}) no pertenece al catálogo "${candidate.diagramType}".`
      );
    }

    const relView = getOwnMapValue(view.relationships, rel.id);
    if (!relView || typeof relView !== 'object' || !Array.isArray(relView.waypoints)) {
      errors.push(
        `Falta la entrada visual "view.relationships[${rel.id}]" con arreglo "waypoints".`
      );
    } else {
      for (const wp of relView.waypoints) {
        if (!wp || !isFiniteNumber(wp.x) || !isFiniteNumber(wp.y)) {
          errors.push(`Waypoint inválido en "view.relationships[${rel.id}]".`);
        }
      }
    }
  }

  for (const viewRelId of Object.keys(view.relationships)) {
    if (!isSafeIdentifier(viewRelId)) {
      errors.push(`"view.relationships" contiene una clave reservada o inválida: "${viewRelId}".`);
    } else if (!relationshipsById.has(viewRelId)) {
      errors.push(
        `"view.relationships" contiene un ID huérfano inexistente en "model.relationships": "${viewRelId}".`
      );
    }
  }

  // Segunda pasada de relaciones para validar referencias sourceId / targetId (incluido CommentLink)
  for (const rel of relationshipsById.values()) {
    if (!isNonEmptyString(rel.sourceId) || !isNonEmptyString(rel.targetId)) {
      errors.push(`La relación "${rel.id}" requiere "sourceId" y "targetId" no vacíos.`);
      continue;
    }

    if (rel.sourceId === rel.targetId) {
      errors.push(
        `La relación "${rel.id}" (${rel.type}) no puede tener el mismo origen y destino ("${rel.sourceId}").`
      );
      continue;
    }

    if (rel.type === 'CommentLink') {
      const sourceComment = elementsById.get(rel.sourceId);
      if (!sourceComment || sourceComment.type !== 'Comment') {
        errors.push(
          `En CommentLink ("${rel.id}"), "sourceId" debe referenciar un elemento Comment existente.`
        );
      }

      const targetElement = elementsById.get(rel.targetId);
      const targetRelationship = relationshipsById.get(rel.targetId);

      if (!targetElement && !targetRelationship) {
        errors.push(
          `En CommentLink ("${rel.id}"), "targetId" ("${rel.targetId}") no referencia ningún elemento ni relación existente.`
        );
      } else if (targetRelationship && targetRelationship.type === 'CommentLink') {
        errors.push(
          `En CommentLink ("${rel.id}"), "targetId" no puede apuntar a otro CommentLink ("${rel.targetId}").`
        );
      }
      continue;
    }

    // Relaciones UML semánticas: ambos extremos deben ser elementos en model.elements
    const sourceEl = elementsById.get(rel.sourceId);
    const targetEl = elementsById.get(rel.targetId);

    if (!sourceEl) {
      errors.push(
        `La relación "${rel.id}" (${rel.type}) referencia un sourceId inexistente en model.elements: "${rel.sourceId}".`
      );
    }
    if (!targetEl) {
      errors.push(
        `La relación "${rel.id}" (${rel.type}) referencia un targetId inexistente en model.elements: "${rel.targetId}".`
      );
    }

    // Validación de compatibilidad de extremos delegada al descriptor de la relación en el catálogo
    const relDescriptor = Object.prototype.hasOwnProperty.call(catalogRelationships, rel.type)
      ? catalogRelationships[rel.type]
      : null;

    if (
      sourceEl &&
      targetEl &&
      relDescriptor &&
      typeof relDescriptor.validateEndpoints === 'function'
    ) {
      errors.push(...relDescriptor.validateEndpoints(sourceEl, targetEl, rel));
    }
  }

  // Validación global delegada al catálogo activo (p. ej. ciclos dirigidos en UML-04)
  if (typeof activeCatalog.validateModel === 'function') {
    const catalogErrors = activeCatalog.validateModel(model);
    if (Array.isArray(catalogErrors)) {
      errors.push(...catalogErrors);
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Crea un documento vacío válido para el tipo de diagrama indicado.
 *
 * @param {object} [options]
 * @param {'use-case' | 'deployment'} [options.diagramType='use-case']
 * @param {string} [options.id='diagram-1']
 * @param {string} [options.name='Diagrama sin título']
 * @returns {object}
 */
export function createEmptyDocumentSnapshot({
  diagramType = 'use-case',
  id = 'diagram-1',
  name = 'Diagrama sin título'
} = {}) {
  if (!VALID_DIAGRAM_TYPES.includes(diagramType)) {
    throw new Error(`Tipo de diagrama inválido: "${String(diagramType)}".`);
  }

  return {
    schemaVersion: SUPPORTED_SCHEMA_VERSION,
    id,
    name,
    diagramType,
    model: {
      elements: [],
      relationships: []
    },
    view: {
      elements: {},
      relationships: {},
      drawOrder: []
    }
  };
}

/**
 * Contenedor del estado semántico y visual del diagrama activo con garantías atómicas.
 */
export class DiagramModel {
  /**
   * @param {object} [initialDocument] Documento inicial opcional.
   * @param {object} [catalog] Catálogo inyectado del modo correspondiente.
   */
  constructor(initialDocument = null, catalog = null) {
    const docToLoad = initialDocument || createEmptyDocumentSnapshot();
    const resolvedCatalog = resolveCatalog(docToLoad.diagramType, catalog);
    const validation = validateDocumentSnapshot(docToLoad, resolvedCatalog);
    if (!validation.isValid) {
      throw new Error(
        `Documento inicial inválido en DiagramModel: ${validation.errors.join(' | ')}`
      );
    }
    this._document = clonePlainData(docToLoad);
    this._catalog = resolvedCatalog;
    this._idSequence = 1;
  }

  /**
   * Instancia un DiagramModel a partir de un objeto JSON validado.
   * @param {object} jsonDocument
   * @param {object} [catalog]
   * @returns {DiagramModel}
   */
  static fromJSON(jsonDocument, catalog = null) {
    return new DiagramModel(jsonDocument, catalog);
  }

  /**
   * Devuelve el catálogo activo inyectado en el modelo.
   * @returns {object | null}
   */
  getCatalog() {
    return this._catalog || resolveCatalog(this._document.diagramType, null);
  }

  /**
   * Genera un identificador único estable que no colisiona con ningún elemento ni relación existente.
   * @param {string} [prefix='el']
   * @returns {string}
   */
  generateUniqueId(prefix = 'el') {
    const usedIds = new Set([
      ...this._document.model.elements.map((e) => e.id),
      ...this._document.model.relationships.map((r) => r.id)
    ]);

    let candidateId = `${prefix}-${this._idSequence}`;
    while (usedIds.has(candidateId)) {
      this._idSequence += 1;
      candidateId = `${prefix}-${this._idSequence}`;
    }
    this._idSequence += 1;
    return candidateId;
  }

  /**
   * Reemplaza atómicamente el documento actual solo si el candidato supera todas las validaciones.
   * Si es inválido, el documento previo permanece intacto (RNF-04).
   *
   * @param {object} candidateDocument
   * @param {object} [catalog]
   * @returns {{ isValid: boolean, errors: string[] }}
   */
  loadDocument(candidateDocument, catalog = null) {
    const targetType = candidateDocument && candidateDocument.diagramType;
    const resolvedCatalog = resolveCatalog(targetType, catalog);
    const validation = validateDocumentSnapshot(candidateDocument, resolvedCatalog);
    if (!validation.isValid) {
      return validation;
    }
    this._document = clonePlainData(candidateDocument);
    this._catalog = resolvedCatalog;
    return { isValid: true, errors: [] };
  }

  /**
   * Inserta atómicamente un nuevo elemento UML en el documento validando el candidato completo.
   *
   * @param {{
   *   id?: string,
   *   type: string,
   *   name?: string,
   *   parentId?: string | null,
   *   properties?: object,
   *   x: number,
   *   y: number,
   *   width?: number,
   *   height?: number
   * }} payload
   * @returns {{ isValid: boolean, errors: string[], elementId?: string }}
   */
  addElement(payload) {
    if (!payload || typeof payload !== 'object') {
      return { isValid: false, errors: ['Datos de inserción de elemento inválidos.'] };
    }

    const catalog = this.getCatalog();
    const descriptor =
      catalog && catalog.elements && Object.prototype.hasOwnProperty.call(catalog.elements, payload.type)
        ? catalog.elements[payload.type]
        : null;

    if (!descriptor) {
      return {
        isValid: false,
        errors: [
          `El tipo de elemento "${String(payload.type)}" no pertenece al catálogo "${this._document.diagramType}".`
        ]
      };
    }

    const sameTypeCount =
      this._document.model.elements.filter((el) => el.type === payload.type).length + 1;
    const defaults =
      typeof descriptor.createDefaultState === 'function'
        ? descriptor.createDefaultState(sameTypeCount)
        : { name: `${payload.type} ${sameTypeCount}`, properties: {} };

    const defaultSize = descriptor.defaultSize || { width: 140, height: 70 };
    let elementId;
    if (payload.id !== undefined && payload.id !== null) {
      if (!isSafeIdentifier(payload.id)) {
        return {
          isValid: false,
          errors: [
            `Identificador de elemento inválido o reservado: "${String(payload.id)}".`
          ]
        };
      }
      elementId = payload.id;
    } else {
      elementId = this.generateUniqueId(payload.type.toLowerCase());
    }

    const newElement = {
      id: elementId,
      type: payload.type,
      name: payload.name !== undefined ? String(payload.name) : defaults.name,
      parentId: payload.parentId !== undefined ? payload.parentId : null,
      properties:
        payload.properties !== undefined
          ? clonePlainData(payload.properties)
          : clonePlainData(defaults.properties)
    };

    const requiredMin = resolveDescriptorMinSize(descriptor, newElement);
    const width = Math.max(
      isFiniteNumber(payload.width) ? Math.round(payload.width) : defaultSize.width,
      requiredMin.width
    );
    const height = Math.max(
      isFiniteNumber(payload.height) ? Math.round(payload.height) : defaultSize.height,
      requiredMin.height
    );
    const x = isFiniteNumber(payload.x) ? Math.round(payload.x) : 40;
    const y = isFiniteNumber(payload.y) ? Math.round(payload.y) : 40;

    const candidate = clonePlainData(this._document);
    candidate.model.elements.push(newElement);

    setOwnMapValue(candidate.view.elements, elementId, { x, y, width, height });
    candidate.view.drawOrder.push(elementId);
    candidate.view.drawOrder = normalizeDrawOrderForContainment(
      candidate.model.elements,
      candidate.view.drawOrder
    );

    const validation = validateDocumentSnapshot(candidate, catalog);
    if (!validation.isValid) {
      return validation;
    }

    this._document = candidate;
    return { isValid: true, errors: [], elementId };
  }

  /**
   * Inserta atómicamente una nueva relación UML en el documento validando extremos,
   * contrato `CMN-REL-01`, `DP-03` y reglas del catálogo activo antes de confirmar (CAN-06, RNF-04).
   *
   * @param {{
   *   id?: string,
   *   type: string,
   *   sourceId: string,
   *   targetId: string,
   *   name?: string,
   *   properties?: object,
   *   waypoints?: Array<{ x: number, y: number }>
   * }} payload
   * @returns {{ isValid: boolean, errors: string[], relationshipId?: string }}
   */
  addRelationship(payload) {
    if (!payload || typeof payload !== 'object') {
      return { isValid: false, errors: ['Datos de inserción de relación inválidos.'] };
    }

    const catalog = this.getCatalog();
    const descriptor =
      catalog &&
      catalog.relationships &&
      Object.prototype.hasOwnProperty.call(catalog.relationships, payload.type)
        ? catalog.relationships[payload.type]
        : null;

    if (!descriptor) {
      return {
        isValid: false,
        errors: [
          `El tipo de relación "${String(payload.type)}" no pertenece al catálogo "${this._document.diagramType}".`
        ]
      };
    }

    let relationshipId;
    if (payload.id !== undefined && payload.id !== null) {
      if (!isSafeIdentifier(payload.id)) {
        return {
          isValid: false,
          errors: [
            `Identificador de relación inválido o reservado: "${String(payload.id)}".`
          ]
        };
      }
      relationshipId = payload.id;
    } else {
      relationshipId = this.generateUniqueId('rel');
    }

    if (!isSafeIdentifier(payload.sourceId) || !isSafeIdentifier(payload.targetId)) {
      return {
        isValid: false,
        errors: ['La relación requiere "sourceId" y "targetId" válidos y no vacíos.']
      };
    }

    const candidate = clonePlainData(this._document);
    candidate.model.relationships.push({
      id: relationshipId,
      type: payload.type,
      sourceId: payload.sourceId,
      targetId: payload.targetId,
      name: payload.name !== undefined ? String(payload.name) : '',
      properties:
        payload.properties !== undefined &&
        payload.properties !== null &&
        typeof payload.properties === 'object'
          ? clonePlainData(payload.properties)
          : {}
    });

    const waypoints = Array.isArray(payload.waypoints) ? clonePlainData(payload.waypoints) : [];
    setOwnMapValue(candidate.view.relationships, relationshipId, { waypoints });

    const validation = validateDocumentSnapshot(candidate, catalog);
    if (!validation.isValid) {
      return validation;
    }

    this._document = candidate;
    return { isValid: true, errors: [], relationshipId };
  }

  /**
   * Ejecuta atómicamente la actualización de un elemento y la inserción de una relación
   * en una sola transacción validada (p. ej. crear ExtensionPoint + Extend en DP-03).
   * Si cualquiera de las dos partes es inválida, el documento previo permanece intacto.
   *
   * @param {string} elementId
   * @param {{ name?: string, parentId?: string | null, properties?: object }} elementChanges
   * @param {object} relationshipPayload
   * @returns {{ isValid: boolean, errors: string[], relationshipId?: string }}
   */
  updateElementAndAddRelationship(elementId, elementChanges, relationshipPayload) {
    if (
      !elementChanges ||
      typeof elementChanges !== 'object' ||
      !relationshipPayload ||
      typeof relationshipPayload !== 'object'
    ) {
      return {
        isValid: false,
        errors: ['Datos inválidos para la transacción atómica elemento + relación.']
      };
    }

    const catalog = this.getCatalog();
    const relDescriptor =
      catalog &&
      catalog.relationships &&
      Object.prototype.hasOwnProperty.call(catalog.relationships, relationshipPayload.type)
        ? catalog.relationships[relationshipPayload.type]
        : null;

    if (!relDescriptor) {
      return {
        isValid: false,
        errors: [
          `El tipo de relación "${String(relationshipPayload.type)}" no pertenece al catálogo "${this._document.diagramType}".`
        ]
      };
    }

    const candidate = clonePlainData(this._document);
    const targetEl = candidate.model.elements.find((el) => el.id === elementId);
    if (!targetEl) {
      return {
        isValid: false,
        errors: [`No se encontró el elemento "${String(elementId)}" en el modelo.`]
      };
    }

    if (elementChanges.name !== undefined) {
      targetEl.name = String(elementChanges.name).trim();
    }
    if (elementChanges.parentId !== undefined) {
      targetEl.parentId =
        elementChanges.parentId === null || elementChanges.parentId === ''
          ? null
          : String(elementChanges.parentId);
    }
    if (elementChanges.properties !== undefined && typeof elementChanges.properties === 'object') {
      targetEl.properties = {
        ...(targetEl.properties || {}),
        ...clonePlainData(elementChanges.properties)
      };
    }

    candidate.view.drawOrder = normalizeDrawOrderForContainment(
      candidate.model.elements,
      candidate.view.drawOrder
    );

    let relationshipId;
    if (relationshipPayload.id !== undefined && relationshipPayload.id !== null) {
      if (!isSafeIdentifier(relationshipPayload.id)) {
        return {
          isValid: false,
          errors: [
            `Identificador de relación inválido o reservado: "${String(relationshipPayload.id)}".`
          ]
        };
      }
      relationshipId = relationshipPayload.id;
    } else {
      relationshipId = this.generateUniqueId('rel');
    }

    if (
      !isSafeIdentifier(relationshipPayload.sourceId) ||
      !isSafeIdentifier(relationshipPayload.targetId)
    ) {
      return {
        isValid: false,
        errors: ['La relación requiere "sourceId" y "targetId" válidos y no vacíos.']
      };
    }

    candidate.model.relationships.push({
      id: relationshipId,
      type: relationshipPayload.type,
      sourceId: relationshipPayload.sourceId,
      targetId: relationshipPayload.targetId,
      name: relationshipPayload.name !== undefined ? String(relationshipPayload.name) : '',
      properties:
        relationshipPayload.properties !== undefined &&
        relationshipPayload.properties !== null &&
        typeof relationshipPayload.properties === 'object'
          ? clonePlainData(relationshipPayload.properties)
          : {}
    });

    const waypoints = Array.isArray(relationshipPayload.waypoints)
      ? clonePlainData(relationshipPayload.waypoints)
      : [];
    setOwnMapValue(candidate.view.relationships, relationshipId, { waypoints });

    const validation = validateDocumentSnapshot(candidate, catalog);
    if (!validation.isValid) {
      return validation;
    }

    this._document = candidate;
    return { isValid: true, errors: [], relationshipId };
  }

  /**
   * Obtiene todos los IDs de descendientes semánticos (`parentId` directo o indirecto) de un contenedor.
   *
   * @param {string} containerId
   * @returns {string[]}
   */
  getDescendantIds(containerId) {
    const childrenByParent = new Map();
    for (const el of this._document.model.elements) {
      if (el.parentId) {
        if (!childrenByParent.has(el.parentId)) {
          childrenByParent.set(el.parentId, []);
        }
        childrenByParent.get(el.parentId).push(el.id);
      }
    }

    const descendants = [];
    const queue = [...(childrenByParent.get(containerId) || [])];
    const visited = new Set();

    while (queue.length > 0) {
      const currentId = queue.shift();
      if (visited.has(currentId)) {
        continue;
      }
      visited.add(currentId);
      descendants.push(currentId);
      const nextChildren = childrenByParent.get(currentId) || [];
      queue.push(...nextChildren);
    }

    return descendants;
  }

  /**
   * Desplaza atómicamente un elemento y todos sus descendientes semánticos por `(dx, dy)`.
   * No modifica `parentId` por coincidencia visual de coordenadas (CAN-04, CAN-08).
   *
   * @param {string} elementId
   * @param {{ dx: number, dy: number }} delta
   * @returns {{ isValid: boolean, errors: string[], movedIds?: string[] }}
   */
  moveElement(elementId, delta) {
    if (!delta || !isFiniteNumber(delta.dx) || !isFiniteNumber(delta.dy)) {
      return { isValid: false, errors: ['El desplazamiento (dx, dy) debe contener números finitos.'] };
    }

    const targetEl = this.getElementById(elementId);
    if (!targetEl) {
      return { isValid: false, errors: [`No existe el elemento a mover: "${String(elementId)}".`] };
    }

    const dx = Math.round(delta.dx);
    const dy = Math.round(delta.dy);
    const affectedIds = [elementId, ...this.getDescendantIds(elementId)];

    const candidate = clonePlainData(this._document);
    for (const id of affectedIds) {
      const box = getOwnMapValue(candidate.view.elements, id);
      if (box) {
        box.x = Math.round(box.x + dx);
        box.y = Math.round(box.y + dy);
      }
    }

    const validation = validateDocumentSnapshot(candidate, this.getCatalog());
    if (!validation.isValid) {
      return validation;
    }

    this._document = candidate;
    return { isValid: true, errors: [], movedIds: affectedIds };
  }

  /**
   * Redimensiona atómicamente un elemento redimensionable verificando las dimensiones mínimas
   * definidas en su descriptor de catálogo (CAN-05).
   *
   * @param {string} elementId
   * @param {{ x: number, y: number, width: number, height: number }} newBox
   * @returns {{ isValid: boolean, errors: string[] }}
   */
  resizeElement(elementId, newBox) {
    const element = this.getElementById(elementId);
    if (!element) {
      return {
        isValid: false,
        errors: [`No existe el elemento a redimensionar: "${String(elementId)}".`]
      };
    }

    if (
      !newBox ||
      !isFiniteNumber(newBox.x) ||
      !isFiniteNumber(newBox.y) ||
      !isFiniteNumber(newBox.width) ||
      !isFiniteNumber(newBox.height)
    ) {
      return {
        isValid: false,
        errors: ['La caja de redimensionamiento requiere coordenadas y dimensiones numéricas finitas.']
      };
    }

    const catalog = this.getCatalog();
    const descriptor = catalog && catalog.elements ? catalog.elements[element.type] : null;
    if (descriptor && descriptor.resizable === false) {
      return {
        isValid: false,
        errors: [`El tipo de elemento "${element.type}" no admite redimensionamiento manual.`]
      };
    }

    const minSize = resolveDescriptorMinSize(descriptor, element);
    if (newBox.width < minSize.width || newBox.height < minSize.height) {
      return {
        isValid: false,
        errors: [
          `Dimensiones inferiores al mínimo permitido para ${element.type} (${minSize.width}×${minSize.height} px).`
        ]
      };
    }

    const candidate = clonePlainData(this._document);
    setOwnMapValue(candidate.view.elements, elementId, {
      x: Math.round(newBox.x),
      y: Math.round(newBox.y),
      width: Math.round(newBox.width),
      height: Math.round(newBox.height)
    });

    const validation = validateDocumentSnapshot(candidate, catalog);
    if (!validation.isValid) {
      return validation;
    }

    this._document = candidate;
    return { isValid: true, errors: [] };
  }

  /**
   * Actualiza atómicamente el nombre, contención semántica (`parentId`) y/o propiedades
   * de un elemento, validando la consistencia completa del documento antes de confirmar (CAN-09).
   *
   * @param {string} elementId
   * @param {{ name?: string, parentId?: string | null, properties?: object }} changes
   * @returns {{ isValid: boolean, errors: string[] }}
   */
  updateElement(elementId, changes) {
    if (!changes || typeof changes !== 'object') {
      return { isValid: false, errors: ['Cambios de elemento inválidos.'] };
    }

    const candidate = clonePlainData(this._document);
    const element = candidate.model.elements.find((el) => el.id === elementId);
    if (!element) {
      return {
        isValid: false,
        errors: [`No se encontró el elemento "${String(elementId)}" en el modelo.`]
      };
    }

    if (changes.name !== undefined) {
      element.name = String(changes.name).trim();
    }

    if (changes.parentId !== undefined) {
      element.parentId =
        changes.parentId === null || changes.parentId === '' ? null : String(changes.parentId);
    }

    if (changes.properties !== undefined && typeof changes.properties === 'object') {
      element.properties = {
        ...(element.properties || {}),
        ...clonePlainData(changes.properties)
      };
    }

    const catalog = this.getCatalog();
    const descriptor =
      catalog && catalog.elements ? getOwnMapValue(catalog.elements, element.type) : null;
    const requiredMin = resolveDescriptorMinSize(descriptor, element);
    const currentViewBox = getOwnMapValue(candidate.view.elements, elementId);
    if (
      currentViewBox &&
      (currentViewBox.width < requiredMin.width || currentViewBox.height < requiredMin.height)
    ) {
      setOwnMapValue(candidate.view.elements, elementId, {
        ...currentViewBox,
        width: Math.max(currentViewBox.width, requiredMin.width),
        height: Math.max(currentViewBox.height, requiredMin.height)
      });
    }

    candidate.view.drawOrder = normalizeDrawOrderForContainment(
      candidate.model.elements,
      candidate.view.drawOrder
    );

    const validation = validateDocumentSnapshot(candidate, catalog);
    if (!validation.isValid) {
      return validation;
    }

    this._document = candidate;
    return { isValid: true, errors: [] };
  }

  /**
   * Elimina atómicamente un elemento aplicando una política explícita para su descendencia
   * y limpiando en cascada todas sus relaciones incidentes y enlaces `CommentLink` (CAN-10).
   *
   * Políticas de descendencia soportadas (`options.descendantPolicy`):
   * - `'detach'` (por defecto): desacopla los hijos directos promoviéndolos a la raíz (`parentId: null`),
   *   conservando sus figuras y relaciones propias.
   * - `'cascade'`: elimina recursivamente todos los descendientes semánticos y sus relaciones incidentes.
   *
   * @param {string} elementId
   * @param {{ descendantPolicy?: 'detach' | 'cascade' }} [options]
   * @returns {{
   *   isValid: boolean,
   *   errors: string[],
   *   removedElementIds?: string[],
   *   removedRelationshipIds?: string[]
   * }}
   */
  removeElement(elementId, { descendantPolicy = 'detach' } = {}) {
    const targetEl = this.getElementById(elementId);
    if (!targetEl) {
      return {
        isValid: false,
        errors: [`No existe el elemento a eliminar: "${String(elementId)}".`]
      };
    }

    if (descendantPolicy !== 'detach' && descendantPolicy !== 'cascade') {
      return {
        isValid: false,
        errors: [`Política de descendencia no válida: "${String(descendantPolicy)}".`]
      };
    }

    const candidate = clonePlainData(this._document);
    const removedElementIds = new Set([elementId]);

    if (descendantPolicy === 'cascade') {
      for (const descId of this.getDescendantIds(elementId)) {
        removedElementIds.add(descId);
      }
    } else {
      // Política 'detach': los hijos directos pasan a la raíz (parentId: null)
      for (const el of candidate.model.elements) {
        if (el.parentId === elementId) {
          el.parentId = null;
        }
      }
    }

    // 1. Identificar relaciones directamente incidentes a los elementos eliminados
    const removedRelationshipIds = new Set();
    for (const rel of candidate.model.relationships) {
      if (removedElementIds.has(rel.sourceId) || removedElementIds.has(rel.targetId)) {
        removedRelationshipIds.add(rel.id);
      }
    }

    // 2. Identificar CommentLinks que apunten a cualquiera de las relaciones eliminadas
    let addedInPass = true;
    while (addedInPass) {
      addedInPass = false;
      for (const rel of candidate.model.relationships) {
        if (
          !removedRelationshipIds.has(rel.id) &&
          (removedRelationshipIds.has(rel.sourceId) || removedRelationshipIds.has(rel.targetId))
        ) {
          removedRelationshipIds.add(rel.id);
          addedInPass = true;
        }
      }
    }

    // 3. Limpiar elementos y relaciones en model y view
    candidate.model.elements = candidate.model.elements.filter(
      (el) => !removedElementIds.has(el.id)
    );
    candidate.model.relationships = candidate.model.relationships.filter(
      (rel) => !removedRelationshipIds.has(rel.id)
    );

    for (const remElId of removedElementIds) {
      deleteOwnMapValue(candidate.view.elements, remElId);
    }
    candidate.view.drawOrder = candidate.view.drawOrder.filter(
      (id) => !removedElementIds.has(id)
    );

    for (const remRelId of removedRelationshipIds) {
      deleteOwnMapValue(candidate.view.relationships, remRelId);
    }

    const validation = validateDocumentSnapshot(candidate, this.getCatalog());
    if (!validation.isValid) {
      return validation;
    }

    this._document = candidate;
    return {
      isValid: true,
      errors: [],
      removedElementIds: [...removedElementIds],
      removedRelationshipIds: [...removedRelationshipIds]
    };
  }

  /**
   * Elimina atómicamente una relación por ID, junto con cualquier `CommentLink` que la tenga como destino.
   *
   * @param {string} relationshipId
   * @returns {{ isValid: boolean, errors: string[], removedRelationshipIds?: string[] }}
   */
  removeRelationship(relationshipId) {
    const existing = this.getRelationshipById(relationshipId);
    if (!existing) {
      return {
        isValid: false,
        errors: [`No existe la relación a eliminar: "${String(relationshipId)}".`]
      };
    }

    const candidate = clonePlainData(this._document);
    const removedRelationshipIds = new Set([relationshipId]);

    for (const rel of candidate.model.relationships) {
      if (rel.type === 'CommentLink' && rel.targetId === relationshipId) {
        removedRelationshipIds.add(rel.id);
      }
    }

    candidate.model.relationships = candidate.model.relationships.filter(
      (rel) => !removedRelationshipIds.has(rel.id)
    );
    for (const remId of removedRelationshipIds) {
      deleteOwnMapValue(candidate.view.relationships, remId);
    }

    const validation = validateDocumentSnapshot(candidate, this.getCatalog());
    if (!validation.isValid) {
      return validation;
    }

    this._document = candidate;
    return {
      isValid: true,
      errors: [],
      removedRelationshipIds: [...removedRelationshipIds]
    };
  }

  /**
   * Devuelve el tipo de diagrama activo ('use-case' | 'deployment').
   * @returns {'use-case' | 'deployment'}
   */
  getDiagramType() {
    return this._document.diagramType;
  }

  /**
   * Devuelve metadatos básicos del documento activo.
   * @returns {{ schemaVersion: number, id: string, name: string, diagramType: string }}
   */
  getMetadata() {
    return {
      schemaVersion: this._document.schemaVersion,
      id: this._document.id,
      name: this._document.name,
      diagramType: this._document.diagramType
    };
  }

  /**
   * Devuelve una copia profunda plana del documento completo (apta para serialización JSON).
   * @returns {object}
   */
  toJSON() {
    return clonePlainData(this._document);
  }

  /**
   * Devuelve los elementos en el orden exacto de dibujo (view.drawOrder),
   * combinando de forma segura sus datos semánticos y su caja visual.
   *
   * @returns {Array<{ element: object, view: { x: number, y: number, width: number, height: number } }>}
   */
  getElementsInDrawOrder() {
    const byId = new Map(this._document.model.elements.map((el) => [el.id, el]));
    return this._document.view.drawOrder.map((id) => ({
      element: clonePlainData(byId.get(id)),
      view: clonePlainData(getOwnMapValue(this._document.view.elements, id))
    }));
  }

  /**
   * Devuelve todas las relaciones del documento junto con su información visual.
   *
   * @returns {Array<{ relationship: object, view: { waypoints: Array<{ x: number, y: number }> } }>}
   */
  getRelationships() {
    return this._document.model.relationships.map((rel) => ({
      relationship: clonePlainData(rel),
      view: clonePlainData(getOwnMapValue(this._document.view.relationships, rel.id))
    }));
  }

  /**
   * Busca un elemento por su ID.
   * @param {string} id
   * @returns {object | null}
   */
  getElementById(id) {
    const found = this._document.model.elements.find((el) => el.id === id);
    return found ? clonePlainData(found) : null;
  }

  /**
   * Obtiene la caja visual de un elemento por su ID.
   * @param {string} id
   * @returns {{ x: number, y: number, width: number, height: number } | null}
   */
  getElementView(id) {
    const viewBox = getOwnMapValue(this._document.view.elements, id);
    return viewBox ? clonePlainData(viewBox) : null;
  }

  /**
   * Busca una relación por su ID.
   * @param {string} id
   * @returns {object | null}
   */
  getRelationshipById(id) {
    const found = this._document.model.relationships.find((rel) => rel.id === id);
    return found ? clonePlainData(found) : null;
  }

  /**
   * Obtiene la vista de una relación por su ID.
   * @param {string} id
   * @returns {{ waypoints: Array<{ x: number, y: number }> } | null}
   */
  getRelationshipView(id) {
    const relView = getOwnMapValue(this._document.view.relationships, id);
    return relView ? clonePlainData(relView) : null;
  }

  /**
   * Devuelve conteos rápidos del modelo actual.
   * @returns {{ elementsCount: number, relationshipsCount: number }}
   */
  getCounts() {
    return {
      elementsCount: this._document.model.elements.length,
      relationshipsCount: this._document.model.relationships.length
    };
  }
}
