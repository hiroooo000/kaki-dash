import { Node } from './Node';
import { Theme } from '../interfaces/MindMapData';

export class MindMap {
  root: Node;
  theme: Theme = 'default';

  constructor(rootNode: Node) {
    this.root = rootNode;
  }

  findNode(id: string): Node | null {
    return this.findNodeRecursive(this.root, id);
  }

  private findNodeRecursive(current: Node, id: string): Node | null {
    if (current.id === id) {
      return current;
    }
    for (const child of current.children) {
      const found = this.findNodeRecursive(child, id);
      if (found) {
        return found;
      }
    }
    return null;
  }

  moveNode(nodeId: string, newParentId: string): boolean {
    const node = this.findNode(nodeId);
    const newParent = this.findNode(newParentId);

    if (!node || !newParent) return false;
    if (node.isRoot) return false; // Cannot move root
    if (node.parentId === newParentId) return false; // Already there

    // Cycle detection: cannot move to a descendant
    if (this.isDescendant(node, newParentId)) return false;

    // Remove from old parent
    if (node.parentId) {
      const oldParent = this.findNode(node.parentId);
      if (oldParent) {
        oldParent.removeChild(nodeId);
      }
    }

    // Add to new parent
    newParent.addChild(node);
    return true;
  }

  addSibling(referenceId: string, newNode: Node, position: 'before' | 'after'): boolean {
    const referenceNode = this.findNode(referenceId);
    if (!referenceNode || !referenceNode.parentId) return false; // Root has no siblings

    const parent = this.findNode(referenceNode.parentId);
    if (!parent) return false;

    const index = parent.children.findIndex((child) => child.id === referenceId);
    if (index === -1) return false;

    const insertIndex = position === 'before' ? index : index + 1;
    parent.insertChild(newNode, insertIndex);
    return true;
  }

  insertParent(targetId: string, newParentNode: Node): boolean {
    const targetNode = this.findNode(targetId);
    if (!targetNode || !targetNode.parentId) return false; // Cannot insert parent for root

    const currentParent = this.findNode(targetNode.parentId);
    if (!currentParent) return false;

    // 1. Determine the index of the target node in the current parent
    const index = currentParent.children.findIndex((c) => c.id === targetId);
    if (index === -1) return false;

    // 2. Remove target node from current parent
    // We use splice to remove it but we need to reference the node instance, which we already have in 'targetNode'
    currentParent.removeChild(targetId);

    // 3. Insert the new parent node at the same position
    currentParent.insertChild(newParentNode, index);

    // 4. Add the target node as a child of the new parent
    newParentNode.addChild(targetNode);

    return true;
  }

  private isDescendant(ancestor: Node, targetId: string): boolean {
    if (ancestor.id === targetId) return true;
    for (const child of ancestor.children) {
      if (this.isDescendant(child, targetId)) return true;
    }
    return false;
  }
}
