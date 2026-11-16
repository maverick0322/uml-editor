/**
 * Validador semántico especializado para Diagramas UML de Casos de Uso — Incremento UML-04.
 *
 * Responsabilidad única (SRP): aplicar reglas normativas de OMG UML 2.5.1 (Cláusulas 9 y 18)
 * y decisiones del proyecto (DP-01, DP-02, DP-03) sobre el modelo semántico, diferenciando:
 * - Errores estructurales bloqueantes (`validateUseCaseModel` → rechazo atómico).
 * - Advertencias de modelado no bloqueantes (`evaluateUseCaseWarnings` → sugerencias didácticas).
 *
 * Módulo puro sin dependencias del DOM ni de Canvas 2D (DIP / RNF-04).
 */

import { findDirectedCycleForType } from '../common/GraphValidation.js';

export { findDirectedCycleForType };

/**
 * Valida reglas globales del modelo de Casos de Uso que requieren inspeccionar múltiples
 * relaciones simultáneamente (p. ej. detección de ciclos dirigidos).
 *
 * @param {{ elements: Array<object>, relationships: Array<object> }} model
 * @returns {string[]} Lista de mensajes de error estructural (vacía si es válido).
 */
export function validateUseCaseModel(model) {
  const errors = [];
  if (!model || !Array.isArray(model.relationships)) {
    return errors;
  }

  // [NORMATIVO: §18.2.5 Constraint cannot_include_self [3]]
  const includeCycle = findDirectedCycleForType(model.relationships, 'Include');
  if (includeCycle) {
    errors.push(
      `Ciclo dirigido prohibido en Include (§18.2.5 cannot_include_self [3]): ${includeCycle.join(' -> ')}.`
    );
  }

  // [NORMATIVO: §9.9.4.8 Constraint no_cycles_in_generalization [3]]
  const genCycle = findDirectedCycleForType(model.relationships, 'Generalization');
  if (genCycle) {
    errors.push(
      `Ciclo dirigido prohibido en Generalization (§9.9.4.8 no_cycles_in_generalization [3]): ${genCycle.join(' -> ')}.`
    );
  }

  // [DECISIÓN PROYECTO] Evitar ciclos dirigidos de extensión
  const extendCycle = findDirectedCycleForType(model.relationships, 'Extend');
  if (extendCycle) {
    errors.push(
      `Ciclo dirigido prohibido en Extend (decisión del proyecto): ${extendCycle.join(' -> ')}.`
    );
  }

  return errors;
}

/**
 * Evalúa advertencias de modelado no bloqueantes para el diagrama de Casos de Uso
 * conforme a docs/UML-CATALOG.md §8.2.
 *
 * @param {{ elements: Array<object>, relationships: Array<object> }} model
 * @returns {Array<{ code: string, severity: 'warning', targetId: string, message: string }>}
 */
export function evaluateUseCaseWarnings(model) {
  const warnings = [];
  if (!model || !Array.isArray(model.elements) || !Array.isArray(model.relationships)) {
    return warnings;
  }

  const semanticTypes = new Set(['Association', 'Include', 'Extend', 'Generalization']);
  const connectedElementIds = new Set();

  for (const rel of model.relationships) {
    if (!rel) {
      continue;
    }
    if (semanticTypes.has(rel.type)) {
      connectedElementIds.add(rel.sourceId);
      connectedElementIds.add(rel.targetId);
    }

    // §8.2.2: Relación Extend sin texto de condición (condition : Constraint[0..1])
    if (rel.type === 'Extend') {
      const condition =
        rel.properties && typeof rel.properties.condition === 'string'
          ? rel.properties.condition.trim()
          : '';
      if (!condition) {
        warnings.push({
          code: 'UC-WARN-EXTEND-NO-CONDITION',
          severity: 'warning',
          targetId: rel.id,
          message: `La relación Extend "${rel.id}" no especifica condición (condition[0..1] es opcional en UML 2.5.1 §18.1.2, pero se recomienda documentarla).`
        });
      }
    }
  }

  // §8.2.1: Caso de uso aislado (sin relaciones semánticas)
  for (const el of model.elements) {
    if (el && el.type === 'UseCase' && !connectedElementIds.has(el.id)) {
      warnings.push({
        code: 'UC-WARN-ISOLATED-USECASE',
        severity: 'warning',
        targetId: el.id,
        message: `El caso de uso "${el.name || el.id}" está aislado (no participa en ninguna relación Association, Include, Extend o Generalization).`
      });
    }
  }

  return warnings;
}
