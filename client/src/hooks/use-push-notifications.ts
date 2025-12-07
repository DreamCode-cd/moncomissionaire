import { useState, useEffect, useCallback } from 'react';

export type NotificationPermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

export interface PushNotificationOptions {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  notificationType?: 'visit' | 'message' | 'general';
}

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermissionState>('default');
  const [isSupported, setIsSupported] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      setIsSupported(false);
      setPermission('unsupported');
      return;
    }

    setIsSupported(true);
    setPermission(Notification.permission as NotificationPermissionState);

    navigator.serviceWorker.ready.then((reg) => {
      setRegistration(reg);
    });
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;

    try {
      const result = await Notification.requestPermission();
      setPermission(result as NotificationPermissionState);
      return result === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }, [isSupported]);

  const showNotification = useCallback(async (options: PushNotificationOptions): Promise<boolean> => {
    if (!isSupported || permission !== 'granted') {
      return false;
    }

    try {
      if (registration) {
        registration.active?.postMessage({
          type: 'SHOW_NOTIFICATION',
          ...options
        });
        return true;
      }

      new Notification(options.title, {
        body: options.body,
        icon: '/favicon.png',
        tag: options.tag || 'villago-notification'
      });
      return true;
    } catch (error) {
      console.error('Error showing notification:', error);
      return false;
    }
  }, [isSupported, permission, registration]);

  const showVisitNotification = useCallback((status: 'accepted' | 'rejected' | 'assigned', details: { propertyTitle?: string; agentName?: string }) => {
    const messages: Record<string, { title: string; body: string }> = {
      accepted: {
        title: 'Demande de visite acceptee',
        body: `Votre demande de visite pour "${details.propertyTitle || 'le bien'}" a ete acceptee.`
      },
      rejected: {
        title: 'Demande de visite refusee',
        body: `Votre demande de visite pour "${details.propertyTitle || 'le bien'}" a ete refusee.`
      },
      assigned: {
        title: 'Agent assigne a votre visite',
        body: `${details.agentName || 'Un agent'} a ete assigne a votre visite pour "${details.propertyTitle || 'le bien'}".`
      }
    };

    const message = messages[status];
    if (message) {
      showNotification({
        ...message,
        url: '/visits',
        tag: `visit-${status}-${Date.now()}`,
        notificationType: 'visit'
      });
    }
  }, [showNotification]);

  const showMessageNotification = useCallback((senderName: string, preview: string, chatroomId: number) => {
    showNotification({
      title: `Nouveau message de ${senderName}`,
      body: preview.length > 50 ? preview.substring(0, 50) + '...' : preview,
      url: `/messages/${chatroomId}`,
      tag: `message-${chatroomId}-${Date.now()}`,
      notificationType: 'message'
    });
  }, [showNotification]);

  return {
    permission,
    isSupported,
    requestPermission,
    showNotification,
    showVisitNotification,
    showMessageNotification
  };
}
