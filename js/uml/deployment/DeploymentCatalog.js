/**
 * Catálogo declarativo y renderizadores Canvas 2D para el Diagrama de Despliegue (`deployment`)
 * conforme a `docs/UML-CATALOG.md` (OMG UML 2.5.1 Cláusula 19) — Incremento UML-01.
 */

import {
  getPolylineMidpoint,
  getRectanglePerimeterPoint,
  isPointInRectangle,
  isPointInThreeDimensionalCube
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
  evaluateDeploymentWarnings,
  validateDeploymentModel
} from './DeploymentValidator.js';

const ALLOWED_MANIFESTED_KINDS = new Set([
  'Component',
  'Package',
  'Class',
  'Interface',
  'Classifier'
]);

/**
 * Valida reglas comunes de nombre (`must_have_name`) y de nivel de instancia (`DP-04`)
 * para elementos clasificadores de despliegue.
 *
 * @param {object} element
 * @param {string} label
 * @returns {string[]}
 */
function validateClassifierDeploymentElement(element, label) {
  const errors = [];
  if (typeof element?.name !== 'string' || element.name.trim().length === 0) {
    errors.push(`Un elemento ${label} debe tener un nombre no vacío (§7.8.10 must_have_name).`);
  }
  const props = element?.properties || {};
  if (props.isInstance !== undefined && typeof props.isInstance !== 'boolean') {
    errors.push(`La propiedad isInstance de ${label} debe ser booleana (DP-04).`);
  }
  if (props.classifierName !== undefined && typeof props.classifierName !== 'string') {
    errors.push(`La propiedad classifierName de ${label} debe ser texto (DP-04).`);
  }
  return errors;
}

/**
 * Formatea el título de un elemento de despliegue respetando la notación de instancia (DP-04).
 * @param {object} element
 * @returns {{ headerText: string, isUnderlined: boolean }}
 */
function formatDeploymentElementTitle(element) {
  const props = element.properties || {};
  const isInstance = Boolean(props.isInstance);
  const classifierName = props.classifierName ? String(props.classifierName).trim() : '';

  if (isInstance) {
    const headerText = classifierName ? `${element.name} : ${classifierName}` : element.name;
    return { headerText, isUnderlined: true };
  }
  return { headerText: element.name, isUnderlined: false };
}

/**
 * Dibuja texto centrado y opcionalmente subrayado (notación de InstanceSpecification — §9.8.4, §19.4.4, DP-04).
 */
function drawCenteredHeaderText(ctx, text, cx, y, maxWidth, isUnderlined) {
  ctx.fillText(text, cx, y, maxWidth);
  if (isUnderlined) {
    const measuredWidth = Math.min(ctx.measureText(text).width, maxWidth);
    ctx.beginPath();
    ctx.moveTo(cx - measuredWidth / 2, y + 15);
    ctx.lineTo(cx + measuredWidth / 2, y + 15);
    ctx.stroke();
  }
}

/**
 * Dibuja un cubo tridimensional UML para Node, Device y ExecutionEnvironment (§19.4.4 Fig. 19.8–19.10).
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} element
 * @param {{ x: number, y: number, width: number, height: number }} viewBox
 * @param {string} defaultKeyword
 */
function renderThreeDimensionalNodeBox(ctx, element, viewBox, defaultKeyword) {
  const { x, y, width, height } = viewBox;
  const depth = 12;
  const frontWidth = Math.max(40, width - depth);
  const frontHeight = Math.max(36, height - depth);
  const frontX = x;
  const frontY = y + depth;

  const props = element.properties || {};
  const keyword =
    defaultKeyword || (props.stereotype ? String(props.stereotype).trim() : '');
  const { headerText, isUnderlined } = formatDeploymentElementTitle(element);

  ctx.save();
  ctx.strokeStyle = UML_CANVAS_THEME.strokePrimary;
  ctx.lineWidth = 1.5;

  // Cara superior en perspectiva
  ctx.fillStyle = UML_CANVAS_THEME.fillCubeTop;
  ctx.beginPath();
  ctx.moveTo(frontX, frontY);
  ctx.lineTo(frontX + depth, y);
  ctx.lineTo(x + width, y);
  ctx.lineTo(frontX + frontWidth, frontY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Cara lateral derecha en perspectiva
  ctx.fillStyle = UML_CANVAS_THEME.fillCubeSide;
  ctx.beginPath();
  ctx.moveTo(frontX + frontWidth, frontY);
  ctx.lineTo(x + width, y);
  ctx.lineTo(x + width, y + frontHeight);
  ctx.lineTo(frontX + frontWidth, frontY + frontHeight);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Cara frontal
  ctx.fillStyle = UML_CANVAS_THEME.fillSurface;
  ctx.fillRect(frontX, frontY, frontWidth, frontHeight);
  ctx.strokeRect(frontX, frontY, frontWidth, frontHeight);

  const cx = frontX + frontWidth / 2;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  if (keyword) {
    ctx.fillStyle = UML_CANVAS_THEME.textSecondary;
    ctx.font = `11px ${UML_CANVAS_THEME.fontFamily}`;
    ctx.fillText(keyword, cx, frontY + 6, frontWidth - 12);

    ctx.fillStyle = UML_CANVAS_THEME.textPrimary;
    ctx.font = `bold 13px ${UML_CANVAS_THEME.fontFamily}`;
    drawCenteredHeaderText(ctx, headerText, cx, frontY + 20, frontWidth - 14, isUnderlined);
  } else {
    ctx.fillStyle = UML_CANVAS_THEME.textPrimary;
    ctx.font = `bold 13px ${UML_CANVAS_THEME.fontFamily}`;
    drawCenteredHeaderText(ctx, headerText, cx, frontY + 10, frontWidth - 14, isUnderlined);
  }

  ctx.restore();
}

const DEPLOYMENT_TARGET_TYPES = Object.freeze(
  new Set(['Node', 'Device', 'ExecutionEnvironment'])
);

const DEPLOYED_ARTIFACT_TYPES = Object.freeze(
  new Set(['Artifact', 'DeploymentSpecification'])
);

const NodeDescriptor = Object.freeze({
  type: 'Node',
  label: 'Nodo',
  umlKeyword: 'Node',
  isContainer: true,
  resizable: true,
  defaultSize: Object.freeze({ width: 220, height: 140 }),
  minSize: Object.freeze({ width: 130, height: 85 }),
  allowedParentTypes: Object.freeze(['Node', 'Device']),
  allowedChildTypes: Object.freeze([
    'Node',
    'Device',
    'ExecutionEnvironment',
    'Artifact',
    'DeploymentSpecification'
  ]),
  createDefaultState(index = 1) {
    return {
      name: `Nodo ${index}`,
      properties: {
        isInstance: false,
        classifierName: '',
        stereotype: ''
      }
    };
  },
  containsPoint(box, point) {
    return isPointInThreeDimensionalCube(point, box, 12);
  },
  getPerimeterPoint(box, targetPoint) {
    return getRectanglePerimeterPoint(box, targetPoint);
  },
  validateElement(element) {
    return validateClassifierDeploymentElement(element, 'Node');
  },
  render(ctx, element, viewBox) {
    renderThreeDimensionalNodeBox(ctx, element, viewBox, '');
  }
});

const DeviceDescriptor = Object.freeze({
  type: 'Device',
  label: 'Dispositivo («device»)',
  umlKeyword: '«device»',
  isContainer: true,
  resizable: true,
  defaultSize: Object.freeze({ width: 230, height: 145 }),
  minSize: Object.freeze({ width: 135, height: 90 }),
  allowedParentTypes: Object.freeze(['Node', 'Device']),
  allowedChildTypes: Object.freeze([
    'Node',
    'Device',
    'ExecutionEnvironment',
    'Artifact',
    'DeploymentSpecification'
  ]),
  createDefaultState(index = 1) {
    return {
      name: `srv-0${index}`,
      properties: {
        isInstance: false,
        classifierName: 'Server',
        stereotype: ''
      }
    };
  },
  containsPoint(box, point) {
    return isPointInThreeDimensionalCube(point, box, 12);
  },
  getPerimeterPoint(box, targetPoint) {
    return getRectanglePerimeterPoint(box, targetPoint);
  },
  validateElement(element) {
    return validateClassifierDeploymentElement(element, 'Device');
  },
  render(ctx, element, viewBox) {
    renderThreeDimensionalNodeBox(ctx, element, viewBox, '«device»');
  }
});

const ExecutionEnvironmentDescriptor = Object.freeze({
  type: 'ExecutionEnvironment',
  label: 'Entorno de Ejecución',
  umlKeyword: '«executionEnvironment»',
  isContainer: true,
  resizable: true,
  defaultSize: Object.freeze({ width: 205, height: 120 }),
  minSize: Object.freeze({ width: 130, height: 80 }),
  allowedParentTypes: Object.freeze(['Node', 'Device', 'ExecutionEnvironment']),
  allowedChildTypes: Object.freeze([
    'ExecutionEnvironment',
    'Artifact',
    'DeploymentSpecification'
  ]),
  createDefaultState(index = 1) {
    return {
      name: `Runtime ${index}`,
      properties: {
        isInstance: false,
        classifierName: '',
        stereotype: ''
      }
    };
  },
  containsPoint(box, point) {
    return isPointInThreeDimensionalCube(point, box, 12);
  },
  getPerimeterPoint(box, targetPoint) {
    return getRectanglePerimeterPoint(box, targetPoint);
  },
  validateElement(element) {
    return validateClassifierDeploymentElement(element, 'ExecutionEnvironment');
  },
  render(ctx, element, viewBox) {
    renderThreeDimensionalNodeBox(ctx, element, viewBox, '«executionEnvironment»');
  }
});

/**
 * Dibuja un Artefacto (`Artifact` — §19.3.4 Fig. 19.5, §19.5.1, con soporte de `manifestedElements`).
 */
const ArtifactDescriptor = Object.freeze({
  type: 'Artifact',
  label: 'Artefacto («artifact»)',
  umlKeyword: '«artifact»',
  isContainer: true,
  resizable: true,
  defaultSize: Object.freeze({ width: 185, height: 64 }),
  minSize: Object.freeze({ width: 120, height: 48 }),
  allowedParentTypes: Object.freeze(['Node', 'Device', 'ExecutionEnvironment', 'Artifact']),
  allowedChildTypes: Object.freeze(['Artifact', 'DeploymentSpecification']),
  createDefaultState(index = 1) {
    return {
      name: `artefacto-${index}.jar`,
      properties: {
        fileName: `artefacto-${index}.jar`,
        isInstance: false,
        classifierName: '',
        manifestedElements: []
      }
    };
  },
  containsPoint(box, point) {
    return isPointInRectangle(point, box);
  },
  getPerimeterPoint(box, targetPoint) {
    return getRectanglePerimeterPoint(box, targetPoint);
  },
  getMinimumSize(element) {
    const manifested = Array.isArray(element?.properties?.manifestedElements)
      ? element.properties.manifestedElements
      : [];
    if (manifested.length === 0) {
      return { width: 120, height: 48 };
    }
    return {
      width: 120,
      height: 51 + manifested.length * 13
    };
  },
  validateElement(element) {
    const errors = validateClassifierDeploymentElement(element, 'Artifact');
    const props = element?.properties || {};
    if (props.fileName !== undefined && typeof props.fileName !== 'string') {
      errors.push('La propiedad fileName de Artifact debe ser una cadena de texto.');
    }
    if (props.manifestedElements !== undefined) {
      if (!Array.isArray(props.manifestedElements)) {
        errors.push('manifestedElements de Artifact debe ser un arreglo.');
      } else {
        for (const entry of props.manifestedElements) {
          if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
            errors.push('Cada elemento manifestado en Artifact debe ser un objeto { name, kind }.');
            continue;
          }
          if (typeof entry.name !== 'string' || entry.name.trim().length === 0) {
            errors.push('Cada elemento manifestado en Artifact debe tener un nombre no vacío.');
          }
          if (typeof entry.kind !== 'string' || !ALLOWED_MANIFESTED_KINDS.has(entry.kind)) {
            errors.push(
              `Tipo manifestado inválido "${entry.kind}": use Component, Package, Class, Interface o Classifier.`
            );
          }
        }
      }
    }
    return errors;
  },
  render(ctx, element, viewBox) {
    const { x, y, width, height } = viewBox;
    const props = element.properties || {};
    const { headerText, isUnderlined } = formatDeploymentElementTitle(element);
    const manifestedElements = Array.isArray(props.manifestedElements)
      ? props.manifestedElements
      : [];

    ctx.save();
    if (typeof ctx.rect === 'function' && typeof ctx.clip === 'function') {
      ctx.beginPath();
      ctx.rect(x, y, width, height);
      ctx.clip();
    }
    ctx.fillStyle = UML_CANVAS_THEME.fillSurface;
    ctx.strokeStyle = UML_CANVAS_THEME.strokePrimary;
    ctx.lineWidth = 1.5;

    ctx.fillRect(x, y, width, height);
    ctx.strokeRect(x, y, width, height);

    // Icono normativo de documento en la esquina superior derecha
    const iconX = x + width - 19;
    const iconY = y + 6;
    const iconW = 12;
    const iconH = 15;
    const fold = 4;

    ctx.beginPath();
    ctx.moveTo(iconX, iconY);
    ctx.lineTo(iconX + iconW - fold, iconY);
    ctx.lineTo(iconX + iconW, iconY + fold);
    ctx.lineTo(iconX + iconW, iconY + iconH);
    ctx.lineTo(iconX, iconY + iconH);
    ctx.closePath();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(iconX + iconW - fold, iconY);
    ctx.lineTo(iconX + iconW - fold, iconY + fold);
    ctx.lineTo(iconX + iconW, iconY + fold);
    ctx.stroke();

    const cx = x + width / 2;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    ctx.fillStyle = UML_CANVAS_THEME.textSecondary;
    ctx.font = `11px ${UML_CANVAS_THEME.fontFamily}`;
    ctx.fillText('«artifact»', cx, y + 7, width - 36);

    ctx.fillStyle = UML_CANVAS_THEME.textPrimary;
    ctx.font = `bold 12px ${UML_CANVAS_THEME.fontFamily}`;
    drawCenteredHeaderText(ctx, headerText, cx, y + 21, width - 16, isUnderlined);

    // Compartimento completo y determinista para elementos manifestados (DEP-REL-03)
    if (manifestedElements.length > 0 && height >= 58) {
      const dividerY = y + 40;
      ctx.beginPath();
      ctx.moveTo(x, dividerY);
      ctx.lineTo(x + width, dividerY);
      ctx.stroke();

      ctx.textAlign = 'left';
      ctx.fillStyle = UML_CANVAS_THEME.textSecondary;
      ctx.font = `11px ${UML_CANVAS_THEME.fontFamily}`;
      for (let i = 0; i < manifestedElements.length; i += 1) {
        const entry = manifestedElements[i];
        const text = `«manifest» ${entry.kind}: ${entry.name}`;
        ctx.fillText(text, x + 8, dividerY + 5 + i * 13, width - 16);
      }
    }

    ctx.restore();
  }
});

/**
 * Dibuja una Especificación de Despliegue (`DeploymentSpecification` — §19.2.4, §19.5.5).
 */
const DeploymentSpecificationDescriptor = Object.freeze({
  type: 'DeploymentSpecification',
  label: 'Especificación de Despliegue',
  umlKeyword: '«deploymentSpec»',
  isContainer: false,
  resizable: true,
  defaultSize: Object.freeze({ width: 195, height: 68 }),
  minSize: Object.freeze({ width: 125, height: 50 }),
  allowedParentTypes: Object.freeze(['Node', 'Device', 'ExecutionEnvironment', 'Artifact']),
  allowedChildTypes: Object.freeze([]),
  createDefaultState(index = 1) {
    return {
      name: `deploy-spec-${index}.yaml`,
      properties: {
        deploymentLocation: '/opt/app',
        executionLocation: 'default',
        properties: []
      }
    };
  },
  containsPoint(box, point) {
    return isPointInRectangle(point, box);
  },
  getPerimeterPoint(box, targetPoint) {
    return getRectanglePerimeterPoint(box, targetPoint);
  },
  getMinimumSize(element) {
    const props = element?.properties || {};
    let lineCount = 0;
    if (props.deploymentLocation) {
      lineCount += 1;
    }
    if (props.executionLocation) {
      lineCount += 1;
    }
    if (Array.isArray(props.properties)) {
      lineCount += props.properties.length;
    }
    if (lineCount === 0) {
      return { width: 125, height: 50 };
    }
    return {
      width: 125,
      height: 48 + lineCount * 13
    };
  },
  validateElement(element) {
    const errors = [];
    if (typeof element?.name !== 'string' || element.name.trim().length === 0) {
      errors.push('DeploymentSpecification debe tener un nombre no vacío (§7.8.10 must_have_name).');
    }
    const props = element?.properties || {};
    if (props.deploymentLocation !== undefined && typeof props.deploymentLocation !== 'string') {
      errors.push('deploymentLocation de DeploymentSpecification debe ser una cadena de texto.');
    }
    if (props.executionLocation !== undefined && typeof props.executionLocation !== 'string') {
      errors.push('executionLocation de DeploymentSpecification debe ser una cadena de texto.');
    }
    if (props.properties !== undefined) {
      if (!Array.isArray(props.properties)) {
        errors.push('properties de DeploymentSpecification debe ser un arreglo de pares { name, value }.');
      } else {
        for (const pair of props.properties) {
          if (!pair || typeof pair !== 'object' || Array.isArray(pair)) {
            errors.push('Cada entrada de DeploymentSpecification.properties debe ser un objeto { name, value }.');
            continue;
          }
          if (typeof pair.name !== 'string' || pair.name.trim().length === 0) {
            errors.push('Cada propiedad de DeploymentSpecification debe tener un nombre no vacío.');
          }
          if (typeof pair.value !== 'string') {
            errors.push('Cada propiedad de DeploymentSpecification debe tener un valor textual válido.');
          }
        }
      }
    }
    return errors;
  },
  render(ctx, element, viewBox) {
    const { x, y, width, height } = viewBox;
    const props = element.properties || {};

    ctx.save();
    if (typeof ctx.rect === 'function' && typeof ctx.clip === 'function') {
      ctx.beginPath();
      ctx.rect(x, y, width, height);
      ctx.clip();
    }
    ctx.fillStyle = UML_CANVAS_THEME.fillSurface;
    ctx.strokeStyle = UML_CANVAS_THEME.strokePrimary;
    ctx.lineWidth = 1.4;

    ctx.fillRect(x, y, width, height);
    ctx.strokeRect(x, y, width, height);

    const cx = x + width / 2;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    ctx.fillStyle = UML_CANVAS_THEME.textSecondary;
    ctx.font = `11px ${UML_CANVAS_THEME.fontFamily}`;
    ctx.fillText('«deploymentSpec»', cx, y + 6, width - 12);

    ctx.fillStyle = UML_CANVAS_THEME.textPrimary;
    ctx.font = `bold 12px ${UML_CANVAS_THEME.fontFamily}`;
    ctx.fillText(element.name, cx, y + 20, width - 12);

    const lines = [];
    if (props.deploymentLocation) {
      lines.push(`deploymentLocation: ${props.deploymentLocation}`);
    }
    if (props.executionLocation) {
      lines.push(`executionLocation: ${props.executionLocation}`);
    }
    if (Array.isArray(props.properties)) {
      for (const item of props.properties) {
        lines.push(`${item.name}: ${item.value}`);
      }
    }

    if (lines.length > 0 && height >= 54) {
      const dividerY = y + 37;
      ctx.beginPath();
      ctx.moveTo(x, dividerY);
      ctx.lineTo(x + width, dividerY);
      ctx.stroke();

      ctx.textAlign = 'left';
      ctx.font = `11px ${UML_CANVAS_THEME.fontFamily}`;
      ctx.fillStyle = UML_CANVAS_THEME.textSecondary;
      for (let i = 0; i < lines.length; i += 1) {
        ctx.fillText(lines[i], x + 8, dividerY + 5 + i * 13, width - 16);
      }
    }

    ctx.restore();
  }
});

/**
 * Camino de Comunicación (`CommunicationPath` — §19.4.4, §19.5.2).
 */
const CommunicationPathDescriptor = Object.freeze({
  type: 'CommunicationPath',
  label: 'Camino de Comunicación',
  umlKeyword: '—',
  validateEndpoints(sourceEl, targetEl, relationship) {
    if (
      !DEPLOYMENT_TARGET_TYPES.has(sourceEl.type) ||
      !DEPLOYMENT_TARGET_TYPES.has(targetEl.type)
    ) {
      return [
        `Extremos inválidos para CommunicationPath ("${relationship.id}"): OMG UML 2.5.1 (§19.5.2 [1]) exige DeploymentTarget <-> DeploymentTarget, pero se recibió "${sourceEl.type}" -> "${targetEl.type}".`
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
    ctx.lineWidth = 1.6;
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.moveTo(routePoints[0].x, routePoints[0].y);
    for (let i = 1; i < routePoints.length; i += 1) {
      ctx.lineTo(routePoints[i].x, routePoints[i].y);
    }
    ctx.stroke();

    const props = relationship.properties || {};
    const label = props.stereotype || relationship.name || '';
    if (label) {
      drawRelationshipBadge(ctx, label, getPolylineMidpoint(routePoints));
    }
    drawEndMultiplicities(ctx, routePoints, props);
    ctx.restore();
  }
});

/**
 * Crea un descriptor de dependencia dirigida con etiqueta fija o configurable.
 * @param {string} type
 * @param {string} label
 * @param {string} defaultBadge
 */
function createDashedDirectedDescriptor(type, label, defaultBadge, validateEndpoints) {
  return Object.freeze({
    type,
    label,
    umlKeyword: defaultBadge || '-->',
    validateEndpoints,
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

      const badge = defaultBadge || props.stereotype || relationship.name || '';
      if (badge) {
        drawRelationshipBadge(ctx, badge, getPolylineMidpoint(routePoints));
      }
      ctx.restore();
    }
  });
}

const DeploymentRelationshipDescriptor = createDashedDirectedDescriptor(
  'Deployment',
  'Despliegue («deploy»)',
  '«deploy»',
  (sourceEl, targetEl, relationship) => {
    if (
      !DEPLOYED_ARTIFACT_TYPES.has(sourceEl.type) ||
      !DEPLOYMENT_TARGET_TYPES.has(targetEl.type)
    ) {
      return [
        `Extremos inválidos para Deployment ("${relationship.id}"): OMG UML 2.5.1 (§19.5.4) exige DeployedArtifact -> DeploymentTarget, pero se recibió "${sourceEl.type}" -> "${targetEl.type}".`
      ];
    }
    if (sourceEl.parentId === targetEl.id) {
      return [
        `Relación Deployment redundante ("${relationship.id}"): el artefacto "${sourceEl.id}" ya está desplegado por contención directa en "${targetEl.id}".`
      ];
    }
    return [];
  }
);

const ManifestationRelationshipDescriptor = createDashedDirectedDescriptor(
  'Manifestation',
  'Manifestación («manifest»)',
  '«manifest»',
  (sourceEl, targetEl, relationship) => {
    if (
      !DEPLOYED_ARTIFACT_TYPES.has(sourceEl.type) ||
      !DEPLOYED_ARTIFACT_TYPES.has(targetEl.type)
    ) {
      return [
        `Extremos inválidos para Manifestation ("${relationship.id}"): en el lienzo de despliegue solo se permite conectar Artifact/DeploymentSpecification -> Artifact/DeploymentSpecification (DEP-REL-03), pero se recibió "${sourceEl.type}" -> "${targetEl.type}".`
      ];
    }
    return [];
  }
);

const DependencyRelationshipDescriptor = createDashedDirectedDescriptor(
  'Dependency',
  'Dependencia',
  '',
  (sourceEl, targetEl, relationship) => {
    const bothTargets =
      DEPLOYMENT_TARGET_TYPES.has(sourceEl.type) &&
      DEPLOYMENT_TARGET_TYPES.has(targetEl.type);
    const bothArtifacts =
      DEPLOYED_ARTIFACT_TYPES.has(sourceEl.type) &&
      DEPLOYED_ARTIFACT_TYPES.has(targetEl.type);
    if (!bothTargets && !bothArtifacts) {
      return [
        `Extremos inválidos para Dependency ("${relationship.id}"): en el diagrama de despliegue solo se permite entre nodos o entre artefactos/especificaciones (Matriz 7.3), pero se recibió "${sourceEl.type}" -> "${targetEl.type}".`
      ];
    }
    return [];
  }
);

const GeneralizationRelationshipDescriptor = Object.freeze({
  type: 'Generalization',
  label: 'Generalización',
  umlKeyword: '▷',
  validateEndpoints(sourceEl, targetEl, relationship) {
    const errors = [];
    const bothNodes =
      DEPLOYMENT_TARGET_TYPES.has(sourceEl.type) &&
      DEPLOYMENT_TARGET_TYPES.has(targetEl.type);
    const artifactToArtifact =
      sourceEl.type === 'Artifact' && targetEl.type === 'Artifact';
    const specToSpecOrArtifact =
      sourceEl.type === 'DeploymentSpecification' &&
      (targetEl.type === 'DeploymentSpecification' || targetEl.type === 'Artifact');

    if (!bothNodes && !artifactToArtifact && !specToSpecOrArtifact) {
      errors.push(
        `Extremos inválidos para Generalization ("${relationship.id}"): incompatibilidad taxonómica entre "${sourceEl.type}" y "${targetEl.type}" (§9.9.2 [2], Matriz 7.3).`
      );
    }

    if (
      (sourceEl.properties && sourceEl.properties.isInstance) ||
      (targetEl.properties && targetEl.properties.isInstance)
    ) {
      errors.push(
        `Restricción normativa de Generalization ("${relationship.id}"): los elementos marcados como instancia (isInstance: true, DP-04) no pueden participar en relaciones de generalización (§9.2.2).`
      );
    }

    return errors;
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

export const DeploymentCatalog = Object.freeze({
  diagramType: 'deployment',
  displayName: 'Diagrama UML de Despliegue',
  elements: Object.freeze({
    Node: NodeDescriptor,
    Device: DeviceDescriptor,
    ExecutionEnvironment: ExecutionEnvironmentDescriptor,
    Artifact: ArtifactDescriptor,
    DeploymentSpecification: DeploymentSpecificationDescriptor,
    Comment: CommentElementDescriptor
  }),
  relationships: Object.freeze({
    CommunicationPath: CommunicationPathDescriptor,
    Deployment: DeploymentRelationshipDescriptor,
    Manifestation: ManifestationRelationshipDescriptor,
    Dependency: DependencyRelationshipDescriptor,
    Generalization: GeneralizationRelationshipDescriptor,
    CommentLink: CommentLinkRelationshipDescriptor
  }),
  validateModel: validateDeploymentModel,
  evaluateWarnings: evaluateDeploymentWarnings
});
