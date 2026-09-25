import { formaterDateLongue } from '@/lib/dates';
import { useQuery } from '@tanstack/react-query';
import { useRoute } from 'wouter';
import DOMPurify from 'dompurify';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'wouter';
import { api } from '@/lib/api';

const sanitizeHtml = (html: string) => {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'div'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
  });
};

interface LegalSubsection {
  id: number;
  order: number;
  section_number: string;
  title: string;
  content: string;
}

interface LegalSection {
  id: number;
  order: number;
  section_number: string;
  title: string;
  content: string;
  subsections?: LegalSubsection[];
}

interface LegalPageData {
  id: number;
  page_type: string;
  page_type_display: string;
  title: string;
  introduction?: string;
  sections?: LegalSection[];
  version?: string;
  content?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at: string;
}

const pageTypeLabels: Record<string, string> = {
  terms: "Conditions générales d'utilisation",
  privacy: "Politique de confidentialité",
  cookies: "Politique des cookies",
  legal: "Mentions légales",
};

export default function LegalPage() {
  const [, params] = useRoute('/legal/:pageType');
  const pageType = params?.pageType || 'terms';

  const { data: page, isLoading, error } = useQuery<LegalPageData>({
    queryKey: ['/api/v1/pages/', pageType],
    queryFn: async () => {
      return api.get(`/api/v1/pages/${pageType}/`);
    },
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-4 w-1/4" />
          <Card>
            <CardContent className="p-6 space-y-4">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-5/6" />
              <Skeleton className="h-6 w-4/5" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-3/4" />
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  if (error || !page) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto px-4 py-6">
          <Link href="/">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
          </Link>
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">
                {pageTypeLabels[pageType] || 'Page'} non disponible pour le moment.
              </p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  const sortedSections = page.sections 
    ? [...page.sections].sort((a, b) => a.order - b.order)
    : [];

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 py-6">
        <Link href="/">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
        </Link>
        
        <h1 className="text-2xl font-bold mb-2">{page.title}</h1>
        
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
          {page.updated_at && (
            <span>
              Dernière mise à jour : {formaterDateLongue(page.updated_at)}
            </span>
          )}
          {page.version && (
            <span>Version {page.version}</span>
          )}
        </div>
        
        <Card>
          <CardContent className="p-6">
            {page.introduction && (
              <p className="text-muted-foreground mb-6 pb-6 border-b">
                {page.introduction}
              </p>
            )}
            
            {sortedSections.length > 0 ? (
              <div className="space-y-6">
                {sortedSections.map((section) => {
                  const sortedSubsections = section.subsections 
                    ? [...section.subsections].sort((a, b) => a.order - b.order)
                    : [];
                  
                  return (
                    <div key={section.id} className="space-y-3">
                      <h2 className="text-lg font-semibold">
                        {section.section_number}. {section.title}
                      </h2>
                      {section.content && (
                        <div 
                          className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground"
                          dangerouslySetInnerHTML={{ __html: sanitizeHtml(section.content) }}
                        />
                      )}
                      {sortedSubsections.length > 0 && (
                        <div className="space-y-4 pl-4 border-l-2 border-muted">
                          {sortedSubsections.map((subsection) => (
                            <div key={subsection.id} className="space-y-1">
                              <h3 className="text-base font-medium">
                                {subsection.section_number}. {subsection.title}
                              </h3>
                              <div 
                                className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground"
                                dangerouslySetInnerHTML={{ __html: sanitizeHtml(subsection.content) }}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : page.content ? (
              <div 
                className="prose prose-sm dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(page.content) }}
              />
            ) : null}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
