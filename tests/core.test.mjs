/**
 * Automated Unit Tests for SVG Editor Studio Core Modules
 * Run via: node --test tests/core.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createDocument,
  createVectorLayer,
  createRasterLayer,
  createGroupLayer,
  createVectorObject,
  findLayerById,
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
  createUpdateObjectsCommand,
  createLayerTreeCommand
} from '../js/core/commands.js';
import {
  RasterStore
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
import { ICON_CATALOG } from '../js/ui/icons.js';

test('1. DocumentModel creation, unit conversions, and layer tree traversal', () => {
  const doc = createDocument({ width: 1920, height: 1080, dpi: 300, withSample: true });
  assert.equal(doc.canvas.width, 1920);
  assert.equal(doc.canvas.height, 1080);

  // Unit conversions (A4 210mm @ 300dpi = 2480px)
  const a4Px = toPixels(210, 'mm', 300);
  assert.equal(a4Px, 2480);
  const backToMm = fromPixels(2480, 'mm', 300);
  assert.ok(Math.abs(backToMm - 210) < 0.1);

  const mem = estimateCanvasMemoryMB(1920, 1080, 8, 4);
  assert.ok(mem > 10 && mem < 200);

  const flat = flattenLayers(doc.rootGroup);
  assert.equal(flat.length, 2); // 1 Vector + 1 Raster layer
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

  // Freehand Ramer-Douglas-Peucker simplification
  const rawPts = [
    { x: 0, y: 0 }, { x: 10, y: 1 }, { x: 20, y: 0 }, { x: 50, y: 40 }, { x: 100, y: 100 }
  ];
  const nodes = simplifyAndSmoothPoints(rawPts, 3.0, 0.35);
  assert.ok(nodes.length >= 2 && nodes.length < rawPts.length);

  // Convert shape to editable Bezier path & Offset
  const star = createVectorObject('star', { x: 100, y: 100, width: 100, height: 100, sides: 5 });
  const asPath = convertObjectToPath(star);
  assert.equal(asPath.kind, 'path');
  assert.equal(asPath.nodes.length, 10);

  const offsetObj = offsetVectorObject(asPath, 10);
  assert.notEqual(offsetObj.id, asPath.id);

  // Boolean Union / Subtract / Intersect / Exclude
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

  // Update object 1 position
  const beforeObj1 = structuredClone(vecLayer.objects[0]);
  const afterObj1 = structuredClone(vecLayer.objects[0]);
  afterObj1.x = 300;
  cm.execute(createUpdateObjectsCommand([beforeObj1], [afterObj1], 'Move Box 1'));
  assert.equal(vecLayer.objects[0].x, 300);

  // Delete object 2
  cm.execute(createDeleteObjectsCommand([obj2.id], doc));
  assert.equal(vecLayer.objects.length, 1);

  // Undo Delete -> obj2 returns
  cm.undo();
  assert.equal(vecLayer.objects.length, 2);

  // Jump back to initial state (-1)
  cm.jumpTo(-1);
  assert.equal(vecLayer.objects.length, 0);

  // Jump forward to step 2 (after Move Box 1)
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

  // Neon green should trigger out-of-gamut warning in CMYK and Grayscale documents
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
  assert.ok(warnings.length > 0); // CMYK conversion notice

  // Build .svgew ZIP archive and re-import it
  const zipBytes = exportWorkspaceZip(doc, rasterStore);
  assert.ok(zipBytes.byteLength > 200);
  // Check PK\x03\x04 ZIP header signature
  assert.equal(zipBytes[0], 0x50);
  assert.equal(zipBytes[1], 0x4b);

  const restored = await importWorkspaceZip(zipBytes, rasterStore);
  assert.equal(restored.doc.metadata.title, 'TestProject');
  assert.equal(restored.doc.canvas.width, doc.canvas.width);
});

test('6. Unified 24x24 Icon Catalog Audit (Reused vs New)', () => {
  const entries = Object.entries(ICON_CATALOG);
  const reused = entries.filter(([, v]) => v.origin === 'reused');
  const newlyCreated = entries.filter(([, v]) => v.origin === 'new');

  assert.equal(reused.length, 6, 'Should contain 6 normalized reused icons from legacy');
  assert.ok(newlyCreated.length >= 45, 'Should contain 45+ newly created 24x24 icons');
  for (const [key, item] of entries) {
    assert.ok(item.body.includes('currentColor'), `Icon ${key} must use currentColor`);
  }
});
