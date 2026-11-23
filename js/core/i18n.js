/**
 * Bilingual i18n dictionary & reactive translator (Japanese / English)
 * Strictly avoids writing to localStorage unless user has granted Cookie/Storage consent.
 */

import { hasStorageConsent } from './storage.js';

export const DICT = {
  ja: {
    'app.title': 'SVG EDITOR Studio',
    'menu.file': 'ファイル (File)',
    'menu.edit': '編集 (Edit)',
    'menu.canvas': 'キャンバス (Canvas)',
    'menu.layer': 'レイヤー (Layer)',
    'menu.view': '表示 (View)',
    'menu.help': 'ヘルプ (Help)',
    'menu.new': '新規作成...',
    'menu.open': '開く (.svg / .svgew)...',
    'menu.saveWorkspace': 'ワークスペース保存 (.svgew)',
    'menu.exportSvg': 'SVGクイック保存',
    'menu.exportPng': 'PNGクイック保存',
    'menu.customExport': 'カスタム書き出し...',
    'menu.print': '印刷 (Print)...',
    'menu.canvasSize': 'キャンバスサイズ・解像度変更...',
    'menu.rasterize': '選択ベクターをラスター化 (複製)',
    'menu.shortcuts': 'ショートカット & キーバインド設定',
    'menu.tips': '使い方 & TIPS ガイドを開く',
    'menu.about': 'About SVG EDITOR',
    'tool.disabled.needVector': 'このツールはベクターレイヤー専用です。レイヤーパネルでベクターレイヤーを選択または新規作成してください。',
    'tool.disabled.needRaster': 'このツールはラスターレイヤー専用です。レイヤーパネルでラスターレイヤーを選択または新規作成してください。',
    'tool.disabled.locked': '選択中のレイヤーはロックまたは非表示のため描画できません。',
    'tool.disabled.group': 'グループフォルダに直接描画することはできません。内部のベクターまたはラスターレイヤーを選択してください。',
    'panel.navigator': 'ナビゲーター',
    'panel.color': 'カラー & スウォッチ',
    'panel.layers': 'レイヤー',
    'panel.properties': 'プロパティ & 変形',
    'panel.history': 'ヒストリー (履歴)',
    'layer.addVector': '+ ベクター',
    'layer.addRaster': '+ ラスター',
    'layer.addGroup': '+ グループ',
    'layer.rasterize': 'ラスター化(複製)',
    'layer.mergeDown': '下のレイヤーと結合',
    'layer.duplicate': '複製',
    'layer.delete': '削除',
    'status.ready': '準備完了',
    'status.saved': '自動保存済み',
    'status.noConsent': '未保存 (Cookie未同意)',
    'status.unsaved': '編集あり',
    'gamut.warning': '色域外警告: 現在のドキュメント設定 (CMYK / Grayscale) で再現できない鮮やかな色です'
  },
  en: {
    'app.title': 'SVG EDITOR Studio',
    'menu.file': 'File',
    'menu.edit': 'Edit',
    'menu.canvas': 'Canvas',
    'menu.layer': 'Layer',
    'menu.view': 'View',
    'menu.help': 'Help',
    'menu.new': 'New Document...',
    'menu.open': 'Open (.svg / .svgew)...',
    'menu.saveWorkspace': 'Save Workspace (.svgew)',
    'menu.exportSvg': 'Quick Export SVG',
    'menu.exportPng': 'Quick Export PNG',
    'menu.customExport': 'Custom Export...',
    'menu.print': 'Print Canvas...',
    'menu.canvasSize': 'Resize Canvas...',
    'menu.rasterize': 'Rasterize Vector Layer (Copy)',
    'menu.shortcuts': 'Shortcuts & Keybindings',
    'menu.tips': 'Usage & TIPS Guide',
    'menu.about': 'About SVG EDITOR',
    'tool.disabled.needVector': 'Vector tool only: Please select or create a Vector Layer in the Layers panel.',
    'tool.disabled.needRaster': 'Raster tool only: Please select or create a Raster Layer in the Layers panel.',
    'tool.disabled.locked': 'Active layer is locked or hidden.',
    'tool.disabled.group': 'Cannot draw directly on a Group Folder. Select a Vector or Raster layer inside.',
    'panel.navigator': 'Navigator',
    'panel.color': 'Color & Swatches',
    'panel.layers': 'Layers',
    'panel.properties': 'Properties & Transform',
    'panel.history': 'History',
    'layer.addVector': '+ Vector',
    'layer.addRaster': '+ Raster',
    'layer.addGroup': '+ Group',
    'layer.rasterize': 'Rasterize (Copy)',
    'layer.mergeDown': 'Merge Down',
    'layer.duplicate': 'Duplicate',
    'layer.delete': 'Delete',
    'status.ready': 'Ready',
    'status.saved': 'Auto-saved',
    'status.noConsent': 'Session Only (No Cookie Consent)',
    'status.unsaved': 'Modified',
    'gamut.warning': 'Out of Gamut: Color exceeds target CMYK/Grayscale gamut.'
  }
};

let currentLang = 'ja';
try {
  if (hasStorageConsent() && typeof localStorage !== 'undefined') {
    currentLang = localStorage.getItem('svge_lang') || 'ja';
  }
} catch {}

export function getLang() {
  return currentLang;
}

export function setLang(lang) {
  currentLang = lang === 'en' ? 'en' : 'ja';
  if (hasStorageConsent()) {
    try { localStorage.setItem('svge_lang', currentLang); } catch {}
  }
}

export function t(key, fallback = '') {
  return (DICT[currentLang] && DICT[currentLang][key]) || (DICT.ja[key]) || fallback || key;
}
