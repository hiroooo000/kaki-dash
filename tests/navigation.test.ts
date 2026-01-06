
// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import { KakidashiBoard } from '../src/index';

describe('Navigation Logic', () => {
    let container: HTMLElement;
    let board: KakidashiBoard;

    beforeEach(() => {
        container = document.createElement('div');
        // Initial setup for board creates a Root node
        board = new KakidashiBoard(container);
    });

    it('should navigate from root to first child', () => {
        const rootId = board.getRootId();
        // Add multiple children
        board.addChildNode(rootId); // Child 1 (Index 0)
        const child1Id = (board as any).selectedNodeId;

        board.selectNode(rootId);
        board.addChildNode(rootId); // Child 2

        // Select root again
        board.selectNode(rootId);

        // Right from root should go to first child (child1)
        board.navigateNode(rootId, 'Right');

        // Verify child 1 is selected
        expect((board as any).selectedNodeId).toBe(child1Id);

        // Verify it is NOT child 2 (just to be sure)
        const child2Id = (board as any).mindMap.root.children[1].id;
        expect((board as any).selectedNodeId).not.toBe(child2Id);
    });

    it('should navigate between siblings', () => {
        const rootId = board.getRootId();
        board.addChildNode(rootId); // Child 1
        const child1Id = (board as any).selectedNodeId;

        board.selectNode(rootId);
        board.addChildNode(rootId); // Child 2
        const child2Id = (board as any).selectedNodeId;

        // Structure: Root -> [Child1, Child2] 
        // (Note: `addChild` usually pushes to end)

        board.selectNode(child1Id);
        board.navigateNode(child1Id, 'Down');
        expect((board as any).selectedNodeId).toBe(child2Id);

        board.navigateNode(child2Id, 'Up');
        expect((board as any).selectedNodeId).toBe(child1Id);
    });

    it('should navigate from child to parent', () => {
        const rootId = board.getRootId();
        board.addChildNode(rootId);
        const childId = (board as any).selectedNodeId;

        board.navigateNode(childId, 'Left');
        expect((board as any).selectedNodeId).toBe(rootId);
    });
});
