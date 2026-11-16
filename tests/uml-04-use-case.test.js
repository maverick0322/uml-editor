import test from 'node:test';
import assert from 'node:assert/strict';

import { validateDocumentSnapshot } from '../js/core/DiagramModel.js';
import { Editor } from '../js/core/Editor.js';
import { CanvasRenderer } from '../js/canvas/CanvasRenderer.js';
import { InteractionManager } from '../js/canvas/InteractionManager.js';
import { UseCaseCatalog } from '../js/uml/use-case/UseCaseCatalog.js';

function createHeadlessCanvas() {
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
    width: 1200,
    height: 800,
    style: { cursor: 'default' },
    getContext: (kind) => (kind === '2d' ? ctx : null),
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 1200, height: 800 }),
    addEventListener() {},
    removeEventListener() {},
    setPointerCapture() {},
    releasePointerCapture() {}
  };
}

test('UML-04.1 PA-UC-01 y PA-CMN-01: Actor (stickman/rectangle, isAbstract, must_have_name) y Comment/CommentLink', () => {
  const editor = new Editor();
  editor.createNewEmptyDiagram('use-case');

  const act = editor.insertElementAt('Actor', { x: 100, y: 200, name: 'Cliente' });
  assert.equal(act.isValid, true);

  // Cambiar variante a rectangle e isAbstract: true
  const updValid = editor.updateElementProperties(act.elementId, {
    properties: { notationVariant: 'rectangle', isAbstract: true }
  });
  assert.equal(updValid.isValid, true);
  assert.equal(
    editor.getDiagramModel().getElementById(act.elementId).properties.notationVariant,
    'rectangle'
  );
  assert.equal(
    editor.getDiagramModel().getElementById(act.elementId).properties.isAbstract,
    true
  );

  // Rechazo atómico de nombre vacío (must_have_name)
  const updEmpty = editor.updateElementProperties(act.elementId, { name: '   ' });
  assert.equal(updEmpty.isValid, false);
  assert.equal(editor.getDiagramModel().getElementById(act.elementId).name, 'Cliente');

  // Renderizado sin errores en ambas variantes y Comment
  const cmn = editor.insertElementAt('Comment', {
    x: 300,
    y: 200,
    properties: { body: 'Nota sobre actor' }
  });
  assert.equal(cmn.isValid, true);
  const cl = editor.createRelationship({
    type: 'CommentLink',
    sourceId: cmn.elementId,
    targetId: act.elementId
  });
  assert.equal(cl.isValid, true);

  const renderer = new CanvasRenderer(createHeadlessCanvas(), editor);
  renderer.renderNow();
});

test('UML-04.2 PA-UC-02 y DP-03: Gestión de ExtensionPoint, protección ante ediciones y creación atómica en Extend', () => {
  const editor = new Editor();
  editor.createNewEmptyDiagram('use-case');

  const ucBase = editor.insertElementAt('UseCase', { x: 400, y: 180, name: 'Procesar Pago' });
  const ucExt = editor.insertElementAt('UseCase', { x: 650, y: 180, name: 'Emitir Comprobante' });
  assert.equal(ucBase.isValid && ucExt.isValid, true);

  // 1) Agregar y validar ExtensionPoints en UseCase
  assert.equal(
    editor.updateElementProperties(ucBase.elementId, {
      properties: {
        showExtensionPoints: true,
        extensionPoints: [{ id: 'ep-1', name: 'Pago Finalizado' }]
      }
    }).isValid,
    true
  );

  // Rechazo de ExtensionPoint con nombre vacío o ID duplicado
  assert.equal(
    editor.updateElementProperties(ucBase.elementId, {
      properties: { extensionPoints: [{ id: 'ep-1', name: '   ' }] }
    }).isValid,
    false
  );
  assert.equal(
    editor.updateElementProperties(ucBase.elementId, {
      properties: {
        extensionPoints: [
          { id: 'ep-1', name: 'A' },
          { id: 'ep-1', name: 'B' }
        ]
      }
    }).isValid,
    false
  );

  // 2) Flujo DP-03: crear nuevo ExtensionPoint + Extend en una sola operación atómica
  const pendingRes = editor.completeInteractiveConnection(
    'Extend',
    ucExt.elementId,
    ucBase.elementId
  );
  assert.equal(pendingRes.status, 'pending-extend');

  const confirmRes = editor.confirmPendingExtend({
    newExtensionPointName: 'Pago con Descuento',
    condition: 'clienteVIP == true'
  });
  assert.equal(confirmRes.isValid, true);
  assert.ok(confirmRes.extensionPointId);
  assert.equal(editor.getAvailableExtensionPointsFor(ucBase.elementId).length, 2);

  // 3) Proteger integridad: intentar eliminar el ExtensionPoint en uso debe fallar atómicamente
  const removeInUseRes = editor.updateElementProperties(ucBase.elementId, {
    properties: {
      extensionPoints: [{ id: 'ep-1', name: 'Pago Finalizado' }]
    }
  });
  assert.equal(removeInUseRes.isValid, false);
  assert.equal(editor.getAvailableExtensionPointsFor(ucBase.elementId).length, 2);

  // 4) ESC-UC-I05: Cancelar con Esc durante pending-extend o fallo con nombre vacío no deja rastros parciales
  const ucExt2 = editor.insertElementAt('UseCase', { x: 650, y: 320, name: 'Aplicar Cupón' });
  const beforeEsc = editor.getDiagramModel().toJSON();
  editor.completeInteractiveConnection('Extend', ucExt2.elementId, ucBase.elementId);
  const keyboardListeners = new Map();
  const keyboardTarget = {
    addEventListener: (t, fn) => keyboardListeners.set(t, fn),
    removeEventListener() {}
  };
  const manager = new InteractionManager({
    canvas: createHeadlessCanvas(),
    editor,
    keyboardTarget
  });
  keyboardListeners.get('keydown')({ key: 'Escape', preventDefault() {} });
  assert.equal(editor.getPendingExtendConfirmation(), null);
  assert.deepEqual(editor.getDiagramModel().toJSON(), beforeEsc);
  manager.destroy();
});

test('UML-04.3 PA-UC-03, ESC-UC-V05 y ESC-UC-I03: Múltiples SystemBoundary sin anidación (DP-02)', () => {
  const editor = new Editor();
  editor.createNewEmptyDiagram('use-case');

  const sb1 = editor.insertElementAt('SystemBoundary', { x: 250, y: 200, name: 'Portal Web' });
  const sb2 = editor.insertElementAt('SystemBoundary', { x: 620, y: 200, name: 'Sistema ERP' });
  const uc = editor.insertElementAt('UseCase', { x: 250, y: 220, name: 'Realizar Pedido' });
  const act = editor.insertElementAt('Actor', { x: 80, y: 220, name: 'Cliente' });
  assert.equal(sb1.isValid && sb2.isValid && uc.isValid && act.isValid, true);

  // Asignación explícita válida de UseCase dentro de SystemBoundary
  assert.equal(editor.updateElementProperties(uc.elementId, { parentId: sb1.elementId }).isValid, true);

  // ESC-UC-I03: Prohibido anidar SystemBoundary dentro de otro SystemBoundary (DP-02)
  assert.equal(
    editor.updateElementProperties(sb2.elementId, { parentId: sb1.elementId }).isValid,
    false
  );
  // ESC-UC-I03: Prohibido contener Actor dentro de SystemBoundary (§18.1.3)
  assert.equal(
    editor.updateElementProperties(act.elementId, { parentId: sb1.elementId }).isValid,
    false
  );
});

test('UML-04.4 ESC-UC-V01..V04, ESC-UC-I01..I04: Ciclos dirigidos en Include, Generalization y Extend', () => {
  const editor = new Editor();
  editor.createNewEmptyDiagram('use-case');

  const act1 = editor.insertElementAt('Actor', { x: 80, y: 120, name: 'Cliente' });
  const act2 = editor.insertElementAt('Actor', { x: 80, y: 260, name: 'Cliente Corporativo' });
  const uc1 = editor.insertElementAt('UseCase', { x: 300, y: 120, name: 'UC1' });
  const uc2 = editor.insertElementAt('UseCase', { x: 520, y: 120, name: 'UC2' });
  const uc3 = editor.insertElementAt('UseCase', { x: 520, y: 260, name: 'UC3' });

  // Válidas: Association (ESC-UC-V01), Include (ESC-UC-V02), Generalization (ESC-UC-V04)
  assert.equal(
    editor.createRelationship({ type: 'Association', sourceId: act1.elementId, targetId: uc1.elementId }).isValid,
    true
  );
  assert.equal(
    editor.createRelationship({ type: 'Generalization', sourceId: act2.elementId, targetId: act1.elementId }).isValid,
    true
  );
  assert.equal(
    editor.createRelationship({ type: 'Include', sourceId: uc1.elementId, targetId: uc2.elementId }).isValid,
    true
  );
  assert.equal(
    editor.createRelationship({ type: 'Include', sourceId: uc2.elementId, targetId: uc3.elementId }).isValid,
    true
  );

  // ESC-UC-I04: Ciclo dirigido de 3 nodos en Include (UC3 -> UC1) debe rechazarse atómicamente
  const beforeCycle = editor.getDiagramModel().toJSON();
  const incCycleRes = editor.createRelationship({
    type: 'Include',
    sourceId: uc3.elementId,
    targetId: uc1.elementId
  });
  assert.equal(incCycleRes.isValid, false);
  assert.deepEqual(editor.getDiagramModel().toJSON(), beforeCycle);

  // Ciclo dirigido en Generalization (act1 -> act2 cuando ya existe act2 -> act1)
  const genCycleRes = editor.createRelationship({
    type: 'Generalization',
    sourceId: act1.elementId,
    targetId: act2.elementId
  });
  assert.equal(genCycleRes.isValid, false);
  assert.deepEqual(editor.getDiagramModel().toJSON(), beforeCycle);

  // ESC-UC-I01 y ESC-UC-I02
  assert.equal(
    editor.createRelationship({ type: 'Association', sourceId: uc1.elementId, targetId: uc2.elementId }).isValid,
    false
  );
  assert.equal(
    editor.createRelationship({ type: 'Include', sourceId: act1.elementId, targetId: uc1.elementId }).isValid,
    false
  );
});

test('UML-04.5 Diferenciación entre errores bloqueantes y advertencias de modelado (§8.2)', () => {
  const editor = new Editor();
  editor.createNewEmptyDiagram('use-case');

  const ucIsolated = editor.insertElementAt('UseCase', {
    x: 240,
    y: 160,
    name: 'Caso Aislado',
    properties: {
      isAbstract: false,
      showExtensionPoints: true,
      extensionPoints: [{ id: 'ep-1', name: 'Punto 1' }]
    }
  });
  const ucExt = editor.insertElementAt('UseCase', { x: 480, y: 160, name: 'Extensor' });

  // Extend sin condición: válido (no bloqueante), pero genera advertencia UC-WARN-EXTEND-NO-CONDITION
  const extRes = editor.createRelationship({
    type: 'Extend',
    sourceId: ucExt.elementId,
    targetId: ucIsolated.elementId,
    properties: { extensionLocation: 'ep-1' }
  });
  assert.equal(extRes.isValid, true);

  const ucAnotherIsolated = editor.insertElementAt('UseCase', {
    x: 240,
    y: 300,
    name: 'Otro Aislado'
  });
  assert.equal(ucAnotherIsolated.isValid, true);

  const warnings = editor.getModelWarnings();
  assert.ok(warnings.some((w) => w.code === 'UC-WARN-EXTEND-NO-CONDITION'));
  assert.ok(warnings.some((w) => w.code === 'UC-WARN-ISOLATED-USECASE' && w.targetId === ucAnotherIsolated.elementId));
  assert.equal(validateDocumentSnapshot(editor.getDiagramModel().toJSON(), UseCaseCatalog).isValid, true);
});

test('UML-04.6 Reconstrucción completa del ejemplo «Sistema de Banca en Línea» (§9.2)', () => {
  const editor = new Editor();
  editor.createNewEmptyDiagram('use-case');

  const sb1 = editor.insertElementAt('SystemBoundary', { x: 450, y: 260, name: 'Portal de Banca en Línea' });
  const sb2 = editor.insertElementAt('SystemBoundary', { x: 840, y: 260, name: 'Módulo de Auditoría Externa' });

  const act1 = editor.insertElementAt('Actor', { x: 90, y: 160, name: 'Cliente Bancario' });
  const act2 = editor.insertElementAt('Actor', { x: 90, y: 340, name: 'Cliente Corporativo' });
  const act3 = editor.insertElementAt('Actor', { x: 680, y: 420, name: 'Red Interbancaria SPEI' });

  const uc1 = editor.insertElementAt('UseCase', {
    x: 340,
    y: 160,
    name: 'Transferir Fondos',
    parentId: sb1.elementId,
    properties: {
      isAbstract: false,
      showExtensionPoints: true,
      extensionPoints: [{ id: 'ep-1', name: 'Monto Mayor al Límite' }]
    }
  });
  const uc2 = editor.insertElementAt('UseCase', {
    x: 560,
    y: 160,
    name: 'Autenticar con Token 2FA',
    parentId: sb1.elementId
  });
  const uc3 = editor.insertElementAt('UseCase', {
    x: 340,
    y: 300,
    name: 'Solicitar Autorización Mancomunada',
    parentId: sb1.elementId
  });
  const uc4 = editor.insertElementAt('UseCase', {
    x: 560,
    y: 300,
    name: 'Consultar Saldo',
    parentId: sb1.elementId
  });
  const uc5 = editor.insertElementAt('UseCase', {
    x: 840,
    y: 260,
    name: 'Registrar Traza Regulatoria',
    parentId: sb2.elementId
  });

  const cmn1 = editor.insertElementAt('Comment', {
    x: 160,
    y: 440,
    properties: { body: 'Condición: {monto > $50,000}\nPunto: Monto Mayor al Límite' }
  });

  assert.equal(
    editor.createRelationship({ type: 'Association', sourceId: act1.elementId, targetId: uc1.elementId }).isValid,
    true
  );
  assert.equal(
    editor.createRelationship({ type: 'Association', sourceId: act1.elementId, targetId: uc4.elementId }).isValid,
    true
  );
  assert.equal(
    editor.createRelationship({ type: 'Association', sourceId: uc1.elementId, targetId: act3.elementId }).isValid,
    true
  );
  assert.equal(
    editor.createRelationship({ type: 'Association', sourceId: act3.elementId, targetId: uc5.elementId }).isValid,
    true
  );
  assert.equal(
    editor.createRelationship({ type: 'Generalization', sourceId: act2.elementId, targetId: act1.elementId }).isValid,
    true
  );
  assert.equal(
    editor.createRelationship({ type: 'Include', sourceId: uc1.elementId, targetId: uc2.elementId }).isValid,
    true
  );

  const extRel = editor.createExtendRelationship({
    sourceId: uc3.elementId,
    targetId: uc1.elementId,
    extensionPointId: 'ep-1',
    condition: 'monto > $50,000 y cuenta corporativa'
  });
  assert.equal(extRel.isValid, true);

  assert.equal(
    editor.createRelationship({
      type: 'CommentLink',
      sourceId: cmn1.elementId,
      targetId: extRel.relationshipId
    }).isValid,
    true
  );

  const counts = editor.getDiagramModel().getCounts();
  assert.equal(counts.elementsCount, 11);
  assert.equal(counts.relationshipsCount, 8);
  assert.equal(validateDocumentSnapshot(editor.getDiagramModel().toJSON(), UseCaseCatalog).isValid, true);
  assert.equal(editor.getModelWarnings().length, 0);
});
