import { EventEmitter } from "events";

export type NotificationEvent = {
  id: string;
  userId: string;
  type: string;
  title: string;
  summary: string;
  link?: string;
  createdAt: string;
};

class NotificationEventBus extends EventEmitter {}

// Singleton — compartilhado em todo o processo Node.js
const eventBus = new NotificationEventBus();
eventBus.setMaxListeners(200); // suporta muitos clientes SSE simultâneos

export function emitNotification(event: NotificationEvent) {
  eventBus.emit(`notification:${event.userId}`, event);
}

export function onNotification(
  userId: string,
  listener: (event: NotificationEvent) => void
) {
  eventBus.on(`notification:${userId}`, listener);
}

export function offNotification(
  userId: string,
  listener: (event: NotificationEvent) => void
) {
  eventBus.off(`notification:${userId}`, listener);
}
