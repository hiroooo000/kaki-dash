import { NodeStyle } from '../domain/entities/Node';

export class StyleEditor {
  container: HTMLElement;
  editorEl: HTMLElement;
  currentNodeId: string | null = null;
  onUpdate?: (nodeId: string, style: Partial<NodeStyle>) => void;

  public static readonly FONT_SIZES = [
    { label: '12px', value: '12px' },
    { label: '14px', value: '14px' },
    { label: '16px', value: '16px' },
    { label: '18px', value: '18px' },
    { label: '24px', value: '24px' },
    { label: '32px', value: '32px' },
    { label: '48px', value: '48px' },
  ];

  // Palette colors based on screenshot approximation + standard colors
  // Black, Red, Orange, Yellow, Green, Blue, Purple
  // Palette colors based on screenshot approximation + standard colors
  // Black, Red, Orange, Yellow, Green, Blue, Purple
  public static readonly PALETTE = [
    '#000000',
    '#E74C3C',
    '#E67E22',
    '#F1C40F',
    '#2ECC71',
    '#3498DB',
    '#9B59B6',
  ];

  constructor(container: HTMLElement) {
    this.container = container;
    this.editorEl = this.createEditor();
    this.container.appendChild(this.editorEl);

    // Prevent click events inside the editor from bubbling up to the container
    // This stops the InteractionHandler from interpreting clicks as background clicks (which deselects the node)
    this.editorEl.addEventListener('mousedown', (e) => e.stopPropagation());
    this.editorEl.addEventListener('click', (e) => e.stopPropagation());
    this.editorEl.addEventListener('dblclick', (e) => e.stopPropagation());
  }

  private createEditor(): HTMLElement {
    const el = document.createElement('div');
    el.className = 'style-editor';
    el.style.position = 'absolute';
    el.style.top = '20px';
    el.style.right = '20px';
    el.style.display = 'none'; // Hidden by default
    el.style.backgroundColor = 'white';
    el.style.border = '1px solid #eee';
    el.style.borderRadius = '8px';
    el.style.padding = '8px';
    el.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
    el.style.zIndex = '2000';
    el.style.pointerEvents = 'auto'; // Re-enable pointer events
    el.style.fontFamily = 'Arial, sans-serif';
    el.style.display = 'flex';
    el.style.flexDirection = 'column';
    el.style.gap = '8px';
    el.style.margin = '0';
    el.style.boxSizing = 'border-box';
    el.style.minWidth = '220px';

    // --- Row 1: Size | Bold | Italic ---
    const row1 = document.createElement('div');
    row1.style.display = 'flex';
    row1.style.gap = '8px';
    row1.style.alignItems = 'center';

    // Font Size Select
    const fontSizeSelect = document.createElement('select');
    fontSizeSelect.style.padding = '4px 8px';
    fontSizeSelect.style.borderRadius = '4px';
    fontSizeSelect.style.border = '1px solid #ccc';
    fontSizeSelect.style.fontSize = '14px';
    fontSizeSelect.style.flex = '1';

    const sizes = StyleEditor.FONT_SIZES;
    sizes.forEach((s) => {
      const opt = document.createElement('option');
      opt.value = s.value;
      opt.textContent = s.label;
      fontSizeSelect.appendChild(opt);
    });

    fontSizeSelect.onchange = (e) => {
      if (this.currentNodeId && this.onUpdate) {
        this.onUpdate(this.currentNodeId, { fontSize: (e.target as HTMLSelectElement).value });
      }
    };
    row1.appendChild(fontSizeSelect);

    // Style Buttons Helpers
    const createStyleBtn = (text: string, styleProp: string, onClick: () => void) => {
      const btn = document.createElement('button');
      btn.textContent = text;
      btn.style.width = '32px';
      btn.style.height = '32px';
      btn.style.padding = '0';
      btn.style.display = 'flex';
      btn.style.justifyContent = 'center';
      btn.style.alignItems = 'center';
      btn.style.border = '1px solid #ddd';
      btn.style.backgroundColor = '#f5f5f5';
      btn.style.borderRadius = '4px';
      btn.style.cursor = 'pointer';
      btn.style.fontSize = '14px';
      if (styleProp) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
        (btn.style as any)[styleProp] = styleProp === 'fontWeight' ? 'bold' : 'italic';
      }
      btn.onclick = onClick;
      return btn;
    };

    // Bold Button
    const boldBtn = createStyleBtn('B', 'fontWeight', () => {
      if (this.currentNodeId && this.onUpdate) {
        const isBold = boldBtn.classList.contains('active');
        const newValue = isBold ? 'normal' : 'bold';
        this.onUpdate(this.currentNodeId, { fontWeight: newValue });
        this.updateButtonState(boldBtn, !isBold);
      }
    });

    // Italic Button
    const italicBtn = createStyleBtn('I', 'fontStyle', () => {
      if (this.currentNodeId && this.onUpdate) {
        const isItalic = italicBtn.classList.contains('active');
        const newValue = isItalic ? 'normal' : 'italic';
        this.onUpdate(this.currentNodeId, { fontStyle: newValue });
        this.updateButtonState(italicBtn, !isItalic);
      }
    });

    row1.appendChild(boldBtn);
    row1.appendChild(italicBtn);
    el.appendChild(row1);

    // --- Row 2: Palette (1-7) | Picker ---
    const row2 = document.createElement('div');
    row2.style.display = 'flex';
    row2.style.gap = '4px';
    row2.style.alignItems = 'center';
    row2.style.justifyContent = 'space-between';

    // Color Picker Input
    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.style.width = '24px';
    colorInput.style.height = '24px';
    colorInput.style.border = '1px solid #ccc';
    colorInput.style.padding = '0';
    colorInput.style.backgroundColor = 'transparent';
    colorInput.style.cursor = 'pointer';
    colorInput.style.appearance = 'none';

    colorInput.onchange = (e) => {
      if (this.currentNodeId && this.onUpdate) {
        this.onUpdate(this.currentNodeId, { color: (e.target as HTMLInputElement).value });
        this.updateActivePaletteItem((e.target as HTMLInputElement).value);
      }
    };

    // Palette Items
    StyleEditor.PALETTE.forEach((color, index) => {
      const swatch = document.createElement('div');
      swatch.className = 'color-swatch';
      swatch.dataset.color = color;
      swatch.textContent = (index + 1).toString();
      swatch.style.width = '24px';
      swatch.style.height = '24px';
      swatch.style.backgroundColor = color;
      swatch.style.borderRadius = '4px';
      swatch.style.cursor = 'pointer';
      swatch.style.border = '1px solid transparent';

      swatch.style.color = color === '#F1C40F' ? 'black' : 'white';
      swatch.style.fontSize = '12px';
      swatch.style.fontWeight = 'bold';
      swatch.style.display = 'flex';
      swatch.style.justifyContent = 'center';
      swatch.style.alignItems = 'center';

      swatch.onclick = () => {
        if (this.currentNodeId && this.onUpdate) {
          this.onUpdate(this.currentNodeId, { color: color });
          colorInput.value = color;
          this.updateActivePaletteItem(color);
        }
      };
      row2.appendChild(swatch);
    });

    row2.appendChild(colorInput);
    el.appendChild(row2);

    return el;
  }

  private updateActivePaletteItem(color: string) {
    const swatches = this.editorEl.querySelectorAll('.color-swatch');
    swatches.forEach((s) => {
      const el = s as HTMLElement;
      if (el.dataset.color?.toLowerCase() === color.toLowerCase()) {
        el.style.border = '2px solid #ccc';
        el.style.transform = 'scale(1.1)';
      } else {
        el.style.border = '1px solid transparent';
        el.style.transform = 'scale(1)';
      }
    });
  }

  private updateButtonState(btn: HTMLElement, isActive: boolean) {
    if (isActive) {
      btn.classList.add('active');
      btn.style.backgroundColor = '#e0e0e0';
      btn.style.borderColor = '#999';
    } else {
      btn.classList.remove('active');
      btn.style.backgroundColor = '#f5f5f5';
      btn.style.borderColor = '#ddd';
    }
  }

  show(nodeId: string, currentStyle: NodeStyle) {
    this.currentNodeId = nodeId;
    this.editorEl.style.display = 'flex';
    // Note: Position is handled by CSS (top-right fixed) so no rect needed.

    // Set initial values
    const sizeSelect = this.editorEl.querySelector('select') as HTMLSelectElement;
    sizeSelect.value = currentStyle.fontSize || '';

    const colorInput = this.editorEl.querySelector('input[type="color"]') as HTMLInputElement;
    const currentColor = currentStyle.color || '#000000';
    colorInput.value = currentColor;
    this.updateActivePaletteItem(currentColor);

    const boldBtn = this.editorEl.querySelectorAll('button')[0] as HTMLElement;
    this.updateButtonState(boldBtn, currentStyle.fontWeight === 'bold');

    const italicBtn = this.editorEl.querySelectorAll('button')[1] as HTMLElement;
    this.updateButtonState(italicBtn, currentStyle.fontStyle === 'italic');
  }

  hide() {
    this.editorEl.style.display = 'none';
    this.currentNodeId = null;
  }
}
