/**
 * Controlador / Coordinador central del Editor UML — Incrementos UML-01 y UML-02.
 *
 * Coordina el `DiagramModel` activo, la inyección del catálogo correspondiente
 * ('use-case' o 'deployment'), la herramienta activa, la selección sincronizada,
 * las previsualizaciones provisionales (arrastre / redimensionamiento cancelables con `Esc`)
 * y la confirmación atómica de operaciones sobre el modelo.
 */

import {
  DiagramModel,
  clonePlainData,
  createEmptyDocumentSnapshot,
  registerDefaultCatalogs,
  resolveDescriptorMinSize
} from './DiagramModel.js';
import { CommandHistory } from './CommandHistory.js';
import { Viewport } from '../canvas/Viewport.js';
import { UseCaseCatalog } from '../uml/use-case/UseCaseCatalog.js';
import { DeploymentCatalog } from '../uml/deployment/DeploymentCatalog.js';
import {
  SAMPLE_DEPLOYMENT_DOCUMENT,
  SAMPLE_USE_CASE_DOCUMENT
} from '../uml/SampleDiagrams.js';
import {
  computeResizedBox,
  hitTestResizeHandle,
  isPointInRectangle
} from '../canvas/Geometry.js';

export const DEFAULT_CATALOGS = Object.freeze({
  'use-case': UseCaseCatalog,
  deployment: DeploymentCatalog
});

// Inyectar los catálogos en el registro de DiagramModel para mantener DiagramModel libre de imports de js/uml/
registerDefaultCatalogs(DEFAULT_CATALOGS);

const DEFAULT_DEMO_DOCUMENTS = Object.freeze({
  'use-case': SAMPLE_USE_CASE_DOCUMENT,
  deployment: SAMPLE_DEPLOYMENT_DOCUMENT
});

export class Editor {
  /**
   * @param {object} [options]
   * @param {Record<string, object>} [options.catalogs]
   * @param {object} [options.initialDocument]
   */
  constructor({ catalogs = DEFAULT_CATALOGS, initialDocument = SAMPLE_USE_CASE_DOCUMENT } = {}) {
    this._catalogs = { ...catalogs };
    registerDefaultCatalogs(this._catalogs);

    const initialCatalog = this._catalogs[initialDocument.diagramType];
    if (!initialCatalog) {
      throw new Error(
        `No existe catálogo registrado para el modo "${String(initialDocument.diagramType)}".`
      );
    }

    this._diagramModel = new DiagramModel(initialDocument, initialCatalog);
    this._history = new CommandHistory();
    this._viewport = new Viewport();
    this._selectedEntityId = null;
    this._activeTool = { mode: 'select', elementType: null, relationshipType: null };
    this._provisionalViewBoxes = new Map();
    this._provisionalConnection = null;
    this._pendingExtendConfirmation = null;
    this._statusFeedback = {
      level: 'ok',
      message: 'Listo (UML-06: historial, navegación, persistencia JSON y exportación PNG)'
    };
    this._listeners = new Set();
  }

  /**
   * Devuelve la instancia de `CommandHistory` del editor.
   * @returns {CommandHistory}
   */
  getHistory() {
    return this._history;
  }

  /**
   * @returns {boolean}
   */
  canUndo() {
    return this._history.canUndo();
  }

  /**
   * @returns {boolean}
   */
  canRedo() {
    return this._history.canRedo();
  }

  /**
   * Deshace la última operación semántica o visual confirmada.
   * @returns {{ undone: boolean, label: string | null }}
   */
  undo() {
    const res = this._history.undo();
    if (res.undone) {
      this._setStatus('info', `Deshacer: ${res.label}`);
      this._notifyListeners();
    }
    return res;
  }

  /**
   * Rehace la última operación deshecha.
   * @returns {{ redone: boolean, label: string | null }}
   */
  redo() {
    const res = this._history.redo();
    if (res.redone) {
      this._setStatus('info', `Rehacer: ${res.label}`);
      this._notifyListeners();
    }
    return res;
  }

  /**
   * Devuelve la cámara/viewport 2D activa.
   * @returns {Viewport}
   */
  getViewport() {
    return this._viewport;
  }

  /**
   * @param {number} nextZoom
   * @param {{ x: number, y: number }} [anchorScreenPoint]
   * @returns {boolean}
   */
  zoomAt(nextZoom, anchorScreenPoint) {
    const changed = this._viewport.zoomAt(nextZoom, anchorScreenPoint);
    if (changed) {
      this._notifyListeners();
    }
    return changed;
  }

  /**
   * @param {{ x: number, y: number }} [anchorScreenPoint]
   * @returns {boolean}
   */
  zoomIn(anchorScreenPoint) {
    const changed = this._viewport.zoomIn(anchorScreenPoint);
    if (changed) {
      this._notifyListeners();
    }
    return changed;
  }

  /**
   * @param {{ x: number, y: number }} [anchorScreenPoint]
   * @returns {boolean}
   */
  zoomOut(anchorScreenPoint) {
    const changed = this._viewport.zoomOut(anchorScreenPoint);
    if (changed) {
      this._notifyListeners();
    }
    return changed;
  }

  /**
   * Desplaza la vista en coordenadas de pantalla sin modificar el modelo.
   * @param {number} dx
   * @param {number} dy
   * @returns {boolean}
   */
  panBy(dx, dy) {
    const changed = this._viewport.panBy(dx, dy);
    if (changed) {
      this._notifyListeners();
    }
    return changed;
  }

  /**
   * Restablece el zoom al 100% y el desplazamiento a (0, 0).
   */
  resetViewport() {
    this._viewport.reset();
    this._notifyListeners();
  }

  /**
   * Ajusta el viewport para encuadrar todos los elementos del diagrama activo.
   * @param {{ width: number, height: number }} viewportSize
   */
  fitViewportToDiagram(viewportSize) {
    const ordered = this._diagramModel.getElementsInDrawOrder();
    if (ordered.length === 0) {
      this.resetViewport();
      return;
    }
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const { view } of ordered) {
      if (!view) {
        continue;
      }
      minX = Math.min(minX, view.x);
      minY = Math.min(minY, view.y);
      maxX = Math.max(maxX, view.x + view.width);
      maxY = Math.max(maxY, view.y + view.height);
    }
    this._viewport.fitToBounds(
      { x: minX, y: minY, width: maxX - minX, height: maxY - minY },
      viewportSize
    );
    this._notifyListeners();
  }

  /**
   * Ejecuta una mutación del documento y, si es válida, la registra como una sola
   * entrada atómica en `CommandHistory`.
   *
   * @param {string} label
   * @param {() => { isValid: boolean }} mutatorFn
   * @returns {any}
   */
  _executeRecordedMutation(label, mutatorFn) {
    const beforeDoc = this._diagramModel.toJSON();
    const beforeSelectedId = this._selectedEntityId;
    const result = mutatorFn();
    if (result && result.isValid) {
      const afterDoc = this._diagramModel.toJSON();
      const afterSelectedId = this._selectedEntityId;
      this._history.recordSnapshot({
        label,
        before: { document: beforeDoc, selectedEntityId: beforeSelectedId },
        after: { document: afterDoc, selectedEntityId: afterSelectedId },
        applySnapshot: (snap) => {
          const catalog = this._catalogs[snap.document.diagramType];
          this._diagramModel.loadDocument(snap.document, catalog);
          this._selectedEntityId = snap.selectedEntityId;
          this._provisionalViewBoxes.clear();
          this._provisionalConnection = null;
          this._pendingExtendConfirmation = null;
        }
      });
    }
    return result;
  }

  /**
   * Devuelve el catálogo correspondiente al modo del documento activo.
   * @returns {object}
   */
  getActiveCatalog() {
    return this._catalogs[this._diagramModel.getDiagramType()];
  }

  /**
   * Devuelve la instancia activa de DiagramModel.
   * @returns {DiagramModel}
   */
  getDiagramModel() {
    return this._diagramModel;
  }

  /**
   * Devuelve el modo de diagrama activo ('use-case' | 'deployment').
   * @returns {'use-case' | 'deployment'}
   */
  getDiagramType() {
    return this._diagramModel.getDiagramType();
  }

  /**
   * Devuelve la herramienta activa actual.
   * @returns {{ mode: 'select' | 'insert-element', elementType: string | null }}
   */
  getActiveTool() {
    return { ...this._activeTool };
  }

  /**
   * Activa la herramienta de selección, inserción de elemento o creación de relación del catálogo activo.
   * @param {{ mode: 'select' | 'insert-element' | 'create-relationship', elementType?: string | null, relationshipType?: string | null }} toolSpec
   * @returns {{ isValid: boolean, errors: string[] }}
   */
  setActiveTool(toolSpec) {
    this.clearProvisionalPreview(false);

    if (!toolSpec || toolSpec.mode === 'select') {
      this._activeTool = { mode: 'select', elementType: null, relationshipType: null };
      this._setStatus('ok', 'Herramienta activa: Selección y manipulación.');
      this._notifyListeners();
      return { isValid: true, errors: [] };
    }

    const catalog = this.getActiveCatalog();

    if (toolSpec.mode === 'insert-element') {
      const descriptor =
        catalog &&
        catalog.elements &&
        Object.prototype.hasOwnProperty.call(catalog.elements, toolSpec.elementType)
          ? catalog.elements[toolSpec.elementType]
          : null;
      if (!descriptor) {
        const msg = `El tipo "${String(toolSpec.elementType)}" no está disponible en el catálogo "${this.getDiagramType()}".`;
        this._setStatus('error', msg);
        this._notifyListeners();
        return { isValid: false, errors: [msg] };
      }

      this._activeTool = {
        mode: 'insert-element',
        elementType: descriptor.type,
        relationshipType: null
      };
      this._setStatus(
        'info',
        `Inserción activa: haga clic en el lienzo para colocar "${descriptor.label}" (Esc para cancelar).`
      );
      this._notifyListeners();
      return { isValid: true, errors: [] };
    }

    if (toolSpec.mode === 'create-relationship') {
      const descriptor =
        catalog &&
        catalog.relationships &&
        Object.prototype.hasOwnProperty.call(catalog.relationships, toolSpec.relationshipType)
          ? catalog.relationships[toolSpec.relationshipType]
          : null;
      if (!descriptor) {
        const msg = `La relación "${String(toolSpec.relationshipType)}" no está disponible en el catálogo "${this.getDiagramType()}".`;
        this._setStatus('error', msg);
        this._notifyListeners();
        return { isValid: false, errors: [msg] };
      }

      this._activeTool = {
        mode: 'create-relationship',
        elementType: null,
        relationshipType: descriptor.type
      };
      this._setStatus(
        'info',
        `Conexión activa (${descriptor.label}): seleccione el origen y luego el destino (Esc para cancelar).`
      );
      this._notifyListeners();
      return { isValid: true, errors: [] };
    }

    return { isValid: false, errors: ['Modo de herramienta no reconocido.'] };
  }

  /**
   * Restablece la herramienta activa a selección ('select').
   */
  resetToolToSelect() {
    this.setActiveTool({ mode: 'select' });
  }

  /**
   * Publica un mensaje de estado accesible desde la UI (p. ej. E/S JSON o PNG)
   * usando el mismo canal de severidad y notificación del editor.
   *
   * @param {'ok' | 'info' | 'warn' | 'error'} level
   * @param {string} message
   */
  reportFeedback(level, message) {
    this._setStatus(level, message);
    this._notifyListeners();
  }

  /**
   * Devuelve el último mensaje de estado/notificación para la UI.
   * @returns {{ level: 'ok' | 'info' | 'warn' | 'error', message: string }}
   */
  getStatusFeedback() {
    return { ...this._statusFeedback };
  }

  /**
   * Carga de forma atómica un documento validándolo contra el catálogo de su modo.
   * Si el documento es inválido, conserva el documento previo sin cambios.
   *
   * @param {object} candidateDocument
   * @returns {{ isValid: boolean, errors: string[] }}
   */
  loadDocument(candidateDocument) {
    const targetType = candidateDocument && candidateDocument.diagramType;
    const catalog = targetType ? this._catalogs[targetType] : null;
    const result = this._diagramModel.loadDocument(candidateDocument, catalog);
    if (result.isValid) {
      this._history.clear();
      this._viewport.reset();
      this._selectedEntityId = null;
      this._activeTool = { mode: 'select', elementType: null, relationshipType: null };
      this._provisionalViewBoxes.clear();
      this._provisionalConnection = null;
      this._pendingExtendConfirmation = null;
      this._setStatus('ok', `Documento cargado: "${candidateDocument.name}".`);
      this._notifyListeners();
    } else {
      this._setStatus('error', result.errors[0] || 'Documento inválido.');
      this._notifyListeners();
    }
    return result;
  }

  /**
   * Cambia entre los diagramas demostrativos precargados ('use-case' | 'deployment').
   * @param {'use-case' | 'deployment'} diagramType
   * @returns {{ isValid: boolean, errors: string[] }}
   */
  loadSampleDiagram(diagramType) {
    const sampleDoc = DEFAULT_DEMO_DOCUMENTS[diagramType];
    if (!sampleDoc) {
      return {
        isValid: false,
        errors: [`No existe diagrama demostrativo para el modo "${String(diagramType)}".`]
      };
    }
    return this.loadDocument(sampleDoc);
  }

  /**
   * Crea e inicializa un lienzo vacío para el modo indicado ('use-case' | 'deployment').
   * @param {'use-case' | 'deployment'} [diagramType=this.getDiagramType()]
   * @returns {{ isValid: boolean, errors: string[] }}
   */
  createNewEmptyDiagram(diagramType = this.getDiagramType()) {
    const catalog = this._catalogs[diagramType];
    if (!catalog) {
      return {
        isValid: false,
        errors: [`Modo de diagrama no soportado: "${String(diagramType)}".`]
      };
    }
    const emptySnapshot = createEmptyDocumentSnapshot({
      diagramType,
      id: `doc-${diagramType}-nuevo`,
      name:
        diagramType === 'use-case'
          ? 'Nuevo Diagrama de Casos de Uso'
          : 'Nuevo Diagrama de Despliegue'
    });
    return this.loadDocument(emptySnapshot);
  }

  /**
   * Selecciona un elemento o relación por ID para su manipulación e inspección.
   * @param {string | null} entityId
   */
  setSelectedEntity(entityId) {
    if (!entityId) {
      this._selectedEntityId = null;
      this._notifyListeners();
      return;
    }

    const element = this._diagramModel.getElementById(entityId);
    const relationship = this._diagramModel.getRelationshipById(entityId);
    this._selectedEntityId = element || relationship ? entityId : null;
    this._notifyListeners();
  }

  /**
   * Alias compatible con UML-01 para seleccionar la entidad inspeccionada.
   * @param {string | null} entityId
   */
  setInspectedEntity(entityId) {
    this.setSelectedEntity(entityId);
  }

  /**
   * Devuelve el ID de la entidad actualmente seleccionada/inspeccionada.
   * @returns {string | null}
   */
  getSelectedEntityId() {
    return this._selectedEntityId;
  }

  /**
   * Alias compatible con UML-01 para obtener el ID inspeccionado.
   * @returns {string | null}
   */
  getInspectedEntityId() {
    return this._selectedEntityId;
  }

  /**
   * Devuelve los elementos en orden de dibujo aplicando cualquier geometría provisional
   * activa (durante un arrastre o redimensionamiento en curso) sin haber mutado `DiagramModel`.
   *
   * @returns {Array<{ element: object, view: { x: number, y: number, width: number, height: number } }>}
   */
  getEffectiveElementsInDrawOrder() {
    const ordered = this._diagramModel.getElementsInDrawOrder();
    if (this._provisionalViewBoxes.size === 0) {
      return ordered;
    }

    return ordered.map(({ element, view }) => ({
      element,
      view: this._provisionalViewBoxes.has(element.id)
        ? clonePlainData(this._provisionalViewBoxes.get(element.id))
        : view
    }));
  }

  /**
   * Obtiene la caja visual efectiva de un elemento (provisional si existe, o la confirmada del modelo).
   * @param {string} elementId
   * @returns {{ x: number, y: number, width: number, height: number } | null}
   */
  getEffectiveElementView(elementId) {
    if (this._provisionalViewBoxes.has(elementId)) {
      return clonePlainData(this._provisionalViewBoxes.get(elementId));
    }
    return this._diagramModel.getElementView(elementId);
  }

  /**
   * Indica si existe una operación provisional de arrastre, redimensionamiento o conexión en curso.
   * @returns {boolean}
   */
  hasProvisionalPreview() {
    return (
      this._provisionalViewBoxes.size > 0 ||
      this._provisionalConnection !== null ||
      this._pendingExtendConfirmation !== null
    );
  }

  /**
   * Devuelve una copia de la conexión provisional en trazado (si existe).
   * @returns {{ relationshipType: string, sourceId: string, currentPoint: { x: number, y: number } } | null}
   */
  getProvisionalConnection() {
    return this._provisionalConnection ? clonePlainData(this._provisionalConnection) : null;
  }

  /**
   * Inicia el trazado provisional de una relación desde un elemento origen.
   * @param {string} relationshipType
   * @param {string} sourceId
   * @param {{ x: number, y: number }} currentPoint
   * @returns {{ isValid: boolean, errors: string[] }}
   */
  startProvisionalConnection(relationshipType, sourceId, currentPoint) {
    const catalog = this.getActiveCatalog();
    const descriptor =
      catalog &&
      catalog.relationships &&
      Object.prototype.hasOwnProperty.call(catalog.relationships, relationshipType)
        ? catalog.relationships[relationshipType]
        : null;

    if (!descriptor) {
      const msg = `La relación "${String(relationshipType)}" no pertenece al catálogo "${this.getDiagramType()}".`;
      this._setStatus('error', msg);
      this._notifyListeners();
      return { isValid: false, errors: [msg] };
    }

    const sourceEl = this._diagramModel.getElementById(sourceId);
    if (!sourceEl) {
      const msg = `El origen "${String(sourceId)}" no existe como elemento en el modelo.`;
      this._setStatus('error', msg);
      this._notifyListeners();
      return { isValid: false, errors: [msg] };
    }

    if (relationshipType === 'CommentLink' && sourceEl.type !== 'Comment') {
      const msg = 'En CommentLink, el origen debe ser un elemento Comment (CMN-REL-01).';
      this._setStatus('error', msg);
      this._notifyListeners();
      return { isValid: false, errors: [msg] };
    }

    this._pendingExtendConfirmation = null;
    this._provisionalConnection = {
      relationshipType,
      sourceId,
      currentPoint: {
        x: Math.round((currentPoint && currentPoint.x) || 0),
        y: Math.round((currentPoint && currentPoint.y) || 0)
      }
    };
    this._setStatus(
      'info',
      `Origen "${sourceEl.name || sourceEl.id}" seleccionado para ${descriptor.label}. Seleccione el destino (Esc para cancelar).`
    );
    this._notifyListeners();
    return { isValid: true, errors: [] };
  }

  /**
   * Actualiza la posición provisional del puntero durante el trazado de una relación.
   * @param {{ x: number, y: number }} currentPoint
   */
  updateProvisionalConnection(currentPoint) {
    if (!this._provisionalConnection || !currentPoint) {
      return;
    }
    this._provisionalConnection.currentPoint = {
      x: Math.round(currentPoint.x),
      y: Math.round(currentPoint.y)
    };
    this._notifyListeners();
  }

  /**
   * Previsualiza el desplazamiento de un elemento y todos sus descendientes semánticos
   * sin modificar `DiagramModel` (cancelable con `Esc`).
   *
   * @param {string} elementId
   * @param {{ dx: number, dy: number }} delta
   * @returns {boolean}
   */
  previewMoveElement(elementId, delta) {
    const baseBox = this._diagramModel.getElementView(elementId);
    if (!baseBox || !delta) {
      return false;
    }

    const dx = Math.round(delta.dx || 0);
    const dy = Math.round(delta.dy || 0);
    const affectedIds = [elementId, ...this._diagramModel.getDescendantIds(elementId)];

    this._provisionalViewBoxes.clear();
    for (const id of affectedIds) {
      const box = this._diagramModel.getElementView(id);
      if (box) {
        this._provisionalViewBoxes.set(id, {
          x: Math.round(box.x + dx),
          y: Math.round(box.y + dy),
          width: box.width,
          height: box.height
        });
      }
    }

    this._notifyListeners();
    return true;
  }

  /**
   * Confirma atómicamente en `DiagramModel` un movimiento de elemento.
   *
   * @param {string} elementId
   * @param {{ dx: number, dy: number }} delta
   * @returns {{ isValid: boolean, errors: string[], movedIds?: string[] }}
   */
  commitMoveElement(elementId, delta) {
    this._provisionalViewBoxes.clear();
    const dx = Math.round((delta && delta.dx) || 0);
    const dy = Math.round((delta && delta.dy) || 0);

    if (dx === 0 && dy === 0) {
      this._notifyListeners();
      return { isValid: true, errors: [], movedIds: [] };
    }

    const result = this._executeRecordedMutation(`Mover ${elementId}`, () =>
      this._diagramModel.moveElement(elementId, { dx, dy })
    );
    if (result.isValid) {
      this._setStatus('ok', `Elemento "${elementId}" desplazado (${dx}, ${dy}).`);
    } else {
      this._setStatus('error', result.errors[0] || 'No se pudo mover el elemento.');
    }
    this._notifyListeners();
    return result;
  }

  /**
   * Previsualiza el redimensionamiento de un elemento mediante un controlador (`handleDir`)
   * respetando el tamaño mínimo del descriptor sin mutar `DiagramModel`.
   *
   * @param {string} elementId
   * @param {string} handleDir
   * @param {{ dx: number, dy: number }} delta
   * @returns {{ x: number, y: number, width: number, height: number } | null}
   */
  previewResizeElement(elementId, handleDir, delta) {
    const element = this._diagramModel.getElementById(elementId);
    const initialBox = this._diagramModel.getElementView(elementId);
    if (!element || !initialBox) {
      return null;
    }

    const catalog = this.getActiveCatalog();
    const descriptor = catalog && catalog.elements ? catalog.elements[element.type] : null;
    if (!descriptor || descriptor.resizable === false) {
      return null;
    }

    const resizedBox = computeResizedBox(
      initialBox,
      handleDir,
      delta,
      resolveDescriptorMinSize(descriptor, element)
    );

    this._provisionalViewBoxes.clear();
    this._provisionalViewBoxes.set(elementId, resizedBox);
    this._notifyListeners();
    return resizedBox;
  }

  /**
   * Confirma atómicamente en `DiagramModel` el redimensionamiento de un elemento.
   *
   * @param {string} elementId
   * @param {{ x: number, y: number, width: number, height: number }} newBox
   * @returns {{ isValid: boolean, errors: string[] }}
   */
  commitResizeElement(elementId, newBox) {
    this._provisionalViewBoxes.clear();
    const initialBox = this._diagramModel.getElementView(elementId);
    if (
      initialBox &&
      initialBox.x === newBox.x &&
      initialBox.y === newBox.y &&
      initialBox.width === newBox.width &&
      initialBox.height === newBox.height
    ) {
      this._notifyListeners();
      return { isValid: true, errors: [] };
    }

    const result = this._executeRecordedMutation(`Redimensionar ${elementId}`, () =>
      this._diagramModel.resizeElement(elementId, newBox)
    );
    if (result.isValid) {
      this._setStatus(
        'ok',
        `Elemento "${elementId}" redimensionado a ${newBox.width}×${newBox.height} px.`
      );
    } else {
      this._setStatus('error', result.errors[0] || 'Error al redimensionar el elemento.');
    }
    this._notifyListeners();
    return result;
  }

  /**
   * Cancela inmediatamente cualquier operación provisional en curso (`Esc` — CAN-07),
   * restaurando la vista sin haber modificado `DiagramModel`.
   *
   * @param {boolean} [notify=true]
   */
  clearProvisionalPreview(notify = true) {
    const hadPreview =
      this._provisionalViewBoxes.size > 0 ||
      this._provisionalConnection !== null ||
      this._pendingExtendConfirmation !== null;
    this._provisionalViewBoxes.clear();
    this._provisionalConnection = null;
    this._pendingExtendConfirmation = null;
    if (hadPreview) {
      this._setStatus('info', 'Operación provisional cancelada (Esc). El modelo permanece intacto.');
    }
    if (notify) {
      this._notifyListeners();
    }
  }

  /**
   * Devuelve los ExtensionPoints definidos en un UseCase destino (para DP-03).
   * @param {string} useCaseId
   * @returns {Array<{ id: string, name: string }>}
   */
  getAvailableExtensionPointsFor(useCaseId) {
    const el = this._diagramModel.getElementById(useCaseId);
    if (!el || el.type !== 'UseCase' || !el.properties) {
      return [];
    }
    return Array.isArray(el.properties.extensionPoints)
      ? clonePlainData(el.properties.extensionPoints)
      : [];
  }

  /**
   * Devuelve la solicitud pendiente de confirmación de Extend (DP-03), si existe.
   * @returns {{ sourceId: string, targetId: string, extensionPoints: Array<{ id: string, name: string }> } | null}
   */
  getPendingExtendConfirmation() {
    return this._pendingExtendConfirmation
      ? clonePlainData(this._pendingExtendConfirmation)
      : null;
  }

  /**
   * Evalúa advertencias de modelado no bloqueantes delegando en el catálogo activo (§8.2).
   * @returns {Array<{ code: string, severity: 'warning', targetId: string, message: string }>}
   */
  getModelWarnings() {
    const catalog = this.getActiveCatalog();
    if (!catalog || typeof catalog.evaluateWarnings !== 'function') {
      return [];
    }
    const snapshot = this._diagramModel.toJSON();
    return catalog.evaluateWarnings(snapshot.model);
  }

  /**
   * Confirma una relación `Extend` pendiente tras seleccionar un `ExtensionPoint` existente
   * o crear uno nuevo con nombre válido en una sola operación atómica (DP-03).
   *
   * @param {string | { extensionPointId?: string, newExtensionPointName?: string, condition?: string }} selection
   * @returns {{ isValid: boolean, errors: string[], relationshipId?: string, extensionPointId?: string }}
   */
  confirmPendingExtend(selection) {
    if (!this._pendingExtendConfirmation) {
      return { isValid: false, errors: ['No hay ninguna relación Extend pendiente de confirmación.'] };
    }
    const { sourceId, targetId } = this._pendingExtendConfirmation;
    const opts =
      typeof selection === 'string'
        ? { extensionPointId: selection }
        : selection || {};

    return this.createExtendRelationship({
      sourceId,
      targetId,
      extensionPointId: opts.extensionPointId,
      newExtensionPointName: opts.newExtensionPointName,
      condition: opts.condition
    });
  }

  /**
   * Crea atómicamente una relación `Extend` usando un `ExtensionPoint` existente o creando
   * uno nuevo en `targetId` dentro de la misma transacción atómica (DP-03).
   *
   * @param {{
   *   sourceId: string,
   *   targetId: string,
   *   extensionPointId?: string,
   *   newExtensionPointName?: string,
   *   condition?: string
   * }} options
   * @returns {{ isValid: boolean, errors: string[], relationshipId?: string, extensionPointId?: string }}
   */
  createExtendRelationship({
    sourceId,
    targetId,
    extensionPointId = '',
    newExtensionPointName = '',
    condition = ''
  }) {
    const trimmedNewName =
      typeof newExtensionPointName === 'string' ? newExtensionPointName.trim() : '';
    const cleanCondition = typeof condition === 'string' ? condition.trim() : '';

    if (trimmedNewName.length > 0) {
      const targetEl = this._diagramModel.getElementById(targetId);
      if (!targetEl || targetEl.type !== 'UseCase') {
        const msg = 'El destino de Extend debe ser un UseCase existente (DP-03).';
        this._setStatus('error', msg);
        this._notifyListeners();
        return { isValid: false, errors: [msg] };
      }

      const existingEps = Array.isArray(targetEl.properties?.extensionPoints)
        ? targetEl.properties.extensionPoints
        : [];
      const usedEpIds = new Set(existingEps.map((ep) => ep && ep.id));
      let seq = existingEps.length + 1;
      let newEpId = `ep-${seq}`;
      while (usedEpIds.has(newEpId)) {
        seq += 1;
        newEpId = `ep-${seq}`;
      }

      this._provisionalConnection = null;
      this._pendingExtendConfirmation = null;

      const updatedEps = [...existingEps, { id: newEpId, name: trimmedNewName }];
      const result = this._executeRecordedMutation(
        `Crear «extend» y ExtensionPoint "${trimmedNewName}"`,
        () => {
          const innerResult = this._diagramModel.updateElementAndAddRelationship(
            targetId,
            {
              properties: {
                extensionPoints: updatedEps,
                showExtensionPoints: true
              }
            },
            {
              type: 'Extend',
              sourceId,
              targetId,
              properties: {
                extensionLocation: newEpId,
                ...(cleanCondition ? { condition: cleanCondition } : {})
              }
            }
          );
          if (innerResult.isValid) {
            this._selectedEntityId = innerResult.relationshipId;
            this._activeTool = { mode: 'select', elementType: null, relationshipType: null };
          }
          return innerResult;
        }
      );

      if (result.isValid) {
        this._setStatus(
          'ok',
          `Relación «extend» (${result.relationshipId}) y ExtensionPoint "${trimmedNewName}" creados atómicamente.`
        );
      } else {
        this._setStatus('error', result.errors[0] || 'Error al confirmar Extend (DP-03).');
      }
      this._notifyListeners();
      return result.isValid ? { ...result, extensionPointId: newEpId } : result;
    }

    if (!extensionPointId) {
      const msg =
        'Debe seleccionar un ExtensionPoint existente o ingresar el nombre de uno nuevo para confirmar Extend (DP-03).';
      this._setStatus('error', msg);
      this._notifyListeners();
      return { isValid: false, errors: [msg] };
    }

    return this.createRelationship({
      type: 'Extend',
      sourceId,
      targetId,
      properties: {
        extensionLocation: extensionPointId,
        ...(cleanCondition ? { condition: cleanCondition } : {})
      }
    });
  }

  /**
   * Cancela una confirmación pendiente de `Extend` sin mutar el modelo (CAN-07, DP-03).
   */
  cancelPendingExtend() {
    if (!this._pendingExtendConfirmation) {
      return;
    }
    this._pendingExtendConfirmation = null;
    this._provisionalConnection = null;
    this._setStatus('info', 'Creación de relación Extend cancelada. El modelo permanece intacto.');
    this._notifyListeners();
  }

  /**
   * Completa una conexión interactiva iniciada en el lienzo.
   * Para `Extend` (DP-03), verifica antes los extremos y exige un `ExtensionPoint` existente
   * en el destino; si no existe ninguno, informa al usuario y mantiene el modelo intacto.
   *
   * @param {string} relationshipType
   * @param {string} sourceId
   * @param {string} targetId
   * @returns {{ isValid: boolean, status: 'created' | 'pending-extend' | 'rejected', errors: string[], relationshipId?: string, extensionPoints?: Array<{ id: string, name: string }> }}
   */
  completeInteractiveConnection(relationshipType, sourceId, targetId) {
    this._provisionalConnection = null;

    if (relationshipType === 'Extend') {
      const sourceEl = this._diagramModel.getElementById(sourceId);
      const targetEl = this._diagramModel.getElementById(targetId);

      if (!sourceEl || !targetEl || sourceId === targetId) {
        const msg = 'Extremos inválidos para Extend: se requieren dos UseCase distintos.';
        this._setStatus('error', msg);
        this._notifyListeners();
        return { isValid: false, status: 'rejected', errors: [msg] };
      }

      if (sourceEl.type !== 'UseCase' || targetEl.type !== 'UseCase') {
        const msg = `Extremos inválidos para Extend: OMG UML 2.5.1 (§18.2.2) exige UseCase -> UseCase, pero se recibió "${sourceEl.type}" -> "${targetEl.type}".`;
        this._setStatus('error', msg);
        this._notifyListeners();
        return { isValid: false, status: 'rejected', errors: [msg] };
      }

      const extensionPoints = this.getAvailableExtensionPointsFor(targetId);
      this._pendingExtendConfirmation = { sourceId, targetId, extensionPoints };
      this._setStatus(
        'info',
        extensionPoints.length > 0
          ? `Seleccione o cree un ExtensionPoint de "${targetEl.name}" para confirmar «extend» (Esc para cancelar).`
          : `"${targetEl.name}" aún no tiene ExtensionPoints. Cree uno nuevo para confirmar «extend» (Esc para cancelar).`
      );
      this._notifyListeners();
      return {
        isValid: true,
        status: 'pending-extend',
        errors: [],
        extensionPoints
      };
    }

    const res = this.createRelationship({
      type: relationshipType,
      sourceId,
      targetId
    });
    return {
      ...res,
      status: res.isValid ? 'created' : 'rejected'
    };
  }

  /**
   * Crea atómicamente una relación UML en `DiagramModel` validando extremos y reglas del catálogo.
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
  createRelationship(payload) {
    this._provisionalConnection = null;
    this._pendingExtendConfirmation = null;

    const result = this._executeRecordedMutation(`Crear relación ${payload?.type || ''}`, () => {
      const innerResult = this._diagramModel.addRelationship(payload);
      if (innerResult.isValid) {
        this._selectedEntityId = innerResult.relationshipId;
        this._activeTool = { mode: 'select', elementType: null, relationshipType: null };
      }
      return innerResult;
    });
    if (result.isValid) {
      const catalog = this.getActiveCatalog();
      const descriptor =
        catalog && catalog.relationships ? catalog.relationships[payload.type] : null;
      this._setStatus(
        'ok',
        `Relación "${descriptor ? descriptor.label : payload.type}" (${result.relationshipId}) creada.`
      );
    } else {
      this._setStatus('error', result.errors[0] || 'Relación rechazada por validación UML.');
    }

    this._notifyListeners();
    return result;
  }

  /**
   * Inserta un elemento del catálogo activo centrado en las coordenadas lógicas `(x, y)`.
   * No asigna `parentId` implícitamente por mera superposición gráfica (`CAN-08`).
   *
   * @param {string} elementType
   * @param {{ x: number, y: number, name?: string, parentId?: string | null, properties?: object }} options
   * @returns {{ isValid: boolean, errors: string[], elementId?: string }}
   */
  insertElementAt(elementType, options = { x: 80, y: 80 }) {
    const catalog = this.getActiveCatalog();
    const descriptor =
      catalog && catalog.elements ? catalog.elements[elementType] : null;
    if (!descriptor) {
      const msg = `El elemento "${String(elementType)}" no pertenece al catálogo "${this.getDiagramType()}".`;
      this._setStatus('error', msg);
      this._notifyListeners();
      return { isValid: false, errors: [msg] };
    }

    const defaultSize = descriptor.defaultSize || { width: 150, height: 70 };
    const topLeftX = Math.max(8, Math.round((options.x ?? 80) - defaultSize.width / 2));
    const topLeftY = Math.max(8, Math.round((options.y ?? 80) - defaultSize.height / 2));

    const result = this._executeRecordedMutation(`Insertar ${descriptor.label}`, () => {
      const innerResult = this._diagramModel.addElement({
        type: elementType,
        name: options.name,
        parentId: options.parentId !== undefined ? options.parentId : null,
        properties: options.properties,
        x: topLeftX,
        y: topLeftY,
        width: defaultSize.width,
        height: defaultSize.height
      });
      if (innerResult.isValid) {
        this._selectedEntityId = innerResult.elementId;
        this._activeTool = { mode: 'select', elementType: null, relationshipType: null };
      }
      return innerResult;
    });

    if (result.isValid) {
      this._setStatus(
        'ok',
        `Elemento "${descriptor.label}" (${result.elementId}) insertado en (${topLeftX}, ${topLeftY}).`
      );
    } else {
      this._setStatus('error', result.errors[0] || 'Error al insertar el elemento.');
    }

    this._notifyListeners();
    return result;
  }

  /**
   * Actualiza de forma atómica y validada las propiedades/nombre/contención de un elemento.
   *
   * @param {string} elementId
   * @param {{ name?: string, parentId?: string | null, properties?: object }} changes
   * @returns {{ isValid: boolean, errors: string[] }}
   */
  updateElementProperties(elementId, changes) {
    const result = this._executeRecordedMutation(`Editar propiedades de ${elementId}`, () =>
      this._diagramModel.updateElement(elementId, changes)
    );
    if (result.isValid) {
      this._setStatus('ok', `Propiedades de "${elementId}" actualizadas correctamente.`);
    } else {
      this._setStatus('error', result.errors[0] || 'Cambios rechazados por validación UML.');
    }
    this._notifyListeners();
    return result;
  }

  /**
   * Elimina atómicamente la entidad indicada (elemento o relación) aplicando limpieza de relaciones
   * y política explícita sobre descendientes (`'detach'` por defecto o `'cascade'`).
   *
   * @param {string} entityId
   * @param {{ descendantPolicy?: 'detach' | 'cascade' }} [options]
   * @returns {{ isValid: boolean, errors: string[] }}
   */
  deleteEntity(entityId, options = { descendantPolicy: 'detach' }) {
    this.clearProvisionalPreview(false);

    const element = this._diagramModel.getElementById(entityId);
    if (element) {
      const result = this._executeRecordedMutation(`Eliminar elemento ${entityId}`, () => {
        const innerResult = this._diagramModel.removeElement(entityId, options);
        if (
          innerResult.isValid &&
          this._selectedEntityId &&
          innerResult.removedElementIds &&
          innerResult.removedElementIds.includes(this._selectedEntityId)
        ) {
          this._selectedEntityId = null;
        }
        return innerResult;
      });
      if (result.isValid) {
        this._setStatus(
          'ok',
          `Elemento "${entityId}" eliminado (${result.removedRelationshipIds.length} relaciones incidentes limpiadas).`
        );
      } else {
        this._setStatus('error', result.errors[0] || 'No se pudo eliminar el elemento.');
      }
      this._notifyListeners();
      return result;
    }

    const relationship = this._diagramModel.getRelationshipById(entityId);
    if (relationship) {
      const result = this._executeRecordedMutation(`Eliminar relación ${entityId}`, () => {
        const innerResult = this._diagramModel.removeRelationship(entityId);
        if (
          innerResult.isValid &&
          this._selectedEntityId &&
          innerResult.removedRelationshipIds &&
          innerResult.removedRelationshipIds.includes(this._selectedEntityId)
        ) {
          this._selectedEntityId = null;
        }
        return innerResult;
      });
      if (result.isValid) {
        this._setStatus('ok', `Relación "${entityId}" eliminada.`);
      } else {
        this._setStatus('error', result.errors[0] || 'No se pudo eliminar la relación.');
      }
      this._notifyListeners();
      return result;
    }

    const msg = `No existe la entidad "${String(entityId)}" para eliminar.`;
    this._setStatus('error', msg);
    this._notifyListeners();
    return { isValid: false, errors: [msg] };
  }

  /**
   * Elimina la entidad actualmente seleccionada, si existe.
   * @param {{ descendantPolicy?: 'detach' | 'cascade' }} [options]
   * @returns {{ isValid: boolean, errors: string[] }}
   */
  deleteSelectedEntity(options = { descendantPolicy: 'detach' }) {
    if (!this._selectedEntityId) {
      return { isValid: false, errors: ['No hay ningún elemento o relación seleccionado.'] };
    }
    return this.deleteEntity(this._selectedEntityId, options);
  }

  /**
   * Comprueba si el punto `(x, y)` impacta un controlador de redimensionamiento del elemento
   * actualmente seleccionado (solo si es redimensionable).
   *
   * @param {{ x: number, y: number }} point
   * @returns {{ elementId: string, handleDir: string } | null}
   */
  hitTestSelectedResizeHandle(point) {
    if (!this._selectedEntityId) {
      return null;
    }
    const element = this._diagramModel.getElementById(this._selectedEntityId);
    if (!element) {
      return null;
    }
    const catalog = this.getActiveCatalog();
    const descriptor = catalog && catalog.elements ? catalog.elements[element.type] : null;
    if (!descriptor || descriptor.resizable === false) {
      return null;
    }

    const viewBox = this.getEffectiveElementView(element.id);
    if (!viewBox) {
      return null;
    }

    const handleDir = hitTestResizeHandle(point, viewBox, 7);
    return handleDir ? { elementId: element.id, handleDir } : null;
  }

  /**
   * Realiza hit-testing de elementos en orden inverso a `view.drawOrder`
   * (del elemento superior al inferior), respetando la geometría propia de cada figura.
   *
   * @param {{ x: number, y: number }} point
   * @returns {{ element: object, view: { x: number, y: number, width: number, height: number } } | null}
   */
  hitTestElementAt(point) {
    const ordered = this.getEffectiveElementsInDrawOrder();
    const catalog = this.getActiveCatalog();

    for (let i = ordered.length - 1; i >= 0; i -= 1) {
      const { element, view } = ordered[i];
      const descriptor = catalog && catalog.elements ? catalog.elements[element.type] : null;
      const isHit =
        descriptor && typeof descriptor.containsPoint === 'function'
          ? descriptor.containsPoint(view, point, element)
          : isPointInRectangle(point, view);
      if (isHit) {
        return { element, view };
      }
    }
    return null;
  }

  /**
   * Devuelve la lista de elementos contenedores válidos que pueden actuar como `parentId`
   * para el elemento indicado sin crear ciclos de contención.
   *
   * @param {string} elementId
   * @returns {Array<object>}
   */
  getAvailableParentContainersFor(elementId) {
    const element = this._diagramModel.getElementById(elementId);
    if (!element) {
      return [];
    }

    const catalog = this.getActiveCatalog();
    const childDescriptor = catalog && catalog.elements ? catalog.elements[element.type] : null;
    const allowedParentTypes =
      (childDescriptor && childDescriptor.allowedParentTypes) || [];
    if (allowedParentTypes.length === 0) {
      return [];
    }

    const forbiddenIds = new Set([
      elementId,
      ...this._diagramModel.getDescendantIds(elementId)
    ]);

    const ordered = this._diagramModel.getElementsInDrawOrder();
    const validContainers = [];

    for (const { element: candidateParent } of ordered) {
      if (forbiddenIds.has(candidateParent.id)) {
        continue;
      }
      if (!allowedParentTypes.includes(candidateParent.type)) {
        continue;
      }
      const parentDescriptor =
        catalog && catalog.elements ? catalog.elements[candidateParent.type] : null;
      if (
        parentDescriptor &&
        Array.isArray(parentDescriptor.allowedChildTypes) &&
        parentDescriptor.allowedChildTypes.includes(element.type)
      ) {
        validContainers.push(candidateParent);
      }
    }

    return validContainers;
  }

  /**
   * Suscribe un observador a los cambios de estado del editor.
   * @param {(editor: Editor) => void} listener
   * @returns {() => void} Función para cancelar la suscripción.
   */
  subscribe(listener) {
    this._listeners.add(listener);
    return () => {
      this._listeners.delete(listener);
    };
  }

  _setStatus(level, message) {
    this._statusFeedback = { level, message };
  }

  _notifyListeners() {
    for (const listener of this._listeners) {
      listener(this);
    }
  }
}
