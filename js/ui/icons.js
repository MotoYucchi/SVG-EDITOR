/**
 * Unified 24x24 SVG Icon Registry for SVG Editor
 * Rules:
 * - Grid: 24x24 (viewBox="0 0 24 24")
 * - Stroke: 1.75px, round cap & join, currentColor
 * - Tracks origin ('reused' for normalized legacy icons vs 'new' for newly created icons)
 */

export const ICON_CATALOG = {
  // ==========================================
  // 1. REUSED & NORMALIZED FROM LEGACY (6 icons)
  // ==========================================
  'layout-sidebar-left': {
    origin: 'reused',
    category: 'UI & Layout',
    labelJa: '左サイドバー切替',
    labelEn: 'Toggle Left Sidebar',
    note: 'Normalized from legacy icons/layout-sidebar-left.svg (200x200 -> 24x24, currentColor)',
    body: `<rect x="3" y="3" width="18" height="18" rx="2.5" stroke="currentColor" stroke-width="1.75" fill="none"/>
           <line x1="9.5" y1="3" x2="9.5" y2="21" stroke="currentColor" stroke-width="1.75"/>
           <rect x="4.5" y="4.5" width="3.5" height="15" rx="1" fill="currentColor" opacity="0.75"/>`
  },
  'layout-sidebar-right': {
    origin: 'reused',
    category: 'UI & Layout',
    labelJa: '右サイドバー切替',
    labelEn: 'Toggle Right Sidebar',
    note: 'Normalized from legacy icons/layout-sidebar-right.svg (200x200 -> 24x24, currentColor)',
    body: `<rect x="3" y="3" width="18" height="18" rx="2.5" stroke="currentColor" stroke-width="1.75" fill="none"/>
           <line x1="14.5" y1="3" x2="14.5" y2="21" stroke="currentColor" stroke-width="1.75"/>
           <rect x="16" y="4.5" width="3.5" height="15" rx="1" fill="currentColor" opacity="0.75"/>`
  },
  'caret-up': {
    origin: 'reused',
    category: 'UI & Layout',
    labelJa: 'キャレット（折りたたみ）',
    labelEn: 'Caret / Collapse',
    note: 'Normalized from legacy icons/caret-button.svg with round linecap & linejoin',
    body: `<path d="M6 15L12 9L18 15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`
  },
  'close': {
    origin: 'reused',
    category: 'UI & Layout',
    labelJa: '閉じる',
    labelEn: 'Close',
    note: 'Normalized from legacy icons/close-button.svg with round linecap',
    body: `<path d="M6 6L18 18M6 18L18 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>`
  },
  'menu': {
    origin: 'reused',
    category: 'UI & Layout',
    labelJa: 'メニュー',
    labelEn: 'Menu',
    note: 'Normalized from legacy icons/hamburger-menu.svg to 24x24 grid padding',
    body: `<path d="M4 6H20M4 12H20M4 18H20" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>`
  },
  'minimize': {
    origin: 'reused',
    category: 'UI & Layout',
    labelJa: '最小化 / マイナス',
    labelEn: 'Minimize / Minus',
    note: 'Normalized from legacy icons/minimize-button.svg to 24x24 grid',
    body: `<path d="M5 12H19" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>`
  },

  // ==========================================
  // 2. NEWLY CREATED: REPLACING BROKEN LEGACY (4 icons)
  // ==========================================
  'kebab-menu': {
    origin: 'new',
    category: 'UI & Layout',
    labelJa: '詳細メニュー',
    labelEn: 'More Options',
    note: 'Replaced broken legacy Kebab-menu.svg (which had off-center 50%+16% coordinates)',
    body: `<circle cx="12" cy="5" r="1.75" fill="currentColor"/>
           <circle cx="12" cy="12" r="1.75" fill="currentColor"/>
           <circle cx="12" cy="19" r="1.75" fill="currentColor"/>`
  },
  'maximize': {
    origin: 'new',
    category: 'UI & Layout',
    labelJa: '最大化',
    labelEn: 'Maximize',
    note: 'Replaced broken legacy maximize-button.svg (4 unjoined lines -> rounded rect)',
    body: `<rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" stroke-width="1.75" fill="none"/>`
  },
  'settings': {
    origin: 'new',
    category: 'UI & Layout',
    labelJa: '設定',
    labelEn: 'Settings',
    note: 'Replaced broken legacy setting.svg (invalid translate(50%,50%) attribute)',
    body: `<circle cx="12" cy="12" r="3.2" stroke="currentColor" stroke-width="1.75" fill="none"/>
           <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.6.85 1 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`
  },
  'dot-indicator': {
    origin: 'new',
    category: 'UI & Layout',
    labelJa: 'ステータスドット',
    labelEn: 'Status Indicator',
    note: 'Replaced legacy dot-indicator.svg (which was a duplicate of hamburger-menu.svg)',
    body: `<circle cx="12" cy="12" r="5" fill="currentColor"/>
           <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.75" fill="none" opacity="0.4"/>`
  },

  // ==========================================
  // 3. COMMON TOOLS (7 icons)
  // ==========================================
  'tool-select': {
    origin: 'new',
    category: 'Common Tools',
    labelJa: '選択・移動ツール (V)',
    labelEn: 'Select & Move Tool (V)',
    note: 'Primary cursor arrow for selecting and transforming objects',
    body: `<path d="M5 3L19 12L12 13.5L9 20L5 3Z" stroke="currentColor" stroke-width="1.75" stroke-linejoin="round" fill="none"/>`
  },
  'tool-node': {
    origin: 'new',
    category: 'Common Tools',
    labelJa: 'ノード編集ツール (A)',
    labelEn: 'Node / Direct Select (A)',
    note: 'Direct node & bezier handle manipulation cursor',
    body: `<path d="M4 4L11 19L13.5 13.5L19 11L4 4Z" stroke="currentColor" stroke-width="1.75" stroke-linejoin="round" fill="none"/>
           <rect x="16" y="16" width="4.5" height="4.5" rx="0.8" stroke="currentColor" stroke-width="1.75" fill="none"/>`
  },
  'tool-lasso': {
    origin: 'new',
    category: 'Common Tools',
    labelJa: '投げ縄選択ツール (L)',
    labelEn: 'Lasso Select (L)',
    note: 'Freeform lasso selection loop',
    body: `<path d="M7 17C3.5 14.5 3 9 7 6C11 3 18 4 19.5 9C21 14 16 18 11 17.5" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-dasharray="3 2.5" fill="none"/>
           <circle cx="8" cy="18.5" r="2" stroke="currentColor" stroke-width="1.75" fill="none"/>`
  },
  'tool-pan': {
    origin: 'new',
    category: 'Common Tools',
    labelJa: '手のひらツール (H / Space)',
    labelEn: 'Pan / Hand Tool (H)',
    note: 'Hand icon for canvas panning',
    body: `<path d="M18 11V6.5a1.5 1.5 0 0 0-3 0V10m0-5a1.5 1.5 0 0 0-3 0v5m0-4.5a1.5 1.5 0 0 0-3 0V12m0 0-1.6-1.6a1.6 1.6 0 0 0-2.3 2.2L8.5 18A5 5 0 0 0 13 20.5h1a5 5 0 0 0 5-5V11a1.5 1.5 0 0 0-3 0" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`
  },
  'tool-zoom': {
    origin: 'new',
    category: 'Common Tools',
    labelJa: 'ズームツール (Z)',
    labelEn: 'Zoom Tool (Z)',
    note: 'Magnifying glass with plus sign',
    body: `<circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" stroke-width="1.75" fill="none"/>
           <path d="M15.5 15.5L20.5 20.5M10.5 8V13M8 10.5H13" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" fill="none"/>`
  },
  'tool-eyedropper': {
    origin: 'new',
    category: 'Common Tools',
    labelJa: 'スポイトツール (I)',
    labelEn: 'Eyedropper Tool (I)',
    note: 'Color picker pipette',
    body: `<path d="M14.5 5.5L18.5 9.5M4 20L8.5 19L19.2 8.3a2.1 2.1 0 0 0-3-3L5.5 16L4 20Z" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`
  },
  'tool-measure': {
    origin: 'new',
    category: 'Common Tools',
    labelJa: '定規計測ツール (M)',
    labelEn: 'Ruler Measure Tool (M)',
    note: 'Diagonal ruler with tick marks',
    body: `<path d="M21.3 8.7L8.7 21.3a1 1 0 0 1-1.4 0l-4.6-4.6a1 1 0 0 1 0-1.4L15.3 2.7a1 1 0 0 1 1.4 0l4.6 4.6a1 1 0 0 1 0 1.4z" stroke="currentColor" stroke-width="1.75" stroke-linejoin="round" fill="none"/>
           <path d="M12.5 5.5L14.5 7.5M9.5 8.5L12 11M6.5 11.5L8.5 13.5" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/>`
  },

  // ==========================================
  // 4. VECTOR TOOLS & SHAPES (16 icons)
  // ==========================================
  'tool-pen': {
    origin: 'new',
    category: 'Vector Tools',
    labelJa: 'ベジェペンツール (P)',
    labelEn: 'Bezier Pen Tool (P)',
    note: 'Fountain pen nib with anchor point',
    body: `<path d="M12 19L19 12L22 15L15 22L12 19Z" stroke="currentColor" stroke-width="1.75" stroke-linejoin="round" fill="none"/>
           <path d="M18 13L16.5 5.5L2 2L5.5 16.5L13 18L18 13Z" stroke="currentColor" stroke-width="1.75" stroke-linejoin="round" fill="none"/>
           <path d="M2 2L9.5 9.5" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/>
           <circle cx="11" cy="11" r="2" stroke="currentColor" stroke-width="1.75" fill="none"/>`
  },
  'tool-freehand': {
    origin: 'new',
    category: 'Vector Tools',
    labelJa: 'フリーハンドパス (N)',
    labelEn: 'Freehand Pencil Path (N)',
    note: 'Pencil with smooth vector curve',
    body: `<path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" stroke="currentColor" stroke-width="1.75" stroke-linejoin="round" fill="none"/>
           <path d="M12 21c3 0 4-2 6-2s2 1.5 4 1" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" fill="none"/>`
  },
  'tool-vector-brush': {
    origin: 'new',
    category: 'Vector Tools',
    labelJa: 'ベクターブラシ (B)',
    labelEn: 'Pressure Vector Brush (B)',
    note: 'Brush tip with variable-width vector curve',
    body: `<path d="M18.4 3.6a2.1 2.1 0 0 1 3 3L12 16l-4 1 1-4 9.4-9.4z" stroke="currentColor" stroke-width="1.75" stroke-linejoin="round" fill="none"/>
           <path d="M4 20c1.5-2.5 4-3 6-1.5 1.8 1.3 4.5 2.5 9 1" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" fill="none"/>`
  },
  'tool-vector-eraser': {
    origin: 'new',
    category: 'Vector Tools',
    labelJa: 'ベクター消しゴム',
    labelEn: 'Vector Path Eraser',
    note: 'Eraser splitting a vector spline',
    body: `<path d="M20 20H7L3 16C2.2 15.2 2.2 13.8 3 13L13 3C13.8 2.2 15.2 2.2 16 3L21 8C21.8 8.8 21.8 10.2 21 11L12 20" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
           <path d="M8.5 8.5L15.5 15.5" stroke="currentColor" stroke-width="1.75"/>`
  },
  'tool-text': {
    origin: 'new',
    category: 'Vector Tools',
    labelJa: 'テキストツール (T)',
    labelEn: 'Text Tool (T)',
    note: 'Typography serif T icon',
    body: `<path d="M4 6V4H20V6M9 20H15M12 4V20" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`
  },
  'shape-rect': {
    origin: 'new',
    category: 'Vector Shapes',
    labelJa: '矩形ツール (U)',
    labelEn: 'Rectangle (U)',
    note: 'Sharp rectangle primitive',
    body: `<rect x="3.5" y="5" width="17" height="14" stroke="currentColor" stroke-width="1.75" fill="none"/>`
  },
  'shape-rounded-rect': {
    origin: 'new',
    category: 'Vector Shapes',
    labelJa: '角丸矩形ツール',
    labelEn: 'Rounded Rectangle',
    note: 'Rounded corner rectangle primitive',
    body: `<rect x="3.5" y="5" width="17" height="14" rx="4" stroke="currentColor" stroke-width="1.75" fill="none"/>`
  },
  'shape-ellipse': {
    origin: 'new',
    category: 'Vector Shapes',
    labelJa: '楕円 / 円ツール (O)',
    labelEn: 'Ellipse / Circle (O)',
    note: 'Ellipse / circle primitive',
    body: `<ellipse cx="12" cy="12" rx="8.5" ry="7.5" stroke="currentColor" stroke-width="1.75" fill="none"/>`
  },
  'shape-polygon': {
    origin: 'new',
    category: 'Vector Shapes',
    labelJa: '多角形ツール',
    labelEn: 'Polygon',
    note: 'Hexagon polygon primitive',
    body: `<polygon points="12 3 20 7.5 20 16.5 12 21 4 16.5 4 7.5" stroke="currentColor" stroke-width="1.75" stroke-linejoin="round" fill="none"/>`
  },
  'shape-star': {
    origin: 'new',
    category: 'Vector Shapes',
    labelJa: '星形ツール',
    labelEn: 'Star',
    note: '5-point star primitive',
    body: `<polygon points="12 2.5 14.9 8.5 21.5 9.4 16.7 14 17.9 20.5 12 17.4 6.1 20.5 7.3 14 2.5 9.4 9.1 8.5" stroke="currentColor" stroke-width="1.75" stroke-linejoin="round" fill="none"/>`
  },
  'shape-line': {
    origin: 'new',
    category: 'Vector Shapes',
    labelJa: '直線ツール',
    labelEn: 'Line Segment',
    note: 'Line segment with end nodes',
    body: `<line x1="5" y1="19" x2="19" y2="5" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/>
           <circle cx="5" cy="19" r="2" stroke="currentColor" stroke-width="1.5" fill="none"/>
           <circle cx="19" cy="5" r="2" stroke="currentColor" stroke-width="1.5" fill="none"/>`
  },
  'shape-arrow': {
    origin: 'new',
    category: 'Vector Shapes',
    labelJa: '矢印ツール',
    labelEn: 'Arrow',
    note: 'Directional arrow primitive',
    body: `<path d="M5 19L19 5M19 5H10M19 5V14" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`
  },
  'shape-arc': {
    origin: 'new',
    category: 'Vector Shapes',
    labelJa: '円弧 / 扇形ツール',
    labelEn: 'Arc / Pie',
    note: 'Circular arc segment',
    body: `<path d="M4 18A14 14 0 0 1 18 4L18 18Z" stroke="currentColor" stroke-width="1.75" stroke-linejoin="round" fill="none"/>`
  },
  'shape-spiral': {
    origin: 'new',
    category: 'Vector Shapes',
    labelJa: 'スパイラル（渦巻き）',
    labelEn: 'Spiral',
    note: 'Archimedean spiral primitive',
    body: `<path d="M12 12c0-1.5 1.5-2.5 3-1.5 2 1.2 2 4 0 5.5-2.5 2-6.5 1.2-8-1.5-2-3.5-.8-8 3-10 4.5-2.3 10.2-.3 12 4.5" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" fill="none"/>`
  },
  'shape-callout': {
    origin: 'new',
    category: 'Vector Shapes',
    labelJa: '吹き出しツール',
    labelEn: 'Speech Callout',
    note: 'Speech bubble with adjustable tail',
    body: `<path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-7l-4.5 4v-4H6a2 2 0 0 1-2-2V6z" stroke="currentColor" stroke-width="1.75" stroke-linejoin="round" fill="none"/>`
  },

  // ==========================================
  // 5. RASTER TOOLS (7 icons)
  // ==========================================
  'raster-pen': {
    origin: 'new',
    category: 'Raster Tools',
    labelJa: 'ラスターペン / Gペン / 鉛筆',
    labelEn: 'Raster Pen / G-Pen / Pencil',
    note: 'Comic G-pen & ink drawing nib',
    body: `<path d="M15.5 3.5L20.5 8.5L8 21H3V16L15.5 3.5Z" stroke="currentColor" stroke-width="1.75" stroke-linejoin="round" fill="none"/>
           <path d="M13 6L18 11" stroke="currentColor" stroke-width="1.75"/>`
  },
  'raster-airbrush': {
    origin: 'new',
    category: 'Raster Tools',
    labelJa: 'エアブラシ / 水彩 / マーカー',
    labelEn: 'Airbrush / Watercolor / Marker',
    note: 'Spray nozzle with soft mist dots',
    body: `<path d="M10 10L19 4L20 5L14 14L10 10Z" stroke="currentColor" stroke-width="1.75" stroke-linejoin="round" fill="none"/>
           <circle cx="5" cy="14" r="1" fill="currentColor"/>
           <circle cx="7" cy="17" r="1.2" fill="currentColor"/>
           <circle cx="4" cy="18" r="1" fill="currentColor"/>
           <circle cx="9" cy="19.5" r="0.9" fill="currentColor"/>`
  },
  'raster-eraser': {
    origin: 'new',
    category: 'Raster Tools',
    labelJa: 'ラスター消しゴム (E)',
    labelEn: 'Raster Eraser (E)',
    note: 'Block eraser icon',
    body: `<path d="M18 19H8L3.5 14.5a2.1 2.1 0 0 1 0-3l8-8a2.1 2.1 0 0 1 3 0l6 6a2.1 2.1 0 0 1 0 3L13 20" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
           <path d="M7.5 10.5L13.5 16.5" stroke="currentColor" stroke-width="1.75"/>`
  },
  'raster-bucket': {
    origin: 'new',
    category: 'Raster Tools',
    labelJa: '塗りつぶしバケツ (G)',
    labelEn: 'Flood Fill Bucket (G)',
    note: 'Paint bucket with falling droplet',
    body: `<path d="M19 11L11 3L3.5 10.5a2 2 0 0 0 0 2.8l5.2 5.2a2 2 0 0 0 2.8 0L19 11Z" stroke="currentColor" stroke-width="1.75" stroke-linejoin="round" fill="none"/>
           <path d="M5 12H17" stroke="currentColor" stroke-width="1.75"/>
           <path d="M20 15.5c1.2 1.5 1.8 2.5 1.8 3.3a1.8 1.8 0 1 1-3.6 0c0-.8.6-1.8 1.8-3.3z" fill="currentColor"/>`
  },
  'raster-gradient': {
    origin: 'new',
    category: 'Raster Tools',
    labelJa: 'グラデーションツール',
    labelEn: 'Gradient Tool',
    note: 'Gradient transition square with control line',
    body: `<rect x="3.5" y="4.5" width="17" height="15" rx="2" stroke="currentColor" stroke-width="1.75" fill="none"/>
           <line x1="8" y1="4.5" x2="8" y2="19.5" stroke="currentColor" stroke-width="1.75" opacity="0.75"/>
           <line x1="12.5" y1="4.5" x2="12.5" y2="19.5" stroke="currentColor" stroke-width="1.5" opacity="0.45"/>
           <line x1="16.5" y1="4.5" x2="16.5" y2="19.5" stroke="currentColor" stroke-width="1" opacity="0.25"/>`
  },
  'raster-blur': {
    origin: 'new',
    category: 'Raster Tools',
    labelJa: 'ぼかし / 指先ツール',
    labelEn: 'Blur / Smudge Tool',
    note: 'Water droplet for soft blur & smudge',
    body: `<path d="M12 3C12 3 5.5 10.2 5.5 14.8a6.5 6.5 0 0 0 13 0C18.5 10.2 12 3 12 3Z" stroke="currentColor" stroke-width="1.75" stroke-linejoin="round" fill="none"/>
           <path d="M9.5 15.5a3 3 0 0 0 3 2.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/>`
  },
  'raster-stamp': {
    origin: 'new',
    category: 'Raster Tools',
    labelJa: 'スタンプツール (S)',
    labelEn: 'Clone / Pattern Stamp (S)',
    note: 'Rubber stamp icon',
    body: `<path d="M5 19H19M4 16H20V14C20 12.9 19.1 12 18 12H6C4.9 12 4 12.9 4 14V16ZM10 12V8.5C10 7.5 8.5 6.8 8.5 5C8.5 3.3 10 2 12 2C14 2 15.5 3.3 15.5 5C15.5 6.8 14 7.5 14 8.5V12" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`
  },

  // ==========================================
  // 6. PATH BOOLEAN & TRANSFORM (12 icons)
  // ==========================================
  'bool-union': {
    origin: 'new',
    category: 'Path Operations',
    labelJa: '合体 (Union)',
    labelEn: 'Boolean Union',
    note: 'Combine two overlapping shapes',
    body: `<path d="M4 4H15V9H20V20H9V15H4V4Z" stroke="currentColor" stroke-width="1.75" stroke-linejoin="round" fill="none"/>`
  },
  'bool-subtract': {
    origin: 'new',
    category: 'Path Operations',
    labelJa: '型抜き (Subtract)',
    labelEn: 'Boolean Subtract',
    note: 'Subtract front shape from back shape',
    body: `<path d="M4 4H15V9H9V15H4V4Z" stroke="currentColor" stroke-width="1.75" stroke-linejoin="round" fill="currentColor" fill-opacity="0.25"/>
           <rect x="9" y="9" width="11" height="11" stroke="currentColor" stroke-width="1.75" stroke-dasharray="2.5 2" fill="none"/>`
  },
  'bool-intersect': {
    origin: 'new',
    category: 'Path Operations',
    labelJa: '交差 (Intersect)',
    labelEn: 'Boolean Intersect',
    note: 'Keep only overlapping region',
    body: `<rect x="4" y="4" width="11" height="11" stroke="currentColor" stroke-width="1.5" stroke-dasharray="2.5 2" fill="none"/>
           <rect x="9" y="9" width="11" height="11" stroke="currentColor" stroke-width="1.5" stroke-dasharray="2.5 2" fill="none"/>
           <rect x="9" y="9" width="6" height="6" stroke="currentColor" stroke-width="1.75" fill="currentColor" fill-opacity="0.5"/>`
  },
  'bool-exclude': {
    origin: 'new',
    category: 'Path Operations',
    labelJa: '除外 (Exclude)',
    labelEn: 'Boolean Exclude (XOR)',
    note: 'Exclude overlapping middle region',
    body: `<rect x="4" y="4" width="11" height="11" stroke="currentColor" stroke-width="1.75" fill="currentColor" fill-opacity="0.25"/>
           <rect x="9" y="9" width="11" height="11" stroke="currentColor" stroke-width="1.75" fill="currentColor" fill-opacity="0.25"/>
           <rect x="9" y="9" width="6" height="6" stroke="currentColor" stroke-width="1.75" fill="var(--bg-panel, #222)"/>`
  },
  'align-left': {
    origin: 'new',
    category: 'Alignment & Transform',
    labelJa: '左揃え',
    labelEn: 'Align Left',
    note: 'Align objects to left edge',
    body: `<line x1="4" y1="3" x2="4" y2="21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
           <rect x="7" y="6" width="13" height="4" rx="1" fill="currentColor"/>
           <rect x="7" y="14" width="8" height="4" rx="1" fill="currentColor"/>`
  },
  'align-center-h': {
    origin: 'new',
    category: 'Alignment & Transform',
    labelJa: '水平中央揃え',
    labelEn: 'Align Horizontal Center',
    note: 'Align objects to horizontal center',
    body: `<line x1="12" y1="3" x2="12" y2="21" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/>
           <rect x="5" y="6" width="14" height="4" rx="1" fill="currentColor"/>
           <rect x="8" y="14" width="8" height="4" rx="1" fill="currentColor"/>`
  },
  'align-right': {
    origin: 'new',
    category: 'Alignment & Transform',
    labelJa: '右揃え',
    labelEn: 'Align Right',
    note: 'Align objects to right edge',
    body: `<line x1="20" y1="3" x2="20" y2="21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
           <rect x="4" y="6" width="13" height="4" rx="1" fill="currentColor"/>
           <rect x="9" y="14" width="8" height="4" rx="1" fill="currentColor"/>`
  },
  'align-top': {
    origin: 'new',
    category: 'Alignment & Transform',
    labelJa: '上揃え',
    labelEn: 'Align Top',
    note: 'Align objects to top edge',
    body: `<line x1="3" y1="4" x2="21" y2="4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
           <rect x="6" y="7" width="4" height="13" rx="1" fill="currentColor"/>
           <rect x="14" y="7" width="4" height="8" rx="1" fill="currentColor"/>`
  },
  'align-center-v': {
    origin: 'new',
    category: 'Alignment & Transform',
    labelJa: '垂直中央揃え',
    labelEn: 'Align Vertical Middle',
    note: 'Align objects to vertical middle',
    body: `<line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/>
           <rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor"/>
           <rect x="14" y="8" width="4" height="8" rx="1" fill="currentColor"/>`
  },
  'align-bottom': {
    origin: 'new',
    category: 'Alignment & Transform',
    labelJa: '下揃え',
    labelEn: 'Align Bottom',
    note: 'Align objects to bottom edge',
    body: `<line x1="3" y1="20" x2="21" y2="20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
           <rect x="6" y="4" width="4" height="13" rx="1" fill="currentColor"/>
           <rect x="14" y="9" width="4" height="8" rx="1" fill="currentColor"/>`
  },
  'flip-h': {
    origin: 'new',
    category: 'Alignment & Transform',
    labelJa: '左右反転',
    labelEn: 'Flip Horizontal',
    note: 'Mirror horizontally across vertical axis',
    body: `<line x1="12" y1="3" x2="12" y2="21" stroke="currentColor" stroke-width="1.75" stroke-dasharray="2.5 2"/>
           <polygon points="9 7 3 17 9 17" stroke="currentColor" stroke-width="1.75" stroke-linejoin="round" fill="none"/>
           <polygon points="15 7 21 17 15 17" stroke="currentColor" stroke-width="1.75" stroke-linejoin="round" fill="currentColor" fill-opacity="0.35"/>`
  },
  'flip-v': {
    origin: 'new',
    category: 'Alignment & Transform',
    labelJa: '上下反転',
    labelEn: 'Flip Vertical',
    note: 'Mirror vertically across horizontal axis',
    body: `<line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" stroke-width="1.75" stroke-dasharray="2.5 2"/>
           <polygon points="7 9 17 3 17 9" stroke="currentColor" stroke-width="1.75" stroke-linejoin="round" fill="none"/>
           <polygon points="7 15 17 21 17 15" stroke="currentColor" stroke-width="1.75" stroke-linejoin="round" fill="currentColor" fill-opacity="0.35"/>`
  },

  // ==========================================
  // 7. LAYERS, FILE & HISTORY ACTIONS (16 icons)
  // ==========================================
  'layer-vector': {
    origin: 'new',
    category: 'Layers & Document',
    labelJa: 'ベクターレイヤー',
    labelEn: 'Vector Layer',
    note: 'Bezier curve with control handles badge',
    body: `<path d="M4 18C4 10 10 6 20 6" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" fill="none"/>
           <rect x="8.5" y="7.5" width="4" height="4" rx="0.8" stroke="currentColor" stroke-width="1.75" fill="var(--bg-panel, #222)"/>
           <line x1="4" y1="9.5" x2="8.5" y2="9.5" stroke="currentColor" stroke-width="1.5"/>
           <line x1="12.5" y1="9.5" x2="17" y2="9.5" stroke="currentColor" stroke-width="1.5"/>
           <circle cx="4" cy="9.5" r="1.5" fill="currentColor"/>
           <circle cx="17" cy="9.5" r="1.5" fill="currentColor"/>`
  },
  'layer-raster': {
    origin: 'new',
    category: 'Layers & Document',
    labelJa: 'ラスターレイヤー',
    labelEn: 'Raster Pixel Layer',
    note: 'Pixel checkerboard grid icon',
    body: `<rect x="3.5" y="3.5" width="17" height="17" rx="2" stroke="currentColor" stroke-width="1.75" fill="none"/>
           <rect x="6" y="6" width="4" height="4" fill="currentColor"/>
           <rect x="14" y="6" width="4" height="4" fill="currentColor"/>
           <rect x="10" y="10" width="4" height="4" fill="currentColor"/>
           <rect x="6" y="14" width="4" height="4" fill="currentColor"/>
           <rect x="14" y="14" width="4" height="4" fill="currentColor"/>`
  },
  'layer-group': {
    origin: 'new',
    category: 'Layers & Document',
    labelJa: 'グループフォルダ',
    labelEn: 'Layer Group Folder',
    note: 'Folder icon for grouping vector & raster layers',
    body: `<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" stroke="currentColor" stroke-width="1.75" stroke-linejoin="round" fill="none"/>`
  },
  'eye-open': {
    origin: 'new',
    category: 'Layers & Document',
    labelJa: '表示中',
    labelEn: 'Visible',
    note: 'Layer visibility on',
    body: `<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z" stroke="currentColor" stroke-width="1.75" stroke-linejoin="round" fill="none"/>
           <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.75" fill="none"/>`
  },
  'eye-closed': {
    origin: 'new',
    category: 'Layers & Document',
    labelJa: '非表示',
    labelEn: 'Hidden',
    note: 'Layer visibility off',
    body: `<path d="M17.9 17.9A10.1 10.1 0 0 1 12 19c-6.4 0-10-7-10-7a18.5 18.5 0 0 1 5.1-5.9M9.9 5.2A9.1 9.1 0 0 1 12 5c6.4 0 10 7 10 7a18.5 18.5 0 0 1-2.2 3.2M3 3l18 18" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`
  },
  'lock-closed': {
    origin: 'new',
    category: 'Layers & Document',
    labelJa: 'ロック中',
    labelEn: 'Locked',
    note: 'Layer locked state',
    body: `<rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" stroke-width="1.75" fill="none"/>
           <path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" fill="none"/>`
  },
  'lock-open': {
    origin: 'new',
    category: 'Layers & Document',
    labelJa: 'ロック解除',
    labelEn: 'Unlocked',
    note: 'Layer unlocked state',
    body: `<rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" stroke-width="1.75" fill="none"/>
           <path d="M8 11V7a4 4 0 0 1 7.5-1.8" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" fill="none"/>`
  },
  'clipping-mask': {
    origin: 'new',
    category: 'Layers & Document',
    labelJa: '下のレイヤーでクリッピング',
    labelEn: 'Clipping Mask',
    note: 'Down-left arrow with layer square for clipping',
    body: `<path d="M9 5V15H15M9 15L6 12M9 15L12 12" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
           <rect x="13" y="4" width="7" height="7" rx="1" stroke="currentColor" stroke-width="1.75" fill="none"/>`
  },
  'rasterize': {
    origin: 'new',
    category: 'Layers & Document',
    labelJa: 'ベクターをラスター化（複製変換）',
    labelEn: 'Rasterize Vector Layer',
    note: 'Vector curve converting into pixel grid',
    body: `<path d="M3 16C3 9 7 5 14 5" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" fill="none"/>
           <path d="M13 13H21V21H13V13Z" stroke="currentColor" stroke-width="1.75" fill="none"/>
           <rect x="15" y="15" width="2" height="2" fill="currentColor"/>
           <rect x="17" y="17" width="2" height="2" fill="currentColor"/>`
  },
  'undo': {
    origin: 'new',
    category: 'History & File',
    labelJa: '元に戻す (Ctrl+Z)',
    labelEn: 'Undo (Ctrl+Z)',
    note: 'Counter-clockwise undo arrow',
    body: `<path d="M4 9H14a5 5 0 0 1 0 10H9M4 9L8 5M4 9L8 13" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`
  },
  'redo': {
    origin: 'new',
    category: 'History & File',
    labelJa: 'やり直す (Ctrl+Y)',
    labelEn: 'Redo (Ctrl+Y)',
    note: 'Clockwise redo arrow',
    body: `<path d="M20 9H10a5 5 0 0 0 0 10h5M20 9L16 5M20 9L16 13" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`
  },
  'plus': {
    origin: 'new',
    category: 'History & File',
    labelJa: '追加 / 新規',
    labelEn: 'Add / New',
    note: 'Plus cross icon',
    body: `<path d="M12 5V19M5 12H19" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>`
  },
  'trash': {
    origin: 'new',
    category: 'History & File',
    labelJa: '削除',
    labelEn: 'Delete',
    note: 'Trash bin icon',
    body: `<path d="M4 7H20M10 11V17M14 11V17M6 7L7 19a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`
  },
  'duplicate': {
    origin: 'new',
    category: 'History & File',
    labelJa: '複製',
    labelEn: 'Duplicate',
    note: 'Overlapping cards icon',
    body: `<rect x="9" y="9" width="11" height="11" rx="2" stroke="currentColor" stroke-width="1.75" fill="none"/>
           <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" fill="none"/>`
  },
  'download': {
    origin: 'new',
    category: 'History & File',
    labelJa: '保存 / 書き出し',
    labelEn: 'Save / Export',
    note: 'Export arrow into tray',
    body: `<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`
  },
  'upload': {
    origin: 'new',
    category: 'History & File',
    labelJa: '開く / 読み込み',
    labelEn: 'Open / Import',
    note: 'Import arrow from tray',
    body: `<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`
  },
  'rotate-reset': {
    origin: 'new',
    category: 'History & File',
    labelJa: '回転リセット',
    labelEn: 'Reset Canvas Rotation',
    note: 'Reset canvas rotation to 0 deg',
    body: `<path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`
  },
  'theme-toggle': {
    origin: 'new',
    category: 'UI & Layout',
    labelJa: 'テーマ切替 (ダーク/ライト)',
    labelEn: 'Toggle Theme (Dark/Light)',
    note: 'Sun and crescent moon icon',
    body: `<path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z" stroke="currentColor" stroke-width="1.75" stroke-linejoin="round" fill="none"/>`
  },
  'help': {
    origin: 'new',
    category: 'UI & Layout',
    labelJa: 'ショートカット・ヘルプ (?)',
    labelEn: 'Shortcuts & Help (?)',
    note: 'Question mark circle',
    body: `<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.75" fill="none"/>
           <path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 1.8-2.5 2.2-2.5 4M12 17h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>`
  }
};

/**
 * Returns an inline <svg> markup string for the requested icon ID.
 * @param {string} name - Icon key in ICON_CATALOG
 * @param {number} [size=20] - Pixel width/height
 * @param {string} [className=''] - Extra CSS class
 * @returns {string}
 */
export function renderIcon(name, size = 20, className = '') {
  const entry = ICON_CATALOG[name];
  if (!entry) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" class="svg-icon ${className}" aria-hidden="true"><circle cx="12" cy="12" r="4" stroke="currentColor" fill="none"/></svg>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" class="svg-icon ${className}" aria-hidden="true">${entry.body}</svg>`;
}
