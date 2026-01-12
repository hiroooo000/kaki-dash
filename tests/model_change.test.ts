// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Kakidash } from '../src/index';

describe('Kakidash model:change Event Coverage', () => {
  let container: HTMLElement;
  let board: Kakidash;
  let onChangeSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    board = new Kakidash(container);
    onChangeSpy = vi.fn();
    board.on('model:change', onChangeSpy);
  });

  const getRootId = () => board.getRoot().id;

  it('should emit model:change when adding a child node', () => {
    board.addNode(getRootId(), 'Child Node');
    expect(onChangeSpy).toHaveBeenCalled();
  });

  it('should emit model:change when adding a sibling node', () => {
    const child = board.addNode(getRootId(), 'Child 1');
    onChangeSpy.mockClear();

    board.addSibling(child!.id, 'after', 'Sibling Node');
    expect(onChangeSpy).toHaveBeenCalled();
  });

  it('should emit model:change when inserting a parent node', () => {
    const child = board.addNode(getRootId(), 'Child 1');
    onChangeSpy.mockClear();

    board.insertParent(child!.id, 'New topic');
    expect(onChangeSpy).toHaveBeenCalled();
  });

  it('should emit model:change when updating node topic', () => {
    const child = board.addNode(getRootId(), 'Child Node');
    onChangeSpy.mockClear();

    board.updateNode(child!.id, { topic: 'Updated Topic' });
    expect(onChangeSpy).toHaveBeenCalled();
  });

  it('should emit model:change when updating node style', () => {
    const child = board.addNode(getRootId(), 'Child Node');
    onChangeSpy.mockClear();

    board.updateNode(child!.id, { style: { color: 'red' } });
    expect(onChangeSpy).toHaveBeenCalled();
  });

  it('should emit model:change when deleting a node', () => {
    const child = board.addNode(getRootId(), 'Child Node');
    onChangeSpy.mockClear();

    board.deleteNode(child!.id);
    expect(onChangeSpy).toHaveBeenCalled();
  });

  it('should emit model:change when moving a node', () => {
    const parent1 = board.addNode(getRootId(), 'Parent 1');
    const child = board.addNode(parent1!.id, 'Child');
    const parent2 = board.addNode(getRootId(), 'Parent 2');
    onChangeSpy.mockClear();

    board.moveNode(child!.id, parent2!.id, 'right');
    expect(onChangeSpy).toHaveBeenCalled();
  });

  it('should emit model:change when reordering (moving) a node', () => {
    const child1 = board.addNode(getRootId(), 'Child 1');
    const child2 = board.addNode(getRootId(), 'Child 2');
    onChangeSpy.mockClear();

    // Move child1 below child2
    board.moveNode(child1!.id, child2!.id, 'bottom');
    expect(onChangeSpy).toHaveBeenCalled();
  });

  it('should emit model:change when pasting a node', () => {
    const child = board.addNode(getRootId(), 'Source Node');
    board.copyNode(child!.id); // Copy doesn't change model
    onChangeSpy.mockClear();

    board.pasteNode(getRootId());
    expect(onChangeSpy).toHaveBeenCalled();
  });

  it('should emit model:change when cutting a node', () => {
    const child = board.addNode(getRootId(), 'Source Node');
    const grandChild = board.addNode(child!.id, 'To Cut');
    onChangeSpy.mockClear();

    board.cutNode(grandChild!.id);
    expect(onChangeSpy).toHaveBeenCalled();
  });

  it('should emit model:change when setting theme', () => {
    onChangeSpy.mockClear();
    board.setTheme('colorful');
    expect(onChangeSpy).toHaveBeenCalled();
  });

  it('should emit model:change when loading data', () => {
    const data = board.getData();
    onChangeSpy.mockClear();

    board.loadData(data); // Even if same data, load generally triggers change or at least load event + change?
    // Implementation says emits load then change
    expect(onChangeSpy).toHaveBeenCalled();
  });
});
