import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Kakidash } from '../src/index';

describe('Image Zoom Readonly Mode', () => {
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
    document.body.removeChild(container);
  });

  it('should enable readonly mode when image is zoomed and disable when closed', () => {
    // 1. Add a node with an image
    const root = mindMap.getRoot();
    const imageNode = mindMap.addNode(root.id, 'Image Node');
    expect(imageNode).not.toBeNull();
    if (!imageNode) return;

    // Mock image data
    const imageData =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    // Use internal service or pasteImage to set image
    // Since pasteImage is async/event driven or easier to just spy, let's inject manually if possible or use pasteImage
    // But pasteImage requires Clipboard event or directly calling 'onPasteImage' handler?
    // Kakidash doesn't expose 'updateNodeImage' easily via public API except 'pasteImage' which uses service.addImageNode
    // Let's use internal service via 'any' cast or just add a new node via service logic.
    // Actually, Kakidash has `pasteImage` method.
    mindMap.pasteImage(root.id, imageData);

    // Wait for render
    // pasteImage does render.

    // Find the image node. It should be the last added child.
    const children = root.children;
    const newNode = children[children.length - 1];
    expect(newNode.image).toBe(imageData);

    // 2. Find the zoom button in the DOM
    // The render happens in the container.
    const zoomBtn = container.querySelector('.mindmap-node img + div') as HTMLElement;
    expect(zoomBtn).not.toBeNull();

    // 3. Spy on setReadOnly or check interactionHandler state
    // We can check interactionHandler.isReadOnly by casting to any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
    const handler = (mindMap as any).controller.interactionHandler;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(handler.isReadOnly).toBe(false);

    // 4. Click Zoom
    zoomBtn.click();

    // 5. Verify ReadOnly is true
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(handler.isReadOnly).toBe(true);

    // 6. Verify Modal is open
    const modal = document.body.lastElementChild as HTMLElement;
    // Basic check if it covers screen
    expect(modal.style.position).toBe('fixed');
    expect(modal.style.zIndex).toBe('1000');

    // 7. Click Modal to close
    modal.click();

    // 8. Verify ReadOnly is false
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(handler.isReadOnly).toBe(false);
  });

  it('should close image zoom and unset readonly on key press', () => {
    // 1. Setup image node
    const root = mindMap.getRoot();
    const imageNode = mindMap.addNode(root.id, 'Image Node 2');
    if (!imageNode) return;
    const imageData =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    mindMap.pasteImage(root.id, imageData);

    // 2. Open Zoom
    const zoomBtn = container.querySelector('.mindmap-node img + div') as HTMLElement;
    expect(zoomBtn).not.toBeNull();
    zoomBtn.click();

    // 3. Verify Open
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
    const handler = (mindMap as any).controller.interactionHandler;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(handler.isReadOnly).toBe(true);
    expect(document.body.lastElementChild).not.toBeNull();

    // 4. Trigger Keydown (e.g., 'Escape')
    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
    document.dispatchEvent(event);

    // 5. Verify Closed
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(handler.isReadOnly).toBe(false);
    // Modal should be gone (or at least not covering if we just check implementation which removes it)
    // Note: The previous test might have left the modal if failed, but beforeEach creates new container.
    // Modal is appended to document.body, so we should check `document.body` children count or specific element.
    // Since we removed it in SvgRenderer, it should be gone.
    // However, document.body might have other things?
    // In this test environment, we can check if the modal div we expected is detached.
    // Or simply check if we can click things - but readOnly false is main verification.

    // Let's verify modal specific logic if possible, but readonly toggle is the main requirement.
  });
});
