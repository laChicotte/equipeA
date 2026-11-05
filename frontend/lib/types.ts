/** Domaines d'intervention du mentorat (TDR, section 5). */
export type DomainId = "entrepreneuriat" | "numerique" | "insertion" | "culture" | "gestion" | "leadership" | "campus-france";

export interface Domain {
  id: DomainId;
  label: string;
  short: string;
  description: string;
  topics: string[];
  /** Mots-clés utilisés par le moteur de recommandation. */
  keywords: string[];
  color: string;
}

/** Axes du programme (TDR, section 6). */
export type AxisId = "orientation" | "competences" | "entrepreneuriat" | "innovation";

export type Role = "mentor" | "mentore";

/** Profils de bénéficiaires visés par le défi. */
export type Profile = "etudiant" | "jeune-diplome" | "entrepreneur" | "porteur-projet" | "reconversion" | "competences";

export type Format = "visio" | "chat" | "presentiel";

export interface Slot {
  day: number; // 1 = lundi … 7 = dimanche
  hour: number; // heure de début
}

export interface User {
  id: string;
  name: string;
  handle: string;
  city: string;
  bio: string;
  role: Role;
  color: string;
  avatar?: string;
  joinedAt: string;
  domains: DomainId[];

  /* Mentoré */
  profile?: Profile;
  need?: string;

  /* Mentor */
  title?: string;
  organization?: string;
  years?: number;
  skills?: string[];
  languages?: string[];
  formats?: Format[];
  slots?: Slot[];
  capacity?: number;
  verified?: boolean;
  /** Membre fictif du mode démo (visio simulée) */
  bot?: boolean;
}

export interface Account {
  email: string;
  password: string;
  userId: string;
}

export type MentorshipStatus = "en-attente" | "active" | "terminee" | "refusee";

export interface Mentorship {
  id: string;
  mentorId: string;
  menteeId: string;
  domain: DomainId;
  axis: AxisId;
  message: string;
  status: MentorshipStatus;
  createdAt: string;
  acceptedAt?: string;
}

export interface Message {
  id: string;
  userId: string;
  text: string;
  createdAt: string;
  /** Message système (séance planifiée, appel terminé…) */
  system?: boolean;
}

export interface Conversation {
  id: string;
  members: [string, string];
  messages: Message[];
  /** Date de dernière lecture par membre */
  readBy: Record<string, string>;
}

/** demandee : réservée par le mentoré, en attente de validation · planifiee : programmée ou validée par le mentor */
export type SessionStatus = "demandee" | "planifiee" | "terminee" | "annulee" | "refusee";

export interface Session {
  id: string;
  mentorId: string;
  menteeId: string;
  startsAt: string;
  duration: number;
  format: Format;
  topic: string;
  status: SessionStatus;
  notes?: string;
  rating?: number;
  review?: string;
}

export interface Step {
  id: string;
  text: string;
  done: boolean;
}

export interface Goal {
  id: string;
  userId: string;
  mentorId?: string;
  domain: DomainId;
  title: string;
  dueAt: string;
  steps: Step[];
  mentorNote?: string;
  createdAt: string;
}

export type ResourceKind = "guide" | "checklist" | "modele" | "livre" | "video";

export interface Resource {
  id: string;
  title: string;
  kind: ResourceKind;
  domain: DomainId;
  authorId: string;
  summary: string;
  minutes: number;
  /** Sections : un titre et un texte (les lignes commençant par « - » deviennent des puces). */
  body: { heading: string; text: string }[];
  saves: string[];
  createdAt: string;
}

export type OpportunityKind = "stage" | "emploi" | "bourse" | "concours" | "incubation" | "evenement";

export interface Opportunity {
  id: string;
  title: string;
  organization: string;
  kind: OpportunityKind;
  domain: DomainId;
  city: string;
  deadline: string;
  description: string;
  authorId: string;
  interested: string[];
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  actorId?: string;
  text: string;
  href: string;
  read: boolean;
  createdAt: string;
}

export interface State {
  version: number;
  users: User[];
  currentUserId: string | null;
  mentorships: Mentorship[];
  conversations: Conversation[];
  sessions: Session[];
  goals: Goal[];
  resources: Resource[];
  opportunities: Opportunity[];
  notifications: Notification[];
  /** Mentors mis de côté par chaque utilisateur */
  favorites: Record<string, string[]>;
}
