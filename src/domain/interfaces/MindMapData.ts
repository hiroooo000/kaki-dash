export interface MindMapNodeData {
  id: string;
  topic: string;
  style?: {
    fontSize?: string;
    color?: string;
    background?: string;
    fontWeight?: string;
  };
  children?: MindMapNodeData[];
  root?: boolean;
  expanded?: boolean;
  parentId?: string;
  image?: string;
  layoutSide?: 'left' | 'right';
}

export type Theme = 'default' | 'simple' | 'colorful';

export interface MindMapData {
  nodeData: MindMapNodeData;
  linkData?: any;
  theme?: Theme;
  direction?: number;
}
