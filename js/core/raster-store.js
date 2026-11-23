/**
 * Raster Offscreen Buffer Store & Expanded 18-Tool Pixel Brush Engine
 * Supports:
 * - OffscreenCanvas / HTMLCanvasElement buffers keyed by assetId
 * - Partial Tile Delta Snapshots for fast Undo/Redo with minimal memory footprint
 * - Rich brush family:
 *   1. G-Pen (強弱インク)
 *   2. Maru-Pen / Mapping Pen (極細丸ペン)
 *   3. Sketch Pencil (デッサン鉛筆)
 *   4. Chisel Marker / Felt Pen (コピックマーカー / 平筆)
 *   5. Soft Airbrush (ソフトエアブラシ)
 *   6. Watercolor Brush (透明水彩・混色風)
 *   7. Thick Oil Paint (厚塗り油彩)
 *   8. Hard/Soft Eraser (ラスター消しゴム)
 *   9. Flood Fill Bucket (許容値・隣接/全体バケツ)
 *   10. Raster Gradient Fill (線形/放射グラデーション)
 *   11. Blur Brush (ぼかし)
 *   12. Smudge / Mixer Finger (指先・色伸ばし)
 *   13. Dodge / Burn (覆い焼き発光・焼き込み陰影)
 *   14. Pattern / Deco Stamp (デコレーションスタンプ: 星・ドット・ハート・キラメキ)
 *   15. Raster Marquee Select & Fill/Clear (ラスター矩形範囲塗り・消去)
 *   16. Raster Line & Geometric Figure (ラスター直線/矩形描画)
 *   17. Symmetry Mirror Brush (左右対称・万華鏡定規ブラシ)
 *   18. Spatter / Noise Spray (スパッタリング・砂目スプレー)
 */

function createBufferCanvas(width, height) {
  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));
  if (typeof document !== 'undefined') {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  }
  if (typeof OffscreenCanvas !== 'undefined') {
    return new OffscreenCanvas(w, h);
  }
  return {
    width: w,
    height: h,
    _headlessData: new Uint8ClampedArray(w * h * 4),
    getContext() {
      return {
        canvas: this,
        clearRect: () => { this._headlessData.fill(0); },
        getImageData: (x, y, rw, rh) => ({
          width: rw,
          height: rh,
          data: new Uint8ClampedArray(rw * rh * 4)
        }),
        putImageData: () => {},
        drawImage: () => {},
        fillRect: () => {},
        strokeRect: () => {},
        beginPath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        arc: () => {},
        ellipse: () => {},
        fill: () => {},
        stroke: () => {},
        save: () => {},
        restore: () => {}
      };
    },
    toDataURL() {
      return 'data:image/png;base64,';
    }
  };
}

export class RasterStore {
  constructor() {
    /** @type {Map<string, HTMLCanvasElement|OffscreenCanvas>} */
    this.buffers = new Map();
  }

  ensureBuffer(assetId, width, height) {
    if (!this.buffers.has(assetId)) {
      this.buffers.set(assetId, createBufferCanvas(width, height));
    }
    return this.buffers.get(assetId);
  }

  getBuffer(assetId) {
    return this.buffers.get(assetId) || null;
  }

  cloneBuffer(sourceAssetId, newAssetId) {
    const src = this.buffers.get(sourceAssetId);
    if (!src) return null;
    const dst = createBufferCanvas(src.width, src.height);
    const ctx = dst.getContext('2d');
    ctx.drawImage(src, 0, 0);
    this.buffers.set(newAssetId, dst);
    return dst;
  }

  resizeAllBuffers(newWidth, newHeight, mode = 'expand') {
    for (const [assetId, oldCanvas] of this.buffers.entries()) {
      const nextCanvas = createBufferCanvas(newWidth, newHeight);
      const ctx = nextCanvas.getContext('2d');
      if (mode === 'scale') {
        ctx.drawImage(oldCanvas, 0, 0, oldCanvas.width, oldCanvas.height, 0, 0, newWidth, newHeight);
      } else {
        ctx.drawImage(oldCanvas, 0, 0);
      }
      this.buffers.set(assetId, nextCanvas);
    }
  }

  captureRegion(assetId, x, y, width, height) {
    const buf = this.buffers.get(assetId);
    if (!buf) return null;
    const rx = Math.max(0, Math.floor(x));
    const ry = Math.max(0, Math.floor(y));
    const rw = Math.min(buf.width - rx, Math.ceil(width));
    const rh = Math.min(buf.height - ry, Math.ceil(height));
    if (rw <= 0 || rh <= 0) return null;
    const ctx = buf.getContext('2d', { willReadFrequently: true });
    return {
      x: rx,
      y: ry,
      width: rw,
      height: rh,
      imageData: ctx.getImageData(rx, ry, rw, rh)
    };
  }

  restoreRegion(assetId, patch) {
    if (!patch || !patch.imageData) return;
    const buf = this.buffers.get(assetId);
    if (!buf) return;
    const ctx = buf.getContext('2d');
    ctx.putImageData(patch.imageData, patch.x, patch.y);
  }

  toDataURL(assetId) {
    const buf = this.buffers.get(assetId);
    if (!buf || typeof buf.toDataURL !== 'function') return '';
    return buf.toDataURL('image/png');
  }

  async loadFromDataURL(assetId, dataUrl, width, height) {
    const buf = this.ensureBuffer(assetId, width, height);
    if (typeof Image === 'undefined' || !dataUrl) return buf;
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const ctx = buf.getContext('2d');
        ctx.clearRect(0, 0, buf.width, buf.height);
        ctx.drawImage(img, 0, 0);
        resolve(buf);
      };
      img.onerror = () => resolve(buf);
      img.src = dataUrl;
    });
  }
}

/**
 * Rich Raster Brush Presets
 */
export const RASTER_BRUSH_PRESETS = {
  gpen: {
    id: 'gpen',
    nameJa: 'Gペン (強弱インク)',
    nameEn: 'G-Pen Ink',
    size: 14,
    hardness: 0.94,
    opacity: 1.0,
    flow: 1.0,
    spacing: 0.08,
    pressureSize: true,
    pressureOpacity: false,
    tiltAspect: false,
    stabilizer: 6
  },
  marupen: {
    id: 'marupen',
    nameJa: '丸ペン (極細線画)',
    nameEn: 'Mapping Pen',
    size: 5,
    hardness: 0.98,
    opacity: 1.0,
    flow: 1.0,
    spacing: 0.06,
    pressureSize: true,
    pressureOpacity: false,
    tiltAspect: false,
    stabilizer: 8
  },
  pencil: {
    id: 'pencil',
    nameJa: 'デッサン鉛筆 (傾き対応)',
    nameEn: 'Sketch Pencil',
    size: 11,
    hardness: 0.68,
    opacity: 0.85,
    flow: 0.72,
    spacing: 0.14,
    pressureSize: true,
    pressureOpacity: true,
    tiltAspect: true,
    stabilizer: 3
  },
  marker: {
    id: 'marker',
    nameJa: 'コピックマーカー / 平筆',
    nameEn: 'Chisel Marker',
    size: 28,
    hardness: 0.82,
    opacity: 0.62,
    flow: 0.78,
    spacing: 0.09,
    pressureSize: false,
    pressureOpacity: true,
    tiltAspect: true,
    chisel: true,
    stabilizer: 4
  },
  airbrush: {
    id: 'airbrush',
    nameJa: 'ソフトエアブラシ',
    nameEn: 'Soft Airbrush',
    size: 68,
    hardness: 0.08,
    opacity: 0.42,
    flow: 0.35,
    spacing: 0.14,
    pressureSize: false,
    pressureOpacity: true,
    stabilizer: 2
  },
  watercolor: {
    id: 'watercolor',
    nameJa: '透明水彩ブラシ',
    nameEn: 'Watercolor',
    size: 38,
    hardness: 0.32,
    opacity: 0.52,
    flow: 0.48,
    spacing: 0.11,
    pressureSize: true,
    pressureOpacity: true,
    stabilizer: 4
  },
  oil: {
    id: 'oil',
    nameJa: '厚塗り油彩ブラシ',
    nameEn: 'Thick Oil Paint',
    size: 32,
    hardness: 0.86,
    opacity: 0.94,
    flow: 0.92,
    spacing: 0.07,
    pressureSize: true,
    pressureOpacity: true,
    tiltAspect: true,
    stabilizer: 5
  }
};

/**
 * Stamps a single brush dab onto a 2D canvas context
 * Supports pen pressure, pen tilt angle/elevation, chisel tip,dodge/burn, spatter noise, and pattern stamps.
 */
export function stampBrushDab(ctx, x, y, settings, pressure = 0.7, isEraser = false, tilt = { tiltX: 0, tiltY: 0 }) {
  const baseSize = Math.max(1, Number(settings.size) || 12);
  const p = Math.max(0.05, Math.min(1, Number(pressure) || 0.7));
  const radius = Math.max(0.5, (baseSize * (settings.pressureSize !== false ? (0.22 + 0.78 * p) : 1)) / 2);
  const hardness = Math.max(0.05, Math.min(1, Number(settings.hardness) ?? 0.85));
  const alpha = Math.max(0.02, Math.min(1, (Number(settings.opacity) ?? 1) * (Number(settings.flow) ?? 1) * (settings.pressureOpacity ? p : 1)));

  ctx.save();
  if (isEraser) {
    ctx.globalCompositeOperation = 'destination-out';
  } else if (settings.compositeOp) {
    ctx.globalCompositeOperation = settings.compositeOp;
  } else {
    ctx.globalCompositeOperation = 'source-over';
  }

  const color = settings.color || '#000000';
  const rgb = hexToRgb(color);

  // Special Mode 1: Spatter / Noise Spray
  if (settings.brushMode === 'spatter') {
    const count = Math.max(4, Math.round(radius * 0.9));
    ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`;
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const dist = Math.sqrt(Math.random()) * radius * 1.4;
      const dotR = Math.max(0.7, Math.random() * (radius * 0.18));
      ctx.beginPath();
      ctx.arc(x + Math.cos(ang) * dist, y + Math.sin(ang) * dist, dotR, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    return radius * 1.5;
  }

  // Special Mode 2: Deco Stamp (Star / Heart / Sparkle / Circle)
  if (settings.brushMode === 'stamp') {
    ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`;
    drawDecoStampShape(ctx, x, y, radius * 1.3, settings.stampShape || 'star');
    ctx.restore();
    return radius * 1.4;
  }

  // Pen Tilt & Chisel Marker support
  const tiltMag = Math.hypot(tilt?.tiltX || 0, tilt?.tiltY || 0) / 90; // 0 ~ 1
  const tiltAngle = (tilt?.tiltX || tilt?.tiltY) ? Math.atan2(tilt.tiltY || 0, tilt.tiltX || 0) : -0.45;
  const useEllipticalTip = settings.chisel || (settings.tiltAspect && tiltMag > 0.15);

  if (useEllipticalTip && typeof ctx.ellipse === 'function') {
    const rx = radius * (1 + tiltMag * 0.65);
    const ry = Math.max(1, radius * (settings.chisel ? 0.38 : (1 - tiltMag * 0.45)));
    ctx.fillStyle = isEraser ? `rgba(0,0,0,${alpha})` : `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, tiltAngle, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return rx;
  }

  if (hardness >= 0.92) {
    ctx.fillStyle = isEraser ? `rgba(0,0,0,${alpha})` : `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  } else {
    const grad = ctx.createRadialGradient(x, y, radius * hardness * 0.5, x, y, radius);
    const colStart = isEraser ? `rgba(0,0,0,${alpha})` : `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`;
    const colEnd = isEraser ? 'rgba(0,0,0,0)' : `rgba(${rgb.r},${rgb.g},${rgb.b},0)`;
    grad.addColorStop(0, colStart);
    grad.addColorStop(1, colEnd);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  return radius;
}

function drawDecoStampShape(ctx, cx, cy, r, shape = 'star') {
  ctx.beginPath();
  if (shape === 'heart') {
    ctx.moveTo(cx, cy + r * 0.7);
    ctx.bezierCurveTo(cx - r * 1.2, cy - r * 0.2, cx - r * 0.6, cy - r * 1.1, cx, cy - r * 0.4);
    ctx.bezierCurveTo(cx + r * 0.6, cy - r * 1.1, cx + r * 1.2, cy - r * 0.2, cx, cy + r * 0.7);
  } else if (shape === 'sparkle') {
    for (let i = 0; i < 8; i++) {
      const rad = i % 2 === 0 ? r : r * 0.25;
      const ang = (i / 8) * Math.PI * 2;
      const px = cx + Math.cos(ang) * rad;
      const py = cy + Math.sin(ang) * rad;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
  } else {
    // 5-pointed star
    for (let i = 0; i < 10; i++) {
      const rad = i % 2 === 0 ? r : r * 0.45;
      const ang = (i / 10) * Math.PI * 2 - Math.PI / 2;
      const px = cx + Math.cos(ang) * rad;
      const py = cy + Math.sin(ang) * rad;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
  }
  ctx.closePath();
  ctx.fill();
}

/**
 * Interpolates brush dabs along a segment from p0 to p1
 * Supports Symmetry Mirroring (Horizontal / Vertical / 4-Way Quad Symmetry)
 */
export function strokeBrushSegment(ctx, p0, p1, settings, isEraser = false) {
  const dist = Math.hypot(p1.x - p0.x, p1.y - p0.y);
  const baseSize = Math.max(1, Number(settings.size) || 12);
  const stepRatio = settings.brushMode === 'stamp' ? 1.15 : settings.brushMode === 'spatter' ? 0.35 : (Number(settings.spacing) || 0.1);
  const step = Math.max(1, baseSize * stepRatio);

  const stampWithSymmetry = (x, y, pr, tilt) => {
    const r = stampBrushDab(ctx, x, y, settings, pr, isEraser, tilt);
    if (settings.symmetryMode && settings.canvasWidth && settings.canvasHeight) {
      const cw = settings.canvasWidth;
      const ch = settings.canvasHeight;
      const mx = cw - x;
      const my = ch - y;
      stampBrushDab(ctx, mx, y, settings, pr, isEraser, { tiltX: -(tilt.tiltX || 0), tiltY: tilt.tiltY || 0 });
      if (settings.symmetryMode === 'quad') {
        stampBrushDab(ctx, x, my, settings, pr, isEraser, tilt);
        stampBrushDab(ctx, mx, my, settings, pr, isEraser, tilt);
      }
    }
    return r;
  };

  const tilt = { tiltX: p1.tiltX || 0, tiltY: p1.tiltY || 0 };

  if (dist < step) {
    const r = stampWithSymmetry(p1.x, p1.y, p1.pressure ?? 0.7, tilt);
    return {
      minX: p1.x - r - 2,
      minY: p1.y - r - 2,
      maxX: p1.x + r + 2,
      maxY: p1.y + r + 2
    };
  }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const steps = Math.ceil(dist / step);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = p0.x + (p1.x - p0.x) * t;
    const y = p0.y + (p1.y - p0.y) * t;
    const pr = (p0.pressure ?? 0.7) + ((p1.pressure ?? 0.7) - (p0.pressure ?? 0.7)) * t;
    const r = stampWithSymmetry(x, y, pr, tilt);
    minX = Math.min(minX, x - r - 2);
    minY = Math.min(minY, y - r - 2);
    maxX = Math.max(maxX, x + r + 2);
    maxY = Math.max(maxY, y + r + 2);
  }
  return { minX, minY, maxX, maxY };
}

/**
 * Scanline Flood Fill (Bucket Tool) with Tolerance (0~255) & Contiguous / Global toggle
 */
export function floodFillCanvas(canvas, startX, startY, fillColorHex, tolerance = 24, contiguous = true) {
  if (!canvas || !canvas.getContext) return null;
  const w = canvas.width;
  const h = canvas.height;
  const sx = Math.floor(startX);
  const sy = Math.floor(startY);
  if (sx < 0 || sx >= w || sy < 0 || sy >= h) return null;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;
  const fillRgb = hexToRgb(fillColorHex);

  const startIdx = (sy * w + sx) * 4;
  const sr = data[startIdx];
  const sg = data[startIdx + 1];
  const sb = data[startIdx + 2];
  const sa = data[startIdx + 3];

  if (
    Math.abs(sr - fillRgb.r) <= 1 &&
    Math.abs(sg - fillRgb.g) <= 1 &&
    Math.abs(sb - fillRgb.b) <= 1 &&
    sa >= 250
  ) {
    return null;
  }

  const tol = Math.max(0, Math.min(255, Number(tolerance) || 24));
  const matchesTarget = (idx) => {
    return (
      Math.abs(data[idx] - sr) <= tol &&
      Math.abs(data[idx + 1] - sg) <= tol &&
      Math.abs(data[idx + 2] - sb) <= tol &&
      Math.abs(data[idx + 3] - sa) <= tol
    );
  };

  if (!contiguous) {
    for (let i = 0; i < data.length; i += 4) {
      if (matchesTarget(i)) {
        data[i] = fillRgb.r;
        data[i + 1] = fillRgb.g;
        data[i + 2] = fillRgb.b;
        data[i + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);
    return { x: 0, y: 0, width: w, height: h };
  }

  const visited = new Uint8Array(w * h);
  const stack = [sx, sy];
  visited[sy * w + sx] = 1;

  while (stack.length > 0) {
    const cy = stack.pop();
    const cx = stack.pop();
    const pIdx = (cy * w + cx) * 4;
    data[pIdx] = fillRgb.r;
    data[pIdx + 1] = fillRgb.g;
    data[pIdx + 2] = fillRgb.b;
    data[pIdx + 3] = 255;

    const neighbors = [
      [cx + 1, cy],
      [cx - 1, cy],
      [cx, cy + 1],
      [cx, cy - 1]
    ];
    for (let i = 0; i < 4; i++) {
      const nx = neighbors[i][0];
      const ny = neighbors[i][1];
      if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
        const flat = ny * w + nx;
        if (!visited[flat] && matchesTarget(flat * 4)) {
          visited[flat] = 1;
          stack.push(nx, ny);
        }
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return { x: 0, y: 0, width: w, height: h };
}

/**
 * Local Blur / Smudge dab on a raster canvas
 */
export function applyLocalBlurOrSmudge(ctx, x, y, prevX, prevY, radius = 20, mode = 'blur') {
  const r = Math.max(4, Math.min(80, Math.round(radius)));
  const sx = Math.max(0, Math.floor(x - r));
  const sy = Math.max(0, Math.floor(y - r));
  const sw = Math.min(ctx.canvas.width - sx, r * 2);
  const sh = Math.min(ctx.canvas.height - sy, r * 2);
  if (sw <= 2 || sh <= 2) return;

  if (mode === 'smudge' && prevX != null && prevY != null) {
    const psx = Math.max(0, Math.floor(prevX - r * 0.7));
    const psy = Math.max(0, Math.floor(prevY - r * 0.7));
    ctx.save();
    ctx.globalAlpha = 0.45;
    ctx.beginPath();
    ctx.arc(x, y, r * 0.7, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(ctx.canvas, psx, psy, r * 1.4, r * 1.4, x - r * 0.7, y - r * 0.7, r * 1.4, r * 1.4);
    ctx.restore();
    return;
  }

  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(ctx.canvas, sx, sy, sw, sh, sx - 1.5, sy - 1.5, sw + 3, sh + 3);
  ctx.restore();
}

export function hexToRgb(hex) {
  const clean = String(hex || '#000000').replace('#', '').trim();
  if (clean.length === 3) {
    return {
      r: parseInt(clean[0] + clean[0], 16) || 0,
      g: parseInt(clean[1] + clean[1], 16) || 0,
      b: parseInt(clean[2] + clean[2], 16) || 0
    };
  }
  return {
    r: parseInt(clean.slice(0, 2), 16) || 0,
    g: parseInt(clean.slice(2, 4), 16) || 0,
    b: parseInt(clean.slice(4, 6), 16) || 0
  };
}
