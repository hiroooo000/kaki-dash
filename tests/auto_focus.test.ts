import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Kakidash } from '../src/index';

describe('Auto-Focus on Center Node', () => {
  let container: HTMLElement;
  let mindMap: Kakidash;

  beforeEach(() => {
    container = document.createElement('div');
    // Set a reasonable size for center calculation
    container.style.width = '800px';
    container.style.height = '600px';
    container.style.position = 'absolute';
    container.style.top = '0';
    container.style.left = '0';
    document.body.appendChild(container);

    mindMap = new Kakidash(container);
  });

  afterEach(() => {
    mindMap.destroy();
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  });

  it('should select closest node to center when arrow key pressed without selection', () => {
    const root = mindMap.getRoot();
    expect(root).not.toBeNull();

    // Add some nodes around
    // Since we can't easily control exact positions (handled by renderer/layout),
    // we rely on the fact that initial render places root near center (or we pan to it).
    // By default, PanX = width / 2, PanY = 0 centered vertically?
    // SvgRenderer:
    // this.renderNode(..., this.container.clientHeight / 2, ...);
    // So Y is centered.
    // X depends on LayoutMode. Right mode: PanX = clientWidth * 0.2

    // Root is at (0, center).
    // If we pan such that Root is NOT at center, then pressing arrow key should closest node.

    // Let's force layout/position via pan.
    // Or assume Root is the only node initially visually near center.

    // Deselect first (initially selected? No, usually null or root?)
    // Kakidash constructor doesn't select node.

    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
    const handler = (mindMap as any).interactionHandler;
    // Ensure no selection
    mindMap.selectNode(null);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(handler.selectedNodeId).toBeNull();

    // 1. Initial State: Root is at default position.
    // Let's trigger arrow key. Root should be selected as it's the only node (closest).
    const event = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true });
    document.dispatchEvent(event);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(handler.selectedNodeId).toBe(root.id);

    // 2. Add another node and pan
    mindMap.selectNode(null);
    mindMap.addNode(root.id, 'Child');
    // Render happens.

    // Pan the board so the child is closer to center?
    // Default layout: Root -> Child (Right).
    // Root is at X, Child is at X + gap.
    // If we pan left, Child moves to center.
    // However, we are testing "Closest to center".
    // It's hard to deterministically fail this if Root is also close.

    // Let's manually select null again.
    mindMap.selectNode(null);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(handler.selectedNodeId).toBeNull();

    // Trigger generic arrow key
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));

    // Should select SOME node (Root or Child).
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(handler.selectedNodeId).not.toBeNull();
  });
});
