/**
 * Suite de pruebas unitarias y de integración para el Incremento UML-02:
 * Inserción, selección/hit-testing, movimiento (incluidos contenedores con descendientes),
 * redimensionamiento, edición de propiedades, eliminación con integridad referencial,
 * cancelación con `Esc` y conversión de coordenadas con `devicePixelRatio`.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DiagramModel,
  clonePlainData,
  validateDocumentSnapshot
} from '../js/core/DiagramModel.js';
import { Editor } from '../js/core/Editor.js';
import {
  SAMPLE_DEPLOYMENT_DOCUMENT,
  SAMPLE_USE_CASE_DOCUMENT
} from '../js/uml/SampleDiagrams.js';
import {
  clientToCanvasLogicalPoint,
  computeResizedBox,
  getResizeHandles,
  hitTestResizeHandle,
  isPointInActor,
  isPointInEllipse,
  isPointInFoldedNote,
  isPointInRectangle,
  isPointInThreeDimensionalCube
} from '../js/canvas/Geometry.js';
import {
  INTERACTION_STATE,
  InteractionManager
} from '../js/canvas/InteractionManager.js';
import { CanvasRenderer } from '../js/canvas/CanvasRenderer.js';

function createMockInteractiveEnvironment(initialDocument = SAMPLE_USE_CASE_DOCUMENT, dpr = 2) {
  const listeners = new Map();
  const keyListeners = new Map();

  const mockCtx = {
    save() {},
    restore() {},
    setTransform() {},
    fillRect() {},
    strokeRect() {},
    beginPath() {},
    closePath() {},
    moveTo() {},
    lineTo() {},
    arc() {},
    ellipse() {},
    fill() {},
    stroke() {},
    setLineDash() {},
    measureText(text) {
      return { width: String(text).length * 7 };
    },
    fillText() {}
  };

  const mockCanvas = {
    width: 960 * dpr,
    height: 580 * dpr,
    style: { cursor: 'default' },
    getContext(type) {
      return type === '2d' ? mockCtx : null;
    },
    getBoundingClientRect() {
      return { left: 20, top: 40, width: 960, height: 580 };
    },
    addEventListener(type, fn) {
      listeners.set(type, fn);
    },
    removeEventListener(type) {
      listeners.delete(type);
    },
    setPointerCapture() {},
    releasePointerCapture() {}
  };

  const mockKeyboardTarget = {
    addEventListener(type, fn) {
      keyListeners.set(type, fn);
    },
    removeEventListener(type) {
      keyListeners.delete(type);
    }
  };

  const editor = new Editor({ initialDocument });
  const renderer = new CanvasRenderer(mockCanvas, editor);
  const interactionManager = new InteractionManager({
    canvas: mockCanvas,
    editor,
    renderer,
    keyboardTarget: mockKeyboardTarget
  });

  return {
    editor,
    renderer,
    interactionManager,
    mockCanvas,
    mockKeyboardTarget
  };
}

test('UML-02.1 Conversión de coordenadas PointerEvent -> espacio lógico del Canvas (DPR y pantallas estrechas)', () => {
  // Caso 1: Desktop estándar con DPR = 2 y offset de scroll/layout (left: 50, top: 80)
  const ptDesktop = clientToCanvasLogicalPoint(
    { clientX: 250, clientY: 230 },
    {
      rect: { left: 50, top: 80, width: 960, height: 580 },
      canvasWidth: 1920,
      canvasHeight: 1160,
      devicePixelRatio: 2
    }
  );
  assert.deepEqual(ptDesktop, { x: 200, y: 150 });

  // Caso 2: Pantalla estrecha o escalada por CSS donde rect.width (480px) es la mitad del espacio lógico (960px) con DPR = 1.5
  const ptNarrow = clientToCanvasLogicalPoint(
    { clientX: 130, clientY: 165 },
    {
      rect: { left: 10, top: 20, width: 480, height: 290 },
      canvasWidth: 960 * 1.5,
      canvasHeight: 580 * 1.5,
      devicePixelRatio: 1.5
    }
  );
  assert.deepEqual(ptNarrow, { x: 240, y: 290 });
});

test('UML-02.2 Hit-testing geométrico preciso por tipo de figura y respeto de drawOrder', () => {
  // 1. Elipse (UseCase): centro está dentro, esquina del bounding box está fuera
  const ellipseBox = { x: 100, y: 100, width: 200, height: 100 };
  assert.equal(isPointInEllipse({ x: 200, y: 150 }, ellipseBox), true);
  assert.equal(
    isPointInEllipse({ x: 105, y: 105 }, ellipseBox),
    false,
    'La esquina del rectángulo circunscrito queda fuera de la elipse del UseCase'
  );

  // 2. Nota con esquina doblada (Comment): esquina superior derecha exterior al pliegue queda fuera
  const noteBox = { x: 100, y: 100, width: 160, height: 70 };
  assert.equal(isPointInFoldedNote({ x: 150, y: 130 }, noteBox), true);
  assert.equal(
    isPointInFoldedNote({ x: 259, y: 101 }, noteBox),
    false,
    'El triángulo recortado del doblez superior derecho queda fuera de la nota Comment'
  );

  // 3. Cubo 2.5D (Node / Device / ExecutionEnvironment): esquinas exteriores al bisel quedan fuera
  const cubeBox = { x: 200, y: 200, width: 200, height: 140 };
  assert.equal(isPointInThreeDimensionalCube({ x: 280, y: 260 }, cubeBox, 12), true);
  assert.equal(
    isPointInThreeDimensionalCube({ x: 201, y: 201 }, cubeBox, 12),
    false,
    'La esquina superior izquierda exterior al bisel 3D no pertenece al cubo'
  );
  assert.equal(
    isPointInThreeDimensionalCube({ x: 399, y: 339 }, cubeBox, 12),
    false,
    'La esquina inferior derecha exterior al bisel 3D no pertenece al cubo'
  );

  // 4. Actor: variante stickman vs rectangle
  const actorBox = { x: 50, y: 50, width: 70, height: 100 };
  assert.equal(isPointInActor({ x: 85, y: 90 }, actorBox, 'stickman'), true);
  assert.equal(isPointInActor({ x: 52, y: 55 }, actorBox, 'stickman'), false);
  assert.equal(isPointInActor({ x: 52, y: 55 }, actorBox, 'rectangle'), true);

  // 5. Respeto de drawOrder: en SAMPLE_USE_CASE_DOCUMENT, uc-1 (255, 82, 225, 92) está dentro de sb-1 (210, 28, 470, 345)
  const { editor } = createMockInteractiveEnvironment(SAMPLE_USE_CASE_DOCUMENT);
  const hitChild = editor.hitTestElementAt({ x: 360, y: 125 });
  assert.ok(hitChild);
  assert.equal(
    hitChild.element.id,
    'uc-1',
    'Hacer clic sobre un UseCase hijo debe seleccionar al hijo y no al SystemBoundary del fondo'
  );

  const hitBoundaryHeader = editor.hitTestElementAt({ x: 230, y: 40 });
  assert.ok(hitBoundaryHeader);
  assert.equal(
    hitBoundaryHeader.element.id,
    'sb-1',
    'Hacer clic en la zona libre del SystemBoundary debe seleccionar el contenedor'
  );
});

test('UML-02.3 Inserción interactiva y casos negativos de inserción en ambos modos', () => {
  const prevWindow = globalThis.window;
  globalThis.window = { devicePixelRatio: 2 };

  try {
    const { editor, interactionManager } = createMockInteractiveEnvironment(
      SAMPLE_USE_CASE_DOCUMENT,
      2
    );
    editor.createNewEmptyDiagram('use-case');
    assert.equal(editor.getDiagramModel().getCounts().elementsCount, 0);

    // 1. Activar herramienta UseCase e insertar mediante clic en el Canvas (clientX: 320, clientY: 240 -> lógico 300, 200)
    const toolRes = editor.setActiveTool({ mode: 'insert-element', elementType: 'UseCase' });
    assert.equal(toolRes.isValid, true);

    interactionManager.handlePointerDown({ button: 0, clientX: 320, clientY: 240, pointerId: 1 });
    assert.equal(editor.getDiagramModel().getCounts().elementsCount, 1);
    const insertedId = editor.getSelectedEntityId();
    assert.ok(insertedId);
    const insertedEl = editor.getDiagramModel().getElementById(insertedId);
    assert.equal(insertedEl.type, 'UseCase');
    assert.equal(insertedEl.name, 'Caso de Uso 1');
    assert.equal(insertedEl.parentId, null);
    assert.equal(
      editor.getActiveTool().mode,
      'select',
      'Tras insertar un elemento la herramienta vuelve a selección'
    );

    // 2. Caso negativo: intentar activar o insertar un elemento de Despliegue (Device) en modo Casos de Uso
    const snapshotBeforeInvalid = editor.getDiagramModel().toJSON();
    const badToolRes = editor.setActiveTool({ mode: 'insert-element', elementType: 'Device' });
    assert.equal(badToolRes.isValid, false);
    const badInsertRes = editor.insertElementAt('Device', { x: 100, y: 100 });
    assert.equal(badInsertRes.isValid, false);
    assert.deepEqual(editor.getDiagramModel().toJSON(), snapshotBeforeInvalid);

    // 3. Cambiar a modo Despliegue vacío e insertar un Node y un Artifact
    editor.createNewEmptyDiagram('deployment');
    const nodeInsert = editor.insertElementAt('Node', { x: 220, y: 180 });
    assert.equal(nodeInsert.isValid, true);
    const artifactInsert = editor.insertElementAt('Artifact', {
      x: 220,
      y: 180,
      parentId: nodeInsert.elementId
    });
    assert.equal(artifactInsert.isValid, true);
    assert.equal(editor.getDiagramModel().getCounts().elementsCount, 2);
  } finally {
    if (prevWindow === undefined) {
      delete globalThis.window;
    } else {
      globalThis.window = prevWindow;
    }
  }
});

test('UML-02.4 Movimiento por arrastre, arrastre de contenedor con descendientes multinivel y no reasignación silenciosa de parentId', () => {
  const prevWindow = globalThis.window;
  globalThis.window = { devicePixelRatio: 1 };

  try {
    // En SAMPLE_DEPLOYMENT_DOCUMENT, dev-2 contiene a env-1, y env-1 contiene a art-1 y spec-1
    const { editor, interactionManager } = createMockInteractiveEnvironment(
      SAMPLE_DEPLOYMENT_DOCUMENT,
      1
    );
    const model = editor.getDiagramModel();

    const dev2Before = model.getElementView('dev-2');
    const env1Before = model.getElementView('env-1');
    const art1Before = model.getElementView('art-1');
    const spec1Before = model.getElementView('spec-1');
    const dev1Before = model.getElementView('dev-1'); // Elemento independiente no hijo de dev-2

    // Iniciar arrastre en el encabezado de dev-2 (lógico x=300, y=50 -> clientX=320, clientY=90)
    interactionManager.handlePointerDown({ button: 0, clientX: 320, clientY: 90, pointerId: 1 });
    assert.equal(interactionManager.getState(), INTERACTION_STATE.DRAGGING);
    assert.equal(editor.getSelectedEntityId(), 'dev-2');

    // Mover +45 en X y +30 en Y (clientX=365, clientY=120)
    interactionManager.handlePointerMove({ clientX: 365, clientY: 120, pointerId: 1 });

    // Durante el arrastre provisional, el modelo base aún no ha mutado, pero la vista efectiva sí
    assert.deepEqual(model.getElementView('dev-2'), dev2Before);
    assert.equal(editor.getEffectiveElementView('dev-2').x, dev2Before.x + 45);
    assert.equal(editor.getEffectiveElementView('art-1').x, art1Before.x + 45);

    // Soltar puntero para confirmar atómicamente
    interactionManager.handlePointerUp({ clientX: 365, clientY: 120, pointerId: 1 });
    assert.equal(interactionManager.getState(), INTERACTION_STATE.IDLE);

    // Verificar que el contenedor y toda su descendencia multinivel se desplazaron por (45, 30)
    assert.equal(model.getElementView('dev-2').x, dev2Before.x + 45);
    assert.equal(model.getElementView('dev-2').y, dev2Before.y + 30);
    assert.equal(model.getElementView('env-1').x, env1Before.x + 45);
    assert.equal(model.getElementView('env-1').y, env1Before.y + 30);
    assert.equal(model.getElementView('art-1').x, art1Before.x + 45);
    assert.equal(model.getElementView('art-1').y, art1Before.y + 30);
    assert.equal(model.getElementView('spec-1').x, spec1Before.x + 45);
    assert.equal(model.getElementView('spec-1').y, spec1Before.y + 30);

    // Verificar que dev-1 (no descendiente) permaneció inmóvil
    assert.deepEqual(model.getElementView('dev-1'), dev1Before);

    // Verificar que superponer visualmente art-2 sobre dev-2 mediante moveElement NUNCA altera su parentId
    assert.equal(model.getElementById('art-2').parentId, null);
    const moveOverRes = editor.commitMoveElement('art-2', { dx: -300, dy: -200 });
    assert.equal(moveOverRes.isValid, true);
    assert.equal(
      model.getElementById('art-2').parentId,
      null,
      'Superponer coordenadas visuales nunca debe reasignar silenciosamente parentId'
    );
  } finally {
    if (prevWindow === undefined) {
      delete globalThis.window;
    } else {
      globalThis.window = prevWindow;
    }
  }
});

test('UML-02.5 Redimensionamiento: controladores visuales, respeto de dimensiones mínimas y rechazo en tipos no redimensionables', () => {
  const prevWindow = globalThis.window;
  globalThis.window = { devicePixelRatio: 1 };

  try {
    const { editor, interactionManager } = createMockInteractiveEnvironment(
      SAMPLE_USE_CASE_DOCUMENT,
      1
    );
    const model = editor.getDiagramModel();

    // 1. Seleccionar UseCase 'uc-1' (redimensionable, minSize: 110x52)
    editor.setSelectedEntity('uc-1');
    const initialBox = model.getElementView('uc-1');
    const handles = getResizeHandles(initialBox);
    const seHandle = handles.find((h) => h.dir === 'se');
    assert.ok(seHandle);
    assert.equal(hitTestResizeHandle({ x: seHandle.x, y: seHandle.y }, initialBox), 'se');

    // Iniciar redimensionamiento desde el manejador SE (sumar offset left:20, top:40)
    interactionManager.handlePointerDown({
      button: 0,
      clientX: seHandle.x + 20,
      clientY: seHandle.y + 40,
      pointerId: 1
    });
    assert.equal(interactionManager.getState(), INTERACTION_STATE.RESIZING);

    // Intentar encoger exageradamente (-500, -500): computeResizedBox debe limitar a minSize (110x52)
    interactionManager.handlePointerMove({
      clientX: seHandle.x + 20 - 500,
      clientY: seHandle.y + 40 - 500,
      pointerId: 1
    });
    interactionManager.handlePointerUp({
      clientX: seHandle.x + 20 - 500,
      clientY: seHandle.y + 40 - 500,
      pointerId: 1
    });

    const clampedBox = model.getElementView('uc-1');
    assert.equal(clampedBox.width, 110, 'El ancho debe respetar minSize.width (110px)');
    assert.equal(clampedBox.height, 52, 'El alto debe respetar minSize.height (52px)');

    // 2. Caso negativo directo en DiagramModel: intentar forzar una caja menor que minSize o redimensionar un Actor
    const snapshotAfterClamp = model.toJSON();
    const tooSmallRes = model.resizeElement('uc-1', { x: 255, y: 82, width: 40, height: 20 });
    assert.equal(tooSmallRes.isValid, false);
    assert.deepEqual(model.toJSON(), snapshotAfterClamp);

    // Actor no es redimensionable manualmente
    editor.setSelectedEntity('act-1');
    const actBox = model.getElementView('act-1');
    assert.equal(
      editor.hitTestSelectedResizeHandle({ x: actBox.x, y: actBox.y }),
      null,
      'Actor no debe exponer manejadores de redimensionamiento'
    );
    const actorResizeRes = model.resizeElement('act-1', {
      x: actBox.x,
      y: actBox.y,
      width: 140,
      height: 180
    });
    assert.equal(actorResizeRes.isValid, false);
    assert.deepEqual(model.toJSON(), snapshotAfterClamp);
  } finally {
    if (prevWindow === undefined) {
      delete globalThis.window;
    } else {
      globalThis.window = prevWindow;
    }
  }
});

test('UML-02.6 Cancelación con Esc durante arrastre, redimensionamiento y herramienta de inserción sin mutar DiagramModel', () => {
  const prevWindow = globalThis.window;
  globalThis.window = { devicePixelRatio: 1 };

  try {
    const { editor, interactionManager } = createMockInteractiveEnvironment(
      SAMPLE_USE_CASE_DOCUMENT,
      1
    );
    const model = editor.getDiagramModel();
    const initialSnapshot = model.toJSON();

    // 1. Iniciar un arrastre sobre uc-1 (x=255..480, y=82..174), desplazarlo y cancelar con Escape
    interactionManager.handlePointerDown({ button: 0, clientX: 350, clientY: 160, pointerId: 1 });
    interactionManager.handlePointerMove({ clientX: 480, clientY: 260, pointerId: 1 });
    assert.equal(interactionManager.getState(), INTERACTION_STATE.DRAGGING);
    assert.equal(editor.hasProvisionalPreview(), true);

    interactionManager.handleKeyDown({ key: 'Escape', preventDefault() {} });
    assert.equal(interactionManager.getState(), INTERACTION_STATE.IDLE);
    assert.equal(editor.hasProvisionalPreview(), false);
    assert.deepEqual(
      model.toJSON(),
      initialSnapshot,
      'Cancelar un arrastre con Esc no debe modificar el documento'
    );

    // 2. Iniciar un redimensionamiento sobre uc-1 y cancelar con Escape
    const uc1Box = model.getElementView('uc-1');
    const se = getResizeHandles(uc1Box).find((h) => h.dir === 'se');
    interactionManager.handlePointerDown({
      button: 0,
      clientX: se.x + 20,
      clientY: se.y + 40,
      pointerId: 1
    });
    interactionManager.handlePointerMove({
      clientX: se.x + 120,
      clientY: se.y + 100,
      pointerId: 1
    });
    assert.equal(interactionManager.getState(), INTERACTION_STATE.RESIZING);

    interactionManager.handleKeyDown({ key: 'Escape', preventDefault() {} });
    assert.equal(interactionManager.getState(), INTERACTION_STATE.IDLE);
    assert.equal(editor.hasProvisionalPreview(), false);
    assert.deepEqual(
      model.toJSON(),
      initialSnapshot,
      'Cancelar un redimensionamiento con Esc no debe modificar el documento'
    );

    // 3. Activar herramienta de inserción y cancelar con Escape
    editor.setActiveTool({ mode: 'insert-element', elementType: 'Actor' });
    assert.equal(editor.getActiveTool().mode, 'insert-element');
    interactionManager.handleKeyDown({ key: 'Escape', preventDefault() {} });
    assert.equal(editor.getActiveTool().mode, 'select');
    assert.deepEqual(model.toJSON(), initialSnapshot);
  } finally {
    if (prevWindow === undefined) {
      delete globalThis.window;
    } else {
      globalThis.window = prevWindow;
    }
  }
});

test('UML-02.7 Edición de propiedades de elementos: casos válidos y rechazo atómico de casos inválidos', () => {
  const editor = new Editor({ initialDocument: SAMPLE_USE_CASE_DOCUMENT });
  const model = editor.getDiagramModel();

  // 1. Edición válida: renombrar Actor y cambiar su variante a rectangle e isAbstract: true
  const validUpdate = editor.updateElementProperties('act-1', {
    name: 'Usuario Autenticado',
    properties: {
      isAbstract: true,
      notationVariant: 'rectangle'
    }
  });
  assert.equal(validUpdate.isValid, true);
  assert.equal(model.getElementById('act-1').name, 'Usuario Autenticado');
  assert.equal(model.getElementById('act-1').properties.notationVariant, 'rectangle');

  // 2. Edición válida de contención semántica explícita: mover uc-5 de sb-2 a sb-1
  const validReparent = editor.updateElementProperties('uc-5', {
    parentId: 'sb-1'
  });
  assert.equal(validReparent.isValid, true);
  assert.equal(model.getElementById('uc-5').parentId, 'sb-1');

  const snapshotAfterValid = model.toJSON();

  // 3. Caso negativo: intentar dejar vacío el nombre de un Actor o de un UseCase (must_have_name)
  const emptyActorName = editor.updateElementProperties('act-1', { name: '   ' });
  assert.equal(emptyActorName.isValid, false);
  assert.deepEqual(model.toJSON(), snapshotAfterValid);

  const emptyUseCaseName = editor.updateElementProperties('uc-1', { name: '' });
  assert.equal(emptyUseCaseName.isValid, false);
  assert.deepEqual(model.toJSON(), snapshotAfterValid);

  // 4. Caso negativo: eliminar el ExtensionPoint 'ep-1' de 'uc-1' mientras la relación Extend 'rel-uc-5' depende de él (DP-03)
  const removeReferencedEp = editor.updateElementProperties('uc-1', {
    properties: {
      extensionPoints: []
    }
  });
  assert.equal(
    removeReferencedEp.isValid,
    false,
    'No debe permitirse eliminar un ExtensionPoint referenciado activamente por una relación Extend'
  );
  assert.deepEqual(model.toJSON(), snapshotAfterValid);

  // 5. Caso negativo: intentar asignar un contenedor inválido (Actor dentro de SystemBoundary)
  const invalidParent = editor.updateElementProperties('act-1', {
    parentId: 'sb-1'
  });
  assert.equal(invalidParent.isValid, false);
  assert.deepEqual(model.toJSON(), snapshotAfterValid);
});

test('UML-02.8 Eliminación con integridad referencial: limpieza de relaciones, CommentLinks encadenados y políticas detach vs cascade', () => {
  // Parte A: Eliminar un UseCase ('uc-3') cuya relación Extend ('rel-uc-5') está anotada por el CommentLink ('rel-uc-8')
  const editorUC = new Editor({ initialDocument: SAMPLE_USE_CASE_DOCUMENT });
  const modelUC = editorUC.getDiagramModel();

  const delUc3 = editorUC.deleteEntity('uc-3');
  assert.equal(delUc3.isValid, true);
  assert.equal(modelUC.getElementById('uc-3'), null);
  assert.equal(
    modelUC.getRelationshipById('rel-uc-5'),
    null,
    'La relación Extend incidente a uc-3 debe eliminarse'
  );
  assert.equal(
    modelUC.getRelationshipById('rel-uc-8'),
    null,
    'El CommentLink que apuntaba a la relación eliminada rel-uc-5 también debe limpiarse en cascada'
  );
  assert.equal(validateDocumentSnapshot(modelUC.toJSON()).isValid, true);

  // Parte B: Política 'detach' (por defecto) al eliminar un contenedor ('sb-1')
  const delSb1Detach = editorUC.deleteEntity('sb-1', { descendantPolicy: 'detach' });
  assert.equal(delSb1Detach.isValid, true);
  assert.equal(modelUC.getElementById('sb-1'), null);
  assert.ok(modelUC.getElementById('uc-1'), 'Con política detach, los hijos de sb-1 se conservan');
  assert.equal(
    modelUC.getElementById('uc-1').parentId,
    null,
    'Con política detach, parentId de los hijos pasa a null (raíz)'
  );
  assert.equal(validateDocumentSnapshot(modelUC.toJSON()).isValid, true);

  // Parte C: Política 'cascade' al eliminar el nodo raíz 'dev-2' en el diagrama de Despliegue
  const editorDep = new Editor({ initialDocument: SAMPLE_DEPLOYMENT_DOCUMENT });
  const modelDep = editorDep.getDiagramModel();

  const delDev2Cascade = editorDep.deleteEntity('dev-2', { descendantPolicy: 'cascade' });
  assert.equal(delDev2Cascade.isValid, true);
  // dev-2, su hijo env-1 y sus nietos art-1 y spec-1 deben haberse eliminado
  assert.equal(modelDep.getElementById('dev-2'), null);
  assert.equal(modelDep.getElementById('env-1'), null);
  assert.equal(modelDep.getElementById('art-1'), null);
  assert.equal(modelDep.getElementById('spec-1'), null);
  // Además, rel-dep-1 (dev-1 -> dev-2) y el CommentLink rel-dep-6 que apuntaba a rel-dep-1 deben haberse limpiado
  assert.equal(modelDep.getRelationshipById('rel-dep-1'), null);
  assert.equal(modelDep.getRelationshipById('rel-dep-6'), null);
  assert.equal(validateDocumentSnapshot(modelDep.toJSON()).isValid, true);
});

test('UML-02.9 Recálculo dinámico de rutas de relaciones y CommentLink tras mover o redimensionar un elemento', () => {
  const prevWindow = globalThis.window;
  globalThis.window = { devicePixelRatio: 2 };

  try {
    const { editor, renderer } = createMockInteractiveEnvironment(
      SAMPLE_USE_CASE_DOCUMENT,
      2
    );

    renderer.renderNow();
    const initialRouteRel1 = clonePlainData(renderer._lastComputedRoutes.get('rel-uc-1'));
    const initialRouteCommentLink = clonePlainData(
      renderer._lastComputedRoutes.get('rel-uc-8')
    );
    assert.ok(initialRouteRel1);
    assert.ok(initialRouteCommentLink);

    // Mover 'uc-1' (conectado a 'rel-uc-1' y 'rel-uc-5', la cual a su vez recibe el CommentLink 'rel-uc-8')
    editor.commitMoveElement('uc-1', { dx: 60, dy: 40 });
    renderer.renderNow();

    const movedRouteRel1 = renderer._lastComputedRoutes.get('rel-uc-1');
    const movedRouteCommentLink = renderer._lastComputedRoutes.get('rel-uc-8');

    assert.notDeepEqual(
      movedRouteRel1[1],
      initialRouteRel1[1],
      'El punto de anclaje de la relación conectada a uc-1 debe recalcularse tras mover uc-1'
    );
    assert.notDeepEqual(
      movedRouteCommentLink[1],
      initialRouteCommentLink[1],
      'El punto de destino del CommentLink sobre la relación Extend también debe recalcularse al mover uc-1'
    );
  } finally {
    if (prevWindow === undefined) {
      delete globalThis.window;
    } else {
      globalThis.window = prevWindow;
    }
  }
});

