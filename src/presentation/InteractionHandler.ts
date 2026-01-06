export type Direction = 'Up' | 'Down' | 'Left' | 'Right';

export interface InteractionOptions {
    onNodeClick: (nodeId: string) => void;
    onAddChild: (parentId: string) => void;
    onAddSibling: (nodeId: string, position: 'before' | 'after') => void;
    onInsertParent?: (nodeId: string) => void;
    onDeleteNode: (nodeId: string) => void;
    onDropNode: (draggedId: string, targetId: string) => void;
    onUpdateNode?: (nodeId: string, topic: string) => void;
    onNavigate?: (nodeId: string, direction: Direction) => void;
}

export class InteractionHandler {
    container: HTMLElement;
    options: InteractionOptions;
    selectedNodeId: string | null = null;
    draggedNodeId: string | null = null;

    constructor(container: HTMLElement, options: InteractionOptions) {
        this.container = container;
        this.options = options;
        this.attachEvents();
    }

    updateSelection(nodeId: string | null) {
        this.selectedNodeId = nodeId;
    }

    private attachEvents(): void {
        // Click handling
        this.container.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            const nodeEl = target.closest('.mindmap-node') as HTMLElement;

            if (nodeEl && nodeEl.dataset.id) {
                this.options.onNodeClick(nodeEl.dataset.id);
                e.stopPropagation();
            } else {
                // Deselect if clicking background
                this.options.onNodeClick('');
            }
        });

        // Keyboard handling
        document.addEventListener('keydown', (e) => {
            if (!this.selectedNodeId) return;

            // Prevent default browser behaviors for these keys
            const navKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
            const actionKeys = ['Tab', 'Enter', 'Delete', 'Backspace'];

            if (actionKeys.includes(e.key) || navKeys.includes(e.key)) {
                // Need to be careful not to block typing if we add editing later
                // Editing input handles its own keydown and stops propagation, so this is safe for global shortcuts
                e.preventDefault();
            }

            switch (e.key) {
                case 'Tab':
                    if (e.shiftKey) {
                        this.options.onInsertParent?.(this.selectedNodeId);
                    } else {
                        this.options.onAddChild(this.selectedNodeId);
                    }
                    break;
                case 'Enter':
                    this.options.onAddSibling(this.selectedNodeId, e.shiftKey ? 'before' : 'after');
                    break;
                case 'Delete':
                case 'Backspace':
                    this.options.onDeleteNode(this.selectedNodeId);
                    break;
                case 'ArrowUp':
                    this.options.onNavigate?.(this.selectedNodeId, 'Up');
                    break;
                case 'ArrowDown':
                    this.options.onNavigate?.(this.selectedNodeId, 'Down');
                    break;
                case 'ArrowLeft':
                    this.options.onNavigate?.(this.selectedNodeId, 'Left');
                    break;
                case 'ArrowRight':
                    this.options.onNavigate?.(this.selectedNodeId, 'Right');
                    break;
                case 'F2':
                    e.preventDefault();
                    // Find the node element to start editing
                    const selectedNodeEl = this.container.querySelector(`.mindmap-node[data-id="${this.selectedNodeId}"]`) as HTMLElement;
                    if (selectedNodeEl) {
                        this.startEditing(selectedNodeEl, this.selectedNodeId);
                    }
                    break;
            }
        });

        // Drag & Drop handling
        this.container.addEventListener('dragstart', (e) => {
            const target = e.target as HTMLElement;
            const nodeEl = target.closest('.mindmap-node') as HTMLElement;
            if (nodeEl && nodeEl.dataset.id) {
                this.draggedNodeId = nodeEl.dataset.id;
                e.dataTransfer?.setData('text/plain', nodeEl.dataset.id);
                // Optional: set drag image
            }
        });

        this.container.addEventListener('dragover', (e) => {
            e.preventDefault(); // Allow drop
            const target = e.target as HTMLElement;
            const nodeEl = target.closest('.mindmap-node') as HTMLElement;
            if (nodeEl) {
                // Visual feedback could be added here
                e.dataTransfer!.dropEffect = 'move';
            }
        });

        this.container.addEventListener('drop', (e) => {
            e.preventDefault();
            const target = e.target as HTMLElement;
            const nodeEl = target.closest('.mindmap-node') as HTMLElement;

            if (nodeEl && nodeEl.dataset.id && this.draggedNodeId) {
                const targetId = nodeEl.dataset.id;
                if (this.draggedNodeId !== targetId) {
                    this.options.onDropNode(this.draggedNodeId, targetId);
                }
            }
            this.draggedNodeId = null;
        });

        // Double click to edit
        this.container.addEventListener('dblclick', (e) => {
            const target = e.target as HTMLElement;
            const nodeEl = target.closest('.mindmap-node') as HTMLElement;

            if (nodeEl && nodeEl.dataset.id) {
                this.startEditing(nodeEl, nodeEl.dataset.id);
            }
        });
    }

    private startEditing(element: HTMLElement, nodeId: string): void {
        const currentText = element.textContent || '';
        const input = document.createElement('input');
        input.value = currentText;
        input.style.position = 'absolute';
        input.style.top = element.style.top;
        input.style.left = element.style.left;
        input.style.transform = element.style.transform;

        // Copy styles to match appearance
        const computed = window.getComputedStyle(element);
        input.style.font = computed.font;
        input.style.padding = computed.padding;
        input.style.boxSizing = 'border-box'; // Ensure padding is included in width calculation if relevant
        // Copy border to blend in? Or keep default input border?
        // User screenshot shows white box.
        input.style.border = computed.border;
        input.style.borderRadius = computed.borderRadius;
        input.style.backgroundColor = 'white';

        input.style.zIndex = '100';

        const updateWidth = () => {
            const span = document.createElement('span');
            span.style.font = computed.font;
            span.style.padding = computed.padding;
            span.style.whiteSpace = 'nowrap';
            span.style.visibility = 'hidden';
            span.style.position = 'absolute';
            span.textContent = input.value || '';
            document.body.appendChild(span);

            // Add a little buffer for cursor and borders
            const width = span.offsetWidth + 10;
            input.style.width = Math.max(width, element.offsetWidth) + 'px';

            document.body.removeChild(span);
        };

        // Initial sizing
        updateWidth();

        // Update on type
        input.addEventListener('input', updateWidth);

        const finishEditing = () => {
            if (input.parentNode) {
                const newTopic = input.value;
                if (newTopic !== currentText) {
                    if (this.options.onUpdateNode) {
                        this.options.onUpdateNode(nodeId, newTopic);
                    }
                }
                input.remove();
            }
        };

        input.addEventListener('blur', finishEditing);

        const cancelEditing = () => {
            if (input.parentNode) {
                input.remove();
            }
        };

        input.addEventListener('keydown', (e) => {
            // Stop propagation to prevent global shortcuts (like Enter adding sibling, Backspace deleting node)
            e.stopPropagation();

            if (e.key === 'Enter') {
                // Prevent default to ensure no newline is added if it were a textarea (safety)
                e.preventDefault();
                finishEditing();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                cancelEditing();
            }
        });

        this.container.appendChild(input);
        input.focus();
    }
}
