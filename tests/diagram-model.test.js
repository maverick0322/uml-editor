/**
 * Suite de pruebas unitarias para `DiagramModel`, `Editor` y `Geometry` — Incremento UML-01.
 * Ejecutable directamente con el runner nativo de Node.js (`node --test`).
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DiagramModel,
  clonePlainData,
  createEmptyDocumentSnapshot,
  validateDocumentSnapshot
} from '../js/core/DiagramModel.js';
import { Editor } from '../js/core/Editor.js';
import {
  SAMPLE_DEPLOYMENT_DOCUMENT,
  SAMPLE_USE_CASE_DOCUMENT
} from '../js/uml/SampleDiagrams.js';
import {
  getBoxCenter,
  getEllipsePerimeterPoint,
  getPolylineMidpoint,
  getRectanglePerimeterPoint
} from '../js/canvas/Geometry.js';
import { CanvasRenderer } from '../js/canvas/CanvasRenderer.js';

test('1. Independencia del dominio respecto al DOM y Canvas en entorno Node.js', () => {
  assert.equal(typeof window, 'undefined', 'No debe requerirse window en el dominio');
  assert.equal(typeof document, 'undefined', 'No debe requerirse document en el dominio');
});

test('2. Creación de documentos vacíos y precargados para ambos tipos (use-case y deployment)', () => {
  const emptyUC = createEmptyDocumentSnapshot({
    diagramType: 'use-case',
    id: 'uc-empty',
    name: 'Casos de Uso Vacío'
  });
  const modelUC = new DiagramModel(emptyUC);
  assert.equal(modelUC.getDiagramType(), 'use-case');
  assert.deepEqual(modelUC.getCounts(), { elementsCount: 0, relationshipsCount: 0 });

  const emptyDep = createEmptyDocumentSnapshot({
    diagramType: 'deployment',
    id: 'dep-empty',
    name: 'Despliegue Vacío'
  });
  const modelDep = new DiagramModel(emptyDep);
  assert.equal(modelDep.getDiagramType(), 'deployment');
  assert.deepEqual(modelDep.getCounts(), { elementsCount: 0, relationshipsCount: 0 });

  // Carga de los dos documentos demostrativos de UML-01 a través de Editor
  const editor = new Editor();
  assert.equal(editor.getDiagramType(), 'use-case');
  assert.equal(editor.getDiagramModel().getCounts().elementsCount, 11);
  assert.equal(editor.getDiagramModel().getCounts().relationshipsCount, 8);

  const switchResult = editor.loadSampleDiagram('deployment');
  assert.equal(switchResult.isValid, true);
  assert.equal(editor.getDiagramType(), 'deployment');
  assert.equal(editor.getDiagramModel().getCounts().elementsCount, 10);
  assert.equal(editor.getDiagramModel().getCounts().relationshipsCount, 6);
});

test('3. Unicidad global de IDs y correspondencia 1 a 1 entre model y view', () => {
  const duplicateElementIdDoc = clonePlainData(SAMPLE_USE_CASE_DOCUMENT);
  duplicateElementIdDoc.model.elements.push({
    id: 'act-1', // ID ya existente
    type: 'Actor',
    name: 'Actor Duplicado',
    parentId: null,
    properties: {}
  });
  const resDupEl = validateDocumentSnapshot(duplicateElementIdDoc);
  assert.equal(resDupEl.isValid, false);
  assert.ok(resDupEl.errors.some((e) => e.includes('ID duplicado')));

  // Colisión de ID entre un elemento y una relación (espacio global disjunto)
  const collidingRelIdDoc = clonePlainData(SAMPLE_USE_CASE_DOCUMENT);
  collidingRelIdDoc.model.relationships[0].id = 'uc-1';
  collidingRelIdDoc.view.relationships['uc-1'] = { waypoints: [] };
  delete collidingRelIdDoc.view.relationships['rel-uc-1'];
  const resCollision = validateDocumentSnapshot(collidingRelIdDoc);
  assert.equal(resCollision.isValid, false);
  assert.ok(resCollision.errors.some((e) => e.includes('ID duplicado')));

  // Falta entrada en view.elements o drawOrder desincronizado
  const missingViewDoc = clonePlainData(SAMPLE_DEPLOYMENT_DOCUMENT);
  delete missingViewDoc.view.elements['dev-1'];
  const resMissingView = validateDocumentSnapshot(missingViewDoc);
  assert.equal(resMissingView.isValid, false);
  assert.ok(resMissingView.errors.some((e) => e.includes('view.elements')));

  const missingDrawOrderDoc = clonePlainData(SAMPLE_DEPLOYMENT_DOCUMENT);
  missingDrawOrderDoc.view.drawOrder.pop();
  const resDrawOrder = validateDocumentSnapshot(missingDrawOrderDoc);
  assert.equal(resDrawOrder.isValid, false);
  assert.ok(resDrawOrder.errors.some((e) => e.includes('view.drawOrder')));
});

test('4. Rechazo atómico de documentos estructuralmente inválidos sin mutar el estado previo', () => {
  const model = new DiagramModel(SAMPLE_USE_CASE_DOCUMENT);
  const snapshotBefore = model.toJSON();

  // Caso A: Mezcla de catálogos (insertar un Device en un diagrama use-case)
  const mixedCatalogDoc = clonePlainData(SAMPLE_USE_CASE_DOCUMENT);
  mixedCatalogDoc.model.elements.push({
    id: 'dev-intruso',
    type: 'Device',
    name: 'Servidor Intruso',
    parentId: null,
    properties: {}
  });
  mixedCatalogDoc.view.elements['dev-intruso'] = { x: 10, y: 10, width: 100, height: 80 };
  mixedCatalogDoc.view.drawOrder.push('dev-intruso');

  const resMixed = model.loadDocument(mixedCatalogDoc);
  assert.equal(resMixed.isValid, false);
  assert.deepEqual(
    model.toJSON(),
    snapshotBefore,
    'El modelo no debe modificarse parcialmente tras rechazar mezcla de catálogos'
  );

  // Caso B: Actor contenido dentro de SystemBoundary (prohibido por OMG UML 2.5.1 §18.1.3)
  const actorInsideBoundaryDoc = clonePlainData(SAMPLE_USE_CASE_DOCUMENT);
  const actor = actorInsideBoundaryDoc.model.elements.find((e) => e.id === 'act-1');
  actor.parentId = 'sb-1';

  const resActorInBoundary = model.loadDocument(actorInsideBoundaryDoc);
  assert.equal(resActorInBoundary.isValid, false);
  assert.deepEqual(model.toJSON(), snapshotBefore);

  // Caso C: Anidación de SystemBoundary dentro de otro SystemBoundary (prohibido por DP-02)
  const nestedBoundaryDoc = clonePlainData(SAMPLE_USE_CASE_DOCUMENT);
  const sb2 = nestedBoundaryDoc.model.elements.find((e) => e.id === 'sb-2');
  sb2.parentId = 'sb-1';

  const resNestedBoundary = model.loadDocument(nestedBoundaryDoc);
  assert.equal(resNestedBoundary.isValid, false);
  assert.deepEqual(model.toJSON(), snapshotBefore);

  // Caso D: Relación Extend sin ExtensionPoint válido en el UseCase destino (DP-03)
  const invalidExtendDoc = clonePlainData(SAMPLE_USE_CASE_DOCUMENT);
  const extendRel = invalidExtendDoc.model.relationships.find((r) => r.type === 'Extend');
  extendRel.properties.extensionLocation = 'ep-inexistente';

  const resInvalidExtend = model.loadDocument(invalidExtendDoc);
  assert.equal(resInvalidExtend.isValid, false);
  assert.deepEqual(model.toJSON(), snapshotBefore);

  // Caso E: Ciclo de contención en despliegue
  const cyclicContainmentDoc = clonePlainData(SAMPLE_DEPLOYMENT_DOCUMENT);
  const dev2 = cyclicContainmentDoc.model.elements.find((e) => e.id === 'dev-2');
  dev2.parentId = 'env-1'; // env-1 ya tiene parentId: 'dev-2'

  const resCyclic = model.loadDocument(cyclicContainmentDoc);
  assert.equal(resCyclic.isValid, false);
  assert.deepEqual(model.toJSON(), snapshotBefore);
});

test('5. Contrato de referencias de CommentLink (hacia elemento, hacia relación UML y rechazo hacia otro CommentLink)', () => {
  // En SAMPLE_USE_CASE_DOCUMENT, rel-uc-8 es un CommentLink que apunta a la relación Extend rel-uc-5
  const validRelTarget = validateDocumentSnapshot(SAMPLE_USE_CASE_DOCUMENT);
  assert.equal(validRelTarget.isValid, true);

  // CommentLink apuntando a un elemento (uc-1) también es válido
  const elementTargetDoc = clonePlainData(SAMPLE_USE_CASE_DOCUMENT);
  const commentLink = elementTargetDoc.model.relationships.find((r) => r.id === 'rel-uc-8');
  commentLink.targetId = 'uc-1';
  const validElTarget = validateDocumentSnapshot(elementTargetDoc);
  assert.equal(validElTarget.isValid, true);

  // CommentLink apuntando a otro CommentLink debe ser rechazado
  const linkToLinkDoc = clonePlainData(SAMPLE_USE_CASE_DOCUMENT);
  linkToLinkDoc.model.elements.push({
    id: 'cmn-uc-2',
    type: 'Comment',
    name: '',
    parentId: null,
    properties: { body: 'Segunda nota' }
  });
  linkToLinkDoc.view.elements['cmn-uc-2'] = { x: 20, y: 420, width: 120, height: 50 };
  linkToLinkDoc.view.drawOrder.push('cmn-uc-2');
  linkToLinkDoc.model.relationships.push({
    id: 'rel-uc-9',
    type: 'CommentLink',
    sourceId: 'cmn-uc-2',
    targetId: 'rel-uc-8', // apunta a otro CommentLink
    name: '',
    properties: {}
  });
  linkToLinkDoc.view.relationships['rel-uc-9'] = { waypoints: [] };

  const invalidLinkToLink = validateDocumentSnapshot(linkToLinkDoc);
  assert.equal(invalidLinkToLink.isValid, false);
  assert.ok(invalidLinkToLink.errors.some((e) => e.includes('CommentLink')));
});

test('6. Cálculos geométricos puros de perímetros y punto medio de polilínea', () => {
  const box = { x: 100, y: 100, width: 200, height: 100 };
  assert.deepEqual(getBoxCenter(box), { x: 200, y: 150 });

  const rightAnchor = getRectanglePerimeterPoint(box, { x: 500, y: 150 });
  assert.equal(rightAnchor.x, 300);
  assert.equal(rightAnchor.y, 150);

  const ellipseTopAnchor = getEllipsePerimeterPoint(box, { x: 200, y: 0 });
  assert.ok(Math.abs(ellipseTopAnchor.x - 200) < 1e-6);
  assert.ok(Math.abs(ellipseTopAnchor.y - 100) < 1e-6);

  const midpoint = getPolylineMidpoint([
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 100 }
  ]);
  assert.equal(midpoint.x, 100);
  assert.equal(midpoint.y, 0);
});

test('7. Ejecución sin errores de CanvasRenderer y descriptores de ambos catálogos sobre contexto 2D instrumentado', () => {
  const drawnTexts = [];
  let strokeCalls = 0;

  const mockCtx = {
    save() {},
    restore() {},
    setTransform() {},
    fillRect() {},
    strokeRect() {
      strokeCalls += 1;
    },
    beginPath() {},
    closePath() {},
    moveTo() {},
    lineTo() {},
    arc() {},
    ellipse() {},
    fill() {},
    stroke() {
      strokeCalls += 1;
    },
    setLineDash() {},
    measureText(text) {
      return { width: String(text).length * 7 };
    },
    fillText(text) {
      drawnTexts.push(String(text));
    }
  };

  const mockCanvas = {
    width: 0,
    height: 0,
    getContext(type) {
      return type === '2d' ? mockCtx : null;
    },
    getBoundingClientRect() {
      return { width: 960, height: 580 };
    }
  };

  const prevWindow = globalThis.window;
  globalThis.window = { devicePixelRatio: 2 };

  try {
    const editor = new Editor();
    const renderer = new CanvasRenderer(mockCanvas, editor);

    // Renderizado del diagrama demostrativo de Casos de Uso
    renderer.renderNow();
    assert.equal(mockCanvas.width, 1920);
    assert.equal(mockCanvas.height, 1160);
    assert.ok(drawnTexts.includes('Portal de Banca en Línea'));
    assert.ok(drawnTexts.includes('Transferir Fondos'));
    assert.ok(drawnTexts.includes('«include»'));
    assert.ok(drawnTexts.includes('«extend» (ep-1)'));
    assert.ok(strokeCalls > 15);

    // Cambio a modo Despliegue y renderizado del diagrama demostrativo de Despliegue
    drawnTexts.length = 0;
    editor.loadSampleDiagram('deployment');
    editor.setInspectedEntity('art-1');
    renderer.renderNow();
    assert.ok(drawnTexts.includes('«device»'));
    assert.ok(drawnTexts.includes('app-srv-01 : AppServer'));
    assert.ok(drawnTexts.includes('«executionEnvironment»'));
    assert.ok(drawnTexts.includes('«artifact»'));
    assert.ok(drawnTexts.includes('«manifest» Component: CatalogComponent'));
    assert.ok(drawnTexts.includes('«deploy»'));
    assert.ok(drawnTexts.includes('«manifest»'));
  } finally {
    if (prevWindow === undefined) {
      delete globalThis.window;
    } else {
      globalThis.window = prevWindow;
    }
  }
});

test('8. UML-01-FIX Defecto 1: rechazo atómico de Include entre dos Actor y aceptación de escenarios válidos equivalentes', () => {
  const model = new DiagramModel(SAMPLE_USE_CASE_DOCUMENT);
  const snapshotBefore = model.toJSON();

  // Escenario negativo (Defecto 1): relación Include entre dos Actor (act-1 -> act-2)
  const includeBetweenActorsDoc = clonePlainData(SAMPLE_USE_CASE_DOCUMENT);
  includeBetweenActorsDoc.model.relationships.push({
    id: 'rel-invalid-inc-actors',
    type: 'Include',
    sourceId: 'act-1',
    targetId: 'act-2',
    name: '',
    properties: {}
  });
  includeBetweenActorsDoc.view.relationships['rel-invalid-inc-actors'] = { waypoints: [] };

  const validationActorsInc = validateDocumentSnapshot(includeBetweenActorsDoc);
  assert.equal(
    validationActorsInc.isValid,
    false,
    'validateDocumentSnapshot debe rechazar Include entre dos Actor'
  );
  assert.ok(validationActorsInc.errors.some((e) => e.includes('Include')));

  const loadResActorsInc = model.loadDocument(includeBetweenActorsDoc);
  assert.equal(loadResActorsInc.isValid, false);
  assert.deepEqual(
    model.toJSON(),
    snapshotBefore,
    'El rechazo de Include entre dos Actor debe ser atómico sin mutar el modelo previo'
  );

  // Otros cruces inválidos de extremos en use-case: Association entre dos UseCase y Generalization Actor -> UseCase
  const assocBetweenUseCasesDoc = clonePlainData(SAMPLE_USE_CASE_DOCUMENT);
  assocBetweenUseCasesDoc.model.relationships.push({
    id: 'rel-invalid-assoc-uc',
    type: 'Association',
    sourceId: 'uc-1',
    targetId: 'uc-4',
    name: '',
    properties: {}
  });
  assocBetweenUseCasesDoc.view.relationships['rel-invalid-assoc-uc'] = { waypoints: [] };
  assert.equal(validateDocumentSnapshot(assocBetweenUseCasesDoc).isValid, false);

  const crossGeneralizationDoc = clonePlainData(SAMPLE_USE_CASE_DOCUMENT);
  crossGeneralizationDoc.model.relationships.push({
    id: 'rel-invalid-gen-cross',
    type: 'Generalization',
    sourceId: 'act-1',
    targetId: 'uc-1',
    name: '',
    properties: {}
  });
  crossGeneralizationDoc.view.relationships['rel-invalid-gen-cross'] = { waypoints: [] };
  assert.equal(validateDocumentSnapshot(crossGeneralizationDoc).isValid, false);

  // Escenario válido equivalente: Include entre dos UseCase (uc-4 -> uc-2) y Generalization entre dos Actor (act-2 -> act-1)
  const validUseCaseIncludeDoc = clonePlainData(SAMPLE_USE_CASE_DOCUMENT);
  validUseCaseIncludeDoc.model.relationships.push({
    id: 'rel-valid-inc-uc',
    type: 'Include',
    sourceId: 'uc-4',
    targetId: 'uc-2',
    name: '',
    properties: {}
  });
  validUseCaseIncludeDoc.view.relationships['rel-valid-inc-uc'] = { waypoints: [] };

  const validIncRes = model.loadDocument(validUseCaseIncludeDoc);
  assert.equal(validIncRes.isValid, true, 'Include entre dos UseCase debe ser aceptado');
  assert.equal(model.getCounts().relationshipsCount, 9);
});

test('9. UML-01-FIX Defecto 2: rechazo atómico de Comment con parentId hacia Node en despliegue y aceptación de escenarios válidos equivalentes', () => {
  const model = new DiagramModel(SAMPLE_DEPLOYMENT_DOCUMENT);
  const snapshotBefore = model.toJSON();

  // Escenario negativo (Defecto 2): elemento Comment con parentId referenciando un Node en un diagrama de despliegue
  const commentInsideNodeDoc = clonePlainData(SAMPLE_DEPLOYMENT_DOCUMENT);
  commentInsideNodeDoc.model.elements.unshift({
    id: 'node-host-1',
    type: 'Node',
    name: 'Nodo Central',
    parentId: null,
    properties: { isInstance: false }
  });
  commentInsideNodeDoc.view.elements['node-host-1'] = {
    x: 20,
    y: 20,
    width: 220,
    height: 140
  };
  commentInsideNodeDoc.view.drawOrder.unshift('node-host-1');

  const commentEl = commentInsideNodeDoc.model.elements.find((e) => e.id === 'cmn-dep-1');
  commentEl.parentId = 'node-host-1';

  const validationCommentInNode = validateDocumentSnapshot(commentInsideNodeDoc);
  assert.equal(
    validationCommentInNode.isValid,
    false,
    'validateDocumentSnapshot debe rechazar un Comment con parentId apuntando a un Node'
  );
  assert.ok(validationCommentInNode.errors.some((e) => e.includes('Contención inválida')));

  const loadResCommentInNode = model.loadDocument(commentInsideNodeDoc);
  assert.equal(loadResCommentInNode.isValid, false);
  assert.deepEqual(
    model.toJSON(),
    snapshotBefore,
    'El rechazo de Comment contenido en Node debe ser atómico sin mutar el estado previo'
  );

  // Escenarios válidos equivalentes:
  // (a) Comment en la raíz (parentId: null) enlazado mediante CommentLink al Node, y
  // (b) Artifact o ExecutionEnvironment contenido válidamente dentro de ese Node (parentId: 'node-host-1').
  const validNodeAndCommentDoc = clonePlainData(SAMPLE_DEPLOYMENT_DOCUMENT);
  validNodeAndCommentDoc.model.elements.unshift({
    id: 'node-host-1',
    type: 'Node',
    name: 'Nodo Central',
    parentId: null,
    properties: { isInstance: false }
  });
  validNodeAndCommentDoc.view.elements['node-host-1'] = {
    x: 20,
    y: 20,
    width: 220,
    height: 140
  };
  validNodeAndCommentDoc.view.drawOrder.unshift('node-host-1');

  // Anidar un Artifact válido dentro del Node y mantener el Comment en la raíz apuntando al Node con CommentLink
  validNodeAndCommentDoc.model.elements.push({
    id: 'art-nested-in-node',
    type: 'Artifact',
    name: 'monitoring-agent.jar',
    parentId: 'node-host-1',
    properties: { isInstance: false }
  });
  validNodeAndCommentDoc.view.elements['art-nested-in-node'] = {
    x: 40,
    y: 65,
    width: 170,
    height: 55
  };
  validNodeAndCommentDoc.view.drawOrder.push('art-nested-in-node');

  validNodeAndCommentDoc.model.relationships.push({
    id: 'rel-comment-to-node',
    type: 'CommentLink',
    sourceId: 'cmn-dep-1',
    targetId: 'node-host-1',
    name: '',
    properties: {}
  });
  validNodeAndCommentDoc.view.relationships['rel-comment-to-node'] = { waypoints: [] };

  const validRes = model.loadDocument(validNodeAndCommentDoc);
  assert.equal(
    validRes.isValid,
    true,
    'Comment en raíz enlazado con CommentLink a Node y Artifact contenido en Node deben aceptarse'
  );

  // Verificación adicional de extremos inválidos en despliegue (Matriz 7.3)
  const invalidCommPathDoc = clonePlainData(SAMPLE_DEPLOYMENT_DOCUMENT);
  invalidCommPathDoc.model.relationships.push({
    id: 'rel-invalid-comm-art',
    type: 'CommunicationPath',
    sourceId: 'art-2',
    targetId: 'dev-1',
    name: '',
    properties: {}
  });
  invalidCommPathDoc.view.relationships['rel-invalid-comm-art'] = { waypoints: [] };
  assert.equal(validateDocumentSnapshot(invalidCommPathDoc).isValid, false);

  const invalidManifestToNodeDoc = clonePlainData(SAMPLE_DEPLOYMENT_DOCUMENT);
  invalidManifestToNodeDoc.model.relationships.push({
    id: 'rel-invalid-manifest-node',
    type: 'Manifestation',
    sourceId: 'art-2',
    targetId: 'dev-1',
    name: '',
    properties: {}
  });
  invalidManifestToNodeDoc.view.relationships['rel-invalid-manifest-node'] = { waypoints: [] };
  assert.equal(validateDocumentSnapshot(invalidManifestToNodeDoc).isValid, false);
});

test('10. UML-02-FIX: Rechazo atómico de IDs reservados del prototipo en addElement() y preservación de invariantes tras toJSON()', () => {
  const model = new DiagramModel(SAMPLE_USE_CASE_DOCUMENT);
  const snapshotBefore = model.toJSON();

  const reservedIds = [
    '__proto__',
    'constructor',
    'prototype',
    'toString',
    'valueOf',
    'hasOwnProperty',
    '   ',
    ' actor-con-espacios '
  ];

  for (const badId of reservedIds) {
    const res = model.addElement({
      id: badId,
      type: 'Actor',
      name: 'Usuario',
      x: 120,
      y: 120
    });
    assert.equal(
      res.isValid,
      false,
      `addElement debe rechazar el identificador reservado o inválido "${badId}"`
    );
    assert.deepEqual(
      model.toJSON(),
      snapshotBefore,
      `El rechazo de "${badId}" debe ser atómico sin mutar el documento`
    );
  }

  // Verificar que los IDs válidos personalizados siguen aceptándose y sobreviven a toJSON()
  const validRes = model.addElement({
    id: 'actor-custom_01',
    type: 'Actor',
    name: 'Auditor Externo',
    x: 140,
    y: 160
  });
  assert.equal(validRes.isValid, true);
  assert.equal(validRes.elementId, 'actor-custom_01');

  const serialized = model.toJSON();
  assert.equal(validateDocumentSnapshot(serialized).isValid, true);
  assert.ok(Object.prototype.hasOwnProperty.call(serialized.view.elements, 'actor-custom_01'));
  assert.equal(model.getElementView('toString'), null);
  assert.equal(model.getRelationshipView('constructor'), null);
});

test('11. UML-02-FIX: Rechazo en validación/carga de documentos con claves reservadas y consistencia tras serialización en ambos modos', () => {
  const model = new DiagramModel(SAMPLE_DEPLOYMENT_DOCUMENT);
  const snapshotBefore = model.toJSON();

  // 1) JSON parseado con "__proto__" como propiedad propia en model.elements y view.elements
  const jsonWithProtoElement = JSON.parse(
    JSON.stringify({
      schemaVersion: 1,
      id: 'doc-proto-test',
      name: 'Prueba Proto',
      diagramType: 'use-case',
      model: {
        elements: [{ id: 'TEMP_ID', type: 'Actor', name: 'Actor', parentId: null, properties: {} }],
        relationships: []
      },
      view: {
        elements: {},
        relationships: {},
        drawOrder: ['__proto__']
      }
    }).replace('"TEMP_ID"', '"__proto__"')
  );
  Object.defineProperty(jsonWithProtoElement.view.elements, '__proto__', {
    value: { x: 10, y: 10, width: 60, height: 100 },
    writable: true,
    enumerable: true,
    configurable: true
  });

  assert.equal(validateDocumentSnapshot(jsonWithProtoElement).isValid, false);
  const loadProtoRes = model.loadDocument(jsonWithProtoElement);
  assert.equal(loadProtoRes.isValid, false);
  assert.deepEqual(model.toJSON(), snapshotBefore);

  // 2) Objeto JS corrupto donde view.elements['__proto__'] mutó [[Prototype]]
  const jsCorruptedProtoDoc = createEmptyDocumentSnapshot({ diagramType: 'use-case', id: 'doc-js' });
  jsCorruptedProtoDoc.model.elements.push({
    id: '__proto__',
    type: 'Actor',
    name: 'Actor',
    parentId: null,
    properties: {}
  });
  jsCorruptedProtoDoc.view.elements['__proto__'] = { x: 10, y: 10, width: 60, height: 100 };
  jsCorruptedProtoDoc.view.drawOrder.push('__proto__');

  assert.equal(validateDocumentSnapshot(jsCorruptedProtoDoc).isValid, false);
  assert.equal(model.loadDocument(jsCorruptedProtoDoc).isValid, false);
  assert.deepEqual(model.toJSON(), snapshotBefore);

  // 3) Clave reservada en relación ("constructor") y en ID de documento ("toString")
  const relProtoDoc = clonePlainData(SAMPLE_USE_CASE_DOCUMENT);
  relProtoDoc.model.relationships.push({
    id: 'constructor',
    type: 'Association',
    sourceId: 'act-1',
    targetId: 'uc-1',
    name: '',
    properties: {}
  });
  Object.defineProperty(relProtoDoc.view.relationships, 'constructor', {
    value: { waypoints: [] },
    writable: true,
    enumerable: true,
    configurable: true
  });
  assert.equal(validateDocumentSnapshot(relProtoDoc).isValid, false);

  const docIdReserved = clonePlainData(SAMPLE_USE_CASE_DOCUMENT);
  docIdReserved.id = 'toString';
  assert.equal(validateDocumentSnapshot(docIdReserved).isValid, false);

  // 4) Comprobación de que los ejemplos oficiales de ambos diagramas serializan y recargan íntegros
  for (const sample of [SAMPLE_USE_CASE_DOCUMENT, SAMPLE_DEPLOYMENT_DOCUMENT]) {
    const sampleModel = new DiagramModel(sample);
    const roundTrip = JSON.parse(JSON.stringify(sampleModel.toJSON()));
    const validation = validateDocumentSnapshot(roundTrip);
    assert.equal(validation.isValid, true);
    assert.equal(roundTrip.model.elements.length, Object.keys(roundTrip.view.elements).length);
    assert.equal(
      roundTrip.model.relationships.length,
      Object.keys(roundTrip.view.relationships).length
    );
  }
});


