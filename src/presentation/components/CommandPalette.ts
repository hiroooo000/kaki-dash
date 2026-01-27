export interface CommandPaletteOptions {
  onInput: (query: string) => void;
  onSelect: (nodeId: string) => void;
  onClose: () => void;
}

export class CommandPalette {
  private container: HTMLElement;
  private overlay: HTMLElement;
  private paletteEl: HTMLElement;
  private inputEl: HTMLInputElement;
  private resultListEl: HTMLElement;
  private options: CommandPaletteOptions;

  private results: Array<{ id: string; topic: string }> = [];
  private selectedIndex: number = -1;

  constructor(container: HTMLElement, options: CommandPaletteOptions) {
    this.container = container;
    this.options = options;

    this.overlay = this.createOverlay();
    this.paletteEl = this.createPalette();
    this.inputEl = this.paletteEl.querySelector('input')!;
    this.resultListEl = this.paletteEl.querySelector('ul')!;

    this.container.appendChild(this.overlay);
    this.container.appendChild(this.paletteEl);
  }

  private createOverlay(): HTMLElement {
    const el = document.createElement('div');
    el.style.position = 'fixed';
    el.style.top = '0';
    el.style.left = '0';
    el.style.width = '100vw';
    el.style.height = '100vh';
    el.style.backgroundColor = 'rgba(0, 0, 0, 0.1)';
    el.style.zIndex = '1999';
    el.style.display = 'none';

    el.addEventListener('click', () => {
      this.close();
    });

    return el;
  }

  private createPalette(): HTMLElement {
    const el = document.createElement('div');
    el.className = 'command-palette';
    el.style.position = 'fixed';
    el.style.top = '20px'; // Consistent with StyleEditor
    el.style.left = '50%';
    el.style.transform = 'translateX(-50%)';
    el.style.width = '400px';
    el.style.backgroundColor = 'white';
    el.style.borderRadius = '8px'; // Consistent with StyleEditor
    el.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'; // Consistent with StyleEditor
    el.style.border = '1px solid #eee'; // Consistent with StyleEditor
    el.style.zIndex = '2000';
    el.style.display = 'none';
    el.style.flexDirection = 'column';
    el.style.overflow = 'hidden';
    el.style.padding = '8px'; // Consistent wrapper padding
    el.style.boxSizing = 'border-box';
    el.style.fontFamily = 'Arial, sans-serif';

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Search nodes...';
    input.style.width = '100%';
    input.style.boxSizing = 'border-box';
    input.style.padding = '4px 8px'; // Consistent with StyleEditor
    input.style.height = '32px'; // Consistent with StyleEditor elements
    input.style.border = '1px solid #ccc';
    input.style.borderRadius = '4px';
    input.style.fontSize = '14px';
    input.style.outline = 'none';
    input.style.marginBottom = '0'; // List handles spacing if needed

    input.addEventListener('input', (e) => {
      const val = (e.target as HTMLInputElement).value;
      this.options.onInput(val);
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.moveSelection(1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.moveSelection(-1);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        this.confirmSelection();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        this.close();
      }
    });

    const list = document.createElement('ul');
    list.style.listStyle = 'none';
    list.style.margin = '8px 0 0 0';
    list.style.padding = '0';
    list.style.maxHeight = '300px';
    list.style.overflowY = 'auto';
    list.style.display = 'none'; // Hidden initially
    list.style.borderTop = '1px solid #eee';

    el.appendChild(input);
    el.appendChild(list);

    return el;
  }

  public show() {
    this.overlay.style.display = 'block';
    this.paletteEl.style.display = 'flex';
    this.inputEl.value = '';
    this.inputEl.focus();
    this.setResults([]); // Clear previous results
  }

  public close() {
    this.overlay.style.display = 'none';
    this.paletteEl.style.display = 'none';
    this.options.onClose();
  }

  public toggle() {
    if (this.paletteEl.style.display === 'none') {
      this.show();
    } else {
      this.close();
    }
  }

  public setResults(results: Array<{ id: string; topic: string }>) {
    this.results = results;
    this.resultListEl.innerHTML = '';
    this.selectedIndex = -1;

    if (results.length === 0) {
      if (this.inputEl.value.trim() !== '') {
        // Show "No results" if input is not empty
        const li = document.createElement('li');
        li.textContent = 'No results found';
        li.style.padding = '8px';
        li.style.color = '#999';
        li.style.fontSize = '12px';
        li.style.textAlign = 'center';
        this.resultListEl.appendChild(li);
        this.resultListEl.style.display = 'block';
      } else {
        this.resultListEl.style.display = 'none';
      }
      return;
    }

    this.resultListEl.style.display = 'block';
    results.forEach((node, index) => {
      const li = document.createElement('li');
      li.textContent = node.topic;
      li.style.padding = '8px 12px';
      li.style.cursor = 'pointer';
      li.style.fontSize = '14px';
      li.style.borderBottom = '1px solid #f9f9f9';

      li.addEventListener('mouseenter', () => {
        this.setSelectedIndex(index);
      });

      li.addEventListener('click', () => {
        this.options.onSelect(node.id);
        this.close();
      });

      this.resultListEl.appendChild(li);
    });

    // Select first item by default if exists? No, VSCode doesn't auto-select unless you type
    if (results.length > 0) {
      this.setSelectedIndex(0);
    }
  }

  private moveSelection(step: number) {
    if (this.results.length === 0) return;
    const newIndex = Math.max(0, Math.min(this.results.length - 1, this.selectedIndex + step));
    this.setSelectedIndex(newIndex);
    this.scrollToSelected();
  }

  private setSelectedIndex(index: number) {
    this.selectedIndex = index;
    const items = this.resultListEl.children;
    for (let i = 0; i < items.length; i++) {
      const item = items[i] as HTMLElement;
      if (i === index) {
        item.style.backgroundColor = '#007acc'; // VSCode blue-ish
        item.style.color = 'white';
      } else {
        item.style.backgroundColor = 'transparent';
        item.style.color = 'black';
      }
    }
  }

  private scrollToSelected() {
    const items = this.resultListEl.children;
    if (this.selectedIndex >= 0 && this.selectedIndex < items.length) {
      (items[this.selectedIndex] as HTMLElement).scrollIntoView({ block: 'nearest' });
    }
  }

  private confirmSelection() {
    if (this.selectedIndex >= 0 && this.selectedIndex < this.results.length) {
      this.options.onSelect(this.results[this.selectedIndex].id);
      this.close();
    }
  }
}
