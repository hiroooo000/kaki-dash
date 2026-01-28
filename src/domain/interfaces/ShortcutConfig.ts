export interface KeyBinding {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
}

export type ShortcutAction =
  | 'navUp'
  | 'navDown'
  | 'navLeft'
  | 'navRight'
  | 'addChild'
  | 'insertParent'
  | 'addSibling'
  | 'addSiblingBefore'
  | 'deleteNode'
  | 'beginEdit' // F2, etc
  | 'copy'
  | 'paste'
  | 'cut'
  | 'undo'
  | 'redo'
  | 'bold'
  | 'italic'
  | 'zoomIn'
  | 'zoomOut'
  | 'scaleUp'
  | 'scaleDown'
  | 'resetZoom'
  | 'toggleFold'
  | 'centerMap'
  | 'selectColor1'
  | 'selectColor2'
  | 'selectColor3'
  | 'selectColor4'
  | 'selectColor5'
  | 'selectColor6'
  | 'selectColor7'
  | 'openCommandPalette';

export type ShortcutConfig = Partial<Record<ShortcutAction, KeyBinding[]>>;

export const DEFAULT_SHORTCUTS: ShortcutConfig = {
  navUp: [{ key: 'ArrowUp' }, { key: 'k', ctrlKey: false, metaKey: false, altKey: false }],
  navDown: [{ key: 'ArrowDown' }, { key: 'j', ctrlKey: false, metaKey: false, altKey: false }],
  navLeft: [{ key: 'ArrowLeft' }, { key: 'h', ctrlKey: false, metaKey: false, altKey: false }],
  navRight: [{ key: 'ArrowRight' }, { key: 'l', ctrlKey: false, metaKey: false, altKey: false }],
  addChild: [{ key: 'Tab' }, { key: 'a' }],
  insertParent: [
    { key: 'Tab', shiftKey: true },
    { key: 'a', shiftKey: true },
  ],
  addSibling: [{ key: 'Enter' }],
  addSiblingBefore: [{ key: 'Enter', shiftKey: true }],
  deleteNode: [{ key: 'Delete' }, { key: 'Backspace' }],
  beginEdit: [{ key: 'F2' }, { key: ' ' }],
  copy: [
    { key: 'c', ctrlKey: true },
    { key: 'c', metaKey: true },
  ],
  paste: [
    { key: 'v', ctrlKey: true },
    { key: 'v', metaKey: true },
  ],
  cut: [
    { key: 'x', ctrlKey: true },
    { key: 'x', metaKey: true },
  ],
  undo: [
    { key: 'z', ctrlKey: true },
    { key: 'z', metaKey: true },
  ],
  redo: [
    { key: 'Z', ctrlKey: true, shiftKey: true },
    { key: 'Z', metaKey: true, shiftKey: true },
    { key: 'y', ctrlKey: true },
    { key: 'y', metaKey: true },
  ],
  bold: [{ key: 'b' }], // Changed to just 'b' in previous task, keeping it? Or should it be Ctrl+b? Previous code was just 'b'
  italic: [{ key: 'i' }], // Previous code was just 'i'
  zoomIn: [{ key: '>', shiftKey: true }, { key: '.' }], // > is Shift+.
  zoomOut: [{ key: '<', shiftKey: true }, { key: ',' }], // < is Shift+,
  scaleUp: [{ key: '[' }], // Canvas Zoom In
  scaleDown: [{ key: ']' }], // Canvas Zoom Out
  resetZoom: [{ key: ':' }],
  toggleFold: [{ key: 'f', ctrlKey: false, metaKey: false, altKey: false }],
  selectColor1: [{ key: '1' }],
  selectColor2: [{ key: '2' }],
  selectColor3: [{ key: '3' }],
  selectColor4: [{ key: '4' }],
  selectColor5: [{ key: '5' }],
  selectColor6: [{ key: '6' }],
  selectColor7: [{ key: '7' }],
  openCommandPalette: [{ key: 'm' }],
};
