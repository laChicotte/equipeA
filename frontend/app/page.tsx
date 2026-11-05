"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Bot,
  Briefcase,
  CalendarDays,
  Compass,
  GraduationCap,
  HeartHandshake,
  Library,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  Users,
  Video,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { AXES, CAMPUS_FRANCE_NOTICE, DOMAINS, domainById, OPPORTUNITY_KINDS, PROFILES } from "@/lib/domains";
import { inferDomains, mentorRating, recommendMentors } from "@/lib/matching";
import { DEMO_EMAIL, DEMO_MENTOR_EMAIL, DEMO_PASSWORD } from "@/lib/seed";
import type { User } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Avatar, AvatarStack, btn, DomainBadge, Eyebrow, Logo, Verified } from "@/components/ui";

const ANCHORS = [
  { href: "#fonctionnement", label: "Fonctionnement", icon: Compass },
  { href: "#mentors", label: "Mentors", icon: Users },
  { href: "#domaines", label: "Domaines", icon: Library },
  { href: "#devenir-mentor", label: "Devenir mentor", icon: HeartHandshake },
];

/** Mots qui défilent dans le titre. */
const WORDS = ["votre entreprise", "votre carrière", "Campus France", "votre avenir", "vos ambitions"];

/** Besoins d'exemple tapés automatiquement dans le champ du hero. */
const EXAMPLES = [
  "Je prépare mon entretien Campus France pour un master à Lyon",
  "J'ai une idée d'entreprise agricole et je cherche un financement",
  "Je finis ma licence en informatique et je cherche un premier emploi",
  "Je veux publier mon premier roman jeunesse",
];

export default function Landing() {
  const { me, login, logout, state, ready, toast } = useStore();
  const router = useRouter();

  const tryDemo = async (email: string) => {
    if (me) logout();
    const err = await login(email, DEMO_PASSWORD);
    if (err) return toast(err, "error");
    router.push("/accueil");
  };

  // Seuls les mentors au profil complet (au moins un domaine) sont mis en avant sur la vitrine.
  const mentors = state.users.filter((u) => u.role === "mentor" && u.domains.length > 0);
  const rated = state.sessions.filter((s) => s.rating);
  const avg = rated.length ? rated.reduce((s, x) => s + (x.rating ?? 0), 0) / rated.length : 0;
  // Le défilement continu n'a de sens qu'avec assez de cartes pour remplir l'écran.
  const marquee = mentors.length >= 5;
  const assistantMentor = mentors.find((m) => m.domains.includes("campus-france")) ?? mentors[0];

  return (
    <div className="min-h-screen overflow-x-hidden bg-creme">
      <header className="sticky top-0 z-40 border-b border-beige-dark bg-papier/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[78rem] items-center gap-6 px-4 sm:px-6 lg:px-8">
          <Logo />
          <nav className="ml-auto hidden h-full items-stretch md:flex">
            {ANCHORS.map(({ href, label, icon: Icon }) => (
              <a
                key={href}
                href={href}
                className="relative flex min-w-[5.5rem] flex-col items-center justify-center gap-0.5 px-3 text-xs font-medium text-nuit-500 transition after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-transparent hover:text-nuit hover:after:bg-terracotta"
              >
                <Icon size={20} strokeWidth={1.75} />
                {label}
              </a>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2 md:ml-2 md:border-l md:border-beige-dark md:pl-5">
            {ready && me ? (
              <Link href="/accueil" className={btn.primary}>
                Mon espace <ArrowRight size={16} />
              </Link>
            ) : (
              <>
                <Link href="/connexion" className={btn.quiet}>
                  Connexion
                </Link>
                <Link href="/inscription" className={btn.primary}>
                  S&apos;inscrire
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <Hero mentors={mentors} avg={avg} sessions={state.sessions.length} onDemo={tryDemo} />
      <ActivityTicker />

      {/* Comment ça marche */}
      <section id="fonctionnement" className="scroll-mt-16">
        <div className="mx-auto max-w-[78rem] px-4 py-24 sm:px-6 lg:px-8 lg:py-28">
          <Reveal className="max-w-2xl">
            <Eyebrow>Comment ça marche</Eyebrow>
            <h2 className="mt-3 font-serif text-[1.75rem] leading-tight sm:text-[2.4rem]">Du besoin au progrès, en quatre étapes.</h2>
          </Reveal>
          <ol className="relative mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <span aria-hidden className="absolute left-[12%] right-[12%] top-[2.9rem] hidden h-px bg-gradient-to-r from-terracotta via-ciel to-or lg:block" />
            {[
              { icon: Sparkles, tone: "bg-terracotta text-white", title: "Décrivez votre besoin", text: "En quelques phrases, avec vos mots. MonMentor identifie les domaines concernés." },
              { icon: HeartHandshake, tone: "bg-ciel text-white", title: "Choisissez votre mentor", text: "Des recommandations expliquées : expertise, compétences, avis, disponibilités." },
              { icon: Video, tone: "bg-sauge-dark text-white", title: "Échangez en chat ou en visio", text: "Demandez un créneau, votre mentor le valide, puis rejoignez la séance dans l'application." },
              { icon: Target, tone: "bg-or text-white", title: "Suivez vos progrès", text: "Objectifs, étapes et conseils du mentor. Chaque séance est évaluée." },
            ].map(({ icon: Icon, tone, title, text }, i) => (
              <Reveal key={title} delay={i * 110} as="li" className="relative rounded-2xl bg-papier p-6 shadow-doux">
                <div className="flex items-center justify-between">
                  <span className={`relative flex h-12 w-12 items-center justify-center rounded-2xl shadow-lg ring-4 ring-papier ${tone}`}>
                    <Icon size={21} />
                  </span>
                  <span className="font-serif text-4xl tabular-nums text-beige-dark">0{i + 1}</span>
                </div>
                <h3 className="mt-6 font-serif text-base">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-nuit-500">{text}</p>
              </Reveal>
            ))}
          </ol>

          <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
            <Reveal className="relative overflow-hidden rounded-2xl bg-nuit p-7 text-white sm:p-9 lg:col-span-2">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_100%_0%,rgba(47,93,138,0.6),transparent_45%),radial-gradient(circle_at_0%_100%,rgba(201,98,63,0.28),transparent_40%)]" />
              <div className="relative grid grid-cols-1 gap-8 md:grid-cols-[1fr_1.1fr] md:items-center">
                <div>
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/80">
                    <Bot size={14} className="text-terracotta-light" /> Assistant MonMentor
                  </span>
                  <h3 className="mt-5 font-serif text-2xl leading-tight">Une question à 23 h ? L&apos;assistant vous oriente.</h3>
                  <p className="mt-3 text-sm leading-relaxed text-white/70">
                    Il connaît les mentors, la bibliothèque et les opportunités, et vous suggère les bons interlocuteurs. Il oriente, il ne remplace pas le mentor.
                  </p>
                </div>
                <AssistantDemo mentor={assistantMentor} />
              </div>
            </Reveal>
            <div className="grid grid-cols-1 gap-5">
              {[
                { icon: MessageCircle, tone: "bg-sauge-light text-sauge-dark", title: "Messagerie et visio intégrées", text: "Échangez en direct, sans installer d'autre application." },
                { icon: Library, tone: "bg-or-light text-or", title: "Bibliothèque et opportunités", text: "Guides, modèles, stages, bourses et concours partagés par les mentors." },
              ].map(({ icon: Icon, tone, title, text }, i) => (
                <Reveal key={title} delay={150 + i * 100} className="flex gap-4 rounded-2xl bg-papier p-6 shadow-doux">
                  <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tone}`}>
                    <Icon size={20} />
                  </span>
                  <div>
                    <h3 className="font-serif text-base">{title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-nuit-500">{text}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Les mentors */}
      <section id="mentors" className="scroll-mt-16 overflow-hidden border-y border-beige-dark bg-papier py-24 lg:py-28">
        <Reveal className="mx-auto flex max-w-[78rem] flex-col justify-between gap-6 px-4 sm:flex-row sm:items-end sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <Eyebrow>Ils transmettent</Eyebrow>
            <h2 className="mt-3 font-serif text-[1.75rem] leading-tight sm:text-[2.4rem]">Des professionnels qui ont envie de partager.</h2>
          </div>
          {rated.length > 0 ? (
            <p className="flex items-center gap-2 rounded-full border border-beige-dark bg-creme px-4 py-2 text-sm text-nuit-500">
              <Star size={16} className="fill-or text-or" />
              <span>
                <span className="font-semibold text-nuit">{avg.toFixed(1)}/5</span> sur {rated.length} séance{rated.length > 1 ? "s" : ""} évaluée{rated.length > 1 ? "s" : ""}
              </span>
            </p>
          ) : (
            <p className="flex items-center gap-2 rounded-full border border-beige-dark bg-creme px-4 py-2 text-sm text-nuit-500">
              <ShieldCheck size={16} className="text-sauge-dark" /> Profils vérifiés par la coordination
            </p>
          )}
        </Reveal>
        {mentors.length === 0 ? (
          <Reveal className="mx-auto mt-12 max-w-[78rem] px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-beige-dark bg-creme px-6 py-12 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-terracotta/10 text-terracotta">
                <HeartHandshake size={22} />
              </span>
              <p className="max-w-md font-serif text-lg leading-snug text-nuit">Les premiers mentors arrivent. Et si c&apos;était vous ?</p>
              <Link href="/inscription?role=mentor" className={btn.primary}>
                Je deviens mentor <ArrowRight size={16} />
              </Link>
            </div>
          </Reveal>
        ) : marquee ? (
          <div className="group relative mt-12 [mask-image:linear-gradient(90deg,transparent,#000_6%,#000_94%,transparent)]">
            <div className="flex w-max gap-5 py-2 motion-safe:animate-defilement group-hover:[animation-play-state:paused]">
              {[...mentors, ...mentors].map((m, i) => (
                <MentorTile key={m.id + i} mentor={m} hidden={i >= mentors.length} />
              ))}
            </div>
          </div>
        ) : (
          // Peu de mentors : grille centrée plutôt qu'un défilement qui laisserait des trous.
          <div className="mx-auto mt-12 flex max-w-[78rem] flex-wrap justify-center gap-5 px-4 py-2 sm:px-6 lg:px-8">
            {mentors.map((m, i) => (
              <Reveal key={m.id} delay={i * 90}>
                <MentorTile mentor={m} />
              </Reveal>
            ))}
          </div>
        )}
      </section>

      {/* Domaines */}
      <section id="domaines" className="scroll-mt-16">
        <div className="mx-auto max-w-[78rem] px-4 py-24 sm:px-6 lg:px-8 lg:py-28">
          <Reveal className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-end">
            <div>
              <Eyebrow>Sept domaines d&apos;accompagnement</Eyebrow>
              <h2 className="mt-3 font-serif text-[1.75rem] leading-tight sm:text-[2.4rem]">Un mentorat ouvert à tous les parcours.</h2>
            </div>
            <ul className="flex flex-wrap gap-2 lg:justify-end">
              {Object.values(AXES).map((a) => (
                <li key={a.label} className="rounded-full border border-beige-dark bg-papier px-3 py-1 text-xs font-medium text-encre">
                  {a.label}
                </li>
              ))}
            </ul>
          </Reveal>
          <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {DOMAINS.map((d, i) => {
              const people = mentors.filter((m) => m.domains.includes(d.id));
              return (
                <Reveal key={d.id} delay={(i % 4) * 80} className="group relative flex flex-col overflow-hidden rounded-2xl bg-papier p-6 shadow-doux transition duration-300 hover:-translate-y-1 hover:shadow-lg">
                  <span className="absolute inset-x-0 top-0 h-1 origin-left scale-x-[0.25] transition duration-500 group-hover:scale-x-100" style={{ backgroundColor: d.color }} />
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl font-serif text-sm" style={{ backgroundColor: d.color + "14", color: d.color }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-5 font-serif text-base leading-tight">{d.label}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-nuit-500">{d.description}</p>
                  <div className="mt-5 flex min-h-8 items-center justify-between gap-3 border-t border-beige-dark pt-4">
                    {people.length ? (
                      <>
                        <AvatarStack users={people} max={3} size="xs" />
                        <span className="text-xs font-semibold" style={{ color: d.color }}>
                          {people.length} mentor{people.length > 1 ? "s" : ""}
                        </span>
                      </>
                    ) : (
                      <Link href="/inscription?role=mentor" className="inline-flex items-center gap-1 text-xs font-medium text-nuit-500 transition hover:text-nuit">
                        Ouvert aux mentors <ArrowRight size={12} className="transition group-hover:translate-x-0.5" />
                      </Link>
                    )}
                  </div>
                </Reveal>
              );
            })}
            <Reveal delay={240} className="relative flex flex-col justify-between gap-6 overflow-hidden rounded-2xl bg-ciel p-6 text-white">
              <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-white/10" />
              <div className="pointer-events-none absolute -right-2 top-16 h-20 w-20 rounded-full bg-white/5" />
              <GraduationCap size={28} className="relative text-white/90" />
              <div className="relative">
                <p className="font-serif text-lg leading-tight">Vous préparez Campus France ?</p>
                <p className="mt-2 text-sm leading-relaxed text-white/75">Formations, lettre de motivation, entretien : d&apos;anciens étudiants vous accompagnent.</p>
                <p className="mt-4 flex gap-2 border-t border-white/15 pt-4 text-[0.72rem] leading-snug text-white/65">
                  <ShieldCheck size={14} className="mt-px shrink-0" /> {CAMPUS_FRANCE_NOTICE}
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Pour qui */}
      <section className="border-t border-beige-dark bg-papier">
        <div className="mx-auto grid max-w-[78rem] grid-cols-1 gap-12 px-4 py-24 sm:px-6 lg:grid-cols-[1fr_1.4fr] lg:px-8 lg:py-28">
          <Reveal>
            <Eyebrow>Pour qui ?</Eyebrow>
            <h2 className="mt-3 font-serif text-[1.75rem] leading-tight sm:text-[2.4rem]">Vous avez l&apos;ambition. Il vous manque le bon conseil.</h2>
            <p className="mt-5 leading-relaxed text-nuit-500">
              Beaucoup de jeunes ont des idées, des compétences et de l&apos;ambition, mais pas accès aux réseaux et aux expériences qui font la différence. MonMentor rend ce
              conseil accessible, depuis un simple téléphone.
            </p>
            <Link href="/inscription" className={btn.primary + " mt-8"}>
              Créer mon profil <ArrowRight size={16} />
            </Link>
          </Reveal>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {Object.values(PROFILES).map((p, i) => (
              <Reveal key={p.label} delay={i * 70} className="group flex items-start gap-3 rounded-2xl border border-beige-dark px-5 py-4 transition hover:border-transparent hover:shadow-lg">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full transition group-hover:scale-150" style={{ backgroundColor: DOMAINS[i % DOMAINS.length].color }} />
                <div>
                  <p className="font-medium text-nuit">{p.label}</p>
                  <p className="mt-0.5 text-sm text-nuit-500">{p.hint}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Devenir mentor */}
      <section id="devenir-mentor" className="relative scroll-mt-16 overflow-hidden bg-nuit text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_90%_10%,rgba(201,98,63,0.35),transparent_40%),radial-gradient(circle_at_0%_100%,rgba(47,93,138,0.45),transparent_45%)]" />
        <DotGrid />
        <Reveal className="relative mx-auto grid max-w-[78rem] grid-cols-1 gap-10 px-4 py-24 sm:px-6 md:grid-cols-[1fr_auto] md:items-center lg:px-8 lg:py-28">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-terracotta-light">Devenir mentor</p>
            <p className="mt-4 max-w-3xl font-serif text-[1.75rem] leading-snug sm:text-[2.6rem] sm:leading-[1.15]">
              « Le mentor ne fait pas à la place. Il aide à <span className="text-terracotta-light">devenir autonome</span>. »
            </p>
            <p className="mt-6 max-w-xl leading-relaxed text-white/65">
              Entrepreneurs, cadres, experts, consultants : donnez une heure par semaine, depuis chez vous. Vous choisissez vos domaines, vos créneaux et le nombre de
              personnes que vous accompagnez.
            </p>
            <div className="mt-6 flex flex-wrap gap-6 text-sm text-white/75">
              <span className="inline-flex items-center gap-2">
                <CalendarDays size={16} className="text-terracotta-light" /> Vos créneaux, votre rythme
              </span>
              <span className="inline-flex items-center gap-2">
                <MessageCircle size={16} className="text-terracotta-light" /> Chat et visio intégrés
              </span>
            </div>
          </div>
          <Link href="/inscription?role=mentor" className={btn.accent + " px-6 py-3.5 text-[0.95rem]"}>
            Je deviens mentor <ArrowRight size={17} />
          </Link>
        </Reveal>
      </section>

      <footer className="border-t border-beige-dark bg-papier">
        <div className="mx-auto grid max-w-[78rem] grid-cols-1 gap-8 px-4 py-12 text-sm text-nuit-500 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr] lg:px-8">
          <div>
            <Logo />
            <p className="mt-3 max-w-sm leading-relaxed">Apprendre de ceux qui sont passés par là. Le mentorat accessible depuis un simple téléphone.</p>
          </div>
          <nav aria-label="Plan du site">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-nuit">Découvrir</p>
            <ul className="mt-3 space-y-2">
              {ANCHORS.map(({ href, label }) => (
                <li key={href}>
                  <a href={href} className="transition hover:text-nuit">
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-nuit">Visite guidée</p>
            <ul className="mt-3 space-y-2">
              <li>
                <button onClick={() => tryDemo(DEMO_EMAIL)} className="inline-flex items-center gap-1.5 transition hover:text-nuit">
                  Espace mentorée <ArrowRight size={13} />
                </button>
              </li>
              <li>
                <button onClick={() => tryDemo(DEMO_MENTOR_EMAIL)} className="inline-flex items-center gap-1.5 transition hover:text-nuit">
                  Espace mentor <ArrowRight size={13} />
                </button>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-beige-dark">
          <p className="mx-auto max-w-[78rem] px-4 py-5 text-xs text-nuit-500 sm:px-6 lg:px-8">
            Hackathon « Talents connect » · Salon international du livre de jeunesse de Conakry, 10ᵉ édition · Mois du Numérique 2026
          </p>
        </div>
      </footer>
    </div>
  );
}

/* ---------------------------------------------------------------------------------------------- */

/** Hero : le visiteur tape (ou regarde taper) un besoin et voit le moteur de recommandation travailler en direct. */
function Hero({ mentors, avg, sessions, onDemo }: { mentors: User[]; avg: number; sessions: number; onDemo: (email: string) => void }) {
  const { state } = useStore();
  const router = useRouter();
  const [word, setWord] = useState(0);
  const [need, setNeed] = useState("");
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setWord((w) => (w + 1) % WORDS.length), 2600);
    return () => clearInterval(t);
  }, []);

  // Démonstration : tant que le visiteur n'a rien saisi, des besoins d'exemple s'écrivent seuls.
  useEffect(() => {
    if (touched) return;
    let ex = 0;
    let i = 0;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const s = EXAMPLES[ex];
      if (i <= s.length) {
        setNeed(s.slice(0, i++));
        timer = setTimeout(tick, 34);
      } else {
        timer = setTimeout(() => {
          ex = (ex + 1) % EXAMPLES.length;
          i = 0;
          tick();
        }, 2800);
      }
    };
    timer = setTimeout(tick, 500);
    return () => clearTimeout(timer);
  }, [touched]);

  // Analyse calée sur une pause de frappe : les résultats ne clignotent plus à chaque lettre.
  const [query, setQuery] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setQuery(need), 320);
    return () => clearTimeout(t);
  }, [need]);

  const detected = useMemo(() => inferDomains(query).slice(0, 3), [query]);
  const matches = useMemo(
    () =>
      query.trim().length < 8
        ? []
        : recommendMentors(state, { id: "visiteur", domains: [], need: query, city: "Conakry" })
            // Seuls les mentors réellement liés au besoin (domaine ou compétence) sont proposés.
            .filter((m) => m.score >= MIN_SCORE)
            .slice(0, 3),
    [state, query],
  );
  const searching = query.trim().length >= 8;
  const slots = [...matches, ...PLACEHOLDERS.slice(matches.length)];

  const pick = (s: string) => {
    setTouched(true);
    setNeed(s);
  };

  return (
    <section className="relative overflow-hidden bg-nuit text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_85%_0%,rgba(201,98,63,0.38),transparent_45%),radial-gradient(ellipse_at_0%_100%,rgba(47,93,138,0.55),transparent_50%)]" />
      <DotGrid />
      <div className="relative mx-auto grid max-w-[78rem] grid-cols-1 items-center gap-12 px-4 pb-16 pt-14 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16 lg:px-8 lg:pb-20 lg:pt-20">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-white/80">
            <span className="h-1.5 w-1.5 rounded-full bg-terracotta motion-safe:animate-halo" /> Le mentorat à l&apos;ère du numérique · Conakry 2026
          </span>
          <h1 className="mt-7 font-serif text-[2.5rem] leading-[1.05] tracking-[-0.035em] sm:text-[3.6rem]">
            Un mentor pour
            <br />
            <span key={word} className="inline-block animate-apparition text-[2.5rem] text-[#ef8f6b] sm:text-[3.6rem]">
              {WORDS[word]}.
            </span>
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-white/70">
            MonMentor met en relation les jeunes talents avec des professionnels qui sont passés par là. Décrivez votre besoin : on vous présente les bonnes personnes.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              router.push(`/inscription?besoin=${encodeURIComponent(need)}`);
            }}
            className="mt-9 max-w-xl rounded-2xl bg-papier p-2 text-nuit shadow-[0_20px_60px_-20px_rgba(0,0,0,0.6)]"
          >
            <label className="flex items-start gap-3 px-3 pt-2.5">
              <Sparkles size={18} className="mt-0.5 shrink-0 text-terracotta" />
              <span className="sr-only">Votre besoin</span>
              <textarea
                value={need}
                onChange={(e) => pick(e.target.value)}
                onFocus={() => {
                  if (!touched) pick("");
                }}
                rows={2}
                placeholder="Décrivez votre besoin avec vos mots…"
                className="min-h-[3.2rem] flex-1 resize-none bg-transparent text-[0.95rem] leading-relaxed outline-none placeholder:text-nuit-500"
              />
            </label>
            <div className="mt-1 flex items-center justify-between gap-3 border-t border-beige-dark px-2 pt-2">
              <div className="flex min-w-0 flex-wrap gap-1.5">
                {detected.length ? (
                  detected.map((d) => {
                    const dom = domainById(d.id)!;
                    return (
                      <span key={d.id} className="inline-flex animate-apparition items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium" style={{ backgroundColor: dom.color + "14", color: dom.color }}>
                        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: dom.color }} /> {dom.short}
                      </span>
                    );
                  })
                ) : (
                  <span className="px-1 py-1 text-xs text-nuit-500">Les domaines s&apos;affichent ici</span>
                )}
              </div>
              <button type="submit" className={btn.accent + " shrink-0"}>
                <span className="hidden sm:inline">Trouver mon mentor</span>
                <span className="sm:hidden">Commencer</span> <ArrowRight size={16} />
              </button>
            </div>
          </form>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-white/50">Essayez :</span>
            {CHIPS.map(([label, text]) => (
              <button key={label} type="button" onClick={() => pick(text)} className="rounded-full border border-white/15 px-3 py-1 text-white/75 transition hover:border-white/40 hover:text-white">
                {label}
              </button>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
            <span className="text-white/50">Visite guidée</span>
            <button onClick={() => onDemo(DEMO_EMAIL)} className="inline-flex items-center gap-1.5 font-medium text-white transition hover:text-terracotta-light">
              Espace mentorée <ArrowRight size={14} />
            </button>
            <button onClick={() => onDemo(DEMO_MENTOR_EMAIL)} className="inline-flex items-center gap-1.5 font-medium text-white transition hover:text-terracotta-light">
              Espace mentor <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* Résultats en direct */}
        <div className="relative">
          <div className="absolute -inset-px rounded-[1.4rem] bg-gradient-to-br from-white/25 via-white/5 to-white/15" />
          <div className="relative rounded-[1.35rem] bg-[#1f2a39]/85 p-4 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.7)] backdrop-blur-md sm:p-5">
            <div className="flex items-center justify-between gap-3 px-1">
              <p key={matches.length + String(searching)} className="flex animate-apparition items-center gap-2 text-sm font-medium text-white/90">
                <span className={cn("h-2 w-2 rounded-full transition-colors duration-500", matches.length ? "bg-[#5fd08a]" : "bg-white/30 motion-safe:animate-pulse")} />
                {matches.length
                  ? `${matches.length} mentor${matches.length > 1 ? "s correspondent" : " correspond"} à votre besoin`
                  : searching
                    ? "Pas encore de mentor pour ce besoin"
                    : "En attente de votre besoin…"}
              </p>
              <span className="hidden text-xs text-white/40 sm:inline">Recommandation en direct</span>
            </div>
            {/* Toujours trois emplacements : la carte garde la même hauteur quels que soient les résultats. */}
            <ul className="mt-4 space-y-2.5">
              {slots.map((m, i) =>
                "mentor" in m ? (
                  <li
                    key={m.mentor.id}
                    className="flex min-h-[6.25rem] animate-apparition items-center rounded-2xl border border-white/10 bg-white/[0.07] p-4 transition-colors duration-300 hover:bg-white/[0.1]"
                    style={{ animationDelay: `${i * 90}ms`, animationFillMode: "backwards" }}
                  >
                    <div className="flex w-full items-start gap-3">
                      <Avatar user={m.mentor} size="md" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="flex min-w-0 items-center gap-1 font-semibold text-white">
                            <span className="truncate">{m.mentor.name}</span> <Verified user={m.mentor} size={14} />
                          </p>
                          <span className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums", i === 0 ? "bg-[#5fd08a]/20 text-[#8fe3ad]" : "bg-white/10 text-white/70")}>
                            {Math.min(99, Math.round(m.score))} %
                          </span>
                        </div>
                        <p className="truncate text-xs text-white/50">{m.mentor.title}</p>
                        <span className="mt-2.5 block h-1 overflow-hidden rounded-full bg-white/10">
                          <span
                            className="block h-full origin-left rounded-full bg-gradient-to-r from-[#5fd08a]/70 to-[#5fd08a] transition-[width] duration-1000 ease-out"
                            style={{ width: `${Math.min(100, m.score)}%` }}
                          />
                        </span>
                        <p className="mt-2 line-clamp-1 min-h-4 text-xs text-white/60">{m.reasons[0] ?? ""}</p>
                      </div>
                    </div>
                  </li>
                ) : (
                  <li key={`vide-${i}`} className="flex min-h-[6.25rem] items-center gap-3 rounded-2xl border border-dashed border-white/10 p-4 transition-opacity duration-500">
                    <span className="h-10 w-10 shrink-0 rounded-full bg-white/[0.06]" />
                    <span className="flex-1 space-y-2">
                      <span className="block h-2.5 w-1/2 rounded-full bg-white/[0.08]" />
                      <span className="block h-2 w-3/4 rounded-full bg-white/[0.05]" />
                    </span>
                  </li>
                ),
              )}
            </ul>
            <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-white/5 px-4 py-3 text-xs text-white/60">
              <span className="flex items-center gap-2">
                <Video size={14} className="text-terracotta-light" /> Première séance en visio, dès cette semaine
              </span>
              <span className="hidden sm:inline">Gratuit</span>
            </div>
          </div>
        </div>
      </div>

      {/* Chiffres */}
      <div className="relative border-t border-white/[0.08] bg-gradient-to-b from-white/[0.03] to-transparent">
        {/* Une valeur encore vide (0 séance, aucune note) laisse place à un atout de la plateforme plutôt qu'à un « 0 » ou un « – ». */}
        <dl className="mx-auto grid max-w-[78rem] grid-cols-1 gap-3 px-4 py-6 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:gap-4 lg:px-8 lg:py-8">
          {[
            mentors.length
              ? { icon: ShieldCheck, tone: "text-[#8fe3ad] bg-[#5fd08a]/12", value: String(mentors.length), label: mentors.length > 1 ? "mentors vérifiés" : "mentor vérifié" }
              : { icon: ShieldCheck, tone: "text-[#8fe3ad] bg-[#5fd08a]/12", value: "Vérifiés", label: "des mentors expérimentés" },
            { icon: Compass, tone: "text-[#9cc3ea] bg-[#2f5d8a]/30", value: String(DOMAINS.length), label: "domaines d'accompagnement" },
            sessions
              ? { icon: CalendarDays, tone: "text-[#f3b08f] bg-terracotta/15", value: String(sessions), label: sessions > 1 ? "séances programmées" : "séance programmée" }
              : { icon: Video, tone: "text-[#f3b08f] bg-terracotta/15", value: "Chat + visio", label: "intégrés à l'application" },
            avg
              ? { icon: Star, tone: "text-[#f1cf7a] bg-or/15", value: `${avg.toFixed(1)}/5`, label: "note moyenne des séances" }
              : { icon: HeartHandshake, tone: "text-[#f1cf7a] bg-or/15", value: "Gratuit", label: "pour les mentorés" },
          ].map(({ icon: Icon, tone, value, label }) => (
            <div key={label} className="flex items-center gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-5 py-4 transition-colors duration-300 hover:bg-white/[0.06]">
              <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", tone)}>
                <Icon size={20} strokeWidth={1.75} />
              </span>
              <div className="min-w-0">
                <dt className="sr-only">{label}</dt>
                <dd className="font-serif text-2xl leading-tight tabular-nums text-white">{value}</dd>
                <dd className="truncate text-sm text-white/55">{label}</dd>
              </div>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

const PLACEHOLDERS = [{ id: 1 }, { id: 2 }, { id: 3 }];

/** Score minimum pour proposer un mentor : un domaine ou une compétence en commun avec le besoin. */
const MIN_SCORE = 25;

const CHIPS: [string, string][] = [
  ["Campus France", EXAMPLES[0]],
  ["Créer mon entreprise", EXAMPLES[1]],
  ["Premier emploi", EXAMPLES[2]],
  ["Prise de parole", "Je manque de confiance pour prendre la parole en public"],
];

/** Bandeau d'activité : ressources et opportunités récemment partagées, en défilement continu. */
function ActivityTicker() {
  const { state } = useStore();
  const items = [
    ...state.resources.slice(0, 8).map((r) => {
      const a = state.users.find((u) => u.id === r.authorId);
      return { id: r.id, icon: BookOpen, color: domainById(r.domain)?.color, text: `${a?.name ?? "Un mentor"} a partagé « ${r.title} »` };
    }),
    ...state.opportunities.slice(0, 6).map((o) => ({ id: o.id, icon: Briefcase, color: domainById(o.domain)?.color, text: `${OPPORTUNITY_KINDS[o.kind]} · ${o.title}` })),
  ];
  if (!items.length) return null;
  return (
    <div className="group overflow-hidden border-b border-beige-dark bg-papier py-3.5 [mask-image:linear-gradient(90deg,transparent,#000_5%,#000_95%,transparent)]">
      <ul className="flex w-max gap-10 motion-safe:animate-defilement group-hover:[animation-play-state:paused]">
        {[...items, ...items].map((it, i) => (
          <li key={it.id + i} aria-hidden={i >= items.length} className="flex items-center gap-2.5 whitespace-nowrap text-sm text-encre">
            <span className="flex h-6 w-6 items-center justify-center rounded-md" style={{ backgroundColor: (it.color ?? "#1B2533") + "18", color: it.color }}>
              <it.icon size={13} />
            </span>
            {it.text}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Carte d'un mentor dans le carrousel. */
function MentorTile({ mentor, hidden }: { mentor: User; hidden?: boolean }) {
  const { state } = useStore();
  const r = mentorRating(state, mentor.id);
  const d = domainById(mentor.domains[0]);
  return (
    <Link
      href={`/mentors/${mentor.id}`}
      aria-hidden={hidden}
      tabIndex={hidden ? -1 : undefined}
      className="relative w-[17rem] shrink-0 overflow-hidden rounded-2xl bg-papier shadow-doux transition hover:-translate-y-1 hover:shadow-lg"
    >
      <div className="h-16" style={{ background: `linear-gradient(120deg, ${d?.color ?? mentor.color}, ${mentor.color})` }} />
      <div className="px-5 pb-5">
        <Avatar user={mentor} size="lg" className="-mt-7 ring-4 ring-papier" />
        <p className="mt-3 flex items-center gap-1 font-semibold text-nuit">
          <span className="truncate">{mentor.name}</span> <Verified user={mentor} size={14} />
        </p>
        <p className="mt-0.5 line-clamp-1 text-sm text-nuit-500">{mentor.title}</p>
        <div className="mt-4 flex items-center justify-between">
          <DomainBadge id={mentor.domains[0]} />
          {r.count > 0 && (
            <span className="flex items-center gap-1 text-xs font-medium text-nuit">
              <Star size={12} className="fill-or text-or" /> {r.avg.toFixed(1)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

/** Mini-conversation qui se joue quand la carte de l'assistant entre dans l'écran. */
function AssistantDemo({ mentor }: { mentor?: User }) {
  return (
    <div className="space-y-2.5 text-sm">
      <Reveal delay={200}>
        <p className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-terracotta px-4 py-2.5">Comment préparer mon entretien Campus France ?</p>
      </Reveal>
      <Reveal delay={700}>
        <div className="max-w-[94%] rounded-2xl rounded-bl-md bg-white/10 px-4 py-3 leading-relaxed text-white/85">
          Commencez par clarifier votre projet d&apos;études, puis entraînez-vous avec quelqu&apos;un qui l&apos;a vécu :
          {mentor && (
            <span className="mt-2.5 flex items-center gap-2 rounded-xl bg-white/10 px-2.5 py-2">
              <Avatar user={mentor} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium text-white">{mentor.name}</span>
                <span className="block truncate text-xs text-white/60">{mentor.title}</span>
              </span>
              <ArrowRight size={14} className="text-white/60" />
            </span>
          )}
        </div>
      </Reveal>
    </div>
  );
}

/** Trame de points discrète pour les sections sombres. */
function DotGrid() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:radial-gradient(#fff_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_at_center,#000_30%,transparent_75%)]"
    />
  );
}

/** Apparition douce au défilement. */
function Reveal({ children, className, delay = 0, as: Tag = "div" }: { children: React.ReactNode; className?: string; delay?: number; as?: "div" | "li" }) {
  const ref = useRef<HTMLElement>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    // Sans animation (préférence système, capture, impression) : contenu affiché d'emblée.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
      timer = setTimeout(() => setSeen(true), 0);
      return () => clearTimeout(timer);
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          timer = setTimeout(() => setSeen(true), delay);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      clearTimeout(timer);
    };
  }, [delay]);
  return (
    <Tag
      ref={ref as React.Ref<never>}
      className={cn("transition-[opacity,translate] duration-700 ease-out", seen ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0", className)}
    >
      {children}
    </Tag>
  );
}
