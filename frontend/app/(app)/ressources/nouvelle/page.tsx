"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { DOMAINS, RESOURCE_KINDS } from "@/lib/domains";
import type { DomainId, ResourceKind } from "@/lib/types";
import { btn, EmptyState, field, PageHeader } from "@/components/ui";

export default function NouvelleRessource() {
  const { me, createResource } = useStore();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<ResourceKind>("guide");
  const [domain, setDomain] = useState<DomainId>(me?.domains[0] ?? "insertion");
  const [summary, setSummary] = useState("");
  const [minutes, setMinutes] = useState(5);
  const [sections, setSections] = useState([{ heading: "", text: "" }]);

  if (!me) return null;
  if (me.role !== "mentor")
    return <EmptyState title="Réservé aux mentors" text="Les ressources sont rédigées par les mentors. Vous pouvez les consulter dans la bibliothèque." action={<Link href="/ressources" className={btn.primary}>Voir la bibliothèque</Link>} />;

  const update = (i: number, key: "heading" | "text", v: string) => setSections(sections.map((s, j) => (j === i ? { ...s, [key]: v } : s)));

  return (
    <div className="mx-auto max-w-3xl animate-apparition">
      <Link href="/ressources" className={btn.quiet + " -ml-3 mb-4"}>
        <ArrowLeft size={15} /> Bibliothèque
      </Link>
      <PageHeader eyebrow="Transmettre" title="Partager une ressource" intro="Un conseil que vous répétez souvent mérite d'être écrit une fois pour toutes. Il aidera des dizaines de membres." />
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const id = await createResource({ title: title.trim(), kind, domain, summary: summary.trim(), minutes, body: sections.filter((s) => s.heading.trim() || s.text.trim()) });
          if (id) router.push(`/ressources/${id}`);
        }}
        className="space-y-5 rounded-2xl bg-papier p-6 shadow-doux sm:p-8"
      >
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Titre</span>
          <input required value={title} onChange={(e) => setTitle(e.target.value)} className={field} placeholder="Ex. : Négocier son premier salaire" />
        </label>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Type</span>
            <select value={kind} onChange={(e) => setKind(e.target.value as ResourceKind)} className={field}>
              {(Object.keys(RESOURCE_KINDS) as ResourceKind[]).map((k) => (
                <option key={k} value={k}>
                  {RESOURCE_KINDS[k]}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Domaine</span>
            <select value={domain} onChange={(e) => setDomain(e.target.value as DomainId)} className={field}>
              {DOMAINS.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.short}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Durée de lecture (min)</span>
            <input type="number" min={1} max={120} value={minutes} onChange={(e) => setMinutes(+e.target.value)} className={field} />
          </label>
        </div>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Résumé</span>
          <textarea required rows={2} value={summary} onChange={(e) => setSummary(e.target.value)} className={field + " resize-none"} placeholder="En une ou deux phrases, ce que le lecteur va apprendre." />
        </label>

        <fieldset className="space-y-4">
          <legend className="mb-1 text-sm font-medium">Contenu</legend>
          {sections.map((s, i) => (
            <div key={i} className="rounded-2xl border border-beige-dark p-4">
              <div className="flex gap-2">
                <input value={s.heading} onChange={(e) => update(i, "heading", e.target.value)} className={field + " py-2 font-serif text-lg"} placeholder={`Titre de la partie ${i + 1}`} aria-label={`Titre de la partie ${i + 1}`} />
                {sections.length > 1 && (
                  <button type="button" onClick={() => setSections(sections.filter((_, j) => j !== i))} className="rounded-full p-2 text-nuit-500 hover:bg-beige" aria-label="Supprimer la partie">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
              <textarea rows={4} value={s.text} onChange={(e) => update(i, "text", e.target.value)} className={field + " mt-2 resize-y text-sm"} placeholder={"Votre texte. Commencez une ligne par « - » pour créer une liste à puces."} aria-label={`Texte de la partie ${i + 1}`} />
            </div>
          ))}
          <button type="button" onClick={() => setSections([...sections, { heading: "", text: "" }])} className={btn.link}>
            <Plus size={14} /> Ajouter une partie
          </button>
        </fieldset>

        <div className="flex justify-end gap-2 border-t border-beige pt-5">
          <Link href="/ressources" className={btn.ghost}>
            Annuler
          </Link>
          <button type="submit" className={btn.accent}>
            Publier la ressource
          </button>
        </div>
      </form>
    </div>
  );
}
