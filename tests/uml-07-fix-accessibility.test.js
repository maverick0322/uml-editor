import test from 'node:test';
import assert from 'node:assert/strict';

import { Editor } from '../js/core/Editor.js';
import { UseCaseCatalog } from '../js/uml/use-case/UseCaseCatalog.js';
import { DeploymentCatalog } from '../js/uml/deployment/DeploymentCatalog.js';
import { getBoxCenter, getEllipsePerimeterPoint } from '../js/canvas/Geometry.js';
import {
  ACCESSIBLE_PAN_STEP_PX,
  bindElementGeometryControls,
  bindToolbarControls
} from '../js/main.js';

function createMockGeometryDocument() {
  const elements = new Map();
  const makeControl = (id) => {
    const handlers = {};
    const ctrl = {
      id,
      value: '',
      readOnly: false,
      disabled: false,
      hidden: false,
      textContent: '',
      addEventListener: (ev, fn) => {
        handlers[ev] = fn;
      },
      click: () => {
        if (!ctrl.disabled && handlers.click) {
          handlers.click();
        }
      },
      focus: () => {
        doc.activeElement = ctrl;
      }
    };
    elements.set(id, ctrl);
    return ctrl;
  };

  const doc = {
    activeElement: null,
    getElementById: (id) => elements.get(id) || makeControl(id)
  };

  for (const id of [
    'prop-geom-x',
    'prop-geom-y',
    'prop-geom-width',
    'prop-geom-height',
    'btn-apply-position',
    'btn-apply-size',
    'prop-geom-readonly-note',
    'btn-pan-left',
    'btn-pan-up',
    'btn-pan-down',
    'btn-pan-right',
    'json-file-input',
    'zoom-level-indicator'
  ]) {
    makeControl(id);
  }

  return doc;
}

function createMinimalCanvas() {
  return {
    width: 960,
    height: 600,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 960, height: 600 })
  };
}

test('UML-07-FIX.1 Movimiento X/Y por formulario sin arrastre, historial de 1 entrada, Undo/Redo y recálculo de anclajes', () => {
  const editor = new Editor({
    catalogs: { 'use-case': UseCaseCatalog, deployment: DeploymentCatalog }
  });
  editor.createNewEmptyDiagram('use-case');

  const actor = editor.insertElementAt('Actor', { x: 100, y: 120 });
  const uc = editor.insertElementAt('UseCase', { x: 320, y: 120 });
  const rel = editor.createRelationship({
    type: 'Association',
    sourceId: actor.elementId,
    targetId: uc.elementId
  });
  assert.equal(rel.isValid, true);

  const doc = createMockGeometryDocument();
  const geomCtrl = bindElementGeometryControls({ doc, editor });
  editor.subscribe(() => {
    const id = editor.getSelectedEntityId();
    const el = id ? editor.getDiagramModel().getElementById(id) : null;
    if (el) {
      geomCtrl.syncGeometryFields(el);
    } else {
      geomCtrl.resetGeometrySignature();
    }
  });
  editor.setSelectedEntity(uc.elementId);

  const initialView = { ...editor.getDiagramModel().getElementView(uc.elementId) };
  const actorCenter = getBoxCenter(editor.getDiagramModel().getElementView(actor.elementId));
  const anchorBefore = getEllipsePerimeterPoint(initialView, actorCenter);

  // Modificar X e Y en los inputs y pulsar Aplicar posición
  doc.getElementById('prop-geom-x').value = String(initialView.x + 100);
  doc.getElementById('prop-geom-y').value = String(initialView.y + 60);
  doc.getElementById('btn-apply-position').click();

  const movedView = editor.getDiagramModel().getElementView(uc.elementId);
  assert.equal(movedView.x, initialView.x + 100);
  assert.equal(movedView.y, initialView.y + 60);

  // Verificar recálculo de anclajes
  const anchorAfter = getEllipsePerimeterPoint(movedView, actorCenter);
  assert.notDeepEqual(anchorAfter, anchorBefore);

  // Confirmar sin cambios no agrega entrada al historial
  const historyLenBeforeNoop = editor.getHistory().getState().undoCount;
  doc.getElementById('btn-apply-position').click();
  assert.equal(editor.getHistory().getState().undoCount, historyLenBeforeNoop);

  // Undo y Redo restauran posición y sincronizan inputs automáticamente vía suscripción
  editor.undo();
  assert.equal(editor.getDiagramModel().getElementView(uc.elementId).x, initialView.x);
  assert.equal(doc.getElementById('prop-geom-x').value, String(initialView.x));

  editor.redo();
  assert.equal(editor.getDiagramModel().getElementView(uc.elementId).x, initialView.x + 100);
  assert.equal(doc.getElementById('prop-geom-x').value, String(initialView.x + 100));
});

test('UML-07-FIX.2 Movimiento de contenedor con descendientes mediante formulario X/Y y regresión de arrastre', () => {
  const editor = new Editor({
    catalogs: { 'use-case': UseCaseCatalog, deployment: DeploymentCatalog }
  });
  editor.createNewEmptyDiagram('deployment');

  const node = editor.insertElementAt('Node', { x: 200, y: 200 });
  const child = editor.insertElementAt('Artifact', {
    x: 200,
    y: 210,
    parentId: node.elementId
  });
  assert.equal(node.isValid && child.isValid, true);

  const doc = createMockGeometryDocument();
  const geomCtrl = bindElementGeometryControls({ doc, editor });
  editor.setSelectedEntity(node.elementId);
  geomCtrl.syncGeometryFields(editor.getDiagramModel().getElementById(node.elementId));

  const nodeBefore = { ...editor.getDiagramModel().getElementView(node.elementId) };
  const childBefore = { ...editor.getDiagramModel().getElementView(child.elementId) };

  doc.getElementById('prop-geom-x').value = String(nodeBefore.x + 50);
  doc.getElementById('prop-geom-y').value = String(nodeBefore.y - 20);
  doc.getElementById('btn-apply-position').click();

  assert.equal(editor.getDiagramModel().getElementView(node.elementId).x, nodeBefore.x + 50);
  assert.equal(editor.getDiagramModel().getElementView(child.elementId).x, childBefore.x + 50);
  assert.equal(editor.getDiagramModel().getElementView(child.elementId).y, childBefore.y - 20);

  // Regresión de movimiento por arrastre
  editor.previewMoveElement(node.elementId, { dx: 10, dy: 10 });
  const dragRes = editor.commitMoveElement(node.elementId, { dx: 10, dy: 10 });
  assert.equal(dragRes.isValid, true);
  assert.equal(editor.getDiagramModel().getElementView(node.elementId).x, nodeBefore.x + 60);
  assert.equal(editor.getDiagramModel().getElementView(child.elementId).x, childBefore.x + 60);
});

test('UML-07-FIX.3 Redimensionamiento en ambos modos UML, rechazo de mínimos dinámicos e inputs inválidos y conservación de foco', () => {
  const editor = new Editor({
    catalogs: { 'use-case': UseCaseCatalog, deployment: DeploymentCatalog }
  });
  editor.createNewEmptyDiagram('deployment');

  const art = editor.insertElementAt('Artifact', {
    x: 180,
    y: 160,
    properties: {
      manifestedElements: [
        { kind: 'Component', name: 'AuthService' },
        { kind: 'Component', name: 'TokenIssuer' },
        { kind: 'Class', name: 'SessionPolicy' }
      ]
    }
  });
  assert.equal(art.isValid, true);

  const doc = createMockGeometryDocument();
  const geomCtrl = bindElementGeometryControls({ doc, editor });
  editor.setSelectedEntity(art.elementId);
  geomCtrl.syncGeometryFields(editor.getDiagramModel().getElementById(art.elementId));

  const viewBefore = { ...editor.getDiagramModel().getElementView(art.elementId) };

  // Rechazo de altura inferior al mínimo dinámico del Artifact
  const historyBefore = editor.getHistory().getState().undoCount;
  doc.getElementById('prop-geom-width').value = '260';
  doc.getElementById('prop-geom-height').value = '60';
  doc.getElementById('btn-apply-size').click();
  assert.equal(editor.getDiagramModel().getElementView(art.elementId).height, viewBefore.height);
  assert.equal(editor.getHistory().getState().undoCount, historyBefore);
  assert.equal(editor.getStatusFeedback().level, 'error');

  // Rechazo de números inválidos (NaN, vacío, negativo) sin mutación
  for (const bad of ['', 'abc', 'NaN', '-40', '0']) {
    doc.getElementById('prop-geom-width').value = bad;
    doc.getElementById('btn-apply-size').click();
    assert.equal(editor.getDiagramModel().getElementView(art.elementId).width, viewBefore.width);
    assert.equal(editor.getHistory().getState().undoCount, historyBefore);
  }

  // Redimensionamiento válido conservando X/Y
  doc.getElementById('prop-geom-width').value = '280';
  doc.getElementById('prop-geom-height').value = '170';
  doc.getElementById('btn-apply-size').click();
  const resized = editor.getDiagramModel().getElementView(art.elementId);
  assert.equal(resized.x, viewBefore.x);
  assert.equal(resized.y, viewBefore.y);
  assert.equal(resized.width, 280);
  assert.equal(resized.height, 170);
  assert.equal(editor.getHistory().getState().undoCount, historyBefore + 1);

  // Undo/Redo de dimensiones
  editor.undo();
  assert.equal(editor.getDiagramModel().getElementView(art.elementId).width, viewBefore.width);
  editor.redo();
  assert.equal(editor.getDiagramModel().getElementView(art.elementId).width, 280);

  // No destruir el valor ni foco mientras el usuario edita un input
  const widthInput = doc.getElementById('prop-geom-width');
  widthInput.focus();
  widthInput.value = '31';
  geomCtrl.syncGeometryFields(editor.getDiagramModel().getElementById(art.elementId));
  assert.equal(widthInput.value, '31');
  assert.equal(doc.activeElement, widthInput);
});

test('UML-07-FIX.4 Navegación accesible del viewport mediante botones de pan sin mutar modelo ni historial', () => {
  const editor = new Editor({
    catalogs: { 'use-case': UseCaseCatalog, deployment: DeploymentCatalog }
  });
  editor.createNewEmptyDiagram('use-case');
  const uc = editor.insertElementAt('UseCase', { x: 200, y: 150 });
  const snapshotBefore = JSON.stringify(editor.getDiagramModel().toJSON());
  const historyBefore = editor.getHistory().getState().undoCount;

  const doc = createMockGeometryDocument();
  bindToolbarControls({ doc, editor, canvasElement: createMinimalCanvas() });

  const panStart = editor.getViewport().getState();
  doc.getElementById('btn-pan-left').click();
  assert.equal(editor.getViewport().getState().panX, panStart.panX + ACCESSIBLE_PAN_STEP_PX);

  doc.getElementById('btn-pan-right').click();
  assert.equal(editor.getViewport().getState().panX, panStart.panX);

  doc.getElementById('btn-pan-up').click();
  assert.equal(editor.getViewport().getState().panY, panStart.panY + ACCESSIBLE_PAN_STEP_PX);

  doc.getElementById('btn-pan-down').click();
  assert.equal(editor.getViewport().getState().panY, panStart.panY);

  // Modelo, coordenadas y CommandHistory intactos
  assert.equal(JSON.stringify(editor.getDiagramModel().toJSON()), snapshotBefore);
  assert.equal(editor.getHistory().getState().undoCount, historyBefore);
  assert.equal(editor.getDiagramModel().getElementView(uc.elementId).x > 0, true);
});

test('UML-07-FIX.5 Validación estricta de enteros: rechaza fracciones (123.5, 201.5) y acepta enteros positivos y negativos', () => {
  const editor = new Editor({
    catalogs: { 'use-case': UseCaseCatalog, deployment: DeploymentCatalog }
  });
  editor.createNewEmptyDiagram('use-case');
  const uc = editor.insertElementAt('UseCase', { x: 200, y: 160 });
  assert.equal(uc.isValid, true);

  const doc = createMockGeometryDocument();
  const geomCtrl = bindElementGeometryControls({ doc, editor });
  editor.setSelectedEntity(uc.elementId);
  geomCtrl.syncGeometryFields(editor.getDiagramModel().getElementById(uc.elementId));

  const viewInitial = { ...editor.getDiagramModel().getElementView(uc.elementId) };
  const historyBefore = editor.getHistory().getState().undoCount;

  // Rechazo de fracciones, NaN, infinitos y vacíos en posición sin mutar modelo, historial ni selección
  for (const [badX, badY] of [
    ['123.5', '100'],
    ['100', '201.5'],
    ['-12.5', '50'],
    ['NaN', '100'],
    ['Infinity', '100'],
    ['', '100']
  ]) {
    doc.getElementById('prop-geom-x').value = badX;
    doc.getElementById('prop-geom-y').value = badY;
    doc.getElementById('btn-apply-position').click();
    assert.deepEqual(editor.getDiagramModel().getElementView(uc.elementId), viewInitial);
    assert.equal(editor.getHistory().getState().undoCount, historyBefore);
    assert.equal(editor.getSelectedEntityId(), uc.elementId);
    assert.equal(editor.getStatusFeedback().level, 'error');
  }

  // Rechazo de fracciones en dimensiones
  doc.getElementById('prop-geom-width').value = '201.5';
  doc.getElementById('prop-geom-height').value = '90';
  doc.getElementById('btn-apply-size').click();
  assert.deepEqual(editor.getDiagramModel().getElementView(uc.elementId), viewInitial);
  assert.equal(editor.getHistory().getState().undoCount, historyBefore);
  assert.equal(editor.getStatusFeedback().level, 'error');

  // Acepta enteros negativos válidos en X/Y
  doc.getElementById('prop-geom-x').value = '-25';
  doc.getElementById('prop-geom-y').value = '-10';
  doc.getElementById('btn-apply-position').click();
  const negMoved = editor.getDiagramModel().getElementView(uc.elementId);
  assert.equal(negMoved.x, -25);
  assert.equal(negMoved.y, -10);
  assert.equal(editor.getHistory().getState().undoCount, historyBefore + 1);

  // Acepta enteros positivos válidos en X/Y y tamaño
  doc.getElementById('prop-geom-x').value = '340';
  doc.getElementById('prop-geom-y').value = '220';
  doc.getElementById('btn-apply-position').click();
  doc.getElementById('prop-geom-width').value = '240';
  doc.getElementById('prop-geom-height').value = '110';
  doc.getElementById('btn-apply-size').click();
  const finalView = editor.getDiagramModel().getElementView(uc.elementId);
  assert.equal(finalView.x, 340);
  assert.equal(finalView.y, 220);
  assert.equal(finalView.width, 240);
  assert.equal(finalView.height, 110);
  assert.equal(editor.getHistory().getState().undoCount, historyBefore + 3);
});
