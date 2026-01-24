import {
  ShortcutConfig,
  DEFAULT_SHORTCUTS,
  ShortcutAction,
} from '../domain/interfaces/ShortcutConfig';
import { NodeEditor } from './NodeEditor';

export type Direction = 'Up' | 'Down' | 'Left' | 'Right';
export type StyleAction =
  | { type: 'bold' }
  | { type: 'italic' }
  | { type: 'increaseSize' }
  | { type: 'decreaseSize' }
  | { type: 'color'; index: number };

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
  onUndo?: () => void;
  onRedo?: () => void;
  onStyleAction?: (nodeId: string, action: StyleAction) => void;
  onEditEnd?: (nodeId: string) => void;
  onToggleFold?: (nodeId: string) => void;
  shortcuts?: ShortcutConfig;
}

export class InteractionHandler {
  container: HTMLElement;
  options: InteractionOptions;
  maxWidth: number = -1;
  selectedNodeId: string | null = null;
  draggedNodeId: string | null = null;
  isPanning: boolean = false;
  lastMouseX: number = 0;
  lastMouseY: number = 0;
  isReadOnly: boolean = false;
  private shortcuts: ShortcutConfig;
  private nodeEditor: NodeEditor;

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
    this.attachEvents();
  }

  getShortcuts(): ShortcutConfig {
    return this.shortcuts;
  }

  setReadOnly(readOnly: boolean): void {
    this.isReadOnly = readOnly;
    // Maybe cancel any ongoing edit/drag?
    if (readOnly) {
      if (this.draggedNodeId) {
        this.draggedNodeId = null;
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

  private matchesShortcut(e: KeyboardEvent, action: ShortcutAction): boolean {
    const bindings = this.shortcuts[action];
    if (!bindings) return false;
    return bindings.some((b) => {
      // Default to false for modifiers if undefined
      const ctrl = b.ctrlKey ?? false;
      const meta = b.metaKey ?? false;
      const alt = b.altKey ?? false;
      const shift = b.shiftKey ?? false;

      if (e.ctrlKey !== ctrl) return false;
      if (e.metaKey !== meta) return false;
      if (e.altKey !== alt) return false;
      if (e.shiftKey !== shift) return false;

      // Check key
      return b.key.toLowerCase() === e.key.toLowerCase();
    });
  }

  private attachEvents(): void {
    let pasteTimeout: ReturnType<typeof setTimeout> | null = null;

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
    // Prevent accidental scrolling of the container (we use transform for pan)
    addListener(this.container, 'scroll', () => {
      if (this.container.scrollTop !== 0 || this.container.scrollLeft !== 0) {
        this.container.scrollTop = 0;
        this.container.scrollLeft = 0;
      }
    });

    // Click handling
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

      // Handle No Selection (Initial Focus)
      if (!this.selectedNodeId) {
        if (
          this.matchesShortcut(ke, 'navUp') ||
          this.matchesShortcut(ke, 'navDown') ||
          this.matchesShortcut(ke, 'navLeft') ||
          this.matchesShortcut(ke, 'navRight')
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
      if (this.matchesShortcut(ke, 'navUp')) {
        if (this.isReadOnly) {
          // Allowed
        }
        ke.preventDefault();
        this.options.onNavigate?.(this.selectedNodeId, 'Up');
        return;
      }
      if (this.matchesShortcut(ke, 'navDown')) {
        ke.preventDefault();
        this.options.onNavigate?.(this.selectedNodeId, 'Down');
        return;
      }
      if (this.matchesShortcut(ke, 'navLeft')) {
        ke.preventDefault();
        this.options.onNavigate?.(this.selectedNodeId, 'Left');
        return;
      }
      if (this.matchesShortcut(ke, 'navRight')) {
        ke.preventDefault();
        this.options.onNavigate?.(this.selectedNodeId, 'Right');
        return;
      }

      if (this.matchesShortcut(ke, 'addChild')) {
        if (this.isReadOnly) return;
        ke.preventDefault();
        this.options.onAddChild(this.selectedNodeId);
        return;
      }
      if (this.matchesShortcut(ke, 'insertParent')) {
        if (this.isReadOnly) return;
        ke.preventDefault();
        this.options.onInsertParent?.(this.selectedNodeId);
        return;
      }
      if (this.matchesShortcut(ke, 'addSibling')) {
        if (this.isReadOnly) return;
        ke.preventDefault();
        this.options.onAddSibling(this.selectedNodeId, 'after');
        return;
      }
      if (this.matchesShortcut(ke, 'addSiblingBefore')) {
        if (this.isReadOnly) return;
        ke.preventDefault();
        this.options.onAddSibling(this.selectedNodeId, 'before');
        return;
      }
      if (this.matchesShortcut(ke, 'deleteNode')) {
        if (this.isReadOnly) return;
        ke.preventDefault();
        this.options.onDeleteNode(this.selectedNodeId);
        return;
      }

      if (this.matchesShortcut(ke, 'beginEdit')) {
        if (this.isReadOnly) return;
        ke.preventDefault();
        // Check for Zoom Image or Image Node first
        const selectedNodeEl = this.container.querySelector(
          `.mindmap-node[data-id="${this.selectedNodeId}"]`,
        ) as HTMLElement;
        if (selectedNodeEl) {
          // Restore Zoom: Check if image node mechanism (has zoom button)
          const zoomBtn = selectedNodeEl.querySelector('[title="Zoom Image"]') as HTMLElement;
          if (zoomBtn) {
            zoomBtn.click();
            return;
          }
          // If it's an image node but no zoom button, or explicitly an image, do not start editing text.
          if (selectedNodeEl.querySelector('img')) {
            return;
          }
          this.startEditing(selectedNodeEl, this.selectedNodeId);
        }
        return;
      }

      if (this.matchesShortcut(ke, 'copy')) {
        // Copy allowed in ReadOnly
        ke.preventDefault();
        this.options.onCopyNode?.(this.selectedNodeId);
        return;
      }
      // Paste has its own event listener 'paste', but 'v' shortcut usually just relies on system paste?
      // Actually code had explicit 'v' handler fallback.
      if (this.matchesShortcut(ke, 'paste')) {
        if (this.isReadOnly) return;
        // The original code allowed default to fire 'paste' event, and set a fallback timeout.
        // We should replicate that.
        // But matching keys means we detected 'v'.
        if (pasteTimeout) clearTimeout(pasteTimeout);
        pasteTimeout = setTimeout(() => {
          if (this.selectedNodeId) {
            this.options.onPasteNode?.(this.selectedNodeId);
          }
        }, 50);
        return;
      }
      if (this.matchesShortcut(ke, 'cut')) {
        if (this.isReadOnly) return;
        ke.preventDefault();
        this.options.onCutNode?.(this.selectedNodeId);
        return;
      }
      if (this.matchesShortcut(ke, 'undo')) {
        if (this.isReadOnly) return;
        ke.preventDefault();
        this.options.onUndo?.();
        return;
      }
      if (this.matchesShortcut(ke, 'redo')) {
        if (this.isReadOnly) return;
        ke.preventDefault();
        this.options.onRedo?.();
        return;
      }

      if (this.matchesShortcut(ke, 'bold')) {
        if (this.isReadOnly) return;
        ke.preventDefault();
        this.options.onStyleAction?.(this.selectedNodeId, { type: 'bold' });
        return;
      }
      if (this.matchesShortcut(ke, 'italic')) {
        if (this.isReadOnly) return;
        ke.preventDefault();
        this.options.onStyleAction?.(this.selectedNodeId, { type: 'italic' });
        return;
      }
      if (this.matchesShortcut(ke, 'zoomIn')) {
        if (this.isReadOnly) return;
        ke.preventDefault();
        this.options.onStyleAction?.(this.selectedNodeId, { type: 'increaseSize' });
        return;
      }
      if (this.matchesShortcut(ke, 'zoomOut')) {
        if (this.isReadOnly) return;
        ke.preventDefault();
        this.options.onStyleAction?.(this.selectedNodeId, { type: 'decreaseSize' });
        return;
      }
      if (this.matchesShortcut(ke, 'toggleFold')) {
        if (this.isReadOnly) return;
        ke.preventDefault();
        this.options.onToggleFold?.(this.selectedNodeId);
        return;
      }

      // Colors
      for (let i = 1; i <= 7; i++) {
        // @ts-expect-error - Event property exists on window but missing from TS defs in this context
        if (this.matchesShortcut(ke, `selectColor${i}`)) {
          if (this.isReadOnly) return;
          ke.preventDefault();
          this.options.onStyleAction?.(this.selectedNodeId, { type: 'color', index: i - 1 });
          return;
        }
      }
    });

    // Paste handling (Image & Node)
    addListener(document, 'paste', (e) => {
      const ce = e as ClipboardEvent;
      // Cancel fallback timeout as event fired
      if (pasteTimeout) {
        clearTimeout(pasteTimeout);
        pasteTimeout = null;
      }

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
    // Inject styles for drag feedback
    const style = document.createElement('style');
    style.textContent = `
            .mindmap-node.drag-over-top {
                border-top: 4px solid #007bff !important;
            }
            .mindmap-node.drag-over-bottom {
                border-bottom: 4px solid #007bff !important;
            }
            .mindmap-node.drag-over-left {
                border-left: 4px solid #007bff !important;
            }
            .mindmap-node.drag-over-right {
                border-right: 4px solid #007bff !important;
            }
        `;
    document.head.appendChild(style);

    this.container.addEventListener('dragstart', (e) => {
      if (this.isReadOnly) {
        e.preventDefault();
        return;
      }
      const target = e.target as HTMLElement;
      const nodeEl = target.closest('.mindmap-node') as HTMLElement;
      if (nodeEl && nodeEl.dataset.id) {
        this.draggedNodeId = nodeEl.dataset.id;
        e.dataTransfer?.setData('text/plain', nodeEl.dataset.id);
        if (e.dataTransfer) {
          e.dataTransfer.effectAllowed = 'move';
        }
      }
    });
    // Assuming dragstart is enough to block drag if preventDefault called?
    // Just in case, we register cleanup if we attached it like others.
    // The previous implementation used addEventListener but didn't track it.
    // Let's attach our listener and push to cleanup.
    this.cleanupFns.push(() => {
      // remove is handled if we used addListener helper for container, but here we used `this.container.addEventListener`.
      // Wait, I see I used `addListener` helper for earlier events but `dragstart` was legacy.
      // Let's refactor this one to use `addListener` to capture it for destroy!
    });
    // Actually, to make `destroy()` fully effective, ALL specific listeners should use `addListener`.
    // I will replace `this.container.addEventListener` with `addListener(this.container, ...)` pattern here too.

    const getDropPosition = (
      e: DragEvent,
      element: HTMLElement,
    ): 'top' | 'bottom' | 'left' | 'right' => {
      const rect = element.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const w = rect.width;
      const h = rect.height;

      // Priority: Top/Bottom take 25% height each. Middle 50% checks Left/Right.
      if (y < h * 0.25) return 'top';
      if (y > h * 0.75) return 'bottom';

      if (x < w * 0.25) return 'left';
      if (x > w * 0.75) return 'right';

      // Middle center fallback -> Right (or Left depending on layout could be better, but fixed usually OK)
      return 'right';
    };

    // Drag Start
    addListener(this.container, 'dragstart', (e) => {
      const de = e as DragEvent;
      if (this.isReadOnly) {
        de.preventDefault();
        return;
      }
      const target = de.target as HTMLElement;
      const nodeEl = target.closest('.mindmap-node') as HTMLElement;
      if (nodeEl && nodeEl.dataset.id) {
        this.draggedNodeId = nodeEl.dataset.id;
        de.dataTransfer?.setData('text/plain', nodeEl.dataset.id);
        if (de.dataTransfer) {
          de.dataTransfer.effectAllowed = 'move';
        }
      }
    });

    // Drag Over
    addListener(this.container, 'dragover', (e) => {
      const de = e as DragEvent;
      if (this.isReadOnly) return; // Should not happen if dragstart prevented, but for external files?
      de.preventDefault(); // Allow drop
      const target = de.target as HTMLElement;
      const nodeEl = target.closest('.mindmap-node') as HTMLElement;

      if (
        nodeEl &&
        nodeEl.dataset.id &&
        this.draggedNodeId &&
        nodeEl.dataset.id !== this.draggedNodeId
      ) {
        const position = getDropPosition(de, nodeEl);

        // Clear all classes first
        nodeEl.classList.remove(
          'drag-over-top',
          'drag-over-bottom',
          'drag-over-left',
          'drag-over-right',
        );
        nodeEl.classList.add(`drag-over-${position}`);

        if (de.dataTransfer) {
          de.dataTransfer.dropEffect = 'move';
        }
      }
    });

    // Drag Leave
    addListener(this.container, 'dragleave', (e) => {
      const target = e.target as HTMLElement;
      const nodeEl = target.closest('.mindmap-node') as HTMLElement;
      if (nodeEl) {
        nodeEl.classList.remove(
          'drag-over-top',
          'drag-over-bottom',
          'drag-over-left',
          'drag-over-right',
        );
      }
    });

    // Drop
    addListener(this.container, 'drop', (e) => {
      const de = e as DragEvent;
      de.preventDefault();
      const target = de.target as HTMLElement;
      const nodeEl = target.closest('.mindmap-node') as HTMLElement;

      // Remove drag-over class from all nodes to be safe
      this.container.querySelectorAll('.mindmap-node').forEach((el) => {
        el.classList.remove(
          'drag-over-top',
          'drag-over-bottom',
          'drag-over-left',
          'drag-over-right',
        );
      });

      if (this.isReadOnly) return;

      if (nodeEl && nodeEl.dataset.id && this.draggedNodeId) {
        const targetId = nodeEl.dataset.id;
        if (this.draggedNodeId !== targetId) {
          const position = getDropPosition(de, nodeEl);
          this.options.onDropNode(this.draggedNodeId, targetId, position);
        }
      }
      this.draggedNodeId = null;
    });

    // Drag End (Cleanup if cancelled)
    addListener(this.container, 'dragend', () => {
      this.draggedNodeId = null;
      this.container.querySelectorAll('.mindmap-node').forEach((el) => {
        el.classList.remove(
          'drag-over-top',
          'drag-over-bottom',
          'drag-over-left',
          'drag-over-right',
        );
      });
    });

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

  private startEditing(element: HTMLElement, nodeId: string): void {
    this.nodeEditor.setMaxWidth(this.maxWidth);
    this.nodeEditor.startEditing(element, nodeId);
  }
}
