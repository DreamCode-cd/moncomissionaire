import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { NotificationSocket } from '@/lib/websocket';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';

interface Notification {
  id: number;
  titre: string;
  message: string;
  type: string;
  lu: boolean;
  created_at: string;
}

interface ChatRoom {
  id: number;
  unread_count?: number;
  dernier_message?: {
    id: number;
    content: string;
    sender_detail?: {
      full_name?: string;
      first_name?: string;
      last_name?: string;
    };
    created_at: string;
  };
}

interface NotificationContextType {
  unreadCount: number;
  notifications: Notification[];
  markAsRead: (id: number) => void;
  markAllAsRead: () => void;
  isConnected: boolean;
  unreadMessagesCount: number;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [socket, setSocket] = useState<NotificationSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const lastMessageIdsRef = useRef<Set<number>>(new Set());
  const isFirstLoadRef = useRef(true);

  const showPushNotification = useCallback((title: string, body: string, tag: string, url?: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(registration => {
          registration.showNotification(title, {
            body,
            icon: '/favicon.png',
            tag,
            data: { url: url || '/messages' },
          });
        }).catch(() => {
          new Notification(title, { body, icon: '/favicon.png', tag });
        });
      } else {
        new Notification(title, { body, icon: '/favicon.png', tag });
      }
    }
    
    toast({ title, description: body });
  }, [toast]);

  const handleNewNotification = useCallback((notification: Notification) => {
    setNotifications(prev => [notification, ...prev]);
    showPushNotification(
      notification.titre,
      notification.message,
      `notification-${notification.id}`
    );
  }, [showPushNotification]);

  const handleUnreadCount = useCallback((count: number) => {
    setUnreadCount(count);
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      lastMessageIdsRef.current.clear();
      isFirstLoadRef.current = true;
      return;
    }

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const notifSocket = new NotificationSocket(handleNewNotification, handleUnreadCount);
    notifSocket.connect();
    setSocket(notifSocket);

    const checkInterval = setInterval(() => {
      setIsConnected(true);
    }, 1000);

    return () => {
      clearInterval(checkInterval);
      notifSocket.disconnect();
      setSocket(null);
      setIsConnected(false);
    };
  }, [isAuthenticated, user, handleNewNotification, handleUnreadCount]);

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const checkNewMessages = async () => {
      try {
        const response = await api.get<{ results: ChatRoom[] }>('/api/v1/messaging/chatrooms/');
        const chatrooms = response.results || [];
        
        let totalUnread = 0;
        
        chatrooms.forEach((chatroom: ChatRoom) => {
          totalUnread += chatroom.unread_count || 0;
          
          const lastMessage = chatroom.dernier_message;
          if (lastMessage && lastMessage.id) {
            const messageId = lastMessage.id;
            
            if (!isFirstLoadRef.current && !lastMessageIdsRef.current.has(messageId)) {
              const senderName = lastMessage.sender_detail?.full_name || 
                `${lastMessage.sender_detail?.first_name || ''} ${lastMessage.sender_detail?.last_name || ''}`.trim() ||
                'Nouveau message';
              
              const preview = lastMessage.content.length > 50 
                ? lastMessage.content.substring(0, 50) + '...' 
                : lastMessage.content;
              
              showPushNotification(
                senderName,
                preview,
                `chat-message-${messageId}`,
                `/messages/${chatroom.id}`
              );
            }
            
            lastMessageIdsRef.current.add(messageId);
          }
        });
        
        setUnreadMessagesCount(totalUnread);
        isFirstLoadRef.current = false;
      } catch (error) {
        console.error('[NotificationContext] Error checking messages:', error);
      }
    };

    checkNewMessages();
    const interval = setInterval(checkNewMessages, 10000);

    return () => clearInterval(interval);
  }, [isAuthenticated, user, showPushNotification]);

  const markAsRead = useCallback((id: number) => {
    socket?.markAsRead(id);
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, lu: true } : n)
    );
  }, [socket]);

  const markAllAsRead = useCallback(() => {
    socket?.markAllAsRead();
    setNotifications(prev => prev.map(n => ({ ...n, lu: true })));
    setUnreadCount(0);
  }, [socket]);

  return (
    <NotificationContext.Provider value={{
      unreadCount,
      notifications,
      markAsRead,
      markAllAsRead,
      isConnected,
      unreadMessagesCount,
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
