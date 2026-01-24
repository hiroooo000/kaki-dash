import { describe, it, expect } from 'vitest';
import { CryptoIdGenerator } from '../../src/infrastructure/impl/CryptoIdGenerator';

describe('CryptoIdGenerator', () => {
  it('should generate unique IDs', () => {
    const generator = new CryptoIdGenerator();
    const id1 = generator.generate();
    const id2 = generator.generate();

    expect(id1).toBeTruthy();
    expect(id2).toBeTruthy();
    expect(id1).not.toBe(id2);
  });

  it('should generate string IDs', () => {
    const generator = new CryptoIdGenerator();
    const id = generator.generate();

    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  it('should generate IDs with reasonable length', () => {
    const generator = new CryptoIdGenerator();
    const id = generator.generate();

    // UUID format is 36 characters, fallback is variable but should be reasonable
    expect(id.length).toBeGreaterThan(10);
  });
});
