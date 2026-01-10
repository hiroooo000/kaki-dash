/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
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
      onStyleAction: vi.fn(), // We are testing this
      onNavigate: vi.fn(),
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

  it('triggers bold action on Ctrl+B', () => {
    triggerKey('b', { ctrlKey: true });
    expect(options.onStyleAction).toHaveBeenCalledWith('test-node-id', { type: 'bold' });
  });

  it('triggers italic action on Ctrl+I', () => {
    triggerKey('i', { ctrlKey: true });
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
  });

  // Vim Navigation Tests
  it('triggers traverse Up on k', () => {
    triggerKey('k');
    expect(options.onNavigate).toHaveBeenCalledWith('test-node-id', 'Up');
  });

  it('triggers traverse Down on j', () => {
    triggerKey('j');
    expect(options.onNavigate).toHaveBeenCalledWith('test-node-id', 'Down');
  });

  it('triggers traverse Left on h', () => {
    triggerKey('h');
    expect(options.onNavigate).toHaveBeenCalledWith('test-node-id', 'Left');
  });

  it('triggers traverse Right on l', () => {
    triggerKey('l');
    expect(options.onNavigate).toHaveBeenCalledWith('test-node-id', 'Right');
  });

  it('triggers edit mode on i', () => {
    // Setup a node element in the DOM for startEditing to find
    const nodeEl = document.createElement('div');
    nodeEl.classList.add('mindmap-node');
    nodeEl.dataset.id = 'test-node-id';
    nodeEl.textContent = 'Test Topic';
    // Style needed for positioning logic in startEditing
    nodeEl.style.top = '100px';
    nodeEl.style.left = '100px';
    container.appendChild(nodeEl);

    triggerKey('i');

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
});
