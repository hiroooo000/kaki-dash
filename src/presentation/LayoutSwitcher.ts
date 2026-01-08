import { LayoutMode } from '../domain/interfaces/LayoutMode';

export interface LayoutSwitcherOptions {
  onLayoutChange: (mode: LayoutMode) => void;
  onZoomReset?: () => void;
}

export class LayoutSwitcher {
  container: HTMLElement;
  element: HTMLDivElement;
  options: LayoutSwitcherOptions;
  currentMode: LayoutMode = 'Right';
  buttons: Map<LayoutMode, HTMLButtonElement> = new Map();

  constructor(container: HTMLElement, options: LayoutSwitcherOptions) {
    this.container = container;
    this.options = options;
    this.element = document.createElement('div');
    this.render();
  }

  private render(): void {
    this.element.style.position = 'absolute';
    this.element.style.top = '20px';
    this.element.style.left = '20px';
    this.element.style.display = 'flex';
    this.element.style.flexDirection = 'column';
    this.element.style.backgroundColor = 'white';
    this.element.style.borderRadius = '8px';
    this.element.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
    this.element.style.padding = '5px';
    this.element.style.zIndex = '2000';
    this.element.style.gap = '5px';
    this.element.style.pointerEvents = 'auto'; // Re-enable pointer events

    // Prevent clicks from bubbling to background
    this.element.addEventListener('click', (e) => e.stopPropagation());
    this.element.addEventListener('mousedown', (e) => e.stopPropagation());

    this.createButton('Right', this.getRightIcon());
    this.createButton('Left', this.getLeftIcon());
    this.createButton('Both', this.getBothIcon());

    // Separator
    const separator = document.createElement('div');
    separator.style.height = '1px';
    separator.style.backgroundColor = '#ccc';
    separator.style.margin = '5px 2px';
    this.element.appendChild(separator);

    // Zoom Reset Button
    this.createIconActionButton('Reset Zoom', this.getZoomResetIcon(), () => {
      if (this.options.onZoomReset) this.options.onZoomReset();
    });

    this.container.appendChild(this.element);
    this.updateActiveButton();
  }

  private createButton(mode: LayoutMode, iconSvg: string): void {
    const btn = document.createElement('button');
    btn.innerHTML = iconSvg;
    this.styleButton(btn);
    btn.title = `Layout: ${mode}`;

    btn.addEventListener('click', () => {
      this.setMode(mode);
    });

    this.element.appendChild(btn);
    this.buttons.set(mode, btn);
  }

  private createIconActionButton(title: string, iconSvg: string, onClick: () => void): void {
    const btn = document.createElement('button');
    btn.innerHTML = iconSvg;
    this.styleButton(btn);
    btn.title = title;
    btn.addEventListener('click', onClick);
    this.element.appendChild(btn);
  }

  private styleButton(btn: HTMLButtonElement): void {
    btn.style.width = '32px';
    btn.style.height = '32px';
    btn.style.border = 'none';
    btn.style.background = 'transparent';
    btn.style.cursor = 'pointer';
    btn.style.borderRadius = '4px';
    btn.style.display = 'flex';
    btn.style.alignItems = 'center';
    btn.style.justifyContent = 'center';
    btn.style.color = '#555';
  }

  private updateActiveButton(): void {
    this.buttons.forEach((btn, mode) => {
      if (mode === this.currentMode) {
        btn.style.backgroundColor = '#e6f7ff';
        btn.style.color = '#007bff';
      } else {
        btn.style.backgroundColor = 'transparent';
        btn.style.color = '#555';
      }
    });
  }

  public setMode(mode: LayoutMode): void {
    if (this.currentMode !== mode) {
      this.currentMode = mode;
      this.updateActiveButton();
      this.options.onLayoutChange(mode);
    }
  }

  private getRightIcon(): string {
    return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="5" cy="12" r="3"></circle>
  <path d="M8 12h8"></path>
  <path d="M8 12 L16 5"></path>
  <path d="M8 12 L16 19"></path>
  <circle cx="19" cy="5" r="2"></circle>
  <circle cx="19" cy="12" r="2"></circle>
  <circle cx="19" cy="19" r="2"></circle>
</svg>`;
  }

  private getLeftIcon(): string {
    return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="19" cy="12" r="3"></circle>
  <path d="M16 12h-8"></path>
  <path d="M16 12 L8 5"></path>
  <path d="M16 12 L8 19"></path>
  <circle cx="5" cy="5" r="2"></circle>
  <circle cx="5" cy="12" r="2"></circle>
  <circle cx="5" cy="19" r="2"></circle>
</svg>`;
  }

  private getBothIcon(): string {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M12 9V5"></path><circle cx="12" cy="2" r="2"></circle><path d="M12 15v4"></path><circle cx="12" cy="22" r="2"></circle><path d="M9 12H5"></path><circle cx="2" cy="12" r="2"></circle><path d="M15 12h4"></path><circle cx="22" cy="12" r="2"></circle></svg>`;
  }

  private getZoomResetIcon(): string {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="11" cy="11" r="8"></circle>
  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  <line x1="5" y1="5" x2="17" y2="17"></line>
  <line x1="17" y1="5" x2="5" y2="17"></line>
</svg>`;
  }
}
