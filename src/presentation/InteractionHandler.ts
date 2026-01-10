export type Direction = 'Up' | 'Down' | 'Left' | 'Right';
export type StyleAction =
    | { type: 'bold' }
    | { type: 'italic' }
    | { type: 'increaseSize' }
    | { type: 'decreaseSize' }
    | { type: 'color'; index: number };

export interface InteractionOptions {
    onNodeClick: (nodeId: string) => void;
    onAddChild: (parentId: string) => void;
    onAddSibling: (nodeId: string, position: 'before' | 'after') => void;
    onInsertParent?: (nodeId: string) => void;
    onDeleteNode: (nodeId: string) => void;
    onDropNode: (
        draggedId: string,
        targetId: string,
        position: 'top' | 'bottom' | 'left' | 'right',
    ) => void;
    onUpdateNode?: (nodeId: string, topic: string) => void;
    onNavigate?: (nodeId: string, direction: Direction) => void;
    onPan?: (dx: number, dy: number) => void;
    onCopyNode?: (nodeId: string) => void;
    onPasteNode?: (parentId: string) => void;
    onCutNode?: (nodeId: string) => void;
    onPasteImage?: (parentId: string, imageData: string) => void;
    onZoom?: (delta: number, x: number, y: number) => void;
    onUndo?: () => void;
    onStyleAction?: (nodeId: string, action: StyleAction) => void;
}

export class InteractionHandler {
    container: HTMLElement;
    options: InteractionOptions;
    selectedNodeId: string | null = null;
    draggedNodeId: string | null = null;
    isPanning: boolean = false;
    lastMouseX: number = 0;
    lastMouseY: number = 0;
    isReadOnly: boolean = false;

    private cleanupFns: Array<() => void> = [];

    constructor(container: HTMLElement, options: InteractionOptions) {
        this.container = container;
        // Make container focusable to capture keyboard/paste events
        this.container.tabIndex = 0;
        this.container.style.outline = 'none';
        this.options = options;
        this.attachEvents();
    }

    setReadOnly(readOnly: boolean): void {
        this.isReadOnly = readOnly;
        // Maybe cancel any ongoing edit/drag?
        if (readOnly) {
            if (this.draggedNodeId) {
                this.draggedNodeId = null;
            }
            // If editing is happening... we can't easily cancel internal state of textarea, 
            // but new edits are blocked.
        }
    }

    destroy(): void {
        this.cleanupFns.forEach((fn) => fn());
        this.cleanupFns = [];
    }

    updateSelection(nodeId: string | null) {
        this.selectedNodeId = nodeId;
    }

    private attachEvents(): void {
        let pasteTimeout: ReturnType<typeof setTimeout> | null = null;

        // Helper to add listener and track cleanup
        const addListener = (
            target: EventTarget,
            type: string,
            listener: EventListenerOrEventListenerObject,
            options?: boolean | AddEventListenerOptions,
        ) => {
            target.addEventListener(type, listener, options);
            this.cleanupFns.push(() => {
                if (typeof target.removeEventListener === 'function') {
                    target.removeEventListener(type, listener, options);
                }
            });
        };

        addListener(this.container, 'focus', () => { });
        addListener(this.container, 'blur', () => { });

        // Prevent accidental scrolling of the container (we use transform for pan)
        // Prevent accidental scrolling of the container (we use transform for pan)
        addListener(this.container, 'scroll', () => {
            if (this.container.scrollTop !== 0 || this.container.scrollLeft !== 0) {
                this.container.scrollTop = 0;
                this.container.scrollLeft = 0;
            }
        });

        // Click handling
        // Click handling
        addListener(this.container, 'click', (e) => {
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
        // Pan handling
        addListener(this.container, 'mousedown', (e) => {
            const me = e as MouseEvent;
            const target = me.target as HTMLElement;
            // Only start panning if clicking background (not a node/input)
            if (!target.closest('.mindmap-node') && target.tagName !== 'INPUT') {
                this.isPanning = true;
                this.lastMouseX = me.clientX;
                this.lastMouseY = me.clientY;
                this.container.style.cursor = 'grabbing';
            }
        });

        addListener(window, 'mousemove', (e) => {
            const me = e as MouseEvent;
            if (this.isPanning) {
                const dx = me.clientX - this.lastMouseX;
                const dy = me.clientY - this.lastMouseY;
                this.lastMouseX = me.clientX;
                this.lastMouseY = me.clientY;

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

        addListener(window, 'mouseup', stopPanning);
        addListener(window, 'mouseleave', stopPanning);

        // Wheel handling (Pan)
        // Wheel handling (Pan)
        addListener(
            this.container,
            'wheel',
            (e) => {
                const we = e as WheelEvent;
                we.preventDefault();

                // Check for Zoom (Ctrl/Meta + Wheel)
                if (we.ctrlKey || we.metaKey) {
                    if (this.options.onZoom) {
                        this.options.onZoom(we.deltaY, we.clientX, we.clientY);
                    }
                    return;
                }

                // Normalize delta based on deltaMode
                // 0: Pixel, 1: Line, 2: Page
                let multiplier = 1;
                if (we.deltaMode === 1) {
                    // Line
                    multiplier = 33; // Approx line height in pixels
                } else if (we.deltaMode === 2) {
                    // Page
                    multiplier = window.innerHeight;
                }

                const dx = -we.deltaX * multiplier;
                const dy = -we.deltaY * multiplier;

                if (this.options.onPan) {
                    this.options.onPan(dx, dy);
                }
            },
            { passive: false },
        );

        // Keyboard handling
        addListener(document, 'keydown', (e) => {
            const ke = e as KeyboardEvent;
            if (!this.selectedNodeId) return;
            if (this.isReadOnly) {
                // In ReadOnly mode, prevent editing keys. 
                // Navigation (Arrow) is allowed.
                // Copy is allowed.
                // Delete, Enter (Add Sibling), Tab (Add Child/Parent) -> Blocked.
                const allowedKeys = [
                    'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
                    'c', // Copy
                ];
                // We also need to block style shortcuts like 'b', 'i', '+', '-'

                if (!allowedKeys.includes(ke.key)) {
                    return;
                }
            }

            // Prevent default browser behaviors for these keys
            const navKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
            const actionKeys = ['Tab', 'Enter', 'Delete', 'Backspace'];

            if (actionKeys.includes(ke.key) || navKeys.includes(ke.key)) {
                // Need to be careful not to block typing if we add editing later
                // Editing input handles its own keydown and stops propagation, so this is safe for global shortcuts
                ke.preventDefault();
            }

            switch (ke.key) {
                case 'Tab':
                    if (this.isReadOnly) return;
                    if (ke.shiftKey) {
                        this.options.onInsertParent?.(this.selectedNodeId);
                    } else {
                        this.options.onAddChild(this.selectedNodeId);
                    }
                    break;
                case 'Enter':
                    if (this.isReadOnly) return;
                    this.options.onAddSibling(this.selectedNodeId, ke.shiftKey ? 'before' : 'after');
                    break;
                case 'Delete':
                case 'Backspace':
                    if (this.isReadOnly) return;
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
                case 'F2': {
                    if (this.isReadOnly) return;
                    ke.preventDefault();
                    // Find the node element to start editing
                    const selectedNodeEl = this.container.querySelector(
                        `.mindmap-node[data-id="${this.selectedNodeId}"]`,
                    ) as HTMLElement;
                    if (selectedNodeEl) {
                        this.startEditing(selectedNodeEl, this.selectedNodeId);
                    }
                    break;
                }
                case 'c':
                    if (ke.metaKey || ke.ctrlKey) {
                        ke.preventDefault();
                        this.options.onCopyNode?.(this.selectedNodeId);
                    }
                    break;
                case 'v':
                    if (this.isReadOnly) return;
                    if (ke.metaKey || ke.ctrlKey) {
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
                    if (this.isReadOnly) return;
                    if (ke.metaKey || ke.ctrlKey) {
                        ke.preventDefault();
                        this.options.onCutNode?.(this.selectedNodeId);
                    }
                    break;
                case 'z':
                    // Undo might be allowed in ReadOnly if we consider "view state changes" (which we don't have many of)
                    // But usually undo changes data.
                    if (this.isReadOnly) return;
                    if (ke.metaKey || ke.ctrlKey) {
                        ke.preventDefault();
                        if (!ke.shiftKey) {
                            this.options.onUndo?.();
                        }
                    }
                    break;
                case 'b':
                    if (this.isReadOnly) return;
                    if (ke.metaKey || ke.ctrlKey) {
                        ke.preventDefault();
                        this.options.onStyleAction?.(this.selectedNodeId, { type: 'bold' });
                    }
                    break;
                case 'i':
                    if (this.isReadOnly) return;
                    if (ke.metaKey || ke.ctrlKey) {
                        ke.preventDefault();
                        this.options.onStyleAction?.(this.selectedNodeId, { type: 'italic' });
                    }
                    break;
                // Font Size
                case '+':
                case '=': // Often + is Shift+=
                    if (this.isReadOnly) return;
                    // Check for actual + char or just key code if shift is pressed?
                    // e.key is reliable for produced character.
                    if (ke.key === '+' || (ke.key === '=' && ke.shiftKey)) {
                        // Prevent default zoom if specific browser default?
                        // Usually Ctrl + is zoom. Just + might be typing if editable?
                        // But we are in "Selection" mode (not editing input).
                        this.options.onStyleAction?.(this.selectedNodeId, { type: 'increaseSize' });
                    }
                    break;
                case '-':
                    if (this.isReadOnly) return;
                    // Similarly check against Ctrl - (Zoom out)
                    // If just '-', verify.
                    this.options.onStyleAction?.(this.selectedNodeId, { type: 'decreaseSize' });
                    break;
            }

            // Number keys for Color (1-7)
            if (/^[1-7]$/.test(ke.key)) {
                if (this.isReadOnly) return;
                // Ensure we aren't holding modifiers that would mean something else?
                // e.g. Ctrl-1 might be switch tab.
                if (!ke.ctrlKey && !ke.metaKey && !ke.altKey) {
                    const index = parseInt(ke.key) - 1; // 0-based index
                    this.options.onStyleAction?.(this.selectedNodeId, { type: 'color', index });
                }
            }
        });

        // Paste handling (Image & Node)
        addListener(document, 'paste', (e) => {
            const ce = e as ClipboardEvent;
            // Cancel fallback timeout as event fired
            if (pasteTimeout) {
                clearTimeout(pasteTimeout);
                pasteTimeout = null;
            }

            if (this.isReadOnly) return;
            if (!this.selectedNodeId) return;

            const clipboardItems = ce.clipboardData?.items;

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
                    ce.preventDefault();
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
            if (this.isReadOnly) {
                e.preventDefault();
                return;
            }
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
        // Assuming dragstart is enough to block drag if preventDefault called? 
        // Just in case, we register cleanup if we attached it like others.
        // The previous implementation used addEventListener but didn't track it.
        // Let's attach our listener and push to cleanup.
        this.cleanupFns.push(() => {
            // remove is handled if we used addListener helper for container, but here we used `this.container.addEventListener`.
            // Wait, I see I used `addListener` helper for earlier events but `dragstart` was legacy.
            // Let's refactor this one to use `addListener` to capture it for destroy!
        });
        // Actually, to make `destroy()` fully effective, ALL specific listeners should use `addListener`.
        // I will replace `this.container.addEventListener` with `addListener(this.container, ...)` pattern here too.

        const getDropPosition = (
            e: DragEvent,
            element: HTMLElement,
        ): 'top' | 'bottom' | 'left' | 'right' => {
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

        // Drag Start
        addListener(this.container, 'dragstart', (e) => {
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
        });

        // Drag Over
        addListener(this.container, 'dragover', (e) => {
            const de = e as DragEvent;
            if (this.isReadOnly) return; // Should not happen if dragstart prevented, but for external files?
            de.preventDefault(); // Allow drop
            const target = de.target as HTMLElement;
            const nodeEl = target.closest('.mindmap-node') as HTMLElement;

            if (
                nodeEl &&
                nodeEl.dataset.id &&
                this.draggedNodeId &&
                nodeEl.dataset.id !== this.draggedNodeId
            ) {
                const position = getDropPosition(de, nodeEl);

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
        });

        // Drag Leave
        addListener(this.container, 'dragleave', (e) => {
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
        });

        // Drop
        addListener(this.container, 'drop', (e) => {
            const de = e as DragEvent;
            de.preventDefault();
            const target = de.target as HTMLElement;
            const nodeEl = target.closest('.mindmap-node') as HTMLElement;

            // Remove drag-over class from all nodes to be safe
            this.container.querySelectorAll('.mindmap-node').forEach((el) => {
                el.classList.remove(
                    'drag-over-top',
                    'drag-over-bottom',
                    'drag-over-left',
                    'drag-over-right',
                );
            });

            if (this.isReadOnly) return;

            if (nodeEl && nodeEl.dataset.id && this.draggedNodeId) {
                const targetId = nodeEl.dataset.id;
                if (this.draggedNodeId !== targetId) {
                    const position = getDropPosition(de, nodeEl);
                    this.options.onDropNode(this.draggedNodeId, targetId, position);
                }
            }
            this.draggedNodeId = null;
        });

        // Drag End (Cleanup if cancelled)
        addListener(this.container, 'dragend', () => {
            this.draggedNodeId = null;
            this.container.querySelectorAll('.mindmap-node').forEach((el) => {
                el.classList.remove(
                    'drag-over-top',
                    'drag-over-bottom',
                    'drag-over-left',
                    'drag-over-right',
                );
            });
        });

        // Double click to edit
        addListener(this.container, 'dblclick', (e) => {
            if (this.isReadOnly) return;
            const target = e.target as HTMLElement;
            const nodeEl = target.closest('.mindmap-node') as HTMLElement;

            if (nodeEl && nodeEl.dataset.id) {
                this.startEditing(nodeEl, nodeEl.dataset.id);
            }
        });
    }

    public editNode(nodeId: string): void {
        const nodeEl = this.container.querySelector(
            `.mindmap-node[data-id="${nodeId}"]`,
        ) as HTMLElement;
        if (nodeEl) {
            this.startEditing(nodeEl, nodeId);
        }
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
        input.style.backgroundColor = computed.backgroundColor;

        // Reset defaults
        input.style.border = 'none';
        input.style.outline = 'none';
        input.style.boxShadow = 'none';

        // Copy individual border properties as shorthand 'border' might be empty if sides differ
        input.style.borderTop = computed.borderTop;
        input.style.borderRight = computed.borderRight;
        input.style.borderBottom = computed.borderBottom;
        input.style.borderLeft = computed.borderLeft;
        input.style.borderRadius = computed.borderRadius;
        // Keep outline none to avoid double focus indication if we want to mimic node exactly


        input.style.zIndex = '100';

        // Store original outline/shadow to restore later
        const originalOutline = element.style.outline;
        const originalBoxShadow = element.style.boxShadow;
        element.style.outline = 'none';
        element.style.boxShadow = 'none';

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

        let isFinishing = false;

        const cleanup = () => {
            if (input.parentNode && input.parentNode.contains(input)) {
                input.parentNode.removeChild(input);
            }
            // Restore outline/shadow
            element.style.outline = originalOutline;
            element.style.boxShadow = originalBoxShadow;
        };

        const finishEditing = () => {
            if (isFinishing) return;
            isFinishing = true;

            const newTopic = input.value;
            // Only update if changed
            if (newTopic !== currentText) {
                if (this.options.onUpdateNode) {
                    this.options.onUpdateNode(nodeId, newTopic);
                }
            }

            cleanup();
        };

        input.addEventListener('blur', () => {
            // Delay blur handling slightly to allow Enter key to process first if needed
            // But usually the flag handles it.
            if (!isFinishing) {
                finishEditing();
            }
        });

        const cancelEditing = () => {
            if (isFinishing) return;
            isFinishing = true;
            cleanup();
        };

        input.addEventListener('keydown', (e) => {
            // Stop propagation
            e.stopPropagation();

            // IME support: Don't finish editing if composing (e.g. Japanese conversion)
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

        if (element.parentElement) {
            element.parentElement.appendChild(input);
        } else {
            this.container.appendChild(input);
        }
        input.focus({ preventScroll: true });
        input.select();
    }
}
