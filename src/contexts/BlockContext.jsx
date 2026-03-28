import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';

const BlockContext = createContext(null);

const STORAGE_KEY = 'xora-blocked-entities';

// entity: { id, type: 'user' | 'page', name, username?, avatar? }

export const BlockProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [blocked, setBlocked] = useState(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];
      return JSON.parse(stored);
    } catch (error) {// Clear corrupted data
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        // Ignore storage errors while attempting to clear corrupted block data
      }
      return [];
    }
  });

  // On initial load, try to sync blocked entities from the backend so that
  // blocks created on mobile or other devices are reflected on the web.
  useEffect(() => {
    if (typeof window === 'undefined' || !isAuthenticated) return;

    let cancelled = false;
    (async () => {
      try {
        const serverBlocks = await api.getBlocks();
        if (cancelled) return;
        // Normalise to the lightweight shape used by BlockContext / PostMenu.
        const entities = serverBlocks.map((b) => ({
          id: b.id,
          type: b.type,
          name: b.name,
          username: b.username,
          avatar: b.avatar || null,
        }));
        setBlocked(entities);
      } catch (error) {
      // Ignore errors
    }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(blocked));
    } catch (error) {
      // Ignore errors
    }
  }, [blocked]);

  const isBlocked = (type, id) => {
    return blocked.some((b) => b.type === type && String(b.id) === String(id));
  };

  const block = async (entity) => {
    if (!entity || !entity.id || !entity.type) return;
    if (isBlocked(entity.type, entity.id)) return;

    // Optimistic update
    setBlocked((prev) => [...prev, entity]);

    // Call backend API only if authenticated
    if (isAuthenticated) {
      try {
        await api.blockEntity(entity.type, entity.id);
      } catch (error) {
        // Revert optimistic update on error
        setBlocked((prev) => prev.filter((b) => !(b.type === entity.type && String(b.id) === String(entity.id))));
        throw error;
      }
    }
  };

  const unblock = async (type, id) => {
    // Optimistic update
    const previousBlocked = blocked;
    setBlocked((prev) => prev.filter((b) => !(b.type === type && String(b.id) === String(id))));

    // Call backend API only if authenticated
    if (isAuthenticated) {
      try {
        await api.unblockEntity(type, id);
      } catch (error) {
        // Revert optimistic update on error
        setBlocked(previousBlocked);
        throw error;
      }
    }
  };

  return (
    <BlockContext.Provider value={{ blocked, isBlocked, block, unblock }}>
      {children}
    </BlockContext.Provider>
  );
};

export const useBlockList = () => {
  const ctx = useContext(BlockContext);
  if (!ctx) {
    throw new Error('useBlockList must be used within BlockProvider');
  }
  return ctx;
};





