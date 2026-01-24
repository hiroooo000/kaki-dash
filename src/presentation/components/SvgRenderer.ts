import { Renderer } from './Renderer';
import { MindMap } from '../../domain/entities/MindMap';
import { Node } from '../../domain/entities/Node';
import { LayoutMode } from '../../domain/interfaces/LayoutMode';

export interface SvgRendererOptions {
  onImageZoom?: (active: boolean) => void;
  onToggleFold?: (nodeId: string) => void;
}

export class SvgRenderer implements Renderer {
  container: HTMLElement;
  svg: SVGSVGElement;
  nodeContainer: HTMLDivElement;
  options: SvgRendererOptions;
  maxWidth: number = -1;

  constructor(container: HTMLElement, options: SvgRendererOptions = {}) {
    this.container = container;
    this.container.style.position = 'relative';
    this.container.style.width = '100%';
    this.container.style.height = '100%';
    this.container.style.overflow = 'hidden';
    this.container.style.backgroundColor = 'var(--vscode-editor-background, transparent)';

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
    this.options = options;
  }

  render(
    mindMap: MindMap,
    selectedNodeId: string | null = null,
    layoutMode: LayoutMode = 'Right',
  ): void {
    // Clear previous render
    this.svg.innerHTML = '';
    this.nodeContainer.innerHTML = '';

    // Simple recursive render for now
    this.renderNode(
      mindMap.root,
      0,
      this.container.clientHeight / 2,
      selectedNodeId,
      layoutMode,
      true,
      undefined, // default direction
      mindMap,
    );

    // Center root logic if needed, but for now pan handles it.
    // 0, center-y is a good start.
  }

  updateTransform(panX: number, panY: number, scale: number = 1): void {
    const transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
    this.svg.style.transform = transform;
    this.nodeContainer.style.transform = transform;
  }

  // Palette for Colorful mode
  private static readonly RAINBOW_PALETTE = [
    '#E74C3C', // Red
    '#3498DB', // Blue
    '#2ECC71', // Green
    '#F1C40F', // Yellow
    '#9B59B6', // Purple
    '#E67E22', // Orange
    '#1ABC9C', // Teal
  ];

  private getThemeColor(node: Node, mindMap: MindMap): string {
    if (mindMap.theme === 'colorful') {
      if (node.isRoot) return '#333';

      // Find the direct child of root that is an ancestor of this node (or is this node)
      let current = node;
      while (current.parentId && current.parentId !== mindMap.root.id) {
        // If for some reason we can't find parent, break
        const parent = mindMap.findNode(current.parentId);
        if (!parent) break;
        current = parent;
      }

      // 'current' is now a direct child of root (or we failed to climb).
      // Find index in root's children
      const rootChildren = mindMap.root.children;
      const index = rootChildren.findIndex((c) => c.id === current.id);

      if (index !== -1) {
        return SvgRenderer.RAINBOW_PALETTE[index % SvgRenderer.RAINBOW_PALETTE.length];
      }
    }
    return '#ccc';
  }

  private renderNode(
    node: Node,
    x: number,
    y: number,
    selectedNodeId: string | null,
    layoutMode: LayoutMode,
    isRoot: boolean,
    direction: 'left' | 'right' = 'right',
    mindMap?: MindMap,
  ): void {
    const el = document.createElement('div');
    el.dataset.id = node.id;

    // Ensure absolute positioning
    el.style.position = 'absolute';
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;

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
      zoomBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--vscode-icon-foreground, #333)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>`;
      zoomBtn.style.position = 'absolute';
      zoomBtn.style.bottom = '5px';
      zoomBtn.style.right = '5px';
      zoomBtn.style.backgroundColor = 'var(--vscode-editor-background, rgba(255, 255, 255, 0.9))'; // Slightly more opaque
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
      if (this.maxWidth !== -1) {
        el.style.whiteSpace = 'pre-wrap';
        // el.style.wordBreak = 'break-all'; // REMOVED: Causes short text to wrap globally
        el.style.wordWrap = 'break-word'; // Legacy support
        el.style.overflowWrap = 'anywhere'; // Modern standard
        el.style.maxWidth = `${this.maxWidth}px`;
        el.style.width = 'max-content'; // Ensure efficient width usage up to maxWidth
      } else {
        el.style.whiteSpace = 'pre';
      }
    }

    el.className = 'mindmap-node';
    if (!node.isRoot) {
      el.draggable = true;
    }

    el.style.position = 'absolute';

    // Initial styling to measure
    el.style.padding = '8px 12px';
    if (node.image) el.style.padding = '5px';

    // Setting color
    if (mindMap?.theme === 'custom') {
      if (node.isRoot) {
        el.style.color = 'var(--mindmap-root-color, var(--vscode-editor-foreground, black))';
      } else {
        el.style.color = 'var(--mindmap-child-color, var(--vscode-editor-foreground, black))';
      }
    } else {
      el.style.color = 'var(--vscode-editor-foreground, black)';
    }

    // Theme-based Border
    const theme = mindMap?.theme || 'default';
    const themeColor = mindMap ? this.getThemeColor(node, mindMap) : '#ccc';

    if (theme === 'simple' && !node.isRoot) {
      el.style.border = 'none';
      // Simple always none
    } else if (theme === 'custom') {
      // Custom theme uses variables
      if (node.isRoot) {
        const defaultRootBorder = '2px solid var(--vscode-editor-foreground, #333)';
        el.style.border = `var(--mindmap-root-border, ${defaultRootBorder})`;
      } else {
        // Custom starting default? Or allow CSS var to define existence.
        // If "Soft" is the default custom, it has borders.
        el.style.border = `var(--mindmap-child-border, 1px solid #ccc)`;
      }
    } else {
      // Default & Colorful
      if (theme === 'colorful') {
        el.style.border = `2px solid ${themeColor}`;
      } else {
        el.style.border = '1px solid var(--vscode-editorGroup-border, #ccc)';
      }
    }

    el.style.borderRadius = '4px';
    if (node.isRoot) {
      el.style.fontSize = '1.2em';
      el.style.fontWeight = 'bold';
      if (theme !== 'custom') {
        el.style.border = '2px solid var(--vscode-editor-foreground, #333)';
      }
    }

    // Apply custom styles
    if (node.style.color) el.style.color = node.style.color;
    if (node.style.fontSize) el.style.fontSize = node.style.fontSize;
    if (node.style.fontWeight) el.style.fontWeight = node.style.fontWeight;
    if (node.style.fontStyle) el.style.fontStyle = node.style.fontStyle;

    // Background handling
    if (node.style.background) {
      el.style.backgroundColor = node.style.background;
    } else if (theme === 'custom') {
      // Custom theme uses variables
      if (node.isRoot) {
        el.style.backgroundColor = `var(--mindmap-root-background, var(--vscode-editor-background, white))`;
      } else {
        el.style.backgroundColor = `var(--mindmap-child-background, var(--vscode-editor-background, white))`;
      }
    } else {
      // Standard themes default background
      // Use editorWidget.background for better contrast vs editor.background (canvas)
      el.style.backgroundColor =
        'var(--vscode-editorWidget-background, var(--vscode-editor-background, white))';
    }

    const { width: nodeWidth } = this.measureNode(node);

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
    el.style.cursor = 'default';
    el.style.userSelect = 'none';

    if (node.id === selectedNodeId) {
      // Use outline for selection to preserve theme border
      el.style.outline = '2px solid var(--vscode-focusBorder, #007bff)';
      el.style.boxShadow = '0 0 5px var(--vscode-focusBorder, rgba(0, 123, 255, 0.5))';
      // Do not overwrite border
    }

    this.nodeContainer.appendChild(el);

    if (node.children.length === 0) return;

    // Toggle Fold Button
    if (this.options.onToggleFold) {
      const positions: number[] = [];

      if (isRoot && layoutMode === 'Both') {
        // Both sides
        positions.push(finalX + nodeWidth); // Right
        positions.push(finalX); // Left
      } else {
        // Single side
        let isRightSide = direction === 'right';
        if (isRoot) {
          if (layoutMode === 'Left') isRightSide = false;
          else isRightSide = true; // Right
        }
        positions.push(isRightSide ? finalX + nodeWidth : finalX);
      }

      positions.forEach((btnX) => {
        const toggleBtn = document.createElement('div');
        toggleBtn.className = 'mindmap-toggle-btn';
        toggleBtn.innerHTML = node.isFolded ? '+' : '-';
        toggleBtn.style.position = 'absolute';
        toggleBtn.style.width = '16px';
        toggleBtn.style.height = '16px';
        toggleBtn.style.fontSize = '12px';
        toggleBtn.style.lineHeight = '14px';
        toggleBtn.style.textAlign = 'center';
        toggleBtn.style.borderRadius = '50%';
        toggleBtn.style.border = '1px solid var(--vscode-widget-border, #999)';
        toggleBtn.style.backgroundColor = 'var(--vscode-editor-background, #fff)';
        toggleBtn.style.color = 'var(--vscode-editor-foreground, #000)';
        toggleBtn.style.cursor = 'pointer';
        toggleBtn.style.zIndex = '11';
        toggleBtn.style.userSelect = 'none';

        // Adjust position to sit squarely on the edge (center of button on the border line)
        const edgeOffset = 0;
        toggleBtn.style.left = `${btnX + edgeOffset}px`;
        toggleBtn.style.top = `${y}px`;
        toggleBtn.style.transform = `translate(-50%, -50%)`;

        toggleBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.options.onToggleFold?.(node.id);
        });

        this.nodeContainer.appendChild(toggleBtn);
      });
    }

    if (node.isFolded) return;

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
      this.renderChildrenStack(
        node,
        rightChildren,
        x,
        y,
        selectedNodeId,
        layoutMode,
        'right',
        nodeWidth,
        mindMap,
      );
    }

    // Render Left Children
    if (leftChildren.length > 0) {
      this.renderChildrenStack(
        node,
        leftChildren,
        x,
        y,
        selectedNodeId,
        layoutMode,
        'left',
        nodeWidth,
        mindMap,
      );
    }
  }

  private renderChildrenStack(
    parentNode: Node,
    children: Node[],
    parentX: number,
    parentY: number,
    selectedNodeId: string | null,
    layoutMode: LayoutMode,
    direction: 'left' | 'right',
    parentWidth: number,
    mindMap?: MindMap,
  ): void {
    // Calculate total height
    const totalHeight = children.reduce((acc, child) => acc + this.getNodeHeight(child), 0);
    let startY = parentY - totalHeight / 2;

    const levelGap = 80;

    let parentEdgeX = 0;
    if (parentNode.isRoot) {
      parentEdgeX = direction === 'right' ? parentX + parentWidth / 2 : parentX - parentWidth / 2;
    } else {
      // If direction is right, this node's left edge is at parentX, so right edge is parentX + width
      // If direction is left, this node's right edge is at parentX, so left edge is parentX - width.
      // Wait, in renderNode:
      // Right: finalX = x. (x is left edge). Right edge is x + width.
      // Left: finalX = x - width. (x is right edge). Left edge is x - width.

      // So if we are going right from here, we start at our right edge.
      // If we are going left from here, we start at our left edge.

      if (direction === 'right') {
        parentEdgeX = parentX + parentWidth;
      } else {
        parentEdgeX = parentX; // Because x passed in for 'left' direction node WAS the right edge.
        // Wait, if direction is 'left', x is the right edge.
        // So parentEdgeX should be x.
        // Ah, but in renderNode for 'left', we set finalX = x - width.
        // So visually the node is from (x-width) to x.
        // So the Left Edge is x - width.
        parentEdgeX = parentX - parentWidth;
      }
    }

    children.forEach((child) => {
      const childHeight = this.getNodeHeight(child);
      const childY = startY + childHeight / 2;

      let childX = 0;
      if (direction === 'right') {
        childX = parentEdgeX + levelGap;
      } else {
        childX = parentEdgeX - levelGap;
      }

      this.renderNode(child, childX, childY, selectedNodeId, layoutMode, false, direction, mindMap);

      const connectionColor = mindMap ? this.getThemeColor(child, mindMap) : '#ccc';
      this.drawConnection(parentEdgeX, parentY, childX, childY, connectionColor, mindMap?.theme);

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

  private measureNode(node: Node): { width: number; height: number } {
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
    if (this.maxWidth !== -1) {
      el.style.whiteSpace = 'pre-wrap';
      // el.style.wordBreak = 'break-all';
      el.style.wordWrap = 'break-word';
      el.style.overflowWrap = 'anywhere';
      el.style.maxWidth = `${this.maxWidth}px`;
      el.style.width = 'max-content';
    } else {
      el.style.whiteSpace = 'pre';
    }
    el.style.padding = '8px 12px';
    el.style.border = '1px solid var(--vscode-editorGroup-border, #ccc)';

    // Ensure it has a width constraint if we want wrapping behavior similar to render?
    // Actually, in renderNode we don't constrain width (it expands).
    // But if we want it to wrap we might need a max-width?
    // For now, let's assume it expands naturally or follows some CSS rule if 'mindmap-node' has it.
    // The reported issue is about height not being accounted for.

    if (node.isRoot) {
      el.style.fontSize = '1.2em';
      el.style.fontWeight = 'bold';
      el.style.border = '2px solid var(--vscode-editor-foreground, #333)';
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

  private drawConnection(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: string = '#ccc',
    theme: string = 'default',
  ): void {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');

    // Bezier curve
    const c1x = x1 + (x2 - x1) / 2;
    const c2x = x1 + (x2 - x1) / 2;

    const d = `M ${x1} ${y1} C ${c1x} ${y1}, ${c2x} ${y2}, ${x2} ${y2}`;

    path.setAttribute('d', d);

    if (theme === 'custom') {
      // Use style.stroke to allow CSS variable override for Custom theme
      path.style.stroke = `var(--mindmap-connection-color, ${color})`;
    } else {
      // Standard themes use direct color (or class if we had one, but color is calculated)
      path.style.stroke = color;
    }

    path.setAttribute('fill', 'none');
    path.setAttribute('stroke-width', '2');

    this.svg.appendChild(path);
  }

  private showImageModal(imageData: string): void {
    if (this.options.onImageZoom) {
      this.options.onImageZoom(true);
    }
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

    // Forward declaration for closure
    // eslint-disable-next-line prefer-const
    let handleKeydown: (e: KeyboardEvent) => void;

    const closeModal = () => {
      if (document.body.contains(modal)) {
        document.body.removeChild(modal);
      }
      if (handleKeydown) {
        document.removeEventListener('keydown', handleKeydown, true);
      }
      if (this.options.onImageZoom) {
        this.options.onImageZoom(false);
      }
      this.container.focus();
    };

    handleKeydown = (e: KeyboardEvent) => {
      e.stopPropagation();
      e.preventDefault();
      closeModal();
    };

    document.addEventListener('keydown', handleKeydown, true);

    modal.addEventListener('click', () => {
      closeModal();
    });
  }
}
