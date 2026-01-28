/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Kakidash } from '../../src/index';

// Mock HTMLElement and SvgRenderer as they depend on DOM
class MockHTMLElement {
  dataset = {};
  style = {
    setProperty: vi.fn(),
    removeProperty: vi.fn(),
  };
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
      style: {
        setProperty: vi.fn(),
        removeProperty: vi.fn(),
      },
      dataset: {},
      classList: { add: vi.fn(), remove: vi.fn() },
      appendChild: vi.fn(),
      removeChild: vi.fn(),
      addEventListener: vi.fn(),
      setAttribute: vi.fn(),
      offsetWidth: 100,
      offsetHeight: 30,
      querySelector: vi
        .fn()
        .mockReturnValue({ value: '', classList: { contains: vi.fn() }, style: {} }),
      querySelectorAll: vi.fn().mockReturnValue([
        { style: {}, classList: { add: vi.fn(), remove: vi.fn(), contains: vi.fn() }, dataset: {} },
        { style: {}, classList: { add: vi.fn(), remove: vi.fn(), contains: vi.fn() }, dataset: {} },
      ]),
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
      offsetHeight: 30,
    };
  },
  addEventListener: vi.fn(),
  head: { appendChild: vi.fn() },
};
(global as any).window = {
  addEventListener: vi.fn(),
  getComputedStyle: vi
    .fn()
    .mockReturnValue({ font: '', padding: '', border: '', borderRadius: '' }),
};

describe('Kakidash External API', () => {
  let board: Kakidash;
  let container: HTMLElement;

  beforeEach(() => {
    container = new MockHTMLElement() as any;
    board = new Kakidash(container);
  });

  describe('Core API (Pure Logic)', () => {
    it('should add sibling without changing selection', () => {
      const rootId = board.getRootId();
      const child1 = board.addNode(rootId, 'Child 1');
      board.selectNode(child1!.id);

      const listener = vi.fn();
      board.on('node:add', listener);
      const selectListener = vi.fn();
      board.on('node:select', selectListener);

      const sibling = board.addSibling(child1!.id, 'after', 'Sibling');

      expect(sibling).not.toBeNull();
      // Verify node added
      expect(listener).toHaveBeenCalledWith({ id: sibling!.id, topic: 'Sibling' });

      // Verify selection DID NOT change (Core API property)
      expect(selectListener).not.toHaveBeenCalled();
    });

    it('should insert parent without changing selection', () => {
      const rootId = board.getRootId();
      const child = board.addNode(rootId, 'Child');
      board.selectNode(child!.id);

      const selectListener = vi.fn();
      board.on('node:select', selectListener);

      const newParent = board.insertParent(child!.id, 'New topic');

      expect(newParent).not.toBeNull();
      expect(selectListener).not.toHaveBeenCalled();
    });

    it('should delete node without changing selection logic (unless explicitly handled by caller)', () => {
      const rootId = board.getRootId();
      const child = board.addNode(rootId, 'Child');
      board.selectNode(child!.id);

      const selectListener = vi.fn();
      board.on('node:select', selectListener);

      board.deleteNode(child!.id);

      // Core deleteNode simply removes data.
      // It does NOT auto-select parent.
      expect(selectListener).not.toHaveBeenCalled();
    });
  });

  describe('Interaction API (Composite Actions)', () => {
    it('should add sibling AND select it', () => {
      const rootId = board.getRootId();
      const child1 = board.addNode(rootId, 'Child 1');
      board.selectNode(child1!.id);

      const selectListener = vi.fn();
      board.on('node:select', selectListener);

      // Wrapper method
      board.addSiblingNode(child1!.id, 'after');

      // Should have triggered selection of the new node
      expect(selectListener).toHaveBeenCalled();
      const callArgs = selectListener.mock.lastCall;
      expect(callArgs![0]).not.toBe(child1!.id); // Should be new ID
    });

    it('should insert parent AND select it', () => {
      const rootId = board.getRootId();
      const child = board.addNode(rootId, 'Child');
      board.selectNode(child!.id);

      const selectListener = vi.fn();
      board.on('node:select', selectListener);

      board.insertParentNode(child!.id);

      expect(selectListener).toHaveBeenCalled();
    });

    it('should remove node AND select parent', () => {
      const rootId = board.getRootId();
      const child = board.addNode(rootId, 'Child');
      board.selectNode(child!.id);

      const selectListener = vi.fn();
      board.on('node:select', selectListener);

      // Wrapper method
      board.removeNode(child!.id);

      // Should auto-select parent (root)
      expect(selectListener).toHaveBeenCalledWith(rootId);
    });
  });

  describe('General & Legacy Event Tests', () => {
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

      expect(listener).toHaveBeenCalledWith({
        nodeId: child2!.id,
        newParentId: child1!.id,
        position: 'bottom',
      });
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

  describe('New Interface Features', () => {
    describe('Node Accessors', () => {
      it('should get root node', () => {
        const root = board.getRoot();
        expect(root).toBeDefined();
        expect(root.isRoot).toBe(true);
      });

      it('should get specific node by ID', () => {
        const rootId = board.getRootId();
        const child = board.addNode(rootId, 'Child');
        const node = board.getNode(child!.id);
        expect(node).toBeDefined();
        expect(node!.id).toBe(child!.id);
      });

      it('should find nodes by predicate', () => {
        const rootId = board.getRootId();
        board.addNode(rootId, 'Target 1');
        board.addNode(rootId, 'Other');
        board.addNode(rootId, 'Target 2');

        const targets = board.findNodes((n) => n.topic.startsWith('Target'));
        expect(targets.length).toBe(2);
      });
    });

    describe('Batch Operations', () => {
      it('should execute callback and maintain data integrity', () => {
        const rootId = board.getRootId();
        board.batch(() => {
          board.addNode(rootId, 'A');
          board.addNode(rootId, 'B');
        });
        const children = board.getRoot().children;
        expect(children.length).toBe(2);
      });
    });

    describe('Data Persistence (Focus)', () => {
      it('should save and restoer selected node ID', () => {
        const rootId = board.getRootId();
        const child = board.addNode(rootId, 'Focus Target');
        board.selectNode(child!.id);

        const data = board.getData();
        expect(data.selectedId).toBe(child!.id);

        // Simulate reload
        const newBoard = new Kakidash(container);
        newBoard.loadData(data);

        // selectedNodeId is private, but we can check via behavior or hacky access if needed.
        // Or check if 'node:select' event fires on load?
        // Let's check internal state via 'any' casting or use a getter if we add one.
        // Actually, internal state `selectedNodeId` is private.
        // But we can check via interactionHandler selection update or visual class?
        // Or simply add a getter for tests?
        // Or we can rely on `getData()` again on the new board!
        const newData = newBoard.getData();
        expect(newData.selectedId).toBe(child!.id);
      });
    });

    describe('Read-only Mode', () => {
      it('should allow setting read-only mode', () => {
        // Just verifying method existence and no crash
        board.setReadOnly(true);
        board.setReadOnly(false);
      });
    });

    describe('Lifecycle', () => {
      it('should destroy without errors', () => {
        board.destroy();
      });
    });

    describe('Event System Aliases', () => {
      it('should support addListener alias', () => {
        const listener = vi.fn();
        board.addListener('node:add', listener);
        const rootId = board.getRootId();
        board.addNode(rootId, 'Test');
        expect(listener).toHaveBeenCalled();
      });

      it('should support removeListener alias', () => {
        const listener = vi.fn();
        board.addListener('node:add', listener);
        board.removeListener('node:add', listener);
        const rootId = board.getRootId();
        board.addNode(rootId, 'Test');
        expect(listener).not.toHaveBeenCalled();
      });
    });

    describe('Undo/Redo & Fold API', () => {
      it('should undo and redo changes', () => {
        const rootId = board.getRootId();
        const child = board.addNode(rootId, 'Undo Target');
        expect(board.getNode(child!.id)).toBeDefined();

        board.undo();
        expect(board.getNode(child!.id)).toBeUndefined();

        board.redo();
        expect(board.getNode(child!.id)).toBeDefined();
      });

      it('should toggle fold state', () => {
        const rootId = board.getRootId();
        const child = board.addNode(rootId, 'Fold Target');

        // Add a child to allow folding
        board.addNode(child!.id, 'GrandChild');

        // Initial state
        expect(child!.isFolded).toBe(false);

        board.toggleFold(child!.id);
        expect(board.getNode(child!.id)!.isFolded).toBe(true);

        board.toggleFold(child!.id);
        expect(board.getNode(child!.id)!.isFolded).toBe(false);
      });

      it('should get selected node ID', () => {
        const rootId = board.getRootId();
        const child = board.addNode(rootId, 'Select Target');

        board.selectNode(child!.id);
        expect(board.getSelectedNodeId()).toBe(child!.id);

        board.selectNode(null);
        expect(board.getSelectedNodeId()).toBeNull();
      });
    });
  });
});
