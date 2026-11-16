/**
 * Utilidades puras de validación sobre grafos de relaciones UML.
 *
 * Módulo compartido sin dependencias de DOM, Canvas ni catálogos específicos
 * (SRP / DIP), reutilizable por los validadores de Casos de Uso y Despliegue.
 */

/**
 * Detecta si existe al menos un ciclo dirigido entre las relaciones del tipo indicado.
 *
 * @param {Array<{ id: string, type: string, sourceId: string, targetId: string }>} relationships
 * @param {string} relationshipType
 * @returns {string[] | null} Arreglo con la secuencia de IDs del ciclo encontrado, o `null`.
 */
export function findDirectedCycleForType(relationships, relationshipType) {
  const adjacency = new Map();
  for (const rel of relationships) {
    if (!rel || rel.type !== relationshipType) {
      continue;
    }
    if (!adjacency.has(rel.sourceId)) {
      adjacency.set(rel.sourceId, []);
    }
    adjacency.get(rel.sourceId).push(rel.targetId);
  }

  const state = new Map(); // 0 = no visitado, 1 = en pila, 2 = completado
  const stack = [];

  function dfs(nodeId) {
    state.set(nodeId, 1);
    stack.push(nodeId);

    const neighbors = adjacency.get(nodeId) || [];
    for (const nextId of neighbors) {
      const nextState = state.get(nextId) || 0;
      if (nextState === 1) {
        const cycleStart = stack.indexOf(nextId);
        return [...stack.slice(cycleStart), nextId];
      }
      if (nextState === 0) {
        const found = dfs(nextId);
        if (found) {
          return found;
        }
      }
    }

    stack.pop();
    state.set(nodeId, 2);
    return null;
  }

  for (const startId of adjacency.keys()) {
    if ((state.get(startId) || 0) === 0) {
      const cycle = dfs(startId);
      if (cycle) {
        return cycle;
      }
    }
  }

  return null;
}
