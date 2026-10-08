import { EtatVide, ErreurRequete } from '@/components/etats';
import { formaterHeure, formaterSeparateurDeJour } from '@/lib/dates';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, EllipsisVertical, MessageCircle, Phone, Send, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { ChatSocket } from '@/lib/websocket';
import { useToast } from '@/hooks/use-toast';
import type { ChatRoomDetail, Message } from '@shared/schema';
import { cn } from '@/lib/utils';

export default function ChatRoom() {
  const [, params] = useRoute('/messages/:id');
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [messageInput, setMessageInput] = useState('');
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const [wsConnected, setWsConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const chatSocketRef = useRef<ChatSocket | null>(null);

  const chatroomId = params?.id ? parseInt(params.id) : undefined;

  const { data: chatroom, isLoading, refetch, isFetching, error: erreurSalon } = useQuery<ChatRoomDetail>({
    queryKey: ['/api/v1/messaging/chatrooms/', chatroomId],
    enabled: !!chatroomId && !!user,
    refetchInterval: wsConnected ? false : 5000, // Disable polling if WebSocket is connected
    refetchOnWindowFocus: true,
  });

  // Sync local messages with server data
  useEffect(() => {
    if (chatroom?.messages) {
      setLocalMessages(chatroom.messages);
    }
  }, [chatroom?.messages]);

  // Handle incoming WebSocket message
  const handleWsMessage = useCallback((message: Message) => {
    setLocalMessages(prev => {
      // Avoid duplicates
      if (prev.some(m => m.id === message.id)) return prev;
      
      // Show notification for messages from others
      if (message.sender !== user?.id) {
        const senderName = message.sender_detail?.full_name || 'Nouveau message';
        toast({
          title: senderName,
          description: message.content.length > 50 
            ? message.content.substring(0, 50) + '...' 
            : message.content,
        });
        
        // Browser push notification via Service Worker
        if ('Notification' in window && Notification.permission === 'granted' && 'serviceWorker' in navigator) {
          navigator.serviceWorker.ready.then(registration => {
            registration.showNotification(senderName, {
              body: message.content,
              icon: '/favicon.png',
              tag: `chat-message-${message.id}`,
            });
          }).catch(() => {});
        }
      }
      
      return [...prev, message];
    });
  }, [user?.id, toast]);

  // WebSocket connection
  useEffect(() => {
    if (!chatroomId || !user) return;

    const socket = new ChatSocket(
      chatroomId,
      handleWsMessage,
      (error) => {
        console.error('[ChatRoom] WebSocket error:', error);
        setWsConnected(false);
      }
    );

    socket.connect();
    chatSocketRef.current = socket;

    // Check connection status periodically
    const checkInterval = setInterval(() => {
      setWsConnected(socket.connected);
    }, 1000);

    return () => {
      clearInterval(checkInterval);
      socket.disconnect();
      chatSocketRef.current = null;
    };
  }, [chatroomId, user, handleWsMessage]);

  // Mark as read on load + request notification permission
  useEffect(() => {
    if (chatroomId && user) {
      // Mark messages as read and invalidate cache
      api.post(`/api/v1/messaging/chatrooms/${chatroomId}/mark_as_read/`, {})
        .then(() => {
          // Invalidate messages list to update unread counts
          queryClient.invalidateQueries({ queryKey: ['/api/v1/messaging/chatrooms/'] });
        })
        .catch(() => {});
      
      // Request notification permission for all user types
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          console.log('[ChatRoom] Notification permission:', permission);
        });
      }
    }
  }, [chatroomId, user, queryClient]);

  // Mark as read when window gains focus
  useEffect(() => {
    const handleFocus = () => {
      if (chatroomId && user && document.visibilityState === 'visible') {
        api.post(`/api/v1/messaging/chatrooms/${chatroomId}/mark_as_read/`, {})
          .then(() => {
            queryClient.invalidateQueries({ queryKey: ['/api/v1/messaging/chatrooms/'] });
          })
          .catch(() => {});
      }
    };

    document.addEventListener('visibilitychange', handleFocus);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleFocus);
      window.removeEventListener('focus', handleFocus);
    };
  }, [chatroomId, user, queryClient]);

  // Fallback HTTP mutation for sending messages
  const sendMessageMutation = useMutation({
    mutationFn: (content: string) => 
      api.post(`/api/v1/messaging/chatrooms/${chatroomId}/send_message/`, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/messaging/chatrooms/', chatroomId] });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/messaging/chatrooms/'] });
    },
    onError: (error) => {
      console.error('[ChatRoom] Error sending message:', error);
    }
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [localMessages]);

  const handleSend = () => {
    if (!messageInput.trim() || !user) return;

    const content = messageInput.trim();
    setMessageInput('');

    // Try WebSocket first, fallback to HTTP
    if (chatSocketRef.current?.connected) {
      const sent = chatSocketRef.current.sendMessage(content);
      if (!sent) {
        sendMessageMutation.mutate(content);
      }
    } else {
      sendMessageMutation.mutate(content);
    }
    
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getOtherParticipant = () => {
    if (!chatroom) return null;
    if (user?.role === 'client') {
      return chatroom.commissionnaire_detail || chatroom.agent_detail;
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
    return participant?.full_name || `${participant?.first_name || ''} ${participant?.last_name || ''}`.trim() || participant?.username || 'Inconnu';
  };

  const getInitials = (participant: any) => {
    const name = participant?.full_name || participant?.first_name || '';
    return name?.[0]?.toUpperCase() || '?';
  };

  const getUserTypeLabel = (participant: any) => {
    if (!participant) return '';
    // Utiliser user_type_display de l'API si disponible
    if (participant.user_type_display) return participant.user_type_display;
    // Sinon mapper manuellement
    const typeLabels: Record<string, string> = {
      'client': 'Client',
      'commissionnaire': 'Commissionnaire',
      'moderateur': 'Modérateur VillaGo',
      'agent': 'Agent',
      'proprietaire': 'Propriétaire',
    };
    return typeLabels[participant.user_type] || participant.role_display || '';
  };



  const groupMessagesByDate = (messages: Message[]) => {
    const groups: { date: string; messages: Message[] }[] = [];
    let currentDate = '';

    messages.forEach((message) => {
      const messageDate = new Date(message.created_at).toDateString();
      if (messageDate !== currentDate) {
        currentDate = messageDate;
        groups.push({ date: message.created_at, messages: [message] });
      } else {
        groups[groups.length - 1].messages.push(message);
      }
    });

    return groups;
  };

  const otherParticipant = getOtherParticipant();

  if (isLoading) {
    return (
      <div className="flex flex-col h-screen bg-background">
        <div className="sticky top-0 z-40 bg-background border-b px-4 py-3 flex items-center gap-3">
          <Skeleton className="w-9 h-9 rounded-full" />
          <Skeleton className="w-10 h-10 rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-4 w-32 mb-1" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
        <div className="flex-1 p-4 space-y-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
              <Skeleton className={`h-12 rounded-2xl ${i % 2 === 0 ? 'w-2/3' : 'w-1/2'}`} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!chatroom && erreurSalon) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <ErreurRequete erreur={erreurSalon} titre="La conversation n’a pas pu être chargée" onReessayer={() => void refetch()} />
      </div>
    );
  }

  if (!chatroom) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-4">
        <p className="text-muted-foreground">Conversation non trouvée</p>
        <Button onClick={() => setLocation('/messages')}>Retour aux messages</Button>
      </div>
    );
  }

  const messageGroups = groupMessagesByDate(localMessages);

  return (
    <div className="flex flex-col h-screen bg-background">
      <div className="sticky top-0 z-40 bg-background border-b px-4 py-3 flex items-center gap-3">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setLocation('/messages')}
          data-testid="button-back"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <Avatar className="w-10 h-10">
          <AvatarImage src={otherParticipant?.photo} />
          <AvatarFallback className="bg-primary text-primary-foreground">
            {getInitials(otherParticipant)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="font-semibold line-clamp-1" data-testid="text-chat-participant">
              {getParticipantName(otherParticipant)}
            </h1>
            {wsConnected ? (
              <Wifi className="w-3 h-3 text-statut-favorable" />
            ) : (
              <WifiOff className="w-3 h-3 text-muted-foreground" />
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {otherParticipant?.role_display || 'Utilisateur'}
          </p>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          data-testid="button-call"
          onClick={() => toast({
            title: 'Fonctionnalité indisponible',
            description: 'Les appels ne sont pas disponibles pour le moment.',
          })}
        >
          <Phone className="w-5 h-5" />
        </Button>
        <Button variant="ghost" size="icon" data-testid="button-more">
          <EllipsisVertical className="w-5 h-5" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {localMessages.length === 0 ? (
          <EtatVide
            icone={MessageCircle}
            titre="Aucun message"
            description="Écrivez le premier message pour démarrer la discussion."
          />
        ) : (
          messageGroups.map((group, groupIndex) => (
            <div key={groupIndex}>
              <div className="flex justify-center mb-4">
                <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                  {formaterSeparateurDeJour(group.date)}
                </span>
              </div>
              {group.messages.map((message) => {
                const isOwn = message.sender === user?.id;
                return (
                  <div
                    key={message.id}
                    className={cn(
                      'flex mb-2',
                      isOwn ? 'justify-end' : 'justify-start'
                    )}
                    data-testid={`message-${message.id}`}
                  >
                    <div className="flex items-end gap-2 max-w-[80%]">
                      {!isOwn && (
                        <Avatar className="w-6 h-6 flex-shrink-0">
                          <AvatarImage src={message.sender_detail?.photo} />
                          <AvatarFallback className="text-xs">
                            {getInitials(message.sender_detail)}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div
                        className={cn(
                          'px-4 py-2 rounded-2xl',
                          isOwn
                            ? 'bg-primary text-primary-foreground rounded-br-sm'
                            : 'bg-muted rounded-bl-sm'
                        )}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words">
                          {message.content}
                        </p>
                        <p className={cn(
                          'text-[10px] mt-1 flex items-center gap-1',
                          isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
                        )}>
                          {formaterHeure(message.created_at)}
                          {!isOwn && getUserTypeLabel(message.sender_detail) && (
                            <span>• {getUserTypeLabel(message.sender_detail)}</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="sticky bottom-0 bg-background border-t p-4 pb-20 md:pb-4">
        <div className="flex gap-2 max-w-2xl mx-auto">
          <Input
            ref={inputRef}
            placeholder="Écrivez un message..."
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1"
            data-testid="input-message"
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!messageInput.trim() || sendMessageMutation.isPending}
            data-testid="button-send"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
