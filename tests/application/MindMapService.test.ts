/* eslint-disable @typescript-eslint/no-explicit-any */

/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { describe, it, expect, beforeEach } from 'vitest';
import { Node } from '../../src/domain/entities/Node';
import { MindMap } from '../../src/domain/entities/MindMap';
import { MindMapService } from '../../src/application/services/MindMapService';
import { CryptoIdGenerator } from '../../src/infrastructure/impl/CryptoIdGenerator';

describe('MindMapService', () => {
  let mindMap: MindMap;
  let service: MindMapService;
  let root: Node;

  beforeEach(() => {
    root = new Node('root', 'Root Topic');
    mindMap = new MindMap(root);
    const idGenerator = new CryptoIdGenerator();
    service = new MindMapService(mindMap, idGenerator);
  });

  it('should add a node', () => {
    const newNode = service.addNode('root', 'Child Topic');
    expect(newNode).toBeDefined();
    expect(newNode?.topic).toBe('Child Topic');
    expect(newNode?.parentId).toBe('root');
    expect(root.children).toContain(newNode);
  });

  it('should remove a node', () => {
    const newNode = service.addNode('root', 'To Be Removed');
    expect(newNode).toBeDefined();
    if (newNode) {
      const result = service.removeNode(newNode.id);
      expect(result).toBe(true);
      expect(root.children).not.toContain(newNode);
    }
  });

  it('should update node topic', () => {
    service.updateNodeTopic('root', 'Updated Root');
    expect(root.topic).toBe('Updated Root');
  });

  it('should update node style', () => {
    service.updateNodeStyle('root', { fontWeight: 'bold', color: 'red' });
    expect(root.style.fontWeight).toBe('bold');
    expect(root.style.color).toBe('red');
  });

  it('should not update style for non-existent node', () => {
    const result = service.updateNodeStyle('non-existent', { color: 'blue' });
    expect(result).toBe(false);
  });

  it('should not remove root node', () => {
    // Manually set isRoot to true for testing if not already
    root.isRoot = true;
    const result = service.removeNode('root');
    expect(result).toBe(false);
  });

  it('should add sibling node after', () => {
    const child1 = service.addNode('root', 'Child 1');
    service.addNode('root', 'Child 2'); // Keep the side effect of adding a node, but don't assign to unused var

    expect(child1).toBeDefined();
    if (child1) {
      const result = service.addSibling(child1.id, 'after', 'Sibling After');
      expect(result).toBeDefined();
      expect(result?.parentId).toBe('root');
      expect(root.children[1].topic).toBe('Sibling After');
    }
  });

  it('should add sibling node before', () => {
    const child1 = service.addNode('root', 'Child 1');

    expect(child1).toBeDefined();
    if (child1) {
      const result = service.addSibling(child1.id, 'before', 'Sibling Before');
      expect(result).toBeDefined();
      expect(result?.parentId).toBe('root');
      expect(root.children[0].topic).toBe('Sibling Before');
    }
  });

  it('should insert parent node', () => {
    const child1 = service.addNode('root', 'Child 1');

    expect(child1).toBeDefined();
    if (child1) {
      const newNode = service.insertParent(child1.id, 'New topic');
      expect(newNode).toBeDefined();

      // Verify hierarchy: Root -> New Parent -> Child 1
      expect(newNode?.parentId).toBe('root');
      expect(child1.parentId).toBe(newNode?.id);
      expect(root.children).toContain(newNode);
      expect(newNode?.children).toContain(child1);
      expect(root.children).not.toContain(child1);
    }
  });

  it('should not insert parent for root', () => {
    root.isRoot = true;
    const result = service.insertParent('root');
    expect(result).toBeNull();
  });

  it('should move a node to a new parent', () => {
    const child1 = service.addNode('root', 'Child 1');
    const child2 = service.addNode('root', 'Child 2');

    expect(child1).toBeDefined();
    expect(child2).toBeDefined();

    if (child1 && child2) {
      const result = service.moveNode(child1.id, child2.id);
      expect(result).toBe(true);

      expect(child1.parentId).toBe(child2.id);
      expect(child2.children).toContain(child1);
      expect(root.children).not.toContain(child1);
    }
  });

  it('should not move a node to itself', () => {
    const child1 = service.addNode('root', 'Child 1');
    expect(child1).toBeDefined();

    if (child1) {
      const result = service.moveNode(child1.id, child1.id);
      expect(result).toBe(false);
    }
  });

  it('should not move a node to its descendant', () => {
    const child1 = service.addNode('root', 'Child 1');
    const grandChild = service.addNode(child1!.id, 'GrandChild');

    expect(child1).toBeDefined();
    expect(grandChild).toBeDefined();

    if (child1 && grandChild) {
      const result = service.moveNode(child1.id, grandChild.id);
      expect(result).toBe(false);

      // Structure should remain unchanged
      expect(grandChild.parentId).toBe(child1.id);
      expect(child1.parentId).toBe('root');
    }
  });

  it('should update layoutSide when moving to same parent', () => {
    const child1 = service.addNode('root', 'Child 1', 'right');
    expect(child1).toBeDefined();
    if (child1) {
      expect(child1.layoutSide).toBe('right');

      // Move to same parent but change side
      const result = service.moveNode(child1.id, 'root', 'left');
      expect(result).toBe(true);
      expect(child1.layoutSide).toBe('left');
    }
  });

  describe('Persistence', () => {
    it('should export data correctly', () => {
      const child1 = service.addNode('root', 'Child 1');
      service.addNode('root', 'Child 2'); // Create but don't capture if unused, or capture and use?
      if (child1) {
        service.addNode(child1.id, 'GrandChild');
      }

      const data = service.exportData();

      expect(data.nodeData.id).toBe('root');
      expect(data.nodeData.topic).toBe('Root Topic');
      expect(data.nodeData.children).toBeDefined();
      expect(data.nodeData.children?.length).toBe(2);
      // Order isn't guaranteed in children array unless we enforce it, but typically push/splice maintains order.
      // Check if we can find them.
      const c1 = data.nodeData.children?.find((c) => c.id === child1?.id);
      expect(c1).toBeDefined();
      expect(c1?.children?.length).toBe(1); // GrandChild
    });

    it('should import data correctly', () => {
      const data: any = {
        nodeData: {
          id: 'new-root',
          topic: 'New Root',
          root: true,
          children: [
            {
              id: 'c1',
              topic: 'Child 1',
              children: [
                {
                  id: 'gc1',
                  topic: 'GrandChild 1',
                },
              ],
            },
            {
              id: 'c2',
              topic: 'Child 2',
            },
          ],
        },
      };

      service.importData(data);

      const newRoot = service.mindMap.root;
      expect(newRoot.id).toBe('new-root');
      expect(newRoot.topic).toBe('New Root');
      expect(newRoot.isRoot).toBe(true);
      expect(newRoot.children.length).toBe(2);

      const c1 = newRoot.children.find((c) => c.id === 'c1');
      expect(c1).toBeDefined();
      expect(c1?.parentId).toBe('new-root');
      expect(c1?.children.length).toBe(1);

      const gc1 = c1?.children[0];
      expect(gc1?.parentId).toBe('c1');
      expect(gc1?.topic).toBe('GrandChild 1');
    });

    it('should persist folded state', () => {
      const child1 = service.addNode('root', 'Child 1');
      expect(child1).toBeDefined();

      if (child1) {
        service.addNode(child1.id, 'GrandChild'); // Add child to allow fold

        service.toggleNodeFold(child1.id);
        expect(child1.isFolded).toBe(true);

        const data = service.exportData();
        const childData = data.nodeData.children?.find((c) => c.id === child1.id);
        expect(childData?.isFolded).toBe(true);

        // Import back
        service.importData(data);
        const importedChild = service.mindMap.findNode(child1.id);
        expect(importedChild).toBeDefined();
        expect(importedChild?.isFolded).toBe(true);
      }
    });

    it('should toggle node fold state', () => {
      const child1 = service.addNode('root', 'Child 1');
      expect(child1).toBeDefined();
      if (child1) {
        // Must add a child for fold to work
        service.addNode(child1.id, 'GrandChild');

        expect(child1.isFolded).toBe(false);
        const result = service.toggleNodeFold(child1.id);
        expect(result).toBe(true);
        expect(child1.isFolded).toBe(true);

        service.toggleNodeFold(child1.id);
        expect(child1.isFolded).toBe(false);
      }
    });
  });
});
