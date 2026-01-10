import { describe, it, expect, beforeEach } from 'vitest';
import { MindMap } from '../src/domain/entities/MindMap';
import { Node } from '../src/domain/entities/Node';
import { MindMapService } from '../src/application/MindMapService';
import { Theme } from '../src/domain/interfaces/MindMapData';

describe('Theme Functionality', () => {
    let service: MindMapService;
    let rootNode: Node;

    beforeEach(() => {
        rootNode = new Node('root', 'Root');
        const mindMap = new MindMap(rootNode);
        service = new MindMapService(mindMap);
    });

    it('should set default theme initially', () => {
        expect(service.mindMap.theme).toBe('default');
    });

    it('should change theme correctly', () => {
        service.setTheme('simple');
        expect(service.mindMap.theme).toBe('simple');

        service.setTheme('colorful');
        expect(service.mindMap.theme).toBe('colorful');
    });

    it('should persist theme in export data', () => {
        service.setTheme('colorful');
        const data = service.exportData();
        expect(data.theme).toBe('colorful');
    });

    it('should load theme from import data', () => {
        const data = {
            nodeData: { id: 'root', topic: 'Root' },
            theme: 'simple' as Theme
        };
        service.importData(data);
        expect(service.mindMap.theme).toBe('simple');
    });
});
