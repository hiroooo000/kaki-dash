import { InteractionOptions } from './InteractionHandler';

export class NodeDragger {
  private container: HTMLElement;
  private options: InteractionOptions;
  public draggedNodeId: string | null = null;
  private isReadOnly: boolean = false;

  constructor(container: HTMLElement, options: InteractionOptions) {
    this.container = container;
    this.options = options;
    this.injectDragStyles();
  }

  public setReadOnly(readOnly: boolean): void {
    this.isReadOnly = readOnly;
  }

  private injectDragStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
            .mindmap-node.drag-over-top {
                border-top: 4px solid #007bff !important;
            }
            .mindmap-node.drag-over-bottom {
                border-bottom: 4px solid #007bff !important;
            }
            .mindmap-node.drag-over-left {
                border-left: 4px solid #007bff !important;
            }
            .mindmap-node.drag-over-right {
                border-right: 4px solid #007bff !important;
            }
        `;
    document.head.appendChild(style);
  }

  public handleDragStart(e: Event): void {
    const de = e as DragEvent;
    if (this.isReadOnly) {
      de.preventDefault();
      return;
    }
    const target = de.target as HTMLElement;
    const nodeEl = target.closest('.mindmap-node') as HTMLElement;
    if (nodeEl && nodeEl.dataset.id) {
      this.draggedNodeId = nodeEl.dataset.id;
      de.dataTransfer?.setData('text/plain', nodeEl.dataset.id);
      if (de.dataTransfer) {
        de.dataTransfer.effectAllowed = 'move';
      }
    }
  }

  public handleDragOver(e: Event): void {
    const de = e as DragEvent;
    if (this.isReadOnly) return;
    de.preventDefault(); // Allow drop
    const target = de.target as HTMLElement;
    const nodeEl = target.closest('.mindmap-node') as HTMLElement;

    if (
      nodeEl &&
      nodeEl.dataset.id &&
      this.draggedNodeId &&
      nodeEl.dataset.id !== this.draggedNodeId
    ) {
      const position = this.getDropPosition(de, nodeEl);

      // Clear all classes first
      nodeEl.classList.remove(
        'drag-over-top',
        'drag-over-bottom',
        'drag-over-left',
        'drag-over-right',
      );
      nodeEl.classList.add(`drag-over-${position}`);

      if (de.dataTransfer) {
        de.dataTransfer.dropEffect = 'move';
      }
    }
  }

  public handleDragLeave(e: Event): void {
    const target = e.target as HTMLElement;
    const nodeEl = target.closest('.mindmap-node') as HTMLElement;
    if (nodeEl) {
      nodeEl.classList.remove(
        'drag-over-top',
        'drag-over-bottom',
        'drag-over-left',
        'drag-over-right',
      );
    }
  }

  public handleDrop(e: Event): void {
    const de = e as DragEvent;
    de.preventDefault();
    const target = de.target as HTMLElement;
    const nodeEl = target.closest('.mindmap-node') as HTMLElement;

    // Remove drag-over class from all nodes to be safe
    this.container.querySelectorAll('.mindmap-node').forEach((el) => {
      el.classList.remove('drag-over-top', 'drag-over-bottom', 'drag-over-left', 'drag-over-right');
    });

    if (this.isReadOnly) return;

    if (nodeEl && nodeEl.dataset.id && this.draggedNodeId) {
      const targetId = nodeEl.dataset.id;
      if (this.draggedNodeId !== targetId) {
        const position = this.getDropPosition(de, nodeEl);
        this.options.onDropNode(this.draggedNodeId, targetId, position);
      }
    }
    this.draggedNodeId = null;
  }

  public handleDragEnd(): void {
    this.draggedNodeId = null;
    this.container.querySelectorAll('.mindmap-node').forEach((el) => {
      el.classList.remove('drag-over-top', 'drag-over-bottom', 'drag-over-left', 'drag-over-right');
    });
  }

  private getDropPosition(e: DragEvent, element: HTMLElement): 'top' | 'bottom' | 'left' | 'right' {
    const rect = element.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const w = rect.width;
    const h = rect.height;

    if (y < h * 0.25) return 'top';
    if (y > h * 0.75) return 'bottom';
    if (x < w * 0.25) return 'left';
    if (x > w * 0.75) return 'right';

    return 'right';
  }
}
