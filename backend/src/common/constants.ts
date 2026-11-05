/** Valeurs autorisées, identiques à celles du front (lib/domains.ts et lib/types.ts). */
export const DOMAIN_IDS = ["entrepreneuriat", "numerique", "insertion", "culture", "gestion", "leadership", "campus-france"] as const;
export const AXIS_IDS = ["orientation", "competences", "entrepreneuriat", "innovation"] as const;
export const ROLES = ["mentor", "mentore"] as const;
export const PROFILES = ["etudiant", "jeune-diplome", "entrepreneur", "porteur-projet", "reconversion", "competences"] as const;
export const FORMATS = ["visio", "chat", "presentiel"] as const;
export const RESOURCE_KINDS = ["guide", "checklist", "modele", "livre", "video"] as const;
export const OPPORTUNITY_KINDS = ["stage", "emploi", "bourse", "concours", "incubation", "evenement"] as const;

export const DOMAIN_LABELS: Record<string, string> = {
  entrepreneuriat: "Entrepreneuriat",
  numerique: "Numérique",
  insertion: "Insertion pro",
  culture: "Culture & création",
  gestion: "Gestion & finance",
  leadership: "Leadership",
  "campus-france": "Campus France",
};

export const AVATAR_COLORS = ["#202b3c", "#c2603e", "#66796a", "#7a4b6b", "#2f5d8a", "#a07a2c", "#3f7d7a"];

export const STATE_VERSION = 10;
