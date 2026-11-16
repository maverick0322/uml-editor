import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const ENTRYPOINT_PATH = path.join(PROJECT_ROOT, 'js', 'main.js');

/**
 * Extrae las sentencias `import ... from '...'` e `import '...'` de un módulo ES.
 * @param {string} source
 * @returns {Array<{ specifier: string, namedImports: string[] }>}
 */
function parseModuleImports(source) {
  const results = [];
  const importRegex = /import\s+(?:([\s\S]*?)\s+from\s+)?['"]([^'"]+)['"]\s*;/g;
  let match;
  while ((match = importRegex.exec(source)) !== null) {
    const clause = (match[1] || '').trim();
    const specifier = match[2];
    const namedImports = [];

    const braceMatch = clause.match(/\{([\s\S]*?)\}/);
    if (braceMatch) {
      const items = braceMatch[1]
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean);
      for (const item of items) {
        const importedName = item.split(/\s+as\s+/)[0].trim();
        if (importedName) {
          namedImports.push(importedName);
        }
      }
    }

    results.push({ specifier, namedImports });
  }
  return results;
}

test('MOD-01: El entrypoint js/main.js y todo el grafo de módulos ES se importan sin errores y sin exports faltantes', async () => {
  // 1. Importación real del entrypoint (falla con SyntaxError si falta prepareJsonExport u otro export).
  const mainNamespace = await import(pathToFileURL(ENTRYPOINT_PATH).href);
  assert.equal(typeof mainNamespace.bindToolbarControls, 'function');

  // 2. Verificación explícita de prepareJsonExport y contratos clave en JsonSerializer.js.
  const jsonSerializerPath = path.join(PROJECT_ROOT, 'js', 'io', 'JsonSerializer.js');
  const jsonSerializerNs = await import(pathToFileURL(jsonSerializerPath).href);
  assert.equal(typeof jsonSerializerNs.prepareJsonExport, 'function');
  assert.equal(typeof jsonSerializerNs.getUtf8ByteLength, 'function');
  assert.equal(jsonSerializerNs.MAX_JSON_FILE_BYTES, 2 * 1024 * 1024);

  // 3. Recorrido completo del grafo transitivo desde js/main.js comprobando cada import nombrado.
  const visited = new Set();
  const queue = [ENTRYPOINT_PATH];

  while (queue.length > 0) {
    const currentFile = queue.shift();
    if (visited.has(currentFile)) {
      continue;
    }
    visited.add(currentFile);

    const source = await fs.readFile(currentFile, 'utf8');
    const imports = parseModuleImports(source);

    for (const { specifier, namedImports } of imports) {
      assert.ok(
        specifier.startsWith('./') || specifier.startsWith('../'),
        `Especificador no relativo inesperado en ${path.relative(PROJECT_ROOT, currentFile)}: ${specifier}`
      );

      const resolvedTarget = path.resolve(path.dirname(currentFile), specifier);
      await fs.access(resolvedTarget);

      const targetNs = await import(pathToFileURL(resolvedTarget).href);
      for (const importedName of namedImports) {
        assert.ok(
          Object.prototype.hasOwnProperty.call(targetNs, importedName),
          `El módulo ${path.relative(PROJECT_ROOT, resolvedTarget)} no exporta '${importedName}' (importado desde ${path.relative(PROJECT_ROOT, currentFile)}).`
        );
      }

      queue.push(resolvedTarget);
    }
  }

  assert.ok(visited.size >= 10, `Se esperaba recorrer al menos 10 módulos en el grafo; recorridos: ${visited.size}.`);
});
