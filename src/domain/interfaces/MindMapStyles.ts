export interface MindMapStyles {
  rootNode?: {
    border?: string;
    background?: string;
    color?: string;
  };
  childNode?: {
    border?: string;
    background?: string;
    color?: string;
  };
  connection?: {
    color?: string;
  };
  canvas?: {
    background?: string;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any; // Allow extensibility
}
