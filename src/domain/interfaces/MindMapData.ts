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
}

export interface MindMapData {
    nodeData: MindMapNodeData;
    linkData?: any;
    theme?: any;
    direction?: number;
}
