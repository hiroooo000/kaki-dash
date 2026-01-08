export type Direction = 'Up' | 'Down' | 'Left' | 'Right';

export interface InteractionOptions {
    onNodeClick: (nodeId: string) => void;
    onAddChild: (parentId: string) => void;
    onAddSibling: (nodeId: string, position: 'before' | 'after') => void;
    onInsertParent?: (nodeId: string) => void;
    onDeleteNode: (nodeId: string) => void;
    onDropNode: (draggedId: string, targetId: string, position: 'top' | 'bottom' | 'left' | 'right') => void;
    onUpdateNode?: (nodeId: string, topic: string) => void;
    onNavigate?: (nodeId: string, direction: Direction) => void;
    onPan?: (dx: number, dy: number) => void;
    onCopyNode?: (nodeId: string) => void;
    onPasteNode?: (parentId: string) => void;
    onCutNode?: (nodeId: string) => void;
    onPasteImage?: (parentId: string, imageData: string) => void;
    onZoom?: (delta: number, x: number, y: number) => void;
}

export class InteractionHandler {
    container: HTMLElement;
    options: InteractionOptions;
    selectedNodeId: string | null = null;
    draggedNodeId: string | null = null;
    isPanning: boolean = false;
    lastMouseX: number = 0;
    lastMouseY: number = 0;

    constructor(container: HTMLElement, options: InteractionOptions) {
        this.container = container;
        // Make container focusable to capture keyboard/paste events
        this.container.tabIndex = 0;
        this.container.style.outline = 'none';
        this.options = options;
        this.attachEvents();
    }

    updateSelection(nodeId: string | null) {
        this.selectedNodeId = nodeId;
    }

    private attachEvents(): void {
        let pasteTimeout: any = null;

        this.container.addEventListener('focus', () => { });
        this.container.addEventListener('blur', () => { });

        // Click handling
        this.container.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            const nodeEl = target.closest('.mindmap-node') as HTMLElement;

            if (nodeEl && nodeEl.dataset.id) {
                this.options.onNodeClick(nodeEl.dataset.id);
            } else {
                // Deselect if clicking background
                this.options.onNodeClick('');
            }

            // Ensure container receives/retains focus AFTER render might have occurred
            this.container.focus();
        });

        // Pan handling
        this.container.addEventListener('mousedown', (e) => {
            const target = e.target as HTMLElement;
            // Only start panning if clicking background (not a node/input)
            if (!target.closest('.mindmap-node') && target.tagName !== 'INPUT') {
                this.isPanning = true;
                this.lastMouseX = e.clientX;
                this.lastMouseY = e.clientY;
                this.container.style.cursor = 'grabbing';
            }
        });

        window.addEventListener('mousemove', (e) => {
            if (this.isPanning) {
                const dx = e.clientX - this.lastMouseX;
                const dy = e.clientY - this.lastMouseY;
                this.lastMouseX = e.clientX;
                this.lastMouseY = e.clientY;

                if (this.options.onPan) {
                    this.options.onPan(dx, dy);
                }
            }
        });

        const stopPanning = () => {
            if (this.isPanning) {
                this.isPanning = false;
                this.container.style.cursor = '';
            }
        };

        window.addEventListener('mouseup', stopPanning);
        window.addEventListener('mouseleave', stopPanning);

        // Wheel handling (Pan)
        this.container.addEventListener('wheel', (e) => {
            e.preventDefault();

            // Check for Zoom (Ctrl/Meta + Wheel)
            if (e.ctrlKey || e.metaKey) {
                if (this.options.onZoom) {
                    this.options.onZoom(e.deltaY, e.clientX, e.clientY);
                }
                return;
            }

            // Invert deltas: scrolling down (positive deltaY) moves view down -> content moves up (negative dy)
            const dx = -e.deltaX;
            const dy = -e.deltaY;

            if (this.options.onPan) {
                this.options.onPan(dx, dy);
            }
        }, { passive: false });

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
                case 'c':
                    if (e.metaKey || e.ctrlKey) {
                        e.preventDefault();
                        this.options.onCopyNode?.(this.selectedNodeId);
                    }
                    break;
                case 'v':
                    if (e.metaKey || e.ctrlKey) {
                        // Do NOT prevent default here to allow 'paste' event to fire for images.
                        // But set a timeout to fallback to internal paste if event doesn't fire.
                        if (pasteTimeout) clearTimeout(pasteTimeout);

                        pasteTimeout = setTimeout(() => {
                            if (this.selectedNodeId) {
                                this.options.onPasteNode?.(this.selectedNodeId);
                            }
                        }, 50);
                    }
                    break;
                case 'x':
                    if (e.metaKey || e.ctrlKey) {
                        e.preventDefault();
                        this.options.onCutNode?.(this.selectedNodeId);
                    }
                    break;
            }
        });

        // Paste handling (Image)
        // Paste handling (Image & Node)
        // Paste handling (Image & Node)
        // Paste handling (Image & Node)
        document.addEventListener('paste', async (e) => {
            // Cancel fallback timeout as event fired
            if (pasteTimeout) {
                clearTimeout(pasteTimeout);
                pasteTimeout = null;
            }

            if (!this.selectedNodeId) return;

            const clipboardItems = e.clipboardData?.items;

            if (!clipboardItems || clipboardItems.length === 0) {
                // No clipboard data, fallback to internal paste
                this.options.onPasteNode?.(this.selectedNodeId);
                return;
            }

            let processed = false;
            for (const item of clipboardItems) {
                if (item.type.startsWith('image/')) {
                    const blob = item.getAsFile();
                    if (blob) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                            if (event.target?.result && this.options.onPasteImage && this.selectedNodeId) {
                                this.options.onPasteImage(this.selectedNodeId, event.target.result as string);
                            }
                        };
                        reader.readAsDataURL(blob);
                    }
                    e.preventDefault();
                    processed = true;
                    break;
                }
            }

            if (!processed) {
                // If no image was found/handled, assume it might be a node copy (internal)
                this.options.onPasteNode?.(this.selectedNodeId);
            }
        });

        // Drag & Drop handling
        // Inject styles for drag feedback
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

        this.container.addEventListener('dragstart', (e) => {
            const target = e.target as HTMLElement;
            const nodeEl = target.closest('.mindmap-node') as HTMLElement;
            if (nodeEl && nodeEl.dataset.id) {
                this.draggedNodeId = nodeEl.dataset.id;
                e.dataTransfer?.setData('text/plain', nodeEl.dataset.id);
                if (e.dataTransfer) {
                    e.dataTransfer.effectAllowed = 'move';
                }
            }
        });

        const getDropPosition = (e: DragEvent, element: HTMLElement): 'top' | 'bottom' | 'left' | 'right' => {
            const rect = element.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const w = rect.width;
            const h = rect.height;

            // Priority: Top/Bottom take 25% height each. Middle 50% checks Left/Right.
            if (y < h * 0.25) return 'top';
            if (y > h * 0.75) return 'bottom';

            if (x < w * 0.25) return 'left';
            if (x > w * 0.75) return 'right';

            // Middle center fallback -> Right (or Left depending on layout could be better, but fixed usually OK)
            return 'right';
        };

        this.container.addEventListener('dragover', (e) => {
            e.preventDefault(); // Allow drop
            const target = e.target as HTMLElement;
            const nodeEl = target.closest('.mindmap-node') as HTMLElement;

            if (nodeEl && nodeEl.dataset.id && this.draggedNodeId && nodeEl.dataset.id !== this.draggedNodeId) {
                const position = getDropPosition(e, nodeEl);

                // Clear all classes first
                nodeEl.classList.remove('drag-over-top', 'drag-over-bottom', 'drag-over-left', 'drag-over-right');
                nodeEl.classList.add(`drag-over-${position}`);

                if (e.dataTransfer) {
                    e.dataTransfer.dropEffect = 'move';
                }
            }
        });

        this.container.addEventListener('dragleave', (e) => {
            const target = e.target as HTMLElement;
            const nodeEl = target.closest('.mindmap-node') as HTMLElement;
            if (nodeEl) {
                nodeEl.classList.remove('drag-over-top', 'drag-over-bottom', 'drag-over-left', 'drag-over-right');
            }
        });

        this.container.addEventListener('drop', (e) => {
            e.preventDefault();
            const target = e.target as HTMLElement;
            const nodeEl = target.closest('.mindmap-node') as HTMLElement;

            // Remove drag-over class from all nodes to be safe
            this.container.querySelectorAll('.mindmap-node').forEach(el => {
                el.classList.remove('drag-over-top', 'drag-over-bottom', 'drag-over-left', 'drag-over-right');
            });

            if (nodeEl && nodeEl.dataset.id && this.draggedNodeId) {
                const targetId = nodeEl.dataset.id;
                if (this.draggedNodeId !== targetId) {
                    const position = getDropPosition(e, nodeEl);
                    this.options.onDropNode(this.draggedNodeId, targetId, position);
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
        const input = document.createElement('textarea');
        input.value = currentText;
        input.style.position = 'absolute';
        input.style.top = element.style.top;
        input.style.left = element.style.left;
        input.style.transform = element.style.transform;

        // Textarea specific reset
        input.style.overflow = 'hidden';
        input.style.resize = 'none';
        input.style.minHeight = '1em';

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

        const updateSize = () => {
            const span = document.createElement('span');
            span.style.font = computed.font;
            span.style.padding = computed.padding;
            span.style.whiteSpace = 'pre-wrap';
            span.style.visibility = 'hidden';
            span.style.position = 'absolute';
            span.textContent = input.value || '';

            // Add a zero-width space to ensure height even if empty or ending in newline
            if (input.value.endsWith('\n') || input.value === '') {
                span.textContent += '\u200b';
            }

            document.body.appendChild(span);

            // Add a little buffer for cursor and borders
            const width = span.offsetWidth + 20; // Increased buffer
            const height = span.offsetHeight + 10;

            input.style.width = Math.max(width, element.offsetWidth) + 'px';
            input.style.height = Math.max(height, element.offsetHeight) + 'px';

            document.body.removeChild(span);
        };

        // Initial sizing
        updateSize();

        // Update on type
        input.addEventListener('input', updateSize);

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
                if (e.shiftKey) {
                    // Allow default behavior (new line)
                    return;
                }
                // Prevent default to ensure no newline is added if it were a textarea (safety)
                e.preventDefault();
                finishEditing();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                cancelEditing();
            }
        });

        if (element.parentElement) {
            element.parentElement.appendChild(input);
        } else {
            this.container.appendChild(input);
        }
        input.focus();
    }
}
