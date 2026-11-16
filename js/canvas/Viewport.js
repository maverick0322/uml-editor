/**
 * Cámara / Viewport 2D para zoom y desplazamiento (`pan`) del lienzo — Incremento UML-06 (CAN-11).
 *
 * Módulo puro sin dependencias del DOM: centraliza las transformaciones entre coordenadas
 * lógicas del documento (mundo) y coordenadas CSS del Canvas (pantalla), garantizando que
 * la navegación nunca modifique el modelo ni las coordenadas almacenadas en `DiagramModel`.
 */

export const DEFAULT_MIN_ZOOM = 0.25;
export const DEFAULT_MAX_ZOOM = 3;
export const DEFAULT_ZOOM_STEP = 0.15;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export class Viewport {
  /**
   * @param {{
   *   zoom?: number,
   *   panX?: number,
   *   panY?: number,
   *   minZoom?: number,
   *   maxZoom?: number,
   *   zoomStep?: number
   * }} [options]
   */
  constructor({
    zoom = 1,
    panX = 0,
    panY = 0,
    minZoom = DEFAULT_MIN_ZOOM,
    maxZoom = DEFAULT_MAX_ZOOM,
    zoomStep = DEFAULT_ZOOM_STEP
  } = {}) {
    this._minZoom = Number.isFinite(minZoom) && minZoom > 0 ? minZoom : DEFAULT_MIN_ZOOM;
    this._maxZoom =
      Number.isFinite(maxZoom) && maxZoom >= this._minZoom ? maxZoom : DEFAULT_MAX_ZOOM;
    this._zoomStep = Number.isFinite(zoomStep) && zoomStep > 0 ? zoomStep : DEFAULT_ZOOM_STEP;

    this._zoom = clamp(Number.isFinite(zoom) ? zoom : 1, this._minZoom, this._maxZoom);
    this._panX = Number.isFinite(panX) ? panX : 0;
    this._panY = Number.isFinite(panY) ? panY : 0;
  }

  /**
   * @returns {{ zoom: number, panX: number, panY: number, minZoom: number, maxZoom: number }}
   */
  getState() {
    return {
      zoom: this._zoom,
      panX: this._panX,
      panY: this._panY,
      minZoom: this._minZoom,
      maxZoom: this._maxZoom
    };
  }

  /**
   * Convierte un punto en coordenadas CSS del Canvas (pantalla) a coordenadas del mundo del diagrama.
   *
   * @param {{ x: number, y: number }} screenPoint
   * @returns {{ x: number, y: number }}
   */
  screenToWorld(screenPoint) {
    return {
      x: (screenPoint.x - this._panX) / this._zoom,
      y: (screenPoint.y - this._panY) / this._zoom
    };
  }

  /**
   * Convierte un punto en coordenadas del mundo del diagrama a coordenadas CSS del Canvas (pantalla).
   *
   * @param {{ x: number, y: number }} worldPoint
   * @returns {{ x: number, y: number }}
   */
  worldToScreen(worldPoint) {
    return {
      x: worldPoint.x * this._zoom + this._panX,
      y: worldPoint.y * this._zoom + this._panY
    };
  }

  /**
   * Aplica zoom manteniendo fijo el punto lógico situado bajo `anchorScreenPoint`.
   *
   * @param {number} nextZoom
   * @param {{ x: number, y: number }} [anchorScreenPoint]
   * @returns {boolean} `true` si cambió el estado del viewport.
   */
  zoomAt(nextZoom, anchorScreenPoint = { x: 0, y: 0 }) {
    if (!Number.isFinite(nextZoom)) {
      return false;
    }
    const clampedZoom = Number(clamp(nextZoom, this._minZoom, this._maxZoom).toFixed(4));
    if (clampedZoom === this._zoom) {
      return false;
    }

    const anchorWorld = this.screenToWorld(anchorScreenPoint);
    this._zoom = clampedZoom;
    this._panX = anchorScreenPoint.x - anchorWorld.x * this._zoom;
    this._panY = anchorScreenPoint.y - anchorWorld.y * this._zoom;
    return true;
  }

  /**
   * @param {{ x: number, y: number }} [anchorScreenPoint]
   * @returns {boolean}
   */
  zoomIn(anchorScreenPoint) {
    return this.zoomAt(this._zoom + this._zoomStep, anchorScreenPoint);
  }

  /**
   * @param {{ x: number, y: number }} [anchorScreenPoint]
   * @returns {boolean}
   */
  zoomOut(anchorScreenPoint) {
    return this.zoomAt(this._zoom - this._zoomStep, anchorScreenPoint);
  }

  /**
   * Desplaza la cámara en píxeles CSS de pantalla.
   *
   * @param {number} dx
   * @param {number} dy
   * @returns {boolean}
   */
  panBy(dx, dy) {
    if (!Number.isFinite(dx) || !Number.isFinite(dy)) {
      return false;
    }
    if (dx === 0 && dy === 0) {
      return false;
    }
    this._panX += dx;
    this._panY += dy;
    return true;
  }

  /**
   * Restablece zoom 100% y desplazamiento (0, 0).
   */
  reset() {
    this._zoom = 1;
    this._panX = 0;
    this._panY = 0;
  }

  /**
   * Ajusta zoom y desplazamiento para encuadrar unos límites del mundo en el área visible.
   *
   * @param {{ x: number, y: number, width: number, height: number }} bounds
   * @param {{ width: number, height: number }} viewportSize
   * @param {number} [padding]
   */
  fitToBounds(bounds, viewportSize, padding = 32) {
    if (
      !bounds ||
      !viewportSize ||
      bounds.width <= 0 ||
      bounds.height <= 0 ||
      viewportSize.width <= 0 ||
      viewportSize.height <= 0
    ) {
      this.reset();
      return;
    }

    const availableW = Math.max(40, viewportSize.width - padding * 2);
    const availableH = Math.max(40, viewportSize.height - padding * 2);
    const scale = Math.min(availableW / bounds.width, availableH / bounds.height, 1.5);
    this._zoom = Number(clamp(scale, this._minZoom, this._maxZoom).toFixed(4));

    const contentCenterX = bounds.x + bounds.width / 2;
    const contentCenterY = bounds.y + bounds.height / 2;
    this._panX = viewportSize.width / 2 - contentCenterX * this._zoom;
    this._panY = viewportSize.height / 2 - contentCenterY * this._zoom;
  }

  /**
   * Aplica la transformación compuesta (`devicePixelRatio` + `pan` + `zoom`) al contexto 2D.
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} [dpr]
   */
  applyToContext(ctx, dpr = 1) {
    const scale = dpr * this._zoom;
    ctx.setTransform(scale, 0, 0, scale, dpr * this._panX, dpr * this._panY);
  }
}
