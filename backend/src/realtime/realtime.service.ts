import { Injectable, Logger, type MessageEvent } from "@nestjs/common";
import { Observable, type Subscriber } from "rxjs";

/** Événements poussés aux navigateurs connectés. */
export type RealtimeEvent =
  | { type: "message"; data: { conversationId: string; members: [string, string]; message: { id: string; userId: string; text: string; createdAt: string; system?: boolean } } }
  | { type: "read"; data: { conversationId: string; userId: string; at: string } }
  | { type: "typing"; data: { conversationId: string; userId: string } }
  | { type: "presence"; data: { userId: string; online: boolean } }
  | { type: "hello"; data: { online: string[] } }
  | { type: "refresh"; data: Record<string, never> }
  | { type: "call"; data: { from: string; room: string; kind: CallSignal; payload: Record<string, unknown> } };

/** Signaux d'appel vidéo relayés entre les deux participants. */
export const CALL_SIGNALS = ["ring", "cancel", "decline", "hello", "offer", "answer", "ice", "media", "leave"] as const;
export type CallSignal = (typeof CALL_SIGNALS)[number];

const HEARTBEAT_MS = 25_000;

/**
 * Bus temps réel en mémoire : chaque onglet ouvert garde un flux SSE (GET /api/realtime).
 * Suffisant pour une instance unique ; en production multi-instances, brancher un Redis pub/sub ici.
 */
@Injectable()
export class RealtimeService {
  private readonly logger = new Logger(RealtimeService.name);
  private readonly clients = new Map<string, Set<Subscriber<MessageEvent>>>();

  /** Ouvre un flux pour l'utilisateur ; fermé automatiquement quand le navigateur se déconnecte. */
  connect(userId: string, extraOnline: string[] = []): Observable<MessageEvent> {
    return new Observable<MessageEvent>((sub) => {
      const firstTab = !this.clients.has(userId);
      const set = this.clients.get(userId) ?? new Set();
      set.add(sub);
      this.clients.set(userId, set);

      sub.next({ type: "hello", data: { online: [...new Set([...this.clients.keys(), ...extraOnline])] } });
      if (firstTab) this.broadcast({ type: "presence", data: { userId, online: true } }, userId);

      // Garde la connexion ouverte à travers proxys et pare-feux.
      const heartbeat = setInterval(() => sub.next({ type: "ping", data: "" }), HEARTBEAT_MS);

      return () => {
        clearInterval(heartbeat);
        set.delete(sub);
        if (set.size === 0) {
          this.clients.delete(userId);
          this.broadcast({ type: "presence", data: { userId, online: false } }, userId);
        }
      };
    });
  }

  isOnline(userId: string) {
    return this.clients.has(userId);
  }

  /** Envoie un événement à tous les onglets des utilisateurs donnés. */
  emit(userIds: Iterable<string>, event: RealtimeEvent) {
    for (const id of new Set(userIds)) {
      for (const sub of this.clients.get(id) ?? []) {
        try {
          sub.next(event);
        } catch (e) {
          this.logger.warn(`Flux temps réel interrompu : ${String(e)}`);
        }
      }
    }
  }

  private broadcast(event: RealtimeEvent, except?: string) {
    this.emit(
      [...this.clients.keys()].filter((id) => id !== except),
      event,
    );
  }
}
