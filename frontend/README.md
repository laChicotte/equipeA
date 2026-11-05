# Lirel — « Apprendre de ceux qui sont passés par là. »

Plateforme numérique de mentorat qui met en relation des jeunes talents (étudiants, jeunes diplômés, entrepreneurs, porteurs de projets, personnes en reconversion) avec des professionnels expérimentés.

Projet réalisé pour le **hackathon « Talents connectés »** : *Le mentorat à l'ère du numérique : connecter les talents, transmettre les expériences et construire les carrières de demain*. Salon international du livre de jeunesse de Conakry, 10e édition, Mois du Numérique (4–7 novembre 2026).

Présentation du projet, parcours de démonstration et note de pérennisation : [docs/DOSSIER-HACKATHON.md](docs/DOSSIER-HACKATHON.md).

## Lancer le projet

Prérequis : Node.js 22+ et Docker (pour PostgreSQL).

```bash
# 1. Base de données PostgreSQL 17 (conteneur « lirel-postgres », port 5442)
npm run db:up

# 2. API NestJS : dépendances, configuration, tables et données de démonstration
npm run api:install
cp backend/.env.example backend/.env      # puis remplacer JWT_SECRET par une longue chaîne aléatoire
npm run api:setup                         # migrations Prisma + données de démo
npm run api:dev                           # http://localhost:4000/api · documentation : http://localhost:4000/docs

# 3. Front Next.js (dans un second terminal)
npm install
cp .env.example .env.local                # NEXT_PUBLIC_API_URL=http://localhost:4000/api
npm run dev                               # http://localhost:3000
```

En production : `npm --prefix backend run build && npm --prefix backend start`, puis `npm run build && npm start`.

**Comptes de démonstration** (mot de passe `lirel2026`) :

| Compte | Rôle | Ce qu'on y voit |
| --- | --- | --- |
| `demo@lirel.fr` | Mariama, étudiante (mentorée) | Deux mentors, séances à venir, objectifs Campus France et IA |
| `mentor@lirel.fr` | Aïssatou, ingénieure (mentor) | Une demande de mentorat en attente, deux mentorés, agenda, avis |

La page de connexion propose un bouton pour chacun ; la page d'accueil publique aussi (« Visite guidée »).

Ces deux comptes sont de vrais utilisateurs : connectez-vous avec l'un dans un navigateur et avec l'autre dans une fenêtre privée, les messages, demandes et réservations passent de l'un à l'autre en quelques secondes. Les autres membres fictifs sont animés par le **mode démonstration** (`DEMO_MODE=true`) : ils acceptent les demandes et répondent aux messages automatiquement. Le menu du compte → « Réinitialiser la démo » remet la base dans son état initial (uniquement en mode démonstration).

## Fonctionnalités

| Besoin (TDR §7.2) | Dans Lirel |
| --- | --- |
| Profils mentors et mentorés | Inscription en deux étapes selon le rôle ; profil éditable (`/profil`) |
| Recherche et mise en relation | Annuaire filtrable (`/mentors`) + **recommandation guidée** (`/mentors/trouver`) |
| Catalogue des domaines d'expertise | Les 7 domaines des TDR, dont l'accompagnement Campus France (avec sa mention légale) |
| Prise de rendez-vous | Créneaux hebdomadaires des mentors → réservation sur les prochains créneaux libres |
| Espace d'échange | Messagerie (`/messages`) et **salle de visio intégrée** (`/visio/[id]`) : caméra, micro, partage d'écran, chat et notes |
| Suivi des objectifs | Objectifs découpés en étapes, partagés avec le mentor, qui peut les commenter |
| Bibliothèque de ressources | Guides, modèles, check-lists, vidéos et livres conseillés rédigés par les mentors |
| Évaluation des séances | Note et avis après chaque séance ; note moyenne visible sur les profils |
| Opportunités | Stages, emplois, bourses, concours, incubation, événements |
| Intelligence artificielle | Analyse du besoin rédigé librement → domaines détectés → mentors classés avec explications |

## Stack

- **Front** : Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Lucide Icons · polices Fraunces et Inter
- **API** : NestJS 11 · Prisma 6 · PostgreSQL 17 · authentification JWT (mots de passe hachés avec bcrypt) · validation des entrées (class-validator) · documentation Swagger sur `/docs`
- **Synchronisation** : le front charge un instantané des données visibles par l'utilisateur (`GET /api/state`) et le rafraîchit toutes les 4 secondes ; chaque action appelle une route dédiée. Les données privées des autres membres (conversations, notes de séance, messages de demande, objectifs) ne quittent jamais le serveur.
- Visio : flux caméra et micro réels du navigateur (`getUserMedia`, `getDisplayMedia`) ; un lien ouvre la même salle sur Jitsi Meet pour un appel multi-appareils.

## Architecture

```
app/
  page.tsx                 accueil public
  connexion/, inscription/ authentification + profil mentor / mentoré
  (app)/                   espace connecté
    accueil                tableau de bord (vue mentoré ou vue mentor)
    mentors, mentors/trouver, mentors/[id], membres/[id]
    messages, seances, visio/[id]
    objectifs, ressources, ressources/[id], ressources/nouvelle, opportunites, profil
components/
  ui.tsx                   identité, avatars, badges, boutons, modale…
  shell.tsx                en-tête, navigation, notifications, recherche
  mentoring.tsx            carte mentor, demande, réservation, évaluation, séance
lib/
  api.ts                   client HTTP de l'API (jeton JWT)
  domains.ts               domaines, axes, profils, formats (repris des TDR)
  matching.ts              moteur de recommandation et créneaux libres
  seed.ts                  identifiants des comptes de démonstration
  store.tsx                état global synchronisé avec l'API
  types.ts                 modèle de données (contrat partagé avec l'API)
backend/                   API NestJS
  prisma/schema.prisma     schéma de la base PostgreSQL
  prisma/migrations/       migrations SQL
  src/
    auth/                  inscription, connexion, garde JWT
    state/                 instantané des données visibles par l'utilisateur
    mentorships/           demandes de mentorat (envoi, acceptation, clôture)
    messages/              messagerie
    sessions/              réservation, annulation, notes et évaluation des séances
    goals/                 objectifs et étapes, conseils du mentor
    library/               ressources et opportunités
    users/                 profil et favoris
    notifications/
    demo/                  données de démo, réinitialisation, membres animés
docker-compose.yml         PostgreSQL de développement
```

### Principales routes de l'API

| Méthode | Route | Rôle |
| --- | --- | --- |
| POST | `/api/auth/register`, `/api/auth/login` | Inscription, connexion (renvoie un JWT) |
| GET | `/api/state` | Données visibles (publiques sans jeton) |
| PATCH | `/api/users/me` | Mise à jour du profil |
| POST / PATCH | `/api/mentorships`, `/api/mentorships/:id/respond` | Demande de mentorat, réponse du mentor |
| POST | `/api/messages`, `/api/conversations/:id/read` | Messagerie |
| POST / PATCH | `/api/sessions`, `/api/sessions/:id/{cancel,complete,notes,rate}` | Séances |
| POST / PATCH | `/api/goals`, `/api/goals/:id/steps/:stepId/toggle`, `/api/goals/:id/mentor-note` | Objectifs |
| POST | `/api/resources`, `/api/opportunities` (+ `/save`, `/interest`) | Bibliothèque et opportunités |
| POST | `/api/demo/reset` | Réinitialisation (mode démonstration uniquement) |

La liste complète, avec les schémas, est sur http://localhost:4000/docs.

La version précédente de Lirel (réseau social de lecture) a été sauvegardée dans `D:\Lirel-version-lecture`.
