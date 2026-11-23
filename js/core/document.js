/**
 * Core Document Model & Presets (Single Source of Truth)
 * Pure JavaScript ES Module — Zero external dependencies
 */

let idCounter = 1;

/**
 * Generates a stable, unique prefixed ID
 * @param {string} prefix - e.g. 'doc', 'lyr', 'obj', 'grd', 'cmd'
 * @returns {string}
 */
export function createId(prefix = 'id') {
  const timePart = Date.now().toString(36);
  const randPart = Math.random().toString(36).slice(2, 7);
  const seqPart = (idCounter++).toString(36);
  return `${prefix}_${timePart}_${seqPart}${randPart}`;
}

/**
 * Deep clones any JSON-serializable object or layer tree
 * @template T
 * @param {T} obj
 * @returns {T}
 */
export function deepClone(obj) {
  if (typeof structuredClone === 'function') {
    return structuredClone(obj);
  }
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Unit conversion helpers (px, mm, cm, inch with DPI)
 */
export const UNIT_FACTORS_PER_INCH = {
  inch: 1,
  cm: 2.54,
  mm: 25.4
};

export function toPixels(value, unit, dpi = 300) {
  const num = Number(value) || 0;
  if (unit === 'px') return Math.round(num);
  const perInch = UNIT_FACTORS_PER_INCH[unit] || 25.4;
  return Math.max(1, Math.round((num / perInch) * dpi));
}

export function fromPixels(px, unit, dpi = 300) {
  const num = Number(px) || 0;
  if (unit === 'px') return Math.round(num);
  const perInch = UNIT_FACTORS_PER_INCH[unit] || 25.4;
  return Number(((num / dpi) * perInch).toFixed(2));
}

/**
 * Estimates memory footprint in MB for a given canvas configuration & layer count
 */
export function estimateCanvasMemoryMB(widthPx, heightPx, bitDepth = 8, expectedLayers = 4) {
  const bytesPerPixel = (bitDepth === 16 ? 8 : 4);
  const singleBufferBytes = widthPx * heightPx * bytesPerPixel;
  // Total = main composite + active raster buffers + undo tile buffer overhead
  const totalBytes = singleBufferBytes * (expectedLayers + 2);
  return Number((totalBytes / (1024 * 1024)).toFixed(1));
}

/**
 * Standard New Document Presets (Screen, Print ISO A/B, US, Textures)
 */
export const CANVAS_PRESETS = [
  { id: 'fhd', name: 'Full HD (1920×1080)', category: 'Screen', width: 1920, height: 1080, unit: 'px', dpi: 96, orientation: 'landscape' },
  { id: '4k', name: '4K UHD (3840×2160)', category: 'Screen', width: 3840, height: 2160, unit: 'px', dpi: 96, orientation: 'landscape' },
  { id: 'hd', name: 'HD (1280×720)', category: 'Screen', width: 1280, height: 720, unit: 'px', dpi: 72, orientation: 'landscape' },
  { id: 'sd', name: 'SD (854×480)', category: 'Screen', width: 854, height: 480, unit: 'px', dpi: 72, orientation: 'landscape' },
  { id: 'a3', name: 'A3 (297×420 mm)', category: 'Print', width: 297, height: 420, unit: 'mm', dpi: 300, orientation: 'portrait' },
  { id: 'a4', name: 'A4 (210×297 mm)', category: 'Print', width: 210, height: 297, unit: 'mm', dpi: 300, orientation: 'portrait' },
  { id: 'a5', name: 'A5 (148×210 mm)', category: 'Print', width: 148, height: 210, unit: 'mm', dpi: 300, orientation: 'portrait' },
  { id: 'a6', name: 'A6 (105×148 mm)', category: 'Print', width: 105, height: 148, unit: 'mm', dpi: 300, orientation: 'portrait' },
  { id: 'b3', name: 'B3 JIS (364×515 mm)', category: 'Print', width: 364, height: 515, unit: 'mm', dpi: 300, orientation: 'portrait' },
  { id: 'b4', name: 'B4 JIS (257×364 mm)', category: 'Print', width: 257, height: 364, unit: 'mm', dpi: 300, orientation: 'portrait' },
  { id: 'b5', name: 'B5 JIS (182×257 mm)', category: 'Print', width: 182, height: 257, unit: 'mm', dpi: 300, orientation: 'portrait' },
  { id: 'b6', name: 'B6 JIS (128×182 mm)', category: 'Print', width: 128, height: 182, unit: 'mm', dpi: 300, orientation: 'portrait' },
  { id: 'letter', name: 'US Letter (8.5×11 inch)', category: 'Print', width: 8.5, height: 11, unit: 'inch', dpi: 300, orientation: 'portrait' },
  { id: 'bizcard', name: 'Business Card 名刺 (91×55 mm)', category: 'Print', width: 91, height: 55, unit: 'mm', dpi: 300, orientation: 'landscape' },
  { id: 'tex512', name: 'Texture 512×512', category: 'Texture', width: 512, height: 512, unit: 'px', dpi: 72, orientation: 'portrait' },
  { id: 'tex1024', name: 'Texture 1024×1024', category: 'Texture', width: 1024, height: 1024, unit: 'px', dpi: 72, orientation: 'portrait' },
  { id: 'custom', name: 'Custom (カスタム)', category: 'Custom', width: 1200, height: 800, unit: 'px', dpi: 96, orientation: 'landscape' }
];

export function createDefaultTransform() {
  return {
    tx: 0,
    ty: 0,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    skewX: 0,
    skewY: 0,
    pivotX: 0,
    pivotY: 0
  };
}

export function createDefaultStyle(fillColor = '#3b82f6', strokeColor = '#1e293b', strokeWidth = 3) {
  return {
    fill: fillColor === 'none'
      ? { type: 'none', color: '#3b82f6', opacity: 1 }
      : { type: 'solid', color: fillColor, opacity: 1 },
    stroke: {
      type: strokeWidth > 0 && strokeColor !== 'none' ? 'solid' : 'none',
      color: strokeColor === 'none' ? '#1e293b' : strokeColor,
      width: strokeWidth,
      opacity: 1,
      align: 'center', // 'center' | 'inside' | 'outside'
      cap: 'round',    // 'butt' | 'round' | 'square'
      join: 'round',   // 'miter' | 'round' | 'bevel'
      dashArray: []
    },
    opacity: 1
  };
}

/**
 * Creates a Vector Layer
 */
export function createVectorLayer(name = 'ベクターレイヤー 1', objects = []) {
  return {
    id: createId('lyr_vec'),
    name,
    type: 'vector',
    visible: true,
    locked: false,
    opacity: 1,
    blendMode: 'normal',
    clipping: false,
    objects
  };
}

/**
 * Creates a Raster Layer
 */
export function createRasterLayer(name = 'ラスターレイヤー 1', width = 1200, height = 800, dpiScale = 1) {
  const assetId = createId('ras');
  return {
    id: createId('lyr_ras'),
    name,
    type: 'raster',
    visible: true,
    locked: false,
    opacity: 1,
    blendMode: 'normal',
    clipping: false,
    assetId,
    width: Math.round(width * dpiScale),
    height: Math.round(height * dpiScale),
    dpiScale
  };
}

/**
 * Creates a Group Layer (Folder)
 */
export function createGroupLayer(name = 'グループ 1', children = []) {
  return {
    id: createId('lyr_grp'),
    name,
    type: 'group',
    visible: true,
    locked: false,
    opacity: 1,
    blendMode: 'normal',
    clipping: false,
    expanded: true,
    children
  };
}

/**
 * Creates a Vector Object primitive or path
 */
export function createVectorObject(kind, props = {}) {
  const id = createId('obj');
  const defaultNames = {
    rect: '矩形',
    'rounded-rect': '角丸矩形',
    ellipse: '楕円',
    polygon: '多角形',
    star: '星',
    line: '直線',
    arrow: '矢印',
    arc: '円弧',
    spiral: 'スパイラル',
    callout: '吹き出し',
    path: 'ベジェパス',
    'brush-stroke': 'ブラシストローク',
    text: 'テキスト',
    image: '画像'
  };
  return {
    id,
    name: props.name || `${defaultNames[kind] || kind}`,
    kind,
    visible: true,
    locked: false,
    x: props.x ?? 100,
    y: props.y ?? 100,
    width: props.width ?? 160,
    height: props.height ?? 120,
    rx: props.rx ?? (kind === 'rounded-rect' ? 20 : 0),
    ry: props.ry ?? (kind === 'rounded-rect' ? 20 : 0),
    // Non-destructive shape parameters
    sides: props.sides ?? (kind === 'star' ? 5 : 6),
    innerRatio: props.innerRatio ?? 0.45,
    startAngle: props.startAngle ?? 0,
    endAngle: props.endAngle ?? 270,
    turns: props.turns ?? 3,
    headSize: props.headSize ?? 24,
    tailX: props.tailX ?? 0.3,
    tailY: props.tailY ?? 1.25,
    // Line / endpoints
    x1: props.x1 ?? 100,
    y1: props.y1 ?? 100,
    x2: props.x2 ?? 260,
    y2: props.y2 ?? 200,
    // Bezier Path nodes: [{ x, y, inX, inY, outX, outY, smooth }]
    nodes: props.nodes ?? [],
    closed: props.closed ?? false,
    rawPathD: props.rawPathD ?? '',
    // Vector Brush points: [{ x, y, pressure, tiltX, tiltY }]
    points: props.points ?? [],
    brushSize: props.brushSize ?? 12,
    taperStart: props.taperStart ?? 0.25,
    taperEnd: props.taperEnd ?? 0.25,
    // Text properties
    text: props.text ?? 'テキストを入力',
    fontFamily: props.fontFamily ?? '"Noto Sans JP", "Hiragino Sans", "Segoe UI", sans-serif',
    fontSize: props.fontSize ?? 36,
    fontWeight: props.fontWeight ?? '700',
    lineHeight: props.lineHeight ?? 1.3,
    letterSpacing: props.letterSpacing ?? 0,
    textAlign: props.textAlign ?? 'left',
    vertical: props.vertical ?? false,
    pathId: props.pathId ?? null,
    // Image properties
    href: props.href ?? '',
    // Transform & Style
    transform: props.transform ? { ...createDefaultTransform(), ...props.transform } : createDefaultTransform(),
    style: props.style ? deepClone(props.style) : createDefaultStyle('#3b82f6', '#1e293b', 3),
    warp: props.warp ?? null
  };
}

/**
 * Creates a complete DocumentModel with sample starter artwork or clean canvas
 */
export function createDocument(options = {}) {
  const width = options.width || 1200;
  const height = options.height || 800;
  const vecLayer = createVectorLayer('ベクターレイヤー 1');
  const rasLayer = createRasterLayer('ラスターレイヤー 1', width, height, 1);

  if (options.withSample !== false) {
    // Starter artwork so the user can immediately touch, drag, transform, or draw
    vecLayer.objects.push(
      createVectorObject('rounded-rect', {
        name: 'ウェルカムカード',
        x: 140,
        y: 120,
        width: 320,
        height: 200,
        rx: 24,
        ry: 24,
        style: {
          fill: { type: 'gradient', gradientId: 'grad_default_sky', color: '#3b82f6', opacity: 1 },
          stroke: { type: 'solid', color: '#1d4ed8', width: 3, opacity: 1, align: 'center', cap: 'round', join: 'round', dashArray: [] },
          opacity: 1
        }
      }),
      createVectorObject('star', {
        name: 'アクセントスター',
        x: 540,
        y: 110,
        width: 170,
        height: 170,
        sides: 5,
        innerRatio: 0.45,
        style: createDefaultStyle('#f59e0b', '#b45309', 3)
      }),
      createVectorObject('callout', {
        name: '吹き出し',
        x: 760,
        y: 130,
        width: 280,
        height: 150,
        rx: 18,
        tailX: 0.25,
        tailY: 1.28,
        style: createDefaultStyle('#ffffff', '#334155', 3)
      }),
      createVectorObject('text', {
        name: 'タイトルテキスト',
        x: 175,
        y: 235,
        width: 260,
        height: 60,
        text: 'SVG Studio',
        fontSize: 42,
        fontWeight: '700',
        style: createDefaultStyle('#ffffff', 'none', 0)
      }),
      createVectorObject('text', {
        name: '吹き出しテキスト',
        x: 790,
        y: 215,
        width: 220,
        height: 45,
        text: '直感ベクター描画！',
        fontSize: 22,
        fontWeight: '700',
        style: createDefaultStyle('#0f172a', 'none', 0)
      })
    );
  }

  return {
    id: createId('doc'),
    schemaVersion: 1,
    metadata: {
      title: options.title || '無題のイラスト',
      author: options.author || 'MotoYucchi',
      license: options.license || 'CC BY 4.0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    canvas: {
      width,
      height,
      unit: options.unit || 'px',
      dpi: options.dpi || 96,
      orientation: width >= height ? 'landscape' : 'portrait',
      colorModel: options.colorModel || 'RGB',
      bitDepth: options.bitDepth || 8,
      colorProfile: options.colorProfile || 'sRGB',
      background: {
        type: options.bgType || 'white', // 'transparent' | 'white' | 'solid'
        color: options.bgColor || '#ffffff'
      }
    },
    rootGroup: {
      id: 'root_group',
      name: 'Root',
      type: 'group',
      visible: true,
      locked: false,
      opacity: 1,
      blendMode: 'normal',
      clipping: false,
      expanded: true,
      // Stored bottom-to-top in render order (UI displays top-to-bottom like Clip Studio)
      children: [rasLayer, vecLayer]
    },
    guides: [
      // { id, axis: 'h'|'v', position: number, color: '#06b6d4', locked: false }
    ],
    grid: {
      enabled: false,
      size: 50,
      subdivisions: 5,
      snap: false
    },
    ruler: {
      visible: true,
      originX: 0,
      originY: 0,
      snapToGuides: true,
      smartGuides: true
    },
    defs: {
      gradients: [
        {
          id: 'grad_default_sky',
          name: 'スカイブルー',
          type: 'linear', // 'linear' | 'radial' | 'conic'
          x1: 0, y1: 0, x2: 1, y2: 1,
          stops: [
            { offset: 0, color: '#2563eb', opacity: 1 },
            { offset: 1, color: '#06b6d4', opacity: 1 }
          ]
        },
        {
          id: 'grad_sunset',
          name: 'サンセット',
          type: 'linear',
          x1: 0, y1: 0, x2: 1, y2: 1,
          stops: [
            { offset: 0, color: '#f97316', opacity: 1 },
            { offset: 0.5, color: '#ec4899', opacity: 1 },
            { offset: 1, color: '#8b5cf6', opacity: 1 }
          ]
        }
      ],
      patterns: [
        { id: 'pat_dots', name: 'ドットパターン', type: 'dots', spacing: 16, size: 3, color: '#334155' },
        { id: 'pat_stripes', name: 'ストライプ', type: 'stripes', spacing: 14, size: 4, color: '#3b82f6' },
        { id: 'pat_grid', name: 'クロスグリッド', type: 'grid', spacing: 20, size: 1.5, color: '#64748b' }
      ]
    },
    swatches: [
      '#0f172a', '#334155', '#64748b', '#94a3b8', '#ffffff',
      '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
      '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
      '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#ec4899'
    ]
  };
}

/**
 * Layer Tree Traversal Utilities
 */
export function findLayerById(rootGroup, layerId, parent = null) {
  if (!rootGroup) return null;
  if (rootGroup.id === layerId) return { layer: rootGroup, parent, index: -1 };
  const children = rootGroup.children || [];
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (child.id === layerId) {
      return { layer: child, parent: rootGroup, index: i };
    }
    if (child.type === 'group') {
      const found = findLayerById(child, layerId, child);
      if (found) return found;
    }
  }
  return null;
}

export function flattenLayers(group = null, depth = 0, parentVisible = true, parentLocked = false) {
  if (!group || !group.children) return [];
  const result = [];
  // Iterate in UI order (top-most layer first = end of children array first)
  for (let i = group.children.length - 1; i >= 0; i--) {
    const child = group.children[i];
    const effectiveVisible = parentVisible && child.visible;
    const effectiveLocked = parentLocked || child.locked;
    result.push({
      layer: child,
      parent: group,
      index: i,
      depth,
      effectiveVisible,
      effectiveLocked
    });
    if (child.type === 'group') {
      result.push(...flattenLayers(child, depth + 1, effectiveVisible, effectiveLocked));
    }
  }
  return result;
}

export function findObjectById(rootGroup, objectId) {
  if (!rootGroup || !rootGroup.children) return null;
  for (const child of rootGroup.children) {
    if (child.type === 'vector') {
      const idx = child.objects.findIndex(o => o.id === objectId);
      if (idx !== -1) {
        return { object: child.objects[idx], layer: child, index: idx };
      }
    } else if (child.type === 'group') {
      const found = findObjectById(child, objectId);
      if (found) return found;
    }
  }
  return null;
}
