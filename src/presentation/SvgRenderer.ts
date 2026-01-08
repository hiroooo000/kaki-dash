import { Renderer } from './Renderer';
import { MindMap } from '../domain/entities/MindMap';
import { Node } from '../domain/entities/Node';
import { LayoutMode } from '../domain/interfaces/LayoutMode';

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
        this.svg.style.transformOrigin = '0 0';
        this.container.appendChild(this.svg);

        // Div Layer for nodes
        this.nodeContainer = document.createElement('div');
        this.nodeContainer.style.position = 'absolute';
        this.nodeContainer.style.top = '0';
        this.nodeContainer.style.left = '0';
        this.nodeContainer.style.width = '100%';
        this.nodeContainer.style.height = '100%';
        this.nodeContainer.style.zIndex = '1';
        this.nodeContainer.style.transformOrigin = '0 0';
        this.container.appendChild(this.nodeContainer);
    }

    render(mindMap: MindMap, selectedNodeId: string | null = null, layoutMode: LayoutMode = 'Right'): void {
        // Clear previous render
        this.svg.innerHTML = '';
        this.nodeContainer.innerHTML = '';

        // Simple recursive render for now
        this.renderNode(mindMap.root, 0, this.container.clientHeight / 2, selectedNodeId, layoutMode, true);

        // Center root logic if needed, but for now pan handles it. 
        // 0, center-y is a good start.
    }

    updateTransform(panX: number, panY: number, scale: number = 1): void {
        const transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
        this.svg.style.transform = transform;
        this.nodeContainer.style.transform = transform;
    }

    private renderNode(node: Node, x: number, y: number, selectedNodeId: string | null, layoutMode: LayoutMode, isRoot: boolean, direction: 'left' | 'right' = 'right'): void {
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

        // Measure node first to center it on X if needed or handle alignment
        // But we are absolute positioning top-left of the node usually.
        // Let's stick to X being the "anchor" point.
        // For right direction: X is left edge.
        // For left direction: X is right edge (so we subtract width).

        // We need to measure before placing
        // But we are in DOM creation.
        // Let's apply styles then measure.

        el.style.position = 'absolute';

        // Initial styling to measure
        el.style.padding = '8px 12px';
        if (node.image) el.style.padding = '5px';
        el.style.backgroundColor = 'white';
        el.style.border = '1px solid #ccc';
        el.style.borderRadius = '4px';
        if (node.isRoot) {
            el.style.fontSize = '1.2em';
            el.style.fontWeight = 'bold';
            el.style.border = '2px solid #333';
        }

        // Apply custom styles
        if (node.style.color) el.style.color = node.style.color;
        if (node.style.fontSize) el.style.fontSize = node.style.fontSize;
        if (node.style.fontWeight) el.style.fontWeight = node.style.fontWeight;
        if (node.style.fontStyle) el.style.fontStyle = node.style.fontStyle;
        if (node.style.background) el.style.backgroundColor = node.style.background;

        // Add to container temporarily to measure if needed, but we have measureNode.
        // Ideally we use measureNode result.
        const { width: nodeWidth, height: nodeHeight } = this.measureNode(node);

        let finalX = x;
        if (direction === 'left' && !isRoot) {
            finalX = x - nodeWidth;
        } else if (isRoot) {
            // Center root on X
            // If we assume X passed in is center, then finalX = X - width/2
            // But in original code x=50. 
            // Let's assume passed X is the 'connection point' from parent.
            // Root has no parent. Let's assume X is center of screen if passed from render().
            // If render passes 0, maybe we shift it?
            // render passes 0. Let's make root absolute center?
            // The pan/zoom handles the view. Let's place root at 0,0 and expand.
            // Then 0,0 is center of root.
            finalX = x - nodeWidth / 2;
        }

        el.style.left = `${finalX}px`;
        el.style.top = `${y}px`;
        el.style.transform = 'translate(0, -50%)'; // Vertically centered on Y

        el.style.zIndex = '10';
        el.style.cursor = node.isRoot ? 'default' : 'grab';
        el.style.userSelect = 'none';

        if (node.id === selectedNodeId) {
            el.style.border = '2px solid #007bff';
            el.style.boxShadow = '0 0 5px rgba(0, 123, 255, 0.5)';
        }

        this.nodeContainer.appendChild(el);

        if (node.children.length === 0) return;

        // Calculate layout
        // For Both mode at Root: Split children.
        // For other modes or non-root: standard stack.

        let rightChildren: Node[] = [];
        let leftChildren: Node[] = [];

        if (isRoot && layoutMode === 'Both') {
            node.children.forEach((child, index) => {
                const side = child.layoutSide || (index % 2 === 0 ? 'right' : 'left');
                if (side === 'right') rightChildren.push(child);
                else leftChildren.push(child);
            });
        } else if (layoutMode === 'Left') {
            leftChildren = node.children;
        } else if (layoutMode === 'Right') {
            rightChildren = node.children;
        } else {
            // Recursive case: maintain direction
            if (direction === 'left') leftChildren = node.children;
            else rightChildren = node.children;
        }

        // Render Right Children
        if (rightChildren.length > 0) {
            this.renderChildrenStack(node, rightChildren, x, y, selectedNodeId, layoutMode, 'right', nodeWidth);
        }

        // Render Left Children
        if (leftChildren.length > 0) {
            this.renderChildrenStack(node, leftChildren, x, y, selectedNodeId, layoutMode, 'left', nodeWidth);
        }
    }

    private renderChildrenStack(parentNode: Node, children: Node[], parentX: number, parentY: number, selectedNodeId: string | null, layoutMode: LayoutMode, direction: 'left' | 'right', parentWidth: number): void {
        // Calculate total height
        const totalHeight = children.reduce((acc, child) => acc + this.getNodeHeight(child), 0);
        let startY = parentY - (totalHeight / 2);

        const levelGap = 80;
        // Parent Edge X
        // If root (centered): RightEdge = parentX + width/2, LeftEdge = parentX - width/2
        // If normal node:
        //   Right direction: parentX is Left Edge. Right Edge = parentX + width.
        //   Left direction: parentX is Right Edge (since we subtracted width for placement). Left Edge = parentX - width.

        let parentEdgeX = 0;
        if (parentNode.isRoot) {
            parentEdgeX = direction === 'right' ? parentX + parentWidth / 2 : parentX - parentWidth / 2;
        } else {
            parentEdgeX = direction === 'right' ? parentX + parentWidth : parentX; // simplified?
            // Wait, in renderNode:
            // direction right: finalX = x. (x is passed as connection point).
            // If this node is 'right' direction child, its x was parentEdgeX + gap.
            // So its left edge is at x. Its right edge is x + width.
            // direction left: finalX = x - width. 
            // x is passed as connection point (parentEdgeX - gap).
            // So its right edge is x.

            // Refined logic:
            // renderNode receives `x`.
            // If direction 'right', `x` is the LEFT side of the node.
            // If direction 'left', `x` is the RIGHT side of the node.

            // So for children of THIS node:
            // If going right: source X is `x + width`.
            // If going left: source X is `x - width` (if x was right side? No, `x` is right side).
            // Wait, if direction is left, we set `left = x - width`.
            // So `x` IS the right coordinate physically.

            if (direction === 'right') {
                parentEdgeX = parentX + parentWidth;
            } else {
                parentEdgeX = parentX - parentWidth; // ?
                // No, if finalX = x - width, then visual right edge is x.
                // So parentEdgeX = parentX?
                // Let's re-verify renderNode x meaning.
                // "If direction 'left', finalX = x - nodeWidth".
                // This puts the node to the LEFT of x.
                // So the right edge of the node is at `x`.
                // YES. So parentEdgeX shoud be `parentX`.
                // BUT, renderNode call:
                // if direction right: finalX = x. Left edge is x. Right edge is x + width.
                // So parentEdgeX = x + width.

                // if direction left: finalX = x - width. Right edge is x. Left edge is x - width.
                // So parentEdgeX = x? (Which is the left edge of the node... wait.)
                // If we want to attach interactions from the LEFT side of this node (to go further left),
                // that is `finalX`. i.e., `x - nodeWidth`.

                if (direction === 'left') {
                    parentEdgeX = parentX - parentWidth;
                }
            }
        }

        // Correction: parentX passed to this function IS the `x` arg from renderNode.
        // If isRoot: x=0. finalX = -width/2. RightEdge = width/2. LeftEdge = -width/2.
        //   direction right wants RightEdge. 0 + width/2. Correct.
        //   direction left wants LeftEdge. 0 - width/2. Correct.

        children.forEach(child => {
            const childHeight = this.getNodeHeight(child);
            const childY = startY + (childHeight / 2);

            let childX = 0;
            if (direction === 'right') {
                childX = parentEdgeX + levelGap;
            } else {
                childX = parentEdgeX - levelGap;
            }

            this.renderNode(child, childX, childY, selectedNodeId, layoutMode, false, direction);

            // Draw Connection
            // From parentEdgeX, parentY
            // To:
            //   If right: childX (which is left edge of child).
            //   If left: childX (which is right edge of child). 
            // because renderNode interprets X based on direction.

            this.drawConnection(parentEdgeX, parentY, childX, childY);

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

        // Apply custom styles to measurement element
        if (node.style.color) el.style.color = node.style.color;
        if (node.style.fontSize) el.style.fontSize = node.style.fontSize;
        if (node.style.fontWeight) el.style.fontWeight = node.style.fontWeight;
        if (node.style.fontStyle) el.style.fontStyle = node.style.fontStyle;
        if (node.style.background) el.style.backgroundColor = node.style.background;


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
