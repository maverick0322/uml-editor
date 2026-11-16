/**
 * Punto de entrada de la aplicación web — Incrementos UML-01 y UML-02.
 *
 * Inicializa `Editor`, `CanvasRenderer` e `InteractionManager`, conecta las herramientas
 * de inserción de elementos de la paleta lateral, sincroniza la selección entre el Canvas
 * y el panel de propiedades HTML y gestiona la edición validada y eliminación de elementos
 * empleando exclusivamente controles nativos y `textContent` (prevención XSS — RNF-06).
 */

import { Editor } from './core/Editor.js';
import { CanvasRenderer } from './canvas/CanvasRenderer.js';
import { InteractionManager } from './canvas/InteractionManager.js';
import {
  MAX_JSON_FILE_BYTES,
  buildSafeJsonFilename,
  parseAndValidateDiagramJson,
  prepareJsonExport,
  serializeDiagramToJson
} from './io/JsonSerializer.js';
import {
  buildSafePngFilename,
  exportDiagramToPngBlob
} from './io/PngExporter.js';

export const ACCESSIBLE_PAN_STEP_PX = 80;

function parseIntegerPixelValue(rawValue, { allowNegative = true, min = -Infinity } = {}) {
  const trimmed = String(rawValue ?? '').trim();
  if (trimmed.length === 0 || !/^-?\d+$/.test(trimmed)) {
    return { isValid: false };
  }
  const numeric = Number(trimmed);
  if (!Number.isSafeInteger(numeric)) {
    return { isValid: false };
  }
  if (!allowNegative && numeric < 0) {
    return { isValid: false };
  }
  if (numeric < min) {
    return { isValid: false };
  }
  return { isValid: true, value: numeric };
}

/**
 * Conecta los controles HTML accesibles de posición (X/Y) y dimensiones (Ancho/Alto)
 * al controlador `Editor`, reutilizando `commitMoveElement` y `commitResizeElement`.
 *
 * @param {{ doc?: Document, editor: Editor }} params
 */
export function bindElementGeometryControls({ doc = document, editor }) {
  const inputX = doc.getElementById('prop-geom-x');
  const inputY = doc.getElementById('prop-geom-y');
  const inputWidth = doc.getElementById('prop-geom-width');
  const inputHeight = doc.getElementById('prop-geom-height');
  const btnApplyPosition = doc.getElementById('btn-apply-position');
  const btnApplySize = doc.getElementById('btn-apply-size');
  const readonlyNote = doc.getElementById('prop-geom-readonly-note');

  let lastGeomSignature = '';

  function syncGeometryFields(selectedElement) {
    if (!selectedElement || !inputX || !inputY || !inputWidth || !inputHeight) {
      return;
    }
    const view = editor.getDiagramModel().getElementView(selectedElement.id);
    if (!view) {
      return;
    }
    const catalog = editor.getActiveCatalog();
    const descriptor = catalog && catalog.elements ? catalog.elements[selectedElement.type] : null;
    const isResizable = Boolean(descriptor && descriptor.resizable !== false);

    const nextSignature = `${selectedElement.id}:${view.x}:${view.y}:${view.width}:${view.height}:${isResizable}`;
    inputWidth.readOnly = !isResizable;
    inputHeight.readOnly = !isResizable;
    if (btnApplySize) {
      btnApplySize.disabled = !isResizable;
    }
    if (readonlyNote) {
      readonlyNote.hidden = isResizable;
    }

    if (nextSignature !== lastGeomSignature) {
      if (doc.activeElement !== inputX) {
        inputX.value = String(view.x);
      }
      if (doc.activeElement !== inputY) {
        inputY.value = String(view.y);
      }
      if (doc.activeElement !== inputWidth) {
        inputWidth.value = String(view.width);
      }
      if (doc.activeElement !== inputHeight) {
        inputHeight.value = String(view.height);
      }
      lastGeomSignature = nextSignature;
    }
  }

  function resetGeometrySignature() {
    lastGeomSignature = '';
  }

  if (btnApplyPosition) {
    btnApplyPosition.addEventListener('click', () => {
      const selectedId = editor.getSelectedEntityId();
      const view = selectedId ? editor.getDiagramModel().getElementView(selectedId) : null;
      if (!selectedId || !view || !inputX || !inputY) {
        return;
      }
      const parsedX = parseIntegerPixelValue(inputX.value, { allowNegative: true });
      const parsedY = parseIntegerPixelValue(inputY.value, { allowNegative: true });
      if (!parsedX.isValid || !parsedY.isValid) {
        editor.reportFeedback(
          'error',
          'Posición inválida: introduce números enteros finitos para X e Y.'
        );
        return;
      }
      const dx = parsedX.value - view.x;
      const dy = parsedY.value - view.y;
      const result = editor.commitMoveElement(selectedId, { dx, dy });
      if (result.isValid) {
        inputX.value = String(view.x + dx);
        inputY.value = String(view.y + dy);
      }
    });
  }

  if (btnApplySize) {
    btnApplySize.addEventListener('click', () => {
      const selectedId = editor.getSelectedEntityId();
      const diagramModel = editor.getDiagramModel();
      const element = selectedId ? diagramModel.getElementById(selectedId) : null;
      const view = selectedId ? diagramModel.getElementView(selectedId) : null;
      if (!selectedId || !element || !view || !inputWidth || !inputHeight) {
        return;
      }
      const catalog = editor.getActiveCatalog();
      const descriptor = catalog && catalog.elements ? catalog.elements[element.type] : null;
      if (!descriptor || descriptor.resizable === false) {
        editor.reportFeedback(
          'error',
          `El elemento "${element.type}" no admite redimensionamiento.`
        );
        return;
      }
      const parsedW = parseIntegerPixelValue(inputWidth.value, { allowNegative: false, min: 1 });
      const parsedH = parseIntegerPixelValue(inputHeight.value, { allowNegative: false, min: 1 });
      if (!parsedW.isValid || !parsedH.isValid) {
        editor.reportFeedback(
          'error',
          'Dimensiones inválidas: el ancho y el alto deben ser números enteros positivos.'
        );
        return;
      }
      editor.commitResizeElement(selectedId, {
        x: view.x,
        y: view.y,
        width: parsedW.value,
        height: parsedH.value
      });
    });
  }

  return { syncGeometryFields, resetGeometrySignature };
}

function appendDefinitionItem(dlElement, termText, detailText) {
  const wrapper = document.createElement('div');
  wrapper.className = 'property-item';

  const dt = document.createElement('dt');
  dt.className = 'property-term';
  dt.textContent = termText;

  const dd = document.createElement('dd');
  dd.className = 'property-detail';
  dd.textContent = detailText;

  wrapper.appendChild(dt);
  wrapper.appendChild(dd);
  dlElement.appendChild(wrapper);
}

function createTextField({ id, label, value, placeholder = '' }) {
  const field = document.createElement('div');
  field.className = 'form-field';

  const lbl = document.createElement('label');
  lbl.htmlFor = id;
  lbl.className = 'control-label';
  lbl.textContent = label;

  const input = document.createElement('input');
  input.type = 'text';
  input.id = id;
  input.name = id;
  input.className = 'form-input';
  input.value = value ?? '';
  input.placeholder = placeholder;

  field.appendChild(lbl);
  field.appendChild(input);
  return { field, input };
}

function createTextareaField({ id, label, value, rows = 3 }) {
  const field = document.createElement('div');
  field.className = 'form-field';

  const lbl = document.createElement('label');
  lbl.htmlFor = id;
  lbl.className = 'control-label';
  lbl.textContent = label;

  const textarea = document.createElement('textarea');
  textarea.id = id;
  textarea.name = id;
  textarea.rows = rows;
  textarea.className = 'form-textarea';
  textarea.value = value ?? '';

  field.appendChild(lbl);
  field.appendChild(textarea);
  return { field, textarea };
}

function createCheckboxField({ id, label, checked }) {
  const lbl = document.createElement('label');
  lbl.htmlFor = id;
  lbl.className = 'checkbox-row';

  const input = document.createElement('input');
  input.type = 'checkbox';
  input.id = id;
  input.name = id;
  input.checked = Boolean(checked);

  const span = document.createElement('span');
  span.textContent = label;

  lbl.appendChild(input);
  lbl.appendChild(span);
  return { field: lbl, input };
}

function createSelectField({ id, label, options, selectedValue }) {
  const field = document.createElement('div');
  field.className = 'form-field';

  const lbl = document.createElement('label');
  lbl.htmlFor = id;
  lbl.className = 'control-label';
  lbl.textContent = label;

  const select = document.createElement('select');
  select.id = id;
  select.name = id;
  select.className = 'form-select';

  for (const optSpec of options) {
    const opt = document.createElement('option');
    opt.value = optSpec.value;
    opt.textContent = optSpec.label;
    select.appendChild(opt);
  }

  select.value = selectedValue ?? '';
  field.appendChild(lbl);
  field.appendChild(select);
  return { field, select };
}

function renderElementsPalette(listElement, descriptorsMap, editor) {
  listElement.replaceChildren();
  const activeTool = editor.getActiveTool();

  for (const descriptor of Object.values(descriptorsMap)) {
    const li = document.createElement('li');

    const btn = document.createElement('button');
    btn.type = 'button';
    const isActive =
      activeTool.mode === 'insert-element' &&
      activeTool.elementType === descriptor.type;
    btn.className = isActive
      ? 'palette-button palette-button-active'
      : 'palette-button';
    btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    btn.title = `Seleccionar herramienta "${descriptor.label}" y hacer clic en el lienzo para insertar`;

    const labelSpan = document.createElement('span');
    labelSpan.textContent = descriptor.label;

    const tagSpan = document.createElement('span');
    tagSpan.className = 'palette-tag';
    tagSpan.textContent = descriptor.type;

    btn.appendChild(labelSpan);
    btn.appendChild(tagSpan);

    btn.addEventListener('click', () => {
      if (isActive) {
        editor.resetToolToSelect();
      } else {
        editor.setActiveTool({
          mode: 'insert-element',
          elementType: descriptor.type
        });
      }
    });

    li.appendChild(btn);
    listElement.appendChild(li);
  }
}

function renderRelationshipsPalette(listElement, descriptorsMap, editor) {
  listElement.replaceChildren();
  const activeTool = editor.getActiveTool();

  for (const descriptor of Object.values(descriptorsMap)) {
    const li = document.createElement('li');

    const btn = document.createElement('button');
    btn.type = 'button';
    const isActive =
      activeTool.mode === 'create-relationship' &&
      activeTool.relationshipType === descriptor.type;
    btn.className = isActive
      ? 'palette-button palette-button-active'
      : 'palette-button';
    btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    btn.title = `Seleccionar relación "${descriptor.label}" y elegir origen y destino en el lienzo`;

    const labelSpan = document.createElement('span');
    labelSpan.textContent = descriptor.label;

    const tagSpan = document.createElement('span');
    tagSpan.className = 'palette-tag';
    tagSpan.textContent = descriptor.umlKeyword || descriptor.type;

    btn.appendChild(labelSpan);
    btn.appendChild(tagSpan);

    btn.addEventListener('click', () => {
      if (isActive) {
        editor.resetToolToSelect();
      } else {
        editor.setActiveTool({
          mode: 'create-relationship',
          relationshipType: descriptor.type
        });
      }
    });

    li.appendChild(btn);
    listElement.appendChild(li);
  }
}

function populateAccessibleEntitySelector(selectElement, diagramModel, selectedId) {
  selectElement.replaceChildren();

  const summaryOption = document.createElement('option');
  summaryOption.value = '';
  summaryOption.textContent = '— Resumen del documento activo —';
  selectElement.appendChild(summaryOption);

  const elementsGroup = document.createElement('optgroup');
  elementsGroup.label = 'Elementos UML (model.elements)';
  for (const { element } of diagramModel.getElementsInDrawOrder()) {
    const opt = document.createElement('option');
    opt.value = element.id;
    const displayLabel =
      element.name || (element.properties && element.properties.body) || element.id;
    opt.textContent = `[${element.type}] ${String(displayLabel).split('\n')[0]} (${element.id})`;
    elementsGroup.appendChild(opt);
  }
  selectElement.appendChild(elementsGroup);

  const relationshipsGroup = document.createElement('optgroup');
  relationshipsGroup.label = 'Relaciones UML (model.relationships)';
  for (const { relationship } of diagramModel.getRelationships()) {
    const opt = document.createElement('option');
    opt.value = relationship.id;
    opt.textContent = `[${relationship.type}] ${relationship.sourceId} → ${relationship.targetId} (${relationship.id})`;
    relationshipsGroup.appendChild(opt);
  }
  selectElement.appendChild(relationshipsGroup);

  selectElement.value = selectedId || '';
}

function buildElementPropertiesForm(container, element, editor) {
  container.replaceChildren();
  const props = element.properties || {};

  // 1. Campo Nombre o Cuerpo (Comment)
  if (element.type === 'Comment') {
    const { field } = createTextareaField({
      id: 'prop-comment-body',
      label: 'Texto de la nota (body):',
      value: props.body !== undefined ? props.body : element.name,
      rows: 3
    });
    container.appendChild(field);
  } else {
    const { field } = createTextField({
      id: 'prop-element-name',
      label:
        element.type === 'Actor' || element.type === 'UseCase'
          ? 'Nombre (obligatorio — must_have_name):'
          : 'Nombre del elemento:',
      value: element.name
    });
    container.appendChild(field);
  }

  // 2. Selector explícito de contención semántica (parentId — CAN-08)
  const validParents = editor.getAvailableParentContainersFor(element.id);
  const parentOptions = [
    { value: '', label: 'null (Raíz del diagrama — sin contenedor)' },
    ...validParents.map((p) => ({
      value: p.id,
      label: `[${p.type}] ${p.name || p.id} (${p.id})`
    }))
  ];
  const { field: parentField, select: parentSelect } = createSelectField({
    id: 'prop-element-parent',
    label: 'Contenedor semántico (parentId):',
    options: parentOptions,
    selectedValue: element.parentId || ''
  });
  if (validParents.length === 0 && !element.parentId) {
    parentSelect.disabled = true;
  }
  container.appendChild(parentField);

  // 3. Campos específicos según el tipo UML
  if (element.type === 'Actor') {
    const { field: variantField } = createSelectField({
      id: 'prop-actor-variant',
      label: 'Variante de notación (§18.1.4):',
      options: [
        { value: 'stickman', label: 'Stickman (Estándar)' },
        { value: 'rectangle', label: 'Rectángulo «actor»' }
      ],
      selectedValue: props.notationVariant === 'rectangle' ? 'rectangle' : 'stickman'
    });
    const { field: absField } = createCheckboxField({
      id: 'prop-is-abstract',
      label: 'Clasificador abstracto (nombre en cursiva)',
      checked: props.isAbstract
    });
    container.appendChild(variantField);
    container.appendChild(absField);
  } else if (element.type === 'UseCase') {
    const { field: absField } = createCheckboxField({
      id: 'prop-is-abstract',
      label: 'Caso de uso abstracto (nombre en cursiva)',
      checked: props.isAbstract
    });
    const { field: showEpField } = createCheckboxField({
      id: 'prop-show-ep',
      label: 'Mostrar compartimento de extension points',
      checked: props.showExtensionPoints !== false
    });
    const epLines = Array.isArray(props.extensionPoints)
      ? props.extensionPoints.map((ep) => `${ep.id}: ${ep.name}`).join('\n')
      : '';
    const { field: epTextareaField } = createTextareaField({
      id: 'prop-extension-points',
      label: 'Puntos de extensión (uno por línea, formato "id: Nombre"):',
      value: epLines,
      rows: 2
    });
    container.appendChild(absField);
    container.appendChild(showEpField);
    container.appendChild(epTextareaField);
  } else if (element.type === 'SystemBoundary') {
    const { field: stereoField } = createTextField({
      id: 'prop-stereotype',
      label: 'Estereotipo opcional (p. ej. «subsystem»):',
      value: props.stereotype || ''
    });
    container.appendChild(stereoField);
  } else if (
    element.type === 'Node' ||
    element.type === 'Device' ||
    element.type === 'ExecutionEnvironment'
  ) {
    const { field: instField } = createCheckboxField({
      id: 'prop-is-instance',
      label: 'Representar como instancia subrayada (DP-04)',
      checked: props.isInstance
    });
    const { field: clsField } = createTextField({
      id: 'prop-classifier-name',
      label: 'Clasificador base (classifierName — DP-04):',
      value: props.classifierName || '',
      placeholder: 'p. ej. AppServer'
    });
    const { field: stereoField } = createTextField({
      id: 'prop-stereotype',
      label: 'Estereotipo adicional:',
      value: props.stereotype || ''
    });
    container.appendChild(instField);
    container.appendChild(clsField);
    container.appendChild(stereoField);
  } else if (element.type === 'Artifact') {
    const { field: fileField } = createTextField({
      id: 'prop-file-name',
      label: 'Nombre físico de archivo (fileName):',
      value: props.fileName || ''
    });
    const { field: instField } = createCheckboxField({
      id: 'prop-is-instance',
      label: 'Representar como instancia subrayada (DP-04)',
      checked: props.isInstance
    });
    const { field: clsField } = createTextField({
      id: 'prop-classifier-name',
      label: 'Clasificador base (classifierName):',
      value: props.classifierName || ''
    });
    const manifestedLines = Array.isArray(props.manifestedElements)
      ? props.manifestedElements.map((m) => `${m.kind}: ${m.name}`).join('\n')
      : '';
    const { field: manifestedField } = createTextareaField({
      id: 'prop-manifested-elements',
      label: 'Elementos manifestados (uno por línea, "Tipo: Nombre", p. ej. "Component: OrderService"):',
      value: manifestedLines,
      rows: 2
    });
    container.appendChild(fileField);
    container.appendChild(instField);
    container.appendChild(clsField);
    container.appendChild(manifestedField);
  } else if (element.type === 'DeploymentSpecification') {
    const { field: depLocField } = createTextField({
      id: 'prop-deployment-location',
      label: 'Ubicación de despliegue (deploymentLocation):',
      value: props.deploymentLocation || ''
    });
    const { field: execLocField } = createTextField({
      id: 'prop-execution-location',
      label: 'Ubicación de ejecución (executionLocation):',
      value: props.executionLocation || ''
    });
    const specPropLines = Array.isArray(props.properties)
      ? props.properties.map((p) => `${p.name}: ${p.value}`).join('\n')
      : '';
    const { field: specPropsField } = createTextareaField({
      id: 'prop-spec-properties',
      label: 'Propiedades clave/valor (una por línea, formato "Nombre: Valor"):',
      value: specPropLines,
      rows: 3
    });
    container.appendChild(depLocField);
    container.appendChild(execLocField);
    container.appendChild(specPropsField);
  }

  // 4. Si el elemento tiene descendientes semánticos, ofrecer selector explícito de política de borrado
  const descendants = editor.getDiagramModel().getDescendantIds(element.id);
  if (descendants.length > 0) {
    const { field: policyField } = createSelectField({
      id: 'prop-delete-policy',
      label: `Política al eliminar contenedor (${descendants.length} descendiente(s)):`,
      options: [
        {
          value: 'detach',
          label: 'Desacoplar hijos a la raíz (conservar figuras internas)'
        },
        {
          value: 'cascade',
          label: 'Eliminar en cascada contenedor y todos sus descendientes'
        }
      ],
      selectedValue: 'detach'
    });
    container.appendChild(policyField);
  }
}

function readElementChangesFromForm(element) {
  const getVal = (id) => {
    const el = document.getElementById(id);
    return el ? el.value : undefined;
  };
  const getChecked = (id) => {
    const el = document.getElementById(id);
    return el ? Boolean(el.checked) : false;
  };

  const parentRaw = getVal('prop-element-parent');
  const parentId = parentRaw === '' || parentRaw === undefined ? null : parentRaw;
  const updatedProps = { ...(element.properties || {}) };
  let updatedName = element.name;

  if (element.type === 'Comment') {
    updatedProps.body = getVal('prop-comment-body') ?? '';
  } else {
    updatedName = getVal('prop-element-name') ?? '';
  }

  if (element.type === 'Actor') {
    updatedProps.notationVariant =
      getVal('prop-actor-variant') === 'rectangle' ? 'rectangle' : 'stickman';
    updatedProps.isAbstract = getChecked('prop-is-abstract');
  } else if (element.type === 'UseCase') {
    updatedProps.isAbstract = getChecked('prop-is-abstract');
    updatedProps.showExtensionPoints = getChecked('prop-show-ep');

    const rawLines = String(getVal('prop-extension-points') || '')
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    updatedProps.extensionPoints = rawLines.map((line, idx) => {
      const colonIdx = line.indexOf(':');
      if (colonIdx > 0) {
        return {
          id: line.slice(0, colonIdx).trim(),
          name: line.slice(colonIdx + 1).trim()
        };
      }
      return {
        id: `ep-${idx + 1}`,
        name: line
      };
    });
  } else if (element.type === 'SystemBoundary') {
    updatedProps.stereotype = (getVal('prop-stereotype') || '').trim();
  } else if (
    element.type === 'Node' ||
    element.type === 'Device' ||
    element.type === 'ExecutionEnvironment'
  ) {
    updatedProps.isInstance = getChecked('prop-is-instance');
    updatedProps.classifierName = (getVal('prop-classifier-name') || '').trim();
    updatedProps.stereotype = (getVal('prop-stereotype') || '').trim();
  } else if (element.type === 'Artifact') {
    updatedProps.fileName = (getVal('prop-file-name') || '').trim();
    updatedProps.isInstance = getChecked('prop-is-instance');
    updatedProps.classifierName = (getVal('prop-classifier-name') || '').trim();
    const rawManifested = getVal('prop-manifested-elements') || '';
    updatedProps.manifestedElements = rawManifested
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => {
        const colonIdx = line.indexOf(':');
        if (colonIdx === -1) {
          return { kind: 'Component', name: line };
        }
        return {
          kind: line.slice(0, colonIdx).trim(),
          name: line.slice(colonIdx + 1).trim()
        };
      });
  } else if (element.type === 'DeploymentSpecification') {
    updatedProps.deploymentLocation = (getVal('prop-deployment-location') || '').trim();
    updatedProps.executionLocation = (getVal('prop-execution-location') || '').trim();
    const rawSpecProps = getVal('prop-spec-properties') || '';
    updatedProps.properties = rawSpecProps
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => {
        const colonIdx = line.indexOf(':');
        if (colonIdx === -1) {
          return { name: line, value: '' };
        }
        return {
          name: line.slice(0, colonIdx).trim(),
          value: line.slice(colonIdx + 1).trim()
        };
      });
  }

  return {
    name: updatedName,
    parentId,
    properties: updatedProps
  };
}

function renderInspectorDetails(dlElement, editor) {
  dlElement.replaceChildren();
  const diagramModel = editor.getDiagramModel();
  const metadata = diagramModel.getMetadata();
  const counts = diagramModel.getCounts();
  const inspectedId = editor.getInspectedEntityId();

  if (!inspectedId) {
    appendDefinitionItem(dlElement, 'ID Documento', metadata.id);
    appendDefinitionItem(dlElement, 'Nombre', metadata.name);
    appendDefinitionItem(dlElement, 'diagramType', metadata.diagramType);
    appendDefinitionItem(dlElement, 'schemaVersion', String(metadata.schemaVersion));
    appendDefinitionItem(dlElement, 'Total elementos', String(counts.elementsCount));
    appendDefinitionItem(dlElement, 'Total relaciones', String(counts.relationshipsCount));
    return;
  }

  const element = diagramModel.getElementById(inspectedId);
  if (element) {
    const viewBox = editor.getEffectiveElementView(inspectedId);
    const descendants = diagramModel.getDescendantIds(inspectedId);
    appendDefinitionItem(dlElement, 'Categoría', 'Elemento UML (model.elements)');
    appendDefinitionItem(dlElement, 'id', element.id);
    appendDefinitionItem(dlElement, 'type', element.type);
    appendDefinitionItem(dlElement, 'name', element.name || '(sin nombre)');
    appendDefinitionItem(dlElement, 'parentId (contención)', element.parentId || 'null (raíz)');
    appendDefinitionItem(
      dlElement,
      'Descendientes semánticos',
      descendants.length > 0 ? descendants.join(', ') : 'Ninguno'
    );
    if (viewBox) {
      appendDefinitionItem(
        dlElement,
        'Geometría (view.elements)',
        `x=${viewBox.x}, y=${viewBox.y}, w=${viewBox.width}, h=${viewBox.height}`
      );
    }
    appendDefinitionItem(
      dlElement,
      'properties',
      JSON.stringify(element.properties || {})
    );
    return;
  }

  const relationship = diagramModel.getRelationshipById(inspectedId);
  if (relationship) {
    appendDefinitionItem(dlElement, 'Categoría', 'Relación UML (model.relationships)');
    appendDefinitionItem(dlElement, 'id', relationship.id);
    appendDefinitionItem(dlElement, 'type', relationship.type);
    appendDefinitionItem(dlElement, 'sourceId', relationship.sourceId);
    appendDefinitionItem(dlElement, 'targetId', relationship.targetId);
    appendDefinitionItem(
      dlElement,
      'properties',
      JSON.stringify(relationship.properties || {})
    );
  }
}

function initApp() {
  const modeSelect = document.getElementById('diagram-mode-select');
  const btnNew = document.getElementById('btn-new');
  const btnRestoreDemo = document.getElementById('btn-restore-demo');
  const btnToolSelect = document.getElementById('btn-tool-select');
  const paletteElementsList = document.getElementById('palette-elements-list');
  const paletteRelationshipsList = document.getElementById('palette-relationships-list');
  const canvasTitle = document.getElementById('canvas-document-title');
  const canvasSubtitle = document.getElementById('canvas-document-subtitle');
  const accessibleEntitySelect = document.getElementById('accessible-entity-select');
  const propertiesErrorAlert = document.getElementById('properties-error-alert');
  const elementEditorSection = document.getElementById('element-editor-section');
  const elementPropertiesForm = document.getElementById('element-properties-form');
  const elementDynamicFields = document.getElementById('element-dynamic-fields');
  const btnDeleteEntity = document.getElementById('btn-delete-entity');
  const relationshipActionsSection = document.getElementById('relationship-actions-section');
  const btnDeleteRelationship = document.getElementById('btn-delete-relationship');
  const extendConfirmSection = document.getElementById('extend-confirm-section');
  const extendConfirmSummary = document.getElementById('extend-confirm-summary');
  const extendConfirmForm = document.getElementById('extend-confirm-form');
  const extendConfirmEpSelect = document.getElementById('extend-confirm-ep-select');
  const extendConfirmNewEpName = document.getElementById('extend-confirm-new-ep-name');
  const extendConfirmCondition = document.getElementById('extend-confirm-condition');
  const btnCancelExtend = document.getElementById('btn-cancel-extend');
  const relationshipCreatorForm = document.getElementById('relationship-creator-form');
  const relCreateTypeSelect = document.getElementById('rel-create-type');
  const relCreateSourceSelect = document.getElementById('rel-create-source');
  const relCreateTargetSelect = document.getElementById('rel-create-target');
  const relCreateExtendWrapper = document.getElementById('rel-create-extend-wrapper');
  const relCreateExtensionPointSelect = document.getElementById('rel-create-extension-point');
  const relCreateNewEpName = document.getElementById('rel-create-new-ep-name');
  const relCreateExtendCondition = document.getElementById('rel-create-extend-condition');
  const relCreateExtendHint = document.getElementById('rel-create-extend-hint');
  const modelWarningsSection = document.getElementById('model-warnings-section');
  const modelWarningsList = document.getElementById('model-warnings-list');
  const inspectorDetailsList = document.getElementById('inspector-details-list');
  const statusMessage = document.getElementById('status-message');
  const statusDiagramType = document.getElementById('status-diagram-type');
  const statusActiveTool = document.getElementById('status-active-tool');
  const statusModelCounts = document.getElementById('status-model-counts');
  const canvasElement = document.getElementById('uml-canvas');

  const editor = new Editor();
  const renderer = new CanvasRenderer(canvasElement, editor);
  const interactionManager = new InteractionManager({
    canvas: canvasElement,
    editor,
    renderer
  });

  const geometryController = bindElementGeometryControls({ doc: document, editor });

  let lastFormSignature = '';

  function syncStatusBar() {
    const feedback = editor.getStatusFeedback();
    statusMessage.textContent = feedback.message;
    statusMessage.dataset.level = feedback.level;
    statusMessage.className =
      feedback.level === 'error'
        ? 'status-pill status-pill-error'
        : feedback.level === 'info'
          ? 'status-pill status-pill-info'
          : 'status-pill';

    if (feedback.level === 'error') {
      propertiesErrorAlert.textContent = feedback.message;
      propertiesErrorAlert.hidden = false;
    } else {
      propertiesErrorAlert.textContent = '';
      propertiesErrorAlert.hidden = true;
    }

    const activeTool = editor.getActiveTool();
    if (activeTool.mode === 'insert-element') {
      statusActiveTool.textContent = `Insertar ${activeTool.elementType} (clic en lienzo)`;
    } else if (activeTool.mode === 'create-relationship') {
      statusActiveTool.textContent = `Conectar ${activeTool.relationshipType} (origen → destino)`;
    } else {
      statusActiveTool.textContent = 'Selección y manipulación';
    }

    const isSelectActive = activeTool.mode === 'select';
    btnToolSelect.className = isSelectActive
      ? 'palette-button palette-button-active'
      : 'palette-button';
    btnToolSelect.setAttribute('aria-pressed', isSelectActive ? 'true' : 'false');
  }

  function syncExtendExtensionPointField() {
    const selectedRelType = relCreateTypeSelect.value;
    const selectedTargetId = relCreateTargetSelect.value;
    if (selectedRelType !== 'Extend') {
      relCreateExtendWrapper.hidden = true;
      relCreateExtendHint.hidden = true;
      relCreateExtensionPointSelect.replaceChildren();
      return;
    }

    relCreateExtendWrapper.hidden = false;
    const extensionPoints = selectedTargetId
      ? editor.getAvailableExtensionPointsFor(selectedTargetId)
      : [];
    const prevValue = relCreateExtensionPointSelect.value;
    relCreateExtensionPointSelect.replaceChildren();

    if (extensionPoints.length === 0) {
      const emptyOpt = document.createElement('option');
      emptyOpt.value = '';
      emptyOpt.textContent = '— Sin ExtensionPoints disponibles —';
      relCreateExtensionPointSelect.appendChild(emptyOpt);
      relCreateExtendHint.textContent =
        'DP-03: El caso de uso destino no tiene ExtensionPoints. Agregue uno en sus propiedades antes de confirmar Extend.';
      relCreateExtendHint.hidden = false;
    } else {
      relCreateExtendHint.hidden = true;
      for (const ep of extensionPoints) {
        const opt = document.createElement('option');
        opt.value = ep.id;
        opt.textContent = `${ep.name} (${ep.id})`;
        relCreateExtensionPointSelect.appendChild(opt);
      }
      if (extensionPoints.some((ep) => ep.id === prevValue)) {
        relCreateExtensionPointSelect.value = prevValue;
      }
    }
  }

  function syncRelationshipCreatorControls() {
    const diagramModel = editor.getDiagramModel();
    const catalog = editor.getActiveCatalog();
    const prevType = relCreateTypeSelect.value;
    const prevSource = relCreateSourceSelect.value;
    const prevTarget = relCreateTargetSelect.value;

    relCreateTypeSelect.replaceChildren();
    for (const descriptor of Object.values(catalog.relationships)) {
      const opt = document.createElement('option');
      opt.value = descriptor.type;
      opt.textContent = `${descriptor.label} (${descriptor.type})`;
      relCreateTypeSelect.appendChild(opt);
    }
    if (
      prevType &&
      Object.prototype.hasOwnProperty.call(catalog.relationships, prevType)
    ) {
      relCreateTypeSelect.value = prevType;
    }

    const elements = diagramModel.getElementsInDrawOrder().map((entry) => entry.element);
    const relationships = diagramModel
      .getRelationships()
      .map((entry) => entry.relationship)
      .filter((rel) => rel.type !== 'CommentLink');

    relCreateSourceSelect.replaceChildren();
    relCreateTargetSelect.replaceChildren();

    if (elements.length === 0) {
      const emptySrc = document.createElement('option');
      emptySrc.value = '';
      emptySrc.textContent = '— Sin elementos disponibles —';
      relCreateSourceSelect.appendChild(emptySrc);

      const emptyTgt = document.createElement('option');
      emptyTgt.value = '';
      emptyTgt.textContent = '— Sin destinos disponibles —';
      relCreateTargetSelect.appendChild(emptyTgt);
    } else {
      for (const el of elements) {
        const label = `[${el.type}] ${el.name || el.properties?.body || el.id} (${el.id})`;
        const srcOpt = document.createElement('option');
        srcOpt.value = el.id;
        srcOpt.textContent = label;
        relCreateSourceSelect.appendChild(srcOpt);

        const tgtOpt = document.createElement('option');
        tgtOpt.value = el.id;
        tgtOpt.textContent = label;
        relCreateTargetSelect.appendChild(tgtOpt);
      }

      if (relCreateTypeSelect.value === 'CommentLink' && relationships.length > 0) {
        const relGroup = document.createElement('optgroup');
        relGroup.label = 'Relaciones UML semánticas (CMN-REL-01)';
        for (const rel of relationships) {
          const opt = document.createElement('option');
          opt.value = rel.id;
          opt.textContent = `[${rel.type}] ${rel.sourceId} → ${rel.targetId} (${rel.id})`;
          relGroup.appendChild(opt);
        }
        relCreateTargetSelect.appendChild(relGroup);
      }
    }

    if (prevSource && elements.some((el) => el.id === prevSource)) {
      relCreateSourceSelect.value = prevSource;
    }
    if (
      prevTarget &&
      (elements.some((el) => el.id === prevTarget) ||
        (relCreateTypeSelect.value === 'CommentLink' &&
          relationships.some((rel) => rel.id === prevTarget)))
    ) {
      relCreateTargetSelect.value = prevTarget;
    }

    syncExtendExtensionPointField();
  }

  function syncExtendConfirmationPanel() {
    const pending = editor.getPendingExtendConfirmation();
    if (!pending) {
      extendConfirmSection.hidden = true;
      extendConfirmEpSelect.replaceChildren();
      extendConfirmSummary.textContent = '';
      if (extendConfirmNewEpName) {
        extendConfirmNewEpName.value = '';
      }
      if (extendConfirmCondition) {
        extendConfirmCondition.value = '';
      }
      return;
    }

    const diagramModel = editor.getDiagramModel();
    const sourceEl = diagramModel.getElementById(pending.sourceId);
    const targetEl = diagramModel.getElementById(pending.targetId);

    extendConfirmSummary.textContent = `Extensor: ${sourceEl ? sourceEl.name : pending.sourceId} → Base: ${targetEl ? targetEl.name : pending.targetId}`;
    extendConfirmEpSelect.replaceChildren();
    const emptyOpt = document.createElement('option');
    emptyOpt.value = '';
    emptyOpt.textContent =
      pending.extensionPoints.length > 0
        ? '— Seleccione existente o cree uno nuevo abajo —'
        : '— Sin puntos existentes (cree uno nuevo abajo) —';
    extendConfirmEpSelect.appendChild(emptyOpt);

    for (const ep of pending.extensionPoints) {
      const opt = document.createElement('option');
      opt.value = ep.id;
      opt.textContent = `${ep.name} (${ep.id})`;
      extendConfirmEpSelect.appendChild(opt);
    }
    if (pending.extensionPoints.length > 0) {
      extendConfirmEpSelect.value = pending.extensionPoints[0].id;
    }
    extendConfirmSection.hidden = false;
  }

  function syncModelWarningsPanel() {
    const warnings = editor.getModelWarnings();
    modelWarningsList.replaceChildren();
    if (!warnings || warnings.length === 0) {
      modelWarningsSection.hidden = true;
      return;
    }
    for (const warn of warnings) {
      const li = document.createElement('li');
      li.textContent = warn.message;
      modelWarningsList.appendChild(li);
    }
    modelWarningsSection.hidden = false;
  }

  function syncUserInterface() {
    const diagramModel = editor.getDiagramModel();
    const catalog = editor.getActiveCatalog();
    const metadata = diagramModel.getMetadata();
    const counts = diagramModel.getCounts();
    const selectedId = editor.getSelectedEntityId();

    modeSelect.value = metadata.diagramType;
    canvasTitle.textContent = metadata.name;
    canvasSubtitle.textContent = ` · [${catalog.displayName}]`;

    renderElementsPalette(paletteElementsList, catalog.elements, editor);
    renderRelationshipsPalette(paletteRelationshipsList, catalog.relationships, editor);

    populateAccessibleEntitySelector(accessibleEntitySelect, diagramModel, selectedId);
    syncRelationshipCreatorControls();
    syncExtendConfirmationPanel();
    syncModelWarningsPanel();
    renderInspectorDetails(inspectorDetailsList, editor);
    syncStatusBar();

    const btnUndo = document.getElementById('btn-undo');
    const btnRedo = document.getElementById('btn-redo');
    const zoomIndicator = document.getElementById('zoom-level-indicator');
    if (btnUndo) {
      btnUndo.disabled = !editor.canUndo();
    }
    if (btnRedo) {
      btnRedo.disabled = !editor.canRedo();
    }
    if (zoomIndicator) {
      const { zoom } = editor.getViewport().getState();
      zoomIndicator.textContent = `${Math.round(zoom * 100)}%`;
    }

    const selectedElement = selectedId ? diagramModel.getElementById(selectedId) : null;
    const selectedRelationship = selectedId
      ? diagramModel.getRelationshipById(selectedId)
      : null;

    if (selectedElement) {
      elementEditorSection.hidden = false;
      relationshipActionsSection.hidden = true;

      // Evitar reconstruir los inputs mientras se arrastra en vivo el mismo elemento
      const currentSignature = JSON.stringify({
        id: selectedElement.id,
        name: selectedElement.name,
        parentId: selectedElement.parentId,
        properties: selectedElement.properties,
        elementsCount: counts.elementsCount
      });
      if (currentSignature !== lastFormSignature) {
        buildElementPropertiesForm(elementDynamicFields, selectedElement, editor);
        lastFormSignature = currentSignature;
      }
      geometryController.syncGeometryFields(selectedElement);
    } else if (selectedRelationship) {
      elementEditorSection.hidden = true;
      relationshipActionsSection.hidden = false;
      lastFormSignature = '';
      geometryController.resetGeometrySignature();
    } else {
      elementEditorSection.hidden = true;
      relationshipActionsSection.hidden = true;
      lastFormSignature = '';
      geometryController.resetGeometrySignature();
    }

    renderer.requestRender();
  }

  modeSelect.addEventListener('change', (event) => {
    editor.loadSampleDiagram(event.target.value);
  });

  btnNew.addEventListener('click', () => {
    editor.createNewEmptyDiagram(editor.getDiagramType());
  });

  btnRestoreDemo.addEventListener('click', () => {
    editor.loadSampleDiagram(editor.getDiagramType());
  });

  bindToolbarControls({ doc: document, editor, canvasElement });

  btnToolSelect.addEventListener('click', () => {
    editor.resetToolToSelect();
  });

  accessibleEntitySelect.addEventListener('change', (event) => {
    editor.setSelectedEntity(event.target.value || null);
  });

  elementPropertiesForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const selectedId = editor.getSelectedEntityId();
    if (!selectedId) {
      return;
    }
    const element = editor.getDiagramModel().getElementById(selectedId);
    if (!element) {
      return;
    }
    const changes = readElementChangesFromForm(element);
    editor.updateElementProperties(selectedId, changes);
  });

  btnDeleteEntity.addEventListener('click', () => {
    const policySelect = document.getElementById('prop-delete-policy');
    const descendantPolicy =
      policySelect && policySelect.value === 'cascade' ? 'cascade' : 'detach';
    editor.deleteSelectedEntity({ descendantPolicy });
  });

  btnDeleteRelationship.addEventListener('click', () => {
    editor.deleteSelectedEntity();
  });

  relCreateTypeSelect.addEventListener('change', () => {
    syncRelationshipCreatorControls();
  });

  relCreateTargetSelect.addEventListener('change', () => {
    syncExtendExtensionPointField();
  });

  relationshipCreatorForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const type = relCreateTypeSelect.value;
    const sourceId = relCreateSourceSelect.value;
    const targetId = relCreateTargetSelect.value;

    if (type === 'Extend') {
      const res = editor.createExtendRelationship({
        sourceId,
        targetId,
        extensionPointId: relCreateExtensionPointSelect.value,
        newExtensionPointName: relCreateNewEpName ? relCreateNewEpName.value : '',
        condition: relCreateExtendCondition ? relCreateExtendCondition.value : ''
      });
      if (res.isValid) {
        if (relCreateNewEpName) relCreateNewEpName.value = '';
        if (relCreateExtendCondition) relCreateExtendCondition.value = '';
      }
      return;
    }

    editor.createRelationship({
      type,
      sourceId,
      targetId,
      properties: {}
    });
  });

  extendConfirmForm.addEventListener('submit', (event) => {
    event.preventDefault();
    editor.confirmPendingExtend({
      extensionPointId: extendConfirmEpSelect.value,
      newExtensionPointName: extendConfirmNewEpName ? extendConfirmNewEpName.value : '',
      condition: extendConfirmCondition ? extendConfirmCondition.value : ''
    });
  });

  btnCancelExtend.addEventListener('click', () => {
    editor.cancelPendingExtend();
  });

  window.addEventListener('resize', () => {
    renderer.requestRender();
  });

  editor.subscribe(syncUserInterface);
  syncUserInterface();

  // Exponer referencia de solo depuración si fuera necesaria en consola de pruebas
  window.__umlEditorApp = { editor, renderer, interactionManager };
}

/**
 * Conecta los controles de barra superior (historial, zoom/pan, E/S JSON y PNG)
 * reutilizando la referencia explícita `canvasElement` sin variables globales implícitas.
 *
 * @param {{
 *   doc?: Document,
 *   editor: Editor,
 *   canvasElement: HTMLElement,
 *   triggerDownload?: (blob: Blob, filename: string) => void
 * }} options
 */
export function bindToolbarControls({
  doc = document,
  editor,
  canvasElement,
  triggerDownload = null
}) {
  const btnUndo = doc.getElementById('btn-undo');
  const btnRedo = doc.getElementById('btn-redo');
  const btnSaveJson = doc.getElementById('btn-save-json');
  const btnOpenJson = doc.getElementById('btn-open-json');
  const jsonFileInput = doc.getElementById('json-file-input');
  const btnExportPng = doc.getElementById('btn-export-png');
  const btnPanLeft = doc.getElementById('btn-pan-left');
  const btnPanUp = doc.getElementById('btn-pan-up');
  const btnPanDown = doc.getElementById('btn-pan-down');
  const btnPanRight = doc.getElementById('btn-pan-right');
  const btnZoomIn = doc.getElementById('btn-zoom-in');
  const btnZoomOut = doc.getElementById('btn-zoom-out');
  const btnZoomReset = doc.getElementById('btn-zoom-reset');
  const btnZoomFit = doc.getElementById('btn-zoom-fit');

  function getCanvasCenterScreenPoint() {
    const rect = canvasElement.getBoundingClientRect();
    return {
      x: (rect.width || 960) / 2,
      y: (rect.height || 580) / 2
    };
  }

  function defaultTriggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = doc.createElement('a');
    link.href = url;
    link.download = filename;
    doc.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const downloadBlob =
    typeof triggerDownload === 'function' ? triggerDownload : defaultTriggerDownload;

  if (btnUndo) {
    btnUndo.addEventListener('click', () => editor.undo());
  }
  if (btnRedo) {
    btnRedo.addEventListener('click', () => editor.redo());
  }
  if (btnPanLeft) {
    btnPanLeft.addEventListener('click', () => editor.panBy(ACCESSIBLE_PAN_STEP_PX, 0));
  }
  if (btnPanRight) {
    btnPanRight.addEventListener('click', () => editor.panBy(-ACCESSIBLE_PAN_STEP_PX, 0));
  }
  if (btnPanUp) {
    btnPanUp.addEventListener('click', () => editor.panBy(0, ACCESSIBLE_PAN_STEP_PX));
  }
  if (btnPanDown) {
    btnPanDown.addEventListener('click', () => editor.panBy(0, -ACCESSIBLE_PAN_STEP_PX));
  }
  if (btnZoomIn) {
    btnZoomIn.addEventListener('click', () => editor.zoomIn(getCanvasCenterScreenPoint()));
  }
  if (btnZoomOut) {
    btnZoomOut.addEventListener('click', () => editor.zoomOut(getCanvasCenterScreenPoint()));
  }
  if (btnZoomReset) {
    btnZoomReset.addEventListener('click', () => editor.resetViewport());
  }
  if (btnZoomFit) {
    btnZoomFit.addEventListener('click', () => {
      const rect = canvasElement.getBoundingClientRect();
      editor.fitViewportToDiagram({
        width: rect.width || 960,
        height: rect.height || 580
      });
    });
  }

  if (btnSaveJson) {
    btnSaveJson.addEventListener('click', () => {
      const prepared = prepareJsonExport(editor.getDiagramModel());
      if (!prepared.isValid) {
        editor.reportFeedback('error', prepared.errors[0]);
        return;
      }
      const meta = editor.getDiagramModel().getMetadata();
      const filename = buildSafeJsonFilename(meta.name, meta.diagramType);
      const blob = new Blob([prepared.jsonText], { type: 'application/json;charset=utf-8' });
      downloadBlob(blob, filename);
      editor.reportFeedback('ok', `Documento exportado a JSON (${filename}).`);
    });
  }

  if (btnOpenJson && jsonFileInput) {
    btnOpenJson.addEventListener('click', () => {
      jsonFileInput.value = '';
      jsonFileInput.click();
    });

    jsonFileInput.addEventListener('change', async () => {
      const file = jsonFileInput.files && jsonFileInput.files[0];
      if (!file) {
        return;
      }
      if (file.size > MAX_JSON_FILE_BYTES) {
        editor.reportFeedback(
          'error',
          `Archivo demasiado grande (${file.size} bytes; límite ${MAX_JSON_FILE_BYTES} bytes). El diagrama activo permanece intacto.`
        );
        return;
      }
      try {
        const rawText = await file.text();
        const parsed = parseAndValidateDiagramJson(rawText);
        if (!parsed.isValid) {
          editor.reportFeedback('error', `Error al abrir JSON: ${parsed.errors[0]}`);
          return;
        }
        editor.loadDocument(parsed.document);
      } catch (error) {
        editor.reportFeedback(
          'error',
          `No se pudo leer el archivo JSON: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });
  }

  if (btnExportPng) {
    btnExportPng.addEventListener('click', async () => {
      try {
        const { blob } = await exportDiagramToPngBlob(editor);
        const meta = editor.getDiagramModel().getMetadata();
        const filename = buildSafePngFilename(meta.name, meta.diagramType);
        downloadBlob(blob, filename);
        editor.reportFeedback('ok', `Diagrama exportado a PNG limpio (${filename}).`);
      } catch (error) {
        editor.reportFeedback(
          'error',
          `Error al exportar PNG: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', initApp);
}
