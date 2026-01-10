/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Kakidash } from '../../src/index';

// Mock UI components
vi.mock('../../src/presentation/StyleEditor', () => ({
  StyleEditor: vi.fn().mockImplementation(() => ({
    show: vi.fn(),
    hide: vi.fn(),
    onUpdate: vi.fn(),
  })),
}));

vi.mock('../../src/presentation/LayoutSwitcher', () => ({
  LayoutSwitcher: vi.fn().mockImplementation(() => ({
    setMode: vi.fn(),
  })),
}));

vi.mock('../../src/presentation/SvgRenderer', () => ({
  SvgRenderer: vi.fn().mockImplementation(() => ({
    render: vi.fn(),
    updateTransform: vi.fn(),
    container: {
      getBoundingClientRect: () => ({ left: 0, top: 0 }),
      clientWidth: 1000,
      clientHeight: 800,
    },
  })),
}));

// Mock DOM
class MockHTMLElement {
  dataset = {};
  style = {};
  addEventListener = vi.fn();
  setAttribute = vi.fn();
  appendChild = vi.fn();
  removeChild = vi.fn();
  querySelector = vi
    .fn()
    .mockReturnValue({ value: '', classList: { contains: vi.fn() }, style: {} });
  querySelectorAll = vi.fn().mockReturnValue([]);
  getBoundingClientRect = vi.fn().mockReturnValue({ width: 0, height: 0, top: 0, left: 0 });
  clientWidth = 1000;
  clientHeight = 800;
}
(global as any).HTMLElement = MockHTMLElement;
(global as any).document = {
  createElement: () => ({
    style: {},
    dataset: {},
    classList: { add: vi.fn(), remove: vi.fn(), contains: vi.fn() },
    appendChild: vi.fn(),
    removeChild: vi.fn(),
    addEventListener: vi.fn(),
    setAttribute: vi.fn(),
    getBBox: () => ({ x: 0, y: 0, width: 100, height: 30 }),
    offsetWidth: 100,
    offsetHeight: 30,
    querySelector: vi
      .fn()
      .mockReturnValue({ value: '', classList: { contains: vi.fn() }, style: {} }),
    querySelectorAll: vi.fn().mockReturnValue([]),
  }),
  createElementNS: () => ({
    style: {},
    setAttribute: vi.fn(),
    appendChild: vi.fn(),
    getBBox: () => ({ x: 0, y: 0, width: 100, height: 30 }),
  }),
  addEventListener: vi.fn(),
  head: { appendChild: vi.fn() },
};
(global as any).window = {
  addEventListener: vi.fn(),
  getComputedStyle: vi.fn().mockReturnValue({ font: '', padding: '', border: '' }),
};

describe('Advanced Drag and Drop', () => {
  let board: Kakidash;
  let container: HTMLElement;

  beforeEach(() => {
    container = new MockHTMLElement() as any;
    board = new Kakidash(container);
  });

  it('should reorder sibling when dropped on Top (before)', () => {
    const rootId = board.getRootId();
    const node1 = board.addNode(rootId, 'Node 1');
    const node2 = board.addNode(rootId, 'Node 2');
    const node3 = board.addNode(rootId, 'Node 3');

    // Initial order: 1, 2, 3
    let children = board.getData().nodeData.children!;
    expect(children[0].id).toBe(node1!.id);
    expect(children[1].id).toBe(node2!.id);

    // Move Node 3 to before Node 2 (Top of Node 2)
    board.moveNode(node3!.id, node2!.id, 'top');

    children = board.getData().nodeData.children!;
    // Expected: 1, 3, 2
    expect(children[0].id).toBe(node1!.id);
    expect(children[1].id).toBe(node3!.id);
    expect(children[2].id).toBe(node2!.id);
  });

  it('should reorder sibling when dropped on Bottom (after)', () => {
    const rootId = board.getRootId();
    const node1 = board.addNode(rootId, 'Node 1');
    const node2 = board.addNode(rootId, 'Node 2');

    // Move Node 1 to after Node 2 (Bottom of Node 2)
    board.moveNode(node1!.id, node2!.id, 'bottom');

    const children = board.getData().nodeData.children!;
    // Expected: 2, 1
    expect(children[0].id).toBe(node2!.id);
    expect(children[1].id).toBe(node1!.id);
  });

  it('should insert as child when dropped on outer side (Right Layout)', () => {
    board.setLayoutMode('Right');
    const rootId = board.getRootId();
    const node1 = board.addNode(rootId, 'Node 1');
    const node2 = board.addNode(rootId, 'Node 2');

    // In Right layout, Right is outer (child) side.
    // Drop Node 2 on Right of Node 1 -> Node 2 should become child of Node 1.
    board.moveNode(node2!.id, node1!.id, 'right');

    const data = board.getData().nodeData;
    const n1 = data.children!.find((c) => c.id === node1!.id)!;
    expect(n1.children).toBeDefined();
    expect(n1.children!.length).toBe(1);
    expect(n1.children![0].id).toBe(node2!.id);
  });

  it('should insert as parent when dropped on inner side (Right Layout)', () => {
    board.setLayoutMode('Right');
    const rootId = board.getRootId();
    const node1 = board.addNode(rootId, 'Node 1'); // Child of Root
    const node2 = board.addNode(rootId, 'Node 2');

    // In Right layout, Left is inner (parent) side.
    // Drop Node 2 on Left of Node 1.
    // Node 2 should become parent of Node 1.
    // And Node 2 should become child of Root (replacing Node 1's position).

    board.moveNode(node2!.id, node1!.id, 'left');

    const data = board.getData().nodeData;

    // Node 2 should be direct child of Root now
    const n2 = data.children!.find((c) => c.id === node2!.id)!;
    expect(n2).toBeDefined();

    // Node 1 should be child of Node 2
    expect(n2.children).toBeDefined();
    expect(n2.children![0].id).toBe(node1!.id);
  });

  it('should respect Both layout direction for insertion', () => {
    board.setLayoutMode('Both');
    const rootId = board.getRootId();

    // Add left child
    const leftNode = board.addNode(rootId, 'Left Node', 'left');
    const newNode = board.addNode(rootId, 'New Node');

    // On Left side node:
    // Left is outer (child) -> Add Child
    // Right is inner (parent) -> Insert Parent

    // Drop newNode on Left of leftNode -> Add Child
    board.moveNode(newNode!.id, leftNode!.id, 'left');

    let data = board.getData().nodeData;
    const lNode = data.children!.find((c) => c.id === leftNode!.id)!;
    expect(lNode.children![0].id).toBe(newNode!.id);

    // Reset
    board.moveNode(newNode!.id, rootId, 'right'); // Move back to root

    // Drop newNode on Right of leftNode -> Insert Parent
    board.moveNode(newNode!.id, leftNode!.id, 'right');

    data = board.getData().nodeData;
    // newNode should be child of Root
    const nNode = data.children!.find((c) => c.id === newNode!.id)!;
    expect(nNode.layoutSide).toBe('left'); // Should inherit side from leftNode
    // leftNode should be child of newNode
    expect(nNode.children![0].id).toBe(leftNode!.id);
  });
});
