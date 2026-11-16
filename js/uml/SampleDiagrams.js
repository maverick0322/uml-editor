/**
 * Documentos de ejemplo precargados exclusivamente demostrativos para verificar
 * el funcionamiento del modelo y del renderizador en ambos modos — Incremento UML-01.
 */

export const SAMPLE_USE_CASE_DOCUMENT = Object.freeze({
  schemaVersion: 1,
  id: 'demo-uc-uml01',
  name: 'Sistema de Banca en Línea (Demostración inicial UML-01)',
  diagramType: 'use-case',
  model: {
    elements: [
      {
        id: 'sb-1',
        type: 'SystemBoundary',
        name: 'Portal de Banca en Línea',
        parentId: null,
        properties: {
          stereotype: '«subsystem»'
        }
      },
      {
        id: 'sb-2',
        type: 'SystemBoundary',
        name: 'Módulo de Auditoría Externa',
        parentId: null,
        properties: {
          stereotype: ''
        }
      },
      {
        id: 'act-1',
        type: 'Actor',
        name: 'Cliente Bancario',
        parentId: null,
        properties: {
          isAbstract: false,
          notationVariant: 'stickman'
        }
      },
      {
        id: 'act-2',
        type: 'Actor',
        name: 'Cliente Corporativo',
        parentId: null,
        properties: {
          isAbstract: false,
          notationVariant: 'stickman'
        }
      },
      {
        id: 'act-3',
        type: 'Actor',
        name: 'Red Interbancaria SPEI',
        parentId: null,
        properties: {
          isAbstract: false,
          notationVariant: 'rectangle'
        }
      },
      {
        id: 'uc-1',
        type: 'UseCase',
        name: 'Transferir Fondos',
        parentId: 'sb-1',
        properties: {
          isAbstract: false,
          showExtensionPoints: true,
          extensionPoints: [
            { id: 'ep-1', name: 'Monto Mayor al Límite' }
          ]
        }
      },
      {
        id: 'uc-2',
        type: 'UseCase',
        name: 'Autenticar con Token 2FA',
        parentId: 'sb-1',
        properties: {
          isAbstract: false,
          showExtensionPoints: false,
          extensionPoints: []
        }
      },
      {
        id: 'uc-3',
        type: 'UseCase',
        name: 'Solicitar Autorización Mancomunada',
        parentId: 'sb-1',
        properties: {
          isAbstract: false,
          showExtensionPoints: false,
          extensionPoints: []
        }
      },
      {
        id: 'uc-4',
        type: 'UseCase',
        name: 'Consultar Saldo',
        parentId: 'sb-1',
        properties: {
          isAbstract: false,
          showExtensionPoints: false,
          extensionPoints: []
        }
      },
      {
        id: 'uc-5',
        type: 'UseCase',
        name: 'Registrar Traza Regulatoria',
        parentId: 'sb-2',
        properties: {
          isAbstract: false,
          showExtensionPoints: false,
          extensionPoints: []
        }
      },
      {
        id: 'cmn-uc-1',
        type: 'Comment',
        name: '',
        parentId: null,
        properties: {
          body: 'Demostración UML-01\nCondición: {monto > $50,000}\nPunto: ep-1'
        }
      }
    ],
    relationships: [
      {
        id: 'rel-uc-1',
        type: 'Association',
        sourceId: 'act-1',
        targetId: 'uc-1',
        name: '',
        properties: {
          sourceMultiplicity: '1',
          targetMultiplicity: '0..*'
        }
      },
      {
        id: 'rel-uc-2',
        type: 'Association',
        sourceId: 'act-1',
        targetId: 'uc-4',
        name: '',
        properties: {
          sourceMultiplicity: '1',
          targetMultiplicity: '*'
        }
      },
      {
        id: 'rel-uc-3',
        type: 'Generalization',
        sourceId: 'act-2',
        targetId: 'act-1',
        name: '',
        properties: {}
      },
      {
        id: 'rel-uc-4',
        type: 'Include',
        sourceId: 'uc-1',
        targetId: 'uc-2',
        name: '',
        properties: {}
      },
      {
        id: 'rel-uc-5',
        type: 'Extend',
        sourceId: 'uc-3',
        targetId: 'uc-1',
        name: '',
        properties: {
          extensionLocation: 'ep-1',
          condition: 'monto > $50,000 y cuenta corporativa'
        }
      },
      {
        id: 'rel-uc-6',
        type: 'Association',
        sourceId: 'uc-1',
        targetId: 'act-3',
        name: '',
        properties: {
          sourceMultiplicity: '*',
          targetMultiplicity: '1'
        }
      },
      {
        id: 'rel-uc-7',
        type: 'Association',
        sourceId: 'act-3',
        targetId: 'uc-5',
        name: '',
        properties: {}
      },
      {
        id: 'rel-uc-8',
        type: 'CommentLink',
        sourceId: 'cmn-uc-1',
        targetId: 'rel-uc-5',
        name: '',
        properties: {}
      }
    ]
  },
  view: {
    elements: {
      'sb-1': { x: 210, y: 28, width: 470, height: 345 },
      'sb-2': { x: 210, y: 392, width: 470, height: 122 },
      'act-1': { x: 52, y: 92, width: 68, height: 105 },
      'act-2': { x: 48, y: 270, width: 76, height: 105 },
      'act-3': { x: 745, y: 195, width: 148, height: 64 },
      'uc-1': { x: 255, y: 82, width: 225, height: 92 },
      'uc-2': { x: 495, y: 88, width: 165, height: 66 },
      'uc-3': { x: 255, y: 242, width: 228, height: 70 },
      'uc-4': { x: 505, y: 242, width: 150, height: 64 },
      'uc-5': { x: 340, y: 432, width: 215, height: 64 },
      'cmn-uc-1': { x: 722, y: 325, width: 175, height: 68 }
    },
    relationships: {
      'rel-uc-1': { waypoints: [] },
      'rel-uc-2': { waypoints: [] },
      'rel-uc-3': { waypoints: [] },
      'rel-uc-4': { waypoints: [] },
      'rel-uc-5': { waypoints: [] },
      'rel-uc-6': { waypoints: [] },
      'rel-uc-7': { waypoints: [] },
      'rel-uc-8': { waypoints: [] }
    },
    drawOrder: [
      'sb-1',
      'sb-2',
      'uc-1',
      'uc-2',
      'uc-3',
      'uc-4',
      'uc-5',
      'act-1',
      'act-2',
      'act-3',
      'cmn-uc-1'
    ]
  }
});

export const SAMPLE_DEPLOYMENT_DOCUMENT = Object.freeze({
  schemaVersion: 1,
  id: 'demo-dep-uml01',
  name: 'Arquitectura Web de Comercio Electrónico (Demostración inicial UML-01)',
  diagramType: 'deployment',
  model: {
    elements: [
      {
        id: 'dev-1',
        type: 'Device',
        name: 'lb-01',
        parentId: null,
        properties: {
          isInstance: true,
          classifierName: 'LoadBalancer'
        }
      },
      {
        id: 'dev-2',
        type: 'Device',
        name: 'app-srv-01',
        parentId: null,
        properties: {
          isInstance: true,
          classifierName: 'AppServer'
        }
      },
      {
        id: 'env-1',
        type: 'ExecutionEnvironment',
        name: 'Node.js 22 Runtime',
        parentId: 'dev-2',
        properties: {
          isInstance: false,
          classifierName: ''
        }
      },
      {
        id: 'art-1',
        type: 'Artifact',
        name: 'catalog-service.js',
        parentId: 'env-1',
        properties: {
          fileName: 'catalog-service.js',
          isInstance: false,
          classifierName: '',
          manifestedElements: [
            { name: 'CatalogComponent', kind: 'Component' }
          ]
        }
      },
      {
        id: 'spec-1',
        type: 'DeploymentSpecification',
        name: 'env-production.json',
        parentId: 'env-1',
        properties: {
          deploymentLocation: '/srv/catalog',
          executionLocation: 'cluster-worker'
        }
      },
      {
        id: 'dev-3',
        type: 'Device',
        name: 'db-srv-01',
        parentId: null,
        properties: {
          isInstance: true,
          classifierName: 'DatabaseServer'
        }
      },
      {
        id: 'env-2',
        type: 'ExecutionEnvironment',
        name: 'PostgreSQL 16',
        parentId: 'dev-3',
        properties: {
          isInstance: false,
          classifierName: ''
        }
      },
      {
        id: 'art-2',
        type: 'Artifact',
        name: 'db-migrations.sql',
        parentId: null,
        properties: {
          fileName: 'db-migrations.sql',
          isInstance: false,
          classifierName: '',
          manifestedElements: []
        }
      },
      {
        id: 'art-3',
        type: 'Artifact',
        name: 'release-package.tar',
        parentId: null,
        properties: {
          fileName: 'release-package.tar',
          isInstance: false,
          classifierName: '',
          manifestedElements: []
        }
      },
      {
        id: 'cmn-dep-1',
        type: 'Comment',
        name: '',
        parentId: null,
        properties: {
          body: 'Demostración UML-01\nCanal HTTPS con TLS 1.3\nentre balanceador y nodo app'
        }
      }
    ],
    relationships: [
      {
        id: 'rel-dep-1',
        type: 'CommunicationPath',
        sourceId: 'dev-1',
        targetId: 'dev-2',
        name: '«https»',
        properties: {
          stereotype: '«https»',
          sourceMultiplicity: '1',
          targetMultiplicity: '1..*'
        }
      },
      {
        id: 'rel-dep-2',
        type: 'CommunicationPath',
        sourceId: 'dev-2',
        targetId: 'dev-3',
        name: '«tcp/ip : 5432»',
        properties: {
          stereotype: '«tcp/ip : 5432»',
          sourceMultiplicity: '1..*',
          targetMultiplicity: '1'
        }
      },
      {
        id: 'rel-dep-3',
        type: 'Deployment',
        sourceId: 'art-2',
        targetId: 'env-2',
        name: '',
        properties: {}
      },
      {
        id: 'rel-dep-4',
        type: 'Manifestation',
        sourceId: 'art-3',
        targetId: 'art-1',
        name: '',
        properties: {}
      },
      {
        id: 'rel-dep-5',
        type: 'Dependency',
        sourceId: 'spec-1',
        targetId: 'art-1',
        name: '«parameterizes»',
        properties: {
          stereotype: '«parameterizes»'
        }
      },
      {
        id: 'rel-dep-6',
        type: 'CommentLink',
        sourceId: 'cmn-dep-1',
        targetId: 'rel-dep-1',
        name: '',
        properties: {}
      }
    ]
  },
  view: {
    elements: {
      'dev-1': { x: 28, y: 75, width: 175, height: 110 },
      'dev-2': { x: 265, y: 28, width: 325, height: 320 },
      'env-1': { x: 285, y: 84, width: 278, height: 244 },
      'art-1': { x: 304, y: 140, width: 235, height: 74 },
      'spec-1': { x: 304, y: 242, width: 235, height: 74 },
      'dev-3': { x: 660, y: 45, width: 235, height: 210 },
      'env-2': { x: 680, y: 105, width: 190, height: 128 },
      'art-2': { x: 678, y: 335, width: 195, height: 55 },
      'art-3': { x: 32, y: 315, width: 180, height: 55 },
      'cmn-dep-1': { x: 32, y: 212, width: 185, height: 68 }
    },
    relationships: {
      'rel-dep-1': { waypoints: [] },
      'rel-dep-2': { waypoints: [] },
      'rel-dep-3': { waypoints: [] },
      'rel-dep-4': { waypoints: [] },
      'rel-dep-5': { waypoints: [] },
      'rel-dep-6': { waypoints: [] }
    },
    drawOrder: [
      'dev-1',
      'dev-2',
      'env-1',
      'art-1',
      'spec-1',
      'dev-3',
      'env-2',
      'art-2',
      'art-3',
      'cmn-dep-1'
    ]
  }
});
