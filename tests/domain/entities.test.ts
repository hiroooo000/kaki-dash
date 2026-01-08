import { describe, it, expect } from 'vitest';
import { Node } from '../../src/domain/entities/Node';
import { MindMap } from '../../src/domain/entities/MindMap';

describe('Node Entity', () => {
  it('should create a node with correct properties', () => {
    const node = new Node('1', 'Root Node', null, true);
    expect(node.id).toBe('1');
    expect(node.topic).toBe('Root Node');
    expect(node.parentId).toBeNull();
    expect(node.isRoot).toBe(true);
    expect(node.children).toEqual([]);
  });

  it('should add a child node', () => {
    const parent = new Node('1', 'Parent');
    const child = new Node('2', 'Child');
    parent.addChild(child);

    expect(parent.children).toHaveLength(1);
    expect(parent.children[0]).toBe(child);
    expect(child.parentId).toBe('1');
  });

  it('should remove a child node', () => {
    const parent = new Node('1', 'Parent');
    const child = new Node('2', 'Child');
    parent.addChild(child);
    parent.removeChild('2');

    expect(parent.children).toHaveLength(0);
  });
});

describe('MindMap Entity', () => {
  it('should find a node by ID', () => {
    const root = new Node('1', 'Root');
    const child1 = new Node('2', 'Child 1');
    const child2 = new Node('3', 'Child 2');
    const grandChild = new Node('4', 'GrandChild');

    root.addChild(child1);
    root.addChild(child2);
    child1.addChild(grandChild);

    const mindMap = new MindMap(root);

    expect(mindMap.findNode('1')).toBe(root);
    expect(mindMap.findNode('2')).toBe(child1);
    expect(mindMap.findNode('4')).toBe(grandChild);
    expect(mindMap.findNode('999')).toBeNull();
  });
});
