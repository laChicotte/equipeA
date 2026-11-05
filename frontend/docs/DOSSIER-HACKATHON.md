# MonMentor : dossier de présentation

**Hackathon « Talents connect »** · Salon international du livre de jeunesse de Conakry, 10e édition · Mois du Numérique · 4–7 novembre 2026

Ce dossier couvre les livrables 2, 3 et 4 des termes de référence (§11) : la présentation du projet, le parcours utilisateur de démonstration et la note de pérennisation. Le livrable 1 (prototype) est l'application elle-même ; le livrable 5 (pitch) s'appuie sur la partie 1.

---

## 1. Présentation du projet

### Le problème

Beaucoup de jeunes ont des idées, des compétences et de l'ambition. Ce qui leur manque, ce sont **les conseils, les réseaux et les expériences** pour concrétiser leurs projets. Les professionnels qui pourraient les aider existent, mais rien ne les relie de façon simple, suivie et digne de confiance.

> Comment le numérique peut-il faciliter l'accès au mentorat, rapprocher les jeunes des professionnels expérimentés et favoriser la transmission des compétences ? (TDR §2.2)

### La solution

**MonMentor** est une plateforme web de mentorat, utilisable sur téléphone comme sur ordinateur, qui accompagne la relation du premier contact jusqu'au résultat :

1. **Exprimer son besoin avec ses mots.** Le mentoré écrit sa situation en langage naturel (« je veux créer mon entreprise de transformation de fruits mais je ne sais pas comment trouver un financement »). MonMentor détecte les domaines concernés.
2. **Choisir le bon mentor.** Le moteur de recommandation classe les mentors et **explique chaque choix** : domaine d'expertise, compétences liées au besoin, avis, places disponibles, proximité géographique. La recommandation reste transparente, et c'est le mentoré qui décide.
3. **Échanger.** Après acceptation de la demande : messagerie, réservation sur les créneaux du mentor et **séances en visio directement dans l'application**, avec chat et prise de notes.
4. **Progresser.** Objectifs découpés en étapes et partagés avec le mentor, qui peut les commenter ; évaluation de chaque séance ; bibliothèque de ressources ; tableau d'opportunités.

### Les utilisateurs cibles

| Mentorés | Mentors |
| --- | --- |
| Étudiants, jeunes diplômés, entrepreneurs, porteurs de projets, personnes en reconversion ou qui veulent acquérir de nouvelles compétences | Entrepreneurs, cadres, experts, consultants, anciens étudiants à l'étranger |

### Les fonctionnalités principales

| Axe du programme (TDR §6) | Fonctionnalités |
| --- | --- |
| 1. Orientation et parcours | Profil et besoin du mentoré, recommandation guidée, objectifs et étapes |
| 2. Transmission des compétences | Séances chat / visio / présentiel, notes de séance, bibliothèque de ressources rédigées par les mentors |
| 3. Accompagnement de projet | Mentors en entrepreneuriat et gestion, modèles (Business Model Canvas, trésorerie), opportunités (concours, incubation) |
| 4. Innovation numérique | La plateforme elle-même : mise en relation, agenda, suivi, évaluation, recommandation automatique |

Les **sept domaines** des TDR (§5) sont couverts par au moins un mentor de démonstration, y compris **l'accompagnement Campus France**, présenté avec la mention obligatoire : *l'accompagnement relève du conseil, de l'orientation et du partage d'expériences ; il ne garantit ni l'admission dans un établissement, ni l'obtention d'un visa.*

### Ce qui distingue MonMentor

- **Une recommandation explicable**, pas une boîte noire : chaque pourcentage de compatibilité est accompagné de ses raisons.
- **Le suivi après la mise en relation** : objectifs, notes, évaluations. Le mentorat ne s'arrête pas au premier message.
- **La visio intégrée**, sans application à installer.
- **Un mentorat responsable** : capacité d'accueil réglée par chaque mentor, badge « Mentor vérifié », rappel que le mentor aide à gagner en autonomie et ne fait pas à la place du mentoré (TDR §9).

---

## 2. Parcours utilisateur de démonstration (environ 5 minutes)

Lancer l'application, puis cliquer sur « Réinitialiser la démo » dans le menu du compte si elle a déjà servi.

### Partie A · Mariama, étudiante en L3 informatique (mentorée)

1. **Page d'accueil publique** → « Visite guidée : Espace mentorée ».
2. **Tableau de bord** : prochaine séance (simulation d'entretien Campus France avec Thierno), mentors, progression des objectifs, opportunités dans ses domaines (bourse d'excellence).
3. **Trouver un mentor** (bouton « Trouver un mentor ») : effacer le texte et écrire *« Je veux créer mon entreprise de transformation de fruits mais je ne sais pas comment trouver un financement »*. Les domaines détectés apparaissent ; lancer l'analyse. Mamadou Diallo arrive en tête, avec les raisons affichées.
4. **Demander un mentorat** à Mamadou : domaine, axe, message pré-rempli → envoyer. Quelques secondes plus tard, une notification arrive : la demande est acceptée et un message de bienvenue apparaît dans **Messages**.
5. **Réserver une séance** depuis le profil de Mamadou : choisir un créneau, un format et un sujet. La séance apparaît dans **Séances**.
6. **Rejoindre la visio** de la prochaine séance avec Thierno : autoriser la caméra, rejoindre, ouvrir le chat et les notes, puis « Terminer ». Évaluer la séance.
7. **Objectifs** : cocher l'étape « Adapter la lettre de motivation ». Lire le commentaire de Thierno.
8. **Ressources** → « Réussir son entretien Campus France » (avec la mention légale).

### Partie B · Aïssatou, ingénieure logicielle (mentor)

1. Se déconnecter, puis se connecter avec le bouton « Aïssatou · Mentor ».
2. **Tableau de bord mentor** : la demande de Moussa, professeur de maths en reconversion. L'**accepter** : Moussa répond dans la messagerie.
3. **Mes mentorés** : progression des objectifs de Mariama et d'Ousmane ; ouvrir la fiche de Mariama et **laisser un conseil** sur son objectif IA.
4. **Partager une ressource** (bouton « Partager ») ou une opportunité.
5. **Profil** : modifier ses créneaux hebdomadaires et sa capacité d'accueil.

---

## 3. Note de pérennisation

### Ce que démontre le prototype

Le parcours complet fonctionne de bout en bout : inscription par rôle, recommandation, demande et acceptation, messagerie, réservation, visio, objectifs, évaluation, ressources et opportunités. Il repose sur une vraie architecture : une API NestJS, une base PostgreSQL, une authentification JWT avec mots de passe hachés, la validation de toutes les entrées et le contrôle des droits (chacun ne voit et ne modifie que ce qui le concerne). Deux personnes connectées sur deux appareils échangent réellement. Pour la démonstration, les autres membres fictifs réagissent automatiquement ; ce mode se désactive par une simple variable d'environnement.

### Pistes de développement

| Échéance | Chantier |
| --- | --- |
| 0–3 mois | Messagerie instantanée par WebSocket (aujourd'hui rafraîchie toutes les 4 secondes) ; notifications e-mail / SMS / WhatsApp ; réinitialisation du mot de passe ; visio sur une instance Jitsi hébergée par le programme ; application installable (PWA) pour les connexions mobiles lentes ; hébergement (API + PostgreSQL managé) et sauvegardes |
| 3–6 mois | Vérification des mentors par la coordination (pièces, entretien), charte du mentorat et signalement ; tableau de bord de la coordination (indicateurs, mises en relation, satisfaction) |
| 6–12 mois | Recommandation enrichie par un modèle de langage (compréhension fine du besoin, résumé de séance, suggestions d'étapes), toujours explicable et validée par l'humain ; contenus en langues nationales (pular, soussou, malinké) et accessibilité audio ; programmes de mentorat collectifs (cohortes, ateliers) |

### Besoins d'accompagnement

- **Technique** : accompagnement de l'équipe lauréate par Efficiency Globale (TDR §8) pour passer du prototype à une version en production : architecture serveur, sécurité, hébergement, tests avec de vrais utilisateurs.
- **Mobilisation des mentors** : appui de l'IFG et des partenaires pour constituer un premier réseau de 50 à 100 mentors vérifiés, issus de plusieurs secteurs.
- **Juridique** : protection des données personnelles (consentement, conservation des échanges), conditions d'utilisation et charte.

### Conditions de déploiement

- **Pilote** : un premier cycle de trois mois avec une cohorte issue du Salon (par exemple 30 mentorés et 15 mentors), avec un suivi des indicateurs.
- **Indicateurs** : taux de demandes acceptées, nombre de séances par binôme, étapes d'objectifs franchies, note moyenne des séances, insertions, admissions et projets lancés déclarés.
- **Gouvernance** : une coordination qui vérifie les mentors, anime le réseau et modère les contenus.
- **Partenariats** (TDR §15) : entreprises (mentors salariés, mécénat de compétences), établissements d'enseignement, incubateurs, associations professionnelles, Campus France pour les contenus d'orientation.
- **Modèle économique** : gratuit pour les mentorés ; financement par les partenaires institutionnels et des offres « mentorat d'entreprise » (programmes dédiés pour les employeurs et les écoles).
- **Coûts maîtrisés** : application web unique (téléphone et ordinateur), visio libre (Jitsi) auto-hébergée, pas d'application native à maintenir au démarrage.
