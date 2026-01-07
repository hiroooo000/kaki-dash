import { describe, it, expect, beforeEach } from 'vitest';
import { Node } from '../../src/domain/entities/Node';
import { MindMap } from '../../src/domain/entities/MindMap';
import { MindMapService } from '../../src/application/MindMapService';

describe('MindMapService Copy/Paste', () => {
    let mindMap: MindMap;
    let service: MindMapService;
    let root: Node;

    beforeEach(() => {
        root = new Node('root', 'Root Topic');
        mindMap = new MindMap(root);
        service = new MindMapService(mindMap);
    });

    it('should copy and paste a single node', () => {
        const child = service.addNode('root', 'Child To Copy');
        expect(child).toBeDefined();

        if (child) {
            service.copyNode(child.id);
            const pastedNode = service.pasteNode('root');

            expect(pastedNode).toBeDefined();
            expect(pastedNode?.topic).toBe('Child To Copy');
            expect(pastedNode?.id).not.toBe(child.id);
            expect(pastedNode?.parentId).toBe('root');
            expect(root.children).toHaveLength(2); // Original + Paste
        }
    });

    it('should paste multiple times (create multiple copies)', () => {
        const child = service.addNode('root', 'Child');
        if (child) {
            service.copyNode(child.id);
            const paste1 = service.pasteNode('root');
            const paste2 = service.pasteNode('root');

            expect(paste1).toBeDefined();
            expect(paste2).toBeDefined();
            expect(paste1?.id).not.toBe(paste2?.id);
            expect(root.children).toHaveLength(3); // Original + 2 Pastes
        }
    });

    it('should deep copy children', () => {
        const parent = service.addNode('root', 'Parent');

        if (parent) {
            const child1 = service.addNode(parent.id, 'Child 1');
            const child2 = service.addNode(parent.id, 'Child 2');

            // Should copy Parent and its children
            service.copyNode(parent.id);

            // Paste to root as a sibling of the original Parent
            const pastedParent = service.pasteNode('root');

            expect(pastedParent).toBeDefined();
            expect(pastedParent?.topic).toBe('Parent');
            expect(pastedParent?.children).toHaveLength(2);

            expect(pastedParent?.children[0].topic).toBe('Child 1');
            expect(pastedParent?.children[1].topic).toBe('Child 2');

            expect(pastedParent?.children[0].id).not.toBe(child1?.id);
            expect(pastedParent?.children[1].id).not.toBe(child2?.id);

            expect(pastedParent?.children[0].parentId).toBe(pastedParent?.id);
        }
    });

    it('should do nothing if clipboard is empty', () => {
        const result = service.pasteNode('root');
        expect(result).toBeNull();
        expect(root.children).toHaveLength(0);
    });

    it('should do nothing if target parent not found', () => {
        const child = service.addNode('root', 'Child');
        if (child) {
            service.copyNode(child.id);
            const result = service.pasteNode('invalid-id');
            expect(result).toBeNull();
        }
    });

    it('should copy/paste node styles', () => {
        const child = service.addNode('root', 'Styled Node');
        if (child) {
            child.style = { color: 'red', fontSize: '20px' };
            service.copyNode(child.id);

            const pasted = service.pasteNode('root');
            expect(pasted?.style).toEqual({ color: 'red', fontSize: '20px' });
            expect(pasted?.style).not.toBe(child.style); // Should be a new object reference
        }
    });

    it('should cut a node (copy and remove)', () => {
        const child = service.addNode('root', 'Child To Cut');
        expect(child).toBeDefined();

        if (child) {
            service.cutNode(child.id);

            // Copied
            const pastedNode = service.pasteNode('root');
            expect(pastedNode).toBeDefined();
            expect(pastedNode?.topic).toBe('Child To Cut');

            // Removed
            expect(root.children).toHaveLength(1); // Only the pasted one
            expect(root.children[0].id).toBe(pastedNode?.id);
            expect(root.children[0].id).not.toBe(child.id); // Original ID gone
        }
    });

    it('should not cut root node', () => {
        service.cutNode('root');
        expect(root).toBeDefined(); // Still exists (though managed by MindMap class mainly, finding it should still work)
        // If findNode still finds it.
        const found = service.mindMap.findNode('root');
        expect(found).toBeDefined();
    });
});
