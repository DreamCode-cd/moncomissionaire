import { useState, useEffect, useRef, useCallback } from 'react';

interface ChatMessage {
  type: 'message' | 'join' | 'leave' | 'typing' | 'read';
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
}

interface UseWebSocketOptions {
  chatroomId: number;
  userId: number;
  onMessage?: (message: ChatMessage) => void;
  onTyping?: (userId: number) => void;
  onUserJoin?: (userId: number) => void;
  onUserLeave?: (userId: number) => void;
}

export function useWebSocket({
  chatroomId,
  userId,
  onMessage,
  onTyping,
  onUserJoin,
  onUserLeave,
}: UseWebSocketOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/chat?userId=${userId}&chatroomId=${chatroomId}`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[WebSocket] Connected');
        setIsConnected(true);
        setConnectionError(null);
        reconnectAttemptsRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as ChatMessage;
          
          switch (message.type) {
            case 'message':
              onMessage?.(message);
              break;
            case 'typing':
              if (message.data.userId) {
                onTyping?.(message.data.userId);
              }
              break;
            case 'join':
              if (message.data.userId) {
                onUserJoin?.(message.data.userId);
              }
              break;
            case 'leave':
              if (message.data.userId) {
                onUserLeave?.(message.data.userId);
              }
              break;
          }
        } catch (err) {
          console.error('[WebSocket] Error parsing message:', err);
        }
      };

      ws.onclose = (event) => {
        console.log('[WebSocket] Disconnected:', event.code, event.reason);
        setIsConnected(false);
        wsRef.current = null;

        if (reconnectAttemptsRef.current < maxReconnectAttempts && !event.wasClean) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000);
          reconnectAttemptsRef.current++;
          console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})`);
          reconnectTimeoutRef.current = setTimeout(connect, delay);
        }
      };

      ws.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
        setConnectionError('Connection error');
      };
    } catch (err) {
      console.error('[WebSocket] Failed to connect:', err);
      setConnectionError('Failed to connect');
    }
  }, [chatroomId, userId, onMessage, onTyping, onUserJoin, onUserLeave]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnected');
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const sendMessage = useCallback((content: string, senderDetail: {
    id: number;
    first_name: string;
    last_name: string;
    photo?: string;
  }) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'message',
        chatroomId,
        data: {
          content,
          sender_detail: senderDetail
        }
      }));
    }
  }, [chatroomId]);

  const sendTyping = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'typing',
        chatroomId,
        data: {}
      }));
    }
  }, [chatroomId]);

  const sendRead = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'read',
        chatroomId,
        data: {}
      }));
    }
  }, [chatroomId]);

  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    connectionError,
    sendMessage,
    sendTyping,
    sendRead,
    reconnect: connect,
  };
}
