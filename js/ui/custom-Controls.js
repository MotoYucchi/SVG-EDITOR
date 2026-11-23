/**
 * Custom Magnetic Snap Slider & Custom UI Widget Engine
 * Replaces browser-native <input type="range"> with a bespoke SVG/HTML/JS magnetic slider
 * that supports:
 * - Visual snap ticks (magnetic attraction spots)
 * - Rotation snapping every 15° (-180°, -165°, ..., 0°, ..., +180°)
 * - Zoom snapping at key milestones (25%, 50%, 75%, 100%, 150%, 200%, 400%, 800%) + 5%/10% grid
 * - Opacity/Hardness snapping every 25% (0, 25, 50, 75, 100)
 * - Brush size snapping at key sizes (1, 5, 10, 20, 50, 100, 150, 200)
 */

export const SNAP_PROFILES = {
  rotation: {
    step: 15,
    majorSpots: [-180, -135, -90, -45, 0, 45, 90, 135, 180],
    threshold: 5 // degrees within which the thumb snaps magnetically
  },
  zoom: {
    step: 10,
    majorSpots: [25, 50, 75, 100, 125, 150, 200, 300, 400, 600, 800],
    threshold: 14
  },
  percent: {
    step: 5,
    majorSpots: [0, 25, 50, 75, 100],
    threshold: 4
  },
  brushSize: {
    step: 5,
    majorSpots: [1, 5, 10, 20, 35, 50, 80, 100, 150, 200],
    threshold: 4
  },
  angle: {
    step: 15,
    majorSpots: [0, 45, 90, 135, 180, 225, 270, 315, 360],
    threshold: 6
  }
};

/**
 * Applies magnetic snapping to a raw value according to a snap profile
 * @param {number} rawVal
 * @param {number} min
 * @param {number} max
 * @param {string} profileName - 'rotation' | 'zoom' | 'percent' | 'brushSize' | 'angle' | 'none'
 * @param {boolean} disableSnap - e.g. when holding Alt/Shift for fine micro-adjustment
 * @returns {{ value: number, snapped: boolean }}
 */
export function applyMagneticSnap(rawVal, min, max, profileName = 'percent', disableSnap = false) {
  const clamped = Math.max(min, Math.min(max, rawVal));
  if (disableSnap || !profileName || profileName === 'none') {
    return { value: Number(clamped.toFixed(2)), snapped: false };
  }

  const profile = SNAP_PROFILES[profileName];
  if (!profile) {
    return { value: Math.round(clamped), snapped: false };
  }

  // 1. Check major magnetic spots first
  if (profile.majorSpots) {
    for (const spot of profile.majorSpots) {
      if (spot >= min && spot <= max && Math.abs(clamped - spot) <= profile.threshold) {
        return { value: spot, snapped: true };
      }
    }
  }

  // 2. Check regular interval step attraction (e.g. every 15 deg for rotation or every 5/10 for zoom)
  if (profile.step) {
    const nearestStep = Math.round(clamped / profile.step) * profile.step;
    const stepThreshold = Math.min(profile.threshold, profile.step * 0.38);
    if (Math.abs(clamped - nearestStep) <= stepThreshold) {
      return { value: Math.max(min, Math.min(max, nearestStep)), snapped: true };
    }
  }

  return { value: Math.round(clamped), snapped: false };
}

/**
 * Upgrades all <input type="range"> inside a root element into bespoke SVG/CSS Magnetic Sliders.
 * Preserves the original <input type="range"> as a hidden synced input so existing `oninput` / `.value` code works seamlessly!
 */
export function upgradeCustomSliders(root = document) {
  if (!root || typeof document === 'undefined') return;
  const inputs = root.querySelectorAll('input[type="range"]:not([data-custom-upgraded="true"])');

  inputs.forEach(input => {
    input.setAttribute('data-custom-upgraded', 'true');
    const min = parseFloat(input.min ?? '0');
    const max = parseFloat(input.max ?? '100');
    const step = parseFloat(input.step ?? '1');

    // Determine snap profile automatically from ID or data-snap attribute
    let snapType = input.getAttribute('data-snap');
    if (!snapType) {
      const id = (input.id || '').toLowerCase();
      if (id.includes('rot')) snapType = 'rotation';
      else if (id.includes('zoom')) snapType = 'zoom';
      else if (id.includes('size')) snapType = 'brushSize';
      else if (max === 100 && min >= 0) snapType = 'percent';
      else if (max === 360) snapType = 'angle';
      else snapType = 'none';
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'c-slider';
    if (input.style.flex) wrapper.style.flex = input.style.flex;
    if (input.style.width) wrapper.style.width = input.style.width;

    const track = document.createElement('div');
    track.className = 'c-slider-track';

    const fill = document.createElement('div');
    fill.className = 'c-slider-fill';

    const ticksContainer = document.createElement('div');
    ticksContainer.className = 'c-slider-ticks';

    const profile = SNAP_PROFILES[snapType];
    const spots = profile?.majorSpots?.filter(s => s >= min && s <= max) || [];
    for (const spot of spots) {
      const pct = ((spot - min) / (max - min || 1)) * 100;
      const tick = document.createElement('span');
      tick.className = 'c-slider-tick';
      tick.style.left = `${pct}%`;
      tick.title = `${spot}`;
      ticksContainer.appendChild(tick);
    }

    const thumb = document.createElement('div');
    thumb.className = 'c-slider-thumb';
    thumb.innerHTML = `<svg width="14" height="14" viewBox="0 0 14 14" draggable="false" aria-hidden="true"><circle cx="7" cy="7" r="5.5" fill="currentColor" stroke="#ffffff" stroke-width="1.5"/></svg>`;

    track.appendChild(fill);
    track.appendChild(ticksContainer);
    track.appendChild(thumb);
    wrapper.appendChild(track);

    // Hide native range input but keep it in DOM for programmatic access
    input.style.display = 'none';
    input.parentNode.insertBefore(wrapper, input);
    wrapper.appendChild(input);

    const updateVisualFromInput = (isSnapped = false) => {
      const val = parseFloat(input.value) || min;
      const pct = Math.max(0, Math.min(100, ((val - min) / (max - min || 1)) * 100));
      fill.style.width = `${pct}%`;
      thumb.style.left = `${pct}%`;
      wrapper.classList.toggle('is-snapped', isSnapped);
    };

    const setFromClientX = (clientX, disableSnap = false) => {
      const rect = track.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / (rect.width || 1)));
      let raw = min + ratio * (max - min);
      const { value: snappedVal, snapped } = applyMagneticSnap(raw, min, max, snapType, disableSnap);
      const finalVal = step < 1 ? Number((Math.round(snappedVal / step) * step).toFixed(2)) : Math.round(snappedVal);

      if (String(finalVal) !== input.value) {
        input.value = String(finalVal);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
      updateVisualFromInput(snapped);
    };

    wrapper.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      wrapper.setPointerCapture(e.pointerId);
      wrapper.classList.add('dragging');
      setFromClientX(e.clientX, e.altKey || e.shiftKey);
    });

    wrapper.addEventListener('pointermove', (e) => {
      if (!wrapper.classList.contains('dragging')) return;
      setFromClientX(e.clientX, e.altKey || e.shiftKey);
    });

    const endDrag = () => {
      wrapper.classList.remove('dragging');
    };
    wrapper.addEventListener('pointerup', endDrag);
    wrapper.addEventListener('pointercancel', endDrag);

    // Double-click resets slider to 0 (for rotation) or 100 (for zoom/opacity)
    wrapper.addEventListener('dblclick', () => {
      const defaultVal = snapType === 'rotation' ? 0 : (min <= 100 && max >= 100 ? 100 : min);
      input.value = String(defaultVal);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      updateVisualFromInput(true);
    });

    // Sync whenever code sets input.value
    input._syncCustomSlider = () => updateVisualFromInput(false);
    updateVisualFromInput(false);
  });
}

/**
 * Helper to programmatically set a slider's value and refresh its custom SVG visual
 */
export function setSliderValue(inputOrId, value) {
  const el = typeof inputOrId === 'string' ? document.getElementById(inputOrId) : inputOrId;
  if (!el) return;
  el.value = String(value);
  if (typeof el._syncCustomSlider === 'function') {
    el._syncCustomSlider();
  }
}
