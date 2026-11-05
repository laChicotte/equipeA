"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  Briefcase,
  ChevronDown,
  CalendarDays,
  Compass,
  Home,
  Library,
  LogOut,
  MessagesSquare,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Target,
  User as UserIcon,
  X,
} from "lucide-react";
import { domainById, OPPORTUNITY_KINDS, RESOURCE_KINDS } from "@/lib/domains";
import { unreadCount, useStore } from "@/lib/store";
import { cn, normalize, timeAgo } from "@/lib/utils";
import { Avatar, Logo, profileHref } from "./ui";
import { Assistant } from "./assistant";

export const NAV = [
  { href: "/accueil", label: "Accueil", icon: Home },
  { href: "/mentors", label: "Mentors", icon: Compass },
  { href: "/messages", label: "Messages", icon: MessagesSquare },
  { href: "/seances", label: "Séances", icon: CalendarDays },
  { href: "/objectifs", label: "Objectifs", icon: Target },
  { href: "/ressources", label: "Ressources", icon: Library },
  { href: "/opportunites", label: "Opportunités", icon: Briefcase },
];

function isActive(pathname: string, href: string) {
  if (href === "/mentors") return pathname.startsWith("/mentors") || pathname.startsWith("/membres");
  if (href === "/seances") return pathname.startsWith("/seances") || pathname.startsWith("/visio");
  return pathname.startsWith(href);
}

function useUnreadMessages() {
  const { state, me } = useStore();
  if (!me) return 0;
  return state.conversations.filter((c) => c.members.includes(me.id)).reduce((n, c) => n + unreadCount(c, me.id), 0);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const pathname = usePathname();
  const immersive = pathname.startsWith("/visio");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    setMoreOpen(false);
    window.scrollTo({ top: 0 });
  }, [pathname]);

  if (immersive) return <>{children}</>;

  return (
    <div className="min-h-screen">
      <a href="#contenu" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[80] focus:rounded-full focus:bg-nuit focus:px-4 focus:py-2 focus:text-creme">
        Aller au contenu
      </a>
      <Header onSearch={() => setSearchOpen(true)} />
      <main id="contenu" className="mx-auto max-w-[78rem] px-4 pb-32 pt-6 sm:px-6 md:pb-20 lg:px-8 lg:pt-8">
        {children}
      </main>
      <MobileNav onMore={() => setMoreOpen(true)} />
      <Assistant />
      {moreOpen && <MoreSheet onClose={() => setMoreOpen(false)} />}
      {searchOpen && <SearchDialog onClose={() => setSearchOpen(false)} />}
    </div>
  );
}

/** Élément de la barre : icône au-dessus du libellé, soulignement terracotta quand la page est active. */
const navItem = (active: boolean) =>
  cn(
    "relative flex h-full min-w-[3.25rem] flex-col items-center justify-center gap-0.5 px-1.5 text-[0.7rem] font-medium transition xl:min-w-[4.75rem]",
    "after:absolute after:inset-x-1.5 after:bottom-0 after:h-0.5 after:rounded-full after:transition",
    active ? "text-nuit after:bg-terracotta" : "text-nuit-500 after:bg-transparent hover:text-nuit",
  );

function Header({ onSearch }: { onSearch: () => void }) {
  const pathname = usePathname();
  const unread = useUnreadMessages();
  return (
    <header className="sticky top-0 z-40 border-b border-beige-dark bg-papier">
      <div className="mx-auto flex h-[3.75rem] max-w-[78rem] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Link href="/accueil" aria-label="Lirel, accueil" className="shrink-0">
          <Logo />
        </Link>

        <button
          onClick={onSearch}
          aria-label="Rechercher"
          className="ml-1 hidden h-10 items-center gap-2 rounded-full border border-beige-dark bg-creme px-3 text-sm text-nuit-500 transition hover:border-nuit/30 md:flex lg:w-56 lg:px-4 xl:w-72"
        >
          <Search size={17} className="shrink-0" />
          <span className="hidden lg:inline">Rechercher</span>
          <kbd className="ml-auto hidden rounded border border-beige-dark bg-papier px-1.5 font-sans text-[0.65rem] text-nuit-500 xl:inline">Ctrl K</kbd>
        </button>

        <nav aria-label="Navigation principale" className="ml-auto hidden h-full items-stretch md:flex">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link key={href} href={href} title={label} aria-current={active ? "page" : undefined} className={navItem(active)}>
                <span className="relative">
                  <Icon size={21} strokeWidth={active ? 2.2 : 1.8} className={active ? "text-terracotta" : ""} />
                  {href === "/messages" && unread > 0 && (
                    <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-terracotta px-1 text-[0.6rem] font-bold text-white ring-2 ring-papier">{unread}</span>
                  )}
                </span>
                <span className="hidden lg:inline">{label}</span>
              </Link>
            );
          })}
          <span aria-hidden className="mx-1.5 my-3 w-px bg-beige-dark" />
          <NotificationsButton nav />
          <AvatarMenu nav />
        </nav>

        <div className="ml-auto flex items-center gap-2 md:hidden">
          <button onClick={onSearch} className="flex h-10 w-10 items-center justify-center rounded-full border border-beige-dark bg-creme text-nuit-500" aria-label="Rechercher">
            <Search size={17} />
          </button>
          <NotificationsButton />
          <AvatarMenu />
        </div>
      </div>
    </header>
  );
}

function useDismiss(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && close();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);
  return ref;
}

function NotificationsButton({ nav }: { nav?: boolean }) {
  const { state, me, markAllRead, markRead } = useStore();
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));
  const router = useRouter();
  const list = state.notifications.filter((n) => n.userId === me?.id);
  const unread = list.filter((n) => !n.read).length;
  const badge = unread > 0 && (
    <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-terracotta px-1 text-[0.6rem] font-bold text-white ring-2 ring-papier">{unread}</span>
  );

  return (
    <div className={cn("relative", nav && "flex h-full")} ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={
          nav
            ? navItem(open)
            : cn("relative flex h-10 w-10 items-center justify-center rounded-full border transition", open ? "border-nuit/30 bg-beige text-nuit" : "border-beige-dark bg-creme text-nuit-500 hover:text-nuit")
        }
        aria-label={`Notifications${unread ? ` (${unread} non lues)` : ""}`}
        aria-expanded={open}
      >
        <span className="relative">
          <Bell size={nav ? 21 : 18} strokeWidth={1.8} className={nav && open ? "text-terracotta" : ""} />
          {badge}
        </span>
        {nav && <span className="hidden lg:inline">Notifications</span>}
      </button>
      {open && (
        <div className="fixed inset-x-3 top-[4.25rem] z-50 animate-apparition overflow-hidden rounded-2xl border border-beige-dark bg-papier shadow-2xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96">
          <div className="flex items-center justify-between border-b border-beige px-5 py-4">
            <p className="font-serif text-base">Notifications</p>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-xs font-semibold text-terracotta-dark hover:text-nuit">
                Tout marquer comme lu
              </button>
            )}
          </div>
          <div className="max-h-[65vh] overflow-y-auto p-2">
            {list.length === 0 && <p className="px-5 py-10 text-center text-sm text-nuit-500">Aucune notification pour l&apos;instant.</p>}
            {list.map((n) => {
              const actor = state.users.find((u) => u.id === n.actorId);
              return (
                <button
                  key={n.id}
                  onClick={() => {
                    markRead(n.id);
                    setOpen(false);
                    router.push(n.href);
                  }}
                  className="flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-beige/50"
                >
                  <Avatar user={actor} size="lg" />
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-sm leading-snug", n.read ? "text-nuit-500" : "text-encre")}>
                      <span className="font-semibold text-nuit">{actor?.name}</span> {n.text}
                    </p>
                    <p className={cn("mt-1 text-xs", n.read ? "text-nuit-500" : "font-semibold text-terracotta-dark")}>{timeAgo(n.createdAt)}</p>
                  </div>
                  {!n.read && <span className="mt-4 h-3 w-3 shrink-0 rounded-full bg-terracotta" aria-label="Non lue" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

async function confirmReset(resetDemo: () => Promise<void>, go: (href: string) => void) {
  if (confirm("Réinitialiser toutes les données de démonstration ?")) {
    await resetDemo();
    go("/");
  }
}

function AvatarMenu({ nav }: { nav?: boolean }) {
  const { me, logout, resetDemo } = useStore();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));
  const router = useRouter();
  if (!me) return null;
  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };
  return (
    <div className={cn("relative", nav && "flex h-full")} ref={ref}>
      {nav ? (
        <button onClick={() => setOpen((o) => !o)} className={navItem(open || pathname.startsWith("/profil"))} aria-label="Mon compte" aria-expanded={open}>
          <Avatar user={me} size="xs" />
          <span className="hidden items-center gap-0.5 lg:inline-flex">
            Vous <ChevronDown size={12} />
          </span>
        </button>
      ) : (
        <button onClick={() => setOpen((o) => !o)} className={cn("block rounded-full ring-2 ring-offset-2 ring-offset-papier transition", open ? "ring-nuit/40" : "ring-transparent hover:ring-beige-dark")} aria-label="Mon compte" aria-expanded={open}>
          <Avatar user={me} size="md" />
        </button>
      )}
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 animate-apparition overflow-hidden rounded-2xl border border-beige-dark bg-papier p-2 shadow-2xl">
          <button onClick={() => go("/profil")} className="flex w-full items-center gap-3 rounded-2xl p-3 text-left shadow-doux hover:bg-beige/50">
            <Avatar user={me} size="lg" />
            <span className="min-w-0">
              <span className="block truncate font-semibold">{me.name}</span>
              <span className="block text-sm text-nuit-500">{me.role === "mentor" ? "Mentor" : "Mentoré·e"} · voir mon profil</span>
            </span>
          </button>
          <div className="mt-2 space-y-0.5">
            <MenuItem icon={Target} label="Mes objectifs" onClick={() => go("/objectifs")} />
            <MenuItem icon={CalendarDays} label="Mon agenda" onClick={() => go("/seances")} />
            <MenuItem icon={RotateCcw} label="Réinitialiser la démo" onClick={() => confirmReset(resetDemo, go)} />
            <MenuItem
              icon={LogOut}
              label="Se déconnecter"
              onClick={() => {
                logout();
                go("/");
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function MenuItem({ icon: Icon, label, onClick }: { icon: typeof Home; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-[0.95rem] hover:bg-beige/50">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-beige/70">
        <Icon size={18} />
      </span>
      {label}
    </button>
  );
}

function MobileNav({ onMore }: { onMore: () => void }) {
  const pathname = usePathname();
  const { me } = useStore();
  const unread = useUnreadMessages();
  const mentor = me?.role === "mentor";
  const item = (href: string, label: string, Icon: typeof Home, badge = 0) => {
    const active = isActive(pathname, href);
    return (
      <Link key={href} href={href} aria-current={active ? "page" : undefined} className={cn("relative flex flex-col items-center gap-1 py-2.5 text-[0.68rem] font-medium", active ? "text-nuit" : "text-nuit-500")}>
        <Icon size={23} strokeWidth={active ? 2.4 : 1.8} className={active ? "text-terracotta" : ""} />
        {label}
        {badge > 0 && <span className="absolute right-[22%] top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-terracotta px-1 text-[0.6rem] font-bold text-white">{badge}</span>}
      </Link>
    );
  };
  return (
    <nav aria-label="Navigation mobile" className="fixed inset-x-0 bottom-0 z-40 border-t border-beige-dark bg-papier/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden">
      <div className="grid grid-cols-5 items-center">
        {item("/accueil", "Accueil", Home)}
        {item("/mentors", "Mentors", Compass)}
        <div className="flex justify-center">
          <Link
            href={mentor ? "/ressources/nouvelle" : "/mentors/trouver"}
            aria-label={mentor ? "Partager une ressource" : "Trouver un mentor"}
            className="-mt-5 flex h-13 w-13 items-center justify-center rounded-full bg-nuit text-white shadow-lg ring-4 ring-papier transition active:scale-95"
          >
            {mentor ? <Plus size={26} strokeWidth={2.4} /> : <Sparkles size={24} strokeWidth={2.2} />}
          </Link>
        </div>
        {item("/messages", "Messages", MessagesSquare, unread)}
        <button onClick={onMore} className="flex flex-col items-center gap-1 py-2.5 text-[0.68rem] font-medium text-nuit-500" aria-label="Plus de sections">
          {me ? <Avatar user={me} size="xs" className="h-[23px] w-[23px]" /> : <UserIcon size={23} />}
          Moi
        </button>
      </div>
    </nav>
  );
}

function MoreSheet({ onClose }: { onClose: () => void }) {
  const { me, logout, resetDemo } = useStore();
  const router = useRouter();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  const links = [
    { href: "/profil", label: "Mon profil", icon: UserIcon },
    { href: "/seances", label: "Séances", icon: CalendarDays },
    { href: "/objectifs", label: "Objectifs", icon: Target },
    { href: "/ressources", label: "Ressources", icon: Library },
    { href: "/opportunites", label: "Opportunités", icon: Briefcase },
  ];
  return (
    <div className="fixed inset-0 z-50 bg-nuit/40 md:hidden" onClick={onClose}>
      <div role="dialog" aria-label="Menu" className="absolute inset-x-0 bottom-0 animate-apparition rounded-t-2xl bg-creme p-5 pb-8" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-beige-dark" />
        {me && (
          <div className="mb-4 flex items-center gap-3 px-1">
            <Avatar user={me} size="lg" />
            <div>
              <p className="font-serif text-lg">{me.name}</p>
              <p className="text-xs text-nuit-500">{me.role === "mentor" ? "Mentor" : "Mentoré·e"}</p>
            </div>
          </div>
        )}
        <div className="overflow-hidden rounded-2xl bg-papier">
          {links.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className="flex items-center gap-4 border-b border-beige px-4 py-4 text-[1.02rem] last:border-0">
              <Icon size={21} className="text-terracotta" />
              {label}
            </Link>
          ))}
        </div>
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => {
              logout();
              router.push("/");
            }}
            className="flex flex-1 items-center justify-center gap-2 rounded-full border border-beige-dark py-3 text-sm font-medium"
          >
            <LogOut size={16} /> Déconnexion
          </button>
          <button
            onClick={() => confirmReset(resetDemo, (h) => router.push(h))}
            className="flex items-center justify-center gap-2 rounded-full border border-beige-dark px-4 py-3 text-sm font-medium text-nuit-500"
          >
            <RotateCcw size={16} /> Réinitialiser
          </button>
        </div>
      </div>
    </div>
  );
}

function SearchDialog({ onClose }: { onClose: () => void }) {
  const { state, me } = useStore();
  const router = useRouter();
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const results = useMemo(() => {
    const n = normalize(q.trim());
    if (!n) return null;
    const people = state.users.filter((u) => u.id !== me?.id && normalize([u.name, u.title, u.organization, u.city, ...(u.skills ?? []), ...u.domains.map((d) => domainById(d)?.label)].join(" ")).includes(n));
    return {
      mentors: people.filter((u) => u.role === "mentor").slice(0, 5),
      members: people.filter((u) => u.role === "mentore").slice(0, 3),
      resources: state.resources.filter((r) => normalize(r.title + " " + r.summary).includes(n)).slice(0, 4),
      opportunities: state.opportunities.filter((o) => normalize(o.title + " " + o.organization).includes(n)).slice(0, 3),
    };
  }, [q, state, me]);

  const go = (href: string) => {
    onClose();
    router.push(href);
  };

  const total = results ? results.mentors.length + results.members.length + results.resources.length + results.opportunities.length : 0;

  return (
    <div className="fixed inset-0 z-[60] flex justify-center bg-nuit/45 px-3 pt-[10vh] backdrop-blur-[2px]" onClick={onClose}>
      <div role="dialog" aria-label="Recherche" className="h-fit max-h-[75vh] w-full max-w-xl animate-apparition overflow-hidden rounded-2xl bg-creme shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-beige-dark px-5">
          <Search size={20} className="text-nuit-500" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && q.trim()) go(`/mentors?q=${encodeURIComponent(q.trim())}`);
            }}
            aria-label="Rechercher"
            placeholder="Un mentor, une compétence, une ressource…"
            className="h-16 flex-1 bg-transparent text-lg outline-none placeholder:text-nuit-500/60"
          />
          <button onClick={onClose} className="rounded-full p-2 text-nuit-500 hover:bg-beige" aria-label="Fermer">
            <X size={18} />
          </button>
        </div>
        <div className="max-h-[calc(75vh-4rem)] overflow-y-auto p-3">
          {!results && (
            <div className="p-3">
              <p className="mb-3 text-sm font-medium text-nuit-500">Essayez par exemple</p>
              <div className="flex flex-wrap gap-2">
                {["Campus France", "Business plan", "Cybersécurité", "CV", "Prise de parole"].map((s) => (
                  <button key={s} onClick={() => setQ(s)} className="rounded-full border border-beige-dark bg-papier px-3 py-1.5 text-sm hover:border-nuit/40">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {results && total === 0 && <p className="px-3 py-10 text-center text-sm text-nuit-500">Aucun résultat pour « {q} ».</p>}
          {results && results.mentors.length > 0 && (
            <Group title="Mentors">
              {results.mentors.map((u) => (
                <ResultRow key={u.id} onClick={() => go(profileHref(u))}>
                  <Avatar user={u} size="md" />
                  <div className="min-w-0">
                    <p className="truncate font-medium">{u.name}</p>
                    <p className="truncate text-xs text-nuit-500">
                      {u.title} · {u.organization}
                    </p>
                  </div>
                </ResultRow>
              ))}
            </Group>
          )}
          {results && results.members.length > 0 && (
            <Group title="Membres">
              {results.members.map((u) => (
                <ResultRow key={u.id} onClick={() => go(profileHref(u))}>
                  <Avatar user={u} size="md" />
                  <div>
                    <p className="font-medium">{u.name}</p>
                    <p className="text-xs text-nuit-500">{u.city}</p>
                  </div>
                </ResultRow>
              ))}
            </Group>
          )}
          {results && results.resources.length > 0 && (
            <Group title="Ressources">
              {results.resources.map((r) => (
                <ResultRow key={r.id} onClick={() => go(`/ressources/${r.id}`)}>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white" style={{ backgroundColor: domainById(r.domain)?.color }}>
                    <Library size={18} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{r.title}</p>
                    <p className="text-xs text-nuit-500">{RESOURCE_KINDS[r.kind]}</p>
                  </div>
                </ResultRow>
              ))}
            </Group>
          )}
          {results && results.opportunities.length > 0 && (
            <Group title="Opportunités">
              {results.opportunities.map((o) => (
                <ResultRow key={o.id} onClick={() => go(`/opportunites#${o.id}`)}>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-nuit text-creme">
                    <Briefcase size={18} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{o.title}</p>
                    <p className="text-xs text-nuit-500">
                      {OPPORTUNITY_KINDS[o.kind]} · {o.organization}
                    </p>
                  </div>
                </ResultRow>
              ))}
            </Group>
          )}
        </div>
      </div>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-2">
      <p className="px-3 pb-1 pt-3 text-sm font-semibold text-nuit-500">{title}</p>
      {children}
    </div>
  );
}

function ResultRow({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left transition hover:bg-papier">
      {children}
    </button>
  );
}
