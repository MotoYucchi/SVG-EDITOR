/**
 * Automated Crash-Safe Auto-Save & Session Recovery via IndexedDB
 */

const DB_NAME = 'SVGEditorStudioDB';
const DB_VERSION = 1;
const STORE_NAME = 'autosave';

function openDB() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveAutosaveSnapshot(doc, rasterStore) {
  try {
    const db = await openDB();
    const rasterData = {};
    function collectRasters(group) {
      for (const child of group.children || []) {
        if (child.type === 'raster' && rasterStore) {
          rasterData[child.assetId] = rasterStore.toDataURL(child.assetId);
        } else if (child.type === 'group') {
          collectRasters(child);
        }
      }
    }
    collectRasters(doc.rootGroup);

    const payload = {
      savedAt: new Date().toISOString(),
      doc,
      rasterData
    };

    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(payload, 'latest_session');
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

export async function loadAutosaveSnapshot(rasterStore) {
  try {
    const db = await openDB();
    const payload = await new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get('latest_session');
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
    if (!payload || !payload.doc) return null;

    if (payload.rasterData && rasterStore) {
      for (const [assetId, dataUrl] of Object.entries(payload.rasterData)) {
        if (dataUrl) {
          await rasterStore.loadFromDataURL(
            assetId,
            dataUrl,
            payload.doc.canvas.width,
            payload.doc.canvas.height
          );
        }
      }
    }
    return payload;
  } catch {
    return null;
  }
}
