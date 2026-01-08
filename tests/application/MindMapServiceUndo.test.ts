import { describe, it, expect, beforeEach } from 'vitest';
import { MindMapService } from '../../src/application/MindMapService';
import { MindMap } from '../../src/domain/entities/MindMap';
import { Node } from '../../src/domain/entities/Node';

describe('MindMapService Undo', () => {
  let service: MindMapService;
  let mindMap: MindMap;
  let rootNode: Node;

  beforeEach(() => {
    rootNode = new Node('root', 'Root Topic', null, true);
    mindMap = new MindMap(rootNode);
    service = new MindMapService(mindMap);
  });

  it('should undo adding a node', () => {
    service.addNode('root', 'Child 1');
    expect(mindMap.root.children.length).toBe(1);

    const success = service.undo();
    expect(success).toBe(true);
    expect(mindMap.root.children.length).toBe(0);
  });

  it('should undo updating a node topic', () => {
    const newNode = service.addNode('root', 'Child 1');
    if (!newNode) throw new Error('Failed to add node');

    service.updateNodeTopic(newNode.id, 'Updated Topic');
    expect(mindMap.findNode(newNode.id)?.topic).toBe('Updated Topic');

    service.undo();
    expect(mindMap.findNode(newNode.id)?.topic).toBe('Child 1');
  });

  it('should handle history limit (10 items)', () => {
    // 11 changes
    for (let i = 0; i < 11; i++) {
      service.addNode('root', `Child ${i}`);
    }
    expect(mindMap.root.children.length).toBe(11);

    // Should be able to undo 10 times
    for (let i = 0; i < 10; i++) {
      expect(service.undo()).toBe(true);
    }
    // Only 1 child should remain (Child 0), as the 1st state save (empty -> Child 0) was pushed out
    expect(mindMap.root.children.length).toBe(1);

    // Further undo should be false
    expect(service.undo()).toBe(false);
  });

  it('should return false when nothing to undo', () => {
    expect(service.undo()).toBe(false);
  });

  it('should undo multiple steps correctly', () => {
    const node1 = service.addNode('root', 'Node 1');
    if (!node1) throw new Error('fail');

    service.updateNodeTopic(node1.id, 'Node 1 Updated');
    const node2 = service.addNode('root', 'Node 2');
    if (!node2) throw new Error('fail');

    // State: Root -> [Node 1 Updated, Node 2]

    // Undo add Node 2
    service.undo();
    expect(mindMap.findNode(node2.id)).toBeNull();
    expect(mindMap.findNode(node1.id)?.topic).toBe('Node 1 Updated');

    // Undo update Node 1
    service.undo();
    expect(mindMap.findNode(node1.id)?.topic).toBe('Node 1');

    // Undo add Node 1
    service.undo();
    expect(mindMap.findNode(node1.id)).toBeNull();
  });
});
