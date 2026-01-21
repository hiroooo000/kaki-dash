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
  isFolded?: boolean;
  parentId?: string;
  image?: string;
  layoutSide?: 'left' | 'right';
}

export type Theme = 'default' | 'simple' | 'colorful' | 'custom';

export interface MindMapData {
  nodeData: MindMapNodeData;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  linkData?: any;
  theme?: Theme;
  direction?: number;
  selectedId?: string;
}
