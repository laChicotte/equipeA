"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { ArrowLeft, Check, GraduationCap, HeartHandshake, Sparkles } from "lucide-react";
import { useStore } from "@/lib/store";
import { DOMAINS, domainById, FORMATS, PROFILES } from "@/lib/domains";
import { inferDomains } from "@/lib/matching";
import type { DomainId, Format, Profile, Role, Slot } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AuthFrame } from "@/components/auth";
import { btn, Eyebrow, field } from "@/components/ui";
import { SlotsEditor } from "@/components/slots-editor";

export default function InscriptionPage() {
  return (
    <Suspense>
      <Inscription />
    </Suspense>
  );
}

function Inscription() {
  const { register, updateProfile, me, ready } = useStore();
  const router = useRouter();
  const params = useSearchParams();
  const [step, setStep] = useState<1 | 2>(1);
  const [role, setRole] = useState<Role>(params.get("role") === "mentor" ? "mentor" : "mentore");
  const [form, setForm] = useState({ name: "", email: "", password: "", city: "Conakry" });
  const [domains, setDomains] = useState<DomainId[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Mentoré
  const [profile, setProfile] = useState<Profile>("etudiant");
  const [need, setNeed] = useState(() => params.get("besoin") ?? "");
  // Mentor
  const [mentor, setMentor] = useState({ title: "", organization: "", years: 5, skills: "", capacity: 3 });
  const [formats, setFormats] = useState<Format[]>(["visio", "chat"]);
  // Aucun créneau imposé : le mentor choisit lui-même ses disponibilités.
  const [slots, setSlots] = useState<Slot[]>([]);

  useEffect(() => {
    if (ready && me && step === 1) router.replace("/accueil");
  }, [ready, me, router, step]);

  const inferred = inferDomains(need).slice(0, 3);

  const next = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 6) return setError("Le mot de passe doit contenir au moins 6 caractères.");
    setError(null);
    setStep(2);
  };

  const finalDomains = role === "mentore" && domains.length === 0 ? inferred.map((x) => x.id) : domains;
  const canFinish = role === "mentore" ? need.trim().length >= 15 && finalDomains.length > 0 : mentor.title.trim() && domains.length > 0 && formats.length > 0 && slots.length > 0;

  const [busy, setBusy] = useState(false);

  const finish = async () => {
    setBusy(true);
    const err = await register({ ...form, role });
    if (err) {
      setBusy(false);
      setError(err);
      setStep(1);
      return;
    }
    if (role === "mentore") {
      await updateProfile({ profile, need: need.trim(), domains: finalDomains });
      router.push("/mentors/trouver");
    } else {
      await updateProfile({
        domains,
        formats,
        slots,
        title: mentor.title.trim(),
        organization: mentor.organization.trim() || "Indépendant",
        years: mentor.years,
        capacity: mentor.capacity,
        skills: mentor.skills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      });
      router.push("/accueil");
    }
  };

  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  return (
    <AuthFrame>
      <div className="mb-6 flex items-center gap-2">
        {[1, 2].map((s) => (
          <span key={s} className={cn("h-1 flex-1 rounded-full", s <= step ? "bg-terracotta" : "bg-beige")} />
        ))}
      </div>

      {step === 1 ? (
        <>
          <Eyebrow>Étape 1 sur 2 · Votre compte</Eyebrow>
          <h1 className="mt-3 font-serif text-3xl">Rejoignez la communauté Lirel.</h1>

          <div className="mt-7 grid grid-cols-2 gap-3" role="radiogroup" aria-label="Je souhaite">
            {(
              [
                { id: "mentore", icon: GraduationCap, title: "Être accompagné·e", text: "Je cherche un mentor" },
                { id: "mentor", icon: HeartHandshake, title: "Accompagner", text: "Je deviens mentor" },
              ] as const
            ).map(({ id, icon: Icon, title, text }) => (
              <button
                type="button"
                role="radio"
                aria-checked={role === id}
                key={id}
                onClick={() => setRole(id)}
                className={cn("rounded-2xl border p-4 text-left transition", role === id ? "border-nuit bg-nuit text-creme" : "border-beige-dark bg-papier hover:border-nuit/40")}
              >
                <Icon size={22} className={role === id ? "text-terracotta" : "text-nuit-500"} />
                <span className="mt-3 block font-semibold">{title}</span>
                <span className={cn("block text-xs", role === id ? "text-creme/70" : "text-nuit-500")}>{text}</span>
              </button>
            ))}
          </div>

          <form onSubmit={next} className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Prénom et nom</span>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={field} placeholder="Aminata Sylla" autoComplete="name" />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">Adresse e-mail</span>
                <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={field} placeholder="vous@exemple.com" autoComplete="email" />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">Ville</span>
                <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className={field} placeholder="Conakry, Kankan…" />
              </label>
            </div>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Mot de passe</span>
              <input type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={field} placeholder="6 caractères minimum" autoComplete="new-password" />
            </label>
            {error && <p className="rounded-xl bg-terracotta-light/60 px-4 py-2.5 text-sm text-terracotta-dark">{error}</p>}
            <button type="submit" className={btn.primary + " w-full py-3 text-base"}>
              Continuer
            </button>
          </form>
          <p className="mt-8 text-center text-sm text-nuit-500">
            Déjà membre ?{" "}
            <Link href="/connexion" className="font-semibold text-terracotta-dark hover:text-nuit">
              Se connecter
            </Link>
          </p>
        </>
      ) : role === "mentore" ? (
        <>
          <button onClick={() => setStep(1)} className={btn.quiet + " -ml-3 mb-2"}>
            <ArrowLeft size={15} /> Retour
          </button>
          <Eyebrow>Étape 2 sur 2 · Votre besoin</Eyebrow>
          <h1 className="mt-3 font-serif text-3xl">Où en êtes-vous, {form.name.split(" ")[0]} ?</h1>

          <div className="mt-6 grid grid-cols-2 gap-2">
            {(Object.keys(PROFILES) as Profile[]).map((p) => (
              <button
                type="button"
                key={p}
                onClick={() => setProfile(p)}
                aria-pressed={profile === p}
                className={cn("rounded-2xl border px-3 py-2.5 text-left transition", profile === p ? "border-nuit bg-nuit text-creme" : "border-beige-dark bg-papier hover:border-nuit/40")}
              >
                <span className="block text-sm font-semibold">{PROFILES[p].label}</span>
                <span className={cn("block text-[0.7rem] leading-snug", profile === p ? "text-creme/70" : "text-nuit-500")}>{PROFILES[p].hint}</span>
              </button>
            ))}
          </div>

          <label className="mt-6 block">
            <span className="mb-1.5 block text-sm font-medium">Décrivez votre besoin avec vos mots</span>
            <textarea
              value={need}
              onChange={(e) => setNeed(e.target.value)}
              rows={4}
              className={field + " resize-none"}
              placeholder="Ex. : Je veux créer une boutique de vêtements en ligne mais je ne sais pas comment trouver un financement…"
            />
          </label>
          <div className="mt-3 min-h-[3.25rem] rounded-2xl bg-sauge-light/50 px-4 py-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-sauge-dark">
              <Sparkles size={13} /> Domaines détectés
            </p>
            {inferred.length ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {inferred.map((x) => (
                  <span key={x.id} className="rounded-full bg-papier px-2.5 py-1 text-xs font-semibold" style={{ color: domainById(x.id)?.color }}>
                    {domainById(x.id)?.short}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-1 text-xs text-nuit-500">Écrivez quelques mots, nous identifions les domaines concernés.</p>
            )}
          </div>

          <p className="mb-2 mt-5 text-sm font-medium">Préciser les domaines (facultatif)</p>
          <div className="flex flex-wrap gap-2">
            {DOMAINS.map((d) => (
              <button
                type="button"
                key={d.id}
                onClick={() => setDomains((l) => toggle(l, d.id))}
                aria-pressed={domains.includes(d.id)}
                className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition", domains.includes(d.id) ? "border-nuit bg-nuit text-creme" : "border-beige-dark bg-papier hover:border-nuit/40")}
              >
                {domains.includes(d.id) && <Check size={14} className="text-terracotta" />}
                {d.short}
              </button>
            ))}
          </div>

          <button onClick={finish} disabled={!canFinish || busy} className={btn.accent + " mt-7 w-full py-3 text-base"}>
            <Sparkles size={18} /> Voir les mentors recommandés
          </button>
        </>
      ) : (
        <>
          <button onClick={() => setStep(1)} className={btn.quiet + " -ml-3 mb-2"}>
            <ArrowLeft size={15} /> Retour
          </button>
          <Eyebrow>Étape 2 sur 2 · Votre expertise</Eyebrow>
          <h1 className="mt-3 font-serif text-3xl">Merci de transmettre, {form.name.split(" ")[0]}.</h1>
          <div className="mt-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">Fonction actuelle</span>
                <input value={mentor.title} onChange={(e) => setMentor({ ...mentor, title: e.target.value })} className={field} placeholder="Directrice financière" />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">Organisation</span>
                <input value={mentor.organization} onChange={(e) => setMentor({ ...mentor, organization: e.target.value })} className={field} placeholder="Entreprise, cabinet…" />
              </label>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium">Domaines d&apos;intervention</p>
              <div className="flex flex-wrap gap-2">
                {DOMAINS.map((d) => (
                  <button
                    type="button"
                    key={d.id}
                    onClick={() => setDomains((l) => toggle(l, d.id))}
                    aria-pressed={domains.includes(d.id)}
                    className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition", domains.includes(d.id) ? "border-nuit bg-nuit text-creme" : "border-beige-dark bg-papier hover:border-nuit/40")}
                  >
                    {domains.includes(d.id) && <Check size={14} className="text-terracotta" />}
                    {d.short}
                  </button>
                ))}
              </div>
            </div>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Compétences à transmettre (séparées par des virgules)</span>
              <input value={mentor.skills} onChange={(e) => setMentor({ ...mentor, skills: e.target.value })} className={field} placeholder="Business plan, levée de fonds, recrutement…" />
            </label>
            <div>
              <p className="mb-2 text-sm font-medium">Formats proposés</p>
              <div className="flex gap-2">
                {(Object.keys(FORMATS) as Format[]).map((f) => (
                  <button
                    type="button"
                    key={f}
                    onClick={() => setFormats((l) => toggle(l, f))}
                    aria-pressed={formats.includes(f)}
                    className={cn("rounded-full border px-3.5 py-1.5 text-sm font-medium transition", formats.includes(f) ? "border-nuit bg-nuit text-creme" : "border-beige-dark bg-papier hover:border-nuit/40")}
                  >
                    {FORMATS[f]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1 text-sm font-medium">Vos disponibilités</p>
              <p className="mb-3 text-xs text-nuit-500">Les créneaux hebdomadaires sur lesquels vos mentorés pourront vous demander une séance. Vous validerez chaque demande et pourrez les modifier à tout moment dans votre profil.</p>
              <SlotsEditor slots={slots} onChange={setSlots} />
            </div>
            <div className="grid gap-3 rounded-2xl bg-beige/60 p-4 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="flex justify-between font-medium">
                  Années d&apos;expérience <span className="font-serif text-lg">{mentor.years}</span>
                </span>
                <input type="range" min={2} max={40} value={mentor.years} onChange={(e) => setMentor({ ...mentor, years: +e.target.value })} className="mt-2 w-full accent-terracotta" />
              </label>
              <label className="block text-sm">
                <span className="flex justify-between font-medium">
                  Mentorés en parallèle <span className="font-serif text-lg">{mentor.capacity}</span>
                </span>
                <input type="range" min={1} max={8} value={mentor.capacity} onChange={(e) => setMentor({ ...mentor, capacity: +e.target.value })} className="mt-2 w-full accent-terracotta" />
              </label>
            </div>
          </div>
          <button onClick={finish} disabled={!canFinish || busy} className={btn.accent + " mt-7 w-full py-3 text-base"}>
            Créer mon profil de mentor
          </button>
          {!canFinish && (
            <p className="mt-2 text-center text-xs text-nuit-500">
              Pour continuer : {[!mentor.title.trim() && "votre fonction", domains.length === 0 && "au moins un domaine", formats.length === 0 && "un format", slots.length === 0 && "au moins un créneau"].filter(Boolean).join(", ")}.
            </p>
          )}
          <p className="mt-3 text-center text-xs text-nuit-500">Votre profil sera vérifié par la coordination du programme avant d&apos;obtenir le badge « Mentor vérifié ».</p>
        </>
      )}
    </AuthFrame>
  );
}
