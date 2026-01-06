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

    it('should add sibling node after', () => {
        const child1 = service.addNode('root', 'Child 1');
        service.addNode('root', 'Child 2'); // Keep the side effect of adding a node, but don't assign to unused var

        expect(child1).toBeDefined();
        if (child1) {
            const result = service.addSibling(child1.id, 'after', 'Sibling After');
            expect(result).toBeDefined();
            expect(result?.parentId).toBe('root');
            expect(root.children[1].topic).toBe('Sibling After');
        }
    });

    it('should add sibling node before', () => {
        const child1 = service.addNode('root', 'Child 1');

        expect(child1).toBeDefined();
        if (child1) {
            const result = service.addSibling(child1.id, 'before', 'Sibling Before');
            expect(result).toBeDefined();
            expect(result?.parentId).toBe('root');
            expect(root.children[0].topic).toBe('Sibling Before');
        }
    });

    it('should insert parent node', () => {
        const child1 = service.addNode('root', 'Child 1');

        expect(child1).toBeDefined();
        if (child1) {
            const newNode = service.insertParent(child1.id, 'New Parent');
            expect(newNode).toBeDefined();

            // Verify hierarchy: Root -> New Parent -> Child 1
            expect(newNode?.parentId).toBe('root');
            expect(child1.parentId).toBe(newNode?.id);
            expect(root.children).toContain(newNode);
            expect(newNode?.children).toContain(child1);
            expect(root.children).not.toContain(child1);
        }
    });

    it('should not insert parent for root', () => {
        root.isRoot = true;
        const result = service.insertParent('root');
        expect(result).toBeNull();
    });
});
