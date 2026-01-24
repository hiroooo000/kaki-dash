import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Kakidash } from '../src/index';

describe('Image Node Interactions', () => {
  let container: HTMLElement;
  let mindMap: Kakidash;

  beforeEach(() => {
    container = document.createElement('div');
    container.style.width = '800px';
    container.style.height = '600px';
    document.body.appendChild(container);

    mindMap = new Kakidash(container);
  });

  afterEach(() => {
    mindMap.destroy();
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
    // Clean up any modals
    const modals = document.querySelectorAll('div[style*="position: fixed"]');
    modals.forEach((m) => {
      if (m.parentElement) m.parentElement.removeChild(m);
    });
  });

  const imageData =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  it('should prevent "F2" from starting edit on image node', () => {
    const root = mindMap.getRoot();
    // Create image node
    mindMap.pasteImage(root.id, imageData);
    const children = root.children;
    const imageNode = children[children.length - 1];

    // Select image node
    mindMap.selectNode(imageNode.id);

    // Trigger F2
    const event = new KeyboardEvent('keydown', { key: 'F2', bubbles: true });
    document.dispatchEvent(event);

    // Verify NO textarea exists
    const textarea = document.querySelector('textarea');
    expect(textarea).toBeNull();
  });

  it('should prevent "i" from starting edit on image node', () => {
    const root = mindMap.getRoot();
    mindMap.pasteImage(root.id, imageData);
    const children = root.children;
    const imageNode = children[children.length - 1];

    mindMap.selectNode(imageNode.id);

    // Trigger i
    const event = new KeyboardEvent('keydown', { key: 'i', bubbles: true });
    document.dispatchEvent(event);

    // Verify NO textarea exists
    const textarea = document.querySelector('textarea');
    expect(textarea).toBeNull();
  });

  it('should allow "F2" to start edit on text node', () => {
    const root = mindMap.getRoot();
    mindMap.selectNode(root.id);

    // Trigger F2
    const event = new KeyboardEvent('keydown', { key: 'F2', bubbles: true });
    document.dispatchEvent(event);

    // Verify textarea exists
    const textarea = document.querySelector('textarea');
    expect(textarea).not.toBeNull();
  });

  it('should trigger image zoom on "Space" key', () => {
    const root = mindMap.getRoot();
    mindMap.pasteImage(root.id, imageData);
    const children = root.children;
    const imageNode = children[children.length - 1];

    mindMap.selectNode(imageNode.id);

    // Trigger Space
    const event = new KeyboardEvent('keydown', { key: ' ', bubbles: true });
    document.dispatchEvent(event);

    // Verify modal appears (check for fixed div or img in body)
    // SvgRenderer appends modal to document.body
    // Modal has z-index 1000 and fixed position
    const modal = document.body.lastElementChild as HTMLElement;
    expect(modal).not.toBeNull();
    // Check specific style to be sure it's our modal
    expect(modal.style.position).toBe('fixed');

    // Also verify side effect: ReadOnly mode
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
    const handler = (mindMap as any).controller.interactionHandler;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(handler.isReadOnly).toBe(true);

    // Verify activeElement is container
    // Note: In JSDOM, focus management might need tabindex verification.
    container.tabIndex = 0; // InteractionHandler does this, but let's ensure for test environment safety if partial mock

    // Simulate closing the modal (mock click or keydown)
    // We need to trigger the closeModal logic stored in SvgRenderer closure.
    // The previous steps verified modal OPENED. Now we need to Close it.

    // Trigger Escape to close
    const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
    // We need to dispatch it to... document? The modal attached listener to document with capture=true.
    document.dispatchEvent(escapeEvent);

    // Wait for async operations if any (though currently synchronous)
    // Check if modal is gone
    const modalAfter = document.body.querySelector('div[style*="position: fixed"]');
    expect(modalAfter).toBeNull();

    // Check Focus
    expect(document.activeElement).toBe(container);

    // Verify Selection is preserved
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(handler.selectedNodeId).toBe(imageNode.id);
  });
});
