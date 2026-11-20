import { MessageCircle } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { avertissement, etapes, introduction, type Bloc } from '@/lib/comment-ca-marche';
import { lienWhatsapp } from '@/lib/contact';
import { t } from '@/i18n';

/**
 * Comment ça marche : qui paie quoi, à qui, et quand.
 *
 * Le texte est dans `@/lib/comment-ca-marche`, copie de celui de l'application
 * mobile ; dans le code et non dans l'API : il s'affiche sans attendre le serveur.
 */
export default function CommentCaMarche() {
  return (
    <Layout>
      <article className="mx-auto max-w-2xl px-4 py-6 md:py-10 space-y-8">
        <header className="space-y-3">
          <h1 className="text-2xl md:text-3xl font-extrabold">{t('aide.commentCaMarche')}</h1>
          <p className="text-base">{introduction()}</p>
        </header>

        <p className="rounded-lg bg-primary/10 p-4 font-semibold" data-testid="avertissement-paiement">
          {avertissement()}
        </p>

        <ol className="space-y-8">
          {etapes().map((etape, rang) => (
            <li key={etape.titre} className="space-y-2">
              <h2 className="flex items-center gap-3 text-xl font-semibold">
                <span
                  aria-hidden
                  className="inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold tabular-nums text-primary-foreground"
                >
                  {rang + 1}
                </span>
                {etape.titre}
              </h2>
              {etape.blocs.map((bloc, i) => (
                <BlocTexte key={i} bloc={bloc} />
              ))}
            </li>
          ))}
        </ol>

        <footer className="space-y-3 border-t pt-6">
          <p className="text-muted-foreground">{t('reste.uneQuestion')}</p>
          <Button asChild className="min-h-11">
            <a href={lienWhatsapp()} target="_blank" rel="noopener noreferrer" data-testid="comment-whatsapp">
              <MessageCircle className="mr-2 h-4 w-4" aria-hidden />
              {t('aide.ecrireWhatsapp')}
            </a>
          </Button>
        </footer>
      </article>
    </Layout>
  );
}

function BlocTexte({ bloc }: { bloc: Bloc }) {
  if (typeof bloc === 'string') return <p className="text-muted-foreground">{bloc}</p>;
  return (
    <ul className="list-disc space-y-1 pl-6 text-muted-foreground marker:text-muted-foreground">
      {bloc.liste.map((element) => (
        <li key={element}>{element}</li>
      ))}
    </ul>
  );
}
