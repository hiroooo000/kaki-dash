import { LayoutMode } from '../domain/interfaces/LayoutMode';
import { Theme } from '../domain/interfaces/MindMapData';

export interface LayoutSwitcherOptions {
  onLayoutChange: (mode: LayoutMode) => void;
  onThemeChange: (theme: Theme) => void;
  onZoomReset?: () => void;
}

export class LayoutSwitcher {
  container: HTMLElement;
  element: HTMLDivElement;
  options: LayoutSwitcherOptions;
  currentMode: LayoutMode = 'Right';
  currentTheme: Theme = 'default';
  layoutButtons: Map<LayoutMode, HTMLButtonElement> = new Map();
  themeButtons: Map<Theme, HTMLButtonElement> = new Map();

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

    // Layout Buttons
    this.createLayoutButton('Right', this.getRightIcon());
    this.createLayoutButton('Left', this.getLeftIcon());
    this.createLayoutButton('Both', this.getBothIcon());

    this.addSeparator();

    // Theme Buttons
    this.createThemeButton('default', this.getThemeDefaultIcon());
    this.createThemeButton('simple', this.getThemeSimpleIcon());
    this.createThemeButton('colorful', this.getThemeColorfulIcon());

    this.addSeparator();

    // Zoom Reset Button
    this.createIconActionButton('Reset Zoom', this.getZoomResetIcon(), () => {
      if (this.options.onZoomReset) this.options.onZoomReset();
    });

    this.container.appendChild(this.element);
    this.updateActiveButtons();
  }

  private addSeparator(): void {
    const separator = document.createElement('div');
    separator.style.height = '1px';
    separator.style.backgroundColor = '#ccc';
    separator.style.margin = '5px 2px';
    this.element.appendChild(separator);
  }

  private createLayoutButton(mode: LayoutMode, iconSvg: string): void {
    const btn = document.createElement('button');
    btn.innerHTML = iconSvg;
    this.styleButton(btn);
    btn.title = `Layout: ${mode}`;

    btn.addEventListener('click', () => {
      this.setMode(mode);
    });

    this.element.appendChild(btn);
    this.layoutButtons.set(mode, btn);
  }

  private createThemeButton(theme: Theme, iconSvg: string): void {
    const btn = document.createElement('button');
    btn.innerHTML = iconSvg;
    this.styleButton(btn);
    btn.title = `Theme: ${theme}`;
    btn.addEventListener('click', () => {
      this.setTheme(theme);
    });
    this.element.appendChild(btn);
    this.themeButtons.set(theme, btn);
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

  private updateActiveButtons(): void {
    // Layout
    this.layoutButtons.forEach((btn, mode) => {
      if (mode === this.currentMode) {
        btn.style.backgroundColor = '#e6f7ff';
        btn.style.color = '#007bff';
      } else {
        btn.style.backgroundColor = 'transparent';
        btn.style.color = '#555';
      }
    });

    // ThemeMode
    this.themeButtons.forEach((btn, theme) => {
      if (theme === this.currentTheme) {
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
      this.updateActiveButtons();
      this.options.onLayoutChange(mode);
    }
  }

  public setTheme(theme: Theme): void {
    if (this.currentTheme !== theme) {
      this.currentTheme = theme;
      this.updateActiveButtons();
      this.options.onThemeChange(theme);
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

  private getThemeDefaultIcon(): string {
    // Default: Rounded rectangle with a line (modified to look like a node)
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="4" ry="4" top="3" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>`;
  }

  private getThemeSimpleIcon(): string {
    // Simple: Text lines only (Hamburger-like but equal length)
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="18" x2="20" y2="18" />
    </svg>`;
  }

  private getThemeColorfulIcon(): string {
    // Colorful: Palette icon
    // Simple palette shape: a circle with a bite, and dots.
    // Using a path for the palette shape.
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.167 6.839 9.49.5.166.86-.2.86-.677v-.36c0-.46.38-.853.84-.853h1.76c1.93 0 3.5-1.57 3.5-3.5 0-.54.42-1 .99-1h.26c2.6 0 4.75-1.95 4.94-4.5C22.25 6.7 17.65 2 12 2z" />
      <circle cx="7.5" cy="8.5" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="12.5" cy="6.5" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="16.5" cy="9.5" r="1.5" fill="currentColor" stroke="none" />
    </svg>`;
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
