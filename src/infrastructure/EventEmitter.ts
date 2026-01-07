export class TypedEventEmitter<EventMap extends Record<string, any>> {
    private listeners: { [K in keyof EventMap]?: Array<(payload: EventMap[K]) => void> } = {};

    on<K extends keyof EventMap>(event: K, listener: (payload: EventMap[K]) => void): void {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event]?.push(listener);
    }

    off<K extends keyof EventMap>(event: K, listener: (payload: EventMap[K]) => void): void {
        const eventListeners = this.listeners[event];
        if (eventListeners) {
            this.listeners[event] = eventListeners.filter(l => l !== listener);
        }
    }

    protected emit<K extends keyof EventMap>(event: K, payload: EventMap[K]): void {
        this.listeners[event]?.forEach(listener => listener(payload));
    }
}
