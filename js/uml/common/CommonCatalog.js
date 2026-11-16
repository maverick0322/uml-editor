/**
 * Primitivas de dibujo UML compartidas y descriptores comunes (Comment / CommentLink — DP-01)
 * — Incremento UML-01.
 */

import {
  getRectanglePerimeterPoint,
  isPointInFoldedNote
} from '../../canvas/Geometry.js';

export const UML_CANVAS_THEME = Object.freeze({
  strokePrimary: '#1e293b',
  strokeSecondary: '#475569',
  fillSurface: '#ffffff',
  fillContainer: '#f8fafc',
  fillBoundaryHeader: '#eff6ff',
  fillCubeTop: '#f1f5f9',
  fillCubeSide: '#e2e8f0',
  fillNote: '#fefce8',
  fillNoteFold: '#fde047',
  strokeNote: '#a16207',
  textPrimary: '#0f172a',
  textSecondary: '#334155',
  selectionStroke: '#2563eb',
  fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
});

/**
 * Dibuja una punta de flecha abierta (normativa para Include, Extend, Deployment, Manifestation, Dependency).
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ x: number, y: number }} from
 * @param {{ x: number, y: number }} to
 * @param {number} [size=11]
 */
export function drawOpenArrowhead(ctx, from, to, size = 11) {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const spread = Math.PI / 6;

  ctx.save();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(
    to.x - size * Math.cos(angle - spread),
    to.y - size * Math.sin(angle - spread)
  );
  ctx.lineTo(to.x, to.y);
  ctx.lineTo(
    to.x - size * Math.cos(angle + spread),
    to.y - size * Math.sin(angle + spread)
  );
  ctx.stroke();
  ctx.restore();
}

/**
 * Dibuja una punta de triángulo cerrado hueco (normativa para Generalization — OMG UML 2.5.1 §9.2.4).
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ x: number, y: number }} from
 * @param {{ x: number, y: number }} to
 * @param {number} [size=12]
 */
export function drawHollowTriangleArrowhead(ctx, from, to, size = 12) {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const spread = Math.PI / 6;

  const p1 = {
    x: to.x - size * Math.cos(angle - spread),
    y: to.y - size * Math.sin(angle - spread)
  };
  const p2 = {
    x: to.x - size * Math.cos(angle + spread),
    y: to.y - size * Math.sin(angle + spread)
  };

  ctx.save();
  ctx.setLineDash([]);
  ctx.fillStyle = UML_CANVAS_THEME.fillSurface;
  ctx.beginPath();
  ctx.moveTo(to.x, to.y);
  ctx.lineTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

/**
 * Dibuja una etiqueta con pastilla de fondo legible sobre el punto medio de una relación.
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} text
 * @param {{ x: number, y: number }} point
 */
export function drawRelationshipBadge(ctx, text, point) {
  if (!text) {
    return;
  }
  ctx.save();
  ctx.font = `12px ${UML_CANVAS_THEME.fontFamily}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const metrics = ctx.measureText(text);
  const padX = 5;
  const width = metrics.width + padX * 2;
  const height = 18;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.fillRect(point.x - width / 2, point.y - height / 2 - 8, width, height);

  ctx.fillStyle = UML_CANVAS_THEME.textPrimary;
  ctx.fillText(text, point.x, point.y - 8);
  ctx.restore();
}

/**
 * Dibuja las multiplicidades opcionales cerca de los extremos de una relación binaria.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array<{ x: number, y: number }>} points
 * @param {object} properties
 */
export function drawEndMultiplicities(ctx, points, properties = {}) {
  if (!points || points.length < 2) {
    return;
  }

  const start = points[0];
  const next = points[1];
  const end = points[points.length - 1];
  const prev = points[points.length - 2];

  ctx.save();
  ctx.font = `11px ${UML_CANVAS_THEME.fontFamily}`;
  ctx.fillStyle = UML_CANVAS_THEME.textSecondary;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (properties.sourceMultiplicity) {
    const angle = Math.atan2(next.y - start.y, next.x - start.x);
    const mx = start.x + 18 * Math.cos(angle) - 10 * Math.sin(angle);
    const my = start.y + 18 * Math.sin(angle) + 10 * Math.cos(angle);
    ctx.fillText(String(properties.sourceMultiplicity), mx, my);
  }

  if (properties.targetMultiplicity) {
    const angle = Math.atan2(prev.y - end.y, prev.x - end.x);
    const mx = end.x + 18 * Math.cos(angle) + 10 * Math.sin(angle);
    const my = end.y + 18 * Math.sin(angle) - 10 * Math.cos(angle);
    ctx.fillText(String(properties.targetMultiplicity), mx, my);
  }

  ctx.restore();
}

/**
 * Descriptor común para Comment (Nota UML — OMG UML 2.5.1 §7.2.4, §7.8.2; DP-01).
 * Conforme a las matrices 7.2 y 7.4 de docs/UML-CATALOG.md, Comment se ubica siempre en la raíz
 * (parentId: null) y no actúa como contenedor de otros elementos.
 */
export const CommentElementDescriptor = Object.freeze({
  type: 'Comment',
  label: 'Comentario / Nota',
  category: 'element',
  isContainer: false,
  resizable: true,
  defaultSize: Object.freeze({ width: 170, height: 68 }),
  minSize: Object.freeze({ width: 96, height: 48 }),
  allowedParentTypes: Object.freeze([]),
  allowedChildTypes: Object.freeze([]),
  createDefaultState(index = 1) {
    return {
      name: '',
      properties: {
        body: `Nota UML ${index}`
      }
    };
  },
  containsPoint(box, point) {
    return isPointInFoldedNote(point, box);
  },
  getPerimeterPoint(box, targetPoint) {
    return getRectanglePerimeterPoint(box, targetPoint);
  },
  render(ctx, element, viewBox) {
    const { x, y, width, height } = viewBox;
    const fold = Math.min(14, width * 0.2, height * 0.25);

    ctx.save();
    ctx.fillStyle = UML_CANVAS_THEME.fillNote;
    ctx.strokeStyle = UML_CANVAS_THEME.strokeNote;
    ctx.lineWidth = 1.25;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + width - fold, y);
    ctx.lineTo(x + width, y + fold);
    ctx.lineTo(x + width, y + height);
    ctx.lineTo(x, y + height);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Esquina superior derecha doblada
    ctx.fillStyle = UML_CANVAS_THEME.fillNoteFold;
    ctx.beginPath();
    ctx.moveTo(x + width - fold, y);
    ctx.lineTo(x + width - fold, y + fold);
    ctx.lineTo(x + width, y + fold);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    const bodyText =
      (element.properties && typeof element.properties.body === 'string'
        ? element.properties.body
        : element.name) || '';

    const lines = String(bodyText).split('\n');
    ctx.fillStyle = UML_CANVAS_THEME.textPrimary;
    ctx.font = `12px ${UML_CANVAS_THEME.fontFamily}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    const lineHeight = 16;
    const maxLines = Math.max(1, Math.floor((height - 14) / lineHeight));
    for (let i = 0; i < Math.min(lines.length, maxLines); i += 1) {
      ctx.fillText(lines[i], x + 8, y + 8 + i * lineHeight, Math.max(20, width - fold - 12));
    }

    ctx.restore();
  }
});

/**
 * Descriptor común para CommentLink (Enlace de Comentario — OMG UML 2.5.1 §7.2.4; DP-01).
 */
export const CommentLinkRelationshipDescriptor = Object.freeze({
  type: 'CommentLink',
  label: 'Enlace de Comentario',
  category: 'relationship',
  render(ctx, _relationship, routePoints) {
    if (!routePoints || routePoints.length < 2) {
      return;
    }

    ctx.save();
    ctx.strokeStyle = UML_CANVAS_THEME.strokeNote;
    ctx.lineWidth = 1.25;
    ctx.setLineDash([4, 4]);

    ctx.beginPath();
    ctx.moveTo(routePoints[0].x, routePoints[0].y);
    for (let i = 1; i < routePoints.length; i += 1) {
      ctx.lineTo(routePoints[i].x, routePoints[i].y);
    }
    ctx.stroke();
    ctx.restore();
  }
});
