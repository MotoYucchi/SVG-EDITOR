/**
 * Strict Consent-Gated Persistence (Cookie / LocalStorage / IndexedDB)
 * GUARANTEE:
 * - If user has NOT granted storage consent (`hasStorageConsent() === false`),
 *   ZERO cookies, ZERO localStorage keys, and ZERO IndexedDB records are written.
 * - Once consent is granted, preferences, keybindings, and workspace state are
 *   automatically persisted and restored across reloads or accidental tab closure.
 */

const CONSENT_COOKIE_NAME = 'svge_storage_consent';
const PREFS_STORAGE_KEY = 'svge_preferences_v2';
const DB_NAME = 'SVGEditorStudioDB';
const DB_VERSION = 1;
const STORE_NAME = 'autosave';

let inMemoryConsent = false;

/**
 * Checks whether the user has previously granted storage/cookie consent
 */
export function hasStorageConsent() {
  if (inMemoryConsent) return true;
  if (typeof document === 'undefined') return false;
  try {
    const match = document.cookie.match(new RegExp('(?:^|; )' + CONSENT_COOKIE_NAME + '=([^;]*)'));
    if (match && decodeURIComponent(match[1]) === 'granted') {
      inMemoryConsent = true;
      return true;
    }
    if (typeof localStorage !== 'undefined' && localStorage.getItem(CONSENT_COOKIE_NAME) === 'granted') {
      inMemoryConsent = true;
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

/**
 * Sets or revokes storage consent.
 * When revoked (granted = false), immediately purges all cookies, localStorage, and IndexedDB data.
 */
export function setStorageConsent(granted) {
  inMemoryConsent = Boolean(granted);
  if (typeof document === 'undefined') return;

  if (inMemoryConsent) {
    try {
      const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString();
      document.cookie = `${CONSENT_COOKIE_NAME}=granted; expires=${expires}; path=/; SameSite=Lax`;
      localStorage.setItem(CONSENT_COOKIE_NAME, 'granted');
    } catch {}
  } else {
    try {
      document.cookie = `${CONSENT_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
      localStorage.removeItem(CONSENT_COOKIE_NAME);
      localStorage.removeItem(PREFS_STORAGE_KEY);
      localStorage.removeItem('svge_lang');
      if (typeof indexedDB !== 'undefined') {
        indexedDB.deleteDatabase(DB_NAME);
      }
    } catch {}
  }
}

export function savePreferencesToStorage(prefs) {
  if (!hasStorageConsent()) return false;
  try {
    localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs));
    return true;
  } catch {
    return false;
  }
}

export function loadPreferencesFromStorage() {
  if (!hasStorageConsent()) return null;
  try {
    const raw = localStorage.getItem(PREFS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function openDB() {
  return new Promise((resolve, reject) => {
    if (!hasStorageConsent() || typeof indexedDB === 'undefined') {
      reject(new Error('Storage consent not granted or IndexedDB unavailable'));
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

export async function saveAutosaveSnapshot(doc, rasterStore, viewport = null) {
  if (!hasStorageConsent()) return false;
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
      rasterData,
      viewport
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
  if (!hasStorageConsent()) return null;
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
