/**
 * Pruebas de regresión independientes — UML-06-FIX2:
 * Consistencia de persistencia JSON (Defecto A) y límites de exportación PNG (Defecto B).
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { Editor } from '../js/core/Editor.js';
import {
  MAX_JSON_FILE_BYTES,
  getUtf8ByteLength,
  parseAndValidateDiagramJson,
  prepareJsonExport,
  serializeDiagramToJson
} from '../js/io/JsonSerializer.js';
import {
  MAX_PNG_DIMENSION_PX,
  MAX_PNG_TOTAL_PIXELS,
  computeSafeExportDimensions,
  exportDiagramToPngBlob
} from '../js/io/PngExporter.js';
import { bindToolbarControls } from '../js/main.js';

function createMockButton(id) {
  const listeners = new Map();
  return {
    id,
    addEventListener(type, fn) {
      if (!listeners.has(type)) {
        listeners.set(type, []);
      }
      listeners.get(type).push(fn);
    },
    async dispatch(type, ev = {}) {
      for (const fn of listeners.get(type) || []) {
        await fn(ev);
      }
    }
  };
}

function createHeadlessExportCanvas() {
  const ctx = {
    save() {},
    restore() {},
    setTransform() {},
    fillRect() {},
    strokeRect() {},
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
    setLineDash() {},
    fillText() {},
    measureText(text) {
      return { width: String(text || '').length * 7 };
    }
  };
  return {
    width: 960,
    height: 580,
    getContext: (kind) => (kind === '2d' ? ctx : null),
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 960, height: 580 }),
    toBlob(cb) {
      cb(new Blob(['png'], { type: 'image/png' }));
    }
  };
}

test('AUD-06.1 Defecto A: Guardar JSON rechaza documentos > 2 MiB sin descargar ni truncar y garantiza reapertura de los aceptados', async () => {
  const editor = new Editor();
  editor.createNewEmptyDiagram('use-case');

  // Reproducción de auditoría: Comment extenso > 2 MiB (~2,099,234 bytes)
  const hugeBody = 'A'.repeat(2_098_000);
  const insertRes = editor.insertElementAt('Comment', {
    x: 100,
    y: 100,
    name: hugeBody,
    properties: { body: hugeBody }
  });
  assert.equal(insertRes.isValid, true);
  editor.setSelectedEntity(insertRes.elementId);

  const modelBefore = editor.getDiagramModel().toJSON();
  const historyBefore = editor.getHistory().getState();
  const selectedBefore = editor.getSelectedEntityId();

  const btnSaveJson = createMockButton('btn-save-json');
  const mockDoc = { getElementById: (id) => (id === 'btn-save-json' ? btnSaveJson : null) };
  const downloads = [];

  bindToolbarControls({
    doc: mockDoc,
    editor,
    canvasElement: createHeadlessExportCanvas(),
    triggerDownload: (blob, filename) => downloads.push({ blob, filename })
  });

  // Al pulsar Guardar JSON sobre documento > 2 MiB: no descarga, reporta error explícito y no muta nada
  await btnSaveJson.dispatch('click');
  assert.equal(downloads.length, 0);
  const feedback = editor.getStatusFeedback();
  assert.equal(feedback.level, 'error');
  assert.match(feedback.message, /supera el límite máximo permitido/i);
  assert.deepEqual(editor.getDiagramModel().toJSON(), modelBefore);
  assert.equal(editor.getSelectedEntityId(), selectedBefore);
  assert.equal(editor.getHistory().getState().undoCount, historyBefore.undoCount);

  // Documento válido por debajo del límite sí se descarga y puede reabrirse sin fallo
  editor.createNewEmptyDiagram('deployment');
  editor.insertElementAt('Node', { x: 120, y: 120, name: 'AppServer' });
  await btnSaveJson.dispatch('click');
  assert.equal(downloads.length, 1);
  assert.equal(editor.getStatusFeedback().level, 'ok');
  const downloadedText = await downloads[0].blob.text();
  assert.ok(getUtf8ByteLength(downloadedText) <= MAX_JSON_FILE_BYTES);
  const reopened = parseAndValidateDiagramJson(downloadedText);
  assert.equal(reopened.isValid, true);

  // Casos frontera exactos: maxBytes - 1, maxBytes, maxBytes + 1
  const rawSample = serializeDiagramToJson(editor.getDiagramModel());
  const exactBytes = getUtf8ByteLength(rawSample);
  assert.equal(prepareJsonExport(editor.getDiagramModel(), { maxBytes: exactBytes + 1 }).isValid, true);
  assert.equal(prepareJsonExport(editor.getDiagramModel(), { maxBytes: exactBytes }).isValid, true);
  assert.equal(prepareJsonExport(editor.getDiagramModel(), { maxBytes: exactBytes - 1 }).isValid, false);
});

test('AUD-06.2 Defecto B: Exportación PNG nunca supera MAX_PNG_DIMENSION_PX ni MAX_PNG_TOTAL_PIXELS y conserva proporciones', async () => {
  const editor = new Editor();
  editor.createNewEmptyDiagram('deployment');

  // Reproducción de auditoría: dos elementos muy separados horizontalmente (> 31,000 px)
  const leftId = editor.insertElementAt('Node', { x: 100, y: 100, name: 'LeftNode' }).elementId;
  editor.insertElementAt('Node', { x: 31000, y: 100, name: 'RightNode' });
  editor.setSelectedEntity(leftId);
  editor.zoomAt(0.5, { x: 200, y: 200 });
  editor.panBy(120, -40);

  const modelBefore = editor.getDiagramModel().toJSON();
  const viewportBefore = editor.getViewport().getState();
  const historyBefore = editor.getHistory().getState();
  const selectedBefore = editor.getSelectedEntityId();

  let requestedWidth = 0;
  let requestedHeight = 0;
  const { scale, bounds } = await exportDiagramToPngBlob(editor, {
    scale: 2,
    createCanvas: (w, h) => {
      requestedWidth = w;
      requestedHeight = h;
      return createHeadlessExportCanvas();
    }
  });

  assert.ok(bounds.width > 30000);
  assert.ok(requestedWidth <= MAX_PNG_DIMENSION_PX, `Ancho ${requestedWidth} excede ${MAX_PNG_DIMENSION_PX}`);
  assert.ok(requestedHeight <= MAX_PNG_DIMENSION_PX, `Alto ${requestedHeight} excede ${MAX_PNG_DIMENSION_PX}`);
  assert.ok(requestedWidth * requestedHeight <= MAX_PNG_TOTAL_PIXELS);
  assert.ok(scale > 0 && scale < 0.5);

  // Modelo, viewport, selección e historial intactos
  assert.deepEqual(editor.getDiagramModel().toJSON(), modelBefore);
  assert.deepEqual(editor.getViewport().getState(), viewportBefore);
  assert.equal(editor.getSelectedEntityId(), selectedBefore);
  assert.equal(editor.getHistory().getState().undoCount, historyBefore.undoCount);

  // Casos frontera de computeSafeExportDimensions
  const normal = computeSafeExportDimensions({ width: 800, height: 600 }, 2);
  assert.deepEqual(normal, { scale: 2, pixelWidth: 1600, pixelHeight: 1200 });

  const exactLimit = computeSafeExportDimensions({ width: 4096, height: 100 }, 2);
  assert.equal(exactLimit.pixelWidth, MAX_PNG_DIMENSION_PX);
  assert.equal(exactLimit.pixelHeight, 200);

  const overLimit = computeSafeExportDimensions({ width: 4097, height: 100 }, 2);
  assert.ok(overLimit.pixelWidth <= MAX_PNG_DIMENSION_PX);
  assert.ok(overLimit.scale < 2);

  // Caso extremo imposible (relación de aspecto > 8192:1 provocaría alto < 1 px) -> rechazo explícito
  assert.throws(
    () => computeSafeExportDimensions({ width: 100_000_000, height: 10 }, 2),
    /demasiado extremo|límite/i
  );
});
