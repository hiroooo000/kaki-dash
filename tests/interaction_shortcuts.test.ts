import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InteractionHandler } from '../src/presentation/InteractionHandler';
import { InteractionOptions } from '../src/presentation/InteractionHandler';
import { ShortcutConfig } from '../src/domain/interfaces/ShortcutConfig';

describe('InteractionHandler Shortcuts', () => {
  let container: HTMLElement;
  let options: InteractionOptions;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    options = {
      onNodeClick: vi.fn(),
      onNavigate: vi.fn(),
      onAddChild: vi.fn(),
      onInsertParent: vi.fn(),
      onAddSibling: vi.fn(),
      onDeleteNode: vi.fn(),
      onUpdateNode: vi.fn(),
      onPan: vi.fn(),
      onCopyNode: vi.fn(),
      onPasteNode: vi.fn(),
      onCutNode: vi.fn(),
      onZoom: vi.fn(),
      onUndo: vi.fn(),
      onRedo: vi.fn(),
      onStyleAction: vi.fn(),
      onToggleFold: vi.fn(),
      onDropNode: vi.fn(),
    };
  });

  it('should use default shortcuts when no config provided', () => {
    const handler = new InteractionHandler(container, options);
    handler.updateSelection('root');

    // Simulate 'Tab' key press (default for addChild)
    const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true });
    document.body.dispatchEvent(event);

    expect(options.onAddChild).toHaveBeenCalled();
  });

  it('should support custom shortcuts overriding defaults', () => {
    const customShortcuts: ShortcutConfig = {
      addChild: [{ key: 'n', ctrlKey: true }], // Override addChild to Ctrl+N
    };

    const handler = new InteractionHandler(container, { ...options, shortcuts: customShortcuts });
    handler.updateSelection('root');

    // Simulate 'Tab' - should NOT work anymore
    const tabEvent = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true });
    document.body.dispatchEvent(tabEvent);
    expect(options.onAddChild).not.toHaveBeenCalled();

    // Simulate 'Ctrl+N' - SHOULD work
    const customEvent = new KeyboardEvent('keydown', { key: 'n', ctrlKey: true, bubbles: true });
    document.body.dispatchEvent(customEvent);
    expect(options.onAddChild).toHaveBeenCalled();
  });

  it('should handle complex modifiers correctly', () => {
    const customShortcuts: ShortcutConfig = {
      navUp: [{ key: 'ArrowUp', shiftKey: true, altKey: true }],
    };
    const handler = new InteractionHandler(container, { ...options, shortcuts: customShortcuts });
    handler.updateSelection('root');

    const event = new KeyboardEvent('keydown', {
      key: 'ArrowUp',
      shiftKey: true,
      altKey: true,
      bubbles: true,
    });
    document.body.dispatchEvent(event);
    expect(options.onNavigate).toHaveBeenCalled();
  });

  it('should allow multiple bindings for same action', () => {
    const customShortcuts: ShortcutConfig = {
      addChild: [{ key: 'Tab' }, { key: 'Insert' }],
    };
    const handler = new InteractionHandler(container, { ...options, shortcuts: customShortcuts });
    handler.updateSelection('root');

    // Tab working
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    expect(options.onAddChild).toHaveBeenCalledTimes(1);

    // Insert working
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Insert', bubbles: true }));
    expect(options.onAddChild).toHaveBeenCalledTimes(2);
  });

  it('should return configured shortcuts', () => {
    const customShortcuts: ShortcutConfig = {
      addChild: [{ key: 'n', ctrlKey: true }],
    };
    const handler = new InteractionHandler(container, { ...options, shortcuts: customShortcuts });

    // Check if it returns merged shortcuts (default + custom)
    const shortcuts = handler.getShortcuts();
    expect(shortcuts.addChild).toEqual([{ key: 'n', ctrlKey: true }]); // overridden
    expect(shortcuts.undo).toBeDefined(); // defaults should exist
  });
});
