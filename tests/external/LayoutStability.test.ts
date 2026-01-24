/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Kakidash } from '../../src/index';

// Mock UI components to avoid DOM dependencies
vi.mock('../../src/presentation/components/StyleEditor', () => ({
  StyleEditor: vi.fn().mockImplementation(function () {
    return {
      show: vi.fn(),
      hide: vi.fn(),
      onUpdate: vi.fn(), // Public property to capture callback
    };
  }),
}));

vi.mock('../../src/presentation/logic/LayoutSwitcher', () => ({
  LayoutSwitcher: vi.fn().mockImplementation(function () {
    return {
      setMode: vi.fn(),
    };
  }),
}));

vi.mock('../../src/presentation/components/SvgRenderer', () => ({
  SvgRenderer: vi.fn().mockImplementation(function (container: any) {
    return {
      render: vi.fn(),
      updateTransform: vi.fn(),
      container: container,
    };
  }),
}));

// Mock DOM dependencies
class MockHTMLElement {
  dataset = {};
  style = {};
  addEventListener = vi.fn();
  setAttribute = vi.fn();
  appendChild = vi.fn();
  removeChild = vi.fn();
  querySelector = vi.fn().mockReturnValue({
    value: '',
    classList: { contains: vi.fn() },
    style: {},
    getBoundingClientRect: vi.fn().mockReturnValue({ top: 0, left: 0, width: 100, height: 30 }),
  });
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
    querySelector: vi.fn().mockReturnValue({
      value: '',
      classList: { contains: vi.fn() },
      style: {},
      getBoundingClientRect: vi.fn().mockReturnValue({ top: 0, left: 0, width: 100, height: 30 }),
    }),
    querySelectorAll: vi.fn().mockReturnValue([]),
    focus: vi.fn(),
    select: vi.fn(),
    blur: vi.fn(),
  }),
  createElementNS: () => ({
    style: {},
    setAttribute: vi.fn(),
    appendChild: vi.fn(),
    getBBox: () => ({ x: 0, y: 0, width: 100, height: 30 }),
  }),
  addEventListener: vi.fn(),
  head: { appendChild: vi.fn() },
  body: { appendChild: vi.fn(), removeChild: vi.fn() },
};
(global as any).window = {
  addEventListener: vi.fn(),
  getComputedStyle: vi.fn().mockReturnValue({ font: '', padding: '', border: '' }),
};

describe('Layout Stability in Both Mode', () => {
  let board: Kakidash;
  let container: HTMLElement;

  beforeEach(() => {
    container = new MockHTMLElement() as any;
    board = new Kakidash(container);
    board.setLayoutMode('Both');
  });

  it('should preserve node sides when inserting sibling before', () => {
    const rootId = board.getRootId();

    // 1. Add two children
    // Child 1 -> Index 0 -> Right
    // Child 2 -> Index 1 -> Left (because of auto-balance or simple count?
    //   Actually auto-balance uses layoutSide if set, else count.
    //   addChildNode logic:
    //     leftCount=0, rightCount=0. side='right'.
    //     Index 0 added as Right.
    //     Next add: leftCount=0, rightCount=1. side='left'.
    //     Index 1 added as Left.

    // Let's rely on addChildNode to auto-balance.

    board.addChildNode(rootId); // Child 1
    // getLastAddedNode?
    // We can inspect via getData()
    let data = board.getData().nodeData;
    let children = data.children || [];
    expect(children.length).toBe(1);
    const child1Id = children[0].id;
    expect(children[0].layoutSide).toBe('right'); // First goes right

    board.addChildNode(rootId); // Child 2
    data = board.getData().nodeData;
    children = data.children || [];
    expect(children.length).toBe(2);
    const child2Id = children.find((c) => c.id !== child1Id)!.id;
    const child2 = children.find((c) => c.id === child2Id);
    expect(child2?.layoutSide).toBe('left'); // Second goes left

    // 2. Insert sibling BEFORE Child 2
    // This pushes Child 2 to index 2 (if Child 1 is 0).
    // 0: Child 1 (Right)
    // 1: New topic
    // 2: Child 2 (Left)
    // If Child 2 side was NOT locked, index 2 % 2 == 0 -> Right! (Flip!)
    // But with our fix, Child 2 side should be locked to Left.

    board.addSiblingNode(child2Id, 'before');

    data = board.getData().nodeData;
    children = data.children || [];
    expect(children.length).toBe(3);

    const child2After = children.find((c) => c.id === child2Id);
    // It should STILL be Left
    expect(child2After?.layoutSide).toBe('left');

    const newSibling = children.find((c) => c.id !== child1Id && c.id !== child2Id);
    // New sibling inherits side from Child 2 (where we pressed enter/insert)
    // Child 2 was Left, so New topic should be Left.
    expect(newSibling?.layoutSide).toBe('left');
  });
});
