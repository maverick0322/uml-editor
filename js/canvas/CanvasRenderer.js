/**
 * Motor de renderizado Canvas 2D compartido por ambos editores — Incrementos UML-01 y UML-02.
 *
 * Responsabilidad única: representar visualmente el estado efectivo de `Editor` / `DiagramModel`
 * bajo demanda mediante `requestAnimationFrame`, adaptando la resolución a `devicePixelRatio`,
 * delegando el dibujo de cada figura/conector al descriptor del catálogo activo y dibujando
 * los indicadores de selección y manejadores de redimensionamiento. No muta el modelo.
 */

import {
  distancePointToPolyline,
  getBoxCenter,
  getPolylineMidpoint,
  getRectanglePerimeterPoint,
  getResizeHandles
} from './Geometry.js';
import {
  UML_CANVAS_THEME,
  drawHollowTriangleArrowhead,
  drawOpenArrowhead,
  drawRelationshipBadge
} from '../uml/common/CommonCatalog.js';

export class CanvasRenderer {
  /**
   * @param {HTMLCanvasElement} canvasElement
   * @param {import('../core/Editor.js').Editor} editor
   */
  constructor(canvasElement, editor) {
    this._canvas = canvasElement;
    this._ctx = canvasElement.getContext('2d');
    this._editor = editor;
    this._rafId = null;
    this._lastComputedRoutes = new Map();
  }

  /**
   * Solicita un redibujado bajo demanda en el siguiente cuadro de animación,
   * evitando redibujados duplicados en el mismo ciclo de eventos (RNF-07).
   */
  requestRender() {
    if (this._rafId !== null) {
      return;
    }
    const raf =
      typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function'
        ? window.requestAnimationFrame.bind(window)
        : (cb) => setTimeout(cb, 16);

    this._rafId = raf(() => {
      this._rafId = null;
      this.renderNow();
    });
  }

  /**
   * Ejecuta inmediatamente el dibujo completo del diagrama activo.
   */
  renderNow() {
    const ctx = this._ctx;
    if (!ctx) {
      return;
    }

    const dpr = Math.max(
      1,
      (typeof window !== 'undefined' && window.devicePixelRatio) || 1
    );
    const rect = this._canvas.getBoundingClientRect();
    const cssWidth = Math.max(300, Math.floor(rect.width || 960));
    const cssHeight = Math.max(240, Math.floor(rect.height || 580));

    const targetWidth = Math.floor(cssWidth * dpr);
    const targetHeight = Math.floor(cssHeight * dpr);

    if (this._canvas.width !== targetWidth || this._canvas.height !== targetHeight) {
      this._canvas.width = targetWidth;
      this._canvas.height = targetHeight;
    }

    const viewport =
      typeof this._editor.getViewport === 'function' ? this._editor.getViewport() : null;

    this._lastComputedRoutes = CanvasRenderer.renderDiagramToContext(ctx, this._editor, {
      width: cssWidth,
      height: cssHeight,
      dpr,
      viewport,
      includeEditorOverlays: true,
      includeGrid: true,
      useEffectiveViews: true
    });
  }

  /**
   * Renderiza el diagrama completo sobre cualquier contexto 2D (lienzo interactivo o
   * exportación limpia PNG), respetando viewport, overlays opcionales y orden de dibujo.
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {import('../core/Editor.js').Editor} editor
   * @param {{
   *   width: number,
   *   height: number,
   *   dpr?: number,
   *   viewport?: import('./Viewport.js').Viewport | null,
   *   includeEditorOverlays?: boolean,
   *   includeGrid?: boolean,
   *   useEffectiveViews?: boolean
   * }} options
   * @returns {Map<string, Array<{ x: number, y: number }>>}
   */
  static renderDiagramToContext(
    ctx,
    editor,
    {
      width,
      height,
      dpr = 1,
      viewport = null,
      includeEditorOverlays = true,
      includeGrid = true,
      useEffectiveViews = true
    }
  ) {
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // 1. Limpieza de superficie completa antes de aplicar cámara/viewport
    ctx.fillStyle = UML_CANVAS_THEME.fillSurface;
    ctx.fillRect(0, 0, width, height);

    if (viewport && typeof viewport.applyToContext === 'function') {
      viewport.applyToContext(ctx, dpr);
    }

    if (includeGrid) {
      CanvasRenderer._drawSubtleGrid(ctx, width, height, viewport);
    }

    const diagramModel = editor.getDiagramModel();
    const catalog = editor.getActiveCatalog();
    const orderedElements =
      useEffectiveViews && typeof editor.getEffectiveElementsInDrawOrder === 'function'
        ? editor.getEffectiveElementsInDrawOrder()
        : diagramModel.getElementsInDrawOrder();
    const relationships = diagramModel.getRelationships();
    const selectedId = includeEditorOverlays ? editor.getInspectedEntityId() : null;

    const elementBoxById = new Map();
    const elementTypeById = new Map();
    let selectedElementEntry = null;

    // 2. Dibujo de elementos respetando estrictamente view.drawOrder (padres antes que hijos)
    for (const { element, view } of orderedElements) {
      elementBoxById.set(element.id, view);
      elementTypeById.set(element.id, element.type);

      const descriptor = catalog.elements[element.type];
      if (descriptor && typeof descriptor.render === 'function') {
        descriptor.render(ctx, element, view);
      }

      if (includeEditorOverlays && selectedId && selectedId === element.id) {
        selectedElementEntry = { element, view, descriptor };
      }
    }

    // 3. Primera pasada de rutas para relaciones semánticas
    const computedRoutes = new Map();
    for (const { relationship, view } of relationships) {
      if (relationship.type === 'CommentLink') {
        continue;
      }
      const route = CanvasRenderer._computeElementToElementRoute(
        relationship,
        view,
        elementBoxById,
        elementTypeById,
        catalog
      );
      if (route) {
        computedRoutes.set(relationship.id, route);
      }
    }

    // Segunda pasada para rutas de CommentLink
    for (const { relationship, view } of relationships) {
      if (relationship.type !== 'CommentLink') {
        continue;
      }
      const route = CanvasRenderer._computeCommentLinkRoute(
        relationship,
        view,
        elementBoxById,
        elementTypeById,
        computedRoutes,
        catalog
      );
      if (route) {
        computedRoutes.set(relationship.id, route);
      }
    }

    // 4. Dibujo de relaciones delegando en su descriptor
    for (const { relationship } of relationships) {
      const route = computedRoutes.get(relationship.id);
      const descriptor = catalog.relationships[relationship.type];
      if (route && descriptor && typeof descriptor.render === 'function') {
        descriptor.render(ctx, relationship, route);
        if (includeEditorOverlays && selectedId && selectedId === relationship.id) {
          CanvasRenderer._drawSelectedRelationshipHighlight(ctx, route);
        }
      }
    }

    // 5. Overlays exclusivos de edición (excluidos en exportación PNG)
    if (includeEditorOverlays) {
      if (selectedElementEntry) {
        const isResizable =
          selectedElementEntry.descriptor &&
          selectedElementEntry.descriptor.resizable !== false;
        CanvasRenderer._drawSelectedElementOverlay(ctx, selectedElementEntry.view, isResizable);
      }

      const provisionalConnection =
        typeof editor.getProvisionalConnection === 'function'
          ? editor.getProvisionalConnection()
          : null;
      if (provisionalConnection) {
        CanvasRenderer._drawProvisionalConnection(
          ctx,
          provisionalConnection,
          elementBoxById,
          elementTypeById,
          catalog
        );
      }
    }

    ctx.restore();
    return computedRoutes;
  }

  /**
   * Comprueba si un punto lógico del Canvas impacta alguna relación dibujada.
   *
   * @param {{ x: number, y: number }} point
   * @param {number} [tolerance=6]
   * @returns {string | null} ID de la relación impactada o `null`.
   */
  hitTestRelationshipAt(point, tolerance = 6) {
    const entries = [...this._lastComputedRoutes.entries()];
    for (let i = entries.length - 1; i >= 0; i -= 1) {
      const [relId, routePoints] = entries[i];
      if (distancePointToPolyline(point, routePoints) <= tolerance) {
        return relId;
      }
    }
    return null;
  }

  /**
   * Calcula la polilínea anclada en los perímetros de sourceId y targetId.
   */
  static _computeElementToElementRoute(
    relationship,
    relView,
    elementBoxById,
    elementTypeById,
    catalog
  ) {
    const sourceBox = elementBoxById.get(relationship.sourceId);
    const targetBox = elementBoxById.get(relationship.targetId);
    if (!sourceBox || !targetBox) {
      return null;
    }

    const sourceDescriptor = catalog.elements[elementTypeById.get(relationship.sourceId)];
    const targetDescriptor = catalog.elements[elementTypeById.get(relationship.targetId)];

    const waypoints = relView && Array.isArray(relView.waypoints) ? relView.waypoints : [];
    const firstTarget = waypoints.length > 0 ? waypoints[0] : getBoxCenter(targetBox);
    const lastSource =
      waypoints.length > 0 ? waypoints[waypoints.length - 1] : getBoxCenter(sourceBox);

    const startPoint =
      sourceDescriptor && typeof sourceDescriptor.getPerimeterPoint === 'function'
        ? sourceDescriptor.getPerimeterPoint(sourceBox, firstTarget)
        : getRectanglePerimeterPoint(sourceBox, firstTarget);

    const endPoint =
      targetDescriptor && typeof targetDescriptor.getPerimeterPoint === 'function'
        ? targetDescriptor.getPerimeterPoint(targetBox, lastSource)
        : getRectanglePerimeterPoint(targetBox, lastSource);

    return [startPoint, ...waypoints, endPoint];
  }

  /**
   * Calcula la ruta de un CommentLink hacia un elemento o hacia el punto medio de una relación UML.
   */
  static _computeCommentLinkRoute(
    relationship,
    relView,
    elementBoxById,
    elementTypeById,
    computedRoutes,
    catalog
  ) {
    if (elementBoxById.has(relationship.targetId)) {
      return this._computeElementToElementRoute(
        relationship,
        relView,
        elementBoxById,
        elementTypeById,
        catalog
      );
    }

    const sourceBox = elementBoxById.get(relationship.sourceId);
    const targetRelRoute = computedRoutes.get(relationship.targetId);
    if (!sourceBox || !targetRelRoute) {
      return null;
    }

    const targetMidpoint = getPolylineMidpoint(targetRelRoute);
    const waypoints = relView && Array.isArray(relView.waypoints) ? relView.waypoints : [];
    const firstTarget = waypoints.length > 0 ? waypoints[0] : targetMidpoint;

    const startPoint = getRectanglePerimeterPoint(sourceBox, firstTarget);
    return [startPoint, ...waypoints, targetMidpoint];
  }

  static _drawProvisionalConnection(
    ctx,
    provisionalConnection,
    elementBoxById,
    elementTypeById,
    catalog
  ) {
    const sourceBox = elementBoxById.get(provisionalConnection.sourceId);
    const targetPoint = provisionalConnection.currentPoint;
    if (!sourceBox || !targetPoint) {
      return;
    }

    const sourceDescriptor =
      catalog && catalog.elements
        ? catalog.elements[elementTypeById.get(provisionalConnection.sourceId)]
        : null;
    const startPoint =
      sourceDescriptor && typeof sourceDescriptor.getPerimeterPoint === 'function'
        ? sourceDescriptor.getPerimeterPoint(sourceBox, targetPoint)
        : getRectanglePerimeterPoint(sourceBox, targetPoint);

    const relType = provisionalConnection.relationshipType;
    const relDescriptor =
      catalog && catalog.relationships ? catalog.relationships[relType] : null;

    ctx.save();
    ctx.strokeStyle = UML_CANVAS_THEME.selectionStroke;
    ctx.lineWidth = 1.75;
    ctx.setLineDash([6, 4]);

    ctx.beginPath();
    ctx.moveTo(startPoint.x, startPoint.y);
    ctx.lineTo(targetPoint.x, targetPoint.y);
    ctx.stroke();

    if (relType === 'Generalization') {
      drawHollowTriangleArrowhead(ctx, startPoint, targetPoint);
    } else if (
      relType === 'Include' ||
      relType === 'Extend' ||
      relType === 'Deployment' ||
      relType === 'Manifestation' ||
      relType === 'Dependency'
    ) {
      drawOpenArrowhead(ctx, startPoint, targetPoint);
    }

    const keyword = relDescriptor && relDescriptor.umlKeyword ? relDescriptor.umlKeyword : '';
    if (keyword && keyword !== '—' && keyword !== '▷' && keyword !== '-->') {
      drawRelationshipBadge(ctx, keyword, getPolylineMidpoint([startPoint, targetPoint]));
    }
    ctx.restore();
  }

  static _drawSubtleGrid(ctx, width, height, viewport = null) {
    const step = 24;
    const topLeft = viewport ? viewport.screenToWorld({ x: 0, y: 0 }) : { x: 0, y: 0 };
    const bottomRight = viewport
      ? viewport.screenToWorld({ x: width, y: height })
      : { x: width, y: height };

    const startX = Math.floor(topLeft.x / step) * step;
    const endX = Math.ceil(bottomRight.x / step) * step;
    const startY = Math.floor(topLeft.y / step) * step;
    const endY = Math.ceil(bottomRight.y / step) * step;

    ctx.save();
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = startX; x <= endX; x += step) {
      ctx.moveTo(x, startY);
      ctx.lineTo(x, endY);
    }
    for (let y = startY; y <= endY; y += step) {
      ctx.moveTo(startX, y);
      ctx.lineTo(endX, y);
    }
    ctx.stroke();
    ctx.restore();
  }

  static _drawSelectedElementOverlay(ctx, viewBox, isResizable) {
    ctx.save();
    ctx.strokeStyle = UML_CANVAS_THEME.selectionStroke;
    ctx.lineWidth = 1.75;
    ctx.setLineDash([5, 3]);
    ctx.strokeRect(
      viewBox.x - 3,
      viewBox.y - 3,
      viewBox.width + 6,
      viewBox.height + 6
    );

    if (isResizable) {
      ctx.setLineDash([]);
      const handleSize = 8;
      const half = handleSize / 2;
      const handles = getResizeHandles(viewBox);
      for (const h of handles) {
        ctx.fillStyle = UML_CANVAS_THEME.fillSurface;
        ctx.strokeStyle = UML_CANVAS_THEME.selectionStroke;
        ctx.lineWidth = 1.5;
        ctx.fillRect(h.x - half, h.y - half, handleSize, handleSize);
        ctx.strokeRect(h.x - half, h.y - half, handleSize, handleSize);
      }
    }

    ctx.restore();
  }

  static _drawSelectedRelationshipHighlight(ctx, routePoints) {
    const midpoint = getPolylineMidpoint(routePoints);
    ctx.save();
    ctx.strokeStyle = UML_CANVAS_THEME.selectionStroke;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(midpoint.x, midpoint.y, 7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}
