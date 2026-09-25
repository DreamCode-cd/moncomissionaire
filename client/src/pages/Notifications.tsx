import { classesDuTon } from '@/lib/statuts';
import { apparenceNotification } from '@/lib/notifications';
import { formaterAnciennete } from '@/lib/dates';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Bell, Check, CheckCheck, House, Calendar, MessageCircle, FileText, Users } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import type { Notification, PaginatedResponse } from '@shared/schema';



export default function Notifications() {
  const { toast } = useToast();

  const { data: notifications, isLoading } = useQuery<PaginatedResponse<Notification>>({
    queryKey: ['/api/v1/notifications/'],
    refetchInterval: 15000, // Rafraîchir toutes les 15 secondes
    refetchOnWindowFocus: true,
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id: number) => api.patch(`/api/v1/notifications/${id}/`, { is_read: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/notifications/'] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => api.post('/api/v1/notifications/mark_all_as_read/'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/notifications/'] });
      toast({
        title: 'Notifications marquées',
        description: 'Toutes les notifications ont été marquées comme lues.',
      });
    },
  });


  const unreadCount = notifications?.results?.filter(n => !n.is_read).length || 0;

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-4 md:py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Notifications</h1>
            {unreadCount > 0 && (
              <p className="text-sm text-muted-foreground">
                {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
              </p>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending}
              data-testid="button-mark-all-read"
            >
              <CheckCheck className="w-4 h-4 mr-2" />
              Tout marquer comme lu
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-1/4" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : notifications?.results?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 mb-4 rounded-full bg-muted flex items-center justify-center">
              <Bell className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Aucune notification</h3>
            <p className="text-muted-foreground max-w-sm">
              Vous n'avez pas encore reçu de notifications.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications?.results?.map((notification) => {
              const Icon = apparenceNotification(notification.type_notification).icone;
              return (
                <Card 
                  key={notification.id}
                  className={notification.is_read ? 'opacity-70' : ''}
                  data-testid={`notification-${notification.id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${classesDuTon(apparenceNotification(notification.type_notification).ton)}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-semibold line-clamp-1">
                            {notification.titre}
                          </h3>
                          {!notification.is_read && (
                            <Badge variant="default" className="flex-shrink-0 text-xs">
                              Nouveau
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                          {notification.message}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-muted-foreground">
                            {formaterAnciennete(notification.created_at)}
                          </span>
                          {!notification.is_read && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => markAsReadMutation.mutate(notification.id)}
                              disabled={markAsReadMutation.isPending}
                              data-testid={`button-mark-read-${notification.id}`}
                            >
                              <Check className="w-4 h-4 mr-1" />
                              Marquer comme lu
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}