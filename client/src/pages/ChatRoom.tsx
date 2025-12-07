import { useState, useEffect, useRef, useCallback } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ChevronLeft, Send, Phone, MoreVertical, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import { useWebSocket } from '@/hooks/use-websocket';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import type { ChatRoomDetail, Message } from '@shared/schema';
import { cn } from '@/lib/utils';

export default function ChatRoom() {
  const [, params] = useRoute('/messages/:id');
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [messageInput, setMessageInput] = useState('');
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const [typingUsers, setTypingUsers] = useState<Set<number>>(new Set());
  const [isTabVisible, setIsTabVisible] = useState(!document.hidden);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const chatroomId = params?.id ? parseInt(params.id) : undefined;
  const { showMessageNotification, permission } = usePushNotifications();

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabVisible(!document.hidden);
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const handleWebSocketMessage = useCallback((wsMessage: {
    type: string;
    chatroomId: number;
    data: {
      id?: number;
      content?: string;
      sender?: number;
      sender_detail?: {
        id: number;
        first_name: string;
        last_name: string;
        photo?: string;
      };
      created_at?: string;
      userId?: number;
    };
  }) => {
    if (wsMessage.type === 'message' && wsMessage.data.content) {
      const newMessage: Message = {
        id: wsMessage.data.id || Date.now(),
        chatroom: wsMessage.chatroomId,
        sender: wsMessage.data.sender || 0,
        sender_detail: {
          id: wsMessage.data.sender_detail?.id || 0,
          username: '',
          email: '',
          first_name: wsMessage.data.sender_detail?.first_name || '',
          last_name: wsMessage.data.sender_detail?.last_name || '',
          role: 'client',
          role_display: '',
          phone: '',
          photo: wsMessage.data.sender_detail?.photo,
        },
        content: wsMessage.data.content,
        is_read: false,
        created_at: wsMessage.data.created_at || new Date().toISOString(),
      };
      setLocalMessages(prev => [...prev, newMessage]);

      if (!isTabVisible && wsMessage.data.sender !== user?.id && permission === 'granted') {
        const senderName = `${wsMessage.data.sender_detail?.first_name || ''} ${wsMessage.data.sender_detail?.last_name || ''}`.trim() || 'Quelqu\'un';
        showMessageNotification(senderName, wsMessage.data.content, wsMessage.chatroomId);
      }
    }
  }, [isTabVisible, user?.id, permission, showMessageNotification]);

  const handleTyping = useCallback((userId: number) => {
    setTypingUsers(prev => new Set(prev).add(userId));
    setTimeout(() => {
      setTypingUsers(prev => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }, 3000);
  }, []);

  const { isConnected, sendMessage: wsSendMessage, sendTyping } = useWebSocket({
    chatroomId: chatroomId || 0,
    userId: user?.id || 0,
    onMessage: handleWebSocketMessage,
    onTyping: handleTyping,
  });

  const { data: chatroom, isLoading } = useQuery<ChatRoomDetail>({
    queryKey: ['/api/v1/messaging/chatrooms/', chatroomId],
    enabled: !!chatroomId,
  });

  useEffect(() => {
    if (chatroom?.messages) {
      setLocalMessages(chatroom.messages);
    }
  }, [chatroom?.messages]);

  const sendMessageMutation = useMutation({
    mutationFn: (content: string) => 
      api.post(`/api/v1/messaging/chatrooms/${chatroomId}/messages/`, { content }),
    onSuccess: (newMsg) => {
      if (!isConnected) {
        queryClient.invalidateQueries({ queryKey: ['/api/v1/messaging/chatrooms/', chatroomId] });
      }
      queryClient.invalidateQueries({ queryKey: ['/api/v1/messaging/chatrooms/'] });
      setMessageInput('');
      inputRef.current?.focus();
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [localMessages]);

  const handleSend = () => {
    if (!messageInput.trim() || !user) return;
    
    const content = messageInput.trim();
    
    if (isConnected) {
      const optimisticMessage: Message = {
        id: Date.now(),
        chatroom: chatroomId || 0,
        sender: user.id,
        sender_detail: {
          id: user.id,
          username: user.username,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          role: user.role,
          role_display: user.role_display,
          phone: user.phone,
          photo: user.photo,
        },
        content,
        is_read: false,
        created_at: new Date().toISOString(),
      };
      setLocalMessages(prev => [...prev, optimisticMessage]);
      
      wsSendMessage(content, {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        photo: user.photo,
      });
      
      setMessageInput('');
      inputRef.current?.focus();
    }
    
    sendMessageMutation.mutate(content);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageInput(e.target.value);
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    sendTyping();
    typingTimeoutRef.current = setTimeout(() => {
      typingTimeoutRef.current = null;
    }, 2000);
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

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Aujourd\'hui';
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Hier';
    }
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
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
            {getInitials(otherParticipant?.first_name, otherParticipant?.last_name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="font-semibold line-clamp-1" data-testid="text-chat-participant">
              {otherParticipant?.first_name} {otherParticipant?.last_name}
            </h1>
            {isConnected ? (
              <Wifi className="w-3 h-3 text-green-500" data-testid="icon-connected" />
            ) : (
              <WifiOff className="w-3 h-3 text-muted-foreground" data-testid="icon-disconnected" />
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {typingUsers.size > 0 ? 'En train d\'écrire...' : otherParticipant?.role_display}
          </p>
        </div>
        <Button variant="ghost" size="icon" data-testid="button-call">
          <Phone className="w-5 h-5" />
        </Button>
        <Button variant="ghost" size="icon" data-testid="button-more">
          <MoreVertical className="w-5 h-5" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messageGroups.map((group, groupIndex) => (
          <div key={groupIndex}>
            <div className="flex justify-center mb-4">
              <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                {formatDate(group.date)}
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
                        <AvatarImage src={message.sender_detail.photo} />
                        <AvatarFallback className="text-xs">
                          {getInitials(
                            message.sender_detail.first_name,
                            message.sender_detail.last_name
                          )}
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
                        'text-[10px] mt-1',
                        isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
                      )}>
                        {formatTime(message.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="sticky bottom-0 bg-background border-t p-4 pb-20 md:pb-4">
        <div className="flex gap-2 max-w-2xl mx-auto">
          <Input
            ref={inputRef}
            placeholder="Écrivez un message..."
            value={messageInput}
            onChange={handleInputChange}
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
