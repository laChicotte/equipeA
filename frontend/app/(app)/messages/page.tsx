"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, CalendarDays, Send, Video } from "lucide-react";
import { conversationBetween, unreadCount, useStore } from "@/lib/store";
import { cn, formatDate, timeAgo } from "@/lib/utils";
import { Avatar, btn, EmptyState, profileHref, Verified } from "@/components/ui";

export default function MessagesPage() {
  return (
    <Suspense>
      <Messages />
    </Suspense>
  );
}

function Messages() {
  const { state, me, sendMessage, markConversationRead, notifyTyping, realtime, online, typing, pending } = useStore();
  const params = useSearchParams();
  const router = useRouter();
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const conversations = useMemo(
    () =>
      me
        ? state.conversations
            .filter((c) => c.members.includes(me.id) && c.messages.length > 0)
            .sort((a, b) => (b.messages.at(-1)?.createdAt ?? "").localeCompare(a.messages.at(-1)?.createdAt ?? ""))
        : [],
    [state.conversations, me],
  );

  const withId = params.get("avec");
  const convId = params.get("c");
  const active = convId ? state.conversations.find((c) => c.id === convId) : withId && me ? conversationBetween(state, me.id, withId) : undefined;
  const partnerId = active ? active.members.find((m) => m !== me?.id) : withId;
  const partner = state.users.find((u) => u.id === partnerId);
  const showThread = !!partner;

  const lastLen = active?.messages.length ?? 0;
  const outbox = pending.filter((p) => p.to === partnerId);
  const partnerTyping = !!active && !!partnerId && typing[active.id] === partnerId;
  useEffect(() => {
    if (active && me && unreadCount(active, me.id) > 0) markConversationRead(active.id);
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [active, lastLen, me, markConversationRead, outbox.length, partnerTyping]);

  if (!me) return null;

  // « Vu » sous mon dernier message, dès que l'interlocuteur a ouvert la conversation.
  const lastMine = active?.messages.findLast((m) => m.userId === me.id && !m.system);
  const seen = !!lastMine && !!partnerId && (active?.readBy[partnerId] ?? "") >= lastMine.createdAt;
  const partnerOnline = !!partnerId && online.has(partnerId);

  const relation = partner ? state.mentorships.find((m) => (m.mentorId === partner.id && m.menteeId === me.id) || (m.menteeId === partner.id && m.mentorId === me.id)) : undefined;
  const upcoming = partner
    ? state.sessions
        .filter((s) => s.status === "planifiee" && ((s.mentorId === partner.id && s.menteeId === me.id) || (s.menteeId === partner.id && s.mentorId === me.id)) && new Date(s.startsAt) > new Date(Date.now() - 3600_000))
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0]
    : undefined;

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partner || !text.trim()) return;
    const body = text.trim();
    setText("");
    const id = await sendMessage(partner.id, body);
    if (!convId && id) router.replace(`/messages?c=${id}`);
  };

  return (
    <div className="animate-apparition">
      <div className="grid h-[calc(100vh-11rem)] min-h-[30rem] overflow-hidden rounded-2xl bg-papier shadow-doux md:h-[calc(100vh-9rem)] md:grid-cols-[20rem_minmax(0,1fr)]">
        {/* Liste */}
        <aside className={cn("flex min-h-0 flex-col border-beige md:border-r", showThread && "hidden md:flex")}>
          <div className="border-b border-beige px-5 py-4">
            <div className="flex items-center justify-between gap-2">
              <h1 className="font-serif text-lg">Messages</h1>
              <span
                className={cn("flex items-center gap-1.5 text-[0.7rem] font-medium", realtime === "live" ? "text-sauge-dark" : "text-nuit-500")}
                title={realtime === "live" ? "Les messages arrivent instantanément" : "Reconnexion au serveur… les messages sont synchronisés toutes les quelques secondes"}
              >
                <span className={cn("h-2 w-2 rounded-full", realtime === "live" ? "animate-pulse bg-sauge" : "bg-nuit-500/40")} />
                {realtime === "live" ? "En direct" : "Reconnexion…"}
              </span>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {conversations.length === 0 && <p className="px-4 py-10 text-center text-sm text-nuit-500">Vos conversations avec vos mentors apparaîtront ici.</p>}
            {conversations.map((c) => {
              const other = state.users.find((u) => u.id === c.members.find((m) => m !== me.id));
              const last = c.messages.at(-1)!;
              const unread = unreadCount(c, me.id);
              const selected = active?.id === c.id;
              return (
                <Link key={c.id} href={`/messages?c=${c.id}`} className={cn("flex items-center gap-3 rounded-2xl px-3 py-3 transition", selected ? "bg-beige/70" : "hover:bg-beige/40")}>
                  <span className="relative shrink-0">
                    <Avatar user={other} size="lg" />
                    {other && online.has(other.id) && <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-papier bg-sauge" aria-label="En ligne" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className={cn("truncate", unread ? "font-semibold" : "font-medium")}>{other?.name}</p>
                      <span className="shrink-0 text-[0.7rem] text-nuit-500">{timeAgo(last.createdAt).replace("il y a ", "")}</span>
                    </div>
                    {typing[c.id] && typing[c.id] !== me.id ? (
                      <p className="truncate text-sm italic text-sauge-dark">écrit…</p>
                    ) : (
                      <p className={cn("truncate text-sm", unread ? "font-medium text-nuit" : "text-nuit-500")}>
                        {last.userId === me.id && !last.system ? "Vous : " : ""}
                        {last.text}
                      </p>
                    )}
                  </div>
                  {unread > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-terracotta px-1 text-[0.65rem] font-bold text-white">{unread}</span>}
                </Link>
              );
            })}
          </div>
        </aside>

        {/* Fil */}
        {showThread && partner ? (
          <section className="flex min-h-0 flex-col">
            <header className="flex items-center gap-3 border-b border-beige px-4 py-3 sm:px-5">
              <Link href="/messages" className="-ml-1 rounded-full p-2 hover:bg-beige/70 md:hidden" aria-label="Retour aux conversations">
                <ArrowLeft size={18} />
              </Link>
              <Link href={profileHref(partner, me.id)} className="flex min-w-0 flex-1 items-center gap-3">
                <Avatar user={partner} size="md" />
                <div className="min-w-0">
                  <p className="flex items-center gap-1 truncate font-semibold">
                    {partner.name} <Verified user={partner} size={14} />
                  </p>
                  <p className="truncate text-xs text-nuit-500">
                    {partnerTyping ? (
                      <span className="italic text-sauge-dark">écrit…</span>
                    ) : (
                      <>
                        {partnerOnline && <span className="font-medium text-sauge-dark">En ligne · </span>}
                        {partner.role === "mentor" ? partner.title : relation?.status === "active" ? "Votre mentoré·e" : partner.city}
                      </>
                    )}
                  </p>
                </div>
              </Link>
              <Link href={`/visio/direct-${partner.id}`} className={btn.primary + " px-4"} title="Démarrer un appel vidéo">
                <Video size={16} /> <span className="hidden sm:inline">Visio</span>
              </Link>
            </header>

            {upcoming && (
              <Link href="/seances" className="flex items-center gap-2 bg-sauge-light/60 px-5 py-2 text-xs font-medium text-sauge-dark">
                <CalendarDays size={14} />
                Prochaine séance : {formatDate(upcoming.startsAt, { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })} · {upcoming.topic}
              </Link>
            )}

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-5 sm:px-6">
              {(!active || active.messages.length === 0) && outbox.length === 0 && (
                <div className="py-10">
                  <EmptyState title={`Écrivez à ${partner.name.split(" ")[0]}`} text="Présentez-vous, posez une question ou proposez un créneau de séance." />
                </div>
              )}
              {active?.messages.map((m, i) => {
                const mine = m.userId === me.id;
                const prev = active.messages[i - 1];
                const showDay = !prev || new Date(prev.createdAt).toDateString() !== new Date(m.createdAt).toDateString();
                return (
                  <div key={m.id}>
                    {showDay && <p className="my-4 text-center text-[0.7rem] font-semibold uppercase tracking-wider text-nuit-500">{formatDate(m.createdAt, { weekday: "long", day: "numeric", month: "long" })}</p>}
                    {m.system ? (
                      <p className="mx-auto w-fit max-w-[90%] rounded-full bg-beige/70 px-4 py-1.5 text-center text-xs text-encre">{m.text}</p>
                    ) : (
                      <div className={cn("flex items-end gap-2", mine && "justify-end")}>
                        {!mine && <Avatar user={partner} size="xs" />}
                        <div className={cn("max-w-[80%] rounded-2xl px-4 py-2.5 text-[0.95rem] leading-relaxed", mine ? "rounded-br-md bg-nuit text-creme" : "rounded-bl-md bg-beige/70 text-nuit")}>
                          {m.text}
                          <span className={cn("mt-0.5 block text-right text-[0.65rem]", mine ? "text-creme/50" : "text-nuit-500")}>
                            {formatDate(m.createdAt, { hour: "2-digit", minute: "2-digit" })}
                            {m.id === lastMine?.id && outbox.length === 0 && (seen ? " · Vu" : " · Envoyé")}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {outbox.map((p) => (
                <div key={p.id} className="flex justify-end">
                  <div className={cn("max-w-[80%] rounded-2xl rounded-br-md px-4 py-2.5 text-[0.95rem] leading-relaxed", p.failed ? "bg-terracotta/15 text-nuit" : "bg-nuit/70 text-creme")}>
                    {p.text}
                    <span className={cn("mt-0.5 block text-right text-[0.65rem]", p.failed ? "text-terracotta-dark" : "text-creme/50")}>{p.failed ? "Échec de l'envoi" : "Envoi…"}</span>
                  </div>
                </div>
              ))}
              {partnerTyping && (
                <div className="flex items-end gap-2" aria-live="polite">
                  <Avatar user={partner} size="xs" />
                  <div className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-beige/70 px-4 py-3.5" aria-label={`${partner.name.split(" ")[0]} écrit…`}>
                    {[0, 150, 300].map((d) => (
                      <span key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-nuit-500" style={{ animationDelay: `${d}ms` }} />
                    ))}
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>

            <form onSubmit={send} className="flex items-end gap-2 border-t border-beige p-3 sm:p-4">
              <textarea
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  if (active && e.target.value.trim()) notifyTyping(active.id);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(e);
                  }
                }}
                rows={1}
                className="max-h-32 flex-1 resize-none rounded-2xl border border-beige-dark bg-creme px-4 py-3 text-[0.95rem] outline-none focus:border-terracotta"
                placeholder={`Écrire à ${partner.name.split(" ")[0]}…`}
                aria-label="Votre message"
              />
              <button type="submit" disabled={!text.trim()} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-terracotta text-white transition hover:bg-terracotta-dark disabled:opacity-40" aria-label="Envoyer">
                <Send size={18} />
              </button>
            </form>
          </section>
        ) : (
          <section className="hidden items-center justify-center p-10 md:flex">
            <EmptyState title="Sélectionnez une conversation" text="Échangez avec vos mentors entre deux séances : une question, un document à relire, un encouragement." />
          </section>
        )}
      </div>
    </div>
  );
}
