[English](./README.md)

# kakidash

Mindmap Typescript/Javascript Library.

## Concept

**「思考を、ダッシュで書き出す」**

Kakidashのミッションは、**アウトプット速度の最大化**です。

脳内に浮かぶ膨大な思考やアイデアを、ボトルネックなくすべて書き出し切るために。

キーボードショートカットを駆使し、思考のスピードでマインドマップを広げていく体験を提供します。

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
- **インポート/エクスポート**: JSON形式でのデータ保存・読み込み (フォーカス状態も含む)
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
// インスタンス化 (オプション指定可能)
const kakidash = new Kakidash(container, {
    maxNodeWidth: 200, // オプション: ノードの最大幅
    customStyles: {    // オプション: 初期のカスタムスタイル
        rootNode: { border: '2px solid red' }
    }
});

// 必要に応じて初期データをロードしたり、ノードを追加したりします
kakidash.addNode(kakidash.getRootId(), 'Hello World');
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
    const kakidash = new Kakidash(container);
    
    // 動作確認
    // 動作確認
    console.log('Kakidash initialized:', kakidash);
</script>
```

## スタイルのカスタマイズ

`updateGlobalStyles` を使用してカスタムスタイルを定義できます。設定は保存され、テーマが `'custom'` の場合に適用されます。

```javascript
// 1. カスタムスタイルを定義（いつでも実行可能）
// 設定は内部に保存されます
kakidash.updateGlobalStyles({
  // ルートノード（中心）のスタイル
  rootNode: { 
    border: '4px solid gold',
    background: '#ffeeee',
    color: '#333' // フォント色
  },
  
  // 子ノード（枝）のスタイル
  childNode: { 
    border: '2px dashed blue', 
    background: 'white',
    color: '#555' // フォント色
  },
  
  // 接続線の色
  connection: { 
    color: 'orange' 
  },
  
  // マインドマップ全体の背景
  canvas: {
    background: '#fafafa' // 透明にする場合は 'transparent'
  }
});

// 2. カスタムテーマを有効化してスタイルを反映
kakidash.setTheme('custom');
```

### 指定可能なプロパティ一覧

すべての値は標準的なCSSの文字列として指定可能です。

| オブジェクト | プロパティ | 説明 | 例 |
| --- | --- | --- | --- |
| `rootNode`, `childNode` | `border` | 枠線の指定 | `'2px solid red'`, `'none'` |
| | `background` | 背景色 | `'#ffffff'`, `'rgba(0,0,0,0.5)'`, `'transparent'` |
| | `color` | 文字色 | `'#333'`, `'black'` |
| `connection` | `color` | 接続線の色 | `'#ccc'`, `'orange'` |
| `canvas` | `background` | キャンバス全体の背景 | `'#f0f0f0'`, `'transparent'` |

## API Reference

### Methods

- **`new Kakidash(container: HTMLElement, options?: KakidashOptions)`**: インスタンスを生成します。
  - `options.shortcuts`: キーボードショートカットのカスタマイズ。
  - `options.maxNodeWidth`: テキストノードの最大幅 (ピクセル)。
  - `options.customStyles`: 初期のカスタムスタイル。
- **`kakidash.addNode(parentId, topic)`**: 指定した親ノードに新しい子ノードを追加します。
- **`kakidash.getData()`**: 現在のマインドマップデータをJSONオブジェクトとして取得します。
- **`kakidash.loadData(data)`**: JSONデータを読み込み、マインドマップを描画します。
- **`kakidash.updateGlobalStyles(styles)`**: グローバルスタイルを更新します ('custom' テーマ選択時のみ有効)。
- **`kakidash.updateLayout(mode)`**: レイアウトモードを変更します ('Standard', 'Left', 'Right')。
- **`kakidash.setReadOnly(boolean)`**: 読み取り専用モードを切り替えます。
- **`kakidash.setMaxNodeWidth(width: number)`**: テキストノードの最大幅を設定します（-1で無制限）。
- **`kakidash.getMaxNodeWidth()`**: 現在の最大ノード幅を取得します。
- **`kakidash.undo()`**: 変更を元に戻します。
- **`kakidash.redo()`**: 元に戻した変更をやり直します。
- **`kakidash.toggleFold(nodeId)`**: ノードの折り畳み/展開を切り替えます。
- **`kakidash.getSelectedNodeId()`**: 現在選択されているノードのIDを取得します。
- **`kakidash.on(event, listener)`**: イベントリスナーを登録します。
- **`kakidash.off(event, listener)`**: イベントリスナーを削除します。

### Events

| Event Name | Payload | Description |
| --- | --- | --- |
| `node:select` | `string \| null` | ノードが選択されたときに発火します。 |
| `node:add` | `{ id: string; topic: string }` | 新しいノードが追加されたときに発火します。 |
| `node:remove` | `string` | ノードが削除されたときに発火します。 |
| `node:update` | `{ id: string; topic: string }` | ノードが更新されたときに発火します。 |
| `node:move` | `{ nodeId: string; newParentId: string; position?: string }` | ノードが移動されたときに発火します。 |
| `model:load` | `MindMapData` | データがロードされたときに発火します。 |
| `model:change` | `void` | データモデルが変更されたときに発火します。 |

```typescript
kakidash.on('node:select', (nodeId) => {
  console.log('Selected:', nodeId);
});
```

## Configuration

### Custom Shortcuts

コンストラクタのオプションでキーボードショートカットをカスタマイズできます。

```typescript
const kakidash = new Kakidash(container, {
  shortcuts: {
    // 'addChild' を Ctrl+N に変更する例
    addChild: [{ key: 'n', ctrlKey: true }],
  }
});
```

### Default Shortcuts Configuration (JSON)

以下はデフォルト設定の全量です。必要なキーのみを部分的に上書きできます。

```json
{
  "navUp": [
    { "key": "ArrowUp" },
    { "key": "k" }
  ],
  "navDown": [
    { "key": "ArrowDown" },
    { "key": "j" }
  ],
  "navLeft": [
    { "key": "ArrowLeft" },
    { "key": "h" }
  ],
  "navRight": [
    { "key": "ArrowRight" },
    { "key": "l" }
  ],
  "addChild": [{ "key": "Tab" }],
  "insertParent": [{ "key": "Tab", "shiftKey": true }],
  "addSibling": [{ "key": "Enter" }],
  "addSiblingBefore": [{ "key": "Enter", "shiftKey": true }],
  "deleteNode": [
    { "key": "Delete" },
    { "key": "Backspace" }
  ],
  "beginEdit": [
    { "key": "F2" },
    { "key": " " }
  ],
  "copy": [
    { "key": "c", "ctrlKey": true },
    { "key": "c", "metaKey": true }
  ],
  "paste": [
    { "key": "v", "ctrlKey": true },
    { "key": "v", "metaKey": true }
  ],
  "cut": [
    { "key": "x", "ctrlKey": true },
    { "key": "x", "metaKey": true }
  ],
  "undo": [
    { "key": "z", "ctrlKey": true },
    { "key": "z", "metaKey": true }
  ],
  "redo": [
    { "key": "Z", "ctrlKey": true, "shiftKey": true },
    { "key": "Z", "metaKey": true, "shiftKey": true },
    { "key": "y", "ctrlKey": true },
    { "key": "y", "metaKey": true }
  ],
  "bold": [{ "key": "b" }],
  "italic": [{ "key": "i" }],
  "zoomIn": [
    { "key": "+" },
    { "key": "=" }
  ],
  "zoomOut": [{ "key": "-" }],
  "toggleFold": [{ "key": "f" }],
  "selectColor1": [{ "key": "1" }],
  "selectColor2": [{ "key": "2" }],
  "selectColor3": [{ "key": "3" }],
  "selectColor4": [{ "key": "4" }],
  "selectColor5": [{ "key": "5" }],
  "selectColor6": [{ "key": "6" }],
  "selectColor7": [{ "key": "7" }]
}
```

## Shortcuts

### General
| Key | Description |
| --- | --- |
| `Arrow Keys` | ノード間の移動 |
| `h` / `j` / `k` / `l` | ノード間の移動 (Vim風) |
| `F2` / `DblClick` / `Space` | ノードの編集を開始 (画像の場合はズーム) |
| `Enter` | 兄弟ノードを追加 (下) |
| `Shift + Enter` | 兄弟ノードを追加 (上) |
| `Tab` | 子ノードを追加 |
| `Shift + Tab` | 親ノードを挿入 |
| `Delete` / `Backspace` | ノードを削除 |
| `Ctrl/Cmd + z` | 元に戻す (Undo) |
| `Ctrl/Cmd + Shift + z` / `Ctrl + y` | やり直し (Redo) |
| `Ctrl/Cmd + C` | コピー |
| `Ctrl/Cmd + X` | 切り取り |
| `Ctrl/Cmd + V` | 貼り付け (画像も可) |
| `Drag` (Canvas) | 画面のパン (移動) |
| `Wheel` | 上下スクロール (パン) |
| `Shift + Wheel` | 左右スクロール (パン) |
| `Ctrl/Cmd + Wheel` | ズームイン/アウト |
| Click `+/-` / `f` | ノードの展開/折り畳み |

### Editing (Text Input)
| Key | Description |
| --- | --- |
| `Enter` | 編集を確定 |
| `Shift + Enter` | 改行 |
| `Esc` | 編集をキャンセル |

### Styling (Since selection)
| Key | Description |
| --- | --- |
| `b` | 太字 (Bold) 切り替え |
| `i` | 斜体 (Italic) 切り替え |
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

### Documentation

TypeDocを使用してAPIドキュメントを生成します:

```bash
npm run docs
```

`docs/` ディレクトリにドキュメントが生成されます。
