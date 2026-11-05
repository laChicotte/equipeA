"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { api, ApiError, tokenStore } from "./api";
import { callHref, connectRealtime, sendSignal, type CallEvent, type RealtimeEvent, type RealtimeStatus } from "./realtime";
import type { AxisId, Conversation, DomainId, Format, Goal, Mentorship, Opportunity, Resource, Role, Session, State, User } from "./types";
import { uid } from "./utils";

/** Rafraîchissement de secours quand le flux temps réel est coupé… */
const POLL_MS = 4000;
/** …et simple resynchronisation quand il fonctionne. */
const POLL_LIVE_MS = 30_000;
/** Durée d'affichage de « … écrit » après le dernier signal reçu. */
const TYPING_MS = 4000;
/** Intervalle minimal entre deux signaux de saisie envoyés. */
const TYPING_THROTTLE_MS = 2500;

/** Message affiché immédiatement, en attente de confirmation par le serveur. */
export type PendingMessage = { id: string; to: string; text: string; createdAt: string; failed?: boolean };

export type IncomingCall = { from: string; room: string; href: string; topic?: string };
/** Une sonnerie sans relance pendant ce délai est considérée comme abandonnée. */
const RING_TIMEOUT_MS = 40_000;

const EMPTY: State = {
  version: 10,
  users: [],
  currentUserId: null,
  mentorships: [],
  conversations: [],
  sessions: [],
  goals: [],
  resources: [],
  opportunities: [],
  notifications: [],
  favorites: {},
};

/** Le type choisit l'icône lucide affichée dans le toast. */
export type ToastKind = "info" | "success" | "error" | "message";
type Toast = { id: string; text: string; kind: ToastKind };

interface StoreValue {
  ready: boolean;
  /** Message d'erreur si l'API est injoignable */
  offline: string | null;
  state: State;
  me: User | null;
  toasts: Toast[];
  toast: (text: string, kind?: ToastKind) => void;
  refresh: () => Promise<void>;

  login: (email: string, password: string) => Promise<string | null>;
  register: (data: { name: string; email: string; password: string; city: string; role: Role }) => Promise<string | null>;
  logout: () => void;
  updateProfile: (data: Partial<Omit<User, "id" | "role" | "joinedAt">>) => Promise<void>;
  resetDemo: () => Promise<void>;

  requestMentorship: (mentorId: string, data: { domain: DomainId; axis: AxisId; message: string }) => Promise<void>;
  respondMentorship: (id: string, accept: boolean) => Promise<void>;
  endMentorship: (id: string) => Promise<void>;
  toggleFavorite: (mentorId: string) => Promise<void>;

  sendMessage: (otherId: string, text: string) => Promise<string>;
  markConversationRead: (conversationId: string) => void;
  /** À appeler pendant la saisie : prévient l'interlocuteur (limité en fréquence). */
  notifyTyping: (conversationId: string) => void;

  /** État du flux temps réel */
  realtime: RealtimeStatus;
  /** Membres actuellement connectés */
  online: Set<string>;
  /** Conversation → membre en train d'écrire */
  typing: Record<string, string>;
  /** Messages envoyés pas encore confirmés */
  pending: PendingMessage[];

  /** Abonnement aux signaux d'appel vidéo ; renvoie la fonction de désabonnement. */
  onCall: (fn: (e: CallEvent) => void) => () => void;
  /** Appel entrant à afficher (quelqu'un vous attend en visio) */
  incomingCall: IncomingCall | null;
  /** Ferme la bannière d'appel ; `decline` prévient l'appelant. */
  dismissCall: (decline?: boolean) => void;

  /** Mentor : programme une séance (confirmée). Mentoré : demande une séance (à valider par le mentor). */
  bookSession: (data: Pick<Session, "mentorId" | "menteeId" | "startsAt" | "format" | "topic" | "duration">) => Promise<string>;
  /** Mentor : valide ou décline une demande de séance. */
  respondSession: (id: string, accept: boolean, reason?: string) => Promise<void>;
  cancelSession: (id: string) => Promise<void>;
  completeSession: (id: string, notes?: string) => Promise<void>;
  saveSessionNotes: (id: string, notes: string) => Promise<void>;
  rateSession: (id: string, rating: number, review: string) => Promise<void>;

  addGoal: (data: { title: string; domain: DomainId; dueAt: string; mentorId?: string; steps: string[] }) => Promise<void>;
  toggleStep: (goalId: string, stepId: string) => Promise<void>;
  addStep: (goalId: string, text: string) => Promise<void>;
  deleteGoal: (goalId: string) => Promise<void>;
  setMentorNote: (goalId: string, note: string) => Promise<void>;

  toggleSaveResource: (id: string) => Promise<void>;
  createResource: (data: Pick<Resource, "title" | "kind" | "domain" | "summary" | "body" | "minutes">) => Promise<string>;

  toggleInterest: (id: string) => Promise<void>;
  createOpportunity: (data: Pick<Opportunity, "title" | "organization" | "kind" | "domain" | "city" | "deadline" | "description">) => Promise<void>;

  markAllRead: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
}

const StoreContext = createContext<StoreValue | null>(null);

export function conversationBetween(state: State, a: string, b: string) {
  return state.conversations.find((c) => c.members.includes(a) && c.members.includes(b));
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>(EMPTY);
  const [ready, setReady] = useState(false);
  const [offline, setOffline] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const readingRef = useRef(new Set<string>());
  const [realtime, setRealtime] = useState<RealtimeStatus>("connecting");
  const [online, setOnline] = useState<Set<string>>(() => new Set());
  const [typing, setTyping] = useState<Record<string, string>>({});
  const [pending, setPending] = useState<PendingMessage[]>([]);
  const typingTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const typingSentRef = useRef(new Map<string, number>());
  const meIdRef = useRef<string | null>(null);
  const usersRef = useRef<User[]>([]);
  const refreshSoon = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callListeners = useRef(new Set<(e: CallEvent) => void>());
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const ringTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toast = useCallback((text: string, kind: ToastKind = "info") => {
    const id = uid("t");
    setToasts((t) => [...t, { id, text, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3600);
  }, []);

  /** Recharge l'instantané des données visibles par l'utilisateur. */
  const refresh = useCallback(async () => {
    try {
      const next = await api<State>("/state");
      // Jeton expiré ou invalide : l'API répond en mode public.
      if (!next.currentUserId && tokenStore.get()) tokenStore.clear();
      setState(next);
      setOffline(null);
    } catch (e) {
      setOffline(e instanceof ApiError ? e.message : String(e));
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);

  // Filet de sécurité : sondage rapide si le flux est coupé, lent s'il fonctionne.
  useEffect(() => {
    const timer = setInterval(
      () => {
        if (document.visibilityState === "visible" && tokenStore.get()) void refresh();
      },
      realtime === "live" ? POLL_LIVE_MS : POLL_MS,
    );
    return () => clearInterval(timer);
  }, [refresh, realtime]);

  /* ---------- Temps réel ---------- */

  useEffect(() => {
    meIdRef.current = state.currentUserId;
    usersRef.current = state.users;
  }, [state.currentUserId, state.users]);

  const scheduleRefresh = useCallback(() => {
    if (refreshSoon.current) clearTimeout(refreshSoon.current);
    refreshSoon.current = setTimeout(() => void refresh(), 600);
  }, [refresh]);

  const stopTyping = useCallback((conversationId: string) => {
    clearTimeout(typingTimers.current.get(conversationId));
    typingTimers.current.delete(conversationId);
    setTyping((t) => {
      if (!(conversationId in t)) return t;
      const next = { ...t };
      delete next[conversationId];
      return next;
    });
  }, []);

  const onEvent = useCallback(
    (e: RealtimeEvent) => {
      const meId = meIdRef.current;
      switch (e.type) {
        case "message": {
          const { conversationId, members, message } = e.data;
          setState((s) => {
            const conv = s.conversations.find((c) => c.id === conversationId);
            if (!conv || conv.messages.some((m) => m.id === message.id)) return s;
            const readBy = message.userId === meId ? { ...conv.readBy, [message.userId]: message.createdAt } : conv.readBy;
            return { ...s, conversations: s.conversations.map((c) => (c === conv ? { ...c, messages: [...c.messages, message], readBy } : c)) };
          });
          if (message.userId === meId) {
            // Notre propre message (cet onglet ou un autre) : on retire sa version provisoire.
            const other = members.find((m) => m !== meId);
            setPending((p) => {
              const i = p.findIndex((x) => x.to === other && x.text === message.text && !x.failed);
              return i < 0 ? p : p.filter((_, j) => j !== i);
            });
          } else {
            stopTyping(conversationId);
            const q = new URLSearchParams(window.location.search);
            const viewing = window.location.pathname.startsWith("/messages") && (q.get("c") === conversationId || q.get("avec") === message.userId);
            if (!viewing && !message.system) {
              const author = usersRef.current.find((u) => u.id === message.userId)?.name.split(" ")[0] ?? "Nouveau message";
              toast(`${author} : ${message.text.length > 70 ? message.text.slice(0, 70) + "…" : message.text}`, "message");
            }
          }
          // Nouvelle conversation, compteurs, notifications : resynchronisation discrète.
          scheduleRefresh();
          break;
        }
        case "read": {
          const { conversationId, userId, at } = e.data;
          setState((s) => ({
            ...s,
            conversations: s.conversations.map((c) => (c.id === conversationId && (c.readBy[userId] ?? "") < at ? { ...c, readBy: { ...c.readBy, [userId]: at } } : c)),
          }));
          break;
        }
        case "typing": {
          const { conversationId, userId } = e.data;
          setTyping((t) => (t[conversationId] === userId ? t : { ...t, [conversationId]: userId }));
          clearTimeout(typingTimers.current.get(conversationId));
          typingTimers.current.set(
            conversationId,
            setTimeout(() => stopTyping(conversationId), TYPING_MS),
          );
          break;
        }
        case "presence":
          setOnline((o) => {
            const next = new Set(o);
            if (e.data.online) next.add(e.data.userId);
            else next.delete(e.data.userId);
            return next;
          });
          break;
        case "hello":
          setOnline(new Set(e.data.online));
          // Rattrape ce qui a pu arriver pendant une coupure.
          scheduleRefresh();
          break;
        case "refresh":
          scheduleRefresh();
          break;
        case "call": {
          const call = e.data;
          callListeners.current.forEach((fn) => fn(call));
          const href = callHref(call.room, call.from);
          if (call.kind === "ring") {
            // Déjà sur la page de l'appel : la salle d'attente l'affiche elle-même.
            if (window.location.pathname === href) break;
            setIncomingCall({ from: call.from, room: call.room, href, topic: typeof call.payload.topic === "string" ? call.payload.topic : undefined });
            if (ringTimer.current) clearTimeout(ringTimer.current);
            ringTimer.current = setTimeout(() => setIncomingCall(null), RING_TIMEOUT_MS);
          } else if (call.kind === "cancel" || call.kind === "leave") {
            setIncomingCall((c) => (c && c.from === call.from && c.room === call.room ? null : c));
          }
          break;
        }
      }
    },
    [scheduleRefresh, stopTyping, toast],
  );

  const onCall = useCallback((fn: (e: CallEvent) => void) => {
    callListeners.current.add(fn);
    return () => {
      callListeners.current.delete(fn);
    };
  }, []);

  const dismissCall = useCallback(
    (decline = false) => {
      if (incomingCall && decline) void sendSignal(incomingCall.from, incomingCall.room, "decline");
      setIncomingCall(null);
    },
    [incomingCall],
  );

  // Un flux par session : rouvert à chaque connexion / changement de compte.
  useEffect(() => {
    const token = state.currentUserId ? tokenStore.get() : null;
    if (!token) {
      setRealtime("offline");
      setOnline(new Set());
      return;
    }
    return connectRealtime(token, onEvent, setRealtime);
  }, [state.currentUserId, onEvent]);

  const me = useMemo(() => state.users.find((u) => u.id === state.currentUserId) ?? null, [state.users, state.currentUserId]);

  const value = useMemo<StoreValue>(() => {
    /** Appelle l'API, rafraîchit les données, affiche un message ; les erreurs deviennent des toasts. */
    async function run<T>(call: () => Promise<T>, success?: string | ((r: T) => string | undefined)): Promise<T | undefined> {
      try {
        const r = await call();
        await refresh();
        const msg = typeof success === "function" ? success(r) : success;
        if (msg) toast(msg, "success");
        return r;
      } catch (e) {
        toast(e instanceof Error ? e.message : "Une erreur est survenue.", "error");
        return undefined;
      }
    }

    const nameOf = (id: string) => state.users.find((u) => u.id === id)?.name ?? "";

    return {
      ready,
      offline,
      state,
      me,
      toasts,
      toast,
      refresh,
      realtime,
      online,
      typing,
      pending,
      onCall,
      incomingCall,
      dismissCall,

      async login(email, password) {
        try {
          const { token } = await api<{ token: string }>("/auth/login", { body: { email: email.trim(), password } });
          tokenStore.set(token);
          await refresh();
          return null;
        } catch (e) {
          return e instanceof Error ? e.message : "Connexion impossible.";
        }
      },

      async register(data) {
        try {
          const { token } = await api<{ token: string }>("/auth/register", { body: { ...data, name: data.name.trim(), email: data.email.trim() } });
          tokenStore.set(token);
          await refresh();
          return null;
        } catch (e) {
          return e instanceof Error ? e.message : "Inscription impossible.";
        }
      },

      logout() {
        tokenStore.clear();
        setState((s) => ({ ...s, currentUserId: null }));
        void refresh();
      },

      async updateProfile(data) {
        await run(() => api("/users/me", { method: "PATCH", body: data }));
      },

      async resetDemo() {
        await run(() => api("/demo/reset", { method: "POST" }), "Les données de démonstration ont été réinitialisées.");
        tokenStore.clear();
        await refresh();
      },

      /* ---------- Mise en relation ---------- */

      async requestMentorship(mentorId, data) {
        await run(() => api("/mentorships", { body: { mentorId, ...data } }), `Demande envoyée à ${nameOf(mentorId)}. Vous serez notifié·e de sa réponse.`);
      },

      async respondMentorship(id, accept) {
        const ms = state.mentorships.find((m) => m.id === id);
        await run(() => api(`/mentorships/${id}/respond`, { method: "PATCH", body: { accept } }), accept ? `Vous accompagnez désormais ${nameOf(ms?.menteeId ?? "")}` : "Demande déclinée");
      },

      async endMentorship(id) {
        await run(() => api(`/mentorships/${id}/end`, { method: "PATCH" }), "Mentorat clôturé. Merci pour ce bout de chemin ensemble !");
      },

      async toggleFavorite(mentorId) {
        await run(
          () => api<{ favorite: boolean }>(`/users/me/favorites/${mentorId}`, { method: "POST" }),
          (r) => (r.favorite ? `${nameOf(mentorId)} ajouté·e à vos favoris` : "Retiré de vos mentors favoris"),
        );
      },

      /* ---------- Messagerie ---------- */

      async sendMessage(otherId, text) {
        // Affichage immédiat ; la version définitive arrive par le flux temps réel.
        const tmp: PendingMessage = { id: uid("tmp"), to: otherId, text, createdAt: new Date().toISOString() };
        setPending((p) => [...p, tmp]);
        try {
          const r = await api<{ conversationId: string }>("/messages", { body: { to: otherId, text } });
          await refresh();
          setPending((p) => p.filter((x) => x.id !== tmp.id));
          return r.conversationId;
        } catch (e) {
          setPending((p) => p.map((x) => (x.id === tmp.id ? { ...x, failed: true } : x)));
          toast(e instanceof Error ? e.message : "Message non envoyé.");
          return "";
        }
      },

      notifyTyping(conversationId) {
        const now = Date.now();
        if (now - (typingSentRef.current.get(conversationId) ?? 0) < TYPING_THROTTLE_MS) return;
        typingSentRef.current.set(conversationId, now);
        api(`/conversations/${conversationId}/typing`, { method: "POST" }).catch(() => undefined);
      },

      markConversationRead(conversationId) {
        if (readingRef.current.has(conversationId)) return;
        readingRef.current.add(conversationId);
        api(`/conversations/${conversationId}/read`, { method: "POST" })
          .then(refresh)
          .catch(() => undefined)
          .finally(() => readingRef.current.delete(conversationId));
      },

      /* ---------- Séances ---------- */

      async bookSession(data) {
        const byMentor = me?.id === data.mentorId;
        const r = await run(
          () => api<{ id: string }>("/sessions", { body: data }),
          byMentor
            ? `Séance programmée. ${nameOf(data.menteeId).split(" ")[0]} a été prévenu·e.`
            : `Demande envoyée à ${nameOf(data.mentorId).split(" ")[0]}. Vous serez notifié·e dès sa validation.`,
        );
        return r?.id ?? "";
      },

      async respondSession(id, accept, reason) {
        const s = state.sessions.find((x) => x.id === id);
        const who = nameOf(s?.menteeId ?? "").split(" ")[0];
        await run(
          () => api(`/sessions/${id}/respond`, { method: "PATCH", body: { accept, ...(reason?.trim() ? { reason: reason.trim() } : {}) } }),
          accept ? `Séance confirmée. ${who} a été prévenu·e.` : `Demande déclinée. ${who} a été prévenu·e.`,
        );
      },

      async cancelSession(id) {
        const s = state.sessions.find((x) => x.id === id);
        await run(() => api(`/sessions/${id}/cancel`, { method: "PATCH" }), s?.status === "demandee" ? "Demande retirée." : "Séance annulée. Votre interlocuteur a été prévenu.");
      },

      async completeSession(id, notes) {
        await run(() => api(`/sessions/${id}/complete`, { method: "PATCH", body: { notes } }));
      },

      async saveSessionNotes(id, notes) {
        await run(() => api(`/sessions/${id}/notes`, { method: "PATCH", body: { notes } }), "Notes enregistrées");
      },

      async rateSession(id, rating, review) {
        await run(() => api(`/sessions/${id}/rate`, { method: "PATCH", body: { rating, review } }), "Merci pour votre évaluation, elle aide toute la communauté.");
      },

      /* ---------- Objectifs ---------- */

      async addGoal(data) {
        await run(() => api("/goals", { body: { ...data, mentorId: data.mentorId || undefined } }), "Objectif créé. Une étape à la fois !");
      },

      async toggleStep(goalId, stepId) {
        const title = state.goals.find((g) => g.id === goalId)?.title;
        await run(
          () => api<{ completed: boolean }>(`/goals/${goalId}/steps/${stepId}/toggle`, { method: "PATCH" }),
          (r) => (r.completed ? `Objectif atteint : « ${title} »` : undefined),
        );
      },

      async addStep(goalId, text) {
        await run(() => api(`/goals/${goalId}/steps`, { body: { text } }));
      },

      async deleteGoal(goalId) {
        await run(() => api(`/goals/${goalId}`, { method: "DELETE" }), "Objectif supprimé");
      },

      async setMentorNote(goalId, note) {
        await run(() => api(`/goals/${goalId}/mentor-note`, { method: "PATCH", body: { text: note } }), "Commentaire envoyé à votre mentoré·e");
      },

      /* ---------- Ressources & opportunités ---------- */

      async toggleSaveResource(id) {
        await run(
          () => api<{ saved: boolean }>(`/resources/${id}/save`, { method: "POST" }),
          (r) => (r.saved ? "Ajouté à vos ressources enregistrées" : "Retiré de vos ressources"),
        );
      },

      async createResource(data) {
        const r = await run(() => api<{ id: string }>("/resources", { body: data }), "Ressource publiée dans la bibliothèque");
        return r?.id ?? "";
      },

      async toggleInterest(id) {
        await run(
          () => api<{ interested: boolean }>(`/opportunities/${id}/interest`, { method: "POST" }),
          (r) => (r.interested ? "Opportunité enregistrée. Pensez à en parler à votre mentor !" : "Opportunité retirée de votre sélection"),
        );
      },

      async createOpportunity(data) {
        await run(() => api("/opportunities", { body: data }), "Opportunité partagée avec la communauté");
      },

      async markAllRead() {
        await run(() => api("/notifications/read-all", { method: "POST" }));
      },

      async markRead(id) {
        await run(() => api(`/notifications/${id}/read`, { method: "POST" }));
      },
    };
  }, [ready, offline, state, me, toasts, toast, refresh, realtime, online, typing, pending, onCall, incomingCall, dismissCall]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore doit être utilisé dans <StoreProvider>");
  return ctx;
}

/* ---------- Sélecteurs ---------- */

export function useUser(id: string | undefined) {
  const { state } = useStore();
  return state.users.find((u) => u.id === id);
}

/** Les personnes que j'accompagne (mentor) ou qui m'accompagnent (mentoré). */
export function myMentorships(state: State, me: User | null, status?: Mentorship["status"]) {
  if (!me) return [];
  return state.mentorships.filter((m) => (m.mentorId === me.id || m.menteeId === me.id) && (!status || m.status === status));
}

export function partnerOf(m: { mentorId: string; menteeId: string }, meId: string) {
  return m.mentorId === meId ? m.menteeId : m.mentorId;
}

export function mySessions(state: State, meId: string | undefined) {
  return state.sessions.filter((s) => s.mentorId === meId || s.menteeId === meId);
}

export function unreadCount(c: Conversation, meId: string) {
  const since = c.readBy[meId] ?? "";
  return c.messages.filter((m) => m.userId !== meId && m.createdAt > since).length;
}

export function goalProgress(g: Goal) {
  const done = g.steps.filter((s) => s.done).length;
  return { done, total: g.steps.length, pct: g.steps.length ? Math.round((done / g.steps.length) * 100) : 0 };
}

export type { Format };
