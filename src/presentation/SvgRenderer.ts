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
        el.textContent = node.topic;
        el.dataset.id = node.id;
        el.className = 'mindmap-node'; // For external styling

        // Enable dragging for non-root nodes
        if (!node.isRoot) {
            el.draggable = true;
        }

        // Inline basic styles for visibility
        el.style.position = 'absolute';
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
        el.style.transform = 'translate(0, -50%)';
        el.style.padding = '8px 12px';
        el.style.backgroundColor = 'white';
        el.style.border = '1px solid #ccc';
        el.style.borderRadius = '4px';
        el.style.cursor = node.isRoot ? 'default' : 'grab';
        el.style.whiteSpace = 'nowrap';
        el.style.zIndex = '10'; // Ensure above SVG
        el.style.userSelect = 'none'; // Prevent text selection while dragging

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
        const nodeWidth = this.measureNode(node);
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
        const nodeHeight = 40; // Base height estimate
        const verticalGap = 20;

        if (node.children.length === 0) {
            return nodeHeight + verticalGap;
        }

        return this.getChildrenHeight(node);
    }

    private measureNode(node: Node): number {
        const el = document.createElement('div');
        el.textContent = node.topic;
        el.className = 'mindmap-node';
        el.style.visibility = 'hidden';
        el.style.position = 'absolute';
        el.style.whiteSpace = 'nowrap';
        el.style.padding = '8px 12px';
        el.style.border = '1px solid #ccc';

        if (node.isRoot) {
            el.style.fontSize = '1.2em';
            el.style.fontWeight = 'bold';
            el.style.border = '2px solid #333';
        }

        this.nodeContainer.appendChild(el);
        const width = el.offsetWidth;
        this.nodeContainer.removeChild(el);

        return width || 100; // Fallback
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
}
