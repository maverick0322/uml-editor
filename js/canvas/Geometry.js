/**
 * Funciones geométricas puras para conversión de coordenadas, hit-testing por forma UML,
 * manejadores de redimensionamiento, puntos de anclaje en perímetros y polilíneas —
 * Incrementos UML-01 y UML-02.
 *
 * Independiente del DOM y de Canvas 2D (verificable en Node.js — DIP / RNF-04).
 */

export const RESIZE_HANDLE_DIRECTIONS = Object.freeze([
  'nw',
  'n',
  'ne',
  'e',
  'se',
  's',
  'sw',
  'w'
]);

/**
 * Convierte coordenadas de un PointerEvent (espacio cliente CSS) al espacio lógico del Canvas,
 * contemplando desplazamientos del viewport, diferencias entre dimensiones CSS y resolución
 * interna del lienzo y el factor `devicePixelRatio` (incluso en pantallas estrechas).
 *
 * @param {{ clientX: number, clientY: number }} clientPoint
 * @param {{
 *   rect: { left: number, top: number, width: number, height: number },
 *   canvasWidth?: number,
 *   canvasHeight?: number,
 *   devicePixelRatio?: number
 * }} canvasMetrics
 * @returns {{ x: number, y: number }}
 */
export function clientToCanvasLogicalPoint(clientPoint, canvasMetrics) {
  const { rect, canvasWidth = 0, canvasHeight = 0, devicePixelRatio = 1 } = canvasMetrics || {};
  const dpr = Math.max(1, Number.isFinite(devicePixelRatio) ? devicePixelRatio : 1);

  const safeLeft = rect && Number.isFinite(rect.left) ? rect.left : 0;
  const safeTop = rect && Number.isFinite(rect.top) ? rect.top : 0;
  const rectWidth = rect && rect.width > 0 ? rect.width : canvasWidth / dpr;
  const rectHeight = rect && rect.height > 0 ? rect.height : canvasHeight / dpr;

  const logicalWidth = canvasWidth > 0 ? canvasWidth / dpr : rectWidth;
  const logicalHeight = canvasHeight > 0 ? canvasHeight / dpr : rectHeight;

  const scaleX = rectWidth > 0 ? logicalWidth / rectWidth : 1;
  const scaleY = rectHeight > 0 ? logicalHeight / rectHeight : 1;

  const rawX = (clientPoint.clientX - safeLeft) * scaleX;
  const rawY = (clientPoint.clientY - safeTop) * scaleY;

  return {
    x: Math.round(rawX * 100) / 100,
    y: Math.round(rawY * 100) / 100
  };
}

/**
 * Obtiene el centro geométrico de una caja delimitadora.
 * @param {{ x: number, y: number, width: number, height: number }} box
 * @returns {{ x: number, y: number }}
 */
export function getBoxCenter(box) {
  return {
    x: box.x + box.width / 2,
    y: box.y + box.height / 2
  };
}

/**
 * Comprueba si un punto cae dentro de un rectángulo alineado con los ejes.
 * @param {{ x: number, y: number }} point
 * @param {{ x: number, y: number, width: number, height: number }} box
 * @returns {boolean}
 */
export function isPointInRectangle(point, box) {
  if (!point || !box) {
    return false;
  }
  return (
    point.x >= box.x &&
    point.x <= box.x + box.width &&
    point.y >= box.y &&
    point.y <= box.y + box.height
  );
}

/**
 * Comprueba si un punto cae dentro de la elipse inscrita en `box` (para `UseCase`).
 * @param {{ x: number, y: number }} point
 * @param {{ x: number, y: number, width: number, height: number }} box
 * @returns {boolean}
 */
export function isPointInEllipse(point, box) {
  if (!point || !box || box.width <= 0 || box.height <= 0) {
    return false;
  }
  const rx = box.width / 2;
  const ry = box.height / 2;
  const cx = box.x + rx;
  const cy = box.y + ry;

  const normX = (point.x - cx) / rx;
  const normY = (point.y - cy) / ry;
  return normX * normX + normY * normY <= 1;
}

/**
 * Comprueba si un punto cae dentro del polígono de una nota UML con esquina superior derecha
 * doblada (`Comment` — OMG UML 2.5.1 §7.2.4).
 *
 * @param {{ x: number, y: number }} point
 * @param {{ x: number, y: number, width: number, height: number }} box
 * @returns {boolean}
 */
export function isPointInFoldedNote(point, box) {
  if (!isPointInRectangle(point, box)) {
    return false;
  }
  const fold = Math.min(14, box.width * 0.2, box.height * 0.25);
  const localRightX = point.x - (box.x + box.width - fold);
  const localTopY = point.y - box.y;

  if (localRightX > 0 && localTopY < fold) {
    // El triángulo exterior a la esquina doblada queda fuera del polígono de la nota
    return localRightX <= localTopY;
  }
  return true;
}

/**
 * Comprueba si un punto cae dentro de la proyección 2.5D de un cubo de despliegue
 * (`Node`, `Device`, `ExecutionEnvironment` — OMG UML 2.5.1 §19.4.4).
 *
 * @param {{ x: number, y: number }} point
 * @param {{ x: number, y: number, width: number, height: number }} box
 * @param {number} [depth=12]
 * @returns {boolean}
 */
export function isPointInThreeDimensionalCube(point, box, depth = 12) {
  if (!isPointInRectangle(point, box)) {
    return false;
  }

  const effDepth = Math.min(depth, box.width * 0.25, box.height * 0.25);

  // Esquina superior izquierda fuera del bisel en perspectiva
  const topLeftDx = point.x - box.x;
  const topLeftDy = point.y - box.y;
  if (topLeftDx < effDepth && topLeftDy < effDepth && topLeftDx + topLeftDy < effDepth) {
    return false;
  }

  // Esquina inferior derecha fuera del bisel lateral en perspectiva
  const bottomRightDx = box.x + box.width - point.x;
  const bottomRightDy = box.y + box.height - point.y;
  if (
    bottomRightDx < effDepth &&
    bottomRightDy < effDepth &&
    bottomRightDx + bottomRightDy < effDepth
  ) {
    return false;
  }

  return true;
}

/**
 * Comprueba si un punto cae sobre la figura de un `Actor` (stickman o variante rectángulo).
 *
 * @param {{ x: number, y: number }} point
 * @param {{ x: number, y: number, width: number, height: number }} box
 * @param {'stickman' | 'rectangle'} [variant='stickman']
 * @returns {boolean}
 */
export function isPointInActor(point, box, variant = 'stickman') {
  if (!point || !box) {
    return false;
  }
  if (variant === 'rectangle') {
    return isPointInRectangle(point, box);
  }

  // Para stickman, la silueta cubre el cuerpo central y la franja inferior de la etiqueta
  const labelBandTop = box.y + box.height - 24;
  if (
    point.y >= labelBandTop &&
    point.y <= box.y + box.height &&
    point.x >= box.x - 8 &&
    point.x <= box.x + box.width + 8
  ) {
    return true;
  }

  const bodyMarginX = box.width * 0.1;
  return (
    point.x >= box.x + bodyMarginX &&
    point.x <= box.x + box.width - bodyMarginX &&
    point.y >= box.y &&
    point.y <= box.y + box.height
  );
}

/**
 * Calcula las posiciones de los 8 controladores (handles) de redimensionamiento alrededor de `box`.
 *
 * @param {{ x: number, y: number, width: number, height: number }} box
 * @returns {Array<{ dir: string, x: number, y: number }>}
 */
export function getResizeHandles(box) {
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const right = box.x + box.width;
  const bottom = box.y + box.height;

  return [
    { dir: 'nw', x: box.x, y: box.y },
    { dir: 'n', x: cx, y: box.y },
    { dir: 'ne', x: right, y: box.y },
    { dir: 'e', x: right, y: cy },
    { dir: 'se', x: right, y: bottom },
    { dir: 's', x: cx, y: bottom },
    { dir: 'sw', x: box.x, y: bottom },
    { dir: 'w', x: box.x, y: cy }
  ];
}

/**
 * Determina si `point` impacta alguno de los 8 manejadores de redimensionamiento de `box`.
 * Devuelve la dirección del manejador (`'nw'`, `'se'`, etc.) o `null`.
 *
 * @param {{ x: number, y: number }} point
 * @param {{ x: number, y: number, width: number, height: number }} box
 * @param {number} [tolerance=7]
 * @returns {string | null}
 */
export function hitTestResizeHandle(point, box, tolerance = 7) {
  if (!point || !box) {
    return null;
  }
  const handles = getResizeHandles(box);
  for (const handle of handles) {
    if (
      Math.abs(point.x - handle.x) <= tolerance &&
      Math.abs(point.y - handle.y) <= tolerance
    ) {
      return handle.dir;
    }
  }
  return null;
}

/**
 * Calcula la nueva caja delimitadora al arrastrar un manejador de redimensionamiento,
 * garantizando que nunca sea menor que `minSize` y que el borde opuesto permanezca anclado.
 *
 * @param {{ x: number, y: number, width: number, height: number }} initialBox
 * @param {string} handleDir Dirección del manejador ('nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w').
 * @param {{ dx: number, dy: number }} delta Desplazamiento acumulado desde el inicio del arrastre.
 * @param {{ width: number, height: number }} [minSize={ width: 60, height: 40 }]
 * @returns {{ x: number, y: number, width: number, height: number }}
 */
export function computeResizedBox(
  initialBox,
  handleDir,
  delta,
  minSize = { width: 60, height: 40 }
) {
  const minW = Math.max(20, minSize && minSize.width ? minSize.width : 60);
  const minH = Math.max(20, minSize && minSize.height ? minSize.height : 40);
  const dx = Number.isFinite(delta.dx) ? delta.dx : 0;
  const dy = Number.isFinite(delta.dy) ? delta.dy : 0;

  let { x, y, width, height } = initialBox;
  const right = initialBox.x + initialBox.width;
  const bottom = initialBox.y + initialBox.height;

  if (handleDir.includes('e')) {
    width = Math.max(minW, initialBox.width + dx);
  }
  if (handleDir.includes('s')) {
    height = Math.max(minH, initialBox.height + dy);
  }
  if (handleDir.includes('w')) {
    const candidateWidth = initialBox.width - dx;
    if (candidateWidth >= minW) {
      width = candidateWidth;
      x = initialBox.x + dx;
    } else {
      width = minW;
      x = right - minW;
    }
  }
  if (handleDir.includes('n')) {
    const candidateHeight = initialBox.height - dy;
    if (candidateHeight >= minH) {
      height = candidateHeight;
      y = initialBox.y + dy;
    } else {
      height = minH;
      y = bottom - minH;
    }
  }

  return {
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(width),
    height: Math.round(height)
  };
}

/**
 * Calcula la distancia mínima entre un punto y un segmento de recta `p1 -> p2`.
 * @param {{ x: number, y: number }} point
 * @param {{ x: number, y: number }} p1
 * @param {{ x: number, y: number }} p2
 * @returns {number}
 */
export function distancePointToSegment(point, p1, p2) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const lenSq = dx * dx + dy * dy;

  if (lenSq < 1e-6) {
    return Math.hypot(point.x - p1.x, point.y - p1.y);
  }

  const t = Math.max(
    0,
    Math.min(1, ((point.x - p1.x) * dx + (point.y - p1.y) * dy) / lenSq)
  );
  const projX = p1.x + t * dx;
  const projY = p1.y + t * dy;
  return Math.hypot(point.x - projX, point.y - projY);
}

/**
 * Calcula la distancia mínima de un punto a una polilínea.
 * @param {{ x: number, y: number }} point
 * @param {Array<{ x: number, y: number }>} points
 * @returns {number}
 */
export function distancePointToPolyline(point, points) {
  if (!Array.isArray(points) || points.length === 0) {
    return Number.POSITIVE_INFINITY;
  }
  if (points.length === 1) {
    return Math.hypot(point.x - points[0].x, point.y - points[0].y);
  }

  let minDistance = Number.POSITIVE_INFINITY;
  for (let i = 0; i < points.length - 1; i += 1) {
    const dist = distancePointToSegment(point, points[i], points[i + 1]);
    if (dist < minDistance) {
      minDistance = dist;
    }
  }
  return minDistance;
}

/**
 * Calcula la intersección de un rayo que parte del centro de un rectángulo
 * hacia un punto externo `targetPoint` con el borde del rectángulo.
 *
 * @param {{ x: number, y: number, width: number, height: number }} box
 * @param {{ x: number, y: number }} targetPoint
 * @returns {{ x: number, y: number }}
 */
export function getRectanglePerimeterPoint(box, targetPoint) {
  const center = getBoxCenter(box);
  const dx = targetPoint.x - center.x;
  const dy = targetPoint.y - center.y;

  if (Math.abs(dx) < 1e-6 && Math.abs(dy) < 1e-6) {
    return center;
  }

  const halfW = box.width / 2;
  const halfH = box.height / 2;

  const scaleX = Math.abs(dx) > 1e-6 ? halfW / Math.abs(dx) : Number.POSITIVE_INFINITY;
  const scaleY = Math.abs(dy) > 1e-6 ? halfH / Math.abs(dy) : Number.POSITIVE_INFINITY;
  const scale = Math.min(scaleX, scaleY);

  return {
    x: center.x + dx * scale,
    y: center.y + dy * scale
  };
}

/**
 * Calcula la intersección de un rayo que parte del centro de una elipse inscrita en `box`
 * hacia un punto externo `targetPoint`.
 *
 * @param {{ x: number, y: number, width: number, height: number }} box
 * @param {{ x: number, y: number }} targetPoint
 * @returns {{ x: number, y: number }}
 */
export function getEllipsePerimeterPoint(box, targetPoint) {
  const center = getBoxCenter(box);
  const dx = targetPoint.x - center.x;
  const dy = targetPoint.y - center.y;

  if (Math.abs(dx) < 1e-6 && Math.abs(dy) < 1e-6) {
    return center;
  }

  const rx = box.width / 2;
  const ry = box.height / 2;
  const angle = Math.atan2(dy, dx);
  const denom = Math.sqrt(
    Math.pow(ry * Math.cos(angle), 2) + Math.pow(rx * Math.sin(angle), 2)
  );

  if (denom < 1e-6) {
    return center;
  }

  const r = (rx * ry) / denom;
  return {
    x: center.x + r * Math.cos(angle),
    y: center.y + r * Math.sin(angle)
  };
}

/**
 * Calcula el punto medio a lo largo de una lista de puntos (polilínea).
 * Útil para colocar etiquetas centrales y para anclar un CommentLink a una relación.
 *
 * @param {Array<{ x: number, y: number }>} points
 * @returns {{ x: number, y: number }}
 */
export function getPolylineMidpoint(points) {
  if (!Array.isArray(points) || points.length === 0) {
    return { x: 0, y: 0 };
  }
  if (points.length === 1) {
    return { x: points[0].x, y: points[0].y };
  }

  let totalLength = 0;
  const segments = [];

  for (let i = 0; i < points.length - 1; i += 1) {
    const p1 = points[i];
    const p2 = points[i + 1];
    const length = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    segments.push({ p1, p2, length });
    totalLength += length;
  }

  if (totalLength < 1e-6) {
    return { x: points[0].x, y: points[0].y };
  }

  const halfDistance = totalLength / 2;
  let accumulated = 0;

  for (const seg of segments) {
    if (accumulated + seg.length >= halfDistance) {
      const ratio = seg.length > 1e-6 ? (halfDistance - accumulated) / seg.length : 0;
      return {
        x: seg.p1.x + (seg.p2.x - seg.p1.x) * ratio,
        y: seg.p1.y + (seg.p2.y - seg.p1.y) * ratio
      };
    }
    accumulated += seg.length;
  }

  const last = points[points.length - 1];
  return { x: last.x, y: last.y };
}
