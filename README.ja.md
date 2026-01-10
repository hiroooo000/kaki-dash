[English](./README.md)

# kakidash

Mindmap Javascript Library.

## Concept

**「思考を、ダッシュで書き出す」**

Kakidashのミッションは、**アウトプット速度の最大化**です。
脳内に浮かぶ膨大な思考やアイデアを、ボトルネックなくすべて書き出し切るために。
キーボードショートカットを駆使し、思考のスピードでマップを広げていく体験を提供します。

## Features

- **マインドマップ作成**: ノードの追加、兄弟ノード、子ノードの操作
- **レイアウト**: 標準 (Standard/Both)、左揃え (Left)、右揃え (Right)
- **スタイリング**:
  - フォントサイズ変更
  - 太字 (Bold)、斜体 (Italic)
  - カラーパレットによる色変更 (Style Editor)
- **インタラクション**:
  - ドラッグ＆ドロップによるノード移動・並び替え
  - キーボードショートカットによる高速操作
  - ズーム、パン (画面移動)
- **画像対応**: クリップボードからの画像貼り付け
- **インポート/エクスポート**: JSON形式でのデータ保存・読み込み
- **開発者向け**:
  - TypeScript対応
  - 読み取り専用 (Read-only) モード
  - イベントシステム

## Installation

```bash
npm install kakidash
```

## Usage

### 1. HTMLの準備

`kakidash` を表示するためのコンテナ要素 (`div` など) を用意します。
**重要**: コンテナには必ず `width` と `height` を CSS で指定してください。

```html
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <title>Kakidash Demo</title>
    <style>
        /* コンテナのサイズ指定は必須です */
        #mindmap-container {
            width: 100vw;
            height: 100vh;
            border: 1px solid #ccc; /* 境界線はお好みで */
            margin: 0;
            padding: 0;
            overflow: hidden; /* コンテナ内でのスクロールを防ぐため */
        }
        body { margin: 0; }
    </style>
</head>
<body>
    <div id="mindmap-container"></div>
    <!-- Script挿入場所 -->
</body>
</html>
```

### 2. ライブラリの読み込みと初期化

#### A. NPM プロジェクト (Vite / Webpack など)

```bash
npm install kakidash
```

```typescript
import { Kakidash } from 'kakidash';

// コンテナ取得
const container = document.getElementById('mindmap-container');

// インスタンス化
const board = new Kakidash(container);

// 必要に応じて初期データをロードしたり、ノードを追加したりします
board.addNode(board.getRootId(), 'Hello World');
```

#### B. ブラウザ直接読み込み (Script Tag / CDN)

ビルド済みの `umd` ファイルを使用します。
グローバル変数 `window.kakidash` にライブラリが格納されます。

```html
<!-- ローカルのビルド済みファイルを読み込む場合 -->
<script src="./dist/kakidash.umd.js"></script>

<!-- または CDN (例: unpkg) 経由 (パッケージ公開後) -->
<!-- <script src="https://unpkg.com/kakidash/dist/kakidash.umd.js"></script> -->

<script>
    // UMDビルドでは window.kakidash オブジェクトの下にクラスがエクスポートされます
    const { Kakidash } = window.kakidash;

    // 初期化
    const container = document.getElementById('mindmap-container');
    const board = new Kakidash(container);
    
    // 動作確認
    console.log('Kakidash initialized:', board);
</script>
```

## API Reference

### Methods

- **`new Kakidash(container: HTMLElement)`**: インスタンスを生成します。
- **`board.addNode(parentId, topic)`**: 指定した親ノードに新しい子ノードを追加します。
- **`board.getData()`**: 現在のマインドマップデータをJSONオブジェクトとして取得します。
- **`board.loadData(data)`**: JSONデータを読み込み、マインドマップを描画します。
- **`board.updateLayout(mode)`**: レイアウトモードを変更します ('Standard', 'Left', 'Right')。
- **`board.setReadOnly(boolean)`**: 読み取り専用モードを切り替えます。

### Events

```typescript
board.on('node:select', (nodeId) => {
  console.log('Selected:', nodeId);
});

board.on('node:add', (payload) => {
  console.log('Added:', payload);
});

board.on('model:change', () => {
  console.log('Data changed');
});
```

## Shortcuts

### General
| Key | Description |
| --- | --- |
| `Arrow Keys` | ノード間の移動 |
| `Space` | ノードの編集を開始 |
| `Enter` | 兄弟ノードを追加 (下) |
| `Shift + Enter` | 兄弟ノードを追加 (上) |
| `Tab` | 子ノードを追加 |
| `Shift + Tab` | 親ノードを挿入 |
| `Delete` / `Backspace` | ノードを削除 |
| `Ctrl/Cmd + Z` | 元に戻す (Undo) |
| `Ctrl/Cmd + C` | コピー |
| `Ctrl/Cmd + X` | 切り取り |
| `Ctrl/Cmd + V` | 貼り付け (画像も可) |
| `Drag` (Canvas) | 画面のパン (移動) |
| `Wheel` | 上下スクロール (パン) |
| `Shift + Wheel` | 左右スクロール (パン) |
| `Ctrl/Cmd + Wheel` | ズームイン/アウト |

### Editing (Text Input)
| Key | Description |
| --- | --- |
| `Enter` | 編集を確定 |
| `Shift + Enter` | 改行 |
| `Esc` | 編集をキャンセル |

### Styling (Since selection)
| Key | Description |
| --- | --- |
| `Ctrl/Cmd + B` | 太字 (Bold) 切り替え |
| `Ctrl/Cmd + I` | 斜体 (Italic) 切り替え |
| `+` | フォントサイズ拡大 |
| `-` | フォントサイズ縮小 |
| `1` - `7` | ノードの色を変更 (パレット順) |

## Development

### Setup

```bash
npm install
```

### Dev Server

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Test

```bash
npm test
```

### Lint

```bash
npm run lint
```
