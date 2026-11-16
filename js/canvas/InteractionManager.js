/**
 * Gestor de interacciones sobre el lienzo Canvas — Incremento UML-02.
 *
 * Responsabilidad única: administrar la máquina de estados de interacción del usuario
 * (`IDLE`, `DRAGGING`, `RESIZING`) mediante `PointerEvent` y atajos de teclado (`Escape`,
 * `Delete`/`Backspace`), convirtiendo las coordenadas del puntero al espacio lógico del
 * Canvas y delegando las previsualizaciones y confirmaciones atómicas en `Editor`.
 */

import { clientToCanvasLogicalPoint } from './Geometry.js';

export const INTERACTION_STATE = Object.freeze({
  IDLE: 'IDLE',
  DRAGGING: 'DRAGGING',
  RESIZING: 'RESIZING',
  CONNECTING: 'CONNECTING',
  PANNING: 'PANNING'
});

const HANDLE_CURSOR_MAP = Object.freeze({
  nw: 'nwse-resize',
  se: 'nwse-resize',
  ne: 'nesw-resize',
  sw: 'nesw-resize',
  n: 'ns-resize',
  s: 'ns-resize',
  e: 'ew-resize',
  w: 'ew-resize'
});

function isEditableFormControl(target) {
  if (!target || typeof target !== 'object') {
    return false;
  }
  const tagName = String(target.tagName || '').toUpperCase();
  return (
    tagName === 'INPUT' ||
    tagName === 'TEXTAREA' ||
    tagName === 'SELECT' ||
    Boolean(target.isContentEditable)
  );
}

export class InteractionManager {
  /**
   * @param {object} options
   * @param {HTMLCanvasElement} options.canvas
   * @param {import('../core/Editor.js').Editor} options.editor
   * @param {import('./CanvasRenderer.js').CanvasRenderer} [options.renderer]
   * @param {EventTarget} [options.keyboardTarget]
   */
  constructor({ canvas, editor, renderer = null, keyboardTarget = null }) {
    this._canvas = canvas;
    this._editor = editor;
    this._renderer = renderer;
    this._keyboardTarget =
      keyboardTarget || (typeof window !== 'undefined' ? window : null);

    this._state = INTERACTION_STATE.IDLE;
    this._session = null;
    this._isSpacePressed = false;

    this._onPointerDown = this.handlePointerDown.bind(this);
    this._onPointerMove = this.handlePointerMove.bind(this);
    this._onPointerUp = this.handlePointerUp.bind(this);
    this._onPointerCancel = this.handlePointerCancel.bind(this);
    this._onWheel = this.handleWheel.bind(this);
    this._onKeyDown = this.handleKeyDown.bind(this);
    this._onKeyUp = this.handleKeyUp.bind(this);

    this._attachListeners();
  }

  /**
   * Devuelve el estado actual de la máquina de interacciones (`IDLE` | `DRAGGING` | `RESIZING`).
   * @returns {string}
   */
  getState() {
    return this._state;
  }

  /**
   * Convierte un evento de puntero a coordenadas CSS del Canvas (sin zoom/pan).
   *
   * @param {{ clientX: number, clientY: number }} event
   * @returns {{ x: number, y: number }}
   */
  getScreenPointFromEvent(event) {
    const rect = this._canvas.getBoundingClientRect();
    const dpr =
      (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
    return clientToCanvasLogicalPoint(
      { clientX: event.clientX, clientY: event.clientY },
      {
        rect,
        canvasWidth: this._canvas.width,
        canvasHeight: this._canvas.height,
        devicePixelRatio: dpr
      }
    );
  }

  /**
   * Convierte un evento de puntero al espacio lógico del documento (mundo),
   * aplicando la transformación inversa del `Viewport` activo (zoom y pan).
   *
   * @param {{ clientX: number, clientY: number }} event
   * @returns {{ x: number, y: number }}
   */
  getLogicalPointFromEvent(event) {
    const screenPoint = this.getScreenPointFromEvent(event);
    const viewport =
      typeof this._editor.getViewport === 'function' ? this._editor.getViewport() : null;
    return viewport ? viewport.screenToWorld(screenPoint) : screenPoint;
  }

  /**
   * Procesa el inicio de una interacción con el puntero (`pointerdown`).
   * @param {PointerEvent | object} event
   */
  handlePointerDown(event) {
    const isMiddleButton = event.button === 1;
    const isSpacePan = this._isSpacePressed && (event.button === undefined || event.button === 0);
    if (isMiddleButton || isSpacePan) {
      if (typeof event.preventDefault === 'function') {
        event.preventDefault();
      }
      const screenPoint = this.getScreenPointFromEvent(event);
      this._state = INTERACTION_STATE.PANNING;
      this._session = {
        pointerId: event.pointerId,
        lastScreenPoint: screenPoint
      };
      this._capturePointer(event.pointerId);
      this._setCanvasCursor('grabbing');
      return;
    }

    if (event.button !== undefined && event.button !== 0) {
      return;
    }

    const point = this.getLogicalPointFromEvent(event);
    const activeTool = this._editor.getActiveTool();

    // 1. Modo de inserción de elemento por herramienta + clic (CAN-02)
    if (activeTool.mode === 'insert-element' && activeTool.elementType) {
      this._editor.insertElementAt(activeTool.elementType, {
        x: point.x,
        y: point.y
      });
      this._updateCanvasCursor(point);
      return;
    }

    // 1b. Modo de creación de relación origen -> destino (CAN-06)
    if (activeTool.mode === 'create-relationship' && activeTool.relationshipType) {
      if (this._state === INTERACTION_STATE.CONNECTING && this._session) {
        const targetId = this._hitTestConnectionTarget(point, this._session.relationshipType);
        const { relationshipType, sourceId, pointerId } = this._session;
        this._releasePointer(pointerId);
        this._state = INTERACTION_STATE.IDLE;
        this._session = null;

        if (targetId && targetId !== sourceId) {
          this._editor.completeInteractiveConnection(relationshipType, sourceId, targetId);
        } else {
          this._editor.clearProvisionalPreview(true);
        }
        this._updateCanvasCursor(point);
        return;
      }

      const sourceHit = this._editor.hitTestElementAt(point);
      if (!sourceHit) {
        return;
      }

      const startRes = this._editor.startProvisionalConnection(
        activeTool.relationshipType,
        sourceHit.element.id,
        point
      );
      if (startRes.isValid) {
        this._state = INTERACTION_STATE.CONNECTING;
        this._session = {
          pointerId: event.pointerId ?? 1,
          relationshipType: activeTool.relationshipType,
          sourceId: sourceHit.element.id,
          startPoint: point,
          moved: false
        };
        this._capturePointer(this._session.pointerId);
        this._setCanvasCursor('crosshair');
      }
      return;
    }

    // 2. Comprobar si se pulsó sobre un controlador de redimensionamiento del elemento seleccionado (CAN-05)
    const resizeHit = this._editor.hitTestSelectedResizeHandle(point);
    if (resizeHit) {
      const initialBox = this._editor.getEffectiveElementView(resizeHit.elementId);
      this._state = INTERACTION_STATE.RESIZING;
      this._session = {
        pointerId: event.pointerId ?? 1,
        elementId: resizeHit.elementId,
        handleDir: resizeHit.handleDir,
        startPoint: point,
        lastBox: initialBox,
        moved: false
      };
      this._capturePointer(this._session.pointerId);
      this._setCanvasCursor(HANDLE_CURSOR_MAP[resizeHit.handleDir] || 'nwse-resize');
      return;
    }

    // 3. Hit-testing de elementos respetando geometría y orden inverso de drawOrder (CAN-03)
    const elementHit = this._editor.hitTestElementAt(point);
    if (elementHit) {
      const elementId = elementHit.element.id;
      this._editor.setSelectedEntity(elementId);

      this._state = INTERACTION_STATE.DRAGGING;
      this._session = {
        pointerId: event.pointerId ?? 1,
        elementId,
        startPoint: point,
        lastDelta: { dx: 0, dy: 0 },
        moved: false
      };
      this._capturePointer(this._session.pointerId);
      this._setCanvasCursor('grabbing');
      return;
    }

    // 4. Hit-testing de líneas de relación para permitir seleccionarla / inspeccionarla / eliminarla
    if (this._renderer && typeof this._renderer.hitTestRelationshipAt === 'function') {
      const relId = this._renderer.hitTestRelationshipAt(point, 6);
      if (relId) {
        this._editor.setSelectedEntity(relId);
        this._updateCanvasCursor(point);
        return;
      }
    }

    // 5. Clic en el fondo vacío: limpiar selección
    this._editor.setSelectedEntity(null);
    this._updateCanvasCursor(point);
  }

  /**
   * Procesa el desplazamiento del puntero (`pointermove`).
   * @param {PointerEvent | object} event
   */
  handlePointerMove(event) {
    if (this._state === INTERACTION_STATE.PANNING && this._session) {
      const screenPoint = this.getScreenPointFromEvent(event);
      const dx = screenPoint.x - this._session.lastScreenPoint.x;
      const dy = screenPoint.y - this._session.lastScreenPoint.y;
      this._session.lastScreenPoint = screenPoint;
      if (typeof this._editor.panBy === 'function') {
        this._editor.panBy(dx, dy);
      }
      return;
    }

    const point = this.getLogicalPointFromEvent(event);

    if (this._state === INTERACTION_STATE.CONNECTING && this._session) {
      if (
        Math.hypot(
          point.x - this._session.startPoint.x,
          point.y - this._session.startPoint.y
        ) >= 6
      ) {
        this._session.moved = true;
      }
      this._editor.updateProvisionalConnection(point);
      return;
    }

    if (this._state === INTERACTION_STATE.DRAGGING && this._session) {
      const dx = Math.round(point.x - this._session.startPoint.x);
      const dy = Math.round(point.y - this._session.startPoint.y);
      if (Math.abs(dx) >= 1 || Math.abs(dy) >= 1) {
        this._session.moved = true;
      }
      this._session.lastDelta = { dx, dy };
      this._editor.previewMoveElement(this._session.elementId, { dx, dy });
      return;
    }

    if (this._state === INTERACTION_STATE.RESIZING && this._session) {
      const dx = Math.round(point.x - this._session.startPoint.x);
      const dy = Math.round(point.y - this._session.startPoint.y);
      if (Math.abs(dx) >= 1 || Math.abs(dy) >= 1) {
        this._session.moved = true;
      }
      const previewBox = this._editor.previewResizeElement(
        this._session.elementId,
        this._session.handleDir,
        { dx, dy }
      );
      if (previewBox) {
        this._session.lastBox = previewBox;
      }
      return;
    }

    this._updateCanvasCursor(point);
  }

  /**
   * Procesa la liberación del puntero (`pointerup`), confirmando atómicamente la operación.
   * @param {PointerEvent | object} event
   */
  handlePointerUp(event) {
    if (this._state === INTERACTION_STATE.PANNING && this._session) {
      this._releasePointer(this._session.pointerId);
      this._state = INTERACTION_STATE.IDLE;
      this._session = null;
      this._setCanvasCursor(this._isSpacePressed ? 'grab' : 'default');
      return;
    }

    if (this._state === INTERACTION_STATE.CONNECTING && this._session) {
      const { pointerId, relationshipType, sourceId, moved } = this._session;
      this._releasePointer(pointerId);

      if (moved) {
        const point = this.getLogicalPointFromEvent(event);
        const targetId = this._hitTestConnectionTarget(point, relationshipType);
        if (targetId && targetId !== sourceId) {
          this._state = INTERACTION_STATE.IDLE;
          this._session = null;
          this._editor.completeInteractiveConnection(relationshipType, sourceId, targetId);
          this._updateCanvasCursor(point);
        }
      }
      return;
    }

    if (this._state === INTERACTION_STATE.DRAGGING && this._session) {
      const { pointerId, elementId, lastDelta, moved } = this._session;
      this._releasePointer(pointerId);
      this._state = INTERACTION_STATE.IDLE;
      this._session = null;

      if (moved && (lastDelta.dx !== 0 || lastDelta.dy !== 0)) {
        this._editor.commitMoveElement(elementId, lastDelta);
      } else {
        this._editor.clearProvisionalPreview(false);
      }
      this._updateCanvasCursor(this.getLogicalPointFromEvent(event));
      return;
    }

    if (this._state === INTERACTION_STATE.RESIZING && this._session) {
      const { pointerId, elementId, lastBox, moved } = this._session;
      this._releasePointer(pointerId);
      this._state = INTERACTION_STATE.IDLE;
      this._session = null;

      if (moved && lastBox) {
        this._editor.commitResizeElement(elementId, lastBox);
      } else {
        this._editor.clearProvisionalPreview(false);
      }
      this._updateCanvasCursor(this.getLogicalPointFromEvent(event));
    }
  }

  /**
   * Procesa la cancelación de puntero del navegador (`pointercancel`).
   */
  handlePointerCancel() {
    this.cancelCurrentInteraction();
  }

  /**
   * Cancela cualquier acción provisional en curso o restablece la herramienta activa a selección (`Esc` — CAN-07).
   * Garantiza que `DiagramModel` no sufra mutaciones parciales.
   *
   * @returns {boolean} `true` si se canceló una acción o herramienta activa.
   */
  cancelCurrentInteraction() {
    if (this._state !== INTERACTION_STATE.IDLE && this._session) {
      this._releasePointer(this._session.pointerId);
      this._state = INTERACTION_STATE.IDLE;
      this._session = null;
      this._editor.clearProvisionalPreview(true);
      this._setCanvasCursor('default');
      return true;
    }

    if (
      typeof this._editor.getPendingExtendConfirmation === 'function' &&
      this._editor.getPendingExtendConfirmation()
    ) {
      this._editor.cancelPendingExtend();
      this._setCanvasCursor('default');
      return true;
    }

    if (this._editor.getActiveTool().mode !== 'select') {
      this._editor.resetToolToSelect();
      this._setCanvasCursor('default');
      return true;
    }

    return false;
  }

  /**
   * Procesa la rueda del ratón para hacer zoom relativo al cursor sin alterar el modelo.
   * @param {WheelEvent | object} event
   */
  handleWheel(event) {
    if (!event || typeof this._editor.zoomAt !== 'function') {
      return;
    }
    if (typeof event.preventDefault === 'function') {
      event.preventDefault();
    }
    const viewport = this._editor.getViewport();
    const { zoom } = viewport.getState();
    const factor = event.deltaY < 0 ? 1.1 : 1 / 1.1;
    const screenPoint = this.getScreenPointFromEvent(event);
    this._editor.zoomAt(zoom * factor, screenPoint);
  }

  /**
   * Procesa eventos de teclado (`Escape`, `Delete`/`Backspace`, `Space` pan, `Ctrl/Cmd+Z/Y`).
   * @param {KeyboardEvent | object} event
   */
  handleKeyDown(event) {
    if (!event) {
      return;
    }

    if (event.key === 'Escape') {
      const cancelled = this.cancelCurrentInteraction();
      if (cancelled && typeof event.preventDefault === 'function') {
        event.preventDefault();
      }
      return;
    }

    if (isEditableFormControl(event.target)) {
      return;
    }

    const isMod = Boolean(event.ctrlKey || event.metaKey);
    if (isMod && !event.altKey) {
      const keyLower = String(event.key || '').toLowerCase();
      if (keyLower === 'z' && !event.shiftKey) {
        if (typeof event.preventDefault === 'function') {
          event.preventDefault();
        }
        this._editor.undo();
        return;
      }
      if (keyLower === 'y' || (keyLower === 'z' && event.shiftKey)) {
        if (typeof event.preventDefault === 'function') {
          event.preventDefault();
        }
        this._editor.redo();
        return;
      }
    }

    if (event.code === 'Space' || event.key === ' ') {
      if (!this._isSpacePressed) {
        this._isSpacePressed = true;
        if (this._state === INTERACTION_STATE.IDLE) {
          this._setCanvasCursor('grab');
        }
      }
      if (typeof event.preventDefault === 'function') {
        event.preventDefault();
      }
      return;
    }

    if (
      (event.key === 'Delete' || event.key === 'Backspace') &&
      this._state === INTERACTION_STATE.IDLE &&
      this._editor.getSelectedEntityId()
    ) {
      if (typeof event.preventDefault === 'function') {
        event.preventDefault();
      }
      this._editor.deleteSelectedEntity({ descendantPolicy: 'detach' });
    }
  }

  /**
   * Libera el modo pan al soltar la barra espaciadora.
   * @param {KeyboardEvent | object} event
   */
  handleKeyUp(event) {
    if (!event) {
      return;
    }
    if (event.code === 'Space' || event.key === ' ') {
      this._isSpacePressed = false;
      if (this._state === INTERACTION_STATE.IDLE) {
        this._setCanvasCursor('default');
      }
    }
  }

  /**
   * Limpia los listeners registrados.
   */
  destroy() {
    if (this._canvas && typeof this._canvas.removeEventListener === 'function') {
      this._canvas.removeEventListener('pointerdown', this._onPointerDown);
      this._canvas.removeEventListener('pointermove', this._onPointerMove);
      this._canvas.removeEventListener('pointerup', this._onPointerUp);
      this._canvas.removeEventListener('pointercancel', this._onPointerCancel);
      this._canvas.removeEventListener('wheel', this._onWheel);
    }
    if (this._keyboardTarget && typeof this._keyboardTarget.removeEventListener === 'function') {
      this._keyboardTarget.removeEventListener('keydown', this._onKeyDown);
      this._keyboardTarget.removeEventListener('keyup', this._onKeyUp);
    }
  }

  _attachListeners() {
    if (this._canvas && typeof this._canvas.addEventListener === 'function') {
      this._canvas.addEventListener('pointerdown', this._onPointerDown);
      this._canvas.addEventListener('pointermove', this._onPointerMove);
      this._canvas.addEventListener('pointerup', this._onPointerUp);
      this._canvas.addEventListener('pointercancel', this._onPointerCancel);
      this._canvas.addEventListener('wheel', this._onWheel, { passive: false });
    }
    if (this._keyboardTarget && typeof this._keyboardTarget.addEventListener === 'function') {
      this._keyboardTarget.addEventListener('keydown', this._onKeyDown);
      this._keyboardTarget.addEventListener('keyup', this._onKeyUp);
    }
  }

  _capturePointer(pointerId) {
    if (
      this._canvas &&
      typeof this._canvas.setPointerCapture === 'function' &&
      pointerId !== undefined
    ) {
      try {
        this._canvas.setPointerCapture(pointerId);
      } catch {
        // Ignorar en entornos sintéticos sin puntero físico activo
      }
    }
  }

  _releasePointer(pointerId) {
    if (
      this._canvas &&
      typeof this._canvas.releasePointerCapture === 'function' &&
      pointerId !== undefined
    ) {
      try {
        this._canvas.releasePointerCapture(pointerId);
      } catch {
        // Ignorar si la captura ya fue liberada
      }
    }
  }

  _hitTestConnectionTarget(point, relationshipType) {
    const elementHit = this._editor.hitTestElementAt(point);
    if (elementHit) {
      return elementHit.element.id;
    }
    if (
      relationshipType === 'CommentLink' &&
      this._renderer &&
      typeof this._renderer.hitTestRelationshipAt === 'function'
    ) {
      return this._renderer.hitTestRelationshipAt(point, 6);
    }
    return null;
  }

  _updateCanvasCursor(point) {
    const activeTool = this._editor.getActiveTool();
    if (
      activeTool.mode === 'insert-element' ||
      activeTool.mode === 'create-relationship'
    ) {
      this._setCanvasCursor('crosshair');
      return;
    }

    const resizeHit = this._editor.hitTestSelectedResizeHandle(point);
    if (resizeHit) {
      this._setCanvasCursor(HANDLE_CURSOR_MAP[resizeHit.handleDir] || 'nwse-resize');
      return;
    }

    const elementHit = this._editor.hitTestElementAt(point);
    if (elementHit) {
      this._setCanvasCursor('grab');
      return;
    }

    this._setCanvasCursor('default');
  }

  _setCanvasCursor(cursorValue) {
    if (this._canvas && this._canvas.style) {
      this._canvas.style.cursor = cursorValue;
    }
  }
}
