/**
 * Historial de comandos Deshacer / Rehacer (`Undo` / `Redo`) — Incremento UML-06 (CAN-12).
 *
 * Módulo puro desacoplado del DOM y de Canvas 2D (DIP / RNF-04).
 *
 * Decisión técnica y trade-off de memoria:
 * Se utiliza el patrón Command basado en instantáneas planas JSON (`before` y `after`)
 * acotadas a `maxEntries` (por defecto 50). Frente a deltas inversos manuales por cada
 * tipo de mutación, las instantáneas garantizan atomicidad exacta ante operaciones
 * compuestas (`Extend` + `ExtensionPoint`, eliminaciones en cascada multinivel con
 * limpieza de `CommentLink`s y recálculo de `drawOrder`), a costa de almacenar dos copias
 * del documento por entrada (~50 entradas máximas para acotar el uso de memoria).
 */

export const DEFAULT_HISTORY_LIMIT = 50;

export class CommandHistory {
  /**
   * @param {{ maxEntries?: number }} [options]
   */
  constructor({ maxEntries = DEFAULT_HISTORY_LIMIT } = {}) {
    this._maxEntries =
      typeof maxEntries === 'number' && Number.isFinite(maxEntries) && maxEntries >= 1
        ? Math.floor(maxEntries)
        : DEFAULT_HISTORY_LIMIT;
    /** @type {Array<{ label: string, execute: () => unknown, undo: () => unknown }>} */
    this._undoStack = [];
    /** @type {Array<{ label: string, execute: () => unknown, undo: () => unknown }>} */
    this._redoStack = [];
  }

  /**
   * Registra un comando ya ejecutado e invalida la rama de rehacer (`redo`).
   *
   * @param {{ label: string, execute: () => unknown, undo: () => unknown }} command
   */
  pushExecuted(command) {
    if (
      !command ||
      typeof command.execute !== 'function' ||
      typeof command.undo !== 'function'
    ) {
      throw new TypeError('CommandHistory.pushExecuted requiere un comando con execute() y undo().');
    }

    this._undoStack.push({
      label: typeof command.label === 'string' && command.label ? command.label : 'Operación',
      execute: command.execute,
      undo: command.undo
    });

    if (this._undoStack.length > this._maxEntries) {
      this._undoStack.shift();
    }

    // Toda nueva operación confirmada invalida el historial futuro de Rehacer
    this._redoStack.length = 0;
  }

  /**
   * Crea y registra un comando basado en instantáneas `before` y `after`.
   *
   * @template T
   * @param {{
   *   label: string,
   *   before: T,
   *   after: T,
   *   applySnapshot: (snapshot: T) => void
   * }} options
   */
  recordSnapshot({ label, before, after, applySnapshot }) {
    if (typeof applySnapshot !== 'function') {
      throw new TypeError('CommandHistory.recordSnapshot requiere applySnapshot(snapshot).');
    }
    this.pushExecuted({
      label,
      execute: () => applySnapshot(after),
      undo: () => applySnapshot(before)
    });
  }

  /**
   * @returns {boolean}
   */
  canUndo() {
    return this._undoStack.length > 0;
  }

  /**
   * @returns {boolean}
   */
  canRedo() {
    return this._redoStack.length > 0;
  }

  /**
   * Deshace la última operación registrada.
   *
   * @returns {{ undone: boolean, label: string | null }}
   */
  undo() {
    if (this._undoStack.length === 0) {
      return { undone: false, label: null };
    }
    const command = this._undoStack.pop();
    command.undo();
    this._redoStack.push(command);
    return { undone: true, label: command.label };
  }

  /**
   * Rehace la última operación deshecha.
   *
   * @returns {{ redone: boolean, label: string | null }}
   */
  redo() {
    if (this._redoStack.length === 0) {
      return { redone: false, label: null };
    }
    const command = this._redoStack.pop();
    command.execute();
    this._undoStack.push(command);
    return { redone: true, label: command.label };
  }

  /**
   * Reinicia ambas pilas (al cargar un documento, crear uno nuevo o restaurar ejemplo).
   */
  clear() {
    this._undoStack.length = 0;
    this._redoStack.length = 0;
  }

  /**
   * @returns {{ undoCount: number, redoCount: number, maxEntries: number, undoLabel: string | null, redoLabel: string | null }}
   */
  getState() {
    const topUndo = this._undoStack[this._undoStack.length - 1] || null;
    const topRedo = this._redoStack[this._redoStack.length - 1] || null;
    return {
      undoCount: this._undoStack.length,
      redoCount: this._redoStack.length,
      maxEntries: this._maxEntries,
      undoLabel: topUndo ? topUndo.label : null,
      redoLabel: topRedo ? topRedo.label : null
    };
  }
}
