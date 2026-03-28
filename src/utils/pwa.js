// PWA Registration and Management
/* eslint-disable no-console */

export const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js', {
        scope: '/'
      });

      // Service Worker registered

      // Handle updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New service worker available
            // Dispatch custom event for the app to handle
            const updateEvent = new CustomEvent('pwa-update-available', {
              detail: { newWorker }
            });
            window.dispatchEvent(updateEvent);
          }
        });
      });

      return registration;
    } catch (error) {
      // Ignore errors
    }
  } else {
    // Service Workers not supported
  }
};

export const unregisterServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map(registration => registration.unregister()));
  }
};

export const checkForUpdates = async () => {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      await registration.update();
      // Checked for updates
    }
  }
};

// Request notification permission
export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    // Notifications not supported
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
};

// Subscribe to push notifications
export const subscribeToPushNotifications = async () => {
  try {
    const registration = await navigator.serviceWorker.getRegistration();

    if (!registration) {
      return null;
    }

    const permission = await requestNotificationPermission();

    if (!permission) {
      // Notification permission denied
      return null;
    }

    // Get VAPID public key from environment or use placeholder
    // Generate VAPID keys: npx web-push generate-vapid-keys
    const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;

    if (!vapidPublicKey || vapidPublicKey === 'YOUR_VAPID_PUBLIC_KEY_HERE') {
      return null;
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
    });

    // Push subscription created

    // Send subscription to your backend
    // const response = await fetch(`${import.meta.env.VITE_API_URL}/push/subscribe`, {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'Authorization': `Bearer ${token}`
    //   },
    //   body: JSON.stringify(subscription)
    // });

    return subscription;
  } catch (error) {
    return null;
  }
};

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
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

// Check if app is installed
export const isAppInstalled = () => {
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.navigator.standalone === true;
};

// Track app install
export const trackAppInstall = () => {
  window.addEventListener('appinstalled', () => {
    // App installed successfully
    // Track in analytics
    // analytics.track('pwa_installed');
  });
};

// Background sync for offline actions
export const registerBackgroundSync = async (tag) => {
  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.sync.register(tag);
    // Background sync registered
  } catch (error) {
      // Ignore errors
    }
};

// Cache important resources
export const cacheResources = async (urls) => {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'CACHE_URLS',
      urls
    });
  }
};



