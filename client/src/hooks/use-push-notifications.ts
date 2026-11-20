import { useState, useEffect, useCallback } from 'react';
import { t } from '@/i18n';

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
        title: t('push.acceptee'),
        body: t('push.accepteeTexte', { titre: details.propertyTitle || t('push.leBien') })
      },
      rejected: {
        title: t('push.refusee'),
        body: t('push.refuseeTexte', { titre: details.propertyTitle || t('push.leBien') })
      },
      assigned: {
        title: t('push.agent'),
        body: t('push.agentTexte', { nom: details.agentName || t('push.unAgent'), titre: details.propertyTitle || t('push.leBien') })
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
      title: t('push.nouveauMessage', { nom: senderName }),
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
