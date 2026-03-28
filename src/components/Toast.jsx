import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { IoCheckmarkCircle, IoWarning, IoInformationCircle, IoClose } from 'react-icons/io5';
import './Toast.css';

const ToastContext = createContext();

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const timeoutsRef = useRef(new Map());

  // Cleanup all timeouts on unmount
  useEffect(() => {
    const timeouts = timeoutsRef.current;
    return () => {
      timeouts.forEach((timeoutId) => clearTimeout(timeoutId));
      timeouts.clear();
    };
  }, []);

  const removeToast = useCallback((id) => {
    // Clear timeout if exists
    if (timeoutsRef.current.has(id)) {
      clearTimeout(timeoutsRef.current.get(id));
      timeoutsRef.current.delete(id);
    }
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const addToast = useCallback((message, type = 'info', duration = 3000) => {
    const id = Date.now();
    const toast = { id, message, type, duration };

    setToasts(prev => [...prev, toast]);

    if (duration > 0) {
      const timeoutId = setTimeout(() => {
        timeoutsRef.current.delete(id);
        removeToast(id);
      }, duration);
      timeoutsRef.current.set(id, timeoutId);
    }

    return id;
  }, [removeToast]);

  const success = useCallback((message, duration) => {
    return addToast(message, 'success', duration);
  }, [addToast]);

  const error = useCallback((message, duration) => {
    return addToast(message, 'error', duration);
  }, [addToast]);

  const warning = useCallback((message, duration) => {
    return addToast(message, 'warning', duration);
  }, [addToast]);

  const info = useCallback((message, duration) => {
    return addToast(message, 'info', duration);
  }, [addToast]);

  const value = {
    success,
    error,
    warning,
    info,
    addToast,
    removeToast,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-container">
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            toast={toast}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

const Toast = ({ toast, onClose }) => {
  const icons = {
    success: IoCheckmarkCircle,
    error: IoWarning,
    warning: IoWarning,
    info: IoInformationCircle,
  };

  const Icon = icons[toast.type];

  // Use role="alert" for errors/warnings to announce immediately
  // Use role="status" for success/info for polite announcements
  const ariaRole = toast.type === 'error' || toast.type === 'warning' ? 'alert' : 'status';
  const ariaLive = toast.type === 'error' || toast.type === 'warning' ? 'assertive' : 'polite';

  return (
    <div
      className={`toast toast-${toast.type}`}
      role={ariaRole}
      aria-live={ariaLive}
      aria-atomic="true"
    >
      <Icon className="toast-icon" aria-hidden="true" />
      <span className="toast-message">{toast.message}</span>
      <button
        className="toast-close"
        onClick={onClose}
        aria-label="Dismiss notification"
      >
        <IoClose aria-hidden="true" />
      </button>
    </div>
  );
};





