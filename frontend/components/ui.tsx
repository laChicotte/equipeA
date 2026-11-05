"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { BadgeCheck, CircleAlert, CircleCheck, Info, MessageCircle, Star, WifiOff, X } from "lucide-react";
import type { DomainId, User } from "@/lib/types";
import { domainById } from "@/lib/domains";
import { cn, initials } from "@/lib/utils";
import { useStore, type ToastKind } from "@/lib/store";

const TOAST_ICONS: Record<ToastKind, { icon: typeof Info; color: string }> = {
  info: { icon: Info, color: "text-white/70" },
  success: { icon: CircleCheck, color: "text-[#9cc5a4]" },
  error: { icon: CircleAlert, color: "text-terracotta-light" },
  message: { icon: MessageCircle, color: "text-[#9dbde0]" },
};

/* ---------- Identité ---------- */

export function LogoMark({ className, pageColor = "currentColor" }: { className?: string; pageColor?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <path d="M16 9.2C12.2 6.6 7.4 6 3 7v17.2c4.4-1 9.2-.4 13 2.3z" fill={pageColor} />
      <path d="M16 9.2c3.8-2.6 8.6-3.2 13-2.2v17.2c-4.4-1-9.2-.4-13 2.3z" fill={pageColor} opacity="0.72" />
      <path d="M20.5 7.4v8.4l2-1.7 2 1.7V6.6c-1.4 0-2.7.3-4 .8z" fill="#C9623F" />
    </svg>
  );
}

export function Logo({ dark = false, className }: { dark?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark className="h-7 w-7" pageColor={dark ? "#F6F7F9" : "#1B2533"} />
      <span className={cn("text-[1.4rem] font-bold leading-none tracking-[-0.03em]", dark ? "text-creme" : "text-nuit")}>
        Lirel
      </span>
    </span>
  );
}

/* ---------- Membres ---------- */

const avatarSizes = { xs: "h-6 w-6 text-[0.6rem]", sm: "h-8 w-8 text-xs", md: "h-10 w-10 text-sm", lg: "h-14 w-14 text-lg", xl: "h-20 w-20 text-2xl" };

export function Avatar({ user, size = "md", className, ring }: { user?: User; size?: keyof typeof avatarSizes; className?: string; ring?: boolean }) {
  if (!user) return null;
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold tracking-tight text-white",
        avatarSizes[size],
        ring && "ring-2 ring-creme",
        className,
      )}
      style={{ backgroundColor: user.color }}
      title={user.name}
    >
      {user.avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
      ) : (
        initials(user.name)
      )}
    </span>
  );
}

export function AvatarStack({ users, max = 4, size = "sm" }: { users: (User | undefined)[]; max?: number; size?: keyof typeof avatarSizes }) {
  const list = users.filter(Boolean) as User[];
  return (
    <div className="flex items-center">
      <div className="flex -space-x-2">
        {list.slice(0, max).map((u) => (
          <Avatar key={u.id} user={u} size={size} ring />
        ))}
      </div>
      {list.length > max && <span className="ml-2 text-xs font-medium text-nuit-500">+{list.length - max}</span>}
    </div>
  );
}

export function profileHref(user: User, meId?: string) {
  if (user.id === meId) return "/profil";
  return user.role === "mentor" ? `/mentors/${user.id}` : `/membres/${user.id}`;
}

export function Verified({ user, size = 16 }: { user?: User; size?: number }) {
  if (!user?.verified) return null;
  return (
    <span title="Mentor vérifié par la coordination du programme" className="inline-flex text-[#2f5d8a]">
      <BadgeCheck width={size} height={size} aria-label="Mentor vérifié" />
    </span>
  );
}

/* ---------- Domaines ---------- */

export function DomainBadge({ id, className, long }: { id: DomainId; className?: string; long?: boolean }) {
  const d = domainById(id);
  if (!d) return null;
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium", className)}
      style={{ backgroundColor: d.color + "14", color: d.color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: d.color }} />
      {long ? d.label : d.short}
    </span>
  );
}

export function UserLink({ user, className }: { user?: User; className?: string }) {
  const { me } = useStore();
  if (!user) return null;
  return (
    <Link href={profileHref(user, me?.id)} className={cn("font-semibold text-nuit hover:text-terracotta-dark", className)}>
      {user.id === me?.id ? "Vous" : user.name}
    </Link>
  );
}

/* ---------- Notes & progression ---------- */

export function Stars({ value, size = 14, className }: { value: number; size?: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} aria-label={`${value.toFixed(1)} sur 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          width={size}
          height={size}
          className={i <= Math.round(value) ? "fill-terracotta text-terracotta" : "fill-beige text-beige-dark"}
          strokeWidth={1.4}
        />
      ))}
    </span>
  );
}

export function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  const labels = ["", "Décevante", "Moyenne", "Utile", "Très utile", "Exceptionnelle"];
  return (
    <div className="flex items-center gap-3">
      <div className="flex" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((i) => (
          <button
            type="button"
            key={i}
            onMouseEnter={() => setHover(i)}
            onClick={() => onChange(i)}
            className="p-0.5 transition-transform hover:scale-110"
            aria-label={`${i} étoile${i > 1 ? "s" : ""}`}
          >
            <Star width={24} height={24} strokeWidth={1.4} className={i <= (hover || value) ? "fill-terracotta text-terracotta" : "fill-beige text-beige-dark"} />
          </button>
        ))}
      </div>
      <span className="text-sm text-nuit-500">{labels[hover || value]}</span>
    </div>
  );
}

export function Progress({ value, max, color = "#1B2533", className, thin }: { value: number; max: number; color?: string; className?: string; thin?: boolean }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className={cn("w-full overflow-hidden rounded-full bg-beige", thin ? "h-1.5" : "h-2.5", className)}>
      <div className="h-full rounded-full transition-[width] duration-700 ease-out" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}

export function Ring({ value, max, size = 120, stroke = 10, children }: { value: number; max: number; size?: number; stroke?: number; children?: React.ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#EEF0F3" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="#C9623F"
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{ transition: "stroke-dashoffset 0.8s ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}

/* ---------- Mise en page ---------- */

export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("text-xs font-semibold uppercase tracking-[0.08em] text-terracotta-dark", className)}>{children}</p>;
}

export function SectionHeader({ eyebrow, title, action, className }: { eyebrow?: string; title: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("mb-4 flex items-end justify-between gap-4", className)}>
      <div>
        {eyebrow && <Eyebrow className="mb-1">{eyebrow}</Eyebrow>}
        <h2 className="font-serif text-lg text-nuit">{title}</h2>
      </div>
      {action}
    </div>
  );
}

export function PageHeader({ eyebrow, title, intro, children }: { eyebrow?: string; title: React.ReactNode; intro?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <header className="mb-10 flex flex-col gap-5 border-b border-beige-dark pb-8 md:flex-row md:items-end md:justify-between">
      <div className="max-w-2xl">
        {eyebrow && <Eyebrow className="mb-2">{eyebrow}</Eyebrow>}
        <h1 className="font-serif text-3xl leading-tight text-nuit md:text-[2.25rem]">{title}</h1>
        {intro && <p className="mt-3 text-[0.95rem] leading-relaxed text-nuit-500">{intro}</p>}
      </div>
      {children}
    </header>
  );
}

export function EmptyState({ title, text, action }: { title: string; text: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-beige-dark bg-papier/60 px-6 py-12 text-center">
      <LogoMark className="mb-4 h-9 w-9 opacity-25" pageColor="#1B2533" />
      <p className="font-serif text-base text-nuit">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-nuit-500">{text}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export const btn = {
  primary:
    "inline-flex items-center justify-center gap-2 rounded-lg bg-nuit px-4 py-2.5 text-sm font-medium text-white transition hover:bg-nuit-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50",
  accent:
    "inline-flex items-center justify-center gap-2 rounded-lg bg-terracotta px-4 py-2.5 text-sm font-medium text-white transition hover:bg-terracotta-dark active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50",
  ghost:
    "inline-flex items-center justify-center gap-2 rounded-lg border border-beige-dark bg-papier px-4 py-2.5 text-sm font-medium text-nuit transition hover:border-nuit/30 hover:bg-creme active:scale-[0.98] disabled:opacity-50",
  quiet: "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-nuit-500 transition hover:bg-beige/70 hover:text-nuit",
  link: "inline-flex items-center gap-1 text-sm font-medium text-nuit-500 hover:text-nuit",
};

export const field =
  "w-full rounded-lg border border-beige-dark bg-papier px-3.5 py-2.5 text-[0.95rem] text-nuit placeholder:text-nuit-500/60 outline-none transition focus:border-nuit/40 focus:ring-4 focus:ring-nuit/10";

export function Chip({ active, children, onClick, className }: { active?: boolean; children: React.ReactNode; onClick?: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "whitespace-nowrap rounded-lg border px-3 py-1.5 text-sm font-medium transition",
        active ? "border-nuit bg-nuit text-white" : "border-beige-dark bg-papier text-encre hover:border-nuit/30",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-nuit/45 backdrop-blur-[2px] sm:items-center sm:p-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "max-h-[92vh] w-full animate-apparition overflow-y-auto rounded-t-2xl bg-papier p-6 shadow-2xl sm:rounded-2xl sm:p-8",
          wide ? "sm:max-w-2xl" : "sm:max-w-lg",
        )}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <h2 className="font-serif text-base text-nuit">{title}</h2>
          <button onClick={onClose} className="-mr-2 -mt-1 rounded-full p-2 text-nuit-500 hover:bg-beige" aria-label="Fermer">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function Toaster() {
  const { toasts, offline } = useStore();
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[70] flex flex-col items-center gap-2 px-4 lg:bottom-8">
      {offline && (
        <div role="alert" className="pointer-events-auto flex max-w-xl items-center gap-3 rounded-lg bg-terracotta-dark px-4 py-3 text-sm text-white shadow-xl">
          <WifiOff size={18} className="shrink-0" />
          {offline}
        </div>
      )}
      {toasts.map((t) => {
        const { icon: Icon, color } = TOAST_ICONS[t.kind];
        return (
          <div key={t.id} role="status" className="pointer-events-auto flex max-w-xl animate-apparition items-center gap-3 rounded-lg bg-nuit px-4 py-3 text-sm text-white shadow-xl">
            <Icon size={18} className={"shrink-0 " + color} />
            {t.text}
          </div>
        );
      })}
    </div>
  );
}
