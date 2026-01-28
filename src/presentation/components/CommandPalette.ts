import { SVG_ICONS } from '../resources/Icons';

export interface CommandPaletteOptions {
  onInput: (query: string) => void;
  onSelect: (nodeId: string) => void;
  onIconSelect: (icon: string) => void;
  onClose: () => void;
}

export class CommandPalette {
  private container: HTMLElement;
  private overlay: HTMLElement;
  private paletteEl: HTMLElement;
  private inputEl: HTMLInputElement;
  private resultListEl: HTMLElement;
  private options: CommandPaletteOptions;

  private results: Array<{ id: string; topic: string; type?: 'command' | 'node' | 'icon' }> = [];
  private selectedIndex: number = -1;
  private mode: 'menu' | 'search' | 'icon' = 'menu';

  private readonly MENU_COMMANDS: Array<{
    id: string;
    topic: string;
    type: 'command' | 'node';
  }> = [
      { id: 'search-nodes', topic: '> Search Nodes', type: 'command' },
      { id: 'icon', topic: '> Icon', type: 'command' },
    ];

  /*
    1. 🔵 (Good)
    2. 🔴 (Bad)
    3. ❓ (Question)
    4. ⭐️ (Important)
    5. ✅ (Check)
    6. ❌ (Cross)
    7. 🚩 (Flag)
    8. 💡 (Idea)
    9. ⚠️ (Warning)
    10. 📅 (Schedule)
    + 🗑️ (Delete)
  */
  private readonly ICON_LIST: Array<{ id: string; topic: string; type: 'icon' }> = [
    { id: 'delete', topic: '🗑️ 削除 (Delete)', type: 'icon' },
    { id: 'blue_circle', topic: 'Good', type: 'icon' },
    { id: 'red_circle', topic: 'Bad', type: 'icon' },
    { id: 'question', topic: 'Question', type: 'icon' },
    { id: 'important', topic: 'Important', type: 'icon' },
    { id: 'check', topic: 'Check', type: 'icon' },
    { id: 'cross', topic: 'Cross', type: 'icon' },
    { id: 'flag', topic: 'Flag', type: 'icon' },
    { id: 'idea', topic: 'Idea', type: 'icon' },
    { id: 'warning', topic: 'Warning', type: 'icon' },
    { id: 'schedule', topic: 'Schedule', type: 'icon' },
  ];

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
    el.style.position = 'absolute';
    el.style.top = '0';
    el.style.left = '0';
    el.style.width = '100%';
    el.style.height = '100%';
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
    el.style.position = 'absolute';
    el.style.top = '20px'; // Consistent with StyleEditor top margin
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
    input.placeholder = 'Type > to search commands...';
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
      if (this.mode === 'menu') {
        const filtered = this.MENU_COMMANDS.filter((c) =>
          c.topic.toLowerCase().includes(val.toLowerCase()),
        );
        this.renderList(filtered);
      } else if (this.mode === 'icon') {
        const filtered = this.ICON_LIST.filter((c) =>
          c.topic.toLowerCase().includes(val.toLowerCase()),
        );
        this.renderList(filtered);
      } else {
        this.options.onInput(val);
      }
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
      } else if (e.key === 'Backspace' && this.inputEl.value === '') {
        if (this.mode === 'search' || this.mode === 'icon') {
          this.mode = 'menu';
          this.inputEl.placeholder = 'Type to filter commands...';
          this.renderList(this.MENU_COMMANDS);
        }
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
    this.mode = 'menu';
    this.overlay.style.display = 'block';
    this.paletteEl.style.display = 'flex';
    this.inputEl.value = '';
    this.inputEl.placeholder = 'Type to filter commands...';
    this.inputEl.focus();

    // Show menu commands initially
    this.renderList(this.MENU_COMMANDS);
  }

  public close() {
    this.overlay.style.display = 'none';
    this.paletteEl.style.display = 'none';
    this.options.onClose();
    this.mode = 'menu';
  }

  public toggle() {
    if (this.paletteEl.style.display === 'none') {
      this.show();
    } else {
      this.close();
    }
  }

  public setResults(results: Array<{ id: string; topic: string }>) {
    if (this.mode === 'search') {
      this.renderList(results.map((r) => ({ ...r, type: 'node' })));
    }
  }

  private renderList(items: Array<{ id: string; topic: string; type?: 'command' | 'node' | 'icon' }>) {
    this.results = items;
    this.resultListEl.innerHTML = '';
    this.selectedIndex = -1;

    if (items.length === 0) {
      if (this.inputEl.value.trim() !== '' && (this.mode === 'search' || this.mode === 'icon')) {
        const li = document.createElement('li');
        li.textContent = 'No results found';
        li.style.padding = '8px';
        li.style.color = '#999';
        li.style.fontSize = '12px';
        li.style.textAlign = 'center';
        this.resultListEl.appendChild(li);
        this.resultListEl.style.display = 'block';
      } else if (this.mode === 'menu' && items.length === 0) {
        // No command matches
        this.resultListEl.style.display = 'none';
      } else {
        this.resultListEl.style.display = 'none';
      }
      return;
    }

    this.resultListEl.style.display = 'block';
    items.forEach((item, index) => {
      const li = document.createElement('li');
      li.style.borderBottom = '1px solid #f9f9f9';

      if (item.type === 'icon' && item.id !== 'delete') {
        li.style.display = 'flex';
        li.style.alignItems = 'center';

        const svgData = SVG_ICONS[item.id];
        if (svgData) {
          const iconContainer = document.createElement('div');
          iconContainer.style.width = '20px';
          iconContainer.style.height = '20px';
          iconContainer.style.marginRight = '8px';
          iconContainer.style.flexShrink = '0';
          iconContainer.innerHTML = `<svg viewBox="${svgData.viewBox}" width="20" height="20">${svgData.path}</svg>`;
          li.appendChild(iconContainer);
        }

        const textSpan = document.createElement('span');
        textSpan.textContent = item.topic;
        li.appendChild(textSpan);
      } else {
        li.textContent = item.topic;
      }



      li.addEventListener('mouseenter', () => {
        this.setSelectedIndex(index);
      });

      li.addEventListener('click', () => {
        this.selectItem(item);
      });

      this.resultListEl.appendChild(li);
    });

    if (items.length > 0) {
      this.setSelectedIndex(0);
    }
  }

  private selectItem(item: { id: string; topic: string; type?: 'command' | 'node' | 'icon' }) {
    if (item.type === 'command') {
      if (item.id === 'search-nodes') {
        this.switchToSearchMode();
      } else if (item.id === 'icon') {
        this.switchToIconMode();
      }
    } else if (item.type === 'icon') {
      this.options.onIconSelect(item.id);
      this.close();
    } else {
      this.options.onSelect(item.id);
      this.close();
    }
  }

  private switchToSearchMode() {
    this.mode = 'search';
    this.inputEl.value = '';
    this.inputEl.placeholder = 'Search nodes...';
    this.renderList([]);
    this.resultListEl.style.display = 'none';
    this.inputEl.focus();
  }

  private switchToIconMode() {
    this.mode = 'icon';
    this.inputEl.value = '';
    this.inputEl.placeholder = 'Select icon...';
    this.renderList(this.ICON_LIST);
    this.inputEl.focus();
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
      this.selectItem(this.results[this.selectedIndex]);
    }
  }
}
