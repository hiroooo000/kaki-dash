import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NodeDragger } from '../../src/presentation/NodeDragger';
import { InteractionOptions } from '../../src/presentation/InteractionHandler';

describe('NodeDragger', () => {
  let container: HTMLElement;
  let nodeDragger: NodeDragger;
  let options: InteractionOptions;
  let onDropNode: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);

    onDropNode = vi.fn();
    options = {
      onNodeClick: vi.fn(),
      onAddChild: vi.fn(),
      onAddSibling: vi.fn(),
      onDeleteNode: vi.fn(),
      onDropNode: onDropNode,
    } as unknown as InteractionOptions; // Cast to avoid mocking all methods

    nodeDragger = new NodeDragger(container, options);
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  it('should initialize and inject styles', () => {
    // Check if style tag is added
    const style = document.head.querySelector('style');
    expect(style).not.toBeNull();
    // Use textContent or innerHTML depending on implementation. In NodeDragger it is textContent
    expect(style?.textContent).toContain('.mindmap-node.drag-over-top');
  });

  it('should start drag correctly', () => {
    const node = document.createElement('div');
    node.classList.add('mindmap-node');
    node.dataset.id = 'node1';
    container.appendChild(node);

    const event = new DragEvent('dragstart', { bubbles: true });
    const dataTransfer = {
      setData: vi.fn(),
      effectAllowed: 'none',
    };
    Object.defineProperty(event, 'dataTransfer', {
      value: dataTransfer,
    });
    Object.defineProperty(event, 'target', {
      value: node,
    });

    nodeDragger.handleDragStart(event);

    expect(nodeDragger.draggedNodeId).toBe('node1');
    expect(dataTransfer.setData).toHaveBeenCalledWith('text/plain', 'node1');
    expect(dataTransfer.effectAllowed).toBe('move');
  });

  it('should set drag node id correctly from event target', () => {
    const node = document.createElement('div');
    node.classList.add('mindmap-node');
    node.dataset.id = 'node1';
    container.appendChild(node);

    const event = {
      target: node,
      preventDefault: vi.fn(),
      dataTransfer: {
        setData: vi.fn(),
        effectAllowed: '',
      },
    } as unknown as DragEvent;

    nodeDragger.handleDragStart(event);
    expect(nodeDragger.draggedNodeId).toBe('node1');
  });

  it('should determine drop position and style on drag over', () => {
    // Setup dragged node
    nodeDragger.draggedNodeId = 'node1';

    const targetNode = document.createElement('div');
    targetNode.classList.add('mindmap-node');
    targetNode.dataset.id = 'node2';
    // Mock getBoundingClientRect
    targetNode.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      width: 100,
      height: 100,
      bottom: 100,
      right: 100,
      x: 0,
      y: 0,
      toJSON: () => {},
    });
    container.appendChild(targetNode);

    const preventDefault = vi.fn();
    const event = {
      target: targetNode,
      preventDefault,
      clientX: 50,
      clientY: 10, // Top area
      dataTransfer: {
        dropEffect: 'none',
      },
    } as unknown as DragEvent;

    nodeDragger.handleDragOver(event);

    expect(targetNode.classList.contains('drag-over-top')).toBe(true);
    expect(preventDefault).toHaveBeenCalled();
  });

  it('should handle drop correctly', () => {
    // Setup dragged node
    nodeDragger.draggedNodeId = 'node1';

    const targetNode = document.createElement('div');
    targetNode.classList.add('mindmap-node');
    targetNode.dataset.id = 'node2';
    // Mock getBoundingClientRect
    targetNode.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      width: 100,
      height: 100,
      bottom: 100,
      right: 100,
      x: 0,
      y: 0,
      toJSON: () => {},
    });
    container.appendChild(targetNode);

    const event = {
      target: targetNode,
      preventDefault: vi.fn(),
      clientX: 50,
      clientY: 10, // Top
    } as unknown as DragEvent;

    nodeDragger.handleDrop(event);

    expect(onDropNode).toHaveBeenCalledWith('node1', 'node2', 'top');
    expect(nodeDragger.draggedNodeId).toBeNull();
  });
});
