/**
 * Signaler et bloquer (backendvillago, application `signalements`).
 *
 * Choix de David (21/11/2026) : une annonce signalée reste en ligne jusqu'à
 * la décision de l'équipe ; un blocage ne vaut que pour celui qui bloque, et
 * l'autre n'en est pas averti. Le serveur cache déjà les messages des
 * personnes bloquées ; le site les retire aussi de ce qu'il a déjà affiché.
 */

import { useQuery } from '@tanstack/react-query';
import type { Blocage, CibleSignalement, MotifSignalement, SignalementCreate } from '@shared/schema';
import { api } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import { t } from '@/i18n';

export const CHEMIN_SIGNALER = '/api/v1/signalements/';
export const CHEMIN_BLOCAGES = '/api/v1/signalements/blocages/';
export const CLE_SIGNALEMENTS_GENERAUX = '/api/v1/signalements/equipe/';

/** Miroir de `Signalement.MOTIFS_PAR_CIBLE` côté serveur, dans l'ordre affiché. */
export const MOTIFS: Record<CibleSignalement, MotifSignalement[]> = {
  annonce: ['deja_louee', 'fausse_annonce', 'prix_different', 'arnaque', 'autre'],
  message: ['arnaque', 'propos_abusifs', 'autre'],
  utilisateur: ['faux_commissionnaire', 'arnaque', 'propos_abusifs', 'autre'],
};

export function libelleMotif(motif: MotifSignalement): string {
  return {
    deja_louee: t('signaler.motifDejaLouee'),
    fausse_annonce: t('signaler.motifFausseAnnonce'),
    prix_different: t('signaler.motifPrixDifferent'),
    arnaque: t('signaler.motifArnaque'),
    faux_commissionnaire: t('signaler.motifFauxCommissionnaire'),
    propos_abusifs: t('signaler.motifProposAbusifs'),
    autre: t('signaler.motifAutre'),
  }[motif];
}

export function signaler(corps: SignalementCreate) {
  return api.post<SignalementCreate>(CHEMIN_SIGNALER, corps);
}

export function useBlocages(actif: boolean) {
  return useQuery<Blocage[]>({ queryKey: [CHEMIN_BLOCAGES], enabled: actif });
}

export function idsBloques(blocages?: Blocage[]): Set<number> {
  return new Set((blocages ?? []).map((b) => b.utilisateur));
}

function rafraichir() {
  void queryClient.invalidateQueries({ queryKey: [CHEMIN_BLOCAGES] });
  void queryClient.invalidateQueries({ queryKey: ['/api/v1/messaging/chatrooms/'] });
}

export async function bloquer(utilisateur: number) {
  await api.post<Blocage>(CHEMIN_BLOCAGES, { utilisateur });
  rafraichir();
}

export async function debloquer(utilisateur: number) {
  await api.delete(`${CHEMIN_BLOCAGES}${utilisateur}/`);
  rafraichir();
}
