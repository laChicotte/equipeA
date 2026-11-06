"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Camera, Eye, Loader2, Trash2 } from "lucide-react";
import { prepareProfilePhoto } from "@/lib/image";
import { useStore } from "@/lib/store";
import { DOMAINS, FORMATS, PROFILES } from "@/lib/domains";
import type { DomainId, Format, Profile, Slot, User } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";
import { Avatar, btn, Eyebrow, field } from "@/components/ui";
import { SlotsEditor } from "@/components/slots-editor";

export default function ProfilPage() {
  const { me } = useStore();
  return me ? <ProfileForm key={me.id} me={me} /> : null;
}

function ProfileForm({ me }: { me: User }) {
  const { updateProfile, toast } = useStore();
  const [f, setF] = useState({
    name: me.name,
    city: me.city,
    bio: me.bio,
    need: me.need ?? "",
    title: me.title ?? "",
    organization: me.organization ?? "",
    years: me.years ?? 5,
    capacity: me.capacity ?? 3,
    skills: (me.skills ?? []).join(", "),
    languages: (me.languages ?? []).join(", "),
  });
  const [domains, setDomains] = useState<DomainId[]>(me.domains);
  const [profile, setProfile] = useState<Profile | undefined>(me.profile);
  const [formats, setFormats] = useState<Format[]>(me.formats ?? []);
  const [slots, setSlots] = useState<Slot[]>(me.slots ?? []);
  const mentor = me.role === "mentor";

  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const split = (s: string) =>
    s
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({
      name: f.name.trim() || me.name,
      city: f.city.trim(),
      bio: f.bio.trim(),
      domains,
      ...(mentor
        ? { title: f.title.trim(), organization: f.organization.trim(), years: f.years, capacity: f.capacity, skills: split(f.skills), languages: split(f.languages), formats, slots }
        : { need: f.need.trim(), profile }),
    });
    toast("Profil mis à jour");
  };

  return (
    <div className="mx-auto max-w-3xl animate-apparition">
      <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-center">
        <PhotoPicker me={me} />
        <div className="flex-1">
          <Eyebrow>{mentor ? "Mentor" : "Mentoré·e"} · membre depuis {formatDate(me.joinedAt, { month: "long", year: "numeric" })}</Eyebrow>
          <h1 className="mt-1 font-serif text-4xl font-medium">{me.name}</h1>
          <p className="mt-1 text-sm text-nuit-500">{mentor ? "Un profil complet est mieux recommandé aux mentorés." : "Plus votre besoin est précis, meilleures sont les recommandations."}</p>
        </div>
        {mentor && (
          <Link href={`/mentors/${me.id}`} className={btn.ghost}>
            <Eye size={16} /> Profil public
          </Link>
        )}
      </header>

      <form onSubmit={save} className="space-y-6">
        <Card title="Informations">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Prénom et nom</span>
              <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={field} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Ville</span>
              <input value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} className={field} />
            </label>
          </div>
          <label className="mt-4 block">
            <span className="mb-1.5 block text-sm font-medium">{mentor ? "Mon parcours" : "Quelques mots sur moi"}</span>
            <textarea rows={3} value={f.bio} onChange={(e) => setF({ ...f, bio: e.target.value })} className={field + " resize-none"} />
          </label>
        </Card>

        {!mentor && (
          <Card title="Mon besoin">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {(Object.keys(PROFILES) as Profile[]).map((p) => (
                <button
                  type="button"
                  key={p}
                  onClick={() => setProfile(p)}
                  aria-pressed={profile === p}
                  className={cn("rounded-2xl border px-3 py-2 text-left text-sm font-medium transition", profile === p ? "border-nuit bg-nuit text-creme" : "border-beige-dark bg-papier hover:border-nuit/40")}
                >
                  {PROFILES[p].label}
                </button>
              ))}
            </div>
            <textarea rows={3} value={f.need} onChange={(e) => setF({ ...f, need: e.target.value })} className={field + " mt-4 resize-none"} placeholder="Ce que je cherche à accomplir et où j'ai besoin d'aide" aria-label="Mon besoin" />
          </Card>
        )}

        <Card title={mentor ? "Domaines d'intervention" : "Domaines qui m'intéressent"}>
          <div className="flex flex-wrap gap-2">
            {DOMAINS.map((d) => (
              <button
                type="button"
                key={d.id}
                onClick={() => setDomains(toggle(domains, d.id))}
                aria-pressed={domains.includes(d.id)}
                className={cn("rounded-full border px-3.5 py-1.5 text-sm font-medium transition", domains.includes(d.id) ? "border-nuit bg-nuit text-creme" : "border-beige-dark bg-papier hover:border-nuit/40")}
              >
                {d.short}
              </button>
            ))}
          </div>
        </Card>

        {mentor && (
          <>
            <Card title="Expertise">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium">Fonction</span>
                  <input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} className={field} />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium">Organisation</span>
                  <input value={f.organization} onChange={(e) => setF({ ...f, organization: e.target.value })} className={field} />
                </label>
              </div>
              <label className="mt-4 block">
                <span className="mb-1.5 block text-sm font-medium">Compétences (séparées par des virgules)</span>
                <input value={f.skills} onChange={(e) => setF({ ...f, skills: e.target.value })} className={field} />
              </label>
              <label className="mt-4 block">
                <span className="mb-1.5 block text-sm font-medium">Langues</span>
                <input value={f.languages} onChange={(e) => setF({ ...f, languages: e.target.value })} className={field} placeholder="Français, Pular, Soussou…" />
              </label>
              <div className="mt-4 grid gap-4 rounded-2xl bg-beige/60 p-4 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="flex justify-between font-medium">
                    Années d&apos;expérience <span className="font-serif text-lg">{f.years}</span>
                  </span>
                  <input type="range" min={2} max={40} value={f.years} onChange={(e) => setF({ ...f, years: +e.target.value })} className="mt-2 w-full accent-terracotta" />
                </label>
                <label className="block text-sm">
                  <span className="flex justify-between font-medium">
                    Mentorés en parallèle <span className="font-serif text-lg">{f.capacity}</span>
                  </span>
                  <input type="range" min={1} max={8} value={f.capacity} onChange={(e) => setF({ ...f, capacity: +e.target.value })} className="mt-2 w-full accent-terracotta" />
                </label>
              </div>
            </Card>

            <Card title="Disponibilités">
              <p className="mb-2 text-sm font-medium">Formats proposés</p>
              <div className="flex gap-2">
                {(Object.keys(FORMATS) as Format[]).map((x) => (
                  <button
                    type="button"
                    key={x}
                    onClick={() => setFormats(toggle(formats, x))}
                    aria-pressed={formats.includes(x)}
                    className={cn("rounded-full border px-3.5 py-1.5 text-sm font-medium transition", formats.includes(x) ? "border-nuit bg-nuit text-creme" : "border-beige-dark bg-papier hover:border-nuit/40")}
                  >
                    {FORMATS[x]}
                  </button>
                ))}
              </div>
              <p className="mb-1 mt-5 text-sm font-medium">Créneaux hebdomadaires</p>
              <p className="mb-3 text-xs text-nuit-500">Vos mentorés demandent leurs séances sur ces créneaux ; vous les validez ensuite. Vous pouvez toujours programmer une séance à une autre date.</p>
              <SlotsEditor slots={slots} onChange={setSlots} />
            </Card>
          </>
        )}

        <div className="sticky bottom-24 flex justify-end md:bottom-6">
          <button type="submit" className={btn.accent + " px-6 py-3 shadow-lg"}>
            Enregistrer mon profil
          </button>
        </div>
      </form>
    </div>
  );
}

/** Avatar cliquable : choisir, remplacer ou retirer sa photo de profil. */
function PhotoPicker({ me }: { me: User }) {
  const { uploadPhoto, removePhoto, toast } = useStore();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // permet de rechoisir le même fichier
    if (!file) return;
    setBusy(true);
    try {
      await uploadPhoto(await prepareProfilePhoto(file));
    } catch (err) {
      toast(err instanceof Error ? err.message : "Impossible d'envoyer cette photo.", "error");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    await removePhoto();
    setBusy(false);
  };

  return (
    <div className="flex flex-col items-start gap-2 sm:items-center">
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={busy}
        className="group relative rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-terracotta focus-visible:ring-offset-2"
        aria-label={me.avatar ? "Changer ma photo de profil" : "Ajouter une photo de profil"}
        title={me.avatar ? "Changer ma photo" : "Ajouter une photo"}
      >
        <Avatar user={me} size="xl" />
        <span className={cn("absolute inset-0 flex items-center justify-center rounded-full bg-nuit/55 text-creme transition", busy ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100")}>
          {busy ? <Loader2 size={22} className="animate-spin" /> : <Camera size={22} />}
        </span>
        {!busy && (
          <span className="absolute -bottom-0.5 -right-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-terracotta text-creme shadow ring-2 ring-papier">
            <Camera size={14} />
          </span>
        )}
      </button>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/*" className="hidden" onChange={onFile} />
      {me.avatar && (
        <button type="button" onClick={remove} disabled={busy} className="inline-flex items-center gap-1 text-xs font-medium text-nuit-500 transition hover:text-terracotta disabled:opacity-50">
          <Trash2 size={12} /> Retirer
        </button>
      )}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-papier p-5 shadow-doux sm:p-6">
      <h2 className="mb-4 font-serif text-xl">{title}</h2>
      {children}
    </section>
  );
}
