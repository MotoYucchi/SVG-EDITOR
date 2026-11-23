/**
 * Hybrid Vector + Raster 60fps Canvas Renderer, Layer Rasterizer,
 * SVG Serializer/Sanitizer, and Native ZIP Workspace Archive (.svgew) Engine
 */

import {
  createId,
  createRasterLayer,
  createVectorLayer,
  createGroupLayer,
  createVectorObject,
  createDefaultStyle,
  deepClone,
  findObjectById
} from './document.js';
import {
  buildObjectPathD,
  getObjectBounds,
  f,
  DEG_TO_RAD
} from './geometry.js';

/**
 * Maps document blend modes to Canvas 2D globalCompositeOperation
 */
const BLEND_MODE_MAP = {
  normal: 'source-over',
  multiply: 'multiply',
  screen: 'screen',
  overlay: 'overlay',
  darken: 'darken',
  lighten: 'lighten',
  'color-dodge': 'color-dodge',
  'color-burn': 'color-burn',
  'hard-light': 'hard-light',
  'soft-light': 'soft-light',
  difference: 'difference',
  exclusion: 'exclusion'
};

/**
 * Renders a single VectorObject onto a 2D Canvas Context with full resolution independence
 */
export function drawVectorObjectToContext(ctx, obj, doc, imageCache = null) {
  if (!obj || !obj.visible) return;
  const b = getObjectBounds(obj);
  const tr = obj.transform || { tx: 0, ty: 0, rotation: 0, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0, pivotX: 0, pivotY: 0 };
  const style = obj.style || createDefaultStyle();

  ctx.save();
  ctx.globalAlpha *= (style.opacity ?? 1);

  // Apply 2D Transform around object center + pivot
  const pivotWorldX = b.cx + (Number(tr.pivotX) || 0);
  const pivotWorldY = b.cy + (Number(tr.pivotY) || 0);
  ctx.translate(pivotWorldX, pivotWorldY);
  if (tr.rotation) {
    ctx.rotate(Number(tr.rotation) * DEG_TO_RAD);
  }
  if ((tr.scaleX && tr.scaleX !== 1) || (tr.scaleY && tr.scaleY !== 1)) {
    ctx.scale(Number(tr.scaleX) || 1, Number(tr.scaleY) || 1);
  }
  if (tr.skewX || tr.skewY) {
    ctx.transform(
      1,
      Math.tan((Number(tr.skewY) || 0) * DEG_TO_RAD),
      Math.tan((Number(tr.skewX) || 0) * DEG_TO_RAD),
      1,
      0,
      0
    );
  }
  ctx.translate(-pivotWorldX + (Number(tr.tx) || 0), -pivotWorldY + (Number(tr.ty) || 0));

  // Resolve Fill Paint
  const fillPaint = resolvePaintStyle(ctx, style.fill, b, doc);
  // Resolve Stroke Paint
  const strokePaint = resolveStrokeStyle(ctx, style.stroke, b, doc);

  if (obj.kind === 'text') {
    drawTextObject(ctx, obj, fillPaint, strokePaint, style, doc);
    ctx.restore();
    return;
  }

  if (obj.kind === 'image' && obj.href) {
    if (imageCache && imageCache.has(obj.href)) {
      const imgEl = imageCache.get(obj.href);
      if (imgEl.complete && imgEl.naturalWidth > 0) {
        ctx.drawImage(imgEl, obj.x, obj.y, obj.width, obj.height);
      }
    } else if (imageCache && typeof Image !== 'undefined') {
      const imgEl = new Image();
      imgEl.src = obj.href;
      imageCache.set(obj.href, imgEl);
    }
    ctx.restore();
    return;
  }

  const d = buildObjectPathD(obj);
  if (!d || typeof Path2D === 'undefined') {
    ctx.restore();
    return;
  }

  const path2d = new Path2D(d);

  // Brush-stroke uses its fill color as the stroke body
  if (obj.kind === 'brush-stroke') {
    ctx.fillStyle = fillPaint || (style.stroke?.color) || '#1e293b';
    ctx.fill(path2d);
    ctx.restore();
    return;
  }

  if (fillPaint && obj.kind !== 'line' && obj.kind !== 'spiral') {
    ctx.save();
    ctx.globalAlpha *= (style.fill?.opacity ?? 1);
    ctx.fillStyle = fillPaint;
    ctx.fill(path2d, obj.fillRule || 'nonzero');
    ctx.restore();
  }

  if (strokePaint && (Number(style.stroke?.width) || 0) > 0) {
    ctx.save();
    ctx.globalAlpha *= (style.stroke?.opacity ?? 1);
    ctx.strokeStyle = strokePaint;
    ctx.lineWidth = Number(style.stroke.width) || 1;
    ctx.lineCap = style.stroke.cap || 'round';
    ctx.lineJoin = style.stroke.join || 'round';
    if (style.stroke.dashArray && style.stroke.dashArray.length > 0) {
      ctx.setLineDash(style.stroke.dashArray);
    }
    if (style.stroke.align === 'inside' && fillPaint) {
      ctx.clip(path2d);
      ctx.lineWidth *= 2;
    }
    ctx.stroke(path2d);
    ctx.restore();
  }

  ctx.restore();
}

function resolvePaintStyle(ctx, fill, bounds, doc) {
  if (!fill || fill.type === 'none') return null;
  if (fill.type === 'solid') return fill.color || '#3b82f6';
  if (fill.type === 'gradient' && doc?.defs?.gradients) {
    const gDef = doc.defs.gradients.find(g => g.id === fill.gradientId) || doc.defs.gradients[0];
    if (!gDef) return fill.color || '#3b82f6';
    let grad;
    if (gDef.type === 'radial') {
      const r = Math.max(bounds.width, bounds.height) * 0.65;
      grad = ctx.createRadialGradient(bounds.cx, bounds.cy, 2, bounds.cx, bounds.cy, r);
    } else if (gDef.type === 'conic' && typeof ctx.createConicGradient === 'function') {
      grad = ctx.createConicGradient(0, bounds.cx, bounds.cy);
    } else {
      grad = ctx.createLinearGradient(
        bounds.x + bounds.width * (gDef.x1 ?? 0),
        bounds.y + bounds.height * (gDef.y1 ?? 0),
        bounds.x + bounds.width * (gDef.x2 ?? 1),
        bounds.y + bounds.height * (gDef.y2 ?? 1)
      );
    }
    for (const stop of gDef.stops || []) {
      grad.addColorStop(Math.max(0, Math.min(1, stop.offset)), stop.color);
    }
    return grad;
  }
  if (fill.type === 'pattern' && typeof document !== 'undefined') {
    const pDef = doc?.defs?.patterns?.find(p => p.id === fill.patternId) || { type: 'dots', spacing: 16, size: 3, color: fill.color || '#334155' };
    const tile = document.createElement('canvas');
    const sp = Math.max(6, Number(pDef.spacing) || 16);
    tile.width = sp;
    tile.height = sp;
    const tctx = tile.getContext('2d');
    tctx.fillStyle = pDef.color || fill.color || '#334155';
    tctx.strokeStyle = pDef.color || fill.color || '#334155';
    if (pDef.type === 'stripes') {
      tctx.lineWidth = pDef.size || 3;
      tctx.beginPath();
      tctx.moveTo(0, sp);
      tctx.lineTo(sp, 0);
      tctx.stroke();
    } else if (pDef.type === 'grid') {
      tctx.lineWidth = pDef.size || 1.5;
      tctx.strokeRect(0, 0, sp, sp);
    } else {
      tctx.beginPath();
      tctx.arc(sp / 2, sp / 2, pDef.size || 3, 0, Math.PI * 2);
      tctx.fill();
    }
    return ctx.createPattern(tile, 'repeat');
  }
  return fill.color || '#3b82f6';
}

function resolveStrokeStyle(ctx, stroke, bounds, doc) {
  if (!stroke || stroke.type === 'none' || (Number(stroke.width) || 0) <= 0) return null;
  if (stroke.type === 'gradient') {
    return resolvePaintStyle(ctx, { type: 'gradient', gradientId: stroke.gradientId, color: stroke.color }, bounds, doc);
  }
  return stroke.color || '#1e293b';
}

function drawTextObject(ctx, obj, fillPaint, strokePaint, style, doc) {
  const fs = Math.max(6, Number(obj.fontSize) || 32);
  const weight = obj.fontWeight || '700';
  const family = obj.fontFamily || 'sans-serif';
  ctx.font = `${weight} ${fs}px ${family}`;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = obj.textAlign || 'left';

  const lines = String(obj.text || '').split('\n');
  const lineH = fs * (Number(obj.lineHeight) || 1.25);

  // Path-on-text support if pathId is attached
  if (obj.pathId && doc) {
    const pathTarget = findObjectById(doc.rootGroup, obj.pathId);
    if (pathTarget) {
      drawTextAlongObjectPath(ctx, obj.text, pathTarget.object, fs, fillPaint, strokePaint, style);
      return;
    }
  }

  if (obj.vertical) {
    // Vertical Japanese writing (縦書き)
    const charsPerCol = lines;
    for (let col = 0; col < charsPerCol.length; col++) {
      const str = charsPerCol[col];
      const colX = obj.x + (charsPerCol.length - 1 - col) * lineH;
      for (let row = 0; row < str.length; row++) {
        const ch = str[row];
        const chY = obj.y + (row + 1) * (fs + (Number(obj.letterSpacing) || 0));
        if (fillPaint) {
          ctx.fillStyle = fillPaint;
          ctx.fillText(ch, colX, chY);
        }
        if (strokePaint && style.stroke?.width > 0) {
          ctx.strokeStyle = strokePaint;
          ctx.lineWidth = style.stroke.width;
          ctx.strokeText(ch, colX, chY);
        }
      }
    }
  } else {
    for (let i = 0; i < lines.length; i++) {
      const ly = obj.y + i * lineH;
      if (fillPaint) {
        ctx.fillStyle = fillPaint;
        ctx.fillText(lines[i], obj.x, ly);
      }
      if (strokePaint && style.stroke?.width > 0) {
        ctx.strokeStyle = strokePaint;
        ctx.lineWidth = style.stroke.width;
        ctx.strokeText(lines[i], obj.x, ly);
      }
    }
  }
}

function drawTextAlongObjectPath(ctx, text, pathObj, fontSize, fillPaint, strokePaint, style) {
  const b = getObjectBounds(pathObj);
  const str = String(text || '').replace(/\n/g, ' ');
  const rx = Math.max(20, b.width / 2);
  const ry = Math.max(20, b.height / 2);
  const startAngle = -Math.PI * 0.75;
  const stepAngle = (fontSize * 0.68) / Math.max(rx, ry);

  for (let i = 0; i < str.length; i++) {
    const angle = startAngle + i * stepAngle;
    const px = b.cx + Math.cos(angle) * rx;
    const py = b.cy + Math.sin(angle) * ry;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(angle + Math.PI / 2);
    if (fillPaint) {
      ctx.fillStyle = fillPaint;
      ctx.fillText(str[i], 0, 0);
    }
    if (strokePaint && style.stroke?.width > 0) {
      ctx.strokeStyle = strokePaint;
      ctx.lineWidth = style.stroke.width;
      ctx.strokeText(str[i], 0, 0);
    }
    ctx.restore();
  }
}

/**
 * Composites an entire GroupLayer (including nested Vector, Raster, and Group layers)
 * onto a target 2D canvas context.
 */
export function renderLayerTreeToContext(ctx, group, doc, rasterStore, imageCache = null) {
  if (!group || !group.visible || !group.children) return;

  for (let i = 0; i < group.children.length; i++) {
    const layer = group.children[i];
    if (!layer.visible || layer.opacity <= 0) continue;

    ctx.save();
    ctx.globalAlpha *= (layer.opacity ?? 1);
    ctx.globalCompositeOperation = BLEND_MODE_MAP[layer.blendMode] || 'source-over';

    if (layer.type === 'vector') {
      for (const obj of layer.objects || []) {
        drawVectorObjectToContext(ctx, obj, doc, imageCache);
      }
    } else if (layer.type === 'raster') {
      const buf = rasterStore.ensureBuffer(layer.assetId, layer.width || doc.canvas.width, layer.height || doc.canvas.height);
      if (buf && !buf._headlessData) {
        ctx.drawImage(buf, 0, 0, doc.canvas.width, doc.canvas.height);
      }
    } else if (layer.type === 'group') {
      renderLayerTreeToContext(ctx, layer, doc, rasterStore, imageCache);
    }

    ctx.restore();
  }
}

/**
 * Vector -> Raster Conversion (Rasterize Layer or Group)
 * Duplicates (or optionally replaces) a selected VectorLayer or GroupLayer into a new RasterLayer
 * at the document resolution multiplied by dpiScale (e.g. 1x, 2x).
 */
export function rasterizeLayerToNewRasterLayer(layer, doc, rasterStore, dpiScale = 1) {
  const scale = Math.max(0.5, Math.min(4, Number(dpiScale) || 1));
  const w = Math.round(doc.canvas.width * scale);
  const h = Math.round(doc.canvas.height * scale);
  const newRaster = createRasterLayer(`${layer.name} (ラスター化)`, doc.canvas.width, doc.canvas.height, scale);
  const buf = rasterStore.ensureBuffer(newRaster.assetId, w, h);

  if (buf && buf.getContext) {
    const ctx = buf.getContext('2d');
    ctx.save();
    ctx.scale(scale, scale);
    if (layer.type === 'vector') {
      for (const obj of layer.objects || []) {
        drawVectorObjectToContext(ctx, obj, doc);
      }
    } else if (layer.type === 'group') {
      renderLayerTreeToContext(ctx, layer, doc, rasterStore);
    }
    ctx.restore();
  }

  return newRaster;
}

/**
 * Exports the entire DocumentModel to a clean, standards-compliant SVG string.
 * Supports:
 * - Raster layers embedded as <image href="data:image/png;base64,...">
 * - Compatibility warnings for non-SVG features (CMYK, special blend modes)
 * - SVG optimization (number rounding, stripped empty groups, metadata tags)
 */
export function serializeDocumentToSVG(doc, rasterStore, options = {}) {
  const w = Math.round((doc.canvas.width || 1200) * (options.scale || 1));
  const h = Math.round((doc.canvas.height || 800) * (options.scale || 1));
  const vbW = doc.canvas.width || 1200;
  const vbH = doc.canvas.height || 800;
  const optimize = options.optimize !== false;
  const includeRaster = options.includeRaster !== false;
  const warnings = [];

  if (doc.canvas.colorModel !== 'RGB') {
    warnings.push(`カラーモデル (${doc.canvas.colorModel}) はSVG標準仕様に従い sRGB カラースペースに変換して出力されます。`);
  }

  const defsMarkup = [];
  for (const g of doc.defs?.gradients || []) {
    const stops = (g.stops || [])
      .map(s => `<stop offset="${Math.round(s.offset * 100)}%" stop-color="${escapeXml(s.color)}" stop-opacity="${s.opacity ?? 1}"/>`)
      .join('');
    if (g.type === 'radial') {
      defsMarkup.push(`<radialGradient id="${escapeXml(g.id)}">${stops}</radialGradient>`);
    } else {
      defsMarkup.push(`<linearGradient id="${escapeXml(g.id)}" x1="${(g.x1 ?? 0) * 100}%" y1="${(g.y1 ?? 0) * 100}%" x2="${(g.x2 ?? 1) * 100}%" y2="${(g.y2 ?? 1) * 100}%">${stops}</linearGradient>`);
    }
  }

  function serializeLayerNode(node) {
    if (!node.visible) return '';
    if (node.blendMode && node.blendMode !== 'normal') {
      warnings.push(`レイヤー「${node.name}」のブレンドモード (${node.blendMode}) はCSS mix-blend-modeとして出力されます。`);
    }
    const styleAttr = node.blendMode && node.blendMode !== 'normal'
      ? ` style="mix-blend-mode:${node.blendMode}"`
      : '';
    const opAttr = (node.opacity ?? 1) < 1 ? ` opacity="${f(node.opacity)}"` : '';

    if (node.type === 'group') {
      const inner = (node.children || []).map(serializeLayerNode).filter(Boolean).join('\n');
      if (optimize && !inner) return '';
      return `<g id="${escapeXml(node.id)}" data-layer-name="${escapeXml(node.name)}"${opAttr}${styleAttr}>\n${inner}\n</g>`;
    }

    if (node.type === 'raster') {
      if (!includeRaster) return '';
      const dataUrl = rasterStore ? rasterStore.toDataURL(node.assetId) : '';
      if (!dataUrl || dataUrl === 'data:image/png;base64,') return '';
      return `<g id="${escapeXml(node.id)}" data-layer-type="raster" data-layer-name="${escapeXml(node.name)}"${opAttr}${styleAttr}><image x="0" y="0" width="${vbW}" height="${vbH}" href="${dataUrl}"/></g>`;
    }

    if (node.type === 'vector') {
      const objs = (node.objects || [])
        .filter(o => o.visible)
        .map(o => serializeVectorObjectToSVG(o))
        .filter(Boolean)
        .join('\n');
      if (optimize && !objs) return '';
      return `<g id="${escapeXml(node.id)}" data-layer-type="vector" data-layer-name="${escapeXml(node.name)}"${opAttr}${styleAttr}>\n${objs}\n</g>`;
    }
    return '';
  }

  const bgType = options.transparentBg ? 'transparent' : doc.canvas.background.type;
  const bgColor = options.backgroundColor || doc.canvas.background.color || '#ffffff';
  const bgRect = bgType === 'transparent'
    ? ''
    : `<rect id="canvas-background" x="0" y="0" width="${vbW}" height="${vbH}" fill="${bgType === 'white' ? '#ffffff' : escapeXml(bgColor)}"/>`;

  const metadataBlock = options.includeMetadata !== false
    ? `<title>${escapeXml(options.title || doc.metadata.title)}</title><desc>Author: ${escapeXml(options.author || doc.metadata.author)} | License: ${escapeXml(options.license || doc.metadata.license)}</desc>`
    : '';

  const body = (doc.rootGroup.children || []).map(serializeLayerNode).filter(Boolean).join('\n');

  const svgString = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${vbW} ${vbH}">`,
    metadataBlock,
    defsMarkup.length > 0 ? `<defs>${defsMarkup.join('')}</defs>` : '',
    bgRect,
    body,
    `</svg>`
  ].filter(Boolean).join(optimize ? '' : '\n');

  return { svgString, warnings };
}

function serializeVectorObjectToSVG(obj) {
  const b = getObjectBounds(obj);
  const tr = obj.transform || {};
  const style = obj.style || createDefaultStyle();

  const transforms = [];
  if (tr.tx || tr.ty) transforms.push(`translate(${f(tr.tx || 0)} ${f(tr.ty || 0)})`);
  if (tr.rotation) transforms.push(`rotate(${f(tr.rotation)} ${f(b.cx)} ${f(b.cy)})`);
  if ((tr.scaleX && tr.scaleX !== 1) || (tr.scaleY && tr.scaleY !== 1)) {
    transforms.push(`translate(${f(b.cx)} ${f(b.cy)}) scale(${f(tr.scaleX ?? 1)} ${f(tr.scaleY ?? 1)}) translate(${f(-b.cx)} ${f(-b.cy)})`);
  }
  if (tr.skewX) transforms.push(`skewX(${f(tr.skewX)})`);
  if (tr.skewY) transforms.push(`skewY(${f(tr.skewY)})`);
  const tfAttr = transforms.length > 0 ? ` transform="${transforms.join(' ')}"` : '';

  const fillVal = style.fill?.type === 'none'
    ? 'none'
    : style.fill?.type === 'gradient'
      ? `url(#${style.fill.gradientId})`
      : (style.fill?.color || '#3b82f6');

  const strokeVal = (style.stroke?.type === 'none' || !style.stroke?.width)
    ? 'none'
    : (style.stroke?.color || '#1e293b');
  const strokeWidthAttr = strokeVal !== 'none' ? ` stroke-width="${f(style.stroke.width)}" stroke-linecap="${style.stroke.cap || 'round'}" stroke-linejoin="${style.stroke.join || 'round'}"` : '';
  const opAttr = (style.opacity ?? 1) < 1 ? ` opacity="${f(style.opacity)}"` : '';

  if (obj.kind === 'text') {
    const wmAttr = obj.vertical ? ` writing-mode="vertical-rl"` : '';
    return `<text id="${escapeXml(obj.id)}" x="${f(obj.x)}" y="${f(obj.y)}" font-family="${escapeXml(obj.fontFamily)}" font-size="${f(obj.fontSize)}" font-weight="${escapeXml(obj.fontWeight)}" fill="${escapeXml(fillVal)}" stroke="${escapeXml(strokeVal)}"${strokeWidthAttr}${wmAttr}${opAttr}${tfAttr}>${escapeXml(obj.text)}</text>`;
  }

  if (obj.kind === 'image') {
    return `<image id="${escapeXml(obj.id)}" x="${f(obj.x)}" y="${f(obj.y)}" width="${f(obj.width)}" height="${f(obj.height)}" href="${escapeXml(obj.href)}"${opAttr}${tfAttr}/>`;
  }

  const d = buildObjectPathD(obj);
  const actualFill = obj.kind === 'brush-stroke' ? (fillVal !== 'none' ? fillVal : strokeVal) : (obj.kind === 'line' || obj.kind === 'spiral' ? 'none' : fillVal);
  const actualStroke = obj.kind === 'brush-stroke' ? 'none' : strokeVal;
  return `<path id="${escapeXml(obj.id)}" data-kind="${escapeXml(obj.kind)}" d="${d}" fill="${escapeXml(actualFill)}" stroke="${escapeXml(actualStroke)}"${actualStroke !== 'none' ? strokeWidthAttr : ''}${opAttr}${tfAttr}/>`;
}

/**
 * Sanitizes and imports an external SVG string into a clean DocumentModel
 * Strips <script>, <foreignObject>, external event handlers (onload, onclick, etc.), and javascript: URLs.
 */
export function importAndSanitizeSVG(svgText) {
  const sanitizedReport = {
    removedScripts: 0,
    removedEventAttrs: 0,
    importedObjects: 0
  };

  if (typeof DOMParser === 'undefined') {
    throw new Error('DOMParser is required to parse SVG XML');
  }

  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(svgText, 'image/svg+xml');
  const parseErr = xmlDoc.querySelector('parsererror');
  if (parseErr) {
    throw new Error('SVG構文エラー: 有効なSVGファイルではありません');
  }

  const rootSvg = xmlDoc.documentElement;
  if (!rootSvg || rootSvg.tagName.toLowerCase() !== 'svg') {
    throw new Error('ルート要素が <svg> ではありません');
  }

  // Strip dangerous elements (<script>, <foreignObject>, <iframe>)
  const dangerousTags = rootSvg.querySelectorAll('script, foreignObject, iframe, object, embed');
  dangerousTags.forEach(el => {
    sanitizedReport.removedScripts++;
    el.remove();
  });

  // Strip event handler attributes (on*) and javascript: hrefs
  const allElements = rootSvg.querySelectorAll('*');
  allElements.forEach(el => {
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase();
      const val = attr.value.trim().toLowerCase();
      if (name.startsWith('on') || val.startsWith('javascript:')) {
        sanitizedReport.removedEventAttrs++;
        el.removeAttribute(attr.name);
      }
    }
  });

  let width = parseFloat(rootSvg.getAttribute('width')) || 1200;
  let height = parseFloat(rootSvg.getAttribute('height')) || 800;
  const vb = rootSvg.getAttribute('viewBox');
  if (vb) {
    const parts = vb.trim().split(/[\s,]+/).map(Number);
    if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
      width = parts[2];
      height = parts[3];
    }
  }

  const objects = [];
  function extractElements(parentEl) {
    for (const el of Array.from(parentEl.children)) {
      const tag = el.tagName.toLowerCase();
      if (tag === 'defs' || tag === 'title' || tag === 'desc' || tag === 'metadata') continue;
      if (el.id === 'canvas-background') continue;
      if (tag === 'g') {
        extractElements(el);
        continue;
      }

      const fill = el.getAttribute('fill') || '#3b82f6';
      const stroke = el.getAttribute('stroke') || 'none';
      const strokeW = parseFloat(el.getAttribute('stroke-width')) || (stroke !== 'none' ? 2 : 0);
      const style = createDefaultStyle(fill, stroke, strokeW);

      if (tag === 'rect') {
        const rx = parseFloat(el.getAttribute('rx')) || 0;
        objects.push(createVectorObject(rx > 0 ? 'rounded-rect' : 'rect', {
          name: el.id || '矩形',
          x: parseFloat(el.getAttribute('x')) || 0,
          y: parseFloat(el.getAttribute('y')) || 0,
          width: parseFloat(el.getAttribute('width')) || 100,
          height: parseFloat(el.getAttribute('height')) || 80,
          rx,
          ry: parseFloat(el.getAttribute('ry')) || rx,
          style
        }));
      } else if (tag === 'circle' || tag === 'ellipse') {
        const cx = parseFloat(el.getAttribute('cx')) || 50;
        const cy = parseFloat(el.getAttribute('cy')) || 50;
        const rx = parseFloat(el.getAttribute('rx') || el.getAttribute('r')) || 40;
        const ry = parseFloat(el.getAttribute('ry') || el.getAttribute('r')) || 40;
        objects.push(createVectorObject('ellipse', {
          name: el.id || '楕円',
          x: cx - rx,
          y: cy - ry,
          width: rx * 2,
          height: ry * 2,
          style
        }));
      } else if (tag === 'line') {
        const x1 = parseFloat(el.getAttribute('x1')) || 0;
        const y1 = parseFloat(el.getAttribute('y1')) || 0;
        const x2 = parseFloat(el.getAttribute('x2')) || 100;
        const y2 = parseFloat(el.getAttribute('y2')) || 100;
        objects.push(createVectorObject('line', {
          name: el.id || '直線',
          x1, y1, x2, y2,
          x: Math.min(x1, x2),
          y: Math.min(y1, y2),
          width: Math.max(8, Math.abs(x2 - x1)),
          height: Math.max(8, Math.abs(y2 - y1)),
          style
        }));
      } else if (tag === 'text') {
        objects.push(createVectorObject('text', {
          name: el.id || 'テキスト',
          x: parseFloat(el.getAttribute('x')) || 50,
          y: parseFloat(el.getAttribute('y')) || 50,
          text: (el.textContent || '').trim() || 'Text',
          fontSize: parseFloat(el.getAttribute('font-size')) || 24,
          style
        }));
      } else if (tag === 'path' || tag === 'polygon' || tag === 'polyline') {
        let d = el.getAttribute('d') || '';
        if (!d && el.getAttribute('points')) {
          const pts = el.getAttribute('points').trim().split(/[\s,]+/);
          const pairs = [];
          for (let i = 0; i < pts.length - 1; i += 2) {
            pairs.push(`${pts[i]} ${pts[i + 1]}`);
          }
          if (pairs.length > 0) {
            d = `M ${pairs[0]} L ${pairs.slice(1).join(' L ')}${tag === 'polygon' ? ' Z' : ''}`;
          }
        }
        if (d) {
          objects.push(createVectorObject('path', {
            name: el.id || 'パス',
            x: 0,
            y: 0,
            width: 120,
            height: 120,
            rawPathD: d,
            style
          }));
        }
      }
    }
  }

  extractElements(rootSvg);
  sanitizedReport.importedObjects = objects.length;

  return {
    width,
    height,
    objects,
    sanitizedReport
  };
}

// ============================================================================
// Pure JS Standard ZIP Archive Writer & Reader (For .svgew Workspace Export/Import)
// ============================================================================

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < bytes.length; i++) {
    c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
  }
  return (c ^ 0xFFFFFFFF) >>> 0;
}

/**
 * Creates a standard uncompressed ZIP archive Uint8Array from a dictionary of { filename: Uint8Array | string }
 */
export function buildZipArchive(filesMap) {
  const encoder = new TextEncoder();
  const entries = [];
  let totalLocalSize = 0;
  let totalCentralSize = 0;

  for (const [path, content] of Object.entries(filesMap)) {
    const nameBytes = encoder.encode(path);
    const dataBytes = typeof content === 'string' ? encoder.encode(content) : content;
    const crc = crc32(dataBytes);
    entries.push({ nameBytes, dataBytes, crc, offset: totalLocalSize });
    totalLocalSize += 30 + nameBytes.length + dataBytes.length;
    totalCentralSize += 46 + nameBytes.length;
  }

  const out = new Uint8Array(totalLocalSize + totalCentralSize + 22);
  const view = new DataView(out.buffer);
  let pos = 0;

  // 1. Local file headers + data
  for (const entry of entries) {
    view.setUint32(pos, 0x04034b50, true); // Local file header signature
    view.setUint16(pos + 4, 20, true);     // Version needed
    view.setUint16(pos + 6, 0x0800, true); // UTF-8 flag
    view.setUint16(pos + 8, 0, true);      // Compression: 0 (STORE)
    view.setUint16(pos + 10, 0, true);
    view.setUint16(pos + 12, 0, true);
    view.setUint32(pos + 14, entry.crc, true);
    view.setUint32(pos + 18, entry.dataBytes.length, true);
    view.setUint32(pos + 22, entry.dataBytes.length, true);
    view.setUint16(pos + 26, entry.nameBytes.length, true);
    view.setUint16(pos + 28, 0, true);
    pos += 30;
    out.set(entry.nameBytes, pos);
    pos += entry.nameBytes.length;
    out.set(entry.dataBytes, pos);
    pos += entry.dataBytes.length;
  }

  const centralDirStart = pos;

  // 2. Central directory headers
  for (const entry of entries) {
    view.setUint32(pos, 0x02014b50, true);
    view.setUint16(pos + 4, 20, true);
    view.setUint16(pos + 6, 20, true);
    view.setUint16(pos + 8, 0x0800, true);
    view.setUint16(pos + 10, 0, true);
    view.setUint16(pos + 12, 0, true);
    view.setUint16(pos + 14, 0, true);
    view.setUint32(pos + 16, entry.crc, true);
    view.setUint32(pos + 20, entry.dataBytes.length, true);
    view.setUint32(pos + 24, entry.dataBytes.length, true);
    view.setUint16(pos + 28, entry.nameBytes.length, true);
    view.setUint16(pos + 30, 0, true);
    view.setUint16(pos + 32, 0, true);
    view.setUint16(pos + 34, 0, true);
    view.setUint16(pos + 36, 0, true);
    view.setUint32(pos + 38, 0, true);
    view.setUint32(pos + 42, entry.offset, true);
    pos += 46;
    out.set(entry.nameBytes, pos);
    pos += entry.nameBytes.length;
  }

  // 3. End of central directory record (EOCD)
  view.setUint32(pos, 0x06054b50, true);
  view.setUint16(pos + 4, 0, true);
  view.setUint16(pos + 6, 0, true);
  view.setUint16(pos + 8, entries.length, true);
  view.setUint16(pos + 10, entries.length, true);
  view.setUint32(pos + 12, totalCentralSize, true);
  view.setUint32(pos + 16, centralDirStart, true);
  view.setUint16(pos + 20, 0, true);

  return out;
}

/**
 * Extracts a ZIP archive created by buildZipArchive (supports STORE entries + partial recovery)
 */
export function parseZipArchive(uint8Array) {
  const view = new DataView(uint8Array.buffer, uint8Array.byteOffset, uint8Array.byteLength);
  const decoder = new TextDecoder();
  const files = {};
  let pos = 0;

  while (pos + 30 <= uint8Array.byteLength) {
    const sig = view.getUint32(pos, true);
    if (sig !== 0x04034b50) break;
    const compression = view.getUint16(pos + 8, true);
    const compSize = view.getUint32(pos + 18, true);
    const nameLen = view.getUint16(pos + 26, true);
    const extraLen = view.getUint16(pos + 28, true);
    const nameStart = pos + 30;
    const dataStart = nameStart + nameLen + extraLen;
    if (dataStart + compSize > uint8Array.byteLength) break;

    const fileName = decoder.decode(uint8Array.subarray(nameStart, nameStart + nameLen));
    const fileBytes = uint8Array.subarray(dataStart, dataStart + compSize);
    if (compression === 0) {
      files[fileName] = {
        bytes: fileBytes,
        text: () => decoder.decode(fileBytes)
      };
    }
    pos = dataStart + compSize;
  }
  return files;
}

/**
 * Packages the full Workspace (.svgew ZIP) with manifest.json, document.json, assets/*.png, and thumbnail.png
 */
export function exportWorkspaceZip(doc, rasterStore, thumbnailBytes = null) {
  const manifest = {
    format: 'SVG-EDITOR-WORKSPACE',
    version: '1.0.0',
    schemaVersion: doc.schemaVersion || 1,
    exportedAt: new Date().toISOString()
  };

  const files = {
    'manifest.json': JSON.stringify(manifest, null, 2),
    'document.json': JSON.stringify(doc, null, 2)
  };

  if (thumbnailBytes) {
    files['thumbnail.png'] = thumbnailBytes;
  }

  // Collect raster assets
  function collectRasterAssets(group) {
    for (const child of group.children || []) {
      if (child.type === 'raster' && rasterStore) {
        const dataUrl = rasterStore.toDataURL(child.assetId);
        if (dataUrl && dataUrl.startsWith('data:image/png;base64,')) {
          files[`assets/${child.assetId}.png`] = dataUrlToUint8Array(dataUrl);
        }
      } else if (child.type === 'group') {
        collectRasterAssets(child);
      }
    }
  }
  collectRasterAssets(doc.rootGroup);

  return buildZipArchive(files);
}

/**
 * Imports and migrates a Workspace (.svgew ZIP) with Partial Recovery support
 */
export async function importWorkspaceZip(uint8Array, rasterStore) {
  const recoveryWarnings = [];
  const files = parseZipArchive(uint8Array);

  if (!files['document.json']) {
    throw new Error('ワークスペース破損エラー: アーカイブ内に document.json が見つかりません。');
  }

  let manifest = { schemaVersion: 1 };
  if (files['manifest.json']) {
    try {
      manifest = JSON.parse(files['manifest.json'].text());
    } catch {
      recoveryWarnings.push('manifest.json が破損していたため、既定のスキーマ(v1)で復旧を試みました。');
    }
  } else {
    recoveryWarnings.push('manifest.json が欠落しているため、部分復旧モードで読み込みました。');
  }

  let doc;
  try {
    doc = JSON.parse(files['document.json'].text());
  } catch (e) {
    throw new Error(`document.json のJSON解析に失敗しました: ${e.message}`);
  }

  // Schema Migration hook
  if ((manifest.schemaVersion || 1) < 1) {
    doc.schemaVersion = 1;
  }

  // Restore raster buffers
  async function restoreRasterLayers(group) {
    for (const child of group.children || []) {
      if (child.type === 'raster' && rasterStore) {
        const assetKey = `assets/${child.assetId}.png`;
        if (files[assetKey]) {
          const b64 = uint8ArrayToBase64(files[assetKey].bytes);
          await rasterStore.loadFromDataURL(
            child.assetId,
            `data:image/png;base64,${b64}`,
            child.width || doc.canvas.width,
            child.height || doc.canvas.height
          );
        } else {
          recoveryWarnings.push(`ラスターレイヤー「${child.name}」の画像アセット (${assetKey}) が見つからないため、空のレイヤーとして部分復旧しました。`);
          rasterStore.ensureBuffer(child.assetId, child.width || doc.canvas.width, child.height || doc.canvas.height);
        }
      } else if (child.type === 'group') {
        await restoreRasterLayers(child);
      }
    }
  }

  if (doc.rootGroup) {
    await restoreRasterLayers(doc.rootGroup);
  }

  return { doc, manifest, recoveryWarnings };
}

export function dataUrlToUint8Array(dataUrl) {
  const b64 = dataUrl.split(',')[1] || '';
  if (typeof atob === 'function') {
    const bin = atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return arr;
  }
  return new Uint8Array(0);
}

export function uint8ArrayToBase64(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) {
    bin += String.fromCharCode(bytes[i]);
  }
  return typeof btoa === 'function' ? btoa(bin) : '';
}

function escapeXml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
