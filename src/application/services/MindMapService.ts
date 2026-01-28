import { MindMap } from '../../domain/entities/MindMap';
import { Node } from '../../domain/entities/Node';
import { MindMapData, MindMapNodeData } from '../../domain/interfaces/MindMapData';
import { HistoryManager } from './HistoryManager';
import { IdGenerator } from '../../domain/interfaces/IdGenerator';

export class MindMapService {
  mindMap: MindMap;
  private historyManager: HistoryManager<MindMapData>;
  private idGenerator: IdGenerator;

  constructor(mindMap: MindMap, idGenerator: IdGenerator) {
    this.mindMap = mindMap;
    this.historyManager = new HistoryManager<MindMapData>(10);
    this.idGenerator = idGenerator;
  }

  private saveState(): void {
    this.historyManager.push(this.exportData());
  }

  undo(): boolean {
    const prevState = this.historyManager.undo(this.exportData());
    if (prevState) {
      this.importData(prevState);
      return true;
    }
    return false;
  }

  redo(): boolean {
    const nextState = this.historyManager.redo(this.exportData());
    if (nextState) {
      this.importData(nextState);
      return true;
    }
    return false;
  }

  get canUndo(): boolean {
    return this.historyManager.canUndo;
  }

  get canRedo(): boolean {
    return this.historyManager.canRedo;
  }

  addNode(
    parentId: string,
    topic: string = 'New topic',
    layoutSide?: 'left' | 'right',
  ): Node | null {
    const parent = this.mindMap.findNode(parentId);
    if (!parent) return null;

    this.saveState();

    const id = this.idGenerator.generate();
    const newNode = new Node(id, topic, null, false, undefined, layoutSide, false);
    parent.addChild(newNode);
    return newNode;
  }

  addImageNode(parentId: string, imageData: string): Node | null {
    const parent = this.mindMap.findNode(parentId);
    if (!parent) return null;

    this.saveState();

    const id = this.idGenerator.generate();
    // Image nodes have empty topic
    const newNode = new Node(id, '', parentId, false, imageData, undefined, false);
    parent.addChild(newNode);
    return newNode;
  }

  removeNode(id: string, saveState: boolean = true): boolean {
    const node = this.mindMap.findNode(id);
    if (!node || node.isRoot || !node.parentId) return false;

    const parent = this.mindMap.findNode(node.parentId);
    if (parent) {
      if (saveState) this.saveState();
      parent.removeChild(id);
      return true;
    }
    return false;
  }

  updateNodeTopic(id: string, topic: string): boolean {
    const node = this.mindMap.findNode(id);
    if (node) {
      this.saveState();
      node.updateTopic(topic);
      return true;
    }
    return false;
  }

  updateNodeStyle(
    id: string,
    style: Partial<import('../../domain/entities/Node').NodeStyle>,
  ): boolean {
    const node = this.mindMap.findNode(id);
    if (node) {
      this.saveState();
      node.style = { ...node.style, ...style };
      return true;
    }
    return false;
  }

  toggleNodeFold(id: string): boolean {
    const node = this.mindMap.findNode(id);
    if (node) {
      // Prevent folding if no children (but allow unfolding)
      if (node.children.length === 0 && !node.isFolded) {
        return false;
      }

      this.saveState();
      node.isFolded = !node.isFolded;
      return true;
    }
    return false;
  }

  setTheme(theme: import('../../domain/interfaces/MindMapData').Theme): void {
    if (this.mindMap.theme !== theme) {
      this.saveState();
      this.mindMap.theme = theme;
    }
  }

  moveNode(nodeId: string, newParentId: string, layoutSide?: 'left' | 'right'): boolean {
    // Handle side update for same parent (re-layout)
    const node = this.mindMap.findNode(nodeId);
    if (node && node.parentId === newParentId) {
      if (layoutSide && node.layoutSide !== layoutSide) {
        this.saveState();
        node.layoutSide = layoutSide;
        return true;
      }
      return false; // No change
    }

    // We check validity first roughly, but moveNode does internal checks.
    // Ideally we save state only if move succeeds, but saving before attempt is safer for undo if logic implies we are ABOUT to move.
    // However, if move fails, we added a redundant state.
    // Let's check finding node first to be sure it exists.
    if (!node) return false;

    this.saveState();

    if (this.mindMap.moveNode(nodeId, newParentId)) {
      if (layoutSide) {
        const movedNode = this.mindMap.findNode(nodeId);
        if (movedNode) movedNode.layoutSide = layoutSide;
      }
      return true;
    } else {
      // If move failed, we technically polluted history with an identical state.
      // But undoing it would just restore same state, so not critical.
      // Ideally we pop history, but HistoryManager doesn't expose pop.
      // HistoryManager logic: push current state.
      // If move fails, current state is still same.
      // If user un-does, they go to 'previous' state which is identical.
      // It's fine for now.
    }
    return false;
  }

  addSibling(
    referenceId: string,
    position: 'before' | 'after',
    topic: string = 'New topic',
  ): Node | null {
    const referenceNode = this.mindMap.findNode(referenceId);
    if (!referenceNode || !referenceNode.parentId) return null;

    this.saveState();

    const id = this.idGenerator.generate();
    const newNode = new Node(id, topic);

    if (this.mindMap.addSibling(referenceId, newNode, position)) {
      return newNode;
    }
    return null;
  }

  reorderNode(nodeId: string, targetId: string, position: 'before' | 'after'): boolean {
    const node = this.mindMap.findNode(nodeId);
    const target = this.mindMap.findNode(targetId);

    if (!node || !target || !target.parentId) return false;
    if (node.id === target.id) return false;

    // Cannot reorder root
    if (node.isRoot) return false;

    const parent = this.mindMap.findNode(target.parentId);
    if (!parent) return false;

    this.saveState();

    // Cycle detection if moving to new parent
    if (node.parentId !== parent.id) {
      // Check if parent is descendant of node
      let current = parent;
      while (current.parentId) {
        if (current.id === node.id) return false;
        if (!current.parentId) break;
        const next = this.mindMap.findNode(current.parentId);
        if (!next) break;
        current = next;
      }
    }

    // Remove from old parent if different
    if (node.parentId && node.parentId !== parent.id) {
      const oldParent = this.mindMap.findNode(node.parentId);
      if (oldParent) oldParent.removeChild(node.id);
      node.parentId = parent.id; // Update parent ID immediately so it acts as child
    } else if (node.parentId === parent.id) {
      // Remove from current position to re-insert
      parent.removeChild(node.id);
    }

    // Check if target is still in children? Yes.
    const targetIndex = parent.children.findIndex((c) => c.id === targetId);
    if (targetIndex === -1) {
      // Fallback: append
      parent.addChild(node);
      return true;
    }

    const insertIndex = position === 'before' ? targetIndex : targetIndex + 1;
    parent.insertChild(node, insertIndex);

    // Propagate potential side change if moving under Root
    if (parent.isRoot) {
      // Inherit side from target if possible?
      // If dragging Top/Bottom of a sibling, we generally want to stay on that side.
      // Target has a side.
      if (target.layoutSide) {
        node.layoutSide = target.layoutSide;
      }
    }

    return true;
  }

  insertNodeAsParent(nodeId: string, targetId: string): boolean {
    const node = this.mindMap.findNode(nodeId);
    const target = this.mindMap.findNode(targetId);

    if (!node || !target || !target.parentId) return false; // Cannot insert as parent of Root
    if (node.id === target.id) return false;

    // Cycle check
    const targetParent = this.mindMap.findNode(target.parentId);
    if (!targetParent) return false;

    let current = targetParent;
    while (current) {
      if (current.id === node.id) return false;
      if (!current.parentId) break;
      current = this.mindMap.findNode(current.parentId) as Node;
    }

    this.saveState();

    // Remove node from its old parent
    if (node.parentId) {
      const oldParent = this.mindMap.findNode(node.parentId);
      if (oldParent) oldParent.removeChild(node.id);
    }

    // Insert node into target's parent at target's index
    const index = targetParent.children.findIndex((c) => c.id === targetId);
    if (index === -1) return false;

    // Inherit layoutSide if replacing a node (especially under Root)
    if (targetParent.isRoot && target.layoutSide) {
      node.layoutSide = target.layoutSide;
    }

    targetParent.removeChild(targetId);
    targetParent.insertChild(node, index);
    node.parentId = targetParent.id;

    // Add target as child of node
    node.addChild(target);

    return true;
  }

  insertParent(targetId: string, topic: string = 'New topic'): Node | null {
    const targetNode = this.mindMap.findNode(targetId);
    if (!targetNode || !targetNode.parentId) return null;

    this.saveState();

    const id = this.idGenerator.generate();
    const newParentNode = new Node(id, topic);

    if (this.mindMap.insertParent(targetId, newParentNode)) {
      return newParentNode;
    }
    return null;
  }

  private clipboard: Node | null = null;

  copyNode(nodeId: string): void {
    const node = this.mindMap.findNode(nodeId);
    if (node) {
      this.clipboard = this.deepCloneNode(node);
      // Write to system clipboard to ensure we clear any previous image data
      // and to allow pasting text outside the app.
      if (navigator.clipboard) {
        navigator.clipboard.writeText(node.topic).catch((err) => {
          console.error('Failed to write to clipboard', err);
        });
      }
    }
  }

  cutNode(nodeId: string): void {
    const node = this.mindMap.findNode(nodeId);
    if (node && !node.isRoot && node.parentId) {
      this.copyNode(nodeId);
      // saveState is handled in removeNode if second arg is true (default)
      // But we want to treat CUT as one atomic operation regarding history?
      // "Cut" = Copy + Delete.
      this.removeNode(nodeId);
    }
  }

  pasteNode(parentId: string): Node | null {
    if (!this.clipboard) return null;

    const parent = this.mindMap.findNode(parentId);
    if (!parent) return null;

    this.saveState();

    // Clone again from clipboard to create new instance for the tree
    const newNode = this.deepCloneNode(this.clipboard);
    // Regenerate IDs for the new node and its children
    this.regenerateIds(newNode);

    parent.addChild(newNode);
    return newNode;
  }

  private deepCloneNode(node: Node): Node {
    const clone = new Node(
      node.id,
      node.topic,
      null,
      false,
      node.image,
      node.layoutSide,
      node.isFolded,
      node.icon,
    );
    clone.style = { ...node.style };
    // Determine how to handle children. Recursively clone them.
    clone.children = node.children.map((child) => this.deepCloneNode(child));
    // Fix parent relations for children after cloning
    clone.children.forEach((child) => (child.parentId = clone.id));
    return clone;
  }

  updateNodeIcon(id: string, icon: string): boolean {
    const node = this.mindMap.findNode(id);
    if (node) {
      this.saveState();
      if (icon === 'delete') {
        node.icon = undefined;
      } else {
        node.icon = icon;
      }
      return true;
    }
    return false;
  }

  private regenerateIds(node: Node): void {
    node.id = this.idGenerator.generate();
    node.children.forEach((child) => {
      child.parentId = node.id;
      this.regenerateIds(child);
    });
  }

  exportData(): MindMapData {
    const buildNodeData = (node: Node): MindMapNodeData => {
      const data: MindMapNodeData = {
        id: node.id,
        topic: node.topic,
        root: node.isRoot || undefined,
        children: node.children.length > 0 ? node.children.map(buildNodeData) : undefined,
        style: Object.keys(node.style).length > 0 ? node.style : undefined,
        image: node.image,
        layoutSide: node.layoutSide,
        isFolded: node.isFolded,
        icon: node.icon,
      };
      return data;
    };

    return {
      nodeData: buildNodeData(this.mindMap.root),
      theme: this.mindMap.theme,
    };
  }

  searchNodes(query: string): Node[] {
    if (!query) return [];
    const results: Node[] = [];
    const lowerQuery = query.toLowerCase();

    const traverse = (node: Node) => {
      if (node.topic.toLowerCase().includes(lowerQuery)) {
        results.push(node);
      }
      node.children.forEach(traverse);
    };

    traverse(this.mindMap.root);
    return results;
  }

  importData(data: MindMapData): void {
    const buildNodeFromData = (data: MindMapNodeData, parentId: string | null = null): Node => {
      const isRoot = !!data.root;
      const node = new Node(
        data.id,
        data.topic,
        parentId,
        isRoot,
        data.image,
        data.layoutSide,
        data.isFolded || false,
        data.icon,
      );

      if (data.style) {
        node.style = { ...data.style };
      }

      if (data.children && data.children.length > 0) {
        data.children.forEach((childData) => {
          const childNode = buildNodeFromData(childData, node.id);
          node.addChild(childNode);
        });
      }

      return node;
    };

    this.mindMap.root = buildNodeFromData(data.nodeData);
    if (data.theme) {
      this.mindMap.theme = data.theme;
    }
  }
}
