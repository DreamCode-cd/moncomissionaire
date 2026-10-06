import {
  Bell,
  Calendar,
  FileText,
  House,
  MessageCircle,
  Users,
  type LucideIcon,
} from 'lucide-react';

import type { Ton } from './statuts';

/**
 * Notifications — source unique de l'icône et du ton.
 *
 * `getNotificationColor` était dupliquée mot pour mot entre le menu de l'en-tête
 * et la page des notifications. `getNotificationIcon`, elle, existait en deux
 * versions DIFFÉRENTES : celle de l'en-tête ne connaissait ni les visites ni
 * les rapports et retombait sur une cloche. La même notification s'affichait
 * donc avec un calendrier dans la page et une cloche dans le menu.
 *
 * Les types suivent l'énumération `TypeNotification` du backend. En ajouter un
 * côté Django sans l'ajouter ici le fait retomber sur la cloche neutre — c'est
 * un repli acceptable, pas une raison de s'en passer.
 */

interface Apparence {
  icone: LucideIcon;
  ton: Ton;
}

const APPARENCES: Record<string, Apparence> = {
  // Biens
  bien_valide: { icone: House, ton: 'favorable' },
  bien_rejete: { icone: House, ton: 'defavorable' },

  // Demandes de visite
  nouvelle_demande: { icone: Calendar, ton: 'information' },
  demande_acceptee: { icone: Calendar, ton: 'favorable' },
  demande_rejetee: { icone: Calendar, ton: 'defavorable' },

  // Visites
  visite_assignee: { icone: Users, ton: 'information' },
  visite_retiree: { icone: Users, ton: 'attente' },
  visite_terminee: { icone: Users, ton: 'favorable' },

  // Messagerie
  nouveau_message: { icone: MessageCircle, ton: 'information' },
  agent_ajoute_chat: { icone: MessageCircle, ton: 'information' },

  // Rapports
  rapport_disponible: { icone: FileText, ton: 'information' },
};

const PAR_DEFAUT: Apparence = { icone: Bell, ton: 'neutre' };

export function apparenceNotification(type?: string | null): Apparence {
  return (type && APPARENCES[type]) || PAR_DEFAUT;
}
