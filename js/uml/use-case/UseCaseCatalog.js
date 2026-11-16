/**
 * Catálogo declarativo y renderizadores Canvas 2D para el Diagrama de Casos de Uso (`use-case`)
 * conforme a `docs/UML-CATALOG.md` (OMG UML 2.5.1 Cláusula 18) — Incremento UML-01.
 */

import {
  getEllipsePerimeterPoint,
  getPolylineMidpoint,
  getRectanglePerimeterPoint,
  isPointInActor,
  isPointInEllipse,
  isPointInRectangle
} from '../../canvas/Geometry.js';
import {
  CommentElementDescriptor,
  CommentLinkRelationshipDescriptor,
  UML_CANVAS_THEME,
  drawEndMultiplicities,
  drawHollowTriangleArrowhead,
  drawOpenArrowhead,
  drawRelationshipBadge
} from '../common/CommonCatalog.js';
import {
  evaluateUseCaseWarnings,
  validateUseCaseModel
} from './UseCaseValidator.js';

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Dibuja un Actor UML (stickman por defecto o variante rectángulo con «actor»).
 */
const ActorDescriptor = Object.freeze({
  type: 'Actor',
  label: 'Actor',
  umlKeyword: '«actor»',
  isContainer: false,
  resizable: false,
  defaultSize: Object.freeze({ width: 72, height: 105 }),
  minSize: Object.freeze({ width: 56, height: 84 }),
  getMinimumSize(element) {
    if (element?.properties?.notationVariant === 'rectangle') {
      return { width: 110, height: 52 };
    }
    return { width: 56, height: 84 };
  },
  allowedParentTypes: Object.freeze([]),
  allowedChildTypes: Object.freeze([]),
  createDefaultState(index = 1) {
    return {
      name: `Actor ${index}`,
      properties: {
        isAbstract: false,
        notationVariant: 'stickman'
      }
    };
  },
  containsPoint(box, point, element) {
    const variant =
      element && element.properties && element.properties.notationVariant === 'rectangle'
        ? 'rectangle'
        : 'stickman';
    return isPointInActor(point, box, variant);
  },
  validateElement(element) {
    const errors = [];
    if (!isNonEmptyString(element.name)) {
      errors.push(
        `Restricción normativa must_have_name (§18.2.1 [2]): el elemento Actor ("${element.id}") requiere un nombre no vacío.`
      );
    }
    return errors;
  },
  getPerimeterPoint(box, targetPoint) {
    return getRectanglePerimeterPoint(box, targetPoint);
  },
  render(ctx, element, viewBox) {
    const { x, y, width, height } = viewBox;
    const props = element.properties || {};
    const isAbstract = Boolean(props.isAbstract);
    const variant = props.notationVariant === 'rectangle' ? 'rectangle' : 'stickman';

    ctx.save();
    ctx.strokeStyle = UML_CANVAS_THEME.strokePrimary;
    ctx.fillStyle = UML_CANVAS_THEME.fillSurface;
    ctx.lineWidth = 1.6;

    if (variant === 'rectangle') {
      ctx.fillRect(x, y, width, height);
      ctx.strokeRect(x, y, width, height);

      ctx.fillStyle = UML_CANVAS_THEME.textSecondary;
      ctx.font = `11px ${UML_CANVAS_THEME.fontFamily}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText('«actor»', x + width / 2, y + 10, width - 10);

      ctx.fillStyle = UML_CANVAS_THEME.textPrimary;
      ctx.font = `${isAbstract ? 'italic ' : ''}bold 13px ${UML_CANVAS_THEME.fontFamily}`;
      ctx.fillText(element.name, x + width / 2, y + 28, width - 10);
      ctx.restore();
      return;
    }

    // Notación estándar stickman (OMG UML 2.5.1 §18.1.4 Fig. 18.8)
    const cx = x + width / 2;
    const headRadius = Math.min(width, height) * 0.14;
    const headCenterY = y + headRadius + 4;
    const shoulderY = headCenterY + headRadius + 6;
    const hipY = y + height * 0.54;
    const footY = y + height - 22;
    const armSpan = Math.min(width * 0.36, 22);
    const legSpan = Math.min(width * 0.3, 18);

    // Cabeza
    ctx.beginPath();
    ctx.arc(cx, headCenterY, headRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Tronco, brazos y piernas
    ctx.beginPath();
    ctx.moveTo(cx, headCenterY + headRadius);
    ctx.lineTo(cx, hipY);
    ctx.moveTo(cx - armSpan, shoulderY);
    ctx.lineTo(cx + armSpan, shoulderY);
    ctx.moveTo(cx, hipY);
    ctx.lineTo(cx - legSpan, footY);
    ctx.moveTo(cx, hipY);
    ctx.lineTo(cx + legSpan, footY);
    ctx.stroke();

    // Etiqueta del actor debajo de la figura
    ctx.fillStyle = UML_CANVAS_THEME.textPrimary;
    ctx.font = `${isAbstract ? 'italic ' : ''}600 13px ${UML_CANVAS_THEME.fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(element.name, cx, y + height - 2, width + 36);

    ctx.restore();
  }
});

/**
 * Dibuja un Caso de Uso UML (elipse con compartimento opcional `extension points` — §18.1.4 Fig. 18.7).
 */
const UseCaseDescriptor = Object.freeze({
  type: 'UseCase',
  label: 'Caso de Uso',
  umlKeyword: 'UseCase',
  isContainer: false,
  resizable: true,
  defaultSize: Object.freeze({ width: 175, height: 74 }),
  minSize: Object.freeze({ width: 110, height: 52 }),
  allowedParentTypes: Object.freeze(['SystemBoundary']),
  allowedChildTypes: Object.freeze([]),
  createDefaultState(index = 1) {
    return {
      name: `Caso de Uso ${index}`,
      properties: {
        isAbstract: false,
        showExtensionPoints: false,
        extensionPoints: []
      }
    };
  },
  containsPoint(box, point) {
    return isPointInEllipse(point, box);
  },
  validateElement(element) {
    const errors = [];
    if (!isNonEmptyString(element.name)) {
      errors.push(
        `Restricción normativa must_have_name (§18.2.5 [4]): el elemento UseCase ("${element.id}") requiere un nombre no vacío.`
      );
    }
    if (element.properties && Array.isArray(element.properties.extensionPoints)) {
      const epIds = new Set();
      for (const ep of element.properties.extensionPoints) {
        if (!ep || !isNonEmptyString(ep.id) || !isNonEmptyString(ep.name)) {
          errors.push(
            `Restricción normativa must_have_name (§18.2.3 [1]): todo ExtensionPoint en "${element.id}" requiere id y name no vacíos.`
          );
          continue;
        }
        if (epIds.has(ep.id)) {
          errors.push(`ID de ExtensionPoint duplicado "${ep.id}" en UseCase "${element.id}".`);
        }
        epIds.add(ep.id);
      }
    }
    return errors;
  },
  getPerimeterPoint(box, targetPoint) {
    return getEllipsePerimeterPoint(box, targetPoint);
  },
  render(ctx, element, viewBox) {
    const { x, y, width, height } = viewBox;
    const cx = x + width / 2;
    const cy = y + height / 2;
    const rx = width / 2;
    const ry = height / 2;

    const props = element.properties || {};
    const isAbstract = Boolean(props.isAbstract);
    const extensionPoints = Array.isArray(props.extensionPoints) ? props.extensionPoints : [];
    const showCompartment =
      extensionPoints.length > 0 && props.showExtensionPoints !== false;

    ctx.save();
    ctx.fillStyle = UML_CANVAS_THEME.fillSurface;
    ctx.strokeStyle = UML_CANVAS_THEME.strokePrimary;
    ctx.lineWidth = 1.6;

    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    if (!showCompartment) {
      ctx.fillStyle = UML_CANVAS_THEME.textPrimary;
      ctx.font = `${isAbstract ? 'italic ' : ''}600 13px ${UML_CANVAS_THEME.fontFamily}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(element.name, cx, cy, width - 24);
      ctx.restore();
      return;
    }

    // Elipse con compartimento de extension points
    const dividerY = y + height * 0.46;
    const normalizedDy = (dividerY - cy) / ry;
    const halfChord =
      Math.abs(normalizedDy) < 1
        ? rx * Math.sqrt(1 - normalizedDy * normalizedDy)
        : 0;

    ctx.beginPath();
    ctx.moveTo(cx - halfChord, dividerY);
    ctx.lineTo(cx + halfChord, dividerY);
    ctx.stroke();

    // Nombre en la mitad superior
    ctx.fillStyle = UML_CANVAS_THEME.textPrimary;
    ctx.font = `${isAbstract ? 'italic ' : ''}600 13px ${UML_CANVAS_THEME.fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(element.name, cx, y + (dividerY - y) * 0.56, width - 28);

    // Encabezado "extension points" y puntos en la mitad inferior
    ctx.fillStyle = UML_CANVAS_THEME.textSecondary;
    ctx.font = `italic 11px ${UML_CANVAS_THEME.fontFamily}`;
    ctx.fillText('extension points', cx, dividerY + 11, width - 32);

    ctx.fillStyle = UML_CANVAS_THEME.textPrimary;
    ctx.font = `11px ${UML_CANVAS_THEME.fontFamily}`;
    for (let i = 0; i < Math.min(extensionPoints.length, 2); i += 1) {
      ctx.fillText(extensionPoints[i].name, cx, dividerY + 25 + i * 13, width - 36);
    }

    ctx.restore();
  }
});

/**
 * Dibuja un Límite del Sistema / Sujeto (`SystemBoundary` — §18.1.4 Fig. 18.9, DP-02).
 */
const SystemBoundaryDescriptor = Object.freeze({
  type: 'SystemBoundary',
  label: 'Límite del Sistema',
  umlKeyword: '«subject»',
  isContainer: true,
  resizable: true,
  defaultSize: Object.freeze({ width: 320, height: 220 }),
  minSize: Object.freeze({ width: 160, height: 110 }),
  allowedParentTypes: Object.freeze([]),
  allowedChildTypes: Object.freeze(['UseCase']),
  createDefaultState(index = 1) {
    return {
      name: `Sistema ${index}`,
      properties: {
        stereotype: '«subsystem»'
      }
    };
  },
  containsPoint(box, point) {
    return isPointInRectangle(point, box);
  },
  getPerimeterPoint(box, targetPoint) {
    return getRectanglePerimeterPoint(box, targetPoint);
  },
  render(ctx, element, viewBox) {
    const { x, y, width, height } = viewBox;
    const props = element.properties || {};
    const stereotype = props.stereotype ? String(props.stereotype).trim() : '';

    ctx.save();
    ctx.fillStyle = UML_CANVAS_THEME.fillContainer;
    ctx.strokeStyle = UML_CANVAS_THEME.strokePrimary;
    ctx.lineWidth = 1.6;

    ctx.fillRect(x, y, width, height);
    ctx.strokeRect(x, y, width, height);

    // Franja superior discreta para el nombre del sujeto
    const headerHeight = stereotype ? 38 : 28;
    ctx.fillStyle = UML_CANVAS_THEME.fillBoundaryHeader;
    ctx.fillRect(x + 1, y + 1, width - 2, headerHeight);

    ctx.textAlign = 'center';
    if (stereotype) {
      ctx.fillStyle = UML_CANVAS_THEME.textSecondary;
      ctx.font = `11px ${UML_CANVAS_THEME.fontFamily}`;
      ctx.textBaseline = 'top';
      ctx.fillText(stereotype, x + width / 2, y + 4, width - 16);

      ctx.fillStyle = UML_CANVAS_THEME.textPrimary;
      ctx.font = `bold 13px ${UML_CANVAS_THEME.fontFamily}`;
      ctx.fillText(element.name, x + width / 2, y + 19, width - 16);
    } else {
      ctx.fillStyle = UML_CANVAS_THEME.textPrimary;
      ctx.font = `bold 13px ${UML_CANVAS_THEME.fontFamily}`;
      ctx.textBaseline = 'middle';
      ctx.fillText(element.name, x + width / 2, y + headerHeight / 2 + 1, width - 16);
    }

    ctx.restore();
  }
});

/**
 * Asociación binaria Actor ↔ UseCase (§18.1.4).
 */
const AssociationDescriptor = Object.freeze({
  type: 'Association',
  label: 'Asociación',
  umlKeyword: '—',
  validateEndpoints(sourceEl, targetEl, relationship) {
    const isActorToUseCase =
      (sourceEl.type === 'Actor' && targetEl.type === 'UseCase') ||
      (sourceEl.type === 'UseCase' && targetEl.type === 'Actor');
    if (!isActorToUseCase) {
      return [
        `Extremos inválidos para Association ("${relationship.id}"): solo se permite conectar Actor ↔ UseCase, pero se recibió "${sourceEl.type}" -> "${targetEl.type}".`
      ];
    }
    return [];
  },
  render(ctx, relationship, routePoints) {
    if (!routePoints || routePoints.length < 2) {
      return;
    }

    ctx.save();
    ctx.strokeStyle = UML_CANVAS_THEME.strokePrimary;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.moveTo(routePoints[0].x, routePoints[0].y);
    for (let i = 1; i < routePoints.length; i += 1) {
      ctx.lineTo(routePoints[i].x, routePoints[i].y);
    }
    ctx.stroke();

    if (relationship.name) {
      drawRelationshipBadge(ctx, relationship.name, getPolylineMidpoint(routePoints));
    }
    drawEndMultiplicities(ctx, routePoints, relationship.properties);
    ctx.restore();
  }
});

/**
 * Relación Include («include» — §18.1.4 Fig. 18.5, §18.2.4).
 */
const IncludeDescriptor = Object.freeze({
  type: 'Include',
  label: 'Inclusión («include»)',
  umlKeyword: '«include»',
  validateEndpoints(sourceEl, targetEl, relationship) {
    if (sourceEl.type !== 'UseCase' || targetEl.type !== 'UseCase') {
      return [
        `Extremos inválidos para Include ("${relationship.id}"): OMG UML 2.5.1 (§18.2.4) exige UseCase -> UseCase, pero se recibió "${sourceEl.type}" -> "${targetEl.type}".`
      ];
    }
    return [];
  },
  render(ctx, _relationship, routePoints) {
    if (!routePoints || routePoints.length < 2) {
      return;
    }

    const from = routePoints[routePoints.length - 2];
    const to = routePoints[routePoints.length - 1];

    ctx.save();
    ctx.strokeStyle = UML_CANVAS_THEME.strokePrimary;
    ctx.lineWidth = 1.4;
    ctx.setLineDash([6, 4]);

    ctx.beginPath();
    ctx.moveTo(routePoints[0].x, routePoints[0].y);
    for (let i = 1; i < routePoints.length; i += 1) {
      ctx.lineTo(routePoints[i].x, routePoints[i].y);
    }
    ctx.stroke();

    drawOpenArrowhead(ctx, from, to);
    drawRelationshipBadge(ctx, '«include»', getPolylineMidpoint(routePoints));
    ctx.restore();
  }
});

/**
 * Relación Extend («extend» — §18.1.4 Fig. 18.3, §18.2.2, DP-03).
 */
const ExtendDescriptor = Object.freeze({
  type: 'Extend',
  label: 'Extensión («extend»)',
  umlKeyword: '«extend»',
  validateEndpoints(sourceEl, targetEl, relationship) {
    const errors = [];
    if (sourceEl.type !== 'UseCase' || targetEl.type !== 'UseCase') {
      errors.push(
        `Extremos inválidos para Extend ("${relationship.id}"): OMG UML 2.5.1 (§18.2.2) exige UseCase -> UseCase, pero se recibió "${sourceEl.type}" -> "${targetEl.type}".`
      );
      return errors;
    }

    const extLocation = relationship.properties && relationship.properties.extensionLocation;
    const targetExtensionPoints =
      targetEl.properties && Array.isArray(targetEl.properties.extensionPoints)
        ? targetEl.properties.extensionPoints
        : [];
    const hasValidEp = targetExtensionPoints.some((ep) => ep && ep.id === extLocation);
    if (!isNonEmptyString(extLocation) || !hasValidEp) {
      errors.push(
        `La relación Extend "${relationship.id}" debe referenciar un ExtensionPoint válido perteneciente al UseCase destino "${targetEl.id}" (DP-03).`
      );
    }
    return errors;
  },
  render(ctx, relationship, routePoints) {
    if (!routePoints || routePoints.length < 2) {
      return;
    }

    const from = routePoints[routePoints.length - 2];
    const to = routePoints[routePoints.length - 1];
    const props = relationship.properties || {};

    ctx.save();
    ctx.strokeStyle = UML_CANVAS_THEME.strokePrimary;
    ctx.lineWidth = 1.4;
    ctx.setLineDash([6, 4]);

    ctx.beginPath();
    ctx.moveTo(routePoints[0].x, routePoints[0].y);
    for (let i = 1; i < routePoints.length; i += 1) {
      ctx.lineTo(routePoints[i].x, routePoints[i].y);
    }
    ctx.stroke();

    drawOpenArrowhead(ctx, from, to);

    const midpoint = getPolylineMidpoint(routePoints);
    const label = props.extensionLocation
      ? `«extend» (${props.extensionLocation})`
      : '«extend»';
    drawRelationshipBadge(ctx, label, midpoint);
    ctx.restore();
  }
});

/**
 * Relación Generalization (§9.2.4 Fig. 9.2, §18.1.3).
 */
const GeneralizationDescriptor = Object.freeze({
  type: 'Generalization',
  label: 'Generalización',
  umlKeyword: '▷',
  validateEndpoints(sourceEl, targetEl, relationship) {
    const isCompatible =
      (sourceEl.type === 'Actor' && targetEl.type === 'Actor') ||
      (sourceEl.type === 'UseCase' && targetEl.type === 'UseCase');
    if (!isCompatible) {
      return [
        `Extremos inválidos para Generalization ("${relationship.id}"): solo se permite Actor -> Actor o UseCase -> UseCase (§9.9.2 [2]), pero se recibió "${sourceEl.type}" -> "${targetEl.type}".`
      ];
    }
    return [];
  },
  render(ctx, _relationship, routePoints) {
    if (!routePoints || routePoints.length < 2) {
      return;
    }

    const from = routePoints[routePoints.length - 2];
    const to = routePoints[routePoints.length - 1];

    ctx.save();
    ctx.strokeStyle = UML_CANVAS_THEME.strokePrimary;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.moveTo(routePoints[0].x, routePoints[0].y);
    for (let i = 1; i < routePoints.length; i += 1) {
      ctx.lineTo(routePoints[i].x, routePoints[i].y);
    }
    ctx.stroke();

    drawHollowTriangleArrowhead(ctx, from, to);
    ctx.restore();
  }
});

export const UseCaseCatalog = Object.freeze({
  diagramType: 'use-case',
  displayName: 'Diagrama UML de Casos de Uso',
  elements: Object.freeze({
    Actor: ActorDescriptor,
    UseCase: UseCaseDescriptor,
    SystemBoundary: SystemBoundaryDescriptor,
    Comment: CommentElementDescriptor
  }),
  relationships: Object.freeze({
    Association: AssociationDescriptor,
    Include: IncludeDescriptor,
    Extend: ExtendDescriptor,
    Generalization: GeneralizationDescriptor,
    CommentLink: CommentLinkRelationshipDescriptor
  }),
  validateModel: validateUseCaseModel,
  evaluateWarnings: evaluateUseCaseWarnings
});
