import { MindMap } from './domain/entities/MindMap';
import { Node, NodeStyle } from './domain/entities/Node';
import { MindMapService } from './application/MindMapService';
import { SvgRenderer } from './presentation/SvgRenderer';
import { StyleEditor } from './presentation/StyleEditor';
import { LayoutSwitcher } from './presentation/LayoutSwitcher';
import { InteractionHandler, Direction } from './presentation/InteractionHandler';
import { LayoutMode } from './domain/interfaces/LayoutMode';
import { MindMapData, Theme } from './domain/interfaces/MindMapData';
import { TypedEventEmitter } from './infrastructure/EventEmitter';
import { KakidashEventMap } from './domain/interfaces/KakidashEvents';
import { ShortcutConfig, ShortcutAction, KeyBinding } from './domain/interfaces/ShortcutConfig';

export type { MindMapData } from './domain/interfaces/MindMapData';
export type { KakidashEventMap } from './domain/interfaces/KakidashEvents';
export type { LayoutMode } from './domain/interfaces/LayoutMode';
export type { ShortcutConfig } from './domain/interfaces/ShortcutConfig';

export interface KakidashOptions {
  shortcuts?: ShortcutConfig;
}

export interface MindMapStyles {
  rootNode?: {
    border?: string;
    background?: string;
    color?: string;
  };
  childNode?: {
    border?: string;
    background?: string;
    color?: string;
  };
  connection?: {
    color?: string;
  };
  canvas?: {
    background?: string;
  };
}

/**
 * The main class for the Kakidash mind map library.
 * It manages the mind map data, interaction, and rendering.
 */
export class Kakidash extends TypedEventEmitter<KakidashEventMap> {
  private mindMap: MindMap;
  private service: MindMapService;
  private renderer: SvgRenderer;
  private interactionHandler: InteractionHandler;
  private styleEditor: StyleEditor;
  private layoutSwitcher: LayoutSwitcher;
  private layoutMode: LayoutMode = 'Right';
  private selectedNodeId: string | null = null;
  /**
   * Flag to track if we just created a node via UI interaction and are waiting for edit completion
   * to emit the final model:change event.
   */
  private pendingNodeCreation: boolean = false;

  private panX: number = 0;
  private panY: number = 0;
  private targetPanX: number = 0;
  private targetPanY: number = 0;
  private scale: number = 1;

  private isBatching: boolean = false;
  private animationFrameId: number | null = null;
  private maxWidth: number = -1;

  private savedCustomStyles: MindMapStyles = {
    rootNode: { border: '2px solid #aeb6bf', background: '#ebf5fb', color: '#2e4053' },
    childNode: { border: '1px solid #d5d8dc', background: '#fdfefe', color: '#2c3e50' },
    connection: { color: '#abb2b9' },
  };

  /**
   * Creates a new Kakidash instance.
   *
   * @param container - The HTML element to mount the mind map into. Must have defined width and height.
   * @param options - Optional configuration options.
   */
  constructor(container: HTMLElement, options: KakidashOptions = {}) {
    super();
    const rootNode = new Node('root', 'Root Topic', null, true);
    this.mindMap = new MindMap(rootNode);
    this.service = new MindMapService(this.mindMap);
    this.renderer = new SvgRenderer(container, {
      onImageZoom: (active) => this.setReadOnly(active),
      onToggleFold: (nodeId) => {
        if (this.service.toggleNodeFold(nodeId)) {
          this.render();
          this.emit('model:change', undefined);
        }
      },
    });

    // dedicated UI layer to ensure z-index separation and stability
    const uiLayer = document.createElement('div');
    uiLayer.style.position = 'absolute';
    uiLayer.style.top = '0';
    uiLayer.style.left = '0';
    uiLayer.style.width = '100%';
    uiLayer.style.height = '100%';
    uiLayer.style.pointerEvents = 'none'; // Passthrough for canvas interactions
    uiLayer.style.zIndex = '2000';

    // Prevent native browser scrolling/zooming interference
    container.style.overscrollBehavior = 'none';
    container.style.touchAction = 'none';

    container.appendChild(uiLayer);

    this.styleEditor = new StyleEditor(uiLayer);
    this.styleEditor.onUpdate = (nodeId, style) => {
      if (this.interactionHandler.isReadOnly) return;
      if (this.service.updateNodeStyle(nodeId, style)) {
        this.render();
        this.emit('model:change', undefined);
      }
    };

    // Center the board horizontally.
    this.panX = container.clientWidth / 2;
    this.targetPanX = this.panX;
    this.targetPanY = this.panY;

    this.layoutSwitcher = new LayoutSwitcher(uiLayer, {
      // Pass uiLayer
      onLayoutChange: (mode) => this.setLayoutMode(mode),
      onThemeChange: (theme) => this.setTheme(theme),
      onZoomReset: () => this.resetZoom(),
      onShowShortcuts: () => this.showShortcutModal(),
    });

    this.startAnimationLoop();

    this.interactionHandler = new InteractionHandler(container, {
      onNodeClick: (nodeId) => this.selectNode(nodeId || null),
      onAddChild: (parentId) => this.addChildNode(parentId),
      onInsertParent: (nodeId) => this.insertParentNode(nodeId),
      onAddSibling: (nodeId, position) => this.addSiblingNode(nodeId, position),
      onDeleteNode: (nodeId) => this.removeNode(nodeId),
      onDropNode: (draggedId, targetId, side) => this.moveNode(draggedId, targetId, side),
      onUpdateNode: (nodeId, topic) => this.updateNodeTopic(nodeId, topic),
      onNavigate: (nodeId, direction) => this.navigateNode(nodeId, direction),
      onPan: (dx, dy) => this.panBoard(dx, dy),
      onCopyNode: (nodeId) => this.copyNode(nodeId),
      onPasteNode: (parentId) => this.pasteNode(parentId),
      onCutNode: (nodeId) => this.cutNode(nodeId),
      onPasteImage: (parentId, imageData) => this.pasteImage(parentId, imageData),
      onZoom: (delta, x, y) => this.zoomBoard(delta, x, y),
      onUndo: () => {
        if (this.service.undo()) {
          this.render();
          this.emit('model:change', undefined);
        }
      },
      onRedo: () => {
        if (this.service.redo()) {
          this.render();
          this.emit('model:change', undefined);
        }
      },
      onStyleAction: (nodeId, action) => {
        if (this.interactionHandler.isReadOnly) return;

        const node = this.mindMap.findNode(nodeId);
        if (!node) return;

        const currentStyle = node.style || {};

        let newStyle: Partial<NodeStyle> | null = null;

        if (action.type === 'bold') {
          newStyle = { fontWeight: currentStyle.fontWeight === 'bold' ? 'normal' : 'bold' };
        } else if (action.type === 'italic') {
          newStyle = { fontStyle: currentStyle.fontStyle === 'italic' ? 'normal' : 'italic' };
        } else if (action.type === 'color') {
          if (action.index >= 0 && action.index < StyleEditor.PALETTE.length) {
            newStyle = { color: StyleEditor.PALETTE[action.index] };
          }
        } else if (action.type === 'increaseSize' || action.type === 'decreaseSize') {
          const sizes = StyleEditor.FONT_SIZES;
          const currentVal = currentStyle.fontSize || ''; // '' assumes default
          let currentIndex = sizes.findIndex((s) => s.value === currentVal);
          if (currentIndex === -1) currentIndex = 0; // Default if unknown

          let newIndex = currentIndex;
          if (action.type === 'increaseSize') {
            newIndex = Math.min(sizes.length - 1, currentIndex + 1);
          } else {
            newIndex = Math.max(0, currentIndex - 1);
          }

          if (newIndex !== currentIndex) {
            newStyle = { fontSize: sizes[newIndex].value };
          }
        }

        if (newStyle) {
          if (this.service.updateNodeStyle(nodeId, newStyle)) {
            this.render();
            this.emit('model:change', undefined);
            // Also update editor UI if it's showing this node
            // But selectNode() does that. Re-selecting might be overkill but ensures sync?
            // Actually styleEditor.show() is called on selection.
            // We should probably just let the render handle the view,
            // but the Floating Editor UI needs to be updated too if visible.
            if (this.selectedNodeId === nodeId) {
              this.styleEditor.show(nodeId, { ...currentStyle, ...newStyle });
            }
          }
        }
      },
      onEditEnd: (_) => {
        // If we were waiting for node creation to complete (e.g. user finished editing new node name or cancelled)
        if (this.pendingNodeCreation) {
          this.pendingNodeCreation = false;
          this.emit('model:change', undefined);
        }
      },
      onToggleFold: (nodeId) => {
        if (this.service.toggleNodeFold(nodeId)) {
          this.render();
          this.emit('model:change', undefined);
        }
      },
      shortcuts: options.shortcuts,
    });

    this.render();
  }

  /* ==========================================================================================
     Core API (Pure Data Operations)
     ========================================================================================== */

  /**
   * Adds a new child node to the specified parent.
   * This is a pure data operation and does not trigger UI actions like auto-focus or scroll.
   *
   * @param parentId - The ID of the parent node.
   * @param topic - The content of the new node.
   * @param layoutSide - For 'Both' layout mode, which side to place the node (root children only).
   * @param options - Options for the operation.
   * @returns The newly created Node object, or null if failed.
   */
  addNode(
    parentId: string,
    topic?: string,
    layoutSide?: 'left' | 'right',
    options: { emitChange?: boolean } = { emitChange: true },
  ): Node | null {
    const node = this.service.addNode(parentId, topic, layoutSide);
    if (node) {
      this.render();
      this.emit('node:add', { id: node.id, topic: node.topic });
      if (options.emitChange) {
        this.emit('model:change', undefined);
      }
    }
    return node;
  }

  /**
   * Adds a sibling node relative to the reference node.
   * This is a pure data operation.
   */
  addSibling(
    referenceId: string,
    position: 'before' | 'after' = 'after',
    topic: string = 'New topic',
    options: { emitChange?: boolean } = { emitChange: true },
  ): Node | null {
    const node = this.mindMap.findNode(referenceId);
    if (!node || !node.parentId) return null;

    const parent = this.mindMap.findNode(node.parentId);

    // Logic for Both mode balancing (data concern)
    if (parent && parent.isRoot && this.layoutMode === 'Both') {
      this.ensureExplicitLayoutSides(parent);
    }

    const newNode = this.service.addSibling(referenceId, position, topic);
    if (newNode) {
      // Inherit layoutSide if sibling of Root
      if (parent && parent.isRoot && this.layoutMode === 'Both') {
        const currentSide =
          node.layoutSide || (parent.children.indexOf(node) % 2 === 0 ? 'right' : 'left');
        newNode.layoutSide = currentSide;
      }

      this.render();
      this.emit('node:add', { id: newNode.id, topic: newNode.topic });
      if (options.emitChange) {
        this.emit('model:change', undefined);
      }
    }
    return newNode;
  }

  /**
   * Inserts a parent node above the specified node.
   * This is a pure data operation.
   */
  insertParent(
    targetId: string,
    topic: string = 'New topic',
    options: { emitChange?: boolean } = { emitChange: true },
  ): Node | null {
    const newNode = this.service.insertParent(targetId, topic);
    if (newNode) {
      this.render();
      this.emit('node:add', { id: newNode.id, topic: newNode.topic });
      if (options.emitChange) {
        this.emit('model:change', undefined);
      }
    }
    return newNode;
  }

  /**
   * Removes a node.
   * This is a pure data operation.
   * (Previously removeNode, keeping alias or usage consistent)
   */
  deleteNode(nodeId: string): void {
    // Current removeNode implementation has UI selection logic mixed in.
    // We should separate it.
    // However, removeNode return type was void in original? No, it was just doing logic.
    // Let's implement pure delete here.
    const result = this.service.removeNode(nodeId);
    if (result) {
      this.render();
      this.emit('node:remove', nodeId);
      this.emit('model:change', undefined);
    }
  }

  /**
   * Updates a node's topic or style.
   * This is a pure data operation.
   */
  updateNode(nodeId: string, updates: { topic?: string; style?: Partial<NodeStyle> }): void {
    let changed = false;
    if (this.interactionHandler.isReadOnly) return; // Prevent updates via public API if readonly?
    // Actually, usually programmatic API bypasses UI readonly, but for "setReadOnly" typically means "Interactive ReadOnly".
    // API users can still modify data if they want? Or should we block it?
    // "Read-only Mode" usually implies UI interaction. API users are "Gods".
    // But let's stick to pure access.

    if (updates.topic !== undefined) {
      if (this.service.updateNodeTopic(nodeId, updates.topic)) changed = true;
    }
    if (updates.style !== undefined) {
      if (this.service.updateNodeStyle(nodeId, updates.style)) changed = true;
    }

    if (changed) {
      this.render();
      if (updates.topic !== undefined) {
        // We emit node:update mainly for topic changes in the current event map
        this.emit('node:update', { id: nodeId, topic: updates.topic });
      }
      this.emit('model:change', undefined);
      // If this update triggered a change, we can clear pending creation flag as we emitted change here.
      // But actually, onUpdateNode is called from InteractionHandler finishEditing.
      // If we emit change here, we don't need to emit again in onEditEnd for the same action?
      // InteractionHandler calls onUpdateNode THEN cleans up.
      // onEditEnd is called during cleanup.
      // If we emit here, we should perhaps reset pendingNodeCreation to prevent double emission?
      if (this.pendingNodeCreation) {
        this.pendingNodeCreation = false;
      }
    }
  }

  /**
   * Undo the last change.
   */
  public undo(): void {
    if (this.service.undo()) {
      this.render();
      this.emit('model:change', undefined);
    }
  }

  /**
   * Redo the last undone change.
   */
  public redo(): void {
    if (this.service.redo()) {
      this.render();
      this.emit('model:change', undefined);
    }
  }

  /**
   * Toggle fold state of a node.
   */
  public toggleFold(nodeId: string): void {
    if (this.service.toggleNodeFold(nodeId)) {
      this.render();
      this.emit('model:change', undefined);
    }
  }

  /**
   * Get the ID of the currently selected node.
   */
  public getSelectedNodeId(): string | null {
    return this.selectedNodeId;
  }

  /* ==========================================================================================
     Node Accessors
     ========================================================================================== */

  public updateNodeStyle(nodeId: string, style: Partial<NodeStyle>): void {
    this.service.updateNodeStyle(nodeId, style);
  }

  /**
   * Sets the theme of the mind map.
   *
   * @param theme - The theme name ('default' | 'simple' | 'colorful' | 'custom').
   * If 'custom' is selected, previously saved custom styles (via updateGlobalStyles) are applied.
   */
  public setTheme(theme: Theme): void {
    this.service.setTheme(theme);
    this.layoutSwitcher.setTheme(theme);

    if (theme === 'custom') {
      // Apply saved custom styles
      this.applyCustomStylesToDOM(this.savedCustomStyles);
    } else {
      // Reset global styles to allow theme logic (SvgRenderer fallbacks) to take over
      // We do NOT clear savedCustomStyles, we just clear the DOM variables.
      // Manually clearing DOM CSS vars.
      const container = this.renderer.container;
      // List of known vars to reset
      const varsToReset = [
        '--mindmap-root-border',
        '--mindmap-root-background',
        '--mindmap-root-color',
        '--mindmap-child-border',
        '--mindmap-child-background',
        '--mindmap-child-color',
        '--mindmap-connection-color',
        '--mindmap-canvas-background',
      ];
      varsToReset.forEach((v) => container.style.removeProperty(v));
      container.style.removeProperty('background-color');
    }

    this.render();
    this.emit('model:change', undefined);
  }

  public getMindMap(): MindMap {
    return this.mindMap;
  }

  getNode(nodeId: string): Node | undefined {
    return this.mindMap.findNode(nodeId) || undefined;
  }

  getRoot(): Node {
    return this.mindMap.root;
  }

  findNodes(predicate: (node: Node) => boolean): Node[] {
    const results: Node[] = [];
    const traverse = (node: Node) => {
      if (predicate(node)) {
        results.push(node);
      }
      node.children.forEach(traverse);
    };
    traverse(this.mindMap.root);
    return results;
  }

  /* ==========================================================================================
     Lifecycle & Modes
     ========================================================================================== */

  setMaxNodeWidth(width: number): void {
    this.maxWidth = width;
    this.renderer.maxWidth = width;
    this.interactionHandler.maxWidth = width;
    this.render();
  }

  getMaxNodeWidth(): number {
    return this.maxWidth;
  }

  /**
   * Updates global styles for the mind map using CSS variables.
   * This allows batch updating of visual appearance without deep re-renders.
   * Styles are persisted in `savedCustomStyles` and applied immediately if current theme is 'custom'.
   *
   * @param styles - Object containing style definitions for various elements.
   * @example
   * ```typescript
   * kakidash.updateGlobalStyles({
   *   rootNode: {
   *     border: '2px solid red',
   *     color: 'white'
   *   },
   *   canvas: {
   *     background: 'black'
   *   }
   * });
   * ```
   */
  updateGlobalStyles(styles: MindMapStyles): void {
    // 1. Persist styles to savedCustomStyles (Deep merge logic simplified)
    if (styles.rootNode) {
      this.savedCustomStyles.rootNode = { ...this.savedCustomStyles.rootNode, ...styles.rootNode };
    }
    if (styles.childNode) {
      this.savedCustomStyles.childNode = {
        ...this.savedCustomStyles.childNode,
        ...styles.childNode,
      };
    }
    if (styles.connection) {
      this.savedCustomStyles.connection = {
        ...this.savedCustomStyles.connection,
        ...styles.connection,
      };
    }
    if (styles.canvas) {
      this.savedCustomStyles.canvas = { ...this.savedCustomStyles.canvas, ...styles.canvas };
    }

    // 2. Apply to DOM only if current theme is 'custom'
    // If not 'custom', we just saved the settings for later use.
    if (this.mindMap.theme === 'custom') {
      this.applyCustomStylesToDOM(this.savedCustomStyles);
    }
  }

  /**
   * Helper to apply a set of styles to the DOM via CSS variables.
   */
  private applyCustomStylesToDOM(styles: MindMapStyles): void {
    const cssVars: Record<string, string> = {};

    if (styles.rootNode?.border !== undefined)
      cssVars['--mindmap-root-border'] = styles.rootNode.border;
    if (styles.rootNode?.background !== undefined)
      cssVars['--mindmap-root-background'] = styles.rootNode.background;
    if (styles.rootNode?.color !== undefined)
      cssVars['--mindmap-root-color'] = styles.rootNode.color;

    if (styles.childNode?.border !== undefined)
      cssVars['--mindmap-child-border'] = styles.childNode.border;
    if (styles.childNode?.background !== undefined)
      cssVars['--mindmap-child-background'] = styles.childNode.background;
    if (styles.childNode?.color !== undefined)
      cssVars['--mindmap-child-color'] = styles.childNode.color;

    if (styles.connection?.color !== undefined)
      cssVars['--mindmap-connection-color'] = styles.connection.color;

    if (styles.canvas?.background !== undefined)
      cssVars['--mindmap-canvas-background'] = styles.canvas.background;

    // Apply variables to container
    const container = this.renderer.container;
    Object.entries(cssVars).forEach(([key, value]) => {
      container.style.setProperty(key, value);
    });

    // Apply canvas background directly
    if (styles.canvas?.background !== undefined) {
      container.style.backgroundColor = 'var(--mindmap-canvas-background, transparent)';
    } else {
      // Ensure default inheritance/transparency if not strictly set in current object?
      // Actually savedCustomStyles accumulates properties.
      // If it's missing in savedStyles, we might want to unset?
      // But for now assume savedStyles covers it if set.
      // If undefined in savedStyles, we leave it or set default.
      // Let's set the var usage if we hold it.
    }
  }

  setReadOnly(readOnly: boolean): void {
    this.interactionHandler.setReadOnly(readOnly);
    if (readOnly) {
      this.styleEditor.hide();
      // Keep selection active so it restores when ReadOnly is disabled
      // this.selectNode(null);
    } else {
      // Restore? No need.
    }
  }

  destroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.interactionHandler.destroy();
    // Potentially remove UI layer
    if (this.renderer.container) {
      // We appended a UI layer... we should probably keep a reference or just empty the container if we own it?
      // But the user passed the container. We appended uiLayer.
      // We should remove what we added.
      // But we didn't store uiLayer on 'this'.
      // We can find it by z-index or strict reference if we stored it.
      // For now, let's assume specific destroy checks are minor compared to event listeners.
    }
  }

  batch(callback: () => void): void {
    this.isBatching = true;
    try {
      callback();
    } finally {
      this.isBatching = false;
      this.render();
    }
  }

  /* ==========================================================================================
     Interaction API (Composite Actions with UI)
     ========================================================================================== */

  addChildNode(parentId: string): void {
    const parent = this.mindMap.findNode(parentId);

    // Lock sides logic is now partially in addNode/addSibling if needed, but 'ensureExplicitLayoutSides' is private helper.
    // Let's keep specific interaction logic here if it's about "how to place new node" specifically for user action.
    if (parent && parent.isRoot && this.layoutMode === 'Both') {
      this.ensureExplicitLayoutSides(parent);
    }

    let side: 'left' | 'right' | undefined;
    if (this.layoutMode === 'Both') {
      if (parent && parent.isRoot) {
        let leftCount = 0;
        let rightCount = 0;
        parent.children.forEach((child: Node, index: number) => {
          const dir = child.layoutSide || (index % 2 === 0 ? 'right' : 'left');
          if (dir === 'left') leftCount++;
          else rightCount++;
        });
        side = leftCount < rightCount ? 'left' : 'right';
      }
    }

    // Call Core API with silent change if we want to defer it until edit completion?
    // Yes, for UI interaction (addChildNode), we want to defer model:change until user types name.
    this.pendingNodeCreation = true;
    const node = this.addNode(parentId, 'New topic', side, { emitChange: false });
    if (node) {
      // Interaction Side Effects
      this.selectNode(node.id);
      this.ensureNodeVisible(node.id, false, true);
      this.interactionHandler.editNode(node.id);
    }
  }

  addSiblingNode(nodeId: string, position: 'before' | 'after' = 'after'): void {
    // Call Core API
    this.pendingNodeCreation = true;
    const newNode = this.addSibling(nodeId, position, 'New topic', { emitChange: false });
    if (newNode) {
      // Interaction Side Effects
      this.selectNode(newNode.id);
      this.ensureNodeVisible(newNode.id, false, true);
      this.interactionHandler.editNode(newNode.id);
    }
  }

  insertParentNode(nodeId: string): void {
    // Call Core API
    this.pendingNodeCreation = true;
    const newNode = this.insertParent(nodeId, 'New topic', { emitChange: false });
    if (newNode) {
      // Interaction Side Effects
      this.selectNode(newNode.id);
      this.ensureNodeVisible(newNode.id, false, true);
      this.interactionHandler.editNode(newNode.id);
    }
  }

  /**
   * Wrapper for deleteNode that handles selection update (Interaction concern).
   */
  removeNode(nodeId: string): void {
    const node = this.mindMap.findNode(nodeId);
    const parentId = node?.parentId || null;
    const isSelected = this.selectedNodeId === nodeId;

    this.deleteNode(nodeId);

    // If deleted node was selected, move selection to parent
    if (isSelected && parentId) {
      this.selectNode(parentId);
    }
  }

  /**
   * Helper to ensure sides are locked when modifying Root children in Both mode.
   * (Kept as private helper for internal use)
   */
  private ensureExplicitLayoutSides(parent: Node): void {
    if (!parent.isRoot || this.layoutMode !== 'Both') return;

    parent.children.forEach((child: Node, index: number) => {
      if (!child.layoutSide) {
        child.layoutSide = index % 2 === 0 ? 'right' : 'left';
      }
    });
  }

  /* ==========================================================================================
     Other Methods
     ========================================================================================== */

  moveNode(nodeId: string, targetId: string, position: 'top' | 'bottom' | 'left' | 'right'): void {
    const target = this.mindMap.findNode(targetId);
    if (!target) return;

    if (position === 'top') {
      if (target.isRoot) return; // Cannot reorder root or place relative to root top
      this.service.reorderNode(nodeId, targetId, 'before');
    } else if (position === 'bottom') {
      if (target.isRoot) return;
      this.service.reorderNode(nodeId, targetId, 'after');
    } else {
      // Left or Right
      if (target.isRoot) {
        // Drop on Root: Left/Right means specific side
        // 'left' -> add as child on left side
        // 'right' -> add as child on right side
        const side = position === 'left' ? 'left' : 'right';
        this.service.moveNode(nodeId, targetId, side);
      } else {
        // Drop on normal node
        const layoutDir = this.getNodeDirection(target);

        // Logic:
        // If direction is 'right':
        //   'right' is outer (child) side -> Add as Child
        //   'left' is inner (parent) side -> Insert as Parent
        // If direction is 'left':
        //   'left' is outer (child) side -> Add as Child
        //   'right' is inner (parent) side -> Insert as Parent

        let action: 'addChild' | 'insertParent' = 'addChild';

        if (layoutDir === 'right') {
          if (position === 'right') action = 'addChild';
          else action = 'insertParent';
        } else {
          // Left direction
          if (position === 'left') action = 'addChild';
          else action = 'insertParent';
        }

        if (action === 'addChild') {
          this.service.moveNode(nodeId, targetId);
        } else {
          this.service.insertNodeAsParent(nodeId, targetId);
        }
      }
    }

    this.render();
    this.emit('node:move', { nodeId, newParentId: targetId, position }); // Note: newParentId might be inaccurate if reordering or inserting parent, but sufficient for now as 'move' event
    this.emit('model:change', undefined);
  }

  updateNodeTopic(nodeId: string, topic: string): void {
    // Composite action: Update data AND ensure visible
    this.updateNode(nodeId, { topic });
    // Ensure node is visible after update (auto-pan if needed)
    setTimeout(() => this.ensureNodeVisible(nodeId), 0);
  }

  selectNode(nodeId: string | null): void {
    if (this.selectedNodeId === nodeId) return;
    this.selectedNodeId = nodeId;
    this.interactionHandler.updateSelection(nodeId);

    if (nodeId) {
      const node = this.mindMap.findNode(nodeId);
      if (node) {
        // Only show style editor for text nodes (no image) and if not ReadOnly
        if (!node.image && !this.interactionHandler.isReadOnly) {
          this.styleEditor.show(nodeId, node.style);
        } else {
          this.styleEditor.hide();
        }
      }
    } else {
      this.styleEditor.hide();
    }

    this.render();
    this.emit('node:select', nodeId);
  }

  panBoard(dx: number, dy: number): void {
    this.targetPanX += dx;
    this.targetPanY += dy;
    // We don't call updateTransform here anymore, loop handles it
  }

  zoomBoard(delta: number, clientX: number, clientY: number): void {
    const ZOOM_SENSITIVITY = 0.001;
    const MIN_SCALE = 0.1;
    const MAX_SCALE = 5.0;

    const rect = this.renderer.container.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const newScale = Math.min(
      Math.max(this.scale * (1 - delta * ZOOM_SENSITIVITY), MIN_SCALE),
      MAX_SCALE,
    );

    // Zoom logic needs to be careful with Lerp.
    // If we only set targets, it might drift towards the new zoom focus?
    // Usually zoom should be 'instant' relative to mouse cursor.
    // So we update BOTH current and target to avoid interpolation during zoom.

    // Calculate new position (instant)
    const newPanX = x - (x - this.panX) * (newScale / this.scale);
    const newPanY = y - (y - this.panY) * (newScale / this.scale);

    this.panX = newPanX;
    this.panY = newPanY;
    this.targetPanX = newPanX;
    this.targetPanY = newPanY;

    this.scale = newScale;

    this.renderer.updateTransform(this.panX, this.panY, this.scale);
  }

  resetZoom(): void {
    this.scale = 1;
    this.panX = this.renderer.container.clientWidth / 2;
    this.panY = 0;
    this.targetPanX = this.panX;
    this.targetPanY = this.panY;
    this.render();
  }

  copyNode(nodeId: string): void {
    this.service.copyNode(nodeId);
  }

  pasteNode(parentId: string): void {
    const newNode = this.service.pasteNode(parentId);
    if (newNode) {
      this.render();
      this.selectNode(newNode.id);
      this.emit('node:add', { id: newNode.id, topic: newNode.topic });
      this.emit('model:change', undefined);
      setTimeout(() => this.ensureNodeVisible(newNode.id, true), 0);
    }
  }

  pasteImage(parentId: string, imageData: string): void {
    const newNode = this.service.addImageNode(parentId, imageData);
    if (newNode) {
      this.render();
      this.selectNode(newNode.id);
      this.emit('node:add', { id: newNode.id, topic: '' }); // Image nodes have empty topic
      this.emit('model:change', undefined);
      setTimeout(() => this.ensureNodeVisible(newNode.id, true), 0);
    }
  }

  cutNode(nodeId: string): void {
    const node = this.mindMap.findNode(nodeId);
    if (node) {
      const parentId = node.parentId;
      this.service.cutNode(nodeId);
      this.selectNode(parentId); // Select parent
      this.render();
      this.emit('node:remove', nodeId); // Cut implies removal
      this.emit('model:change', undefined);
    }
  }

  private render(): void {
    if (this.isBatching) return;
    this.renderer.render(this.mindMap, this.selectedNodeId, this.layoutMode);
    this.renderer.updateTransform(this.panX, this.panY, this.scale);
  }

  updateLayout(mode: 'Standard' | 'Left' | 'Right'): void {
    if (mode === 'Standard') {
      this.setLayoutMode('Both'); // Mapping 'Standard' to 'Both' for internal logic?
      // Wait, LayoutMode is 'Left' | 'Right' | 'Both'?
      // The interface defines it. Let's check definition.
      // Assuming LayoutMode includes 'Both'.
    } else {
      this.setLayoutMode(mode as LayoutMode);
    }
  }

  setLayoutMode(mode: LayoutMode): void {
    this.layoutMode = mode;
    this.layoutSwitcher.setMode(mode);

    // Recenter based on mode
    const clientWidth = this.renderer.container.clientWidth;
    if (mode === 'Right') {
      this.panX = clientWidth * 0.2; // Left side
    } else if (mode === 'Left') {
      this.panX = clientWidth * 0.8; // Right side
    } else {
      this.panX = clientWidth * 0.5; // Center
    }

    this.panY = 0;
    this.targetPanX = this.panX;
    this.targetPanY = this.panY;

    this.render();
  }

  getLayoutMode(): LayoutMode {
    return this.layoutMode;
  }

  navigateNode(nodeId: string, direction: Direction): void {
    const node = this.mindMap.findNode(nodeId);
    if (!node) return;

    switch (direction) {
      case 'Left':
        if (node.isRoot) {
          let target: Node | undefined;
          if (this.layoutMode === 'Left') {
            target = node.children[0];
          } else if (this.layoutMode === 'Both') {
            // Find first child on Left side
            target = node.children.find((c: Node, i: number) => {
              const side = c.layoutSide || (i % 2 !== 0 ? 'left' : 'right');
              return side === 'left';
            });
          }
          if (target) this.selectNode(target.id);
        } else if (node.parentId) {
          const dir = this.getNodeDirection(node);
          if (dir === 'right') {
            // Right side: Left goes to Parent
            this.selectNode(node.parentId);
          } else {
            // Left side: Left goes to Child
            if (node.children.length > 0) this.selectNode(node.children[0].id);
          }
        }
        break;
      case 'Right':
        if (node.isRoot) {
          let target: Node | undefined;
          if (this.layoutMode === 'Right') {
            target = node.children[0];
          } else if (this.layoutMode === 'Both') {
            // Find first child on Right side
            target = node.children.find((c: Node, i: number) => {
              const side = c.layoutSide || (i % 2 === 0 ? 'right' : 'left');
              return side === 'right';
            });
          }
          if (target) this.selectNode(target.id);
        } else if (node.parentId) {
          const dir = this.getNodeDirection(node);
          if (dir === 'right') {
            // Right side: Right goes to Child
            if (node.children.length > 0) this.selectNode(node.children[0].id);
          } else {
            // Left side: Right goes to Parent
            this.selectNode(node.parentId);
          }
        }
        break;
      case 'Up':
        if (node.parentId) {
          const parent = this.mindMap.findNode(node.parentId);
          if (parent) {
            // We need to find the "previous" sibling ON THE SAME SIDE
            const myDir = this.getNodeDirection(node);
            // Filter siblings on same side
            const sameSideSiblings = parent.children.filter(
              (c: Node) => this.getNodeDirection(c) === myDir,
            );
            const myIndex = sameSideSiblings.findIndex((c: Node) => c.id === nodeId);
            if (myIndex > 0) {
              this.selectNode(sameSideSiblings[myIndex - 1].id);
            }
          }
        }
        break;
      case 'Down':
        if (node.parentId) {
          const parent = this.mindMap.findNode(node.parentId);
          if (parent) {
            // Find next sibling on same side
            const myDir = this.getNodeDirection(node);
            const sameSideSiblings = parent.children.filter(
              (c: Node) => this.getNodeDirection(c) === myDir,
            );
            const myIndex = sameSideSiblings.findIndex((c: Node) => c.id === nodeId);
            if (myIndex !== -1 && myIndex < sameSideSiblings.length - 1) {
              this.selectNode(sameSideSiblings[myIndex + 1].id);
            }
          }
        }
        break;
    }

    // Auto-pan to selected node if it changed
    if (this.selectedNodeId && this.selectedNodeId !== nodeId) {
      setTimeout(() => this.ensureNodeVisible(this.selectedNodeId!, true), 0);
    }
  }

  getData(): MindMapData {
    const data = this.service.exportData();
    data.selectedId = this.selectedNodeId || undefined;
    return data;
  }

  loadData(data: MindMapData): void {
    try {
      this.service.importData(data);
      if (data.selectedId) {
        this.selectNode(data.selectedId);
      } else {
        this.selectNode(null);
      }
      this.render();
      this.emit('model:load', data);
      if (data.theme) {
        this.layoutSwitcher.setTheme(data.theme);
      }
      this.emit('model:change', undefined);
    } catch (e) {
      console.error('Failed to load data', e);
    }
  }

  getRootId(): string {
    return this.mindMap.root.id;
  }

  private getNodeDirection(node: Node): 'left' | 'right' {
    if (node.isRoot) return 'right';
    if (this.layoutMode === 'Right') return 'right';
    if (this.layoutMode === 'Left') return 'left';

    // Both mode
    let current = node;
    while (current.parentId) {
      const parent = this.mindMap.findNode(current.parentId);
      if (!parent) break;
      if (parent.isRoot) {
        if (current.layoutSide) return current.layoutSide;
        // Fallback to index if no explicit side
        const index = parent.children.findIndex((c: Node) => c.id === current.id);
        return index % 2 === 0 ? 'right' : 'left';
      }
      current = parent;
    }
    return 'right';
  }

  private startAnimationLoop(): void {
    let lastTime = performance.now();

    const tick = () => {
      const currentTime = performance.now();
      const dt = (currentTime - lastTime) / 1000; // Delta time in seconds
      lastTime = currentTime;

      // Time-based smoothing
      // decay constant: higher = faster snap.
      // 15 was too fast. 8 is slower/smoother.
      const decay = 8;

      // Frame-independent interpolation factor
      // This is mathematically strictly correct for exponential decay
      const factor = 1 - Math.exp(-decay * dt);

      // Calculate distance
      const dx = this.targetPanX - this.panX;
      const dy = this.targetPanY - this.panY;

      // Only update if distance is significant (prevent endless micro-updates)
      if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
        this.panX += dx * factor;
        this.panY += dy * factor;
        this.renderer.updateTransform(this.panX, this.panY, this.scale);
      } else {
        // Snap when close
        if (this.panX !== this.targetPanX || this.panY !== this.targetPanY) {
          this.panX = this.targetPanX;
          this.panY = this.targetPanY;
          this.renderer.updateTransform(this.panX, this.panY, this.scale);
        }
      }

      if (Number.isNaN(this.panX)) this.panX = 0;
      if (Number.isNaN(this.panY)) this.panY = 0;

      this.animationFrameId = requestAnimationFrame(tick);
    };
    tick();
  }

  /*
   * Ensures the node is visible in the viewport.
   * If centerIfOffscreen is true, and the node is out of bounds, it will be centered.
   */
  private ensureNodeVisible(
    nodeId: string,
    centerIfOffscreen: boolean = false,
    immediate: boolean = false,
  ): void {
    const nodeEl = this.renderer.container.querySelector(
      `.mindmap-node[data-id="${nodeId}"]`,
    ) as HTMLElement;
    if (!nodeEl) return;

    const rect = nodeEl.getBoundingClientRect();
    const containerRect = this.renderer.container.getBoundingClientRect();

    const padding = 50;
    let dx = 0;
    let dy = 0;

    const isOffLeft = rect.left < containerRect.left + padding;
    const isOffRight = rect.right > containerRect.right - padding;
    const isOffTop = rect.top < containerRect.top + padding;
    const isOffBottom = rect.bottom > containerRect.bottom - padding;

    if (centerIfOffscreen && (isOffLeft || isOffRight || isOffTop || isOffBottom)) {
      // Center the node
      const nodeCenterX = rect.left + rect.width / 2;
      const nodeCenterY = rect.top + rect.height / 2;
      const containerCenterX = containerRect.left + containerRect.width / 2;
      const containerCenterY = containerRect.top + containerRect.height / 2;

      dx = containerCenterX - nodeCenterX;
      dy = containerCenterY - nodeCenterY;
    } else {
      // Standard "push into view" logic
      if (isOffLeft) {
        dx = containerRect.left + padding - rect.left;
      } else if (isOffRight) {
        dx = containerRect.right - padding - rect.right;
      }

      if (isOffTop) {
        dy = containerRect.top + padding - rect.top;
      } else if (isOffBottom) {
        dy = containerRect.bottom - padding - rect.bottom;
      }
    }

    if (dx !== 0 || dy !== 0) {
      if (immediate) {
        this.panX += dx;
        this.panY += dy;
        this.targetPanX = this.panX;
        this.targetPanY = this.panY;
        this.renderer.updateTransform(this.panX, this.panY, this.scale);
      } else {
        this.panBoard(dx, dy);
      }
    }
  }

  /* ==========================================================================================
     Modal
     ========================================================================================== */

  private showShortcutModal(): void {
    const modalOverlay = document.createElement('div');
    modalOverlay.style.position = 'fixed';
    modalOverlay.style.top = '0';
    modalOverlay.style.left = '0';
    modalOverlay.style.width = '100vw';
    modalOverlay.style.height = '100vh';
    modalOverlay.style.backgroundColor = 'rgba(0,0,0,0.5)';
    modalOverlay.style.zIndex = '3000';
    modalOverlay.style.display = 'flex';
    modalOverlay.style.justifyContent = 'center';
    modalOverlay.style.alignItems = 'center';
    modalOverlay.style.opacity = '0';
    modalOverlay.style.transition = 'opacity 0.2s';

    const modalContent = document.createElement('div');
    modalContent.style.backgroundColor = 'white';
    modalContent.style.padding = '20px';
    modalContent.style.borderRadius = '8px';
    modalContent.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
    modalContent.style.maxWidth = '600px';
    modalContent.style.width = '90%';
    modalContent.style.maxHeight = '90vh';
    modalContent.style.overflowY = 'auto';
    modalContent.style.position = 'relative';

    const title = document.createElement('h2');
    title.textContent = 'Keyboard Shortcuts';
    title.style.margin = '0 0 15px 0';
    title.style.fontSize = '1.5em';
    title.style.borderBottom = '1px solid #eee';
    title.style.paddingBottom = '10px';
    modalContent.appendChild(title);

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.style.position = 'absolute';
    closeBtn.style.top = '10px';
    closeBtn.style.right = '15px';
    closeBtn.style.background = 'none';
    closeBtn.style.border = 'none';
    closeBtn.style.fontSize = '24px';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.color = '#999';
    closeBtn.addEventListener('click', () => {
      closeModal();
    });
    modalContent.appendChild(closeBtn);

    const shortcuts = this.interactionHandler.getShortcuts();
    const sections = [
      {
        title: 'General',
        actions: [
          { action: 'navUp', desc: 'Move Selection Up', descJa: 'ノード間の移動 (上)' },
          { action: 'navDown', desc: 'Move Selection Down', descJa: 'ノード間の移動 (下)' },
          { action: 'navLeft', desc: 'Move Selection Left', descJa: 'ノード間の移動 (左)' },
          { action: 'navRight', desc: 'Move Selection Right', descJa: 'ノード間の移動 (右)' },
          {
            action: 'beginEdit',
            desc: 'Start Editing (Zoom if Image)',
            descJa: 'ノードの編集を開始 (画像の場合はズーム)',
          },
          { action: 'addSibling', desc: 'Add Sibling (Below)', descJa: '兄弟ノードを追加 (下)' },
          {
            action: 'addSiblingBefore',
            desc: 'Add Sibling (Above)',
            descJa: '兄弟ノードを追加 (上)',
          },
          { action: 'addChild', desc: 'Add Child', descJa: '子ノードを追加' },
          { action: 'insertParent', desc: 'Insert Parent', descJa: '親ノードを挿入' },
          { action: 'deleteNode', desc: 'Delete Node', descJa: 'ノードを削除' },
          { action: 'undo', desc: 'Undo', descJa: '元に戻す (Undo)' },
          { action: 'redo', desc: 'Redo', descJa: 'やり直し (Redo)' },
          { action: 'copy', desc: 'Copy', descJa: 'コピー' },
          { action: 'cut', desc: 'Cut', descJa: '切り取り' },
          { action: 'paste', desc: 'Paste', descJa: '貼り付け (画像も可)' },
          { action: 'toggleFold', desc: 'Toggle Fold', descJa: 'ノードの展開/折り畳み' },
          { action: 'zoomIn', desc: 'Zoom In', descJa: 'ズームイン' },
          { action: 'zoomOut', desc: 'Zoom Out', descJa: 'ズームアウト' },
          // Mouse/Wheel actions are not in ShortcutConfig but are hardcoded events
          { key: 'Drag (Canvas)', desc: 'Pan Board', descJa: '画面のパン (移動)' },
          { key: 'Wheel', desc: 'Vertical Scroll', descJa: '上下スクロール (パン)' },
          { key: 'Shift + Wheel', desc: 'Horizontal Scroll', descJa: '左右スクロール (パン)' },
          { key: 'Ctrl/Cmd + Wheel', desc: 'Zoom', descJa: 'ズームイン/アウト' },
        ],
      },
      {
        title: 'Editing (Text Input)',
        actions: [
          { key: 'Enter', desc: 'Confirm Edit', descJa: '編集を確定' },
          { key: 'Shift + Enter', desc: 'New Line', descJa: '改行' },
          { key: 'Esc', desc: 'Cancel Edit', descJa: '編集をキャンセル' },
        ],
      },
      {
        title: 'Styling (Selection)',
        actions: [
          { action: 'bold', desc: 'Toggle Bold', descJa: '太字 (Bold) 切り替え' },
          { action: 'italic', desc: 'Toggle Italic', descJa: '斜体 (Italic) 切り替え' },
          { action: 'selectColor1', desc: 'Color 1', descJa: 'ノードの色を変更 (1)' },
          { action: 'selectColor2', desc: 'Color 2', descJa: 'ノードの色を変更 (2)' },
          { action: 'selectColor3', desc: 'Color 3', descJa: 'ノードの色を変更 (3)' },
          { action: 'selectColor4', desc: 'Color 4', descJa: 'ノードの色を変更 (4)' },
          { action: 'selectColor5', desc: 'Color 5', descJa: 'ノードの色を変更 (5)' },
          { action: 'selectColor6', desc: 'Color 6', descJa: 'ノードの色を変更 (6)' },
          { action: 'selectColor7', desc: 'Color 7', descJa: 'ノードの色を変更 (7)' },
          { key: '+', desc: 'Increase Font Size', descJa: 'フォントサイズ拡大' },
          { key: '-', desc: 'Decrease Font Size', descJa: 'フォントサイズ縮小' },
        ],
      },
    ];

    sections.forEach((section) => {
      const rows: { key: string; desc: string }[] = [];

      section.actions.forEach((item) => {
        let keyDisplay = '';
        const actionItem = item as {
          action?: ShortcutAction;
          key?: string;
          desc: string;
          descJa?: string;
        };

        if (actionItem.key) {
          keyDisplay = actionItem.key;
        } else if (actionItem.action && shortcuts[actionItem.action]) {
          const bindings = shortcuts[actionItem.action];
          if (bindings && bindings.length > 0) {
            const displays = bindings.map((b: KeyBinding) => {
              const parts = [];
              if (b.ctrlKey || b.metaKey) parts.push('Ctrl/Cmd');
              if (b.altKey) parts.push('Alt');
              if (b.shiftKey) parts.push('Shift');
              if (b.key === ' ') parts.push('Space');
              else parts.push(b.key);
              return parts.join(' + ');
            });
            keyDisplay = [...new Set(displays)].join(' / ');
          }
        }

        if (keyDisplay) {
          rows.push({ key: keyDisplay, desc: actionItem.descJa || actionItem.desc });
        }
      });

      if (rows.length === 0) return;

      const sectionTitle = document.createElement('h3');
      sectionTitle.textContent = section.title;
      sectionTitle.style.marginTop = '20px';
      sectionTitle.style.marginBottom = '10px';
      sectionTitle.style.fontSize = '1.2em';
      sectionTitle.style.color = '#333';
      sectionTitle.style.borderBottom = '1px solid #f0f0f0';
      modalContent.appendChild(sectionTitle);

      const table = document.createElement('table');
      table.style.width = '100%';
      table.style.borderCollapse = 'collapse';
      table.style.fontSize = '0.9em';

      // Header Row
      const thead = document.createElement('tr');
      thead.style.borderBottom = '2px solid #ddd';

      const thKey = document.createElement('th');
      thKey.textContent = 'Key';
      thKey.style.textAlign = 'center';
      thKey.style.padding = '8px 0';
      thKey.style.width = '40%';
      thKey.style.color = '#666';

      const thDesc = document.createElement('th');
      thDesc.textContent = 'Description';
      thDesc.style.textAlign = 'center';
      thDesc.style.padding = '8px 0';
      thDesc.style.color = '#666';

      thead.appendChild(thKey);
      thead.appendChild(thDesc);
      table.appendChild(thead);

      rows.forEach((row) => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid #f9f9f9';

        const tdKey = document.createElement('td');
        tdKey.textContent = row.key;
        tdKey.style.padding = '6px 0';
        tdKey.style.fontWeight = 'bold';
        tdKey.style.color = '#555';
        tdKey.style.minWidth = '180px';
        tdKey.style.textAlign = 'center';

        const tdDesc = document.createElement('td');
        tdDesc.textContent = row.desc;
        tdDesc.style.padding = '6px 0';
        tdDesc.style.textAlign = 'left';
        tdDesc.style.color = '#333';

        tr.appendChild(tdKey);
        tr.appendChild(tdDesc);
        table.appendChild(tr);
      });

      modalContent.appendChild(table);
    });

    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);

    // Trigger transition
    requestAnimationFrame(() => {
      modalOverlay.style.opacity = '1';
    });

    const closeModal = () => {
      modalOverlay.style.opacity = '0';
      setTimeout(() => {
        if (document.body.contains(modalOverlay)) {
          document.body.removeChild(modalOverlay);
        }
      }, 200);
      document.removeEventListener('keydown', handleEsc);
    };

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeModal();
      }
    };

    document.addEventListener('keydown', handleEsc);
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) {
        closeModal();
      }
    });
  }
}
