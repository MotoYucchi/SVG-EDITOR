# Need Icons — MotoVJ NT

追加で必要なアイコンSVG一覧です。既存アイコンと同じ 30×30px / viewBox="0 0 200 200" / stroke white スタイルで統一してください。

## 現在使用中のアイコン ✅

| ファイル名 | 使用箇所 |
|---|---|
| `close-button.svg` | ウィンドウ閉じるボタン、グループ削除、レイヤー削除 |
| `minimize-button.svg` | ウィンドウ最小化 |
| `maximize-button.svg` | ウィンドウ最大化 |
| `caret-button.svg` | グループ折り畳み (rotate 180deg)、レイヤー折り畳み (rotate 90deg)、レイヤー上下移動 |
| `setting.svg` | ツールバーの設定ボタン |

## 未使用 (将来利用可能)

| ファイル名 | 想定用途 |
|---|---|
| `hamburger-menu.svg` | メニュー展開 |
| `Kebab-menu.svg` | コンテキストメニュー |
| `dot-indicator.svg` | ステータスインジケーター |
| `layout-sidebar-left.svg` | サイドバーレイアウト切替 |
| `layout-sidebar-right.svg` | サイドバーレイアウト切替 |

---

## 🔴 必要なアイコン (New)

### 高優先度 — ツールバー

| アイコン名 | 説明 | 使用箇所 |
|---|---|---|
| `deck.svg` | デッキ/ミキサーアイコン (🎛 の代替) | ツールバー Deck A / B ボタン |
| `palette.svg` | パレット/ブラシアイコン (🎨 の代替) | ツールバー Effects ボタン |
| `microphone.svg` | マイク/波形アイコン (🎙 の代替) | ツールバー Audio ボタン |
| `music-note.svg` | 音符アイコン (🎵 の代替) | ツールバー Genre ボタン |
| `eye.svg` | 目/プレビューアイコン (👁 の代替) | ツールバー Preview ボタン |
| `sync.svg` or `refresh.svg` | 回転矢印/同期アイコン (🔄 の代替) | ツールバー Sync ボタン |

### 高優先度 — デッキ操作

| アイコン名 | 説明 | 使用箇所 |
|---|---|---|
| `plus.svg` | プラスアイコン (+ の代替) | Group追加、Layer追加ボタン |
| `save.svg` or `floppy.svg` | 保存アイコン (💾 の代替) | プリセット保存ボタン |

### 中優先度 — トランジション

| アイコン名 | 説明 | 使用箇所 |
|---|---|---|
| `transition.svg` | 左右矢印/トランジションアイコン (⇄ の代替) | トランジション実行ボタン |

### 低優先度 — ステータス/装飾

| アイコン名 | 説明 | 使用箇所 |
|---|---|---|
| `link.svg` | 接続/リンクアイコン | WebSocket接続状態表示 |
| `wave.svg` | 波形アイコン | オーディオ状態表示 |
| `grid.svg` | グリッドアイコン | エフェクト一覧のグリッド/リスト切替 (将来用) |
| `list.svg` | リストアイコン | エフェクト一覧のグリッド/リスト切替 (将来用) |
| `copy.svg` | コピーアイコン | プリセット複製 (将来用) |
| `trash.svg` | ゴミ箱アイコン | close-buttonと使い分け、完全削除用 (将来用) |
| `drag-handle.svg` | ドラッグハンドルアイコン (≡ 的な3本線) | レイヤー並べ替え用ドラッグハンドル (将来用) |

---

## スタイルガイドライン

- **サイズ**: 30×30px (width/height), viewBox `0 0 200 200`
- **カラー**: `stroke="white"` または `fill="white"` — CSSで `filter` を使って色調整するため
- **ストローク幅**: `stroke-width="10%"` (既存と統一)
- **角丸**: 必要に応じて `rx` で丸みをつける
- **XML宣言**: `<?xml version="1.0" encoding="UTF-8"?>` を含める
