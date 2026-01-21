import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Kakidash, KakidashOptions } from '../src/index';

describe('Kakidash Constructor Options', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    // Initial dimensions are needed for some internal calculations if they happen
    container.style.width = '800px';
    container.style.height = '600px';
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('should set maxNodeWidth via constructor options', () => {
    const options: KakidashOptions = {
      maxNodeWidth: 300,
    };
    const kakidash = new Kakidash(container, options);
    expect(kakidash.getMaxNodeWidth()).toBe(300);
  });

  it('should set customStyles via constructor options', () => {
    const options: KakidashOptions = {
      customStyles: {
        rootNode: {
          background: 'red',
        },
      },
    };
    // Theme must be 'custom' for customStyles to apply visually,
    // but updateGlobalStyles saves them regardless.
    // However, if we want to verify they are applied to DOM, we might need to set theme to custom?
    // Wait, the constructor calls updateGlobalStyles, which saves them.
    // But they are only applied to DOM if theme is 'custom'.
    // Default theme is usually not 'custom'? Let's check.
    // MindMapService initializes MindMap with default theme?
    // MindMap entity defaults to 'default'.

    // But we can check if they are saved in the instance if we had access,
    // or we can switch theme to 'custom' and check DOM.

    const kakidash = new Kakidash(container, options);

    // Switch to custom theme to apply styles
    kakidash.setTheme('custom');

    // Check CSS variable on container
    // Accessing private property 'renderer' is hard, but we can check container style properties directly?
    // The container passed to constructor is `container`.
    // But `renderer` wraps it or uses it?
    // SvgRenderer constructor takes container.
    // And updateGlobalStyles applies vars to `this.renderer.container`.
    // So `container` should have the styles.

    expect(container.style.getPropertyValue('--mindmap-root-background')).toBe('red');
  });

  it('should not throw if options are empty', () => {
    expect(() => {
      new Kakidash(container, {});
    }).not.toThrow();
    expect(() => {
      new Kakidash(container);
    }).not.toThrow();
  });
});
