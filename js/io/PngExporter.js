/**
 * Exportación gráfica limpia a PNG mediante Canvas 2D — Incremento UML-06 (RF-IO-03).
 *
 * Reutiliza íntegramente `CanvasRenderer.renderDiagramToContext()` y los descriptores del
 * catálogo activo sin mantener una segunda implementación de dibujo, excluyendo overlays de
 * edición (selección, manejadores, previsualizaciones y rejilla) e independizándose del
 * zoom/pan actual del viewport.
 */

import { CanvasRenderer } from '../canvas/CanvasRenderer.js';
import { Viewport } from '../canvas/Viewport.js';

export const DEFAULT_PNG_PADDING = 32;
export const DEFAULT_PNG_SCALE = 2;
export const MAX_PNG_DIMENSION_PX = 8192;
export const MAX_PNG_TOTAL_PIXELS = 16_777_216; // 16 megapíxeles para acotar memoria de Canvas

/**
 * Calcula los límites lógicos completos del diagrama (elementos y puntos intermedios)
 * para evitar recortes aunque existan figuras fuera del viewport actual.
 *
 * @param {import('../core/DiagramModel.js').DiagramModel} diagramModel
 * @param {{ padding?: number, emptyWidth?: number, emptyHeight?: number }} [options]
 * @returns {{ x: number, y: number, width: number, height: number, isEmpty: boolean }}
 */
export function computeDiagramExportBounds(
  diagramModel,
  { padding = DEFAULT_PNG_PADDING, emptyWidth = 480, emptyHeight = 320 } = {}
) {
  const orderedElements = diagramModel.getElementsInDrawOrder();
  const relationships = diagramModel.getRelationships();

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const { view } of orderedElements) {
    if (!view) {
      continue;
    }
    minX = Math.min(minX, view.x);
    minY = Math.min(minY, view.y);
    maxX = Math.max(maxX, view.x + view.width);
    maxY = Math.max(maxY, view.y + view.height);
  }

  for (const { view } of relationships) {
    const waypoints = Array.isArray(view?.waypoints) ? view.waypoints : [];
    for (const pt of waypoints) {
      if (pt && Number.isFinite(pt.x) && Number.isFinite(pt.y)) {
        minX = Math.min(minX, pt.x);
        minY = Math.min(minY, pt.y);
        maxX = Math.max(maxX, pt.x);
        maxY = Math.max(maxY, pt.y);
      }
    }
  }

  if (!Number.isFinite(minX) || !Number.isFinite(minY)) {
    return {
      x: 0,
      y: 0,
      width: emptyWidth,
      height: emptyHeight,
      isEmpty: true
    };
  }

  // Espacio adicional a la derecha/arriba para profundidad 3D de cubos (12px) y etiquetas
  const pad = Math.max(8, padding);
  return {
    x: Math.floor(minX - pad),
    y: Math.floor(minY - pad),
    width: Math.ceil(maxX - minX + pad * 2 + 12),
    height: Math.ceil(maxY - minY + pad * 2),
    isEmpty: false
  };
}

/**
 * Sugiere un nombre de archivo `.png` seguro a partir del nombre del diagrama.
 *
 * @param {string} diagramName
 * @param {string} diagramType
 * @returns {string}
 */
export function buildSafePngFilename(diagramName, diagramType) {
  const base = String(diagramName || diagramType || 'diagrama-uml')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${base || 'diagrama-uml'}.png`;
}

/**
 * Calcula una escala uniforme y dimensiones en píxeles que nunca excedan
 * `MAX_PNG_DIMENSION_PX` ni `MAX_PNG_TOTAL_PIXELS`, preservando proporciones.
 *
 * @param {{ width: number, height: number }} bounds
 * @param {number} [requestedScale=DEFAULT_PNG_SCALE]
 * @param {{ maxDimension?: number, maxPixels?: number }} [limits]
 * @returns {{ scale: number, pixelWidth: number, pixelHeight: number }}
 */
export function computeSafeExportDimensions(
  bounds,
  requestedScale = DEFAULT_PNG_SCALE,
  { maxDimension = MAX_PNG_DIMENSION_PX, maxPixels = MAX_PNG_TOTAL_PIXELS } = {}
) {
  const rawW = Math.max(1, bounds.width);
  const rawH = Math.max(1, bounds.height);
  const maxRawSide = Math.max(rawW, rawH);

  const scaleBySide = maxDimension / maxRawSide;
  const scaleByArea = Math.sqrt(maxPixels / (rawW * rawH));
  const safeScale = Math.min(requestedScale, scaleBySide, scaleByArea);

  if (!Number.isFinite(safeScale) || safeScale <= 0) {
    throw new Error(
      `Dimensiones de diagrama inválidas para exportar PNG (${rawW}×${rawH}).`
    );
  }

  const pixelWidth = Math.floor(rawW * safeScale);
  const pixelHeight = Math.floor(rawH * safeScale);

  if (
    pixelWidth < 1 ||
    pixelHeight < 1 ||
    pixelWidth > maxDimension ||
    pixelHeight > maxDimension ||
    pixelWidth * pixelHeight > maxPixels
  ) {
    throw new Error(
      `El diagrama (${rawW}×${rawH}) es demasiado extremo para exportarse a PNG dentro del límite de ${maxDimension} px por lado.`
    );
  }

  return { scale: safeScale, pixelWidth, pixelHeight };
}

/**
 * Renderiza el diagrama completo en un Canvas fuera de pantalla limpio y produce un Blob PNG.
 * No modifica el documento, la selección, el viewport activo ni el historial.
 *
 * @param {import('../core/Editor.js').Editor} editor
 * @param {{
 *   padding?: number,
 *   scale?: number,
 *   maxDimension?: number,
 *   maxPixels?: number,
 *   createCanvas?: (w: number, h: number) => HTMLCanvasElement
 * }} [options]
 * @returns {Promise<{ blob: Blob, bounds: { x: number, y: number, width: number, height: number, isEmpty: boolean }, scale: number }>}
 */
export async function exportDiagramToPngBlob(
  editor,
  {
    padding = DEFAULT_PNG_PADDING,
    scale = DEFAULT_PNG_SCALE,
    maxDimension = MAX_PNG_DIMENSION_PX,
    maxPixels = MAX_PNG_TOTAL_PIXELS,
    createCanvas = null
  } = {}
) {
  if (!editor || typeof editor.getDiagramModel !== 'function') {
    throw new TypeError('exportDiagramToPngBlob requiere una instancia válida de Editor.');
  }

  const diagramModel = editor.getDiagramModel();
  const bounds = computeDiagramExportBounds(diagramModel, { padding });

  const {
    scale: safeScale,
    pixelWidth,
    pixelHeight
  } = computeSafeExportDimensions(bounds, scale, { maxDimension, maxPixels });

  const canvasFactory =
    typeof createCanvas === 'function'
      ? createCanvas
      : (w, h) => {
          if (typeof document === 'undefined') {
            throw new Error('No hay entorno DOM disponible para crear el lienzo de exportación PNG.');
          }
          const el = document.createElement('canvas');
          el.width = w;
          el.height = h;
          return el;
        };

  const offscreenCanvas = canvasFactory(pixelWidth, pixelHeight);
  offscreenCanvas.width = pixelWidth;
  offscreenCanvas.height = pixelHeight;

  const ctx = offscreenCanvas.getContext('2d');
  if (!ctx) {
    throw new Error('No fue posible obtener el contexto 2D para exportar PNG.');
  }

  // Viewport de exportación 1:1 trasladado a (-bounds.x, -bounds.y)
  const exportViewport = new Viewport({
    zoom: 1,
    panX: -bounds.x,
    panY: -bounds.y
  });

  CanvasRenderer.renderDiagramToContext(ctx, editor, {
    width: bounds.width,
    height: bounds.height,
    dpr: safeScale,
    viewport: exportViewport,
    includeEditorOverlays: false,
    includeGrid: false,
    useEffectiveViews: false
  });

  const blob = await new Promise((resolve, reject) => {
    if (typeof offscreenCanvas.toBlob !== 'function') {
      reject(new Error('El lienzo no soporta toBlob() para generar PNG.'));
      return;
    }
    offscreenCanvas.toBlob((result) => {
      if (!result) {
        reject(new Error('La generación de imagen PNG devolvió un resultado vacío.'));
        return;
      }
      resolve(result);
    }, 'image/png');
  });

  return { blob, bounds, scale: safeScale };
}
