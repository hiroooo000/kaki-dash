import {
  ShortcutConfig,
  DEFAULT_SHORTCUTS,
  ShortcutAction,
} from '../../domain/interfaces/ShortcutConfig';
import { NodeEditor } from '../components/NodeEditor';
import { NodeDragger } from './NodeDragger';
import { ShortcutManager } from './ShortcutManager';

import { StyleAction } from './StyleAction';

export type Direction = 'Up' | 'Down' | 'Left' | 'Right';

export interface InteractionOptions {
  onNodeClick: (nodeId: string) => void;
  onAddChild: (parentId: string) => void;
  onAddSibling: (nodeId: string, position: 'before' | 'after') => void;
  onInsertParent?: (nodeId: string) => void;
  onDeleteNode: (nodeId: string) => void;
  onDropNode: (
    draggedId: string,
    targetId: string,
    position: 'top' | 'bottom' | 'left' | 'right',
  ) => void;
  onUpdateNode?: (nodeId: string, topic: string) => void;
  onNavigate?: (nodeId: string, direction: Direction) => void;
  onPan?: (dx: number, dy: number) => void;
  onCopyNode?: (nodeId: string) => void;
  onPasteNode?: (parentId: string) => void;
  onCutNode?: (nodeId: string) => void;
  onPasteImage?: (parentId: string, imageData: string) => void;
  onZoom?: (delta: number, x: number, y: number) => void;
  onZoomReset?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onStyleAction?: (nodeId: string, action: StyleAction) => void;
  onEditEnd?: (nodeId: string) => void;
  onToggleFold?: (nodeId: string) => void;
  onToggleCommandPalette?: () => void;
  shortcuts?: ShortcutConfig;
  allowReadOnly?: boolean;
}

export class InteractionHandler {
  container: HTMLElement;
  options: InteractionOptions;
  maxWidth: number = -1;
  selectedNodeId: string | null = null;

  isPanning: boolean = false;
  lastMouseX: number = 0;
  lastMouseY: number = 0;
  isReadOnly: boolean = false;
  private shortcuts: ShortcutConfig;
  private nodeEditor: NodeEditor;
  private nodeDragger: NodeDragger;
  private shortcutManager: ShortcutManager;

  private cleanupFns: Array<() => void> = [];

  constructor(container: HTMLElement, options: InteractionOptions) {
    this.container = container;
    // Make container focusable to capture keyboard/paste events
    this.container.tabIndex = 0;
    this.container.style.outline = 'none';
    this.container.style.cursor = 'default';
    this.options = options;
    this.shortcuts = { ...DEFAULT_SHORTCUTS, ...options.shortcuts };
    this.nodeEditor = new NodeEditor(container, this.maxWidth, options);
    this.nodeDragger = new NodeDragger(container, options);
    this.shortcutManager = new ShortcutManager(this.shortcuts);

    // Initialize ReadOnly state
    this.isReadOnly = !!options.allowReadOnly;
    this.nodeDragger.setReadOnly(this.isReadOnly);

    this.attachEvents();
  }

  getShortcuts(): ShortcutConfig {
    return this.shortcuts;
  }

  setReadOnly(readOnly: boolean): void {
    this.isReadOnly = readOnly;
    // Update NodeDragger state
    if (this.nodeDragger) {
      this.nodeDragger.setReadOnly(readOnly);
    }

    // Maybe cancel any ongoing edit/drag?
    if (readOnly) {
      if (this.nodeDragger && this.nodeDragger.draggedNodeId) {
        this.nodeDragger.draggedNodeId = null;
      }
      // If editing is happening... we can't easily cancel internal state of textarea,
      // but new edits are blocked.
    }
  }

  destroy(): void {
    this.cleanupFns.forEach((fn) => fn());
    this.cleanupFns = [];
  }

  updateSelection(nodeId: string | null) {
    this.selectedNodeId = nodeId;
  }

  private attachEvents(): void {
    // Paste logic is handled by 'paste' event listener solely

    // Helper to add listener and track cleanup
    const addListener = (
      target: EventTarget,
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | AddEventListenerOptions,
    ) => {
      target.addEventListener(type, listener, options);
      this.cleanupFns.push(() => {
        if (typeof target.removeEventListener === 'function') {
          target.removeEventListener(type, listener, options);
        }
      });
    };

    addListener(this.container, 'focus', () => {});
    addListener(this.container, 'blur', () => {});

    // Prevent accidental scrolling of the container (we use transform for pan)
    addListener(this.container, 'scroll', () => {
      if (this.container.scrollTop !== 0 || this.container.scrollLeft !== 0) {
        this.container.scrollTop = 0;
        this.container.scrollLeft = 0;
      }
    });

    // Click handling
    addListener(this.container, 'click', (e) => {
      const target = e.target as HTMLElement;
      const nodeEl = target.closest('.mindmap-node') as HTMLElement;

      if (nodeEl && nodeEl.dataset.id) {
        this.options.onNodeClick(nodeEl.dataset.id);
      } else {
        // Deselect if clicking background
        this.options.onNodeClick('');
      }

      // Ensure container receives/retains focus AFTER render might have occurred
      this.container.focus();
    });

    // Pan handling
    addListener(this.container, 'mousedown', (e) => {
      const me = e as MouseEvent;
      const target = me.target as HTMLElement;
      // Only start panning if clicking background (not a node/input)
      if (!target.closest('.mindmap-node') && target.tagName !== 'INPUT') {
        this.isPanning = true;
        this.lastMouseX = me.clientX;
        this.lastMouseY = me.clientY;
        this.container.style.cursor = 'all-scroll';
      }
    });

    addListener(window, 'mousemove', (e) => {
      const me = e as MouseEvent;
      if (this.isPanning) {
        const dx = me.clientX - this.lastMouseX;
        const dy = me.clientY - this.lastMouseY;
        this.lastMouseX = me.clientX;
        this.lastMouseY = me.clientY;

        if (this.options.onPan) {
          this.options.onPan(dx, dy);
        }
      }
    });

    const stopPanning = () => {
      if (this.isPanning) {
        this.isPanning = false;
        this.container.style.cursor = 'default';
      }
    };

    addListener(window, 'mouseup', stopPanning);
    addListener(window, 'mouseleave', stopPanning);

    // Wheel handling (Pan)
    addListener(
      this.container,
      'wheel',
      (e) => {
        const we = e as WheelEvent;
        we.preventDefault();

        // Check for Zoom (Ctrl/Meta + Wheel)
        if (we.ctrlKey || we.metaKey) {
          if (this.options.onZoom) {
            this.options.onZoom(we.deltaY, we.clientX, we.clientY);
          }
          return;
        }

        // Normalize delta based on deltaMode
        // 0: Pixel, 1: Line, 2: Page
        let multiplier = 1;
        if (we.deltaMode === 1) {
          // Line
          multiplier = 33; // Approx line height in pixels
        } else if (we.deltaMode === 2) {
          // Page
          multiplier = window.innerHeight;
        }

        const dx = -we.deltaX * multiplier;
        const dy = -we.deltaY * multiplier;

        if (this.options.onPan) {
          this.options.onPan(dx, dy);
        }
      },
      { passive: false },
    );

    // Keyboard handling
    addListener(document, 'keydown', (e) => {
      const ke = e as KeyboardEvent;
      const target = ke.target as HTMLElement;

      // START CHANGE: Safety check for input elements
      // If we are typing in an input/textarea or contentEditable element,
      // we should not trigger these global shortcuts.
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }
      // END CHANGE

      // Handle resetZoom (works without selection)
      if (this.shortcutManager.matches(ke, 'resetZoom')) {
        ke.preventDefault();
        this.options.onZoomReset?.();
        return;
      }

      // Actions allowed without selection
      const actionForNoSelection = this.shortcutManager.getAction(ke);
      if (actionForNoSelection === 'openCommandPalette') {
        ke.preventDefault();
        this.options.onToggleCommandPalette?.();
        return;
      }

      // Handle No Selection (Initial Focus)
      if (!this.selectedNodeId) {
        if (
          this.shortcutManager.matches(ke, 'navUp') ||
          this.shortcutManager.matches(ke, 'navDown') ||
          this.shortcutManager.matches(ke, 'navLeft') ||
          this.shortcutManager.matches(ke, 'navRight')
        ) {
          ke.preventDefault();
          // Find closest node to center
          let closestId: string | null = null;
          let minDistance = Infinity;

          const nodes = this.container.querySelectorAll('.mindmap-node');
          nodes.forEach((el) => {
            const hEl = el as HTMLElement;
            if (!hEl.dataset.id) return;

            // easier comparison: Get bounding client rect of node.
            const nodeRect = hEl.getBoundingClientRect();
            const nodeCenterX = nodeRect.left + nodeRect.width / 2;
            const nodeCenterY = nodeRect.top + nodeRect.height / 2;

            // Compare to container center in client coords
            const containerRect = this.container.getBoundingClientRect();
            const containerCenterX = containerRect.left + containerRect.width / 2;
            const containerCenterY = containerRect.top + containerRect.height / 2;

            const dist =
              Math.pow(nodeCenterX - containerCenterX, 2) +
              Math.pow(nodeCenterY - containerCenterY, 2);

            if (dist < minDistance) {
              minDistance = dist;
              closestId = hEl.dataset.id;
            }
          });

          if (closestId) {
            this.options.onNodeClick(closestId);
          }
        }
        return;
      }

      // Actions
      const action = this.shortcutManager.getAction(ke);
      if (action) {
        this.handleAction(action, ke);
      }
    });

    // Paste handling (Image & Node)
    addListener(document, 'paste', (e) => {
      const ce = e as ClipboardEvent;
      // Native paste event

      if (this.isReadOnly) return;
      if (!this.selectedNodeId) return;

      const clipboardItems = ce.clipboardData?.items;

      if (!clipboardItems || clipboardItems.length === 0) {
        // No clipboard data, fallback to internal paste
        this.options.onPasteNode?.(this.selectedNodeId);
        return;
      }

      let processed = false;
      for (const item of clipboardItems) {
        if (item.type.startsWith('image/')) {
          const blob = item.getAsFile();
          if (blob) {
            const reader = new FileReader();
            reader.onload = (event) => {
              if (event.target?.result && this.options.onPasteImage && this.selectedNodeId) {
                this.options.onPasteImage(this.selectedNodeId, event.target.result as string);
              }
            };
            reader.readAsDataURL(blob);
          }
          ce.preventDefault();
          processed = true;
          break;
        }
      }

      if (!processed) {
        // If no image was found/handled, assume it might be a node copy (internal)
        this.options.onPasteNode?.(this.selectedNodeId);
      }
    });

    // Drag & Drop handling
    const addListenerHelper = (
      target: EventTarget,
      type: string,
      listener: EventListenerOrEventListenerObject,
    ) => addListener(target, type, listener);

    addListenerHelper(
      this.container,
      'dragstart',
      this.nodeDragger.handleDragStart.bind(this.nodeDragger),
    );
    addListenerHelper(
      this.container,
      'dragover',
      this.nodeDragger.handleDragOver.bind(this.nodeDragger),
    );
    addListenerHelper(
      this.container,
      'dragleave',
      this.nodeDragger.handleDragLeave.bind(this.nodeDragger),
    );
    addListenerHelper(this.container, 'drop', this.nodeDragger.handleDrop.bind(this.nodeDragger));
    addListenerHelper(
      this.container,
      'dragend',
      this.nodeDragger.handleDragEnd.bind(this.nodeDragger),
    );

    // Double click to edit
    addListener(this.container, 'dblclick', (e) => {
      if (this.isReadOnly) return;
      const target = e.target as HTMLElement;
      const nodeEl = target.closest('.mindmap-node') as HTMLElement;

      if (nodeEl && nodeEl.dataset.id) {
        this.startEditing(nodeEl, nodeEl.dataset.id);
      }
    });
  }

  public editNode(nodeId: string): void {
    const nodeEl = this.container.querySelector(
      `.mindmap-node[data-id="${nodeId}"]`,
    ) as HTMLElement;
    if (nodeEl) {
      this.startEditing(nodeEl, nodeId);
    }
  }

  get draggedNodeId(): string | null {
    return this.nodeDragger ? this.nodeDragger.draggedNodeId : null;
  }
  set draggedNodeId(value: string | null) {
    if (this.nodeDragger) this.nodeDragger.draggedNodeId = value;
  }

  private startEditing(element: HTMLElement, nodeId: string): void {
    this.nodeEditor.setMaxWidth(this.maxWidth);
    this.nodeEditor.startEditing(element, nodeId);
  }

  private handleAction(action: ShortcutAction, ke: KeyboardEvent): void {
    if (!this.selectedNodeId) return;

    // Actions allowed in ReadOnly
    switch (action) {
      case 'copy':
        ke.preventDefault();
        this.options.onCopyNode?.(this.selectedNodeId);
        return;
      case 'navUp':
        ke.preventDefault();
        this.options.onNavigate?.(this.selectedNodeId, 'Up');
        return;
      case 'navDown':
        ke.preventDefault();
        this.options.onNavigate?.(this.selectedNodeId, 'Down');
        return;
      case 'navRight':
        ke.preventDefault();
        this.options.onNavigate?.(this.selectedNodeId, 'Right');
        return;
      case 'navLeft':
        ke.preventDefault();
        this.options.onNavigate?.(this.selectedNodeId, 'Left');
        return;
    }

    if (this.isReadOnly) return;

    // Actions blocked in ReadOnly
    switch (action) {
      case 'addChild':
        ke.preventDefault();
        this.options.onAddChild(this.selectedNodeId);
        break;
      case 'insertParent':
        ke.preventDefault();
        this.options.onInsertParent?.(this.selectedNodeId);
        break;
      case 'addSibling':
        ke.preventDefault();
        this.options.onAddSibling(this.selectedNodeId, 'after');
        break;
      case 'addSiblingBefore':
        ke.preventDefault();
        this.options.onAddSibling(this.selectedNodeId, 'before');
        break;
      case 'deleteNode':
        ke.preventDefault();
        this.options.onDeleteNode(this.selectedNodeId);
        break;
      case 'beginEdit':
        ke.preventDefault();
        this.handleBeginEdit();
        break;

      case 'scaleUp':
        ke.preventDefault();
        // Zoom In at center
        if (this.options.onZoom) {
          const rect = this.container.getBoundingClientRect();
          // MindMapController.zoomBoard expects clientX/clientY
          this.options.onZoom(-100, rect.left + rect.width / 2, rect.top + rect.height / 2);
        }
        break;
      case 'scaleDown':
        ke.preventDefault();
        // Zoom Out at center
        if (this.options.onZoom) {
          const rect = this.container.getBoundingClientRect();
          // MindMapController.zoomBoard expects clientX/clientY
          this.options.onZoom(100, rect.left + rect.width / 2, rect.top + rect.height / 2);
        }
        break;
      case 'cut':
        ke.preventDefault();
        this.options.onCutNode?.(this.selectedNodeId);
        break;
      case 'undo':
        ke.preventDefault();
        this.options.onUndo?.();
        break;
      case 'redo':
        ke.preventDefault();
        this.options.onRedo?.();
        break;
      case 'bold':
        ke.preventDefault();
        this.options.onStyleAction?.(this.selectedNodeId, { type: 'bold' });
        break;
      case 'italic':
        ke.preventDefault();
        this.options.onStyleAction?.(this.selectedNodeId, { type: 'italic' });
        break;
      case 'zoomIn':
        ke.preventDefault();
        this.options.onStyleAction?.(this.selectedNodeId, { type: 'increaseSize' });
        break;
      case 'zoomOut':
        ke.preventDefault();
        this.options.onStyleAction?.(this.selectedNodeId, { type: 'decreaseSize' });
        break;
      case 'toggleFold':
        ke.preventDefault();
        this.options.onToggleFold?.(this.selectedNodeId);
        break;
      case 'openCommandPalette':
        ke.preventDefault();
        this.options.onToggleCommandPalette?.();
        break;
      default:
        // Handle dynamic color actions
        if (action.startsWith('selectColor')) {
          const index = parseInt(action.replace('selectColor', ''), 10) - 1;
          if (!isNaN(index)) {
            ke.preventDefault();
            this.options.onStyleAction?.(this.selectedNodeId, { type: 'color', index });
          }
        }
        break;
    }
  }

  private handleBeginEdit(): void {
    if (!this.selectedNodeId) return;
    const selectedNodeEl = this.container.querySelector(
      `.mindmap-node[data-id="${this.selectedNodeId}"]`,
    ) as HTMLElement;
    if (selectedNodeEl) {
      // Restore Zoom: Check if image node mechanism
      const zoomBtn = selectedNodeEl.querySelector('[title="Zoom Image"]') as HTMLElement;
      if (zoomBtn) {
        zoomBtn.click();
        return;
      }
      if (selectedNodeEl.querySelector('img')) {
        return;
      }
      this.startEditing(selectedNodeEl, this.selectedNodeId);
    }
  }
}
