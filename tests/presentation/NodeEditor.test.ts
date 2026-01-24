// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NodeEditor } from '../../src/presentation/components/NodeEditor';
import type { InteractionOptions } from '../../src/presentation/logic/InteractionHandler';

describe('NodeEditor', () => {
  let container: HTMLElement;
  let nodeEditor: NodeEditor;
  let element: HTMLElement;
  let options: InteractionOptions;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);

    element = document.createElement('div');
    element.textContent = 'Test Node';
    element.style.position = 'absolute';
    element.style.left = '100px';
    element.style.top = '100px';
    element.style.font = '16px Arial';
    element.style.padding = '8px';
    container.appendChild(element);

    options = {
      onNodeClick: vi.fn(),
      onAddChild: vi.fn(),
      onAddSibling: vi.fn(),
      onDeleteNode: vi.fn(),
      onDropNode: vi.fn(),
      onUpdateNode: vi.fn(),
      onEditEnd: vi.fn(),
    };

    nodeEditor = new NodeEditor(container, -1, options);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('should create textarea on startEditing', () => {
    nodeEditor.startEditing(element, 'node1');

    const textarea = container.querySelector('textarea');
    expect(textarea).not.toBeNull();
    expect(textarea?.value).toBe('Test Node');
  });

  it('should call onUpdateNode when Enter is pressed', () => {
    nodeEditor.startEditing(element, 'node1');

    const textarea = container.querySelector('textarea')!;
    textarea.value = 'Updated';
    textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    expect(options.onUpdateNode).toHaveBeenCalledWith('node1', 'Updated');
  });

  it('should not call onUpdateNode when value is unchanged', () => {
    nodeEditor.startEditing(element, 'node1');

    const textarea = container.querySelector('textarea')!;
    // Keep original value
    textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    expect(options.onUpdateNode).not.toHaveBeenCalled();
  });

  it('should call onEditEnd when Enter is pressed', () => {
    nodeEditor.startEditing(element, 'node1');

    const textarea = container.querySelector('textarea')!;
    textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    expect(options.onEditEnd).toHaveBeenCalledWith('node1');
  });

  it('should call onEditEnd when Escape is pressed', () => {
    nodeEditor.startEditing(element, 'node1');

    const textarea = container.querySelector('textarea')!;
    textarea.value = 'Changed';
    textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(options.onUpdateNode).not.toHaveBeenCalled();
    expect(options.onEditEnd).toHaveBeenCalledWith('node1');
  });

  it('should respect maxWidth option', () => {
    nodeEditor.setMaxWidth(200);
    nodeEditor.startEditing(element, 'node1');

    const textarea = container.querySelector('textarea')!;
    expect(textarea.style.maxWidth).toBe('200px');
  });

  it('should not set maxWidth when -1', () => {
    nodeEditor.setMaxWidth(-1);
    nodeEditor.startEditing(element, 'node1');

    const textarea = container.querySelector('textarea')!;
    expect(textarea.style.maxWidth).toBe('');
  });

  it('should copy styles from original element', () => {
    nodeEditor.startEditing(element, 'node1');

    const textarea = container.querySelector('textarea')!;
    const computed = window.getComputedStyle(element);

    expect(textarea.style.font).toBe(computed.font);
    expect(textarea.style.padding).toBe(computed.padding);
  });

  it('should allow Shift+Enter for new line', () => {
    nodeEditor.startEditing(element, 'node1');

    const textarea = container.querySelector('textarea')!;
    const preventDefault = vi.fn();
    const event = new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true });
    Object.defineProperty(event, 'preventDefault', { value: preventDefault });
    textarea.dispatchEvent(event);

    expect(preventDefault).not.toHaveBeenCalled();
    expect(options.onUpdateNode).not.toHaveBeenCalled();
  });

  it('should call onEditEnd on blur', () => {
    nodeEditor.startEditing(element, 'node1');

    const textarea = container.querySelector('textarea')!;
    textarea.value = 'Blurred';
    textarea.dispatchEvent(new FocusEvent('blur'));

    expect(options.onUpdateNode).toHaveBeenCalledWith('node1', 'Blurred');
    expect(options.onEditEnd).toHaveBeenCalledWith('node1');
  });

  it('should not process events when composing (IME)', () => {
    nodeEditor.startEditing(element, 'node1');

    const textarea = container.querySelector('textarea')!;
    textarea.value = 'Composing';

    const event = new KeyboardEvent('keydown', { key: 'Enter' });
    Object.defineProperty(event, 'isComposing', { value: true });
    textarea.dispatchEvent(event);

    expect(options.onUpdateNode).not.toHaveBeenCalled();
  });

  it('should restore original outline and boxShadow on cleanup', () => {
    element.style.outline = '2px solid red';
    element.style.boxShadow = '0 0 10px blue';

    nodeEditor.startEditing(element, 'node1');

    // Outline and boxShadow should be removed during editing
    expect(element.style.outline).toContain('none');
    expect(element.style.boxShadow).toContain('none');

    const textarea = container.querySelector('textarea')!;
    textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    // Should be restored after editing (happy-dom may reorder the values)
    expect(element.style.outline).toContain('2px');
    expect(element.style.outline).toContain('solid');
    expect(element.style.outline).toContain('red');
    expect(element.style.boxShadow).toBe('0 0 10px blue');
  });

  it('should remove textarea from DOM on cleanup', () => {
    nodeEditor.startEditing(element, 'node1');

    let textarea = container.querySelector('textarea');
    expect(textarea).not.toBeNull();

    textarea!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    textarea = container.querySelector('textarea');
    expect(textarea).toBeNull();
  });
});
