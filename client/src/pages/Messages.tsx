import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { MessageCircle } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import type { ChatRoom, PaginatedResponse } from '@shared/schema';

export default function Messages() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery<PaginatedResponse<ChatRoom>>({
    queryKey: ['/api/v1/messaging/chatrooms/'],
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (hours < 1) return 'À l\'instant';
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}j`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  const getOtherParticipant = (chatroom: ChatRoom) => {
    if (user?.role === 'client') {
      return chatroom.commissionnaire_detail || chatroom.agent_detail;
    }
    if (user?.role === 'commissionnaire') {
      return chatroom.client_detail;
    }
    if (user?.role === 'agent') {
      return chatroom.client_detail;
    }
    return chatroom.client_detail;
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || '?';
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-4 md:py-6">
        <h1 className="text-2xl font-bold mb-6">Messages</h1>

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
        ) : data?.results?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 mb-4 rounded-full bg-muted flex items-center justify-center">
              <MessageCircle className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Aucun message</h3>
            <p className="text-muted-foreground max-w-sm">
              Vous n'avez pas encore de conversations. Les messages apparaîtront ici après une demande de visite.
            </p>
          </div>
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
                              {getInitials(
                                otherParticipant?.first_name,
                                otherParticipant?.last_name
                              )}
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
                            <h3 className="font-semibold line-clamp-1">
                              {otherParticipant?.first_name} {otherParticipant?.last_name}
                            </h3>
                            <span className="text-xs text-muted-foreground flex-shrink-0">
                              {formatDate(chatroom.updated_at)}
                            </span>
                          </div>
                          <p className={`text-sm line-clamp-1 ${
                            chatroom.unread_count > 0 
                              ? 'text-foreground font-medium' 
                              : 'text-muted-foreground'
                          }`}>
                            {chatroom.last_message || 'Aucun message'}
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
