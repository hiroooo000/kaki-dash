import { describe, it, expect } from 'vitest';
import { KakidashiBoard } from '../src/index';

describe('KakidashiBoard', () => {
    it('should be defined', () => {
        expect(KakidashiBoard).toBeDefined();
    });

    it('should be instantiable', () => {
        const board = new KakidashiBoard();
        expect(board).toBeInstanceOf(KakidashiBoard);
    });
});
