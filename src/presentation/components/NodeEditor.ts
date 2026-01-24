import { InteractionOptions } from '../logic/InteractionHandler';

/**
 * Class responsible for node editing functionality
 */
export class NodeEditor {
  private container: HTMLElement;
  private maxWidth: number;
  private options: InteractionOptions;

  constructor(container: HTMLElement, maxWidth: number, options: InteractionOptions) {
    this.container = container;
    this.maxWidth = maxWidth;
    this.options = options;
  }

  public setMaxWidth(width: number): void {
    this.maxWidth = width;
  }

  public startEditing(element: HTMLElement, nodeId: string): void {
    const currentText = element.textContent || '';

    // 1. Create textarea
    const input = this.createEditTextarea(element, currentText);

    // 2. Apply styles
    this.applyTextareaStyles(input, element, this.maxWidth);

    // 3. Store original styles
    const originalOutline = element.style.outline;
    const originalBoxShadow = element.style.boxShadow;
    element.style.outline = 'none';
    element.style.boxShadow = 'none';

    // 4. Create size updater
    const updateSize = this.createSizeUpdater(input, element, this.maxWidth);

    // 5. Initial sizing
    updateSize();

    // 6. Update on type
    input.addEventListener('input', updateSize);

    // 7. Create cleanup function
    const cleanup = this.createCleanupFunction(input, element, originalOutline, originalBoxShadow);

    // 8. Setup event handlers
    this.setupEditEventHandlers(input, nodeId, currentText, cleanup);

    // 9. Append and focus
    if (element.parentElement) {
      element.parentElement.appendChild(input);
    } else {
      this.container.appendChild(input);
    }
    input.focus({ preventScroll: true });
    input.select();
  }

  /**
   * Create textarea and apply basic settings
   */
  private createEditTextarea(element: HTMLElement, initialValue: string): HTMLTextAreaElement {
    const input = document.createElement('textarea');
    input.value = initialValue;
    input.style.position = 'absolute';
    input.style.top = element.style.top;
    input.style.left = element.style.left;
    input.style.transform = element.style.transform;

    // Prevent any browser auto-scrolling
    this.container.scrollTop = 0;
    this.container.scrollLeft = 0;

    // Textarea specific reset
    input.style.overflow = 'hidden';
    input.style.resize = 'none';
    input.style.minHeight = '1em';

    return input;
  }

  /**
   * Apply styles to textarea (font, padding, border, etc.)
   */
  private applyTextareaStyles(
    textarea: HTMLTextAreaElement,
    element: HTMLElement,
    maxWidth: number,
  ): void {
    if (maxWidth !== -1) {
      textarea.style.whiteSpace = 'pre-wrap';
      textarea.style.wordWrap = 'break-word';
      textarea.style.overflowWrap = 'anywhere';
      textarea.style.maxWidth = `${maxWidth}px`;
      textarea.style.width = 'max-content';
    } else {
      textarea.style.whiteSpace = 'pre';
    }

    // Copy styles to match appearance
    const computed = window.getComputedStyle(element);
    textarea.style.font = computed.font;
    textarea.style.padding = computed.padding;
    textarea.style.boxSizing = 'border-box';
    textarea.style.backgroundColor = computed.backgroundColor;

    // Reset defaults
    textarea.style.border = 'none';
    textarea.style.outline = 'none';
    textarea.style.boxShadow = 'none';

    // Copy individual border properties
    textarea.style.borderTop = computed.borderTop;
    textarea.style.borderRight = computed.borderRight;
    textarea.style.borderBottom = computed.borderBottom;
    textarea.style.borderLeft = computed.borderLeft;
    textarea.style.borderRadius = computed.borderRadius;

    textarea.style.zIndex = '100';
  }

  /**
   * Create auto-sizing function for textarea
   */
  private createSizeUpdater(
    textarea: HTMLTextAreaElement,
    element: HTMLElement,
    maxWidth: number,
  ): () => void {
    const computed = window.getComputedStyle(element);

    return () => {
      const span = document.createElement('span');
      span.style.font = computed.font;
      span.style.padding = computed.padding;

      if (maxWidth !== -1) {
        span.style.whiteSpace = 'pre-wrap';
        span.style.wordWrap = 'break-word';
        span.style.overflowWrap = 'anywhere';
        span.style.maxWidth = `${maxWidth}px`;
        span.style.width = 'max-content';
      } else {
        span.style.whiteSpace = 'pre';
      }
      span.style.visibility = 'hidden';
      span.style.position = 'absolute';
      span.textContent = textarea.value || '';

      // Add a zero-width space to ensure height even if empty or ending in newline
      if (textarea.value.endsWith('\n') || textarea.value === '') {
        span.textContent += '\u200b';
      }

      document.body.appendChild(span);

      // Add a little buffer for cursor and borders
      const width = span.offsetWidth + 20;
      const height = span.offsetHeight + 10;

      textarea.style.width = Math.max(width, element.offsetWidth) + 'px';
      textarea.style.height = Math.max(height, element.offsetHeight) + 'px';

      document.body.removeChild(span);
    };
  }

  /**
   * Create cleanup function for when editing ends
   */
  private createCleanupFunction(
    textarea: HTMLTextAreaElement,
    element: HTMLElement,
    originalOutline: string,
    originalBoxShadow: string,
  ): () => void {
    return () => {
      if (textarea.parentNode && textarea.parentNode.contains(textarea)) {
        textarea.parentNode.removeChild(textarea);
      }
      // Restore outline/shadow
      element.style.outline = originalOutline;
      element.style.boxShadow = originalBoxShadow;
    };
  }

  /**
   * Setup edit event handlers (Enter, Escape, blur)
   */
  private setupEditEventHandlers(
    textarea: HTMLTextAreaElement,
    nodeId: string,
    initialValue: string,
    cleanup: () => void,
  ): void {
    let isFinishing = false;

    const finishEditing = () => {
      if (isFinishing) return;
      isFinishing = true;

      const newTopic = textarea.value;
      // Only update if changed
      if (newTopic !== initialValue) {
        if (this.options.onUpdateNode) {
          this.options.onUpdateNode(nodeId, newTopic);
        }
      }

      cleanup();

      if (this.options.onEditEnd) {
        this.options.onEditEnd(nodeId);
      }
    };

    const cancelEditing = () => {
      if (isFinishing) return;
      isFinishing = true;
      cleanup();

      if (this.options.onEditEnd) {
        this.options.onEditEnd(nodeId);
      }
    };

    textarea.addEventListener('blur', () => {
      if (!isFinishing) {
        finishEditing();
      }
    });

    textarea.addEventListener('keydown', (e) => {
      e.stopPropagation();

      // IME support: Don't finish editing if composing
      if (e.isComposing) {
        return;
      }

      if (e.key === 'Enter') {
        if (e.shiftKey) {
          // Allow default behavior (new line)
          return;
        }
        e.preventDefault();
        finishEditing();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cancelEditing();
      }
    });
  }
}
