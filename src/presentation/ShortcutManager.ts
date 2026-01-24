import { ShortcutAction, ShortcutConfig } from '../domain/interfaces/ShortcutConfig';

export class ShortcutManager {
  private shortcuts: ShortcutConfig;

  constructor(shortcuts: ShortcutConfig) {
    this.shortcuts = shortcuts;
  }

  public matches(e: KeyboardEvent, action: ShortcutAction): boolean {
    const bindings = this.shortcuts[action];
    if (!bindings) return false;
    return bindings.some((b) => {
      // Default to false for modifiers if undefined
      const ctrl = b.ctrlKey ?? false;
      const meta = b.metaKey ?? false;
      const alt = b.altKey ?? false;
      const shift = b.shiftKey ?? false;

      if (e.ctrlKey !== ctrl) return false;
      if (e.metaKey !== meta) return false;
      if (e.altKey !== alt) return false;
      if (e.shiftKey !== shift) return false;

      // Check key
      return b.key.toLowerCase() === e.key.toLowerCase();
    });
  }

  public getAction(e: KeyboardEvent): ShortcutAction | undefined {
    // This method iterates through all actions to find a match.
    // Note: The order of keys in shortcuts object determines priority if multiple match (unlikely with specific keys).
    const actions = Object.keys(this.shortcuts) as ShortcutAction[];
    for (const action of actions) {
      if (this.matches(e, action)) {
        return action;
      }
    }
    return undefined;
  }
}
