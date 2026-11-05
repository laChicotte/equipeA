"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { domainById } from "@/lib/domains";
import { Avatar, Logo } from "./ui";

/** Mise en page partagée par la connexion et l'inscription. */
export function AuthFrame({ children }: { children: React.ReactNode }) {
  const { state } = useStore();
  const mentors = state.users.filter((u) => u.role === "mentor").slice(0, 9);
  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1.1fr]">
      <div className="flex flex-col px-5 py-6 sm:px-10">
        <Link href="/" aria-label="Retour à l'accueil">
          <Logo />
        </Link>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">{children}</div>
      </div>
      <aside className="relative hidden overflow-hidden bg-nuit lg:block">
        <div className="absolute inset-0 grid -rotate-6 scale-125 grid-cols-3 gap-5 p-10 opacity-90">
          {mentors.map((m, i) => (
            <div key={m.id} className={"h-fit rounded-2xl bg-nuit-700 p-5 text-creme " + (i % 2 ? "translate-y-16" : "")}>
              <Avatar user={m} size="lg" />
              <p className="mt-4 font-serif text-base leading-tight">{m.name}</p>
              <p className="mt-1 line-clamp-2 text-xs text-creme/60">{m.title}</p>
              <p className="mt-3 text-[0.7rem] font-semibold uppercase tracking-wider text-creme/50">{domainById(m.domains[0])?.short}</p>
            </div>
          ))}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-nuit via-nuit/50 to-transparent" />
        <div className="absolute inset-x-12 bottom-12 text-creme">
          <p className="font-serif text-3xl font-normal leading-snug">« Si tu veux aller vite, marche seul. Si tu veux aller loin, marchons ensemble. »</p>
          <p className="mt-3 text-sm uppercase tracking-[0.2em] text-creme/60">Proverbe africain</p>
        </div>
      </aside>
    </div>
  );
}
