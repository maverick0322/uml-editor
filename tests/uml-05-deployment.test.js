/**
 * Pruebas unitarias y de integración — Incremento UML-05:
 * Editor de Diagramas de Despliegue (OMG UML 2.5.1 Cláusulas 9 y 19).
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { Editor } from '../js/core/Editor.js';
import { CanvasRenderer } from '../js/canvas/CanvasRenderer.js';
import { DeploymentCatalog } from '../js/uml/deployment/DeploymentCatalog.js';
import {
  evaluateDeploymentWarnings,
  validateDeploymentModel
} from '../js/uml/deployment/DeploymentValidator.js';

function createEmptyDeploymentEditor(name = 'Test Despliegue') {
  const editor = new Editor();
  editor.createNewEmptyDiagram('deployment', name);
  return editor;
}

function createMockCanvasContext() {
  const calls = [];
  const noop = () => {};
  return {
    calls,
    save: noop,
    restore: noop,
    beginPath: noop,
    closePath: noop,
    moveTo: noop,
    lineTo: noop,
    stroke: noop,
    fill: noop,
    fillRect: noop,
    strokeRect: noop,
    ellipse: noop,
    setLineDash: noop,
    measureText(text) {
      return { width: String(text).length * 7 };
    },
    fillText(text, x, y) {
      calls.push({ op: 'fillText', text: String(text), x, y });
    },
    strokeStyle: '#000',
    fillStyle: '#000',
    lineWidth: 1,
    font: '12px sans-serif',
    textAlign: 'left',
    textBaseline: 'top'
  };
}

test('UML-05.1 PA-DEP-01 y PA-CMN-01: Node/Device/ExecutionEnvironment, CommunicationPath y Comment/CommentLink', () => {
  const editor = createEmptyDeploymentEditor();
  const model = editor.getDiagramModel();

  const browserRes = editor.insertElementAt('Device', {
    x: 40,
    y: 80,
    name: 'Cliente Navegador',
    properties: { isInstance: false, classifierName: 'WebBrowser' }
  });
  assert.equal(browserRes.isValid, true);

  const appRes = editor.insertElementAt('Node', {
    x: 340,
    y: 80,
    name: 'Servidor Aplicaciones'
  });
  assert.equal(appRes.isValid, true);

  const commRes = editor.createRelationship({
    type: 'CommunicationPath',
    sourceId: browserRes.elementId,
    targetId: appRes.elementId,
    name: 'HTTPS',
    properties: {
      protocol: 'HTTPS/TLS',
      sourceMultiplicity: '1..*',
      targetMultiplicity: '1'
    }
  });
  assert.equal(commRes.isValid, true);
  assert.equal(
    model.getRelationshipById(commRes.relationshipId).properties.protocol,
    'HTTPS/TLS'
  );

  // PA-CMN-01 + CMN-REL-01: Comment hacia elemento y hacia relación
  const noteRes = editor.insertElementAt('Comment', {
    x: 200,
    y: 260,
    name: 'Canal cifrado TLS 1.3',
    properties: { body: 'Canal cifrado TLS 1.3' }
  });
  assert.equal(noteRes.isValid, true);

  const linkToNode = editor.createRelationship({
    type: 'CommentLink',
    sourceId: noteRes.elementId,
    targetId: appRes.elementId
  });
  assert.equal(linkToNode.isValid, true);

  const linkToRel = editor.createRelationship({
    type: 'CommentLink',
    sourceId: noteRes.elementId,
    targetId: commRes.relationshipId,
    properties: { targetKind: 'relationship' }
  });
  assert.equal(linkToRel.isValid, true);

  // must_have_name en Node (rechazo atómico)
  const emptyNameRes = editor.updateElementProperties(appRes.elementId, { name: '   ' });
  assert.equal(emptyNameRes.isValid, false);
  assert.match(emptyNameRes.errors.join(' '), /nombre no vacío|must_have_name/i);
  assert.equal(model.getElementById(appRes.elementId).name, 'Servidor Aplicaciones');

  // Comment en raíz únicamente
  const nestedNoteRes = model.addElement({
    type: 'Comment',
    name: 'Nota anidada',
    parentId: appRes.elementId
  });
  assert.equal(nestedNoteRes.isValid, false);
  assert.match(nestedNoteRes.errors.join(' '), /contención|parentId|Comment/i);

  // Renderizado 3D sin errores
  const ctx = createMockCanvasContext();
  DeploymentCatalog.elements.Device.render(
    ctx,
    model.getElementById(browserRes.elementId),
    model.getElementView(browserRes.elementId)
  );
  DeploymentCatalog.elements.Node.render(
    ctx,
    model.getElementById(appRes.elementId),
    model.getElementView(appRes.elementId)
  );
  assert.ok(ctx.calls.some((c) => c.op === 'fillText' && c.text.includes('«device»')));
});

test('UML-05.2 PA-DEP-02: Artifact con manifestedElements, DeploymentSpecification y validaciones', () => {
  const editor = createEmptyDeploymentEditor();
  const model = editor.getDiagramModel();

  const warRes = editor.insertElementAt('Artifact', {
    x: 60,
    y: 60,
    name: 'ecommerce-app.war',
    properties: {
      fileName: 'ecommerce-app.war',
      isInstance: false,
      classifierName: '',
      manifestedElements: [
        { kind: 'Component', name: 'OrderService' },
        { kind: 'Package', name: 'com.shop.web' }
      ]
    }
  });
  assert.equal(warRes.isValid, true);

  const specRes = editor.insertElementAt('DeploymentSpecification', {
    x: 320,
    y: 60,
    name: 'prod-config.yaml',
    properties: {
      deploymentLocation: '/etc/ecommerce/prod.yaml',
      executionLocation: 'container-jvm'
    }
  });
  assert.equal(specRes.isValid, true);

  // Renderizado de Artifact muestra compartimento «manifest»
  const ctx = createMockCanvasContext();
  DeploymentCatalog.elements.Artifact.render(
    ctx,
    model.getElementById(warRes.elementId),
    model.getElementView(warRes.elementId)
  );
  DeploymentCatalog.elements.DeploymentSpecification.render(
    ctx,
    model.getElementById(specRes.elementId),
    model.getElementView(specRes.elementId)
  );
  assert.ok(
    ctx.calls.some((c) => c.op === 'fillText' && c.text.includes('«manifest» Component: OrderService'))
  );
  assert.ok(
    ctx.calls.some((c) => c.op === 'fillText' && c.text.includes('/etc/ecommerce/prod.yaml'))
  );

  // Rechazo atómico de manifestedElements inválidos
  const badKindRes = editor.updateElementProperties(warRes.elementId, {
    properties: {
      manifestedElements: [{ kind: 'UseCase', name: 'Invalid' }]
    }
  });
  assert.equal(badKindRes.isValid, false);
  assert.match(badKindRes.errors.join(' '), /Tipo manifestado inválido/i);

  const emptyManifestNameRes = editor.updateElementProperties(warRes.elementId, {
    properties: {
      manifestedElements: [{ kind: 'Component', name: '   ' }]
    }
  });
  assert.equal(emptyManifestNameRes.isValid, false);
  assert.match(emptyManifestNameRes.errors.join(' '), /nombre no vacío/i);
  assert.equal(
    model.getElementById(warRes.elementId).properties.manifestedElements.length,
    2
  );
});

test('UML-05.3 PA-DEP-03: Contención semántica multinivel (Matriz 7.4), ciclos y políticas detach/cascade', () => {
  const editor = createEmptyDeploymentEditor();
  const model = editor.getDiagramModel();

  const device = model.addElement({ type: 'Device', name: 'srv-app-01' });
  assert.equal(device.isValid, true);

  const env = model.addElement({
    type: 'ExecutionEnvironment',
    name: 'Docker Engine',
    parentId: device.elementId
  });
  assert.equal(env.isValid, true);

  const artifact = model.addElement({
    type: 'Artifact',
    name: 'orders.jar',
    parentId: env.elementId
  });
  assert.equal(artifact.isValid, true);

  const spec = model.addElement({
    type: 'DeploymentSpecification',
    name: 'orders-env.yaml',
    parentId: artifact.elementId
  });
  assert.equal(spec.isValid, true);

  assert.deepEqual(
    model.getDescendantIds(device.elementId).sort(),
    [artifact.elementId, env.elementId, spec.elementId].sort()
  );

  // Prohibido Node o Device dentro de ExecutionEnvironment o Artifact
  const nodeInEnv = model.addElement({
    type: 'Node',
    name: 'NestedNode',
    parentId: env.elementId
  });
  assert.equal(nodeInEnv.isValid, false);
  assert.match(nodeInEnv.errors.join(' '), /contención|parentId/i);

  const devInArt = model.addElement({
    type: 'Device',
    name: 'NestedDev',
    parentId: artifact.elementId
  });
  assert.equal(devInArt.isValid, false);
  assert.match(devInArt.errors.join(' '), /contención|parentId/i);

  // Prohibido ExecutionEnvironment dentro de Artifact
  const envInArt = model.addElement({
    type: 'ExecutionEnvironment',
    name: 'NestedEnv',
    parentId: artifact.elementId
  });
  assert.equal(envInArt.isValid, false);
  assert.match(envInArt.errors.join(' '), /contención|parentId/i);

  // Prohibido ciclo en parentId
  const device2 = model.addElement({
    type: 'Device',
    name: 'srv-app-02',
    parentId: device.elementId
  });
  assert.equal(device2.isValid, true);
  const cycleRes = model.updateElement(device.elementId, { parentId: device2.elementId });
  assert.equal(cycleRes.isValid, false);
  assert.match(cycleRes.errors.join(' '), /ciclo|contención/i);

  // Política detach: elimina env pero conserva artifact y spec en jerarquía superior
  const detachRes = model.removeElement(env.elementId, { descendantPolicy: 'detach' });
  assert.equal(detachRes.isValid, true);
  assert.equal(model.getElementById(env.elementId), null);
  assert.equal(model.getElementById(artifact.elementId).parentId, null);
  assert.equal(model.getElementById(spec.elementId).parentId, artifact.elementId);

  // Política cascade: elimina artifact y su descendiente spec
  const cascadeRes = model.removeElement(artifact.elementId, { descendantPolicy: 'cascade' });
  assert.equal(cascadeRes.isValid, true);
  assert.equal(model.getElementById(artifact.elementId), null);
  assert.equal(model.getElementById(spec.elementId), null);
});

test('UML-05.4 DP-04: Notación de instancia subrayada y restricción en Generalization', () => {
  const editor = createEmptyDeploymentEditor();
  const model = editor.getDiagramModel();

  const srv1 = editor.insertElementAt('Device', {
    x: 40,
    y: 40,
    name: 'srv-web-01',
    properties: { isInstance: true, classifierName: 'WebServer' }
  });
  const srvType = editor.insertElementAt('Device', {
    x: 320,
    y: 40,
    name: 'GenericServer',
    properties: { isInstance: false, classifierName: '' }
  });
  assert.equal(srv1.isValid, true);
  assert.equal(srvType.isValid, true);

  // Renderizado muestra "srv-web-01 : WebServer"
  const ctx = createMockCanvasContext();
  DeploymentCatalog.elements.Device.render(
    ctx,
    model.getElementById(srv1.elementId),
    model.getElementView(srv1.elementId)
  );
  assert.ok(ctx.calls.some((c) => c.op === 'fillText' && c.text === 'srv-web-01 : WebServer'));

  // Prohibido Generalization si alguno tiene isInstance: true
  const invalidGen = editor.createRelationship({
    type: 'Generalization',
    sourceId: srv1.elementId,
    targetId: srvType.elementId
  });
  assert.equal(invalidGen.isValid, false);
  assert.match(invalidGen.errors.join(' '), /instancia|isInstance|Generalization/i);

  // Válido si ambos son clasificadores (isInstance: false)
  const devBase = editor.insertElementAt('Node', {
    x: 600,
    y: 40,
    name: 'BaseNode',
    properties: { isInstance: false }
  });
  const validGen = editor.createRelationship({
    type: 'Generalization',
    sourceId: srvType.elementId,
    targetId: devBase.elementId
  });
  assert.equal(validGen.isValid, true);
});

test('UML-05.5 ESC-DEP-V01..V04 y ESC-DEP-I01..I03: Relaciones válidas/inválidas y ciclos dirigidos', () => {
  const editor = createEmptyDeploymentEditor();
  const model = editor.getDiagramModel();

  const nodeAId = model.addElement({ type: 'Node', name: 'NodeA' }).elementId;
  const nodeBId = model.addElement({ type: 'Node', name: 'NodeB' }).elementId;
  const art1Id = model.addElement({ type: 'Artifact', name: 'app.jar' }).elementId;
  const art2Id = model.addElement({ type: 'Artifact', name: 'core.jar' }).elementId;
  const spec1Id = model.addElement({ type: 'DeploymentSpecification', name: 'spec.yaml' }).elementId;

  // Válidos: CommunicationPath, Deployment, Manifestation, Dependency, Generalization
  assert.equal(
    model.addRelationship({ type: 'CommunicationPath', sourceId: nodeAId, targetId: nodeBId }).isValid,
    true
  );
  assert.equal(
    model.addRelationship({ type: 'Deployment', sourceId: art1Id, targetId: nodeAId }).isValid,
    true
  );
  assert.equal(
    model.addRelationship({ type: 'Manifestation', sourceId: art1Id, targetId: art2Id }).isValid,
    true
  );
  assert.equal(
    model.addRelationship({ type: 'Dependency', sourceId: spec1Id, targetId: art1Id }).isValid,
    true
  );
  assert.equal(
    model.addRelationship({ type: 'Generalization', sourceId: nodeAId, targetId: nodeBId }).isValid,
    true
  );

  // ESC-DEP-I01: CommunicationPath hacia Artifact prohibido
  const badComm = model.addRelationship({
    type: 'CommunicationPath',
    sourceId: nodeAId,
    targetId: art1Id
  });
  assert.equal(badComm.isValid, false);
  assert.match(badComm.errors.join(' '), /inválidos|CommunicationPath/i);

  // ESC-DEP-I02: Deployment invertido (Node -> Artifact) prohibido
  const badDeploy = model.addRelationship({
    type: 'Deployment',
    sourceId: nodeAId,
    targetId: art1Id
  });
  assert.equal(badDeploy.isValid, false);
  assert.match(badDeploy.errors.join(' '), /inválidos|Deployment/i);

  // ESC-DEP-I03: Generalization cruzada Node -> Artifact prohibida
  const badGen = model.addRelationship({
    type: 'Generalization',
    sourceId: nodeAId,
    targetId: art1Id
  });
  assert.equal(badGen.isValid, false);
  assert.match(badGen.errors.join(' '), /inválidos|Generalization/i);

  // Ciclo dirigido en Generalization (§9.9.4.8) rechazado atómicamente
  const cycleGen = model.addRelationship({
    type: 'Generalization',
    sourceId: nodeBId,
    targetId: nodeAId
  });
  assert.equal(cycleGen.isValid, false);
  assert.match(cycleGen.errors.join(' '), /Ciclo dirigido prohibido en Generalization.*§9\.9\.4\.8/i);

  // Ciclo dirigido en Manifestation (DEP-REL-03) rechazado atómicamente
  const cycleMan = model.addRelationship({
    type: 'Manifestation',
    sourceId: art2Id,
    targetId: art1Id
  });
  assert.equal(cycleMan.isValid, false);
  assert.match(cycleMan.errors.join(' '), /Ciclo dirigido prohibido en Manifestation/i);

  assert.equal(validateDeploymentModel(model.toJSON().model).length, 0);
});

test('UML-05.6 Advertencias no bloqueantes (§8.2) y actualización dinámica de rutas al mover/redimensionar', () => {
  const editor = createEmptyDeploymentEditor();
  const model = editor.getDiagramModel();

  const isolatedInst = editor.insertElementAt('Node', {
    x: 40,
    y: 40,
    name: 'instancia-sin-tipo',
    properties: { isInstance: true, classifierName: '' }
  }).elementId;
  const targetNode = editor.insertElementAt('Device', {
    x: 350,
    y: 40,
    name: 'DBHost'
  }).elementId;

  // No hay errores bloqueantes, pero sí advertencias esperadas
  assert.equal(validateDeploymentModel(model.toJSON().model).length, 0);
  const warnings = evaluateDeploymentWarnings(model.toJSON().model);
  assert.ok(
    warnings.some((w) => w.code === 'DEP-WARN-INSTANCE-NO-CLASSIFIER' && w.targetId === isolatedInst)
  );
  assert.ok(
    warnings.some((w) => w.code === 'DEP-WARN-ISOLATED-ELEMENT' && w.targetId === isolatedInst)
  );
  assert.ok(
    warnings.some((w) => w.code === 'DEP-WARN-ISOLATED-ELEMENT' && w.targetId === targetNode)
  );

  // Conectar y comprobar que la ruta cambia dinámicamente al mover
  const comm = editor.createRelationship({
    type: 'CommunicationPath',
    sourceId: isolatedInst,
    targetId: targetNode
  });
  assert.equal(comm.isValid, true);
  const ctx = createMockCanvasContext();
  const headlessCanvas = {
    width: 1200,
    height: 800,
    style: { cursor: 'default' },
    getContext: (kind) => (kind === '2d' ? ctx : null),
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 1200, height: 800 })
  };
  ctx.setTransform = () => {};
  ctx.arc = () => {};
  const renderer = new CanvasRenderer(headlessCanvas, editor);
  renderer.renderNow();
  const initialRoute = renderer._lastComputedRoutes.get(comm.relationshipId);
  assert.ok(initialRoute && initialRoute.length >= 2);

  editor.commitMoveElement(targetNode, { dx: 150, dy: 120 });
  renderer.renderNow();
  const updatedRoute = renderer._lastComputedRoutes.get(comm.relationshipId);
  assert.notDeepEqual(updatedRoute, initialRoute);
});

test('UML-05.7 Reconstrucción completa de «Arquitectura Web de Comercio Electrónico» (§9.3)', () => {
  const editor = createEmptyDeploymentEditor('Arquitectura Web de Comercio Electrónico');
  const model = editor.getDiagramModel();

  const clienteId = model.addElement({
    type: 'Device',
    name: 'Cliente Navegador',
    properties: { isInstance: true, classifierName: 'BrowserDevice' },
    view: { x: 30, y: 120, width: 210, height: 130 }
  }).elementId;
  const srvWebId = model.addElement({
    type: 'Device',
    name: 'srv-web-01',
    properties: { isInstance: true, classifierName: 'ApplicationServer' },
    view: { x: 300, y: 60, width: 280, height: 260 }
  }).elementId;
  const jvmId = model.addElement({
    type: 'ExecutionEnvironment',
    name: 'JVM 21 / Tomcat',
    parentId: srvWebId,
    view: { x: 320, y: 115, width: 240, height: 185 }
  }).elementId;
  const warId = model.addElement({
    type: 'Artifact',
    name: 'ecommerce-web.war',
    parentId: jvmId,
    properties: {
      fileName: 'ecommerce-web.war',
      manifestedElements: [
        { kind: 'Component', name: 'CatalogService' },
        { kind: 'Component', name: 'CheckoutController' }
      ]
    },
    view: { x: 340, y: 165, width: 200, height: 85 }
  }).elementId;
  const specId = model.addElement({
    type: 'DeploymentSpecification',
    name: 'tomcat-prod.xml',
    parentId: warId,
    properties: {
      deploymentLocation: '/opt/tomcat/conf/prod.xml',
      executionLocation: 'jvm-21'
    },
    view: { x: 350, y: 260, width: 180, height: 52 }
  }).elementId;
  const srvDbId = model.addElement({
    type: 'Device',
    name: 'srv-db-01',
    properties: { isInstance: true, classifierName: 'DatabaseServer' },
    view: { x: 650, y: 90, width: 240, height: 200 }
  }).elementId;
  const pgId = model.addElement({
    type: 'ExecutionEnvironment',
    name: 'PostgreSQL 16',
    parentId: srvDbId,
    view: { x: 670, y: 145, width: 200, height: 125 }
  }).elementId;
  const schemaArtId = model.addElement({
    type: 'Artifact',
    name: 'ecommerce-schema.sql',
    parentId: pgId,
    properties: {
      fileName: 'ecommerce-schema.sql',
      manifestedElements: [{ kind: 'Package', name: 'db.schema' }]
    },
    view: { x: 685, y: 195, width: 170, height: 64 }
  }).elementId;

  assert.equal(
    model.addRelationship({
      type: 'CommunicationPath',
      sourceId: clienteId,
      targetId: srvWebId,
      name: 'HTTPS',
      properties: { protocol: 'HTTPS', sourceMultiplicity: '1..*', targetMultiplicity: '1' }
    }).isValid,
    true
  );
  assert.equal(
    model.addRelationship({
      type: 'CommunicationPath',
      sourceId: srvWebId,
      targetId: srvDbId,
      name: 'TCP/JDBC',
      properties: { protocol: 'TCP/IP', sourceMultiplicity: '1', targetMultiplicity: '1' }
    }).isValid,
    true
  );
  assert.equal(
    model.addRelationship({
      type: 'Dependency',
      sourceId: warId,
      targetId: schemaArtId,
      name: '«use»'
    }).isValid,
    true
  );

  const doc = model.toJSON();
  assert.equal(doc.model.elements.length, 8);
  assert.equal(doc.model.relationships.length, 3);
  assert.equal(validateDeploymentModel(doc.model).length, 0);
  assert.equal(evaluateDeploymentWarnings(doc.model).length, 0);
  assert.ok(specId && schemaArtId);
});

test('UML-05-FIX.1 Defecto A: Artifact.manifestedElements con 0, 1, 2, 3 y 4 entradas, geometría, anclajes y serialización', () => {
  const editor = createEmptyDeploymentEditor();
  const model = editor.getDiagramModel();

  const targetNode = editor.insertElementAt('Node', { x: 420, y: 120, name: 'AppHost' });
  assert.equal(targetNode.isValid, true);

  // 0 entradas
  const artRes = editor.insertElementAt('Artifact', {
    x: 60,
    y: 80,
    name: 'suite.jar',
    properties: { fileName: 'suite.jar', manifestedElements: [] }
  });
  assert.equal(artRes.isValid, true);
  const artId = artRes.elementId;
  assert.equal(model.getElementView(artId).height, 64);

  const depRes = editor.createRelationship({
    type: 'Deployment',
    sourceId: artId,
    targetId: targetNode.elementId
  });
  assert.equal(depRes.isValid, true);

  const ctx = createMockCanvasContext();
  ctx.setTransform = () => {};
  ctx.arc = () => {};
  ctx.rect = () => {};
  ctx.clip = () => {};
  const headlessCanvas = {
    width: 1200,
    height: 800,
    style: { cursor: 'default' },
    getContext: (kind) => (kind === '2d' ? ctx : null),
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 1200, height: 800 })
  };
  const renderer = new CanvasRenderer(headlessCanvas, editor);
  renderer.renderNow();
  const route0 = renderer._lastComputedRoutes.get(depRes.relationshipId);

  // Probar 1, 2, 3 y 4 entradas: sin omisión y dentro de la geometría
  for (const count of [1, 2, 3, 4]) {
    const entries = Array.from({ length: count }, (_, idx) => ({
      kind: 'Component',
      name: `Service${idx + 1}`
    }));
    const upd = editor.updateElementProperties(artId, {
      properties: { manifestedElements: entries }
    });
    assert.equal(upd.isValid, true);

    const view = model.getElementView(artId);
    const minReq = DeploymentCatalog.elements.Artifact.getMinimumSize(model.getElementById(artId));
    assert.ok(view.height >= minReq.height, `Altura ${view.height} debe cubrir mínimo ${minReq.height}`);

    ctx.calls.length = 0;
    DeploymentCatalog.elements.Artifact.render(ctx, model.getElementById(artId), view);
    const manifestTexts = ctx.calls.filter(
      (c) => c.op === 'fillText' && c.text.startsWith('«manifest» ')
    );
    assert.equal(manifestTexts.length, count);
    for (let i = 0; i < count; i += 1) {
      assert.equal(manifestTexts[i].text, `«manifest» Component: Service${i + 1}`);
      assert.ok(manifestTexts[i].y + 12 <= view.y + view.height);
    }
  }

  // Recálculo de anclaje cuando creció la geometría del Artifact
  renderer.renderNow();
  const route4 = renderer._lastComputedRoutes.get(depRes.relationshipId);
  assert.notDeepEqual(route4[0], route0[0]);

  // No se puede encoger manualmente por debajo del contenido
  const shrinkAttempt = model.resizeElement(artId, {
    ...model.getElementView(artId),
    height: 60
  });
  assert.equal(shrinkAttempt.isValid, false);

  // Preservación al serializar y recargar
  const snapshot = model.toJSON();
  const reloadedEditor = createEmptyDeploymentEditor();
  const loadRes = reloadedEditor.getDiagramModel().loadDocument(snapshot);
  assert.equal(loadRes.isValid, true);
  assert.equal(
    reloadedEditor.getDiagramModel().getElementById(artId).properties.manifestedElements.length,
    4
  );
});

test('UML-05-FIX.2 Defecto B: DeploymentSpecification.properties estructurado, validación atómica, renderizado y serialización', () => {
  const editor = createEmptyDeploymentEditor();
  const model = editor.getDiagramModel();

  const specRes = editor.insertElementAt('DeploymentSpecification', {
    x: 80,
    y: 90,
    name: 'runtime-prod.yaml',
    properties: {
      deploymentLocation: '/etc/app/runtime.yaml',
      executionLocation: 'k8s-pod',
      properties: [
        { name: 'poolSize', value: '32' },
        { name: 'timeoutMs', value: '5000' },
        { name: 'tlsMode', value: 'strict' }
      ]
    }
  });
  assert.equal(specRes.isValid, true);
  const specId = specRes.elementId;

  const view = model.getElementView(specId);
  const minReq = DeploymentCatalog.elements.DeploymentSpecification.getMinimumSize(
    model.getElementById(specId)
  );
  assert.ok(view.height >= minReq.height);

  // Renderiza todas las líneas sin omisión ni desbordamiento
  const ctx = createMockCanvasContext();
  ctx.rect = () => {};
  ctx.clip = () => {};
  DeploymentCatalog.elements.DeploymentSpecification.render(ctx, model.getElementById(specId), view);
  const renderedTexts = ctx.calls.filter((c) => c.op === 'fillText').map((c) => c.text);
  assert.ok(renderedTexts.includes('deploymentLocation: /etc/app/runtime.yaml'));
  assert.ok(renderedTexts.includes('executionLocation: k8s-pod'));
  assert.ok(renderedTexts.includes('poolSize: 32'));
  assert.ok(renderedTexts.includes('timeoutMs: 5000'));
  assert.ok(renderedTexts.includes('tlsMode: strict'));
  for (const call of ctx.calls.filter((c) => c.op === 'fillText')) {
    assert.ok(call.y + 12 <= view.y + view.height);
  }

  // Rechazo atómico de estructuras inválidas
  const badArrayRes = editor.updateElementProperties(specId, {
    properties: { properties: 'invalido' }
  });
  assert.equal(badArrayRes.isValid, false);

  const emptyPairNameRes = editor.updateElementProperties(specId, {
    properties: { properties: [{ name: '   ', value: '10' }] }
  });
  assert.equal(emptyPairNameRes.isValid, false);

  const nonStringValueRes = editor.updateElementProperties(specId, {
    properties: { properties: [{ name: 'poolSize', value: 32 }] }
  });
  assert.equal(nonStringValueRes.isValid, false);

  // Estado previo intacto tras rechazos atómicos
  assert.equal(model.getElementById(specId).properties.properties.length, 3);

  // Preservación al serializar y recargar
  const snapshot = model.toJSON();
  const reloadedEditor = createEmptyDeploymentEditor();
  const loadRes = reloadedEditor.getDiagramModel().loadDocument(snapshot);
  assert.equal(loadRes.isValid, true);
  assert.deepEqual(
    reloadedEditor.getDiagramModel().getElementById(specId).properties.properties,
    [
      { name: 'poolSize', value: '32' },
      { name: 'timeoutMs', value: '5000' },
      { name: 'tlsMode', value: 'strict' }
    ]
  );
});
