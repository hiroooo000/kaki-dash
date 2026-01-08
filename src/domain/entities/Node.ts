export interface NodeStyle {
  color?: string;
  background?: string;
  fontSize?: string;
  fontWeight?: string;
  fontStyle?: string;
}

export class Node {
  id: string;
  topic: string;
  children: Node[];
  style: NodeStyle;
  parentId: string | null;
  isRoot: boolean;
  image?: string;
  layoutSide?: 'left' | 'right';

  constructor(
    id: string,
    topic: string,
    parentId: string | null = null,
    isRoot: boolean = false,
    image?: string,
    layoutSide?: 'left' | 'right',
  ) {
    this.id = id;
    this.topic = topic;
    this.children = [];
    this.style = {};
    this.parentId = parentId;
    this.isRoot = isRoot;
    this.image = image;
    this.layoutSide = layoutSide;
  }

  addChild(node: Node): void {
    node.parentId = this.id;
    this.children.push(node);
  }

  insertChild(node: Node, index: number): void {
    node.parentId = this.id;
    if (index >= 0 && index <= this.children.length) {
      this.children.splice(index, 0, node);
    } else {
      this.children.push(node);
    }
  }

  removeChild(nodeId: string): void {
    this.children = this.children.filter((child) => child.id !== nodeId);
  }

  updateTopic(topic: string): void {
    this.topic = topic;
  }
}
