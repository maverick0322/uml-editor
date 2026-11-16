/**
 * Pruebas unitarias y de integración — Incremento UML-06:
 * CommandHistory (Undo/Redo), Viewport (Zoom/Pan), Persistencia JSON,
 * validación de geometría mínima al cargar y Exportación PNG limpia.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { CommandHistory } from '../js/core/CommandHistory.js';
import { validateDocumentSnapshot } from '../js/core/DiagramModel.js';
import { Editor } from '../js/core/Editor.js';
import { Viewport } from '../js/canvas/Viewport.js';
import { CanvasRenderer } from '../js/canvas/CanvasRenderer.js';
import { InteractionManager } from '../js/canvas/InteractionManager.js';
import {
  parseAndValidateDiagramJson,
  serializeDiagramToJson
} from '../js/io/JsonSerializer.js';
import {
  computeDiagramExportBounds,
  exportDiagramToPngBlob
} from '../js/io/PngExporter.js';
import { UseCaseCatalog } from '../js/uml/use-case/UseCaseCatalog.js';
import { DeploymentCatalog } from '../js/uml/deployment/DeploymentCatalog.js';
import { bindToolbarControls } from '../js/main.js';

function createHeadlessCanvas() {
  const ops = [];
  const ctx = {
    ops,
    save() {},
    restore() {},
    setTransform(a, b, c, d, e, f) {
      ops.push({ op: 'setTransform', args: [a, b, c, d, e, f] });
    },
    fillRect(x, y, w, h) {
      ops.push({ op: 'fillRect', args: [x, y, w, h] });
    },
    strokeRect(x, y, w, h) {
      ops.push({ op: 'strokeRect', args: [x, y, w, h] });
    },
    beginPath() {},
    moveTo() {},
    lineTo() {},
    arc() {},
    ellipse() {},
    rect() {},
    clip() {},
    closePath() {},
    fill() {},
    stroke() {},
    setLineDash(dash) {
      ops.push({ op: 'setLineDash', dash });
    },
    fillText(text, x, y) {
      ops.push({ op: 'fillText', text: String(text), x, y });
    },
    measureText(text) {
      return { width: String(text || '').length * 7 };
    },
    strokeStyle: '#000',
    fillStyle: '#000',
    lineWidth: 1,
    font: '12px sans-serif',
    textAlign: 'left',
    textBaseline: 'top'
  };

  return {
    width: 960,
    height: 580,
    style: { cursor: 'default' },
    getContext: (kind) => (kind === '2d' ? ctx : null),
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 960, height: 580 }),
    addEventListener() {},
    removeEventListener() {},
    setPointerCapture() {},
    releasePointerCapture() {},
    _ctx: ctx
  };
}

test('UML-06.1 CommandHistory: Undo/Redo de inserción, movimiento, redimensionado, edición, relación y borrado detach/cascade', () => {
  const editor = new Editor();
  editor.createNewEmptyDiagram('deployment');
  const model = editor.getDiagramModel();
  assert.equal(editor.canUndo(), false);
  assert.equal(editor.canRedo(), false);

  // 1. Inserción
  const devRes = editor.insertElementAt('Device', { x: 100, y: 100, name: 'Srv1' });
  assert.equal(devRes.isValid, true);
  const devId = devRes.elementId;
  assert.equal(editor.canUndo(), true);

  // 2. Movimiento confirmado = 1 entrada
  const initialX = model.getElementView(devId).x;
  editor.commitMoveElement(devId, { dx: 40, dy: 25 });
  assert.equal(model.getElementView(devId).x, initialX + 40);

  // 3. Redimensionado confirmado = 1 entrada
  const curBox = model.getElementView(devId);
  editor.commitResizeElement(devId, { ...curBox, width: curBox.width + 50, height: curBox.height + 40 });
  assert.equal(model.getElementView(devId).width, curBox.width + 50);

  // 4. Edición de propiedades
  editor.updateElementProperties(devId, { name: 'SrvPrincipal' });
  assert.equal(model.getElementById(devId).name, 'SrvPrincipal');

  // Operación rechazada no altera el historial
  const countBeforeInvalid = editor.getHistory().getState().undoCount;
  const badUpd = editor.updateElementProperties(devId, { name: '   ' });
  assert.equal(badUpd.isValid, false);
  assert.equal(editor.getHistory().getState().undoCount, countBeforeInvalid);

  // 5. Hijo + relación + eliminación en cascada
  const artRes = editor.insertElementAt('Artifact', {
    x: 160,
    y: 160,
    name: 'app.jar',
    parentId: devId
  });
  const node2 = editor.insertElementAt('Node', { x: 480, y: 120, name: 'DB' });
  const relRes = editor.createRelationship({
    type: 'CommunicationPath',
    sourceId: devId,
    targetId: node2.elementId
  });
  assert.equal(relRes.isValid, true);

  // Eliminar en cascada el contenedor Device -> elimina SrvPrincipal, app.jar y CommunicationPath
  editor.deleteEntity(devId, { descendantPolicy: 'cascade' });
  assert.equal(model.getElementById(devId), null);
  assert.equal(model.getElementById(artRes.elementId), null);
  assert.equal(model.getRelationshipById(relRes.relationshipId), null);

  // Undo recupera todo en un solo paso
  editor.undo();
  assert.equal(model.getElementById(devId).name, 'SrvPrincipal');
  assert.equal(model.getElementById(artRes.elementId).parentId, devId);
  assert.ok(model.getRelationshipById(relRes.relationshipId));

  // Redo vuelve a eliminar en cascada y Undo lo restaura
  editor.redo();
  assert.equal(model.getElementById(devId), null);
  editor.undo();
  assert.ok(model.getElementById(devId));

  // Nueva operación tras Undo invalida la rama de Redo
  editor.undo(); // deshacer relación
  assert.equal(editor.canRedo(), true);
  editor.insertElementAt('Node', { x: 600, y: 300, name: 'Cache' });
  assert.equal(editor.canRedo(), false);

  // Límite maxEntries en CommandHistory
  const bounded = new CommandHistory({ maxEntries: 2 });
  let state = 0;
  for (let i = 1; i <= 4; i += 1) {
    const prev = state;
    state = i;
    bounded.recordSnapshot({
      label: `op-${i}`,
      before: prev,
      after: i,
      applySnapshot: (s) => {
        state = s;
      }
    });
  }
  assert.equal(bounded.getState().undoCount, 2);
  bounded.undo();
  bounded.undo();
  assert.equal(state, 2);
  assert.equal(bounded.canUndo(), false);
});

test('UML-06.2 Transacción compuesta Extend + ExtensionPoint se deshace y rehace como una única operación', () => {
  const editor = new Editor();
  editor.createNewEmptyDiagram('use-case');
  const model = editor.getDiagramModel();

  const baseUc = editor.insertElementAt('UseCase', { x: 400, y: 160, name: 'Pagar Pedido' }).elementId;
  const extUc = editor.insertElementAt('UseCase', { x: 140, y: 160, name: 'Aplicar Cupón' }).elementId;

  const undoCountBefore = editor.getHistory().getState().undoCount;
  const res = editor.createExtendRelationship({
    sourceId: extUc,
    targetId: baseUc,
    newExtensionPointName: 'Descuento',
    condition: 'cupón válido'
  });
  assert.equal(res.isValid, true);
  assert.equal(editor.getHistory().getState().undoCount, undoCountBefore + 1);
  assert.equal(model.getElementById(baseUc).properties.extensionPoints.length, 1);
  assert.equal(model.getRelationships().length, 1);

  // Un solo undo revierte tanto la relación Extend como el ExtensionPoint creado
  editor.undo();
  assert.equal(model.getElementById(baseUc).properties.extensionPoints.length, 0);
  assert.equal(model.getRelationships().length, 0);

  // Un solo redo restaura ambos atómicamente
  editor.redo();
  assert.equal(model.getElementById(baseUc).properties.extensionPoints.length, 1);
  assert.equal(model.getRelationships().length, 1);
});

test('UML-06.3 Cancelaciones, selección, navegación y carga no ensucian historial; atajos respetan inputs', () => {
  const editor = new Editor();
  editor.createNewEmptyDiagram('use-case');
  const canvas = createHeadlessCanvas();
  const listeners = {};
  const keyboardTarget = {
    addEventListener: (ev, fn) => {
      listeners[ev] = fn;
    },
    removeEventListener: () => {}
  };
  const manager = new InteractionManager({ canvas, editor, keyboardTarget });

  const ucId = editor.insertElementAt('UseCase', { x: 200, y: 200, name: 'Consultar' }).elementId;
  assert.equal(editor.getHistory().getState().undoCount, 1);

  // Selección, zoom, pan y cancelación provisional no generan entradas de historial
  editor.setSelectedEntity(ucId);
  editor.zoomIn({ x: 480, y: 290 });
  editor.panBy(50, -30);
  editor.previewMoveElement(ucId, { dx: 20, dy: 20 });
  manager.cancelCurrentInteraction();
  assert.equal(editor.getHistory().getState().undoCount, 1);

  // Atajo Ctrl+Z deshace en canvas, pero NO intercepta dentro de un <input>
  let preventedInInput = false;
  listeners.keydown({
    key: 'z',
    ctrlKey: true,
    target: { tagName: 'INPUT' },
    preventDefault: () => {
      preventedInInput = true;
    }
  });
  assert.equal(preventedInInput, false);
  assert.equal(editor.getDiagramModel().getElementById(ucId) !== null, true);

  // Ctrl+Z fuera de input sí deshace; Ctrl+Shift+Z rehace
  listeners.keydown({ key: 'z', ctrlKey: true, target: canvas, preventDefault: () => {} });
  assert.equal(editor.getDiagramModel().getElementById(ucId), null);

  listeners.keydown({
    key: 'Z',
    ctrlKey: true,
    shiftKey: true,
    target: canvas,
    preventDefault: () => {}
  });
  assert.ok(editor.getDiagramModel().getElementById(ucId));

  // Cargar otro documento reinicia el historial
  editor.createNewEmptyDiagram('deployment');
  assert.equal(editor.canUndo(), false);
  assert.equal(editor.canRedo(), false);
  manager.destroy();
});

test('UML-06.4 Viewport: zoom relativo al cursor, pan, hit-testing/inserción y modelo invariante', () => {
  const editor = new Editor();
  editor.createNewEmptyDiagram('use-case');
  const canvas = createHeadlessCanvas();
  const renderer = new CanvasRenderer(canvas, editor);
  const manager = new InteractionManager({ canvas, editor, renderer });

  const ucRes = editor.insertElementAt('UseCase', { x: 200, y: 200, name: 'Login' });
  const ucId = ucRes.elementId;
  const originalBox = { ...editor.getDiagramModel().getElementView(ucId) };

  // Zoom 2x anclado en el punto de pantalla (200, 200): el punto lógico (200, 200) permanece bajo el cursor
  const viewport = editor.getViewport();
  const worldBefore = viewport.screenToWorld({ x: 200, y: 200 });
  editor.zoomAt(2, { x: 200, y: 200 });
  const worldAfter = viewport.screenToWorld({ x: 200, y: 200 });
  assert.ok(Math.abs(worldBefore.x - worldAfter.x) < 1e-6);
  assert.ok(Math.abs(worldBefore.y - worldAfter.y) < 1e-6);

  // Pan no altera las coordenadas almacenadas en DiagramModel
  editor.panBy(60, -40);
  assert.deepEqual(editor.getDiagramModel().getElementView(ucId), originalBox);

  // Hit-testing en coordenadas de pantalla transformadas selecciona correctamente el elemento
  const screenCenter = viewport.worldToScreen({
    x: originalBox.x + originalBox.width / 2,
    y: originalBox.y + originalBox.height / 2
  });
  editor.setSelectedEntity(null);
  manager.handlePointerDown({ button: 0, clientX: screenCenter.x, clientY: screenCenter.y });
  assert.equal(editor.getSelectedEntityId(), ucId);

  // Inserción bajo zoom/pan coloca la figura en las coordenadas del mundo esperadas
  editor.setActiveTool({ mode: 'insert-element', elementType: 'Actor' });
  const insertScreenPt = viewport.worldToScreen({ x: 500, y: 300 });
  manager.handlePointerDown({ button: 0, clientX: insertScreenPt.x, clientY: insertScreenPt.y });
  const actorId = editor.getSelectedEntityId();
  const actorBox = editor.getDiagramModel().getElementView(actorId);
  const actorCenter = { x: actorBox.x + actorBox.width / 2, y: actorBox.y + actorBox.height / 2 };
  assert.ok(Math.abs(actorCenter.x - 500) <= 1);
  assert.ok(Math.abs(actorCenter.y - 300) <= 1);

  manager.destroy();
});

test('UML-06.5 Persistencia JSON: round-trip en ambos modos y rechazo atómico de archivos inválidos', () => {
  for (const mode of ['use-case', 'deployment']) {
    const editor = new Editor();
    editor.loadSampleDiagram(mode);
    const jsonText = serializeDiagramToJson(editor.getDiagramModel());
    const parsed = parseAndValidateDiagramJson(jsonText);
    assert.equal(parsed.isValid, true);
    assert.deepEqual(parsed.document, editor.getDiagramModel().toJSON());
  }

  // Casos negativos de importación
  assert.equal(parseAndValidateDiagramJson('').isValid, false);
  assert.equal(parseAndValidateDiagramJson('{corrupto').isValid, false);
  assert.equal(
    parseAndValidateDiagramJson('{"schemaVersion":1,"diagramType":"use-case"}', {
      maxBytes: 10
    }).isValid,
    false
  );
  assert.equal(
    parseAndValidateDiagramJson(
      JSON.stringify({ schemaVersion: 99, diagramType: 'use-case', model: {}, view: {} })
    ).isValid,
    false
  );

  // Mezcla de catálogos rechazada sin mutar editor activo
  const editor = new Editor();
  editor.loadSampleDiagram('use-case');
  const beforeSnapshot = editor.getDiagramModel().toJSON();
  const mixedDoc = editor.getDiagramModel().toJSON();
  mixedDoc.diagramType = 'deployment';
  const badMix = parseAndValidateDiagramJson(JSON.stringify(mixedDoc));
  assert.equal(badMix.isValid, false);
  assert.deepEqual(editor.getDiagramModel().toJSON(), beforeSnapshot);
});

test('UML-06.6 Corrección heredada UML-05-FIX: rechazo explícito de geometrías inferiores al mínimo dinámico al validar/cargar', () => {
  const editor = new Editor();
  editor.createNewEmptyDiagram('deployment');

  const art = editor.insertElementAt('Artifact', {
    x: 60,
    y: 60,
    name: 'suite.jar',
    properties: {
      fileName: 'suite.jar',
      manifestedElements: [
        { kind: 'Component', name: 'Svc1' },
        { kind: 'Component', name: 'Svc2' },
        { kind: 'Component', name: 'Svc3' },
        { kind: 'Component', name: 'Svc4' }
      ]
    }
  });
  assert.equal(art.isValid, true);

  const tampered = editor.getDiagramModel().toJSON();
  tampered.view.elements[art.elementId].height = 48;

  const snapValidation = validateDocumentSnapshot(tampered, DeploymentCatalog);
  assert.equal(snapValidation.isValid, false);
  assert.match(snapValidation.errors.join(' '), /Geometría insuficiente.*suite|artifact/i);

  const loadRes = editor.loadDocument(tampered);
  assert.equal(loadRes.isValid, false);
  // El documento activo conserva su altura válida intacta
  assert.ok(editor.getDiagramModel().getElementView(art.elementId).height >= 103);

  // También rechaza en modo use-case si un Actor stickman tiene altura insuficiente
  const ucEditor = new Editor();
  ucEditor.createNewEmptyDiagram('use-case');
  const act = ucEditor.insertElementAt('Actor', { x: 100, y: 100, name: 'Usuario' });
  const tamperedUc = ucEditor.getDiagramModel().toJSON();
  tamperedUc.view.elements[act.elementId].height = 40;
  assert.equal(validateDocumentSnapshot(tamperedUc, UseCaseCatalog).isValid, false);
  assert.equal(ucEditor.loadDocument(tamperedUc).isValid, false);
});

test('UML-06.7 Exportación PNG limpia: límites completos, sin selección/manejadores/grid e independencia de zoom/pan', async () => {
  const editor = new Editor();
  editor.createNewEmptyDiagram('use-case');

  // Diagrama vacío produce límites seguros
  const emptyBounds = computeDiagramExportBounds(editor.getDiagramModel());
  assert.equal(emptyBounds.isEmpty, true);
  assert.ok(emptyBounds.width > 0 && emptyBounds.height > 0);

  // Elemento situado fuera del viewport inicial (x = 1800, y = 1200)
  const ucId = editor.insertElementAt('UseCase', { x: 1800, y: 1200, name: 'Lejano' }).elementId;
  editor.setSelectedEntity(ucId);
  editor.zoomAt(0.4, { x: 100, y: 100 });
  editor.panBy(-300, 150);

  const modelBefore = editor.getDiagramModel().toJSON();
  const undoCountBefore = editor.getHistory().getState().undoCount;

  let capturedCanvas = null;
  const fakeBlob = new Blob(['png-bytes'], { type: 'image/png' });
  const { blob, bounds } = await exportDiagramToPngBlob(editor, {
    scale: 2,
    createCanvas: () => {
      capturedCanvas = createHeadlessCanvas();
      capturedCanvas.toBlob = (cb) => cb(fakeBlob);
      return capturedCanvas;
    }
  });

  assert.equal(blob, fakeBlob);
  assert.equal(bounds.isEmpty, false);
  // Incluye elemento lejano sin recortes
  assert.ok(bounds.x < 1800 && bounds.x + bounds.width > 1800);

  // Verifica que NO se dibujó selección (setLineDash([5, 3])) ni manejadores, y que el transform usó escala 1:1 (dpr=2, zoom=1)
  const dashCalls = capturedCanvas._ctx.ops.filter(
    (op) => op.op === 'setLineDash' && op.dash && op.dash[0] === 5 && op.dash[1] === 3
  );
  assert.equal(dashCalls.length, 0);

  const transformCalls = capturedCanvas._ctx.ops.filter((op) => op.op === 'setTransform');
  assert.ok(transformCalls.some((t) => t.args[0] === 2 && t.args[3] === 2));

  // Ni el modelo ni el historial fueron alterados por exportar
  assert.deepEqual(editor.getDiagramModel().toJSON(), modelBefore);
  assert.equal(editor.getHistory().getState().undoCount, undoCountBefore);
});

function createMockElement(id) {
  const listeners = new Map();
  return {
    id,
    value: '',
    files: [],
    addEventListener(type, handler) {
      if (!listeners.has(type)) {
        listeners.set(type, []);
      }
      listeners.get(type).push(handler);
    },
    async dispatch(type, event = {}) {
      for (const handler of listeners.get(type) || []) {
        await handler(event);
      }
    },
    click() {}
  };
}

test('UML-06-FIX.1 Defecto A y Obs C: Botones de zoom (+, -, 100%, Ajustar) y rueda alcanzan 0.25x..3x sin ReferenceError', async () => {
  const editor = new Editor();
  editor.loadSampleDiagram('use-case');
  const canvasElement = createHeadlessCanvas();

  const elementsById = new Map([
    ['btn-zoom-in', createMockElement('btn-zoom-in')],
    ['btn-zoom-out', createMockElement('btn-zoom-out')],
    ['btn-zoom-reset', createMockElement('btn-zoom-reset')],
    ['btn-zoom-fit', createMockElement('btn-zoom-fit')],
    ['btn-undo', createMockElement('btn-undo')],
    ['btn-redo', createMockElement('btn-redo')]
  ]);

  const mockDoc = {
    getElementById: (id) => elementsById.get(id) || null
  };

  bindToolbarControls({ doc: mockDoc, editor, canvasElement });

  // Clic en +
  await elementsById.get('btn-zoom-in').dispatch('click');
  assert.equal(editor.getViewport().getState().zoom, 1.15);

  // Clics repetidos en - alcanzan el mínimo 0.25x (25%)
  for (let i = 0; i < 10; i += 1) {
    await elementsById.get('btn-zoom-out').dispatch('click');
  }
  assert.equal(editor.getViewport().getState().zoom, 0.25);

  // Clic en 100% restablece zoom = 1
  await elementsById.get('btn-zoom-reset').dispatch('click');
  assert.equal(editor.getViewport().getState().zoom, 1);

  // Clic en Ajustar encuadra el diagrama sin errores
  await elementsById.get('btn-zoom-fit').dispatch('click');
  const fitted = editor.getViewport().getState();
  assert.ok(fitted.zoom >= 0.25 && fitted.zoom <= 3);

  // Rueda del ratón también alcanza 0.25x y 3x
  const manager = new InteractionManager({ canvas: canvasElement, editor });
  for (let i = 0; i < 20; i += 1) {
    manager.handleWheel({ deltaY: 120, clientX: 480, clientY: 290, preventDefault() {} });
  }
  assert.equal(editor.getViewport().getState().zoom, 0.25);

  for (let i = 0; i < 35; i += 1) {
    manager.handleWheel({ deltaY: -120, clientX: 480, clientY: 290, preventDefault() {} });
  }
  assert.equal(editor.getViewport().getState().zoom, 3);
  manager.destroy();
});

test('UML-06-FIX.2 Defecto B: Severidad visual de error al rechazar JSON inválido y conservación del documento activo', async () => {
  const editor = new Editor();
  editor.loadSampleDiagram('deployment');
  const beforeSnapshot = editor.getDiagramModel().toJSON();
  const canvasElement = createHeadlessCanvas();

  const fileInput = createMockElement('json-file-input');
  const btnOpenJson = createMockElement('btn-open-json');
  const btnSaveJson = createMockElement('btn-save-json');

  const elementsById = new Map([
    ['btn-open-json', btnOpenJson],
    ['json-file-input', fileInput],
    ['btn-save-json', btnSaveJson]
  ]);
  const mockDoc = {
    getElementById: (id) => elementsById.get(id) || null
  };

  let downloaded = null;
  bindToolbarControls({
    doc: mockDoc,
    editor,
    canvasElement,
    triggerDownload: (blob, filename) => {
      downloaded = { blob, filename };
    }
  });

  // Guardar JSON emite severidad 'ok'
  await btnSaveJson.dispatch('click');
  assert.ok(downloaded && downloaded.filename.endsWith('.json'));
  assert.equal(editor.getStatusFeedback().level, 'ok');

  // Abrir JSON corrupto emite severidad 'error' y conserva el documento intacto
  fileInput.files = [{ size: 10, text: async () => '{corrupto' }];
  await fileInput.dispatch('change');
  const feedback = editor.getStatusFeedback();
  assert.equal(feedback.level, 'error');
  assert.match(feedback.message, /Error al abrir JSON/i);
  assert.deepEqual(editor.getDiagramModel().toJSON(), beforeSnapshot);

  // Abrir archivo excesivamente grande emite severidad 'error'
  fileInput.files = [{ size: 5 * 1024 * 1024, text: async () => '{}' }];
  await fileInput.dispatch('change');
  assert.equal(editor.getStatusFeedback().level, 'error');
  assert.match(editor.getStatusFeedback().message, /demasiado grande/i);
  assert.deepEqual(editor.getDiagramModel().toJSON(), beforeSnapshot);
});
