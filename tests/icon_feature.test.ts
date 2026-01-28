import { MindMapService } from '../src/application/services/MindMapService';
import { MindMap } from '../src/domain/entities/MindMap';
import { Node } from '../src/domain/entities/Node';
import { IdGenerator } from '../src/domain/interfaces/IdGenerator';

class MockIdGenerator implements IdGenerator {
    private counter = 0;
    generate(): string {
        return `node-${this.counter++}`;
    }
}

describe('Icon Feature', () => {
    let mindMap: MindMap;
    let service: MindMapService;
    let idGenerator: IdGenerator;

    beforeEach(() => {
        idGenerator = new MockIdGenerator();
        const root = new Node('root', 'Root Topic', null, true);
        mindMap = new MindMap(root);
        service = new MindMapService(mindMap, idGenerator);
    });

    test('should update node icon', () => {
        const node = service.addNode('root', 'Child');
        expect(node).not.toBeNull();

        const result = service.updateNodeIcon(node!.id, '🔵');
        expect(result).toBe(true);
        expect(node!.icon).toBe('🔵');
    });

    test('should persist icon in exportData', () => {
        const node = service.addNode('root', 'Child');
        service.updateNodeIcon(node!.id, '⭐️');

        const data = service.exportData();
        const childData = data.nodeData.children![0];
        expect(childData.icon).toBe('⭐️');
    });

    test('should load icon in importData', () => {
        const data = {
            nodeData: {
                id: 'root',
                topic: 'Root',
                root: true as const,
                children: [
                    {
                        id: 'child-1',
                        topic: 'Child',
                        icon: '✅'
                    }
                ]
            }
        };

        service.importData(data);
        const child = mindMap.root.children[0];
        expect(child.icon).toBe('✅');
    });

    test('should copy icon when copying node', () => {
        const node = service.addNode('root', 'Child');
        service.updateNodeIcon(node!.id, '⚠️');

        service.copyNode(node!.id);
        const pastedNode = service.pasteNode('root');

        expect(pastedNode).not.toBeNull();
        expect(pastedNode!.icon).toBe('⚠️');
    });
});
