import { MindMap } from '../domain/entities/MindMap';
import { Node } from '../domain/entities/Node';
import { MindMapData, MindMapNodeData } from '../domain/interfaces/MindMapData';

export class MindMapService {
    mindMap: MindMap;

    constructor(mindMap: MindMap) {
        this.mindMap = mindMap;
    }

    addNode(parentId: string, topic: string = 'New Node', layoutSide?: 'left' | 'right'): Node | null {
        const parent = this.mindMap.findNode(parentId);
        if (!parent) return null;

        const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substr(2);
        const newNode = new Node(id, topic, null, false, undefined, layoutSide);
        parent.addChild(newNode);
        return newNode;
    }

    addImageNode(parentId: string, imageData: string): Node | null {
        const parent = this.mindMap.findNode(parentId);
        if (!parent) return null;

        const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substr(2);
        // Image nodes have empty topic
        const newNode = new Node(id, '', parentId, false, imageData);
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

    updateNodeStyle(id: string, style: Partial<import('../domain/entities/Node').NodeStyle>): boolean {
        const node = this.mindMap.findNode(id);
        if (node) {
            node.style = { ...node.style, ...style };
            return true;
        }
        return false;
    }

    moveNode(nodeId: string, newParentId: string, layoutSide?: 'left' | 'right'): boolean {
        // Handle side update for same parent (re-layout)
        const node = this.mindMap.findNode(nodeId);
        if (node && node.parentId === newParentId) {
            if (layoutSide && node.layoutSide !== layoutSide) {
                node.layoutSide = layoutSide;
                return true;
            }
            return false; // No change
        }

        if (this.mindMap.moveNode(nodeId, newParentId)) {
            if (layoutSide) {
                // Check if node reference is still valid or re-fetch? 
                // this.mindMap.moveNode doesn't recreate node instance, it just reparents.
                // So 'node' var is still valid if we fetched it above, or we fetch again.
                const movedNode = this.mindMap.findNode(nodeId);
                if (movedNode) movedNode.layoutSide = layoutSide;
            }
            return true;
        }
        return false;
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
            // Write to system clipboard to ensure we clear any previous image data
            // and to allow pasting text outside the app.
            if (navigator.clipboard) {
                navigator.clipboard.writeText(node.topic).catch(err => {
                    console.error('Failed to write to clipboard', err);
                });
            }
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
        const clone = new Node(node.id, node.topic, null, false, node.image, node.layoutSide);
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

    exportData(): MindMapData {
        const buildNodeData = (node: Node): MindMapNodeData => {
            const data: MindMapNodeData = {
                id: node.id,
                topic: node.topic,
                root: node.isRoot || undefined,
                children: node.children.length > 0 ? node.children.map(buildNodeData) : undefined,
                style: Object.keys(node.style).length > 0 ? node.style : undefined,
                image: node.image,
                layoutSide: node.layoutSide
            };
            return data;
        };

        return {
            nodeData: buildNodeData(this.mindMap.root)
        };
    }

    importData(data: MindMapData): void {
        const buildNodeFromData = (data: MindMapNodeData, parentId: string | null = null): Node => {
            const isRoot = !!data.root;
            const node = new Node(data.id, data.topic, parentId, isRoot, data.image, data.layoutSide);

            if (data.style) {
                node.style = { ...data.style };
            }

            if (data.children && data.children.length > 0) {
                data.children.forEach(childData => {
                    const childNode = buildNodeFromData(childData, node.id);
                    node.addChild(childNode);
                });
            }

            return node;
        };

        this.mindMap.root = buildNodeFromData(data.nodeData);
    }
}
