import type { AxisId, Domain, DomainId, Format, OpportunityKind, Profile, ResourceKind } from "./types";

/** Les sept domaines d'intervention définis par les termes de référence (section 5). */
export const DOMAINS: Domain[] = [
  {
    id: "entrepreneuriat",
    label: "Entrepreneuriat et gestion d'entreprise",
    short: "Entrepreneuriat",
    description: "Créer, structurer et développer son entreprise : du premier business plan à la recherche de financements.",
    topics: ["Création et développement d'entreprise", "Structuration des projets", "Gestion administrative et financière", "Recherche de financements", "Développement commercial"],
    keywords: ["entreprise", "startup", "creer", "business", "projet", "financement", "investisseur", "client", "vente", "commercial", "statut", "marche", "boutique", "agrobusiness", "lever", "fonds"],
    color: "#c2603e",
  },
  {
    id: "numerique",
    label: "Numérique et technologies",
    short: "Numérique",
    description: "Développement, intelligence artificielle, cybersécurité, marketing digital et design.",
    topics: ["Développement informatique", "Intelligence artificielle", "Cybersécurité", "Marketing digital", "Design et création numérique"],
    keywords: ["code", "coder", "developpeur", "developpement", "informatique", "web", "application", "appli", "ia", "intelligence", "data", "donnees", "cyber", "securite", "marketing", "digital", "design", "ux", "reseaux", "python", "javascript"],
    color: "#2f5d8a",
  },
  {
    id: "insertion",
    label: "Orientation et insertion professionnelle",
    short: "Insertion pro",
    description: "Construire son parcours, réussir ses candidatures et ses entretiens, développer son réseau.",
    topics: ["Construction du parcours professionnel", "Préparation aux entretiens d'embauche", "CV et lettres de motivation", "Recherche d'emploi et réseau", "Préparation à la vie en entreprise"],
    keywords: ["emploi", "travail", "job", "cv", "lettre", "motivation", "entretien", "embauche", "stage", "recrutement", "reseau", "linkedin", "orientation", "carriere", "premier", "diplome", "chomage"],
    color: "#66796a",
  },
  {
    id: "culture",
    label: "Culture, littérature et industries créatives",
    short: "Culture & création",
    description: "Écriture, édition, métiers du livre, création de contenu, audiovisuel et entrepreneuriat culturel.",
    topics: ["Écriture et édition", "Métiers du livre", "Communication et création de contenu", "Production audiovisuelle", "Entrepreneuriat culturel et artistique"],
    keywords: ["ecrire", "ecriture", "livre", "roman", "edition", "editeur", "auteur", "publier", "contenu", "youtube", "video", "film", "audiovisuel", "musique", "art", "artiste", "culture", "bibliotheque", "podcast"],
    color: "#7a4b6b",
  },
  {
    id: "gestion",
    label: "Gestion, finance et administration",
    short: "Gestion & finance",
    description: "Comptabilité, gestion de projets, management, ressources humaines et analyse économique.",
    topics: ["Comptabilité et gestion", "Gestion de projets", "Management et ressources humaines", "Finance et analyse économique"],
    keywords: ["comptabilite", "comptable", "finance", "budget", "gestion", "projet", "management", "manager", "rh", "ressources", "humaines", "economie", "banque", "audit", "administration"],
    color: "#a07a2c",
  },
  {
    id: "leadership",
    label: "Développement personnel et leadership",
    short: "Leadership",
    description: "Prise de parole, confiance en soi, leadership, organisation et relations.",
    topics: ["Prise de parole en public", "Confiance en soi", "Leadership et gestion d'équipe", "Gestion du temps et organisation", "Capacités relationnelles"],
    keywords: ["confiance", "parole", "public", "pitch", "timide", "stress", "leadership", "leader", "equipe", "temps", "organisation", "motivation", "relation", "communication", "procrastination"],
    color: "#3f7d7a",
  },
  {
    id: "campus-france",
    label: "Accompagnement des candidats Campus France",
    short: "Campus France",
    description: "Préparer son projet d'études en France : choix des formations, dossier, lettre de motivation et entretien.",
    topics: ["Choix des formations et établissements", "Cohérence du projet d'études", "Constitution du dossier", "CV et lettre de motivation", "Préparation à l'entretien", "Démarches de mobilité étudiante", "Témoignages d'anciens étudiants"],
    keywords: ["campus", "france", "etudes", "etudier", "master", "licence", "universite", "visa", "etranger", "mobilite", "dossier", "admission", "ecole", "bourse", "paris", "lyon"],
    color: "#1f4e79",
  },
];

/** Mention obligatoire pour l'accompagnement Campus France (TDR, 5.7). */
export const CAMPUS_FRANCE_NOTICE =
  "Cet accompagnement relève du conseil, de l'orientation et du partage d'expériences. Il ne garantit ni l'admission dans un établissement, ni l'obtention d'un visa.";

export function domainById(id: DomainId | string | undefined) {
  return DOMAINS.find((d) => d.id === id);
}

/** Les quatre axes du programme (TDR, section 6). */
export const AXES: Record<AxisId, { label: string; text: string }> = {
  orientation: { label: "Orientation et parcours", text: "Identifier ses objectifs et construire son parcours." },
  competences: { label: "Transmission des compétences", text: "Apprendre auprès de professionnels expérimentés." },
  entrepreneuriat: { label: "Accompagnement de projet", text: "Structurer son idée et développer son initiative." },
  innovation: { label: "Innovation numérique", text: "Concevoir des outils numériques au service du mentorat." },
};

export const PROFILES: Record<Profile, { label: string; hint: string }> = {
  etudiant: { label: "Étudiant·e", hint: "Je cherche ma voie ou prépare mes études" },
  "jeune-diplome": { label: "Jeune diplômé·e", hint: "Je veux décrocher mon premier emploi" },
  entrepreneur: { label: "Entrepreneur·e", hint: "J'ai lancé mon activité et veux la faire grandir" },
  "porteur-projet": { label: "Porteur·se de projet", hint: "J'ai une idée et je veux la structurer" },
  reconversion: { label: "En reconversion", hint: "Je change de métier ou de secteur" },
  competences: { label: "Nouvelles compétences", hint: "Je veux apprendre et progresser" },
};

export const FORMATS: Record<Format, string> = {
  visio: "Visio",
  chat: "Chat",
  presentiel: "Présentiel",
};

export const RESOURCE_KINDS: Record<ResourceKind, string> = {
  guide: "Guide",
  checklist: "Check-list",
  modele: "Modèle",
  livre: "Livre conseillé",
  video: "Vidéo",
};

export const OPPORTUNITY_KINDS: Record<OpportunityKind, string> = {
  stage: "Stage",
  emploi: "Emploi",
  bourse: "Bourse",
  concours: "Concours",
  incubation: "Incubation",
  evenement: "Événement",
};

export const DAYS = ["", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
