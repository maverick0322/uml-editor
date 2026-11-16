import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DiagramModel,
  validateDocumentSnapshot
} from '../js/core/DiagramModel.js';
import { Editor } from '../js/core/Editor.js';
import { CanvasRenderer } from '../js/canvas/CanvasRenderer.js';
import {
  INTERACTION_STATE,
  InteractionManager
} from '../js/canvas/InteractionManager.js';
import {
  SAMPLE_DEPLOYMENT_DOCUMENT,
  SAMPLE_USE_CASE_DOCUMENT
} from '../js/uml/SampleDiagrams.js';
import { getBoxCenter, getPolylineMidpoint } from '../js/canvas/Geometry.js';

function createMockCanvas({ width = 1200, height = 800 } = {}) {
  const listeners = new Map();
  const calls = [];
  const ctx = {
    save() { calls.push('save'); },
    restore() { calls.push('restore'); },
    setTransform() {},
    fillRect() { calls.push('fillRect'); },
    strokeRect() { calls.push('strokeRect'); },
    beginPath() {},
    moveTo() {},
    lineTo() {},
    arc() {},
    ellipse() {},
    closePath() {},
    fill() { calls.push('fill'); },
    stroke() { calls.push('stroke'); },
    setLineDash() {},
    fillText() {},
    measureText(text) { return { width: String(text || '').length * 7 }; }
  };

  return {
    width,
    height,
    style: { cursor: 'default' },
    calls,
    getContext(kind) {
      return kind === '2d' ? ctx : null;
    },
    getBoundingClientRect() {
      return { left: 0, top: 0, width, height };
    },
    addEventListener(type, fn) {
      listeners.set(type, fn);
    },
    removeEventListener(type) {
      listeners.delete(type);
    },
    setPointerCapture() {},
    releasePointerCapture() {},
    dispatch(type, event) {
      const fn = listeners.get(type);
      if (fn) {
        fn(event);
      }
    }
  };
}

function createMockKeyboardTarget() {
  const listeners = new Map();
  return {
    addEventListener(type, fn) {
      listeners.set(type, fn);
    },
    removeEventListener(type) {
      listeners.delete(type);
    },
    dispatch(type, event) {
      const fn = listeners.get(type);
      if (fn) {
        fn(event);
      }
    }
  };
}

test('UML-03.1 Creación válida de cada tipo de relación en ambos modos (use-case y deployment)', () => {
  // 1) Casos de Uso: Association, Include, Extend (con EP válido), Generalization, CommentLink
  const ucEditor = new Editor({ initialDocument: SAMPLE_USE_CASE_DOCUMENT });
  const ucBefore = ucEditor.getDiagramModel().getCounts().relationshipsCount;

  const newActor = ucEditor.insertElementAt('Actor', { x: 100, y: 460, name: 'Auditor' });
  const newUcBase = ucEditor.insertElementAt('UseCase', {
    x: 420,
    y: 460,
    name: 'Generar Reporte',
    properties: {
      isAbstract: false,
      showExtensionPoints: true,
      extensionPoints: [{ id: 'ep-rep-1', name: 'Exportar PDF' }]
    }
  });
  const newUcExt = ucEditor.insertElementAt('UseCase', {
    x: 680,
    y: 460,
    name: 'Firmar PDF'
  });
  const newComment = ucEditor.insertElementAt('Comment', {
    x: 240,
    y: 540,
    properties: { body: 'Nota de auditoría' }
  });
  assert.equal(newActor.isValid && newUcBase.isValid && newUcExt.isValid && newComment.isValid, true);

  const assoc = ucEditor.createRelationship({
    type: 'Association',
    sourceId: newActor.elementId,
    targetId: newUcBase.elementId
  });
  const inc = ucEditor.createRelationship({
    type: 'Include',
    sourceId: newUcBase.elementId,
    targetId: 'uc-2'
  });
  const ext = ucEditor.createRelationship({
    type: 'Extend',
    sourceId: newUcExt.elementId,
    targetId: newUcBase.elementId,
    properties: { extensionLocation: 'ep-rep-1' }
  });
  const gen = ucEditor.createRelationship({
    type: 'Generalization',
    sourceId: newActor.elementId,
    targetId: 'act-1'
  });
  const cl = ucEditor.createRelationship({
    type: 'CommentLink',
    sourceId: newComment.elementId,
    targetId: assoc.relationshipId
  });

  assert.equal(
    assoc.isValid && inc.isValid && ext.isValid && gen.isValid && cl.isValid,
    true
  );
  assert.equal(ucEditor.getDiagramModel().getCounts().relationshipsCount, ucBefore + 5);

  const ucJson = ucEditor.getDiagramModel().toJSON();
  assert.equal(validateDocumentSnapshot(ucJson).isValid, true);

  // 2) Despliegue: CommunicationPath, Deployment, Manifestation, Dependency, Generalization, CommentLink
  const depEditor = new Editor({ initialDocument: SAMPLE_DEPLOYMENT_DOCUMENT });
  const depBefore = depEditor.getDiagramModel().getCounts().relationshipsCount;

  const nodeA = depEditor.insertElementAt('Node', { x: 140, y: 500, name: 'NodoA' });
  const nodeB = depEditor.insertElementAt('Node', { x: 360, y: 500, name: 'NodoB' });
  const artA = depEditor.insertElementAt('Artifact', { x: 140, y: 620, name: 'app.jar' });
  const artB = depEditor.insertElementAt('Artifact', { x: 360, y: 620, name: 'lib.jar' });
  const cmnDep = depEditor.insertElementAt('Comment', {
    x: 540,
    y: 560,
    properties: { body: 'Nota despliegue' }
  });

  const comm = depEditor.createRelationship({
    type: 'CommunicationPath',
    sourceId: nodeA.elementId,
    targetId: nodeB.elementId
  });
  const deploy = depEditor.createRelationship({
    type: 'Deployment',
    sourceId: artA.elementId,
    targetId: nodeA.elementId
  });
  const manifest = depEditor.createRelationship({
    type: 'Manifestation',
    sourceId: artA.elementId,
    targetId: artB.elementId
  });
  const dependency = depEditor.createRelationship({
    type: 'Dependency',
    sourceId: artA.elementId,
    targetId: artB.elementId
  });
  const depGen = depEditor.createRelationship({
    type: 'Generalization',
    sourceId: nodeA.elementId,
    targetId: nodeB.elementId
  });
  const depCl = depEditor.createRelationship({
    type: 'CommentLink',
    sourceId: cmnDep.elementId,
    targetId: comm.relationshipId
  });

  assert.equal(
    comm.isValid &&
      deploy.isValid &&
      manifest.isValid &&
      dependency.isValid &&
      depGen.isValid &&
      depCl.isValid,
    true
  );
  assert.equal(depEditor.getDiagramModel().getCounts().relationshipsCount, depBefore + 6);
  assert.equal(validateDocumentSnapshot(depEditor.getDiagramModel().toJSON()).isValid, true);
});

test('UML-03.2 Rechazo atómico de extremos incompatibles, referencias inexistentes y DP-03 (Extend sin ExtensionPoint)', () => {
  const editor = new Editor({ initialDocument: SAMPLE_USE_CASE_DOCUMENT });
  const before = editor.getDiagramModel().toJSON();

  // Include entre Actor -> Actor (inválido)
  assert.equal(
    editor.createRelationship({ type: 'Include', sourceId: 'act-1', targetId: 'act-2' }).isValid,
    false
  );
  // Association entre dos UseCase (inválido)
  assert.equal(
    editor.createRelationship({ type: 'Association', sourceId: 'uc-1', targetId: 'uc-2' }).isValid,
    false
  );
  // Generalization cruzada Actor -> UseCase (inválido)
  assert.equal(
    editor.createRelationship({ type: 'Generalization', sourceId: 'act-1', targetId: 'uc-1' }).isValid,
    false
  );
  // Auto-relación (sourceId === targetId)
  assert.equal(
    editor.createRelationship({ type: 'Include', sourceId: 'uc-1', targetId: 'uc-1' }).isValid,
    false
  );
  // Referencia inexistente
  assert.equal(
    editor.createRelationship({ type: 'Association', sourceId: 'act-1', targetId: 'no-existe' }).isValid,
    false
  );
  // Extend sin extensionLocation o apuntando a UseCase sin ExtensionPoints (DP-03)
  assert.equal(
    editor.createRelationship({ type: 'Extend', sourceId: 'uc-3', targetId: 'uc-2' }).isValid,
    false
  );
  // Extend interactivo hacia uc-2 (que no tiene extensionPoints): entra en pending-extend (DP-03) y rechaza confirmar vacío
  const extendNoEp = editor.completeInteractiveConnection('Extend', 'uc-3', 'uc-2');
  assert.equal(extendNoEp.status, 'pending-extend');
  assert.equal(editor.confirmPendingExtend('').isValid, false);
  editor.cancelPendingExtend();

  assert.deepEqual(
    editor.getDiagramModel().toJSON(),
    before,
    'Ningún rechazo debe mutar el DiagramModel'
  );
});

test('UML-03.3 Trazado interactivo en Canvas, previsualización provisional y cancelación con Esc / pointercancel', () => {
  const editor = new Editor({ initialDocument: SAMPLE_USE_CASE_DOCUMENT });
  const canvas = createMockCanvas();
  const keyboard = createMockKeyboardTarget();
  const renderer = new CanvasRenderer(canvas, editor);
  const manager = new InteractionManager({ canvas, editor, renderer, keyboardTarget: keyboard });

  renderer.renderNow();
  const initialJson = editor.getDiagramModel().toJSON();

  // Activar herramienta Include y seleccionar origen uc-2 -> Esc antes de elegir destino
  editor.setActiveTool({ mode: 'create-relationship', relationshipType: 'Include' });
  const uc2Center = getBoxCenter(editor.getEffectiveElementView('uc-2'));
  const uc3Center = getBoxCenter(editor.getEffectiveElementView('uc-3'));

  canvas.dispatch('pointerdown', { clientX: uc2Center.x, clientY: uc2Center.y, button: 0, pointerId: 1 });
  canvas.dispatch('pointerup', { clientX: uc2Center.x, clientY: uc2Center.y, button: 0, pointerId: 1 });
  assert.equal(manager.getState(), INTERACTION_STATE.CONNECTING);
  assert.ok(editor.getProvisionalConnection());

  canvas.dispatch('pointermove', { clientX: uc3Center.x - 20, clientY: uc3Center.y, pointerId: 1 });
  renderer.renderNow();

  // Cancelar con Esc
  keyboard.dispatch('keydown', { key: 'Escape', preventDefault() {} });
  assert.equal(manager.getState(), INTERACTION_STATE.IDLE);
  assert.equal(editor.getProvisionalConnection(), null);
  assert.deepEqual(editor.getDiagramModel().toJSON(), initialJson);

  // Probar cancelación con pointercancel
  editor.setActiveTool({ mode: 'create-relationship', relationshipType: 'Include' });
  canvas.dispatch('pointerdown', { clientX: uc2Center.x, clientY: uc2Center.y, button: 0, pointerId: 2 });
  assert.equal(manager.getState(), INTERACTION_STATE.CONNECTING);
  canvas.dispatch('pointercancel', { pointerId: 2 });
  assert.equal(manager.getState(), INTERACTION_STATE.IDLE);
  assert.equal(editor.getProvisionalConnection(), null);
  assert.deepEqual(editor.getDiagramModel().toJSON(), initialJson);

  // Confirmar relación Include haciendo clic en origen (uc-3) y luego en destino (uc-2)
  editor.setActiveTool({ mode: 'create-relationship', relationshipType: 'Include' });
  canvas.dispatch('pointerdown', { clientX: uc3Center.x, clientY: uc3Center.y, button: 0, pointerId: 3 });
  canvas.dispatch('pointerup', { clientX: uc3Center.x, clientY: uc3Center.y, button: 0, pointerId: 3 });
  canvas.dispatch('pointerdown', { clientX: uc2Center.x, clientY: uc2Center.y, button: 0, pointerId: 3 });

  assert.equal(manager.getState(), INTERACTION_STATE.IDLE);
  assert.equal(
    editor.getDiagramModel().getCounts().relationshipsCount,
    initialJson.model.relationships.length + 1
  );

  // Flujo DP-03 en Canvas: Extend hacia uc-1 (que sí tiene ep-1) queda pendiente y se cancela con Esc
  const uc1Center = getBoxCenter(editor.getEffectiveElementView('uc-1'));
  const countBeforeExtend = editor.getDiagramModel().getCounts().relationshipsCount;
  editor.setActiveTool({ mode: 'create-relationship', relationshipType: 'Extend' });
  canvas.dispatch('pointerdown', { clientX: uc3Center.x, clientY: uc3Center.y, button: 0, pointerId: 4 });
  canvas.dispatch('pointerup', { clientX: uc3Center.x, clientY: uc3Center.y, button: 0, pointerId: 4 });
  canvas.dispatch('pointerdown', { clientX: uc1Center.x, clientY: uc1Center.y, button: 0, pointerId: 4 });

  assert.ok(editor.getPendingExtendConfirmation());
  assert.equal(editor.getDiagramModel().getCounts().relationshipsCount, countBeforeExtend);
  keyboard.dispatch('keydown', { key: 'Escape', preventDefault() {} });
  assert.equal(editor.getPendingExtendConfirmation(), null);
  assert.equal(editor.getDiagramModel().getCounts().relationshipsCount, countBeforeExtend);

  manager.destroy();
});

test('UML-03.4 Anclajes en perímetros reales y actualización dinámica al mover o redimensionar', () => {
  const editor = new Editor({ initialDocument: SAMPLE_USE_CASE_DOCUMENT });
  const canvas = createMockCanvas();
  const renderer = new CanvasRenderer(canvas, editor);

  renderer.renderNow();
  const routeBefore = renderer._lastComputedRoutes.get('rel-uc-1');
  assert.ok(routeBefore && routeBefore.length >= 2);

  // Mover act-1 y verificar que el anclaje inicial cambia dinámicamente
  editor.commitMoveElement('act-1', { dx: 40, dy: -50 });
  renderer.renderNow();
  const routeAfterMove = renderer._lastComputedRoutes.get('rel-uc-1');
  assert.notDeepEqual(routeAfterMove[0], routeBefore[0]);

  // Redimensionar uc-1 y verificar que el anclaje final sobre la elipse se recalcula
  const uc1Box = editor.getEffectiveElementView('uc-1');
  editor.commitResizeElement('uc-1', {
    x: uc1Box.x,
    y: uc1Box.y,
    width: uc1Box.width + 60,
    height: uc1Box.height + 30
  });
  renderer.renderNow();
  const routeAfterResize = renderer._lastComputedRoutes.get('rel-uc-1');
  assert.notDeepEqual(
    routeAfterResize[routeAfterResize.length - 1],
    routeAfterMove[routeAfterMove.length - 1]
  );
});

test('UML-03.5 CMN-REL-01: CommentLink hacia relación semántica desde Canvas y limpieza en cascada', () => {
  const editor = new Editor({ initialDocument: SAMPLE_USE_CASE_DOCUMENT });
  const canvas = createMockCanvas();
  const renderer = new CanvasRenderer(canvas, editor);
  const manager = new InteractionManager({ canvas, editor, renderer });

  renderer.renderNow();
  const relUc1Route = renderer._lastComputedRoutes.get('rel-uc-1');
  const relMidpoint = getPolylineMidpoint(relUc1Route);
  const commentCenter = getBoxCenter(editor.getEffectiveElementView('cmn-uc-1'));

  const initialCount = editor.getDiagramModel().getCounts().relationshipsCount;
  editor.setActiveTool({ mode: 'create-relationship', relationshipType: 'CommentLink' });

  canvas.dispatch('pointerdown', { clientX: commentCenter.x, clientY: commentCenter.y, button: 0, pointerId: 1 });
  canvas.dispatch('pointerup', { clientX: commentCenter.x, clientY: commentCenter.y, button: 0, pointerId: 1 });
  canvas.dispatch('pointerdown', { clientX: relMidpoint.x, clientY: relMidpoint.y, button: 0, pointerId: 1 });

  assert.equal(editor.getDiagramModel().getCounts().relationshipsCount, initialCount + 1);
  const createdId = editor.getSelectedEntityId();
  const createdRel = editor.getDiagramModel().getRelationshipById(createdId);
  assert.equal(createdRel.type, 'CommentLink');
  assert.equal(createdRel.targetId, 'rel-uc-1');

  // Rechazo de CommentLink hacia otro CommentLink
  assert.equal(
    editor.createRelationship({
      type: 'CommentLink',
      sourceId: 'cmn-uc-1',
      targetId: createdId
    }).isValid,
    false
  );

  // Al eliminar rel-uc-1, debe eliminarse en cascada el CommentLink que la anotaba
  const delRes = editor.deleteEntity('rel-uc-1');
  assert.equal(delRes.isValid, true);
  assert.equal(editor.getDiagramModel().getRelationshipById(createdId), null);
  assert.equal(validateDocumentSnapshot(editor.getDiagramModel().toJSON()).isValid, true);

  manager.destroy();
});

test('UML-03.6 Integridad de IDs reservados del prototipo y unicidad global en addRelationship()', () => {
  const model = new DiagramModel(SAMPLE_USE_CASE_DOCUMENT);
  const before = model.toJSON();

  for (const badId of ['__proto__', 'constructor', 'prototype', 'toString', 'hasOwnProperty']) {
    const res = model.addRelationship({
      id: badId,
      type: 'Association',
      sourceId: 'act-1',
      targetId: 'uc-2'
    });
    assert.equal(res.isValid, false, `addRelationship debe rechazar "${badId}"`);
    assert.deepEqual(model.toJSON(), before);
  }

  // Colisión de ID con un elemento existente ("act-1")
  const collisionRes = model.addRelationship({
    id: 'act-1',
    type: 'Association',
    sourceId: 'act-1',
    targetId: 'uc-2'
  });
  assert.equal(collisionRes.isValid, false);
  assert.deepEqual(model.toJSON(), before);
});
