// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Kakidash } from '../src/index';

describe('Kakidash Model Change Event Guard', () => {
  let container: HTMLElement;
  let board: Kakidash;
  let onChangeSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Mock requestAnimationFrame to prevent infinite loop
    // Mock requestAnimationFrame to prevent infinite loop.
    // We do NOT call the callback, effectively stopping the loop immediately after start.
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((_cb) => {
      return 1; // Return dummy ID
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => {
      clearTimeout(id);
    });

    container = document.createElement('div');
    // We need non-zero dimensions for some logic, though happy-dom might not strictly enforce layout
    Object.defineProperty(container, 'clientWidth', { value: 800 });
    Object.defineProperty(container, 'clientHeight', { value: 600 });
    document.body.appendChild(container);

    board = new Kakidash(container);
    onChangeSpy = vi.fn();
    board.on('model:change', onChangeSpy);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    board.destroy();
    document.body.innerHTML = '';
  });

  it('Should NOT emit model:change on edit start (Double Click)', () => {
    const rootId = board.getRootId();
    const node = board.addNode(rootId, 'Test Node');
    onChangeSpy.mockClear();

    board.selectNode(node!.id);
    const nodeEl = container.querySelector(`.mindmap-node[data-id="${node!.id}"]`);

    const dblClickEvent = new MouseEvent('dblclick', { bubbles: true });
    nodeEl!.dispatchEvent(dblClickEvent);

    expect(onChangeSpy).not.toHaveBeenCalled();
  });

  it('Should NOT emit model:change during text editing (Input)', () => {
    const rootId = board.getRootId();
    const node = board.addNode(rootId, 'Test Node');
    onChangeSpy.mockClear();

    board.selectNode(node!.id);
    const nodeEl = container.querySelector(`.mindmap-node[data-id="${node!.id}"]`);

    // Start edit
    const dblClickEvent = new MouseEvent('dblclick', { bubbles: true });
    nodeEl!.dispatchEvent(dblClickEvent);

    const input = document.body.querySelector('textarea');
    expect(input).not.toBeNull();

    // Type
    input!.value = 'Changed';
    const inputEvent = new Event('input', { bubbles: true });
    input!.dispatchEvent(inputEvent);

    expect(onChangeSpy).not.toHaveBeenCalled();
  });

  it('Should emit model:change when editing is finished (Blur)', () => {
    const rootId = board.getRootId();
    const node = board.addNode(rootId, 'Test Node');
    onChangeSpy.mockClear();

    board.selectNode(node!.id);
    const nodeEl = container.querySelector(`.mindmap-node[data-id="${node!.id}"]`);

    // Start edit
    nodeEl!.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    const input = document.body.querySelector('textarea');

    // Type
    input!.value = 'New Value';

    // Finish
    input!.dispatchEvent(new FocusEvent('blur'));

    expect(onChangeSpy).toHaveBeenCalledTimes(1);
  });

  it('Should NOT emit model:change when editing is cancelled (Escape)', () => {
    // Normal edit cancel -> No change
    const rootId = board.getRootId();
    const node = board.addNode(rootId, 'Test Node');
    onChangeSpy.mockClear();

    board.selectNode(node!.id);
    const nodeEl = container.querySelector(`.mindmap-node[data-id="${node!.id}"]`);

    // Start edit
    nodeEl!.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    const input = document.body.querySelector('textarea');

    // Cancel
    input!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(onChangeSpy).not.toHaveBeenCalled();
  });

  it('Should NOT emit model:change immediately on New Child (UI Trigger)', () => {
    const rootId = board.getRootId();
    board.selectNode(rootId);
    onChangeSpy.mockClear();

    // Trigger Add Child via Tab (Simulate UI interaction calling board.addChildNode)
    // Note: dispatching keydown on document
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }));

    // Check: Node should be added (node:add fires), but model:change should NOT fire yet
    expect(board.findNodes((n) => n.topic === 'New Child')).toHaveLength(1);
    expect(onChangeSpy).not.toHaveBeenCalled();

    // Wait for edit to start (async usually? No, synchronous in code but good to verify)
    const inputs = document.body.querySelectorAll('textarea');
    expect(inputs.length).toBeGreaterThan(0);
  });

  it('Should emit model:change after New Child edition is finished', () => {
    const rootId = board.getRootId();
    board.selectNode(rootId);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' })); // Add Child

    // Clear spy? No, verify it hasn't called yet
    expect(onChangeSpy).not.toHaveBeenCalled();

    // Finish editing with Enter
    const input = document.body.querySelector('textarea');
    expect(input).not.toBeNull();
    input!.value = 'My New Node';

    // We simulate Enter keydown on Input
    input!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    expect(onChangeSpy).toHaveBeenCalledTimes(1);
    expect(board.findNodes((n) => n.topic === 'My New Node')).toHaveLength(1);
  });

  it('Should emit model:change even if New Child edition is cancelled (Escape)', () => {
    const rootId = board.getRootId();
    board.selectNode(rootId);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' })); // Add Child
    expect(onChangeSpy).not.toHaveBeenCalled();

    const input = document.body.querySelector('textarea');
    expect(input).not.toBeNull();

    // Cancel editing
    input!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    // Since the node was added (even if topic didn't change from default), we effectively committed the "Add" operation on cancel.
    // So change event SHOULD fire to signal the model now has this new node permanently (until deleted).
    expect(onChangeSpy).toHaveBeenCalledTimes(1);
    expect(board.findNodes((n) => n.topic === 'New Child')).toHaveLength(1);
  });
});
