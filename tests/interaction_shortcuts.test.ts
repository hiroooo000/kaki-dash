import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { InteractionHandler, InteractionOptions } from '../src/presentation/InteractionHandler';

describe('InteractionHandler Shortcuts', () => {
  let container: HTMLElement;
  let options: InteractionOptions;
  let handler: InteractionHandler;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container); // Append to body for focus/event bubbling
    options = {
      onNodeClick: vi.fn(),
      onAddChild: vi.fn(),
      onAddSibling: vi.fn(),
      onDeleteNode: vi.fn(),
      onDropNode: vi.fn(),
      onNavigate: vi.fn(),
      onStyleAction: vi.fn(),
      onUndo: vi.fn(),
      onRedo: vi.fn(),
    };
    handler = new InteractionHandler(container, options);
    handler.updateSelection('test-node-id');
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  const triggerKey = (
    key: string,
    modifiers: { ctrlKey?: boolean; metaKey?: boolean; shiftKey?: boolean } = {},
  ) => {
    const event = new KeyboardEvent('keydown', {
      key: key,
      ctrlKey: modifiers.ctrlKey || false,
      metaKey: modifiers.metaKey || false,
      shiftKey: modifiers.shiftKey || false,
      bubbles: true,
      cancelable: true,
    });
    document.dispatchEvent(event);
  };

  it('triggers bold action on b', () => {
    triggerKey('b');
    expect(options.onStyleAction).toHaveBeenCalledWith('test-node-id', { type: 'bold' });
  });

  it('triggers italic action on i', () => {
    triggerKey('i');
    expect(options.onStyleAction).toHaveBeenCalledWith('test-node-id', { type: 'italic' });
  });

  it('triggers increaseSize action on +', () => {
    triggerKey('+');
    expect(options.onStyleAction).toHaveBeenCalledWith('test-node-id', { type: 'increaseSize' });
  });

  it('triggers increaseSize action on Shift+=', () => {
    triggerKey('=', { shiftKey: true });
    expect(options.onStyleAction).toHaveBeenCalledWith('test-node-id', { type: 'increaseSize' });
  });

  it('triggers decreaseSize action on -', () => {
    triggerKey('-');
    expect(options.onStyleAction).toHaveBeenCalledWith('test-node-id', { type: 'decreaseSize' });
  });

  it('triggers color action on number keys 1-7', () => {
    triggerKey('1');
    expect(options.onStyleAction).toHaveBeenCalledWith('test-node-id', { type: 'color', index: 0 });

    triggerKey('2');
    expect(options.onStyleAction).toHaveBeenCalledWith('test-node-id', { type: 'color', index: 1 });

    triggerKey('7');
    expect(options.onStyleAction).toHaveBeenCalledWith('test-node-id', { type: 'color', index: 6 });
  });

  it('does not trigger color action on number 8', () => {
    triggerKey('8');
    expect(options.onStyleAction).not.toHaveBeenCalledWith('test-node-id', {
      type: 'color',
      index: 7,
    }); // Should not be called
  });

  it('does not trigger action if no node is selected', () => {
    handler.updateSelection(null);
    triggerKey('b', { ctrlKey: true });
    expect(options.onStyleAction).not.toHaveBeenCalled();
    expect(options.onStyleAction).not.toHaveBeenCalled();
  });

  describe('Vim-style Navigation', () => {
    it('triggers Navigate Left on h', () => {
      triggerKey('h');
      expect(options.onNavigate).toHaveBeenCalledWith('test-node-id', 'Left');
    });

    it('triggers Navigate Down on j', () => {
      triggerKey('j');
      expect(options.onNavigate).toHaveBeenCalledWith('test-node-id', 'Down');
    });

    it('triggers Navigate Up on k', () => {
      triggerKey('k');
      expect(options.onNavigate).toHaveBeenCalledWith('test-node-id', 'Up');
    });

    it('triggers Navigate Right on l', () => {
      triggerKey('l');
      expect(options.onNavigate).toHaveBeenCalledWith('test-node-id', 'Right');
    });
  });

  it('triggers edit mode on Space', () => {
    // Setup a node element in the DOM for startEditing to find
    const nodeEl = document.createElement('div');
    nodeEl.classList.add('mindmap-node');
    nodeEl.dataset.id = 'test-node-id';
    nodeEl.textContent = 'Test Topic';
    // Style needed for positioning logic in startEditing
    nodeEl.style.top = '100px';
    nodeEl.style.left = '100px';
    container.appendChild(nodeEl);

    triggerKey(' ');

    // Check if textarea is created
    const textarea = container.querySelector('textarea') || document.body.querySelector('textarea');
    expect(textarea).not.toBeNull();
    if (textarea) {
      expect(textarea.value).toBe('Test Topic');
      // Clean up
      textarea.remove();
    }
    nodeEl.remove();
  });


  it('triggers Undo on Ctrl+Z', () => {
    triggerKey('z', { ctrlKey: true });
    expect(options.onUndo).toHaveBeenCalled();
    expect(options.onRedo).not.toHaveBeenCalled();
  });

  it('triggers Redo on Ctrl+Shift+Z', () => {
    // Note: When Shift is held, key is usually uppercase 'Z'
    triggerKey('Z', { ctrlKey: true, shiftKey: true });
    expect(options.onRedo).toHaveBeenCalled();
    expect(options.onUndo).not.toHaveBeenCalled();
  });

  it('triggers Redo on Ctrl+Y', () => {
    triggerKey('y', { ctrlKey: true });
    expect(options.onRedo).toHaveBeenCalled();
  });

  it('does not trigger actions when typing in an input', () => {
    // Create an input element and focus it
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    // Trigger 'b' (Bold)
    const event = new KeyboardEvent('keydown', {
      key: 'b',
      bubbles: true,
      cancelable: true,
    });
    input.dispatchEvent(event);

    // Should NOT trigger style action
    expect(options.onStyleAction).not.toHaveBeenCalled();

    document.body.removeChild(input);
  });
  it('triggers zoom on Space for image nodes', () => {
    // Setup an image node element with a zoom button
    const nodeEl = document.createElement('div');
    nodeEl.classList.add('mindmap-node');
    nodeEl.dataset.id = 'test-image-node-id';
    nodeEl.style.top = '100px';
    nodeEl.style.left = '100px';

    // Mock zoom button
    const zoomBtn = document.createElement('button');
    zoomBtn.title = 'Zoom Image';
    const clickSpy = vi.spyOn(zoomBtn, 'click');
    nodeEl.appendChild(zoomBtn);

    container.appendChild(nodeEl);
    handler.updateSelection('test-image-node-id');

    triggerKey(' ');

    expect(clickSpy).toHaveBeenCalled();

    // Should NOT trigger edit mode (textarea creation)
    const textarea = container.querySelector('textarea') || document.body.querySelector('textarea');
    expect(textarea).toBeNull();

    nodeEl.remove();
  });
});
