import { IdGenerator } from '../domain/interfaces/IdGenerator';

export class CryptoIdGenerator implements IdGenerator {
  generate(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    // Fallback for environments without crypto.randomUUID
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}
