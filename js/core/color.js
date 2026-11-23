/**
 * Color Space Conversions (RGB, HSV, HSL, CMYK, Grayscale, Hex) & Gamut Verification
 */

export function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

export function hexToRgbObj(hex) {
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

export function rgbToHex(r, g, b) {
  const to2 = (n) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0');
  return `#${to2(r)}${to2(g)}${to2(b)}`;
}

/**
 * RGB (0-255) -> HSV (h: 0-360, s: 0-100, v: 0-100)
 */
export function rgbToHsv(r, g, b) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;

  if (max !== min) {
    switch (max) {
      case rn: h = (gn - bn) / d + (gn < bn ? 6 : 0); break;
      case gn: h = (bn - rn) / d + 2; break;
      case bn: h = (rn - gn) / d + 4; break;
    }
    h /= 6;
  }
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    v: Math.round(v * 100)
  };
}

/**
 * HSV (h: 0-360, s: 0-100, v: 0-100) -> RGB (0-255)
 */
export function hsvToRgb(h, s, v) {
  const hn = ((Number(h) % 360) + 360) % 360 / 360;
  const sn = clamp(Number(s), 0, 100) / 100;
  const vn = clamp(Number(v), 0, 100) / 100;

  const i = Math.floor(hn * 6);
  const f = hn * 6 - i;
  const p = vn * (1 - sn);
  const q = vn * (1 - f * sn);
  const t = vn * (1 - (1 - f) * sn);

  let r = 0, g = 0, b = 0;
  switch (i % 6) {
    case 0: r = vn; g = t; b = p; break;
    case 1: r = q; g = vn; b = p; break;
    case 2: r = p; g = vn; b = t; break;
    case 3: r = p; g = q; b = vn; break;
    case 4: r = t; g = p; b = vn; break;
    case 5: r = vn; g = p; b = q; break;
  }
  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255)
  };
}

/**
 * RGB (0-255) -> HSL (h: 0-360, s: 0-100, l: 0-100)
 */
export function rgbToHsl(r, g, b) {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn: h = (gn - bn) / d + (gn < bn ? 6 : 0); break;
      case gn: h = (bn - rn) / d + 2; break;
      case bn: h = (rn - gn) / d + 4; break;
    }
    h /= 6;
  }
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
}

/**
 * RGB (0-255) -> CMYK (c, m, y, k: 0-100)
 */
export function rgbToCmyk(r, g, b) {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const k = 1 - Math.max(rn, gn, bn);
  if (k >= 0.9999) {
    return { c: 0, m: 0, y: 0, k: 100 };
  }
  const c = (1 - rn - k) / (1 - k);
  const m = (1 - gn - k) / (1 - k);
  const y = (1 - bn - k) / (1 - k);
  return {
    c: Math.round(c * 100),
    m: Math.round(m * 100),
    y: Math.round(y * 100),
    k: Math.round(k * 100)
  };
}

/**
 * CMYK (0-100) -> RGB (0-255)
 */
export function cmykToRgb(c, m, y, k) {
  const cn = clamp(c, 0, 100) / 100;
  const mn = clamp(m, 0, 100) / 100;
  const yn = clamp(y, 0, 100) / 100;
  const kn = clamp(k, 0, 100) / 100;
  return {
    r: Math.round(255 * (1 - cn) * (1 - kn)),
    g: Math.round(255 * (1 - mn) * (1 - kn)),
    b: Math.round(255 * (1 - yn) * (1 - kn))
  };
}

/**
 * Checks whether an RGB color is out of gamut for CMYK / Grayscale / sRGB printing
 * Returns { outOfGamut: boolean, reason: string, safeHex: string }
 */
export function checkColorGamut(hex, colorModel = 'RGB') {
  const { r, g, b } = hexToRgbObj(hex);
  const hsv = rgbToHsv(r, g, b);

  if (colorModel === 'Grayscale') {
    if (hsv.s > 3) {
      const lum = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
      return {
        outOfGamut: true,
        reason: 'グレースケールドキュメントで有彩色が選択されています',
        safeHex: rgbToHex(lum, lum, lum)
      };
    }
    return { outOfGamut: false, reason: '', safeHex: hex };
  }

  // Highly saturated neon RGB colors exceed standard CMYK print gamut (ISO Coated)
  const isHighNeon = (hsv.s > 86 && hsv.v > 88) || (g > 225 && r < 60) || (b > 235 && r < 50 && g < 80);
  if (colorModel === 'CMYK' && isHighNeon) {
    // Clamp saturation to printable CMYK envelope
    const safeRgb = hsvToRgb(hsv.h, Math.min(78, hsv.s), Math.min(88, hsv.v));
    return {
      outOfGamut: true,
      reason: 'CMYK印刷色域外の高彩度カラーです（印刷/出力時にくすむ可能性があります）',
      safeHex: rgbToHex(safeRgb.r, safeRgb.g, safeRgb.b)
    };
  }

  return { outOfGamut: false, reason: '', safeHex: hex };
}
