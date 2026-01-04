// WebSocket utilities for real-time notifications and chat

const getWebSocketUrl = () => {
  const apiUrl = import.meta.env.VITE_DJANGO_API_URL || '';
  // Convert https:// to wss:// and http:// to ws://
  return apiUrl.replace(/^https:\/\//, 'wss://').replace(/^http:\/\//, 'ws://');
};

// Get JWT token from localStorage
const getAuthToken = () => {
  return localStorage.getItem('access_token');
};

// ============ NOTIFICATION SOCKET ============
export class NotificationSocket {
  private ws: WebSocket | null = null;
  private onNotification: (notification: any) => void;
  private onUnreadCount: (count: number) => void;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private isConnected = false;

  constructor(
    onNotification: (notification: any) => void,
    onUnreadCount: (count: number) => void
  ) {
    this.onNotification = onNotification;
    this.onUnreadCount = onUnreadCount;
  }

  connect() {
    const token = getAuthToken();
    if (!token) {
      console.log('[NotificationSocket] No auth token, skipping connection');
      return;
    }

    const baseUrl = getWebSocketUrl();
    const wsUrl = `${baseUrl}/ws/notifications/?token=${token}`;
    
    console.log('[NotificationSocket] Connecting to:', wsUrl);
    
    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('[NotificationSocket] Connected');
        this.isConnected = true;
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[NotificationSocket] Message received:', data);

          switch (data.type) {
            case 'connected':
              this.onUnreadCount(data.unread_count || 0);
              break;
            case 'new_notification':
              this.onNotification(data.notification);
              this.onUnreadCount(data.unread_count || 0);
              break;
            case 'notification_read':
            case 'all_read':
            case 'unread_count':
              this.onUnreadCount(data.unread_count || 0);
              break;
          }
        } catch (e) {
          console.error('[NotificationSocket] Error parsing message:', e);
        }
      };

      this.ws.onclose = () => {
        console.log('[NotificationSocket] Disconnected');
        this.isConnected = false;
        // Reconnect after 3 seconds
        this.reconnectTimeout = setTimeout(() => this.connect(), 3000);
      };

      this.ws.onerror = (error) => {
        console.error('[NotificationSocket] Error:', error);
      };
    } catch (e) {
      console.error('[NotificationSocket] Connection error:', e);
    }
  }

  markAsRead(notificationId: number) {
    if (this.ws && this.isConnected) {
      this.ws.send(JSON.stringify({ action: 'mark_read', notification_id: notificationId }));
    }
  }

  markAllAsRead() {
    if (this.ws && this.isConnected) {
      this.ws.send(JSON.stringify({ action: 'mark_all_read' }));
    }
  }

  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    this.ws?.close();
    this.ws = null;
    this.isConnected = false;
  }
}

// ============ CHAT SOCKET ============
export class ChatSocket {
  private ws: WebSocket | null = null;
  private roomId: number;
  private onMessage: (message: any) => void;
  private onError?: (error: any) => void;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private isConnected = false;

  constructor(
    roomId: number,
    onMessage: (message: any) => void,
    onError?: (error: any) => void
  ) {
    this.roomId = roomId;
    this.onMessage = onMessage;
    this.onError = onError;
  }

  connect() {
    const token = getAuthToken();
    if (!token) {
      console.log('[ChatSocket] No auth token, skipping connection');
      return;
    }

    const baseUrl = getWebSocketUrl();
    const wsUrl = `${baseUrl}/ws/chat/${this.roomId}/?token=${token}`;
    
    console.log('[ChatSocket] Connecting to:', wsUrl);
    
    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('[ChatSocket] Connected to room', this.roomId);
        this.isConnected = true;
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[ChatSocket] Message received:', data);

          if (data.type === 'message') {
            this.onMessage({
              id: data.message_id,
              content: data.message,
              sender: data.sender_id,
              sender_detail: {
                id: data.sender_id,
                full_name: data.sender_name,
                user_type: data.sender_type,
                user_type_display: data.sender_type_display,
              },
              created_at: data.timestamp,
              is_read: false,
            });
          }
        } catch (e) {
          console.error('[ChatSocket] Error parsing message:', e);
        }
      };

      this.ws.onclose = () => {
        console.log('[ChatSocket] Disconnected from room', this.roomId);
        this.isConnected = false;
        // Reconnect after 3 seconds
        this.reconnectTimeout = setTimeout(() => this.connect(), 3000);
      };

      this.ws.onerror = (error) => {
        console.error('[ChatSocket] Error:', error);
        this.onError?.(error);
      };
    } catch (e) {
      console.error('[ChatSocket] Connection error:', e);
    }
  }

  sendMessage(message: string) {
    if (this.ws && this.isConnected) {
      this.ws.send(JSON.stringify({ message }));
      return true;
    }
    return false;
  }

  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    this.ws?.close();
    this.ws = null;
    this.isConnected = false;
  }

  get connected() {
    return this.isConnected;
  }
}
