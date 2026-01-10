[日本語](./README.ja.md)

# kakidash

Mindmap Typescript / Javascript Library.

## Concept

**"Dash through your thoughts"**

Kakidash's mission is to **maximize output speed**.
It is designed to capture every fleeing thought and vast idea without bottlenecks.
Master the shortcuts and expand your mind map at the speed of thought.

## Features

- **Mindmap Creation**: Add nodes, manipulate siblings and child nodes.
- **Layouts**: Standard (Standard/Both), Left aligned (Left), Right aligned (Right).
- **Styling**:
  - Font size adjustment.
  - Bold (`Bold`), Italic (`Italic`).
  - Color changes via palette (Style Editor).
- **Interaction**:
  - Drag and drop for node movement and reordering.
  - Keyboard shortcuts for rapid operation.
  - Zoom, Pan (Screen navigation).
- **Image Support**: Paste images from the clipboard.
- **Import/Export**: Save and load data in JSON format.
- **For Developers**:
  - TypeScript support.
  - Read-only mode.
  - Event system.

## Installation

```bash
npm install kakidash
```

## Usage
### 1. HTML Preparation

Prepare a container element (e.g., `div`) to display `kakidash`.
**Important**: You MUST specify `width` and `height` for the container via CSS.

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Kakidash Demo</title>
    <style>
        /* Container size is required */
        #mindmap-container {
            width: 100vw;
            height: 100vh;
            border: 1px solid #ccc;
            margin: 0;
            padding: 0;
            overflow: hidden; /* Prevent scrolling within container */
        }
        body { margin: 0; }
    </style>
</head>
<body>
    <div id="mindmap-container"></div>
    <!-- Script Injection Here -->
</body>
</html>
```

### 2. Loading and Initialization

#### A. NPM Project (Vite / Webpack etc.)

```bash
npm install kakidash
```

```typescript
import { Kakidash } from 'kakidash';

// Get container
const container = document.getElementById('mindmap-container');

// Instantiate
const board = new Kakidash(container);

// Add initial data or nodes if needed
board.addNode(board.getRootId(), 'Hello World');
```

#### B. Browser Direct Import (Script Tag / CDN)

Use the built `umd` file. The library will be exposed under the global variable `window.kakidash`.

```html
<!-- Load local built file -->
<script src="./dist/kakidash.umd.js"></script>

<!-- Or via CDN (e.g. unpkg) once published -->
<!-- <script src="https://unpkg.com/kakidash/dist/kakidash.umd.js"></script> -->

<script>
    // In UMD build, classes are exported under window.kakidash object
    const { Kakidash } = window.kakidash;

    // Initialize
    const container = document.getElementById('mindmap-container');
    const board = new Kakidash(container);
    
    console.log('Kakidash initialized:', board);
</script>
```

## API Reference

### Methods

- **`new Kakidash(container: HTMLElement)`**: Creates a new instance.
- **`board.addNode(parentId, topic)`**: Adds a new child node to the specified parent node.
- **`board.getData()`**: Retrieves current mindmap data as a JSON object.
- **`board.loadData(data)`**: Loads JSON data and renders the mindmap.
- **`board.updateLayout(mode)`**: Changes layout mode ('Standard', 'Left', 'Right').
- **`board.setReadOnly(boolean)`**: Toggles read-only mode.

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
| `Arrow Keys` | Navigate between nodes |
| `h` / `j` / `k` / `l` | Navigate between nodes (Vim-style) |
| `F2` / `DblClick` | Start editing node |
| `Enter` | Add sibling node (below) |
| `Shift + Enter` | Add sibling node (above) |
| `Tab` | Add child node |
| `Shift + Tab` | Insert parent node |
| `Delete` / `Backspace` | Delete node |
| `Ctrl/Cmd + Z` | Undo |
| `Ctrl/Cmd + C` | Copy |
| `Ctrl/Cmd + X` | Cut |
| `Ctrl/Cmd + V` | Paste (Images supported) |
| `Drag` (Canvas) | Pan screen |
| `Wheel` | Vertical scroll (Pan) |
| `Shift + Wheel` | Horizontal scroll (Pan) |
| `Ctrl/Cmd + Wheel` | Zoom in/out |

### Editing (Text Input)
| Key | Description |
| --- | --- |
| `Enter` | Confirm edit |
| `Shift + Enter` | New line |
| `Esc` | Cancel edit |

### Styling (Since selection)
| Key | Description |
| --- | --- |
| `Ctrl/Cmd + B` | Toggle Bold |
| `Ctrl/Cmd + I` | Toggle Italic |
| `+` | Increase font size |
| `-` | Decrease font size |
| `1` - `7` | Change node color (Palette order) |

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
