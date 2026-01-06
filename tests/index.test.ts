import { describe, it, expect } from 'vitest';
import { KakidashiBoard } from '../src/index';

describe('KakidashiBoard', () => {
    it('should be defined', () => {
        expect(KakidashiBoard).toBeDefined();
    });

    it('should be instantiable', () => {
        const container = document.createElement('div');
        const board = new KakidashiBoard(container);
        expect(board).toBeInstanceOf(KakidashiBoard);
    });
});
