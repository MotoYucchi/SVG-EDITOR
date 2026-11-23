/**
 * Modal Dialog Controllers:
 * 1. New Document Template Dialog (Presets, DPI, Units, Orientation, Color Model/Profile, Memory Preview)
 * 2. Canvas Resize / Resolution Dialog (Scale / Expand Margin / Crop)
 * 3. Vector -> Raster Conversion Dialog (DPI Multiplier 1x/2x/4x, Copy vs Replace)
 * 4. Custom Export Dialog (SVG/PNG/JPG/WebP/AVIF, Web Worker Optimization, Live Preview, Size Estimation)
 * 5. Shortcuts & Interactive Guide Dialog (? key)
 * 6. Preferences Dialog (Pen Pressure Curve, Stabilizer, Left-handed mode, UI Scale)
 */

import {
  CANVAS_PRESETS,
  toPixels,
  fromPixels,
  estimateCanvasMemoryMB
} from '../core/document.js';
import {
  serializeDocumentToSVG,
  renderLayerTreeToContext
} from '../core/renderer.js';

export function openModal({ title, bodyHtml, footerHtml, onMount }) {
  const backdrop = document.getElementById('modal-backdrop');
  const titleEl = document.getElementById('modal-title');
  const bodyEl = document.getElementById('modal-body');
  const footerEl = document.getElementById('modal-footer');
  const closeBtn = document.getElementById('modal-close-btn');

  titleEl.textContent = title;
  bodyEl.innerHTML = bodyHtml;
  footerEl.innerHTML = footerHtml || '';
  backdrop.classList.add('open');

  const close = () => backdrop.classList.remove('open');
  closeBtn.onclick = close;
  backdrop.onclick = (e) => {
    if (e.target === backdrop) close();
  };

  if (typeof onMount === 'function') {
    onMount(bodyEl, footerEl, close);
  }
  return close;
}

/**
 * 1. New Document Template Dialog
 */
export function showNewDocumentModal(app) {
  let currentUnit = 'px';
  let currentDpi = 96;
  let currentW = 1920;
  let currentH = 1080;

  const presetOptions = CANVAS_PRESETS.map(p =>
    `<option value="${p.id}">[${p.category}] ${p.name}</option>`
  ).join('');

  openModal({
    title: '新規ドキュメント作成 (テンプレート & カラー設定)',
    bodyHtml: `
      <div class="form-grid">
        <div class="form-field" style="grid-column: span 2;">
          <label>プリセット (Screen / Print ISO A・B / Texture)</label>
          <select id="nd-preset">${presetOptions}</select>
        </div>
        <div class="form-field">
          <label>向き (縦 / 横)</label>
          <div style="display:flex; gap:6px;">
            <button type="button" id="nd-orient-land" class="active" style="flex:1">横 (Landscape)</button>
            <button type="button" id="nd-orient-port" style="flex:1">縦 (Portrait)</button>
          </div>
        </div>
        <div class="form-field">
          <label>幅 (Width)</label>
          <input type="number" id="nd-width" value="1920" min="1" step="any">
        </div>
        <div class="form-field">
          <label>高さ (Height)</label>
          <input type="number" id="nd-height" value="1080" min="1" step="any">
        </div>
        <div class="form-field">
          <label>単位 (Unit)</label>
          <select id="nd-unit">
            <option value="px">px (ピクセル)</option>
            <option value="mm">mm (ミリメートル)</option>
            <option value="cm">cm (センチメートル)</option>
            <option value="inch">inch (インチ)</option>
          </select>
        </div>
        <div class="form-field">
          <label>解像度 (DPI)</label>
          <select id="nd-dpi">
            <option value="72">72 DPI (Web / 画面)</option>
            <option value="96" selected>96 DPI (標準ディスプレイ)</option>
            <option value="150">150 DPI (軽量印刷)</option>
            <option value="300">300 DPI (商業印刷標準)</option>
            <option value="600">600 DPI (モノクロ線画/高精細)</option>
          </select>
        </div>
        <div class="form-field">
          <label>カラーモデル</label>
          <select id="nd-colormodel">
            <option value="RGB">RGB (Web・デジタルイラスト)</option>
            <option value="CMYK">CMYK (印刷用色域プレビュー)</option>
            <option value="Grayscale">Grayscale (グレースケール)</option>
          </select>
        </div>
        <div class="form-field">
          <label>ビット深度 / プロファイル</label>
          <div style="display:flex; gap:4px;">
            <select id="nd-bitdepth" style="width:75px;">
              <option value="8">8-bit</option>
              <option value="16">16-bit</option>
            </select>
            <select id="nd-profile" style="flex:1;">
              <option value="sRGB">sRGB IEC61966-2.1</option>
              <option value="Display P3">Display P3</option>
              <option value="Adobe RGB">Adobe RGB (1998)</option>
            </select>
          </div>
        </div>
        <div class="form-field">
          <label>キャンバス背景</label>
          <div style="display:flex; gap:6px; align-items:center;">
            <select id="nd-bgtype" style="flex:1;">
              <option value="white">白 (White)</option>
              <option value="transparent">透明 (Transparent)</option>
              <option value="solid">任意色 (Custom)</option>
            </select>
            <input type="color" id="nd-bgcolor" value="#ffffff" style="width:32px; height:28px;">
          </div>
        </div>
        <div class="form-field">
          <label>タイトル</label>
          <input type="text" id="nd-title" value="新規イラスト">
        </div>
      </div>

      <div id="nd-color-notice" style="display:none; background:rgba(245,158,11,0.15); border:1px solid var(--warning); color:var(--warning); padding:8px 10px; border-radius:6px; font-size:0.8rem;">
        ※ CMYK / 16-bit / Adobe RGB 設定はドキュメントメタデータおよび色域外警告に反映されます。SVG/Web標準書き出し時には自動的に 8-bit sRGB カラースペースへ近似変換されます。
      </div>

      <div id="nd-preview-stats" style="background:var(--bg-input); border:1px solid var(--border-color); padding:10px 12px; border-radius:6px; font-size:0.84rem; display:flex; justify-content:space-between; flex-wrap:wrap; gap:8px;">
      </div>
    `,
    footerHtml: `
      <button type="button" id="nd-cancel">キャンセル</button>
      <button type="button" id="nd-create" class="primary">キャンバスを作成</button>
    `,
    onMount(body, footer, close) {
      const presetEl = body.querySelector('#nd-preset');
      const wEl = body.querySelector('#nd-width');
      const hEl = body.querySelector('#nd-height');
      const unitEl = body.querySelector('#nd-unit');
      const dpiEl = body.querySelector('#nd-dpi');
      const cmEl = body.querySelector('#nd-colormodel');
      const bdEl = body.querySelector('#nd-bitdepth');
      const pfEl = body.querySelector('#nd-profile');
      const noticeEl = body.querySelector('#nd-color-notice');
      const statsEl = body.querySelector('#nd-preview-stats');
      const btnLand = body.querySelector('#nd-orient-land');
      const btnPort = body.querySelector('#nd-orient-port');

      const updateStats = () => {
        const unit = unitEl.value;
        const dpi = Number(dpiEl.value) || 96;
        const wVal = Number(wEl.value) || 100;
        const hVal = Number(hEl.value) || 100;
        const pxW = toPixels(wVal, unit, dpi);
        const pxH = toPixels(hVal, unit, dpi);
        const mmW = fromPixels(pxW, 'mm', dpi);
        const mmH = fromPixels(pxH, 'mm', dpi);
        const bitDepth = Number(bdEl.value) || 8;
        const memMB = estimateCanvasMemoryMB(pxW, pxH, bitDepth, 4);

        const isLand = pxW >= pxH;
        btnLand.classList.toggle('active', isLand);
        btnPort.classList.toggle('active', !isLand);

        const needNotice = cmEl.value !== 'RGB' || bitDepth === 16 || pfEl.value !== 'sRGB';
        noticeEl.style.display = needNotice ? 'block' : 'none';

        statsEl.innerHTML = `
          <span>ピクセル寸法: <strong>${pxW} × ${pxH} px</strong> (${((pxW * pxH) / 1e6).toFixed(2)} MP)</span>
          <span>実寸サイズ: <strong>${mmW} × ${mmH} mm</strong> (${dpi} DPI)</span>
          <span style="color:${memMB > 350 ? 'var(--warning)' : 'var(--vector-badge)'}">概算メモリ使用量: <strong>~${memMB} MB</strong></span>
        `;
      };

      presetEl.onchange = () => {
        const p = CANVAS_PRESETS.find(item => item.id === presetEl.value);
        if (!p) return;
        currentUnit = p.unit;
        currentDpi = p.dpi;
        currentW = p.width;
        currentH = p.height;
        unitEl.value = p.unit;
        dpiEl.value = String(p.dpi);
        wEl.value = p.width;
        hEl.value = p.height;
        updateStats();
      };

      unitEl.onchange = () => {
        const nextUnit = unitEl.value;
        const dpi = Number(dpiEl.value) || 96;
        const pxW = toPixels(wEl.value, currentUnit, dpi);
        const pxH = toPixels(hEl.value, currentUnit, dpi);
        wEl.value = fromPixels(pxW, nextUnit, dpi);
        hEl.value = fromPixels(pxH, nextUnit, dpi);
        currentUnit = nextUnit;
        updateStats();
      };

      btnLand.onclick = () => {
        const w = Number(wEl.value), h = Number(hEl.value);
        if (h > w) { wEl.value = h; hEl.value = w; }
        updateStats();
      };
      btnPort.onclick = () => {
        const w = Number(wEl.value), h = Number(hEl.value);
        if (w > h) { wEl.value = h; hEl.value = w; }
        updateStats();
      };

      [wEl, hEl, dpiEl, cmEl, bdEl, pfEl].forEach(el => {
        el.addEventListener('input', updateStats);
        el.addEventListener('change', updateStats);
      });

      updateStats();

      footer.querySelector('#nd-cancel').onclick = close;
      footer.querySelector('#nd-create').onclick = () => {
        const dpi = Number(dpiEl.value) || 96;
        const pxW = toPixels(wEl.value, unitEl.value, dpi);
        const pxH = toPixels(hEl.value, unitEl.value, dpi);
        app.createNewDocument({
          title: body.querySelector('#nd-title').value || '新規イラスト',
          width: pxW,
          height: pxH,
          unit: unitEl.value,
          dpi,
          colorModel: cmEl.value,
          bitDepth: Number(bdEl.value) || 8,
          colorProfile: pfEl.value,
          bgType: body.querySelector('#nd-bgtype').value,
          bgColor: body.querySelector('#nd-bgcolor').value,
          withSample: false
        });
        close();
      };
    }
  });
}

/**
 * 2. Canvas Resize / Resolution Modal
 */
export function showCanvasResizeModal(app) {
  const c = app.doc.canvas;
  openModal({
    title: 'キャンバスサイズ・解像度の変更',
    bodyHtml: `
      <div class="form-grid">
        <div class="form-field">
          <label>新しい幅 (px)</label>
          <input type="number" id="cr-width" value="${c.width}" min="16" max="16384">
        </div>
        <div class="form-field">
          <label>新しい高さ (px)</label>
          <input type="number" id="cr-height" value="${c.height}" min="16" max="16384">
        </div>
        <div class="form-field">
          <label>DPI (解像度)</label>
          <input type="number" id="cr-dpi" value="${c.dpi}" min="36" max="1200">
        </div>
        <div class="form-field">
          <label>既存オブジェクト・描画内容の扱い</label>
          <select id="cr-mode">
            <option value="expand">余白追加 / トリミング (実寸維持)</option>
            <option value="scale">キャンバスに合わせて全体を拡縮</option>
          </select>
        </div>
      </div>
    `,
    footerHtml: `
      <button type="button" id="cr-cancel">キャンセル</button>
      <button type="button" id="cr-apply" class="primary">サイズ変更を適用 (Undo可能)</button>
    `,
    onMount(body, footer, close) {
      footer.querySelector('#cr-cancel').onclick = close;
      footer.querySelector('#cr-apply').onclick = () => {
        const nextW = Math.max(16, Number(body.querySelector('#cr-width').value) || c.width);
        const nextH = Math.max(16, Number(body.querySelector('#cr-height').value) || c.height);
        const nextDpi = Math.max(36, Number(body.querySelector('#cr-dpi').value) || c.dpi);
        const mode = body.querySelector('#cr-mode').value;
        app.resizeCanvas(nextW, nextH, nextDpi, mode);
        close();
      };
    }
  });
}

/**
 * 3. Custom Export Modal (SVG / PNG / JPG / WebP / AVIF + Web Worker Optimization & Preview)
 */
export function showCustomExportModal(app) {
  openModal({
    title: 'カスタムエクスポート (プレビュー & Web Worker SVG最適化)',
    bodyHtml: `
      <div class="form-grid">
        <div class="form-field">
          <label>書き出し形式</label>
          <select id="ex-format">
            <option value="svg">SVG (ベクター標準)</option>
            <option value="png">PNG (ロスレス・透過対応)</option>
            <option value="jpeg">JPEG (写真・軽量)</option>
            <option value="webp">WebP (高圧縮Web標準)</option>
            <option value="avif">AVIF (次世代高圧縮)</option>
          </select>
        </div>
        <div class="form-field">
          <label>スケール倍率</label>
          <select id="ex-scale">
            <option value="0.5">0.5x (縮小)</option>
            <option value="1" selected>1x (${app.doc.canvas.width}×${app.doc.canvas.height} px)</option>
            <option value="2">2x (Retina高解像度)</option>
            <option value="4">4x (超高解像度印刷用)</option>
          </select>
        </div>
        <div class="form-field">
          <label>背景・透過設定</label>
          <select id="ex-bg">
            <option value="doc">ドキュメント設定に従う</option>
            <option value="transparent">強制的に背景を透明にする</option>
            <option value="white">白背景で書き出す</option>
          </select>
        </div>
        <div class="form-field">
          <label>画質 (JPG / WebP / AVIF)</label>
          <input type="range" id="ex-quality" min="10" max="100" value="92">
        </div>
        <div class="form-field">
          <label>SVG最適化 & ラスター扱い</label>
          <label style="display:flex; align-items:center; gap:6px; color:var(--text-main);">
            <input type="checkbox" id="ex-opt" checked> 座標丸め・空グループ除去
          </label>
          <label style="display:flex; align-items:center; gap:6px; color:var(--text-main);">
            <input type="checkbox" id="ex-raster" checked> ラスターレイヤーを埋め込む
          </label>
        </div>
        <div class="form-field">
          <label>メタデータ (タイトル / 作者)</label>
          <input type="text" id="ex-title" value="${app.doc.metadata.title}">
        </div>
      </div>

      <div id="ex-warnings" style="display:none; background:rgba(245,158,11,0.15); border:1px solid var(--warning); color:var(--warning); padding:8px; border-radius:6px; font-size:0.78rem;"></div>

      <div style="display:flex; gap:12px; align-items:center; background:var(--bg-input); border:1px solid var(--border-color); padding:10px; border-radius:6px;">
        <canvas id="ex-preview-canvas" width="180" height="120" style="border:1px solid var(--border-color); background:repeating-conic-gradient(#333 0% 25%, #222 0% 50%) 50% / 12px 12px;"></canvas>
        <div style="flex:1; display:flex; flex-direction:column; gap:6px; font-size:0.84rem;">
          <div id="ex-size-estimate">推定ファイルサイズを計算中...</div>
          <div id="ex-worker-status" style="color:var(--text-muted); font-size:0.78rem;">Web Worker 待機中</div>
        </div>
      </div>
    `,
    footerHtml: `
      <button type="button" id="ex-copy-clip">クリップボードにコピー</button>
      <button type="button" id="ex-cancel">閉じる</button>
      <button type="button" id="ex-download" class="primary">書き出して保存</button>
    `,
    onMount(body, footer, close) {
      const formatEl = body.querySelector('#ex-format');
      const scaleEl = body.querySelector('#ex-scale');
      const bgEl = body.querySelector('#ex-bg');
      const optEl = body.querySelector('#ex-opt');
      const rasEl = body.querySelector('#ex-raster');
      const titleEl = body.querySelector('#ex-title');
      const previewCanvas = body.querySelector('#ex-preview-canvas');
      const sizeEl = body.querySelector('#ex-size-estimate');
      const workerStatusEl = body.querySelector('#ex-worker-status');
      const warnEl = body.querySelector('#ex-warnings');

      let latestSvgString = '';

      const refreshPreview = () => {
        const scale = Number(scaleEl.value) || 1;
        const transparentBg = bgEl.value === 'transparent';
        const { svgString, warnings } = serializeDocumentToSVG(app.doc, app.rasterStore, {
          scale,
          transparentBg,
          optimize: optEl.checked,
          includeRaster: rasEl.checked,
          title: titleEl.value
        });
        latestSvgString = svgString;

        if (warnings.length > 0) {
          warnEl.style.display = 'block';
          warnEl.innerHTML = warnings.map(w => `<div>⚠ ${w}</div>`).join('');
        } else {
          warnEl.style.display = 'none';
        }

        // Render thumbnail preview
        const pctx = previewCanvas.getContext('2d');
        pctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
        pctx.save();
        const fitScale = Math.min(previewCanvas.width / app.doc.canvas.width, previewCanvas.height / app.doc.canvas.height);
        pctx.scale(fitScale, fitScale);
        if (!transparentBg && app.doc.canvas.background.type !== 'transparent') {
          pctx.fillStyle = bgEl.value === 'white' ? '#ffffff' : (app.doc.canvas.background.color || '#ffffff');
          pctx.fillRect(0, 0, app.doc.canvas.width, app.doc.canvas.height);
        }
        renderLayerTreeToContext(pctx, app.doc.rootGroup, app.doc, app.rasterStore, app.imageCache);
        pctx.restore();

        // Optimize in background Web Worker if available
        if (app.exportWorker && formatEl.value === 'svg') {
          workerStatusEl.textContent = 'Web WorkerでSVG最適化中...';
          app.exportWorker.onmessage = (ev) => {
            const msg = ev.data || {};
            if (msg.type === 'progress') {
              workerStatusEl.textContent = `${msg.stage} (${msg.percent}%)`;
            } else if (msg.type === 'complete') {
              latestSvgString = msg.result.svgString;
              const kb = (msg.result.byteSize / 1024).toFixed(1);
              sizeEl.innerHTML = `推定サイズ: <strong>${kb} KB</strong> (${formatEl.value.toUpperCase()})`;
              workerStatusEl.textContent = '✓ Web Worker SVG最適化完了';
            }
          };
          app.exportWorker.postMessage({
            type: 'optimize-svg',
            jobId: Date.now(),
            payload: {
              svgString,
              roundNumbers: optEl.checked,
              stripEmptyGroups: optEl.checked,
              minifyWhitespace: optEl.checked
            }
          });
        } else {
          const bytes = new TextEncoder().encode(svgString).byteLength;
          sizeEl.innerHTML = `推定サイズ: <strong>${(bytes / 1024).toFixed(1)} KB</strong> (${formatEl.value.toUpperCase()})`;
          workerStatusEl.textContent = 'プレビュー準備完了';
        }
      };

      [formatEl, scaleEl, bgEl, optEl, rasEl, titleEl].forEach(el => {
        el.addEventListener('change', refreshPreview);
        el.addEventListener('input', refreshPreview);
      });

      refreshPreview();

      footer.querySelector('#ex-cancel').onclick = close;
      footer.querySelector('#ex-copy-clip').onclick = async () => {
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(latestSvgString);
          app.showToast('SVGコードをクリップボードにコピーしました');
        }
      };
      footer.querySelector('#ex-download').onclick = () => {
        const fmt = formatEl.value;
        const scale = Number(scaleEl.value) || 1;
        const transparentBg = bgEl.value === 'transparent';
        if (fmt === 'svg') {
          app.downloadBlob(new Blob([latestSvgString], { type: 'image/svg+xml;charset=utf-8' }), `${titleEl.value || 'artwork'}.svg`);
        } else {
          const quality = (Number(body.querySelector('#ex-quality').value) || 92) / 100;
          app.exportRasterFormat(fmt, scale, quality, transparentBg, titleEl.value || 'artwork');
        }
        close();
      };
    }
  });
}

/**
 * 4. Shortcuts & First-Time Tutorial Modal (? key)
 */
export function showShortcutsModal() {
  openModal({
    title: 'ショートカット一覧 & クイックガイド (?)',
    bodyHtml: `
      <div style="background:rgba(59,130,246,0.12); border:1px solid var(--accent); padding:10px 12px; border-radius:6px; font-size:0.84rem;">
        <strong>💡 お絵かきソフト流の直感操作ガイド</strong><br>
        ・<strong>ベクターレイヤー</strong>では図形・ベジェペン・筆圧ベクターブラシ・テキストを非破壊で描画・変形できます。<br>
        ・<strong>ラスターレイヤー</strong>に切り替えると、Gペン・エアブラシ・水彩・バケツ塗り・ぼかしが使えます。<br>
        ・<strong>スペースキーを押しながらドラッグ</strong>（または2本指タッチ）でキャンバスを自在にパン・回転できます。
      </div>
      <div class="form-grid" style="font-size:0.83rem;">
        <div>
          <h4 style="margin-bottom:6px; color:var(--accent-hover)">ツール切替</h4>
          <div><code>V</code> : 選択・変形ツール</div>
          <div><code>A</code> : ノード編集ツール</div>
          <div><code>L</code> : 投げ縄選択</div>
          <div><code>P</code> : ベジェペンツール</div>
          <div><code>N</code> : フリーハンドパス</div>
          <div><code>B</code> : 筆圧ベクターブラシ / ラスターペン</div>
          <div><code>U</code> : 矩形・基本図形</div>
          <div><code>O</code> : 楕円ツール</div>
          <div><code>T</code> : テキスト (縦書き・IME対応)</div>
          <div><code>E</code> : 消しゴム</div>
          <div><code>G</code> : バケツ塗りつぶし</div>
          <div><code>I</code> : スポイト</div>
          <div><code>H</code> / <code>Space</code> : 手のひらパン</div>
        </div>
        <div>
          <h4 style="margin-bottom:6px; color:var(--accent-hover)">編集・表示・タッチ操作</h4>
          <div><code>Ctrl/Cmd + Z</code> : 元に戻す (Undo)</div>
          <div><code>Ctrl/Cmd + Y</code> : やり直す (Redo)</div>
          <div><code>X</code> : メイン/サブカラー切替</div>
          <div><code>Delete / Backspace</code> : 選択オブジェクト削除</div>
          <div><code>Ctrl/Cmd + D</code> : 選択オブジェクト複製</div>
          <div><code>Shift + ドラッグ</code> : 正方形/正円・比率固定</div>
          <div><code>Alt + ドラッグ</code> : 中心から図形を作成</div>
          <div><code>Esc / Enter</code> : パス描画の確定・キャンセル</div>
          <div><code>2本指ピンチ/回転</code> : ズーム & キャンバス回転</div>
          <div><code>2本指タップ / 3本指タップ</code> : Undo / Redo</div>
        </div>
      </div>
    `,
    footerHtml: `<button type="button" id="sc-close" class="primary">閉じる</button>`,
    onMount(body, footer, close) {
      footer.querySelector('#sc-close').onclick = close;
    }
  });
}

/**
 * 5. Preferences Modal (Pen Pressure Curve, UI Scale, Handedness)
 */
export function showPreferencesModal(app) {
  openModal({
    title: '環境設定 (ペンタブ筆圧・UIスケール・利き手配置)',
    bodyHtml: `
      <div class="form-grid">
        <div class="form-field">
          <label>ペン筆圧カーブ (軟らかめ 0.5 〜 硬め 2.0)</label>
          <input type="range" id="pref-pressure-gamma" min="0.5" max="2.0" step="0.1" value="${app.preferences.pressureGamma}">
        </div>
        <div class="form-field">
          <label>手ブレ補正 (Stabilizer 0〜15)</label>
          <input type="range" id="pref-stabilizer" min="0" max="15" step="1" value="${app.preferences.stabilizer}">
        </div>
        <div class="form-field">
          <label>UIスケール</label>
          <select id="pref-uiscale">
            <option value="0.9" ${app.preferences.uiScale === 0.9 ? 'selected' : ''}>90% (コンパクト)</option>
            <option value="1" ${app.preferences.uiScale === 1 ? 'selected' : ''}>100% (標準)</option>
            <option value="1.15" ${app.preferences.uiScale === 1.15 ? 'selected' : ''}>115% (大きめ・タッチ向け)</option>
          </select>
        </div>
        <div class="form-field">
          <label>利き手レイアウト (片手操作最適化)</label>
          <select id="pref-handedness">
            <option value="right" ${app.preferences.handedness === 'right' ? 'selected' : ''}>右利き標準 (左ツール / 右パネル)</option>
            <option value="left" ${app.preferences.handedness === 'left' ? 'selected' : ''}>左利きモード (右ツール / 左パネル)</option>
          </select>
        </div>
      </div>
    `,
    footerHtml: `<button type="button" id="pref-save" class="primary">設定を適用</button>`,
    onMount(body, footer, close) {
      footer.querySelector('#pref-save').onclick = () => {
        app.preferences.pressureGamma = Number(body.querySelector('#pref-pressure-gamma').value) || 1.0;
        app.preferences.stabilizer = Number(body.querySelector('#pref-stabilizer').value) || 4;
        app.preferences.uiScale = Number(body.querySelector('#pref-uiscale').value) || 1;
        app.preferences.handedness = body.querySelector('#pref-handedness').value;
        document.documentElement.style.setProperty('--ui-scale', String(app.preferences.uiScale));
        document.getElementById('app-shell').setAttribute('data-handedness', app.preferences.handedness);
        app.showToast('環境設定を反映しました');
        close();
      };
    }
  });
}
