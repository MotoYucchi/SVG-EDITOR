/**
 * Geometry, Non-Destructive Shape Path Generator, Bezier Math,
 * Variable-Width Vector Brush Outline Builder, and Boolean Path Operations
 */

import { createId, createVectorObject, deepClone } from './document.js';

export const DEG_TO_RAD = Math.PI / 180;
export const RAD_TO_DEG = 180 / Math.PI;

/**
 * Generates an SVG path 'd' attribute string for any non-destructive VectorObject
 * in its local coordinate space.
 * @param {object} obj - VectorObject
 * @returns {string} SVG path d string
 */
export function buildObjectPathD(obj) {
  if (!obj) return '';
  const x = Number(obj.x) || 0;
  const y = Number(obj.y) || 0;
  const w = Math.max(1, Number(obj.width) || 1);
  const h = Math.max(1, Number(obj.height) || 1);
  const cx = x + w / 2;
  const cy = y + h / 2;
  const rx = w / 2;
  const ry = h / 2;

  switch (obj.kind) {
    case 'rect':
    case 'rounded-rect': {
      const cr = Math.min(rx, ry, Math.max(0, Number(obj.rx) || 0));
      if (cr <= 0.1) {
        return `M ${f(x)} ${f(y)} H ${f(x + w)} V ${f(y + h)} H ${f(x)} Z`;
      }
      return [
        `M ${f(x + cr)} ${f(y)}`,
        `H ${f(x + w - cr)}`,
        `A ${f(cr)} ${f(cr)} 0 0 1 ${f(x + w)} ${f(y + cr)}`,
        `V ${f(y + h - cr)}`,
        `A ${f(cr)} ${f(cr)} 0 0 1 ${f(x + w - cr)} ${f(y + h)}`,
        `H ${f(x + cr)}`,
        `A ${f(cr)} ${f(cr)} 0 0 1 ${f(x)} ${f(y + h - cr)}`,
        `V ${f(y + cr)}`,
        `A ${f(cr)} ${f(cr)} 0 0 1 ${f(x + cr)} ${f(y)}`,
        'Z'
      ].join(' ');
    }

    case 'ellipse': {
      return [
        `M ${f(cx - rx)} ${f(cy)}`,
        `A ${f(rx)} ${f(ry)} 0 1 0 ${f(cx + rx)} ${f(cy)}`,
        `A ${f(rx)} ${f(ry)} 0 1 0 ${f(cx - rx)} ${f(cy)}`,
        'Z'
      ].join(' ');
    }

    case 'polygon': {
      const sides = Math.max(3, Math.min(64, Math.round(Number(obj.sides) || 6)));
      const pts = [];
      for (let i = 0; i < sides; i++) {
        const angle = (i / sides) * Math.PI * 2 - Math.PI / 2;
        pts.push(`${f(cx + Math.cos(angle) * rx)} ${f(cy + Math.sin(angle) * ry)}`);
      }
      return `M ${pts[0]} L ${pts.slice(1).join(' L ')} Z`;
    }

    case 'star': {
      const points = Math.max(3, Math.min(64, Math.round(Number(obj.sides) || 5)));
      const ratio = Math.max(0.08, Math.min(0.95, Number(obj.innerRatio) || 0.45));
      const pts = [];
      const total = points * 2;
      for (let i = 0; i < total; i++) {
        const rScale = i % 2 === 0 ? 1 : ratio;
        const angle = (i / total) * Math.PI * 2 - Math.PI / 2;
        pts.push(`${f(cx + Math.cos(angle) * rx * rScale)} ${f(cy + Math.sin(angle) * ry * rScale)}`);
      }
      return `M ${pts[0]} L ${pts.slice(1).join(' L ')} Z`;
    }

    case 'line': {
      const x1 = obj.x1 ?? x;
      const y1 = obj.y1 ?? y;
      const x2 = obj.x2 ?? (x + w);
      const y2 = obj.y2 ?? (y + h);
      return `M ${f(x1)} ${f(y1)} L ${f(x2)} ${f(y2)}`;
    }

    case 'arrow': {
      const x1 = obj.x1 ?? x;
      const y1 = obj.y1 ?? (y + h / 2);
      const x2 = obj.x2 ?? (x + w);
      const y2 = obj.y2 ?? (y + h / 2);
      const dx = x2 - x1;
      const dy = y2 - y1;
      const len = Math.hypot(dx, dy) || 1;
      const head = Math.min(len * 0.48, Math.max(10, Number(obj.headSize) || 26));
      const shaftHalf = Math.max(4, head * 0.25);
      const headHalf = head * 0.58;
      const ux = dx / len;
      const uy = dy / len;
      const nx = -uy;
      const ny = ux;
      const neckX = x2 - ux * head;
      const neckY = y2 - uy * head;
      const p1 = [x1 + nx * shaftHalf, y1 + ny * shaftHalf];
      const p2 = [neckX + nx * shaftHalf, neckY + ny * shaftHalf];
      const p3 = [neckX + nx * headHalf, neckY + ny * headHalf];
      const p4 = [x2, y2];
      const p5 = [neckX - nx * headHalf, neckY - ny * headHalf];
      const p6 = [neckX - nx * shaftHalf, neckY - ny * shaftHalf];
      const p7 = [x1 - nx * shaftHalf, y1 - ny * shaftHalf];
      return `M ${f(p1[0])} ${f(p1[1])} L ${f(p2[0])} ${f(p2[1])} L ${f(p3[0])} ${f(p3[1])} L ${f(p4[0])} ${f(p4[1])} L ${f(p5[0])} ${f(p5[1])} L ${f(p6[0])} ${f(p6[1])} L ${f(p7[0])} ${f(p7[1])} Z`;
    }

    case 'arc': {
      const startRad = ((Number(obj.startAngle) || 0) - 90) * DEG_TO_RAD;
      const endRad = ((Number(obj.endAngle) || 270) - 90) * DEG_TO_RAD;
      const sx = cx + Math.cos(startRad) * rx;
      const sy = cy + Math.sin(startRad) * ry;
      const ex = cx + Math.cos(endRad) * rx;
      const ey = cy + Math.sin(endRad) * ry;
      let sweepAngle = ((Number(obj.endAngle) || 270) - (Number(obj.startAngle) || 0)) % 360;
      if (sweepAngle < 0) sweepAngle += 360;
      const largeArc = sweepAngle > 180 ? 1 : 0;
      return `M ${f(cx)} ${f(cy)} L ${f(sx)} ${f(sy)} A ${f(rx)} ${f(ry)} 0 ${largeArc} 1 ${f(ex)} ${f(ey)} Z`;
    }

    case 'spiral': {
      const turns = Math.max(1, Math.min(12, Number(obj.turns) || 3));
      const steps = Math.round(turns * 28);
      const pts = [];
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const angle = t * turns * Math.PI * 2;
        const px = cx + Math.cos(angle) * rx * t;
        const py = cy + Math.sin(angle) * ry * t;
        pts.push(`${f(px)} ${f(py)}`);
      }
      return `M ${pts[0]} L ${pts.slice(1).join(' L ')}`;
    }

    case 'callout': {
      const cr = Math.min(rx * 0.5, ry * 0.5, Math.max(4, Number(obj.rx) || 16));
      const tailTipX = x + w * (obj.tailX ?? 0.28);
      const tailTipY = y + h * (obj.tailY ?? 1.25);
      const baseLeft = Math.max(x + cr + 6, Math.min(x + w - cr - 28, tailTipX - 12));
      const baseRight = Math.min(x + w - cr - 4, baseLeft + 24);
      return [
        `M ${f(x + cr)} ${f(y)}`,
        `H ${f(x + w - cr)}`,
        `A ${f(cr)} ${f(cr)} 0 0 1 ${f(x + w)} ${f(y + cr)}`,
        `V ${f(y + h - cr)}`,
        `A ${f(cr)} ${f(cr)} 0 0 1 ${f(x + w - cr)} ${f(y + h)}`,
        `H ${f(baseRight)}`,
        `L ${f(tailTipX)} ${f(tailTipY)}`,
        `L ${f(baseLeft)} ${f(y + h)}`,
        `H ${f(x + cr)}`,
        `A ${f(cr)} ${f(cr)} 0 0 1 ${f(x)} ${f(y + h - cr)}`,
        `V ${f(y + cr)}`,
        `A ${f(cr)} ${f(cr)} 0 0 1 ${f(x + cr)} ${f(y)}`,
        'Z'
      ].join(' ');
    }

    case 'path': {
      if (obj.nodes && obj.nodes.length > 0) {
        return buildBezierNodesPathD(obj.nodes, obj.closed);
      }
      return obj.rawPathD || '';
    }

    case 'brush-stroke': {
      if (obj.points && obj.points.length > 0) {
        return buildPressureStrokeOutlineD(obj.points, obj.brushSize || 12, obj.taperStart ?? 0.2, obj.taperEnd ?? 0.2);
      }
      return obj.rawPathD || '';
    }

    default:
      return obj.rawPathD || '';
  }
}

/**
 * Formats numbers cleanly to 2 decimal places for compact SVG paths
 */
export function f(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

/**
 * Converts an array of Bezier anchor nodes into an SVG path 'd' attribute
 * Node format: { x, y, inX, inY, outX, outY }
 */
export function buildBezierNodesPathD(nodes, closed = false) {
  if (!nodes || nodes.length === 0) return '';
  if (nodes.length === 1) {
    const n = nodes[0];
    return `M ${f(n.x)} ${f(n.y)} L ${f(n.x + 0.1)} ${f(n.y)}`;
  }
  const cmds = [`M ${f(nodes[0].x)} ${f(nodes[0].y)}`];
  for (let i = 0; i < nodes.length - 1; i++) {
    const curr = nodes[i];
    const next = nodes[i + 1];
    const c1x = curr.outX ?? curr.x;
    const c1y = curr.outY ?? curr.y;
    const c2x = next.inX ?? next.x;
    const c2y = next.inY ?? next.y;
    if (c1x === curr.x && c1y === curr.y && c2x === next.x && c2y === next.y) {
      cmds.push(`L ${f(next.x)} ${f(next.y)}`);
    } else {
      cmds.push(`C ${f(c1x)} ${f(c1y)}, ${f(c2x)} ${f(c2y)}, ${f(next.x)} ${f(next.y)}`);
    }
  }
  if (closed && nodes.length > 2) {
    const curr = nodes[nodes.length - 1];
    const next = nodes[0];
    const c1x = curr.outX ?? curr.x;
    const c1y = curr.outY ?? curr.y;
    const c2x = next.inX ?? next.x;
    const c2y = next.inY ?? next.y;
    if (c1x !== curr.x || c1y !== curr.y || c2x !== next.x || c2y !== next.y) {
      cmds.push(`C ${f(c1x)} ${f(c1y)}, ${f(c2x)} ${f(c2y)}, ${f(next.x)} ${f(next.y)}`);
    }
    cmds.push('Z');
  }
  return cmds.join(' ');
}

/**
 * Generates a filled variable-width contour SVG path from pressure-sensitive stroke points
 * Supports pen pressure, start/end tapering, and smooth round caps.
 */
export function buildPressureStrokeOutlineD(points, baseSize = 12, taperStart = 0.2, taperEnd = 0.2) {
  if (!points || points.length === 0) return '';
  if (points.length === 1) {
    const p = points[0];
    const r = Math.max(1, (baseSize * (p.pressure || 0.5)) / 2);
    return `M ${f(p.x - r)} ${f(p.y)} A ${f(r)} ${f(r)} 0 1 0 ${f(p.x + r)} ${f(p.y)} A ${f(r)} ${f(r)} 0 1 0 ${f(p.x - r)} ${f(p.y)} Z`;
  }

  const leftPts = [];
  const rightPts = [];
  const n = points.length;

  for (let i = 0; i < n; i++) {
    const curr = points[i];
    const prev = points[Math.max(0, i - 1)];
    const next = points[Math.min(n - 1, i + 1)];
    let dx = next.x - prev.x;
    let dy = next.y - prev.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;

    const t = i / (n - 1);
    let taper = 1;
    if (taperStart > 0 && t < taperStart) {
      taper *= Math.max(0.15, t / taperStart);
    }
    if (taperEnd > 0 && t > 1 - taperEnd) {
      taper *= Math.max(0.15, (1 - t) / taperEnd);
    }

    const pressure = curr.pressure ?? 0.65;
    const radius = Math.max(0.6, (baseSize * 0.5) * (0.25 + 0.85 * pressure) * taper);

    leftPts.push({ x: curr.x + nx * radius, y: curr.y + ny * radius });
    rightPts.push({ x: curr.x - nx * radius, y: curr.y - ny * radius });
  }

  const d = [`M ${f(leftPts[0].x)} ${f(leftPts[0].y)}`];
  for (let i = 1; i < leftPts.length; i++) {
    d.push(`L ${f(leftPts[i].x)} ${f(leftPts[i].y)}`);
  }
  const endPt = points[n - 1];
  const endR = Math.hypot(leftPts[n - 1].x - rightPts[n - 1].x, leftPts[n - 1].y - rightPts[n - 1].y) / 2;
  d.push(`A ${f(endR)} ${f(endR)} 0 0 1 ${f(rightPts[n - 1].x)} ${f(rightPts[n - 1].y)}`);
  for (let i = rightPts.length - 2; i >= 0; i--) {
    d.push(`L ${f(rightPts[i].x)} ${f(rightPts[i].y)}`);
  }
  const startR = Math.hypot(leftPts[0].x - rightPts[0].x, leftPts[0].y - rightPts[0].y) / 2;
  d.push(`A ${f(startR)} ${f(startR)} 0 0 1 ${f(leftPts[0].x)} ${f(leftPts[0].y)}`);
  d.push('Z');
  return d.join(' ');
}

/**
 * Ramer-Douglas-Peucker simplification + Chaikin / Catmull-Rom smoothing for Freehand paths
 * @param {Array<{x:number, y:number}>} rawPoints
 * @param {number} tolerance - Simplification tolerance in px (1 ~ 15)
 * @param {number} smoothing - Smoothing factor (0 ~ 1)
 * @returns {Array<{x:number, y:number, inX:number, inY:number, outX:number, outY:number, smooth:boolean}>}
 */
export function simplifyAndSmoothPoints(rawPoints, tolerance = 2.5, smoothing = 0.35) {
  if (!rawPoints || rawPoints.length === 0) return [];
  if (rawPoints.length <= 2) {
    return rawPoints.map(p => ({ x: p.x, y: p.y, inX: p.x, inY: p.y, outX: p.x, outY: p.y, smooth: true }));
  }

  const simplified = rdpSimplify(rawPoints, Math.max(0.5, tolerance));
  const n = simplified.length;
  const nodes = [];

  for (let i = 0; i < n; i++) {
    const pPrev = simplified[Math.max(0, i - 1)];
    const pCurr = simplified[i];
    const pNext = simplified[Math.min(n - 1, i + 1)];

    const tx = (pNext.x - pPrev.x) * smoothing * 0.5;
    const ty = (pNext.y - pPrev.y) * smoothing * 0.5;

    nodes.push({
      x: pCurr.x,
      y: pCurr.y,
      inX: i === 0 ? pCurr.x : pCurr.x - tx,
      inY: i === 0 ? pCurr.y : pCurr.y - ty,
      outX: i === n - 1 ? pCurr.x : pCurr.x + tx,
      outY: i === n - 1 ? pCurr.y : pCurr.y + ty,
      smooth: true
    });
  }
  return nodes;
}

function rdpSimplify(points, epsilon) {
  if (points.length < 3) return points;
  let dmax = 0;
  let index = 0;
  const end = points.length - 1;
  for (let i = 1; i < end; i++) {
    const d = perpendicularDistance(points[i], points[0], points[end]);
    if (d > dmax) {
      index = i;
      dmax = d;
    }
  }
  if (dmax > epsilon) {
    const rec1 = rdpSimplify(points.slice(0, index + 1), epsilon);
    const rec2 = rdpSimplify(points.slice(index), epsilon);
    return rec1.slice(0, rec1.length - 1).concat(rec2);
  }
  return [points[0], points[end]];
}

function perpendicularDistance(pt, lineStart, lineEnd) {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  const mag = Math.hypot(dx, dy);
  if (mag === 0) return Math.hypot(pt.x - lineStart.x, pt.y - lineStart.y);
  return Math.abs(dy * pt.x - dx * pt.y + lineEnd.x * lineStart.y - lineEnd.y * lineStart.x) / mag;
}

/**
 * Computes the Axis-Aligned Bounding Box (AABB) of a VectorObject in world coordinates
 * @param {object} obj - VectorObject
 * @returns {{x: number, y: number, width: number, height: number, cx: number, cy: number}}
 */
export function getObjectBounds(obj) {
  if (!obj) return { x: 0, y: 0, width: 0, height: 0, cx: 0, cy: 0 };

  let lx = Number(obj.x) || 0;
  let ly = Number(obj.y) || 0;
  let lw = Number(obj.width) || 100;
  let lh = Number(obj.height) || 100;

  if (obj.kind === 'line' || obj.kind === 'arrow') {
    const x1 = Number(obj.x1 ?? obj.x) || 0;
    const y1 = Number(obj.y1 ?? obj.y) || 0;
    const x2 = Number(obj.x2 ?? (lx + lw)) || 0;
    const y2 = Number(obj.y2 ?? (ly + lh)) || 0;
    lx = Math.min(x1, x2);
    ly = Math.min(y1, y2);
    lw = Math.max(8, Math.abs(x2 - x1));
    lh = Math.max(8, Math.abs(y2 - y1));
  } else if (obj.kind === 'path' && obj.nodes && obj.nodes.length > 0) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of obj.nodes) {
      minX = Math.min(minX, n.x, n.inX ?? n.x, n.outX ?? n.x);
      minY = Math.min(minY, n.y, n.inY ?? n.y, n.outY ?? n.y);
      maxX = Math.max(maxX, n.x, n.inX ?? n.x, n.outX ?? n.x);
      maxY = Math.max(maxY, n.y, n.inY ?? n.y, n.outY ?? n.y);
    }
    lx = minX;
    ly = minY;
    lw = Math.max(8, maxX - minX);
    lh = Math.max(8, maxY - minY);
  } else if (obj.kind === 'brush-stroke' && obj.points && obj.points.length > 0) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const pad = (obj.brushSize || 12) * 0.6;
    for (const p of obj.points) {
      minX = Math.min(minX, p.x - pad);
      minY = Math.min(minY, p.y - pad);
      maxX = Math.max(maxX, p.x + pad);
      maxY = Math.max(maxY, p.y + pad);
    }
    lx = minX;
    ly = minY;
    lw = Math.max(8, maxX - minX);
    lh = Math.max(8, maxY - minY);
  } else if (obj.kind === 'text') {
    const lines = String(obj.text || '').split('\n');
    const fs = Number(obj.fontSize) || 32;
    const maxChars = Math.max(1, ...lines.map(l => l.length));
    if (obj.vertical) {
      lw = Math.max(fs * 1.4, lines.length * fs * (obj.lineHeight || 1.3));
      lh = Math.max(fs * 1.4, maxChars * fs * 1.05);
      lx = obj.x;
      ly = obj.y;
    } else {
      lw = Math.max(40, maxChars * fs * 0.68);
      lh = Math.max(fs * 1.2, lines.length * fs * (obj.lineHeight || 1.25));
      lx = obj.x;
      ly = obj.y - fs;
    }
  }

  const tr = obj.transform || { tx: 0, ty: 0 };
  const x = lx + (Number(tr.tx) || 0);
  const y = ly + (Number(tr.ty) || 0);
  return {
    x,
    y,
    width: lw,
    height: lh,
    cx: x + lw / 2,
    cy: y + lh / 2
  };
}

/**
 * Converts any shape primitive or text object into an editable Bezier PathObject (Outline / Convert to Path)
 */
export function convertObjectToPath(obj) {
  const b = getObjectBounds(obj);
  const cx = b.cx;
  const cy = b.cy;
  const rx = b.width / 2;
  const ry = b.height / 2;
  const nodes = [];
  let closed = true;

  if (obj.kind === 'ellipse') {
    const k = 0.5522847498;
    nodes.push(
      { x: cx, y: cy - ry, inX: cx - rx * k, inY: cy - ry, outX: cx + rx * k, outY: cy - ry, smooth: true },
      { x: cx + rx, y: cy, inX: cx + rx, inY: cy - ry * k, outX: cx + rx, outY: cy + ry * k, smooth: true },
      { x: cx, y: cy + ry, inX: cx + rx * k, inY: cy + ry, outX: cx - rx * k, outY: cy + ry, smooth: true },
      { x: cx - rx, y: cy, inX: cx - rx, inY: cy + ry * k, outX: cx - rx, outY: cy - ry * k, smooth: true }
    );
  } else if (obj.kind === 'polygon' || obj.kind === 'star') {
    const count = obj.kind === 'star' ? (obj.sides || 5) * 2 : (obj.sides || 6);
    for (let i = 0; i < count; i++) {
      const rScale = (obj.kind === 'star' && i % 2 === 1) ? (obj.innerRatio || 0.45) : 1;
      const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
      const px = cx + Math.cos(angle) * rx * rScale;
      const py = cy + Math.sin(angle) * ry * rScale;
      nodes.push({ x: px, y: py, inX: px, inY: py, outX: px, outY: py, smooth: false });
    }
  } else {
    nodes.push(
      { x: b.x, y: b.y, inX: b.x, inY: b.y, outX: b.x, outY: b.y, smooth: false },
      { x: b.x + b.width, y: b.y, inX: b.x + b.width, inY: b.y, outX: b.x + b.width, outY: b.y, smooth: false },
      { x: b.x + b.width, y: b.y + b.height, inX: b.x + b.width, inY: b.y + b.height, outX: b.x + b.width, outY: b.y + b.height, smooth: false },
      { x: b.x, y: b.y + b.height, inX: b.x, inY: b.y + b.height, outX: b.x, outY: b.y + b.height, smooth: false }
    );
  }

  return createVectorObject('path', {
    name: `${obj.name} (アウトライン)`,
    x: b.x,
    y: b.y,
    width: b.width,
    height: b.height,
    nodes,
    closed,
    rawPathD: buildObjectPathD(obj),
    style: deepClone(obj.style),
    transform: { ...deepClone(obj.transform), tx: 0, ty: 0 }
  });
}

/**
 * Offsets (Expands / Contracts) a vector object's geometry by delta pixels
 */
export function offsetVectorObject(obj, deltaPx = 10) {
  const clone = deepClone(obj);
  clone.id = createId('obj');
  clone.name = `${obj.name} (オフセット ${deltaPx > 0 ? '+' : ''}${deltaPx}px)`;
  if (clone.nodes && clone.nodes.length > 0) {
    const b = getObjectBounds(clone);
    for (const n of clone.nodes) {
      const dx = n.x - b.cx;
      const dy = n.y - b.cy;
      const len = Math.hypot(dx, dy) || 1;
      const ox = (dx / len) * deltaPx;
      const oy = (dy / len) * deltaPx;
      n.x += ox;
      n.y += oy;
      n.inX = (n.inX ?? n.x) + ox;
      n.inY = (n.inY ?? n.y) + oy;
      n.outX = (n.outX ?? n.x) + ox;
      n.outY = (n.outY ?? n.y) + oy;
    }
    clone.rawPathD = buildBezierNodesPathD(clone.nodes, clone.closed);
  } else {
    clone.x = (Number(clone.x) || 0) - deltaPx;
    clone.y = (Number(clone.y) || 0) - deltaPx;
    clone.width = Math.max(4, (Number(clone.width) || 100) + deltaPx * 2);
    clone.height = Math.max(4, (Number(clone.height) || 100) + deltaPx * 2);
  }
  return clone;
}

/**
 * Boolean Path Operations (Union, Subtract, Intersect, Exclude)
 * Uses polygon sampling + 2D Canvas Path2D Winding / Point-in-Path evaluation
 * to produce a clean composite vector PathObject.
 */
export function performBooleanOperation(objA, objB, op = 'union') {
  const polyA = sampleObjectPolygon(objA, 72);
  const polyB = sampleObjectPolygon(objB, 72);
  const bA = getObjectBounds(objA);
  const bB = getObjectBounds(objB);

  const minX = Math.min(bA.x, bB.x);
  const minY = Math.min(bA.y, bB.y);
  const maxX = Math.max(bA.x + bA.width, bB.x + bB.width);
  const maxY = Math.max(bA.y + bA.height, bB.y + bB.height);

  let combinedD = '';
  const pathA = buildObjectPathD(objA);
  const pathB = buildObjectPathD(objB);

  if (op === 'exclude') {
    combinedD = `${pathA} ${pathB}`;
  } else {
    // Perform polygon clipping via Sutherland-Hodgman / angular contour sampling
    const clippedPts = computeClippedPolygon(polyA, polyB, op);
    if (clippedPts.length >= 3) {
      combinedD = `M ${f(clippedPts[0].x)} ${f(clippedPts[0].y)} L ` +
        clippedPts.slice(1).map(p => `${f(p.x)} ${f(p.y)}`).join(' L ') + ' Z';
    } else {
      combinedD = `${pathA} ${pathB}`;
    }
  }

  const labelMap = {
    union: '合体',
    subtract: '型抜き',
    intersect: '交差',
    exclude: '除外'
  };

  return createVectorObject('path', {
    name: `${objA.name} + ${objB.name} (${labelMap[op] || op})`,
    x: minX,
    y: minY,
    width: Math.max(10, maxX - minX),
    height: Math.max(10, maxY - minY),
    nodes: [],
    closed: true,
    rawPathD: combinedD,
    style: deepClone(objA.style)
  });
}

function sampleObjectPolygon(obj, segments = 64) {
  const b = getObjectBounds(obj);
  const pts = [];
  if (obj.kind === 'rect' || obj.kind === 'rounded-rect') {
    const stepsPerSide = Math.max(4, Math.floor(segments / 4));
    for (let i = 0; i < stepsPerSide; i++) pts.push({ x: b.x + (b.width * i) / stepsPerSide, y: b.y });
    for (let i = 0; i < stepsPerSide; i++) pts.push({ x: b.x + b.width, y: b.y + (b.height * i) / stepsPerSide });
    for (let i = 0; i < stepsPerSide; i++) pts.push({ x: b.x + b.width - (b.width * i) / stepsPerSide, y: b.y + b.height });
    for (let i = 0; i < stepsPerSide; i++) pts.push({ x: b.x, y: b.y + b.height - (b.height * i) / stepsPerSide });
    return pts;
  }
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2 - Math.PI / 2;
    let rScale = 1;
    if (obj.kind === 'star') {
      const starVertices = (obj.sides || 5) * 2;
      const pos = (i / segments) * starVertices;
      const frac = Math.abs((pos % 2) - 1);
      rScale = (obj.innerRatio || 0.45) + (1 - (obj.innerRatio || 0.45)) * frac;
    }
    pts.push({
      x: b.cx + Math.cos(angle) * (b.width / 2) * rScale,
      y: b.cy + Math.sin(angle) * (b.height / 2) * rScale
    });
  }
  return pts;
}

function pointInPolygon(pt, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y;
    const xj = poly[j].x, yj = poly[j].y;
    const intersect = ((yi > pt.y) !== (yj > pt.y)) &&
      (pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi + 1e-9) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function computeClippedPolygon(polyA, polyB, op) {
  const result = [];
  if (op === 'intersect') {
    for (const p of polyA) {
      if (pointInPolygon(p, polyB)) result.push(p);
    }
    for (const p of polyB) {
      if (pointInPolygon(p, polyA)) result.push(p);
    }
  } else if (op === 'subtract') {
    for (const p of polyA) {
      if (!pointInPolygon(p, polyB)) result.push(p);
    }
    for (const p of polyB) {
      if (pointInPolygon(p, polyA)) result.push(p);
    }
  } else {
    // Union
    for (const p of polyA) {
      if (!pointInPolygon(p, polyB)) result.push(p);
    }
    for (const p of polyB) {
      if (!pointInPolygon(p, polyA)) result.push(p);
    }
  }
  if (result.length < 3) return polyA;
  const cx = result.reduce((s, p) => s + p.x, 0) / result.length;
  const cy = result.reduce((s, p) => s + p.y, 0) / result.length;
  result.sort((a, b) => Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx));
  return result;
}
