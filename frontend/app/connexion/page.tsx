"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { GraduationCap, HeartHandshake } from "lucide-react";
import { useStore } from "@/lib/store";
import { DEMO_EMAIL, DEMO_MENTOR_EMAIL, DEMO_PASSWORD } from "@/lib/seed";
import { AuthFrame } from "@/components/auth";
import { btn, Eyebrow, field } from "@/components/ui";

export default function Connexion() {
  const { login, me, ready } = useStore();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ready && me) router.replace("/accueil");
  }, [ready, me, router]);

  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const err = await login(email, password);
    setBusy(false);
    if (err) setError(err);
    else router.push("/accueil");
  };

  const fill = (mail: string) => {
    setEmail(mail);
    setPassword(DEMO_PASSWORD);
    setError(null);
  };

  return (
    <AuthFrame>
      <Eyebrow>Bon retour parmi nous</Eyebrow>
      <h1 className="mt-3 font-serif text-3xl">Reprenez votre parcours là où vous l&apos;aviez laissé.</h1>

      <div className="mt-8 rounded-2xl border border-terracotta/30 bg-terracotta-light/40 p-3">
        <p className="px-1 pb-2 text-sm">
          <span className="font-semibold">Jury, visiteur ?</span> Choisissez un compte de démonstration :
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => fill(DEMO_EMAIL)} className="flex items-center gap-2.5 rounded-xl bg-papier px-3 py-2.5 text-left text-sm transition hover:bg-white">
            <GraduationCap size={18} className="shrink-0 text-terracotta-dark" />
            <span>
              <span className="block font-semibold">Mariama</span>
              <span className="block text-xs text-nuit-500">Mentorée</span>
            </span>
          </button>
          <button type="button" onClick={() => fill(DEMO_MENTOR_EMAIL)} className="flex items-center gap-2.5 rounded-xl bg-papier px-3 py-2.5 text-left text-sm transition hover:bg-white">
            <HeartHandshake size={18} className="shrink-0 text-terracotta-dark" />
            <span>
              <span className="block font-semibold">Aïssatou</span>
              <span className="block text-xs text-nuit-500">Mentor</span>
            </span>
          </button>
        </div>
      </div>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Adresse e-mail</span>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={field} placeholder="vous@exemple.com" autoComplete="email" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Mot de passe</span>
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className={field} placeholder="••••••••" autoComplete="current-password" />
        </label>
        {error && <p className="rounded-xl bg-terracotta-light/60 px-4 py-2.5 text-sm text-terracotta-dark">{error}</p>}
        <button type="submit" disabled={busy} className={btn.primary + " w-full py-3 text-base"}>
          {busy ? "Connexion…" : "Se connecter"}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-nuit-500">
        Pas encore de compte ?{" "}
        <Link href="/inscription" className="font-semibold text-terracotta-dark hover:text-nuit">
          Créer mon profil
        </Link>
      </p>
    </AuthFrame>
  );
}
