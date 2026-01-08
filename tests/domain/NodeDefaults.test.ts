
import { describe, it, expect } from 'vitest';
import { Node } from '../../src/domain/entities/Node';

describe('Node Defaults', () => {
    it('should initialize with default fontSize of 16px', () => {
        const node = new Node('test-id', 'Test Topic');
        expect(node.style).toEqual({ fontSize: '16px' });
    });

    it('should initialize with default fontSize of 24px for Root nodes', () => {
        const node = new Node('root-id', 'Root Topic', null, true);
        expect(node.style).toEqual({ fontSize: '24px' });
    });

    it('should allow overriding default style via constructor (if supported) or property assignment', () => {
        // Currently constructor doesn't take style, so we test property assignment
        const node = new Node('test-id', 'Test Topic');
        node.style = { fontSize: '24px', color: 'red' };
        expect(node.style).toEqual({ fontSize: '24px', color: 'red' });
    });
});
