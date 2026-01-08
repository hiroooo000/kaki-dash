import { MindMap } from './domain/entities/MindMap';
import { Node } from './domain/entities/Node';
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
  private scale: number = 1;

  constructor(container: HTMLElement) {
    super();
    const rootNode = new Node('root', 'Root Topic', null, true);
    this.mindMap = new MindMap(rootNode);
    this.service = new MindMapService(this.mindMap);
    this.renderer = new SvgRenderer(container);

    this.styleEditor = new StyleEditor(container);
    this.styleEditor.onUpdate = (nodeId, style) => {
      if (this.service.updateNodeStyle(nodeId, style)) {
        this.render();
        this.emit('model:change', undefined);
      }
    };

    // Center the board horizontally.
    this.panX = container.clientWidth / 2;

    this.layoutSwitcher = new LayoutSwitcher(container, {
      onLayoutChange: (mode) => this.setLayoutMode(mode),
      onZoomReset: () => this.resetZoom()
    });

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
      onZoom: (delta, x, y) => this.zoomBoard(delta, x, y)
    });

    this.render();
  }

  addNode(parentId: string, topic?: string, layoutSide?: 'left' | 'right'): Node | null {
    const node = this.service.addNode(parentId, topic, layoutSide);
    if (node) {
      this.render();
      this.emit('node:add', { id: node.id, topic: node.topic });
      this.emit('model:change', undefined);
    }
    return node;
  }

  addChildNode(parentId: string): void {
    const parent = this.mindMap.findNode(parentId);

    // Lock existing sides before adding new node in Both mode
    if (parent && parent.isRoot && this.layoutMode === 'Both') {
      this.ensureExplicitLayoutSides(parent);
    }

    let side: 'left' | 'right' | undefined;

    // Auto-balance logic for Root in Both mode
    if (this.layoutMode === 'Both') {
      if (parent && parent.isRoot) {
        let leftCount = 0;
        let rightCount = 0;
        parent.children.forEach((child: Node, index: number) => {
          // Now most children should have layoutSide, but fallback just in case
          const dir = child.layoutSide || (index % 2 === 0 ? 'right' : 'left');
          if (dir === 'left') leftCount++;
          else rightCount++;
        });
        side = leftCount < rightCount ? 'left' : 'right';
      }
    }

    const node = this.addNode(parentId, 'New Child', side);
    if (node) {
      this.selectNode(node.id);
      // Auto-edit new node
      this.interactionHandler.editNode(node.id);
    }
  }

  addSiblingNode(nodeId: string, position: 'before' | 'after' = 'after'): void {
    const node = this.mindMap.findNode(nodeId);
    if (node && node.parentId) {
      const parent = this.mindMap.findNode(node.parentId);

      // Lock existing sides before adding new sibling if parent is Root and in Both mode
      if (parent && parent.isRoot && this.layoutMode === 'Both') {
        this.ensureExplicitLayoutSides(parent);
      }

      const newNode = this.service.addSibling(nodeId, position, 'New Sibling');
      if (newNode) {
        // Inherit layoutSide if sibling of Root
        if (parent && parent.isRoot && this.layoutMode === 'Both') {
          // If existing node has explicit side, copy it.
          // If not, infer it (though ensureExplicitLayoutSides should have set it just now).
          const currentSide = node.layoutSide || (parent.children.indexOf(node) % 2 === 0 ? 'right' : 'left');
          newNode.layoutSide = currentSide;
        }

        this.render();
        this.selectNode(newNode.id);
        this.emit('node:add', { id: newNode.id, topic: newNode.topic });
        this.emit('model:change', undefined);

        // Auto-edit new node
        this.interactionHandler.editNode(newNode.id);
      }
    }
  }

  private ensureExplicitLayoutSides(parent: Node): void {
    if (!parent.isRoot || this.layoutMode !== 'Both') return;

    parent.children.forEach((child: Node, index: number) => {
      if (!child.layoutSide) {
        child.layoutSide = index % 2 === 0 ? 'right' : 'left';
      }
    });
  }

  insertParentNode(nodeId: string): void {
    const newNode = this.service.insertParent(nodeId, 'New Parent');
    if (newNode) {
      this.render();
      this.selectNode(newNode.id);
      this.emit('node:add', { id: newNode.id, topic: newNode.topic });
      this.emit('model:change', undefined);

      // Auto-edit new node
      this.interactionHandler.editNode(newNode.id);
    }
  }

  removeNode(nodeId: string): void {
    if (this.service.removeNode(nodeId)) {
      if (this.selectedNodeId === nodeId) {
        this.selectNode(null); // Deselect
      } else {
        this.render();
      }
      this.emit('node:remove', nodeId);
      this.emit('model:change', undefined);
    }
  }

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
    this.emit('node:move', { nodeId, newParentId: targetId }); // Note: newParentId might be inaccurate if reordering or inserting parent, but sufficient for now as 'move' event
    this.emit('model:change', undefined);
  }

  updateNodeTopic(nodeId: string, topic: string): void {
    if (this.service.updateNodeTopic(nodeId, topic)) {
      this.render();
      this.emit('node:update', { id: nodeId, topic });
      this.emit('model:change', undefined);
    }
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
    this.panX += dx;
    this.panY += dy;
    this.renderer.updateTransform(this.panX, this.panY, this.scale);
  }

  zoomBoard(delta: number, clientX: number, clientY: number): void {
    const ZOOM_SENSITIVITY = 0.001;
    const MIN_SCALE = 0.1;
    const MAX_SCALE = 5.0;

    const rect = this.renderer.container.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const newScale = Math.min(Math.max(this.scale * (1 - delta * ZOOM_SENSITIVITY), MIN_SCALE), MAX_SCALE);

    this.panX = x - (x - this.panX) * (newScale / this.scale);
    this.panY = y - (y - this.panY) * (newScale / this.scale);

    this.scale = newScale;

    this.renderer.updateTransform(this.panX, this.panY, this.scale);
  }

  resetZoom(): void {
    this.scale = 1;
    this.panX = this.renderer.container.clientWidth / 2;
    this.panY = 0;
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
      this.service.cutNode(nodeId);
      this.selectNode(null); // Deselect the cut node
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

    // Recenter
    this.panX = this.renderer.container.clientWidth / 2;
    this.panY = 0;

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
            const sameSideSiblings = parent.children.filter((c: Node) => this.getNodeDirection(c) === myDir);
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
            const sameSideSiblings = parent.children.filter((c: Node) => this.getNodeDirection(c) === myDir);
            const myIndex = sameSideSiblings.findIndex((c: Node) => c.id === nodeId);
            if (myIndex !== -1 && myIndex < sameSideSiblings.length - 1) {
              this.selectNode(sameSideSiblings[myIndex + 1].id);
            }
          }
        }
        break;
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
      console.error("Failed to load data", e);
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
}
