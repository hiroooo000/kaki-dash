import { Renderer } from './Renderer';
import { MindMap } from '../domain/entities/MindMap';
import { Node } from '../domain/entities/Node';

export class SvgRenderer implements Renderer {
    container: HTMLElement;
    svg: SVGSVGElement;
    nodeContainer: HTMLDivElement;

    constructor(container: HTMLElement) {
        this.container = container;
        this.container.style.position = 'relative';
        this.container.style.width = '100%';
        this.container.style.height = '100%';
        this.container.style.overflow = 'hidden';

        // SVG Layer for lines
        this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.svg.style.position = 'absolute';
        this.svg.style.top = '0';
        this.svg.style.left = '0';
        this.svg.style.width = '100%';
        this.svg.style.height = '100%';
        this.svg.style.zIndex = '0';
        this.svg.style.pointerEvents = 'none'; // Click through to nodes
        this.svg.style.overflow = 'visible';
        this.container.appendChild(this.svg);

        // Div Layer for nodes
        this.nodeContainer = document.createElement('div');
        this.nodeContainer.style.position = 'absolute';
        this.nodeContainer.style.top = '0';
        this.nodeContainer.style.left = '0';
        this.nodeContainer.style.width = '100%';
        this.nodeContainer.style.height = '100%';
        this.nodeContainer.style.zIndex = '1';
        this.container.appendChild(this.nodeContainer);
    }

    render(mindMap: MindMap, selectedNodeId: string | null = null): void {
        // Clear previous render
        this.svg.innerHTML = '';
        this.nodeContainer.innerHTML = '';

        // Simple recursive render for now
        this.renderNode(mindMap.root, 50, window.innerHeight / 2, selectedNodeId);
    }

    updateTransform(panX: number, panY: number): void {
        const transform = `translate(${panX}px, ${panY}px)`;
        this.svg.style.transform = transform;
        this.nodeContainer.style.transform = transform;
    }

    private renderNode(node: Node, x: number, y: number, selectedNodeId: string | null): void {
        const el = document.createElement('div');
        el.dataset.id = node.id;
        if (node.image) {
            // Image Node
            const img = document.createElement('img');
            img.src = node.image;
            img.style.maxWidth = '150px';
            img.style.maxHeight = '150px';
            img.style.display = 'block';
            el.appendChild(img);

            // Zoom overlay/button
            const zoomBtn = document.createElement('div');
            // Lucide 'zoom-in' icon
            zoomBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#333" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>`;
            zoomBtn.style.position = 'absolute';
            zoomBtn.style.bottom = '5px';
            zoomBtn.style.right = '5px';
            zoomBtn.style.backgroundColor = 'rgba(255, 255, 255, 0.9)'; // Slightly more opaque
            zoomBtn.style.borderRadius = '50%';
            zoomBtn.style.width = '24px';
            zoomBtn.style.height = '24px';
            zoomBtn.style.display = 'flex';
            zoomBtn.style.justifyContent = 'center';
            zoomBtn.style.alignItems = 'center';
            zoomBtn.style.cursor = 'pointer';
            zoomBtn.title = 'Zoom Image';
            zoomBtn.style.boxShadow = '0 1px 3px rgba(0,0,0,0.2)'; // Add subtle shadow for depth
            el.appendChild(zoomBtn);

            zoomBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent selection
                this.showImageModal(node.image!);
            });

            el.style.padding = '5px'; // Less padding for images
        } else {
            // Text Node
            el.textContent = node.topic;
            el.style.whiteSpace = 'pre-wrap';
        }

        el.className = 'mindmap-node';
        if (!node.isRoot) {
            el.draggable = true;
        }

        el.style.position = 'absolute';
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
        el.style.transform = 'translate(0, -50%)';
        el.style.padding = '8px 12px';
        el.style.backgroundColor = 'white';
        el.style.border = '1px solid #ccc';
        el.style.borderRadius = '4px';
        el.style.cursor = node.isRoot ? 'default' : 'grab';
        el.style.zIndex = '10';
        el.style.userSelect = 'none';

        // Apply custom styles
        if (node.style.color) el.style.color = node.style.color;
        if (node.style.fontSize) el.style.fontSize = node.style.fontSize; // Assumes value includes unit or is handled by browser (if number, might need 'px') -> Plan said string so ok.
        if (node.style.fontWeight) el.style.fontWeight = node.style.fontWeight;
        if (node.style.fontStyle) el.style.fontStyle = node.style.fontStyle;
        if (node.style.background) el.style.backgroundColor = node.style.background; // Existing 'background' support if any (interface has it)

        if (node.image) {
            el.style.padding = '5px';
        }

        if (node.isRoot) {
            el.style.fontSize = '1.2em';
            el.style.fontWeight = 'bold';
            el.style.border = '2px solid #333';
        }

        if (node.id === selectedNodeId) {
            el.style.border = '2px solid #007bff';
            el.style.boxShadow = '0 0 5px rgba(0, 123, 255, 0.5)';
        }

        this.nodeContainer.appendChild(el);

        // Dynamic horizontal spacing based on node width
        const { width: nodeWidth } = this.measureNode(node);
        const levelSpacing = nodeWidth + 80; // Node width + gap

        // Calculate total height of children to center the parent
        const childrenHeight = this.getChildrenHeight(node);

        // Start Y is centered relative to this node's Y
        let startY = y - (childrenHeight / 2);

        if (node.children.length === 0) return;

        node.children.forEach((child) => {
            const childHeight = this.getNodeHeight(child);
            const childY = startY + (childHeight / 2);

            // Need to pass the current node's right edge + gap as the child's x
            const childX = x + levelSpacing;

            this.renderNode(child, childX, childY, selectedNodeId);

            // Draw connection from right side of parent to left side of child
            const parentRightX = x + nodeWidth;
            const childLeftX = childX;

            this.drawConnection(parentRightX, y, childLeftX, childY);

            startY += childHeight;
        });
    }

    private getChildrenHeight(node: Node): number {
        return node.children.reduce((acc, child) => acc + this.getNodeHeight(child), 0);
    }

    private getNodeHeight(node: Node): number {
        const { height } = this.measureNode(node);
        const verticalGap = 20;

        if (node.children.length === 0) {
            return height + verticalGap;
        }

        const childrenTotalHeight = this.getChildrenHeight(node);
        // Ensure the parent has at least enough space for itself plus gap, 
        // though typically children total height is larger.
        // If children total height is smaller than parent node height, we might have overlap issues if we don't handle it.
        // But for standard mindmaps, usually we care about the children stack.
        // Let's take the max to be safe if a single child is smaller than parent.
        return Math.max(height + verticalGap, childrenTotalHeight);
    }

    private measureNode(node: Node): { width: number, height: number } {
        if (node.image) {
            // Return fixed size for images + padding estimate
            // Max 150x150 + padding 10
            return { width: 160, height: 160 };
        }

        const el = document.createElement('div');
        el.textContent = node.topic;
        el.className = 'mindmap-node';
        el.style.visibility = 'hidden';
        el.style.position = 'absolute';
        el.style.whiteSpace = 'pre-wrap';
        el.style.padding = '8px 12px';
        el.style.border = '1px solid #ccc';

        // Ensure it has a width constraint if we want wrapping behavior similar to render?
        // Actually, in renderNode we don't constrain width (it expands). 
        // But if we want it to wrap we might need a max-width? 
        // For now, let's assume it expands naturally or follows some CSS rule if 'mindmap-node' has it.
        // The reported issue is about height not being accounted for.

        if (node.isRoot) {
            el.style.fontSize = '1.2em';
            el.style.fontWeight = 'bold';
            el.style.border = '2px solid #333';
        }

        this.nodeContainer.appendChild(el);
        const width = el.offsetWidth;
        const height = el.offsetHeight;
        this.nodeContainer.removeChild(el);

        return { width: width || 100, height: height || 40 };
    }

    private drawConnection(x1: number, y1: number, x2: number, y2: number): void {
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');

        // Bezier curve
        const c1x = x1 + (x2 - x1) / 2;
        const c2x = x1 + (x2 - x1) / 2;

        const d = `M ${x1} ${y1} C ${c1x} ${y1}, ${c2x} ${y2}, ${x2} ${y2}`;

        path.setAttribute('d', d);
        path.setAttribute('stroke', '#ccc');
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke-width', '2');

        this.svg.appendChild(path);
    }

    private showImageModal(imageData: string): void {
        const modal = document.createElement('div');
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100vw';
        modal.style.height = '100vh';
        modal.style.backgroundColor = 'rgba(0,0,0,0.8)';
        modal.style.zIndex = '1000';
        modal.style.display = 'flex';
        modal.style.justifyContent = 'center';
        modal.style.alignItems = 'center';
        modal.style.cursor = 'zoom-out';

        const img = document.createElement('img');
        img.src = imageData;
        img.style.maxWidth = '90%';
        img.style.maxHeight = '90%';
        img.style.boxShadow = '0 0 20px rgba(0,0,0,0.5)';

        modal.appendChild(img);
        document.body.appendChild(modal);

        modal.addEventListener('click', () => {
            document.body.removeChild(modal);
        });
    }
}
