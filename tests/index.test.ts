// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { Kakidash } from '../src/index';

describe('Kakidash', () => {
  it('should be defined', () => {
    expect(Kakidash).toBeDefined();
  });

  it('should be instantiable', () => {
    const container = document.createElement('div');
    const board = new Kakidash(container);
    expect(board).toBeInstanceOf(Kakidash);
  });
});
