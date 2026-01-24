export class HistoryManager<T> {
  private past: T[] = [];
  private future: T[] = [];
  private readonly maxHistorySize: number;

  constructor(maxHistorySize: number = 10) {
    this.maxHistorySize = maxHistorySize;
  }

  push(state: T): void {
    this.past.push(state);
    if (this.past.length > this.maxHistorySize) {
      this.past.shift();
    }
    // Clear future when new state is pushed
    this.future = [];
  }

  undo(currentState: T): T | null {
    if (this.past.length === 0) {
      return null;
    }

    const previousState = this.past.pop();
    if (previousState) {
      this.future.push(currentState);
      return previousState;
    }
    return null;
  }

  get canUndo(): boolean {
    return this.past.length > 0;
  }

  // Future-proof for Redo
  redo(currentState: T): T | null {
    if (this.future.length === 0) {
      return null;
    }

    const nextState = this.future.pop();
    if (nextState) {
      this.past.push(currentState);
      if (this.past.length > this.maxHistorySize) {
        this.past.shift();
      }
      return nextState;
    }
    return null;
  }

  get canRedo(): boolean {
    return this.future.length > 0;
  }

  clear(): void {
    this.past = [];
    this.future = [];
  }
}
