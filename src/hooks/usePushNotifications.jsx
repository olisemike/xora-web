import { useEffect, useState, useRef, useCallback } from 'react';
import { getCsrfToken } from '../services/api';

/**
 * Web Push Notifications Hook
 * Handles subscription to push notifications via Web Push API
 */
export const usePushNotifications = (userId, options = {}) => {
  const { autoStart = false } = options;
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const unsubscribedRef = useRef(false);

  const setupPushNotifications = useCallback(async () => {
    if (!userId || unsubscribedRef.current) return;

    try {
      setIsLoading(true);

      // Check if browser supports service workers
      if (!('serviceWorker' in navigator)) {
        setError('Service workers not supported');
        return;
      }

      // Register service worker
      const registration = await navigator.serviceWorker.register('/service-worker.js', {
        scope: '/'
      });

      // Check if browser supports push
      if (!('pushManager' in registration)) {
        setError('Push notifications not supported');
        return;
      }

      // Check existing subscription
      let subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        setIsSubscribed(true);
        await syncSubscriptionWithBackend(subscription);
        return;
      }

      // Request notification permission (must be user-triggered)
      const permission = await Notification.requestPermission();

      if (permission !== 'granted') {
        setError('Notification permission denied');
        return;
      }

      const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        setError('VAPID key not configured');
        return;
      }

      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });

      await syncSubscriptionWithBackend(subscription);
      setIsSubscribed(true);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Optional auto-start (disabled by default to avoid browser blocking)
  useEffect(() => {
    if (!autoStart) return;
    setupPushNotifications();
    return () => {
      unsubscribedRef.current = true;
    };
  }, [autoStart, setupPushNotifications]);

  return { isSubscribed, isLoading, error, requestPermission: setupPushNotifications };
};

/**
 * Sync push subscription with backend
 */
async function syncSubscriptionWithBackend(subscription) {
  const csrfToken = getCsrfToken();
  const response = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
    },
    credentials: 'include',
    body: JSON.stringify({
      subscription: {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: arrayBufferToBase64(subscription.getKey('p256dh')),
          auth: arrayBufferToBase64(subscription.getKey('auth'))
        }
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to sync subscription: ${response.status}`);
  }

  // Subscription synced with backend
}

/**
 * Convert VAPID public key from base64 to Uint8Array
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Convert ArrayBuffer to base64 string
 */
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}





