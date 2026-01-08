import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Kakidash } from '../../src/index';

// Mock HTMLElement and SvgRenderer as they depend on DOM
class MockHTMLElement {
    dataset = {};
    style = {};
    addEventListener = vi.fn();
    setAttribute = vi.fn();
    appendChild = vi.fn();
    removeChild = vi.fn();
    querySelector = vi.fn();
    querySelectorAll = vi.fn().mockReturnValue([]);
    getBoundingClientRect = vi.fn().mockReturnValue({ width: 0, height: 0, top: 0, left: 0 });
}
(global as any).HTMLElement = MockHTMLElement;
(global as any).document = {
    createElement: (_tag: string) => {
        return {
            style: {},
            dataset: {},
            classList: { add: vi.fn(), remove: vi.fn() },
            appendChild: vi.fn(),
            removeChild: vi.fn(),
            addEventListener: vi.fn(),
            setAttribute: vi.fn(),
            offsetWidth: 100,
            offsetHeight: 30,
            querySelector: vi.fn().mockReturnValue({ value: '', classList: { contains: vi.fn() }, style: {} }),
            querySelectorAll: vi.fn().mockReturnValue([
                { style: {}, classList: { add: vi.fn(), remove: vi.fn(), contains: vi.fn() }, dataset: {} },
                { style: {}, classList: { add: vi.fn(), remove: vi.fn(), contains: vi.fn() }, dataset: {} }
            ])
        };
    },
    createElementNS: (_ns: string, _tag: string) => {
        return {
            style: {},
            dataset: {},
            classList: { add: vi.fn(), remove: vi.fn() },
            appendChild: vi.fn(),
            removeChild: vi.fn(),
            addEventListener: vi.fn(),
            setAttribute: vi.fn(),
            getBBox: () => ({ x: 0, y: 0, width: 100, height: 30 }),
            offsetWidth: 100,
            offsetHeight: 30
        };
    },
    addEventListener: vi.fn(),
    head: { appendChild: vi.fn() }
};
(global as any).window = {
    addEventListener: vi.fn(),
    getComputedStyle: vi.fn().mockReturnValue({ font: '', padding: '', border: '', borderRadius: '' })
};


describe('Kakidash External API', () => {
    let board: Kakidash;
    let container: HTMLElement;

    beforeEach(() => {
        container = new MockHTMLElement() as any;
        board = new Kakidash(container);
    });

    it('should emit node:add event when adding a node', () => {
        const rootId = board.getRootId();
        const listener = vi.fn();
        board.on('node:add', listener);

        const newNode = board.addNode(rootId, 'Test Node');

        expect(newNode).not.toBeNull();
        expect(listener).toHaveBeenCalledWith({ id: newNode!.id, topic: 'Test Node' });
        expect(listener).toHaveBeenCalledTimes(1);
    });

    it('should emit node:select event when selecting a node', () => {
        const rootId = board.getRootId();
        const listener = vi.fn();
        board.on('node:select', listener);

        board.selectNode(rootId);

        expect(listener).toHaveBeenCalledWith(rootId);
    });

    it('should emit node:update event when updating a node', () => {
        const rootId = board.getRootId();
        const listener = vi.fn();
        board.on('node:update', listener);

        board.updateNodeTopic(rootId, 'Updated Topic');

        expect(listener).toHaveBeenCalledWith({ id: rootId, topic: 'Updated Topic' });
    });

    it('should emit node:remove event when removing a node', () => {
        const rootId = board.getRootId();
        const child = board.addNode(rootId, 'Child');
        const listener = vi.fn();
        board.on('node:remove', listener);

        board.removeNode(child!.id);

        expect(listener).toHaveBeenCalledWith(child!.id);
    });

    it('should emit node:move event when moving a node', () => {
        const rootId = board.getRootId();
        const child1 = board.addNode(rootId, 'Child 1');
        const child2 = board.addNode(rootId, 'Child 2');
        const listener = vi.fn();
        board.on('node:move', listener);

        // Move child2 to be sibling of child1
        board.moveNode(child2!.id, child1!.id, 'bottom');

        expect(listener).toHaveBeenCalledWith({ nodeId: child2!.id, newParentId: child1!.id, position: 'bottom' });
    });

    it('should allow multiple listeners for the same event', () => {
        const rootId = board.getRootId();
        const listenerA = vi.fn();
        const listenerB = vi.fn();

        board.on('node:add', listenerA);
        board.on('node:add', listenerB);

        board.addNode(rootId, 'Test');

        expect(listenerA).toHaveBeenCalled();
        expect(listenerB).toHaveBeenCalled();
    });

    it('should stop listening when off is called', () => {
        const rootId = board.getRootId();
        const listener = vi.fn();
        board.on('node:add', listener);

        board.addNode(rootId, 'First');
        expect(listener).toHaveBeenCalledTimes(1);

        board.off('node:add', listener);
        board.addNode(rootId, 'Second');
        expect(listener).toHaveBeenCalledTimes(1); // Should not increase
    });
});
