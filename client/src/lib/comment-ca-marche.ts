import { CONTACT_VILLAGO, numeroLisible } from '@/lib/contact';

/**
 * Le texte de la page « Comment ça marche » : qui paie quoi, à qui, et quand.
 *
 * Même texte que l'application mobile (villagomobile, `src/aide/comment-ca-marche.ts`) :
 * toute modification se fait des deux côtés. Il reprend les décisions de
 * David du 19/11/2026 et les règles déjà appliquées par l'API :
 * - frais de visite plafonnés par ville, payés une seule fois par bien, nuls
 *   tant que l'identité du commissionnaire n'est pas vérifiée ; réglés au
 *   choix du commissionnaire, en espèces ou en mobile money ; remboursés en
 *   entier si la visite n'a pas lieu par sa faute ;
 * - tout se paie à la signature : premier loyer + garantie + commission,
 *   c'est le « Total pour entrer » de la fiche (PaiementEntree) ;
 * - garantie de trois mois au plus (loi n° 15/025, art. 18 et 39), pas de
 *   loyer d'avance (art. 22), bail écrit et enregistré sous 30 jours
 *   (art. 3 et 41), état des lieux contradictoire (art. 17) ;
 * - aucune retenue sur la garantie sans état des lieux d'entrée validé par
 *   le locataire ;
 * - en cas de litige, l'équipe examine et peut suspendre un compte, mais ne
 *   tranche pas les questions d'argent : VillaGo n'est pas une agence et
 *   n'encaisse rien.
 */

/**
 * Espaces insécables de la typographie française : « » » ne commence jamais
 * une ligne, ni « : », « ; », « ? », « ! » ; « « » n'en finit jamais une.
 * Vu sur le site à 390 px : « Mes visites » se coupait avant le « » ».
 */
function insecables(texte: string): string {
  return texte.replace(/« /g, '«\u00A0').replace(/ ([»:;?!])/g, '\u00A0$1');
}

/** Un paragraphe, ou une liste à puces. */
export type Bloc = string | { liste: string[] };

export interface Etape {
  titre: string;
  blocs: Bloc[];
}

export const INTRODUCTION = insecables(
  'VillaGo vous met en relation avec un commissionnaire pour visiter et louer une maison. Voici ce que vous payez, à qui et à quel moment.',
);

/** À lire avant tout le reste : c'est la protection contre l'arnaque la plus simple. */
export const AVERTISSEMENT = insecables(
  'VillaGo n’encaisse aucun paiement. Vous payez directement le commissionnaire et le bailleur. Si quelqu’un vous demande de payer « VillaGo », ne payez pas et prévenez-nous.',
);

const numero = numeroLisible(CONTACT_VILLAGO.whatsapp);

const ETAPES_SAISIES: Etape[] = [
  {
    titre: 'Avant de demander une visite',
    blocs: [
      'Chaque annonce montre ce que vous paierez : le loyer, la garantie, la commission et les frais de visite. Le « Total pour entrer » vous dit combien réunir pour emménager.',
      'Une annonce doit être reconfirmée tous les 30 jours, sinon elle disparaît de la liste. Vous évitez ainsi de vous déplacer pour une maison déjà louée.',
    ],
  },
  {
    titre: 'La demande de visite',
    blocs: [
      'Vous choisissez un jour et une heure. Le commissionnaire accepte, fixe un autre créneau ou refuse.',
      'S’il n’a pas répondu à l’heure choisie, la demande expire. Vous pouvez en envoyer une nouvelle.',
      'Vous pouvez annuler jusqu’au moment de la visite, depuis « Mes visites ».',
    ],
  },
  {
    titre: 'Les frais de visite',
    blocs: [
      'Certains commissionnaires demandent des frais pour faire visiter. Le montant est écrit sur l’annonce. Il ne peut pas dépasser le plafond fixé par VillaGo pour votre ville.',
      'Vous les payez une seule fois par maison, même si vous revenez la voir.',
      'Le commissionnaire vous dit comment les régler :',
      {
        liste: [
          'en espèces, sur place, avant la visite ;',
          'ou par mobile money (M-Pesa, Airtel Money, Orange Money), avant de vous déplacer.',
        ],
      },
      'Gardez le message de confirmation du mobile money, ou demandez un reçu.',
      'Un commissionnaire dont VillaGo n’a pas encore vérifié l’identité ne peut pas demander de frais de visite.',
      'On vous réclame plus que le montant affiché ? Ne payez pas la différence et signalez-le.',
    ],
  },
  {
    titre: 'Si la visite n’a pas lieu',
    blocs: [
      'Le commissionnaire ne vient pas, ou il annule la visite : il vous rend les frais de visite en entier.',
      'S’il ne le fait pas, signalez-le depuis « Mes visites ». L’équipe VillaGo le contacte et peut suspendre son compte.',
      'Si c’est vous qui annulez, voyez avec le commissionnaire pour les frais déjà payés.',
    ],
  },
  {
    titre: 'Le jour de la signature du bail',
    blocs: [
      'Vous payez en une fois le « Total pour entrer » affiché sur l’annonce :',
      {
        liste: [
          'le premier mois de loyer, au bailleur ;',
          'la garantie, au bailleur : trois mois de loyer au plus, c’est la loi ;',
          'la commission, au commissionnaire : un mois de loyer, seulement si vous louez.',
        ],
      },
      'Sur certaines maisons, le bailleur paie la moitié de la commission : l’annonce le précise. Une maison publiée directement par son propriétaire n’a pas de commission.',
      'Personne ne peut exiger plusieurs mois de loyer d’avance : la loi l’interdit.',
      'Le bail doit être écrit, puis enregistré dans les 30 jours qui suivent la signature. Gardez une preuve de chaque paiement.',
    ],
  },
  {
    titre: 'L’état des lieux et la garantie',
    blocs: [
      'À votre arrivée, le commissionnaire fait l’état des lieux pièce par pièce, avec des photos. Vous le relisez et vous le validez : sans votre accord, il ne compte pas.',
      'À votre départ, le bailleur ne peut garder une partie de la garantie que pour une dégradation par rapport à l’état des lieux d’entrée, et il doit dire laquelle.',
      'Sans état des lieux d’entrée validé par vous, VillaGo n’enregistre aucune retenue sur la garantie.',
    ],
  },
  {
    titre: 'En cas de problème',
    blocs: [
      'Frais contestés, garantie non rendue, commissionnaire qui ne répond plus :',
      {
        liste: [
          'signalez-le depuis « Mes visites », sur la visite concernée ;',
          `ou écrivez-nous sur WhatsApp au ${numero}.`,
        ],
      },
      'L’équipe VillaGo écoute les deux parties, regarde l’historique de la visite et peut avertir ou suspendre un compte. Si vous avez signalé depuis « Mes visites », sa réponse s’affiche sous la visite.',
      'VillaGo n’est pas une agence : l’équipe ne décide pas qui doit de l’argent à qui. Pour un désaccord d’argent, elle peut vous orienter, mais la décision revient aux deux parties ou, si besoin, aux autorités.',
    ],
  },
  {
    titre: 'Après la visite',
    blocs: [
      'Vous pouvez noter le commissionnaire après une visite faite. Les notes aident les autres clients, et les propriétaires s’en servent pour choisir à qui confier leur maison.',
    ],
  },
];

export const ETAPES: Etape[] = ETAPES_SAISIES.map(({ titre, blocs }) => ({
  titre: insecables(titre),
  blocs: blocs.map((bloc) =>
    typeof bloc === 'string' ? insecables(bloc) : { liste: bloc.liste.map(insecables) },
  ),
}));
