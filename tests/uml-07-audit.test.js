import test from 'node:test';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';

import { Editor } from '../js/core/Editor.js';
import { DiagramModel, validateDocumentSnapshot } from '../js/core/DiagramModel.js';
import { CanvasRenderer } from '../js/canvas/CanvasRenderer.js';
import { InteractionManager } from '../js/canvas/InteractionManager.js';
import {
  MAX_JSON_FILE_BYTES,
  getUtf8ByteLength,
  parseAndValidateDiagramJson,
  prepareJsonExport
} from '../js/io/JsonSerializer.js';
import {
  MAX_PNG_DIMENSION_PX,
  MAX_PNG_TOTAL_PIXELS,
  computeDiagramExportBounds,
  computeSafeExportDimensions
} from '../js/io/PngExporter.js';
import { UseCaseCatalog } from '../js/uml/use-case/UseCaseCatalog.js';
import { DeploymentCatalog } from '../js/uml/deployment/DeploymentCatalog.js';
import {
  SAMPLE_DEPLOYMENT_DOCUMENT,
  SAMPLE_USE_CASE_DOCUMENT
} from '../js/uml/SampleDiagrams.js';
import { bindToolbarControls } from '../js/main.js';

function createInstrumented2dContext() {
  const noop = () => {};
  return {
    fillStyle: '#000',
    strokeStyle: '#000',
    lineWidth: 1,
    font: '12px sans-serif',
    textAlign: 'left',
    textBaseline: 'alphabetic',
    save: noop,
    restore: noop,
    beginPath: noop,
    closePath: noop,
    moveTo: noop,
    lineTo: noop,
    stroke: noop,
    fill: noop,
    rect: noop,
    fillRect: noop,
    strokeRect: noop,
    clearRect: noop,
    ellipse: noop,
    arc: noop,
    clip: noop,
    setLineDash: noop,
    translate: noop,
    scale: noop,
    setTransform: noop,
    fillText: noop,
    measureText: (t) => ({ width: String(t || '').length * 7 })
  };
}

function createMinimalCanvas() {
  return {
    width: 960,
    height: 600,
    style: {},
    clientWidth: 960,
    clientHeight: 600,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 960, height: 600 }),
    setPointerCapture: () => {},
    releasePointerCapture: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    getContext: () => createInstrumented2dContext()
  };
}

function buildLargeDeploymentDocument(nodeCount = 200, relCount = 150) {
  const model = DiagramModel.fromJSON(
    {
      schemaVersion: 1,
      id: 'large-dep',
      name: 'Prueba de carga',
      diagramType: 'deployment',
      model: { elements: [], relationships: [] },
      view: { elements: {}, relationships: {}, drawOrder: [] }
    },
    DeploymentCatalog
  );
  const cols = 20;
  const ids = [];
  for (let i = 0; i < nodeCount; i += 1) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const id = `n-${i}`;
    ids.push(id);
    model.addElement({
      id,
      type: 'Node',
      name: `Node ${i}`,
      properties: { stereotype: 'node' },
      x: 40 + col * 210,
      y: 40 + row * 140,
      width: 170,
      height: 95
    });
  }
  for (let i = 0; i < relCount && i + 1 < ids.length; i += 1) {
    model.addRelationship({
      id: `cp-${i}`,
      type: 'CommunicationPath',
      sourceId: ids[i],
      targetId: ids[i + 1],
      stereotype: 'http'
    });
  }
  return model;
}

test('UML-07.1 Integración entre modos: cambio limpio entre Casos de Uso y Despliegue sin mezcla de catálogos ni historial residual', () => {
  const editor = new Editor({
    catalogs: { 'use-case': UseCaseCatalog, deployment: DeploymentCatalog }
  });

  editor.loadDocument(SAMPLE_USE_CASE_DOCUMENT);
  assert.equal(editor.getDiagramType(), 'use-case');
  const ucAdd = editor.insertElementAt('Actor', { x: 80, y: 80 });
  assert.equal(ucAdd.isValid, true);
  assert.equal(editor.canUndo(), true);

  // Cambio a Despliegue debe reiniciar historial y selección
  editor.loadDocument(SAMPLE_DEPLOYMENT_DOCUMENT);
  assert.equal(editor.getDiagramType(), 'deployment');
  assert.equal(editor.canUndo(), false);
  assert.equal(editor.getSelectedEntityId(), null);

  // Rechazo de tipos del otro catálogo en modo Despliegue
  const crossType = editor.insertElementAt('UseCase', { x: 100, y: 100 });
  assert.equal(crossType.isValid, false);
});

test('UML-07.2 Round-trip real JSON + PNG de ambos diagramas de ejemplo y prevención XSS', () => {
  for (const sample of [SAMPLE_USE_CASE_DOCUMENT, SAMPLE_DEPLOYMENT_DOCUMENT]) {
    const editor = new Editor({
      catalogs: { 'use-case': UseCaseCatalog, deployment: DeploymentCatalog }
    });
    editor.loadDocument(sample);

    // Insertar texto con payload XSS potencial; debe conservarse como texto plano
    const xssPayload = '<script>alert("xss")</script><img onerror=1>';
    const added = editor.insertElementAt('Comment', { x: 30, y: 30 });
    assert.equal(added.isValid, true);
    const updated = editor.updateElementProperties(added.elementId, {
      properties: { body: xssPayload }
    });
    assert.equal(updated.isValid, true);

    const exported = prepareJsonExport(editor.getDiagramModel());
    assert.equal(exported.isValid, true);
    assert.ok(exported.byteSize <= MAX_JSON_FILE_BYTES);

    const parsed = parseAndValidateDiagramJson(exported.jsonText);
    assert.equal(parsed.isValid, true);

    const reopenedNote = parsed.document.model.elements.find((e) => e.id === added.elementId);
    assert.equal(reopenedNote.properties.body, xssPayload);

    // Verificar dimensiones PNG seguras para el diagrama completo
    const catalog = sample.diagramType === 'use-case' ? UseCaseCatalog : DeploymentCatalog;
    const bounds = computeDiagramExportBounds(editor.getDiagramModel(), catalog);
    const dims = computeSafeExportDimensions(bounds, 2);
    assert.ok(dims.pixelWidth >= 1 && dims.pixelWidth <= MAX_PNG_DIMENSION_PX);
    assert.ok(dims.pixelHeight >= 1 && dims.pixelHeight <= MAX_PNG_DIMENSION_PX);
    assert.ok(dims.pixelWidth * dims.pixelHeight <= MAX_PNG_TOTAL_PIXELS);
  }
});

test('UML-07.3 Operaciones de teclado (Delete, Escape, Ctrl+Z/Y) y alternativa DOM para relaciones', () => {
  const editor = new Editor({
    catalogs: { 'use-case': UseCaseCatalog, deployment: DeploymentCatalog }
  });
  editor.createNewEmptyDiagram('use-case');

  const actorRes = editor.insertElementAt('Actor', { x: 60, y: 100 });
  const ucRes = editor.insertElementAt('UseCase', { x: 260, y: 100 });
  assert.equal(actorRes.isValid && ucRes.isValid, true);

  // Alternativa DOM: creación directa vía Editor (equivalente a #relationship-creator-form)
  const relRes = editor.createRelationship({
    type: 'Association',
    sourceId: actorRes.elementId,
    targetId: ucRes.elementId
  });
  assert.equal(relRes.isValid, true);
  assert.equal(editor.getDiagramModel().getRelationships().length, 1);

  const canvas = createMinimalCanvas();
  const im = new InteractionManager({
    canvas,
    editor,
    renderer: { requestRender: () => {} }
  });

  // Tecla Delete elimina relación seleccionada
  editor.setSelectedEntity(relRes.relationshipId);
  let prevented = false;
  im.handleKeyDown({
    key: 'Delete',
    target: canvas,
    preventDefault: () => {
      prevented = true;
    }
  });
  assert.equal(prevented, true);
  assert.equal(editor.getDiagramModel().getRelationships().length, 0);

  // Ctrl+Z dentro de INPUT no se intercepta; fuera de INPUT deshace el borrado
  let inputPrevented = false;
  im.handleKeyDown({
    key: 'z',
    ctrlKey: true,
    target: { tagName: 'INPUT', isContentEditable: false },
    preventDefault: () => {
      inputPrevented = true;
    }
  });
  assert.equal(inputPrevented, false);
  assert.equal(editor.getDiagramModel().getRelationships().length, 0);

  im.handleKeyDown({
    key: 'z',
    ctrlKey: true,
    target: canvas,
    preventDefault: () => {}
  });
  assert.equal(editor.getDiagramModel().getRelationships().length, 1);

  // Escape cancela herramienta de inserción activa sin mutar el modelo
  editor.setActiveTool({ mode: 'element', elementType: 'UseCase' });
  im.handleKeyDown({ key: 'Escape', target: canvas, preventDefault: () => {} });
  assert.equal(editor.getActiveTool().mode, 'select');
});

test('UML-07.4 Seguridad: rechazo atómico de payloads JSON con claves __proto__/constructor y errores sin pérdida de documento', () => {
  const editor = new Editor({
    catalogs: { 'use-case': UseCaseCatalog, deployment: DeploymentCatalog }
  });
  editor.loadDocument(SAMPLE_USE_CASE_DOCUMENT);
  const beforeSnapshot = JSON.stringify(editor.getDiagramModel().toJSON());

  const maliciousJson = JSON.stringify({
    schemaVersion: 1,
    id: 'bad-doc',
    name: 'Malicioso',
    diagramType: 'use-case',
    model: {
      elements: [{ id: '__proto__', type: 'Actor', name: 'X' }],
      relationships: []
    },
    view: {
      elements: { ['__proto__']: { x: 10, y: 10, width: 60, height: 90 } },
      relationships: {},
      drawOrder: ['__proto__']
    }
  });

  const parsed = parseAndValidateDiagramJson(maliciousJson);
  assert.equal(parsed.isValid, false);
  assert.equal(JSON.stringify(editor.getDiagramModel().toJSON()), beforeSnapshot);

  // Verificar feedback de error en bindToolbarControls con documento intacto
  const buttons = new Map();
  const makeBtn = (id) => {
    const handlers = {};
    const btn = {
      id,
      disabled: false,
      addEventListener: (ev, fn) => {
        handlers[ev] = fn;
      },
      click: () => handlers.click && handlers.click()
    };
    buttons.set(id, btn);
    return btn;
  };
  const doc = {
    getElementById: (id) => {
      if (id === 'json-file-input') {
        return { value: '', addEventListener: () => {}, click: () => {} };
      }
      if (id === 'zoom-level-indicator') {
        return { textContent: '100%' };
      }
      return makeBtn(id);
    }
  };
  let feedbackCalled = null;
  editor.reportFeedback = (level, msg) => {
    feedbackCalled = { level, msg };
  };
  bindToolbarControls({
    doc,
    editor,
    canvasElement: createMinimalCanvas(),
    triggerDownload: () => {}
  });

  const added = editor.insertElementAt('Comment', { x: 10, y: 10 });
  assert.equal(added.isValid, true);
  editor.updateElementProperties(added.elementId, {
    properties: { body: 'A'.repeat(2_200_000) }
  });
  buttons.get('btn-save-json').click();
  assert.equal(feedbackCalled?.level, 'error');
});

test('UML-07.5 Rendimiento y escalabilidad reproducible (renderizado, validación, CommandHistory y JSON ~1.9 MiB)', () => {
  const ctx = createInstrumented2dContext();
  const smallModel = DiagramModel.fromJSON(SAMPLE_USE_CASE_DOCUMENT, UseCaseCatalog);
  const mediumModel = buildLargeDeploymentDocument(60, 45);
  const largeModel = buildLargeDeploymentDocument(200, 150);

  const measureRenderMs = (model) => {
    const benchEditor = new Editor({
      catalogs: { 'use-case': UseCaseCatalog, deployment: DeploymentCatalog },
      initialDocument: model.toJSON()
    });
    const t0 = performance.now();
    CanvasRenderer.renderDiagramToContext(ctx, benchEditor, {
      width: 1280,
      height: 800,
      includeGrid: false,
      includeEditorOverlays: false
    });
    return performance.now() - t0;
  };

  const smallMs = measureRenderMs(smallModel);
  const mediumMs = measureRenderMs(mediumModel);
  const largeMs = measureRenderMs(largeModel);

  const largeSnapshot = largeModel.toJSON();
  const valStart = performance.now();
  const valRes = validateDocumentSnapshot(largeSnapshot, DeploymentCatalog);
  const valMs = performance.now() - valStart;
  assert.equal(valRes.isValid, true);

  // Importación JSON cercana a 2 MiB (~1.9 MiB)
  const nearLimitModel = DiagramModel.fromJSON(
    {
      schemaVersion: 1,
      id: 'near-limit',
      name: 'Cerca de 2 MiB',
      diagramType: 'use-case',
      model: { elements: [], relationships: [] },
      view: { elements: {}, relationships: {}, drawOrder: [] }
    },
    UseCaseCatalog
  );
  nearLimitModel.addElement({
    id: 'c-near',
    type: 'Comment',
    name: 'Extenso',
    properties: { body: 'B'.repeat(1_900_000) },
    x: 40,
    y: 40,
    width: 220,
    height: 120
  });
  const nearJson = prepareJsonExport(nearLimitModel);
  assert.equal(nearJson.isValid, true);
  assert.ok(nearJson.byteSize > 1_800_000 && nearJson.byteSize < MAX_JSON_FILE_BYTES);
  const importStart = performance.now();
  const importedNear = parseAndValidateDiagramJson(nearJson.jsonText);
  const importMs = performance.now() - importStart;
  assert.equal(importedNear.isValid, true);

  // Límite de memoria de CommandHistory (maxEntries = 50)
  const editor = new Editor({
    catalogs: { 'use-case': UseCaseCatalog, deployment: DeploymentCatalog }
  });
  editor.createNewEmptyDiagram('use-case');
  for (let i = 0; i < 65; i += 1) {
    editor.insertElementAt('Actor', { x: 20 + i * 5, y: 40 });
  }
  let undoCount = 0;
  while (editor.canUndo()) {
    editor.undo();
    undoCount += 1;
  }
  assert.equal(undoCount, 50);

  console.log(
    `[UML-07 BENCHMARK] render(small=${smallMs.toFixed(2)}ms, medium=${mediumMs.toFixed(2)}ms, large=${largeMs.toFixed(2)}ms), validate200=${valMs.toFixed(2)}ms, import1.9MiB=${importMs.toFixed(2)}ms (jsonBytes=${getUtf8ByteLength(nearJson.jsonText)})`
  );
  assert.ok(Number.isFinite(smallMs) && Number.isFinite(mediumMs) && Number.isFinite(largeMs));
});
