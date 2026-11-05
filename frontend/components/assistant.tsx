"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, useEffect, useRef, useState } from "react";
import { Bot, Library, Briefcase, RotateCcw, Send, X } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Avatar, profileHref, Verified } from "./ui";

interface Turn {
  role: "user" | "assistant";
  content: string;
  error?: boolean;
}

const SUGGESTIONS = {
  mentore: [
    "Quel mentor me conseilles-tu pour mon projet ?",
    "Aide-moi à préparer ma prochaine séance",
    "Découpe mon objectif en étapes concrètes",
    "Comment préparer mon entretien Campus France ?",
  ],
  mentor: [
    "Comment préparer ma prochaine séance ?",
    "Quelles ressources partager avec mes mentoré·es ?",
    "Comment donner un retour constructif ?",
    "Propose des étapes pour l'objectif d'un mentoré",
  ],
};

const storageKey = (userId: string) => `lirel:assistant:${userId}`;

/** Remplace **gras** et les références [mentor:id] / [ressource:id] / [opportunite:id] par des éléments d'interface. */
function Inline({ text }: { text: string }) {
  const { state, me } = useStore();
  const parts = text.split(/(\[(?:mentor|ressource|opportunite):[^\]\s]+\]|\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((p, i) => {
        const ref = p.match(/^\[(mentor|ressource|opportunite):([^\]\s]+)\]$/);
        if (ref) {
          const [, kind, id] = ref;
          if (kind === "mentor") {
            const u = state.users.find((x) => x.id === id);
            if (!u) return null;
            return (
              <Link
                key={i}
                href={profileHref(u, me?.id)}
                className="mx-0.5 inline-flex translate-y-[3px] items-center gap-1.5 rounded-full border border-beige-dark bg-papier py-0.5 pl-0.5 pr-2.5 align-baseline text-[0.82rem] font-semibold text-nuit transition hover:border-terracotta"
              >
                <Avatar user={u} size="xs" />
                {u.name}
                <Verified user={u} size={13} />
              </Link>
            );
          }
          if (kind === "ressource") {
            const r = state.resources.find((x) => x.id === id);
            if (!r) return null;
            return (
              <Link key={i} href={`/ressources/${r.id}`} className="mx-0.5 inline-flex translate-y-[2px] items-center gap-1 rounded-full bg-sauge-light/60 px-2 py-0.5 text-[0.82rem] font-semibold text-nuit hover:underline">
                <Library size={13} /> {r.title}
              </Link>
            );
          }
          const o = state.opportunities.find((x) => x.id === id);
          if (!o) return null;
          return (
            <Link key={i} href="/opportunites" className="mx-0.5 inline-flex translate-y-[2px] items-center gap-1 rounded-full bg-beige px-2 py-0.5 text-[0.82rem] font-semibold text-nuit hover:underline">
              <Briefcase size={13} /> {o.title}
            </Link>
          );
        }
        if (p.startsWith("**") && p.endsWith("**"))
          return (
            <strong key={i}>
              <Inline text={p.slice(2, -2)} />
            </strong>
          );
        return <Fragment key={i}>{p}</Fragment>;
      })}
    </>
  );
}

/** Mise en forme légère d'une réponse : paragraphes, listes à puces ou numérotées, titres. */
function Rich({ text }: { text: string }) {
  const blocks: { type: "p" | "ul" | "ol" | "h"; lines: string[] }[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) {
      blocks.push({ type: "p", lines: [] });
      continue;
    }
    const bullet = line.match(/^[-*•]\s+(.*)$/);
    const num = line.match(/^\d+[.)]\s+(.*)$/);
    const head = line.match(/^#{1,4}\s+(.*)$/);
    const type = bullet ? "ul" : num ? "ol" : head ? "h" : "p";
    const content = bullet?.[1] ?? num?.[1] ?? head?.[1] ?? line;
    const last = blocks[blocks.length - 1];
    if (last && last.type === type && type !== "h" && last.lines.length) last.lines.push(content);
    else blocks.push({ type, lines: [content] });
  }
  return (
    <div className="space-y-2">
      {blocks
        .filter((b) => b.lines.length)
        .map((b, i) => {
          if (b.type === "ul" || b.type === "ol") {
            const L = b.type === "ul" ? "ul" : "ol";
            return (
              <L key={i} className={cn("space-y-1 pl-5", b.type === "ul" ? "list-disc" : "list-decimal")}>
                {b.lines.map((l, j) => (
                  <li key={j}>
                    <Inline text={l} />
                  </li>
                ))}
              </L>
            );
          }
          if (b.type === "h")
            return (
              <p key={i} className="font-semibold text-nuit">
                <Inline text={b.lines[0]} />
              </p>
            );
          return (
            <p key={i}>
              {b.lines.map((l, j) => (
                <Fragment key={j}>
                  {j > 0 && <br />}
                  <Inline text={l} />
                </Fragment>
              ))}
            </p>
          );
        })}
    </div>
  );
}

export function Assistant() {
  const { me } = useStore();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Conversation conservée le temps de la session du navigateur.
  useEffect(() => {
    if (!me) return;
    try {
      const saved = sessionStorage.getItem(storageKey(me.id));
      setTurns(saved ? (JSON.parse(saved) as Turn[]) : []);
    } catch {
      setTurns([]);
    }
  }, [me?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!me) return;
    try {
      sessionStorage.setItem(storageKey(me.id), JSON.stringify(turns.filter((t) => !t.error)));
    } catch {
      /* stockage indisponible : la conversation ne survivra pas au rechargement */
    }
  }, [turns, me]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, busy, open]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (!me || pathname.startsWith("/visio")) return null;
  const mentor = me.role === "mentor";
  const firstName = me.name.split(" ")[0];

  async function send(text: string) {
    const content = text.trim();
    if (!content || busy) return;
    const history = [...turns.filter((t) => !t.error), { role: "user" as const, content }];
    setTurns(history);
    setInput("");
    setBusy(true);
    try {
      const { reply } = await api<{ reply: string }>("/assistant/chat", { body: { messages: history.map(({ role, content }) => ({ role, content })) } });
      setTurns((t) => [...t, { role: "assistant", content: reply }]);
    } catch (e) {
      const message = e instanceof ApiError ? e.message : "L'assistant n'a pas pu répondre. Réessayez dans un instant.";
      setTurns((t) => [...t, { role: "assistant", content: message, error: true }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Ouvrir l'assistant Lirel"
          className="fixed bottom-24 right-4 z-40 flex h-14 items-center gap-2 rounded-full bg-nuit pl-4 pr-5 text-sm font-semibold text-creme shadow-xl transition hover:bg-nuit-700 active:scale-95 md:bottom-6 md:right-6"
        >
          <Bot size={22} className="text-terracotta" />
          <span className="hidden sm:inline">Assistant</span>
        </button>
      )}

      {open && (
        <section
          role="dialog"
          aria-label="Assistant Lirel"
          className="fixed inset-0 z-[55] flex animate-apparition flex-col bg-creme shadow-2xl md:inset-auto md:bottom-6 md:right-6 md:h-[min(680px,calc(100vh-7rem))] md:w-[26rem] md:overflow-hidden md:rounded-2xl md:border md:border-beige-dark"
        >
          <header className="flex items-center gap-3 border-b border-beige-dark bg-nuit px-4 py-3 text-creme">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-terracotta">
              <Bot size={22} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-serif text-base leading-tight">Assistant Lirel</p>
              <p className="text-xs text-creme/70">IA d&apos;orientation · vos données restent sur Lirel</p>
            </div>
            {turns.length > 0 && (
              <button onClick={() => setTurns([])} className="rounded-full p-2 text-creme/80 hover:bg-white/10" aria-label="Nouvelle conversation" title="Nouvelle conversation">
                <RotateCcw size={18} />
              </button>
            )}
            <button onClick={() => setOpen(false)} className="rounded-full p-2 text-creme/80 hover:bg-white/10" aria-label="Fermer l'assistant">
              <X size={20} />
            </button>
          </header>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
            {turns.length === 0 && (
              <div className="space-y-4">
                <div className="rounded-2xl rounded-tl-md bg-papier px-4 py-3 text-[0.92rem] leading-relaxed text-encre shadow-sm">
                  Bonjour {firstName}, je suis l&apos;assistant de Lirel.{" "}
                  {mentor
                    ? "Je peux vous aider à préparer vos séances, à formuler vos conseils et à choisir les ressources à partager."
                    : "Décrivez-moi votre situation : je vous aide à trouver le bon mentor, à préparer vos séances et à avancer sur vos objectifs."}
                </div>
                <div className="flex flex-col items-start gap-2">
                  {SUGGESTIONS[mentor ? "mentor" : "mentore"].map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="rounded-full border border-beige-dark bg-papier px-3.5 py-1.5 text-left text-sm text-encre transition hover:border-terracotta hover:text-nuit"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {turns.map((t, i) =>
              t.role === "user" ? (
                <div key={i} className="ml-auto max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-tr-md bg-nuit px-4 py-2.5 text-[0.92rem] leading-relaxed text-creme">
                  {t.content}
                </div>
              ) : (
                <div
                  key={i}
                  className={cn(
                    "max-w-[92%] rounded-2xl rounded-tl-md px-4 py-3 text-[0.92rem] leading-relaxed shadow-sm",
                    t.error ? "border border-terracotta/40 bg-terracotta-light/40 text-terracotta-dark" : "bg-papier text-encre",
                  )}
                >
                  {t.error ? t.content : <Rich text={t.content} />}
                </div>
              ),
            )}

            {busy && (
              <div className="flex w-16 items-center justify-center gap-1 rounded-2xl rounded-tl-md bg-papier px-4 py-3.5 shadow-sm" aria-label="L'assistant écrit">
                {[0, 150, 300].map((d) => (
                  <span key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-nuit-500" style={{ animationDelay: `${d}ms` }} />
                ))}
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send(input);
            }}
            className="border-t border-beige-dark bg-papier px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3"
          >
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send(input);
                  }
                }}
                rows={1}
                maxLength={2000}
                placeholder="Posez votre question…"
                aria-label="Votre message à l'assistant"
                className="max-h-32 min-h-11 flex-1 resize-none rounded-2xl border border-beige-dark bg-creme px-4 py-2.5 text-[0.95rem] text-nuit outline-none placeholder:text-nuit-500/60 focus:border-terracotta"
              />
              <button
                type="submit"
                disabled={busy || !input.trim()}
                aria-label="Envoyer"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-terracotta text-white transition hover:bg-terracotta-dark disabled:opacity-40"
              >
                <Send size={18} />
              </button>
            </div>
            <p className="mt-2 text-center text-[0.68rem] text-nuit-500">Réponses générées par IA : vérifiez les informations importantes avec votre mentor.</p>
          </form>
        </section>
      )}
    </>
  );
}
