import { MindMap } from '../../domain/entities/MindMap';

export interface Renderer {
  render(mindMap: MindMap, selectedNodeId?: string | null): void;
}
