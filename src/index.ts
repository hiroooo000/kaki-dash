import { MindMap } from './domain/entities/MindMap';
import { Node, NodeStyle } from './domain/entities/Node';
import { MindMapService } from './application/MindMapService';
import { SvgRenderer } from './presentation/SvgRenderer';
import { StyleEditor } from './presentation/StyleEditor';
import { LayoutSwitcher } from './presentation/LayoutSwitcher';
import { InteractionHandler, Direction } from './presentation/InteractionHandler';
import { LayoutMode } from './domain/interfaces/LayoutMode';
import { MindMapData } from './domain/interfaces/MindMapData';
import { TypedEventEmitter } from './infrastructure/EventEmitter';
import { KakidashEventMap } from './domain/interfaces/KakidashEvents';

export type { MindMapData } from './domain/interfaces/MindMapData';
export type { KakidashEventMap } from './domain/interfaces/KakidashEvents';
export type { LayoutMode } from './domain/interfaces/LayoutMode';

export class Kakidash extends TypedEventEmitter<KakidashEventMap> {
  private mindMap: MindMap;
  private service: MindMapService;
  private renderer: SvgRenderer;
  private interactionHandler: InteractionHandler;
  private styleEditor: StyleEditor;
  private layoutSwitcher: LayoutSwitcher;
  private layoutMode: LayoutMode = 'Right';
  private selectedNodeId: string | null = null;

  private panX: number = 0;
  private panY: number = 0;
  private targetPanX: number = 0;
  private targetPanY: number = 0;
  private scale: number = 1;

  constructor(container: HTMLElement) {
    super();
    const rootNode = new Node('root', 'Root Topic', null, true);
    this.mindMap = new MindMap(rootNode);
    this.service = new MindMapService(this.mindMap);
    this.renderer = new SvgRenderer(container);

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
      onZoomReset: () => this.resetZoom(),
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
      onStyleAction: (nodeId, action) => {
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
    });

    this.render();
  }

  /* ==========================================================================================
     Core API (Pure Data Operations)
     ========================================================================================== */

  /**
   * Adds a new child node to the specified parent.
   * This is a pure data operation and does not trigger UI actions like auto-focus or scroll.
   */
  addNode(parentId: string, topic?: string, layoutSide?: 'left' | 'right'): Node | null {
    const node = this.service.addNode(parentId, topic, layoutSide);
    if (node) {
      this.render();
      this.emit('node:add', { id: node.id, topic: node.topic });
      this.emit('model:change', undefined);
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
    topic: string = 'New Sibling',
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
      this.emit('model:change', undefined);
    }
    return newNode;
  }

  /**
   * Inserts a parent node above the specified node.
   * This is a pure data operation.
   */
  insertParent(targetId: string, topic: string = 'New Parent'): Node | null {
    const newNode = this.service.insertParent(targetId, topic);
    if (newNode) {
      this.render();
      this.emit('node:add', { id: newNode.id, topic: newNode.topic });
      this.emit('model:change', undefined);
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
  updateNode(
    nodeId: string,
    updates: { topic?: string; style?: Partial<NodeStyle> },
  ): void {
    let changed = false;
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

    // Call Core API
    const node = this.addNode(parentId, 'New Child', side);
    if (node) {
      // Interaction Side Effects
      this.selectNode(node.id);
      this.ensureNodeVisible(node.id);
      this.interactionHandler.editNode(node.id);
    }
  }

  addSiblingNode(nodeId: string, position: 'before' | 'after' = 'after'): void {
    // Call Core API
    const newNode = this.addSibling(nodeId, position, 'New Sibling');
    if (newNode) {
      // Interaction Side Effects
      this.selectNode(newNode.id);
      this.ensureNodeVisible(newNode.id);
      this.interactionHandler.editNode(newNode.id);
    }
  }

  insertParentNode(nodeId: string): void {
    // Call Core API
    const newNode = this.insertParent(nodeId, 'New Parent');
    if (newNode) {
      // Interaction Side Effects
      this.selectNode(newNode.id);
      this.ensureNodeVisible(newNode.id);
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
        // Only show style editor for text nodes (no image)
        if (!node.image) {
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
    }
  }

  pasteImage(parentId: string, imageData: string): void {
    const newNode = this.service.addImageNode(parentId, imageData);
    if (newNode) {
      this.render();
      this.selectNode(newNode.id);
      this.emit('node:add', { id: newNode.id, topic: '' }); // Image nodes have empty topic
      this.emit('model:change', undefined);
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
    this.renderer.render(this.mindMap, this.selectedNodeId, this.layoutMode);
    this.renderer.updateTransform(this.panX, this.panY, this.scale);
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
    return this.service.exportData();
  }

  loadData(data: MindMapData): void {
    try {
      this.service.importData(data);
      this.selectNode(null);
      this.render();
      this.emit('model:load', data);
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

      requestAnimationFrame(tick);
    };
    tick();
  }

  /*
   * Ensures the node is visible in the viewport.
   * If centerIfOffscreen is true, and the node is out of bounds, it will be centered.
   */
  private ensureNodeVisible(nodeId: string, centerIfOffscreen: boolean = false): void {
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
      this.panBoard(dx, dy);
    }
  }
}
