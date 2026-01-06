import { describe, it, expect, beforeEach } from 'vitest';
import { Node } from '../../src/domain/entities/Node';
import { MindMap } from '../../src/domain/entities/MindMap';
import { MindMapService } from '../../src/application/MindMapService';

describe('MindMapService', () => {
    let mindMap: MindMap;
    let service: MindMapService;
    let root: Node;

    beforeEach(() => {
        root = new Node('root', 'Root Topic');
        mindMap = new MindMap(root);
        service = new MindMapService(mindMap);
    });

    it('should add a node', () => {
        const newNode = service.addNode('root', 'Child Topic');
        expect(newNode).toBeDefined();
        expect(newNode?.topic).toBe('Child Topic');
        expect(newNode?.parentId).toBe('root');
        expect(root.children).toContain(newNode);
    });

    it('should remove a node', () => {
        const newNode = service.addNode('root', 'To Be Removed');
        expect(newNode).toBeDefined();
        if (newNode) {
            const result = service.removeNode(newNode.id);
            expect(result).toBe(true);
            expect(root.children).not.toContain(newNode);
        }
    });

    it('should update node topic', () => {
        service.updateNodeTopic('root', 'Updated Root');
        expect(root.topic).toBe('Updated Root');
    });

    it('should not remove root node', () => {
        // Manually set isRoot to true for testing if not already
        root.isRoot = true;
        const result = service.removeNode('root');
        expect(result).toBe(false);
    });
});
