/**
 * Validador semántico especializado para Diagramas UML de Despliegue — Incremento UML-05.
 *
 * Responsabilidad única (SRP): aplicar reglas globales de OMG UML 2.5.1 (Cláusulas 9 y 19)
 * y decisiones del proyecto (DP-01, DP-04, DEP-REL-03) sobre el modelo semántico, diferenciando:
 * - Errores estructurales bloqueantes (`validateDeploymentModel` → rechazo atómico).
 * - Advertencias de modelado no bloqueantes (`evaluateDeploymentWarnings` → sugerencias didácticas).
 *
 * Módulo puro sin dependencias del DOM, Canvas 2D ni del editor de Casos de Uso (DIP / RNF-04).
 */

import { findDirectedCycleForType } from '../common/GraphValidation.js';

export { findDirectedCycleForType };

const INSTANCE_CAPABLE_TYPES = new Set([
  'Node',
  'Device',
  'ExecutionEnvironment',
  'Artifact'
]);

const ISOLATION_CHECKED_TYPES = new Set([
  'Node',
  'Device',
  'ExecutionEnvironment',
  'Artifact'
]);

const SEMANTIC_RELATIONSHIP_TYPES = new Set([
  'CommunicationPath',
  'Deployment',
  'Manifestation',
  'Dependency',
  'Generalization'
]);

/**
 * Valida reglas globales del modelo de Despliegue que requieren inspeccionar
 * múltiples relaciones simultáneamente (detección de ciclos dirigidos).
 *
 * @param {{ elements: Array<object>, relationships: Array<object> }} model
 * @returns {string[]} Lista de mensajes de error estructural (vacía si es válido).
 */
export function validateDeploymentModel(model) {
  const errors = [];
  if (!model || !Array.isArray(model.relationships)) {
    return errors;
  }

  // [NORMATIVO: §9.9.4.8 Constraint no_cycles_in_generalization [3]]
  const genCycle = findDirectedCycleForType(model.relationships, 'Generalization');
  if (genCycle) {
    errors.push(
      `Ciclo dirigido prohibido en Generalization (§9.9.4.8 no_cycles_in_generalization [3]): ${genCycle.join(' -> ')}.`
    );
  }

  // [DECISIÓN PROYECTO: DEP-REL-03] Evitar ciclos dirigidos de manifestación entre artefactos
  const manifestationCycle = findDirectedCycleForType(model.relationships, 'Manifestation');
  if (manifestationCycle) {
    errors.push(
      `Ciclo dirigido prohibido en Manifestation (decisión del proyecto DEP-REL-03): ${manifestationCycle.join(' -> ')}.`
    );
  }

  return errors;
}

/**
 * Evalúa advertencias de modelado no bloqueantes para el diagrama de Despliegue
 * conforme a docs/UML-CATALOG.md §8.2.
 *
 * @param {{ elements: Array<object>, relationships: Array<object> }} model
 * @returns {Array<{ code: string, severity: 'warning', targetId: string, message: string }>}
 */
export function evaluateDeploymentWarnings(model) {
  const warnings = [];
  if (!model || !Array.isArray(model.elements) || !Array.isArray(model.relationships)) {
    return warnings;
  }

  const connectedElementIds = new Set();
  for (const rel of model.relationships) {
    if (!rel || !SEMANTIC_RELATIONSHIP_TYPES.has(rel.type)) {
      continue;
    }
    connectedElementIds.add(rel.sourceId);
    connectedElementIds.add(rel.targetId);
  }

  const parentElementIds = new Set();
  for (const el of model.elements) {
    if (el && typeof el.parentId === 'string' && el.parentId.length > 0) {
      parentElementIds.add(el.parentId);
    }
  }

  for (const el of model.elements) {
    if (!el) {
      continue;
    }

    const props = el.properties || {};
    if (
      INSTANCE_CAPABLE_TYPES.has(el.type) &&
      props.isInstance === true &&
      (typeof props.classifierName !== 'string' || props.classifierName.trim().length === 0)
    ) {
      warnings.push({
        code: 'DEP-WARN-INSTANCE-NO-CLASSIFIER',
        severity: 'warning',
        targetId: el.id,
        message: `La instancia "${el.name}" (${el.type}) no especifica clasificador base (classifierName) para la notación nombre : Clasificador.`
      });
    }

    if (ISOLATION_CHECKED_TYPES.has(el.type)) {
      const hasSemanticRel = connectedElementIds.has(el.id);
      const hasParent = typeof el.parentId === 'string' && el.parentId.length > 0;
      const hasChildren = parentElementIds.has(el.id);
      if (!hasSemanticRel && !hasParent && !hasChildren) {
        warnings.push({
          code: 'DEP-WARN-ISOLATED-ELEMENT',
          severity: 'warning',
          targetId: el.id,
          message: `El elemento ${el.type} "${el.name}" no tiene relaciones ni contención semántica asociada.`
        });
      }
    }
  }

  return warnings;
}
