import { MindMap } from './domain/entities/MindMap';
import { Node } from './domain/entities/Node';
import { MindMapService } from './application/MindMapService';
import { SvgRenderer } from './presentation/SvgRenderer';
import { InteractionHandler, Direction } from './presentation/InteractionHandler';

export class KakidashiBoard {
  private mindMap: MindMap;
  private service: MindMapService;
  private renderer: SvgRenderer;
  private interactionHandler: InteractionHandler;
  private selectedNodeId: string | null = null;

  constructor(container: HTMLElement) {
    const rootNode = new Node('root', 'Root Topic', null, true);
    this.mindMap = new MindMap(rootNode);
    this.service = new MindMapService(this.mindMap);
    this.renderer = new SvgRenderer(container);

    this.interactionHandler = new InteractionHandler(container, {
      onNodeClick: (nodeId) => this.selectNode(nodeId || null),
      onAddChild: (parentId) => this.addChildNode(parentId),
      onAddSibling: (nodeId) => this.addSiblingNode(nodeId),
      onDeleteNode: (nodeId) => this.removeNode(nodeId),
      onDropNode: (draggedId, targetId) => this.moveNode(draggedId, targetId),
      onUpdateNode: (nodeId, topic) => this.updateNodeTopic(nodeId, topic),
      onNavigate: (nodeId, direction) => this.navigateNode(nodeId, direction)
    });

    this.render();
  }

  addNode(parentId: string, topic?: string): Node | null {
    const node = this.service.addNode(parentId, topic);
    if (node) {
      this.render();
    }
    return node;
  }

  addChildNode(parentId: string): void {
    const node = this.addNode(parentId, 'New Child');
    if (node) {
      this.selectNode(node.id);
    }
  }

  addSiblingNode(nodeId: string): void {
    const node = this.mindMap.findNode(nodeId);
    if (node && node.parentId) {
      const newNode = this.addNode(node.parentId, 'New Sibling');
      if (newNode) {
        this.selectNode(newNode.id);
      }
    }
  }

  removeNode(nodeId: string): void {
    if (this.service.removeNode(nodeId)) {
      if (this.selectedNodeId === nodeId) {
        this.selectNode(null); // Deselect
      } else {
        this.render();
      }
    }
  }

  moveNode(nodeId: string, newParentId: string): void {
    if (this.service.moveNode(nodeId, newParentId)) {
      this.render();
    }
  }

  updateNodeTopic(nodeId: string, topic: string): void {
    if (this.service.updateNodeTopic(nodeId, topic)) {
      this.render();
    }
  }

  selectNode(nodeId: string | null): void {
    if (this.selectedNodeId === nodeId) return;
    this.selectedNodeId = nodeId;
    this.interactionHandler.updateSelection(nodeId);
    this.render();
  }

  private render(): void {
    this.renderer.render(this.mindMap, this.selectedNodeId);
  }

  navigateNode(nodeId: string, direction: Direction): void {
    const node = this.mindMap.findNode(nodeId);
    if (!node) return;

    switch (direction) {
      case 'Left':
        if (node.parentId) {
          this.selectNode(node.parentId);
        }
        break;
      case 'Right':
        if (node.children.length > 0) {
          // Select first child as per user request
          this.selectNode(node.children[0].id);
        }
        break;
      case 'Up':
        if (node.parentId) {
          const parent = this.mindMap.findNode(node.parentId);
          if (parent) {
            const index = parent.children.findIndex((c: Node) => c.id === nodeId);
            if (index > 0) {
              this.selectNode(parent.children[index - 1].id);
            }
          }
        }
        break;
      case 'Down':
        if (node.parentId) {
          const parent = this.mindMap.findNode(node.parentId);
          if (parent) {
            const index = parent.children.findIndex((c: Node) => c.id === nodeId);
            if (index !== -1 && index < parent.children.length - 1) {
              this.selectNode(parent.children[index + 1].id);
            }
          }
        }
        break;
    }
  }

  getRootId(): string {
    return this.mindMap.root.id;
  }
}
