/**
 * Modal Dialog Controllers v2.1:
 * 1. New Document Template Dialog
 * 2. Canvas Resize / Resolution Dialog
 * 3. Custom Export Dialog (SVG/PNG/JPG/WebP/AVIF + Web Worker)
 * 4. Shortcuts & Interactive Guide Dialog (? key)
 * 5. Comprehensive Preferences Dialog (Language, Theme, UI Scale, Handedness, Long-Press Duration,
 *    Keybinding Customizer with Ctrl/Cmd/Shift/Alt assign/delete/reset, Pen Pressure & Tilt Live Calibration Pad, Cookie Consent)
 * 6. About SVG EDITOR Modal (Author: MotoYucchi, Pure HTML/CSS/JS statement, GitHub Repository, TIPS link)
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
import {
  hasStorageConsent,
  setStorageConsent,
  savePreferencesToStorage
} from '../core/storage.js';
import { getLang, setLang, t } from '../core/i18n.js';
import { upgradeCustomSliders } from './custom-Controls.js';

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

  // Upgrade any range sliders inside the modal into bespoke SVG magnetic snap sliders
  upgradeCustomSliders(bodyEl);

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
 * 3. Custom Export Modal
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
          <input type="range" id="ex-quality" data-snap="percent" min="10" max="100" value="92">
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
 * 4. Shortcuts & Interactive Guide Modal (? key)
 */
export function showShortcutsModal(app = null) {
  const kb = app ? app.keybindings : {};
  openModal({
    title: 'ショートカット一覧 & クイックガイド (?)',
    bodyHtml: `
      <div style="background:rgba(59,130,246,0.12); border:1px solid var(--accent); padding:10px 12px; border-radius:6px; font-size:0.84rem; display:flex; justify-content:space-between; align-items:center; gap:10px;">
        <div>
          <strong>💡 操作TIPS & カスタムキーバインド</strong><br>
          ・選択ツール (<code>${kb['tool:select'] || 'V'}</code>) で空白をドラッグすると<strong>矩形範囲（マーキー）選択</strong>ができます。<br>
          ・左ツールバーのアイコンを長押しすると、右ドックに<strong>ツール専用の詳細設定タブ</strong>が開きます。
        </div>
        <a href="./tips.html" target="_blank" rel="noopener" style="text-decoration:none;">
          <button type="button" class="primary" style="white-space:nowrap;">TIPSページを開く ↗</button>
        </a>
      </div>
      <div class="form-grid" style="font-size:0.82rem;">
        <div>
          <h4 style="margin-bottom:6px; color:var(--accent-hover)">ツール切替</h4>
          <div><code>${kb['tool:select'] || 'V'}</code> : 選択・マーキー範囲変形</div>
          <div><code>${kb['tool:node'] || 'A'}</code> : ノード編集ツール</div>
          <div><code>${kb['tool:lasso'] || 'L'}</code> : 投げ縄選択</div>
          <div><code>${kb['tool:pen'] || 'P'}</code> : ベジェペンツール</div>
          <div><code>${kb['tool:freehand'] || 'N'}</code> : フリーハンドパス</div>
          <div><code>${kb['tool:vector-brush'] || 'B'}</code> : 筆圧ベクターブラシ</div>
          <div><code>${kb['tool:shape-rect'] || 'U'}</code> : 矩形・基本図形</div>
          <div><code>${kb['tool:shape-ellipse'] || 'O'}</code> : 楕円ツール</div>
          <div><code>${kb['tool:text'] || 'T'}</code> : テキスト (縦書き・IME対応)</div>
          <div><code>${kb['tool:raster-eraser'] || 'E'}</code> : ラスター消しゴム</div>
          <div><code>${kb['tool:raster-bucket'] || 'G'}</code> : バケツ塗りつぶし</div>
          <div><code>${kb['tool:eyedropper'] || 'I'}</code> : スポイト</div>
          <div><code>${kb['tool:pan'] || 'H'}</code> / <code>Space</code> : 手のひらパン</div>
        </div>
        <div>
          <h4 style="margin-bottom:6px; color:var(--accent-hover)">編集・表示・タッチ操作</h4>
          <div><code>${kb['action:undo'] || 'Ctrl+Z'}</code> : 元に戻す (Undo)</div>
          <div><code>${kb['action:redo'] || 'Ctrl+Y'}</code> : やり直す (Redo)</div>
          <div><code>${kb['action:delete'] || 'Delete'}</code> : 選択オブジェクトを削除</div>
          <div><code>${kb['action:duplicate'] || 'Ctrl+D'}</code> : 選択オブジェクトを複製</div>
          <div><code>${kb['action:swapColors'] || 'X'}</code> : メイン/サブカラー切替</div>
          <div><code>${kb['action:print'] || 'Ctrl+P'}</code> : キャンバスを印刷 (Print)</div>
          <div><code>2本指ピンチ/回転</code> : ズーム & キャンバス回転</div>
          <div><code>2本指タップ / 3本指タップ</code> : Undo / Redo</div>
        </div>
      </div>
    `,
    footerHtml: `
      ${app ? `<button type="button" id="sc-edit-kb">キーバインドをカスタマイズ (Preference)...</button>` : ''}
      <button type="button" id="sc-close" class="primary">閉じる</button>
    `,
    onMount(body, footer, close) {
      const editBtn = footer.querySelector('#sc-edit-kb');
      if (editBtn && app) {
        editBtn.onclick = () => {
          close();
          showPreferencesModal(app, 'keybinds');
        };
      }
      footer.querySelector('#sc-close').onclick = close;
    }
  });
}

/**
 * 5. Comprehensive Preferences Modal (⚙️)
 * Tabs:
 * - General (Language, Theme, UI Scale, Left/Right Handedness, Toolbar Long-Press Secs, Cookie Consent)
 * - Keybindings (Full Keyboard Shortcut Editor with Ctrl/Cmd/Shift/Alt recording, delete, reset)
 * - Pen Tablet (Pressure & Tilt Detection, Gamma Curve, Deadzone, Stabilizer + Live Pen Test Canvas)
 */
export function showPreferencesModal(app, initialTab = 'general') {
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
  const currentLang = getLang();

  openModal({
    title: '環境設定 (Preferences — 言語・テーマ・キーバインド・液タブ筆圧/傾き)',
    bodyHtml: `
      <div style="display:flex; gap:6px; border-bottom:1px solid var(--border-color); padding-bottom:10px;">
        <button type="button" class="pref-tab-btn active" data-pref-tab="general">基本・UI・ストレージ</button>
        <button type="button" class="pref-tab-btn" data-pref-tab="keybinds">ショートカット / キーバインド</button>
        <button type="button" class="pref-tab-btn" data-pref-tab="tablet">液タブ・板タブ筆圧 / 傾き設定</button>
      </div>

      <!-- Tab 1: General & UI -->
      <div id="pref-pane-general" class="pref-pane">
        <div class="form-grid">
          <div class="form-field">
            <label>表示言語 (Language)</label>
            <select id="pref-lang">
              <option value="ja" ${currentLang === 'ja' ? 'selected' : ''}>日本語 (Japanese)</option>
              <option value="en" ${currentLang === 'en' ? 'selected' : ''}>English (英語)</option>
            </select>
          </div>
          <div class="form-field">
            <label>カラーテーマ (Theme)</label>
            <select id="pref-theme">
              <option value="dark" ${currentTheme === 'dark' ? 'selected' : ''}>ダークテーマ (Dark Studio)</option>
              <option value="light" ${currentTheme === 'light' ? 'selected' : ''}>ライトテーマ (Light Studio)</option>
            </select>
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
            <label>利き手レイアウト (片手操作配置)</label>
            <select id="pref-handedness">
              <option value="right" ${app.preferences.handedness === 'right' ? 'selected' : ''}>右利き標準 (左ツール / 右ドック)</option>
              <option value="left" ${app.preferences.handedness === 'left' ? 'selected' : ''}>左利きモード (右ツール / 左ドック)</option>
            </select>
          </div>
          <div class="form-field" style="grid-column: span 2;">
            <label>左ツールバー長押しで右ドック詳細タブを開くまでの時間: <strong id="pref-lp-val">${app.preferences.longPressSeconds ?? 5}秒</strong> (既定: 5秒)</label>
            <input type="range" id="pref-longpress-sec" data-snap="none" min="0.5" max="10" step="0.5" value="${app.preferences.longPressSeconds ?? 5}">
          </div>
          <div class="form-field" style="grid-column: span 2; background:var(--bg-input); border:1px solid var(--border-color); padding:10px; border-radius:6px;">
            <label style="display:flex; align-items:center; justify-content:space-between; color:var(--text-main);">
              <span><strong>Cookie・ローカルストレージへの設定＆ワークスペース自動保持</strong></span>
              <input type="checkbox" id="pref-cookie-consent" ${hasStorageConsent() ? 'checked' : ''}>
            </label>
            <small style="color:var(--text-muted)">OFFにすると保存済みのCookie・localStorage・IndexedDBデータを即座に完全消去し、ブラウザへの保持を一切行いません。</small>
          </div>
        </div>
      </div>

      <!-- Tab 2: Keybindings Customizer -->
      <div id="pref-pane-keybinds" class="pref-pane" style="display:none; flex-direction:column; gap:10px;">
        <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.82rem;">
          <span>割り当てボタンをクリックし、キーボードで新しいキー（<code>Ctrl/Cmd + Shift + Alt + キー</code> 対応）を押してください。</span>
          <button type="button" id="btn-reset-all-kb" style="font-size:0.78rem;">すべて初期値にリセット</button>
        </div>
        <div id="kb-list-container" style="max-height:310px; overflow-y:auto; border:1px solid var(--border-color); border-radius:6px; background:var(--bg-input);"></div>
      </div>

      <!-- Tab 3: Pen Tablet Pressure & Tilt Calibration -->
      <div id="pref-pane-tablet" class="pref-pane" style="display:none; flex-direction:column; gap:12px;">
        <div class="form-grid">
          <div class="form-field">
            <label style="display:flex; align-items:center; gap:6px; color:var(--text-main);">
              <input type="checkbox" id="pref-pen-pressure" ${app.preferences.enablePressure !== false ? 'checked' : ''}> 液タブ・板タブの筆圧検知を有効化
            </label>
            <label style="display:flex; align-items:center; gap:6px; color:var(--text-main); margin-top:4px;">
              <input type="checkbox" id="pref-pen-tilt" ${app.preferences.enableTilt !== false ? 'checked' : ''}> ペンの傾き (Tilt X/Y) 検知を有効化
            </label>
          </div>
          <div class="form-field">
            <label>筆圧カーブ (軟らかめ 0.4 〜 硬め 2.5): <strong id="pref-gamma-val">${app.preferences.pressureGamma}</strong></label>
            <input type="range" id="pref-pressure-gamma" data-snap="none" min="0.4" max="2.5" step="0.1" value="${app.preferences.pressureGamma}">
          </div>
          <div class="form-field">
            <label>最小反応筆圧 (デッドゾーン): <strong id="pref-minp-val">${Math.round((app.preferences.minPressure || 0.05) * 100)}%</strong></label>
            <input type="range" id="pref-min-pressure" data-snap="percent" min="0" max="40" step="1" value="${Math.round((app.preferences.minPressure || 0.05) * 100)}">
          </div>
          <div class="form-field">
            <label>手ブレ補正 (Stabilizer 0〜15): <strong id="pref-stab-val">${app.preferences.stabilizer}</strong></label>
            <input type="range" id="pref-stabilizer" data-snap="none" min="0" max="15" step="1" value="${app.preferences.stabilizer}">
          </div>
        </div>

        <div style="background:var(--bg-input); border:1px solid var(--border-color); border-radius:6px; padding:10px; display:flex; flex-direction:column; gap:6px;">
          <div style="display:flex; justify-content:space-between; font-size:0.8rem;">
            <strong>🖊 筆圧・傾きライブテストパッド (ここで試し描きできます)</strong>
            <span id="tablet-test-readout" style="color:var(--accent-hover); font-family:monospace;">デバイス: -- | 筆圧: 0% | 傾き: (0°, 0°)</span>
          </div>
          <canvas id="tablet-test-canvas" width="580" height="125" style="width:100%; height:125px; background:#111115; border:1px solid var(--border-color); border-radius:4px; touch-action:none; cursor:crosshair;"></canvas>
        </div>
      </div>
    `,
    footerHtml: `
      <button type="button" id="pref-cancel">キャンセル</button>
      <button type="button" id="pref-save" class="primary">設定を適用</button>
    `,
    onMount(body, footer, close) {
      // Tab switching
      const tabs = body.querySelectorAll('.pref-tab-btn');
      const switchTab = (tabId) => {
        tabs.forEach(b => b.classList.toggle('active', b.getAttribute('data-pref-tab') === tabId));
        body.querySelector('#pref-pane-general').style.display = tabId === 'general' ? 'block' : 'none';
        body.querySelector('#pref-pane-keybinds').style.display = tabId === 'keybinds' ? 'flex' : 'none';
        body.querySelector('#pref-pane-tablet').style.display = tabId === 'tablet' ? 'flex' : 'none';
      };
      tabs.forEach(btn => {
        btn.onclick = () => switchTab(btn.getAttribute('data-pref-tab'));
      });
      switchTab(initialTab);

      // Live value labels
      const lpSlider = body.querySelector('#pref-longpress-sec');
      lpSlider.oninput = () => { body.querySelector('#pref-lp-val').textContent = `${lpSlider.value}秒`; };
      const gammaSlider = body.querySelector('#pref-pressure-gamma');
      gammaSlider.oninput = () => { body.querySelector('#pref-gamma-val').textContent = gammaSlider.value; };
      const minpSlider = body.querySelector('#pref-min-pressure');
      minpSlider.oninput = () => { body.querySelector('#pref-minp-val').textContent = `${minpSlider.value}%`; };
      const stabSlider = body.querySelector('#pref-stabilizer');
      stabSlider.oninput = () => { body.querySelector('#pref-stab-val').textContent = stabSlider.value; };

      // Keybindings Editor List
      const kbBox = body.querySelector('#kb-list-container');
      const workingKb = { ...app.keybindings };
      let recordingActionKey = null;

      const renderKbRows = () => {
        const actions = app.getBindableActions();
        kbBox.innerHTML = actions.map(item => {
          const currentCombo = workingKb[item.key] || '';
          const isRec = recordingActionKey === item.key;
          return `
            <div style="display:flex; align-items:center; justify-content:space-between; padding:6px 10px; border-bottom:1px solid var(--border-color); font-size:0.82rem;">
              <span>${item.label}</span>
              <div style="display:flex; gap:5px; align-items:center;">
                <button type="button" class="kb-record-btn ${isRec ? 'primary' : ''}" data-kb-key="${item.key}" style="min-width:110px; font-family:monospace;">
                  ${isRec ? 'キーを入力...' : (currentCombo || '未割当')}
                </button>
                <button type="button" class="kb-clear-btn" data-kb-clear="${item.key}" title="割り当て削除" style="padding:3px 7px; color:var(--danger)">削除</button>
              </div>
            </div>
          `;
        }).join('');

        kbBox.querySelectorAll('.kb-record-btn').forEach(btn => {
          btn.onclick = () => {
            recordingActionKey = btn.getAttribute('data-kb-key');
            renderKbRows();
          };
        });
        kbBox.querySelectorAll('.kb-clear-btn').forEach(btn => {
          btn.onclick = () => {
            const k = btn.getAttribute('data-kb-clear');
            workingKb[k] = '';
            recordingActionKey = null;
            renderKbRows();
          };
        });
      };

      renderKbRows();

      const onKeyRecord = (ev) => {
        if (!recordingActionKey) return;
        ev.preventDefault();
        ev.stopPropagation();
        if (['Control', 'Shift', 'Alt', 'Meta'].includes(ev.key)) return;
        if (ev.key === 'Escape') {
          recordingActionKey = null;
          renderKbRows();
          return;
        }
        const parts = [];
        if (ev.ctrlKey || ev.metaKey) parts.push('Ctrl');
        if (ev.shiftKey) parts.push('Shift');
        if (ev.altKey) parts.push('Alt');
        const mainKey = ev.key.length === 1 ? ev.key.toUpperCase() : ev.key;
        parts.push(mainKey);
        workingKb[recordingActionKey] = parts.join('+');
        recordingActionKey = null;
        renderKbRows();
      };
      window.addEventListener('keydown', onKeyRecord, true);

      body.querySelector('#btn-reset-all-kb').onclick = () => {
        Object.assign(workingKb, app.getDefaultKeybindings());
        recordingActionKey = null;
        renderKbRows();
      };

      // Pen Tablet Live Test Canvas
      const testCanvas = body.querySelector('#tablet-test-canvas');
      const readout = body.querySelector('#tablet-test-readout');
      const tctx = testCanvas.getContext('2d');
      let testDrawing = false;

      testCanvas.addEventListener('pointerdown', (e) => {
        testCanvas.setPointerCapture(e.pointerId);
        testDrawing = true;
      });
      testCanvas.addEventListener('pointermove', (e) => {
        const rect = testCanvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (testCanvas.width / rect.width);
        const y = (e.clientY - rect.top) * (testCanvas.height / rect.height);
        const gamma = Number(gammaSlider.value) || 1.0;
        const rawP = e.pressure > 0 ? e.pressure : 0.5;
        const adjP = Math.pow(rawP, gamma);
        const tx = e.tiltX || 0;
        const ty = e.tiltY || 0;
        readout.textContent = `デバイス: ${e.pointerType} | 筆圧: ${Math.round(adjP * 100)}% | 傾き: (${tx}°, ${ty}°)`;

        if (testDrawing) {
          const r = Math.max(1.5, adjP * 14);
          tctx.fillStyle = '#3b82f6';
          tctx.beginPath();
          tctx.ellipse(x, y, r * (1 + Math.abs(tx) / 90), r, (tx * Math.PI) / 180, 0, Math.PI * 2);
          tctx.fill();
        }
      });
      testCanvas.addEventListener('pointerup', () => { testDrawing = false; });

      footer.querySelector('#pref-cancel').onclick = () => {
        window.removeEventListener('keydown', onKeyRecord, true);
        close();
      };

      footer.querySelector('#pref-save').onclick = () => {
        window.removeEventListener('keydown', onKeyRecord, true);

        const consentChecked = body.querySelector('#pref-cookie-consent').checked;
        setStorageConsent(consentChecked);
        app.updateCookieConsentBanner();

        const nextLang = body.querySelector('#pref-lang').value;
        setLang(nextLang);
        document.querySelectorAll('[data-i18n]').forEach(el => {
          el.textContent = t(el.getAttribute('data-i18n'));
        });

        const nextTheme = body.querySelector('#pref-theme').value;
        document.documentElement.setAttribute('data-theme', nextTheme);

        app.preferences.theme = nextTheme;
        app.preferences.lang = nextLang;
        app.preferences.uiScale = Number(body.querySelector('#pref-uiscale').value) || 1;
        app.preferences.handedness = body.querySelector('#pref-handedness').value;
        app.preferences.longPressSeconds = Number(lpSlider.value) || 5;
        app.preferences.enablePressure = body.querySelector('#pref-pen-pressure').checked;
        app.preferences.enableTilt = body.querySelector('#pref-pen-tilt').checked;
        app.preferences.pressureGamma = Number(gammaSlider.value) || 1.0;
        app.preferences.minPressure = (Number(minpSlider.value) || 5) / 100;
        app.preferences.stabilizer = Number(stabSlider.value) || 4;
        app.keybindings = { ...workingKb };

        document.documentElement.style.setProperty('--ui-scale', String(app.preferences.uiScale));
        document.getElementById('app-shell').setAttribute('data-handedness', app.preferences.handedness);

        if (hasStorageConsent()) {
          savePreferencesToStorage({
            preferences: app.preferences,
            keybindings: app.keybindings
          });
        }

        app.refreshAllPanels();
        app.requestRender();
        app.showToast('環境設定・キーバインドを反映しました');
        close();
      };
    }
  });
}

/**
 * 6. About SVG EDITOR Modal
 */
export function showAboutModal() {
  openModal({
    title: 'About SVG EDITOR POWERED BY MOTOYUCCHI',
    bodyHtml: `
      <div style="display:flex; flex-direction:column; gap:14px; font-size:0.92rem; line-height:1.65;">
        <div style="display:flex; align-items:center; gap:12px;">
          <img src="https://pashatoku.com/favicon.png" width="44" height="44" alt="Logo" draggable="false" style="border-radius:8px;" onerror="this.style.display='none'">
          <div>
            <h3 style="margin:0;">SVG EDITOR POWERED BY MOTOYUCCHI</h3>
            <div style="color:var(--text-muted); font-size:0.84rem;">作者 (Author): <strong>MotoYucchi (もとゆっち / モトユッチ)</strong></div>
          </div>
        </div>

        <div style="background:var(--bg-input); border:1px solid var(--border-color); border-radius:8px; padding:14px;">
          SVG EDITOR POWERED BY MOTOYUCCHI は、ブラウザ上で動作する軽量なベクター画像編集ツールです。フレームワークを使用せず、ピュアなHTML、CSS、JavaScriptで構築されています。
        </div>

        <div style="display:flex; flex-direction:column; gap:8px; font-size:0.86rem;">
          <div>
            <strong>GitHub リポジトリ:</strong><br>
            <a href="https://github.com/MotoYucchi/SVG-EDITOR" target="_blank" rel="noopener" style="color:var(--accent-hover);">https://github.com/MotoYucchi/SVG-EDITOR</a>
          </div>
          <div>
            <strong>使い方・操作方法 TIPS ページ:</strong><br>
            <a href="./tips.html" target="_blank" rel="noopener" style="color:var(--accent-hover);">使い方 & TIPS 完全ガイドを開く (tips.html) ↗</a>
          </div>
        </div>
      </div>
    `,
    footerHtml: `<button type="button" id="about-close" class="primary">閉じる</button>`,
    onMount(body, footer, close) {
      footer.querySelector('#about-close').onclick = close;
    }
  });
}
