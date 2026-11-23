/**
 * Command Pattern Engine & Undo/Redo History Stack
 * Every document mutation goes through CommandManager so that:
 * 1. Undo/Redo is 100% consistent across Vector, Raster, Layer Tree, and Canvas edits.
 * 2. The user can jump to any arbitrary point in the History Panel.
 * 3. Destructive operations require no annoying confirmation dialogs because Undo always rescues them.
 */

import {
  createId,
  deepClone,
  findLayerById,
  findObjectById
} from './document.js';

export class CommandManager {
  constructor(doc, rasterStore, onChangeCallback = null) {
    this.doc = doc;
    this.rasterStore = rasterStore;
    this.onChange = onChangeCallback;
    /** @type {Array<object>} */
    this.history = [];
    this.cursor = -1; // Index of last executed command (-1 = initial state)
    this.maxHistory = 150;
  }

  setDocument(doc) {
    this.doc = doc;
    this.history = [];
    this.cursor = -1;
    this._notify('reset');
  }

  execute(command, skipExecute = false) {
    if (!skipExecute) {
      command.execute(this.doc, this.rasterStore);
    }

    // Truncate redo branch if we are in the middle of history
    if (this.cursor < this.history.length - 1) {
      this.history.splice(this.cursor + 1);
    }

    // Check if command can merge with the previous one (e.g. continuous slider scrub)
    const prev = this.history[this.cursor];
    if (
      prev &&
      command.mergeKey &&
      prev.mergeKey === command.mergeKey &&
      (command.timestamp - prev.timestamp) < 600 &&
      typeof prev.mergeWith === 'function'
    ) {
      prev.mergeWith(command);
      prev.timestamp = command.timestamp;
    } else {
      this.history.push(command);
      if (this.history.length > this.maxHistory) {
        this.history.shift();
      }
      this.cursor = this.history.length - 1;
    }

    this.doc.metadata.updatedAt = new Date().toISOString();
    this._notify('execute', command);
  }

  canUndo() {
    return this.cursor >= 0;
  }

  canRedo() {
    return this.cursor < this.history.length - 1;
  }

  undo() {
    if (!this.canUndo()) return false;
    const cmd = this.history[this.cursor];
    cmd.undo(this.doc, this.rasterStore);
    this.cursor--;
    this.doc.metadata.updatedAt = new Date().toISOString();
    this._notify('undo', cmd);
    return true;
  }

  redo() {
    if (!this.canRedo()) return false;
    this.cursor++;
    const cmd = this.history[this.cursor];
    cmd.execute(this.doc, this.rasterStore);
    this.doc.metadata.updatedAt = new Date().toISOString();
    this._notify('redo', cmd);
    return true;
  }

  /**
   * Jumps to any target index in the History Panel (-1 = initial state)
   */
  jumpTo(targetIndex) {
    const clamped = Math.max(-1, Math.min(this.history.length - 1, targetIndex));
    if (clamped === this.cursor) return;
    while (this.cursor > clamped) {
      this.history[this.cursor].undo(this.doc, this.rasterStore);
      this.cursor--;
    }
    while (this.cursor < clamped) {
      this.cursor++;
      this.history[this.cursor].execute(this.doc, this.rasterStore);
    }
    this.doc.metadata.updatedAt = new Date().toISOString();
    this._notify('jump');
  }

  _notify(reason, cmd = null) {
    if (typeof this.onChange === 'function') {
      this.onChange(reason, cmd);
    }
  }
}

// ============================================================================
// Concrete Command Factories
// ============================================================================

/**
 * Adds a VectorObject to a target VectorLayer
 */
export function createAddObjectCommand(layerId, vectorObject, label = null) {
  const objClone = deepClone(vectorObject);
  return {
    id: createId('cmd'),
    label: label || `${objClone.name}を追加`,
    icon: 'plus',
    timestamp: Date.now(),
    execute(doc) {
      const found = findLayerById(doc.rootGroup, layerId);
      if (found && found.layer.type === 'vector') {
        found.layer.objects.push(deepClone(objClone));
      }
    },
    undo(doc) {
      const found = findLayerById(doc.rootGroup, layerId);
      if (found && found.layer.type === 'vector') {
        found.layer.objects = found.layer.objects.filter(o => o.id !== objClone.id);
      }
    }
  };
}

/**
 * Deletes one or more VectorObjects across layers
 */
export function createDeleteObjectsCommand(objectIds, docSnapshot) {
  const removedEntries = [];
  for (const id of objectIds) {
    const found = findObjectById(docSnapshot.rootGroup, id);
    if (found) {
      removedEntries.push({
        layerId: found.layer.id,
        index: found.index,
        object: deepClone(found.object)
      });
    }
  }
  return {
    id: createId('cmd'),
    label: removedEntries.length > 1 ? `${removedEntries.length}個のオブジェクトを削除` : `${removedEntries[0]?.object.name || 'オブジェクト'}を削除`,
    icon: 'trash',
    timestamp: Date.now(),
    execute(doc) {
      const idSet = new Set(objectIds);
      for (const entry of removedEntries) {
        const lyr = findLayerById(doc.rootGroup, entry.layerId);
        if (lyr && lyr.layer.type === 'vector') {
          lyr.layer.objects = lyr.layer.objects.filter(o => !idSet.has(o.id));
        }
      }
    },
    undo(doc) {
      for (const entry of removedEntries) {
        const lyr = findLayerById(doc.rootGroup, entry.layerId);
        if (lyr && lyr.layer.type === 'vector') {
          const insertIdx = Math.min(lyr.layer.objects.length, entry.index);
          lyr.layer.objects.splice(insertIdx, 0, deepClone(entry.object));
        }
      }
    }
  };
}

/**
 * Updates properties, transform, style, or nodes of one or more VectorObjects
 */
export function createUpdateObjectsCommand(beforeObjects, afterObjects, label = 'オブジェクトを編集', mergeKey = null) {
  let beforeMap = new Map(beforeObjects.map(o => [o.id, deepClone(o)]));
  let afterMap = new Map(afterObjects.map(o => [o.id, deepClone(o)]));

  return {
    id: createId('cmd'),
    label,
    icon: 'tool-select',
    timestamp: Date.now(),
    mergeKey,
    execute(doc) {
      for (const [id, afterObj] of afterMap.entries()) {
        const found = findObjectById(doc.rootGroup, id);
        if (found) {
          found.layer.objects[found.index] = deepClone(afterObj);
        }
      }
    },
    undo(doc) {
      for (const [id, beforeObj] of beforeMap.entries()) {
        const found = findObjectById(doc.rootGroup, id);
        if (found) {
          found.layer.objects[found.index] = deepClone(beforeObj);
        }
      }
    },
    mergeWith(nextCmd) {
      if (nextCmd && nextCmd._afterMap) {
        afterMap = nextCmd._afterMap;
      }
    },
    _afterMap: afterMap
  };
}

/**
 * Replaces a set of objects with new object(s) (Used for Boolean Union/Subtract/Intersect/Exclude & Convert to Path)
 */
export function createReplaceObjectsCommand(layerId, removeObjectIds, newObjects, label = 'パス演算') {
  let backupList = null;
  const addedClones = newObjects.map(o => deepClone(o));

  return {
    id: createId('cmd'),
    label,
    icon: 'bool-union',
    timestamp: Date.now(),
    execute(doc) {
      const found = findLayerById(doc.rootGroup, layerId);
      if (!found || found.layer.type !== 'vector') return;
      if (!backupList) {
        backupList = deepClone(found.layer.objects);
      }
      const removeSet = new Set(removeObjectIds);
      found.layer.objects = found.layer.objects.filter(o => !removeSet.has(o.id));
      for (const n of addedClones) {
        found.layer.objects.push(deepClone(n));
      }
    },
    undo(doc) {
      const found = findLayerById(doc.rootGroup, layerId);
      if (!found || found.layer.type !== 'vector' || !backupList) return;
      found.layer.objects = deepClone(backupList);
    }
  };
}

/**
 * Reorders objects within a VectorLayer (Bring to Front, Send to Back, Forward, Backward)
 */
export function createReorderObjectsCommand(layerId, beforeOrderIds, afterOrderIds, label = '重ね順を変更') {
  return {
    id: createId('cmd'),
    label,
    icon: 'layer-vector',
    timestamp: Date.now(),
    execute(doc) {
      const found = findLayerById(doc.rootGroup, layerId);
      if (!found || found.layer.type !== 'vector') return;
      const map = new Map(found.layer.objects.map(o => [o.id, o]));
      found.layer.objects = afterOrderIds.map(id => map.get(id)).filter(Boolean);
    },
    undo(doc) {
      const found = findLayerById(doc.rootGroup, layerId);
      if (!found || found.layer.type !== 'vector') return;
      const map = new Map(found.layer.objects.map(o => [o.id, o]));
      found.layer.objects = beforeOrderIds.map(id => map.get(id)).filter(Boolean);
    }
  };
}

/**
 * Layer Tree Mutation Command (Add, Delete, Reorder, Group, Merge, Rasterize, Property Change)
 * Stores a clean snapshot of the rootGroup tree before and after the change.
 */
export function createLayerTreeCommand(beforeRootGroup, afterRootGroup, label = 'レイヤー操作', icon = 'layer-group') {
  const beforeSnap = deepClone(beforeRootGroup);
  const afterSnap = deepClone(afterRootGroup);

  return {
    id: createId('cmd'),
    label,
    icon,
    timestamp: Date.now(),
    execute(doc) {
      doc.rootGroup = deepClone(afterSnap);
    },
    undo(doc) {
      doc.rootGroup = deepClone(beforeSnap);
    }
  };
}

/**
 * Raster Region Delta Command (Stores only the modified bounding rect before & after a brush stroke / bucket fill)
 */
export function createRasterDeltaCommand(assetId, beforePatch, afterPatch, label = 'ラスター描画', icon = 'raster-pen') {
  return {
    id: createId('cmd'),
    label,
    icon,
    timestamp: Date.now(),
    execute(doc, rasterStore) {
      rasterStore.restoreRegion(assetId, afterPatch);
    },
    undo(doc, rasterStore) {
      rasterStore.restoreRegion(assetId, beforePatch);
    }
  };
}

/**
 * Canvas Resize / Config Change Command
 */
export function createCanvasConfigCommand(beforeCanvas, afterCanvas, beforeRootGroup, afterRootGroup, label = 'キャンバス設定変更') {
  const bCanvas = deepClone(beforeCanvas);
  const aCanvas = deepClone(afterCanvas);
  const bRoot = beforeRootGroup ? deepClone(beforeRootGroup) : null;
  const aRoot = afterRootGroup ? deepClone(afterRootGroup) : null;

  return {
    id: createId('cmd'),
    label,
    icon: 'settings',
    timestamp: Date.now(),
    execute(doc, rasterStore) {
      doc.canvas = deepClone(aCanvas);
      if (aRoot) doc.rootGroup = deepClone(aRoot);
      if (rasterStore && (bCanvas.width !== aCanvas.width || bCanvas.height !== aCanvas.height)) {
        rasterStore.resizeAllBuffers(aCanvas.width, aCanvas.height);
      }
    },
    undo(doc, rasterStore) {
      doc.canvas = deepClone(bCanvas);
      if (bRoot) doc.rootGroup = deepClone(bRoot);
      if (rasterStore && (bCanvas.width !== aCanvas.width || bCanvas.height !== aCanvas.height)) {
        rasterStore.resizeAllBuffers(bCanvas.width, bCanvas.height);
      }
    }
  };
}
