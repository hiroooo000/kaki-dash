import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Kakidash } from '../src/index';

describe('Global Styles API', () => {
  let container: HTMLElement;
  let mindMap: Kakidash;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    mindMap = new Kakidash(container);
  });

  afterEach(() => {
    mindMap.destroy();
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  });

  it('should apply root node styles to CSS variables', () => {
    mindMap.updateGlobalStyles({
      rootNode: {
        border: '5px solid red',
        background: 'pink',
      },
    });

    expect(container.style.getPropertyValue('--mindmap-root-border')).toBe('5px solid red');
    expect(container.style.getPropertyValue('--mindmap-root-background')).toBe('pink');
  });

  it('should apply child node styles to CSS variables', () => {
    mindMap.updateGlobalStyles({
      childNode: {
        border: '2px dashed blue',
        background: 'lightblue',
      },
    });

    expect(container.style.getPropertyValue('--mindmap-child-border')).toBe('2px dashed blue');
    expect(container.style.getPropertyValue('--mindmap-child-background')).toBe('lightblue');
  });

  it('should apply connection styles to CSS variables', () => {
    mindMap.updateGlobalStyles({
      connection: {
        color: 'green',
      },
    });

    expect(container.style.getPropertyValue('--mindmap-connection-color')).toBe('green');
  });

  it('should allow partial updates', () => {
    mindMap.updateGlobalStyles({
      rootNode: {
        border: '1px solid black',
      },
    });

    expect(container.style.getPropertyValue('--mindmap-root-border')).toBe('1px solid black');
    // Others should be unset (or rather, not set by this call, if we don't clear old ones)
    // The current implementation appends/overwrites keys provided. It does NOT clear keys not provided.
    // This supports cumulative updates if needed, though typically users might send a full object?
    // The requirement says "Batch update".
    // Let's verify that what we asked for is set.
    expect(container.style.getPropertyValue('--mindmap-root-background')).toBe('');
  });
});
