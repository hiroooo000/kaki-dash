import { MindMap } from '../domain/entities/MindMap';
import { Node } from '../domain/entities/Node';

export class MindMapService {
    mindMap: MindMap;

    constructor(mindMap: MindMap) {
        this.mindMap = mindMap;
    }

    addNode(parentId: string, topic: string = 'New Node'): Node | null {
        const parent = this.mindMap.findNode(parentId);
        if (!parent) return null;

        const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substr(2);
        const newNode = new Node(id, topic);
        parent.addChild(newNode);
        return newNode;
    }

    removeNode(id: string): boolean {
        const node = this.mindMap.findNode(id);
        if (!node || node.isRoot || !node.parentId) return false;

        const parent = this.mindMap.findNode(node.parentId);
        if (parent) {
            parent.removeChild(id);
            return true;
        }
        return false;
    }

    updateNodeTopic(id: string, topic: string): boolean {
        const node = this.mindMap.findNode(id);
        if (node) {
            node.updateTopic(topic);
            return true;
        }
        return false;
    }

    moveNode(nodeId: string, newParentId: string): boolean {
        return this.mindMap.moveNode(nodeId, newParentId);
    }

    addSibling(referenceId: string, position: 'before' | 'after', topic: string = 'New Node'): Node | null {
        const referenceNode = this.mindMap.findNode(referenceId);
        if (!referenceNode || !referenceNode.parentId) return null;

        const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substr(2);
        const newNode = new Node(id, topic);

        if (this.mindMap.addSibling(referenceId, newNode, position)) {
            return newNode;
        }
        return null;
    }

    insertParent(targetId: string, topic: string = 'New Parent'): Node | null {
        const targetNode = this.mindMap.findNode(targetId);
        if (!targetNode || !targetNode.parentId) return null;

        const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substr(2);
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
        }
    }

    cutNode(nodeId: string): void {
        const node = this.mindMap.findNode(nodeId);
        if (node && !node.isRoot && node.parentId) {
            this.copyNode(nodeId);
            this.removeNode(nodeId);
        }
    }

    pasteNode(parentId: string): Node | null {
        if (!this.clipboard) return null;

        const parent = this.mindMap.findNode(parentId);
        if (!parent) return null;

        // Clone again from clipboard to create new instance for the tree
        const newNode = this.deepCloneNode(this.clipboard);
        // Regenerate IDs for the new node and its children
        this.regenerateIds(newNode);

        parent.addChild(newNode);
        return newNode;
    }

    private deepCloneNode(node: Node): Node {
        const clone = new Node(node.id, node.topic, null, false);
        clone.style = { ...node.style };
        // Determine how to handle children. Recursively clone them.
        clone.children = node.children.map(child => this.deepCloneNode(child));
        // Fix parent relations for children after cloning
        clone.children.forEach(child => child.parentId = clone.id);
        return clone;
    }

    private regenerateIds(node: Node): void {
        node.id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substr(2);
        node.children.forEach(child => {
            child.parentId = node.id;
            this.regenerateIds(child);
        });
    }
}
