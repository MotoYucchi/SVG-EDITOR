/**
 * SVG EDITOR Studio v2.1 — Main Application Controller
 * Integrates all new UX & functional enhancements:
 * 1. Bespoke SVG/HTML/JS Magnetic Snap Sliders (15° Rotate snap, 5/10% Zoom snap) & Custom Scrollbars
 * 2. Interactive Navigator Minimap (Click/Tap/Drag moves the red viewport frame directly)
 * 3. Per-Layer Live Mini Thumbnail Previews + Long-Press Magnified Lightbox (Click/Tap to close)
 * 4. Marquee Rectangular Drag Selection on Select Tool (`V`) + Delete/Backspace shortcut
 * 5. Strict Cookie/Storage Consent Guard (Zero writes when unconsented; full workspace & prefs auto-restore after consent)
 * 6. Compact Desktop-App Dropdown Menubar (Hover/Click/Tap) + Help > About, GitHub, TIPS link
 * 7. Full Preferences (Language, Theme, Keybinding Customizer with Ctrl/Cmd/Shift/Alt, Pen Pressure/Tilt Calibration)
 * 8. Print Canvas Feature (Ctrl+P / Menu / Toolbar)
 * 9. Auto-Expanding / Collapsing Left Toolbar sections based on active Layer Mode (Vector vs Raster)
 * 10. Expanded 15 Raster Tools (G-Pen, Maru-Pen, Pencil, Chisel Marker, Airbrush, Watercolor, Oil Paint, Eraser, Bucket, Gradient, Blur, Smudge, Dodge/Burn, Deco Stamp, Line/Shape, Symmetry Mirror, Spatter)
 * 11. Configurable Toolbar Long-Press (default 5s) -> Opens a Closable Tool Settings Tab at the top of the Right Dock
 * 12. Strict Image & Icon Copy / Drag / ContextMenu Protection
 */

import {
  createId,
  createDocument,
  createVectorLayer,
  createRasterLayer,
  createGroupLayer,
  createVectorObject,
  createDefaultStyle,
  deepClone,
  findLayerById,
  flattenLayers,
  findObjectById,
  fromPixels,
  estimateCanvasMemoryMB
} from './core/document.js';
import {
  buildObjectPathD,
  getObjectBounds,
  simplifyAndSmoothPoints,
  convertObjectToPath,
  offsetVectorObject,
  performBooleanOperation,
  DEG_TO_RAD,
  RAD_TO_DEG
} from './core/geometry.js';
import {
  RasterStore,
  RASTER_BRUSH_PRESETS,
  strokeBrushSegment,
  floodFillCanvas,
  applyLocalBlurOrSmudge
} from './core/raster-store.js';
import {
  CommandManager,
  createAddObjectCommand,
  createDeleteObjectsCommand,
  createUpdateObjectsCommand,
  createReplaceObjectsCommand,
  createReorderObjectsCommand,
  createLayerTreeCommand,
  createRasterDeltaCommand,
  createCanvasConfigCommand
} from './core/commands.js';
import {
  hexToRgbObj,
  rgbToHex,
  rgbToHsv,
  hsvToRgb,
  rgbToCmyk,
  cmykToRgb,
  checkColorGamut
} from './core/color.js';
import {
  drawVectorObjectToContext,
  renderLayerTreeToContext,
  rasterizeLayerToNewRasterLayer,
  serializeDocumentToSVG,
  importAndSanitizeSVG,
  exportWorkspaceZip,
  importWorkspaceZip
} from './core/renderer.js';
import {
  hasStorageConsent,
  setStorageConsent,
  savePreferencesToStorage,
  loadPreferencesFromStorage,
  saveAutosaveSnapshot,
  loadAutosaveSnapshot
} from './core/storage.js';
import { t, getLang, setLang } from './core/i18n.js';
import { renderIcon } from './ui/icons.js';
import { upgradeCustomSliders, setSliderValue } from './ui/custom-Controls.js';
import {
  showNewDocumentModal,
  showCanvasResizeModal,
  showCustomExportModal,
  showShortcutsModal,
  showPreferencesModal,
  showAboutModal
} from './ui/modals.js';

/**
 * Complete Tool Catalog (Common + Vector + 15 Rich Raster Tools)
 */
export const TOOL_DEFINITIONS = [
  // Common Tools (7)
  { id: 'select', scope: 'common', icon: 'tool-select', shortcut: 'V', labelJa: '選択・矩形範囲変形 (V)', labelEn: 'Select & Marquee (V)' },
  { id: 'node', scope: 'vector', icon: 'tool-node', shortcut: 'A', labelJa: 'ノード編集 (A)', labelEn: 'Node Edit (A)' },
  { id: 'lasso', scope: 'common', icon: 'tool-lasso', shortcut: 'L', labelJa: '投げ縄選択 (L)', labelEn: 'Lasso Select (L)' },
  { id: 'pan', scope: 'common', icon: 'tool-pan', shortcut: 'H', labelJa: '手のひらパン (H / Space)', labelEn: 'Pan Canvas (H)' },
  { id: 'zoom', scope: 'common', icon: 'tool-zoom', shortcut: 'Z', labelJa: 'ズーム (Z)', labelEn: 'Zoom (Z)' },
  { id: 'eyedropper', scope: 'common', icon: 'tool-eyedropper', shortcut: 'I', labelJa: 'スポイト (I)', labelEn: 'Eyedropper (I)' },
  { id: 'measure', scope: 'common', icon: 'tool-measure', shortcut: 'M', labelJa: '定規計測 (M)', labelEn: 'Measure Ruler (M)' },

  // Vector Tools (15)
  { id: 'pen', scope: 'vector', icon: 'tool-pen', shortcut: 'P', labelJa: 'ベジェペン (P)', labelEn: 'Bezier Pen (P)' },
  { id: 'freehand', scope: 'vector', icon: 'tool-freehand', shortcut: 'N', labelJa: 'フリーハンドパス (N)', labelEn: 'Freehand Path (N)' },
  { id: 'vector-brush', scope: 'vector', icon: 'tool-vector-brush', shortcut: 'B', labelJa: '筆圧ベクターブラシ (B)', labelEn: 'Vector Brush (B)' },
  { id: 'vector-eraser', scope: 'vector', icon: 'tool-vector-eraser', shortcut: '', labelJa: 'ベクター消しゴム', labelEn: 'Vector Eraser' },
  { id: 'shape-rect', scope: 'vector', icon: 'shape-rect', shortcut: 'U', labelJa: '矩形ツール (U)', labelEn: 'Rectangle (U)', shapeKind: 'rect' },
  { id: 'shape-rounded-rect', scope: 'vector', icon: 'shape-rounded-rect', shortcut: '', labelJa: '角丸矩形ツール', labelEn: 'Rounded Rect', shapeKind: 'rounded-rect' },
  { id: 'shape-ellipse', scope: 'vector', icon: 'shape-ellipse', shortcut: 'O', labelJa: '楕円・正円ツール (O)', labelEn: 'Ellipse (O)', shapeKind: 'ellipse' },
  { id: 'shape-polygon', scope: 'vector', icon: 'shape-polygon', shortcut: '', labelJa: '多角形ツール', labelEn: 'Polygon', shapeKind: 'polygon' },
  { id: 'shape-star', scope: 'vector', icon: 'shape-star', shortcut: '', labelJa: '星形ツール', labelEn: 'Star', shapeKind: 'star' },
  { id: 'shape-line', scope: 'vector', icon: 'shape-line', shortcut: '', labelJa: '直線ツール', labelEn: 'Line', shapeKind: 'line' },
  { id: 'shape-arrow', scope: 'vector', icon: 'shape-arrow', shortcut: '', labelJa: '矢印ツール', labelEn: 'Arrow', shapeKind: 'arrow' },
  { id: 'shape-arc', scope: 'vector', icon: 'shape-arc', shortcut: '', labelJa: '円弧・扇形ツール', labelEn: 'Arc / Pie', shapeKind: 'arc' },
  { id: 'shape-spiral', scope: 'vector', icon: 'shape-spiral', shortcut: '', labelJa: 'スパイラル（渦巻き）', labelEn: 'Spiral', shapeKind: 'spiral' },
  { id: 'shape-callout', scope: 'vector', icon: 'shape-callout', shortcut: '', labelJa: '吹き出しツール', labelEn: 'Speech Callout', shapeKind: 'callout' },
  { id: 'text', scope: 'vector', icon: 'tool-text', shortcut: 'T', labelJa: 'テキストツール (T)', labelEn: 'Text (T)' },

  // Expanded Raster Tools (16 full-featured paint tools!)
  { id: 'raster-gpen', scope: 'raster', icon: 'raster-pen', shortcut: '', labelJa: 'Gペン (強弱インク)', labelEn: 'G-Pen Ink', preset: 'gpen' },
  { id: 'raster-marupen', scope: 'raster', icon: 'raster-marupen', shortcut: '', labelJa: '丸ペン (極細線画)', labelEn: 'Mapping Pen', preset: 'marupen' },
  { id: 'raster-pencil', scope: 'raster', icon: 'raster-pencil', shortcut: '', labelJa: 'デッサン鉛筆 (傾き対応)', labelEn: 'Sketch Pencil', preset: 'pencil' },
  { id: 'raster-marker', scope: 'raster', icon: 'raster-marker', shortcut: '', labelJa: 'コピックマーカー / 平筆', labelEn: 'Chisel Marker', preset: 'marker' },
  { id: 'raster-airbrush', scope: 'raster', icon: 'raster-airbrush', shortcut: '', labelJa: 'ソフトエアブラシ', labelEn: 'Soft Airbrush', preset: 'airbrush' },
  { id: 'raster-watercolor', scope: 'raster', icon: 'raster-watercolor', shortcut: '', labelJa: '透明水彩ブラシ', labelEn: 'Watercolor', preset: 'watercolor' },
  { id: 'raster-oil', scope: 'raster', icon: 'raster-oil', shortcut: '', labelJa: '厚塗り油彩ブラシ', labelEn: 'Thick Oil Paint', preset: 'oil' },
  { id: 'raster-eraser', scope: 'raster', icon: 'raster-eraser', shortcut: 'E', labelJa: 'ラスター消しゴム (E)', labelEn: 'Raster Eraser (E)' },
  { id: 'raster-bucket', scope: 'raster', icon: 'raster-bucket', shortcut: 'G', labelJa: 'バケツ塗りつぶし (G)', labelEn: 'Flood Fill Bucket (G)' },
  { id: 'raster-gradient', scope: 'raster', icon: 'raster-gradient', shortcut: '', labelJa: 'ラスターグラデーション', labelEn: 'Raster Gradient' },
  { id: 'raster-blur', scope: 'raster', icon: 'raster-blur', shortcut: '', labelJa: 'ぼかしブラシ', labelEn: 'Blur Brush' },
  { id: 'raster-smudge', scope: 'raster', icon: 'raster-smudge', shortcut: '', labelJa: '指先・色混ぜツール', labelEn: 'Smudge Finger' },
  { id: 'raster-dodge', scope: 'raster', icon: 'raster-dodge', shortcut: '', labelJa: '覆い焼き(発光) / 焼き込み(暗)', labelEn: 'Dodge / Burn' },
  { id: 'raster-stamp', scope: 'raster', icon: 'raster-stamp', shortcut: 'S', labelJa: 'デコレーションスタンプ (S)', labelEn: 'Deco Stamp (S)' },
  { id: 'raster-line', scope: 'raster', icon: 'raster-line', shortcut: '', labelJa: 'ラスター直線 / 矩形図形', labelEn: 'Raster Line & Rect' },
  { id: 'raster-symmetry', scope: 'raster', icon: 'raster-symmetry', shortcut: '', labelJa: '対称定規ミラーブラシ', labelEn: 'Symmetry Mirror Brush' },
  { id: 'raster-noise', scope: 'raster', icon: 'raster-noise', shortcut: '', labelJa: 'スパッタリング・砂目スプレー', labelEn: 'Spatter Spray' }
];

export class SVGEditorApp {
  constructor() {
    this.rasterStore = new RasterStore();
    this.doc = createDocument({ withSample: true });
    this.imageCache = new Map();
    this._ensureAllRasterBuffers();

    const topLayers = flattenLayers(this.doc.rootGroup);
    const defaultVec = topLayers.find(l => l.layer.type === 'vector') || topLayers[0];
    this.activeLayerId = defaultVec ? defaultVec.layer.id : null;
    /** @type {Set<string>} */
    this.selectedObjectIds = new Set();

    // Viewport state
    this.viewport = {
      panX: 80,
      panY: 50,
      zoom: 1.0,
      rotation: 0,
      flipX: false
    };

    this.activeToolId = 'select';
    this.spacePanActive = false;

    // Toolbar collapsible state: auto-Tracks active layer mode ('vector' vs 'raster')
    this.toolbarCollapsed = {
      common: false,
      vector: false,
      raster: true
    };

    // Closable Right-Dock Tool Inspector Tab state (opened via long-pressing a tool button)
    this.inspectedToolId = null;

    this.paintState = {
      mainColor: '#3b82f6',
      subColor: '#1e293b',
      activeWell: 'main',
      fillType: 'solid',
      gradientId: 'grad_default_sky',
      patternId: 'pat_dots',
      strokeWidth: 3,
      opacity: 1.0,
      colorHistory: ['#3b82f6', '#1e293b', '#f59e0b', '#10b981', '#ec4899', '#ffffff']
    };

    this.toolOptions = {
      cornerRadius: 20,
      polygonSides: 5,
      starInnerRatio: 0.45,
      spiralTurns: 3,
      arcStartAngle: 0,
      arcEndAngle: 270,
      smoothingTolerance: 2.5,
      smoothingFactor: 0.35,
      brushSize: 16,
      rasterPreset: 'gpen',
      hardness: 0.9,
      flow: 1.0,
      spacing: 0.1,
      bucketTolerance: 28,
      bucketContiguous: true,
      blurMode: 'blur',
      dodgeMode: 'lighter', // 'lighter' (Dodge) | 'multiply' (Burn)
      stampShape: 'star',   // 'star' | 'heart' | 'sparkle'
      symmetryMode: 'horizontal', // 'horizontal' | 'quad'
      rasterShapeKind: 'line',    // 'line' | 'rect'
      fontSize: 36,
      fontFamily: '"Noto Sans JP", "Hiragino Sans", sans-serif',
      verticalText: false
    };

    this.preferences = {
      theme: 'dark',
      lang: 'ja',
      enablePressure: true,
      enableTilt: true,
      pressureGamma: 1.0,
      minPressure: 0.05,
      stabilizer: 4,
      uiScale: 1.0,
      handedness: 'right',
      longPressSeconds: 5.0
    };

    this.keybindings = this.getDefaultKeybindings();

    this.interaction = null;
    this.hoverWorldPos = { x: 0, y: 0, pressure: 0, tiltX: 0, tiltY: 0 };
    this.smartGuides = [];
    this.measureLine = null;
    this.activePenObject = null;
    this.activePointers = new Map();
    this.touchGesture = null;

    this.exportWorker = null;
    try {
      this.exportWorker = new Worker(new URL('./workers/export-worker.js', import.meta.url), { type: 'module' });
    } catch {
      this.exportWorker = null;
    }

    this.commands = new CommandManager(this.doc, this.rasterStore, () => {
      this.onDocumentChanged();
    });
  }

  getDefaultKeybindings() {
    return {
      'tool:select': 'V',
      'tool:node': 'A',
      'tool:lasso': 'L',
      'tool:pan': 'H',
      'tool:zoom': 'Z',
      'tool:eyedropper': 'I',
      'tool:measure': 'M',
      'tool:pen': 'P',
      'tool:freehand': 'N',
      'tool:vector-brush': 'B',
      'tool:shape-rect': 'U',
      'tool:shape-ellipse': 'O',
      'tool:text': 'T',
      'tool:raster-eraser': 'E',
      'tool:raster-bucket': 'G',
      'tool:raster-stamp': 'S',
      'action:undo': 'Ctrl+Z',
      'action:redo': 'Ctrl+Y',
      'action:delete': 'Delete',
      'action:duplicate': 'Ctrl+D',
      'action:swapColors': 'X',
      'action:saveWorkspace': 'Ctrl+S',
      'action:print': 'Ctrl+P',
      'action:zoomFit': 'Ctrl+0'
    };
  }

  getBindableActions() {
    return [
      { key: 'tool:select', label: '選択・範囲変形ツール' },
      { key: 'tool:node', label: 'ノード編集ツール' },
      { key: 'tool:lasso', label: '投げ縄選択ツール' },
      { key: 'tool:pan', label: '手のひらパン' },
      { key: 'tool:zoom', label: 'ズームツール' },
      { key: 'tool:eyedropper', label: 'スポイトツール' },
      { key: 'tool:measure', label: '定規計測ツール' },
      { key: 'tool:pen', label: 'ベジェペンツール' },
      { key: 'tool:freehand', label: 'フリーハンドパス' },
      { key: 'tool:vector-brush', label: '筆圧ベクターブラシ' },
      { key: 'tool:shape-rect', label: '矩形ツール' },
      { key: 'tool:shape-ellipse', label: '楕円ツール' },
      { key: 'tool:text', label: 'テキストツール' },
      { key: 'tool:raster-eraser', label: 'ラスター消しゴム' },
      { key: 'tool:raster-bucket', label: 'バケツ塗りつぶし' },
      { key: 'tool:raster-stamp', label: 'デコスタンプ' },
      { key: 'action:undo', label: '元に戻す (Undo)' },
      { key: 'action:redo', label: 'やり直す (Redo)' },
      { key: 'action:delete', label: '選択オブジェクトを削除' },
      { key: 'action:duplicate', label: '選択オブジェクトを複製' },
      { key: 'action:swapColors', label: 'メイン/サブカラー入替' },
      { key: 'action:saveWorkspace', label: 'ワークスペース保存 (.svgew)' },
      { key: 'action:print', label: '印刷 (Print)' },
      { key: 'action:zoomFit', label: '画面にフィット表示' }
    ];
  }

  async init() {
    this.mainCanvas = document.getElementById('main-canvas');
    this.overlayCanvas = document.getElementById('overlay-canvas');
    this.stageEl = document.getElementById('canvas-stage');
    this.rulerTop = document.getElementById('ruler-top');
    this.rulerLeft = document.getElementById('ruler-left');
    this.navCanvas = document.getElementById('navigator-canvas');

    this._installImageCopyProtection();
    this._populateTopIcons();

    // Load persisted preferences and workspace ONLY if Cookie/Storage consent was previously granted
    if (hasStorageConsent()) {
      const savedPrefs = loadPreferencesFromStorage();
      if (savedPrefs) {
        if (savedPrefs.preferences) Object.assign(this.preferences, savedPrefs.preferences);
        if (savedPrefs.keybindings) Object.assign(this.keybindings, savedPrefs.keybindings);
        document.documentElement.setAttribute('data-theme', this.preferences.theme || 'dark');
        document.documentElement.style.setProperty('--ui-scale', String(this.preferences.uiScale || 1));
        document.getElementById('app-shell').setAttribute('data-handedness', this.preferences.handedness || 'right');
        setLang(this.preferences.lang || 'ja');
      }
      const savedSession = await loadAutosaveSnapshot(this.rasterStore);
      if (savedSession && savedSession.doc && savedSession.doc.rootGroup) {
        this.doc = savedSession.doc;
        this._ensureAllRasterBuffers();
        const flat = flattenLayers(this.doc.rootGroup);
        this.activeLayerId = flat[0]?.layer.id || null;
        this.commands.setDocument(this.doc);
        if (savedSession.viewport) {
          Object.assign(this.viewport, savedSession.viewport);
        }
      }
    }

    this.updateCookieConsentBanner();
    this.syncToolbarCollapseToActiveLayer();
    this.renderToolbar();
    this.renderContextBar();
    this.initColorPickerUI();
    this.bindTopMenuEvents();
    this.bindViewportEvents();
    this.bindNavigatorEvents();
    this.bindLayerPanelEvents();
    this.bindKeyboardShortcuts();

    // Upgrade static range sliders into bespoke SVG magnetic snap sliders
    upgradeCustomSliders(document);

    const ro = new ResizeObserver(() => this.resizeViewportCanvases());
    ro.observe(this.stageEl);
    this.resizeViewportCanvases();
    if (!hasStorageConsent()) {
      this.zoomToFit();
    }

    this.refreshAllPanels();
    this.requestRender();
  }

  /**
   * Prevents right-click image menu, drag-and-drop copying, or saving of app icons & images
   */
  _installImageCopyProtection() {
    document.addEventListener('dragstart', (e) => {
      const t = e.target;
      if (t && (t.tagName === 'IMG' || t.tagName === 'SVG' || t.closest?.('svg'))) {
        e.preventDefault();
      }
    });
    document.addEventListener('contextmenu', (e) => {
      const t = e.target;
      if (t && (t.tagName === 'IMG' || t.tagName === 'SVG' || t.closest?.('svg') || t.closest?.('.tool-btn'))) {
        e.preventDefault();
      }
    });
  }

  _populateTopIcons() {
    const setBtnIcon = (id, iconName, text = '') => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = `${renderIcon(iconName, 17)}${text ? `<span>${text}</span>` : ''}`;
    };
    setBtnIcon('btn-toggle-left', 'layout-sidebar-left');
    setBtnIcon('btn-toggle-right', 'layout-sidebar-right');
    setBtnIcon('btn-undo', 'undo');
    setBtnIcon('btn-redo', 'redo');
    setBtnIcon('btn-quick-print', 'print');
    setBtnIcon('btn-settings', 'settings');
    setBtnIcon('btn-help', 'help');
  }

  updateCookieConsentBanner() {
    const bar = document.getElementById('cookie-consent-bar');
    const saveEl = document.getElementById('st-save');
    const consented = hasStorageConsent();

    if (bar) {
      bar.classList.toggle('visible', !consented && !this._consentDismissedForSession);
      const acceptBtn = document.getElementById('btn-cookie-accept');
      const declineBtn = document.getElementById('btn-cookie-decline');
      if (acceptBtn) {
        acceptBtn.onclick = async () => {
          setStorageConsent(true);
          savePreferencesToStorage({ preferences: this.preferences, keybindings: this.keybindings });
          await saveAutosaveSnapshot(this.doc, this.rasterStore, this.viewport);
          bar.classList.remove('visible');
          this.updateCookieConsentBanner();
          this.showToast('Cookie・ストレージ保存を有効化しました（ワークスペースと設定が自動保持されます）');
        };
      }
      if (declineBtn) {
        declineBtn.onclick = () => {
          this._consentDismissedForSession = true;
          setStorageConsent(false);
          bar.classList.remove('visible');
          this.updateCookieConsentBanner();
          this.showToast('同意なしモード: Cookieおよびストレージへの保存を一切行いません');
        };
      }
    }

    if (saveEl) {
      if (consented) {
        saveEl.textContent = `● ${t('status.saved')}`;
        saveEl.style.color = 'var(--vector-badge)';
      } else {
        saveEl.textContent = `● ${t('status.noConsent')}`;
        saveEl.style.color = 'var(--text-muted)';
      }
      saveEl.onclick = () => showPreferencesModal(this, 'general');
    }
  }

  _ensureAllRasterBuffers() {
    const all = flattenLayers(this.doc.rootGroup);
    for (const item of all) {
      if (item.layer.type === 'raster') {
        this.rasterStore.ensureBuffer(
          item.layer.assetId,
          item.layer.width || this.doc.canvas.width,
          item.layer.height || this.doc.canvas.height
        );
      }
    }
  }

  getActiveLayer() {
    if (!this.activeLayerId) return null;
    const found = findLayerById(this.doc.rootGroup, this.activeLayerId);
    return found ? found.layer : null;
  }

  /**
   * Auto-expands Vector tools and collapses Raster tools when a Vector layer is active (and vice versa!)
   */
  syncToolbarCollapseToActiveLayer() {
    const layer = this.getActiveLayer();
    if (!layer) return;
    if (layer.type === 'vector') {
      this.toolbarCollapsed.vector = false;
      this.toolbarCollapsed.raster = true;
    } else if (layer.type === 'raster') {
      this.toolbarCollapsed.vector = true;
      this.toolbarCollapsed.raster = false;
    }
  }

  getToolCompatibility(toolDef) {
    const layer = this.getActiveLayer();
    if (toolDef.scope === 'common') {
      return { enabled: true, reason: toolDef.labelJa };
    }
    if (!layer) {
      return { enabled: false, reason: 'レイヤーが選択されていません。' };
    }
    if (layer.locked || !layer.visible) {
      return { enabled: false, reason: t('tool.disabled.locked') };
    }
    if (layer.type === 'group') {
      return { enabled: false, reason: t('tool.disabled.group') };
    }
    if (toolDef.scope === 'vector' && layer.type !== 'vector') {
      return { enabled: false, reason: t('tool.disabled.needVector') };
    }
    if (toolDef.scope === 'raster' && layer.type !== 'raster') {
      return { enabled: false, reason: t('tool.disabled.needRaster') };
    }
    return { enabled: true, reason: toolDef.labelJa };
  }

  selectTool(toolId) {
    const def = TOOL_DEFINITIONS.find(t => t.id === toolId);
    if (!def) return;
    const compat = this.getToolCompatibility(def);
    if (!compat.enabled) {
      this.showToast(compat.reason);
      return;
    }
    this.activeToolId = toolId;
    this.activePenObject = null;

    // If the tool has an associated raster brush preset, apply its defaults
    if (def.preset && RASTER_BRUSH_PRESETS[def.preset]) {
      const p = RASTER_BRUSH_PRESETS[def.preset];
      this.toolOptions.rasterPreset = def.preset;
      this.toolOptions.brushSize = p.size;
      this.toolOptions.hardness = p.hardness;
      this.toolOptions.spacing = p.spacing;
      this.paintState.opacity = p.opacity;
    }

    this.renderToolbar();
    this.renderContextBar();
    if (this.inspectedToolId) {
      this.openToolInspectorTab(toolId);
    }
    this.updateStatusBar();
    this.requestRender();
  }

  validateActiveToolForLayer() {
    this.syncToolbarCollapseToActiveLayer();
    const currentDef = TOOL_DEFINITIONS.find(t => t.id === this.activeToolId);
    if (!currentDef) return;
    const compat = this.getToolCompatibility(currentDef);
    if (!compat.enabled) {
      this.activeToolId = 'select';
    }
    this.renderToolbar();
    this.renderContextBar();
  }

  // ============================================================================
  // Left Toolbar (Collapsible by Layer Mode + Configurable Long-Press -> Right Dock Tool Tab)
  // ============================================================================

  renderToolbar() {
    const container = document.getElementById('left-toolbar');
    if (!container) return;

    const renderSection = (sectionKey, title, cssClass, scopeFilter) => {
      const isCollapsed = Boolean(this.toolbarCollapsed[sectionKey]);
      const tools = TOOL_DEFINITIONS.filter(scopeFilter);
      const buttons = tools.map(tool => {
        const compat = this.getToolCompatibility(tool);
        const isActive = this.activeToolId === tool.id;
        const badge = tool.scope === 'vector'
          ? `<span class="tool-badge v">V</span>`
          : tool.scope === 'raster'
            ? `<span class="tool-badge r">R</span>`
            : '';
        const lpSec = this.preferences.longPressSeconds ?? 5;
        const tooltip = compat.enabled
          ? `${tool.labelJa} (長押し${lpSec}秒で右ドックに詳細設定を表示)`
          : `【無効】${compat.reason}`;
        return `
          <button
            type="button"
            class="tool-btn ${isActive ? 'active' : ''} ${!compat.enabled ? 'tool-disabled' : ''}"
            data-tool-id="${tool.id}"
            ${!compat.enabled ? 'aria-disabled="true"' : ''}
            title="${tooltip}">
            ${renderIcon(tool.icon, 19)}
            ${badge}
          </button>
        `;
      }).join('');

      return `
        <button type="button" class="tool-section-header ${cssClass}" data-toggle-sec="${sectionKey}" title="クリックで ${title} ツール群を展開/折りたたみ">
          <span>${isCollapsed ? '▸' : '▾'}</span>
          <span>${title}</span>
        </button>
        <div class="tool-section-group ${isCollapsed ? 'collapsed' : ''}">
          ${buttons}
        </div>
      `;
    };

    container.innerHTML = [
      renderSection('common', 'Common', '', t => t.scope === 'common'),
      renderSection('vector', 'Vector', 'vec', t => t.scope === 'vector'),
      renderSection('raster', 'Raster', 'ras', t => t.scope === 'raster')
    ].join('');

    container.querySelectorAll('[data-toggle-sec]').forEach(hdr => {
      hdr.onclick = () => {
        const key = hdr.getAttribute('data-toggle-sec');
        this.toolbarCollapsed[key] = !this.toolbarCollapsed[key];
        this.renderToolbar();
      };
    });

    // Bind tool button click + Configurable Long-Press (default 5s) to open Right Dock Tool Inspector Tab
    container.querySelectorAll('.tool-btn').forEach(btn => {
      const tid = btn.getAttribute('data-tool-id');
      let lpTimer = null;

      const clearLp = () => {
        if (lpTimer) {
          clearTimeout(lpTimer);
          lpTimer = null;
        }
        btn.classList.remove('long-pressing');
      };

      btn.addEventListener('pointerdown', () => {
        clearLp();
        btn.classList.add('long-pressing');
        const waitMs = Math.max(400, (Number(this.preferences.longPressSeconds) || 5) * 1000);
        lpTimer = setTimeout(() => {
          btn.classList.remove('long-pressing');
          this.selectTool(tid);
          this.openToolInspectorTab(tid);
          this.showToast(`ツール詳細設定タブを右ドックパネルに開きました`);
        }, waitMs);
      });

      btn.addEventListener('pointerup', clearLp);
      btn.addEventListener('pointerleave', clearLp);
      btn.addEventListener('pointercancel', clearLp);

      btn.onclick = () => {
        this.selectTool(tid);
      };
    });
  }

  /**
   * Opens a Closable Tool-Settings Tab at the top of the Right Dock Panel
   */
  openToolInspectorTab(toolId) {
    const panel = document.getElementById('panel-tool-inspector');
    const titleEl = document.getElementById('tool-inspector-title');
    const bodyEl = document.getElementById('tool-inspector-body');
    const closeBtn = document.getElementById('btn-close-tool-inspector');
    if (!panel || !bodyEl) return;

    const toolDef = TOOL_DEFINITIONS.find(t => t.id === toolId) || TOOL_DEFINITIONS[0];
    this.inspectedToolId = toolId;

    // Ensure right dock is visible
    document.getElementById('right-dock').classList.remove('collapsed');
    panel.style.display = 'flex';
    titleEl.innerHTML = `${renderIcon(toolDef.icon, 16)} <span>${toolDef.labelJa} 詳細設定</span>`;

    closeBtn.onclick = (e) => {
      e.stopPropagation();
      this.inspectedToolId = null;
      panel.style.display = 'none';
    };

    const shortcutKey = `tool:${toolId}`;
    const currentShortcut = this.keybindings[shortcutKey] || toolDef.shortcut || '未割当';

    bodyEl.innerHTML = `
      <div style="font-size:0.78rem; color:var(--text-muted); display:flex; justify-content:space-between;">
        <span>対象レイヤー: <strong>${toolDef.scope.toUpperCase()}</strong></span>
        <span>ショートカット: <code>${currentShortcut}</code></span>
      </div>
      <div class="form-field">
        <label>ブラシサイズ / 線幅: <strong id="ti-size-val">${this.toolOptions.brushSize}px</strong></label>
        <input type="range" id="ti-brush-size" data-snap="brushSize" min="1" max="200" value="${this.toolOptions.brushSize}">
      </div>
      <div class="form-field">
        <label>不透明度 (Opacity): <strong id="ti-op-val">${Math.round(this.paintState.opacity * 100)}%</strong></label>
        <input type="range" id="ti-opacity" data-snap="percent" min="5" max="100" value="${Math.round(this.paintState.opacity * 100)}">
      </div>
      <div class="form-field">
        <label>ブラシ硬さ (Hardness): <strong id="ti-hard-val">${Math.round(this.toolOptions.hardness * 100)}%</strong></label>
        <input type="range" id="ti-hardness" data-snap="percent" min="5" max="100" value="${Math.round(this.toolOptions.hardness * 100)}">
      </div>
      <div class="form-field">
        <label>手ブレ補正 (Stabilizer): <strong id="ti-stab-val">${this.preferences.stabilizer}</strong></label>
        <input type="range" id="ti-stabilizer" data-snap="none" min="0" max="15" value="${this.preferences.stabilizer}">
      </div>
    `;

    upgradeCustomSliders(bodyEl);

    bodyEl.querySelector('#ti-brush-size').oninput = (e) => {
      this.toolOptions.brushSize = Number(e.target.value) || 12;
      this.paintState.strokeWidth = this.toolOptions.brushSize;
      bodyEl.querySelector('#ti-size-val').textContent = `${this.toolOptions.brushSize}px`;
      this.renderContextBar();
    };
    bodyEl.querySelector('#ti-opacity').oninput = (e) => {
      this.paintState.opacity = (Number(e.target.value) || 100) / 100;
      bodyEl.querySelector('#ti-op-val').textContent = `${e.target.value}%`;
      this.renderContextBar();
    };
    bodyEl.querySelector('#ti-hardness').oninput = (e) => {
      this.toolOptions.hardness = (Number(e.target.value) || 85) / 100;
      bodyEl.querySelector('#ti-hard-val').textContent = `${e.target.value}%`;
      this.renderContextBar();
    };
    bodyEl.querySelector('#ti-stabilizer').oninput = (e) => {
      this.preferences.stabilizer = Number(e.target.value) || 0;
      bodyEl.querySelector('#ti-stab-val').textContent = e.target.value;
    };
  }

  // ============================================================================
  // Top Context Bar Rendering (with Custom SVG Magnetic Snap Sliders)
  // ============================================================================

  renderContextBar() {
    const bar = document.getElementById('context-bar');
    if (!bar) return;
    const toolDef = TOOL_DEFINITIONS.find(t => t.id === this.activeToolId) || TOOL_DEFINITIONS[0];

    let html = `
      <div class="ctx-item" style="font-weight:700; color:var(--accent-hover);">
        ${renderIcon(toolDef.icon, 17)}
        <span>${toolDef.labelJa}</span>
      </div>
    `;

    const isRasterStrokeTool = this.activeToolId.startsWith('raster-') && !['raster-bucket', 'raster-gradient'].includes(this.activeToolId);
    const isVectorBrush = ['vector-brush', 'vector-eraser'].includes(this.activeToolId);

    if (isRasterStrokeTool || isVectorBrush) {
      html += `
        <div class="ctx-item">
          <label>サイズ</label>
          <input type="range" id="ctx-brush-size" data-snap="brushSize" min="1" max="200" value="${this.toolOptions.brushSize}" style="width:95px">
          <span id="ctx-brush-size-val">${this.toolOptions.brushSize}px</span>
        </div>
      `;
    } else if (toolDef.scope === 'vector') {
      html += `
        <div class="ctx-item">
          <label>塗り</label>
          <select id="ctx-fill-type">
            <option value="solid" ${this.paintState.fillType === 'solid' ? 'selected' : ''}>単色 (Solid)</option>
            <option value="gradient" ${this.paintState.fillType === 'gradient' ? 'selected' : ''}>グラデーション</option>
            <option value="pattern" ${this.paintState.fillType === 'pattern' ? 'selected' : ''}>パターン</option>
            <option value="none" ${this.paintState.fillType === 'none' ? 'selected' : ''}>なし (None)</option>
          </select>
        </div>
        <div class="ctx-item">
          <label>線幅</label>
          <input type="number" id="ctx-stroke-w" min="0" max="120" value="${this.paintState.strokeWidth}">
        </div>
      `;
    }

    html += `
      <div class="ctx-item">
        <label>不透明度</label>
        <input type="range" id="ctx-opacity" data-snap="percent" min="5" max="100" value="${Math.round(this.paintState.opacity * 100)}" style="width:88px">
        <span id="ctx-opacity-val">${Math.round(this.paintState.opacity * 100)}%</span>
      </div>
    `;

    // Tool-Specific Dynamic Controls
    if (this.activeToolId === 'select') {
      html += `
        <div class="ctx-item">
          <button type="button" id="ctx-align-left" title="左揃え">${renderIcon('align-left', 16)}</button>
          <button type="button" id="ctx-align-ch" title="水平中央揃え">${renderIcon('align-center-h', 16)}</button>
          <button type="button" id="ctx-align-right" title="右揃え">${renderIcon('align-right', 16)}</button>
          <button type="button" id="ctx-align-top" title="上揃え">${renderIcon('align-top', 16)}</button>
          <button type="button" id="ctx-align-cv" title="垂直中央揃え">${renderIcon('align-center-v', 16)}</button>
          <button type="button" id="ctx-align-bottom" title="下揃え">${renderIcon('align-bottom', 16)}</button>
        </div>
        <div class="ctx-item">
          <button type="button" id="ctx-flip-h" title="左右反転">${renderIcon('flip-h', 16)}</button>
          <button type="button" id="ctx-flip-v" title="上下反転">${renderIcon('flip-v', 16)}</button>
        </div>
        <div class="ctx-item">
          <button type="button" id="ctx-bool-union" title="パス合体 (2つ選択時)">${renderIcon('bool-union', 16)}合体</button>
          <button type="button" id="ctx-bool-sub" title="パス型抜き">${renderIcon('bool-subtract', 16)}型抜き</button>
          <button type="button" id="ctx-bool-int" title="パス交差">${renderIcon('bool-intersect', 16)}交差</button>
          <button type="button" id="ctx-bool-exc" title="パス除外">${renderIcon('bool-exclude', 16)}除外</button>
          <button type="button" id="ctx-to-path" title="選択図形をベジェパスに変換">アウトライン化</button>
        </div>
      `;
    } else if (this.activeToolId === 'shape-rounded-rect' || this.activeToolId === 'shape-callout') {
      html += `
        <div class="ctx-item">
          <label>角丸半径 (rx)</label>
          <input type="number" id="ctx-corner-r" min="0" max="200" value="${this.toolOptions.cornerRadius}">
        </div>
      `;
    } else if (this.activeToolId === 'shape-polygon' || this.activeToolId === 'shape-star') {
      html += `
        <div class="ctx-item">
          <label>頂点数</label>
          <input type="number" id="ctx-poly-sides" min="3" max="32" value="${this.toolOptions.polygonSides}">
        </div>
      `;
      if (this.activeToolId === 'shape-star') {
        html += `
          <div class="ctx-item">
            <label>内径比</label>
            <input type="range" id="ctx-star-ratio" data-snap="percent" min="15" max="90" value="${Math.round(this.toolOptions.starInnerRatio * 100)}" style="width:85px">
          </div>
        `;
      }
    } else if (this.activeToolId === 'freehand') {
      html += `
        <div class="ctx-item">
          <label>ノード簡略化</label>
          <input type="range" id="ctx-freehand-tol" data-snap="none" min="1" max="12" step="0.5" value="${this.toolOptions.smoothingTolerance}" style="width:85px">
        </div>
      `;
    } else if (this.activeToolId === 'text') {
      html += `
        <div class="ctx-item">
          <label>サイズ</label>
          <input type="number" id="ctx-font-size" min="8" max="300" value="${this.toolOptions.fontSize}">
        </div>
        <div class="ctx-item">
          <label style="display:flex; align-items:center; gap:4px; color:var(--text-main); cursor:pointer;">
            <input type="checkbox" id="ctx-text-vertical" ${this.toolOptions.verticalText ? 'checked' : ''}> 縦書き
          </label>
        </div>
      `;
    } else if (this.activeToolId === 'raster-bucket') {
      html += `
        <div class="ctx-item">
          <label>許容値</label>
          <input type="range" id="ctx-bucket-tol" data-snap="percent" min="0" max="120" value="${this.toolOptions.bucketTolerance}" style="width:85px">
          <span id="ctx-bucket-tol-val">${this.toolOptions.bucketTolerance}</span>
        </div>
        <div class="ctx-item">
          <label style="display:flex; align-items:center; gap:4px; color:var(--text-main);">
            <input type="checkbox" id="ctx-bucket-contig" ${this.toolOptions.bucketContiguous ? 'checked' : ''}> 隣接のみ
          </label>
        </div>
      `;
    } else if (this.activeToolId === 'raster-dodge') {
      html += `
        <div class="ctx-item">
          <label>効果</label>
          <select id="ctx-dodge-mode">
            <option value="lighter" ${this.toolOptions.dodgeMode === 'lighter' ? 'selected' : ''}>覆い焼き (ハイライト発光)</option>
            <option value="multiply" ${this.toolOptions.dodgeMode === 'multiply' ? 'selected' : ''}>焼き込み (シャドウ陰影)</option>
          </select>
        </div>
      `;
    } else if (this.activeToolId === 'raster-stamp') {
      html += `
        <div class="ctx-item">
          <label>スタンプ形状</label>
          <select id="ctx-stamp-shape">
            <option value="star" ${this.toolOptions.stampShape === 'star' ? 'selected' : ''}>★ スター</option>
            <option value="heart" ${this.toolOptions.stampShape === 'heart' ? 'selected' : ''}>♥ ハート</option>
            <option value="sparkle" ${this.toolOptions.stampShape === 'sparkle' ? 'selected' : ''}>✦ キラメキ</option>
          </select>
        </div>
      `;
    } else if (this.activeToolId === 'raster-symmetry') {
      html += `
        <div class="ctx-item">
          <label>対称モード</label>
          <select id="ctx-sym-mode">
            <option value="horizontal" ${this.toolOptions.symmetryMode === 'horizontal' ? 'selected' : ''}>左右ミラー対称</option>
            <option value="quad" ${this.toolOptions.symmetryMode === 'quad' ? 'selected' : ''}>上下左右4方向対称</option>
          </select>
        </div>
      `;
    } else if (this.activeToolId === 'raster-line') {
      html += `
        <div class="ctx-item">
          <label>図形種類</label>
          <select id="ctx-ras-shape">
            <option value="line" ${this.toolOptions.rasterShapeKind === 'line' ? 'selected' : ''}>直線</option>
            <option value="rect" ${this.toolOptions.rasterShapeKind === 'rect' ? 'selected' : ''}>矩形枠</option>
            <option value="fill-rect" ${this.toolOptions.rasterShapeKind === 'fill-rect' ? 'selected' : ''}>塗りつぶし矩形</option>
          </select>
        </div>
      `;
    } else if (isRasterStrokeTool) {
      html += `
        <div class="ctx-item">
          <label>硬さ</label>
          <input type="range" id="ctx-raster-hard" data-snap="percent" min="5" max="100" value="${Math.round(this.toolOptions.hardness * 100)}" style="width:85px">
        </div>
      `;
    }

    bar.innerHTML = html;
    upgradeCustomSliders(bar);
    this._bindContextBarInputs(bar);
  }

  _bindContextBarInputs(bar) {
    const bind = (id, ev, handler) => {
      const el = bar.querySelector(id);
      if (el) el.addEventListener(ev, handler);
    };

    bind('#ctx-brush-size', 'input', (e) => {
      this.toolOptions.brushSize = Number(e.target.value) || 12;
      const lbl = bar.querySelector('#ctx-brush-size-val');
      if (lbl) lbl.textContent = `${this.toolOptions.brushSize}px`;
    });
    bind('#ctx-fill-type', 'change', (e) => {
      this.paintState.fillType = e.target.value;
      this.applyPaintToSelection();
    });
    bind('#ctx-stroke-w', 'input', (e) => {
      this.paintState.strokeWidth = Math.max(0, Number(e.target.value) || 0);
      this.applyPaintToSelection();
    });
    bind('#ctx-opacity', 'input', (e) => {
      this.paintState.opacity = (Number(e.target.value) || 100) / 100;
      const lbl = bar.querySelector('#ctx-opacity-val');
      if (lbl) lbl.textContent = `${e.target.value}%`;
      this.applyPaintToSelection();
    });
    bind('#ctx-corner-r', 'input', (e) => {
      this.toolOptions.cornerRadius = Math.max(0, Number(e.target.value) || 0);
    });
    bind('#ctx-poly-sides', 'input', (e) => {
      this.toolOptions.polygonSides = Math.max(3, Number(e.target.value) || 5);
    });
    bind('#ctx-star-ratio', 'input', (e) => {
      this.toolOptions.starInnerRatio = (Number(e.target.value) || 45) / 100;
    });
    bind('#ctx-freehand-tol', 'input', (e) => {
      this.toolOptions.smoothingTolerance = Number(e.target.value) || 2.5;
    });
    bind('#ctx-font-size', 'input', (e) => {
      this.toolOptions.fontSize = Math.max(8, Number(e.target.value) || 36);
    });
    bind('#ctx-text-vertical', 'change', (e) => {
      this.toolOptions.verticalText = e.target.checked;
    });
    bind('#ctx-raster-hard', 'input', (e) => {
      this.toolOptions.hardness = (Number(e.target.value) || 85) / 100;
    });
    bind('#ctx-bucket-tol', 'input', (e) => {
      this.toolOptions.bucketTolerance = Number(e.target.value) || 24;
      const lbl = bar.querySelector('#ctx-bucket-tol-val');
      if (lbl) lbl.textContent = String(this.toolOptions.bucketTolerance);
    });
    bind('#ctx-bucket-contig', 'change', (e) => {
      this.toolOptions.bucketContiguous = e.target.checked;
    });
    bind('#ctx-dodge-mode', 'change', (e) => {
      this.toolOptions.dodgeMode = e.target.value;
    });
    bind('#ctx-stamp-shape', 'change', (e) => {
      this.toolOptions.stampShape = e.target.value;
    });
    bind('#ctx-sym-mode', 'change', (e) => {
      this.toolOptions.symmetryMode = e.target.value;
    });
    bind('#ctx-ras-shape', 'change', (e) => {
      this.toolOptions.rasterShapeKind = e.target.value;
    });

    bind('#ctx-align-left', 'click', () => this.alignSelectedObjects('left'));
    bind('#ctx-align-ch', 'click', () => this.alignSelectedObjects('center-h'));
    bind('#ctx-align-right', 'click', () => this.alignSelectedObjects('right'));
    bind('#ctx-align-top', 'click', () => this.alignSelectedObjects('top'));
    bind('#ctx-align-cv', 'click', () => this.alignSelectedObjects('center-v'));
    bind('#ctx-align-bottom', 'click', () => this.alignSelectedObjects('bottom'));
    bind('#ctx-flip-h', 'click', () => this.flipSelectedObjects('h'));
    bind('#ctx-flip-v', 'click', () => this.flipSelectedObjects('v'));
    bind('#ctx-bool-union', 'click', () => this.runBooleanOnSelection('union'));
    bind('#ctx-bool-sub', 'click', () => this.runBooleanOnSelection('subtract'));
    bind('#ctx-bool-int', 'click', () => this.runBooleanOnSelection('intersect'));
    bind('#ctx-bool-exc', 'click', () => this.runBooleanOnSelection('exclude'));
    bind('#ctx-to-path', 'click', () => this.convertSelectionToPath());
  }

  // ============================================================================
  // Viewport Coordinate Transforms, Interactive Navigator Minimap & Rendering
  // ============================================================================

  resizeViewportCanvases() {
    if (!this.stageEl || !this.mainCanvas || !this.overlayCanvas) return;
    const rect = this.stageEl.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(1, Math.floor(rect.width));
    const h = Math.max(1, Math.floor(rect.height));

    for (const c of [this.mainCanvas, this.overlayCanvas]) {
      c.width = Math.floor(w * dpr);
      c.height = Math.floor(h * dpr);
      c.style.width = `${w}px`;
      c.style.height = `${h}px`;
    }

    if (this.rulerTop && this.rulerLeft) {
      this.rulerTop.width = Math.floor(w * dpr);
      this.rulerTop.height = Math.floor(22 * dpr);
      this.rulerLeft.width = Math.floor(22 * dpr);
      this.rulerLeft.height = Math.floor(h * dpr);
    }

    this.requestRender();
  }

  screenToWorld(sx, sy) {
    const cx = this.doc.canvas.width / 2;
    const cy = this.doc.canvas.height / 2;
    let dx = (sx - this.viewport.panX) / this.viewport.zoom - cx;
    let dy = (sy - this.viewport.panY) / this.viewport.zoom - cy;

    if (this.viewport.flipX) {
      dx = -dx;
    }
    if (this.viewport.rotation !== 0) {
      const rad = -this.viewport.rotation * DEG_TO_RAD;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      const rx = dx * cos - dy * sin;
      const ry = dx * sin + dy * cos;
      dx = rx;
      dy = ry;
    }
    return { x: dx + cx, y: dy + cy };
  }

  worldToScreen(wx, wy) {
    const cx = this.doc.canvas.width / 2;
    const cy = this.doc.canvas.height / 2;
    let dx = wx - cx;
    let dy = wy - cy;

    if (this.viewport.rotation !== 0) {
      const rad = this.viewport.rotation * DEG_TO_RAD;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      const rx = dx * cos - dy * sin;
      const ry = dx * sin + dy * cos;
      dx = rx;
      dy = ry;
    }
    if (this.viewport.flipX) {
      dx = -dx;
    }
    return {
      x: (dx + cx) * this.viewport.zoom + this.viewport.panX,
      y: (dy + cy) * this.viewport.zoom + this.viewport.panY
    };
  }

  zoomToFit() {
    if (!this.stageEl) return;
    const rect = this.stageEl.getBoundingClientRect();
    const pad = 70;
    const availW = Math.max(100, rect.width - pad * 2);
    const availH = Math.max(100, rect.height - pad * 2);
    const scale = Math.min(availW / this.doc.canvas.width, availH / this.doc.canvas.height);
    this.viewport.zoom = Math.max(0.05, Math.min(4, Number(scale.toFixed(2))));
    this.viewport.panX = (rect.width - this.doc.canvas.width * this.viewport.zoom) / 2;
    this.viewport.panY = (rect.height - this.doc.canvas.height * this.viewport.zoom) / 2;
    this.viewport.rotation = 0;
    this._syncNavigatorSliders();
    this.requestRender();
    this.updateStatusBar();
  }

  setZoom(newZoom, anchorScreenX = null, anchorScreenY = null) {
    const clamped = Math.max(0.01, Math.min(64, newZoom));
    if (anchorScreenX != null && anchorScreenY != null) {
      const beforeWorld = this.screenToWorld(anchorScreenX, anchorScreenY);
      this.viewport.zoom = clamped;
      const afterScreen = this.worldToScreen(beforeWorld.x, beforeWorld.y);
      this.viewport.panX += (anchorScreenX - afterScreen.x);
      this.viewport.panY += (anchorScreenY - afterScreen.y);
    } else if (this.stageEl) {
      const rect = this.stageEl.getBoundingClientRect();
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const beforeWorld = this.screenToWorld(cx, cy);
      this.viewport.zoom = clamped;
      const afterScreen = this.worldToScreen(beforeWorld.x, beforeWorld.y);
      this.viewport.panX += (cx - afterScreen.x);
      this.viewport.panY += (cy - afterScreen.y);
    } else {
      this.viewport.zoom = clamped;
    }
    this._syncNavigatorSliders();
    this.requestRender();
    this.updateStatusBar();
  }

  _syncNavigatorSliders() {
    const zPct = Math.round(this.viewport.zoom * 100);
    setSliderValue('nav-zoom-slider', Math.max(10, Math.min(800, zPct)));
    const zVal = document.getElementById('nav-zoom-val');
    if (zVal) zVal.textContent = `${zPct}%`;

    setSliderValue('nav-rot-slider', this.viewport.rotation);
    const rVal = document.getElementById('nav-rot-val');
    if (rVal) rVal.textContent = `${this.viewport.rotation}°`;
  }

  /**
   * Interactive Navigator Minimap: Clicking or dragging inside the Navigator moves the red viewport frame directly!
   */
  bindNavigatorEvents() {
    if (!this.navCanvas) return;
    let draggingNav = false;

    const panViewportToNavPoint = (e) => {
      if (!this.stageEl) return;
      const rect = this.navCanvas.getBoundingClientRect();
      const nx = (e.clientX - rect.left) * (this.navCanvas.width / (rect.width || 1));
      const ny = (e.clientY - rect.top) * (this.navCanvas.height / (rect.height || 1));

      const nw = this.navCanvas.width;
      const nh = this.navCanvas.height;
      const scale = Math.min((nw - 8) / this.doc.canvas.width, (nh - 8) / this.doc.canvas.height);
      const ox = (nw - this.doc.canvas.width * scale) / 2;
      const oy = (nh - this.doc.canvas.height * scale) / 2;

      const targetWorldX = (nx - ox) / scale;
      const targetWorldY = (ny - oy) / scale;

      const stageRect = this.stageEl.getBoundingClientRect();
      const currentTargetScreen = this.worldToScreen(targetWorldX, targetWorldY);
      this.viewport.panX += (stageRect.width / 2 - currentTargetScreen.x);
      this.viewport.panY += (stageRect.height / 2 - currentTargetScreen.y);
      this.requestRender();
    };

    this.navCanvas.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.navCanvas.setPointerCapture(e.pointerId);
      draggingNav = true;
      this.navCanvas.style.cursor = 'grabbing';
      panViewportToNavPoint(e);
    });

    this.navCanvas.addEventListener('pointermove', (e) => {
      if (!draggingNav) return;
      panViewportToNavPoint(e);
    });

    const endNav = () => {
      draggingNav = false;
      this.navCanvas.style.cursor = 'grab';
    };
    this.navCanvas.addEventListener('pointerup', endNav);
    this.navCanvas.addEventListener('pointercancel', endNav);
  }

  requestRender() {
    if (this._rafPending) return;
    this._rafPending = true;
    requestAnimationFrame(() => {
      this._rafPending = false;
      this.renderFrame();
    });
  }

  renderFrame() {
    if (!this.mainCanvas || !this.overlayCanvas) return;
    const dpr = window.devicePixelRatio || 1;
    const ctx = this.mainCanvas.getContext('2d');
    const octx = this.overlayCanvas.getContext('2d');

    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, this.mainCanvas.width / dpr, this.mainCanvas.height / dpr);

    const cx = this.doc.canvas.width / 2;
    const cy = this.doc.canvas.height / 2;
    ctx.translate(this.viewport.panX, this.viewport.panY);
    ctx.scale(this.viewport.zoom, this.viewport.zoom);
    ctx.translate(cx, cy);
    if (this.viewport.flipX) ctx.scale(-1, 1);
    if (this.viewport.rotation !== 0) ctx.rotate(this.viewport.rotation * DEG_TO_RAD);
    ctx.translate(-cx, -cy);

    const cw = this.doc.canvas.width;
    const ch = this.doc.canvas.height;
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = 18 / this.viewport.zoom;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, cw, ch);
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, cw, ch);
    ctx.clip();

    if (this.doc.canvas.background.type === 'transparent') {
      this._drawCheckerboard(ctx, cw, ch);
    } else {
      ctx.fillStyle = this.doc.canvas.background.type === 'white'
        ? '#ffffff'
        : (this.doc.canvas.background.color || '#ffffff');
      ctx.fillRect(0, 0, cw, ch);
    }

    renderLayerTreeToContext(ctx, this.doc.rootGroup, this.doc, this.rasterStore, this.imageCache);

    if (this.doc.grid.enabled) {
      this._drawCanvasGrid(ctx, cw, ch);
    }

    ctx.restore();

    ctx.strokeStyle = 'rgba(148, 163, 184, 0.45)';
    ctx.lineWidth = 1 / this.viewport.zoom;
    ctx.strokeRect(0, 0, cw, ch);
    ctx.restore();

    this._renderOverlay(octx, dpr);
    this._renderRulers(dpr);
    this._renderNavigator();
  }

  _drawCheckerboard(ctx, w, h) {
    const size = 16;
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#cbd5e1';
    for (let y = 0; y < h; y += size) {
      for (let x = (y / size) % 2 === 0 ? 0 : size; x < w; x += size * 2) {
        ctx.fillRect(x, y, size, size);
      }
    }
  }

  _drawCanvasGrid(ctx, w, h) {
    const step = Math.max(10, Number(this.doc.grid.size) || 50);
    ctx.save();
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.22)';
    ctx.lineWidth = 1 / this.viewport.zoom;
    ctx.beginPath();
    for (let x = 0; x <= w; x += step) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
    }
    for (let y = 0; y <= h; y += step) {
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
    }
    ctx.stroke();
    ctx.restore();
  }

  _renderOverlay(octx, dpr) {
    octx.save();
    octx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const sw = this.overlayCanvas.width / dpr;
    const sh = this.overlayCanvas.height / dpr;
    octx.clearRect(0, 0, sw, sh);

    // 1. Guides
    for (const g of this.doc.guides || []) {
      octx.save();
      octx.strokeStyle = g.color || '#06b6d4';
      octx.lineWidth = 1;
      octx.setLineDash([5, 3]);
      octx.beginPath();
      if (g.axis === 'h') {
        const p = this.worldToScreen(0, g.position);
        octx.moveTo(0, p.y);
        octx.lineTo(sw, p.y);
      } else {
        const p = this.worldToScreen(g.position, 0);
        octx.moveTo(p.x, 0);
        octx.lineTo(p.x, sh);
      }
      octx.stroke();
      octx.restore();
    }

    // 2. Symmetry Ruler Line when raster-symmetry is active
    if (this.activeToolId === 'raster-symmetry') {
      octx.save();
      octx.strokeStyle = 'rgba(168, 85, 247, 0.75)';
      octx.lineWidth = 1.5;
      octx.setLineDash([6, 4]);
      const midTop = this.worldToScreen(this.doc.canvas.width / 2, 0);
      const midBot = this.worldToScreen(this.doc.canvas.width / 2, this.doc.canvas.height);
      octx.beginPath();
      octx.moveTo(midTop.x, midTop.y);
      octx.lineTo(midBot.x, midBot.y);
      if (this.toolOptions.symmetryMode === 'quad') {
        const midL = this.worldToScreen(0, this.doc.canvas.height / 2);
        const midR = this.worldToScreen(this.doc.canvas.width, this.doc.canvas.height / 2);
        octx.moveTo(midL.x, midL.y);
        octx.lineTo(midR.x, midR.y);
      }
      octx.stroke();
      octx.restore();
    }

    // 3. Smart Alignment Guides
    for (const sg of this.smartGuides) {
      octx.save();
      octx.strokeStyle = '#ec4899';
      octx.lineWidth = 1.25;
      octx.beginPath();
      if (sg.axis === 'x') {
        const p = this.worldToScreen(sg.pos, 0);
        octx.moveTo(p.x, 0);
        octx.lineTo(p.x, sh);
      } else {
        const p = this.worldToScreen(0, sg.pos);
        octx.moveTo(0, p.y);
        octx.lineTo(sw, p.y);
      }
      octx.stroke();
      octx.restore();
    }

    // 4. Rectangular Marquee Selection Box (`marquee-select`)
    if (this.interaction && this.interaction.type === 'marquee-select') {
      const p1 = this.worldToScreen(this.interaction.startWorld.x, this.interaction.startWorld.y);
      const p2 = this.worldToScreen(this.interaction.currentWorld.x, this.interaction.currentWorld.y);
      const rx = Math.min(p1.x, p2.x);
      const ry = Math.min(p1.y, p2.y);
      const rw = Math.abs(p2.x - p1.x);
      const rh = Math.abs(p2.y - p1.y);
      octx.save();
      octx.fillStyle = 'rgba(59, 130, 246, 0.14)';
      octx.strokeStyle = '#3b82f6';
      octx.lineWidth = 1.5;
      octx.setLineDash([5, 3]);
      octx.fillRect(rx, ry, rw, rh);
      octx.strokeRect(rx, ry, rw, rh);
      octx.restore();
    }

    // 5. Selection Bounding Box & 8 Resize + Rotation Handles
    const selectedObjs = this.getSelectedObjects();
    for (const obj of selectedObjs) {
      const b = getObjectBounds(obj);
      const tl = this.worldToScreen(b.x, b.y);
      const br = this.worldToScreen(b.x + b.width, b.y + b.height);
      const rx = Math.min(tl.x, br.x);
      const ry = Math.min(tl.y, br.y);
      const rw = Math.abs(br.x - tl.x);
      const rh = Math.abs(br.y - tl.y);

      octx.save();
      octx.strokeStyle = '#3b82f6';
      octx.lineWidth = 1.5;
      octx.strokeRect(rx, ry, rw, rh);

      const handles = this.getSelectionHandlesScreen(b);
      for (const h of handles) {
        if (h.id === 'rot') {
          const topMid = this.worldToScreen(b.cx, b.y);
          octx.beginPath();
          octx.moveTo(topMid.x, topMid.y);
          octx.lineTo(h.x, h.y);
          octx.stroke();
          octx.fillStyle = '#10b981';
          octx.beginPath();
          octx.arc(h.x, h.y, 5, 0, Math.PI * 2);
          octx.fill();
          octx.stroke();
        } else {
          octx.fillStyle = '#ffffff';
          octx.fillRect(h.x - 4, h.y - 4, 8, 8);
          octx.strokeRect(h.x - 4, h.y - 4, 8, 8);
        }
      }

      if (this.activeToolId === 'node' && obj.nodes && obj.nodes.length > 0) {
        for (const n of obj.nodes) {
          const pt = this.worldToScreen(n.x, n.y);
          if (n.inX != null && (n.inX !== n.x || n.inY !== n.y)) {
            const inPt = this.worldToScreen(n.inX, n.inY);
            octx.strokeStyle = '#f59e0b';
            octx.beginPath(); octx.moveTo(pt.x, pt.y); octx.lineTo(inPt.x, inPt.y); octx.stroke();
            octx.fillStyle = '#f59e0b';
            octx.beginPath(); octx.arc(inPt.x, inPt.y, 3.5, 0, Math.PI * 2); octx.fill();
          }
          if (n.outX != null && (n.outX !== n.x || n.outY !== n.y)) {
            const outPt = this.worldToScreen(n.outX, n.outY);
            octx.strokeStyle = '#f59e0b';
            octx.beginPath(); octx.moveTo(pt.x, pt.y); octx.lineTo(outPt.x, outPt.y); octx.stroke();
            octx.fillStyle = '#f59e0b';
            octx.beginPath(); octx.arc(outPt.x, outPt.y, 3.5, 0, Math.PI * 2); octx.fill();
          }
          octx.fillStyle = '#3b82f6';
          octx.fillRect(pt.x - 4.5, pt.y - 4.5, 9, 9);
          octx.strokeStyle = '#ffffff';
          octx.strokeRect(pt.x - 4.5, pt.y - 4.5, 9, 9);
        }
      }

      octx.restore();
    }

    // 6. Lasso polygon preview
    if (this.interaction && this.interaction.type === 'lasso' && this.interaction.points.length > 1) {
      octx.save();
      octx.strokeStyle = '#3b82f6';
      octx.fillStyle = 'rgba(59, 130, 246, 0.12)';
      octx.setLineDash([4, 4]);
      octx.beginPath();
      const p0 = this.worldToScreen(this.interaction.points[0].x, this.interaction.points[0].y);
      octx.moveTo(p0.x, p0.y);
      for (let i = 1; i < this.interaction.points.length; i++) {
        const pi = this.worldToScreen(this.interaction.points[i].x, this.interaction.points[i].y);
        octx.lineTo(pi.x, pi.y);
      }
      octx.closePath();
      octx.fill();
      octx.stroke();
      octx.restore();
    }

    // 7. Measure Tool overlay
    if (this.measureLine) {
      const p1 = this.worldToScreen(this.measureLine.x1, this.measureLine.y1);
      const p2 = this.worldToScreen(this.measureLine.x2, this.measureLine.y2);
      const distPx = Math.hypot(this.measureLine.x2 - this.measureLine.x1, this.measureLine.y2 - this.measureLine.y1);
      const angleDeg = Math.atan2(this.measureLine.y2 - this.measureLine.y1, this.measureLine.x2 - this.measureLine.x1) * RAD_TO_DEG;
      octx.save();
      octx.strokeStyle = '#10b981';
      octx.lineWidth = 2;
      octx.beginPath();
      octx.moveTo(p1.x, p1.y);
      octx.lineTo(p2.x, p2.y);
      octx.stroke();
      octx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      octx.fillRect((p1.x + p2.x) / 2 - 55, (p1.y + p2.y) / 2 - 24, 110, 20);
      octx.fillStyle = '#34d399';
      octx.font = '11px monospace';
      octx.fillText(`${distPx.toFixed(1)}px (${angleDeg.toFixed(1)}°)`, (p1.x + p2.x) / 2 - 50, (p1.y + p2.y) / 2 - 10);
      octx.restore();
    }

    // 8. Brush Hover Circle Cursor
    if (this.activeToolId.startsWith('raster-') || ['vector-brush', 'vector-eraser'].includes(this.activeToolId)) {
      const sc = this.worldToScreen(this.hoverWorldPos.x, this.hoverWorldPos.y);
      const r = Math.max(2, (this.toolOptions.brushSize * this.viewport.zoom) / 2);
      octx.save();
      octx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      octx.lineWidth = 1.2;
      octx.beginPath();
      octx.arc(sc.x, sc.y, r, 0, Math.PI * 2);
      octx.stroke();
      octx.strokeStyle = 'rgba(0, 0, 0, 0.65)';
      octx.beginPath();
      octx.arc(sc.x, sc.y, r + 1, 0, Math.PI * 2);
      octx.stroke();
      octx.restore();
    }

    octx.restore();
  }

  getSelectionHandlesScreen(b) {
    const pts = [
      { id: 'nw', wx: b.x, wy: b.y },
      { id: 'n',  wx: b.cx, wy: b.y },
      { id: 'ne', wx: b.x + b.width, wy: b.y },
      { id: 'e',  wx: b.x + b.width, wy: b.cy },
      { id: 'se', wx: b.x + b.width, wy: b.y + b.height },
      { id: 's',  wx: b.cx, wy: b.y + b.height },
      { id: 'sw', wx: b.x, wy: b.y + b.height },
      { id: 'w',  wx: b.x, wy: b.cy }
    ];
    const handles = pts.map(p => {
      const s = this.worldToScreen(p.wx, p.wy);
      return { id: p.id, x: s.x, y: s.y };
    });
    const topMid = this.worldToScreen(b.cx, b.y);
    handles.push({ id: 'rot', x: topMid.x, y: topMid.y - 24 });
    return handles;
  }

  _renderRulers(dpr) {
    if (!this.rulerTop || !this.rulerLeft) return;
    const unit = this.doc.canvas.unit || 'px';
    const dpi = this.doc.canvas.dpi || 96;
    const corner = document.getElementById('ruler-corner');
    if (corner) corner.textContent = unit;

    const tctx = this.rulerTop.getContext('2d');
    const tw = this.rulerTop.width / dpr;
    const th = this.rulerTop.height / dpr;
    tctx.save();
    tctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    tctx.clearRect(0, 0, tw, th);
    tctx.fillStyle = '#9ca3af';
    tctx.strokeStyle = '#64748b';
    tctx.font = '9px monospace';

    const stepPx = this.viewport.zoom > 2 ? 20 : this.viewport.zoom > 0.7 ? 50 : 100;
    const startWorld = this.screenToWorld(0, 0).x;
    const endWorld = this.screenToWorld(tw, 0).x;
    const minW = Math.floor(Math.min(startWorld, endWorld) / stepPx) * stepPx;
    const maxW = Math.ceil(Math.max(startWorld, endWorld) / stepPx) * stepPx;

    tctx.beginPath();
    for (let wx = minW; wx <= maxW; wx += stepPx) {
      const sx = this.worldToScreen(wx, 0).x;
      if (sx < 0 || sx > tw) continue;
      tctx.moveTo(sx, th);
      tctx.lineTo(sx, th - 8);
      const labelVal = fromPixels(wx - (this.doc.ruler.originX || 0), unit, dpi);
      tctx.fillText(String(Math.round(labelVal)), sx + 2, 10);
    }
    tctx.stroke();
    tctx.restore();

    const lctx = this.rulerLeft.getContext('2d');
    const lw = this.rulerLeft.width / dpr;
    const lh = this.rulerLeft.height / dpr;
    lctx.save();
    lctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    lctx.clearRect(0, 0, lw, lh);
    lctx.fillStyle = '#9ca3af';
    lctx.strokeStyle = '#64748b';
    lctx.font = '9px monospace';

    const startY = this.screenToWorld(0, 0).y;
    const endY = this.screenToWorld(0, lh).y;
    const minY = Math.floor(Math.min(startY, endY) / stepPx) * stepPx;
    const maxY = Math.ceil(Math.max(startY, endY) / stepPx) * stepPx;

    lctx.beginPath();
    for (let wy = minY; wy <= maxY; wy += stepPx) {
      const sy = this.worldToScreen(0, wy).y;
      if (sy < 0 || sy > lh) continue;
      lctx.moveTo(lw, sy);
      lctx.lineTo(lw - 8, sy);
      const labelVal = fromPixels(wy - (this.doc.ruler.originY || 0), unit, dpi);
      lctx.save();
      lctx.translate(10, sy + 2);
      lctx.rotate(-Math.PI / 2);
      lctx.fillText(String(Math.round(labelVal)), 0, 0);
      lctx.restore();
    }
    lctx.stroke();
    lctx.restore();
  }

  _renderNavigator() {
    if (!this.navCanvas) return;
    const nctx = this.navCanvas.getContext('2d');
    const nw = this.navCanvas.width;
    const nh = this.navCanvas.height;
    nctx.clearRect(0, 0, nw, nh);

    const scale = Math.min((nw - 8) / this.doc.canvas.width, (nh - 8) / this.doc.canvas.height);
    const ox = (nw - this.doc.canvas.width * scale) / 2;
    const oy = (nh - this.doc.canvas.height * scale) / 2;

    nctx.save();
    nctx.translate(ox, oy);
    nctx.scale(scale, scale);
    nctx.fillStyle = this.doc.canvas.background.type === 'transparent' ? '#334155' : (this.doc.canvas.background.color || '#ffffff');
    nctx.fillRect(0, 0, this.doc.canvas.width, this.doc.canvas.height);
    renderLayerTreeToContext(nctx, this.doc.rootGroup, this.doc, this.rasterStore, this.imageCache);

    if (this.stageEl) {
      const rect = this.stageEl.getBoundingClientRect();
      const tl = this.screenToWorld(0, 0);
      const br = this.screenToWorld(rect.width, rect.height);
      const rx = Math.min(tl.x, br.x);
      const ry = Math.min(tl.y, br.y);
      const rw = Math.abs(br.x - tl.x);
      const rh = Math.abs(br.y - tl.y);
      nctx.strokeStyle = '#ef4444';
      nctx.fillStyle = 'rgba(239, 68, 68, 0.12)';
      nctx.lineWidth = 2.2 / scale;
      nctx.fillRect(rx, ry, rw, rh);
      nctx.strokeRect(rx, ry, rw, rh);
    }
    nctx.restore();

    const zoomLbl = document.getElementById('nav-zoom-label');
    if (zoomLbl) zoomLbl.textContent = `${Math.round(this.viewport.zoom * 100)}%`;
  }

  // ============================================================================
  // Pointer Events, Pen Pressure & Tilt, Touch Gestures & Rulers
  // ============================================================================

  bindViewportEvents() {
    const stage = this.stageEl;
    if (!stage) return;

    document.getElementById('ruler-corner').onclick = () => {
      const units = ['px', 'mm', 'cm', 'inch'];
      const idx = units.indexOf(this.doc.canvas.unit);
      this.doc.canvas.unit = units[(idx + 1) % units.length];
      this.requestRender();
      this.updateStatusBar();
    };

    this.rulerTop.addEventListener('pointerdown', (e) => {
      const rect = stage.getBoundingClientRect();
      const wy = this.screenToWorld(e.clientX - rect.left, Math.max(10, e.clientY - rect.top)).y;
      this.doc.guides.push({ id: createId('gd'), axis: 'h', position: Math.round(wy), color: '#06b6d4', locked: false });
      this.showToast('水平ガイドラインを追加しました');
      this.requestRender();
    });

    this.rulerLeft.addEventListener('pointerdown', (e) => {
      const rect = stage.getBoundingClientRect();
      const wx = this.screenToWorld(Math.max(10, e.clientX - rect.left), e.clientY - rect.top).x;
      this.doc.guides.push({ id: createId('gd'), axis: 'v', position: Math.round(wx), color: '#06b6d4', locked: false });
      this.showToast('垂直ガイドラインを追加しました');
      this.requestRender();
    });

    stage.addEventListener('wheel', (e) => {
      e.preventDefault();
      const rect = stage.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      if (e.ctrlKey || e.metaKey || !e.shiftKey) {
        const factor = e.deltaY < 0 ? 1.12 : 0.89;
        this.setZoom(this.viewport.zoom * factor, sx, sy);
      } else {
        this.viewport.panX -= e.deltaX;
        this.viewport.panY -= e.deltaY;
        this.requestRender();
      }
    }, { passive: false });

    stage.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.openContextMenu(e.clientX, e.clientY);
    });

    stage.addEventListener('dblclick', (e) => {
      const rect = stage.getBoundingClientRect();
      const world = this.screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
      const hit = this.hitTestObjects(world.x, world.y);
      if (hit && hit.kind === 'text') {
        this.openImeTextEditor(hit, e.clientX - rect.left, e.clientY - rect.top);
      }
    });

    stage.addEventListener('pointerdown', (e) => {
      this.closeContextMenu();
      stage.setPointerCapture(e.pointerId);
      const rect = stage.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;

      if (e.pointerType === 'touch') {
        this.activePointers.set(e.pointerId, { x: sx, y: sy, downTime: Date.now(), moved: false });
        if (this.activePointers.size === 2) {
          const pts = Array.from(this.activePointers.values());
          this.touchGesture = {
            startDist: Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y) || 1,
            startAngle: Math.atan2(pts[1].y - pts[0].y, pts[1].x - pts[0].x),
            startMidX: (pts[0].x + pts[1].x) / 2,
            startMidY: (pts[0].y + pts[1].y) / 2,
            startZoom: this.viewport.zoom,
            startPanX: this.viewport.panX,
            startPanY: this.viewport.panY,
            startRot: this.viewport.rotation,
            maxFingers: 2,
            downTime: Date.now(),
            moved: false
          };
          this.interaction = null;
          return;
        } else if (this.activePointers.size === 3 && this.touchGesture) {
          this.touchGesture.maxFingers = 3;
          return;
        }
      }

      if (e.button === 1 || this.spacePanActive || this.activeToolId === 'pan') {
        this.interaction = {
          type: 'pan',
          startSX: sx,
          startSY: sy,
          startPanX: this.viewport.panX,
          startPanY: this.viewport.panY
        };
        return;
      }

      if (this.activeToolId === 'zoom') {
        const factor = e.altKey ? 0.75 : 1.35;
        this.setZoom(this.viewport.zoom * factor, sx, sy);
        return;
      }

      const world = this.screenToWorld(sx, sy);
      const { pressure, tiltX, tiltY } = this._extractPenMetrics(e);
      this.hoverWorldPos = { x: world.x, y: world.y, pressure, tiltX, tiltY };

      this.handleToolPointerDown(world, sx, sy, pressure, { tiltX, tiltY }, e);
    });

    stage.addEventListener('pointermove', (e) => {
      const rect = stage.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;

      if (e.pointerType === 'touch' && this.activePointers.has(e.pointerId)) {
        const prev = this.activePointers.get(e.pointerId);
        if (Math.hypot(sx - prev.x, sy - prev.y) > 8) prev.moved = true;
        prev.x = sx;
        prev.y = sy;

        if (this.activePointers.size === 2 && this.touchGesture) {
          const pts = Array.from(this.activePointers.values());
          const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y) || 1;
          const angle = Math.atan2(pts[1].y - pts[0].y, pts[1].x - pts[0].x);
          const midX = (pts[0].x + pts[1].x) / 2;
          const midY = (pts[0].y + pts[1].y) / 2;

          if (Math.abs(dist - this.touchGesture.startDist) > 10 || Math.hypot(midX - this.touchGesture.startMidX, midY - this.touchGesture.startMidY) > 10) {
            this.touchGesture.moved = true;
          }

          this.viewport.zoom = Math.max(0.05, Math.min(32, this.touchGesture.startZoom * (dist / this.touchGesture.startDist)));
          this.viewport.panX = this.touchGesture.startPanX + (midX - this.touchGesture.startMidX);
          this.viewport.panY = this.touchGesture.startPanY + (midY - this.touchGesture.startMidY);
          this.viewport.rotation = Math.round(this.touchGesture.startRot + (angle - this.touchGesture.startAngle) * RAD_TO_DEG);
          this._syncNavigatorSliders();
          this.requestRender();
          this.updateStatusBar();
          return;
        }
      }

      const world = this.screenToWorld(sx, sy);
      const { pressure, tiltX, tiltY } = this._extractPenMetrics(e);
      this.hoverWorldPos = { x: world.x, y: world.y, pressure, tiltX, tiltY };

      if (!this.interaction) {
        this.updateStatusBar();
        if (this.activeToolId.startsWith('raster-') || ['vector-brush', 'vector-eraser'].includes(this.activeToolId)) {
          this.requestRender();
        }
        return;
      }

      if (this.interaction.type === 'pan') {
        this.viewport.panX = this.interaction.startPanX + (sx - this.interaction.startSX);
        this.viewport.panY = this.interaction.startPanY + (sy - this.interaction.startSY);
        this.requestRender();
        return;
      }

      const events = (typeof e.getCoalescedEvents === 'function' && e.getCoalescedEvents().length > 0)
        ? e.getCoalescedEvents()
        : [e];

      for (const cev of events) {
        const csx = cev.clientX - rect.left;
        const csy = cev.clientY - rect.top;
        const cWorld = this.screenToWorld(csx, csy);
        const metrics = this._extractPenMetrics(cev);
        this.handleToolPointerMove(cWorld, csx, csy, metrics.pressure, metrics, cev);
      }

      this.updateStatusBar();
      this.requestRender();
    });

    const onPointerEnd = (e) => {
      if (e.pointerType === 'touch') {
        this.activePointers.delete(e.pointerId);
        if (this.activePointers.size === 0 && this.touchGesture) {
          const elapsed = Date.now() - this.touchGesture.downTime;
          if (!this.touchGesture.moved && elapsed < 320) {
            if (this.touchGesture.maxFingers === 2) {
              this.commands.undo();
              this.showToast('2本指タップ: 元に戻す (Undo)');
            } else if (this.touchGesture.maxFingers === 3) {
              this.commands.redo();
              this.showToast('3本指タップ: やり直す (Redo)');
            }
          }
          this.touchGesture = null;
        }
      }

      if (this.interaction) {
        this.handleToolPointerUp(e);
      }
    };

    stage.addEventListener('pointerup', onPointerEnd);
    stage.addEventListener('pointercancel', onPointerEnd);

    // Floating HUD Buttons
    document.getElementById('hud-zoom-in').onclick = () => this.setZoom(this.viewport.zoom * 1.25);
    document.getElementById('hud-zoom-out').onclick = () => this.setZoom(this.viewport.zoom * 0.8);
    document.getElementById('hud-zoom-100').onclick = () => this.setZoom(1.0);
    document.getElementById('hud-zoom-fit').onclick = () => this.zoomToFit();
    document.getElementById('hud-rotate-left').onclick = () => {
      this.viewport.rotation = Math.max(-180, this.viewport.rotation - 15);
      this._syncNavigatorSliders();
      this.requestRender();
      this.updateStatusBar();
    };
    document.getElementById('hud-rotate-right').onclick = () => {
      this.viewport.rotation = Math.min(180, this.viewport.rotation + 15);
      this._syncNavigatorSliders();
      this.requestRender();
      this.updateStatusBar();
    };
    document.getElementById('hud-rotate-reset').onclick = () => {
      this.viewport.rotation = 0;
      this._syncNavigatorSliders();
      this.requestRender();
      this.updateStatusBar();
    };
    document.getElementById('hud-flip-view').onclick = (e) => {
      this.viewport.flipX = !this.viewport.flipX;
      e.currentTarget.classList.toggle('active', this.viewport.flipX);
      this.requestRender();
    };
    document.getElementById('hud-grid-toggle').onclick = (e) => {
      this.doc.grid.enabled = !this.doc.grid.enabled;
      e.currentTarget.classList.toggle('active', this.doc.grid.enabled);
      this.requestRender();
    };

    // Navigator Magnetic Snap Sliders
    document.getElementById('nav-zoom-slider').oninput = (e) => {
      const zPct = Number(e.target.value) || 100;
      document.getElementById('nav-zoom-val').textContent = `${zPct}%`;
      this.setZoom(zPct / 100);
    };
    document.getElementById('nav-rot-slider').oninput = (e) => {
      this.viewport.rotation = Number(e.target.value) || 0;
      document.getElementById('nav-rot-val').textContent = `${this.viewport.rotation}°`;
      this.requestRender();
      this.updateStatusBar();
    };
  }

  _extractPenMetrics(e) {
    let rawP = (e.pointerType === 'pen' && e.pressure > 0) ? e.pressure : 0.72;
    if (this.preferences.enablePressure === false) {
      rawP = 0.75;
    } else {
      const deadzone = this.preferences.minPressure || 0.05;
      rawP = Math.max(0.05, (rawP - deadzone) / (1 - deadzone));
    }
    const gamma = this.preferences.pressureGamma || 1.0;
    const pressure = Math.max(0.05, Math.min(1.0, Math.pow(rawP, gamma)));
    const tiltX = this.preferences.enableTilt !== false ? (e.tiltX || 0) : 0;
    const tiltY = this.preferences.enableTilt !== false ? (e.tiltY || 0) : 0;
    return { pressure, tiltX, tiltY };
  }

  // ============================================================================
  // Tool State Machine (Including Marquee Rectangular Selection & 16 Raster Tools)
  // ============================================================================

  handleToolPointerDown(world, sx, sy, pressure, tilt, e) {
    const toolDef = TOOL_DEFINITIONS.find(t => t.id === this.activeToolId);
    if (!toolDef) return;
    const compat = this.getToolCompatibility(toolDef);
    if (!compat.enabled) {
      this.showToast(compat.reason);
      return;
    }

    const activeLayer = this.getActiveLayer();

    if (this.activeToolId === 'eyedropper') {
      this.pickColorFromCanvas(sx, sy);
      return;
    }

    if (this.activeToolId === 'measure') {
      this.measureLine = { x1: world.x, y1: world.y, x2: world.x, y2: world.y };
      this.interaction = { type: 'measure' };
      return;
    }

    if (this.activeToolId === 'lasso') {
      this.interaction = { type: 'lasso', points: [{ x: world.x, y: world.y }] };
      return;
    }

    // 4. Select & Transform Tool (Supports Marquee Rectangular Drag Selection on empty canvas!)
    if (this.activeToolId === 'select') {
      const selectedObjs = this.getSelectedObjects();
      if (selectedObjs.length === 1) {
        const obj = selectedObjs[0];
        const b = getObjectBounds(obj);
        const handles = this.getSelectionHandlesScreen(b);
        const hitHandle = handles.find(h => Math.hypot(h.x - sx, h.y - sy) <= 9);
        if (hitHandle) {
          this.interaction = {
            type: 'transform-handle',
            handleId: hitHandle.id,
            startWorld: world,
            beforeObj: deepClone(obj),
            targetObj: obj,
            initialBounds: b
          };
          return;
        }
      }

      const hitObj = this.hitTestObjects(world.x, world.y);
      if (hitObj) {
        if (e.shiftKey) {
          if (this.selectedObjectIds.has(hitObj.id)) this.selectedObjectIds.delete(hitObj.id);
          else this.selectedObjectIds.add(hitObj.id);
        } else if (!this.selectedObjectIds.has(hitObj.id)) {
          this.selectedObjectIds.clear();
          this.selectedObjectIds.add(hitObj.id);
        }
        const currentSelected = this.getSelectedObjects();
        this.interaction = {
          type: 'move-objects',
          startWorld: world,
          beforeObjects: currentSelected.map(o => deepClone(o)),
          targetObjects: currentSelected,
          moved: false
        };
      } else {
        // Begin Marquee Rectangular Drag Selection within the active layer!
        if (!e.shiftKey) {
          this.selectedObjectIds.clear();
        }
        this.interaction = {
          type: 'marquee-select',
          startWorld: world,
          currentWorld: world,
          additive: e.shiftKey
        };
      }
      this.refreshAllPanels();
      this.requestRender();
      return;
    }

    // 5. Node Edit Tool
    if (this.activeToolId === 'node') {
      const selected = this.getSelectedObjects()[0];
      if (!selected) return;
      if (!selected.nodes || selected.nodes.length === 0) {
        const pathObj = convertObjectToPath(selected);
        const found = findObjectById(this.doc.rootGroup, selected.id);
        if (found) {
          this.commands.execute(createReplaceObjectsCommand(found.layer.id, [selected.id], [pathObj], 'ノード編集用にパスへ変換'));
          this.selectedObjectIds.clear();
          this.selectedObjectIds.add(pathObj.id);
        }
        return;
      }
      for (let i = 0; i < selected.nodes.length; i++) {
        const n = selected.nodes[i];
        const sc = this.worldToScreen(n.x, n.y);
        if (Math.hypot(sc.x - sx, sc.y - sy) <= 10) {
          this.interaction = {
            type: 'drag-node',
            nodeIndex: i,
            beforeObj: deepClone(selected),
            targetObj: selected
          };
          return;
        }
      }
      return;
    }

    // 6. Vector Shape Tools
    if (toolDef.shapeKind && activeLayer && activeLayer.type === 'vector') {
      const newObj = createVectorObject(toolDef.shapeKind, {
        x: world.x,
        y: world.y,
        width: 4,
        height: 4,
        x1: world.x,
        y1: world.y,
        x2: world.x + 4,
        y2: world.y + 4,
        rx: this.toolOptions.cornerRadius,
        ry: this.toolOptions.cornerRadius,
        sides: this.toolOptions.polygonSides,
        innerRatio: this.toolOptions.starInnerRatio,
        turns: this.toolOptions.spiralTurns,
        startAngle: this.toolOptions.arcStartAngle,
        endAngle: this.toolOptions.arcEndAngle,
        style: this.buildCurrentPaintStyle()
      });
      activeLayer.objects.push(newObj);
      this.selectedObjectIds.clear();
      this.selectedObjectIds.add(newObj.id);
      this.interaction = {
        type: 'create-shape',
        layerId: activeLayer.id,
        startWorld: world,
        object: newObj
      };
      return;
    }

    // 7. Bezier Pen Tool
    if (this.activeToolId === 'pen' && activeLayer && activeLayer.type === 'vector') {
      if (!this.activePenObject) {
        const penObj = createVectorObject('path', {
          name: 'ベジェパス',
          x: world.x,
          y: world.y,
          width: 50,
          height: 50,
          nodes: [{ x: world.x, y: world.y, inX: world.x, inY: world.y, outX: world.x, outY: world.y, smooth: true }],
          closed: false,
          style: this.buildCurrentPaintStyle()
        });
        activeLayer.objects.push(penObj);
        this.activePenObject = penObj;
        this.selectedObjectIds.clear();
        this.selectedObjectIds.add(penObj.id);
      } else {
        const firstNode = this.activePenObject.nodes[0];
        const firstSc = this.worldToScreen(firstNode.x, firstNode.y);
        if (this.activePenObject.nodes.length >= 3 && Math.hypot(firstSc.x - sx, firstSc.y - sy) <= 12) {
          this.activePenObject.closed = true;
          this.commitActivePenPath(activeLayer);
          return;
        }
        this.activePenObject.nodes.push({
          x: world.x,
          y: world.y,
          inX: world.x,
          inY: world.y,
          outX: world.x,
          outY: world.y,
          smooth: true
        });
      }
      this.interaction = {
        type: 'pen-handle',
        nodeIndex: this.activePenObject.nodes.length - 1,
        penObject: this.activePenObject
      };
      this.requestRender();
      return;
    }

    // 8. Freehand Path Tool
    if (this.activeToolId === 'freehand' && activeLayer && activeLayer.type === 'vector') {
      const fhObj = createVectorObject('path', {
        name: 'フリーハンド線',
        nodes: [{ x: world.x, y: world.y, inX: world.x, inY: world.y, outX: world.x, outY: world.y }],
        closed: false,
        style: {
          ...this.buildCurrentPaintStyle(),
          fill: { type: 'none', color: '#000000', opacity: 1 }
        }
      });
      activeLayer.objects.push(fhObj);
      this.interaction = {
        type: 'freehand',
        layerId: activeLayer.id,
        rawPoints: [{ x: world.x, y: world.y }],
        object: fhObj
      };
      return;
    }

    // 9. Pressure Vector Brush
    if (this.activeToolId === 'vector-brush' && activeLayer && activeLayer.type === 'vector') {
      const vbObj = createVectorObject('brush-stroke', {
        name: 'ベクターブラシ線',
        points: [{ x: world.x, y: world.y, pressure, tiltX: tilt.tiltX, tiltY: tilt.tiltY }],
        brushSize: this.toolOptions.brushSize,
        style: this.buildCurrentPaintStyle()
      });
      activeLayer.objects.push(vbObj);
      this.interaction = {
        type: 'vector-brush',
        layerId: activeLayer.id,
        object: vbObj
      };
      return;
    }

    // 10. Vector Eraser
    if (this.activeToolId === 'vector-eraser' && activeLayer && activeLayer.type === 'vector') {
      const hit = this.hitTestObjectsInLayer(activeLayer, world.x, world.y);
      if (hit) {
        this.commands.execute(createDeleteObjectsCommand([hit.id], this.doc));
      }
      this.interaction = { type: 'vector-eraser', layer: activeLayer };
      return;
    }

    // 11. Text Tool
    if (this.activeToolId === 'text' && activeLayer && activeLayer.type === 'vector') {
      const textObj = createVectorObject('text', {
        name: 'テキスト',
        x: world.x,
        y: world.y,
        text: '新規テキスト',
        fontSize: this.toolOptions.fontSize,
        fontFamily: this.toolOptions.fontFamily,
        vertical: this.toolOptions.verticalText,
        style: this.buildCurrentPaintStyle()
      });
      this.commands.execute(createAddObjectCommand(activeLayer.id, textObj, 'テキストを追加'));
      this.selectedObjectIds.clear();
      this.selectedObjectIds.add(textObj.id);
      const found = findObjectById(this.doc.rootGroup, textObj.id);
      if (found) {
        this.openImeTextEditor(found.object, sx, sy);
      }
      return;
    }

    // ==========================================================================
    // 12. Expanded 16 Raster Layer Tools
    // ==========================================================================
    if (activeLayer && activeLayer.type === 'raster') {
      const buf = this.rasterStore.ensureBuffer(activeLayer.assetId, this.doc.canvas.width, this.doc.canvas.height);
      const ctx = buf.getContext('2d');

      if (this.activeToolId === 'raster-bucket') {
        const beforePatch = this.rasterStore.captureRegion(activeLayer.assetId, 0, 0, buf.width, buf.height);
        const changed = floodFillCanvas(
          buf,
          world.x,
          world.y,
          this.paintState.mainColor,
          this.toolOptions.bucketTolerance,
          this.toolOptions.bucketContiguous
        );
        if (changed && beforePatch) {
          const afterPatch = this.rasterStore.captureRegion(activeLayer.assetId, 0, 0, buf.width, buf.height);
          this.commands.execute(createRasterDeltaCommand(activeLayer.assetId, beforePatch, afterPatch, 'バケツ塗りつぶし', 'raster-bucket'), true);
          this.requestRender();
        }
        return;
      }

      if (this.activeToolId === 'raster-gradient' || this.activeToolId === 'raster-line') {
        const beforePatch = this.rasterStore.captureRegion(activeLayer.assetId, 0, 0, buf.width, buf.height);
        this.interaction = {
          type: this.activeToolId,
          assetId: activeLayer.assetId,
          startWorld: world,
          beforePatch
        };
        return;
      }

      const beforeFull = this.rasterStore.captureRegion(activeLayer.assetId, 0, 0, buf.width, buf.height);
      const isEraser = this.activeToolId === 'raster-eraser';
      const presetCfg = RASTER_BRUSH_PRESETS[this.toolOptions.rasterPreset] || RASTER_BRUSH_PRESETS.gpen;

      const settings = {
        size: this.toolOptions.brushSize,
        hardness: this.activeToolId === 'raster-airbrush' ? 0.1 : this.toolOptions.hardness,
        opacity: this.paintState.opacity,
        flow: presetCfg.flow ?? 1.0,
        spacing: presetCfg.spacing ?? 0.1,
        color: this.paintState.mainColor,
        pressureSize: presetCfg.pressureSize !== false,
        pressureOpacity: Boolean(presetCfg.pressureOpacity),
        tiltAspect: Boolean(presetCfg.tiltAspect),
        chisel: Boolean(presetCfg.chisel) || this.activeToolId === 'raster-marker',
        brushMode: this.activeToolId === 'raster-noise' ? 'spatter' : this.activeToolId === 'raster-stamp' ? 'stamp' : 'normal',
        stampShape: this.toolOptions.stampShape,
        compositeOp: this.activeToolId === 'raster-dodge' ? this.toolOptions.dodgeMode : null,
        symmetryMode: this.activeToolId === 'raster-symmetry' ? this.toolOptions.symmetryMode : null,
        canvasWidth: this.doc.canvas.width,
        canvasHeight: this.doc.canvas.height
      };

      const pt = { x: world.x, y: world.y, pressure, tiltX: tilt.tiltX, tiltY: tilt.tiltY };

      if (this.activeToolId === 'raster-blur' || this.activeToolId === 'raster-smudge') {
        applyLocalBlurOrSmudge(ctx, world.x, world.y, null, null, this.toolOptions.brushSize, this.activeToolId === 'raster-smudge' ? 'smudge' : 'blur');
      } else {
        strokeBrushSegment(ctx, pt, pt, settings, isEraser);
      }

      this.interaction = {
        type: 'raster-stroke',
        assetId: activeLayer.assetId,
        lastPt: pt,
        settings,
        isEraser,
        beforeFull
      };
      this.requestRender();
    }
  }

  handleToolPointerMove(world, sx, sy, pressure, tilt, e) {
    const it = this.interaction;
    if (!it) return;

    if (it.type === 'measure' && this.measureLine) {
      this.measureLine.x2 = world.x;
      this.measureLine.y2 = world.y;
      return;
    }

    if (it.type === 'lasso') {
      it.points.push({ x: world.x, y: world.y });
      return;
    }

    if (it.type === 'marquee-select') {
      it.currentWorld = world;
      return;
    }

    if (it.type === 'move-objects') {
      let dx = world.x - it.startWorld.x;
      let dy = world.y - it.startWorld.y;
      if (Math.hypot(dx, dy) > 1) it.moved = true;

      this.smartGuides = [];
      if (this.doc.ruler.smartGuides && it.beforeObjects.length === 1) {
        const b0 = getObjectBounds(it.beforeObjects[0]);
        const targetCX = b0.cx + dx;
        const targetCY = b0.cy + dy;
        const canvasCX = this.doc.canvas.width / 2;
        const canvasCY = this.doc.canvas.height / 2;
        if (Math.abs(targetCX - canvasCX) < 6) {
          dx += (canvasCX - targetCX);
          this.smartGuides.push({ axis: 'x', pos: canvasCX });
        }
        if (Math.abs(targetCY - canvasCY) < 6) {
          dy += (canvasCY - targetCY);
          this.smartGuides.push({ axis: 'y', pos: canvasCY });
        }
      }

      for (let i = 0; i < it.targetObjects.length; i++) {
        const before = it.beforeObjects[i];
        const target = it.targetObjects[i];
        target.transform.tx = (before.transform?.tx || 0) + dx;
        target.transform.ty = (before.transform?.ty || 0) + dy;
      }
      this.renderPropertiesPanel();
      return;
    }

    if (it.type === 'transform-handle') {
      const obj = it.targetObj;
      const b0 = it.initialBounds;
      if (it.handleId === 'rot') {
        const angle = Math.atan2(world.y - b0.cy, world.x - b0.cx) * RAD_TO_DEG + 90;
        obj.transform.rotation = e.shiftKey ? Math.round(angle / 15) * 15 : Math.round(angle);
      } else {
        const dx = world.x - it.startWorld.x;
        const dy = world.y - it.startWorld.y;
        if (it.handleId.includes('e')) obj.width = Math.max(8, it.beforeObj.width + dx);
        if (it.handleId.includes('s')) obj.height = Math.max(8, it.beforeObj.height + dy);
        if (it.handleId.includes('w')) {
          const nw = Math.max(8, it.beforeObj.width - dx);
          obj.x = it.beforeObj.x + (it.beforeObj.width - nw);
          obj.width = nw;
        }
        if (it.handleId.includes('n')) {
          const nh = Math.max(8, it.beforeObj.height - dy);
          obj.y = it.beforeObj.y + (it.beforeObj.height - nh);
          obj.height = nh;
        }
        if (e.shiftKey) {
          const size = Math.max(obj.width, obj.height);
          obj.width = size;
          obj.height = size;
        }
      }
      this.renderPropertiesPanel();
      return;
    }

    if (it.type === 'drag-node') {
      const node = it.targetObj.nodes[it.nodeIndex];
      if (node) {
        const dx = world.x - node.x;
        const dy = world.y - node.y;
        node.x = world.x;
        node.y = world.y;
        node.inX = (node.inX ?? node.x) + dx;
        node.inY = (node.inY ?? node.y) + dy;
        node.outX = (node.outX ?? node.x) + dx;
        node.outY = (node.outY ?? node.y) + dy;
      }
      return;
    }

    if (it.type === 'create-shape') {
      const obj = it.object;
      const sx0 = it.startWorld.x;
      const sy0 = it.startWorld.y;
      if (obj.kind === 'line' || obj.kind === 'arrow') {
        obj.x1 = sx0;
        obj.y1 = sy0;
        obj.x2 = world.x;
        obj.y2 = world.y;
        obj.x = Math.min(sx0, world.x);
        obj.y = Math.min(sy0, world.y);
        obj.width = Math.max(8, Math.abs(world.x - sx0));
        obj.height = Math.max(8, Math.abs(world.y - sy0));
      } else {
        let w = Math.abs(world.x - sx0);
        let h = Math.abs(world.y - sy0);
        if (e.shiftKey) {
          const s = Math.max(w, h);
          w = s;
          h = s;
        }
        if (e.altKey) {
          obj.x = sx0 - w;
          obj.y = sy0 - h;
          obj.width = Math.max(4, w * 2);
          obj.height = Math.max(4, h * 2);
        } else {
          obj.x = Math.min(sx0, world.x);
          obj.y = Math.min(sy0, world.y);
          obj.width = Math.max(4, w);
          obj.height = Math.max(4, h);
        }
      }
      return;
    }

    if (it.type === 'pen-handle' && it.penObject) {
      const node = it.penObject.nodes[it.nodeIndex];
      if (node) {
        node.outX = world.x;
        node.outY = world.y;
        node.inX = node.x - (world.x - node.x);
        node.inY = node.y - (world.y - node.y);
      }
      return;
    }

    if (it.type === 'freehand') {
      const last = it.rawPoints[it.rawPoints.length - 1];
      if (!last || Math.hypot(world.x - last.x, world.y - last.y) >= 2) {
        it.rawPoints.push({ x: world.x, y: world.y });
        it.object.nodes = simplifyAndSmoothPoints(it.rawPoints, this.toolOptions.smoothingTolerance, this.toolOptions.smoothingFactor);
      }
      return;
    }

    if (it.type === 'vector-brush') {
      const pts = it.object.points;
      const last = pts[pts.length - 1];
      const stab = (this.preferences.stabilizer || 4) / 20;
      const nx = last ? last.x + (world.x - last.x) * (1 - stab * 0.7) : world.x;
      const ny = last ? last.y + (world.y - last.y) * (1 - stab * 0.7) : world.y;
      if (!last || Math.hypot(nx - last.x, ny - last.y) >= 1.5) {
        pts.push({ x: nx, y: ny, pressure, tiltX: tilt.tiltX, tiltY: tilt.tiltY });
      }
      return;
    }

    if (it.type === 'vector-eraser') {
      const hit = this.hitTestObjectsInLayer(it.layer, world.x, world.y);
      if (hit) {
        this.commands.execute(createDeleteObjectsCommand([hit.id], this.doc));
      }
      return;
    }

    if (it.type === 'raster-stroke') {
      const buf = this.rasterStore.getBuffer(it.assetId);
      if (!buf) return;
      const ctx = buf.getContext('2d');
      const stab = (this.preferences.stabilizer || 4) / 20;
      const nx = it.lastPt.x + (world.x - it.lastPt.x) * (1 - stab * 0.7);
      const ny = it.lastPt.y + (world.y - it.lastPt.y) * (1 - stab * 0.7);
      const nextPt = { x: nx, y: ny, pressure, tiltX: tilt.tiltX, tiltY: tilt.tiltY };

      if (this.activeToolId === 'raster-blur' || this.activeToolId === 'raster-smudge') {
        applyLocalBlurOrSmudge(ctx, nx, ny, it.lastPt.x, it.lastPt.y, this.toolOptions.brushSize, this.activeToolId === 'raster-smudge' ? 'smudge' : 'blur');
      } else {
        strokeBrushSegment(ctx, it.lastPt, nextPt, it.settings, it.isEraser);
      }
      it.lastPt = nextPt;
      return;
    }

    if (it.type === 'raster-gradient') {
      const buf = this.rasterStore.getBuffer(it.assetId);
      if (!buf) return;
      this.rasterStore.restoreRegion(it.assetId, it.beforePatch);
      const ctx = buf.getContext('2d');
      const grad = ctx.createLinearGradient(it.startWorld.x, it.startWorld.y, world.x, world.y);
      grad.addColorStop(0, this.paintState.mainColor);
      grad.addColorStop(1, this.paintState.subColor);
      ctx.save();
      ctx.globalAlpha = this.paintState.opacity;
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, buf.width, buf.height);
      ctx.restore();
      return;
    }

    if (it.type === 'raster-line') {
      const buf = this.rasterStore.getBuffer(it.assetId);
      if (!buf) return;
      this.rasterStore.restoreRegion(it.assetId, it.beforePatch);
      const ctx = buf.getContext('2d');
      ctx.save();
      ctx.globalAlpha = this.paintState.opacity;
      ctx.strokeStyle = this.paintState.mainColor;
      ctx.fillStyle = this.paintState.mainColor;
      ctx.lineWidth = this.toolOptions.brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      const rx = Math.min(it.startWorld.x, world.x);
      const ry = Math.min(it.startWorld.y, world.y);
      const rw = Math.abs(world.x - it.startWorld.x);
      const rh = Math.abs(world.y - it.startWorld.y);

      if (this.toolOptions.rasterShapeKind === 'rect') {
        ctx.strokeRect(rx, ry, rw, rh);
      } else if (this.toolOptions.rasterShapeKind === 'fill-rect') {
        ctx.fillRect(rx, ry, rw, rh);
      } else {
        ctx.beginPath();
        ctx.moveTo(it.startWorld.x, it.startWorld.y);
        ctx.lineTo(world.x, world.y);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  handleToolPointerUp() {
    const it = this.interaction;
    this.interaction = null;
    this.smartGuides = [];
    if (!it) return;

    // 1. Marquee Rectangular Drag Selection inside the active layer
    if (it.type === 'marquee-select') {
      const minX = Math.min(it.startWorld.x, it.currentWorld.x);
      const minY = Math.min(it.startWorld.y, it.currentWorld.y);
      const maxX = Math.max(it.startWorld.x, it.currentWorld.x);
      const maxY = Math.max(it.startWorld.y, it.currentWorld.y);

      if (maxX - minX > 3 || maxY - minY > 3) {
        const layer = this.getActiveLayer();
        const candidateLayers = (layer && layer.type === 'vector')
          ? [layer]
          : flattenLayers(this.doc.rootGroup).filter(l => l.effectiveVisible && !l.effectiveLocked && l.layer.type === 'vector').map(l => l.layer);

        for (const lyr of candidateLayers) {
          for (const obj of lyr.objects) {
            if (!obj.visible || obj.locked) continue;
            const b = getObjectBounds(obj);
            const overlaps = !(b.x + b.width < minX || b.x > maxX || b.y + b.height < minY || b.y > maxY);
            if (overlaps) {
              this.selectedObjectIds.add(obj.id);
            }
          }
        }
      }
      this.refreshAllPanels();
      this.requestRender();
      return;
    }

    if (it.type === 'lasso' && it.points.length > 2) {
      this.selectedObjectIds.clear();
      const layer = this.getActiveLayer();
      if (layer && layer.type === 'vector') {
        for (const obj of layer.objects) {
          const b = getObjectBounds(obj);
          if (this._pointInPoly({ x: b.cx, y: b.cy }, it.points)) {
            this.selectedObjectIds.add(obj.id);
          }
        }
      }
      this.refreshAllPanels();
      this.requestRender();
      return;
    }

    if (it.type === 'move-objects' && it.moved) {
      this.commands.execute(
        createUpdateObjectsCommand(it.beforeObjects, it.targetObjects, 'オブジェクトを移動'),
        true
      );
    } else if (it.type === 'transform-handle') {
      this.commands.execute(
        createUpdateObjectsCommand([it.beforeObj], [it.targetObj], 'オブジェクトを変形'),
        true
      );
    } else if (it.type === 'drag-node') {
      this.commands.execute(
        createUpdateObjectsCommand([it.beforeObj], [it.targetObj], 'パスノードを編集'),
        true
      );
    } else if (it.type === 'create-shape') {
      this.commands.execute(
        createAddObjectCommand(it.layerId, it.object, `${it.object.name}を描画`),
        true
      );
    } else if (it.type === 'freehand') {
      this.commands.execute(
        createAddObjectCommand(it.layerId, it.object, 'フリーハンドパスを描画'),
        true
      );
    } else if (it.type === 'vector-brush') {
      this.commands.execute(
        createAddObjectCommand(it.layerId, it.object, 'ベクターブラシを描画'),
        true
      );
    } else if (it.type === 'raster-stroke' || it.type === 'raster-gradient' || it.type === 'raster-line') {
      const buf = this.rasterStore.getBuffer(it.assetId);
      if (buf) {
        const afterFull = this.rasterStore.captureRegion(it.assetId, 0, 0, buf.width, buf.height);
        this.commands.execute(
          createRasterDeltaCommand(
            it.assetId,
            it.beforeFull || it.beforePatch,
            afterFull,
            it.type === 'raster-gradient' ? 'ラスターグラデーション' : it.type === 'raster-line' ? 'ラスター図形描画' : (it.isEraser ? 'ラスター消しゴム' : 'ラスターブラシ描画'),
            it.isEraser ? 'raster-eraser' : 'raster-pen'
          ),
          true
        );
      }
    }

    this.refreshAllPanels();
    this.requestRender();
  }

  commitActivePenPath(layer) {
    if (!this.activePenObject || !layer) return;
    const obj = this.activePenObject;
    this.activePenObject = null;
    this.commands.execute(createAddObjectCommand(layer.id, obj, 'ベジェパスを作成'), true);
    this.refreshAllPanels();
    this.requestRender();
  }

  _pointInPoly(pt, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i].x, yi = poly[i].y;
      const xj = poly[j].x, yj = poly[j].y;
      const intersect = ((yi > pt.y) !== (yj > pt.y)) && (pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi + 1e-9) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  hitTestObjects(wx, wy) {
    const activeLayer = this.getActiveLayer();
    // Prioritize hitting objects in the currently selected vector layer first
    if (activeLayer && activeLayer.type === 'vector' && activeLayer.visible && !activeLayer.locked) {
      const hitInActive = this.hitTestObjectsInLayer(activeLayer, wx, wy);
      if (hitInActive) return hitInActive;
    }

    const allLayers = flattenLayers(this.doc.rootGroup);
    for (const entry of allLayers) {
      if (!entry.effectiveVisible || entry.effectiveLocked) continue;
      if (entry.layer.type === 'vector') {
        const hit = this.hitTestObjectsInLayer(entry.layer, wx, wy);
        if (hit) {
          this.activeLayerId = entry.layer.id;
          return hit;
        }
      }
    }
    return null;
  }

  hitTestObjectsInLayer(layer, wx, wy) {
    if (!layer || layer.type !== 'vector') return null;
    for (let i = layer.objects.length - 1; i >= 0; i--) {
      const obj = layer.objects[i];
      if (!obj.visible || obj.locked) continue;
      const b = getObjectBounds(obj);
      const pad = Math.max(6, (obj.style?.stroke?.width || 2) / 2);
      if (wx >= b.x - pad && wx <= b.x + b.width + pad && wy >= b.y - pad && wy <= b.y + b.height + pad) {
        return obj;
      }
    }
    return null;
  }

  getSelectedObjects() {
    const list = [];
    for (const id of this.selectedObjectIds) {
      const found = findObjectById(this.doc.rootGroup, id);
      if (found) list.push(found.object);
    }
    return list;
  }

  buildCurrentPaintStyle() {
    const s = createDefaultStyle(
      this.paintState.fillType === 'none' ? 'none' : this.paintState.mainColor,
      this.paintState.strokeWidth > 0 ? this.paintState.subColor : 'none',
      this.paintState.strokeWidth
    );
    s.opacity = this.paintState.opacity;
    if (this.paintState.fillType === 'gradient') {
      s.fill = { type: 'gradient', gradientId: this.paintState.gradientId, color: this.paintState.mainColor, opacity: 1 };
    } else if (this.paintState.fillType === 'pattern') {
      s.fill = { type: 'pattern', patternId: this.paintState.patternId, color: this.paintState.mainColor, opacity: 1 };
    }
    return s;
  }

  applyPaintToSelection() {
    const selected = this.getSelectedObjects();
    if (selected.length === 0) return;
    const before = selected.map(o => deepClone(o));
    const after = selected.map(o => {
      const next = deepClone(o);
      next.style.opacity = this.paintState.opacity;
      if (this.paintState.fillType === 'none') {
        next.style.fill = { type: 'none', color: this.paintState.mainColor, opacity: 1 };
      } else if (this.paintState.fillType === 'gradient') {
        next.style.fill = { type: 'gradient', gradientId: this.paintState.gradientId, color: this.paintState.mainColor, opacity: 1 };
      } else if (this.paintState.fillType === 'pattern') {
        next.style.fill = { type: 'pattern', patternId: this.paintState.patternId, color: this.paintState.mainColor, opacity: 1 };
      } else {
        next.style.fill = { type: 'solid', color: this.paintState.mainColor, opacity: 1 };
      }
      next.style.stroke.color = this.paintState.subColor;
      next.style.stroke.width = this.paintState.strokeWidth;
      next.style.stroke.type = this.paintState.strokeWidth > 0 ? 'solid' : 'none';
      return next;
    });
    this.commands.execute(createUpdateObjectsCommand(before, after, '塗り/線スタイルを変更', 'paint-change'));
  }

  openImeTextEditor(textObj, screenX, screenY) {
    const editor = document.getElementById('canvas-ime-editor');
    if (!editor) return;
    const beforeSnap = deepClone(textObj);

    editor.style.left = `${Math.max(10, Math.min(this.stageEl.clientWidth - 200, screenX))}px`;
    editor.style.top = `${Math.max(10, Math.min(this.stageEl.clientHeight - 80, screenY))}px`;
    editor.value = textObj.text || '';
    editor.classList.add('open');
    editor.focus();
    editor.select();

    let isComposing = false;
    editor.oncompositionstart = () => { isComposing = true; };
    editor.oncompositionend = () => {
      isComposing = false;
      textObj.text = editor.value;
      this.requestRender();
    };

    editor.oninput = () => {
      if (!isComposing) {
        textObj.text = editor.value;
        this.requestRender();
      }
    };

    const commit = () => {
      editor.classList.remove('open');
      if (editor.value !== beforeSnap.text) {
        textObj.text = editor.value || ' ';
        this.commands.execute(createUpdateObjectsCommand([beforeSnap], [textObj], 'テキストを編集'), true);
      }
      this.refreshAllPanels();
      this.requestRender();
    };

    editor.onblur = commit;
    editor.onkeydown = (ev) => {
      if (isComposing) return;
      if (ev.key === 'Escape') {
        textObj.text = beforeSnap.text;
        editor.classList.remove('open');
        this.requestRender();
      } else if (ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey)) {
        ev.preventDefault();
        editor.blur();
      }
    };
  }

  // ============================================================================
  // Color Picker Wheel & Custom Magnetic Sliders
  // ============================================================================

  initColorPickerUI() {
    this.colorWheelCanvas = document.getElementById('color-wheel-canvas');
    this.drawHueSvWheel();

    this.colorWheelCanvas.addEventListener('pointerdown', (e) => {
      this.colorWheelCanvas.setPointerCapture(e.pointerId);
      this._pickFromColorWheel(e);
    });
    this.colorWheelCanvas.addEventListener('pointermove', (e) => {
      if (e.buttons === 1) this._pickFromColorWheel(e);
    });

    document.getElementById('well-main-color').onclick = () => {
      this.paintState.activeWell = 'main';
      this.refreshColorPanel();
    };
    document.getElementById('well-sub-color').onclick = () => {
      this.paintState.activeWell = 'sub';
      this.refreshColorPanel();
    };
    document.getElementById('btn-swap-colors').onclick = () => this.swapMainSubColors();
    document.getElementById('color-mode-select').onchange = () => this.refreshColorPanel();

    document.getElementById('color-hex-input').onchange = (e) => {
      const val = e.target.value.trim();
      if (/^#[0-9a-fA-F]{6}$/.test(val)) {
        this.setActiveColor(val);
      }
    };
    document.getElementById('native-color-picker').oninput = (e) => {
      this.setActiveColor(e.target.value);
    };
    document.getElementById('btn-add-swatch').onclick = () => {
      const col = this.getActiveColor();
      if (!this.doc.swatches.includes(col)) {
        this.doc.swatches.push(col);
        this.refreshColorPanel();
      }
    };
    document.getElementById('btn-fix-gamut').onclick = () => {
      const check = checkColorGamut(this.getActiveColor(), this.doc.canvas.colorModel);
      if (check.outOfGamut) {
        this.setActiveColor(check.safeHex);
        this.showToast('色域内の近似カラーへ補正しました');
      }
    };
  }

  drawHueSvWheel() {
    const c = this.colorWheelCanvas;
    if (!c) return;
    const ctx = c.getContext('2d');
    const cx = c.width / 2;
    const cy = c.height / 2;
    const outerR = cx - 3;
    const innerR = outerR - 14;

    ctx.clearRect(0, 0, c.width, c.height);

    for (let angle = 0; angle < 360; angle += 2) {
      const r1 = (angle - 1) * DEG_TO_RAD;
      const r2 = (angle + 2) * DEG_TO_RAD;
      ctx.beginPath();
      ctx.arc(cx, cy, (outerR + innerR) / 2, r1, r2);
      ctx.strokeStyle = `hsl(${angle}, 100%, 50%)`;
      ctx.lineWidth = outerR - innerR;
      ctx.stroke();
    }

    const activeHex = this.getActiveColor();
    const { r, g, b } = hexToRgbObj(activeHex);
    const hsv = rgbToHsv(r, g, b);
    const sqHalf = Math.floor(innerR * 0.65);
    const sqX = cx - sqHalf;
    const sqY = cy - sqHalf;
    const sqSize = sqHalf * 2;

    const pureRgb = hsvToRgb(hsv.h, 100, 100);
    ctx.fillStyle = rgbToHex(pureRgb.r, pureRgb.g, pureRgb.b);
    ctx.fillRect(sqX, sqY, sqSize, sqSize);

    const whiteGrad = ctx.createLinearGradient(sqX, sqY, sqX + sqSize, sqY);
    whiteGrad.addColorStop(0, 'rgba(255,255,255,1)');
    whiteGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = whiteGrad;
    ctx.fillRect(sqX, sqY, sqSize, sqSize);

    const blackGrad = ctx.createLinearGradient(sqX, sqY, sqX, sqY + sqSize);
    blackGrad.addColorStop(0, 'rgba(0,0,0,0)');
    blackGrad.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.fillStyle = blackGrad;
    ctx.fillRect(sqX, sqY, sqSize, sqSize);
  }

  _pickFromColorWheel(e) {
    const c = this.colorWheelCanvas;
    const rect = c.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cx = c.width / 2;
    const cy = c.height / 2;
    const dx = x - cx;
    const dy = y - cy;
    const dist = Math.hypot(dx, dy);
    const outerR = cx - 3;
    const innerR = outerR - 14;
    const sqHalf = Math.floor(innerR * 0.65);

    const { r, g, b } = hexToRgbObj(this.getActiveColor());
    const hsv = rgbToHsv(r, g, b);

    if (dist >= innerR - 4) {
      let angle = Math.atan2(dy, dx) * RAD_TO_DEG;
      if (angle < 0) angle += 360;
      const nextRgb = hsvToRgb(angle, Math.max(25, hsv.s), Math.max(25, hsv.v));
      this.setActiveColor(rgbToHex(nextRgb.r, nextRgb.g, nextRgb.b));
    } else {
      const s = Math.max(0, Math.min(100, ((dx + sqHalf) / (sqHalf * 2)) * 100));
      const v = Math.max(0, Math.min(100, (1 - (dy + sqHalf) / (sqHalf * 2)) * 100));
      const nextRgb = hsvToRgb(hsv.h, s, v);
      this.setActiveColor(rgbToHex(nextRgb.r, nextRgb.g, nextRgb.b));
    }
  }

  getActiveColor() {
    return this.paintState.activeWell === 'sub' ? this.paintState.subColor : this.paintState.mainColor;
  }

  setActiveColor(hex) {
    if (this.paintState.activeWell === 'sub') {
      this.paintState.subColor = hex;
    } else {
      this.paintState.mainColor = hex;
    }
    if (!this.paintState.colorHistory.includes(hex)) {
      this.paintState.colorHistory.unshift(hex);
      this.paintState.colorHistory = this.paintState.colorHistory.slice(0, 8);
    }
    this.applyPaintToSelection();
    this.refreshColorPanel();
    this.requestRender();
  }

  swapMainSubColors() {
    const tmp = this.paintState.mainColor;
    this.paintState.mainColor = this.paintState.subColor;
    this.paintState.subColor = tmp;
    this.applyPaintToSelection();
    this.refreshColorPanel();
    this.showToast('メイン / サブカラーを入れ替えました (X)');
  }

  pickColorFromCanvas(sx, sy) {
    const dpr = window.devicePixelRatio || 1;
    const ctx = this.mainCanvas.getContext('2d');
    const pixel = ctx.getImageData(Math.floor(sx * dpr), Math.floor(sy * dpr), 1, 1).data;
    const hex = rgbToHex(pixel[0], pixel[1], pixel[2]);
    this.setActiveColor(hex);
    this.showToast(`スポイト取得: ${hex}`);
  }

  refreshColorPanel() {
    const mainWell = document.getElementById('well-main-color');
    const subWell = document.getElementById('well-sub-color');
    if (!mainWell || !subWell) return;

    mainWell.style.backgroundColor = this.paintState.mainColor;
    subWell.style.backgroundColor = this.paintState.subColor;
    mainWell.classList.toggle('active-well', this.paintState.activeWell === 'main');
    subWell.classList.toggle('active-well', this.paintState.activeWell === 'sub');

    const activeHex = this.getActiveColor();
    document.getElementById('color-hex-input').value = activeHex;
    document.getElementById('native-color-picker').value = activeHex;

    this.drawHueSvWheel();

    const gamutCheck = checkColorGamut(activeHex, this.doc.canvas.colorModel);
    const alertBox = document.getElementById('gamut-alert-box');
    if (alertBox) {
      alertBox.classList.toggle('visible', gamutCheck.outOfGamut);
      document.getElementById('gamut-alert-text').textContent = `⚠ ${gamutCheck.reason}`;
    }

    const mode = document.getElementById('color-mode-select').value;
    const slidersBox = document.getElementById('color-sliders-box');
    const rgb = hexToRgbObj(activeHex);

    if (mode === 'RGB') {
      slidersBox.innerHTML = ['r', 'g', 'b'].map(ch => `
        <div style="display:flex; align-items:center; gap:6px; font-size:0.75rem;">
          <span style="width:14px; text-transform:uppercase;">${ch}</span>
          <input type="range" data-rgb-ch="${ch}" data-snap="none" min="0" max="255" value="${rgb[ch]}" style="flex:1">
          <span style="width:26px;">${rgb[ch]}</span>
        </div>
      `).join('');
      upgradeCustomSliders(slidersBox);
      slidersBox.querySelectorAll('input[data-rgb-ch]').forEach(inp => {
        inp.oninput = () => {
          rgb[inp.getAttribute('data-rgb-ch')] = Number(inp.value);
          this.setActiveColor(rgbToHex(rgb.r, rgb.g, rgb.b));
        };
      });
    } else if (mode === 'CMYK') {
      const cmyk = rgbToCmyk(rgb.r, rgb.g, rgb.b);
      slidersBox.innerHTML = ['c', 'm', 'y', 'k'].map(ch => `
        <div style="display:flex; align-items:center; gap:6px; font-size:0.75rem;">
          <span style="width:14px; text-transform:uppercase;">${ch}</span>
          <input type="range" data-cmyk-ch="${ch}" data-snap="percent" min="0" max="100" value="${cmyk[ch]}" style="flex:1">
          <span style="width:30px;">${cmyk[ch]}%</span>
        </div>
      `).join('');
      upgradeCustomSliders(slidersBox);
      slidersBox.querySelectorAll('input[data-cmyk-ch]').forEach(inp => {
        inp.oninput = () => {
          cmyk[inp.getAttribute('data-cmyk-ch')] = Number(inp.value);
          const next = cmykToRgb(cmyk.c, cmyk.m, cmyk.y, cmyk.k);
          this.setActiveColor(rgbToHex(next.r, next.g, next.b));
        };
      });
    } else {
      const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
      slidersBox.innerHTML = [
        { k: 'h', max: 360, v: hsv.h, snap: 'angle' },
        { k: 's', max: 100, v: hsv.s, snap: 'percent' },
        { k: 'v', max: 100, v: hsv.v, snap: 'percent' }
      ].map(item => `
        <div style="display:flex; align-items:center; gap:6px; font-size:0.75rem;">
          <span style="width:14px; text-transform:uppercase;">${item.k}</span>
          <input type="range" data-hsv-ch="${item.k}" data-snap="${item.snap}" min="0" max="${item.max}" value="${item.v}" style="flex:1">
          <span style="width:28px;">${item.v}</span>
        </div>
      `).join('');
      upgradeCustomSliders(slidersBox);
      slidersBox.querySelectorAll('input[data-hsv-ch]').forEach(inp => {
        inp.oninput = () => {
          hsv[inp.getAttribute('data-hsv-ch')] = Number(inp.value);
          const next = hsvToRgb(hsv.h, hsv.s, hsv.v);
          this.setActiveColor(rgbToHex(next.r, next.g, next.b));
        };
      });
    }

    const swatchGrid = document.getElementById('swatch-grid');
    swatchGrid.innerHTML = (this.doc.swatches || []).map(col =>
      `<div class="swatch-cell" style="background:${col}" data-swatch="${col}" title="${col}"></div>`
    ).join('');
    swatchGrid.querySelectorAll('.swatch-cell').forEach(cell => {
      cell.onclick = () => this.setActiveColor(cell.getAttribute('data-swatch'));
    });

    const histInline = document.getElementById('color-history-inline');
    if (histInline) {
      histInline.innerHTML = this.paintState.colorHistory.map(col =>
        `<span style="width:14px; height:14px; border-radius:3px; background:${col}; cursor:pointer; border:1px solid rgba(255,255,255,0.25);" data-hist-col="${col}" title="履歴: ${col}"></span>`
      ).join('');
      histInline.querySelectorAll('[data-hist-col]').forEach(el => {
        el.onclick = () => this.setActiveColor(el.getAttribute('data-hist-col'));
      });
    }
  }

  // ============================================================================
  // Layer Tree with Live Mini-Thumbnails & Long-Press Magnified Lightbox
  // ============================================================================

  bindLayerPanelEvents() {
    const addVec = () => {
      const before = deepClone(this.doc.rootGroup);
      const count = flattenLayers(this.doc.rootGroup).filter(l => l.layer.type === 'vector').length + 1;
      const newLayer = createVectorLayer(`ベクターレイヤー ${count}`);
      this._insertLayerAboveActive(newLayer);
      this.activeLayerId = newLayer.id;
      this.commands.execute(createLayerTreeCommand(before, this.doc.rootGroup, `${newLayer.name}を作成`, 'layer-vector'), true);
      this.validateActiveToolForLayer();
      this.refreshAllPanels();
    };
    const addRas = () => {
      const before = deepClone(this.doc.rootGroup);
      const count = flattenLayers(this.doc.rootGroup).filter(l => l.layer.type === 'raster').length + 1;
      const newLayer = createRasterLayer(`ラスターレイヤー ${count}`, this.doc.canvas.width, this.doc.canvas.height, 1);
      this.rasterStore.ensureBuffer(newLayer.assetId, newLayer.width, newLayer.height);
      this._insertLayerAboveActive(newLayer);
      this.activeLayerId = newLayer.id;
      this.commands.execute(createLayerTreeCommand(before, this.doc.rootGroup, `${newLayer.name}を作成`, 'layer-raster'), true);
      this.validateActiveToolForLayer();
      this.refreshAllPanels();
    };
    const addGrp = () => {
      const before = deepClone(this.doc.rootGroup);
      const count = flattenLayers(this.doc.rootGroup).filter(l => l.layer.type === 'group').length + 1;
      const newGrp = createGroupLayer(`グループ ${count}`);
      this._insertLayerAboveActive(newGrp);
      this.activeLayerId = newGrp.id;
      this.commands.execute(createLayerTreeCommand(before, this.doc.rootGroup, `${newGrp.name}を作成`, 'layer-group'), true);
      this.validateActiveToolForLayer();
      this.refreshAllPanels();
    };

    document.getElementById('btn-add-vec-layer').onclick = addVec;
    document.getElementById('btn-add-ras-layer').onclick = addRas;
    document.getElementById('btn-add-grp-layer').onclick = addGrp;
    document.getElementById('menu-add-vec').onclick = addVec;
    document.getElementById('menu-add-ras').onclick = addRas;
    document.getElementById('menu-add-grp').onclick = addGrp;

    document.getElementById('btn-layer-up').onclick = () => this.moveActiveLayerOrder(1);
    document.getElementById('btn-layer-down').onclick = () => this.moveActiveLayerOrder(-1);

    document.getElementById('btn-layer-clip').onclick = () => {
      const layer = this.getActiveLayer();
      if (!layer) return;
      const before = deepClone(this.doc.rootGroup);
      layer.clipping = !layer.clipping;
      this.commands.execute(createLayerTreeCommand(before, this.doc.rootGroup, 'クリッピングマスク切替'), true);
    };

    document.getElementById('btn-layer-dup').onclick = () => {
      const layer = this.getActiveLayer();
      if (!layer) return;
      const before = deepClone(this.doc.rootGroup);
      const clone = deepClone(layer);
      clone.id = createId(`lyr_${clone.type.slice(0, 3)}`);
      clone.name = `${layer.name} のコピー`;
      if (clone.type === 'raster') {
        const newAssetId = createId('ras');
        this.rasterStore.cloneBuffer(layer.assetId, newAssetId);
        clone.assetId = newAssetId;
      }
      this._insertLayerAboveActive(clone);
      this.activeLayerId = clone.id;
      this.commands.execute(createLayerTreeCommand(before, this.doc.rootGroup, `${layer.name}を複製`, 'duplicate'), true);
    };

    document.getElementById('btn-layer-merge').onclick = () => this.mergeActiveLayerDown();

    document.getElementById('btn-layer-del').onclick = () => {
      const flat = flattenLayers(this.doc.rootGroup);
      if (flat.length <= 1) {
        this.showToast('最後の1レイヤーは削除できません');
        return;
      }
      const found = findLayerById(this.doc.rootGroup, this.activeLayerId);
      if (!found || !found.parent) return;
      const before = deepClone(this.doc.rootGroup);
      found.parent.children.splice(found.index, 1);
      const remaining = flattenLayers(this.doc.rootGroup);
      this.activeLayerId = remaining[0]?.layer.id || null;
      this.commands.execute(createLayerTreeCommand(before, this.doc.rootGroup, `レイヤー「${found.layer.name}」を削除`, 'trash'), true);
      this.validateActiveToolForLayer();
    };

    document.getElementById('layer-blend-select').onchange = (e) => {
      const layer = this.getActiveLayer();
      if (!layer) return;
      const before = deepClone(this.doc.rootGroup);
      layer.blendMode = e.target.value;
      this.commands.execute(createLayerTreeCommand(before, this.doc.rootGroup, 'ブレンドモードを変更'), true);
    };

    document.getElementById('layer-opacity-slider').oninput = (e) => {
      const layer = this.getActiveLayer();
      if (!layer) return;
      layer.opacity = (Number(e.target.value) || 100) / 100;
      document.getElementById('layer-opacity-val').textContent = `${e.target.value}%`;
      this.requestRender();
    };

    // Lightbox click/tap anywhere to close
    const lightbox = document.getElementById('layer-preview-lightbox');
    if (lightbox) {
      lightbox.onclick = () => lightbox.classList.remove('open');
    }
  }

  _insertLayerAboveActive(newLayer) {
    const found = findLayerById(this.doc.rootGroup, this.activeLayerId);
    if (found && found.layer.type === 'group') {
      found.layer.children.push(newLayer);
    } else if (found && found.parent) {
      found.parent.children.splice(found.index + 1, 0, newLayer);
    } else {
      this.doc.rootGroup.children.push(newLayer);
    }
  }

  moveActiveLayerOrder(dir) {
    const found = findLayerById(this.doc.rootGroup, this.activeLayerId);
    if (!found || !found.parent) return;
    const arr = found.parent.children;
    const nextIdx = found.index + dir;
    if (nextIdx < 0 || nextIdx >= arr.length) return;
    const before = deepClone(this.doc.rootGroup);
    const [item] = arr.splice(found.index, 1);
    arr.splice(nextIdx, 0, item);
    this.commands.execute(createLayerTreeCommand(before, this.doc.rootGroup, 'レイヤー順序を変更'), true);
  }

  mergeActiveLayerDown() {
    const found = findLayerById(this.doc.rootGroup, this.activeLayerId);
    if (!found || !found.parent || found.index <= 0) {
      this.showToast('結合できる下のレイヤーがありません');
      return;
    }
    const upper = found.layer;
    const lower = found.parent.children[found.index - 1];
    const before = deepClone(this.doc.rootGroup);

    if (upper.type === 'vector' && lower.type === 'vector') {
      lower.objects.push(...deepClone(upper.objects));
      found.parent.children.splice(found.index, 1);
      this.activeLayerId = lower.id;
      this.commands.execute(createLayerTreeCommand(before, this.doc.rootGroup, 'ベクターレイヤーを結合'), true);
    } else {
      const mergedRaster = createRasterLayer(`${lower.name} (結合)`, this.doc.canvas.width, this.doc.canvas.height, 1);
      const buf = this.rasterStore.ensureBuffer(mergedRaster.assetId, this.doc.canvas.width, this.doc.canvas.height);
      const ctx = buf.getContext('2d');
      renderLayerTreeToContext(ctx, { visible: true, children: [lower, upper] }, this.doc, this.rasterStore, this.imageCache);
      found.parent.children.splice(found.index - 1, 2, mergedRaster);
      this.activeLayerId = mergedRaster.id;
      this.commands.execute(createLayerTreeCommand(before, this.doc.rootGroup, 'レイヤーをラスター結合'), true);
      this.validateActiveToolForLayer();
    }
  }

  rasterizeActiveVectorLayer(dpiScale = 1, replaceOriginal = false) {
    const layer = this.getActiveLayer();
    if (!layer || (layer.type !== 'vector' && layer.type !== 'group')) {
      this.showToast('ベクターレイヤーまたはグループを選択してください');
      return;
    }
    const before = deepClone(this.doc.rootGroup);
    const newRaster = rasterizeLayerToNewRasterLayer(layer, this.doc, this.rasterStore, dpiScale);
    if (replaceOriginal) {
      const found = findLayerById(this.doc.rootGroup, layer.id);
      if (found && found.parent) {
        found.parent.children.splice(found.index, 1, newRaster);
      }
    } else {
      this._insertLayerAboveActive(newRaster);
    }
    this.activeLayerId = newRaster.id;
    this.commands.execute(createLayerTreeCommand(before, this.doc.rootGroup, `「${layer.name}」をラスター化 (複製)`, 'rasterize'), true);
    this.validateActiveToolForLayer();
    this.showToast(`「${layer.name}」をラスターレイヤーとして複製変換しました`);
  }

  /**
   * Renders a single layer's content onto a target preview canvas (for both mini-thumbnails & magnified lightbox)
   */
  _drawSingleLayerPreview(targetCanvas, layer) {
    if (!targetCanvas || !layer) return;
    const ctx = targetCanvas.getContext('2d');
    const tw = targetCanvas.width;
    const th = targetCanvas.height;
    ctx.clearRect(0, 0, tw, th);

    const cw = this.doc.canvas.width || 1200;
    const ch = this.doc.canvas.height || 800;
    const scale = Math.min(tw / cw, th / ch);
    const ox = (tw - cw * scale) / 2;
    const oy = (th - ch * scale) / 2;

    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(scale, scale);

    if (layer.type === 'vector') {
      for (const obj of layer.objects || []) {
        drawVectorObjectToContext(ctx, obj, this.doc, this.imageCache);
      }
    } else if (layer.type === 'raster') {
      const buf = this.rasterStore.getBuffer(layer.assetId);
      if (buf && !buf._headlessData) {
        ctx.drawImage(buf, 0, 0, cw, ch);
      }
    } else if (layer.type === 'group') {
      renderLayerTreeToContext(ctx, layer, this.doc, this.rasterStore, this.imageCache);
    }
    ctx.restore();
  }

  openLayerMagnifiedPreview(layer) {
    const lightbox = document.getElementById('layer-preview-lightbox');
    const titleEl = document.getElementById('layer-preview-title');
    const bigCanvas = document.getElementById('layer-preview-big-canvas');
    if (!lightbox || !bigCanvas || !layer) return;

    titleEl.textContent = `🔍 レイヤー拡大プレビュー: ${layer.name} (${layer.type.toUpperCase()})`;
    this._drawSingleLayerPreview(bigCanvas, layer);
    lightbox.classList.add('open');
  }

  renderLayersPanel() {
    const listEl = document.getElementById('layer-list');
    if (!listEl) return;

    const active = this.getActiveLayer();
    const badge = document.getElementById('active-layer-badge');
    if (active && badge) {
      badge.className = `layer-type-pill ${active.type}`;
      badge.textContent = active.type === 'vector' ? 'Vector' : active.type === 'raster' ? 'Raster' : 'Group';
      document.getElementById('layer-blend-select').value = active.blendMode || 'normal';
      const opPct = Math.round((active.opacity ?? 1) * 100);
      setSliderValue('layer-opacity-slider', opPct);
      document.getElementById('layer-opacity-val').textContent = `${opPct}%`;
    }

    const flat = flattenLayers(this.doc.rootGroup);
    listEl.innerHTML = flat.map(({ layer, depth }) => {
      const isSelected = layer.id === this.activeLayerId;
      const typeLabel = layer.type === 'vector' ? 'V' : layer.type === 'raster' ? 'R' : 'G';
      const subInfo = layer.type === 'vector' ? `(${layer.objects.length})` : '';
      return `
        <li class="layer-row ${isSelected ? 'selected' : ''}" data-layer-id="${layer.id}" style="padding-left:${8 + depth * 14}px">
          <button type="button" class="lyr-vis-btn" data-vis-id="${layer.id}" title="表示/非表示" style="padding:2px; border:none; background:none;">
            ${renderIcon(layer.visible ? 'eye-open' : 'eye-closed', 15)}
          </button>
          <button type="button" class="lyr-lock-btn" data-lock-id="${layer.id}" title="ロック切替" style="padding:2px; border:none; background:none;">
            ${renderIcon(layer.locked ? 'lock-closed' : 'lock-open', 15)}
          </button>
          <canvas class="layer-thumb-canvas" width="72" height="52" data-thumb-id="${layer.id}" title="長押しでレイヤー拡大プレビューを表示"></canvas>
          <span class="layer-type-pill ${layer.type}">${typeLabel}</span>
          ${layer.clipping ? `<span title="下のレイヤーでクリッピング中" style="color:var(--accent-hover)">↳</span>` : ''}
          <span class="layer-name" data-rename-id="${layer.id}" title="ダブルクリックで名前変更">${layer.name} <small style="color:var(--text-muted)">${subInfo}</small></span>
        </li>
      `;
    }).join('');

    // Render mini thumbnails and attach long-press listener for magnified lightbox
    listEl.querySelectorAll('.layer-thumb-canvas').forEach(thumbCanvas => {
      const lid = thumbCanvas.getAttribute('data-thumb-id');
      const found = findLayerById(this.doc.rootGroup, lid);
      if (found) {
        this._drawSingleLayerPreview(thumbCanvas, found.layer);

        let thumbTimer = null;
        const clearThumbTimer = () => {
          if (thumbTimer) {
            clearTimeout(thumbTimer);
            thumbTimer = null;
          }
        };
        thumbCanvas.addEventListener('pointerdown', (e) => {
          e.stopPropagation();
          clearThumbTimer();
          thumbTimer = setTimeout(() => {
            this.openLayerMagnifiedPreview(found.layer);
          }, 420);
        });
        thumbCanvas.addEventListener('pointerup', clearThumbTimer);
        thumbCanvas.addEventListener('pointerleave', clearThumbTimer);
        thumbCanvas.addEventListener('pointercancel', clearThumbTimer);
      }
    });

    listEl.querySelectorAll('.layer-row').forEach(row => {
      const lid = row.getAttribute('data-layer-id');
      row.onclick = (e) => {
        if (e.target.closest('button')) return;
        this.activeLayerId = lid;
        this.validateActiveToolForLayer();
        this.refreshAllPanels();
        this.requestRender();
      };
      row.ondblclick = () => {
        const found = findLayerById(this.doc.rootGroup, lid);
        if (!found) return;
        const nextName = prompt('レイヤー名を変更:', found.layer.name);
        if (nextName && nextName.trim()) {
          const before = deepClone(this.doc.rootGroup);
          found.layer.name = nextName.trim();
          this.commands.execute(createLayerTreeCommand(before, this.doc.rootGroup, 'レイヤー名を変更'), true);
        }
      };
    });

    listEl.querySelectorAll('[data-vis-id]').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const found = findLayerById(this.doc.rootGroup, btn.getAttribute('data-vis-id'));
        if (found) {
          const before = deepClone(this.doc.rootGroup);
          found.layer.visible = !found.layer.visible;
          this.commands.execute(createLayerTreeCommand(before, this.doc.rootGroup, 'レイヤー表示切替'), true);
          this.validateActiveToolForLayer();
        }
      };
    });

    listEl.querySelectorAll('[data-lock-id]').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const found = findLayerById(this.doc.rootGroup, btn.getAttribute('data-lock-id'));
        if (found) {
          const before = deepClone(this.doc.rootGroup);
          found.layer.locked = !found.layer.locked;
          this.commands.execute(createLayerTreeCommand(before, this.doc.rootGroup, 'レイヤーロック切替'), true);
          this.validateActiveToolForLayer();
        }
      };
    });
  }

  // ============================================================================
  // Properties, Transform, Alignment & Boolean Operations
  // ============================================================================

  renderPropertiesPanel() {
    const box = document.getElementById('properties-body');
    if (!box) return;

    const selected = this.getSelectedObjects();
    if (selected.length === 0) {
      const c = this.doc.canvas;
      box.innerHTML = `
        <div style="font-size:0.8rem; color:var(--text-muted);">
          オブジェクト未選択 — キャンバス情報:<br>
          <strong>${c.width} × ${c.height} px</strong> (${c.dpi} DPI / ${c.colorModel} ${c.bitDepth}bit)
        </div>
        <div style="display:flex; gap:6px; margin-top:4px;">
          <button type="button" id="prop-btn-resize" style="flex:1">サイズ変更...</button>
          <button type="button" id="prop-btn-clear-guides" style="flex:1">ガイド全消去</button>
        </div>
      `;
      const rBtn = box.querySelector('#prop-btn-resize');
      if (rBtn) rBtn.onclick = () => showCanvasResizeModal(this);
      const gBtn = box.querySelector('#prop-btn-clear-guides');
      if (gBtn) gBtn.onclick = () => { this.doc.guides = []; this.requestRender(); };
      return;
    }

    const obj = selected[0];
    const b = getObjectBounds(obj);
    const tr = obj.transform || {};

    let extraParamsHtml = '';
    if (obj.kind === 'rounded-rect' || obj.kind === 'callout') {
      extraParamsHtml += `
        <div class="form-field">
          <label>角丸半径 (rx)</label>
          <input type="number" id="prop-rx" value="${Math.round(obj.rx || 0)}" min="0">
        </div>
      `;
    }
    if (obj.kind === 'polygon' || obj.kind === 'star') {
      extraParamsHtml += `
        <div class="form-field">
          <label>頂点数 (Sides)</label>
          <input type="number" id="prop-sides" value="${obj.sides || 5}" min="3" max="32">
        </div>
      `;
    }
    if (obj.kind === 'text') {
      extraParamsHtml += `
        <div class="form-field" style="grid-column: span 2;">
          <label>テキスト内容</label>
          <input type="text" id="prop-text-val" value="${obj.text || ''}">
        </div>
      `;
    }

    box.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.8rem;">
        <strong>${obj.name} (${obj.kind})</strong>
        <span style="color:var(--text-muted)">${selected.length > 1 ? `他+${selected.length - 1}個選択中` : ''}</span>
      </div>
      <div class="form-grid" style="grid-template-columns: 1fr 1fr; gap:6px;">
        <div class="form-field">
          <label>X 座標</label>
          <input type="number" id="prop-x" value="${Math.round(b.x)}">
        </div>
        <div class="form-field">
          <label>Y 座標</label>
          <input type="number" id="prop-y" value="${Math.round(b.y)}">
        </div>
        <div class="form-field">
          <label>幅 (W)</label>
          <input type="number" id="prop-w" value="${Math.round(b.width)}" min="2">
        </div>
        <div class="form-field">
          <label>高さ (H)</label>
          <input type="number" id="prop-h" value="${Math.round(b.height)}" min="2">
        </div>
        <div class="form-field">
          <label>回転角 (°)</label>
          <input type="number" id="prop-rot" value="${Math.round(tr.rotation || 0)}">
        </div>
        <div class="form-field">
          <label>傾斜 SkewX (°)</label>
          <input type="number" id="prop-skewx" value="${Math.round(tr.skewX || 0)}">
        </div>
        ${extraParamsHtml}
      </div>
      <div style="display:flex; gap:4px; flex-wrap:wrap; margin-top:4px;">
        <button type="button" id="prop-front" style="flex:1; font-size:0.75rem;">最前面</button>
        <button type="button" id="prop-back" style="flex:1; font-size:0.75rem;">最背面</button>
        <button type="button" id="prop-offset" style="flex:1; font-size:0.75rem;">オフセット</button>
        <button type="button" id="prop-del" style="flex:1; font-size:0.75rem; color:var(--danger)">削除 (Del)</button>
      </div>
    `;

    const applyNumericMutation = (mutator, label) => {
      const before = deepClone(obj);
      mutator(obj);
      this.commands.execute(createUpdateObjectsCommand([before], [obj], label, 'prop-edit'), true);
      this.requestRender();
    };

    const bindNum = (sel, cb) => {
      const el = box.querySelector(sel);
      if (el) el.onchange = () => cb(Number(el.value) || 0);
    };

    bindNum('#prop-x', (v) => applyNumericMutation(o => { o.x = v - (o.transform?.tx || 0); }, 'X座標を変更'));
    bindNum('#prop-y', (v) => applyNumericMutation(o => { o.y = v - (o.transform?.ty || 0); }, 'Y座標を変更'));
    bindNum('#prop-w', (v) => applyNumericMutation(o => { o.width = Math.max(2, v); }, '幅を変更'));
    bindNum('#prop-h', (v) => applyNumericMutation(o => { o.height = Math.max(2, v); }, '高さを変更'));
    bindNum('#prop-rot', (v) => applyNumericMutation(o => { o.transform.rotation = v; }, '回転角を変更'));
    bindNum('#prop-skewx', (v) => applyNumericMutation(o => { o.transform.skewX = v; }, '傾斜を変更'));
    bindNum('#prop-rx', (v) => applyNumericMutation(o => { o.rx = Math.max(0, v); o.ry = Math.max(0, v); }, '角丸を変更'));
    bindNum('#prop-sides', (v) => applyNumericMutation(o => { o.sides = Math.max(3, v); }, '頂点数を変更'));

    const txtInp = box.querySelector('#prop-text-val');
    if (txtInp) {
      txtInp.oninput = () => applyNumericMutation(o => { o.text = txtInp.value; }, 'テキストを変更');
    }

    box.querySelector('#prop-front').onclick = () => this.changeSelectionZOrder('front');
    box.querySelector('#prop-back').onclick = () => this.changeSelectionZOrder('back');
    box.querySelector('#prop-offset').onclick = () => this.offsetSelectedObject(10);
    box.querySelector('#prop-del').onclick = () => this.deleteSelection();
  }

  alignSelectedObjects(mode) {
    const selected = this.getSelectedObjects();
    if (selected.length === 0) return;
    const before = selected.map(o => deepClone(o));

    let refX = 0, refY = 0, refW = this.doc.canvas.width, refH = this.doc.canvas.height;
    if (selected.length > 1) {
      const boundsList = selected.map(getObjectBounds);
      refX = Math.min(...boundsList.map(b => b.x));
      refY = Math.min(...boundsList.map(b => b.y));
      refW = Math.max(...boundsList.map(b => b.x + b.width)) - refX;
      refH = Math.max(...boundsList.map(b => b.y + b.height)) - refY;
    }

    for (const obj of selected) {
      const b = getObjectBounds(obj);
      if (mode === 'left') obj.transform.tx += (refX - b.x);
      if (mode === 'center-h') obj.transform.tx += (refX + refW / 2 - b.cx);
      if (mode === 'right') obj.transform.tx += (refX + refW - (b.x + b.width));
      if (mode === 'top') obj.transform.ty += (refY - b.y);
      if (mode === 'center-v') obj.transform.ty += (refY + refH / 2 - b.cy);
      if (mode === 'bottom') obj.transform.ty += (refY + refH - (b.y + b.height));
    }

    this.commands.execute(createUpdateObjectsCommand(before, selected, 'オブジェクトを整列'), true);
    this.requestRender();
  }

  flipSelectedObjects(axis = 'h') {
    const selected = this.getSelectedObjects();
    if (selected.length === 0) return;
    const before = selected.map(o => deepClone(o));
    for (const obj of selected) {
      if (axis === 'h') obj.transform.scaleX = (obj.transform.scaleX || 1) * -1;
      else obj.transform.scaleY = (obj.transform.scaleY || 1) * -1;
    }
    this.commands.execute(createUpdateObjectsCommand(before, selected, axis === 'h' ? '左右反転' : '上下反転'), true);
    this.requestRender();
  }

  runBooleanOnSelection(op = 'union') {
    const selected = this.getSelectedObjects();
    if (selected.length < 2) {
      this.showToast('パス演算を行うには、2つの図形を選択してください（選択ツールで範囲選択またはShift+クリック）');
      return;
    }
    const foundA = findObjectById(this.doc.rootGroup, selected[0].id);
    if (!foundA) return;
    const resultObj = performBooleanOperation(selected[0], selected[1], op);
    this.commands.execute(
      createReplaceObjectsCommand(foundA.layer.id, [selected[0].id, selected[1].id], [resultObj], `パス演算 (${op})`)
    );
    this.selectedObjectIds.clear();
    this.selectedObjectIds.add(resultObj.id);
    this.refreshAllPanels();
    this.requestRender();
  }

  convertSelectionToPath() {
    const selected = this.getSelectedObjects();
    if (selected.length === 0) return;
    const obj = selected[0];
    const found = findObjectById(this.doc.rootGroup, obj.id);
    if (!found) return;
    const pathObj = convertObjectToPath(obj);
    this.commands.execute(createReplaceObjectsCommand(found.layer.id, [obj.id], [pathObj], 'パスに変換 (アウトライン化)'));
    this.selectedObjectIds.clear();
    this.selectedObjectIds.add(pathObj.id);
    this.selectTool('node');
  }

  offsetSelectedObject(deltaPx = 8) {
    const selected = this.getSelectedObjects();
    if (selected.length === 0) return;
    const obj = selected[0];
    const found = findObjectById(this.doc.rootGroup, obj.id);
    if (!found) return;
    const offsetObj = offsetVectorObject(obj, deltaPx);
    this.commands.execute(createAddObjectCommand(found.layer.id, offsetObj, 'オフセットパスを生成'));
    this.selectedObjectIds.clear();
    this.selectedObjectIds.add(offsetObj.id);
    this.refreshAllPanels();
    this.requestRender();
  }

  changeSelectionZOrder(target = 'front') {
    const selected = this.getSelectedObjects();
    if (selected.length === 0) return;
    const found = findObjectById(this.doc.rootGroup, selected[0].id);
    if (!found) return;
    const layer = found.layer;
    const beforeIds = layer.objects.map(o => o.id);
    const rest = layer.objects.filter(o => o.id !== selected[0].id);
    const afterList = target === 'front' ? [...rest, selected[0]] : [selected[0], ...rest];
    const afterIds = afterList.map(o => o.id);
    this.commands.execute(createReorderObjectsCommand(layer.id, beforeIds, afterIds, target === 'front' ? '最前面へ移動' : '最背面へ移動'));
  }

  deleteSelection() {
    if (this.selectedObjectIds.size === 0) return;
    const ids = Array.from(this.selectedObjectIds);
    this.selectedObjectIds.clear();
    this.commands.execute(createDeleteObjectsCommand(ids, this.doc));
    this.showToast(`${ids.length}個のオブジェクトを削除しました (Ctrl+Zで復元可能)`);
  }

  duplicateSelection() {
    const selected = this.getSelectedObjects();
    if (selected.length === 0) return;
    const found = findObjectById(this.doc.rootGroup, selected[0].id);
    if (!found) return;
    const clone = deepClone(selected[0]);
    clone.id = createId('obj');
    clone.name = `${selected[0].name} (コピー)`;
    clone.transform.tx = (clone.transform.tx || 0) + 20;
    clone.transform.ty = (clone.transform.ty || 0) + 20;
    this.commands.execute(createAddObjectCommand(found.layer.id, clone, `${selected[0].name}を複製`));
    this.selectedObjectIds.clear();
    this.selectedObjectIds.add(clone.id);
    this.refreshAllPanels();
    this.requestRender();
  }

  // ============================================================================
  // History Panel, Status Bar, Dropdown Menubar, Print & Customizable Keybindings
  // ============================================================================

  renderHistoryPanel() {
    const listEl = document.getElementById('history-list');
    const countEl = document.getElementById('history-count-label');
    if (!listEl) return;

    const hist = this.commands.history;
    if (countEl) countEl.textContent = `${this.commands.cursor + 1} / ${hist.length}件`;

    document.getElementById('btn-undo').disabled = !this.commands.canUndo();
    document.getElementById('btn-redo').disabled = !this.commands.canRedo();

    const rows = [
      `<li class="history-item ${this.commands.cursor === -1 ? 'active' : ''}" data-hist-idx="-1">
        <span>● 初期状態</span>
        <small>Start</small>
      </li>`
    ];

    hist.forEach((cmd, idx) => {
      const isCurrent = idx === this.commands.cursor;
      const isFuture = idx > this.commands.cursor;
      const timeStr = new Date(cmd.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      rows.push(`
        <li class="history-item ${isCurrent ? 'active' : ''} ${isFuture ? 'future' : ''}" data-hist-idx="${idx}">
          <span>${idx + 1}. ${cmd.label}</span>
          <small style="color:var(--text-muted)">${timeStr}</small>
        </li>
      `);
    });

    listEl.innerHTML = rows.join('');
    listEl.querySelectorAll('.history-item').forEach(item => {
      item.onclick = () => {
        const idx = Number(item.getAttribute('data-hist-idx'));
        this.commands.jumpTo(idx);
      };
    });
    listEl.scrollTop = listEl.scrollHeight;
  }

  updateStatusBar() {
    const unit = this.doc.canvas.unit || 'px';
    const dpi = this.doc.canvas.dpi || 96;
    const ux = fromPixels(this.hoverWorldPos.x, unit, dpi);
    const uy = fromPixels(this.hoverWorldPos.y, unit, dpi);
    document.getElementById('st-coords').textContent = `XY: (${Math.round(ux)}, ${Math.round(uy)}) ${unit}`;
    document.getElementById('st-zoom').textContent = `Zoom: ${Math.round(this.viewport.zoom * 100)}% (Rot: ${this.viewport.rotation}°)`;
    document.getElementById('st-canvas').textContent = `${this.doc.canvas.width}×${this.doc.canvas.height} px (${dpi} DPI / ${this.doc.canvas.colorModel})`;

    const sel = this.getSelectedObjects();
    if (sel.length > 0) {
      const b = getObjectBounds(sel[0]);
      document.getElementById('st-selection').textContent = `選択: ${Math.round(b.width)}×${Math.round(b.height)} px (${sel.length}個)`;
    } else {
      document.getElementById('st-selection').textContent = '選択なし';
    }

    const toolDef = TOOL_DEFINITIONS.find(t => t.id === this.activeToolId);
    document.getElementById('st-tool').textContent = `Tool: ${toolDef ? toolDef.labelJa : this.activeToolId}`;

    const activeLayer = this.getActiveLayer();
    document.getElementById('st-layer').textContent = `Layer: ${activeLayer ? activeLayer.name : '--'}`;

    const tiltDeg = Math.round(Math.hypot(this.hoverWorldPos.tiltX || 0, this.hoverWorldPos.tiltY || 0));
    document.getElementById('st-pressure').textContent = `筆圧: ${Math.round((this.hoverWorldPos.pressure || 0) * 100)}% / 傾き: ${tiltDeg}°`;

    const layerCount = flattenLayers(this.doc.rootGroup).length;
    const memMB = estimateCanvasMemoryMB(this.doc.canvas.width, this.doc.canvas.height, this.doc.canvas.bitDepth, layerCount);
    const memEl = document.getElementById('st-memory');
    memEl.textContent = `Mem: ~${memMB} MB`;
    memEl.style.color = memMB > 400 ? 'var(--warning)' : 'var(--text-muted)';
  }

  onDocumentChanged() {
    this.refreshAllPanels();
    this.requestRender();

    // Strictly respect Cookie/Storage consent before writing any autosave data!
    if (!hasStorageConsent()) {
      this.updateCookieConsentBanner();
      return;
    }

    clearTimeout(this._autosaveTimer);
    const saveEl = document.getElementById('st-save');
    if (saveEl) {
      saveEl.textContent = '● 保存中...';
      saveEl.style.color = 'var(--warning)';
    }
    this._autosaveTimer = setTimeout(async () => {
      await saveAutosaveSnapshot(this.doc, this.rasterStore, this.viewport);
      if (saveEl) {
        saveEl.textContent = `● ${t('status.saved')}`;
        saveEl.style.color = 'var(--vector-badge)';
      }
    }, 550);
  }

  refreshAllPanels() {
    this.renderToolbar();
    this.renderContextBar();
    this.refreshColorPanel();
    this.renderLayersPanel();
    this.renderPropertiesPanel();
    this.renderHistoryPanel();
    this.updateStatusBar();
  }

  // ============================================================================
  // Dropdown Menubar, Print Canvas & File Operations
  // ============================================================================

  bindTopMenuEvents() {
    // Support touch/click toggle on top menu dropdowns in addition to CSS hover
    document.querySelectorAll('.menu-dropdown > .menu-trigger').forEach(trigger => {
      trigger.onclick = (e) => {
        e.stopPropagation();
        const parent = trigger.parentElement;
        const wasOpen = parent.classList.contains('open');
        document.querySelectorAll('.menu-dropdown.open').forEach(d => d.classList.remove('open'));
        if (!wasOpen) parent.classList.add('open');
      };
    });
    document.addEventListener('click', () => {
      document.querySelectorAll('.menu-dropdown.open').forEach(d => d.classList.remove('open'));
    });

    document.getElementById('btn-toggle-left').onclick = () => {
      const tb = document.getElementById('left-toolbar');
      tb.style.display = tb.style.display === 'none' ? 'flex' : 'none';
      this.resizeViewportCanvases();
    };
    document.getElementById('btn-toggle-right').onclick = () => {
      document.getElementById('right-dock').classList.toggle('collapsed');
      setTimeout(() => this.resizeViewportCanvases(), 220);
    };

    // Standard right dock panels are collapsible (fold/expand only), whereas #panel-tool-inspector is closable
    document.querySelectorAll('.dock-panel:not(#panel-tool-inspector) > .dock-header').forEach(hdr => {
      hdr.onclick = (e) => {
        if (e.target.closest('select') || e.target.closest('button')) return;
        hdr.parentElement.classList.toggle('folded');
      };
    });

    // File menu actions
    document.getElementById('btn-new-doc').onclick = () => showNewDocumentModal(this);
    document.getElementById('btn-open-file').onclick = () => document.getElementById('hidden-file-input').click();
    document.getElementById('hidden-file-input').onchange = (e) => this.handleFileOpen(e.target);
    document.getElementById('btn-save-workspace').onclick = () => this.saveWorkspaceArchive();
    document.getElementById('btn-quick-svg').onclick = () => this.quickExportSVG();
    document.getElementById('menu-export-svg').onclick = () => this.quickExportSVG();
    document.getElementById('btn-quick-png').onclick = () => this.exportRasterFormat('png', 1, 1.0, false, this.doc.metadata.title || 'artwork');
    document.getElementById('menu-export-png').onclick = () => this.exportRasterFormat('png', 1, 1.0, false, this.doc.metadata.title || 'artwork');
    document.getElementById('btn-custom-export').onclick = () => showCustomExportModal(this);
    document.getElementById('btn-print-doc').onclick = () => this.printCanvasArtwork();
    document.getElementById('btn-quick-print').onclick = () => this.printCanvasArtwork();

    // Edit menu actions
    document.getElementById('btn-undo').onclick = () => this.commands.undo();
    document.getElementById('btn-redo').onclick = () => this.commands.redo();
    document.getElementById('menu-undo').onclick = () => this.commands.undo();
    document.getElementById('menu-redo').onclick = () => this.commands.redo();
    document.getElementById('menu-dup-obj').onclick = () => this.duplicateSelection();
    document.getElementById('menu-del-obj').onclick = () => this.deleteSelection();
    document.getElementById('menu-open-prefs').onclick = () => showPreferencesModal(this, 'general');
    document.getElementById('btn-settings').onclick = () => showPreferencesModal(this, 'general');

    // Canvas & Layer menu actions
    document.getElementById('btn-canvas-resize').onclick = () => showCanvasResizeModal(this);
    document.getElementById('btn-rasterize-layer').onclick = () => this.rasterizeActiveVectorLayer(1, false);
    document.getElementById('menu-clear-guides').onclick = () => {
      this.doc.guides = [];
      this.requestRender();
      this.showToast('ガイドラインをすべて消去しました');
    };

    // View menu actions
    document.getElementById('menu-zoom-fit').onclick = () => this.zoomToFit();
    document.getElementById('menu-zoom-100').onclick = () => this.setZoom(1.0);
    document.getElementById('menu-rot-reset').onclick = () => {
      this.viewport.rotation = 0;
      this._syncNavigatorSliders();
      this.requestRender();
    };
    document.getElementById('menu-toggle-grid').onclick = () => {
      this.doc.grid.enabled = !this.doc.grid.enabled;
      this.requestRender();
    };
    document.getElementById('menu-toggle-theme').onclick = () => {
      const root = document.documentElement;
      const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      this.preferences.theme = next;
      if (hasStorageConsent()) savePreferencesToStorage({ preferences: this.preferences, keybindings: this.keybindings });
      this.requestRender();
    };

    // Help menu actions
    document.getElementById('btn-help').onclick = () => showShortcutsModal(this);
    document.getElementById('menu-shortcuts').onclick = () => showShortcutsModal(this);
    document.getElementById('menu-about').onclick = () => showAboutModal();

    // Context menu actions
    document.querySelectorAll('#canvas-context-menu button[data-ctx-action]').forEach(btn => {
      btn.onclick = () => {
        const act = btn.getAttribute('data-ctx-action');
        this.closeContextMenu();
        if (act === 'duplicate') this.duplicateSelection();
        if (act === 'bring-front') this.changeSelectionZOrder('front');
        if (act === 'send-back') this.changeSelectionZOrder('back');
        if (act === 'flip-h') this.flipSelectedObjects('h');
        if (act === 'flip-v') this.flipSelectedObjects('v');
        if (act === 'convert-path') this.convertSelectionToPath();
        if (act === 'offset-path') this.offsetSelectedObject(8);
        if (act === 'rasterize') this.rasterizeActiveVectorLayer(1, false);
        if (act === 'delete') this.deleteSelection();
      };
    });
  }

  /**
   * High-Resolution Vector + Raster Print Feature
   */
  printCanvasArtwork() {
    const { svgString } = serializeDocumentToSVG(this.doc, this.rasterStore, { optimize: true });
    const printWin = window.open('', '_blank', 'width=900,height=700');
    if (!printWin) {
      window.print();
      return;
    }
    printWin.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Print — ${this.doc.metadata.title || 'SVG EDITOR'}</title>
        <style>
          @page { margin: 5mm; size: auto; }
          html, body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #fff; }
          svg { max-width: 100%; max-height: 95vh; height: auto; width: auto; }
        </style>
      </head>
      <body>
        ${svgString}
        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); window.close(); }, 200);
          };
        <\/script>
      </body>
      </html>
    `);
    printWin.document.close();
  }

  createNewDocument(options) {
    this.doc = createDocument(options);
    this.rasterStore = new RasterStore();
    this._ensureAllRasterBuffers();
    const flat = flattenLayers(this.doc.rootGroup);
    this.activeLayerId = flat[0]?.layer.id || null;
    this.selectedObjectIds.clear();
    this.commands.setDocument(this.doc);
    this.commands.rasterStore = this.rasterStore;
    this.syncToolbarCollapseToActiveLayer();
    this.zoomToFit();
    this.refreshAllPanels();
    this.showToast(`新規キャンバス (${this.doc.canvas.width}×${this.doc.canvas.height}px) を作成しました`);
  }

  resizeCanvas(nextW, nextH, nextDpi, mode = 'expand') {
    const beforeCanvas = deepClone(this.doc.canvas);
    const beforeRoot = deepClone(this.doc.rootGroup);
    const afterCanvas = {
      ...deepClone(this.doc.canvas),
      width: nextW,
      height: nextH,
      dpi: nextDpi,
      orientation: nextW >= nextH ? 'landscape' : 'portrait'
    };

    const afterRoot = deepClone(this.doc.rootGroup);
    if (mode === 'scale') {
      const sx = nextW / beforeCanvas.width;
      const sy = nextH / beforeCanvas.height;
      const scaleGroup = (grp) => {
        for (const ch of grp.children || []) {
          if (ch.type === 'vector') {
            for (const o of ch.objects) {
              o.x *= sx; o.y *= sy;
              o.width *= sx; o.height *= sy;
              if (o.nodes) {
                for (const n of o.nodes) {
                  n.x *= sx; n.y *= sy;
                  if (n.inX != null) n.inX *= sx;
                  if (n.inY != null) n.inY *= sy;
                  if (n.outX != null) n.outX *= sx;
                  if (n.outY != null) n.outY *= sy;
                }
              }
            }
          } else if (ch.type === 'group') {
            scaleGroup(ch);
          }
        }
      };
      scaleGroup(afterRoot);
    }

    this.commands.execute(createCanvasConfigCommand(beforeCanvas, afterCanvas, beforeRoot, afterRoot, 'キャンバスサイズ変更'));
    this.zoomToFit();
  }

  quickExportSVG() {
    const { svgString, warnings } = serializeDocumentToSVG(this.doc, this.rasterStore, { optimize: true });
    if (warnings.length > 0) {
      this.showToast(warnings[0]);
    }
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    this.downloadBlob(blob, `${this.doc.metadata.title || 'artwork'}.svg`);
  }

  exportRasterFormat(format = 'png', scale = 1, quality = 0.92, transparentBg = false, filename = 'artwork') {
    const outCanvas = document.createElement('canvas');
    outCanvas.width = Math.round(this.doc.canvas.width * scale);
    outCanvas.height = Math.round(this.doc.canvas.height * scale);
    const ctx = outCanvas.getContext('2d');
    ctx.scale(scale, scale);

    if (!transparentBg && (this.doc.canvas.background.type !== 'transparent' || format === 'jpeg')) {
      ctx.fillStyle = this.doc.canvas.background.type === 'white' ? '#ffffff' : (this.doc.canvas.background.color || '#ffffff');
      ctx.fillRect(0, 0, this.doc.canvas.width, this.doc.canvas.height);
    }

    renderLayerTreeToContext(ctx, this.doc.rootGroup, this.doc, this.rasterStore, this.imageCache);
    const mime = `image/${format}`;
    outCanvas.toBlob((blob) => {
      if (blob) {
        this.downloadBlob(blob, `${filename}.${format === 'jpeg' ? 'jpg' : format}`);
      }
    }, mime, quality);
  }

  saveWorkspaceArchive() {
    const zipBytes = exportWorkspaceZip(this.doc, this.rasterStore);
    const blob = new Blob([zipBytes], { type: 'application/zip' });
    this.downloadBlob(blob, `${this.doc.metadata.title || 'workspace'}.svgew`);
    this.showToast('ワークスペース (.svgew ZIP) を保存しました');
  }

  async handleFileOpen(input) {
    const file = input.files && input.files[0];
    if (!file) return;
    const name = file.name.toLowerCase();

    try {
      if (name.endsWith('.svgew') || name.endsWith('.zip')) {
        const buf = await file.arrayBuffer();
        const { doc, recoveryWarnings } = await importWorkspaceZip(new Uint8Array(buf), this.rasterStore);
        this.doc = doc;
        this._ensureAllRasterBuffers();
        const flat = flattenLayers(this.doc.rootGroup);
        this.activeLayerId = flat[0]?.layer.id || null;
        this.selectedObjectIds.clear();
        this.commands.setDocument(this.doc);
        this.syncToolbarCollapseToActiveLayer();
        this.zoomToFit();
        this.refreshAllPanels();
        if (recoveryWarnings.length > 0) {
          this.showToast(`部分復旧: ${recoveryWarnings[0]}`);
        } else {
          this.showToast(`ワークスペース「${file.name}」を読み込みました`);
        }
      } else if (name.endsWith('.svg')) {
        const text = await file.text();
        const { width, height, objects, sanitizedReport } = importAndSanitizeSVG(text);
        const before = deepClone(this.doc.rootGroup);
        this.doc.canvas.width = width;
        this.doc.canvas.height = height;
        const importedLayer = createVectorLayer(`読込: ${file.name}`, objects);
        this.doc.rootGroup.children.push(importedLayer);
        this.activeLayerId = importedLayer.id;
        this.commands.execute(createLayerTreeCommand(before, this.doc.rootGroup, `SVG「${file.name}」を読み込み`), true);
        this.syncToolbarCollapseToActiveLayer();
        this.zoomToFit();
        let msg = `SVGを読み込みました (${objects.length}要素)`;
        if (sanitizedReport.removedScripts > 0 || sanitizedReport.removedEventAttrs > 0) {
          msg += ` ※危険なタグ/属性を${sanitizedReport.removedScripts + sanitizedReport.removedEventAttrs}件サニタイズ除去しました`;
        }
        this.showToast(msg);
      } else if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = async (ev) => {
          const dataUrl = ev.target.result;
          const before = deepClone(this.doc.rootGroup);
          const ras = createRasterLayer(file.name, this.doc.canvas.width, this.doc.canvas.height, 1);
          await this.rasterStore.loadFromDataURL(ras.assetId, dataUrl, this.doc.canvas.width, this.doc.canvas.height);
          this.doc.rootGroup.children.push(ras);
          this.activeLayerId = ras.id;
          this.commands.execute(createLayerTreeCommand(before, this.doc.rootGroup, `画像「${file.name}」をラスターレイヤーとして追加`), true);
          this.validateActiveToolForLayer();
          this.requestRender();
        };
        reader.readAsDataURL(file);
      }
    } catch (err) {
      this.showToast(`読み込みエラー: ${err.message}`);
    } finally {
      input.value = '';
    }
  }

  downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2500);
  }

  openContextMenu(clientX, clientY) {
    const menu = document.getElementById('canvas-context-menu');
    if (!menu) return;
    menu.style.left = `${Math.min(window.innerWidth - 210, clientX)}px`;
    menu.style.top = `${Math.min(window.innerHeight - 280, clientY)}px`;
    menu.classList.add('open');
  }

  closeContextMenu() {
    const menu = document.getElementById('canvas-context-menu');
    if (menu) menu.classList.remove('open');
  }

  showToast(message) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = message;
    container.appendChild(el);
    setTimeout(() => {
      el.remove();
    }, 3400);
  }

  /**
   * Customizable Keyboard Shortcut Dispatcher (supports Ctrl/Cmd, Shift, Alt combos & Delete/Backspace)
   */
  bindKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      const tag = document.activeElement?.tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      if (document.getElementById('modal-backdrop')?.classList.contains('open')) return;

      if (e.code === 'Space') {
        this.spacePanActive = true;
        this.stageEl.style.cursor = 'grab';
        return;
      }

      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        showShortcutsModal(this);
        return;
      }

      if (e.key === 'Escape') {
        const lightbox = document.getElementById('layer-preview-lightbox');
        if (lightbox && lightbox.classList.contains('open')) {
          lightbox.classList.remove('open');
          return;
        }
        if (this.activePenObject) {
          const activeLayer = this.getActiveLayer();
          this.commitActivePenPath(activeLayer);
        } else {
          this.selectedObjectIds.clear();
          this.measureLine = null;
          this.closeContextMenu();
          this.refreshAllPanels();
          this.requestRender();
        }
        return;
      }

      if (e.key === 'Enter' && this.activePenObject) {
        const activeLayer = this.getActiveLayer();
        this.commitActivePenPath(activeLayer);
        return;
      }

      // Always support Delete and Backspace to delete selected objects
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        this.deleteSelection();
        return;
      }

      // Build normalized key combo string: e.g. 'Ctrl+Z', 'Ctrl+Shift+Z', 'V'
      const parts = [];
      if (e.ctrlKey || e.metaKey) parts.push('Ctrl');
      if (e.shiftKey && e.key.length > 1) parts.push('Shift');
      else if (e.shiftKey && (e.ctrlKey || e.metaKey || e.altKey)) parts.push('Shift');
      if (e.altKey) parts.push('Alt');
      const mainKey = e.key.length === 1 ? e.key.toUpperCase() : e.key;
      if (!['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) {
        parts.push(mainKey);
      }
      const combo = parts.join('+');

      // Match against user-customizable this.keybindings
      for (const [actionKey, boundCombo] of Object.entries(this.keybindings)) {
        if (boundCombo && boundCombo.toUpperCase() === combo.toUpperCase()) {
          e.preventDefault();
          if (actionKey.startsWith('tool:')) {
            this.selectTool(actionKey.slice(5));
          } else if (actionKey === 'action:undo') {
            this.commands.undo();
          } else if (actionKey === 'action:redo') {
            this.commands.redo();
          } else if (actionKey === 'action:delete') {
            this.deleteSelection();
          } else if (actionKey === 'action:duplicate') {
            this.duplicateSelection();
          } else if (actionKey === 'action:swapColors') {
            this.swapMainSubColors();
          } else if (actionKey === 'action:saveWorkspace') {
            this.saveWorkspaceArchive();
          } else if (actionKey === 'action:print') {
            this.printCanvasArtwork();
          } else if (actionKey === 'action:zoomFit') {
            this.zoomToFit();
          }
          return;
        }
      }

      // Fallback Ctrl+Shift+Z for Redo
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        this.commands.redo();
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'Space') {
        this.spacePanActive = false;
        this.stageEl.style.cursor = '';
      }
    });
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const app = new SVGEditorApp();
  window.svgEditorApp = app;
  app.init();
});
