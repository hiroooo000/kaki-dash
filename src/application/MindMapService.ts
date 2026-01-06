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
}
