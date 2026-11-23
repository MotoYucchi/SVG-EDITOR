/**
 * Automated Unit Tests for SVG Editor Studio Core & v2.1 Enhancements
 * Run via: node --test tests/core.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createDocument,
  createVectorObject,
  flattenLayers,
  findObjectById,
  toPixels,
  fromPixels,
  estimateCanvasMemoryMB
} from '../js/core/document.js';
import {
  buildObjectPathD,
  simplifyAndSmoothPoints,
  getObjectBounds,
  convertObjectToPath,
  offsetVectorObject,
  performBooleanOperation
} from '../js/core/geometry.js';
import {
  CommandManager,
  createAddObjectCommand,
  createDeleteObjectsCommand,
  createUpdateObjectsCommand
} from '../js/core/commands.js';
import {
  RasterStore,
  RASTER_BRUSH_PRESETS
} from '../js/core/raster-store.js';
import {
  rgbToHsv,
  hsvToRgb,
  rgbToCmyk,
  cmykToRgb,
  checkColorGamut
} from '../js/core/color.js';
import {
  serializeDocumentToSVG,
  exportWorkspaceZip,
  importWorkspaceZip
} from '../js/core/renderer.js';
import {
  hasStorageConsent,
  setStorageConsent,
  savePreferencesToStorage,
  saveAutosaveSnapshot
} from '../js/core/storage.js';
import {
  applyMagneticSnap
} from '../js/ui/custom-Controls.js';
import { ICON_CATALOG } from '../js/ui/icons.js';

test('1. DocumentModel creation, unit conversions, and layer tree traversal', () => {
  const doc = createDocument({ width: 1920, height: 1080, dpi: 300, withSample: true });
  assert.equal(doc.canvas.width, 1920);
  assert.equal(doc.canvas.height, 1080);

  const a4Px = toPixels(210, 'mm', 300);
  assert.equal(a4Px, 2480);
  const backToMm = fromPixels(2480, 'mm', 300);
  assert.ok(Math.abs(backToMm - 210) < 0.1);

  const mem = estimateCanvasMemoryMB(1920, 1080, 8, 4);
  assert.ok(mem > 10 && mem < 200);

  const flat = flattenLayers(doc.rootGroup);
  assert.equal(flat.length, 2);
  const vecLayer = flat.find(l => l.layer.type === 'vector').layer;
  assert.ok(vecLayer.objects.length >= 5);

  const firstObj = vecLayer.objects[0];
  const foundObj = findObjectById(doc.rootGroup, firstObj.id);
  assert.ok(foundObj);
  assert.equal(foundObj.object.id, firstObj.id);
});

test('2. Non-destructive Vector Shape Path generation & Boolean operations', () => {
  const shapes = ['rect', 'rounded-rect', 'ellipse', 'polygon', 'star', 'line', 'arrow', 'arc', 'spiral', 'callout'];
  for (const kind of shapes) {
    const obj = createVectorObject(kind, { x: 50, y: 60, width: 120, height: 90, rx: 12, sides: 6 });
    const d = buildObjectPathD(obj);
    assert.ok(d.startsWith('M '), `Expected valid path d for ${kind}, got: ${d}`);
    const bounds = getObjectBounds(obj);
    assert.ok(bounds.width > 0 && bounds.height > 0);
  }

  const rawPts = [
    { x: 0, y: 0 }, { x: 10, y: 1 }, { x: 20, y: 0 }, { x: 50, y: 40 }, { x: 100, y: 100 }
  ];
  const nodes = simplifyAndSmoothPoints(rawPts, 3.0, 0.35);
  assert.ok(nodes.length >= 2 && nodes.length < rawPts.length);

  const star = createVectorObject('star', { x: 100, y: 100, width: 100, height: 100, sides: 5 });
  const asPath = convertObjectToPath(star);
  assert.equal(asPath.kind, 'path');
  assert.equal(asPath.nodes.length, 10);

  const offsetObj = offsetVectorObject(asPath, 10);
  assert.notEqual(offsetObj.id, asPath.id);

  const rectA = createVectorObject('rect', { x: 100, y: 100, width: 100, height: 100 });
  const rectB = createVectorObject('rect', { x: 150, y: 150, width: 100, height: 100 });
  for (const op of ['union', 'subtract', 'intersect', 'exclude']) {
    const boolObj = performBooleanOperation(rectA, rectB, op);
    assert.equal(boolObj.kind, 'path');
    assert.ok(boolObj.rawPathD.includes('M '));
  }
});

test('3. CommandManager Undo / Redo & History Arbitrary Jump', () => {
  const rasterStore = new RasterStore();
  const doc = createDocument({ withSample: false });
  const cm = new CommandManager(doc, rasterStore);

  const vecLayer = flattenLayers(doc.rootGroup).find(l => l.layer.type === 'vector').layer;
  assert.equal(vecLayer.objects.length, 0);

  const obj1 = createVectorObject('rect', { name: 'Box 1', x: 10, y: 10 });
  const obj2 = createVectorObject('ellipse', { name: 'Circle 2', x: 50, y: 50 });

  cm.execute(createAddObjectCommand(vecLayer.id, obj1));
  assert.equal(vecLayer.objects.length, 1);

  cm.execute(createAddObjectCommand(vecLayer.id, obj2));
  assert.equal(vecLayer.objects.length, 2);

  const beforeObj1 = structuredClone(vecLayer.objects[0]);
  const afterObj1 = structuredClone(vecLayer.objects[0]);
  afterObj1.x = 300;
  cm.execute(createUpdateObjectsCommand([beforeObj1], [afterObj1], 'Move Box 1'));
  assert.equal(vecLayer.objects[0].x, 300);

  cm.execute(createDeleteObjectsCommand([obj2.id], doc));
  assert.equal(vecLayer.objects.length, 1);

  cm.undo();
  assert.equal(vecLayer.objects.length, 2);

  cm.jumpTo(-1);
  assert.equal(vecLayer.objects.length, 0);

  cm.jumpTo(2);
  assert.equal(vecLayer.objects.length, 2);
  assert.equal(vecLayer.objects[0].x, 300);
});

test('4. Color Space Conversions (RGB <-> HSV <-> CMYK) & Gamut Warning', () => {
  const hsv = rgbToHsv(255, 0, 0);
  assert.equal(hsv.h, 0);
  assert.equal(hsv.s, 100);
  assert.equal(hsv.v, 100);

  const rgb = hsvToRgb(hsv.h, hsv.s, hsv.v);
  assert.deepEqual(rgb, { r: 255, g: 0, b: 0 });

  const cmyk = rgbToCmyk(0, 255, 255);
  assert.equal(cmyk.c, 100);
  assert.equal(cmyk.k, 0);
  const backRgb = cmykToRgb(cmyk.c, cmyk.m, cmyk.y, cmyk.k);
  assert.equal(backRgb.r, 0);
  assert.equal(backRgb.g, 255);

  const cmykGamut = checkColorGamut('#00ff00', 'CMYK');
  assert.equal(cmykGamut.outOfGamut, true);

  const grayGamut = checkColorGamut('#3b82f6', 'Grayscale');
  assert.equal(grayGamut.outOfGamut, true);
});

test('5. SVG Serialization & ZIP Workspace (.svgew) Round-Trip with Partial Recovery', async () => {
  const rasterStore = new RasterStore();
  const doc = createDocument({ title: 'TestProject', colorModel: 'CMYK', withSample: true });
  const { svgString, warnings } = serializeDocumentToSVG(doc, rasterStore, { optimize: true });

  assert.ok(svgString.includes('<svg xmlns="http://www.w3.org/2000/svg"'));
  assert.ok(svgString.includes('TestProject'));
  assert.ok(warnings.length > 0);

  const zipBytes = exportWorkspaceZip(doc, rasterStore);
  assert.ok(zipBytes.byteLength > 200);
  assert.equal(zipBytes[0], 0x50);
  assert.equal(zipBytes[1], 0x4b);

  const restored = await importWorkspaceZip(zipBytes, rasterStore);
  assert.equal(restored.doc.metadata.title, 'TestProject');
  assert.equal(restored.doc.canvas.width, doc.canvas.width);
});

test('6. Unified 24x24 Icon Catalog & Expanded Raster Presets Audit', () => {
  const entries = Object.entries(ICON_CATALOG);
  const reused = entries.filter(([, v]) => v.origin === 'reused');
  const newlyCreated = entries.filter(([, v]) => v.origin === 'new');

  assert.equal(reused.length, 6, 'Should contain 6 normalized reused icons from legacy');
  assert.ok(newlyCreated.length >= 55, 'Should contain 55+ newly created 24x24 icons');
  for (const [key, item] of entries) {
    assert.ok(item.body.includes('currentColor'), `Icon ${key} must use currentColor`);
  }

  assert.ok(Object.keys(RASTER_BRUSH_PRESETS).length >= 7, 'Should include expanded raster brush presets including oil paint');
});

test('7. Magnetic Snap Slider Math (15° Rotation & 5/10% Zoom Attraction Spots)', () => {
  // Rotation snaps to 15° increments (e.g. 14° -> 15°, -2° -> 0°, 43° -> 45°)
  const rot0 = applyMagneticSnap(-2.4, -180, 180, 'rotation', false);
  assert.equal(rot0.value, 0);
  assert.equal(rot0.snapped, true);

  const rot15 = applyMagneticSnap(14.2, -180, 180, 'rotation', false);
  assert.equal(rot15.value, 15);
  assert.equal(rot15.snapped, true);

  const rot45 = applyMagneticSnap(43.5, -180, 180, 'rotation', false);
  assert.equal(rot45.value, 45);
  assert.equal(rot45.snapped, true);

  // Zoom snaps to key spots (100%, 200%)
  const zoom100 = applyMagneticSnap(96, 10, 800, 'zoom', false);
  assert.equal(zoom100.value, 100);
  assert.equal(zoom100.snapped, true);

  // Fine adjustment with disableSnap = true does not snap
  const fine = applyMagneticSnap(13.7, -180, 180, 'rotation', true);
  assert.equal(fine.value, 13.7);
  assert.equal(fine.snapped, false);
});

test('8. Strict Cookie & Storage Consent Enforcement', async () => {
  setStorageConsent(false);
  assert.equal(hasStorageConsent(), false);

  // Saving preferences or autosave must return false and write nothing when consent is not granted
  const prefSaved = savePreferencesToStorage({ theme: 'light' });
  assert.equal(prefSaved, false);

  const doc = createDocument({ withSample: false });
  const autoSaved = await saveAutosaveSnapshot(doc, new RasterStore());
  assert.equal(autoSaved, false);
});
