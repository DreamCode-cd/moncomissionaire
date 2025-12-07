import { WebSocket, WebSocketServer } from 'ws';
import type { Server } from 'http';
import type { IncomingMessage } from 'http';
import { URL } from 'url';

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

interface AuthenticatedWebSocket extends WebSocket {
  userId?: number;
  chatroomId?: number;
  isAlive?: boolean;
}

const clients = new Map<number, Set<AuthenticatedWebSocket>>();

export function setupWebSocket(httpServer: Server): WebSocketServer {
  const wss = new WebSocketServer({ 
    server: httpServer,
    path: '/ws/chat'
  });

  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      const client = ws as AuthenticatedWebSocket;
      if (client.isAlive === false) {
        return client.terminate();
      }
      client.isAlive = false;
      client.ping();
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(heartbeatInterval);
  });

  wss.on('connection', (ws: AuthenticatedWebSocket, req: IncomingMessage) => {
    ws.isAlive = true;

    ws.on('pong', () => {
      ws.isAlive = true;
    });

    let userId: number | undefined;
    let chatroomId: number | undefined;

    try {
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      userId = parseInt(url.searchParams.get('userId') || '', 10);
      chatroomId = parseInt(url.searchParams.get('chatroomId') || '', 10);
    } catch (err) {
      console.error('[WebSocket] Error parsing URL:', err);
    }

    if (!userId || !chatroomId) {
      ws.close(1008, 'Invalid connection parameters');
      return;
    }

    ws.userId = userId;
    ws.chatroomId = chatroomId;

    if (!clients.has(chatroomId)) {
      clients.set(chatroomId, new Set());
    }
    clients.get(chatroomId)!.add(ws);

    console.log(`[WebSocket] User ${userId} connected to chatroom ${chatroomId}`);

    broadcastToChatroom(chatroomId, {
      type: 'join',
      chatroomId,
      data: { userId }
    }, ws);

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString()) as ChatMessage;
        
        if (message.type === 'message' && message.data.content) {
          const broadcastMessage: ChatMessage = {
            type: 'message',
            chatroomId: chatroomId!,
            data: {
              id: Date.now(),
              content: message.data.content,
              sender: userId,
              sender_detail: message.data.sender_detail,
              created_at: new Date().toISOString()
            }
          };
          
          broadcastToChatroom(chatroomId!, broadcastMessage);
        }
        
        if (message.type === 'typing') {
          broadcastToChatroom(chatroomId!, {
            type: 'typing',
            chatroomId: chatroomId!,
            data: { userId }
          }, ws);
        }

        if (message.type === 'read') {
          broadcastToChatroom(chatroomId!, {
            type: 'read',
            chatroomId: chatroomId!,
            data: { userId }
          }, ws);
        }
      } catch (err) {
        console.error('[WebSocket] Error processing message:', err);
      }
    });

    ws.on('close', () => {
      console.log(`[WebSocket] User ${userId} disconnected from chatroom ${chatroomId}`);
      const roomClients = clients.get(chatroomId!);
      if (roomClients) {
        roomClients.delete(ws);
        if (roomClients.size === 0) {
          clients.delete(chatroomId!);
        }
      }
      
      broadcastToChatroom(chatroomId!, {
        type: 'leave',
        chatroomId: chatroomId!,
        data: { userId }
      });
    });

    ws.on('error', (err) => {
      console.error('[WebSocket] Client error:', err);
    });
  });

  console.log('[WebSocket] Server initialized on /ws/chat');
  return wss;
}

function broadcastToChatroom(
  chatroomId: number, 
  message: ChatMessage, 
  excludeClient?: AuthenticatedWebSocket
) {
  const roomClients = clients.get(chatroomId);
  if (!roomClients) return;

  const messageStr = JSON.stringify(message);
  
  roomClients.forEach((client) => {
    if (client !== excludeClient && client.readyState === WebSocket.OPEN) {
      client.send(messageStr);
    }
  });
}

export function sendMessageToRoom(chatroomId: number, message: ChatMessage) {
  broadcastToChatroom(chatroomId, message);
}
