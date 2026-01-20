import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Kakidash } from '../src/index';

describe('Display Shift Reproduction', () => {
  let container: HTMLElement;
  let mindMap: Kakidash;

  beforeEach(() => {
    container = document.createElement('div');
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

  it('should attempt to pan when node is added', () => {
    const root = mindMap.getRoot();

    // Mock the renderer container to report dimensions that force off-screen checking

    // We want to simulate adding a child that is "far away" or just ensure ensureNodeVisible is called.
    // Since layout is automatic, we can't easily force it off-screen without adding MANY nodes
    // or mocking getBoundingClientRect.

    // Let's spy on ensureNodeVisible (private method, accessed via casting or prototype)
    const promoteSpy = vi.spyOn(mindMap as any, 'ensureNodeVisible');

    // Add a child using interaction API
    mindMap.addChildNode(root.id);

    // Check if ensureNodeVisible was called
    // addChildNode in index.ts calls ensureNodeVisible(node.id)
    expect(promoteSpy).toHaveBeenCalled();
  });

  it('should allow immediate panning if implemented', () => {
    // This test acts as a verification for the API change we plan to make.
    // Currently ensureNodeVisible only takes nodeId and centerIfOffscreen boolean.
    // We will add a 3rd argument 'immediate'.

    const promoteSpy = vi.spyOn(mindMap as any, 'ensureNodeVisible');

    mindMap.addChildNode(mindMap.getRoot().id);

    // Currently it is called with (id) => default false
    // With our fix, it should be called with (id, false, true)
    expect(promoteSpy).toHaveBeenCalledWith(expect.anything(), false, true);

    // We will wait for implementation to verify the new argument usage.
  });
});
