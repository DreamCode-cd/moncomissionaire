import { EtatVide } from '@/components/etats';
import { formaterAnciennete } from '@/lib/dates';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { useEffect, useState } from 'react';
import { MessageCircle, Bell } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import type { ChatRoom, PaginatedResponse } from '@shared/schema';

export default function Messages() {
  const { user } = useAuth();
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>('default');

  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    } else {
      setNotificationPermission('unsupported');
    }
  }, []);

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
    }
  };

  const { data, isLoading, error } = useQuery<PaginatedResponse<ChatRoom>>({
    queryKey: ['/api/v1/messaging/chatrooms/'],
    enabled: !!user,
    refetchInterval: 10000,
    refetchOnWindowFocus: true,
  });

  if (error) {
    console.error('[Messages] Error loading chatrooms:', error);
  }

  if (!user) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 p-4">
          <p className="text-muted-foreground">Vous devez être connecté pour voir vos messages</p>
        </div>
      </Layout>
    );
  }


  const getOtherParticipant = (chatroom: ChatRoom) => {
    if (user?.role === 'client') {
      // Priorité à l'agent s'il est assigné à la conversation (vérifier qu'il a un ID valide)
      const agent = chatroom.agent_detail;
      if (agent && (agent.id || agent.first_name || agent.username)) {
        return agent;
      }
      return chatroom.commissionnaire_detail;
    }
    if (user?.role === 'commissionnaire' || user?.role === 'moderateur') {
      return chatroom.client_detail;
    }
    if (user?.role === 'agent') {
      return chatroom.client_detail;
    }
    return chatroom.client_detail;
  };

  const getParticipantName = (participant: any) => {
    if (!participant) return 'Inconnu';
    return participant.full_name || `${participant.first_name || ''} ${participant.last_name || ''}`.trim() || participant.username || 'Inconnu';
  };

  const getInitials = (participant: any) => {
    if (!participant) return '?';
    const name = participant.full_name || participant.first_name || '';
    return name?.[0]?.toUpperCase() || '?';
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-4 md:py-6">
        <h1 className="text-2xl font-bold mb-4">Messages</h1>

        {/* Notification permission banner */}
        {notificationPermission === 'default' && (
          <Card className="mb-4 border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Bell className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">Activer les notifications</p>
                  <p className="text-xs text-muted-foreground">
                    Recevez des alertes quand vous recevez un nouveau message
                  </p>
                </div>
                <Button size="sm" onClick={requestNotificationPermission}>
                  Activer
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    <Skeleton className="w-12 h-12 rounded-full flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-3 w-3/4" />
                    </div>
                    <Skeleton className="h-3 w-8" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
              <MessageCircle className="w-8 h-8 text-destructive" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Erreur de chargement</h3>
            <p className="text-muted-foreground max-w-sm mb-4">
              Une erreur s'est produite lors du chargement des conversations.
            </p>
            <p className="text-sm text-muted-foreground">
              {error instanceof Error ? error.message : 'Erreur inconnue'}
            </p>
          </div>
        ) : data?.results?.length === 0 ? (
          <EtatVide
            icone={MessageCircle}
            titre="Aucune conversation"
            description="Une discussion s'ouvre automatiquement lorsqu'un commissionnaire accepte votre demande de visite."
          />
        ) : (
          <div className="space-y-2">
            {data?.results?.map((chatroom) => {
              const otherParticipant = getOtherParticipant(chatroom);
              return (
                <Link key={chatroom.id} href={`/messages/${chatroom.id}`}>
                  <Card 
                    className="hover-elevate cursor-pointer"
                    data-testid={`chatroom-${chatroom.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Avatar className="w-12 h-12">
                            <AvatarImage src={otherParticipant?.photo} />
                            <AvatarFallback className="bg-primary text-primary-foreground">
                              {getInitials(otherParticipant)}
                            </AvatarFallback>
                          </Avatar>
                          {chatroom.unread_count > 0 && (
                            <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
                              {chatroom.unread_count > 9 ? '9+' : chatroom.unread_count}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <h3 className="font-semibold line-clamp-1">
                                {getParticipantName(otherParticipant)}
                              </h3>
                              {otherParticipant?.role_display && (
                                <Badge variant="secondary" className="text-xs flex-shrink-0">
                                  {otherParticipant.role_display}
                                </Badge>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground flex-shrink-0">
                              {formaterAnciennete(chatroom.updated_at)}
                            </span>
                          </div>
                          <p className={`text-sm line-clamp-1 ${
                            chatroom.unread_count > 0 
                              ? 'text-foreground font-medium' 
                              : 'text-muted-foreground'
                          }`}>
                            {typeof chatroom.last_message === 'object' && chatroom.last_message !== null
                              ? (chatroom.last_message as any).content
                              : chatroom.last_message || 'Aucun message'}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}