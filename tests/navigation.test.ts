
// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import { Kakidash } from '../src/index';

describe('Navigation Logic', () => {
    let container: HTMLElement;
    let board: Kakidash;

    beforeEach(() => {
        container = document.createElement('div');
        // Initial setup for board creates a Root node
        board = new Kakidash(container);
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
    it('should auto-pan when navigating to off-screen node', async () => {
        const rootId = board.getRootId();
        board.addChildNode(rootId);
        const childId = (board as any).selectedNodeId;

        // Force initial pan to 0,0
        (board as any).panX = 0;
        (board as any).panY = 0;
        (board as any).targetPanX = 0;
        (board as any).targetPanY = 0;

        // Mock getBoundingClientRect globally for this test
        const originalGBR = HTMLElement.prototype.getBoundingClientRect;

        HTMLElement.prototype.getBoundingClientRect = function () {
            // Container
            if (this === (board as any).renderer.container) {
                return {
                    left: 0, top: 0, right: 800, bottom: 600, width: 800, height: 600,
                    x: 0, y: 0, toJSON: () => { }
                } as DOMRect;
            }

            // Node
            // Check if this is the target node
            if (this.classList && this.classList.contains('mindmap-node') && this.getAttribute('data-id') === childId) {
                return {
                    left: 1000, top: 300, right: 1100, bottom: 350, width: 100, height: 50,
                    x: 1000, y: 300, toJSON: () => { }
                } as DOMRect;
            }

            return {
                left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0,
                x: 0, y: 0, toJSON: () => { }
            } as DOMRect;
        };

        try {
            // Select root first
            board.selectNode(rootId);

            // Navigate Right to Child
            board.navigateNode(rootId, 'Right');

            // Wait for setTimeout in navigateNode
            await new Promise(resolve => setTimeout(resolve, 50));

            // Logic:
            // Node Center X = 1050
            // Container Center X = 400
            // Expected dx = 400 - 1050 = -650
            // targetPanX should be -650

            // Note: If panX starts at 0, targetPanX becomes -650.
            const targetPanX = (board as any).targetPanX;
            expect(targetPanX).toBe(-650);

        } finally {
            // Restore
            HTMLElement.prototype.getBoundingClientRect = originalGBR;
        }
    });
});
