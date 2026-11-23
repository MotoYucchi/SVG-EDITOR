/**
 * Web Worker for Heavy Background Tasks:
 * - SVG Optimization (ID cleanup, coordinate rounding, redundant tag removal)
 * - Custom Export formatting & size estimation
 * - ZIP Workspace packaging with progress & cancellation support
 */

let activeJobCancelled = false;

self.onmessage = async (event) => {
  const { type, jobId, payload } = event.data || {};

  if (type === 'cancel') {
    activeJobCancelled = true;
    return;
  }

  if (type === 'optimize-svg') {
    activeJobCancelled = false;
    try {
      self.postMessage({ type: 'progress', jobId, percent: 25, stage: 'SVG構文を解析中...' });
      let svg = String(payload.svgString || '');

      if (activeJobCancelled) {
        self.postMessage({ type: 'cancelled', jobId });
        return;
      }

      self.postMessage({ type: 'progress', jobId, percent: 60, stage: '座標丸めと不要属性の削除中...' });

      if (payload.roundNumbers !== false) {
        // Round floating point coordinates to 2 decimal places
        svg = svg.replace(/(-?\d+\.\d{3,})/g, (m) => String(Math.round( parseFloat(m) * 100 ) / 100));
      }
      if (payload.stripEmptyGroups !== false) {
        svg = svg.replace(/<g[^>]*>\s*<\/g>/g, '');
      }
      if (payload.minifyWhitespace) {
        svg = svg.replace(/>\s+</g, '><').trim();
      }

      const byteSize = new TextEncoder().encode(svg).byteLength;
      self.postMessage({
        type: 'complete',
        jobId,
        result: {
          svgString: svg,
          byteSize
        }
      });
    } catch (err) {
      self.postMessage({
        type: 'error',
        jobId,
        message: err.message || 'Worker processing error'
      });
    }
  }
};
