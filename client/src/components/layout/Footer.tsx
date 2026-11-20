import { Link } from 'wouter';
import { HelpCircle, MessageCircle, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CONTACT_VILLAGO, lienWhatsapp, numeroLisible } from '@/lib/contact';
import { t } from '@/i18n';

const PAGES_LEGALES = [
  { href: '/legal/terms', get libelle() { return t('pied.conditions'); } },
  { href: '/legal/privacy', get libelle() { return t('pied.confidentialite'); } },
  { href: '/legal/cookies', get libelle() { return t('pied.cookies'); } },
  { href: '/legal/legal', get libelle() { return t('pied.mentions'); } },
];

/**
 * Le pied de page, sur toutes les largeurs. Il était masqué sur téléphone :
 * un visiteur n'y trouvait ni les pages légales (Code du numérique, art. 52 :
 * accès « facile, direct et permanent ») ni le moyen de joindre l'équipe.
 * Sur téléphone, il laisse la place de la barre de navigation du bas.
 */
export function Footer({
  avecBarreDuBas = true,
  barreAction = false,
}: {
  avecBarreDuBas?: boolean;
  barreAction?: boolean;
}) {
  const { telephone } = CONTACT_VILLAGO;
  return (
    <footer
      className={cn(
        'border-t bg-background pt-6 mt-auto',
        // La barre d'action d'une fiche (≈ 90 px) se pose au-dessus de la
        // navigation du bas sur téléphone, et seule sur ordinateur.
        barreAction ? 'pb-44 md:pb-28' : avecBarreDuBas ? 'pb-24 md:pb-6' : 'pb-6',
      )}
    >
      <div className="container mx-auto px-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">{t('aide.titre')}</p>
          <div className="flex flex-wrap gap-x-5 text-sm">
            <Link
              href="/comment-ca-marche"
              className="inline-flex min-h-11 md:min-h-0 items-center gap-1.5 text-primary hover:underline underline-offset-2"
              data-testid="aide-comment-ca-marche"
            >
              <HelpCircle className="h-4 w-4" aria-hidden />
              {t('aide.commentCaMarche')}
            </Link>
            <a
              href={lienWhatsapp()}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 md:min-h-0 items-center gap-1.5 text-primary hover:underline underline-offset-2"
              data-testid="aide-whatsapp"
            >
              <MessageCircle className="h-4 w-4" aria-hidden />
              WhatsApp
            </a>
            <a
              href={`tel:${telephone}`}
              className="inline-flex min-h-11 md:min-h-0 items-center gap-1.5 text-primary hover:underline underline-offset-2"
              data-testid="aide-appeler"
            >
              <Phone className="h-4 w-4" aria-hidden />
              {numeroLisible(telephone)}
            </a>
          </div>
        </div>
        <nav aria-label={t('pied.infosLegales')} className="flex flex-wrap gap-x-5 text-sm">
          {PAGES_LEGALES.map(({ href, libelle }) => (
            <Link
              key={href}
              href={href}
              className="inline-flex min-h-11 md:min-h-0 items-center text-muted-foreground hover:text-foreground transition-colors"
            >
              {libelle}
            </Link>
          ))}
        </nav>
      </div>
      <p className="container mx-auto px-4 mt-4 text-xs text-muted-foreground">
        {t('pied.droits', { annee: new Date().getFullYear() })}
      </p>
    </footer>
  );
}
