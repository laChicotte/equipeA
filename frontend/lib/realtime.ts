/** Client temps réel : flux SSE de l'API (GET /realtime), lu via fetch pour garder le jeton dans l'en-tête Authorization. */

import { API_URL, BASE_HEADERS, tokenStore } from "./api";
import type { Message } from "./types";

/** Signaux d'appel vidéo relayés par le serveur entre les deux participants. */
export type CallSignal = "ring" | "cancel" | "decline" | "hello" | "offer" | "answer" | "ice" | "media" | "leave";
export type CallEvent = { from: string; room: string; kind: CallSignal; payload: Record<string, unknown> };

export type RealtimeEvent =
  | { type: "message"; data: { conversationId: string; members: [string, string]; message: Message } }
  | { type: "read"; data: { conversationId: string; userId: string; at: string } }
  | { type: "typing"; data: { conversationId: string; userId: string } }
  | { type: "presence"; data: { userId: string; online: boolean } }
  | { type: "hello"; data: { online: string[] } }
  | { type: "refresh"; data: Record<string, never> }
  | { type: "call"; data: CallEvent };

/** Salle d'appel : la séance, ou la paire de membres (triée) pour un appel direct. */
export function callRoom(sessionId: string | undefined, a: string, b: string) {
  return sessionId ? `s:${sessionId}` : `d:${[a, b].sort().join(":")}`;
}

/** Page à ouvrir pour rejoindre la salle, vue du destinataire. */
export function callHref(room: string, from: string) {
  return room.startsWith("s:") ? `/visio/${room.slice(2)}` : `/visio/direct-${from}`;
}

/** Envoie un signal d'appel ; `keepalive` permet de l'envoyer pendant la fermeture de l'onglet. */
export function sendSignal(to: string, room: string, kind: CallSignal, payload: Record<string, unknown> = {}, keepalive = false) {
  const token = tokenStore.get();
  if (!token) return Promise.resolve();
  return fetch(`${API_URL}/calls/signal`, {
    method: "POST",
    headers: { ...BASE_HEADERS, "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ to, room, kind, payload }),
    keepalive,
  }).then(
    () => undefined,
    () => undefined,
  );
}

export type RealtimeStatus = "connecting" | "live" | "offline";

/** Ouvre le flux et se reconnecte automatiquement (attente progressive). Renvoie la fonction de fermeture. */
export function connectRealtime(token: string, onEvent: (e: RealtimeEvent) => void, onStatus: (s: RealtimeStatus) => void): () => void {
  const abort = new AbortController();
  let attempt = 0;

  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

  async function run() {
    while (!abort.signal.aborted) {
      onStatus("connecting");
      try {
        const res = await fetch(`${API_URL}/realtime`, {
          headers: { ...BASE_HEADERS, Authorization: `Bearer ${token}`, Accept: "text/event-stream" },
          cache: "no-store",
          signal: abort.signal,
        });
        // Jeton refusé : inutile d'insister, le store se reconnectera après une nouvelle connexion.
        if (res.status === 401 || res.status === 403) {
          onStatus("offline");
          return;
        }
        if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

        onStatus("live");
        attempt = 0;
        const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
        let buffer = "";
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += value;
          let sep: number;
          while ((sep = buffer.search(/\r?\n\r?\n/)) >= 0) {
            const block = buffer.slice(0, sep);
            buffer = buffer.slice(sep).replace(/^\r?\n\r?\n/, "");
            const event = parse(block);
            if (event) onEvent(event);
          }
        }
      } catch {
        if (abort.signal.aborted) return;
      }
      onStatus("offline");
      attempt++;
      await wait(Math.min(15_000, 1000 * 2 ** Math.min(attempt, 4)) + Math.random() * 500);
    }
  }

  void run();
  return () => abort.abort();
}

function parse(block: string): RealtimeEvent | null {
  let type = "message";
  const data: string[] = [];
  for (const line of block.split(/\r?\n/)) {
    if (line.startsWith("event:")) type = line.slice(6).trim();
    else if (line.startsWith("data:")) data.push(line.slice(5).replace(/^ /, ""));
  }
  if (type === "ping" || data.length === 0) return null;
  try {
    return { type, data: JSON.parse(data.join("\n")) } as RealtimeEvent;
  } catch {
    return null;
  }
}
