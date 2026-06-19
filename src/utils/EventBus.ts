export type EventHandler<T = unknown> = (data: T) => void;

export class EventBus {
  private handlers: Map<string, EventHandler<any>[]> = new Map();

  on<T = unknown>(event: string, handler: EventHandler<T>): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }
    this.handlers.get(event)!.push(handler as EventHandler<any>);
  }

  off<T = unknown>(event: string, handler: EventHandler<T>): void {
    const eventHandlers = this.handlers.get(event);
    if (eventHandlers) {
      const index = eventHandlers.indexOf(handler as EventHandler<any>);
      if (index > -1) {
        eventHandlers.splice(index, 1);
      }
    }
  }

  emit<T = unknown>(event: string, data?: T): void {
    const eventHandlers = this.handlers.get(event);
    if (eventHandlers) {
      eventHandlers.forEach(handler => handler(data));
    }
  }

  clear(): void {
    this.handlers.clear();
  }
}

export const eventBus = new EventBus();
