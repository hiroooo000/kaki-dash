import { MindMapData } from './MindMapData';

export type KakidashEventMap = {
  'node:select': string | null; // Node ID or null
  'node:add': { id: string; topic: string };
  'node:remove': string; // Node ID
  'node:update': { id: string; topic: string };
  'node:move': { nodeId: string; newParentId: string; position?: string };
  'model:load': MindMapData;
  'model:change': void; // Generic change event
};
