# Système de design VillaGo — web

Ce document sert deux usages : comprendre pourquoi le système est fait ainsi,
et savoir où ajouter quelque chose sans le faire dériver.

## Le diagnostic

Le projet n'avait pas un problème de palette : shadcn/ui fournissait déjà une
couche correcte de jetons primitifs et sémantiques génériques (`--primary`,
`--muted`, `--accent`). Ce qui manquait, c'était le **second niveau** — les
jetons qui disent *à quoi ça sert*, pas *quelle couleur c'est*.

Faute de ce niveau, chaque écran improvisait avec des primitives Tailwind
écrites en dur. Ce que l'audit a trouvé :

| Constat | Ampleur |
|---|---|
| Fonctions de badge de statut dupliquées | **7** (4 statuts + 3 appréciations) |
| Formatages de date | **13** implémentations, 11 fichiers |
| `getNotificationColor` | dupliquée mot pour mot, 2 fichiers |
| `getNotificationIcon` | 2 versions **différentes** pour les mêmes données |
| Primitives de couleur en dur | **~95** occurrences |
| États vides | 12 formulations, aucun composant partagé |

Conséquences visibles : le même statut s'affichait avec quatre jeux de
couleurs selon l'écran ; la même notification portait un calendrier dans la
page et une cloche dans le menu ; une date absente s'affichait « N/A », « »,
« Non spécifié » ou « Invalid Date » selon l'endroit.

## Les trois niveaux

C'est l'architecture que recommande la littérature actuelle sur les design
tokens, et celle que le W3C a stabilisée en octobre 2025.

```
1. Primitives      les valeurs brutes            (fournies par shadcn/ui)
2. Sémantique      générique : surface, texte    (fournie par shadcn/ui)
3. Sémantique      MÉTIER : statut, note, favori (ce qu'on a ajouté)
   métier
```

**Un composant ne touche jamais au niveau 1.** Écrire `bg-green-500` dans une
page, c'est court-circuiter les deux niveaux au-dessus : le mode sombre doit
alors être traité à la main, et changer une teinte demande de fouiller tout
le front.

## Les jetons métier

### Statuts — cinq tons

Un ton dit ce que la situation **vaut pour l'utilisateur**, pas de quelle
couleur elle est. C'est ce qui permet de changer la palette sans toucher au
métier.

| Ton | Pour | Exemples |
|---|---|---|
| `favorable` | ce qui est acquis, réussi | validé, disponible, acceptée, terminée |
| `attente` | ce qui n'est pas tranché | en attente, planifiée, reportée, moyen |
| `defavorable` | ce qui est refusé, annulé | rejeté, rejetée, annulée, non recommandé |
| `information` | ni bon ni mauvais, mais notable | nouveau message, visite assignée, en cours |
| `neutre` | sans enjeu | loué, indisponible, inconnu |

Usage : `bg-statut-favorable-fond text-statut-favorable`.

**« Loué » est neutre, pas rouge.** Être loué n'est pas une erreur, c'est une
indisponibilité — le rouge se réserve au rejet et à l'annulation. C'est un
changement délibéré par rapport à l'ancien affichage.

### Distinctions — deux rôles

Ni statuts ni états, mais des conventions visuelles fortes qu'il aurait été
absurde de neutraliser.

| Jeton | Pour |
|---|---|
| `note` / `note-fond` | étoiles de notation, photo mise en avant |
| `favori` | le cœur des favoris |

## Les sources uniques

Une seule façon de faire chaque chose. Ajouter un cas se fait **dans ces
fichiers**, jamais dans un composant.

| Fichier | Responsabilité |
|---|---|
| `lib/statuts.ts` | libellé, ton et icône de chaque statut ; cinq familles |
| `lib/dates.ts` | tous les formats de date et d'heure |
| `lib/prix.ts` | montants, toujours avec leur devise |
| `lib/notifications.ts` | icône et ton de chaque type de notification |
| `components/statut/BadgeStatut.tsx` | l'unique badge de statut |
| `components/etats/` | chargement, vide, erreur, hors ligne |

### Deux règles de contenu

Elles viennent de la pratique courante en conception d'interface, et
notamment du travail d'Adam Wathan et Steve Schoger — les auteurs de
*Refactoring UI*, qui sont aussi ceux de Tailwind, déjà utilisé ici.

1. **Un état vide n'est pas une absence, c'est un message.** Il dit pourquoi
   c'est vide et ce qu'on peut faire. Sinon l'utilisateur conclut que
   l'application est cassée.
2. **Une seule action principale par écran ou par état.** Solide et
   contrastée ; le reste discret. Deux boutons de même poids ne guident
   personne. Ne pas s'appuyer sur la taille de police pour porter la
   hiérarchie — le contraste et l'espacement font davantage.

## Ce que le système ne couvre pas encore

- Les espacements suivent l'échelle Tailwind sans être documentés : `1`, `2`,
  `3`, `4`, `6` dominent, ce qui est cohérent, mais rien ne l'impose.
- Aucun jeton d'élévation métier : les ombres passent par `--elevate-*`,
  hérité du gabarit.
- Le mobile porte ses propres jetons (`src/theme/jetons.ts`). Les deux
  ensembles sont à rapprocher dans un projet Claude Design partagé — les
  classes Tailwind ne traversent pas la frontière, seuls les jetons le font.

## Sources

- [Design Tokens in 2026: Beyond Colors and Spacing](https://www.designsystemscollective.com/design-tokens-in-2026-beyond-colors-and-spacing-d2fd632029e1)
- [Design Systems in 2026: Scale UI Without the Chaos](https://www.digitalapplied.com/blog/design-systems-2026-scale-ui-without-chaos-methodology)
- [Mastering typography in design systems with semantic tokens](https://uxdesign.cc/mastering-typography-in-design-systems-with-semantic-tokens-and-responsive-scaling-6ccd598d9f21)
- [What Are Design Tokens? A Complete Guide](https://www.uxpin.com/studio/blog/what-are-design-tokens/)
- [7 Practical Tips for Cheating at Design — Adam Wathan & Steve Schoger](https://medium.com/refactoring-ui/7-practical-tips-for-cheating-at-design-40c736799886)
- [Top 20 Key Points from Refactoring UI](https://medium.com/design-bootcamp/top-20-key-points-from-refactoring-ui-by-adam-wathan-steve-schoger-d81042ac9802)
