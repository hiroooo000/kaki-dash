import { describe, it, expect } from 'vitest';
import { ShortcutManager } from '../../src/presentation/ShortcutManager';
import { ShortcutConfig } from '../../src/domain/interfaces/ShortcutConfig';

describe('ShortcutManager', () => {
  const mockShortcuts: ShortcutConfig = {
    navUp: [{ key: 'ArrowUp' }],
    navDown: [{ key: 'ArrowDown', ctrlKey: true }],
    deleteNode: [{ key: 'Delete' }, { key: 'Backspace', metaKey: true }],
    bold: [{ key: 'b', ctrlKey: true }],
    zoomIn: [{ key: '>', shiftKey: true }, { key: '.' }],
    scaleUp: [{ key: '[' }],
    resetZoom: [{ key: ':' }],
    addChild: [{ key: 'Tab' }, { key: 'a' }],
  };

  const manager = new ShortcutManager(mockShortcuts);

  // Helper to create keyboard events
  const createEvent = (
    key: string,
    modifiers: { ctrl?: boolean; meta?: boolean; alt?: boolean; shift?: boolean } = {},
  ) => {
    return new KeyboardEvent('keydown', {
      key,
      ctrlKey: modifiers.ctrl ?? false,
      metaKey: modifiers.meta ?? false,
      altKey: modifiers.alt ?? false,
      shiftKey: modifiers.shift ?? false,
    });
  };

  describe('matches', () => {
    it('should match simple key', () => {
      const event = createEvent('ArrowUp');
      expect(manager.matches(event, 'navUp')).toBe(true);
    });

    it('should fail if key is different', () => {
      const event = createEvent('ArrowDown');
      expect(manager.matches(event, 'navUp')).toBe(false);
    });

    it('should match key with modifier', () => {
      const event = createEvent('ArrowDown', { ctrl: true });
      expect(manager.matches(event, 'navDown')).toBe(true);
    });

    it('should fail if required modifier is missing', () => {
      const event = createEvent('ArrowDown');
      expect(manager.matches(event, 'navDown')).toBe(false);
    });

    it('should fail if extra modifier is present', () => {
      const event = createEvent('ArrowUp', { ctrl: true });
      expect(manager.matches(event, 'navUp')).toBe(false);
    });

    it('should match one of multiple bindings', () => {
      const event1 = createEvent('Delete');
      const event2 = createEvent('Backspace', { meta: true });

      expect(manager.matches(event1, 'deleteNode')).toBe(true);
      expect(manager.matches(event2, 'deleteNode')).toBe(true);
    });

    it('should match case insensitive for keys', () => {
      const event = createEvent('B', { ctrl: true });
      expect(manager.matches(event, 'bold')).toBe(true);
    });

    it('should match shifted keys', () => {
      const event = createEvent('>', { shift: true });
      expect(manager.matches(event, 'zoomIn')).toBe(true);
    });

    it('should match new scale shortcuts', () => {
      const event = createEvent('[');
      expect(manager.matches(event, 'scaleUp')).toBe(true);
    });

    it('should match alternative addChild shortcut', () => {
      const event = createEvent('a');
      expect(manager.matches(event, 'addChild')).toBe(true);
    });

    it('should match resetZoom shortcut', () => {
      const event = createEvent(':');
      expect(manager.matches(event, 'resetZoom')).toBe(true);
    });
  });

  describe('getAction', () => {
    it('should return correct action for matched event', () => {
      const event = createEvent('ArrowUp');
      expect(manager.getAction(event)).toBe('navUp');
    });

    it('should return undefined for unmatched event', () => {
      const event = createEvent('Enter');
      expect(manager.getAction(event)).toBeUndefined();
    });
  });
});
